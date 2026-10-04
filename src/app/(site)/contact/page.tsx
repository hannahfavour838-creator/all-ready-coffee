import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Visit & Contact",
  description: "Visit All Ready Coffee at 88 Roastery Row in Portland's Pearl District, or reach us by phone, WhatsApp or email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const items = [
    { icon: MapPin, label: "Café & roastery", value: `${BRAND.address.street}, ${BRAND.address.city}, ${BRAND.address.region} ${BRAND.address.postalCode}`, href: undefined },
    { icon: Phone, label: "Phone", value: BRAND.phone, href: BRAND.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: BRAND.whatsapp, href: BRAND.whatsappHref },
    { icon: Mail, label: "Email", value: BRAND.email, href: `mailto:${BRAND.email}` },
  ];
  return (
    <div className="pt-[calc(var(--header-h)+3rem)]">
      <section className="container">
        <p className="eyebrow mb-5">Visit & contact</p>
        <h1 className="font-display text-display-xl text-cream">Come say hello.</h1>
      </section>
      <section className="container mt-16 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <ul className="divide-y divide-cream/[0.07] border-y border-cream/[0.07]">
          {items.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="flex items-start gap-5 py-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream/10 bg-roast/60"><Icon className="h-4 w-4 text-caramel-light" /></span>
              <div>
                <p className="eyebrow mb-2">{label}</p>
                {href ? <a href={href} className="link-underline font-display text-3xl text-cream" target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>{value}</a> : <p className="font-display text-3xl text-cream">{value}</p>}
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-[2rem] border border-cream/[0.08] bg-gradient-to-b from-roast/60 to-espresso/60 p-8 md:p-10">
          <p className="eyebrow mb-6">Hours</p>
          <ul className="space-y-4">
            {BRAND.hours.map((h) => (
              <li key={h.days} className="flex items-baseline justify-between gap-6 border-b border-cream/[0.07] pb-4">
                <span className="text-[1rem] text-cream/80">{h.days}</span>
                <span className="font-display text-2xl tabular text-cream">{h.open} – {h.close}</span>
              </li>
            ))}
          </ul>
          <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-2xl border border-cream/[0.07] bg-ink" aria-label="Stylised map of the Pearl District showing All Ready Coffee" role="img">
            <svg viewBox="0 0 400 250" className="h-full w-full">
              <rect width="400" height="250" fill="#120d0a" />
              {Array.from({ length: 12 }).map((_, i) => <line key={`v${i}`} x1={i * 36 + 10} y1="0" x2={i * 36 - 20} y2="250" stroke="#f1e8d9" strokeOpacity="0.06" strokeWidth={i % 4 === 0 ? 3 : 1} />)}
              {Array.from({ length: 8 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 34 + 8} x2="400" y2={i * 34 + 20} stroke="#f1e8d9" strokeOpacity="0.06" strokeWidth={i % 3 === 0 ? 3 : 1} />)}
              <path d="M0 210 C 120 190, 220 240, 400 200" stroke="#c08d58" strokeOpacity="0.25" strokeWidth="14" fill="none" />
              <circle cx="212" cy="118" r="26" fill="#c08d58" fillOpacity="0.12" className="animate-pulse" />
              <circle cx="212" cy="118" r="7" fill="#c08d58" />
              <text x="226" y="112" fill="#f1e8d9" fontSize="12" fontFamily="serif">All Ready Coffee</text>
              <text x="226" y="128" fill="#f1e8d9" fillOpacity="0.5" fontSize="9" fontFamily="monospace">88 ROASTERY ROW</text>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
