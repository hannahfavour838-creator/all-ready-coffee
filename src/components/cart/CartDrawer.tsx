"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProductImage } from "@/components/menu/ProductImage";
import { cartCount, cartSubtotal, useCart, type CartLine } from "@/stores/cart";
import { formatPrice } from "@/lib/utils";

export function CartDrawer({ signedIn }: { signedIn: boolean }) {
  const { lines, open, setOpen, setQuantity, remove, lastAddedKey } = useCart();
  const router = useRouter();
  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);

  const checkout = () => {
    setOpen(false);
    router.push(signedIn ? "/checkout" : "/sign-in?next=/checkout");
  };

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title={count ? `Your bag · ${count}` : "Your bag"}
      footer={
        lines.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.9rem] text-cream/60">Subtotal</span>
              <span className="font-display text-3xl tabular text-cream">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-[0.78rem] text-cream/40">Delivery fee and any promo codes are calculated at checkout.</p>
            <Button size="lg" className="w-full" onClick={checkout}>
              {signedIn ? "Checkout" : "Sign in to checkout"} <ArrowRight className="h-4 w-4" />
            </Button>
            <button onClick={() => setOpen(false)} className="w-full text-center text-[0.84rem] text-cream/55 transition hover:text-cream">
              Continue shopping
            </button>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-20 text-center">
          <div className="relative mb-8 h-28 w-28">
            <div className="absolute inset-0 rounded-full bg-caramel/10 blur-2xl" />
            <svg viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden>
              <path d="M30 44h60l-6 56a8 8 0 0 1-8 7H44a8 8 0 0 1-8-7z" fill="none" stroke="rgb(241 232 217 / 0.35)" strokeWidth="2" />
              <path d="M44 44V36a16 16 0 0 1 32 0v8" fill="none" stroke="rgb(192 141 88)" strokeWidth="2" strokeLinecap="round" />
              {[0, 1, 2].map((i) => (
                <path key={i} d={`M${52 + i * 8} 24 q 4 -6 0 -12`} stroke="rgb(241 232 217 / 0.25)" strokeWidth="1.5" fill="none" className="animate-steam" style={{ animationDelay: `${i * 0.6}s` }} />
              ))}
            </svg>
          </div>
          <p className="font-display text-3xl text-cream">Your bag is empty</p>
          <p className="mt-3 max-w-xs text-[0.9rem] text-cream/50">Something warm, something iced, something flaky — it all starts on the menu.</p>
          <ButtonLink href="/menu" className="mt-8" onClick={() => setOpen(false)}>
            Browse the menu
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-cream/[0.06] px-6">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <CartRow key={line.key} line={line} highlight={line.key === lastAddedKey} onQty={(q) => setQuantity(line.key, q)} onRemove={() => remove(line.key)} onNavigate={() => setOpen(false)} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Sheet>
  );
}

function CartRow({ line, highlight, onQty, onRemove, onNavigate }: { line: CartLine; highlight: boolean; onQty: (q: number) => void; onRemove: () => void; onNavigate: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, backgroundColor: highlight ? "rgba(192,141,88,0.10)" : "rgba(0,0,0,0)" }}
      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
      exit={{ opacity: 0, x: 40, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 overflow-hidden py-5"
    >
      <Link href={`/menu/${line.slug}`} onClick={onNavigate} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-roast to-ink">
        <ProductImage src={line.imageUrl} visual={line.visual} alt={line.name} className="absolute inset-1" sizes="80px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/menu/${line.slug}`} onClick={onNavigate} className="font-display text-xl leading-tight text-cream hover:text-caramel-light">
            {line.name}
          </Link>
          <span className="tabular text-[0.92rem] text-cream">{formatPrice(line.unitPriceCents * line.quantity)}</span>
        </div>
        {line.optionLabels.length > 0 && <p className="mt-1 text-[0.78rem] leading-snug text-cream/45">{line.optionLabels.join(" · ")}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full border border-cream/[0.12]">
            <button onClick={() => onQty(line.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-cream/70 hover:text-cream" aria-label={`Decrease quantity of ${line.name}`}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center font-mono text-[0.8rem] tabular" aria-live="polite">{line.quantity}</span>
            <button onClick={() => onQty(line.quantity + 1)} disabled={line.quantity >= 20} className="flex h-8 w-8 items-center justify-center rounded-full text-cream/70 hover:text-cream disabled:opacity-30" aria-label={`Increase quantity of ${line.name}`}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={onRemove} className="flex items-center gap-1.5 text-[0.78rem] text-cream/40 transition hover:text-danger" aria-label={`Remove ${line.name}`}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </motion.li>
  );
}
