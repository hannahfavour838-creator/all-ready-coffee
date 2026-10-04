import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "caramel" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium tracking-[0.01em] transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-300 ease-out-expo active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-cream text-espresso hover:bg-foam shadow-[0_10px_30px_-12px_rgba(241,232,217,0.45)]",
  caramel: "bg-caramel text-ink hover:bg-caramel-light shadow-[0_10px_30px_-12px_rgba(192,141,88,0.6)]",
  outline: "border border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/[0.04]",
  ghost: "text-cream/80 hover:text-cream hover:bg-cream/[0.06]",
  subtle: "bg-cream/[0.06] text-cream hover:bg-cream/[0.1] border border-cream/[0.06]",
  danger: "bg-danger/90 text-ink hover:bg-danger",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.82rem]",
  md: "h-11 px-6 text-[0.9rem]",
  lg: "h-14 px-8 text-[0.98rem]",
  icon: "h-10 w-10",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
    </button>
  );
});

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
