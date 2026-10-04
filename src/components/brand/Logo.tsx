import { cn } from "@/lib/utils";

/** The "Ready Bean": a roasted bean whose crease resolves into a check mark — crafted, and ready. */
export const MARK_CREASE = "M32 10.6 C 26 18.5, 37.5 24.5, 32.6 33 C 31.2 35.4, 30.4 38.6, 31.2 42.4 L 39.6 33.2";

export function LogoMark({ className, tone = "cream", title }: { className?: string; tone?: "cream" | "espresso" | "outline"; title?: string }) {
  const fill = tone === "espresso" ? "rgb(var(--espresso))" : "rgb(var(--cream))";
  const crease = tone === "espresso" ? "rgb(var(--cream))" : "rgb(var(--espresso))";
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g transform="rotate(-24 32 32)">
        {tone === "outline" ? (
          <>
            <ellipse cx="32" cy="32" rx="15.5" ry="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d={MARK_CREASE} fill="none" stroke="rgb(var(--caramel))" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="32" cy="32" rx="15.5" ry="22" fill={fill} />
            <path d={MARK_CREASE} fill="none" stroke={crease} strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
      </g>
    </svg>
  );
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="font-display text-[1.6rem] tracking-[-0.01em] text-cream">All Ready</span>
      {!compact && <span className="mt-[3px] font-mono text-[0.56rem] uppercase tracking-[0.42em] text-caramel-light/90">Coffee</span>}
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      <Wordmark compact={compact} />
    </span>
  );
}
