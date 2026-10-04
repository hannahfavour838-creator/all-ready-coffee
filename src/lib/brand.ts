/** Brand constants. All business details are fictional and used for this portfolio project only. */
export const BRAND = {
  name: "All Ready Coffee",
  shortName: "All Ready",
  slogan: "Always ready. Never rushed.",
  description:
    "All Ready Coffee is a Portland specialty coffee house delivering hand-pulled espresso, slow-steeped cold brew and signature lattes to your door — crafted to order, ready when you are.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "hello@allreadycoffee.com",
  phone: "(503) 555-0142",
  phoneHref: "tel:+15035550142",
  whatsapp: "+1 (503) 555-0147",
  whatsappHref: "https://wa.me/15035550147",
  address: {
    street: "88 Roastery Row, Suite 2",
    city: "Portland",
    region: "OR",
    postalCode: "97209",
    country: "US",
  },
  hours: [
    { days: "Monday – Friday", open: "6:30 AM", close: "7:00 PM" },
    { days: "Saturday – Sunday", open: "7:30 AM", close: "6:00 PM" },
  ],
  social: {
    instagram: "https://instagram.com/allreadycoffee",
  },
} as const;

export const DEMO_NOTICE =
  "Portfolio demonstration. Business details, testimonials and payments on this site are fictional — no real money is processed.";
