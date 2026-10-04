import { requireUser } from "@/lib/auth/session";
import { getAddresses } from "@/server/queries/account";
import { getActiveZones } from "@/server/queries/catalog";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const [addresses, zones] = await Promise.all([getAddresses(user.id), getActiveZones()]);
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow mb-3">Addresses</p>
        <h1 className="font-display text-display-md text-cream">Where should we bring it?</h1>
      </header>
      <AddressManager
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, instructions: a.instructions, isDefault: a.isDefault }))}
        zoneZips={zones.flatMap((z) => z.postalCodes)}
        defaultRecipient={user.name}
      />
    </div>
  );
}
