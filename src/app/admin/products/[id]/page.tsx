import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getAdminProduct, getCategoriesWithCounts, getOptionGroups } from "@/server/queries/admin";
import { productImageUrl } from "@/server/queries/catalog";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("admin");
  const { id } = await params;
  const p = await getAdminProduct(Number(id));
  if (!p) notFound();
  const [cats, groups] = await Promise.all([getCategoriesWithCounts(), getOptionGroups()]);
  return (
    <div>
      <PageHeader eyebrow="Edit product" title={p.name} />
      <ProductForm
        categories={cats.map((c) => ({ id: c.category.id, name: c.category.name }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        product={{ id: p.id, name: p.name, slug: p.slug, categoryId: p.categoryId, tagline: p.tagline, description: p.description, price: p.basePriceCents / 100, calories: p.calories, caffeineMg: p.caffeineMg, tastingNotes: p.tastingNotes.join(", "), isAvailable: p.isAvailable, isFeatured: p.isFeatured, isSeasonal: p.isSeasonal, groupIds: p.groupIds, visual: p.visual, imageUrl: productImageUrl(p) }}
      />
    </div>
  );
}
