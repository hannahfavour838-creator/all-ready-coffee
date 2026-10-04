import { sql } from "drizzle-orm";
import type { Database } from "./index";
import * as s from "./schema";
import { CATEGORY_SEED, OPTION_GROUP_SEED, PRODUCT_SEED, ZONE_SEED, DISCOUNT_SEED, SETTINGS_SEED } from "./catalog-data";
import { hashPassword, UNUSABLE_PASSWORD_HASH } from "../auth/password";
import { fromZoned, zonedParts } from "../time";

type SeedOpts = { log?: (m: string) => void; reset?: boolean };

/** Deterministic PRNG so demo data looks the same on every machine. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Avery", "Maya", "Liam", "Sofia", "Noah", "Harper", "Ethan", "Chloe", "Mateo", "Zoe", "Lucas", "Isla", "Owen", "Nora", "Elijah", "Grace", "Julian", "Leah", "Theo", "Ruby", "Miles", "Hazel", "Caleb", "Iris", "Ezra", "Stella", "Gabriel", "Violet", "Rowan", "Aria", "Henry", "Naomi", "Wyatt", "Eliza", "Jonah", "Clara", "Felix", "Ivy", "Silas", "June"];
const LAST = ["Bennett", "Calloway", "Reyes", "Okafor", "Lindqvist", "Hart", "Moreno", "Whitaker", "Nakamura", "Delgado", "Brooks", "Sullivan", "Park", "Ellison", "Fontaine", "Kim", "Garrison", "Patel", "Holloway", "Quinn"];
const STREETS = ["NW Lovejoy St", "NW Hoyt St", "SW Alder St", "SW Taylor St", "NW 23rd Ave", "SE Belmont St", "N Mississippi Ave", "NW Kearney St", "SE Morrison St", "N Williams Ave", "SW Park Ave", "NW Johnson St"];

export const DEMO_ADMIN_EMAIL_DEFAULT = "owner@allreadycoffee.com";
export const DEMO_CUSTOMER_EMAIL = "demo@allreadycoffee.com";

export async function seedDatabase(db: Database, opts: SeedOpts = {}) {
  const log = opts.log ?? (() => {});
  // Demo defaults are allowed for the embedded local database; a real (DATABASE_URL) production DB requires explicit passwords.
  const isProd = process.env.NODE_ENV === "production" && !!process.env.DATABASE_URL;
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || DEMO_ADMIN_EMAIL_DEFAULT).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (isProd ? "" : "AllReady!Owner2026");
  const demoPassword = process.env.SEED_DEMO_PASSWORD || (isProd ? "" : "Espresso!Demo2026");
  if (!adminPassword || !demoPassword) throw new Error("SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD are required to seed a production database.");

  if (opts.reset) {
    log("resetting data");
    await db.execute(sql`TRUNCATE audit_logs, notifications, favorites, order_events, order_items, orders, cart_items, carts,
      inventory, product_option_groups, options, option_groups, products, product_images, categories, discounts, delivery_zones,
      addresses, sessions, users, roles, settings RESTART IDENTITY CASCADE`);
  }

  const rand = mulberry32(20261003);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;

  /* roles */
  await db.insert(s.roles).values([
    { key: "customer", name: "Customer", description: "Can order, track orders and manage their own account." },
    { key: "staff", name: "Staff", description: "Can view and progress orders and manage inventory." },
    { key: "admin", name: "Owner / Admin", description: "Full access to the business dashboard." },
  ]);

  /* settings */
  await db.insert(s.settings).values(Object.entries(SETTINGS_SEED).map(([key, value]) => ({ key, value })));

  /* catalog */
  const cats = await db.insert(s.categories).values(CATEGORY_SEED.map((c) => ({ ...c }))).returning();
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const groupIdByKey = new Map<string, number>();
  for (const g of OPTION_GROUP_SEED) {
    const [row] = await db
      .insert(s.optionGroups)
      .values({ key: g.key, name: g.name, type: g.type, required: g.required, maxSelections: g.maxSelections, sortOrder: g.sortOrder })
      .returning();
    groupIdByKey.set(g.key, row!.id);
    await db.insert(s.options).values(
      g.options.map((o, i) => ({ groupId: row!.id, name: o.name, priceDeltaCents: o.priceDeltaCents, isDefault: "isDefault" in o ? !!o.isDefault : false, sortOrder: i })),
    );
  }

  const productRows = await db
    .insert(s.products)
    .values(
      PRODUCT_SEED.map((p, i) => ({
        slug: p.slug,
        categoryId: catBySlug.get(p.category)!,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        basePriceCents: p.price,
        visual: p.visual,
        tastingNotes: p.notes,
        calories: p.calories ?? null,
        caffeineMg: p.caffeine ?? null,
        isFeatured: !!p.featured,
        isSeasonal: !!p.seasonal,
        sortOrder: i,
      })),
    )
    .returning();
  const productBySlug = new Map(productRows.map((p) => [p.slug, p]));

  await db.insert(s.productOptionGroups).values(
    PRODUCT_SEED.flatMap((p) => p.groups.map((g) => ({ productId: productBySlug.get(p.slug)!.id, groupId: groupIdByKey.get(g)! }))),
  );
  await db.insert(s.inventory).values(
    PRODUCT_SEED.map((p) => ({ productId: productBySlug.get(p.slug)!.id, stockLevel: p.stock ?? null, lowStockThreshold: p.stock ? 8 : 0 })),
  );
  log(`catalog: ${productRows.length} products`);

  const zones = await db.insert(s.deliveryZones).values(ZONE_SEED).returning();
  await db.insert(s.discounts).values(DISCOUNT_SEED);

  /* people */
  const now = new Date();
  const DAY = 86_400_000;
  const [adminHash, demoHash] = await Promise.all([hashPassword(adminPassword), hashPassword(demoPassword)]);

  const [admin] = await db
    .insert(s.users)
    .values({ email: adminEmail, name: "Dana Whitfield", passwordHash: adminHash, role: "admin", phone: "(503) 555-0118", createdAt: new Date(now.getTime() - 140 * DAY) })
    .returning();
  await db.insert(s.users).values({
    email: "barista@allreadycoffee.com", name: "Marco Ellison", passwordHash: UNUSABLE_PASSWORD_HASH, role: "staff", createdAt: new Date(now.getTime() - 120 * DAY),
  });

  const [demo] = await db
    .insert(s.users)
    .values({ email: DEMO_CUSTOMER_EMAIL, name: "Jordan Avery", passwordHash: demoHash, phone: "(503) 555-0163", marketingOptIn: true, createdAt: new Date(now.getTime() - 82 * DAY) })
    .returning();

  const customerValues = Array.from({ length: 64 }, (_, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7) % LAST.length]!;
    // growth curve: more sign-ups recently
    const ageDays = Math.floor(Math.pow(rand(), 1.6) * 110) + 1;
    return {
      email: `${first}.${last}${i}`.toLowerCase() + "@example.com",
      name: `${first} ${last}`,
      passwordHash: UNUSABLE_PASSWORD_HASH,
      phone: `(503) 555-${String(1000 + Math.floor(rand() * 8999)).slice(0, 4)}`,
      createdAt: new Date(now.getTime() - ageDays * DAY - Math.floor(rand() * DAY)),
    };
  });
  const customers = await db.insert(s.users).values(customerValues).returning();
  const allCustomers = [demo!, ...customers];

  /* addresses */
  const addrRows = await db
    .insert(s.addresses)
    .values(
      allCustomers.flatMap((c, i) => {
        const zone = zones[i % zones.length]!;
        const base = {
          userId: c.id,
          recipient: c.name,
          line1: `${100 + Math.floor(rand() * 2800)} ${pick(STREETS)}`,
          line2: rand() > 0.6 ? `Apt ${Math.floor(rand() * 900) + 100}` : null,
          city: "Portland",
          state: "OR",
          postalCode: zone.postalCodes[0]!,
          isDefault: true,
          label: "Home",
        };
        if (c.id === demo!.id) {
          return [
            { ...base, line1: "1420 NW Lovejoy St", line2: "Apt 512", postalCode: "97209", instructions: "Buzz 512 — I'll come down." },
            { ...base, label: "Studio", line1: "735 SW Alder St", line2: "Floor 4", postalCode: "97205", isDefault: false, instructions: "Leave with the front desk." },
          ];
        }
        return [base];
      }),
    )
    .returning();
  const addrByUser = new Map<string, (typeof addrRows)[number]>();
  for (const a of addrRows) if (a.isDefault) addrByUser.set(a.userId, a);
  const zoneByZip = new Map(zones.flatMap((z) => z.postalCodes.map((zip) => [zip, z] as const)));

  /* favorites for demo */
  await db.insert(s.favorites).values(
    ["all-ready-signature-latte", "cold-brew", "chocolate-croissant", "flat-white"].map((slug) => ({ userId: demo!.id, productId: productBySlug.get(slug)!.id })),
  );

  /* orders — ~95 days of history with growth, daily peaks and an active board for today */
  const drinkWeights = PRODUCT_SEED.map((p) => ({
    slug: p.slug,
    w: (p.featured ? 3 : 1.2) * (p.category === "bakery" ? 0.9 : 1) * (p.seasonal ? 0.7 : 1),
  }));
  const totalW = drinkWeights.reduce((a, b) => a + b.w, 0);
  const pickProduct = () => {
    let r = rand() * totalW;
    for (const d of drinkWeights) {
      r -= d.w;
      if (r <= 0) return productBySlug.get(d.slug)!;
    }
    return productRows[0]!;
  };
  const hourWeights = [0, 0, 0, 0, 0, 0, 0.4, 1.6, 2.4, 2.1, 1.4, 1.1, 1.3, 1.4, 1.2, 0.9, 0.8, 0.7, 0.5, 0.2, 0, 0, 0, 0];
  const hourTotal = hourWeights.reduce((a, b) => a + b, 0);
  const pickHour = () => {
    let r = rand() * hourTotal;
    for (let h = 0; h < 24; h++) {
      r -= hourWeights[h]!;
      if (r <= 0) return h;
    }
    return 9;
  };

  type PlannedOrder = { at: Date; userId: string; status: s.OrderStatus };
  const plan: PlannedOrder[] = [];
  for (let d = 95; d >= 1; d--) {
    const dz = zonedParts(new Date(now.getTime() - d * DAY));
    const weekday = new Date(Date.UTC(dz.year, dz.month - 1, dz.day)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const base = 5 + (95 - d) * 0.12;
    const count = Math.round(base * (weekend ? 1.25 : 1) * (0.8 + rand() * 0.4));
    for (let i = 0; i < count; i++) {
      const at = fromZoned(dz.year, dz.month, dz.day, pickHour(), Math.floor(rand() * 60), Math.floor(rand() * 60));
      const eligible = allCustomers.filter((c) => c.createdAt.getTime() < at.getTime());
      if (!eligible.length) continue;
      const user = rand() < 0.07 ? demo! : pick(eligible);
      if (user.createdAt.getTime() > at.getTime()) continue;
      const r = rand();
      plan.push({ at, userId: user.id, status: r < 0.02 ? "rejected" : r < 0.045 ? "cancelled" : "delivered" });
    }
  }
  // Today: a lively board — earliest delivered, latest still in progress.
  const todayStatuses: s.OrderStatus[] = ["delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "out_for_delivery", "ready", "preparing", "preparing", "confirmed", "placed", "placed"];
  todayStatuses.forEach((status, i) => {
    const minutesAgo = (todayStatuses.length - i) * 17 + Math.floor(rand() * 6);
    const at = new Date(now.getTime() - minutesAgo * 60_000);
    const isDemoActive = status === "out_for_delivery";
    plan.push({ at, userId: isDemoActive ? demo!.id : pick(customers).id, status });
  });
  plan.sort((a, b) => a.at.getTime() - b.at.getTime());

  const usersById = new Map(allCustomers.map((u) => [u.id, u]));
  const sizeGroup = OPTION_GROUP_SEED.find((g) => g.key === "size")!;
  const milkGroup = OPTION_GROUP_SEED.find((g) => g.key === "milk")!;

  const orderValues: (typeof s.orders.$inferInsert)[] = [];
  const itemValues: (typeof s.orderItems.$inferInsert & { _idx: number })[] = [];
  const statusFlow: s.OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

  plan.forEach((p, idx) => {
    const user = usersById.get(p.userId)!;
    const addr = addrByUser.get(user.id)!;
    const zone = zoneByZip.get(addr.postalCode) ?? zones[0]!;
    const nItems = rand() < 0.45 ? 1 : rand() < 0.7 ? 2 : rand() < 0.85 ? 3 : 4;
    let subtotal = 0;
    for (let i = 0; i < nItems; i++) {
      const prod = pickProduct();
      const seed = PRODUCT_SEED.find((x) => x.slug === prod.slug)!;
      const opts: s.OrderItemOption[] = [];
      let unit = prod.basePriceCents;
      if (seed.groups.includes("size")) {
        const o = sizeGroup.options[rand() < 0.25 ? 0 : rand() < 0.75 ? 1 : 2]!;
        opts.push({ group: "Size", name: o.name, priceDeltaCents: o.priceDeltaCents });
        unit += o.priceDeltaCents;
      }
      if (seed.groups.includes("milk")) {
        const o = milkGroup.options[rand() < 0.5 ? 0 : rand() < 0.6 ? 2 : Math.floor(rand() * 5)]!;
        opts.push({ group: "Milk", name: o.name, priceDeltaCents: o.priceDeltaCents });
        unit += o.priceDeltaCents;
      }
      const qty = rand() < 0.82 ? 1 : 2;
      subtotal += unit * qty;
      itemValues.push({ _idx: idx, orderId: "", productId: prod.id, productName: prod.name, productSlug: prod.slug, unitPriceCents: unit, quantity: qty, options: opts, lineTotalCents: unit * qty });
    }
    const fee = zone.freeOverCents != null && subtotal >= zone.freeOverCents ? 0 : zone.feeCents;
    const tip = rand() < 0.7 ? Math.round(subtotal * (rand() < 0.5 ? 0.15 : 0.2)) : 0;
    const etaMin = zone.etaMinMinutes;
    const etaMax = zone.etaMaxMinutes;
    const delivered = p.status === "delivered";
    orderValues.push({
      number: `AR-${1001 + idx}`,
      userId: user.id,
      status: p.status,
      address: { recipient: user.name, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, postalCode: addr.postalCode, instructions: addr.instructions, phone: user.phone },
      zoneId: zone.id,
      zoneName: zone.name,
      subtotalCents: subtotal,
      deliveryFeeCents: fee,
      tipCents: tip,
      totalCents: subtotal + fee + tip,
      paymentBrand: pick(["Visa", "Mastercard", "Amex", "Visa"]),
      paymentLast4: pick(["4242", "4444", "0005", "1881"]),
      paymentRef: `sim_${(idx * 7919).toString(36)}`,
      paymentStatus: p.status === "rejected" || p.status === "cancelled" ? "simulated_voided" : "simulated_captured",
      etaMinMinutes: etaMin,
      etaMaxMinutes: etaMax,
      estimatedReadyAt: new Date(p.at.getTime() + 10 * 60_000),
      estimatedDeliveryAt: new Date(p.at.getTime() + etaMax * 60_000),
      deliveredAt: delivered ? new Date(p.at.getTime() + (etaMin + Math.floor(rand() * (etaMax - etaMin))) * 60_000) : null,
      createdAt: p.at,
      updatedAt: p.at,
    });
  });

  const insertedOrders: { id: string; number: string }[] = [];
  for (let i = 0; i < orderValues.length; i += 200) {
    const rows = await db.insert(s.orders).values(orderValues.slice(i, i + 200)).returning({ id: s.orders.id, number: s.orders.number });
    insertedOrders.push(...rows);
  }
  const idByNumber = new Map(insertedOrders.map((o) => [o.number, o.id]));
  const orderIdAt = (idx: number) => idByNumber.get(`AR-${1001 + idx}`)!;

  const items = itemValues.map(({ _idx, ...rest }) => ({ ...rest, orderId: orderIdAt(_idx) }));
  for (let i = 0; i < items.length; i += 400) await db.insert(s.orderItems).values(items.slice(i, i + 400));

  const events: (typeof s.orderEvents.$inferInsert)[] = [];
  const notes: (typeof s.notifications.$inferInsert)[] = [];
  plan.forEach((p, idx) => {
    const orderId = orderIdAt(idx);
    const final = p.status;
    const path: s.OrderStatus[] =
      final === "rejected" ? ["placed", "rejected"] : final === "cancelled" ? ["placed", "confirmed", "cancelled"] : statusFlow.slice(0, statusFlow.indexOf(final) + 1);
    path.forEach((st, k) => {
      events.push({ orderId, status: st, actorId: k === 0 ? p.userId : admin!.id, createdAt: new Date(p.at.getTime() + k * 6 * 60_000) });
    });
    const isToday = now.getTime() - p.at.getTime() < DAY;
    if (isToday && !["delivered", "rejected", "cancelled"].includes(final)) {
      notes.push({ audience: "admin", type: "order.new", orderId, title: `New order ${orderValues[idx]!.number}`, body: `${orderValues[idx]!.address.recipient} · ${(orderValues[idx]!.totalCents / 100).toFixed(2)} USD`, href: `/admin/orders/${orderValues[idx]!.number}`, createdAt: p.at, readAt: final === "placed" ? null : p.at });
    }
    if (p.userId === demo!.id && isToday) {
      notes.push({ audience: "customer", userId: demo!.id, orderId, type: "order.out_for_delivery", title: "Your order is on its way", body: `Order ${orderValues[idx]!.number} left the café and is heading to you.`, href: `/account/orders/${orderValues[idx]!.number}`, createdAt: new Date(now.getTime() - 6 * 60_000) });
    }
  });
  for (let i = 0; i < events.length; i += 500) await db.insert(s.orderEvents).values(events.slice(i, i + 500));
  if (notes.length) await db.insert(s.notifications).values(notes);
  await db.insert(s.notifications).values({ audience: "customer", userId: demo!.id, type: "welcome", title: "Welcome to All Ready", body: "Use code WELCOME15 for 15% off your first order over $15.", href: "/menu", createdAt: new Date(now.getTime() - 82 * DAY) });

  await db.insert(s.auditLogs).values({ actorId: admin!.id, actorEmail: admin!.email, action: "system.seed", entity: "database", metadata: { orders: plan.length } });
  log(`people: ${allCustomers.length} customers · orders: ${plan.length}`);
}
