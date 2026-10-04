"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bakeBeans } from "./beanSim";
import { createBeanGeometry, createBeanMaterial } from "./beanGeometry";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";

const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpP2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpQd = new THREE.Quaternion();

export function Beans({ count, shadows }: { count: number; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bake = useMemo(() => bakeBeans(count), [count]);
  const geometry = useMemo(() => createBeanGeometry(count > 120 ? 40 : 28), [count]);
  const material = useMemo(() => createBeanMaterial(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // roast variation: some slightly lighter, some darker/oilier
      const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      c.setHSL(0.06 + Math.abs(r) * 0.02, 0.45 + Math.abs(r) * 0.15, 0.13 + Math.abs(r) * 0.07);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [count, geometry, material]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = hero.p;
    const t = state.clock.elapsedTime;
    if (p > T.grind[1] + 0.02) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const fall = sub(p, T.fall);
    const f = ease.inOutSine(fall) * 0.25 + fall * 0.75; // slightly eased start, linear-ish feel
    const fi = f * (bake.frames - 1);
    const f0 = Math.floor(fi);
    const f1 = Math.min(bake.frames - 1, f0 + 1);
    const a = fi - f0;
    const driftAmt = 1 - smoothstep(0.0, 0.18, fall);
    const grind = ease.inOutCubic(sub(p, T.grind));
    const H = LAYOUT.hopper;
    const N = bake.count;

    for (let i = 0; i < N; i++) {
      const o0 = (f0 * N + i) * 3;
      const o1 = (f1 * N + i) * 3;
      tmpP.set(bake.positions[o0]!, bake.positions[o0 + 1]!, bake.positions[o0 + 2]!);
      tmpP2.set(bake.positions[o1]!, bake.positions[o1 + 1]!, bake.positions[o1 + 2]!);
      tmpP.lerp(tmpP2, a);
      const q0 = (f0 * N + i) * 4;
      const q1 = (f1 * N + i) * 4;
      tmpQ.set(bake.quaternions[q0]!, bake.quaternions[q0 + 1]!, bake.quaternions[q0 + 2]!, bake.quaternions[q0 + 3]!);
      tmpQ2.set(bake.quaternions[q1]!, bake.quaternions[q1 + 1]!, bake.quaternions[q1 + 2]!, bake.quaternions[q1 + 3]!);
      tmpQ.slerp(tmpQ2, a);

      let s = bake.scale[i]!;
      const d = i * 4;
      if (driftAmt > 0.001) {
        // weightless idle float before gravity "switches on"
        const ph = bake.drift[d]!, amp = bake.drift[d + 1]!, sp = bake.drift[d + 2]!, spin = bake.drift[d + 3]!;
        tmpP.x += Math.sin(t * sp * 0.7 + ph) * amp * driftAmt;
        tmpP.y += Math.sin(t * sp + ph * 1.3) * amp * 1.4 * driftAmt;
        tmpP.z += Math.cos(t * sp * 0.6 + ph) * amp * driftAmt;
        tmpE.set(t * spin * driftAmt, t * spin * 0.7 * driftAmt, 0);
        tmpQd.setFromEuler(tmpE);
        tmpQ.multiply(tmpQd);
      }

      if (bake.inHopper[i]) {
        if (grind > 0) {
          tmpP.y -= grind * 2.4;
          const jitter = grind < 1 ? 0.012 : 0;
          tmpP.x += Math.sin(t * 61 + i) * jitter;
          tmpP.z += Math.cos(t * 53 + i * 1.7) * jitter;
          // narrow toward the burr as they sink
          const dx = tmpP.x - H.x, dz = tmpP.z - H.z;
          const k = 1 - grind * 0.35;
          tmpP.x = H.x + dx * k;
          tmpP.z = H.z + dz * k;
          s *= smoothstep(H.y0 - 0.06, H.y0 + 0.16, tmpP.y);
        }
      } else if (tmpP.y < 1.2 || p > T.grind[0] + 0.05) {
        s = 0; // flyers that have left the frame
      }
      tmpS.setScalar(s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />;
}
