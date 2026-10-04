import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import type { OrderStatus } from "@/lib/db/schema";
import { dayKey, startOfBusinessDay, zonedParts } from "@/lib/time";

const DAY = 86_400_000;
const startOfDay = (d = new Date()) => startOfBusinessDay(d);

export async function getDashboard() {
  const db = await getDb();
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 6 * DAY);
  const lastWeekStart = new Date(weekAgo.getTime() - 7 * DAY);
  const valid = sql`${s.orders.status} not in ('rejected','cancelled')`;

  const agg = async (from: Date, to?: Date) => {
    const conds: SQL[] = [gte(s.orders.createdAt, from), valid];
    if (to) conds.push(sql`${s.orders.createdAt} < ${to}`);
    const [r] = await db
      .select({ n: sql<number>`count(*)::int`, rev: sql<number>`coalesce(sum(${s.orders.totalCents}),0)::int` })
      .from(s.orders)
      .where(and(...conds));
    return { orders: r?.n ?? 0, revenue: r?.rev ?? 0 };
  };
  const [todayAgg, weekAgg, lastWeekAgg] = await Promise.all([agg(today), agg(weekAgo), agg(lastWeekStart, weekAgo)]);
  const [{ customers }] = (await db.select({ customers: sql<number>`count(*)::int` }).from(s.users).where(eq(s.users.role, "customer"))) as [{ customers: number }];
  const [{ newCustomers }] = (await db.select({ newCustomers: sql<number>`count(*)::int` }).from(s.users).where(and(eq(s.users.role, "customer"), gte(s.users.createdAt, weekAgo)))) as [{ newCustomers: number }];

  const statusCounts = await db
    .select({ status: s.orders.status, n: sql<number>`count(*)::int` })
    .from(s.orders)
    .where(inArray(s.orders.status, ["placed", "confirmed", "preparing", "ready", "out_for_delivery"]))
    .groupBy(s.orders.status);

  const lowStock = await db
    .select({ id: s.products.id, name: s.products.name, stock: s.inventory.stockLevel, threshold: s.inventory.lowStockThreshold, soldOut: s.inventory.soldOut })
    .from(s.inventory)
    .innerJoin(s.products, eq(s.products.id, s.inventory.productId))
    .where(or(eq(s.inventory.soldOut, true), sql`${s.inventory.stockLevel} is not null and ${s.inventory.stockLevel} <= ${s.inventory.lowStockThreshold}`));

  return {
    today: todayAgg,
    week: weekAgg,
    lastWeek: lastWeekAgg,
    aovCents: weekAgg.orders ? Math.round(weekAgg.revenue / weekAgg.orders) : 0,
    customers,
    newCustomers,
    statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>,
    lowStock,
  };
}

export async function getActiveOrders() {
  const db = await getDb();
  const orders = await db
    .select({ order: s.orders, customer: { name: s.users.name, email: s.users.email } })
    .from(s.orders)
    .leftJoin(s.users, eq(s.users.id, s.orders.userId))
    .where(inArray(s.orders.status, ["placed", "confirmed", "preparing", "ready", "out_for_delivery"]))
    .orderBy(asc(s.orders.createdAt));
  const items = orders.length ? await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, orders.map((o) => o.order.id))) : [];
  return orders.map((o) => ({ ...o.order, customerName: o.customer?.name ?? o.order.address.recipient, items: items.filter((i) => i.orderId === o.order.id) }));
}

