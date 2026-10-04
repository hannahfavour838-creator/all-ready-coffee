import Link from "next/link";
import type { MenuProduct } from "@/server/queries/catalog";
import { ProductImage } from "./ProductImage";
import { QuickAdd } from "./QuickAdd";
import { formatPrice, cn } from "@/lib/utils";

export function ProductCard({ product, priority, size = "md" }: { product: MenuProduct; priority?: boolean; size?: "md" | "lg" }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={`/menu/${product.slug}`} className="absolute inset-0 z-[1] rounded-[1.75rem]" aria-label={`${product.name} — ${formatPrice(product.basePriceCents)}`} />
      <div className={cn("relative overflow-hidden rounded-[1.75rem] border border-cream/[0.06] bg-[radial-gradient(90%_70%_at_50%_70%,#3a2518_0%,#1d140f_55%,#120d0a_100%)] transition-[border-color,transform] duration-700 ease-out-expo group-hover:border-cream/15", size === "lg" ? "aspect-[4/5]" : "aspect-[5/6]")}>
        <div className="absolute inset-x-[18%] bottom-[10%] h-6 rounded-[50%] bg-black/60 blur-xl transition-transform duration-700 ease-out-expo group-hover:scale-110" />
        <ProductImage src={product.imageUrl} visual={product.visual} alt={product.name} priority={priority} className="absolute inset-[6%] transition-transform duration-[900ms] ease-out-expo group-hover:-translate-y-2 group-hover:scale-[1.04]" />
        <div className="absolute left-4 top-4 flex gap-1.5">
          {product.isSeasonal && <span className="rounded-full bg-caramel/90 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-ink">Seasonal</span>}
          {!product.available && <span className="rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-cream/70">{product.soldOut ? "Sold out" : "Unavailable"}</span>}
        </div>
        <div className="absolute bottom-4 right-4 z-[2] translate-y-1 opacity-90 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <QuickAdd product={product} />
        </div>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="font-display text-[1.6rem] leading-[1.05] text-cream transition-colors group-hover:text-caramel-light">{product.name}</h3>
          <p className="mt-1.5 line-clamp-1 text-[0.86rem] text-cream/50">{product.tagline}</p>
        </div>
        <p className="shrink-0 pt-1 font-mono text-[0.88rem] tabular text-cream/80">{formatPrice(product.basePriceCents)}</p>
      </div>
    </article>
  );
}
