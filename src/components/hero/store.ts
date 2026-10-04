/**
 * Tiny mutable store shared between the DOM scroll driver and the WebGL frame loop.
 * Mutated every frame — intentionally outside React state to avoid re-renders.
 */
export type Tier = "high" | "medium" | "low";

export const hero = {
  target: 0, // raw scroll progress
  p: 0, // smoothed progress used by the scene
  velocity: 0,
  pointer: { x: 0, y: 0 },
  pointerSmoothed: { x: 0, y: 0 },
  aspect: 16 / 9,
  ready: false,
  reducedMotion: false,
};
