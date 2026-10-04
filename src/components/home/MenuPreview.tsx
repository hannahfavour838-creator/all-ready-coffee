"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { MenuCategory } from "@/server/queries/catalog";
import { ProductImage } from "@/components/menu/ProductImage";
import { cn, formatPrice } from "@/lib/utils";

/** Interactive menu explorer: category tabs + list; hovering/focusing a drink previews it large. */
export function MenuPreview({ categories }: { categories: MenuCategory[] }) {
  const [cat, setCat] = useState(categories[0]?.slug ?? "");
  const current = categories.find((c) => c.slug === cat) ?? categories[0];
  const [hover, setHover] = useState<number | null>(null);
  if (!current) return null;
  const preview = current.products.find((p) => p.id === hover) ?? current.products[0];

  return (
    <section className="relative overflow-hidden border-y border-cream/[0.06] bg-espresso/40 py-24 md:py-32" aria-labelledby="explore-title">
      <div className="container">
        <p className="eyebrow mb-5">Explore the menu</p>
        <h2 id="explore-title" className="font-display text-display-lg text-cream">Find your cup.</h2>
        <div role="tablist" aria-label="Menu categories" className="scrollbar-none mt-10 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.slug}
              role="tab"
              aria-selected={c.slug === cat}
              aria-controls={`panel-${c.slug}`}
              id={`tab-${c.slug}`}
              onClick={() => {
                setCat(c.slug);
                setHover(null);
              }}
              className={cn("relative shrink-0 rounded-full px-5 py-2.5 text-[0.88rem] transition-colors", c.slug === cat ? "text-ink" : "text-cream/65 hover:text-cream")}
            >
              {c.slug === cat && <motion.span layoutId="menu-tab" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{c.name}</span>
            </button>
          ))}
        </div>

        <div id={`panel-${current.slug}`} role="tabpanel" aria-labelledby={`tab-${current.slug}`} className="mt-12 grid gap-12 lg:grid-cols-[1fr_0.85fr]">
          <ul className="divide-y divide-cream/[0.07] border-y border-cream/[0.07]">
            {current.products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/menu/${p.slug}`}
                  onMouseEnter={() => setHover(p.id)}
                  onFocus={() => setHover(p.id)}
                  className="group flex items-center justify-between gap-6 py-5 transition-colors"
                >
                  <span className="min-w-0">
                    <span className={cn("block font-display text-[1.7rem] leading-tight transition-colors duration-300 md:text-[2rem]", preview?.id === p.id ? "text-cream" : "text-cream/55 group-hover:text-cream")}>{p.name}</span>
                    <span className="mt-1 block truncate text-[0.84rem] text-cream/40">{p.tagline}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4">
                    {!p.available && <span className="font-mono text-[0.66rem] uppercase tracking-wider text-cream/40">Sold out</span>}
                    <span className="font-mono text-[0.88rem] tabular text-cream/70">{formatPrice(p.basePriceCents)}</span>
                    <ArrowUpRight className="h-4 w-4 text-cream/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-caramel-light" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="relative hidden lg:block">
            <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-[2rem] border border-cream/[0.06] bg-[radial-gradient(80%_60%_at_50%_70%,#3d2719_0%,#1a120d_60%,#100b09_100%)]">
              <AnimatePresence mode="wait">
                {preview && (
                  <motion.div key={preview.id} className="absolute inset-0" initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.02, y: -8 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                    <ProductImage src={preview.imageUrl} visual={preview.visual} alt={preview.name} className="absolute inset-[8%] bottom-[22%]" sizes="40vw" />
                    <div className="absolute inset-x-8 bottom-8">
                      <p className="font-display text-3xl text-cream">{preview.name}</p>
                      <p className="mt-2 line-clamp-2 text-[0.86rem] text-cream/55">{preview.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {preview.tastingNotes.map((n) => (
                          <span key={n} className="rounded-full border border-cream/10 px-2.5 py-0.5 text-[0.72rem] text-cream/60">{n}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
