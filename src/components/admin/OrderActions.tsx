"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/db/schema";
import { ACTION_LABEL, TRANSITIONS } from "@/lib/order-status";
import { updateOrderStatusAction } from "@/server/actions/admin";

/** Next-step buttons for an order, generated from the server-enforced transition map. */
export function OrderActions({ orderId, number, status, size = "sm" }: { orderId: string; number: string; status: OrderStatus; size?: "sm" | "md" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = TRANSITIONS[status];
  if (!next.length) return null;
  const run = (to: OrderStatus) =>
    start(async () => {
      if ((to === "rejected" || to === "cancelled") && !window.confirm(`${to === "rejected" ? "Reject" : "Cancel"} order ${number}? The customer will be notified and nothing will be charged.`)) return;
      const res = await updateOrderStatusAction(orderId, to);
      if (!res.ok) return void toast.error(res.error);
      toast(`${number} · ${ACTION_LABEL[to] ?? to}`, { description: "Customer notified." });
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      {next.map((to) => {
        const negative = to === "rejected" || to === "cancelled";
        return (
          <Button key={to} size={size} variant={negative ? "ghost" : to === "confirmed" ? "caramel" : "primary"} disabled={pending} onClick={() => run(to)} className={negative ? "text-danger hover:bg-danger/10" : undefined}>
            {ACTION_LABEL[to] ?? to}
          </Button>
        );
      })}
    </div>
  );
}
