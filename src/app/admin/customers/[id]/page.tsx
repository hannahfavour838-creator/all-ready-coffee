import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { getCustomer } from "@/server/queries/admin";
import { Kpi, PageHeader, Panel, Table, td, th } from "@/components/admin/ui";
import { StatusPill } from "@/components/orders/StatusPill";
import { formatDate, formatPrice, cn } from "@/lib/utils";

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("admin");
  const { id } = await params;
  const c = await getCustomer(id);
  if (!c) notFound();
  const valid = c.orders.filter((o) => o.status !== "rejected" && o.status !== "cancelled");
  const spent = valid.reduce((a, o) => a + o.totalCents, 0);
  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-[0.82rem] text-cream/50 hover:text-cream"><ChevronLeft className="h-4 w-4" /> Customers</Link>
      <PageHeader eyebrow={`Customer since ${formatDate(c.createdAt)}`} title={c.name} description={`${c.email}${c.phone ? ` · ${c.phone}` : ""}${c.marketingOptIn ? " · subscribed to offers" : ""}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Orders" value={String(c.orders.length)} />
        <Kpi label="Lifetime value" value={formatPrice(spent)} />
        <Kpi label="Avg. order" value={formatPrice(valid.length ? Math.round(spent / valid.length) : 0)} />
        <Kpi label="Last sign-in" value={c.lastLoginAt ? formatDate(c.lastLoginAt, { month: "short", day: "numeric" }) : "—"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Table>
          <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Status</th><th className={cn(th, "text-right")}>Total</th></tr></thead>
          <tbody className="divide-y divide-cream/[0.05]">
            {c.orders.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-cream/45">No orders yet.</td></tr>}
            {c.orders.map((o) => (
              <tr key={o.id}>
                <td className={td}><Link href={`/admin/orders/${o.number}`} className="font-mono text-cream hover:text-caramel-light">{o.number}</Link></td>
                <td className={cn(td, "text-cream/60")}>{formatDate(o.createdAt)}</td>
                <td className={td}><StatusPill status={o.status} /></td>
                <td className={cn(td, "text-right font-mono")}>{formatPrice(o.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Panel title="Saved addresses">
          {c.addresses.length === 0 ? <p className="text-[0.86rem] text-cream/45">None saved.</p> : (
            <ul className="space-y-4">
              {c.addresses.map((a) => (
                <li key={a.id} className="text-[0.86rem] text-cream/70"><p className="text-cream">{a.label}{a.isDefault && <span className="ml-2 text-[0.72rem] text-caramel-light">default</span>}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.city}, {a.state} {a.postalCode}</p></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
