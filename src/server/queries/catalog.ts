import "server-only";
import fs from "node:fs";
import path from "node:path";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import type { PricingGroup } from "@/lib/pricing";
import type { ProductVisual } from "@/lib/db/schema";

export type MenuProduct = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  basePriceCents: number;
  imageUrl: string | null;
  visual: ProductVisual;
  tastingNotes: string[];
  calories: number | null;
  caffeineMg: number | null;
  available: boolean;
  soldOut: boolean;
  isFeatured: boolean;
  isSeasonal: boolean;
  category: { slug: string; name: string };
  groups: PricingGroup[];
};

export type MenuCategory = { id: number; slug: string; name: string; description: string; products: MenuProduct[] };

const renderedDir = path.join(process.cwd(), "public", "products");
let rendered: Set<string> | null = null;
function hasRender(slug: string) {
  if (!rendered) {
    try {
      rendered = new Set(fs.readdirSync(renderedDir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")));
    } catch {
      rendered = new Set();
    }
  }
  return rendered.has(slug);
}

export function productImageUrl(p: { slug: string; imageId: string | null }) {
  if (p.imageId) return `/api/images/${p.imageId}`;
  return hasRender(p.slug) ? `/products/${p.slug}.webp` : null;
}

async function loadGroups(productIds: number[]): Promise<Map<number, PricingGroup[]>> {
  const out = new Map<number, PricingGroup[]>();
  if (!productIds.length) return out;
  const db = await getDb();
  const links = await db
    .select({ productId: s.productOptionGroups.productId, group: s.optionGroups })
    .from(s.productOptionGroups)
    .innerJoin(s.optionGroups, eq(s.optionGroups.id, s.productOptionGroups.groupId))
    .where(inArray(s.productOptionGroups.productId, productIds))
    .orderBy(asc(s.optionGroups.sortOrder));
  const groupIds = Array.from(new Set(links.map((l) => l.group.id)));
  const opts = groupIds.length
    ? await db.select().from(s.options).where(inArray(s.options.groupId, groupIds)).orderBy(asc(s.options.sortOrder))
    : [];
  for (const l of links) {
    const list = out.get(l.productId) ?? [];
    list.push({
      key: l.group.key,
      name: l.group.name,
      type: l.group.type,
      required: l.group.required,
      maxSelections: l.group.maxSelections,
      options: opts
        .filter((o) => o.groupId === l.group.id)
        .map((o) => ({ id: o.id, name: o.name, priceDeltaCents: o.priceDeltaCents, isDefault: o.isDefault, isAvailable: o.isAvailable })),
    });
    out.set(l.productId, list);
  }
  return out;
}

type Row = { product: typeof s.products.$inferSelect; category: typeof s.categories.$inferSelect; inv: typeof s.inventory.$inferSelect | null };

function toMenuProduct(r: Row, groups: PricingGroup[]): MenuProduct {
  const soldOut = !!r.inv && (r.inv.soldOut || r.inv.stockLevel === 0);
  return {
    id: r.product.id,
    slug: r.product.slug,
    name: r.product.name,
    tagline: r.product.tagline,
    description: r.product.description,
    basePriceCents: r.product.basePriceCents,
    imageUrl: productImageUrl(r.product),
    visual: r.product.visual,
    tastingNotes: r.product.tastingNotes,
    calories: r.product.calories,
    caffeineMg: r.product.caffeineMg,
    available: r.product.isAvailable && !soldOut,
    soldOut,
    isFeatured: r.product.isFeatured,
    isSeasonal: r.product.isSeasonal,
    category: { slug: r.category.slug, name: r.category.name },
    groups,
  };
}

async function baseQuery(where?: ReturnType<typeof and>) {
  const db = await getDb();
  return db
    .select({ product: s.products, category: s.categories, inv: s.inventory })
    .from(s.products)
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .leftJoin(s.inventory, eq(s.inventory.productId, s.products.id))
    .where(where)
    .orderBy(asc(s.categories.sortOrder), asc(s.products.sortOrder));
}

export async function getMenu(): Promise<MenuCategory[]> {
  const db = await getDb();
  const cats = await db.select().from(s.categories).where(eq(s.categories.isActive, true)).orderBy(asc(s.categories.sortOrder));
  const rows = await baseQuery(eq(s.categories.isActive, true));
  const groups = await loadGroups(rows.map((r) => r.product.id));
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    products: rows.filter((r) => r.category.id === c.id).map((r) => toMenuProduct(r, groups.get(r.product.id) ?? [])),
  }));
}

export async function getFeaturedProducts(limit = 8): Promise<MenuProduct[]> {
  const rows = await baseQuery(and(eq(s.products.isFeatured, true), eq(s.categories.isActive, true)));
  const groups = await loadGroups(rows.map((r) => r.product.id));
  return rows.slice(0, limit).map((r) => toMenuProduct(r, groups.get(r.product.id) ?? []));
}

export async function getProductBySlug(slug: string): Promise<MenuProduct | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const rows = await baseQuery(and(eq(s.products.slug, slug), eq(s.categories.isActive, true)));
  const r = rows[0];
  if (!r) return null;
  const groups = await loadGroups([r.product.id]);
  return toMenuProduct(r, groups.get(r.product.id) ?? []);
}

export async function getProductsByIds(ids: number[]): Promise<MenuProduct[]> {
  if (!ids.length) return [];
  const rows = await baseQuery(and(inArray(s.products.id, ids)));
  const groups = await loadGroups(rows.map((r) => r.product.id));
  return rows.map((r) => toMenuProduct(r, groups.get(r.product.id) ?? []));
}

export async function getRelatedProducts(p: MenuProduct, limit = 4): Promise<MenuProduct[]> {
  const menu = await getMenu();
  const same = menu.find((c) => c.slug === p.category.slug)?.products ?? [];
  const others = menu.flatMap((c) => c.products).filter((x) => x.isFeatured);
  const list = [...same, ...others].filter((x, i, arr) => x.id !== p.id && arr.findIndex((y) => y.id === x.id) === i);
  return list.slice(0, limit);
}

export async function getActiveZones() {
  const db = await getDb();
  return db.select().from(s.deliveryZones).where(eq(s.deliveryZones.isActive, true)).orderBy(asc(s.deliveryZones.sortOrder));
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, key)).limit(1);
  return (row?.value as T) ?? fallback;
}
