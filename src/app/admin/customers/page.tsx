import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { getCustomers } from "@/server/queries/admin";
import { PageHeader, Table, td, th } from "@/components/admin/ui";
import { formatDate, formatPrice, formatRelative, cn } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("admin");
  const { q } = await searchParams;
  const rows = await getCustomers(q);
  return (
    <div>
      <PageHeader title="Customers" description="Basic profile and order history. Payment details are never stored." actions={
        <form role="search" className="flex">
          <label htmlFor="cq" className="sr-only">Search customers</label>
          <input id="cq" name="q" defaultValue={q} placeholder="Search name or email" className="h-10 w-64 rounded-full border border-cream/10 bg-ink/60 px-4 text-[0.84rem] text-cream placeholder:text-cream/30 focus:border-caramel/60 focus:outline-none" />
        </form>
      } />
      <Table>
        <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Customer</th><th className={th}>Joined</th><th className={cn(th, "text-right")}>Orders</th><th className={cn(th, "text-right")}>Lifetime value</th><th className={th}>Last order</th></tr></thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-14 text-center text-cream/45">No customers match “{q}”.</td></tr>}
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-cream/[0.02]">
              <td className={td}><Link href={`/admin/customers/${c.id}`} className="text-cream hover:text-caramel-light">{c.name}</Link><p className="text-[0.74rem] text-cream/40">{c.email}</p></td>
              <td className={cn(td, "text-cream/60")}>{formatDate(c.createdAt)}</td>
              <td className={cn(td, "text-right font-mono")}>{c.orders}</td>
              <td className={cn(td, "text-right font-mono")}>{formatPrice(c.spent)}</td>
              <td className={cn(td, "text-cream/60")}>{c.lastOrder ? formatRelative(new Date(c.lastOrder)) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
