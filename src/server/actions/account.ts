"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema as s } from "@/lib/db";
import { assertUser } from "@/lib/auth/session";
import { addressSchema, zodFieldErrors } from "@/lib/validation";
import { fail, type ActionResult } from "../result";
import { guarded } from "../safe-action";

function addressFromForm(form: FormData) {
  return addressSchema.safeParse({
    label: form.get("label") ?? "",
    recipient: form.get("recipient") ?? "",
    line1: form.get("line1") ?? "",
    line2: form.get("line2") ?? "",
    city: form.get("city") ?? "",
    state: form.get("state") ?? "",
    postalCode: form.get("postalCode") ?? "",
    instructions: form.get("instructions") ?? "",
    isDefault: form.get("isDefault") === "on",
  });
}

export async function saveAddressAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    const parsed = addressFromForm(form);
    if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
    const id = String(form.get("id") ?? "");
    const db = await getDb();
    const count = (await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id))).length;
    const makeDefault = parsed.data.isDefault || count === 0;

    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Address not found.");
      const updated = await db
        .update(s.addresses)
        .set({ ...parsed.data, isDefault: makeDefault })
        .where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id))) // ownership enforced in the WHERE clause
        .returning({ id: s.addresses.id });
      if (!updated.length) return fail("Address not found.");
      if (makeDefault) await db.update(s.addresses).set({ isDefault: false }).where(and(eq(s.addresses.userId, user.id), ne(s.addresses.id, id)));
    } else {
      if (count >= 10) return fail("You can save up to 10 addresses.");
      const [row] = await db.insert(s.addresses).values({ ...parsed.data, isDefault: makeDefault, userId: user.id }).returning({ id: s.addresses.id });
      if (makeDefault) await db.update(s.addresses).set({ isDefault: false }).where(and(eq(s.addresses.userId, user.id), ne(s.addresses.id, row!.id)));
    }
    revalidatePath("/account/addresses");
    return { ok: true as const };
  });
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Address not found.");
    const db = await getDb();
    const removed = await db.delete(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id))).returning();
    if (!removed.length) return fail("Address not found.");
    if (removed[0]!.isDefault) {
      const [next] = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id)).limit(1);
      if (next) await db.update(s.addresses).set({ isDefault: true }).where(eq(s.addresses.id, next.id));
    }
    revalidatePath("/account/addresses");
    return { ok: true as const };
  });
}

export async function toggleFavoriteAction(productId: number): Promise<ActionResult<{ favorite: boolean }>> {
  return guarded(async () => {
    const user = await assertUser();
    if (!Number.isInteger(productId) || productId <= 0) return fail("Unknown product.");
    const db = await getDb();
    const [product] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, productId));
    if (!product) return fail("Unknown product.");
    const removed = await db
      .delete(s.favorites)
      .where(and(eq(s.favorites.userId, user.id), eq(s.favorites.productId, productId)))
      .returning();
    if (removed.length) {
      revalidatePath("/account/favorites");
      return { ok: true as const, data: { favorite: false } };
    }
    await db.insert(s.favorites).values({ userId: user.id, productId }).onConflictDoNothing();
    revalidatePath("/account/favorites");
    return { ok: true as const, data: { favorite: true } };
  });
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    const db = await getDb();
    const filter = and(eq(s.notifications.userId, user.id), eq(s.notifications.audience, "customer"), isNull(s.notifications.readAt));
    if (ids && ids.length) {
      for (const id of ids.slice(0, 50)) {
        if (!/^[0-9a-f-]{36}$/i.test(id)) continue;
        await db.update(s.notifications).set({ readAt: new Date() }).where(and(filter, eq(s.notifications.id, id)));
      }
    } else {
      await db.update(s.notifications).set({ readAt: new Date() }).where(filter);
    }
    return { ok: true as const };
  });
}
