import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms", description: "Terms of use for the All Ready Coffee portfolio demonstration.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <article className="container max-w-3xl pt-[calc(var(--header-h)+3rem)]">
      <p className="eyebrow mb-5">Terms</p>
      <h1 className="font-display text-display-lg text-cream">The fine print, kept short.</h1>
      <div className="mt-10 space-y-6 text-[1rem] leading-relaxed text-cream/65">
        <p>All Ready Coffee is a fictional brand created for a portfolio project. Orders placed here are demonstrations: no drinks are made, no couriers are dispatched and no money is charged.</p>
        <p>Delivery times shown are estimates for demonstration purposes and are never guaranteed.</p>
        <p>Please don&apos;t enter real card details. Use the published test card 4242 4242 4242 4242 with any future expiry date and any CVC.</p>
      </div>
    </article>
  );
}
