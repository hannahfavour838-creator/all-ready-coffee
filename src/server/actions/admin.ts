"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/lib/db";
import { assertStaff } from "@/lib/auth/session";
import { canTransition, NOTIFICATION_COPY, STATUS_META } from "@/lib/order-status";
import { discountInputSchema, productInputSchema, zodFieldErrors, zoneInputSchema } from "@/lib/validation";
import { cleanText } from "@/lib/security/sanitize";
import { rateLimit } from "@/lib/security/rate-limit";
import { slugify } from "@/lib/utils";
import { fail, type ActionResult } from "../result";
import { guarded } from "../safe-action";
import { audit } from "../audit";

const statusSchema = z.enum(["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "rejected", "cancelled"]);

/* ───────────────────────────── Orders ───────────────────────────── */

export async function updateOrderStatusAction(orderId: string, to: string, note?: string): Promise<ActionResult<{ status: string }>> {
  return guarded(async () => {
    const actor = await assertStaff("staff");
    const target = statusSchema.safeParse(to);
    if (!target.success || !/^[0-9a-f-]{36}$/i.test(orderId)) return fail("Invalid request.");
    const db = await getDb();
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
      if (!order) return fail("Order not found.");
      if (!canTransition(order.status, target.data)) return fail(`Can't move an order from “${STATUS_META[order.status].short}” to “${STATUS_META[target.data].short}”.`);
      const now = new Date();
      const patch: Partial<typeof s.orders.$inferInsert> = { status: target.data, updatedAt: now };
      if (target.data === "confirmed") {
        patch.estimatedDeliveryAt = new Date(now.getTime() + order.etaMaxMinutes * 60_000);
        patch.paymentStatus = "simulated_captured";
      }
      if (target.data === "delivered") patch.deliveredAt = now;
      if (target.data === "rejected" || target.data === "cancelled") patch.paymentStatus = "simulated_voided";
      await tx.update(s.orders).set(patch).where(eq(s.orders.id, order.id));
      await tx.insert(s.orderEvents).values({ orderId: order.id, status: target.data, actorId: actor.id, note: note ? cleanText(note, 200) : null });

      // restock tracked items when an order is voided
      if (target.data === "rejected" || target.data === "cancelled") {
        const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
        for (const i of items) {
          if (!i.productId) continue;
          await tx
            .update(s.inventory)
            .set({ stockLevel: sql`${s.inventory.stockLevel} + ${i.quantity}`, soldOut: false })
            .where(and(eq(s.inventory.productId, i.productId), sql`${s.inventory.stockLevel} IS NOT NULL`));
        }
      }
      const copy = NOTIFICATION_COPY[target.data];
      if (copy && order.userId) {
        await tx.insert(s.notifications).values({ audience: "customer", userId: order.userId, orderId: order.id, type: `order.${target.data}`, title: copy.title, body: copy.body(order.number), href: `/account/orders/${order.number}` });
      }
      // the "new order" alert is resolved once someone acts on it
      await tx.update(s.notifications).set({ readAt: now }).where(and(eq(s.notifications.orderId, order.id), eq(s.notifications.audience, "admin"), isNull(s.notifications.readAt)));
      return { ok: true as const, data: { status: target.data as string, number: order.number, from: order.status } };
    });
    if (!result.ok) return result;
    await audit(actor, "order.status", "order", result.data.number, { from: result.data.from, to: result.data.status, note: note ?? null });
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    return { ok: true as const, data: { status: result.data.status } };
  });
}

export async function markAdminNotificationsReadAction(): Promise<ActionResult> {
  return guarded(async () => {
    await assertStaff("staff");
    const db = await getDb();
    await db.update(s.notifications).set({ readAt: new Date() }).where(and(eq(s.notifications.audience, "admin"), isNull(s.notifications.readAt)));
    return { ok: true as const };
  });
}

/* ───────────────────────────── Products ───────────────────────────── */

function productFromForm(form: FormData) {
  return productInputSchema.safeParse({
    name: form.get("name") ?? "",
    slug: (form.get("slug") as string) || slugify(String(form.get("name") ?? "")),
    categoryId: form.get("categoryId"),
    tagline: form.get("tagline") ?? "",
    description: form.get("description") ?? "",
    price: form.get("price"),
    calories: form.get("calories") || null,
    caffeineMg: form.get("caffeineMg") || null,
    tastingNotes: form.get("tastingNotes") ?? "",
    isAvailable: form.get("isAvailable") === "on",
    isFeatured: form.get("isFeatured") === "on",
    isSeasonal: form.get("isSeasonal") === "on",
    groupIds: form.getAll("groupIds"),
    vessel: form.get("vessel") ?? "mug",
    liquid: form.get("liquid") ?? "#b07b4b",
    top: form.get("top") ?? "#efe3d0",
    ice: form.get("ice") === "on",
  });
}

