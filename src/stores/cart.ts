"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProductVisual } from "@/lib/db/schema";

export type CartLine = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  visual: ProductVisual;
  quantity: number;
  selections: Record<string, number[]>;
  unitPriceCents: number;
  optionLabels: string[];
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  lastAddedKey: string | null;
  add: (line: CartLine) => void;
  setQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replace: (lines: CartLine[]) => void;
  merge: (lines: CartLine[]) => void;
  setOpen: (open: boolean) => void;
};

const MAX_QTY = 20;

const safeStorage = createJSONStorage(() => {
  try {
    const k = "__arc_probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  }
});

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      lastAddedKey: null,
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.key === line.key);
          const lines = existing
            ? s.lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity), unitPriceCents: line.unitPriceCents } : l))
            : [...s.lines, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }].slice(-30);
          return { lines, open: true, lastAddedKey: line.key };
        }),
      setQuantity: (key, qty) =>
        set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, qty) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      replace: (lines) => set({ lines }),
      merge: (incoming) =>
        set((s) => {
          const map = new Map(s.lines.map((l) => [l.key, l]));
          for (const l of incoming) if (!map.has(l.key)) map.set(l.key, l);
          return { lines: Array.from(map.values()).slice(-30) };
        }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "arc-bag-v1",
      storage: safeStorage,
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);

/** True once the persisted bag has been read from storage (always false during SSR). */
export function useCartHydrated() {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