export async function getOrders(opts: { status?: string; q?: string; page?: number }) {
  const db = await getDb();
  const page = Math.max(1, opts.page ?? 1);
  const per = 25;
  const conds: SQL[] = [];
  const statuses = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "rejected", "cancelled"];
  if (opts.status === "active") conds.push(inArray(s.orders.status, ["placed", "confirmed", "preparing", "ready", "out_for_delivery"]));
  else if (opts.status && statuses.includes(opts.status)) conds.push(eq(s.orders.status, opts.status as OrderStatus));
  if (opts.q) {
    const q = `%${opts.q.replace(/[%_\\]/g, "").slice(0, 60)}%`;
    conds.push(or(ilike(s.orders.number, q), ilike(s.users.name, q), ilike(s.users.email, q))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select({ order: s.orders, customerName: s.users.name, customerEmail: s.users.email })
    .from(s.orders)
    .leftJoin(s.users, eq(s.users.id, s.orders.userId))
    .where(where)
    .orderBy(desc(s.orders.createdAt))
    .limit(per)
    .offset((page - 1) * per);
  const [{ total }] = (await db.select({ total: sql<number>`count(*)::int` }).from(s.orders).leftJoin(s.users, eq(s.users.id, s.orders.userId)).where(where)) as [{ total: number }];
  const items = rows.length ? await db.select({ orderId: s.orderItems.orderId, quantity: s.orderItems.quantity, name: s.orderItems.productName }).from(s.orderItems).where(inArray(s.orderItems.orderId, rows.map((r) => r.order.id))) : [];
  return {
    rows: rows.map((r) => ({ ...r.order, customerName: r.customerName ?? r.order.address.recipient, customerEmail: r.customerEmail, items: items.filter((i) => i.orderId === r.order.id) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
  };
}

export async function getAdminOrder(number: string) {
  if (!/^AR-\d{3,8}$/.test(number)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ order: s.orders, customer: { id: s.users.id, name: s.users.name, email: s.users.email, phone: s.users.phone, createdAt: s.users.createdAt } })
    .from(s.orders)
    .leftJoin(s.users, eq(s.users.id, s.orders.userId))
    .where(eq(s.orders.number, number))
    .limit(1);
  if (!row) return null;
  const [items, events] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, row.order.id)),
    db
      .select({ status: s.orderEvents.status, note: s.orderEvents.note, createdAt: s.orderEvents.createdAt, actor: s.users.name })
      .from(s.orderEvents)
      .leftJoin(s.users, eq(s.users.id, s.orderEvents.actorId))
      .where(eq(s.orderEvents.orderId, row.order.id))
      .orderBy(asc(s.orderEvents.createdAt)),
  ]);
  let customerOrders = 0;
  if (row.customer?.id) {
    const [c] = (await db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.userId, row.customer.id))) as [{ n: number }];
    customerOrders = c.n;
  }
  return { ...row.order, customer: row.customer, customerOrders, items, events };
}

export async function getAdminProducts() {
  const db = await getDb();
  return db
    .select({ product: s.products, category: s.categories.name, inv: s.inventory })
    .from(s.products)
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .leftJoin(s.inventory, eq(s.inventory.productId, s.products.id))
    .orderBy(asc(s.categories.sortOrder), asc(s.products.sortOrder));
}

export async function getAdminProduct(id: number) {
  const db = await getDb();
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) return null;
  const groups = await db.select({ groupId: s.productOptionGroups.groupId }).from(s.productOptionGroups).where(eq(s.productOptionGroups.productId, id));
  return { ...p, groupIds: groups.map((g) => g.groupId) };
}

export async function getCategoriesWithCounts() {
  const db = await getDb();
  return db
    .select({ category: s.categories, products: sql<number>`count(${s.products.id})::int` })
    .from(s.categories)
    .leftJoin(s.products, eq(s.products.categoryId, s.categories.id))
    .groupBy(s.categories.id)
    .orderBy(asc(s.categories.sortOrder));
}

export async function getOptionGroups() {
  const db = await getDb();
  const groups = await db.select().from(s.optionGroups).orderBy(asc(s.optionGroups.sortOrder));
  const opts = await db.select().from(s.options).orderBy(asc(s.options.sortOrder), asc(s.options.id));
  const usage = await db.select({ groupId: s.productOptionGroups.groupId, n: sql<number>`count(*)::int` }).from(s.productOptionGroups).groupBy(s.productOptionGroups.groupId);
  return groups.map((g) => ({ ...g, options: opts.filter((o) => o.groupId === g.id), products: usage.find((u) => u.groupId === g.id)?.n ?? 0 }));
}

