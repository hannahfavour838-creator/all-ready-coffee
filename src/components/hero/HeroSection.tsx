"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { hero, type Tier } from "./store";
import { detectCapability } from "./quality";
import { CHAPTERS, window4 } from "./timeline";
import { BRAND } from "@/lib/brand";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

type Copy = { id: string; title: string; body: string; win: [number, number, number, number]; align?: "left" | "right" };

/** Supporting copy that rides over the 3D scene, faded precisely by scroll progress. */
const COPY: Copy[] = [
  { id: "bean", title: "Chosen bean by bean.", body: "Washed Colombian Huila and natural Ethiopian Guji, roasted in small batches every Tuesday and Friday in our Portland roastery.", win: [0.09, 0.12, 0.21, 0.25] },
  { id: "grind", title: "Ground the moment you order.", body: "Whole beans until the last second. Every shot is ground fresh on 64 mm conical burrs, so nothing sits and nothing goes stale.", win: [0.29, 0.32, 0.39, 0.42], align: "right" },
  { id: "espresso", title: "Pulled in twenty-eight seconds.", body: "Eighteen grams in, thirty-six out, at 200°F and nine bars of pressure. Thick crema, syrupy body, clean cocoa finish.", win: [0.47, 0.5, 0.55, 0.575] },
  { id: "milk", title: "Softened with silk.", body: "Cold whole milk from a family dairy in the Willamette Valley — or oat, almond and macadamia — poured until the layers bloom.", win: [0.575, 0.6, 0.64, 0.66], align: "right" },
  { id: "craft", title: "Finished with intention.", body: "House caramel cooked with cultured butter. Ceylon cinnamon. 72% Peruvian chocolate. Ice frozen slowly for crystal clarity.", win: [0.665, 0.69, 0.725, 0.745] },
  { id: "balance", title: "Every element, in balance.", body: "", win: [0.765, 0.79, 0.83, 0.85], align: "right" },
];

const STORY_VH = { desktop: 820, mobile: 700 };

