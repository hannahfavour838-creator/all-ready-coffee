import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { cleanText, cleanMultiline } from "@/lib/security/sanitize";
import { safeRedirect, isSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { canTransition } from "@/lib/order-status";
import { checkoutSchema, signUpSchema } from "@/lib/validation";

describe("sanitize", () => {
  it("strips control and bidi characters", () => {
    expect(cleanText("Hi\u0000 there‮!")).toBe("Hi there!");
    expect(cleanMultiline("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
  });
});

describe("redirects & CSRF", () => {
  it("only allows internal redirects", () => {
    expect(safeRedirect("/account/orders")).toBe("/account/orders");
    expect(safeRedirect("https://evil.com")).toBe("/account");
    expect(safeRedirect("//evil.com")).toBe("/account");
    expect(safeRedirect("/\\evil.com")).toBe("/account");
  });
  it("rejects cross-origin mutations", () => {
    const ok = new Request("http://localhost:3000/api/x", { method: "POST", headers: { origin: "http://localhost:3000", host: "localhost:3000" } });
    const bad = new Request("http://localhost:3000/api/x", { method: "POST", headers: { origin: "https://evil.com", host: "localhost:3000" } });
    expect(isSameOrigin(ok)).toBe(true);
    expect(isSameOrigin(bad)).toBe(false);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });
});

describe("passwords", () => {
  it("hashes with scrypt and verifies in constant time", async () => {
    const h = await hashPassword("Correct-Horse-42");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Correct-Horse-42", h)).toBe(true);
    expect(await verifyPassword("wrong-password-1", h)).toBe(false);
    expect(await verifyPassword("anything", "disabled$")).toBe(false);
  });
  it("enforces a sensible policy", () => {
    expect(passwordProblems("short1")).toBeTruthy();
    expect(passwordProblems("password123")).toBeTruthy();
    expect(passwordProblems("onlyletterslong")).toBeTruthy();
    expect(passwordProblems("Roasted-Beans-2026")).toBeNull();
  });
});

describe("order workflow", () => {
  it("only allows forward transitions", () => {
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("placed", "delivered")).toBe(false);
    expect(canTransition("delivered", "placed")).toBe(false);
    expect(canTransition("out_for_delivery", "cancelled")).toBe(false);
  });
});

describe("validation", () => {
  it("normalizes sign-up input", () => {
    const r = signUpSchema.safeParse({ name: "  Ada  Lovelace ", email: " ADA@Example.com ", password: "x", marketing: false });
    expect(r.success && r.data.email).toBe("ada@example.com");
    expect(r.success && r.data.name).toBe("Ada Lovelace");
  });
  it("never accepts a full card number at checkout", () => {
    const base = { lines: [{ productId: 1, quantity: 1, selections: {} }], tipCents: 0, phone: "", payment: { brand: "Visa", last4: "4242", expiryValid: true, nameOnCard: "Ada" } };
    expect(checkoutSchema.safeParse(base).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, payment: { ...base.payment, last4: "4242424242424242" } }).success).toBe(false);
  });
});
