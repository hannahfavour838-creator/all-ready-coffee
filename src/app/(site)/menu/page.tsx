import type { Metadata } from "next";
import { getMenu } from "@/server/queries/catalog";
import { ProductCard } from "@/components/menu/ProductCard";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { EmptyState } from "@/components/ui/misc";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Menu — Espresso, Cold Brew & Signature Lattes",
  description: "Explore the All Ready Coffee menu: hand-pulled espresso, 18-hour cold brew, signature lattes and fresh-baked croissants, delivered across Portland.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const menu = await getMenu();
  const total = menu.reduce((a, c) => a + c.products.length, 0);
  return (
    <div className="pt-[calc(var(--header-h)+3rem)]">
      <header className="container">
        <p className="eyebrow mb-5">The menu · {total} items</p>
        <h1 className="font-display text-display-xl text-cream">Crafted to order.<br /><em className="text-caramel-light">Ready when you are.</em></h1>
        <p className="mt-6 max-w-lg text-[1.02rem] leading-relaxed text-cream/60">Every drink is made the moment you order it, with house-made syrups, single-origin espresso and milk from a family dairy in the Willamette Valley.</p>
      </header>
      <CategoryNav categories={menu.map((c) => ({ slug: c.slug, name: c.name, count: c.products.length }))} />
      <div className="container space-y-28 pb-10 pt-6">
        {total === 0 && <EmptyState title="The bar is resetting" body="No drinks are available right now. Please check back in a few minutes." />}
        {menu.map((cat) => (
          <section key={cat.slug} id={cat.slug} aria-labelledby={`h-${cat.slug}`} className="scroll-mt-40">
            <div className="mb-12 flex flex-col justify-between gap-4 border-b border-cream/[0.07] pb-6 md:flex-row md:items-end">
              <h2 id={`h-${cat.slug}`} className="font-display text-display-md text-cream">{cat.name}</h2>
              <p className="max-w-md text-[0.92rem] text-cream/50">{cat.description}</p>
            </div>
            {cat.products.length === 0 ? (
              <EmptyState title="Nothing here today" body="Every item in this category is resting. Try another section of the menu." />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
                {cat.products.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.06}>
                    <ProductCard product={p} priority={i < 4 && cat.slug === menu[0]?.slug} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
