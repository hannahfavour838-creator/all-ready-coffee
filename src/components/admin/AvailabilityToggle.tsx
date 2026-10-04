"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setProductAvailabilityAction } from "@/server/actions/admin";
import { cn } from "@/lib/utils";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 disabled:opacity-50", checked ? "border-caramel bg-caramel" : "border-cream/15 bg-cream/[0.06]")}>
      <span className={cn("inline-block h-4 w-4 rounded-full shadow transition-transform duration-300", checked ? "translate-x-6 bg-ink" : "translate-x-1 bg-cream/70")} />
    </button>
  );
}

export function AvailabilityToggle({ id, available, name }: { id: number; available: boolean; name: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(available);
  return (
    <Switch
      checked={value}
      disabled={pending}
      label={`${name} available`}
      onChange={(v) =>
        start(async () => {
          setValue(v);
          const res = await setProductAvailabilityAction(id, v);
          if (!res.ok) toast.error(res.error);
          else toast(`${name} is now ${v ? "available" : "hidden from ordering"}`);
        })
      }
    />
  );
}
