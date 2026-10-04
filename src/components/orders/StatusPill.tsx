import type { OrderStatus } from "@/lib/db/schema";
import { STATUS_META } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status];
  const tone = {
    neutral: "border-cream/15 bg-cream/[0.06] text-cream/80",
    active: "border-caramel/35 bg-caramel/[0.12] text-caramel-light",
    success: "border-success/30 bg-success/10 text-[#b9d6b1]",
    danger: "border-danger/30 bg-danger/10 text-[#f0b4a6]",
  }[meta.tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.72rem] font-medium", tone, className)}>
      {meta.tone === "active" && <span className="relative flex h-1.5 w-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-caramel opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-caramel" /></span>}
      {meta.short}
    </span>
  );
}
