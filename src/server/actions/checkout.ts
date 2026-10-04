"use server";

import { and, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema as s } from "@/lib/db";
import { assertUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { checkoutSchema, cartLineSchema, zodFieldErrors } from "@/lib/validation";
import { computeTotals, resolveSelections, type DiscountRule } from "@/lib/pricing";
import { getProductsByIds, getSetting } from "../queries/catalog";
import { fail, type ActionResult } from "../result";
import { guarded } from "../safe-action";

type PricedLine = { productId: number; name: string; slug: string; quantity: number; unitPriceCents: number; options: s.OrderItemOption[]; lineTotalCents: number };

async function priceLines(lines: z.infer<typeof cartLineSchema>[]) {
  const products = await getProductsByIds(Array.from(new Set(lines.map((l) => l.productId))));
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) return { ok: false as const, error: "An item in your bag is no longer on the menu. Please remove it and try again." };
    if (!p.available) return { ok: false as const, error: `${p.name} is ${p.soldOut ? "sold out" : "unavailable"} right now — please remove it to continue.` };
    const r = resolveSelections(p.basePriceCents, p.groups, line.selections);
    if (!r.ok) return { ok: false as const, error: `${p.name}: ${r.error}` };
    priced.push({ productId: p.id, name: p.name, slug: p.slug, quantity: line.quantity, unitPriceCents: r.unitPriceCents, options: r.options, lineTotalCents: r.unitPriceCents * line.quantity });
  }
  return { ok: true as const, lines: priced, subtotalCents: priced.reduce((a, l) => a + l.lineTotalCents, 0) };
}

async function findZone(postalCode: string) {
  const db = await getDb();
  const zones = await db.select().from(s.deliveryZones).where(eq(s.deliveryZones.isActive, true));
  return zones.find((z) => z.postalCodes.includes(postalCode.slice(0, 5))) ?? null;
}

async function findDiscount(code: string | null | undefined, subtotalCents: number): Promise<{ rule: DiscountRule & { id: number; code: string }; error?: undefined } | { rule: null; error?: string }> {
  if (!code) return { rule: null };
  const db = await getDb();
  const now = new Date();
  const [d] = await db
    .select()
    .from(s.discounts)
    .where(
      and(
        eq(s.discounts.code, code.toUpperCase()),
        eq(s.discounts.isActive, true),
        or(isNull(s.discounts.startsAt), lt(s.discounts.startsAt, now)),
        or(isNull(s.discounts.endsAt), gte(s.discounts.endsAt, now)),
      ),
    )
    .limit(1);
  if (!d) return { rule: null, error: "That code isn't valid or has expired." };
  if (d.maxRedemptions != null && d.redemptions >= d.maxRedemptions) return { rule: null, error: "That code has reached its limit." };
  if (subtotalCents < d.minSubtotalCents) return { rule: null, error: `Add $${((d.minSubtotalCents - subtotalCents) / 100).toFixed(2)} more to use ${d.code}.` };
  return { rule: { id: d.id, code: d.code, type: d.type, value: d.value, minSubtotalCents: d.minSubtotalCents } };
}

const quoteSchema = z.object({
  lines: z.array(cartLineSchema).max(30),
  postalCode: z.string().trim().regex(/^\d{5}$/).optional().nullable(),
  discountCode: z.string().trim().max(32).optional().nullable(),
  tipCents: z.number().int().min(0).max(10000).default(0),
});

export type Quote = {
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  zone: { name: string; etaMin: number; etaMax: number; minOrderCents: number; freeOverCents: number | null } | null;
  zoneError?: string;
  discountCode?: string;
  discountError?: string;
  minOrderShortfallCents: number;
  deliveryPaused: boolean;
};

