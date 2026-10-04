"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { deleteCategoryAction, deleteOptionAction, saveCategoryAction, saveOptionAction, toggleOptionAction, updateInventoryAction } from "@/server/actions/admin";
import type { ActionResult } from "@/server/result";
import { formatPrice, cn } from "@/lib/utils";
import { Panel, Table, td, th } from "./ui";
import { AvailabilityToggle, Switch } from "./AvailabilityToggle";

function useSaved(state: ActionResult | null, msg: string, done: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast(msg);
      router.refresh();
      done();
    }
  }, [state, msg, done, router]);
}

/* ─────────── Categories ─────────── */
type Cat = { id: number; name: string; description: string; sortOrder: number; isActive: boolean; products: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [edit, setEdit] = useState<Cat | "new" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = useCallback(() => setEdit(null), []);
  return (
    <>
      <div className="mb-4 flex justify-end"><Button size="sm" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New category</Button></div>
      <Table>
        <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Order</th><th className={th}>Name</th><th className={th}>Description</th><th className={th}>Products</th><th className={th}>Status</th><th className={th} /></tr></thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {categories.map((c) => (
            <tr key={c.id}>
              <td className={cn(td, "font-mono text-cream/50")}>{c.sortOrder}</td>
              <td className={cn(td, "text-cream")}>{c.name}</td>
              <td className={cn(td, "max-w-sm truncate text-cream/55")}>{c.description}</td>
              <td className={cn(td, "font-mono")}>{c.products}</td>
              <td className={td}>{c.isActive ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}</td>
              <td className={cn(td, "text-right")}>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEdit(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" disabled={pending} aria-label={`Delete ${c.name}`} onClick={() => start(async () => { if (!window.confirm(`Delete ${c.name}?`)) return; const r = await deleteCategoryAction(c.id); if (r.ok) { toast("Category deleted"); router.refresh(); } else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "New category" : "Edit category"}>
        {edit && <CategoryForm cat={edit === "new" ? null : edit} done={close} />}
      </Sheet>
    </>
  );
}

function CategoryForm({ cat, done }: { cat: Cat | null; done: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveCategoryAction, null);
  useSaved(state, "Category saved", done);
  return (
    <form action={action} className="space-y-4 p-6">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Input label="Name" name="name" defaultValue={cat?.name} data-autofocus required />
      <Input label="Description" name="description" defaultValue={cat?.description} maxLength={240} />
      <Input label="Sort order" name="sortOrder" type="number" min={0} defaultValue={cat?.sortOrder ?? 10} />
      <Checkbox name="isActive" defaultChecked={cat?.isActive ?? true} label="Visible on the menu" />
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}

/* ─────────── Customizations ─────────── */
type Group = { id: number; key: string; name: string; type: "single" | "multi"; required: boolean; maxSelections: number | null; products: number; options: { id: number; name: string; priceDeltaCents: number; isAvailable: boolean; isDefault: boolean }[] };

export function CustomizationManager({ groups }: { groups: Group[] }) {
  const [edit, setEdit] = useState<{ groupId: number; option?: Group["options"][number] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = useCallback(() => setEdit(null), []);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {groups.map((g) => (
        <Panel key={g.id} title={<span className="flex items-center gap-2">{g.name} <Badge>{g.type === "single" ? "Choose one" : `Up to ${g.maxSelections ?? "any"}`}</Badge>{g.required && <Badge tone="caramel">Required</Badge>}</span>} action={<span className="text-[0.76rem] text-cream/40">{g.products} products</span>} bodyClass="p-0">
          <ul className="divide-y divide-cream/[0.05]">
            {g.options.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("flex-1 text-[0.88rem]", o.isAvailable ? "text-cream" : "text-cream/40 line-through")}>{o.name}{o.isDefault && <span className="ml-2 text-[0.7rem] text-cream/35">default</span>}</span>
                <span className="w-16 text-right font-mono text-[0.8rem] text-cream/55">{o.priceDeltaCents ? `+${formatPrice(o.priceDeltaCents)}` : "—"}</span>
                <Switch checked={o.isAvailable} label={`${o.name} available`} disabled={pending} onChange={(v) => start(async () => { const r = await toggleOptionAction(o.id, v); if (r.ok) { toast(`${o.name} ${v ? "back in" : "marked out"}`); router.refresh(); } else toast.error(r.error); })} />
                <Button size="sm" variant="ghost" onClick={() => setEdit({ groupId: g.id, option: o })} aria-label={`Edit ${o.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" disabled={pending} aria-label={`Delete ${o.name}`} onClick={() => start(async () => { if (!window.confirm(`Delete ${o.name}?`)) return; const r = await deleteOptionAction(o.id); if (r.ok) { router.refresh(); } else toast.error(r.error); })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
          <div className="border-t border-cream/[0.05] px-5 py-3"><Button size="sm" variant="subtle" onClick={() => setEdit({ groupId: g.id })}><Plus className="h-3.5 w-3.5" /> Add option</Button></div>
        </Panel>
      ))}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.option ? "Edit option" : "New option"}>
        {edit && <OptionForm groupId={edit.groupId} option={edit.option} done={close} />}
      </Sheet>
    </div>
  );
}

function OptionForm({ groupId, option, done }: { groupId: number; option?: Group["options"][number]; done: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveOptionAction, null);
  useSaved(state, "Option saved", done);
  return (
    <form action={action} className="space-y-4 p-6">
      <input type="hidden" name="groupId" value={groupId} />
      {option && <input type="hidden" name="id" value={option.id} />}
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Input label="Option name" name="name" defaultValue={option?.name} data-autofocus required />
      <Input label="Price change (USD)" name="price" type="number" step="0.05" defaultValue={option ? option.priceDeltaCents / 100 : 0} hint="Use 0 for free options." />
      <Button type="submit" loading={pending}>Save option</Button>
    </form>
  );
}

/* ─────────── Inventory ─────────── */
type InvRow = { id: number; name: string; category: string; available: boolean; stockLevel: number | null; lowStockThreshold: number; soldOut: boolean };

export function InventoryTable({ rows }: { rows: InvRow[] }) {
  return (
    <Table>
      <thead className="border-b border-cream/[0.06]"><tr><th className={th}>Product</th><th className={th}>Tracking</th><th className={th}>In stock</th><th className={th}>Low alert at</th><th className={th}>Sold out</th><th className={th}>Orderable</th><th className={th} /></tr></thead>
      <tbody className="divide-y divide-cream/[0.05]">{rows.map((r) => <InventoryRow key={r.id} row={r} />)}</tbody>
    </Table>
  );
}

function InventoryRow({ row }: { row: InvRow }) {
  const [tracked, setTracked] = useState(row.stockLevel != null);
  const [stock, setStock] = useState(String(row.stockLevel ?? 0));
  const [low, setLow] = useState(String(row.lowStockThreshold));
  const [soldOut, setSoldOut] = useState(row.soldOut);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = tracked !== (row.stockLevel != null) || (tracked && Number(stock) !== row.stockLevel) || Number(low) !== row.lowStockThreshold || soldOut !== row.soldOut;
  const lowNow = tracked && Number(stock) <= Number(low);
  const save = () =>
    start(async () => {
      const r = await updateInventoryAction(row.id, { stockLevel: tracked ? Math.max(0, Math.round(Number(stock) || 0)) : null, lowStockThreshold: Math.max(0, Math.round(Number(low) || 0)), soldOut });
      if (r.ok) { toast(`${row.name} updated`); router.refresh(); } else toast.error(r.error);
    });
  return (
    <tr className={cn(soldOut && "bg-danger/[0.03]")}>
      <td className={td}><p className="text-cream">{row.name}</p><p className="text-[0.74rem] text-cream/40">{row.category}</p></td>
      <td className={td}><Switch checked={tracked} onChange={setTracked} label={`Track stock for ${row.name}`} /></td>
      <td className={td}>
        {tracked ? (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`s-${row.id}`}>Stock for {row.name}</label>
            <input id={`s-${row.id}`} type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="h-9 w-20 rounded-lg border border-cream/10 bg-ink/60 px-2 font-mono text-[0.84rem] text-cream focus:border-caramel/60 focus:outline-none" />
            {lowNow && <Badge tone={Number(stock) === 0 ? "danger" : "caramel"}>{Number(stock) === 0 ? "Out" : "Low"}</Badge>}
          </div>
        ) : <span className="text-cream/35">Made to order</span>}
      </td>
      <td className={td}>
        <label className="sr-only" htmlFor={`l-${row.id}`}>Low stock alert for {row.name}</label>
        <input id={`l-${row.id}`} type="number" min={0} value={low} disabled={!tracked} onChange={(e) => setLow(e.target.value)} className="h-9 w-20 rounded-lg border border-cream/10 bg-ink/60 px-2 font-mono text-[0.84rem] text-cream disabled:opacity-30 focus:border-caramel/60 focus:outline-none" />
      </td>
      <td className={td}><Switch checked={soldOut} onChange={setSoldOut} label={`${row.name} sold out`} /></td>
      <td className={td}><AvailabilityToggle id={row.id} available={row.available} name={row.name} /></td>
      <td className={cn(td, "text-right")}><Button size="sm" variant={dirty ? "primary" : "subtle"} disabled={!dirty} loading={pending} onClick={save}>Save</Button></td>
    </tr>
  );
}
