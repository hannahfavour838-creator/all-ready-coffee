"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Truck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export type PublicZone = { id: number; name: string; postalCodes: string[]; feeCents: number; minOrderCents: number; freeOverCents: number | null; etaMinMinutes: number; etaMaxMinutes: number };

export function ZipChecker({ zones }: { zones: PublicZone[] }) {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<{ ok: boolean; zone?: PublicZone } | null>(null);
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    const z = zip.trim().slice(0, 5);
    if (!/^\d{5}$/.test(z)) {
      setResult(null);
      return;
    }
    const zone = zones.find((x) => x.postalCodes.includes(z));
    setResult({ ok: !!zone, zone });
  };
  return (
    <div>
      <form onSubmit={check} className="flex gap-2" aria-label="Check delivery availability">
        <label htmlFor="zip-check" className="sr-only">ZIP code</label>
        <input
          id="zip-check"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter your ZIP code"
          className="h-14 flex-1 rounded-full border border-cream/15 bg-ink/60 px-6 font-mono text-[0.95rem] tracking-wider text-cream placeholder:font-sans placeholder:tracking-normal placeholder:text-cream/35 focus:border-caramel-light/70 focus:outline-none"
        />
        <Button type="submit" size="lg">Check</Button>
      </form>
      <div aria-live="polite" className="min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={String(result.ok) + zip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-2xl border border-cream/10 bg-ink/40 p-5">
              {result.ok && result.zone ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.95rem] text-cream">Good news — we deliver to <strong className="font-medium">{result.zone.name}</strong>.</p>
                    <p className="mt-1 text-[0.82rem] text-cream/50">
                      Usually {result.zone.etaMinMinutes}–{result.zone.etaMaxMinutes} min · {formatPrice(result.zone.feeCents)} delivery
                      {result.zone.freeOverCents ? ` · free over ${formatPrice(result.zone.freeOverCents)}` : ""}
                    </p>
                  </div>
                  <ButtonLink href="/menu" size="sm">Start an order</ButtonLink>
                </div>
              ) : (
                <p className="text-[0.92rem] text-cream/70">We don&apos;t deliver to {zip} yet — we&apos;re expanding across Portland this year. You&apos;re always welcome at the café on Roastery Row.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function DeliverySection({ zones }: { zones: PublicZone[] }) {
  return (
    <section className="relative overflow-hidden py-24 md:py-36" aria-labelledby="delivery-title">
      <div className="pointer-events-none absolute right-[-10%] top-10 h-[34rem] w-[34rem] rounded-full bg-caramel/[0.07] blur-3xl" />
      <div className="container grid gap-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-5">Delivery</p>
          <h2 id="delivery-title" className="font-display text-display-lg text-cream">From our bar<br /><em className="text-caramel-light">to your door.</em></h2>
          <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-cream/60">
            Hot drinks are sealed in insulated sleeves, iced drinks ride separately so nothing melts into anything else. You&apos;ll see every step live, from the bar to your doorstep.
          </p>
          <ul className="mt-10 space-y-5">
            {[
              { icon: Clock, t: "Typically 20–45 minutes", d: "Live estimates based on kitchen volume and distance — we'll always tell you the truth." },
              { icon: Truck, t: "Tracked in real time", d: "Placed, confirmed, preparing, ready, out for delivery, delivered." },
              { icon: MapPin, t: `${zones.length} Portland neighborhoods`, d: zones.map((z) => z.name).join(" · ") },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/10 bg-roast/60"><Icon className="h-4 w-4 text-caramel-light" /></span>
                <span>
                  <span className="block text-[0.98rem] text-cream">{t}</span>
                  <span className="mt-1 block text-[0.84rem] leading-relaxed text-cream/45">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="self-center rounded-[2rem] border border-cream/[0.08] bg-gradient-to-b from-roast/70 to-espresso/60 p-8 md:p-10">
          <p className="font-display text-3xl text-cream">Do we deliver to you?</p>
          <p className="mb-7 mt-2 text-[0.88rem] text-cream/50">Try 97209, 97205 or 97214.</p>
          <ZipChecker zones={zones} />
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-cream/[0.07] bg-cream/[0.07]">
            {zones.slice(0, 4).map((z) => (
              <div key={z.id} className="bg-espresso p-4">
                <p className="text-[0.82rem] text-cream/80">{z.name}</p>
                <p className="mt-1 font-mono text-[0.72rem] text-cream/40">{z.etaMinMinutes}–{z.etaMaxMinutes} min · {formatPrice(z.feeCents)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
