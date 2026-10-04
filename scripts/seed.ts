/**
 * Seed / reset the database.
 *   npm run db:seed          → migrate + seed if empty
 *   npm run db:reset         → migrate + wipe + reseed
 * Uses DATABASE_URL when set, otherwise the embedded PGlite store in ./.data/pglite.
 */
import path from "node:path";
import fs from "node:fs";
import * as schema from "../src/lib/db/schema";
import { seedDatabase } from "../src/lib/db/seed";
import type { Database } from "../src/lib/db";

async function main() {
  const reset = process.argv.includes("--reset");
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  let db: Database;
  let close: () => Promise<void>;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const d = drizzle(pool, { schema });
    await migrate(d, { migrationsFolder });
    db = d as unknown as Database;
    close = () => pool.end();
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    const d = drizzle(client, { schema });
    await migrate(d, { migrationsFolder });
    db = d as unknown as Database;
    close = () => client.close();
  }
  const existing = await db.select().from(schema.roles).limit(1);
  if (existing.length && !reset) {
    console.log("Database already seeded. Use `npm run db:reset` to start fresh.");
  } else {
    await seedDatabase(db, { reset: existing.length > 0, log: (m) => console.log(`[seed] ${m}`) });
    console.log("✔ Seed complete");
  }
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
