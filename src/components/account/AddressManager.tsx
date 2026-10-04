"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input, Select } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/misc";
import { deleteAddressAction, saveAddressAction } from "@/server/actions/account";
import type { ActionResult } from "@/server/result";
import { US_STATES } from "@/lib/validation";

type A = { id: string; label: string; recipient: string; line1: string; line2: string | null; city: string; state: string; postalCode: string; instructions: string | null; isDefault: boolean };

export function AddressManager({ addresses, zoneZips, defaultRecipient }: { addresses: A[]; zoneZips: string[]; defaultRecipient: string }) {
  const [editing, setEditing] = useState<A | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const [pending, start] = useTransition();
  return (
    <>
      {addresses.length === 0 ? (
        <EmptyState title="No saved addresses" body="Save your home or office once and checkout becomes a single tap." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add an address</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <article key={a.id} className="flex flex-col rounded-[1.5rem] border border-cream/[0.08] bg-espresso/40 p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-display text-2xl text-cream"><MapPin className="h-4 w-4 text-caramel-light" />{a.label}</p>
                <div className="flex gap-1.5">
                  {a.isDefault && <Badge tone="caramel">Default</Badge>}
                  {!zoneZips.includes(a.postalCode) && <Badge tone="danger">Outside zone</Badge>}
                </div>
              </div>
              <address className="mt-4 space-y-0.5 text-[0.9rem] not-italic text-cream/65">
                <p>{a.recipient}</p>
                <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p>{a.city}, {a.state} {a.postalCode}</p>
                {a.instructions && <p className="pt-2 text-[0.8rem] text-cream/40">“{a.instructions}”</p>}
              </address>
              <div className="mt-6 flex gap-2">
                <Button variant="subtle" size="sm" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      if (!window.confirm(`Remove “${a.label}”?`)) return;
                      const res = await deleteAddressAction(a.id);
                      if (res.ok) { toast("Address removed"); } else toast.error(res.error);
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </article>
          ))}
          <button onClick={() => setEditing("new")} className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-cream/15 text-cream/55 transition hover:border-cream/35 hover:text-cream">
            <Plus className="h-5 w-5" /> Add an address
          </button>
        </div>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New address" : "Edit address"} side="right">
        {editing && <AddressForm key={editing === "new" ? "new" : editing.id} address={editing === "new" ? null : editing} defaultRecipient={defaultRecipient} onDone={close} zoneZips={zoneZips} />}
      </Sheet>
    </>
  );
}

function AddressForm({ address, defaultRecipient, onDone, zoneZips }: { address: A | null; defaultRecipient: string; onDone: () => void; zoneZips: string[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAddressAction, null);
  const [zip, setZip] = useState(address?.postalCode ?? "");
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) {
      toast(address ? "Address updated" : "Address saved");
      onDone();
    }
  }, [state, address, onDone]);
  return (
    <form action={action} className="grid gap-4 p-6 sm:grid-cols-6">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="sm:col-span-6"><FormError message={state && !state.ok ? state.error : undefined} /></div>
      <Input className="sm:col-span-3" label="Label" name="label" defaultValue={address?.label ?? "Home"} maxLength={30} error={fe?.label} data-autofocus />
      <Input className="sm:col-span-3" label="Recipient" name="recipient" defaultValue={address?.recipient ?? defaultRecipient} error={fe?.recipient} autoComplete="name" />
      <Input className="sm:col-span-4" label="Street address" name="line1" defaultValue={address?.line1} error={fe?.line1} autoComplete="address-line1" />
      <Input className="sm:col-span-2" label="Apt / suite" name="line2" optional defaultValue={address?.line2 ?? ""} autoComplete="address-line2" />
      <Input className="sm:col-span-3" label="City" name="city" defaultValue={address?.city ?? "Portland"} error={fe?.city} autoComplete="address-level2" />
      <Select className="sm:col-span-1" label="State" name="state" defaultValue={address?.state ?? "OR"} error={fe?.state}>
        {US_STATES.map((s) => <option key={s}>{s}</option>)}
      </Select>
      <Input className="sm:col-span-2" label="ZIP" name="postalCode" inputMode="numeric" maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} error={fe?.postalCode} hint={/^\d{5}$/.test(zip) ? (zoneZips.includes(zip) ? "In our delivery area" : "Outside our delivery area — you can still save it") : undefined} autoComplete="postal-code" />
      <Input className="sm:col-span-6" label="Delivery instructions" name="instructions" optional defaultValue={address?.instructions ?? ""} maxLength={200} />
      <Checkbox className="sm:col-span-6" name="isDefault" defaultChecked={address?.isDefault} label="Make this my default address" />
      <div className="flex gap-3 sm:col-span-6">
        <Button type="submit" loading={pending}>Save address</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
