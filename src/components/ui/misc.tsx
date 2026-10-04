import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/Logo";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "caramel" | "success" | "danger" | "active"; className?: string }) {
  const tones = {
    neutral: "bg-cream/[0.07] text-cream/75 border-cream/10",
    caramel: "bg-caramel/15 text-caramel-light border-caramel/25",
    success: "bg-success/12 text-[#b9d6b1] border-success/25",
    danger: "bg-danger/12 text-[#f0b4a6] border-danger/25",
    active: "bg-cream/10 text-cream border-cream/20",
  } as const;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-medium tracking-wide", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ title, body, action, icon, className }: { title: string; body: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex flex-col items-center overflow-hidden rounded-[1.5rem] border border-cream/[0.08] bg-gradient-to-b from-roast/50 to-espresso/40 px-6 py-16 text-center", className)}>
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-caramel/10 blur-3xl" />
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cream/10 bg-ink/50">
        {icon ?? <LogoMark tone="outline" className="h-9 w-9 text-cream/50" />}
      </div>
      <h3 className="relative font-display text-3xl text-cream">{title}</h3>
      <p className="relative mt-3 max-w-sm text-[0.92rem] leading-relaxed text-cream/55">{body}</p>
      {action && <div className="relative mt-8">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SectionHeading({ eyebrow, title, body, className, align = "left" }: { eyebrow?: string; title: ReactNode; body?: ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <h2 className="font-display text-display-lg text-cream">{title}</h2>
      {body && <p className={cn("mt-6 max-w-xl text-[1.02rem] leading-relaxed text-cream/60", align === "center" && "mx-auto")}>{body}</p>}
    </div>
  );
}
