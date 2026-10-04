"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { createBeanGeometry, createBeanMaterial } from "./beanGeometry";
import { createChocolateChunkGeometry, createCinnamonGeometry, createIceGeometry } from "./props";
import { createStreamGeometry, createStreamMaterial, liquidState } from "./drink";
import { createBarkNormal, createSoftSprite } from "./textures";

type Kind = "ice" | "chocolate" | "cinnamon" | "bean";
type Drop = {
  kind: Kind;
  start: THREE.Vector3; // spawn above the glass
  entry: THREE.Vector3; // xz where it meets the surface
  t0: number; // progress at which it starts falling
  t1: number; // progress at which it hits the surface
  spin: THREE.Vector3;
  rest: { x: number; z: number; rot: THREE.Euler; depth: number }; // floating / garnish pose
};

const G = LAYOUT.glass;
const [I0, I1] = T.ingredients;
const span = I1 - I0;

/** Ingredient choreography — hand-tuned "physics": gravity-accelerated falls, tumbling, buoyant ice. */
const DROPS: Drop[] = [
  { kind: "chocolate", start: new THREE.Vector3(0.6, 5.6, 0.4), entry: new THREE.Vector3(0.2, 0, 0.12), t0: I0 + span * 0.0, t1: I0 + span * 0.3, spin: new THREE.Vector3(3, 5, 1), rest: { x: 0.2, z: 0.1, rot: new THREE.Euler(), depth: -0.6 } },
  { kind: "bean", start: new THREE.Vector3(-0.5, 5.9, -0.2), entry: new THREE.Vector3(-0.25, 0, -0.1), t0: I0 + span * 0.05, t1: I0 + span * 0.36, spin: new THREE.Vector3(8, 3, 6), rest: { x: -0.25, z: -0.1, rot: new THREE.Euler(), depth: -0.5 } },
  { kind: "ice", start: new THREE.Vector3(-0.4, 6.0, 0.3), entry: new THREE.Vector3(-0.28, 0, 0.18), t0: I0 + span * 0.12, t1: I0 + span * 0.46, spin: new THREE.Vector3(2, 3, 1.5), rest: { x: -0.3, z: 0.2, rot: new THREE.Euler(0.3, 0.6, 0.15), depth: -0.12 } },
  { kind: "cinnamon", start: new THREE.Vector3(0.9, 6.2, -0.3), entry: new THREE.Vector3(0.38, 0, -0.32), t0: I0 + span * 0.18, t1: I0 + span * 0.55, spin: new THREE.Vector3(1.5, 0.5, 2.5), rest: { x: 0.36, z: -0.3, rot: new THREE.Euler(0.12, 0, -0.32), depth: 0 } },
  { kind: "bean", start: new THREE.Vector3(0.3, 6.4, 0.5), entry: new THREE.Vector3(0.05, 0, 0.3), t0: I0 + span * 0.22, t1: I0 + span * 0.6, spin: new THREE.Vector3(5, 7, 2), rest: { x: 0.05, z: 0.3, rot: new THREE.Euler(), depth: -0.5 } },
  { kind: "ice", start: new THREE.Vector3(0.6, 6.4, 0.0), entry: new THREE.Vector3(0.3, 0, 0.16), t0: I0 + span * 0.28, t1: I0 + span * 0.7, spin: new THREE.Vector3(2.5, 1.5, 3), rest: { x: 0.3, z: 0.22, rot: new THREE.Euler(-0.2, 1.2, 0.25), depth: -0.14 } },
  { kind: "chocolate", start: new THREE.Vector3(-0.7, 6.6, 0.2), entry: new THREE.Vector3(-0.15, 0, 0.0), t0: I0 + span * 0.34, t1: I0 + span * 0.82, spin: new THREE.Vector3(4, 2, 3), rest: { x: -0.15, z: 0.0, rot: new THREE.Euler(), depth: -0.6 } },
  // The hero drop: lands exactly as the splash begins.
  { kind: "ice", start: new THREE.Vector3(0.05, 7.2, 0.15), entry: new THREE.Vector3(0.0, 0, 0.05), t0: I0 + span * 0.45, t1: T.splash[0], spin: new THREE.Vector3(1.8, 2.4, 1.2), rest: { x: -0.02, z: -0.22, rot: new THREE.Euler(0.1, -0.4, -0.2), depth: -0.1 } },
];

