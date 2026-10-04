import { HeroSection } from "@/components/hero/HeroSection";
import { BrandStatement } from "@/components/home/BrandStatement";
import { SignatureShowcase } from "@/components/home/SignatureShowcase";
import { MenuPreview } from "@/components/home/MenuPreview";
import { Craft } from "@/components/home/Craft";
import { DeliverySection } from "@/components/home/DeliverySection";
import { Testimonials } from "@/components/home/Testimonials";
import { FinalCta } from "@/components/home/FinalCta";
import { getActiveZones, getFeaturedProducts, getMenu } from "@/server/queries/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, menu, zones] = await Promise.all([getFeaturedProducts(8), getMenu(), getActiveZones()]);
  const signature = [
    ...featured.filter((p) => p.category.slug === "signature"),
    ...featured.filter((p) => p.category.slug !== "signature"),
  ];
  return (
    <>
      <HeroSection />
      <BrandStatement />
      <SignatureShowcase products={signature} />
      <MenuPreview categories={menu} />
      <Craft />
      <DeliverySection zones={zones.map((z) => ({ id: z.id, name: z.name, postalCodes: z.postalCodes, feeCents: z.feeCents, minOrderCents: z.minOrderCents, freeOverCents: z.freeOverCents, etaMinMinutes: z.etaMinMinutes, etaMaxMinutes: z.etaMaxMinutes }))} />
      <Testimonials />
      <FinalCta />
    </>
  );
}