/** Authoritative price preview used by the checkout UI. */
export async function quoteAction(input: z.input<typeof quoteSchema>): Promise<ActionResult<Quote>> {
  return guarded(async () => {
    await assertUser();
    const parsed = quoteSchema.safeParse(input);
    if (!parsed.success) return fail("We couldn't price your bag.");
    const priced = await priceLines(parsed.data.lines);
    if (!priced.ok) return fail(priced.error);
    const zone = parsed.data.postalCode ? await findZone(parsed.data.postalCode) : null;
    const discount = await findDiscount(parsed.data.discountCode, priced.subtotalCents);
    const taxRateBps = await getSetting<number>("tax_rate_bps", 0);
    const paused = await getSetting<boolean>("delivery_paused", false);
    const totals = computeTotals({ subtotalCents: priced.subtotalCents, discount: discount.rule, zone, taxRateBps, tipCents: parsed.data.tipCents });
    return {
      ok: true as const,
      data: {
        ...totals,
        zone: zone ? { name: zone.name, etaMin: zone.etaMinMinutes, etaMax: zone.etaMaxMinutes, minOrderCents: zone.minOrderCents, freeOverCents: zone.freeOverCents } : null,
        zoneError: parsed.data.postalCode && !zone ? "We don't deliver to that ZIP code yet." : undefined,
        discountCode: discount.rule?.code,
        discountError: discount.error,
        minOrderShortfallCents: zone ? Math.max(0, zone.minOrderCents - priced.subtotalCents) : 0,
        deliveryPaused: paused,
      },
    };
  });
}

