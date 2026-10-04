# Security model & audit

No system is "unhackable". This document describes the controls All Ready Coffee implements and the review performed
before release.

## Controls

| Area | Implementation |
| --- | --- |
| Passwords | scrypt (N=2^15, r=8, p=1, 64-byte key, per-user salt), constant-time compare, policy (≥10 chars, letters + digits, common-password and email checks). |
| Sessions | 256-bit random tokens in `HttpOnly`, `SameSite=Lax`, `Secure` (prod, `__Host-` prefix) cookies. Only the SHA-256 hash is stored server-side; sliding 30-day expiry; password change revokes other sessions; "sign out everywhere". |
| Brute force | Per-IP and per-email sliding-window rate limits, account lockout after 5 failures for 15 minutes, uniform error messages and equalised timing to prevent account enumeration. |
| Authorization | Every Server Action and Route Handler re-checks the session and role server-side (`assertUser` / `assertStaff`). Customer data is scoped by `user_id` **inside the SQL WHERE clause**. Non-staff requests to `/admin` receive 404. Owner-only areas (catalog, discounts, delivery, customers, audit) require the `admin` role; `staff` can run orders and inventory. |
| Order workflow | Server-side state machine (`TRANSITIONS`) with row locks (`SELECT … FOR UPDATE`); invalid transitions are rejected. |
| Pricing integrity | The client never sends prices. The server re-prices every line from the database, validates options, stock, zone minimums and promo limits, and decrements stock atomically in a transaction. |
| Payments | Simulated. The card number is validated (Luhn) in the browser and never transmitted; only brand + last four are stored. |
| Input handling | Zod schemas on every input, text normalisation (control/bidi characters stripped), length caps, ZIP/phone/slug/hex validation. Uploaded images are checked by magic bytes and size, stored in the DB and served with `nosniff`, `sandbox` CSP and a fixed content type. |
| Injection | Drizzle ORM parameterises all queries; `LIKE` patterns are escaped. React escapes output; JSON-LD is serialised with `<` escaped. |
| CSRF | Server Actions enforce same-origin (Next.js); Route Handlers are read-only GETs; `isSameOrigin()` helper for any future mutating handler; `SameSite=Lax` cookies. |
| Headers | Per-request nonce CSP with `strict-dynamic`, `frame-ancestors 'none'`, HSTS (prod), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `no-store` + `noindex` on private areas. `X-Powered-By` removed. |
| CORS | No CORS headers are emitted, so browsers block cross-origin reads of the API. |
| Redirects | `safeRedirect()` only allows same-site relative paths (blocks `//host` and `/\host`). |
| Errors | Server Actions return friendly messages with a short reference; stack traces are logged server-side only. |
| Audit | Append-only `audit_logs` for every admin mutation (actor, action, entity, metadata, IP). |
| Secrets | None in the client bundle; `.env*` git-ignored; seed refuses default passwords in production. |
| Database | Least-privilege roles, append-only audit table and Row Level Security policies in `sql/production-hardening.sql`. |

## Pre-release review checklist

- [x] No secrets or API keys committed or exposed via `NEXT_PUBLIC_*` (only the public site URL).
- [x] Every mutating Server Action begins with an auth guard; admin actions use `assertStaff`.
- [x] Customer-scoped queries include `user_id = session user` in SQL; order status API returns 404 for non-owners.
- [x] `/admin` and `/account` are server-guarded in layouts *and* pages (middleware is only a fast path).
- [x] No raw SQL built from user input; LIKE wildcards stripped.
- [x] File uploads validated by signature, ≤2 MB, served with sandbox CSP.
- [x] Rate limits on sign-in, sign-up, checkout, password change and admin writes.
- [x] Dependency audit (`npm audit --omit=dev`) reviewed.

## Known limitations (documented trade-offs)

- The rate limiter is in-memory (per instance). For multi-instance deployments, back it with Redis/Upstash.
- Email verification and password reset need an email provider and are intentionally out of scope for the demo.
