import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/menu/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/misc";
import type { MenuProduct } from "@/server/queries/catalog";

export function SignatureShowcase({ products }: { products: MenuProduct[] }) {
  const [lead, ...rest] = products;
  if (!lead) return null;
  return (
    <section className="relative py-24 md:py-32" aria-labelledby="signature-title">
      <div className="container">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading eyebrow="Signature coffee" title={<span id="signature-title">The ones people<br /><em className="text-caramel-light">come back for.</em></span>} />
          <ButtonLink href="/menu" variant="outline" className="self-start md:self-auto">
            Full menu <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="mt-16 grid gap-x-6 gap-y-14 md:grid-cols-12">
          <Reveal className="md:col-span-6 md:row-span-2">
            <ProductCard product={lead} size="lg" priority />
            <p className="mt-4 max-w-md px-1 text-[0.92rem] leading-relaxed text-cream/55">{lead.description}</p>
          </Reveal>
          {rest.slice(0, 4).map((p, i) => (
            <Reveal key={p.id} delay={0.08 * (i + 1)} className="md:col-span-3">
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