export function HeroSection() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ webgl: boolean; tier: Tier } | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [active, setActive] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setCap(detectCapability());
    setMobile(window.matchMedia("(max-width: 767px)").matches);
    const t = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(t);
  }, []);

  hero.reducedMotion = reduced;
  const cinematic = !!cap && cap.webgl && !reduced;

  // Scroll → progress (GSAP ScrollTrigger keeps it exact through resizes and refreshes)
  useEffect(() => {
    if (!cinematic || !section.current) return;
    let killed = false;
    let cleanup = () => {};
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          hero.target = self.progress;
        },
      });
      hero.target = st.progress;
      cleanup = () => st.kill();
    })();
    return () => {
      killed = true;
      cleanup();
    };
  }, [cinematic]);

  // Pause the WebGL loop when the hero is off-screen.
  useEffect(() => {
    if (!section.current) return;
    const io = new IntersectionObserver(([e]) => setActive(!!e?.isIntersecting), { rootMargin: "100px" });
    io.observe(section.current);
    return () => io.disconnect();
  }, []);

  // Pointer parallax (fine pointers only)
  useEffect(() => {
    if (!cinematic || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      hero.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      hero.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [cinematic]);

  // DOM overlay sync — one rAF loop, no React re-renders.
  useEffect(() => {
    if (!cinematic) return;
    let raf = 0;
    const tick = () => {
      const p = hero.p;
      COPY.forEach((c, i) => {
        const el = copyRefs.current[i];
        if (!el) return;
        const a = window4(p, ...c.win);
        el.style.opacity = String(a);
        el.style.transform = `translate3d(0, ${(1 - a) * 18}px, 0)`;
        el.style.visibility = a > 0.01 ? "visible" : "hidden";
      });
      if (introRef.current) {
        const a = 1 - Math.min(1, p / 0.05);
        introRef.current.style.opacity = String(a);
        introRef.current.style.transform = `translate3d(0, ${-p * 600}px, 0)`;
        introRef.current.style.visibility = a > 0.01 ? "visible" : "hidden";
      }
      if (cueRef.current) cueRef.current.style.opacity = String(Math.max(0, 1 - p / 0.03));
      if (finalRef.current) {
        const a = window4(p, 0.935, 0.975, 2, 3);
        finalRef.current.style.opacity = String(a);
        finalRef.current.style.transform = `translate3d(0, ${(1 - a) * 24}px, 0)`;
        finalRef.current.style.visibility = a > 0.01 ? "visible" : "hidden";
      }
      if (railRef.current) {
        let idx = 0;
        CHAPTERS.forEach((c, i) => (p >= c.at - 0.02 ? (idx = i) : null));
        railRef.current.querySelectorAll("li").forEach((li, i) => li.toggleAttribute("data-active", i === idx));
        railRef.current.style.setProperty("--progress", String(p));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cinematic]);

  const jumpTo = useCallback((at: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.offsetTop + at * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  const onReady = useCallback(() => setReady(true), []);
  const showPoster = !cinematic || !ready;

  /* ───────── Static (reduced motion / no WebGL) composition ───────── */
  if (cap && !cinematic) {
    return <StaticHero reduced={reduced} />;
  }

  return (
    <section
      ref={section}
      id="experience"
      aria-label="The All Ready Coffee story"
      className="relative"
      style={{ height: `${mobile ? STORY_VH.mobile : STORY_VH.desktop}svh` }}
    >
      <a href="#after-hero" className="sr-only z-50 rounded-full bg-cream px-4 py-2 text-espresso focus:not-sr-only focus:fixed focus:left-4 focus:top-24">
        Skip the story
      </a>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-ink">
        {cap && cinematic && <HeroCanvas tier={cap.tier} active={active} onReady={onReady} />}

        {/* soft vignette + grain over the canvas for a filmic finish */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_45%,transparent_55%,rgba(5,4,3,0.55)_100%)]" />
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Poster / loader: brand environment visible from the very first paint */}
        <Poster visible={showPoster && !timedOut} />

        {/* Intro overlay */}
        <div ref={introRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <div className="container flex flex-col items-center gap-6 text-center">
            <p className="max-w-md text-[0.98rem] leading-relaxed text-cream/70 md:text-[1.06rem]">
              {BRAND.slogan} Specialty espresso, cold brew and signature lattes — crafted to order and delivered across Portland.
            </p>
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/menu" size="lg">
                Order now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href="/story" variant="outline" size="lg">
                Our story
              </ButtonLink>
            </div>
            <div ref={cueRef} className="mt-2 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.3em] text-cream/45">
              <ArrowDown className="h-3.5 w-3.5 animate-bounce" /> Scroll to brew
            </div>
          </div>
        </div>

        {/* Chapter copy */}
        {COPY.map((c, i) => (
          <div
            key={c.id}
            ref={(el) => void (copyRefs.current[i] = el)}
            className={cn(
              "pointer-events-none invisible absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] z-20 max-w-[22rem] px-5 opacity-0 md:bottom-16 md:max-w-sm md:px-0",
              c.align === "right" ? "right-0 text-right md:right-[clamp(2rem,6vw,7rem)]" : "left-0 md:left-[clamp(2rem,6vw,7rem)]",
            )}
          >
            <p className="eyebrow mb-3">{CHAPTERS.find((x) => x.id === c.id)?.index ?? "06"} — {CHAPTERS.find((x) => x.id === c.id)?.label ?? "Balance"}</p>
            <h2 className="sr-only">{c.title}</h2>
            {c.body && <p className="text-[0.95rem] leading-relaxed text-cream/75 [text-shadow:0_1px_18px_rgba(0,0,0,0.7)] md:text-[1.02rem]">{c.body}</p>}
          </div>
        ))}

        {/* Final CTA */}
        <div ref={finalRef} className="invisible absolute inset-x-0 bottom-0 z-20 pb-[max(2rem,env(safe-area-inset-bottom))] opacity-0 md:pb-14">
          <div className="container flex flex-col items-center gap-5 text-center">
            <h2 className="sr-only">Your coffee. Your moment.</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/menu" size="lg" variant="primary">
                Explore the menu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href="/delivery" size="lg" variant="outline">
                Delivery areas
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Chapter rail */}
        <nav aria-label="Story chapters" className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
          <ol ref={railRef} className="relative flex flex-col gap-3.5 border-r border-cream/10 pr-4">
            {CHAPTERS.map((c) => (
              <li key={c.id} className="group/rail flex justify-end">
                <button
                  type="button"
                  onClick={() => jumpTo(c.at + (c.id === "welcome" ? 0 : 0.015))}
                  className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-cream/30 transition-colors duration-300 hover:text-cream/80 group-data-[active]/rail:text-caramel-light"
                >
                  <span className="opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 group-data-[active]/rail:opacity-100">{c.label}</span>
                  <span className="tabular">{c.index}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}

function Poster({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center bg-[radial-gradient(70%_60%_at_50%_42%,#3a2416_0%,#1a110c_45%,#0b0807_100%)] transition-opacity duration-[1100ms] ease-out-expo",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="grain absolute inset-0" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <LogoMark className="mb-8 h-14 w-14 animate-fade-up" />
        <p className="eyebrow mb-5 animate-fade-up [animation-delay:120ms]">Portland, Oregon · Est. 2019</p>
        <h1 className="animate-fade-up font-display text-display-2xl text-cream [animation-delay:200ms]">
          <span className="block text-[0.32em] italic leading-none text-caramel-light">Welcome to</span>
          All Ready Coffee
        </h1>
        <div className="mt-10 h-px w-40 overflow-hidden bg-cream/10" role="progressbar" aria-label="Loading the experience">
          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-caramel-light to-transparent" />
        </div>
      </div>
    </div>
  );
}

function StaticHero({ reduced }: { reduced: boolean }) {
  return (
    <section id="experience" aria-label="Welcome" className="relative overflow-hidden bg-[radial-gradient(70%_60%_at_50%_40%,#3a2416_0%,#1a110c_45%,#0b0807_100%)] pb-24 pt-32 md:pt-40">
      <div className="grain absolute inset-0" />
      <div className="container relative grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow mb-6">Portland, Oregon · Est. 2019</p>
          <h1 className="font-display text-display-xl text-cream">
            <span className="block text-[0.36em] italic leading-tight text-caramel-light">Welcome to</span>
            All Ready Coffee
          </h1>
          <p className="mt-8 max-w-md text-[1.05rem] leading-relaxed text-cream/70">
            {BRAND.slogan} Specialty espresso, cold brew and signature lattes — crafted to order and delivered across Portland.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/menu" size="lg">Order now <ArrowRight className="h-4 w-4" /></ButtonLink>
            <ButtonLink href="/story" size="lg" variant="outline">Our story</ButtonLink>
          </div>
          {reduced && <p className="mt-6 text-[0.8rem] text-cream/40">Showing a still version because your device prefers reduced motion.</p>}
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
          <div className="absolute inset-8 rounded-full bg-caramel/15 blur-3xl" />
          <Image src="/brand/hero-still.webp" alt="An iced All Ready Signature Latte with caramel, cinnamon and ice on a dark stone pedestal" fill priority sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" />
        </div>
      </div>
      <ol className="container relative mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {COPY.filter((c) => c.body).map((c, i) => (
          <li key={c.id} className="rounded-2xl border border-cream/[0.08] bg-ink/30 p-6">
            <p className="eyebrow mb-3">0{i + 1}</p>
            <h2 className="font-display text-3xl text-cream">{c.title}</h2>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-cream/60">{c.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
