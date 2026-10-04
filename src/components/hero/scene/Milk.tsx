"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { createStreamGeometry, createStreamMaterial, liquidState } from "./drink";

const v2 = (r: number, y: number) => new THREE.Vector2(r, y);
const SPOUT_LOCAL = new THREE.Vector3(0.42, 0.74, 0);
const tip = new THREE.Vector3();

/** Stainless steaming pitcher that sweeps in, tilts and pours a ribbon of cold milk. */
export function Milk() {
  const { m, q } = useScene();
  const pitcher = useRef<THREE.Group>(null);
  const stream = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const body = new THREE.LatheGeometry(
      [v2(0.001, 0), v2(0.3, 0), v2(0.33, 0.03), v2(0.35, 0.18), v2(0.34, 0.38), v2(0.3, 0.56), v2(0.29, 0.66), v2(0.31, 0.72), v2(0.3, 0.73), v2(0.28, 0.66), v2(0.29, 0.55), v2(0.32, 0.38), v2(0.33, 0.18), v2(0.31, 0.04), v2(0.001, 0.04)],
      64,
    );
    // pull a pouring spout out of the rim on +X
    const pos = body.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const w = Math.exp(-(a * a) / 0.09) * smoothstep(0.5, 0.73, y);
      pos.setXYZ(i, x + w * 0.12, y + w * 0.03, z * (1 - w * 0.35));
    }
    body.computeVertexNormals();
    const handle = new THREE.TorusGeometry(0.2, 0.035, 12, 32, Math.PI);
    return { body, handle };
  }, []);
  const milkMat = useMemo(() => createStreamMaterial("#e9dfcf", "#fffaf1", { stripes: 0.35, gloss: 0.9 }), []);
  const streamGeo = useMemo(() => createStreamGeometry(16, 48), []);
  useEffect(() => () => (Object.values(geo).forEach((g) => g.dispose()), milkMat.dispose(), streamGeo.dispose()), [geo, milkMat, streamGeo]);

  useFrame((state) => {
    const p = hero.p;
    const g = pitcher.current;
    if (!g) return;
    const mk = sub(p, [T.milk[0] - 0.03, T.milk[1] + 0.03]);
    g.visible = mk > 0 && mk < 1;
    if (!g.visible) {
      if (stream.current) stream.current.visible = false;
      return;
    }
    const enter = ease.outCubic(smoothstep(0, 0.22, mk));
    const leave = ease.inCubic(smoothstep(0.8, 1, mk));
    const P = LAYOUT.pitcherPour;
    g.position.set(P.x + (1 - enter) * 2.6 + leave * 2.8, P.y + (1 - enter) * 0.6 + leave * 0.8, P.z);
    const tilt = smoothstep(0.16, 0.34, mk) * (1 - smoothstep(0.74, 0.86, mk));
    g.rotation.set(0, Math.PI, -(0.15 + tilt * 1.0));
    g.updateMatrixWorld();

    // milk stream from spout tip to the liquid surface
    const liq = liquidState(p);
    const flowing = liq.pourMilk > 0.04 && liq.pourMilk < 0.96 && tilt > 0.4;
    milkMat.uniforms.uTime.value = state.clock.elapsedTime;
    const s = stream.current;
    if (!s) return;
    s.visible = flowing;
    if (!flowing) return;
    tip.copy(SPOUT_LOCAL);
    g.localToWorld(tip);
    const surface = LAYOUT.glass.base + liq.level;
    const head = smoothstep(0.04, 0.14, liq.pourMilk);
    const tail = smoothstep(0.84, 0.96, liq.pourMilk);
    const full = Math.max(0.05, tip.y - surface);
    s.position.set(tip.x - 0.02, tip.y - full * tail, tip.z);
    s.scale.set(0.05, Math.max(0.001, full * (head - tail)), 0.05);
    milkMat.uniforms.uLen.value = full;
  });

  return (
    <group>
      <group ref={pitcher}>
        <mesh geometry={geo.body} material={m.steel} castShadow={q.shadows}>
          <meshPhysicalMaterial attach="material" color="#cfcbc6" roughness={0.18} metalness={1} side={THREE.DoubleSide} clearcoat={0.4} />
        </mesh>
        <mesh geometry={geo.handle} material={m.steel} position={[-0.36, 0.38, 0]} rotation={[0, 0, Math.PI / 2]} />
      </group>
      <mesh ref={stream} geometry={streamGeo} material={milkMat} frustumCulled={false} />
    </group>
  );
}
