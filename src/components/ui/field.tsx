import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-cream/[0.12] bg-ink/60 px-4 text-[0.95rem] text-cream placeholder:text-cream/30 transition-colors duration-200 hover:border-cream/25 focus:border-caramel-light/70 focus:outline-none focus:ring-2 focus:ring-caramel/20 aria-[invalid=true]:border-danger/70";

type FieldShell = { label: string; error?: string; hint?: ReactNode; className?: string; optional?: boolean };

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input"> & FieldShell>(function Input({ label, error, hint, className, optional, id, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fid} className="flex items-baseline justify-between text-[0.8rem] font-medium text-cream/75">
        {label}
        {optional && <span className="text-[0.72rem] font-normal text-cream/35">Optional</span>}
      </label>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined} className={cn(control, "h-12")} {...props} />
      {error ? (
        <p id={`${fid}-err`} role="alert" className="text-[0.78rem] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="text-[0.76rem] text-cream/40">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & FieldShell>(function Textarea({ label, error, hint, className, optional, id, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fid} className="flex items-baseline justify-between text-[0.8rem] font-medium text-cream/75">
        {label}
        {optional && <span className="text-[0.72rem] font-normal text-cream/35">Optional</span>}
      </label>
      <textarea ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, "min-h-[96px] py-3")} {...props} />
      {error ? <p role="alert" className="text-[0.78rem] text-danger">{error}</p> : hint ? <p className="text-[0.76rem] text-cream/40">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select"> & FieldShell>(function Select({ label, error, className, id, children, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fid} className="text-[0.8rem] font-medium text-cream/75">{label}</label>
      <select ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23c9b9a3%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10")} {...props}>
        {children}
      </select>
      {error && <p role="alert" className="text-[0.78rem] text-danger">{error}</p>}
    </div>
  );
});

export function Checkbox({ label, description, className, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={props.id ?? id} className={cn("group flex cursor-pointer items-start gap-3", className)}>
      <input id={props.id ?? id} type="checkbox" className="peer sr-only" {...props} />
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-cream/25 transition-colors peer-checked:border-caramel peer-checked:bg-caramel peer-focus-visible:ring-2 peer-focus-visible:ring-caramel-light [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" /></svg>
      </span>
      <span className="text-[0.88rem] leading-snug text-cream/80">
        {label}
        {description && <span className="mt-0.5 block text-[0.78rem] text-cream/45">{description}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/[0.08] px-4 py-3 text-[0.86rem] text-[#f2c3b8]">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
      <span>{message}</span>
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/[0.08] px-4 py-3 text-[0.86rem] text-[#cfe3c9]">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5 9-10" /></svg>
      <span>{message}</span>
    </div>
  );
}
