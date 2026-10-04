import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUserOrder } from "@/server/queries/account";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { StatusPill } from "@/components/orders/StatusPill";
import { ReorderButton } from "@/components/account/ReorderButton";
import { PlacedBanner } from "@/components/account/PlacedBanner";
import { isActive } from "@/lib/order-status";
import { formatDate, formatPrice, formatTime } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Order ${number}` };
}

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { number } = await params;
  const { placed } = await searchParams;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await getUserOrder(user.id, number);
  if (!order) notFound();
  return (
    <div className="space-y-10">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-[0.84rem] text-cream/50 hover:text-cream"><ChevronLeft className="h-4 w-4" /> All orders</Link>
      {placed && <PlacedBanner number={order.number} />}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Placed {formatDate(order.createdAt)} at {formatTime(order.createdAt)}</p>
          <h1 className="font-display text-display-md text-cream">Order {order.number}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={order.status} />
          {!isActive(order.status) && <ReorderButton number={order.number} />}
        </div>
      </header>

      <section className="rounded-[1.75rem] border border-cream/[0.08] bg-gradient-to-br from-roast/60 to-espresso/50 p-6 md:p-10" aria-label="Live tracking">
        <OrderTracker number={order.number} initialStatus={order.status} initialEvents={order.events.map((e) => ({ status: e.status, createdAt: e.createdAt.toISOString() }))} etaMin={order.etaMinMinutes} etaMax={order.etaMaxMinutes} estimatedDeliveryAt={order.estimatedDeliveryAt?.toISOString() ?? null} />
        {isActive(order.status) && <p className="mt-8 text-[0.76rem] text-cream/40">This page updates automatically. Times are estimates — we&apos;ll adjust them live if anything changes.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[1.5rem] border border-cream/[0.07] p-6" aria-labelledby="items">
          <h2 id="items" className="mb-5 flex items-center gap-2 font-display text-2xl text-cream"><Receipt className="h-4 w-4 text-caramel-light" /> Receipt</h2>
          <ul className="divide-y divide-cream/[0.06]">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-4">
                <div>
                  <p className="text-cream">{i.quantity} × {i.productSlug ? <Link href={`/menu/${i.productSlug}`} className="hover:text-caramel-light">{i.productName}</Link> : i.productName}</p>
                  {i.options.length > 0 && <p className="mt-1 text-[0.78rem] text-cream/45">{i.options.map((o) => o.name).join(" · ")}</p>}
                </div>
                <p className="font-mono text-[0.86rem] tabular text-cream/80">{formatPrice(i.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-cream/[0.07] pt-4 text-[0.88rem]">
            <div className="flex justify-between"><dt className="text-cream/50">Subtotal</dt><dd className="tabular">{formatPrice(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && <div className="flex justify-between text-success"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd className="tabular">−{formatPrice(order.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-cream/50">Delivery</dt><dd className="tabular">{order.deliveryFeeCents ? formatPrice(order.deliveryFeeCents) : "Free"}</dd></div>
            {order.taxCents > 0 && <div className="flex justify-between"><dt className="text-cream/50">Tax</dt><dd className="tabular">{formatPrice(order.taxCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-cream/50">Courier tip</dt><dd className="tabular">{formatPrice(order.tipCents)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-cream/[0.07] pt-3"><dt className="text-cream">Total</dt><dd className="font-display text-3xl tabular text-cream">{formatPrice(order.totalCents)}</dd></div>
          </dl>
          <p className="mt-4 text-[0.76rem] text-cream/40">Simulated payment · {order.paymentBrand} •••• {order.paymentLast4} · ref {order.paymentRef}. No real charge was made.</p>
        </section>
        <section className="space-y-6">
          <div className="rounded-[1.5rem] border border-cream/[0.07] p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-cream"><MapPin className="h-4 w-4 text-caramel-light" /> Delivering to</h2>
            <address className="space-y-1 text-[0.9rem] not-italic text-cream/70">
              <p className="text-cream">{order.address.recipient}</p>
              <p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}</p>
              <p>{order.address.city}, {order.address.state} {order.address.postalCode}</p>
              {order.address.instructions && <p className="pt-2 text-[0.82rem] text-cream/45">“{order.address.instructions}”</p>}
            </address>
            {order.zoneName && <p className="mt-4 text-[0.78rem] text-cream/40">{order.zoneName} · typically {order.etaMinMinutes}–{order.etaMaxMinutes} min</p>}
          </div>
          {order.notes && (
            <div className="rounded-[1.5rem] border border-cream/[0.07] p-6">
              <h2 className="mb-2 font-display text-2xl text-cream">Note to the bar</h2>
              <p className="text-[0.9rem] text-cream/65">{order.notes}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
