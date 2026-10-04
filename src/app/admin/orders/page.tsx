import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { getOrders } from "@/server/queries/admin";
import { PageHeader, Table, td, th } from "@/components/admin/ui";
import { StatusPill } from "@/components/orders/StatusPill";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatDate, formatPrice, formatTime, cn } from "@/lib/utils";

export const metadata = { title: "Orders" };

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "placed", label: "New" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff("staff");
  const sp = await searchParams;
  const status = sp.status ?? "active";
  const q = (sp.q ?? "").slice(0, 60);
  const data = await getOrders({ status, q, page: Number(sp.page ?? 1) || 1 });
  const href = (p: Record<string, string | number>) => {
    const u = new URLSearchParams({ status, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/admin/orders?${u.toString()}`;
  };
  return (
    <div>
      <PageHeader title="Orders" description="Accept, progress and complete orders. Every change notifies the customer instantly." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Order filters" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/orders?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={status === f.key ? "page" : undefined} className={cn("rounded-full px-3.5 py-1.5 text-[0.8rem] transition", status === f.key ? "bg-cream text-ink" : "border border-cream/10 text-cream/60 hover:text-cream")}>
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="status" value={status} />
          <label htmlFor="q" className="sr-only">Search orders</label>
          <input id="q" name="q" defaultValue={q} placeholder="Order #, name or email" className="h-10 w-64 rounded-full border border-cream/10 bg-ink/60 px-4 text-[0.84rem] text-cream placeholder:text-cream/30 focus:border-caramel/60 focus:outline-none" />
        </form>
      </div>
      <Table>
        <thead className="border-b border-cream/[0.06]">
          <tr>
            <th className={th}>Order</th>
            <th className={th}>Customer</th>
            <th className={th}>Items</th>
            <th className={th}>Status</th>
            <th className={cn(th, "text-right")}>Total</th>
            <th className={th}>Next step</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {data.rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-14 text-center text-cream/45">No orders match this view.</td></tr>
          )}
          {data.rows.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-cream/[0.02]">
              <td className={td}>
                <Link href={`/admin/orders/${o.number}`} className="font-mono text-cream hover:text-caramel-light">{o.number}</Link>
                <p className="text-[0.74rem] text-cream/40">{formatDate(o.createdAt, { month: "short", day: "numeric" })} · {formatTime(o.createdAt)}</p>
              </td>
              <td className={td}><p className="text-cream/85">{o.customerName}</p><p className="text-[0.74rem] text-cream/40">{o.zoneName}</p></td>
              <td className={cn(td, "max-w-[18rem] truncate text-cream/60")}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
              <td className={td}><StatusPill status={o.status} /></td>
              <td className={cn(td, "text-right font-mono tabular")}>{formatPrice(o.totalCents)}</td>
              <td className={td}><OrderActions orderId={o.id} number={o.number} status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data.pages > 1 && (
        <div className="mt-5 flex items-center justify-between text-[0.82rem] text-cream/50">
          <span>Page {data.page} of {data.pages} · {data.total} orders</span>
          <div className="flex gap-2">
            {data.page > 1 && <Link className="rounded-full border border-cream/10 px-4 py-1.5 hover:text-cream" href={href({ page: data.page - 1 })}>Previous</Link>}
            {data.page < data.pages && <Link className="rounded-full border border-cream/10 px-4 py-1.5 hover:text-cream" href={href({ page: data.page + 1 })}>Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
