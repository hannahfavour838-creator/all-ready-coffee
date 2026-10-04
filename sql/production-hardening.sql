-- ─────────────────────────────────────────────────────────────────────────────
-- All Ready Coffee — production database hardening (PostgreSQL 15+)
-- Run once as a superuser AFTER the first migration. Replace the passwords.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Least-privilege roles: the app never connects as the owner/superuser.
CREATE ROLE allready_migrator LOGIN PASSWORD 'change-me-migrator';
CREATE ROLE allready_app      LOGIN PASSWORD 'change-me-app';

GRANT CONNECT ON DATABASE allready TO allready_app, allready_migrator;
GRANT USAGE ON SCHEMA public TO allready_app;
GRANT ALL ON SCHEMA public TO allready_migrator;

-- App: data access only (no DDL, no TRUNCATE).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO allready_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO allready_app;
ALTER DEFAULT PRIVILEGES FOR ROLE allready_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO allready_app;
ALTER DEFAULT PRIVILEGES FOR ROLE allready_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO allready_app;

-- Audit log is append-only for the app.
REVOKE UPDATE, DELETE ON audit_logs FROM allready_app;

-- 2. Row Level Security as defence-in-depth for customer-owned data.
--    The app sets `app.user_id` / `app.role` per transaction (SET LOCAL) when RLS is enabled.
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_orders ON orders FOR ALL TO allready_app
  USING (current_setting('app.role', true) IN ('admin','staff') OR user_id::text = current_setting('app.user_id', true));
CREATE POLICY own_addresses ON addresses FOR ALL TO allready_app
  USING (current_setting('app.role', true) IN ('admin','staff') OR user_id::text = current_setting('app.user_id', true));
CREATE POLICY own_favorites ON favorites FOR ALL TO allready_app
  USING (user_id::text = current_setting('app.user_id', true));
CREATE POLICY own_notifications ON notifications FOR ALL TO allready_app
  USING (current_setting('app.role', true) IN ('admin','staff') OR user_id::text = current_setting('app.user_id', true));

-- 3. Connection hygiene
ALTER ROLE allready_app SET statement_timeout = '10s';
ALTER ROLE allready_app SET idle_in_transaction_session_timeout = '30s';
