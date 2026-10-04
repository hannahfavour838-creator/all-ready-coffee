import { describe, expect, it } from "vitest";
import { cardBrand, computeDiscount, computeTotals, defaultSelections, lineKey, luhnValid, resolveSelections, type PricingGroup } from "@/lib/pricing";

const groups: PricingGroup[] = [
  { key: "size", name: "Size", type: "single", required: true, maxSelections: null, options: [
    { id: 1, name: "Small", priceDeltaCents: 0, isDefault: false, isAvailable: true },
    { id: 2, name: "Medium", priceDeltaCents: 75, isDefault: true, isAvailable: true },
    { id: 3, name: "Large", priceDeltaCents: 150, isDefault: false, isAvailable: true },
  ] },
  { key: "extras", name: "Extras", type: "multi", required: false, maxSelections: 2, options: [
    { id: 10, name: "Shot", priceDeltaCents: 125, isDefault: false, isAvailable: true },
    { id: 11, name: "Vanilla", priceDeltaCents: 60, isDefault: false, isAvailable: true },
    { id: 12, name: "Hazelnut", priceDeltaCents: 60, isDefault: false, isAvailable: false },
  ] },
];

describe("pricing", () => {
  it("picks required defaults", () => {
    expect(defaultSelections(groups)).toEqual({ size: [2], extras: [] });
  });
  it("prices selections from the server-side catalog", () => {
    const r = resolveSelections(550, groups, { size: [3], extras: [10, 11] });
    expect(r.ok && r.unitPriceCents).toBe(550 + 150 + 125 + 60);
  });
  it("rejects tampered or invalid selections", () => {
    expect(resolveSelections(550, groups, { size: [1, 2] }).ok).toBe(false);
    expect(resolveSelections(550, groups, { size: [999] }).ok).toBe(false);
    expect(resolveSelections(550, groups, { size: [2], extras: [10, 11, 12] }).ok).toBe(false);
    expect(resolveSelections(550, groups, { size: [2], extras: [12] }).ok).toBe(false);
    expect(resolveSelections(550, groups, { size: [], extras: [] }).ok).toBe(false);
    expect(resolveSelections(550, groups, { size: [2], hacked: [1] }).ok).toBe(false);
  });
  it("builds stable line keys regardless of order", () => {
    expect(lineKey(4, { extras: [11, 10], size: [2] })).toBe(lineKey(4, { size: [2], extras: [10, 11] }));
  });
  it("computes discounts with caps and minimums", () => {
    expect(computeDiscount(2000, { type: "percent", value: 15, minSubtotalCents: 1500 })).toBe(300);
    expect(computeDiscount(1000, { type: "percent", value: 15, minSubtotalCents: 1500 })).toBe(0);
    expect(computeDiscount(300, { type: "fixed", value: 500, minSubtotalCents: 0 })).toBe(300);
  });
  it("computes totals with free-delivery threshold, tax and tip", () => {
    const t = computeTotals({ subtotalCents: 4200, discount: null, zone: { feeCents: 299, freeOverCents: 4000 }, taxRateBps: 0, tipCents: 500 });
    expect(t).toMatchObject({ deliveryFeeCents: 0, taxCents: 0, totalCents: 4700 });
    const t2 = computeTotals({ subtotalCents: 2000, discount: { type: "fixed", value: 500, minSubtotalCents: 0 }, zone: { feeCents: 299, freeOverCents: 4000 }, taxRateBps: 1000, tipCents: 0 });
    expect(t2).toMatchObject({ discountCents: 500, deliveryFeeCents: 299, taxCents: 150, totalCents: 1500 + 299 + 150 });
  });
  it("validates demo cards client-side", () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
    expect(luhnValid("4242 4242 4242 4241")).toBe(false);
    expect(cardBrand("4242")).toBe("Visa");
    expect(cardBrand("5555555555554444")).toBe("Mastercard");
    expect(cardBrand("378282246310005")).toBe("Amex");
  });
});
