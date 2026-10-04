"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { LAYOUT, T, ease, smoothstep, sub } from "../timeline";
import { liquidState } from "./drink";
import { createBrandDecal, createCondensationNormal } from "./textures";

const G = LAYOUT.glass;
const v2 = (r: number, y: number) => new THREE.Vector2(r, y);

const NOISE_GLSL = /* glsl */ `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i+vec3(0,0,0)), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*n3(p); p *= 2.03; a *= 0.5; } return s; }
`;

/** Liquid body: layered milk / espresso with turbulent cream plumes while pouring. */
function createLiquidMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: new THREE.Color("#fff3e0") });
  const uniforms = {
    uLevel: { value: 0.01 },
    uMilk: { value: 0 },
    uTurb: { value: 0 },
    uTime: { value: 0 },
    uCoffee: { value: new THREE.Color("#3a1a0b") },
    uCrema: { value: new THREE.Color("#8a5428") },
    uMilkC: { value: new THREE.Color("#ece0cf") },
    uLatte: { value: new THREE.Color("#b07b4b") },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLocal; uniform float uLevel, uMilk, uTurb, uTime; uniform vec3 uCoffee, uCrema, uMilkC, uLatte;
        ${NOISE_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float h = clamp(vLocal.y, 0.0, 1.0);              // geometry is unit height, scaled by level
        float n = fbm(vec3(vLocal.xz * 3.2, vLocal.y * 2.5 * uLevel - uTime * 0.35));
        float boundary = uMilk * 0.82 + (n - 0.5) * (0.12 + uTurb * 0.35);
        float coffeeMix = smoothstep(boundary - 0.07, boundary + 0.1, h);
        vec3 lower = mix(uMilkC, uLatte, smoothstep(0.0, 1.0, h / max(0.001, boundary)) * 0.55);
        vec3 upper = mix(uLatte * 0.75, uCoffee, smoothstep(0.0, 0.6, (h - boundary) / max(0.001, 1.0 - boundary)));
        vec3 c = mix(lower, upper, coffeeMix);
        // cream plumes while pouring
        float plume = smoothstep(0.62, 0.8, fbm(vec3(vLocal.xz * 5.0, vLocal.y * 5.0 + uTime * 0.6))) * uTurb;
        c = mix(c, uMilkC, plume * 0.7);
        // crema band near the top when it's straight espresso
        c = mix(c, uCrema, smoothstep(0.9, 1.0, h) * (1.0 - uMilk) * 0.8);
        diffuseColor.rgb = c;`,
      );
  };
  return { mat, uniforms };
}

/** Liquid surface: crema / cream swirl with analytic ripples (driven by the splash). */
function createSurfaceMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
  const uniforms = {
    uTime: { value: 0 },
    uRipple: { value: 0 },
    uWave: { value: 0 },
    uA: { value: new THREE.Color("#8a5428") },
    uB: { value: new THREE.Color("#5a2f15") },
    uSwirl: { value: 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvP = position.xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vP; uniform float uTime, uRipple, uWave, uSwirl; uniform vec3 uA, uB;\n${NOISE_GLSL}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float r = length(vP) / ${G.rInner.toFixed(3)};
        float ang = atan(vP.y, vP.x);
        float sw = sin(ang * 2.0 + r * 9.0 - uTime * 0.25 + fbm(vec3(vP * 6.0, uTime * 0.1)) * 3.0);
        float edge = smoothstep(0.75, 1.0, r);
        vec3 c = mix(uA, uB, smoothstep(-0.4, 0.9, sw) * uSwirl + (1.0 - uSwirl) * 0.35);
        c = mix(c, uB * 0.8, edge * 0.5);
        diffuseColor.rgb = c;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          float rr = length(vP);
          float k = 34.0;
          float env = exp(-abs(rr - uWave) * 3.5) * uRipple;
          vec2 dir = vP / max(rr, 1e-4);
          vec2 grad = dir * cos(rr * k - uTime * 9.0) * env * 0.35;
          grad += vec2(fbm(vec3(vP * 9.0, uTime)) - 0.5, fbm(vec3(vP.yx * 9.0, uTime + 3.0)) - 0.5) * 0.06;
          normal = normalize(normal - (viewMatrix * vec4(grad.x, 0.0, grad.y, 0.0)).xyz);
        }`,
      );
  };
  return { mat, uniforms };
}