export async function placeOrderAction(input: z.input<typeof checkoutSchema>): Promise<ActionResult<{ number: string }>> {
  return guarded(async () => {
    const user = await assertUser();
    const rl = rateLimit(`checkout:${user.id}`, 8, 10 * 60_000);
    if (!rl.ok) return fail("You've placed several orders in a short time. Please wait a moment and try again.");

    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return fail("Please review your delivery and payment details.", { fieldErrors: zodFieldErrors(parsed.error) });
    const data = parsed.data;
    const db = await getDb();

    if (await getSetting<boolean>("delivery_paused", false)) return fail("Delivery is paused for a moment while the café catches up. Please try again shortly.");

    // Resolve delivery address (owned saved address, or a new one)
    let address: s.AddressSnapshot;
    if (data.addressId) {
      const [a] = await db.select().from(s.addresses).where(and(eq(s.addresses.id, data.addressId), eq(s.addresses.userId, user.id)));
      if (!a) return fail("Please choose a delivery address.");
      address = { recipient: a.recipient, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, instructions: a.instructions, phone: data.phone ?? user.phone };
    } else if (data.address) {
      address = { ...data.address, phone: data.phone ?? user.phone };
    } else {
      return fail("Please add a delivery address.");
    }

    const zone = await findZone(address.postalCode);
    if (!zone) return fail(`We don't deliver to ${address.postalCode} yet. See our delivery map for covered neighborhoods.`, { code: "zone" });

    const priced = await priceLines(data.lines);
    if (!priced.ok) return fail(priced.error, { code: "items" });
    if (priced.subtotalCents < zone.minOrderCents)
      return fail(`${zone.name} has a $${(zone.minOrderCents / 100).toFixed(2)} minimum. Add a little more to your bag.`, { code: "minimum" });

    const discount = await findDiscount(data.discountCode, priced.subtotalCents);
    if (data.discountCode && discount.error) return fail(discount.error, { fieldErrors: { discountCode: discount.error } });

    // ── Simulated payment authorisation ─────────────────────────────
    // No card number ever reaches the server. The demo "declines" the published test-decline card.
    if (data.payment.last4 === "0002") return fail("Your demo card was declined (test-decline card). Try 4242 4242 4242 4242.", { code: "card_declined" });

    const taxRateBps = await getSetting<number>("tax_rate_bps", 0);
    const prepMinutes = await getSetting<number>("prep_minutes", 8);
    const totals = computeTotals({ subtotalCents: priced.subtotalCents, discount: discount.rule, zone, taxRateBps, tipCents: data.tipCents });
    const now = Date.now();

    let result: { number: string };
    try {
    result = await db.transaction(async (tx) => {
      // Stock check + decrement (atomic, conditional)
      for (const line of priced.lines) {
        const res = await tx
          .update(s.inventory)
          .set({ stockLevel: sql`${s.inventory.stockLevel} - ${line.quantity}`, updatedAt: new Date() })
          .where(and(eq(s.inventory.productId, line.productId), sql`${s.inventory.stockLevel} IS NOT NULL`, gte(s.inventory.stockLevel, line.quantity)))
          .returning({ left: s.inventory.stockLevel });
        if (!res.length) {
          const [inv] = await tx.select().from(s.inventory).where(eq(s.inventory.productId, line.productId));
          if (inv && inv.stockLevel != null) throw new StockError(line.name);
        } else if (res[0]!.left === 0) {
          await tx.update(s.inventory).set({ soldOut: true }).where(eq(s.inventory.productId, line.productId));
        }
      }
      if (discount.rule) {
        const bumped = await tx
          .update(s.discounts)
          .set({ redemptions: sql`${s.discounts.redemptions} + 1` })
          .where(and(eq(s.discounts.id, discount.rule.id), or(isNull(s.discounts.maxRedemptions), lt(s.discounts.redemptions, s.discounts.maxRedemptions))))
          .returning({ id: s.discounts.id });
        if (!bumped.length) throw new DiscountError();
      }

      const seqRes = await tx.execute<{ v: string | number }>(sql`select nextval(pg_get_serial_sequence('orders', 'seq')) as v`);
      const seq = Number((seqRes as unknown as { rows: { v: string | number }[] }).rows[0]!.v);
      const number = `AR-${1000 + seq}`;

      const [order] = await tx
        .insert(s.orders)
        .values({
          seq,
          number,
          userId: user.id,
          status: "placed",
          address,
          zoneId: zone.id,
          zoneName: zone.name,
          ...totals,
          discountCode: discount.rule?.code ?? null,
          paymentStatus: "simulated_authorized",
          paymentBrand: data.payment.brand,
          paymentLast4: data.payment.last4,
          paymentRef: `sim_${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          notes: data.notes,
          etaMinMinutes: zone.etaMinMinutes,
          etaMaxMinutes: zone.etaMaxMinutes,
          estimatedReadyAt: new Date(now + prepMinutes * 60_000),
          estimatedDeliveryAt: new Date(now + zone.etaMaxMinutes * 60_000),
        })
        .returning({ id: s.orders.id, number: s.orders.number });

      await tx.insert(s.orderItems).values(
        priced.lines.map((l) => ({
          orderId: order!.id,
          productId: l.productId,
          productName: l.name,
          productSlug: l.slug,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          options: l.options,
          lineTotalCents: l.lineTotalCents,
        })),
      );
      await tx.insert(s.orderEvents).values({ orderId: order!.id, status: "placed", actorId: user.id });

      const itemsSummary = priced.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ");
      await tx.insert(s.notifications).values([
        {
          audience: "customer",
          userId: user.id,
          orderId: order!.id,
          type: "order.placed",
          title: "Order placed",
          body: `We've received order ${number}. We'll let you know the moment the café accepts it.`,
          href: `/account/orders/${number}`,
        },
        {
          audience: "admin",
          orderId: order!.id,
          type: "order.new",
          title: `New order ${number}`,
          body: `${itemsSummary} · ${(totals.totalCents / 100).toFixed(2)} USD`.slice(0, 280),
          href: `/admin/orders/${number}`,
        },
      ]);

      if (data.saveAddress && data.address && !data.addressId) {
        const existing = await tx.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id));
        if (existing.length < 10)
          await tx.insert(s.addresses).values({ ...data.address, userId: user.id, label: existing.length ? "Saved" : "Home", isDefault: existing.length === 0 });
      }
      if (data.phone && data.phone !== user.phone) await tx.update(s.users).set({ phone: data.phone }).where(eq(s.users.id, user.id));

      const [cart] = await tx.select({ id: s.carts.id }).from(s.carts).where(eq(s.carts.userId, user.id));
      if (cart) await tx.delete(s.cartItems).where(eq(s.cartItems.cartId, cart.id));
      return { number: order!.number };
    });
    } catch (err) {
      if (err instanceof StockError) return fail(`${err.item} just sold out. Please remove it and try again.`, { code: "stock" });
      if (err instanceof DiscountError) return fail("That code has just reached its limit.", { code: "discount" });
      throw err;
    }

    revalidatePath("/account");
    revalidatePath("/admin");
    return { ok: true as const, data: result };
  });
}

class StockError extends Error {
  constructor(public item: string) {
    super("stock");
  }
}
class DiscountError extends Error {}
