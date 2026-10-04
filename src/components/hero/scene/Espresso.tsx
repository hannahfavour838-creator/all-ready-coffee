"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { createStreamGeometry, createStreamMaterial, liquidState } from "./drink";
import { createNoiseNormal } from "./textures";

const v2 = (r: number, y: number) => new THREE.Vector2(r, y);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

/** Group head + portafilter (travels from the grinder to the machine) + twin espresso streams. */
export function Espresso() {
  const { m, q } = useScene();
  const machine = useRef<THREE.Group>(null);
  const pf = useRef<THREE.Group>(null);
  const mound = useRef<THREE.Mesh>(null);
  const streamL = useRef<THREE.Mesh>(null);
  const streamR = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const head = new THREE.LatheGeometry([v2(0.001, 3.46), v2(0.3, 3.46), v2(0.34, 3.5), v2(0.36, 3.62), v2(0.33, 3.78), v2(0.3, 4.2), v2(0.001, 4.2)], 64);
    const basket = new THREE.LatheGeometry([v2(0.001, -0.12), v2(0.2, -0.12), v2(0.25, -0.08), v2(0.27, 0.06), v2(0.29, 0.07), v2(0.29, 0.1), v2(0.25, 0.1), v2(0.235, 0.02), v2(0.2, -0.07), v2(0.001, -0.07)], 64);
    const moundG = new THREE.SphereGeometry(0.23, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    moundG.scale(1, 0.32, 1);
    const handle = new THREE.CapsuleGeometry(0.05, 0.62, 6, 16);
    handle.rotateX(Math.PI / 2);
    const spout = new THREE.CylinderGeometry(0.025, 0.018, 0.1, 12);
    const slab = new THREE.BoxGeometry(1.7, 0.42, 1.9, 1, 1, 1);
    return { head, basket, moundG, handle, spout, slab };
  }, []);
  const groundsNormal = useMemo(() => createNoiseNormal(128, 24, 9, 3), []);
  const groundsMat = useMemo(() => {
    const mat = m.grounds.clone();
    mat.normalMap = groundsNormal;
    mat.normalScale.set(1.4, 1.4);
    return mat;
  }, [m.grounds, groundsNormal]);
  const espressoMat = useMemo(() => createStreamMaterial("#2a0f05", "#b0652b", { stripes: 1, gloss: 0.7 }), []);
  const streamGeo = useMemo(() => createStreamGeometry(), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      groundsNormal.dispose();
      groundsMat.dispose();
      espressoMat.dispose();
      streamGeo.dispose();
    },
    [geo, groundsNormal, groundsMat, espressoMat, streamGeo],
  );

  useFrame((state) => {
    const p = hero.p;
    const t = state.clock.elapsedTime;
    const exit = ease.inOutCubic(sub(p, [T.reveal[0] - 0.04, T.reveal[0] + 0.05]));
    const show = p > T.grounds[0] - 0.06 && p < T.reveal[0] + 0.06;

    if (machine.current) {
      // the group head descends into frame just as the portafilter travels over
      const enter = ease.outCubic(sub(p, [T.portafilterMove[0] - 0.05, T.portafilterMove[0] + 0.02]));
      machine.current.visible = p > T.portafilterMove[0] - 0.05 && p < T.reveal[0] + 0.06;
      machine.current.position.y = exit * 6 + (1 - enter) * 3;
    }

    // Portafilter path: under the chute → arc → locked under the group head with a twist.
    const mv = ease.inOutCubic(sub(p, T.portafilterMove));
    const a = LAYOUT.basketUnderChute;
    const b = LAYOUT.basketLocked;
    if (pf.current) {
      pf.current.visible = show;
      tmpA.set(a.x, a.y, a.z);
      tmpB.set(b.x, b.y, b.z);
      pf.current.position.lerpVectors(tmpA, tmpB, mv);
      pf.current.position.y += Math.sin(mv * Math.PI) * 0.35 + exit * 6;
      const twist = smoothstep(0.75, 1, mv);
      pf.current.rotation.set(0, -0.35 * (1 - mv) + twist * 0.45, Math.sin(mv * Math.PI) * 0.08);
    }
    if (mound.current) {
      const fill = ease.outCubic(sub(p, [T.grounds[0] + 0.01, T.grounds[1]]));
      mound.current.scale.set(0.6 + 0.4 * fill, Math.max(0.001, fill), 0.6 + 0.4 * fill);
      mound.current.visible = fill > 0.01;
    }

    // Twin espresso streams (dual spout)
    const liq = liquidState(p);
    const e = liq.pourEspresso;
    const flowing = e > 0.02 && e < 0.98;
    const spoutY = b.y - 0.2;
    const surface = LAYOUT.glass.base + liq.level;
    const full = Math.max(0.05, spoutY - surface);
    const head = smoothstep(0.02, 0.16, e); // stream falls from the spouts
    const tail = smoothstep(0.84, 0.98, e); // and detaches at the end
    espressoMat.uniforms.uTime.value = t;
    [streamL.current, streamR.current].forEach((s, i) => {
      if (!s) return;
      s.visible = flowing;
      if (!flowing) return;
      const len = full * (head - tail);
      const top = spoutY - full * tail;
      s.position.set(b.x + (i === 0 ? -0.055 : 0.055) * (1 - head * 0.6), top, b.z);
      s.scale.set(0.022, Math.max(0.001, len), 0.022);
      espressoMat.uniforms.uLen.value = len;
    });
  });

  return (
    <group>
      <group ref={machine}>
        <mesh geometry={geo.head} material={m.chrome} castShadow={q.shadows} />
        <mesh geometry={geo.slab} material={m.blackMetal} position={[0, 4.4, -0.55]} castShadow={q.shadows} receiveShadow={q.shadows} />
        <mesh material={m.brass} position={[0, 4.18, 0.4]}>
          <boxGeometry args={[1.7, 0.03, 0.03]} />
        </mesh>
      </group>
      <group ref={pf}>
        <mesh geometry={geo.basket} material={m.chrome} castShadow={q.shadows} />
        <mesh ref={mound} geometry={geo.moundG} material={groundsMat} position={[0, 0.06, 0]} />
        <mesh geometry={geo.handle} material={m.walnut} position={[0, 0.0, 0.62]} castShadow={q.shadows} />
        <mesh material={m.chrome} position={[0, 0.0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.12, 16]} />
        </mesh>
        <mesh geometry={geo.spout} material={m.chrome} position={[-0.055, -0.16, 0]} />
        <mesh geometry={geo.spout} material={m.chrome} position={[0.055, -0.16, 0]} />
      </group>
      <mesh ref={streamL} geometry={streamGeo} material={espressoMat} frustumCulled={false} />
      <mesh ref={streamR} geometry={streamGeo} material={espressoMat} frustumCulled={false} />
    </group>
  );
}
