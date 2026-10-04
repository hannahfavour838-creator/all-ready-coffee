/**
 * Pure pricing logic shared by the client (display) and server (authoritative).
 * The server always recomputes prices from the database — client-side totals are never trusted.
 */

export type PricingOption = { id: number; name: string; priceDeltaCents: number; isDefault: boolean; isAvailable: boolean };
export type PricingGroup = {
  key: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  maxSelections: number | null;
  options: PricingOption[];
};
export type Selections = Record<string, number[]>;
export type ResolvedOption = { group: string; name: string; priceDeltaCents: number };

export type ResolveResult =
  | { ok: true; unitPriceCents: number; options: ResolvedOption[]; selections: Selections }
  | { ok: false; error: string };

/** Default selections for a product's option groups (required single groups get their default). */
export function defaultSelections(groups: PricingGroup[]): Selections {
  const out: Selections = {};
  for (const g of groups) {
    const available = g.options.filter((o) => o.isAvailable);
    if (g.type === "single") {
      const def = available.find((o) => o.isDefault) ?? (g.required ? available[0] : undefined);
      out[g.key] = def ? [def.id] : [];
    } else {
      out[g.key] = [];
    }
  }
  return out;
}

export function resolveSelections(basePriceCents: number, groups: PricingGroup[], selections: Selections): ResolveResult {
  const knownKeys = new Set(groups.map((g) => g.key));
  for (const key of Object.keys(selections)) {
    if (!knownKeys.has(key)) return { ok: false, error: "That customization isn't available for this drink." };
  }

  let unit = basePriceCents;
  const resolved: ResolvedOption[] = [];
  const normalized: Selections = {};

  for (const g of groups) {
    const ids = Array.from(new Set(selections[g.key] ?? []));
    if (g.type === "single" && ids.length > 1) return { ok: false, error: `Choose one ${g.name.toLowerCase()}.` };
    if (g.type === "multi" && g.maxSelections != null && ids.length > g.maxSelections)
      return { ok: false, error: `Choose up to ${g.maxSelections} ${g.name.toLowerCase()}.` };
    if (g.required && ids.length === 0) return { ok: false, error: `Please choose a ${g.name.toLowerCase()}.` };

    for (const id of ids) {
      const opt = g.options.find((o) => o.id === id);
      if (!opt) return { ok: false, error: "That option is no longer available." };
      if (!opt.isAvailable) return { ok: false, error: `${opt.name} is unavailable right now.` };
      unit += opt.priceDeltaCents;
      resolved.push({ group: g.name, name: opt.name, priceDeltaCents: opt.priceDeltaCents });
    }
    normalized[g.key] = ids.sort((a, b) => a - b);
  }
  return { ok: true, unitPriceCents: unit, options: resolved, selections: normalized };
}

/** Stable key for merging identical cart lines. */
export function lineKey(productId: number, selections: Selections) {
  const parts = Object.keys(selections)
    .sort()
    .filter((k) => selections[k]!.length > 0)
    .map((k) => `${k}:${[...selections[k]!].sort((a, b) => a - b).join(",")}`);
  return `${productId}|${parts.join(";")}`;
}

export type DiscountRule = { type: "percent" | "fixed"; value: number; minSubtotalCents: number };

export function computeDiscount(subtotalCents: number, rule: DiscountRule | null) {
  if (!rule || subtotalCents < rule.minSubtotalCents) return 0;
  if (rule.type === "percent") return Math.min(subtotalCents, Math.round((subtotalCents * Math.min(100, Math.max(0, rule.value))) / 100));
  return Math.min(subtotalCents, Math.max(0, rule.value));
}

export type TotalsInput = {
  subtotalCents: number;
  discount: DiscountRule | null;
  zone: { feeCents: number; freeOverCents: number | null } | null;
  taxRateBps: number;
  tipCents: number;
};

export function computeTotals({ subtotalCents, discount, zone, taxRateBps, tipCents }: TotalsInput) {
  const discountCents = computeDiscount(subtotalCents, discount);
  const discounted = subtotalCents - discountCents;
  const deliveryFeeCents = zone ? (zone.freeOverCents != null && discounted >= zone.freeOverCents ? 0 : zone.feeCents) : 0;
  const taxCents = Math.round((discounted * Math.max(0, taxRateBps)) / 10_000);
  const tip = Math.max(0, Math.min(tipCents, 100_00));
  return {
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    taxCents,
    tipCents: tip,
    totalCents: discounted + deliveryFeeCents + taxCents + tip,
  };
}

/** Luhn checksum — used for demo card validation (client side only). */
export function luhnValid(num: string) {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): "Visa" | "Mastercard" | "Amex" | "Discover" | "Card" {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(011|5)/.test(d)) return "Discover";
  return "Card";
}
