"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Sticky category bar with scroll-spy. */
export function CategoryNav({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  const [active, setActive] = useState(categories[0]?.slug);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    categories.forEach((c) => {
      const el = document.getElementById(c.slug);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [categories]);
  return (
    <nav aria-label="Menu categories" className="sticky top-[var(--header-h)] z-30 mt-12 border-y border-cream/[0.06] bg-ink/80 backdrop-blur-xl">
      <div className="container scrollbar-none flex gap-1 overflow-x-auto py-3">
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`#${c.slug}`}
            aria-current={active === c.slug ? "true" : undefined}
            className={cn("relative shrink-0 rounded-full px-4 py-2 text-[0.86rem] transition-colors", active === c.slug ? "text-ink" : "text-cream/60 hover:text-cream")}
          >
            {active === c.slug && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">
              {c.name} <span className="ml-1 font-mono text-[0.7rem] opacity-50">{c.count}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
