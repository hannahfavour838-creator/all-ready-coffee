import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { getActiveOrders, getAnalytics, getDashboard } from "@/server/queries/admin";
import { Kpi, PageHeader, Panel } from "@/components/admin/ui";
import { OrdersBarChart, RevenueChart } from "@/components/admin/Charts";
import { HBarList } from "@/components/admin/HBarList";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { formatPrice } from "@/lib/utils";
import { BUSINESS_TZ } from "@/lib/time";

export const metadata = { title: "Overview" };

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

export default async function AdminHome() {
  const user = await requireStaff("staff");
  const [d, active, a] = await Promise.all([getDashboard(), getActiveOrders(), getAnalytics(14)]);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ }).format(new Date());
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={today} title={`Good to see you, ${user.name.split(" ")[0]}.`} description="Live view of the bar. Revenue figures reflect simulated demo payments." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Orders today" value={String(d.today.orders)} hint={`${formatPrice(d.today.revenue)} revenue`} />
        <Kpi label="Orders · last 7 days" value={String(d.week.orders)} delta={pct(d.week.orders, d.lastWeek.orders)} hint="vs prior week" />
        <Kpi label="Revenue · last 7 days" value={formatPrice(d.week.revenue)} delta={pct(d.week.revenue, d.lastWeek.revenue)} hint="simulated" />
        <Kpi label="Avg. order value" value={formatPrice(d.aovCents)} hint={`${d.customers} customers · +${d.newCustomers} this week`} />
      </div>

      <Panel title={<span className="flex items-center gap-2">Live orders <span className="rounded-full bg-cream/[0.07] px-2 py-0.5 font-mono text-[0.68rem] text-cream/60">{active.length}</span></span>} action={<Link href="/admin/orders" className="flex items-center gap-1 text-[0.8rem] text-cream/50 hover:text-cream">All orders <ArrowRight className="h-3.5 w-3.5" /></Link>} bodyClass="p-0">
        <OrderBoard orders={active.map((o) => ({ id: o.id, number: o.number, status: o.status, customerName: o.customerName, totalCents: o.totalCents, createdAt: o.createdAt.toISOString(), zoneName: o.zoneName, notes: o.notes, items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity, options: i.options.map((x) => x.name) })) }))} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue · last 14 days">
          <RevenueChart data={a.series} />
        </Panel>
        <Panel title="Popular drinks · 14 days">
          <HBarList data={a.top.slice(0, 6).map((t) => ({ name: t.name, value: t.qty, label: `${t.qty} sold` }))} />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Order volume by hour · 14 days">
          <OrdersBarChart data={a.hours} xKey="hour" xFormat="hour" label="Orders by hour of day" />
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-caramel-light" /> Stock alerts</span>} action={<Link href="/admin/inventory" className="text-[0.8rem] text-cream/50 hover:text-cream">Inventory</Link>}>
          {d.lowStock.length === 0 ? (
            <p className="py-6 text-center text-[0.86rem] text-cream/45">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y divide-cream/[0.06]">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 text-[0.86rem]">
                  <span className="text-cream/85">{p.name}</span>
                  <span className={p.soldOut || p.stock === 0 ? "font-mono text-danger" : "font-mono text-caramel-light"}>{p.soldOut || p.stock === 0 ? "Sold out" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
