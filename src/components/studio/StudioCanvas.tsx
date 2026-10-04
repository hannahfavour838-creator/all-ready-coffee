"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { ProductVisual } from "@/lib/db/schema";
import { createMaterials } from "@/components/hero/scene/materials";
import { ProductModel } from "./ProductModel";

/** Offline product photography rig: renders a product on a transparent background for image capture. */
export function StudioCanvas({ visual }: { visual: ProductVisual }) {
  const m = useMemo(() => createMaterials({ transmission: false }), []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(t);
  }, []);
  const tall = visual.vessel === "tall";
  const camZ = tall ? 7.0 : visual.vessel === "tumbler" ? 5.6 : visual.vessel === "mug" ? 5.2 : visual.vessel === "pastry" ? 5.6 : 4.4;
  const camY = tall ? 1.3 : visual.vessel === "pastry" ? 2.2 : visual.vessel === "cup" || visual.vessel === "demitasse" ? 2.4 : 1.3;
  return (
    <div style={{ width: 900, height: 1100 }} data-ready={ready ? "1" : "0"} id="studio">
      <Canvas
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        dpr={1}
        shadows="soft"
        camera={{ fov: 30, position: [0, camY, camZ], near: 0.1, far: 50 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, visual.vessel === "pastry" ? -0.2 : 0, 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.15} />
          <directionalLight position={[3, 5, 4]} intensity={2.4} color="#ffe2c2" castShadow shadow-mapSize={[2048, 2048]} />
          <spotLight position={[-3, 2.5, -3]} intensity={30} angle={0.7} penumbra={1} color="#e0a46a" />
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={3.2} color="#fff1df" position={[4, 5, 4]} scale={[5, 3, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={4} color="#ffffff" position={[-4, 2, 2]} scale={[0.4, 8, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[4.5, 2, -1]} scale={[0.3, 8, 1]} target={[0, 0, 0]} />
            <Lightformer form="circle" intensity={1.4} color="#c58a52" position={[0, -4, 2]} scale={4} target={[0, 0, 0]} />
          </Environment>
          <group rotation={[0, -0.35, 0]}>
            <ProductModel visual={visual} m={m} />
          </group>
          <ContactShadows position={[0, tall ? -1.27 : visual.vessel === "tumbler" ? -0.81 : visual.vessel === "mug" ? -0.67 : visual.vessel === "pastry" ? -0.39 : -0.42, 0]} opacity={0.55} scale={5} blur={2.6} far={2} color="#000000" />
        </Suspense>
      </Canvas>
    </div>
  );
}
