import type { Tier } from "./store";

export type QualitySettings = {
  tier: Tier;
  dpr: [number, number];
  beans: number;
  shadows: boolean;
  shadowMapSize: number;
  transmission: boolean;
  post: "full" | "lite" | "none";
  condensation: number;
  spray: number;
  grounds: number;
  reflectiveFloor: boolean;
};

export const QUALITY: Record<Tier, QualitySettings> = {
  high: { tier: "high", dpr: [1, 1.75], beans: 170, shadows: true, shadowMapSize: 2048, transmission: true, post: "full", condensation: 240, spray: 150, grounds: 1800, reflectiveFloor: true },
  medium: { tier: "medium", dpr: [1, 1.5], beans: 110, shadows: true, shadowMapSize: 1024, transmission: true, post: "lite", condensation: 110, spray: 90, grounds: 1000, reflectiveFloor: false },
  low: { tier: "low", dpr: [0.85, 1.1], beans: 64, shadows: false, shadowMapSize: 512, transmission: false, post: "none", condensation: 0, spray: 50, grounds: 500, reflectiveFloor: false },
};

export type Capability = { webgl: boolean; tier: Tier };

/** Heuristic device classification — no network calls, no fingerprinting storage. */
export function detectCapability(): Capability {
  if (typeof window === "undefined") return { webgl: false, tier: "low" };

  const forced = new URLSearchParams(window.location.search).get("quality");
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const c = document.createElement("canvas");
    gl = (c.getContext("webgl2") as WebGL2RenderingContext | null) ?? (c.getContext("webgl") as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return { webgl: false, tier: "low" };
  if (forced === "high" || forced === "medium" || forced === "low") return { webgl: true, tier: forced };

  let renderer = "";
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
  } catch {
    renderer = "";
  }
  const lose = gl.getExtension("WEBGL_lose_context");
  lose?.loseContext();

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 820;
  const mobile = coarse && small;

  if (/swiftshader|llvmpipe|software|basic render/.test(renderer)) return { webgl: true, tier: "low" };
  if (mobile) {
    if (cores <= 4 || memory <= 3 || /mali-[4t]|adreno \(tm\) [3-5]|powervr|sgx/.test(renderer)) return { webgl: true, tier: "low" };
    return { webgl: true, tier: "medium" };
  }
  if (/intel|uhd|iris|hd graphics/.test(renderer) || cores <= 4 || memory <= 4) return { webgl: true, tier: "medium" };
  return { webgl: true, tier: "high" };
}
