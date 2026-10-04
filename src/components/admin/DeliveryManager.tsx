"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { deleteZoneAction, saveDeliverySettingsAction, saveZoneAction } from "@/server/actions/admin";
import type { ActionResult } from "@/server/result";
import type { DeliveryZone } from "@/lib/db/schema";
import { formatPrice, cn } from "@/lib/utils";
import { Panel, Table, td, th } from "./ui";

export function DeliveryManager({ zones, settings }: { zones: DeliveryZone[]; settings: { prep: number; taxBps: number; paused: boolean; notice: string } }) {
  const [edit, setEdit] = useState<DeliveryZone | "new" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = useCallback(() => setEdit(null), []);
  return (
    <div className="space-y-6">
      <SettingsForm settings={settings} />
      <Panel title="Delivery zones" action={<Button size="sm" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New zone</Button>} bodyClass="p-0">
        <Table className="rounded-none border-0">
          <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Zone</th><th className={th}>ZIP codes</th><th className={th}>Fee</th><th className={th}>Minimum</th><th className={th}>Free over</th><th className={th}>Estimate</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody className="divide-y divide-cream/[0.05]">
            {zones.map((z) => (
              <tr key={z.id}>
                <td className={cn(td, "text-cream")}>{z.name}</td>
                <td className={cn(td, "font-mono text-[0.78rem] text-cream/55")}>{z.postalCodes.join(", ")}</td>
                <td className={cn(td, "font-mono")}>{formatPrice(z.feeCents)}</td>
                <td className={cn(td, "font-mono")}>{formatPrice(z.minOrderCents)}</td>
                <td className={cn(td, "font-mono")}>{z.freeOverCents ? formatPrice(z.freeOverCents) : "—"}</td>
                <td className={cn(td, "font-mono")}>{z.etaMinMinutes}–{z.etaMaxMinutes} min</td>
                <td className={td}>{z.isActive ? <Badge tone="success">Active</Badge> : <Badge>Paused</Badge>}</td>
                <td className={cn(td, "text-right")}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${z.name}`} onClick={() => setEdit(z)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${z.name}`} disabled={pending} onClick={() => start(async () => { if (!window.confirm(`Delete ${z.name}?`)) return; const r = await deleteZoneAction(z.id); if (r.ok) { toast("Zone deleted"); router.refresh(); } else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Sheet open={!!edit} onClose={close} title={edit === "new" ? "New zone" : "Edit zone"}>
        {edit && <ZoneForm zone={edit === "new" ? null : edit} done={close} />}
      </Sheet>
    </div>
  );
}

function ZoneForm({ zone, done }: { zone: DeliveryZone | null; done: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveZoneAction, null);
  const router = useRouter();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) {
      toast("Zone saved");
      router.refresh();
      done();
    }
  }, [state, router, done]);
  return (
    <form action={action} className="grid gap-4 p-6 sm:grid-cols-2">
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <div className="sm:col-span-2"><FormError message={state && !state.ok ? state.error : undefined} /></div>
      <Input className="sm:col-span-2" label="Zone name" name="name" defaultValue={zone?.name} data-autofocus error={fe?.name} />
      <Textarea className="sm:col-span-2" label="ZIP codes" name="postalCodes" defaultValue={zone?.postalCodes.join(", ")} hint="5-digit ZIPs separated by commas or spaces" error={fe?.postalCodes} />
      <Input label="Delivery fee ($)" name="fee" type="number" step="0.01" min="0" defaultValue={zone ? zone.feeCents / 100 : 3.99} error={fe?.fee} />
      <Input label="Minimum order ($)" name="minOrder" type="number" step="0.5" min="0" defaultValue={zone ? zone.minOrderCents / 100 : 12} error={fe?.minOrder} />
      <Input label="Free delivery over ($)" name="freeOver" type="number" step="1" min="0" optional defaultValue={zone?.freeOverCents ? zone.freeOverCents / 100 : ""} />
      <div />
      <Input label="Estimate from (min)" name="etaMin" type="number" min="5" defaultValue={zone?.etaMinMinutes ?? 25} error={fe?.etaMin} />
      <Input label="Estimate to (min)" name="etaMax" type="number" min="5" defaultValue={zone?.etaMaxMinutes ?? 40} error={fe?.etaMax} />
      <Checkbox className="sm:col-span-2" name="isActive" defaultChecked={zone?.isActive ?? true} label="Accepting deliveries" />
      <div className="sm:col-span-2"><Button type="submit" loading={pending}>Save zone</Button></div>
    </form>
  );
}

function SettingsForm({ settings }: { settings: { prep: number; taxBps: number; paused: boolean; notice: string } }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveDeliverySettingsAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast("Delivery settings saved");
      router.refresh();
    }
  }, [state, router]);
  return (
    <Panel title="Kitchen & delivery settings">
      <form action={action} className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4"><FormError message={state && !state.ok ? state.error : undefined} /></div>
        <Input label="Prep time (min)" name="prep_minutes" type="number" min={1} max={120} defaultValue={settings.prep} hint="Used for 'ready' estimates." />
        <Input label="Sales tax (%)" name="tax_rate" type="number" step="0.01" min={0} max={20} defaultValue={settings.taxBps / 100} hint="Oregon: 0%" />
        <Textarea className="md:col-span-2" label="Customer-facing delivery note" name="delivery_notice" defaultValue={settings.notice} maxLength={240} />
        <Checkbox className="md:col-span-3" name="delivery_paused" defaultChecked={settings.paused} label="Pause new delivery orders" description="Use during rushes or bad weather. Customers see a calm notice and can't check out until you resume." />
        <div className="flex items-end justify-end"><Button type="submit" loading={pending}>Save settings</Button></div>
      </form>
    </Panel>
  );
}
