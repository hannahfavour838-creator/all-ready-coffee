"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cartLineSchema } from "@/lib/validation";
import { defaultSelections, lineKey, resolveSelections } from "@/lib/pricing";
import type { ProductVisual } from "@/lib/db/schema";
import { getProductsByIds } from "../queries/catalog";
import { guarded } from "../safe-action";
import { fail, type ActionResult } from "../result";

export type HydratedCartLine = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  visual: ProductVisual;
  quantity: number;
  selections: Record<string, number[]>;
  unitPriceCents: number;
  optionLabels: string[];
};

/** Persist the signed-in customer's bag server-side so it follows them across devices. */
export async function syncCartAction(lines: z.input<typeof cartLineSchema>[]): Promise<ActionResult<{ lines: HydratedCartLine[] }>> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return { ok: true as const, data: { lines: [] } };
    const parsed = z.array(cartLineSchema).max(30).safeParse(lines);
    if (!parsed.success) return fail("Invalid bag.");
    const db = await getDb();
    let [cart] = await db.select().from(s.carts).where(eq(s.carts.userId, user.id));
    if (!cart) [cart] = await db.insert(s.carts).values({ userId: user.id }).returning();
    await db.delete(s.cartItems).where(eq(s.cartItems.cartId, cart!.id));
    const products = await getProductsByIds(parsed.data.map((l) => l.productId));
    const valid = parsed.data.filter((l) => products.some((p) => p.id === l.productId));
    if (valid.length)
      await db.insert(s.cartItems).values(valid.map((l) => ({ cartId: cart!.id, productId: l.productId, quantity: l.quantity, selections: l.selections, lineKey: lineKey(l.productId, l.selections) })));
    await db.update(s.carts).set({ updatedAt: new Date() }).where(eq(s.carts.id, cart!.id));
    return { ok: true as const, data: { lines: [] } };
  });
}

/** Fetch the server-side bag (used to merge on sign-in). */
export async function loadCartAction(): Promise<ActionResult<{ lines: HydratedCartLine[] }>> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return { ok: true as const, data: { lines: [] } };
    const db = await getDb();
    const [cart] = await db.select().from(s.carts).where(eq(s.carts.userId, user.id));
    if (!cart) return { ok: true as const, data: { lines: [] } };
    const items = await db.select().from(s.cartItems).where(eq(s.cartItems.cartId, cart.id));
    const products = await getProductsByIds(items.map((i) => i.productId));
    const lines = items
      .map((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p || !p.available) return null;
        const r = resolveSelections(p.basePriceCents, p.groups, i.selections);
        if (!r.ok) return null;
        return {
          key: lineKey(p.id, r.selections),
          productId: p.id,
          slug: p.slug,
          name: p.name,
          imageUrl: p.imageUrl,
          visual: p.visual,
          quantity: i.quantity,
          selections: r.selections,
          unitPriceCents: r.unitPriceCents,
          optionLabels: r.options.map((o) => o.name),
        };
      })
      .filter((x): x is HydratedCartLine => !!x);
    return { ok: true as const, data: { lines } };
  });
}

/** Rebuild cart lines from a previous order (owner only). Options are matched by name; unavailable items are skipped. */
export async function reorderAction(number: string): Promise<ActionResult<{ lines: HydratedCartLine[]; skipped: number }>> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("Please sign in to reorder.", { code: "unauthenticated" });
    if (!/^AR-\d{3,8}$/.test(number)) return fail("Order not found.");
    const db = await getDb();
    const [order] = await db.select({ id: s.orders.id }).from(s.orders).where(and(eq(s.orders.number, number), eq(s.orders.userId, user.id)));
    if (!order) return fail("Order not found.");
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
    const products = await getProductsByIds(items.map((i) => i.productId).filter((x): x is number => x != null));
    const lines: HydratedCartLine[] = [];
    let skipped = 0;
    for (const item of items) {
      const p = products.find((x) => x.id === item.productId);
      if (!p || !p.available) {
        skipped++;
        continue;
      }
      const sel = defaultSelections(p.groups);
      for (const g of p.groups) {
        const wanted = item.options.filter((o) => o.group === g.name).map((o) => g.options.find((x) => x.name === o.name && x.isAvailable)?.id).filter((x): x is number => !!x);
        if (wanted.length) sel[g.key] = g.type === "single" ? [wanted[0]!] : wanted;
      }
      const r = resolveSelections(p.basePriceCents, p.groups, sel);
      if (!r.ok) {
        skipped++;
        continue;
      }
      lines.push({ key: lineKey(p.id, r.selections), productId: p.id, slug: p.slug, name: p.name, imageUrl: p.imageUrl, visual: p.visual, quantity: item.quantity, selections: r.selections, unitPriceCents: r.unitPriceCents, optionLabels: r.options.map((o) => o.name) });
    }
    return { ok: true as const, data: { lines, skipped } };
  });
}
