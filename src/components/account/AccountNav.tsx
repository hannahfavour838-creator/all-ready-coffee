"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, MapPin, Package, Settings, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Overview", icon: Home },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/favorites", label: "Favorites", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function AccountNav({ name }: { name: string }) {
  const path = usePathname();
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <p className="eyebrow mb-2 hidden lg:block">Your account</p>
      <p className="mb-8 hidden font-display text-3xl text-cream lg:block">{name.split(" ")[0]}</p>
      <nav aria-label="Account" className="scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/account" ? path === "/account" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("relative flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-[0.88rem] transition-colors lg:rounded-xl", active ? "text-cream" : "text-cream/55 hover:text-cream")}>
              {active && <motion.span layoutId="acct-nav" className="absolute inset-0 rounded-full border border-cream/10 bg-cream/[0.06] lg:rounded-xl" transition={{ type: "spring", stiffness: 400, damping: 36 }} />}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
