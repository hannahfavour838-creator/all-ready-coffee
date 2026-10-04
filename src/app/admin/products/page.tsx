import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { getAdminProducts } from "@/server/queries/admin";
import { productImageUrl } from "@/server/queries/catalog";
import { PageHeader, Table, td, th } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { AvailabilityToggle } from "@/components/admin/AvailabilityToggle";
import { formatPrice, cn } from "@/lib/utils";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  await requireStaff("admin");
  const rows = await getAdminProducts();
  return (
    <div>
      <PageHeader title="Products" description={`${rows.length} items on the menu. Changes appear on the storefront immediately.`} actions={<ButtonLink href="/admin/products/new" size="sm"><Plus className="h-4 w-4" /> New product</ButtonLink>} />
      <Table>
        <thead className="border-b border-cream/[0.06]">
          <tr><th className={th}>Product</th><th className={th}>Category</th><th className={cn(th, "text-right")}>Price</th><th className={th}>Stock</th><th className={th}>Flags</th><th className={th}>Available</th></tr>
        </thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {rows.map(({ product: p, category, inv }) => {
            const img = productImageUrl(p);
            return (
              <tr key={p.id} className="hover:bg-cream/[0.02]">
                <td className={td}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-roast">{img && <Image src={img} alt="" fill sizes="40px" className="object-contain" />}</span>
                    <span><span className="block text-cream hover:text-caramel-light">{p.name}</span><span className="block text-[0.74rem] text-cream/40">/{p.slug}</span></span>
                  </Link>
                </td>
                <td className={cn(td, "text-cream/60")}>{category}</td>
                <td className={cn(td, "text-right font-mono tabular")}>{formatPrice(p.basePriceCents)}</td>
                <td className={td}>{inv?.soldOut ? <Badge tone="danger">Sold out</Badge> : inv?.stockLevel != null ? <span className="font-mono text-cream/70">{inv.stockLevel}</span> : <span className="text-cream/35">Made to order</span>}</td>
                <td className={td}><div className="flex gap-1.5">{p.isFeatured && <Badge tone="caramel">Featured</Badge>}{p.isSeasonal && <Badge>Seasonal</Badge>}</div></td>
                <td className={td}><AvailabilityToggle id={p.id} available={p.isAvailable} name={p.name} /></td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
