import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", description: "How All Ready Coffee handles your information in this portfolio demonstration.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl pt-[calc(var(--header-h)+3rem)]">
      <p className="eyebrow mb-5">Privacy</p>
      <h1 className="font-display text-display-lg text-cream">Your data, handled with care.</h1>
      <div className="mt-10 space-y-6 text-[1rem] leading-relaxed text-cream/65">
        <p>This site is a portfolio demonstration. Business details are fictional and no real orders are fulfilled or charged.</p>
        <p><strong className="font-medium text-cream">What we store:</strong> your name, email, optional phone number, saved delivery addresses, favorites and order history — only what&apos;s needed to run your account.</p>
        <p><strong className="font-medium text-cream">Payments:</strong> checkout is simulated. Card numbers never leave your browser; we keep only the card brand and last four digits as a receipt reference.</p>
        <p><strong className="font-medium text-cream">Security:</strong> passwords are hashed with scrypt, sessions use secure HTTP-only cookies, and every account action is authorized on the server.</p>
        <p><strong className="font-medium text-cream">Your choices:</strong> you can edit your profile, remove addresses, and permanently delete your account from Settings at any time.</p>
      </div>
    </article>
  );
}
