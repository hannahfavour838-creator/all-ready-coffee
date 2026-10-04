import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { getMenu } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics = ["", "/menu", "/story", "/delivery", "/contact", "/privacy", "/terms"].map((p) => ({
    url: `${BRAND.url}${p}`,
    lastModified: now,
    changeFrequency: p === "/menu" ? ("daily" as const) : ("monthly" as const),
    priority: p === "" ? 1 : p === "/menu" ? 0.9 : 0.6,
  }));
  let products: MetadataRoute.Sitemap = [];
  try {
    const menu = await getMenu();
    products = menu.flatMap((c) => c.products).map((p) => ({ url: `${BRAND.url}/menu/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }));
  } catch {
    products = [];
  }
  return [...statics, ...products];
}
