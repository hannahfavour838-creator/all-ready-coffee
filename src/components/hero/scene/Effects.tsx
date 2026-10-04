"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { cameraTarget } from "./CameraRig";
import { hero } from "../store";
import { T, sub } from "../timeline";

/** Restrained cinematic finish. "full" adds depth of field + ambient occlusion; "lite" keeps bloom/grain only. */
export function Effects({ mode }: { mode: "full" | "lite" }) {
  const dof = useRef<DepthOfFieldEffect>(null);

  useFrame(() => {
    const d = dof.current;
    if (!d) return;
    d.target = cameraTarget;
    // shallower focus for the splash close-up so near droplets blur toward the lens
    const s = sub(hero.p, T.splash);
    const close = s > 0 && s < 1 ? 1 : 0;
    d.bokehScale = 2.2 + close * 2.6;
  });

  if (mode === "lite") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.94} luminanceSmoothing={0.2} radius={0.7} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
        <Vignette offset={0.28} darkness={0.72} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={0.35} distanceFalloff={0.6} intensity={1.6} quality="medium" halfRes />
      <DepthOfField ref={dof} focalLength={0.045} bokehScale={2.2} worldFocusRange={2.6} worldFocusDistance={4} />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.94} luminanceSmoothing={0.2} radius={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <Vignette offset={0.26} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
