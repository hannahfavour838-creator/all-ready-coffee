"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, Preload, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { QUALITY, type QualitySettings } from "./quality";
import type { Tier } from "./store";
import { hero } from "./store";
import { SceneContext } from "./scene/context";
import { createMaterials, disposeMaterials } from "./scene/materials";
import { CameraRig } from "./scene/CameraRig";
import { Lighting } from "./scene/Lighting";
import { Beans } from "./scene/Beans";
import { Grinder } from "./scene/Grinder";
import { Espresso } from "./scene/Espresso";
import { Glass } from "./scene/Glass";
import { Milk } from "./scene/Milk";
import { Ingredients } from "./scene/Ingredients";
import { Splash } from "./scene/Splash";
import { Backdrop, Stage } from "./scene/Stage";
import { Titles } from "./scene/Titles";
import { Effects } from "./scene/Effects";

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current++;
    if (frames.current > 3) {
      done.current = true;
      hero.ready = true;
      onReady();
    }
  });
  return null;
}

/** Releases GPU memory when the canvas unmounts (route change, fallback switch). */
function Cleanup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(
    () => () => {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
      });
      gl.renderLists.dispose();
    },
    [gl, scene],
  );
  return null;
}

function SceneContents({ q }: { q: QualitySettings }) {
  const materials = useMemo(() => createMaterials({ transmission: q.transmission }), [q.transmission]);
  useEffect(() => () => disposeMaterials(materials), [materials]);
  const ctx = useMemo(() => ({ m: materials, q }), [materials, q]);

  return (
    <SceneContext.Provider value={ctx}>
      <CameraRig />
      <Lighting />
      <Backdrop />
      <fog attach="fog" args={["#0b0807", 9, 26]} />
      <Beans count={q.beans} shadows={q.shadows} />
      <Grinder />
      <Espresso />
      <Glass />
      <Milk />
      <Ingredients />
      <Splash />
      <Stage />
      <Titles />
      {q.tier !== "low" && <Sparkles count={q.tier === "high" ? 70 : 40} scale={[10, 12, 8]} position={[0, 5, 0]} size={2.2} speed={0.25} opacity={0.35} color="#d9b27c" noise={0.6} />}
      {q.post !== "none" && <Effects mode={q.post} />}
    </SceneContext.Provider>
  );
}

export default function HeroCanvas({ tier, active, onReady }: { tier: Tier; active: boolean; onReady: () => void }) {
  const [level, setLevel] = useState<Tier>(tier);
  const q = QUALITY[level];

  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active ? "always" : "never"}
      dpr={q.dpr}
      shadows={q.shadows ? "soft" : false}
      gl={{ antialias: q.post === "none", powerPreference: "high-performance", alpha: false, stencil: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 38, near: 0.05, far: 80, position: [0, 9.65, 6.6] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#0b0807");
        scene.background = new THREE.Color("#0b0807");
      }}
      aria-hidden
    >
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => setLevel((l) => (l === "high" ? "medium" : "low"))}
        bounds={() => [38, 58]}
      >
        <AdaptiveDpr pixelated={false} />
        <Suspense fallback={null}>
          <SceneContents q={q} />
          <ReadySignal onReady={onReady} />
          <Preload all />
        </Suspense>
        <Cleanup />
      </PerformanceMonitor>
    </Canvas>
  );
}
