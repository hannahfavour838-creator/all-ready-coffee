import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as s from "@/lib/db/schema";
import { seedDatabase } from "@/lib/db/seed";
import type { Database } from "@/lib/db";

let db: Database;

beforeAll(async () => {
  const client = new PGlite();
  const d = drizzle(client, { schema: s });
  await migrate(d, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  db = d as unknown as Database;
  await seedDatabase(db);
}, 120_000);

describe("database & seed", () => {
  it("creates the full catalog", async () => {
    const products = await db.select().from(s.products);
    const names = products.map((p) => p.name);
    for (const n of ["Espresso", "Americano", "Cappuccino", "Latte", "Mocha", "Flat White", "Caramel Latte", "Vanilla Latte", "Iced Latte", "Iced Americano", "Iced Mocha", "Cold Brew", "Caramel Cold Brew", "Vanilla Cold Brew", "All Ready Signature Latte"]) {
      expect(names).toContain(n);
    }
  });
  it("seeds an owner with the admin role and a demo customer", async () => {
    const [owner] = await db.select().from(s.users).where(eq(s.users.role, "admin"));
    expect(owner?.passwordHash.startsWith("scrypt$")).toBe(true);
    const [demo] = await db.select().from(s.users).where(eq(s.users.email, "demo@allreadycoffee.com"));
    expect(demo?.role).toBe("customer");
  });
  it("produces realistic order history with an active board", async () => {
    const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(s.orders)) as [{ n: number }];
    expect(n).toBeGreaterThan(400);
    const active = await db.select().from(s.orders).where(eq(s.orders.status, "placed"));
    expect(active.length).toBeGreaterThan(0);
  });
  it("enforces unique emails case-insensitively", async () => {
    await expect(db.insert(s.users).values({ email: "DEMO@allreadycoffee.com", name: "Dup", passwordHash: "x" })).rejects.toThrow();
  });
});