export async function getCustomers(q?: string) {
  const db = await getDb();
  const conds: SQL[] = [eq(s.users.role, "customer")];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "").slice(0, 60)}%`;
    conds.push(or(ilike(s.users.name, like), ilike(s.users.email, like))!);
  }
  return db
    .select({
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      phone: s.users.phone,
      createdAt: s.users.createdAt,
      orders: sql<number>`count(${s.orders.id})::int`,
      spent: sql<number>`coalesce(sum(case when ${s.orders.status} not in ('rejected','cancelled') then ${s.orders.totalCents} else 0 end),0)::int`,
      lastOrder: sql<Date | null>`max(${s.orders.createdAt})`,
    })
    .from(s.users)
    .leftJoin(s.orders, eq(s.orders.userId, s.users.id))
    .where(and(...conds))
    .groupBy(s.users.id)
    .orderBy(desc(sql`max(${s.orders.createdAt})`))
    .limit(200);
}

export async function getCustomer(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [u] = await db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, phone: s.users.phone, createdAt: s.users.createdAt, lastLoginAt: s.users.lastLoginAt, marketingOptIn: s.users.marketingOptIn, role: s.users.role })
    .from(s.users)
    .where(eq(s.users.id, id));
  if (!u || u.role !== "customer") return null;
  const [orders, addresses] = await Promise.all([
    db.select().from(s.orders).where(eq(s.orders.userId, id)).orderBy(desc(s.orders.createdAt)).limit(100),
    db.select().from(s.addresses).where(eq(s.addresses.userId, id)),
  ]);
  return { ...u, orders, addresses };
}

export async function getZones() {
  const db = await getDb();
  return db.select().from(s.deliveryZones).orderBy(asc(s.deliveryZones.sortOrder), asc(s.deliveryZones.id));
}

export async function getSettingsMap() {
  const db = await getDb();
  const rows = await db.select().from(s.settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
}

export async function getDiscounts() {
  const db = await getDb();
  return db.select().from(s.discounts).orderBy(desc(s.discounts.isActive), asc(s.discounts.code));
}

export async function getAuditLogs(limit = 200) {
  const db = await getDb();
  return db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(limit);
}

/** Analytics series for charts (last N days, local day buckets computed in SQL). */
export async function getAnalytics(days = 30) {
  const db = await getDb();
  const from = new Date(startOfDay().getTime() - (days - 1) * DAY);
  const valid = sql`${s.orders.status} not in ('rejected','cancelled')`;
  const recent = await db
    .select({ createdAt: s.orders.createdAt, total: s.orders.totalCents })
    .from(s.orders)
    .where(and(gte(s.orders.createdAt, from), valid));
  const byDay = new Map<string, { orders: number; revenue: number }>();
  const byHour = new Map<number, number>();
  for (const r of recent) {
    const k = dayKey(r.createdAt);
    const cur = byDay.get(k) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    cur.revenue += r.total;
    byDay.set(k, cur);
    const h = zonedParts(r.createdAt).hour;
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
  }
  const series = Array.from({ length: days }, (_, i) => {
    const key = dayKey(new Date(from.getTime() + i * DAY + 12 * 3_600_000));
    const row = byDay.get(key);
    return { day: key, orders: row?.orders ?? 0, revenue: (row?.revenue ?? 0) / 100, aov: row && row.orders ? row.revenue / row.orders / 100 : 0 };
  });
  const hours = Array.from({ length: 15 }, (_, i) => i + 6).map((h) => ({ hour: h, orders: byHour.get(h) ?? 0 }));

  const top = await db
    .select({ name: s.orderItems.productName, qty: sql<number>`sum(${s.orderItems.quantity})::int`, revenue: sql<number>`sum(${s.orderItems.lineTotalCents})::int` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(gte(s.orders.createdAt, from), valid))
    .groupBy(s.orderItems.productName)
    .orderBy(desc(sql`sum(${s.orderItems.quantity})`))
    .limit(8);

  const categories = await db
    .select({ name: s.categories.name, revenue: sql<number>`sum(${s.orderItems.lineTotalCents})::int` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(and(gte(s.orders.createdAt, from), valid))
    .groupBy(s.categories.name)
    .orderBy(desc(sql`sum(${s.orderItems.lineTotalCents})`));

  const growthFrom = new Date(startOfDay().getTime() - 89 * DAY);
  const signups = await db
    .select({ week: sql<string>`to_char(date_trunc('week', ${s.users.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(s.users)
    .where(eq(s.users.role, "customer"))
    .groupBy(sql`date_trunc('week', ${s.users.createdAt})`)
    .orderBy(sql`date_trunc('week', ${s.users.createdAt})`);
  let running = 0;
  const growth = signups
    .map((w) => {
      running += w.n;
      return { week: w.week, new: w.n, total: running };
    })
    .filter((w) => new Date(w.week).getTime() >= growthFrom.getTime() - 7 * DAY);

  return {
    series,
    hours,
    top: top.map((t) => ({ ...t, revenue: t.revenue / 100 })),
    categories: categories.map((c) => ({ ...c, revenue: c.revenue / 100 })),
    growth,
  };
}
