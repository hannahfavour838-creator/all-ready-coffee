"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { hero } from "../store";
import { T, ease, sub } from "../timeline";

type Key = { p: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };

/** Camera choreography: keyed positions/targets interpolated with Catmull-Rom for continuous motion. */
export const KEYS: Key[] = [
  { p: 0.0, pos: [0, 9.65, 6.6], look: [0, 9.55, 0], fov: 38 },
  { p: 0.06, pos: [0.3, 9.45, 5.8], look: [0, 9.25, 0] },
  { p: 0.14, pos: [0.9, 9.0, 4.2], look: [-0.4, 8.4, 0] },
  { p: 0.22, pos: [-0.4, 8.3, 3.7], look: [-1.5, 7.0, 0] },
  { p: 0.29, pos: [1.0, 7.3, 3.9], look: [-1.6, 6.0, 0] },
  { p: 0.35, pos: [1.9, 5.6, 3.6], look: [-1.0, 4.8, 0.2] },
  { p: 0.41, pos: [0.9, 4.2, 3.2], look: [-1.3, 3.4, 0.7] },
  { p: 0.47, pos: [0.7, 3.7, 3.4], look: [-0.2, 3.0, 0.2] },
  { p: 0.53, pos: [0.15, 3.05, 3.5], look: [0, 2.35, 0] },
  { p: 0.6, pos: [-1.5, 2.9, 3.2], look: [0.1, 2.0, 0] },
  { p: 0.67, pos: [-0.6, 4.0, 3.2], look: [0, 2.3, 0] },
  { p: 0.735, pos: [0.4, 3.7, 2.5], look: [0, 2.15, 0] },
  { p: 0.78, pos: [0.05, 2.75, 1.95], look: [0, 2.15, 0], fov: 42 },
  { p: 0.84, pos: [0.0, 2.55, 2.4], look: [0, 1.95, 0] },
  { p: 0.91, pos: [0.0, 1.75, 5.4], look: [0, 1.3, 0], fov: 36 },
  { p: 1.0, pos: [0.0, 1.6, 5.9], look: [0, 1.25, 0], fov: 35 },
];

const vPos = KEYS.map((k) => new THREE.Vector3(...k.pos));
const vLook = KEYS.map((k) => new THREE.Vector3(...k.look));

function catmull(out: THREE.Vector3, pts: THREE.Vector3[], i: number, t: number) {
  const p0 = pts[Math.max(0, i - 1)]!;
  const p1 = pts[i]!;
  const p2 = pts[Math.min(pts.length - 1, i + 1)]!;
  const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
  const t2 = t * t, t3 = t2 * t;
  out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
  return out;
}

const pos = new THREE.Vector3();
const look = new THREE.Vector3();
const dir = new THREE.Vector3();
const right = new THREE.Vector3();

export const cameraTarget = new THREE.Vector3(0, 9.5, 0);

export function sampleCamera(p: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1]!.p) i++;
  const a = KEYS[i]!, b = KEYS[i + 1]!;
  const t = ease.inOutSine(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  catmull(outPos, vPos, i, t);
  catmull(outLook, vLook, i, t);
  const fa = a.fov ?? 38, fb = b.fov ?? fa;
  return THREE.MathUtils.lerp(fa, fb, t);
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useFrame((state, dt) => {
    // Responsive smoothing: ~90 ms time constant — tight to the scrollbar, without jitter.
    const k = 1 - Math.exp(-dt * (hero.reducedMotion ? 60 : 11));
    hero.p += (hero.target - hero.p) * k;
    if (Math.abs(hero.target - hero.p) < 1e-5) hero.p = hero.target;
    hero.pointerSmoothed.x += (hero.pointer.x - hero.pointerSmoothed.x) * (1 - Math.exp(-dt * 3));
    hero.pointerSmoothed.y += (hero.pointer.y - hero.pointerSmoothed.y) * (1 - Math.exp(-dt * 3));

    const fov = sampleCamera(hero.p, pos, look);
    const aspect = size.width / Math.max(1, size.height);
    // Portrait screens: pull back so compositions still breathe.
    const fit = aspect < 1 ? THREE.MathUtils.lerp(1, 1.75, Math.min(1, (1 - aspect) / 0.55)) : aspect < 1.3 ? 1.12 : 1;
    dir.subVectors(pos, look).multiplyScalar(fit);
    pos.copy(look).add(dir);

    // pointer parallax (desktop only — pointer stays 0 on touch)
    right.set(dir.z, 0, -dir.x).normalize();
    pos.addScaledVector(right, hero.pointerSmoothed.x * 0.22);
    pos.y += hero.pointerSmoothed.y * 0.12;

    // splash impact: a tiny, quickly-damped camera kick
    const s = sub(hero.p, T.splash);
    if (s > 0 && s < 0.25) {
      const amp = (1 - s / 0.25) * 0.018;
      pos.x += Math.sin(s * 140) * amp;
      pos.y += Math.cos(s * 110) * amp;
    }
    // idle breathing
    const tt = state.clock.elapsedTime;
    pos.y += Math.sin(tt * 0.6) * 0.012;

    camera.position.copy(pos);
    camera.lookAt(look);
    cameraTarget.copy(look);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -10);

  return null;
}
