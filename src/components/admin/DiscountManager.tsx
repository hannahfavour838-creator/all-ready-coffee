"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { deleteDiscountAction, saveDiscountAction, toggleDiscountAction } from "@/server/actions/admin";
import type { ActionResult } from "@/server/result";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import { Table, td, th } from "./ui";
import { Switch } from "./AvailabilityToggle";

type D = { id: number; code: string; description: string; type: "percent" | "fixed"; value: number; minSubtotalCents: number; maxRedemptions: number | null; redemptions: number; startsAt: string | null; endsAt: string | null; isActive: boolean };

export function DiscountManager({ discounts }: { discounts: D[] }) {
  const [edit, setEdit] = useState<D | "new" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = useCallback(() => setEdit(null), []);
  return (
    <>
      <div className="mb-4 flex justify-end"><Button size="sm" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New code</Button></div>
      <Table>
        <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Code</th><th className={th}>Offer</th><th className={th}>Minimum</th><th className={th}>Used</th><th className={th}>Window</th><th className={th}>Active</th><th className={th} /></tr></thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {discounts.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-cream/45">No promo codes yet.</td></tr>}
          {discounts.map((d) => (
            <tr key={d.id}>
              <td className={td}><p className="font-mono text-cream">{d.code}</p><p className="text-[0.74rem] text-cream/40">{d.description}</p></td>
              <td className={cn(td, "font-mono")}>{d.type === "percent" ? `${d.value}% off` : `${formatPrice(d.value)} off`}</td>
              <td className={cn(td, "font-mono text-cream/60")}>{d.minSubtotalCents ? formatPrice(d.minSubtotalCents) : "—"}</td>
              <td className={cn(td, "font-mono text-cream/60")}>{d.redemptions}{d.maxRedemptions ? ` / ${d.maxRedemptions}` : ""}</td>
              <td className={cn(td, "text-[0.8rem] text-cream/55")}>{d.startsAt || d.endsAt ? `${d.startsAt ? formatDate(d.startsAt) : "now"} → ${d.endsAt ? formatDate(d.endsAt) : "open"}` : "Always"}</td>
              <td className={td}><Switch checked={d.isActive} label={`${d.code} active`} disabled={pending} onChange={(v) => start(async () => { const r = await toggleDiscountAction(d.id, v); if (r.ok) { toast(`${d.code} ${v ? "activated" : "paused"}`); router.refresh(); } else toast.error(r.error); })} /></td>
              <td className={cn(td, "text-right")}>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${d.code}`} onClick={() => setEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${d.code}`} disabled={pending} onClick={() => start(async () => { if (!window.confirm(`Delete ${d.code}?`)) return; const r = await deleteDiscountAction(d.id); if (r.ok) { router.refresh(); } else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Sheet open={!!edit} onClose={close} title={edit === "new" ? "New promo code" : "Edit promo code"}>
        {edit && <DiscountForm d={edit === "new" ? null : edit} done={close} />}
      </Sheet>
    </>
  );
}

function DiscountForm({ d, done }: { d: D | null; done: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveDiscountAction, null);
  const [type, setType] = useState<D["type"]>(d?.type ?? "percent");
  const router = useRouter();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) {
      toast("Promo code saved");
      router.refresh();
      done();
    }
  }, [state, router, done]);
  const dt = (v: string | null) => (v ? v.slice(0, 10) : "");
  return (
    <form action={action} className="grid gap-4 p-6 sm:grid-cols-2">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="sm:col-span-2"><FormError message={state && !state.ok ? state.error : undefined} /></div>
      <Input label="Code" name="code" defaultValue={d?.code} className="[&_input]:font-mono [&_input]:uppercase" data-autofocus error={fe?.code} />
      <Select label="Type" name="type" value={type} onChange={(e) => setType(e.target.value as D["type"])}>
        <option value="percent">Percent off</option>
        <option value="fixed">Fixed amount off</option>
      </Select>
      <Input className="sm:col-span-2" label="Description" name="description" defaultValue={d?.description} maxLength={140} />
      <Input label={type === "percent" ? "Percent (%)" : "Amount ($)"} name="value" type="number" step={type === "percent" ? "1" : "0.5"} defaultValue={d ? (d.type === "percent" ? d.value : d.value / 100) : type === "percent" ? 10 : 5} error={fe?.value} />
      <Input label="Minimum subtotal ($)" name="minSubtotal" type="number" step="1" min="0" defaultValue={d ? d.minSubtotalCents / 100 : 0} />
      <Input label="Max redemptions" name="maxRedemptions" type="number" min="1" optional defaultValue={d?.maxRedemptions ?? ""} />
      <div />
      <Input label="Starts" name="startsAt" type="date" optional defaultValue={dt(d?.startsAt ?? null)} />
      <Input label="Ends" name="endsAt" type="date" optional defaultValue={dt(d?.endsAt ?? null)} />
      <Checkbox className="sm:col-span-2" name="isActive" defaultChecked={d?.isActive ?? true} label="Active" />
      <div className="sm:col-span-2"><Button type="submit" loading={pending}>Save code</Button></div>
    </form>
  );
}
