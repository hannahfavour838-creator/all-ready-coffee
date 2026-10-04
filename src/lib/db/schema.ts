import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  serial,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

/* ───────────────────────────── Enums ───────────────────────────── */

export const orderStatus = pgEnum("order_status", [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
]);

export const optionGroupType = pgEnum("option_group_type", ["single", "multi"]);
export const discountType = pgEnum("discount_type", ["percent", "fixed"]);
export const notificationAudience = pgEnum("notification_audience", ["customer", "admin"]);

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
  toDriver: (v) => v,
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────────── Identity ───────────────────────────── */

export const roles = pgTable("roles", {
  key: text("key").primaryKey(), // customer | staff | admin
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    role: text("role").notNull().default("customer").references(() => roles.key),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    smsUpdates: boolean("sms_updates").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`), index("users_role_idx").on(t.role), index("users_created_idx").on(t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token) — raw token only ever lives in the cookie
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    recipient: text("recipient").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    instructions: text("instructions"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ───────────────────────────── Catalog ───────────────────────────── */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

export type ProductVisual = {
  vessel: "demitasse" | "cup" | "mug" | "tall" | "tumbler" | "pastry";
  liquid: string; // hex
  top: string; // hex (foam/crema)
  layers?: string[]; // bottom -> top hex
  ice?: boolean;
  art?: "rosetta" | "heart" | "tulip" | "none";
  toppings?: Array<"caramel" | "cocoa" | "cinnamon" | "whip" | "chocolate" | "sugar" | "salt" | "almond">;
  pastry?: "croissant" | "pain-au-chocolat" | "almond-croissant" | "banana-bread";
};

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    basePriceCents: integer("base_price_cents").notNull(),
    imageId: uuid("image_id").references(() => productImages.id, { onDelete: "set null" }),
    visual: jsonb("visual").$type<ProductVisual>().notNull(),
    tastingNotes: jsonb("tasting_notes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    calories: integer("calories"),
    caffeineMg: integer("caffeine_mg"),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isSeasonal: boolean("is_seasonal").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_featured_idx").on(t.isFeatured)],
);

export const optionGroups = pgTable("option_groups", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // size | milk | extras | sweetness | temperature
  name: text("name").notNull(),
  type: optionGroupType("type").notNull().default("single"),
  required: boolean("required").notNull().default(false),
  maxSelections: integer("max_selections"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const options = pgTable(
  "options",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => optionGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("options_group_idx").on(t.groupId)],
);

export const productOptionGroups = pgTable(
  "product_option_groups",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    groupId: integer("group_id").notNull().references(() => optionGroups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.groupId] })],
);

export const inventory = pgTable("inventory", {
  productId: integer("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  stockLevel: integer("stock_level"), // null = not stock-tracked (made to order)
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  soldOut: boolean("sold_out").notNull().default(false),
  note: text("note"),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Commerce ───────────────────────────── */

export type CartSelections = Record<string, number[]>; // optionGroup.key -> option ids

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    selections: jsonb("selections").$type<CartSelections>().notNull(),
    lineKey: text("line_key").notNull(),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

export const deliveryZones = pgTable("delivery_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  postalCodes: jsonb("postal_codes").$type<string[]>().notNull(),
  feeCents: integer("fee_cents").notNull(),
  minOrderCents: integer("min_order_cents").notNull().default(0),
  freeOverCents: integer("free_over_cents"),
  etaMinMinutes: integer("eta_min_minutes").notNull(),
  etaMaxMinutes: integer("eta_max_minutes").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull().default(""),
  type: discountType("type").notNull(),
  value: integer("value").notNull(), // percent (1-100) or cents
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  maxRedemptions: integer("max_redemptions"),
  redemptions: integer("redemptions").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export type AddressSnapshot = {
  recipient: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  instructions?: string | null;
  phone?: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: serial("seq").notNull(),
    number: text("number").notNull().unique(), // AR-1042
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: orderStatus("status").notNull().default("placed"),
    address: jsonb("address").$type<AddressSnapshot>().notNull(),
    zoneId: integer("zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    zoneName: text("zone_name"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    tipCents: integer("tip_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    discountCode: text("discount_code"),
    // Simulated payment — only non-sensitive descriptors are ever stored.
    paymentStatus: text("payment_status").notNull().default("simulated_authorized"),
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
    paymentRef: text("payment_ref"),
    notes: text("notes"),
    etaMinMinutes: integer("eta_min_minutes").notNull(),
    etaMaxMinutes: integer("eta_max_minutes").notNull(),
    estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId, t.createdAt),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export type OrderItemOption = { group: string; name: string; priceDeltaCents: number };

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    options: jsonb("options").$type<OrderItemOption[]>().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    audience: notificationAudience("audience").notNull().default("customer"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null for admin broadcast
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt), index("notifications_audience_idx").on(t.audience, t.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Relations ───────────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  favorites: many(favorites),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  inventory: one(inventory, { fields: [products.id], references: [inventory.productId] }),
  optionGroups: many(productOptionGroups),
}));
export const productOptionGroupsRelations = relations(productOptionGroups, ({ one }) => ({
  product: one(products, { fields: [productOptionGroups.productId], references: [products.id] }),
  group: one(optionGroups, { fields: [productOptionGroups.groupId], references: [optionGroups.id] }),
}));
export const optionGroupsRelations = relations(optionGroups, ({ many }) => ({ options: many(options), products: many(productOptionGroups) }));
export const optionsRelations = relations(options, ({ one }) => ({ group: one(optionGroups, { fields: [options.groupId], references: [optionGroups.id] }) }));
export const inventoryRelations = relations(inventory, ({ one }) => ({ product: one(products, { fields: [inventory.productId], references: [products.id] }) }));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }) }));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({ order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }) }));
export const addressesRelations = relations(addresses, ({ one }) => ({ user: one(users, { fields: [addresses.userId], references: [users.id] }) }));
export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}));
export const cartsRelations = relations(carts, ({ many }) => ({ items: many(cartItems) }));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({ cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }) }));

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type OptionGroup = typeof optionGroups.$inferSelect;
export type Option = typeof options.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
