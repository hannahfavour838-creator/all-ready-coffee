"use client";

import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { defaultSelections, lineKey, resolveSelections } from "@/lib/pricing";
import type { MenuProduct } from "@/server/queries/catalog";
import { cn } from "@/lib/utils";

/** One-tap add with the drink's default customization. */
export function QuickAdd({ product, className }: { product: MenuProduct; className?: string }) {
  const add = useCart((s) => s.add);
  const [done, setDone] = useState(false);
  if (!product.available) {
    return <span className={cn("rounded-full border border-cream/10 px-3 py-1.5 text-[0.72rem] text-cream/45", className)}>{product.soldOut ? "Sold out" : "Unavailable"}</span>;
  }
  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = defaultSelections(product.groups);
    const r = resolveSelections(product.basePriceCents, product.groups, sel);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    add({
      key: lineKey(product.id, r.selections),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      visual: product.visual,
      quantity: 1,
      selections: r.selections,
      unitPriceCents: r.unitPriceCents,
      optionLabels: r.options.map((o) => o.name),
    });
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  };
  return (
    <button
      onClick={onAdd}
      aria-label={`Add ${product.name} to bag`}
      className={cn(
        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 bg-ink/60 text-cream backdrop-blur transition-all duration-300 hover:scale-105 hover:border-caramel hover:bg-caramel hover:text-ink",
        done && "border-caramel bg-caramel text-ink",
        className,
      )}
    >
      {done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
