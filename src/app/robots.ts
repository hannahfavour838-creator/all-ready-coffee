import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/api/", "/sign-in", "/sign-up"] }],
    sitemap: `${BRAND.url}/sitemap.xml`,
    host: BRAND.url,
  };
}
