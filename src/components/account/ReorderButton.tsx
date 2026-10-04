"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { reorderAction } from "@/server/actions/cart";
import { useCart } from "@/stores/cart";
import { Spinner } from "@/components/ui/button";

export function ReorderButton({ number }: { number: string }) {
  const [pending, start] = useTransition();
  const add = useCart((s) => s.add);
  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await reorderAction(number);
          if (!res.ok) return void toast.error(res.error);
          if (!res.data.lines.length) return void toast("Those items aren't available right now.");
          res.data.lines.forEach((l) => add(l));
          if (res.data.skipped) toast(`${res.data.skipped} item${res.data.skipped > 1 ? "s" : ""} couldn't be added — no longer available.`);
        })
      }
      disabled={pending}
      className="flex h-9 items-center gap-1.5 rounded-full border border-cream/15 px-3.5 text-[0.78rem] text-cream/75 transition hover:border-cream/40 hover:text-cream disabled:opacity-50"
      aria-label={`Reorder ${number}`}
    >
      {pending ? <Spinner className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />} Reorder
    </button>
  );
}
