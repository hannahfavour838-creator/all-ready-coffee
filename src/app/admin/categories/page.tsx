import { requireStaff } from "@/lib/auth/session";
import { getCategoriesWithCounts } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/Managers";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requireStaff("admin");
  const rows = await getCategoriesWithCounts();
  return (
    <div>
      <PageHeader title="Categories" description="Organize the menu. Order controls how categories appear on the storefront." />
      <CategoryManager categories={rows.map((r) => ({ ...r.category, products: r.products, createdAt: r.category.createdAt.toISOString() }))} />
    </div>
  );
}
