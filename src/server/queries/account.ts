import "server-only";
import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { getProductsByIds } from "./catalog";

export async function getUserOrders(userId: string, opts: { active?: boolean; limit?: number } = {}) {
  const db = await getDb();
  const finished = ["delivered", "rejected", "cancelled"] as const;
  const where =
    opts.active === true
      ? and(eq(s.orders.userId, userId), notInArray(s.orders.status, [...finished]))
      : opts.active === false
        ? and(eq(s.orders.userId, userId), inArray(s.orders.status, [...finished]))
        : eq(s.orders.userId, userId);
  const orders = await db.select().from(s.orders).where(where).orderBy(desc(s.orders.createdAt)).limit(opts.limit ?? 50);
  if (!orders.length) return [];
  const items = await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, orders.map((o) => o.id)));
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export type UserOrder = Awaited<ReturnType<typeof getUserOrders>>[number];

/** Fetch an order by number, scoped to its owner (ownership enforced in SQL). */
export async function getUserOrder(userId: string, number: string) {
  if (!/^AR-\d{3,8}$/.test(number)) return null;
  const db = await getDb();
  const [order] = await db.select().from(s.orders).where(and(eq(s.orders.number, number), eq(s.orders.userId, userId))).limit(1);
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(asc(s.orderEvents.createdAt)),
  ]);
  return { ...order, items, events };
}

export async function getFavorites(userId: string) {
  const db = await getDb();
  const favs = await db.select().from(s.favorites).where(eq(s.favorites.userId, userId)).orderBy(desc(s.favorites.createdAt));
  const products = await getProductsByIds(favs.map((f) => f.productId));
  return favs.map((f) => products.find((p) => p.id === f.productId)).filter((p): p is NonNullable<typeof p> => !!p);
}

export async function getAddresses(userId: string) {
  const db = await getDb();
  return db.select().from(s.addresses).where(eq(s.addresses.userId, userId)).orderBy(desc(s.addresses.isDefault), asc(s.addresses.createdAt));
}

export async function getAccountStats(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ orders: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(${s.orders.totalCents}),0)::int`, since: sql<Date>`min(${s.orders.createdAt})` })
    .from(s.orders)
    .where(and(eq(s.orders.userId, userId), eq(s.orders.status, "delivered")));
  const [top] = await db
    .select({ name: s.orderItems.productName, slug: s.orderItems.productSlug, qty: sql<number>`sum(${s.orderItems.quantity})::int` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(eq(s.orders.userId, userId))
    .groupBy(s.orderItems.productName, s.orderItems.productSlug)
    .orderBy(desc(sql`sum(${s.orderItems.quantity})`))
    .limit(1);
  return { orders: row?.orders ?? 0, spentCents: row?.spent ?? 0, top: top ?? null };
}

export async function getUserProfile(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, phone: s.users.phone, marketingOptIn: s.users.marketingOptIn, smsUpdates: s.users.smsUpdates, createdAt: s.users.createdAt })
    .from(s.users)
    .where(eq(s.users.id, userId));
  return u ?? null;
}
