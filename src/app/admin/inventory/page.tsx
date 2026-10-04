import { requireStaff } from "@/lib/auth/session";
import { getAdminProducts } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { InventoryTable } from "@/components/admin/Managers";

export const metadata = { title: "Inventory" };

export default async function AdminInventory() {
  await requireStaff("staff");
  const rows = await getAdminProducts();
  return (
    <div>
      <PageHeader title="Inventory" description="Track pastry counts, flag sold-out items and hide anything the bar can't make right now." />
      <InventoryTable rows={rows.map((r) => ({ id: r.product.id, name: r.product.name, category: r.category, available: r.product.isAvailable, stockLevel: r.inv?.stockLevel ?? null, lowStockThreshold: r.inv?.lowStockThreshold ?? 0, soldOut: r.inv?.soldOut ?? false }))} />
    </div>
  );
}
