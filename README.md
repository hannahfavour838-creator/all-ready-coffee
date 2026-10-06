# All Ready Coffee

**Always ready. Never rushed.**

A premium full-stack coffee commerce experience built as a portfolio project: a cinematic, scroll-driven 3D
storytelling hero, a complete ordering platform with simulated payments and live order tracking, a polished
customer account area, and an owner dashboard for running the business.

> All business details (address, phone, WhatsApp, testimonials) are fictional. Checkout is a **simulation** —
> no card numbers leave the browser and no money ever moves.

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

That's it. On first request the app creates an embedded PostgreSQL database (PGlite) in `./.data/pglite`,
runs migrations and seeds it with a full menu, 65 customers, ~1,000 orders across three months and a live order board.

| Account | Email | Password |
| --- | --- | --- |
| Owner (admin) | `owner@allreadycoffee.com` | Password stored securely |
| Customer | `demo@allreadycoffee.com` | Password stored securely |

Demo card: **4242 4242 4242 4242**, any future expiry, any CVC. Card `4000 0000 0000 0002` simulates a decline.
Promo codes: `WELCOME15`, `READY5`.

The owner dashboard lives at **`/admin`** (not linked publicly; non-staff receive a 404).

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build and server |
| `npm run lint` · `npm run typecheck` | ESLint (next/core-web-vitals + TS) and `tsc --noEmit` |
| `npm test` | Vitest: pricing, security utilities, validation, workflow rules and a seeded database |
| `npm run e2e` | Playwright smoke test of the full loop (sign up → customize → checkout → owner fulfils → customer sees "Delivered") against a running server |
| `npm run db:seed` / `db:reset` | Seed or wipe + reseed the database |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run render:assets` | Re-render product photography, hero still, icons and OG image from the 3D scenes (needs `ENABLE_STUDIO=1 npm run dev`) |

---

## Architecture

```
src/
  app/
    (site)/            public storefront, auth, checkout, customer account
    admin/             owner dashboard (RBAC-protected)
    api/               notifications, order status polling, admin feed, images, health
    studio/[slug]      internal render rig for product imagery (disabled unless ENABLE_STUDIO=1)
  components/
    hero/              cinematic 3D experience (R3F scene, timeline, quality tiers)
    studio/            procedural product models used for product photography
    home · menu · cart · checkout · account · admin · orders · layout · ui · brand
  lib/
    db/                Drizzle schema, connection (PGlite ↔ Postgres), seed & catalog data
    auth/              scrypt passwords, DB-backed sessions, guards
    security/          rate limiting, sanitization, CSRF/origin & redirect helpers
    pricing.ts         shared, pure pricing engine (server is authoritative)
    order-status.ts    order state machine + customer copy
  server/
    actions/           Server Actions (auth, account, cart, checkout, admin)
    queries/           read models (catalog, account, admin analytics)
  middleware.ts        CSP nonce + security headers + route gating
```

**Stack:** Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS ·
Three.js + React Three Fiber + drei + postprocessing · GSAP ScrollTrigger · Framer Motion ·
Drizzle ORM on PostgreSQL (embedded PGlite locally, any Postgres in production) · Zod · Zustand · Recharts.

### The 3D story

One continuous, scroll-scrubbed scene (`src/components/hero`):

1. **Beans** — a baked rigid-body simulation (gravity, restitution, spin, bean↔bean collisions, funnel collider)
   so the fall scrubs perfectly forwards *and* backwards with the scrollbar.
2. **Camera** — Catmull-Rom choreography through the bean field; 3D headlines live inside the scene so beans pass in front of and behind them.
3. **Grinding** — beans sink into a conical-burr grinder; fresh grounds stream into the portafilter.
4. **Espresso** — the portafilter travels to the group head; twin tiger-striped streams fill the glass.
5. **Milk** — a steel pitcher pours; cold milk sinks under the espresso with turbulent plumes.
6. **Ingredients** — ice, chocolate, a cinnamon quill, beans, a caramel ribbon and cocoa dust fall in.
7. **Splash** — a deformed crown with pinching lobes, droplets thrown toward the lens, a Worthington jet.
8. **The drink** — condensation, brand decal, studio lighting and the closing call to action.

Every asset is procedural — no downloads, no missing models. Quality tiers (high / medium / low) adapt particle counts,
shadows, transmission and post-processing per device, with a live `PerformanceMonitor` that steps down on slow frames.
`prefers-reduced-motion` and no-WebGL devices get a designed static composition instead.

### Production database

Set `DATABASE_URL` to any PostgreSQL 15+ instance (Neon, Supabase, RDS…). Migrations run automatically on boot
(disable with `DB_AUTO_MIGRATE=0`). Then run `npm run db:seed` (requires `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD`
in production) and apply `sql/production-hardening.sql` for least-privilege roles and Row Level Security.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full security model and audit.
