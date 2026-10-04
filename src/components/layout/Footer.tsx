import Link from "next/link";
import { Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { BRAND, DEMO_NOTICE } from "@/lib/brand";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-cream/[0.07] bg-espresso/60">
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-caramel/[0.06] blur-3xl" />
      <div className="container relative grid gap-14 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-6 max-w-xs font-display text-3xl leading-tight text-cream/90">{BRAND.slogan}</p>
          <p className="mt-4 max-w-xs text-[0.88rem] leading-relaxed text-cream/50">Specialty coffee roasted in Portland and delivered across the city, crafted to order every time.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 md:col-span-4">
          <div>
            <p className="eyebrow mb-5">Explore</p>
            <ul className="space-y-3 text-[0.9rem] text-cream/65">
              <li><Link className="link-underline hover:text-cream" href="/menu">Menu</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/menu#signature">Signature drinks</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/story">Our story</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/delivery">Delivery</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/contact">Visit & contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5">Account</p>
            <ul className="space-y-3 text-[0.9rem] text-cream/65">
              <li><Link className="link-underline hover:text-cream" href="/sign-in">Sign in</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/sign-up">Create account</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/account/orders">Track an order</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/privacy">Privacy</Link></li>
              <li><Link className="link-underline hover:text-cream" href="/terms">Terms</Link></li>
            </ul>
          </div>
        </nav>
        <div className="md:col-span-4">
          <p className="eyebrow mb-5">The café</p>
          <address className="space-y-3 text-[0.9rem] not-italic text-cream/65">
            <p className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-caramel-light" />{BRAND.address.street}<br />{BRAND.address.city}, {BRAND.address.region} {BRAND.address.postalCode}</p>
            <p className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-caramel-light" /><a className="link-underline hover:text-cream" href={BRAND.phoneHref}>{BRAND.phone}</a></p>
            <p className="flex gap-3"><MessageCircle className="h-4 w-4 shrink-0 text-caramel-light" /><a className="link-underline hover:text-cream" href={BRAND.whatsappHref} rel="noopener noreferrer" target="_blank">WhatsApp {BRAND.whatsapp}</a></p>
            <p className="flex gap-3"><Instagram className="h-4 w-4 shrink-0 text-caramel-light" /><a className="link-underline hover:text-cream" href={BRAND.social.instagram} rel="noopener noreferrer" target="_blank">@allreadycoffee</a></p>
          </address>
          <ul className="mt-6 space-y-1 text-[0.82rem] text-cream/45">
            {BRAND.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4 border-b border-cream/[0.05] py-1.5"><span>{h.days}</span><span className="tabular">{h.open} – {h.close}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container relative flex flex-col gap-3 border-t border-cream/[0.06] py-8 text-[0.76rem] text-cream/35 md:flex-row md:items-center md:justify-between">
        <p>© {year} All Ready Coffee. All rights reserved.</p>
        <p className="max-w-xl md:text-right">{DEMO_NOTICE}</p>
      </div>
    </footer>
  );
}