const MAX_IMAGE = 2 * 1024 * 1024;
const SIGNATURES: { type: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/png", test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/jpeg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/webp", test: (b) => b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** Validates an uploaded image by size and magic bytes (never trusting the declared MIME type). */
async function readImage(form: FormData): Promise<{ ok: true; image: { type: string; bytes: Buffer } | null } | { ok: false; error: string }> {
  const file = form.get("image");
  if (!file || typeof file === "string" || (file as File).size === 0) return { ok: true, image: null };
  const f = file as File;
  if (f.size > MAX_IMAGE) return { ok: false, error: "Images must be 2 MB or smaller." };
  const bytes = Buffer.from(await f.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) return { ok: false, error: "Upload a PNG, JPEG or WebP image." };
  return { ok: true, image: { type: sig.type, bytes } };
}

export async function saveProductAction(_prev: unknown, form: FormData): Promise<ActionResult<{ id: number }>> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const rl = rateLimit(`admin-write:${actor.id}`, 120, 60_000);
    if (!rl.ok) return fail("Slow down a little — too many changes at once.");
    const parsed = productFromForm(form);
    if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
    const img = await readImage(form);
    if (!img.ok) return fail(img.error, { fieldErrors: { image: img.error } });
    const d = parsed.data;
    const idRaw = form.get("id");
    const id = idRaw ? Number(idRaw) : null;
    const db = await getDb();

    const clash = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, d.slug));
    if (clash.length && clash[0]!.id !== id) return fail("Another product already uses that URL slug.", { fieldErrors: { slug: "Slug already in use." } });
    const [cat] = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.id, d.categoryId));
    if (!cat) return fail("Choose a valid category.", { fieldErrors: { categoryId: "Choose a category." } });

    let imageId: string | undefined;
    if (img.image) {
      const [row] = await db.insert(s.productImages).values({ contentType: img.image.type, bytes: img.image.bytes, size: img.image.bytes.length }).returning({ id: s.productImages.id });
      imageId = row!.id;
    }
    const values = {
      name: d.name,
      slug: d.slug,
      categoryId: d.categoryId,
      tagline: d.tagline,
      description: d.description,
      basePriceCents: Math.round(d.price * 100),
      calories: d.calories ?? null,
      caffeineMg: d.caffeineMg ?? null,
      tastingNotes: d.tastingNotes,
      isAvailable: d.isAvailable,
      isFeatured: d.isFeatured,
      isSeasonal: d.isSeasonal,
      visual: { vessel: d.vessel, liquid: d.liquid, top: d.top, ice: d.ice },
      updatedAt: new Date(),
      ...(imageId ? { imageId } : {}),
    };
    let productId: number;
    if (id) {
      const [before] = await db.select().from(s.products).where(eq(s.products.id, id));
      if (!before) return fail("Product not found.");
      await db.update(s.products).set({ ...values, visual: { ...before.visual, ...values.visual } }).where(eq(s.products.id, id));
      productId = id;
      await audit(actor, "product.update", "product", id, { name: d.name, priceFrom: before.basePriceCents, priceTo: values.basePriceCents });
    } else {
      const [row] = await db.insert(s.products).values(values).returning({ id: s.products.id });
      productId = row!.id;
      await db.insert(s.inventory).values({ productId }).onConflictDoNothing();
      await audit(actor, "product.create", "product", productId, { name: d.name });
    }
    await db.delete(s.productOptionGroups).where(eq(s.productOptionGroups.productId, productId));
    if (d.groupIds.length) {
      const valid = await db.select({ id: s.optionGroups.id }).from(s.optionGroups).where(inArray(s.optionGroups.id, d.groupIds));
      if (valid.length) await db.insert(s.productOptionGroups).values(valid.map((g) => ({ productId, groupId: g.id })));
    }
    revalidatePath("/admin/products");
    revalidatePath("/menu");
    return { ok: true as const, data: { id: productId } };
  });
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    if (!Number.isInteger(id)) return fail("Invalid product.");
    const db = await getDb();
    const [p] = await db.delete(s.products).where(eq(s.products.id, id)).returning({ name: s.products.name });
    if (!p) return fail("Product not found.");
    await audit(actor, "product.delete", "product", id, { name: p.name });
    revalidatePath("/admin/products");
    revalidatePath("/menu");
    return { ok: true as const };
  });
}

