import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getAccountStats, getFavorites, getUserOrders } from "@/server/queries/account";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { StatusPill } from "@/components/orders/StatusPill";
import { ProductCard } from "@/components/menu/ProductCard";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ReorderButton } from "@/components/account/ReorderButton";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/account");
  const { welcome } = await searchParams;
  const [active, recent, favorites, stats] = await Promise.all([getUserOrders(user.id, { active: true, limit: 3 }), getUserOrders(user.id, { active: false, limit: 4 }), getFavorites(user.id), getAccountStats(user.id)]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-14">
      <header>
        <p className="eyebrow mb-3">{welcome ? "Account created" : greet}</p>
        <h1 className="font-display text-display-md text-cream">{welcome ? `Welcome, ${user.name.split(" ")[0]}.` : `${greet}, ${user.name.split(" ")[0]}.`}</h1>
        {welcome && <p className="mt-3 max-w-lg text-cream/60">Your account is ready. Use <span className="font-mono text-caramel-light">WELCOME15</span> for 15% off your first order over $15.</p>}
      </header>

      {active.length > 0 && (
        <section aria-labelledby="active" className="space-y-4">
          <h2 id="active" className="eyebrow">In progress</h2>
          {active.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.number}`} className="block rounded-[1.75rem] border border-caramel/25 bg-gradient-to-br from-roast/70 to-espresso/60 p-6 transition hover:border-caramel/50 md:p-8">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-3xl text-cream">Order {o.number}</p>
                  <p className="mt-1 text-[0.84rem] text-cream/50">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</p>
                </div>
                <StatusPill status={o.status} />
              </div>
              <OrderTracker compact number={o.number} initialStatus={o.status} initialEvents={[]} etaMin={o.etaMinMinutes} etaMax={o.etaMaxMinutes} estimatedDeliveryAt={o.estimatedDeliveryAt?.toISOString() ?? null} />
            </Link>
          ))}
        </section>
      )}

      <section className="grid gap-px overflow-hidden rounded-[1.5rem] border border-cream/[0.07] bg-cream/[0.07] sm:grid-cols-3" aria-label="Your stats">
        {[
          { k: String(stats.orders), v: "Orders delivered" },
          { k: formatPrice(stats.spentCents), v: "Spent with us" },
          { k: stats.top?.name ?? "—", v: "Your usual" },
        ].map((s) => (
          <div key={s.v} className="bg-ink p-6">
            <p className="truncate font-display text-3xl text-cream">{s.k}</p>
            <p className="mt-1 text-[0.8rem] text-cream/45">{s.v}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="recent">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="recent" className="font-display text-3xl text-cream">Recent orders</h2>
          <Link href="/account/orders" className="flex items-center gap-1.5 text-[0.84rem] text-cream/55 hover:text-cream">All orders <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No orders yet" body="Your order history will live here — every receipt, every favorite, ready to reorder in one tap." action={<ButtonLink href="/menu">Place your first order</ButtonLink>} />
        ) : (
          <ul className="divide-y divide-cream/[0.07] rounded-[1.5rem] border border-cream/[0.07]">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <Link href={`/account/orders/${o.number}`} className="min-w-0 flex-1">
                  <p className="text-cream">{o.number} <span className="ml-2 text-[0.8rem] text-cream/40">{formatDate(o.createdAt)}</span></p>
                  <p className="mt-1 truncate text-[0.82rem] text-cream/50">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</p>
                </Link>
                <div className="flex items-center gap-4">
                  <StatusPill status={o.status} />
                  <span className="font-mono text-[0.86rem] tabular text-cream/80">{formatPrice(o.totalCents)}</span>
                  <ReorderButton number={o.number} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="favs">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="favs" className="font-display text-3xl text-cream">Favorites</h2>
          <Link href="/account/favorites" className="flex items-center gap-1.5 text-[0.84rem] text-cream/55 hover:text-cream">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {favorites.length === 0 ? (
          <EmptyState title="No favorites yet" body="Tap the heart on any drink to keep it close." action={<ButtonLink href="/menu" variant="outline">Find a favorite</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {favorites.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
