import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { getAdminOrder } from "@/server/queries/admin";
import { PageHeader, Panel } from "@/components/admin/ui";
import { StatusPill } from "@/components/orders/StatusPill";
import { OrderActions } from "@/components/admin/OrderActions";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { STATUS_META } from "@/lib/order-status";
import { formatDate, formatPrice, formatTime } from "@/lib/utils";

export default async function AdminOrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireStaff("staff");
  const { number } = await params;
  const o = await getAdminOrder(number);
  if (!o) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[0.82rem] text-cream/50 hover:text-cream"><ChevronLeft className="h-4 w-4" /> Orders</Link>
      <PageHeader eyebrow={`${formatDate(o.createdAt)} · ${formatTime(o.createdAt)}`} title={`Order ${o.number}`} actions={<><StatusPill status={o.status} /><OrderActions orderId={o.id} number={o.number} status={o.status} size="md" /></>} />
      <Panel>
        <OrderTracker number={o.number} initialStatus={o.status} initialEvents={o.events.map((e) => ({ status: e.status, createdAt: e.createdAt.toISOString() }))} etaMin={o.etaMinMinutes} etaMax={o.etaMaxMinutes} estimatedDeliveryAt={o.estimatedDeliveryAt?.toISOString() ?? null} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Items">
          <ul className="divide-y divide-cream/[0.06]">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="text-cream"><span className="font-mono text-cream/50">{i.quantity}×</span> {i.productName}</p>
                  {i.options.length > 0 && <p className="text-[0.78rem] text-cream/45">{i.options.map((x) => x.name).join(" · ")}</p>}
                </div>
                <p className="font-mono tabular text-cream/80">{formatPrice(i.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-cream/[0.06] pt-4 text-[0.86rem]">
            {[
              ["Subtotal", formatPrice(o.subtotalCents)],
              ...(o.discountCents ? [[`Discount (${o.discountCode})`, `−${formatPrice(o.discountCents)}`]] : []),
              ["Delivery", formatPrice(o.deliveryFeeCents)],
              ["Tip", formatPrice(o.tipCents)],
              ["Total", formatPrice(o.totalCents)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-cream/50">{k}</dt><dd className="tabular text-cream">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-[0.76rem] text-cream/40">Payment: simulated · {o.paymentBrand} •••• {o.paymentLast4} · {o.paymentStatus.replace("simulated_", "")} · {o.paymentRef}</p>
          {o.notes && <p className="mt-4 rounded-xl bg-caramel/10 px-4 py-3 text-[0.86rem] text-caramel-light">Note: “{o.notes}”</p>}
        </Panel>
        <div className="space-y-6">
          <Panel title="Customer">
            {o.customer ? (
              <div className="space-y-1 text-[0.88rem]">
                {user.role === "admin" ? <Link href={`/admin/customers/${o.customer.id}`} className="text-cream hover:text-caramel-light">{o.customer.name}</Link> : <p className="text-cream">{o.customer.name}</p>}
                <p className="text-cream/55">{o.customer.email}</p>
                <p className="text-cream/55">{o.address.phone ?? o.customer.phone ?? "No phone"}</p>
                <p className="pt-1 text-[0.78rem] text-cream/40">{o.customerOrders} orders · customer since {formatDate(o.customer.createdAt, { month: "short", year: "numeric" })}</p>
              </div>
            ) : <p className="text-[0.86rem] text-cream/45">Account deleted — order retained for records.</p>}
          </Panel>
          <Panel title="Delivery">
            <address className="space-y-0.5 text-[0.88rem] not-italic text-cream/75">
              <p className="text-cream">{o.address.recipient}</p>
              <p>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}</p>
              <p>{o.address.city}, {o.address.state} {o.address.postalCode}</p>
              {o.address.instructions && <p className="pt-2 text-[0.8rem] text-cream/45">“{o.address.instructions}”</p>}
            </address>
            <p className="mt-3 text-[0.78rem] text-cream/40">{o.zoneName} · quoted {o.etaMinMinutes}–{o.etaMaxMinutes} min</p>
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-3">
              {o.events.map((e, i) => (
                <li key={i} className="flex justify-between gap-3 text-[0.84rem]">
                  <span className="text-cream/80">{STATUS_META[e.status].label}{e.actor ? <span className="text-cream/40"> · {e.actor}</span> : null}</span>
                  <span className="font-mono text-[0.76rem] text-cream/40">{formatTime(e.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
