import { requireStaff } from "@/lib/auth/session";
import { getAnalytics, getDashboard } from "@/server/queries/admin";
import { Kpi, PageHeader, Panel } from "@/components/admin/ui";
import { GrowthChart, OrdersBarChart, RevenueChart, Sparkline } from "@/components/admin/Charts";
import { HBarList } from "@/components/admin/HBarList";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Analytics" };

export default async function AdminAnalytics() {
  await requireStaff("admin");
  const [a, d] = await Promise.all([getAnalytics(30), getDashboard()]);
  const totalRev = a.series.reduce((x, s) => x + s.revenue, 0);
  const totalOrders = a.series.reduce((x, s) => x + s.orders, 0);
  const shortDay = (k: string) => new Date(`${k}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Last 30 days. Revenue reflects simulated demo payments only." />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Revenue · 30 days" value={formatPrice(Math.round(totalRev * 100))} hint="simulated" />
        <Kpi label="Orders · 30 days" value={String(totalOrders)} />
        <div className="rounded-2xl border border-cream/[0.07] bg-espresso/60 p-5">
          <p className="text-[0.78rem] text-cream/50">Average order value</p>
          <p className="mt-2 font-display text-[2.4rem] leading-none tabular text-cream">{formatPrice(totalOrders ? Math.round((totalRev / totalOrders) * 100) : 0)}</p>
          <Sparkline data={a.series.map((s) => s.aov)} />
        </div>
        <Kpi label="Customers" value={String(d.customers)} hint={`+${d.newCustomers} in the last 7 days`} />
      </div>
      <Panel title="Revenue per day"><RevenueChart data={a.series} /></Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Order volume per day"><OrdersBarChart data={a.series} xKey="day" xFormat="day" label="Orders per day, last 30 days" /></Panel>
        <Panel title="Customer growth"><GrowthChart data={a.growth} /></Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Most popular drinks"><HBarList data={a.top.map((t) => ({ name: t.name, value: t.qty, label: `${t.qty} sold` }))} /></Panel>
        <Panel title="Revenue by category"><HBarList data={a.categories.map((c) => ({ name: c.name, value: c.revenue, label: `$${c.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` }))} /></Panel>
      </div>
      <Panel title="Busiest hours"><OrdersBarChart data={a.hours} xKey="hour" xFormat="hour" label="Orders by hour of day" /></Panel>
      <details className="rounded-2xl border border-cream/[0.07] bg-espresso/40 p-5">
        <summary className="cursor-pointer text-[0.86rem] text-cream/70">View daily data as a table</summary>
        <table className="mt-4 w-full text-left text-[0.82rem]">
          <thead><tr className="text-cream/40"><th className="py-2 font-normal">Day</th><th className="py-2 text-right font-normal">Orders</th><th className="py-2 text-right font-normal">Revenue</th><th className="py-2 text-right font-normal">AOV</th></tr></thead>
          <tbody className="divide-y divide-cream/[0.05] font-mono">
            {a.series.map((s) => <tr key={s.day}><td className="py-1.5">{shortDay(s.day)}</td><td className="py-1.5 text-right">{s.orders}</td><td className="py-1.5 text-right">${s.revenue.toFixed(2)}</td><td className="py-1.5 text-right">${s.aov.toFixed(2)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </div>
  );
}
