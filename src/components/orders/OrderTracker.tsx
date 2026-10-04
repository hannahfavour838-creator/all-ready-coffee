"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ClipboardCheck, Coffee, PackageCheck, Bike, Home, X } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_FLOW, STATUS_META, isActive } from "@/lib/order-status";
import { cn, formatTime } from "@/lib/utils";

const ICONS = { placed: ClipboardCheck, confirmed: Check, preparing: Coffee, ready: PackageCheck, out_for_delivery: Bike, delivered: Home } as const;

type Event = { status: OrderStatus; createdAt: string };

/** Visual progress tracker with live polling while the order is active. */
export function OrderTracker({ number, initialStatus, initialEvents, etaMin, etaMax, estimatedDeliveryAt, compact }: { number: string; initialStatus: OrderStatus; initialEvents: Event[]; etaMin: number; etaMax: number; estimatedDeliveryAt: string | null; compact?: boolean }) {
  const [status, setStatus] = useState(initialStatus);
  const [events, setEvents] = useState(initialEvents);
  const [eta, setEta] = useState(estimatedDeliveryAt);
  const router = useRouter();
  const prev = useRef(initialStatus);

  useEffect(() => {
    if (!isActive(status)) return;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${number}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { status: OrderStatus; events: Event[]; estimatedDeliveryAt: string | null };
        setEvents(data.events);
        setEta(data.estimatedDeliveryAt);
        if (data.status !== prev.current) {
          prev.current = data.status;
          setStatus(data.status);
          toast(STATUS_META[data.status].label, { description: STATUS_META[data.status].customer });
          router.refresh();
        }
      } catch {
        /* retry next tick */
      }
    };
    const id = window.setInterval(poll, 8000);
    return () => window.clearInterval(id);
  }, [number, status, router]);

  const failed = status === "rejected" || status === "cancelled";
  const current = failed ? -1 : STATUS_FLOW.indexOf(status);
  const at = (s: OrderStatus) => events.find((e) => e.status === s)?.createdAt;
  const progress = failed ? 0 : current / (STATUS_FLOW.length - 1);

  if (failed) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-danger/25 bg-danger/[0.06] p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/15"><X className="h-4 w-4 text-danger" /></span>
        <div>
          <p className="text-cream">{STATUS_META[status].label}</p>
          <p className="mt-1 text-[0.86rem] text-cream/55">{STATUS_META[status].customer}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">{status === "delivered" ? "Delivered" : "Estimated arrival"}</p>
            <p className="font-display text-5xl text-cream" aria-live="polite">
              {status === "delivered" ? formatTime(at("delivered") ?? new Date()) : eta ? `${formatTime(new Date(new Date(eta).getTime() - (etaMax - etaMin) * 60_000))} – ${formatTime(eta)}` : `${etaMin}–${etaMax} min`}
            </p>
          </div>
          <p className="max-w-xs text-[0.86rem] text-cream/55" aria-live="polite">{STATUS_META[status].customer}</p>
        </div>
      )}
      <ol className="relative grid grid-cols-6 gap-1" aria-label="Order progress">
        <div className="absolute left-[8.33%] right-[8.33%] top-5 h-px bg-cream/10" aria-hidden />
        <motion.div className="absolute left-[8.33%] top-5 h-px origin-left bg-caramel" style={{ width: "83.33%" }} initial={{ scaleX: 0 }} animate={{ scaleX: progress }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} aria-hidden />
        {STATUS_FLOW.map((s, i) => {
          const Icon = ICONS[s as keyof typeof ICONS];
          const done = i < current || status === "delivered";
          const now = i === current && status !== "delivered";
          const time = at(s);
          return (
            <li key={s} className="relative flex flex-col items-center text-center" aria-current={now ? "step" : undefined}>
              <motion.span
                initial={false}
                animate={{ scale: now ? 1.08 : 1 }}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-500",
                  done ? "border-caramel bg-caramel text-ink" : now ? "border-caramel bg-espresso text-caramel-light" : "border-cream/15 bg-ink text-cream/30",
                )}
              >
                {now && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-caramel" aria-hidden />}
                <Icon className="h-4 w-4" />
              </motion.span>
              <span className={cn("mt-3 text-[0.7rem] leading-tight sm:text-[0.78rem]", done || now ? "text-cream" : "text-cream/35")}>{STATUS_META[s].short}</span>
              {!compact && <span className="mt-1 hidden font-mono text-[0.64rem] text-cream/35 sm:block">{time ? formatTime(time) : ""}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
