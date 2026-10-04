"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { defaultSelections, lineKey, resolveSelections, type Selections } from "@/lib/pricing";
import { toggleFavoriteAction } from "@/server/actions/account";
import type { MenuProduct } from "@/server/queries/catalog";
import { cn, formatPrice } from "@/lib/utils";

export function Customizer({ product, signedIn, favorite: initialFav }: { product: MenuProduct; signedIn: boolean; favorite: boolean }) {
  const [sel, setSel] = useState<Selections>(() => defaultSelections(product.groups));
  const [qty, setQty] = useState(1);
  const [fav, setFav] = useState(initialFav);
  const [pending, start] = useTransition();
  const add = useCart((s) => s.add);
  const router = useRouter();
  const priced = useMemo(() => resolveSelections(product.basePriceCents, product.groups, sel), [product, sel]);

  const toggle = (key: string, id: number, type: "single" | "multi", required: boolean, max: number | null) => {
    setSel((prev) => {
      const cur = prev[key] ?? [];
      if (type === "single") {
        if (cur.includes(id) && !required) return { ...prev, [key]: [] };
        return { ...prev, [key]: [id] };
      }
      if (cur.includes(id)) return { ...prev, [key]: cur.filter((x) => x !== id) };
      if (max != null && cur.length >= max) {
        toast(`Up to ${max} extras per drink`);
        return prev;
      }
      return { ...prev, [key]: [...cur, id] };
    });
  };

  const onAdd = () => {
    if (!priced.ok) {
      toast.error(priced.error);
      return;
    }
    add({
      key: lineKey(product.id, priced.selections),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      visual: product.visual,
      quantity: qty,
      selections: priced.selections,
      unitPriceCents: priced.unitPriceCents,
      optionLabels: priced.options.map((o) => o.name),
    });
  };

  const onFav = () => {
    if (!signedIn) {
      router.push(`/sign-in?next=/menu/${product.slug}`);
      return;
    }
    setFav((f) => !f);
    start(async () => {
      const res = await toggleFavoriteAction(product.id);
      if (!res.ok) {
        setFav((f) => !f);
        toast.error(res.error);
      } else toast(res.data.favorite ? "Saved to favorites" : "Removed from favorites");
    });
  };

  const unit = priced.ok ? priced.unitPriceCents : product.basePriceCents;

  return (
    <div className="mt-10">
      <div className="space-y-9">
        {product.groups.map((g) => (
          <fieldset key={g.key}>
            <legend className="mb-3.5 flex w-full items-baseline justify-between">
              <span className="text-[0.95rem] font-medium text-cream">{g.name}</span>
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-cream/35">
                {g.required ? "Required" : g.type === "multi" ? `Optional · up to ${g.maxSelections ?? g.options.length}` : "Optional"}
              </span>
            </legend>
            <div className={cn("grid gap-2", g.key === "extras" ? "sm:grid-cols-2" : g.options.length > 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3")}>
              {g.options.map((o) => {
                const checked = (sel[g.key] ?? []).includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "relative flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 text-[0.86rem] transition-all duration-300",
                      checked ? "border-caramel/70 bg-caramel/[0.1] text-cream" : "border-cream/[0.1] text-cream/70 hover:border-cream/25 hover:text-cream",
                      !o.isAvailable && "pointer-events-none opacity-40",
                    )}
                  >
                    <input
                      type={g.type === "single" ? "radio" : "checkbox"}
                      name={g.key}
                      className="sr-only"
                      checked={checked}
                      disabled={!o.isAvailable}
                      onChange={() => toggle(g.key, o.id, g.type, g.required, g.maxSelections)}
                    />
                    <span className="leading-snug">{o.name}{!o.isAvailable && " · out"}</span>
                    {o.priceDeltaCents !== 0 && <span className="shrink-0 font-mono text-[0.74rem] text-cream/45">+{formatPrice(o.priceDeltaCents)}</span>}
                    {checked && <motion.span layoutId={`ring-${g.key}${g.type === "multi" ? o.id : ""}`} className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-caramel/60" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-10 border-t border-cream/[0.08] bg-ink/90 px-5 py-4 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <div className="flex h-14 items-center rounded-full border border-cream/[0.14]">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-14 w-12 items-center justify-center text-cream/70 hover:text-cream" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center font-mono tabular" aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="flex h-14 w-12 items-center justify-center text-cream/70 hover:text-cream" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
          </div>
          <Button size="lg" className="flex-1" onClick={onAdd} disabled={!product.available}>
            {product.available ? (
              <>
                <ShoppingBag className="h-4 w-4" /> Add to bag ·
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={unit * qty} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }} className="tabular">
                    {formatPrice(unit * qty)}
                  </motion.span>
                </AnimatePresence>
              </>
            ) : product.soldOut ? "Sold out today" : "Currently unavailable"}
          </Button>
          <button
            onClick={onFav}
            disabled={pending}
            aria-pressed={fav}
            aria-label={fav ? "Remove from favorites" : "Save to favorites"}
            className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-300", fav ? "border-caramel bg-caramel/15 text-caramel-light" : "border-cream/[0.14] text-cream/60 hover:text-cream")}
          >
            <Heart className={cn("h-5 w-5 transition-transform", fav && "scale-110 fill-current")} />
          </button>
        </div>
        {!priced.ok && <p role="alert" className="mt-3 text-[0.8rem] text-danger">{priced.error}</p>}
      </div>
    </div>
  );
}
