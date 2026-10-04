import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/queries/catalog";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Internal render rig used by `npm run render:products`. Disabled unless ENABLE_STUDIO=1. */
export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.ENABLE_STUDIO !== "1") notFound();
  const { slug } = await params;
  if (slug === "__hero") return <StudioClient hero />;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  return <StudioClient visual={p.visual} />;
}
