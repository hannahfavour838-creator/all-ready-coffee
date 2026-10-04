import "server-only";
import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

type DbState = { promise: Promise<Database> | null };
const globalForDb = globalThis as unknown as { __arcDb?: DbState };
const state: DbState = (globalForDb.__arcDb ??= { promise: null });

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    // Production: managed PostgreSQL over TLS with a pooled connection.
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
    const db = drizzle(pool, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "0") await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Database;
  }

  // Local / demo: embedded PostgreSQL (PGlite, WASM) persisted on disk — zero setup.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory://") fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });

  const empty = await db.select({ key: schema.roles.key }).from(schema.roles).limit(1);
  if (empty.length === 0 && process.env.DB_AUTO_SEED !== "0") {
    const { seedDatabase } = await import("./seed");
    await seedDatabase(db as unknown as Database, { log: (m) => console.info(`[seed] ${m}`) });
  }
  return db as unknown as Database;
}

/** Returns the shared, migrated database handle. */
export function getDb(): Promise<Database> {
  if (!state.promise) {
    state.promise = connect().catch((err) => {
      state.promise = null;
      throw err;
    });
  }
  return state.promise;
}

export { schema };
