"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_META } from "@/lib/order-status";
import { StatusPill } from "@/components/orders/StatusPill";
import { OrderActions } from "./OrderActions";
import { formatPrice, formatRelative } from "@/lib/utils";

type BoardOrder = { id: string; number: string; status: OrderStatus; customerName: string; totalCents: number; createdAt: string; zoneName: string | null; notes: string | null; items: { name: string; quantity: number; options: string[] }[] };

const COLUMNS: { key: OrderStatus[]; title: string }[] = [
  { key: ["placed"], title: "New" },
  { key: ["confirmed", "preparing"], title: "On the bar" },
  { key: ["ready", "out_for_delivery"], title: "Handoff & delivery" },
];

/** Kanban-style live board; new orders animate in. */
export function OrderBoard({ orders }: { orders: BoardOrder[] }) {
  if (!orders.length) {
    return <p className="px-5 py-12 text-center text-[0.9rem] text-cream/45">No active orders right now. New orders appear here instantly.</p>;
  }
  return (
    <div className="grid gap-px bg-cream/[0.06] md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = orders.filter((o) => col.key.includes(o.status));
        return (
          <div key={col.title} className="bg-espresso/80 p-4">
            <p className="mb-3 flex items-center justify-between font-mono text-[0.66rem] uppercase tracking-[0.18em] text-cream/40">
              {col.title} <span>{list.length}</span>
            </p>
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {list.map((o) => (
                  <motion.li key={o.id} layout initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }} className={`rounded-xl border bg-ink/70 p-4 ${o.status === "placed" ? "border-caramel/40 shadow-[0_0_0_1px_rgba(192,141,88,0.15)]" : "border-cream/[0.08]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/orders/${o.number}`} className="font-mono text-[0.86rem] text-cream hover:text-caramel-light">{o.number}</Link>
                      <StatusPill status={o.status} />
                    </div>
                    <p className="mt-1 text-[0.8rem] text-cream/55">{o.customerName} · {formatRelative(o.createdAt)}</p>
                    <ul className="mt-3 space-y-1 text-[0.82rem] text-cream/80">
                      {o.items.map((i, k) => (
                        <li key={k}><span className="font-mono text-cream/50">{i.quantity}×</span> {i.name}{i.options.length ? <span className="text-cream/40"> · {i.options.join(", ")}</span> : null}</li>
                      ))}
                    </ul>
                    {o.notes && <p className="mt-2 rounded-lg bg-caramel/10 px-2 py-1 text-[0.76rem] text-caramel-light">“{o.notes}”</p>}
                    <div className="mt-3 flex items-center justify-between text-[0.76rem] text-cream/45">
                      <span>{o.zoneName ?? "Delivery"}</span>
                      <span className="font-mono text-cream/80">{formatPrice(o.totalCents)}</span>
                    </div>
                    <div className="mt-3 border-t border-cream/[0.06] pt-3" aria-label={`Actions for ${o.number}, currently ${STATUS_META[o.status].short}`}>
                      <OrderActions orderId={o.id} number={o.number} status={o.status} />
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        );
      })}
    </div>
  );
}
