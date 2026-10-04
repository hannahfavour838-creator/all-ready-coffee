import { Reveal } from "@/components/motion/Reveal";

const QUOTES = [
  { q: "The Signature Latte is the first thing I think about on Monday mornings. It shows up hot, perfectly sealed, and somehow still has latte art.", n: "Maya R.", r: "Pearl District" },
  { q: "I've tracked a lot of deliveries. This is the only one where I actually enjoy watching the status change — it's honestly part of the ritual.", n: "Theo K.", r: "Goose Hollow" },
  { q: "Their cold brew is smooth enough to drink black, and the salted caramel cream is dangerous. Our whole studio orders twice a week.", n: "Iris & Owen", r: "Central Eastside" },
];

export function Testimonials() {
  return (
    <section className="relative py-24 md:py-32" aria-labelledby="proof-title">
      <div className="container">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-5">Kind words</p>
            <h2 id="proof-title" className="font-display text-display-lg text-cream">Loved across<br />the river.</h2>
          </div>
          <p className="max-w-xs text-[0.78rem] text-cream/35">Illustrative testimonials created for this portfolio demonstration.</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {QUOTES.map((t, i) => (
            <Reveal key={t.n} delay={i * 0.1} className="flex flex-col justify-between rounded-[1.75rem] border border-cream/[0.07] bg-gradient-to-b from-roast/40 to-transparent p-8">
              <blockquote>
                <span aria-hidden className="font-display text-6xl leading-none text-caramel/60">&ldquo;</span>
                <p className="-mt-4 font-display text-[1.6rem] leading-[1.25] text-cream/90">{t.q}</p>
              </blockquote>
              <p className="mt-10 text-[0.84rem] text-cream/50"><span className="text-cream/80">{t.n}</span> · {t.r}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
