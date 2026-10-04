import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const display = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: "All Ready Coffee — Specialty Coffee Delivered in Portland",
    template: "%s · All Ready Coffee",
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ["specialty coffee", "coffee delivery Portland", "espresso", "cold brew", "latte", "iced coffee", "Pearl District coffee", "coffee shop near me"],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: "en_US",
    url: "/",
    title: "All Ready Coffee — Always ready. Never rushed.",
    description: BRAND.description,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "All Ready Coffee — an iced signature latte on a dark stone pedestal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "All Ready Coffee — Always ready. Never rushed.",
    description: BRAND.description,
    images: ["/brand/og.png"],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0907",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: BRAND.name,
    slogan: BRAND.slogan,
    description: BRAND.description,
    url: BRAND.url,
    telephone: "+1-503-555-0142",
    email: BRAND.email,
    image: `${BRAND.url}/brand/og.png`,
    logo: `${BRAND.url}/brand/icon-512.png`,
    servesCuisine: ["Coffee", "Espresso", "Pastries"],
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND.address.street,
      addressLocality: BRAND.address.city,
      addressRegion: BRAND.address.region,
      postalCode: BRAND.address.postalCode,
      addressCountry: BRAND.address.country,
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "06:30", closes: "19:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "07:30", closes: "18:00" },
    ],
    hasMenu: `${BRAND.url}/menu`,
  };

  return (
    <html lang="en-US" className={`${display.variable} ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "!bg-espresso !border !border-cream/10 !text-cream !rounded-2xl !shadow-2xl",
              description: "!text-cream/60",
              actionButton: "!bg-cream !text-espresso",
            },
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
