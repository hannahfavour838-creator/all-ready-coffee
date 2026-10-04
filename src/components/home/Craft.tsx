import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  { n: "01", title: "The bean", body: "We buy directly from two farms we've visited — Finca La Esperanza in Huila and the Hambela washing station in Guji — and pay well above Fair Trade minimums.", stat: "2 partner farms" },
  { n: "02", title: "The roast", body: "Roasted twice a week in 12 kg batches on a restored 1998 Probat, then rested five days so the flavors settle before they reach your cup.", stat: "Rested 5 days" },
  { n: "03", title: "The extraction", body: "Dialed in every morning by taste and refractometer. 1:2 ratio, 200°F, nine bars — we pour out shots that drift, every time.", stat: "1 : 2 ratio" },
  { n: "04", title: "The ingredients", body: "House-made syrups from real vanilla, cane sugar and cultured butter. No powders, no pumps of mystery flavoring. Ever.", stat: "0 artificial flavors" },
];

export function Craft() {
  return (
    <section className="relative py-24 md:py-36" aria-labelledby="craft-title">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow mb-5">Craftsmanship</p>
            <h2 id="craft-title" className="font-display text-display-lg text-cream">Fast is easy.<br /><em className="text-caramel-light">Ready is earned.</em></h2>
          </div>
          <p className="self-end text-[1.02rem] leading-relaxed text-cream/60 md:col-span-6 md:col-start-7">
            Speed is the last step, never the first. Everything before the courier picks up your order is deliberate, measured and done by hand.
          </p>
        </div>
        <ol className="mt-20 grid gap-px overflow-hidden rounded-[1.75rem] border border-cream/[0.07] bg-cream/[0.07] md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.08} className="group relative flex min-h-[22rem] flex-col bg-ink p-8 transition-colors duration-500 hover:bg-espresso">
              <span className="font-mono text-[0.72rem] tracking-[0.2em] text-caramel-light">{s.n}</span>
              <h3 className="mt-14 font-display text-[2.3rem] leading-none text-cream">{s.title}</h3>
              <p className="mt-5 text-[0.9rem] leading-relaxed text-cream/55">{s.body}</p>
              <p className="mt-auto pt-8 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cream/35 transition-colors group-hover:text-cream/70">{s.stat}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
