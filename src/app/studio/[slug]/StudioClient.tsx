"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ProductVisual } from "@/lib/db/schema";
import { hero } from "@/components/hero/store";

const StudioCanvas = dynamic(() => import("@/components/studio/StudioCanvas").then((m) => m.StudioCanvas), { ssr: false });
const HeroCanvas = dynamic(() => import("@/components/hero/HeroCanvas"), { ssr: false });

export function StudioClient({ visual, hero: isHero }: { visual?: ProductVisual; hero?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isHero) return;
    const p = Number(new URLSearchParams(window.location.search).get("p") ?? "1");
    hero.target = p;
    hero.p = p;
  }, [isHero]);
  if (isHero) {
    return (
      <div id="studio" data-ready={ready ? "1" : "0"} style={{ position: "relative", width: "100vw", height: "100vh", background: "#0b0807" }}>
        <HeroCanvas tier="high" active onReady={() => setTimeout(() => setReady(true), 1500)} />
      </div>
    );
  }
  return (
    <div style={{ background: "transparent" }}>
      <style>{"html,body{background:transparent!important}"}</style>
      {visual && <StudioCanvas visual={visual} />}
    </div>
  );
}