export function Glass() {
  const { m, q } = useScene();
  const root = useRef<THREE.Group>(null);
  const liquid = useRef<THREE.Mesh>(null);
  const surface = useRef<THREE.Mesh>(null);
  const decal = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const caramel = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    const glass = new THREE.LatheGeometry(
      [v2(0.001, 0), v2(G.rOuter - 0.06, 0), v2(G.rOuter - 0.01, 0.015), v2(G.rOuter, 0.06), v2(G.rOuter, G.height - 0.03), v2(G.rOuter - 0.012, G.height), v2(G.rInner + 0.008, G.height), v2(G.rInner, G.height - 0.03), v2(G.rInner, G.base + 0.06), v2(G.rInner - 0.05, G.base), v2(0.001, G.base)],
      96,
    );
    const body = new THREE.CylinderGeometry(G.rInner - 0.006, G.rInner - 0.02, 1, 72, 24, false);
    body.translate(0, 0.5, 0);
    const top = new THREE.CircleGeometry(G.rInner - 0.006, 72);
    top.rotateX(-Math.PI / 2);
    const band = new THREE.CylinderGeometry(G.rOuter + 0.004, G.rOuter + 0.004, 0.46, 64, 1, true, -0.7, 1.4);
    const drop = new THREE.SphereGeometry(1, 10, 8);
    drop.scale(1, 1.25, 0.45);
    return { glass, body, top, band, drop };
  }, []);

  const liquidMat = useMemo(createLiquidMaterial, []);
  const surfaceMat = useMemo(createSurfaceMaterial, []);
  const condensation = useMemo(() => createCondensationNormal(256), []);
  const glassMat = useMemo(() => {
    const g = m.glass.clone();
    g.normalMap = condensation;
    g.normalScale.set(0, 0);
    g.normalMap.repeat.set(3, 2);
    return g;
  }, [m.glass, condensation]);
  const decalTex = useMemo(() => createBrandDecal({ width: 1024, height: 300 }), []);
  const decalMat = useMemo(() => new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [decalTex]);

  // Caramel drizzle tracing down the inner wall
  const caramelGeos = useMemo(() => {
    return [0, 1, 2, 3].map((k) => {
      const pts: THREE.Vector3[] = [];
      const a0 = k * 1.6 + 0.4;
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const ang = a0 + Math.sin(t * 2.2 + k) * 0.08 + t * 0.35;
        const r = G.rInner - 0.008;
        pts.push(new THREE.Vector3(Math.cos(ang) * r, G.height - 0.05 - t * (1.1 + k * 0.18), Math.sin(ang) * r));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0085 - k * 0.0012, 6, false);
    });
  }, []);

  // Condensation droplets on the outside of the glass
  useEffect(() => {
    const mesh = drops.current;
    if (!mesh || q.condensation === 0) return;
    const mtx = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < q.condensation; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = 0.18 + Math.pow(Math.random(), 0.8) * (G.height - 0.45);
      pos.set(Math.cos(a) * (G.rOuter + 0.002), y, Math.sin(a) * (G.rOuter + 0.002));
      quat.setFromUnitVectors(up, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
      const s = 0.006 + Math.pow(Math.random(), 3) * 0.022;
      scl.set(s, s, s);
      mtx.compose(pos, quat, scl);
      mesh.setMatrixAt(i, mtx);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [q.condensation]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      caramelGeos.forEach((g) => g.dispose());
      liquidMat.mat.dispose();
      surfaceMat.mat.dispose();
      condensation.dispose();
      glassMat.dispose();
      decalTex.dispose();
      decalMat.dispose();
    },
    [geo, caramelGeos, liquidMat, surfaceMat, condensation, glassMat, decalTex, decalMat],
  );

  useFrame((state) => {
    const p = hero.p;
    const t = state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    g.visible = p > T.grounds[0];

    // Glass rises into frame as the portafilter locks in, then slowly turns in the final reveal.
    const enter = ease.outCubic(sub(p, [T.grounds[0], T.portafilterMove[1]]));
    g.position.y = (1 - enter) * -1.2;
    const fin = sub(p, [T.reveal[0], 1]);
    g.rotation.y = fin * 1.1 + (fin > 0 ? Math.sin(t * 0.3) * 0.04 : 0) - 0.15;

    const liq = liquidState(p);
    const L = Math.max(0.001, liq.level);
    if (liquid.current) {
      liquid.current.visible = liq.level > 0.004;
      liquid.current.scale.set(1, L, 1);
      liquid.current.position.y = G.base;
    }
    liquidMat.uniforms.uLevel.value = L;
    liquidMat.uniforms.uMilk.value = liq.milkFrac;
    liquidMat.uniforms.uTurb.value = liq.turbulence;
    liquidMat.uniforms.uTime.value = t;

    if (surface.current) {
      surface.current.visible = liq.level > 0.004;
      surface.current.position.y = G.base + L + 0.001;
    }
    const sp = sub(p, T.splash);
    surfaceMat.uniforms.uTime.value = t;
    surfaceMat.uniforms.uRipple.value = (sp > 0 && sp < 1 ? (1 - sp) * 1.4 : 0) + liq.turbulence * 0.25;
    surfaceMat.uniforms.uWave.value = sp * 0.9;
    surfaceMat.uniforms.uSwirl.value = smoothstep(0.2, 1, liq.pourMilk);
    surfaceMat.uniforms.uA.value.set(liq.pourMilk > 0.05 ? "#c9a27a" : "#9a5f2e");
    surfaceMat.uniforms.uB.value.set(liq.pourMilk > 0.05 ? "#6e3d1d" : "#4a240f");

    // Final: condensation, brand decal, caramel ribbons
    const reveal = smoothstep(T.reveal[0], T.reveal[1], p);
    glassMat.normalScale.setScalar(reveal * 0.35);
    decalMat.opacity = reveal * 0.88;
    if (decal.current) decal.current.visible = reveal > 0.01;
    if (drops.current) drops.current.visible = reveal > 0.01;
    if (drops.current) drops.current.scale.setScalar(0.6 + 0.4 * reveal);
    const car = smoothstep(T.ingredients[0] + 0.02, T.ingredients[1] - 0.02, p);
    if (caramel.current) {
      caramel.current.visible = car > 0.01;
      caramel.current.scale.set(1, Math.max(0.001, car), 1);
      caramel.current.position.y = (1 - car) * (G.height - 0.05);
    }
  });

  return (
    <group ref={root} position={[G.x, G.y, G.z]}>
      <mesh ref={liquid} geometry={geo.body} material={liquidMat.mat} receiveShadow={q.shadows} />
      <mesh ref={surface} geometry={geo.top} material={surfaceMat.mat} />
      <group ref={caramel}>
        {caramelGeos.map((cg, i) => (
          <mesh key={i} geometry={cg} material={m.caramel} />
        ))}
      </group>
      <mesh geometry={geo.glass} material={glassMat} castShadow={q.shadows} renderOrder={1} />
      <mesh ref={decal} geometry={geo.band} material={decalMat} position={[0, 1.45, 0]} renderOrder={3} />
      {q.condensation > 0 && <instancedMesh ref={drops} args={[geo.drop, m.water, q.condensation]} frustumCulled={false} />}
    </group>
  );
}
