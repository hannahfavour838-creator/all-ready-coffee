"use client";

import { useEffect, useRef } from "react";
import { useCart, useCartHydrated } from "@/stores/cart";
import { loadCartAction, syncCartAction } from "@/server/actions/cart";

/** Keeps a signed-in customer's bag in sync with the server so it follows them across devices. */
export function CartSync({ userId }: { userId: string | null }) {
  const hydrated = useCartHydrated();
  const merged = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !hydrated || merged.current === userId) return;
    merged.current = userId;
    loadCartAction().then((res) => {
      if (res.ok && res.data.lines.length) useCart.getState().merge(res.data.lines);
    });
  }, [userId, hydrated]);

  useEffect(() => {
    if (!userId) return;
    let timer: number | undefined;
    const unsub = useCart.subscribe((state, prev) => {
      if (state.lines === prev.lines || merged.current !== userId) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        syncCartAction(state.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections }))).catch(() => {});
      }, 800);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [userId]);

  return null;
}
