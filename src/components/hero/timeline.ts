/**
 * The hero is one continuous story driven by a single normalized scroll progress `p` ∈ [0, 1].
 * Every object reads its own sub-range from here, so the choreography lives in one place.
 */
export type Range = readonly [number, number];

export const T = {
  intro: [0.0, 0.08],
  fall: [0.03, 0.27],
  hopperSettle: [0.22, 0.3],
  grind: [0.28, 0.41],
  grounds: [0.3, 0.43],
  portafilterMove: [0.41, 0.47],
  espresso: [0.46, 0.57],
  milk: [0.56, 0.66],
  ingredients: [0.64, 0.76],
  splash: [0.735, 0.85],
  reveal: [0.83, 0.93],
  final: [0.9, 1.0],
} as const satisfies Record<string, Range>;

export const CHAPTERS = [
  { id: "welcome", at: 0.0, index: "00", label: "Welcome", eyebrow: "All Ready Coffee · Portland, Oregon" },
  { id: "bean", at: 0.12, index: "01", label: "The bean", eyebrow: "Origin" },
  { id: "grind", at: 0.32, index: "02", label: "The grind", eyebrow: "Ground to order" },
  { id: "espresso", at: 0.5, index: "03", label: "Espresso", eyebrow: "Extraction" },
  { id: "milk", at: 0.6, index: "04", label: "Milk", eyebrow: "Texture" },
  { id: "craft", at: 0.7, index: "05", label: "Craft", eyebrow: "Ingredients" },
  { id: "splash", at: 0.79, index: "06", label: "Balance", eyebrow: "The moment" },
  { id: "cup", at: 0.95, index: "07", label: "Your cup", eyebrow: "Ready" },
] as const;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sub = (p: number, r: Range) => clamp01((p - r[0]) / (r[1] - r[0]));
export const inRange = (p: number, r: Range, pad = 0) => p >= r[0] - pad && p <= r[1] + pad;

export const ease = {
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/** Fade-in over [a,b], hold, fade-out over [c,d]. */
export function window4(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p <= c) return 1;
  return 1 - (p - c) / (d - c);
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* World layout (units ≈ decimetres) */
export const LAYOUT = {
  hopper: { x: -1.75, z: 0, y0: 5.55, y1: 7.45, r0: 0.3, r1: 1.0 },
  grinderBase: { x: -1.75, z: 0 },
  chute: { x: -1.75, y: 3.79, z: 0.9 },
  basketUnderChute: { x: -1.75, y: 3.1, z: 1.02 },
  groupHead: { x: 0, y: 3.62, z: 0 },
  basketLocked: { x: 0, y: 3.36, z: 0 },
  glass: { x: 0, y: 0, z: 0, height: 2.5, rInner: 0.7, rOuter: 0.78, base: 0.16 },
  pitcherPour: { x: 0.95, y: 3.1, z: 0.1 },
} as const;