const tmp = new THREE.Vector3();

export function Ingredients() {
  const { m, q } = useScene();
  const refs = useRef<(THREE.Object3D | null)[]>([]);
  const caramelStream = useRef<THREE.Mesh>(null);
  const cocoa = useRef<THREE.Points>(null);

  const geo = useMemo(
    () => ({
      ice: createIceGeometry(),
      chocolate: createChocolateChunkGeometry(2),
      cinnamon: createCinnamonGeometry(1.25),
      bean: createBeanGeometry(28),
    }),
    [],
  );
  const bark = useMemo(() => createBarkNormal(128), []);
  const cinnamonMat = useMemo(() => {
    const c = m.cinnamon.clone();
    c.normalMap = bark;
    c.normalScale.set(0.8, 0.8);
    return c;
  }, [m.cinnamon, bark]);
  const beanMat = useMemo(() => createBeanMaterial(), []);
  const caramelMat = useMemo(() => createStreamMaterial("#7a3a10", "#d48a3c", { stripes: 0.5, gloss: 1 }), []);
  const streamGeo = useMemo(() => createStreamGeometry(12, 40), []);

  // cocoa dusting
  const COCOA = q.tier === "low" ? 160 : 420;
  const sprite = useMemo(() => createSoftSprite(32), []);
  const cocoaGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COCOA * 3), 3));
    return g;
  }, [COCOA]);
  const cocoaSeeds = useMemo(() => Array.from({ length: COCOA }, () => [Math.random(), (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, Math.random()]), [COCOA]);
  const cocoaMat = useMemo(() => new THREE.PointsMaterial({ size: 0.022, map: sprite, color: "#5a3420", transparent: true, depthWrite: false, alphaTest: 0.2 }), [sprite]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      bark.dispose();
      cinnamonMat.dispose();
      beanMat.dispose();
      caramelMat.dispose();
      streamGeo.dispose();
      sprite.dispose();
      cocoaGeo.dispose();
      cocoaMat.dispose();
    },
    [geo, bark, cinnamonMat, beanMat, caramelMat, streamGeo, sprite, cocoaGeo, cocoaMat],
  );

  useFrame((state) => {
    const p = hero.p;
    const t = state.clock.elapsedTime;
    const liq = liquidState(p);
    const surfaceY = G.base + liq.level;
    const reveal = smoothstep(T.reveal[0], T.reveal[1], p);
    // glass turns during the reveal; floating items turn with it
    const fin = sub(p, [T.reveal[0], 1]);
    const glassRot = fin * 1.1 - 0.15;
    const cosR = Math.cos(glassRot), sinR = Math.sin(glassRot);

    DROPS.forEach((d, i) => {
      const o = refs.current[i];
      if (!o) return;
      if (p < d.t0) {
        o.visible = false;
        return;
      }
      o.visible = true;
      const fall = sub(p, [d.t0, d.t1]);
      if (fall < 1) {
        const f = ease.inCubic(fall) * 0.7 + fall * 0.3; // accelerating fall
        tmp.set(THREE.MathUtils.lerp(d.start.x, d.entry.x, ease.outCubic(fall)), THREE.MathUtils.lerp(d.start.y, surfaceY, f), THREE.MathUtils.lerp(d.start.z, d.entry.z, ease.outCubic(fall)));
        o.position.copy(tmp);
        o.rotation.set(d.spin.x * fall * 2, d.spin.y * fall * 2, d.spin.z * fall * 2);
        o.scale.setScalar(1);
        return;
      }
      // after impact
      const after = sub(p, [d.t1, d.t1 + 0.06]);
      if (d.kind === "ice") {
        const bob = Math.sin(t * 1.3 + i) * 0.012;
        const dip = Math.sin(after * Math.PI) * -0.35 * (1 - after);
        const rx = d.rest.x * cosR + d.rest.z * sinR;
        const rz = -d.rest.x * sinR + d.rest.z * cosR;
        o.position.set(THREE.MathUtils.lerp(d.entry.x, rx, ease.outCubic(after)), surfaceY + d.rest.depth + dip + bob, THREE.MathUtils.lerp(d.entry.z, rz, ease.outCubic(after)));
        o.rotation.set(d.rest.rot.x + Math.sin(t * 0.7 + i) * 0.03, d.rest.rot.y + glassRot, d.rest.rot.z);
        o.scale.setScalar(1);
      } else if (d.kind === "cinnamon") {
        // settles as a garnish leaning against the rim
        const rx = d.rest.x * cosR + d.rest.z * sinR;
        const rz = -d.rest.x * sinR + d.rest.z * cosR;
        const s = ease.outBack(after);
        o.position.set(THREE.MathUtils.lerp(d.entry.x, rx, s), surfaceY + 0.32 - (1 - after) * 0.4, THREE.MathUtils.lerp(d.entry.z, rz, s));
        o.rotation.set(d.rest.rot.x, glassRot, d.rest.rot.z * Math.min(1, after * 1.2));
      } else {
        // sinks and dissolves into the drink
        o.position.set(d.entry.x, surfaceY + d.rest.depth * ease.outCubic(after), d.entry.z);
        o.scale.setScalar(Math.max(0.001, 1 - after));
        o.visible = after < 1;
      }
      if (reveal > 0 && d.kind !== "ice" && d.kind !== "cinnamon") o.visible = false;
    });

    // Caramel ribbon pours in during the first half of the ingredients chapter
    const ing = sub(p, T.ingredients);
    const cs = caramelStream.current;
    caramelMat.uniforms.uTime.value = t;
    if (cs) {
      const on = ing > 0.06 && ing < 0.5;
      cs.visible = on;
      if (on) {
        const top = 6.2;
        const head = smoothstep(0.06, 0.16, ing);
        const tail = smoothstep(0.38, 0.5, ing);
        const full = top - surfaceY;
        cs.position.set(-0.42 + Math.sin(t * 0.8) * 0.04, top - full * tail, 0.25);
        cs.scale.set(0.02, Math.max(0.001, full * (head - tail)), 0.02);
        caramelMat.uniforms.uLen.value = full;
      }
    }

    // Cocoa dusting
    const pts = cocoa.current;
    if (pts) {
      const c = sub(p, [I0 + span * 0.55, I1 + 0.02]);
      pts.visible = c > 0 && c < 1;
      if (pts.visible) {
        const pos = cocoaGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < COCOA; i++) {
          const sd = cocoaSeeds[i]!;
          const life = (c * 1.6 + sd[0]!) % 1;
          const y = 3.6 - life * (3.6 - surfaceY);
          const spread = 0.2 + life * 0.5;
          pos.setXYZ(i, sd[1]! * spread + Math.sin(t * 2 + sd[3]! * 9) * 0.02, life > 0.98 ? -100 : y, sd[2]! * spread);
        }
        pos.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {DROPS.map((d, i) => {
        const common = { ref: (o: THREE.Object3D | null) => void (refs.current[i] = o), visible: false, castShadow: q.shadows };
        if (d.kind === "ice") return <mesh key={i} {...common} geometry={geo.ice} material={m.ice} />;
        if (d.kind === "chocolate") return <mesh key={i} {...common} geometry={geo.chocolate} material={m.chocolate} />;
        if (d.kind === "cinnamon") return <mesh key={i} {...common} geometry={geo.cinnamon} material={cinnamonMat} />;
        return <mesh key={i} {...common} geometry={geo.bean} material={beanMat} scale={1.4} />;
      })}
      <mesh ref={caramelStream} geometry={streamGeo} material={caramelMat} visible={false} frustumCulled={false} />
      <points ref={cocoa} geometry={cocoaGeo} material={cocoaMat} visible={false} frustumCulled={false} />
    </group>
  );
}
