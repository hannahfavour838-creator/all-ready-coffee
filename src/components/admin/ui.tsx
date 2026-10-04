import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, eyebrow, actions, description }: { title: string; eyebrow?: string; actions?: ReactNode; description?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[2.6rem] leading-none text-cream">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.88rem] text-cream/50">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClass }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("rounded-2xl border border-cream/[0.07] bg-espresso/60", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-cream/[0.06] px-5 py-4">
          <h2 className="text-[0.92rem] font-medium text-cream">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  return (
    <div className="rounded-2xl border border-cream/[0.07] bg-espresso/60 p-5">
      <p className="text-[0.78rem] text-cream/50">{label}</p>
      <p className="mt-2 font-display text-[2.4rem] leading-none tabular text-cream">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-[0.74rem]">
        {delta != null && Number.isFinite(delta) && (
          <span className={cn("rounded-full px-1.5 py-0.5 font-mono", delta >= 0 ? "bg-success/10 text-[#b9d6b1]" : "bg-danger/10 text-[#f0b4a6]")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint && <span className="text-cream/40">{hint}</span>}
      </div>
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-cream/[0.07] bg-espresso/40", className)}>
      <table className="w-full min-w-[720px] text-left text-[0.86rem]">{children}</table>
    </div>
  );
}
export const th = "px-4 py-3 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-cream/40";
export const td = "px-4 py-3.5 align-middle";
