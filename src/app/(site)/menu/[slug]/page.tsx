import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeft, Flame, Zap } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/server/queries/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema as s } from "@/lib/db";
import { ProductImage } from "@/components/menu/ProductImage";
import { ProductCard } from "@/components/menu/ProductCard";
import { Customizer } from "@/components/menu/Customizer";
import { BRAND } from "@/lib/brand";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found" };
  const title = `${p.name} — ${p.category.name}`;
  return {
    title,
    description: `${p.tagline} ${p.description}`.slice(0, 158),
    alternates: { canonical: `/menu/${p.slug}` },
    openGraph: { title: `${p.name} · All Ready Coffee`, description: p.tagline, images: p.imageUrl ? [{ url: p.imageUrl, width: 900, height: 1100, alt: p.name }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, user] = await Promise.all([getRelatedProducts(product), getCurrentUser()]);
  let favorite = false;
  if (user) {
    const db = await getDb();
    favorite = (await db.select().from(s.favorites).where(and(eq(s.favorites.userId, user.id), eq(s.favorites.productId, product.id))).limit(1)).length > 0;
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl ? `${BRAND.url}${product.imageUrl}` : undefined,
    brand: { "@type": "Brand", name: BRAND.name },
    category: product.category.name,
    offers: { "@type": "Offer", priceCurrency: "USD", price: (product.basePriceCents / 100).toFixed(2), availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${BRAND.url}/menu/${product.slug}` },
  };

  return (
    <div className="pt-[calc(var(--header-h)+1.5rem)]">
      <div className="container">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[0.82rem] text-cream/45">
          <Link href="/menu" className="flex items-center gap-1 hover:text-cream"><ChevronLeft className="h-4 w-4" /> Menu</Link>
          <span aria-hidden>/</span>
          <Link href={`/menu#${product.category.slug}`} className="hover:text-cream">{product.category.name}</Link>
          <span aria-hidden>/</span>
          <span className="text-cream/70" aria-current="page">{product.name}</span>
        </nav>
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="relative lg:sticky lg:top-28 lg:self-start">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-cream/[0.06] bg-[radial-gradient(80%_60%_at_50%_72%,#432a1a_0%,#1d140f_58%,#110c0a_100%)]">
              <div className="grain absolute inset-0" />
              <div className="absolute inset-x-[22%] bottom-[11%] h-8 rounded-[50%] bg-black/60 blur-2xl" />
              <ProductImage src={product.imageUrl} visual={product.visual} alt={`${product.name} from All Ready Coffee`} priority sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-[7%] animate-fade-up" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">{product.category.name}{product.isSeasonal ? " · Seasonal" : ""}</p>
            <h1 className="font-display text-display-lg text-cream">{product.name}</h1>
            <p className="mt-3 font-display text-2xl italic text-caramel-light">{product.tagline}</p>
            <p className="mt-6 max-w-xl text-[1rem] leading-relaxed text-cream/65">{product.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tastingNotes.map((n) => (
                <span key={n} className="rounded-full border border-cream/10 px-3 py-1 text-[0.78rem] text-cream/65">{n}</span>
              ))}
            </div>
            <dl className="mt-6 flex gap-8 text-[0.82rem] text-cream/50">
              {product.calories != null && <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-caramel-light" /><dt className="sr-only">Calories</dt><dd>{product.calories} cal</dd></div>}
              {product.caffeineMg != null && <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-caramel-light" /><dt className="sr-only">Caffeine</dt><dd>{product.caffeineMg} mg caffeine</dd></div>}
              <div><dt className="sr-only">Price from</dt><dd>From {formatPrice(product.basePriceCents)}</dd></div>
            </dl>
            <Customizer product={product} signedIn={!!user} favorite={favorite} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-32" aria-labelledby="related">
            <h2 id="related" className="mb-10 font-display text-display-md text-cream">Pairs beautifully with</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
