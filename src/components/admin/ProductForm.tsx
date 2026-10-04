"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { ProductVisualSvg } from "@/components/menu/ProductImage";
import { deleteProductAction, saveProductAction } from "@/server/actions/admin";
import type { ActionResult } from "@/server/result";
import type { ProductVisual } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";
import { Panel } from "./ui";

type P = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  tagline: string;
  description: string;
  price: number;
  calories: number | null;
  caffeineMg: number | null;
  tastingNotes: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isSeasonal: boolean;
  groupIds: number[];
  visual: ProductVisual;
  imageUrl: string | null;
};

export function ProductForm({ product, categories, groups }: { product: P | null; categories: { id: number; name: string }[]; groups: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionResult<{ id: number }> | null, FormData>(saveProductAction, null);
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [visual, setVisual] = useState<ProductVisual>(product?.visual ?? { vessel: "mug", liquid: "#b07b4b", top: "#efe3d0" });
  const [preview, setPreview] = useState<string | null>(product?.imageUrl ?? null);
  const [deleting, startDelete] = useTransition();
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast(product ? "Product saved" : "Product created");
      if (!product) router.replace(`/admin/products/${state.data.id}`);
      else router.refresh();
    }
  }, [state, product, router]);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]" encType="multipart/form-data">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-6">
        <FormError message={state && !state.ok ? state.error : undefined} />
        <Panel title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" name="name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required error={fe?.name} />
            <Input label="URL slug" name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} error={fe?.slug} hint={`/menu/${slug || "…"}`} />
            <Select label="Category" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} error={fe?.categoryId}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Base price (USD)" name="price" type="number" step="0.05" min="0.5" max="200" defaultValue={product?.price ?? 5.5} error={fe?.price} />
            <Input className="sm:col-span-2" label="Tagline" name="tagline" defaultValue={product?.tagline} maxLength={140} error={fe?.tagline} />
            <Textarea className="sm:col-span-2" label="Description" name="description" defaultValue={product?.description} maxLength={1200} rows={5} error={fe?.description} />
            <Input label="Tasting notes" name="tastingNotes" defaultValue={product?.tastingNotes} hint="Comma separated, up to 5" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Calories" name="calories" type="number" min="0" defaultValue={product?.calories ?? ""} optional />
              <Input label="Caffeine mg" name="caffeineMg" type="number" min="0" defaultValue={product?.caffeineMg ?? ""} optional />
            </div>
          </div>
        </Panel>
        <Panel title="Customizations offered">
          <div className="grid gap-3 sm:grid-cols-3">
            {groups.map((g) => (
              <Checkbox key={g.id} name="groupIds" value={g.id} defaultChecked={product?.groupIds.includes(g.id) ?? ["Size", "Milk", "Extras"].includes(g.name)} label={g.name} />
            ))}
          </div>
        </Panel>
        <Panel title="Visibility">
          <div className="grid gap-4 sm:grid-cols-3">
            <Checkbox name="isAvailable" defaultChecked={product?.isAvailable ?? true} label="Available to order" />
            <Checkbox name="isFeatured" defaultChecked={product?.isFeatured} label="Featured on home" />
            <Checkbox name="isSeasonal" defaultChecked={product?.isSeasonal} label="Seasonal" />
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Imagery">
          <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-2xl bg-[radial-gradient(80%_60%_at_50%_70%,#3d2719_0%,#1a120d_60%,#100b09_100%)]">
            {preview ? <Image src={preview} alt="Product preview" fill sizes="320px" className="object-contain p-4" unoptimized={preview.startsWith("blob:")} /> : <div className="absolute inset-6"><ProductVisualSvg visual={visual} label={name || "Preview"} /></div>}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-cream/20 px-4 py-3 text-[0.84rem] text-cream/70 transition hover:border-cream/40 hover:text-cream">
            <ImageUp className="h-4 w-4" /> Upload photo (PNG, JPEG or WebP · max 2 MB)
            <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
          </label>
          {fe?.image && <p className="mt-2 text-[0.78rem] text-danger">{fe.image}</p>}
          <p className="mt-4 text-[0.76rem] text-cream/40">Without a photo, the storefront draws an illustration from the recipe colors below.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Select label="Vessel" name="vessel" value={visual.vessel} onChange={(e) => setVisual({ ...visual, vessel: e.target.value as ProductVisual["vessel"] })}>
              {["demitasse", "cup", "mug", "tall", "tumbler", "pastry"].map((v) => <option key={v}>{v}</option>)}
            </Select>
            <label className="space-y-1.5 text-[0.8rem] text-cream/75">Liquid<input type="color" name="liquid" value={visual.liquid} onChange={(e) => setVisual({ ...visual, liquid: e.target.value })} className="block h-12 w-full cursor-pointer rounded-xl border border-cream/10 bg-transparent" /></label>
            <label className="space-y-1.5 text-[0.8rem] text-cream/75">Top<input type="color" name="top" value={visual.top} onChange={(e) => setVisual({ ...visual, top: e.target.value })} className="block h-12 w-full cursor-pointer rounded-xl border border-cream/10 bg-transparent" /></label>
          </div>
          <Checkbox className="mt-4" name="ice" checked={!!visual.ice} onChange={(e) => setVisual({ ...visual, ice: e.target.checked })} label="Served over ice" />
        </Panel>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={pending}>{product ? "Save changes" : "Create product"}</Button>
          {product && (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger/10"
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  if (!window.confirm(`Delete ${product.name}? Past orders keep their receipt details.`)) return;
                  const res = await deleteProductAction(product.id);
                  if (!res.ok) return void toast.error(res.error);
                  toast("Product deleted");
                  router.replace("/admin/products");
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
