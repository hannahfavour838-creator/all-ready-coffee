import Image from "next/image";
import type { ProductVisual } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/** Product imagery: studio render / uploaded photo, or an elegant vector fallback generated from the drink's recipe. */
export function ProductImage({ src, visual, alt, className, sizes = "(min-width: 1024px) 25vw, 50vw", priority }: { src: string | null; visual: ProductVisual; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]" />
      ) : (
        <ProductVisualSvg visual={visual} label={alt} />
      )}
    </div>
  );
}

export function ProductVisualSvg({ visual, label }: { visual: ProductVisual; label: string }) {
  const layers = visual.layers?.length ? visual.layers : [visual.liquid];
  const id = `g-${label.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
  const tall = visual.vessel === "tall" || visual.vessel === "tumbler";
  const glass = tall
    ? { x: 70, y: 40, w: 100, h: 170, r: 10 }
    : visual.vessel === "demitasse"
      ? { x: 80, y: 110, w: 80, h: 70, r: 26 }
      : { x: 62, y: 80, w: 116, h: 110, r: 34 };
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          {layers.map((c, i) => (
            <stop key={i} offset={`${(i / Math.max(1, layers.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#c08d58" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c08d58" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="150" rx="110" ry="80" fill={`url(#${id}-glow)`} />
      <ellipse cx="120" cy={glass.y + glass.h + 8} rx={glass.w * 0.62} ry="7" fill="#000" opacity="0.45" />
      {visual.vessel === "pastry" ? (
        <g>
          <path d="M50 150 C 70 95, 170 95, 190 150 C 160 172, 80 172, 50 150 Z" fill={visual.liquid} />
          <path d="M70 140 C 90 110, 150 110, 170 140" stroke={visual.top} strokeWidth="6" fill="none" opacity="0.7" strokeLinecap="round" />
          <path d="M85 150 C 100 128, 140 128, 155 150" stroke="#3a1c0e" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        </g>
      ) : (
        <g>
          <rect x={glass.x} y={glass.y} width={glass.w} height={glass.h} rx={glass.r} fill="#f1e8d9" fillOpacity={tall ? 0.08 : 0.92} stroke="#f1e8d9" strokeOpacity={tall ? 0.35 : 0} />
          <rect x={glass.x + 6} y={glass.y + (tall ? 22 : 10)} width={glass.w - 12} height={glass.h - (tall ? 28 : 16)} rx={Math.max(4, glass.r - 6)} fill={`url(#${id})`} />
          <ellipse cx="120" cy={glass.y + (tall ? 22 : 10)} rx={(glass.w - 12) / 2} ry="7" fill={visual.top} />
          {visual.ice && [0, 1, 2].map((i) => <rect key={i} x={glass.x + 14 + i * 26} y={glass.y + 26 + (i % 2) * 14} width="24" height="22" rx="5" fill="#fff" fillOpacity="0.22" stroke="#fff" strokeOpacity="0.4" />)}
          {!tall && visual.vessel !== "demitasse" && <path d={`M${glass.x + glass.w} ${glass.y + 30} c 34 0, 34 50, 0 50`} stroke="#f1e8d9" strokeWidth="9" fill="none" opacity="0.92" />}
          {visual.toppings?.includes("caramel") && <path d={`M${glass.x + 14} ${glass.y + 30} q 20 18 40 0 t 40 0`} stroke="#b8732f" strokeWidth="4" fill="none" strokeLinecap="round" />}
        </g>
      )}
    </svg>
  );
}
