"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, ShoppingBag, User, LogOut, LayoutDashboard, Heart, Package, Settings } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cartCount, useCart, useCartHydrated } from "@/stores/cart";
import { cn, initials } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";
import { NotificationBell } from "./NotificationBell";

export type HeaderUser = { name: string; role: "customer" | "staff" | "admin" } | null;

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/story", label: "Our Story" },
  { href: "/delivery", label: "Delivery" },
];

export function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lines = useCart((s) => s.lines);
  const hydrated = useCartHydrated();
  const setOpen = useCart((s) => s.setOpen);
  const count = hydrated ? cartCount(lines) : 0;
  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      <a href="#main" className="sr-only z-[100] rounded-full bg-cream px-4 py-2 text-espresso focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
          scrolled || !overHero ? "border-b border-cream/[0.07] bg-ink/75 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" aria-label="All Ready Coffee — home" className="relative z-10 rounded-lg">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative rounded-full px-4 py-2 text-[0.88rem] transition-colors duration-300", active ? "text-cream" : "text-cream/65 hover:text-cream")}
                >
                  {n.label}
                  {active && <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-caramel" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <NotificationBell />
                <AccountMenu user={user} />
              </>
            ) : (
              <Link href="/sign-in" className="hidden rounded-full px-4 py-2 text-[0.88rem] text-cream/70 transition-colors hover:text-cream md:inline-flex">
                Sign in
              </Link>
            )}
            <button
              onClick={() => setOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-cream/80 transition hover:bg-cream/[0.06] hover:text-cream"
              aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-[1.15rem] w-[1.15rem]" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-caramel px-1 font-mono text-[0.62rem] font-semibold text-ink"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <ButtonLink href="/menu" size="sm" className="ml-1.5 hidden sm:inline-flex">
              Order now
            </ButtonLink>
            <button onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-cream md:hidden" aria-label="Open menu">
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col p-6">
          {NAV.map((n, i) => (
            <motion.div key={n.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i + 0.1 }}>
              <Link href={n.href} className="block border-b border-cream/[0.07] py-5 font-display text-4xl text-cream">
                {n.label}
              </Link>
            </motion.div>
          ))}
          {user ? (
            <>
              <Link href="/account" className="block border-b border-cream/[0.07] py-5 font-display text-4xl text-cream">Account</Link>
              {user.role !== "customer" && <Link href="/admin" className="block border-b border-cream/[0.07] py-5 font-display text-4xl text-cream">Dashboard</Link>}
            </>
          ) : (
            <Link href="/sign-in" className="block border-b border-cream/[0.07] py-5 font-display text-4xl text-cream">Sign in</Link>
          )}
          <ButtonLink href="/menu" size="lg" className="mt-10 w-full">Order now</ButtonLink>
          {user && (
            <form action={signOutAction} onSubmit={() => useCart.getState().clear()} className="mt-4">
              <button className="w-full rounded-full py-3 text-[0.9rem] text-cream/60 hover:text-cream">Sign out</button>
            </form>
          )}
        </nav>
      </Sheet>
    </>
  );
}

function AccountMenu({ user }: { user: NonNullable<HeaderUser> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
  const items = [
    { href: "/account", label: "Overview", icon: User },
    { href: "/account/orders", label: "Orders", icon: Package },
    { href: "/account/favorites", label: "Favorites", icon: Heart },
    { href: "/account/settings", label: "Settings", icon: Settings },
  ];
  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 bg-roast font-mono text-[0.7rem] text-cream transition hover:border-cream/40"
        aria-label="Account menu"
      >
        {initials(user.name)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-cream/10 bg-espresso/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            <p className="px-3 pb-2 pt-2.5 text-[0.78rem] text-cream/45">Signed in as <span className="text-cream/80">{user.name}</span></p>
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.88rem] text-cream/80 transition hover:bg-cream/[0.06] hover:text-cream">
                <Icon className="h-4 w-4 text-cream/45" /> {label}
              </Link>
            ))}
            {user.role !== "customer" && (
              <Link href="/admin" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.88rem] text-caramel-light transition hover:bg-cream/[0.06]">
                <LayoutDashboard className="h-4 w-4" /> Business dashboard
              </Link>
            )}
            <form action={signOutAction} onSubmit={() => useCart.getState().clear()} className="mt-1 border-t border-cream/[0.07] pt-1">
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.88rem] text-cream/60 transition hover:bg-cream/[0.06] hover:text-cream">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
