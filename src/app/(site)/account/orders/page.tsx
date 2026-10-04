import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserOrders } from "@/server/queries/account";
import { StatusPill } from "@/components/orders/StatusPill";
import { ReorderButton } from "@/components/account/ReorderButton";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { isActive } from "@/lib/order-status";
import { formatDate, formatPrice, formatTime } from "@/lib/utils";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await getUserOrders(user.id, { limit: 100 });
  const current = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));
  return (
    <div className="space-y-14">
      <header>
        <p className="eyebrow mb-3">Orders</p>
        <h1 className="font-display text-display-md text-cream">Every cup, accounted for.</h1>
      </header>
      {orders.length === 0 && <EmptyState title="No orders yet" body="When you place an order, you'll be able to follow it live from the bar to your door." action={<ButtonLink href="/menu">Start an order</ButtonLink>} />}
      {current.length > 0 && (
        <section aria-labelledby="current">
          <h2 id="current" className="mb-4 font-display text-3xl text-cream">Current</h2>
          <OrderList orders={current} />
        </section>
      )}
      {past.length > 0 && (
        <section aria-labelledby="past">
          <h2 id="past" className="mb-4 font-display text-3xl text-cream">History</h2>
          <OrderList orders={past} />
        </section>
      )}
    </div>
  );
}

function OrderList({ orders }: { orders: Awaited<ReturnType<typeof getUserOrders>> }) {
  return (
    <ul className="divide-y divide-cream/[0.07] overflow-hidden rounded-[1.5rem] border border-cream/[0.07]">
      {orders.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-4 p-5 transition-colors hover:bg-cream/[0.02]">
          <Link href={`/account/orders/${o.number}`} className="min-w-0 flex-1">
            <p className="text-cream">{o.number}<span className="ml-3 text-[0.8rem] text-cream/40">{formatDate(o.createdAt)} · {formatTime(o.createdAt)}</span></p>
            <p className="mt-1 truncate text-[0.82rem] text-cream/50">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</p>
          </Link>
          <StatusPill status={o.status} />
          <span className="w-20 text-right font-mono text-[0.86rem] tabular text-cream/80">{formatPrice(o.totalCents)}</span>
          {!isActive(o.status) && <ReorderButton number={o.number} />}
        </li>
      ))}
    </ul>
  );
}
