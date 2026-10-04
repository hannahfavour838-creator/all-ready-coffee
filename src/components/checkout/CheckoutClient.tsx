"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CreditCard, Lock, MapPin, Plus, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink, Spinner } from "@/components/ui/button";
import { Checkbox, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { ProductImage } from "@/components/menu/ProductImage";
import { cartSubtotal, useCart, useCartHydrated } from "@/stores/cart";
import { placeOrderAction, quoteAction, type Quote } from "@/server/actions/checkout";
import { cardBrand, luhnValid } from "@/lib/pricing";
import { US_STATES } from "@/lib/validation";
import { cn, formatPrice } from "@/lib/utils";

type SavedAddress = { id: string; label: string; recipient: string; line1: string; line2: string | null; city: string; state: string; postalCode: string; instructions: string | null; isDefault: boolean };

const TIP_PRESETS = [0, 10, 15, 20];

export function CheckoutClient({ user, addresses, zoneZips, paused }: { user: { name: string; phone: string | null }; addresses: SavedAddress[]; zoneZips: string[]; paused: boolean }) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const hydrated = useCartHydrated();
  const [addressId, setAddressId] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState({ recipient: user.name, line1: "", line2: "", city: "Portland", state: "OR", postalCode: "", instructions: "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [notes, setNotes] = useState("");
  const [tipPct, setTipPct] = useState<number | "custom">(15);
  const [customTip, setCustomTip] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: user.name });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [placing, startPlacing] = useTransition();
  const [stage, setStage] = useState<"idle" | "authorizing" | "done">("idle");

  const subtotal = cartSubtotal(lines);
  const tipCents = tipPct === "custom" ? Math.round(Math.max(0, Math.min(100, Number(customTip) || 0)) * 100) : Math.round((subtotal * tipPct) / 100);
  const selected = addresses.find((a) => a.id === addressId);
  const postal = addressId === "new" ? addr.postalCode : selected?.postalCode ?? "";
  const payloadLines = useMemo(() => lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections })), [lines]);

  // Authoritative server quote (debounced)
  const reqId = useRef(0);
  useEffect(() => {
    if (!hydrated || !lines.length) return;
    const id = ++reqId.current;
    setQuoting(true);
    const t = window.setTimeout(async () => {
      const res = await quoteAction({ lines: payloadLines, postalCode: /^\d{5}$/.test(postal) ? postal : null, discountCode: code, tipCents });
      if (id !== reqId.current) return;
      setQuoting(false);
      if (res.ok) {
        setQuote(res.data);
        if (code && res.data.discountError) {
          toast.error(res.data.discountError);
          setCode(null);
        }
      } else setError(res.error);
    }, 300);
    return () => window.clearTimeout(t);
  }, [hydrated, lines.length, payloadLines, postal, code, tipCents]);

  // Card helpers (client only — the full number never leaves the browser)
  const digits = card.number.replace(/\D/g, "");
  const brand = cardBrand(digits);
  const expOk = (() => {
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(card.exp);
    if (!m) return false;
    const mm = Number(m[1]), yy = Number(m[2]) + 2000;
    if (mm < 1 || mm > 12) return false;
    const end = new Date(yy, mm, 1);
    return end.getTime() > Date.now();
  })();
  const cardValid = luhnValid(digits) && expOk && /^\d{3,4}$/.test(card.cvc) && card.name.trim().length > 1;

  const onPlace = () => {
    setError(null);
    const errs: Record<string, string> = {};
    if (addressId === "new") {
      if (addr.line1.trim().length < 4) errs.line1 = "Enter a street address.";
      if (!/^\d{5}$/.test(addr.postalCode)) errs.postalCode = "Enter a 5-digit ZIP.";
      else if (!zoneZips.includes(addr.postalCode)) errs.postalCode = "We don't deliver to this ZIP yet.";
      if (addr.recipient.trim().length < 2) errs.recipient = "Who should we hand it to?";
    }
    if (!luhnValid(digits)) errs.cardNumber = "Check the card number.";
    if (!expOk) errs.exp = "Use a future date, MM/YY.";
    if (!/^\d{3,4}$/.test(card.cvc)) errs.cvc = "3–4 digits.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError("Please review the highlighted fields.");
      return;
    }
    startPlacing(async () => {
      setStage("authorizing");
      await new Promise((r) => setTimeout(r, 1100)); // simulated authorisation round-trip
      const res = await placeOrderAction({
        lines: payloadLines,
        addressId: addressId === "new" ? null : addressId,
        address: addressId === "new" ? { recipient: addr.recipient, line1: addr.line1, line2: addr.line2 || null, city: addr.city, state: addr.state as (typeof US_STATES)[number], postalCode: addr.postalCode, instructions: addr.instructions || null } : null,
        saveAddress: addressId === "new" && saveAddress,
        phone,
        notes: notes || null,
        tipCents,
        discountCode: code,
        payment: { brand, last4: digits.slice(-4), expiryValid: true, nameOnCard: card.name },
      });
      if (!res.ok) {
        setStage("idle");
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      setStage("done");
      clear();
      router.replace(`/account/orders/${res.data.number}?placed=1`);
    });
  };

  if (!hydrated) {
    return (
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4"><div className="skeleton h-40" /><div className="skeleton h-64" /></div>
        <div className="skeleton h-96" />
      </div>
    );
  }
  if (!lines.length && stage === "idle") {
    return <EmptyState className="mt-12" title="Your bag is empty" body="Add a drink or two and come back — we'll keep everything else ready." action={<ButtonLink href="/menu">Browse the menu</ButtonLink>} />;
  }

  const blockers = paused ? "Delivery is paused for a few minutes." : quote?.zoneError ? quote.zoneError : quote && quote.minOrderShortfallCents > 0 ? `Add ${formatPrice(quote.minOrderShortfallCents)} more to reach this zone's minimum.` : null;

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
      <div className="space-y-6">
        {/* 1 — Delivery */}
        <Section n="01" title="Delivery">
          {addresses.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery address">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={addressId === a.id}
                  onClick={() => setAddressId(a.id)}
                  className={cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition-all", addressId === a.id ? "border-caramel/70 bg-caramel/[0.08]" : "border-cream/10 hover:border-cream/25")}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-caramel-light" />
                  <span className="min-w-0 text-[0.86rem]">
                    <span className="block text-cream">{a.label}</span>
                    <span className="block truncate text-cream/50">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</span>
                    <span className="block text-cream/50">{a.city}, {a.state} {a.postalCode}</span>
                    {!zoneZips.includes(a.postalCode) && <span className="mt-1 block text-[0.76rem] text-danger">Outside delivery area</span>}
                  </span>
                </button>
              ))}
              <button type="button" role="radio" aria-checked={addressId === "new"} onClick={() => setAddressId("new")} className={cn("flex items-center gap-3 rounded-2xl border border-dashed p-4 text-left text-[0.86rem] transition-all", addressId === "new" ? "border-caramel/70 bg-caramel/[0.08] text-cream" : "border-cream/15 text-cream/60 hover:text-cream")}>
                <Plus className="h-4 w-4" /> Deliver somewhere new
              </button>
            </div>
          )}
          <AnimatePresence initial={false}>
            {addressId === "new" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className={cn("grid gap-4 sm:grid-cols-6", addresses.length > 0 && "mt-6")}>
                  <Input className="sm:col-span-6" label="Recipient" value={addr.recipient} onChange={(e) => setAddr({ ...addr, recipient: e.target.value })} autoComplete="name" error={fieldErrors.recipient} />
                  <Input className="sm:col-span-4" label="Street address" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" error={fieldErrors.line1} />
                  <Input className="sm:col-span-2" label="Apt / suite" optional value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" />
                  <Input className="sm:col-span-3" label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" />
                  <Select className="sm:col-span-1" label="State" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} autoComplete="address-level1">
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Input className="sm:col-span-2" label="ZIP" inputMode="numeric" maxLength={5} value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value.replace(/\D/g, "") })} autoComplete="postal-code" error={fieldErrors.postalCode} hint={quote?.zone && addressId === "new" ? `${quote.zone.name} · ${quote.zone.etaMin}–${quote.zone.etaMax} min` : undefined} />
                  <Input className="sm:col-span-6" label="Delivery instructions" optional value={addr.instructions} onChange={(e) => setAddr({ ...addr, instructions: e.target.value })} placeholder="Gate code, buzzer, where to leave it…" maxLength={200} />
                  <Checkbox className="sm:col-span-6" label="Save this address to my account" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input label="Phone for the courier" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Only used for this delivery." />
            <Textarea label="Note for the bar" optional value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} className="[&_textarea]:min-h-12" placeholder="Extra hot, light ice…" />
          </div>
        </Section>

        {/* 2 — Tip */}
        <Section n="02" title="Thank your courier">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tip">
            {TIP_PRESETS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={tipPct === p} onClick={() => setTipPct(p)} className={cn("min-w-[5.5rem] rounded-full border px-4 py-2.5 text-[0.86rem] transition-all", tipPct === p ? "border-caramel bg-caramel text-ink" : "border-cream/15 text-cream/70 hover:text-cream")}>
                {p === 0 ? "No tip" : `${p}%`}
                {p > 0 && <span className="ml-1.5 font-mono text-[0.72rem] opacity-70">{formatPrice(Math.round((subtotal * p) / 100))}</span>}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={tipPct === "custom"} onClick={() => setTipPct("custom")} className={cn("rounded-full border px-4 py-2.5 text-[0.86rem] transition-all", tipPct === "custom" ? "border-caramel bg-caramel text-ink" : "border-cream/15 text-cream/70 hover:text-cream")}>Custom</button>
          </div>
          {tipPct === "custom" && <Input className="mt-4 max-w-[12rem]" label="Tip amount ($)" type="number" inputMode="decimal" min={0} max={100} step="0.5" value={customTip} onChange={(e) => setCustomTip(e.target.value)} />}
          <p className="mt-3 text-[0.78rem] text-cream/40">100% of tips go to your courier.</p>
        </Section>

        {/* 3 — Payment */}
        <Section n="03" title="Payment" aside={<span className="flex items-center gap-1.5 rounded-full border border-caramel/30 bg-caramel/10 px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-caramel-light"><ShieldCheck className="h-3.5 w-3.5" /> Demo checkout</span>}>
          <p className="mb-5 text-[0.84rem] leading-relaxed text-cream/55">
            This is a simulated payment — <strong className="font-medium text-cream/80">no real money moves</strong> and your card number never leaves this page. Use test card <button type="button" className="font-mono text-caramel-light underline-offset-2 hover:underline" onClick={() => setCard({ ...card, number: "4242 4242 4242 4242", exp: card.exp || "12/29", cvc: card.cvc || "123" })}>4242 4242 4242 4242</button>, any future date and any CVC.
          </p>
          <div className="relative overflow-hidden rounded-2xl border border-cream/10 bg-gradient-to-br from-roast via-espresso to-ink p-5">
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="relative sm:col-span-6">
                <Input label="Card number" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ") })} error={fieldErrors.cardNumber} />
                <span className="pointer-events-none absolute right-4 top-[2.35rem] flex items-center gap-1.5 font-mono text-[0.7rem] text-cream/50"><CreditCard className="h-4 w-4" /> {digits.length > 1 ? brand : ""}</span>
              </div>
              <Input className="sm:col-span-2" label="Expiry" placeholder="MM/YY" inputMode="numeric" autoComplete="off" value={card.exp} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setCard({ ...card, exp: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v }); }} error={fieldErrors.exp} />
              <Input className="sm:col-span-1" label="CVC" inputMode="numeric" autoComplete="off" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} error={fieldErrors.cvc} />
              <Input className="sm:col-span-3" label="Name on card" autoComplete="off" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[0.76rem] text-cream/40"><Lock className="h-3.5 w-3.5" /> Only the card brand and last four digits are stored with your receipt.</p>
        </Section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Order summary">
        <div className="rounded-[1.75rem] border border-cream/[0.08] bg-espresso/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-cream">Your order</h2>
            <Link href="/menu" className="text-[0.8rem] text-cream/50 hover:text-cream">Add more</Link>
          </div>
          <ul className="mt-5 max-h-[18rem] space-y-4 overflow-y-auto pr-1">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-roast to-ink">
                  <ProductImage src={l.imageUrl} visual={l.visual} alt="" className="absolute inset-1" sizes="56px" />
                  <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cream px-1 font-mono text-[0.62rem] text-ink">{l.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9rem] text-cream">{l.name}</p>
                  <p className="truncate text-[0.74rem] text-cream/40">{l.optionLabels.join(" · ")}</p>
                </div>
                <p className="font-mono text-[0.82rem] tabular text-cream/80">{formatPrice(l.unitPriceCents * l.quantity)}</p>
              </li>
            ))}
          </ul>

          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const c = codeInput.trim().toUpperCase();
              if (c) setCode(c);
            }}
          >
            <label htmlFor="promo" className="sr-only">Promo code</label>
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/35" />
              <input id="promo" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="Promo code" maxLength={24} className="h-11 w-full rounded-full border border-cream/12 bg-ink/50 pl-10 pr-4 font-mono text-[0.84rem] uppercase tracking-wider text-cream placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-cream/30 focus:border-caramel-light/60 focus:outline-none" />
            </div>
            <Button type="submit" variant="subtle" size="sm" className="h-11">Apply</Button>
          </form>
          {quote?.discountCode && (
            <p className="mt-2 flex items-center justify-between text-[0.8rem] text-success">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> {quote.discountCode} applied</span>
              <button className="text-cream/45 hover:text-cream" onClick={() => { setCode(null); setCodeInput(""); }}>Remove</button>
            </p>
          )}

          <dl className="mt-6 space-y-2.5 border-t border-cream/[0.07] pt-5 text-[0.88rem]">
            <Row label="Subtotal" value={quote ? formatPrice(quote.subtotalCents) : formatPrice(subtotal)} />
            {quote && quote.discountCents > 0 && <Row label="Discount" value={`−${formatPrice(quote.discountCents)}`} tone="success" />}
            <Row label={quote?.zone ? `Delivery · ${quote.zone.name}` : "Delivery"} value={quote?.zone ? (quote.deliveryFeeCents === 0 ? "Free" : formatPrice(quote.deliveryFeeCents)) : "—"} />
            {quote && quote.taxCents > 0 && <Row label="Tax" value={formatPrice(quote.taxCents)} />}
            <Row label="Courier tip" value={formatPrice(tipCents)} />
            <div className="flex items-baseline justify-between border-t border-cream/[0.07] pt-4">
              <dt className="text-cream">Total</dt>
              <dd className="flex items-center gap-2 font-display text-4xl tabular text-cream">
                {quoting && <Spinner className="h-3.5 w-3.5 text-cream/40" />}
                {quote ? formatPrice(quote.totalCents) : "—"}
              </dd>
            </div>
          </dl>
          {quote?.zone && <p className="mt-2 text-[0.78rem] text-cream/45">Estimated arrival in about {quote.zone.etaMin}–{quote.zone.etaMax} min after the café accepts. Estimates aren&apos;t guarantees.</p>}

          <div className="mt-6 space-y-3">
            <FormError message={error ?? blockers} />
            <Button size="lg" className="w-full" onClick={onPlace} loading={placing} disabled={!quote || !!blockers || !cardValid}>
              Place order{quote ? ` · ${formatPrice(quote.totalCents)}` : ""}
            </Button>
            {!cardValid && <p className="text-center text-[0.76rem] text-cream/40">Enter demo card details to continue.</p>}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {stage !== "idle" && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/85 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="assertive">
            <div className="text-center">
              <div className="relative mx-auto h-20 w-20">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-caramel/50" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full border border-cream/15 bg-espresso">
                  {stage === "done" ? <Check className="h-7 w-7 text-caramel-light" /> : <Spinner className="h-6 w-6 text-caramel-light" />}
                </span>
              </div>
              <p className="mt-8 font-display text-3xl text-cream">{stage === "done" ? "Order placed" : "Simulating payment…"}</p>
              <p className="mt-2 text-[0.86rem] text-cream/50">{stage === "done" ? "Sending it to the bar." : "Demo authorization — no real charge."}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ n, title, children, aside }: { n: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-cream/[0.08] bg-espresso/40 p-6 md:p-8" aria-labelledby={`sec-${n}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={`sec-${n}`} className="flex items-baseline gap-3 font-display text-3xl text-cream">
          <span className="font-mono text-[0.72rem] tracking-[0.2em] text-caramel-light">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-cream/55">{label}</dt>
      <dd className={cn("tabular text-cream/85", tone === "success" && "text-success")}>{value}</dd>
    </div>
  );
}
