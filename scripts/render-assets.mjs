/**
 * Generates brand & product imagery from the live 3D scenes (no stock assets):
 *   - public/products/<slug>.webp   studio renders of every product (transparent)
 *   - public/brand/hero-still.webp  reduced-motion / fallback hero image
 *   - public/brand/og.png           1200×630 social preview
 *   - public/brand/icon-*.png, src/app/apple-icon.png
 *
 * Usage: start the app with ENABLE_STUDIO=1 (e.g. `ENABLE_STUDIO=1 npm run dev`), then
 *   BASE_URL=http://localhost:3000 npm run render:assets
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tryReq = (names) => {
  for (const n of names) {
    try {
      return require(n);
    } catch {}
  }
  throw new Error(`Missing dependency: ${names[0]}`);
};
const { chromium } = tryReq(["playwright", "/opt/node22/lib/node_modules/playwright"]);
const sharp = tryReq(["sharp", "/opt/npm-tools/node_modules/sharp"]);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ROOT = process.cwd();
const only = process.argv.slice(2);
const out = (...p) => path.join(ROOT, ...p);
fs.mkdirSync(out("public/products"), { recursive: true });
fs.mkdirSync(out("public/brand"), { recursive: true });

const catalog = fs.readFileSync(out("src/lib/db/catalog-data.ts"), "utf8");
const slugs = [...catalog.matchAll(/slug: "([a-z0-9-]+)", category:/g)].map((m) => m[1]).filter((s) => !only.length || only.includes(s));

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("  page error:", e.message));

for (const slug of slugs) {
  const t = Date.now();
  await page.goto(`${BASE}/studio/${slug}`, { waitUntil: "networkidle" });
  await page.waitForSelector('#studio[data-ready="1"]', { timeout: 90_000 });
  await page.waitForTimeout(600);
  const png = await page.locator("#studio").screenshot({ omitBackground: true });
  await sharp(png).trim({ threshold: 2 }).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 900, height: 1100, fit: "inside" }).webp({ quality: 88, alphaQuality: 90 }).toFile(out("public/products", `${slug}.webp`));
  console.log(`✔ ${slug} (${Date.now() - t} ms)`);
}

// Hero still = the signature drink
if (!only.length || only.includes("hero")) {
  fs.copyFileSync(out("public/products/all-ready-signature-latte.webp"), out("public/brand/hero-still.webp"));
  console.log("✔ hero-still");
}

// Icons
const mark = (bg, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" ${bg ? 'fill="#160f0b"' : 'fill="none"'}/><g transform="translate(32 32) scale(${pad}) translate(-32 -32) rotate(-24 32 32)"><ellipse cx="32" cy="32" rx="15.5" ry="22" fill="#f1e8d9"/><path d="M32 10.6 C 26 18.5, 37.5 24.5, 32.6 33 C 31.2 35.4, 30.4 38.6, 31.2 42.4 L 39.6 33.2" fill="none" stroke="#160f0b" stroke-width="2.4" stroke-linecap="round"/></g></svg>`;
await sharp(Buffer.from(mark(true, 1.15))).resize(192, 192).png().toFile(out("public/brand/icon-192.png"));
await sharp(Buffer.from(mark(true, 1.15))).resize(512, 512).png().toFile(out("public/brand/icon-512.png"));
await sharp(Buffer.from(mark(true, 0.85))).resize(512, 512).png().toFile(out("public/brand/icon-maskable-512.png"));
await sharp(Buffer.from(mark(true, 1.1))).resize(180, 180).png().toFile(out("src/app/apple-icon.png"));
console.log("✔ icons");

// Open Graph image
const font = (f) => fs.readFileSync(out("src/app/fonts", f)).toString("base64");
const still = fs.readFileSync(out("public/brand/hero-still.webp")).toString("base64");
const og = `<!doctype html><html><head><style>
@font-face{font-family:IS;src:url(data:font/woff2;base64,${font("instrument-serif-latin-400-normal.woff2")}) format("woff2")}
@font-face{font-family:IS;font-style:italic;src:url(data:font/woff2;base64,${font("instrument-serif-latin-400-italic.woff2")}) format("woff2")}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(70% 90% at 72% 60%,#4a2d1b 0%,#1d130e 50%,#0b0807 100%);font-family:IS,serif;color:#f1e8d9;position:relative}
.img{position:absolute;right:40px;top:10px;height:640px}
.t{position:absolute;left:80px;top:150px}
h1{font-size:118px;line-height:.9;margin:0;font-weight:400;letter-spacing:-2px}
h1 em{color:#d9b888}
p{font:600 15px ui-monospace,monospace;letter-spacing:.38em;text-transform:uppercase;color:#d9b888;margin:0 0 28px}
.s{font:400 24px Georgia,serif;color:rgba(241,232,217,.7);margin-top:30px;letter-spacing:0;text-transform:none;font-family:IS}
.logo{position:absolute;left:80px;bottom:64px;display:flex;align-items:center;gap:14px;font-size:30px}
</style></head><body>
<img class="img" src="data:image/webp;base64,${still}"/>
<div class="t"><p>Portland · Specialty coffee</p><h1>All Ready<br/><em>Coffee</em></h1><div class="s">Always ready. Never rushed.</div></div>
<div class="logo">${mark(false, 1.2).replace("<svg ", '<svg width="46" height="46" ')}<span>All Ready</span></div>
</body></html>`;
const ogPage = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await ogPage.setContent(og, { waitUntil: "load" });
await ogPage.waitForTimeout(300);
await ogPage.screenshot({ path: out("public/brand/og.png") });
console.log("✔ og.png");

await browser.close();
