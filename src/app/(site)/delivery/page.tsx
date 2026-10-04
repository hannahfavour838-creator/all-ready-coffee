import type { Metadata } from "next";
import { getActiveZones, getSetting } from "@/server/queries/catalog";
import { ZipChecker } from "@/components/home/DeliverySection";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Coffee Delivery in Portland — Zones, Fees & Times",
  description: "All Ready Coffee delivers espresso, cold brew and pastries across the Pearl District, Downtown, Northwest, Central Eastside and North Portland. See fees and typical delivery times.",
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  const [zones, notice, paused] = await Promise.all([getActiveZones(), getSetting<string>("delivery_notice", ""), getSetting<boolean>("delivery_paused", false)]);
  return (
    <div className="pt-[calc(var(--header-h)+3rem)]">
      <section className="container grid gap-14 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-5">Delivery</p>
          <h1 className="font-display text-display-xl text-cream">Café quality,<br /><em className="text-caramel-light">at your door.</em></h1>
          <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-cream/60">We deliver from 7:00 AM until 30 minutes before close. Every order is made the moment the café accepts it, sealed, and handed straight to a courier.</p>
          {paused && <p role="status" className="mt-6 rounded-2xl border border-caramel/30 bg-caramel/10 px-5 py-4 text-[0.9rem] text-caramel-light">Delivery is paused for a few minutes while the café catches up. Pickup at the café is open as usual.</p>}
        </div>
        <div className="self-end rounded-[2rem] border border-cream/[0.08] bg-gradient-to-b from-roast/70 to-espresso/60 p-8">
          <p className="font-display text-3xl text-cream">Check your address</p>
          <p className="mb-6 mt-2 text-[0.86rem] text-cream/50">Enter a ZIP code to see if we cover it.</p>
          <ZipChecker zones={zones.map((z) => ({ id: z.id, name: z.name, postalCodes: z.postalCodes, feeCents: z.feeCents, minOrderCents: z.minOrderCents, freeOverCents: z.freeOverCents, etaMinMinutes: z.etaMinMinutes, etaMaxMinutes: z.etaMaxMinutes }))} />
        </div>
      </section>

      <section className="container mt-24" aria-labelledby="zones">
        <h2 id="zones" className="mb-8 font-display text-display-md text-cream">Delivery zones</h2>
        <div className="overflow-x-auto rounded-[1.5rem] border border-cream/[0.08]">
          <table className="w-full min-w-[640px] text-left text-[0.9rem]">
            <caption className="sr-only">Delivery zones, fees, minimums and typical delivery times</caption>
            <thead className="bg-espresso/70 text-[0.72rem] uppercase tracking-[0.16em] text-cream/45">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Neighborhood</th>
                <th scope="col" className="px-6 py-4 font-medium">ZIP codes</th>
                <th scope="col" className="px-6 py-4 font-medium">Fee</th>
                <th scope="col" className="px-6 py-4 font-medium">Minimum</th>
                <th scope="col" className="px-6 py-4 font-medium">Typical time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream/[0.06]">
              {zones.map((z) => (
                <tr key={z.id} className="transition-colors hover:bg-cream/[0.02]">
                  <th scope="row" className="px-6 py-5 font-normal text-cream">{z.name}</th>
                  <td className="px-6 py-5 font-mono text-[0.82rem] text-cream/60">{z.postalCodes.join(", ")}</td>
                  <td className="px-6 py-5 text-cream/80">{formatPrice(z.feeCents)}{z.freeOverCents ? <span className="block text-[0.76rem] text-cream/40">Free over {formatPrice(z.freeOverCents)}</span> : null}</td>
                  <td className="px-6 py-5 text-cream/80">{formatPrice(z.minOrderCents)}</td>
                  <td className="px-6 py-5 text-cream/80">{z.etaMinMinutes}–{z.etaMaxMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-[0.82rem] leading-relaxed text-cream/40">{notice} Times are typical estimates, not guarantees — weather, traffic and rush hours can add a few minutes, and your tracker always shows the latest estimate.</p>
      </section>

      <section className="container mt-24 grid gap-6 md:grid-cols-3">
        {[
          { t: "Hot stays hot", d: "Insulated sleeves and vented lids keep espresso drinks at drinking temperature for 30+ minutes." },
          { t: "Iced stays crisp", d: "Iced drinks travel in a separate chilled bag with ice packed apart, so nothing waters down." },
          { t: "Honest tracking", d: "You'll see when the café accepts, when your barista starts and when the courier leaves." },
        ].map((f) => (
          <div key={f.t} className="rounded-[1.5rem] border border-cream/[0.07] p-8">
            <p className="font-display text-3xl text-cream">{f.t}</p>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-cream/55">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