export async function setProductAvailabilityAction(id: number, available: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("staff");
    const db = await getDb();
    const r = await db.update(s.products).set({ isAvailable: available, updatedAt: new Date() }).where(eq(s.products.id, id)).returning({ id: s.products.id });
    if (!r.length) return fail("Product not found.");
    await audit(actor, available ? "product.enable" : "product.disable", "product", id);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    return { ok: true as const };
  });
}

/* ───────────────────────────── Categories ───────────────────────────── */

export async function saveCategoryAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const name = cleanText(String(form.get("name") ?? ""), 60);
    const description = cleanText(String(form.get("description") ?? ""), 240);
    const sortOrder = Math.max(0, Math.min(999, Number(form.get("sortOrder") ?? 0) || 0));
    const isActive = form.get("isActive") === "on";
    if (name.length < 2) return fail("Name is required.", { fieldErrors: { name: "Name is required." } });
    const db = await getDb();
    const id = Number(form.get("id") ?? 0);
    const slug = slugify(name);
    if (id) {
      await db.update(s.categories).set({ name, description, sortOrder, isActive }).where(eq(s.categories.id, id));
      await audit(actor, "category.update", "category", id, { name });
    } else {
      const exists = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, slug));
      if (exists.length) return fail("A category with that name already exists.");
      const [row] = await db.insert(s.categories).values({ name, slug, description, sortOrder, isActive }).returning({ id: s.categories.id });
      await audit(actor, "category.create", "category", row!.id, { name });
    }
    revalidatePath("/admin/categories");
    revalidatePath("/menu");
    return { ok: true as const };
  });
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const db = await getDb();
    const used = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.categoryId, id)).limit(1);
    if (used.length) return fail("Move or delete this category's products first.");
    await db.delete(s.categories).where(eq(s.categories.id, id));
    await audit(actor, "category.delete", "category", id);
    revalidatePath("/admin/categories");
    return { ok: true as const };
  });
}

/* ───────────────────────────── Customizations ───────────────────────────── */

export async function saveOptionAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const groupId = Number(form.get("groupId"));
    const name = cleanText(String(form.get("name") ?? ""), 60);
    const price = Number(form.get("price") ?? 0);
    if (!groupId || name.length < 1) return fail("Option name is required.");
    if (!Number.isFinite(price) || price < -5 || price > 20) return fail("Price change must be between −$5 and $20.");
    const db = await getDb();
    const id = Number(form.get("id") ?? 0);
    const values = { groupId, name, priceDeltaCents: Math.round(price * 100), isAvailable: form.get("isAvailable") !== "off" };
    if (id) await db.update(s.options).set(values).where(eq(s.options.id, id));
    else await db.insert(s.options).values({ ...values, sortOrder: 99 });
    await audit(actor, id ? "option.update" : "option.create", "option", id || null, { name, price });
    revalidatePath("/admin/customizations");
    return { ok: true as const };
  });
}

export async function toggleOptionAction(id: number, available: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("staff");
    const db = await getDb();
    await db.update(s.options).set({ isAvailable: available }).where(eq(s.options.id, id));
    await audit(actor, "option.availability", "option", id, { available });
    revalidatePath("/admin/customizations");
    return { ok: true as const };
  });
}

export async function deleteOptionAction(id: number): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const db = await getDb();
    await db.delete(s.options).where(eq(s.options.id, id));
    await audit(actor, "option.delete", "option", id);
    revalidatePath("/admin/customizations");
    return { ok: true as const };
  });
}

/* ───────────────────────────── Inventory ───────────────────────────── */

export async function updateInventoryAction(productId: number, input: { stockLevel: number | null; lowStockThreshold: number; soldOut: boolean }): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("staff");
    const parsed = z
      .object({ stockLevel: z.number().int().min(0).max(100000).nullable(), lowStockThreshold: z.number().int().min(0).max(10000), soldOut: z.boolean() })
      .safeParse(input);
    if (!parsed.success) return fail("Stock values must be whole numbers.");
    const db = await getDb();
    await db
      .insert(s.inventory)
      .values({ productId, ...parsed.data })
      .onConflictDoUpdate({ target: s.inventory.productId, set: { ...parsed.data, updatedAt: new Date() } });
    await audit(actor, "inventory.update", "product", productId, parsed.data);
    revalidatePath("/admin/inventory");
    revalidatePath("/menu");
    return { ok: true as const };
  });
}

/* ───────────────────────────── Delivery ───────────────────────────── */

