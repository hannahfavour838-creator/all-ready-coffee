import { WordReveal, Reveal } from "@/components/motion/Reveal";

export function BrandStatement() {
  return (
    <section id="after-hero" className="relative py-28 md:py-44" aria-labelledby="statement-title">
      <div className="container grid gap-14 md:grid-cols-12">
        <Reveal className="md:col-span-3">
          <p className="eyebrow">The All Ready way</p>
          <h2 id="statement-title" className="sr-only">About All Ready Coffee</h2>
        </Reveal>
        <div className="md:col-span-9">
          <WordReveal
            className="font-display text-[clamp(2rem,4.4vw,4.1rem)] leading-[1.08] tracking-[-0.015em] text-cream"
            text="We believe great coffee shouldn't make you wait — and should never be rushed. So we roast in small batches, grind for every single order, and hand the finished cup to a courier the moment it's ready."
          />
          <Reveal delay={0.2} className="mt-14 grid gap-8 border-t border-cream/[0.08] pt-10 sm:grid-cols-3">
            {[
              { k: "18 hrs", v: "Cold brew steep time" },
              { k: "28 sec", v: "Every espresso extraction" },
              { k: "≈ 30 min", v: "Typical door-to-cup time" },
            ].map((s) => (
              <div key={s.v}>
                <p className="font-display text-5xl text-cream">{s.k}</p>
                <p className="mt-2 text-[0.86rem] text-cream/50">{s.v}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
