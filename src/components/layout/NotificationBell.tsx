"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { markNotificationsReadAction } from "@/server/actions/account";
import { cn, formatRelative } from "@/lib/utils";

type Item = { id: string; type: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };

/** Header notification centre with gentle polling and a single toast per new status update. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; unread: number };
      if (seen.current) {
        const fresh = data.items.filter((i) => !seen.current!.has(i.id) && !i.readAt);
        fresh.slice(0, 2).forEach((n) => toast(n.title, { description: n.body, action: n.href ? { label: "View", onClick: () => (window.location.href = n.href!) } : undefined }));
      }
      seen.current = new Set(data.items.map((i) => i.id));
      setItems(data.items);
      setUnread(data.unread);
      setLoaded(true);
    } catch {
      /* offline — try again next tick */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 20000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = async () => {
    setUnread(0);
    setItems((list) => list.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    await markNotificationsReadAction();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-cream/80 transition hover:bg-cream/[0.06] hover:text-cream"
      >
        <Bell className="h-[1.1rem] w-[1.1rem]" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-caramel" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-caramel" />
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-3 top-[calc(var(--header-h)+4px)] overflow-hidden rounded-2xl border border-cream/10 bg-espresso/95 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[23rem]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-cream/[0.07] px-4 py-3">
              <p className="text-[0.88rem] font-medium text-cream">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="flex items-center gap-1.5 text-[0.76rem] text-caramel-light hover:text-cream">
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {!loaded && (
                <li className="space-y-2 p-4">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-full" />
                </li>
              )}
              {loaded && items.length === 0 && (
                <li className="px-6 py-10 text-center">
                  <p className="font-display text-2xl text-cream">All caught up</p>
                  <p className="mt-1 text-[0.82rem] text-cream/45">Order updates will appear here the moment they happen.</p>
                </li>
              )}
              {items.map((n) => (
                <li key={n.id} className="border-b border-cream/[0.05] last:border-0">
                  <Link href={n.href ?? "/account"} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3.5 transition hover:bg-cream/[0.04]">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-cream/15" : "bg-caramel")} />
                    <span className="min-w-0">
                      <span className="block text-[0.86rem] text-cream">{n.title}</span>
                      <span className="mt-0.5 block text-[0.8rem] leading-snug text-cream/50">{n.body}</span>
                      <span className="mt-1 block font-mono text-[0.66rem] uppercase tracking-wider text-cream/30">{formatRelative(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
