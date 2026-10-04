"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, Boxes, ClipboardList, Coffee, ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Percent, ScrollText, SlidersHorizontal, Truck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/Logo";
import { signOutAction } from "@/server/actions/auth";
import { cn, formatRelative, initials } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, role: "staff" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, role: "staff", badge: true },
  { href: "/admin/products", label: "Products", icon: Coffee, role: "admin" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, role: "admin" },
  { href: "/admin/customizations", label: "Customizations", icon: SlidersHorizontal, role: "admin" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, role: "staff" },
  { href: "/admin/customers", label: "Customers", icon: Users, role: "admin" },
  { href: "/admin/delivery", label: "Delivery", icon: Truck, role: "admin" },
  { href: "/admin/discounts", label: "Discounts", icon: Percent, role: "admin" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, role: "admin" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, role: "admin" },
] as const;

type Feed = { unread: { id: string; title: string; body: string; href: string | null; createdAt: string }[]; pending: number };

export function AdminShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed>({ unread: [], pending: 0 });
  const [bell, setBell] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feed", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Feed;
      if (seen.current) {
        const fresh = data.unread.filter((n) => !seen.current!.has(n.id));
        fresh.forEach((n) =>
          toast(n.title, {
            description: n.body,
            duration: 12000,
            action: n.href ? { label: "Open", onClick: () => router.push(n.href!) } : undefined,
          }),
        );
        if (fresh.length) router.refresh();
      }
      seen.current = new Set(data.unread.map((n) => n.id));
      setFeed(data);
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);
  useEffect(() => setOpen(false), [path]);

  const nav = NAV.filter((n) => n.role === "staff" || user.role === "admin");
  const side = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-5 py-6">
        <LogoMark className="h-8 w-8" />
        <span className="leading-none">
          <span className="block font-display text-xl text-cream">All Ready</span>
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-caramel-light">Business</span>
        </span>
      </Link>
      <nav aria-label="Admin" className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map(({ href, label, icon: Icon, ...rest }) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.86rem] transition-colors", active ? "text-cream" : "text-cream/55 hover:bg-cream/[0.03] hover:text-cream")}>
              {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl border border-cream/10 bg-cream/[0.06]" transition={{ type: "spring", stiffness: 400, damping: 36 }} />}
              <Icon className="relative h-4 w-4" />
              <span className="relative flex-1">{label}</span>
              {"badge" in rest && feed.pending > 0 && <span className="relative rounded-full bg-caramel px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-ink">{feed.pending}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-cream/[0.06] p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.84rem] text-cream/55 hover:text-cream"><ExternalLink className="h-4 w-4" /> View storefront</Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 bg-roast font-mono text-[0.66rem]">{initials(user.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.82rem] text-cream">{user.name}</span>
            <span className="block truncate text-[0.7rem] capitalize text-cream/40">{user.role === "admin" ? "Owner" : "Staff"}</span>
          </span>
          <form action={signOutAction}>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-cream/45 hover:bg-cream/[0.06] hover:text-cream" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#0d0a08]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-cream/[0.06] bg-ink lg:block">{side}</aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-72 border-r border-cream/10 bg-ink" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 34, stiffness: 320 }} role="dialog" aria-label="Navigation">
              <button className="absolute right-3 top-6 flex h-9 w-9 items-center justify-center rounded-full text-cream/60" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-4 w-4" /></button>
              {side}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-cream/[0.06] bg-[#0d0a08]/85 px-4 backdrop-blur-xl md:px-8">
          <button className="flex h-10 w-10 items-center justify-center rounded-full text-cream lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <p className="hidden font-mono text-[0.68rem] uppercase tracking-[0.2em] text-cream/35 md:block">
            {feed.pending > 0 ? <span className="text-caramel-light">{feed.pending} order{feed.pending > 1 ? "s" : ""} awaiting acceptance</span> : "All caught up"}
          </p>
          <div className="relative">
            <button onClick={() => setBell((b) => !b)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-cream/75 hover:bg-cream/[0.06] hover:text-cream" aria-label={`Order alerts, ${feed.unread.length} new`} aria-expanded={bell}>
              <Bell className="h-[1.1rem] w-[1.1rem]" />
              {feed.unread.length > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-caramel px-1 font-mono text-[0.58rem] font-bold text-ink">{feed.unread.length}</span>}
            </button>
            <AnimatePresence>
              {bell && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-12 w-[22rem] overflow-hidden rounded-2xl border border-cream/10 bg-espresso shadow-2xl" role="dialog" aria-label="Order alerts">
                  <p className="border-b border-cream/[0.07] px-4 py-3 text-[0.86rem] text-cream">New orders</p>
                  {feed.unread.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[0.84rem] text-cream/45">No new orders. We&apos;ll ping you the moment one lands.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto">
                      {feed.unread.map((n) => (
                        <li key={n.id}>
                          <Link href={n.href ?? "/admin/orders"} onClick={() => setBell(false)} className="block border-b border-cream/[0.05] px-4 py-3 hover:bg-cream/[0.03]">
                            <p className="text-[0.86rem] text-cream">{n.title}</p>
                            <p className="mt-0.5 truncate text-[0.78rem] text-cream/50">{n.body}</p>
                            <p className="mt-1 font-mono text-[0.64rem] text-cream/30">{formatRelative(n.createdAt)}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <main id="main" className="px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
