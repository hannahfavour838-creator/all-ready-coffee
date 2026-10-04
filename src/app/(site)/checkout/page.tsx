import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb, schema as s } from "@/lib/db";
import { getActiveZones, getSetting } from "@/server/queries/catalog";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const db = await getDb();
  const [addresses, zones, paused] = await Promise.all([
    db.select().from(s.addresses).where(eq(s.addresses.userId, user.id)).orderBy(desc(s.addresses.isDefault), asc(s.addresses.createdAt)),
    getActiveZones(),
    getSetting<boolean>("delivery_paused", false),
  ]);
  return (
    <div className="pt-[calc(var(--header-h)+2.5rem)]">
      <div className="container">
        <p className="eyebrow mb-4">Checkout</p>
        <h1 className="font-display text-display-md text-cream">Almost ready.</h1>
        <CheckoutClient
          user={{ name: user.name, phone: user.phone }}
          addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, instructions: a.instructions, isDefault: a.isDefault }))}
          zoneZips={zones.flatMap((z) => z.postalCodes)}
          paused={paused}
        />
      </div>
    </div>
  );
}