export async function saveZoneAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const parsed = zoneInputSchema.safeParse({
      name: form.get("name") ?? "",
      postalCodes: form.get("postalCodes") ?? "",
      fee: form.get("fee"),
      minOrder: form.get("minOrder"),
      freeOver: form.get("freeOver") || null,
      etaMin: form.get("etaMin"),
      etaMax: form.get("etaMax"),
      isActive: form.get("isActive") === "on",
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
    const d = parsed.data;
    const values = {
      name: d.name,
      postalCodes: d.postalCodes,
      feeCents: Math.round(d.fee * 100),
      minOrderCents: Math.round(d.minOrder * 100),
      freeOverCents: d.freeOver ? Math.round(d.freeOver * 100) : null,
      etaMinMinutes: d.etaMin,
      etaMaxMinutes: d.etaMax,
      isActive: d.isActive,
    };
    const db = await getDb();
    const id = Number(form.get("id") ?? 0);
    if (id) await db.update(s.deliveryZones).set(values).where(eq(s.deliveryZones.id, id));
    else await db.insert(s.deliveryZones).values({ ...values, sortOrder: 99 });
    await audit(actor, id ? "zone.update" : "zone.create", "delivery_zone", id || null, values);
    revalidatePath("/admin/delivery");
    revalidatePath("/delivery");
    return { ok: true as const };
  });
}

export async function deleteZoneAction(id: number): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const db = await getDb();
    await db.delete(s.deliveryZones).where(eq(s.deliveryZones.id, id));
    await audit(actor, "zone.delete", "delivery_zone", id);
    revalidatePath("/admin/delivery");
    return { ok: true as const };
  });
}

export async function saveDeliverySettingsAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const prep = Math.round(Number(form.get("prep_minutes")));
    const tax = Math.round(Number(form.get("tax_rate")) * 100);
    if (!Number.isFinite(prep) || prep < 1 || prep > 120) return fail("Prep time must be 1–120 minutes.");
    if (!Number.isFinite(tax) || tax < 0 || tax > 2000) return fail("Tax rate must be between 0% and 20%.");
    const entries: Record<string, unknown> = {
      prep_minutes: prep,
      tax_rate_bps: tax,
      delivery_paused: form.get("delivery_paused") === "on",
      delivery_notice: cleanText(String(form.get("delivery_notice") ?? ""), 240),
    };
    const db = await getDb();
    for (const [key, value] of Object.entries(entries)) {
      await db.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: new Date() } });
    }
    await audit(actor, "settings.delivery", "settings", null, entries);
    revalidatePath("/admin/delivery");
    revalidatePath("/delivery");
    return { ok: true as const };
  });
}

/* ───────────────────────────── Discounts ───────────────────────────── */

export async function saveDiscountAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const parsed = discountInputSchema.safeParse({
      code: form.get("code") ?? "",
      description: form.get("description") ?? "",
      type: form.get("type"),
      value: form.get("value"),
      minSubtotal: form.get("minSubtotal") || 0,
      maxRedemptions: form.get("maxRedemptions") || null,
      startsAt: form.get("startsAt") || null,
      endsAt: form.get("endsAt") || null,
      isActive: form.get("isActive") === "on",
    });
    if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
    const d = parsed.data;
    const toDate = (v: string | null | undefined) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
    const values = {
      code: d.code,
      description: d.description,
      type: d.type,
      value: d.type === "percent" ? Math.round(d.value) : Math.round(d.value * 100),
      minSubtotalCents: Math.round(d.minSubtotal * 100),
      maxRedemptions: d.maxRedemptions ?? null,
      startsAt: toDate(d.startsAt),
      endsAt: toDate(d.endsAt),
      isActive: d.isActive,
    };
    const db = await getDb();
    const id = Number(form.get("id") ?? 0);
    const clash = await db.select({ id: s.discounts.id }).from(s.discounts).where(eq(s.discounts.code, d.code));
    if (clash.length && clash[0]!.id !== id) return fail("That code already exists.", { fieldErrors: { code: "Code already exists." } });
    if (id) await db.update(s.discounts).set(values).where(eq(s.discounts.id, id));
    else await db.insert(s.discounts).values(values);
    await audit(actor, id ? "discount.update" : "discount.create", "discount", id || d.code, values);
    revalidatePath("/admin/discounts");
    return { ok: true as const };
  });
}

export async function toggleDiscountAction(id: number, active: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const db = await getDb();
    await db.update(s.discounts).set({ isActive: active }).where(eq(s.discounts.id, id));
    await audit(actor, active ? "discount.activate" : "discount.deactivate", "discount", id);
    revalidatePath("/admin/discounts");
    return { ok: true as const };
  });
}

export async function deleteDiscountAction(id: number): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await assertStaff("admin");
    const db = await getDb();
    await db.delete(s.discounts).where(eq(s.discounts.id, id));
    await audit(actor, "discount.delete", "discount", id);
    revalidatePath("/admin/discounts");
    return { ok: true as const };
  });
}
