"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ProductVisual } from "@/lib/db/schema";
import type { SceneMaterials } from "@/components/hero/scene/materials";
import { createBeanGeometry, createBeanMaterial } from "@/components/hero/scene/beanGeometry";
import { createCinnamonGeometry, createIceGeometry } from "@/components/hero/scene/props";
import { createBarkNormal, createBrandDecal, createCondensationNormal, createNoiseNormal } from "@/components/hero/scene/textures";

const v2 = (r: number, y: number) => new THREE.Vector2(r, y);

/** Latte art / crema / foam top texture drawn procedurally on a canvas. */
function createTopTexture(visual: ProductVisual) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const base = visual.liquid;
  const top = visual.top;
  // crema/foam gradient
  const hasArt = (visual.art ?? "none") !== "none";
  // With latte art, the canvas is crema-coloured and the art is poured in microfoam on top.
  const crema = hasArt ? new THREE.Color(base).lerp(new THREE.Color("#c99a68"), 0.55).getStyle() : top;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, crema);
  g.addColorStop(0.8, crema);
  g.addColorStop(0.93, hasArt ? top : crema);
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // tiger mottling
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(60,30,12,${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  const art = visual.art ?? "none";
  if (art !== "none") {
    // art is drawn in espresso-tinted latte color over a light foam
    ctx.fillStyle = top;
    ctx.strokeStyle = top;
    const cx = S / 2;
    if (art === "heart") {
      ctx.beginPath();
      ctx.moveTo(cx, S * 0.7);
      ctx.bezierCurveTo(S * 0.2, S * 0.48, S * 0.28, S * 0.22, cx, S * 0.36);
      ctx.bezierCurveTo(S * 0.72, S * 0.22, S * 0.8, S * 0.48, cx, S * 0.7);
      ctx.fill();
    } else if (art === "tulip") {
      [0.62, 0.48, 0.34].forEach((y, i) => {
        ctx.beginPath();
        ctx.ellipse(cx, S * y, S * (0.2 - i * 0.03), S * (0.09 - i * 0.01), 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillRect(cx - 4, S * 0.3, 8, S * 0.42);
    } else {
      // rosetta
      for (let i = 0; i < 9; i++) {
        const y = S * (0.72 - i * 0.05);
        const w = S * (0.26 - i * 0.022);
        ctx.beginPath();
        ctx.ellipse(cx, y, w, S * 0.03, 0, Math.PI, 0);
        ctx.lineWidth = 9;
        ctx.stroke();
      }
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, S * 0.25);
      ctx.lineTo(cx, S * 0.78);
      ctx.stroke();
    }
  }
  if (visual.toppings?.includes("caramel")) {
    ctx.strokeStyle = "rgba(168,98,38,0.95)";
    ctx.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(S * 0.15, S * (0.25 + i * 0.12));
      ctx.bezierCurveTo(S * 0.4, S * (0.15 + i * 0.12), S * 0.6, S * (0.35 + i * 0.12), S * 0.85, S * (0.25 + i * 0.12));
      ctx.stroke();
    }
  }
  if (visual.toppings?.includes("cocoa") || visual.toppings?.includes("chocolate")) {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = `rgba(58,30,14,${0.3 + Math.random() * 0.5})`;
      const r = Math.sqrt(Math.random()) * S * 0.45;
      const a = Math.random() * Math.PI * 2;
      ctx.fillRect(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, 2.5, 2.5);
    }
  }
  if (visual.toppings?.includes("salt")) {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(S * 0.3 + Math.random() * S * 0.4, S * 0.3 + Math.random() * S * 0.4, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type VesselSpec = { outer: THREE.Vector2[]; liquidR: number; liquidRBottom?: number; liquidH: number; liquidBase: number; glass: boolean; handle?: { r: number; tube: number; y: number; x: number }; saucer?: boolean; height: number };

const VESSELS: Record<Exclude<ProductVisual["vessel"], "pastry">, VesselSpec> = {
  demitasse: { outer: [v2(0.001, 0), v2(0.34, 0), v2(0.4, 0.06), v2(0.52, 0.5), v2(0.54, 0.62), v2(0.5, 0.62), v2(0.47, 0.52), v2(0.34, 0.1), v2(0.001, 0.1)], liquidR: 0.47, liquidRBottom: 0.33, liquidH: 0.4, liquidBase: 0.1, glass: false, handle: { r: 0.13, tube: 0.035, y: 0.36, x: 0.58 }, saucer: true, height: 0.62 },
  cup: { outer: [v2(0.001, 0), v2(0.38, 0), v2(0.46, 0.08), v2(0.7, 0.62), v2(0.74, 0.78), v2(0.69, 0.78), v2(0.65, 0.64), v2(0.4, 0.12), v2(0.001, 0.12)], liquidR: 0.66, liquidRBottom: 0.39, liquidH: 0.5, liquidBase: 0.12, glass: false, handle: { r: 0.16, tube: 0.04, y: 0.48, x: 0.78 }, saucer: true, height: 0.78 },
  mug: { outer: [v2(0.001, 0), v2(0.5, 0), v2(0.56, 0.05), v2(0.6, 1.25), v2(0.58, 1.3), v2(0.54, 1.3), v2(0.54, 0.12), v2(0.001, 0.12)], liquidR: 0.53, liquidH: 1.08, liquidBase: 0.12, glass: true, handle: { r: 0.3, tube: 0.05, y: 0.72, x: 0.66 }, height: 1.3 },
  tall: { outer: [v2(0.001, 0), v2(0.72, 0), v2(0.78, 0.05), v2(0.78, 2.47), v2(0.76, 2.5), v2(0.72, 2.5), v2(0.72, 0.18), v2(0.001, 0.16)], liquidR: 0.705, liquidH: 1.95, liquidBase: 0.16, glass: true, height: 2.5 },
  tumbler: { outer: [v2(0.001, 0), v2(0.68, 0), v2(0.74, 0.05), v2(0.8, 1.55), v2(0.78, 1.58), v2(0.74, 1.58), v2(0.68, 0.2), v2(0.001, 0.2)], liquidR: 0.72, liquidRBottom: 0.67, liquidH: 1.15, liquidBase: 0.2, glass: true, height: 1.58 },
};

export function ProductModel({ visual, m }: { visual: ProductVisual; m: SceneMaterials }) {
  const assets = useMemo(() => {
    const top = createTopTexture(visual);
    const condensation = createCondensationNormal(256, 7);
    const bark = createBarkNormal(128);
    const crumb = createNoiseNormal(256, 20, 4, 2.2);
    const decal = createBrandDecal({ width: 1024, height: 300 });
    return { top, condensation, bark, crumb, decal };
  }, [visual]);
  useEffect(() => () => Object.values(assets).forEach((t) => t.dispose()), [assets]);
  const spec0 = visual.vessel === "pastry" ? null : VESSELS[visual.vessel];
  const cinGeo = useMemo(() => createCinnamonGeometry((spec0?.height ?? 1) * 0.85), [spec0?.height]);
  useEffect(() => () => cinGeo.dispose(), [cinGeo]);

  if (visual.vessel === "pastry") return <Pastry visual={visual} crumb={assets.crumb} m={m} />;
  const spec = VESSELS[visual.vessel];
  const layers = visual.layers?.length ? visual.layers : [visual.liquid, visual.liquid];

  return (
    <group position={[0, -spec.height / 2, 0]}>
      <Vessel spec={spec} m={m} condensation={visual.ice ? assets.condensation : null} decal={spec.glass && spec.height > 1.4 ? assets.decal : null} />
      <LayeredLiquid spec={spec} layers={layers} top={assets.top} />
      {visual.ice && <Ice spec={spec} m={m} />}
      {visual.toppings?.includes("whip") && <Whip spec={spec} />}
      {visual.toppings?.includes("cinnamon") && (
        <mesh geometry={cinGeo} position={[spec.liquidR * 0.45, spec.liquidBase + spec.liquidH + spec.height * 0.18, -spec.liquidR * 0.25]} rotation={[0.15, 0.4, -0.32]}>
          <meshStandardMaterial color="#7a3d1c" roughness={0.85} normalMap={assets.bark} />
        </mesh>
      )}
      {visual.toppings?.includes("chocolate") && <ChocolateShavings spec={spec} m={m} />}
      {spec.saucer && (
        <mesh position={[0, -0.02, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[spec.liquidR * 1.45, spec.liquidR * 1.3, 0.05, 72]} />
          <meshPhysicalMaterial color="#f2ece3" roughness={0.18} clearcoat={0.8} />
        </mesh>
      )}
    </group>
  );
}

function Vessel({ spec, m, condensation, decal }: { spec: VesselSpec; m: SceneMaterials; condensation: THREE.Texture | null; decal: THREE.Texture | null }) {
  const geo = useMemo(() => new THREE.LatheGeometry(spec.outer, 96), [spec]);
  const mat = useMemo(() => {
    if (!spec.glass) return new THREE.MeshPhysicalMaterial({ color: "#f3eee6", roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.1, sheen: 0.2 });
    const g = m.glass.clone();
    g.opacity = 0.16;
    void condensation;
    return g;
  }, [spec, m.glass, condensation]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  const r = spec.outer.reduce((a, p) => Math.max(a, p.x), 0);
  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow renderOrder={2} />
      {spec.handle && (
        <mesh position={[spec.handle.x, spec.handle.y, 0]} rotation={[0, 0, -Math.PI / 2]} material={mat} castShadow>
          <torusGeometry args={[spec.handle.r, spec.handle.tube, 16, 40, Math.PI]} />
        </mesh>
      )}
      {decal && (
        <mesh position={[0, spec.height * 0.55, 0]} renderOrder={3}>
          <cylinderGeometry args={[r + 0.006, r + 0.006, 0.42, 64, 1, true, -0.7, 1.4]} />
          <meshBasicMaterial map={decal} transparent depthWrite={false} toneMapped={false} opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

function LayeredLiquid({ spec, layers, top }: { spec: VesselSpec; layers: string[]; top: THREE.Texture }) {
  const mat = useMemo(() => {
    const cols = layers.map((c) => new THREE.Color(c));
    const m = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.2, clearcoat: 0.5, sheen: 0.3 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uC0 = { value: cols[0] };
      sh.uniforms.uC1 = { value: cols[Math.min(1, cols.length - 1)] };
      sh.uniforms.uC2 = { value: cols[cols.length - 1] };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vH;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvH = position.y;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vH; uniform vec3 uC0, uC1, uC2;")
        .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 c = mix(uC0, uC1, smoothstep(0.15, 0.55, vH));\nc = mix(c, uC2, smoothstep(0.55, 0.92, vH));\ndiffuseColor.rgb = c;");
    };
    return m;
  }, [layers]);
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(spec.liquidR, spec.liquidRBottom ?? spec.liquidR * 0.97, 1, 72, 20);
    g.translate(0, 0.5, 0);
    return g;
  }, [spec]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  const topR = spec.liquidR;
  return (
    <group>
      <mesh geometry={geo} material={mat} position={[0, spec.liquidBase, 0]} scale={[1, spec.liquidH, 1]} />
      <mesh position={[0, spec.liquidBase + spec.liquidH + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[topR, 72]} />
        <meshPhysicalMaterial map={top} roughness={0.32} clearcoat={0.6} />
      </mesh>
    </group>
  );
}

function Ice({ spec, m }: { spec: VesselSpec; m: SceneMaterials }) {
  const geo = useMemo(() => createIceGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const s = spec.liquidR / 0.7;
  const y = spec.liquidBase + spec.liquidH;
  const cubes: [number, number, number, number][] = [
    [-0.3, -0.06, 0.22, 0.4],
    [0.26, -0.1, 0.2, 1.1],
    [0.0, 0.02, -0.25, 2.2],
    [-0.12, -0.32, -0.05, 0.7],
  ];
  return (
    <group>
      {cubes.map(([x, dy, z, r], i) => (
        <mesh key={i} geometry={geo} material={m.ice} position={[x * s, y + dy * s, z * s]} rotation={[r * 0.3, r, r * 0.2]} scale={s * 0.95} />
      ))}
    </group>
  );
}

function Whip({ spec }: { spec: VesselSpec }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = spec.liquidR * 0.92 * Math.cos(t * Math.PI * 0.5);
      pts.push(new THREE.Vector2(Math.max(0.001, r * (1 + 0.06 * Math.sin(t * 40))), t * spec.liquidR * 0.75));
    }
    return new THREE.LatheGeometry(pts, 48);
  }, [spec]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, spec.liquidBase + spec.liquidH - 0.02, 0]}>
      <meshPhysicalMaterial color="#f8f2e8" roughness={0.6} sheen={0.6} sheenColor="#ffffff" />
    </mesh>
  );
}

function ChocolateShavings({ spec, m }: { spec: VesselSpec; m: SceneMaterials }) {
  const y = spec.liquidBase + spec.liquidH + 0.02;
  return (
    <group>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = i * 2.4;
        const r = spec.liquidR * 0.55 * Math.sqrt((i + 1) / 14);
        return (
          <mesh key={i} material={m.chocolate} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[Math.random(), a, Math.random()]}>
            <boxGeometry args={[0.07, 0.012, 0.03]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ─────────── Bakery ─────────── */
function Pastry({ visual, crumb, m }: { visual: ProductVisual; crumb: THREE.Texture; m: SceneMaterials }) {
  const golden = useMemo(() => new THREE.MeshPhysicalMaterial({ color: visual.liquid, roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color("#ffcf8a"), normalMap: crumb, normalScale: new THREE.Vector2(0.4, 0.4) }), [visual.liquid, crumb]);
  const beanGeo = useMemo(() => createBeanGeometry(24), []);
  const beanMat = useMemo(() => createBeanMaterial(), []);
  useEffect(() => () => (golden.dispose(), beanGeo.dispose(), beanMat.dispose()), [golden, beanGeo, beanMat]);
  const kind = visual.pastry ?? "croissant";

  const plate = (
    <mesh position={[0, -0.36, 0]} receiveShadow>
      <cylinderGeometry args={[1.25, 1.15, 0.05, 72]} />
      <meshPhysicalMaterial color="#efe8dd" roughness={0.2} clearcoat={0.8} />
    </mesh>
  );

  if (kind === "banana-bread") {
    // a thick slice lying on its side, showing the crumb, with a domed crust on top
    return (
      <group rotation={[0.25, -0.6, 0]}>
        {plate}
        <mesh material={golden} position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[1.25, 0.42, 0.95, 8, 4, 8]} />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.32, 1, 1]} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 1.25, 40, 1, false, 0, Math.PI]} />
          <meshPhysicalMaterial color={visual.top} roughness={0.55} clearcoat={0.3} side={THREE.DoubleSide} />
        </mesh>
        {[[-0.4, -0.05, 0.48], [0.1, -0.14, 0.48], [0.38, 0.0, 0.48], [-0.1, 0.02, 0.48]].map(([x, y, z], i) => (
          <mesh key={i} position={[x!, y!, z!]} material={m.chocolate}>
            <sphereGeometry args={[0.055, 12, 8]} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "pain-au-chocolat") {
    // rectangular laminated pastry with chocolate batons peeking from the ends
    return (
      <group rotation={[0.3, -0.45, 0]}>
        {plate}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} material={golden} position={[0, -0.18 + i * 0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.25 - i * 0.08]} castShadow>
            <capsuleGeometry args={[0.2 - i * 0.012, 0.95, 8, 24]} />
          </mesh>
        ))}
        {[-0.12, 0.08].map((z, i) => (
          <mesh key={i} position={[0, 0.02 + i * 0.04, z]} material={m.chocolate}>
            <boxGeometry args={[1.5, 0.09, 0.12]} />
          </mesh>
        ))}
      </group>
    );
  }

  // croissant: tapered segments along a crescent
  const segs = 7;
  return (
    <group rotation={[0.35, 0.2, 0]}>
      {plate}
      {Array.from({ length: segs }).map((_, i) => {
        const t = i / (segs - 1) - 0.5;
        const a = t * 2.3;
        const r = 0.75;
        const size = 0.42 * (1 - Math.abs(t) * 1.15) + 0.08;
        return (
          <mesh key={i} material={golden} position={[Math.sin(a) * r, -0.05 + size * 0.2, -Math.cos(a) * r * 0.55 + 0.4]} rotation={[0, a, 0.15]} scale={[size * 1.15, size * 0.85, size * 1.25]} castShadow>
            <sphereGeometry args={[1, 32, 20]} />
          </mesh>
        );
      })}
      {kind === "almond-croissant" && (
        <group>
          {Array.from({ length: 18 }).map((_, i) => (
            <mesh key={i} position={[Math.sin(i * 1.3) * 0.6, 0.32 + Math.sin(i) * 0.05, 0.3 + Math.cos(i * 1.7) * 0.18]} rotation={[1.2, i, 0.3]}>
              <cylinderGeometry args={[0.06, 0.06, 0.012, 12]} />
              <meshStandardMaterial color="#e8cfa6" roughness={0.7} />
            </mesh>
          ))}
          {Array.from({ length: 60 }).map((_, i) => (
            <mesh key={`s${i}`} position={[Math.sin(i * 2.1) * 0.7, 0.36, 0.3 + Math.cos(i * 1.3) * 0.25]}>
              <sphereGeometry args={[0.012, 6, 4]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
      <mesh geometry={beanGeo} material={beanMat} position={[1.0, -0.28, 0.55]} rotation={[1.4, 0.4, 0]} scale={1.6} />
      <mesh geometry={beanGeo} material={beanMat} position={[1.15, -0.29, 0.25]} rotation={[1.5, 2.1, 0]} scale={1.5} />
    </group>
  );
}
