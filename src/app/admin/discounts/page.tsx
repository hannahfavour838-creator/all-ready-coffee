import { requireStaff } from "@/lib/auth/session";
import { getDiscounts } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { DiscountManager } from "@/components/admin/DiscountManager";

export const metadata = { title: "Discounts" };

export default async function AdminDiscounts() {
  await requireStaff("admin");
  const rows = await getDiscounts();
  return (
    <div>
      <PageHeader title="Discounts" description="Promo codes customers can apply at checkout. Limits and dates are enforced on the server." />
      <DiscountManager discounts={rows.map((d) => ({ ...d, startsAt: d.startsAt?.toISOString() ?? null, endsAt: d.endsAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))} />
    </div>
  );
}
