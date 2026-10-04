import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, WordReveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Our Story — Small-Batch Coffee Roasted in Portland",
  description: "How All Ready Coffee started: a Pearl District coffee cart, a restored Probat roaster and a promise — always ready, never rushed.",
  alternates: { canonical: "/story" },
};

const TIMELINE = [
  { y: "2019", t: "A cart on Roastery Row", d: "Two baristas, one lever machine and a line that wrapped around the block every weekday at 7:40 AM." },
  { y: "2021", t: "The Probat", d: "We restored a 1998 Probat roaster and started roasting our own beans, twelve kilos at a time." },
  { y: "2023", t: "Direct trade", d: "First visits to Finca La Esperanza in Huila and Hambela in Guji. Handshake partnerships, multi-year commitments." },
  { y: "2025", t: "Delivery, done right", d: "Insulated sleeves, separate iced bags and honest live tracking. Café-quality coffee, at home." },
];

export default function StoryPage() {
  return (
    <div className="pt-[calc(var(--header-h)+3rem)]">
      <section className="container">
        <p className="eyebrow mb-5">Our story</p>
        <h1 className="max-w-5xl font-display text-display-xl text-cream">We named it All Ready because <em className="text-caramel-light">that&apos;s the promise.</em></h1>
      </section>

      <section className="container mt-20 grid gap-12 md:grid-cols-12">
        <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-cream/[0.07] bg-[radial-gradient(80%_60%_at_50%_70%,#432a1a_0%,#1d140f_58%,#110c0a_100%)] md:col-span-5">
          <Image src="/brand/hero-still.webp" alt="The All Ready Signature Latte" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-contain p-6" />
        </Reveal>
        <div className="space-y-6 self-end text-[1.05rem] leading-relaxed text-cream/65 md:col-span-6 md:col-start-7">
          <p>All Ready began as a coffee cart outside a Pearl District print shop. The idea was simple: the people in that morning line had somewhere to be, and they deserved a cup that was worth the wait — without the wait.</p>
          <p>So we built everything backwards from the moment you take your first sip. We prep what can be prepped, measure what should be measured, and never compromise on what can&apos;t be rushed: the roast, the rest, the extraction.</p>
          <p>Today we roast twice a week, grind for every order and deliver across five Portland neighborhoods. The cart is retired. The promise isn&apos;t.</p>
          <p className="font-display text-3xl italic text-cream">— Dana Whitfield, founder</p>
        </div>
      </section>

      <section className="container mt-36">
        <WordReveal className="max-w-5xl font-display text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.1] text-cream" text="Good coffee is a hundred small decisions made carefully, so that one big moment — yours — feels effortless." />
      </section>

      <section className="container mt-32" aria-labelledby="timeline">
        <h2 id="timeline" className="sr-only">Timeline</h2>
        <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-cream/[0.07] bg-cream/[0.07] md:grid-cols-4">
          {TIMELINE.map((e, i) => (
            <Reveal as="li" key={e.y} delay={i * 0.08} className="bg-ink p-8">
              <p className="font-display text-6xl text-caramel-light">{e.y}</p>
              <p className="mt-8 text-[1.05rem] text-cream">{e.t}</p>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-cream/50">{e.d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="container mt-32 flex flex-col items-start justify-between gap-8 border-t border-cream/[0.07] pt-14 md:flex-row md:items-center">
        <p className="font-display text-display-md text-cream">Taste the promise.</p>
        <ButtonLink href="/menu" size="lg">Explore the menu <ArrowRight className="h-4 w-4" /></ButtonLink>
      </section>
    </div>
  );
}
