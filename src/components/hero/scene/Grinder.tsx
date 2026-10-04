"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { createBrandDecal, createSoftSprite } from "./textures";

const v2 = (r: number, y: number) => new THREE.Vector2(r, y);

/** Conical-burr grinder: anodised body, brass collar, glass hopper, rotating burr and a grounds chute. */
export function Grinder() {
  const { m, q } = useScene();
  const group = useRef<THREE.Group>(null);
  const burr = useRef<THREE.Mesh>(null);
  const H = LAYOUT.hopper;

  const geo = useMemo(() => {
    const body = new THREE.LatheGeometry(
      [v2(0.001, 3.2), v2(0.66, 3.2), v2(0.68, 3.24), v2(0.66, 3.3), v2(0.56, 3.38), v2(0.5, 3.6), v2(0.49, 5.1), v2(0.55, 5.26), v2(0.57, 5.42), v2(0.001, 5.42)],
      72,
    );
    const collar = new THREE.LatheGeometry([v2(0.5, 5.4), v2(0.6, 5.4), v2(0.62, 5.44), v2(0.62, 5.52), v2(0.6, 5.56), v2(0.3, 5.56)], 72);
    const hopper = new THREE.LatheGeometry(
      [v2(H.r0 + 0.02, H.y0), v2(H.r0, H.y0 + 0.02), v2(H.r1, H.y1), v2(H.r1 + 0.03, H.y1 + 0.02), v2(H.r1 + 0.05, H.y1 - 0.02), v2(H.r0 + 0.05, H.y0)],
      72,
    );
    // burr: cone with spiral cutting ridges
    const burrG = new THREE.ConeGeometry(0.26, 0.3, 48, 6, false);
    const pos = burrG.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const ridge = 1 + 0.08 * Math.max(0, Math.sin(a * 12 + y * 18));
      pos.setXYZ(i, x * ridge, y, z * ridge);
    }
    burrG.computeVertexNormals();
    const chute = new THREE.BoxGeometry(0.26, 0.12, 0.5, 1, 1, 1);
    const badge = new THREE.CylinderGeometry(0.495, 0.495, 0.5, 48, 1, true, -0.55, 1.1);
    return { body, collar, hopper, burrG, chute, badge };
  }, [H]);

  const decal = useMemo(() => createBrandDecal({ width: 1024, height: 256, sub: "BURR · 64MM", color: "rgba(214,184,140,0.9)" }), []);
  const decalMat = useMemo(() => new THREE.MeshStandardMaterial({ map: decal, transparent: true, roughness: 0.5, metalness: 0.4, depthWrite: false }), [decal]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      decal.dispose();
      decalMat.dispose();
    },
    [geo, decal, decalMat],
  );

  useFrame((state, dt) => {
    const p = hero.p;
    const g = group.current;
    if (!g) return;
    // exits upward during the final reveal
    const exit = ease.inOutCubic(sub(p, [T.reveal[0] - 0.04, T.reveal[0] + 0.05]));
    g.visible = p < T.reveal[0] + 0.06;
    g.position.y = exit * 7;
    const grinding = p > T.grind[0] && p < T.grounds[1];
    if (burr.current) burr.current.rotation.y += dt * (grinding ? 26 : 0.0);
    // micro-vibration while grinding
    const vib = grinding ? 0.004 : 0;
    g.position.x = Math.sin(state.clock.elapsedTime * 90) * vib;
    g.position.z = Math.cos(state.clock.elapsedTime * 77) * vib;
  });

  return (
    <group ref={group}>
      <group position={[H.x, 0, H.z]}>
        <mesh geometry={geo.body} material={m.blackMetal} castShadow={q.shadows} receiveShadow={q.shadows} />
        <mesh geometry={geo.collar} material={m.brass} castShadow={q.shadows} />
        <mesh geometry={geo.hopper} material={m.glass} />
        <mesh ref={burr} geometry={geo.burrG} material={m.steel} position={[0, 5.42, 0]} />
        {/* brand badge wrapped on the body */}
        <mesh geometry={geo.badge} material={decalMat} position={[0, 4.55, 0]} rotation={[0, 0, 0]} renderOrder={2} />
        {/* chute */}
        <mesh geometry={geo.chute} material={m.blackMetal} position={[0, 3.92, 0.62]} rotation={[0.42, 0, 0]} castShadow={q.shadows} />
        <mesh position={[0, 3.82, 0.86]} rotation={[0.42, 0, 0]} material={m.brass}>
          <boxGeometry args={[0.28, 0.02, 0.04]} />
        </mesh>
      </group>
      <GroundsStream />
    </group>
  );
}

/** Stream of fresh grounds from the chute — flows in real time while its chapter is on screen. */
function GroundsStream() {
  const { q } = useScene();
  const ref = useRef<THREE.Points>(null);
  const count = q.grounds;
  const sprite = useMemo(() => createSoftSprite(32), []);
  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = (Math.random() - 0.5) * 0.12;
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 0.12;
      seeds[i * 4 + 3] = 0.6 + Math.random() * 0.8;
    }
    const sizes = new Float32Array(count).map(() => 0.6 + Math.random() * 0.9);
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return { geometry: g, seeds };
  }, [count]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({ size: 0.028, map: sprite, color: new THREE.Color("#4a2c1a"), transparent: true, alphaTest: 0.25, depthWrite: false, sizeAttenuation: true }),
    [sprite],
  );
  useEffect(() => () => (geometry.dispose(), material.dispose(), sprite.dispose()), [geometry, material, sprite]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const p = hero.p;
    const gp = sub(p, T.grounds);
    const active = gp > 0 && gp < 1;
    pts.visible = active;
    if (!active) return;
    const intensity = smoothstep(0, 0.12, gp) * (1 - smoothstep(0.85, 1, gp));
    const t = state.clock.elapsedTime;
    const start = new THREE.Vector3(LAYOUT.chute.x, LAYOUT.chute.y, LAYOUT.chute.z);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const FALL = 0.55; // seconds from chute to basket
    for (let i = 0; i < count; i++) {
      const s0 = seeds[i * 4]!;
      const life = ((t * 1.4 + s0) % 1) * FALL;
      const visible = s0 < intensity;
      const k = seeds[i * 4 + 3]!;
      const x = start.x + seeds[i * 4 + 1]! * (0.3 + life * 1.5);
      const z = start.z + 0.18 * life * k + seeds[i * 4 + 2]! * (0.3 + life);
      const y = start.y - 0.5 * 4.5 * life * life * k - life * 0.4;
      pos.setXYZ(i, visible ? x : 0, visible ? Math.max(LAYOUT.basketUnderChute.y + 0.08, y) : -100, visible ? z : 0);
    }
    pos.needsUpdate = true;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
