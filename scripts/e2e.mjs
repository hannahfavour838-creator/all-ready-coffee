/**
 * End-to-end smoke test of the full ordering loop against a running server.
 *   BASE_URL=http://localhost:3000 npm run e2e
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
}

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "✔" : "✘"} ${name}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
const watch = (page, label) => {
  page.on("console", (m) => m.type() === "error" && errors.push(`[${label}] ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
};

// ── Anonymous ──
const anon = await browser.newContext();
const a = await anon.newPage();
watch(a, "anon");
await a.goto(BASE);
check("home shows welcome headline", (await a.locator("h1").first().innerText()).toLowerCase().includes("welcome"));
check("hero canvas mounts", await a.locator("canvas").first().waitFor({ state: "attached", timeout: 60000 }).then(() => true).catch(() => false));
const r1 = await a.goto(`${BASE}/account`);
check("anonymous /account redirects to sign-in", a.url().includes("/sign-in"));
const r2 = await a.request.get(`${BASE}/api/notifications`);
check("anonymous API is rejected", r2.status() === 401);
void r1;

// ── Customer journey ──
const cust = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const c = await cust.newPage();
watch(c, "customer");
const email = `e2e+${Date.now()}@example.com`;
await c.goto(`${BASE}/sign-up`);
await c.getByLabel("Full name").fill("Riley Tester");
await c.getByLabel("Email").fill(email);
await c.getByLabel("Password", { exact: true }).fill("Roasted-Beans-2026");
await c.getByRole("button", { name: "Create account" }).click();
await c.waitForURL(/\/account/, { timeout: 20000 });
check("sign up lands in account", true);

await c.goto(`${BASE}/menu/iced-latte`);
await c.getByText("Large · 20 oz").click();
await c.getByText("Oat").click();
await c.getByRole("button", { name: "Increase quantity" }).click();
await c.getByRole("button", { name: /Add to bag/ }).click();
check("bag drawer opens with item", await c.getByRole("dialog", { name: /Your bag/ }).isVisible());
await c.getByRole("button", { name: /Checkout/ }).click();
await c.waitForURL(/\/checkout/);
await c.waitForTimeout(3000);
await c.screenshot({ path: "/tmp/claude-0/e2e-checkout.png", fullPage: true });
await c.getByLabel("Street address").fill("1420 NW Lovejoy St");
await c.getByLabel("ZIP").fill("97209");
await c.getByLabel("Card number").fill("4242424242424242");
await c.getByLabel("Expiry").fill("1230");
await c.getByLabel("CVC").fill("123");
await c.getByPlaceholder("Promo code").fill("WELCOME15");
await c.getByRole("button", { name: "Apply" }).click();
await c.waitForTimeout(1500);
await c.screenshot({ path: "/tmp/claude-0/e2e-promo.png", fullPage: true });
check("promo code applies", await c.getByText("WELCOME15 applied").isVisible().catch(() => false));
await c.getByRole("button", { name: /Place order/ }).click();
await c.waitForURL(/\/account\/orders\/AR-\d+/, { timeout: 30000 });
const number = c.url().match(/AR-\d+/)[0];
check("order placed", true, number);
check("confirmation banner", await c.getByText(`order ${number} is in`).waitFor({ timeout: 15000 }).then(() => true).catch(() => false));

// ── Authorization ──
const adminAsCustomer = await c.goto(`${BASE}/admin`);
check("customer cannot access /admin (404)", adminAsCustomer.status() === 404 && (await c.locator("h1").first().innerText()).includes("This cup is empty"));
const other = await c.request.get(`${BASE}/api/orders/AR-1001/status`);
check("customer cannot read another customer's order", other.status() === 404);

// ── Owner workflow ──
const own = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const o = await own.newPage();
watch(o, "owner");
await o.goto(`${BASE}/sign-in`);
await o.getByLabel("Email").fill("owner@allreadycoffee.com");
await o.getByLabel("Password", { exact: true }).fill("AllReady!Owner2026");
await o.getByRole("button", { name: "Sign in" }).click();
await o.waitForURL(/\/admin/, { timeout: 20000 });
check("owner lands on dashboard", true);
await o.goto(`${BASE}/admin/orders/${number}`);
for (const step of ["Accept order", "Start preparing", "Mark ready", "Out for delivery", "Mark delivered"]) {
  await o.getByRole("button", { name: step }).first().click();
  await o.waitForTimeout(1200);
}
check("owner progressed order to delivered", await o.getByText("Delivered").first().isVisible());

await c.goto(`${BASE}/account/orders/${number}`);
check("customer sees delivered status", (await c.locator("main").innerText()).includes("Delivered"));
const notes = await (await c.request.get(`${BASE}/api/notifications`)).json();
check("customer received status notifications", notes.items.some((n) => n.type === "order.delivered"));

const real = errors.filter((e) => !/Download the React DevTools|WebGL|GPU stall|THREE\.WebGLRenderer|swiftshader|status of 404/i.test(e));
check("no console errors", real.length === 0, real.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
