"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useScene } from "./context";
import { cameraTarget } from "./CameraRig";

/**
 * Studio lighting: a procedural HDR-style environment built from Lightformers (no downloads),
 * a warm key light whose shadow frustum follows the current subject, and a caramel rim.
 */
export function Lighting() {
  const { q } = useScene();
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);

  useFrame(() => {
    const k = key.current;
    if (k) {
      k.position.set(cameraTarget.x + 3.2, cameraTarget.y + 5.5, cameraTarget.z + 3.6);
      k.target.position.copy(cameraTarget);
      k.target.updateMatrixWorld();
    }
    const r = rim.current;
    if (r) {
      r.position.set(cameraTarget.x - 2.6, cameraTarget.y + 2.2, cameraTarget.z - 3.2);
      r.target.position.copy(cameraTarget);
      r.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} color="#ffe6cc" />
      <hemisphereLight args={["#f3dcc0", "#120c09", 0.25]} />
      <directionalLight
        ref={key}
        color="#ffe2c2"
        intensity={2.4}
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowMapSize}
        shadow-mapSize-height={q.shadowMapSize}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <spotLight ref={rim} color="#e0a46a" intensity={28} angle={0.6} penumbra={0.9} distance={14} decay={1.6} />
      <pointLight position={[2.5, 1.2, 2.5]} color="#ffd9b0" intensity={2.2} distance={8} decay={1.8} />

      <Environment resolution={q.tier === "low" ? 64 : 256} frames={1}>
        <color attach="background" args={["#0a0706"]} />
        {/* key softbox */}
        <Lightformer form="rect" intensity={3.2} color="#fff1df" position={[4, 5, 4]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        {/* long strip for crisp vertical highlights on glass & chrome */}
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[-4, 2, 2]} scale={[0.4, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[4.5, 2, -1]} scale={[0.3, 8, 1]} target={[0, 0, 0]} />
        {/* warm caramel bounce from below */}
        <Lightformer form="circle" intensity={1.4} color="#c58a52" position={[0, -4, 2]} scale={4} target={[0, 0, 0]} />
        {/* soft overhead */}
        <Lightformer form="ring" intensity={1.2} color="#ffe8cf" position={[0, 7, 0]} scale={3} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
