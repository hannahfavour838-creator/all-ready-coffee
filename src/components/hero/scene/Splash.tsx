"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { liquidState } from "./drink";

const G = LAYOUT.glass;
const LOBES = 14;
const RAD = 140;
const HSEG = 20;
const GRAV = -9.8;
/** Scroll-scrubbed "bullet time": the whole splash plays over this many simulated seconds. */
const SPLASH_SECONDS = 0.95;
const JET_HEIGHT = 0.5;

const m4 = new THREE.Matrix4();
const pos = new THREE.Vector3();
const vel = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

type Droplet = { o: THREE.Vector3; v: THREE.Vector3; size: number; t0: number; cream: boolean };

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The coffee splash: a CPU-deformed crown with spiked lobes, droplets pinching off the lobe tips,
 * a Worthington jet rising from the centre and a spray of droplets thrown toward the camera.
 * Deterministic, so it scrubs perfectly with scroll in both directions.
 */
export function Splash() {
  const { q } = useScene();
  const crown = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const jet = useRef<THREE.Mesh>(null);
  const jetDrop = useRef<THREE.Mesh>(null);

  const crownGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, RAD, HSEG, true), []);
  const base = useMemo(() => Float32Array.from((crownGeo.attributes.position as THREE.BufferAttribute).array), [crownGeo]);
  const dropGeo = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);
  const jetGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.035, 0.07, 1, 20, 8, true);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  const liquidMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#6e3f20",
        roughness: 0.02,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffd2a0"),
        side: THREE.DoubleSide,
        envMapIntensity: 2.2,
        specularIntensity: 1,
        ior: 1.36,
      }),
    [],
  );
  const dropMat = useMemo(() => {
    const d = liquidMat.clone();
    d.color.set("#ffffff");
    d.side = THREE.FrontSide;
    return d;
  }, [liquidMat]);
  const creamMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#efe3d1", roughness: 0.1, clearcoat: 1, envMapIntensity: 1.4 }), []);

  const droplets = useMemo<Droplet[]>(() => {
    const r = rng(42);
    const list: Droplet[] = [];
    // lobe-tip droplets
    for (let i = 0; i < LOBES; i++) {
      const a = (i / LOBES) * Math.PI * 2 + 0.08;
      const out = 1.0 + r() * 0.8;
      list.push({ o: new THREE.Vector3(Math.cos(a) * 0.55, 0.6, Math.sin(a) * 0.55), v: new THREE.Vector3(Math.cos(a) * out * 0.8, 1.8 + r() * 1.2, Math.sin(a) * out * 0.8), size: 0.022 + r() * 0.018, t0: 0.18 + r() * 0.06, cream: r() < 0.08 });
    }
    // spray toward the viewer (+z, slightly up), some very close to the lens
    for (let i = 0; i < q.spray; i++) {
      const a = (r() - 0.5) * 2.4;
      const speed = 2.2 + Math.pow(r(), 0.6) * 3.6;
      const dir = new THREE.Vector3(Math.sin(a) * 0.65, 0.5 + r() * 0.9, 0.55 + r() * 0.9).normalize();
      const rad = 0.2 + r() * 0.35;
      const ang = Math.PI * 0.5 + (r() - 0.5) * 2.2;
      list.push({ o: new THREE.Vector3(Math.cos(ang) * rad, 0.05 + r() * 0.2, Math.sin(ang) * rad * 0.6 + 0.2), v: dir.multiplyScalar(speed), size: 0.008 + Math.pow(r(), 3) * 0.03, t0: 0.02 + r() * 0.12, cream: r() < 0.08 });
    }
    // fine mist ring
    for (let i = 0; i < Math.round(q.spray * 0.4); i++) {
      const a = r() * Math.PI * 2;
      const sp = 1.2 + r() * 1.8;
      list.push({ o: new THREE.Vector3(Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3), v: new THREE.Vector3(Math.cos(a) * sp, 1.6 + r() * 2.4, Math.sin(a) * sp), size: 0.008 + r() * 0.012, t0: 0.05 + r() * 0.1, cream: false });
    }
    return list;
  }, [q.spray]);

  useEffect(() => {
    const mesh = drops.current;
    if (!mesh) return;
    const c = new THREE.Color();
    droplets.forEach((d, i) => mesh.setColorAt(i, c.set(d.cream ? "#e9dcc8" : i % 3 === 0 ? "#4a2614" : "#6e3f20")));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [droplets]);

  useEffect(
    () => () => {
      crownGeo.dispose();
      dropGeo.dispose();
      jetGeo.dispose();
      liquidMat.dispose();
      dropMat.dispose();
      creamMat.dispose();
    },
    [crownGeo, dropGeo, jetGeo, liquidMat, dropMat, creamMat],
  );

  useFrame((state) => {
    const p = hero.p;
    const u = sub(p, T.splash);
    const active = u > 0 && u < 1;
    const liq = liquidState(p);
    const surfaceY = G.base + liq.level;
    const t = u * SPLASH_SECONDS;
    const time = state.clock.elapsedTime;

    // ── Crown ──
    const c = crown.current;
    if (c) {
      c.visible = active && u < 0.82;
      if (c.visible) {
        // a thin liquid sheet: rises, flares and rolls over at the rim, scalloped into soft lobes
        const rise = Math.pow(Math.sin(Math.PI * Math.min(1, u / 0.78)), 0.7);
        const R = 0.14 + 0.42 * ease.outCubic(Math.min(1, u / 0.55));
        const H = 0.52 * rise;
        const lobe = smoothstep(0.06, 0.28, u) * (1 - smoothstep(0.55, 0.8, u));
        const arr = (c.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = base[i]!, bz = base[i + 2]!, by = base[i + 1]!;
          const a = Math.atan2(bz, bx);
          const v = by + 0.5; // 0 bottom → 1 rim
          const scallop = Math.pow(0.5 + 0.5 * Math.cos(a * LOBES), 2);
          const flare = v * v * 0.14 * rise;
          const wob = Math.sin(a * 5 + time * 2.4) * 0.008 * v;
          const r = Math.min(G.rInner * 0.92, R + flare + wob);
          arr[i] = Math.cos(a) * r;
          arr[i + 1] = surfaceY + v * H * (1 + scallop * lobe * 0.35 * v * v);
          arr[i + 2] = Math.sin(a) * r;
        }
        c.geometry.attributes.position!.needsUpdate = true;
        c.geometry.computeVertexNormals();
      }
    }

    // ── Droplets ──
    const mesh = drops.current;
    if (mesh) {
      mesh.visible = active;
      if (active) {
        droplets.forEach((d, i) => {
          const tt = t - d.t0 * SPLASH_SECONDS;
          if (tt <= 0) {
            scl.setScalar(0);
            m4.compose(pos.set(0, -50, 0), quat.identity(), scl);
            mesh.setMatrixAt(i, m4);
            return;
          }
          vel.copy(d.v).addScaledVector(UP, GRAV * tt * 0.55);
          pos.set(d.o.x, surfaceY + d.o.y, d.o.z).addScaledVector(d.v, tt).addScaledVector(UP, 0.5 * GRAV * 0.55 * tt * tt);
          const speed = vel.length();
          quat.setFromUnitVectors(UP, vel.clone().normalize());
          const s = d.size * (1 - smoothstep(0.85, 1, u));
          scl.set(s, s * (1 + Math.min(0.9, speed * 0.12)), s);
          if (pos.y < surfaceY - 0.05 && Math.hypot(pos.x, pos.z) < G.rInner) scl.setScalar(0); // fell back in
          m4.compose(pos, quat, scl);
          mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    }

    // ── Worthington jet ──
    const ju = sub(u, [0.38, 0.92]);
    if (jet.current) {
      jet.current.visible = active && ju > 0 && ju < 1;
      const jh = Math.sin(Math.PI * ju) * JET_HEIGHT;
      jet.current.position.set(0, surfaceY - 0.02, 0);
      jet.current.scale.set(1 - ju * 0.3, Math.max(0.001, jh), 1 - ju * 0.3);
    }
    if (jetDrop.current) {
      jetDrop.current.visible = active && ju > 0.25 && ju < 1;
      const detach = smoothstep(0.45, 1, ju);
      const jh = Math.sin(Math.PI * ju) * JET_HEIGHT;
      const y = surfaceY + jh + 0.05 + detach * 0.3 - detach * detach * 0.6;
      jetDrop.current.position.set(0, y, 0);
      const s = 0.05 * (1 - smoothstep(0.9, 1, ju));
      jetDrop.current.scale.set(s, s * 1.15, s);
    }
  });

  return (
    <group>
      <mesh ref={crown} geometry={crownGeo} material={liquidMat} visible={false} frustumCulled={false} />
      <instancedMesh ref={drops} args={[dropGeo, dropMat, droplets.length]} visible={false} frustumCulled={false} />
      <mesh ref={jet} geometry={jetGeo} material={liquidMat} visible={false} />
      <mesh ref={jetDrop} geometry={dropGeo} material={creamMat} visible={false} />
    </group>
  );
}
