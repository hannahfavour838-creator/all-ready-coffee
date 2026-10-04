import { requireStaff } from "@/lib/auth/session";
import { getCategoriesWithCounts, getOptionGroups } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireStaff("admin");
  const [cats, groups] = await Promise.all([getCategoriesWithCounts(), getOptionGroups()]);
  return (
    <div>
      <PageHeader title="New product" />
      <ProductForm categories={cats.map((c) => ({ id: c.category.id, name: c.category.name }))} groups={groups.map((g) => ({ id: g.id, name: g.name }))} product={null} />
    </div>
  );
}
