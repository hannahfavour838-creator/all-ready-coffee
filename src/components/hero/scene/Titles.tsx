"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { hero } from "../store";
import { window4 } from "../timeline";

const SERIF = "/fonts/instrument-serif-latin-400-normal.woff";
const SERIF_ITALIC = "/fonts/instrument-serif-latin-400-italic.woff";
const CREAM = "#f1e8d9";
const CARAMEL = "#d9b888";

type TitleProps = {
  text: string;
  position: [number, number, number];
  lookAt?: [number, number, number];
  size: number;
  win: [number, number, number, number];
  italic?: boolean;
  color?: string;
  maxWidth?: number;
  anchorX?: "left" | "center" | "right";
  drift?: number;
  letterSpacing?: number;
};

function Title({ text, position, lookAt, size, win, italic, color = CREAM, maxWidth, anchorX = "center", drift = 0.25, letterSpacing = -0.02 }: TitleProps) {
  const ref = useRef<THREE.Mesh & { fillOpacity?: number; material: THREE.Material }>(null);
  const base = useRef(new THREE.Vector3(...position));
  const once = useRef(false);

  useFrame(() => {
    const o = ref.current;
    if (!o) return;
    if (!once.current && lookAt) {
      o.lookAt(new THREE.Vector3(...lookAt));
      once.current = true;
    }
    const a = window4(hero.p, ...win);
    o.visible = a > 0.002;
    if (!o.visible) return;
    const m = o.material as THREE.Material & { opacity: number };
    m.opacity = a;
    m.transparent = true;
    o.position.set(base.current.x, base.current.y + (1 - a) * -drift, base.current.z);
  });

  return (
    <Text
      ref={ref}
      font={italic ? SERIF_ITALIC : SERIF}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      textAlign={anchorX}
      maxWidth={maxWidth}
      letterSpacing={letterSpacing}
      lineHeight={0.92}
      position={position}
      material-toneMapped={false}
      material-depthWrite={false}
    >
      {text}
    </Text>
  );
}

/** Editorial headlines placed *inside* the scene so beans, glass and droplets pass in front of and behind them. */
export function Titles() {
  const { viewport, camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const portrait = aspect < 0.9;
  // visible width at the welcome distance (≈6.6) → scale headline to fit
  const fit = aspect < 1 ? THREE.MathUtils.lerp(1, 1.75, Math.min(1, (1 - aspect) / 0.55)) : aspect < 1.3 ? 1.12 : 1;
  const visW = 2 * 6.6 * fit * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * aspect;
  const welcomeSize = Math.min(1.05, visW * (portrait ? 0.19 : 0.118));
  void viewport;

  return (
    <group>
      {/* 00 — Welcome */}
      <Title text="Welcome to" italic size={welcomeSize * 0.34} position={[0, 9.6 + welcomeSize * (portrait ? 1.25 : 0.82), 0]} win={[-1, 0, 0.05, 0.1]} color={CARAMEL} letterSpacing={0} />
      <Title
        text={portrait ? "All Ready\nCoffee" : "All Ready Coffee"}
        size={welcomeSize}
        position={[0, 9.62 - (portrait ? welcomeSize * 0.4 : 0), 0]}
        win={[-1, 0, 0.055, 0.11]}
        maxWidth={visW * 0.95}
        drift={0.4}
      />

      {/* 01 — Bean */}
      <Title text={portrait ? "Chosen\nbean by bean." : "Chosen bean by bean."} size={portrait ? 0.5 : 0.62} position={[0.2, 8.1, -2.6]} lookAt={[0.8, 9.0, 4.2]} win={[0.08, 0.12, 0.18, 0.215]} />
      {/* 02 — Grind */}
      <Title text={portrait ? "Ground the\nmoment you\norder." : "Ground the moment\nyou order."} size={portrait ? 0.38 : 0.48} position={[-0.9, 5.45, -2.4]} lookAt={[2.0, 5.6, 3.4]} win={[0.29, 0.32, 0.38, 0.41]} />
      {/* 03 — Espresso */}
      <Title text={portrait ? "Pulled in\ntwenty-eight\nseconds." : "Pulled in\ntwenty-eight seconds."} size={portrait ? 0.4 : 0.5} position={[0, 2.5, -2.8]} lookAt={[0, 2.6, 3.6]} win={[0.47, 0.5, 0.55, 0.575]} />
      {/* 04 — Milk */}
      <Title text="Softened with silk." italic size={portrait ? 0.4 : 0.52} position={[0.7, 2.45, -2.6]} lookAt={[-1.6, 2.4, 3.0]} win={[0.575, 0.6, 0.64, 0.66]} maxWidth={portrait ? 3 : 8} />
      {/* 05 — Craft */}
      <Title text={portrait ? "Finished\nwith intention." : "Finished with intention."} size={portrait ? 0.4 : 0.5} position={[0, 3.7, -2.6]} lookAt={[0.6, 3.6, 2.6]} win={[0.665, 0.69, 0.725, 0.745]} />

      {/* 07 — Final */}
      <Title
        text="Your coffee."
        size={portrait ? 0.62 : 0.56}
        position={portrait ? [0, 3.7, -1.6] : [-0.95, 2.2, -1.6]}
        win={[0.9, 0.94, 2, 3]}
        anchorX={portrait ? "center" : "right"}
        drift={0.5}
      />
      <Title
        text="Your moment."
        italic
        size={portrait ? 0.62 : 0.56}
        position={portrait ? [0, 3.0, -1.6] : [0.95, 1.0, -1.6]}
        win={[0.925, 0.965, 2, 3]}
        anchorX={portrait ? "center" : "left"}
        color={CARAMEL}
        drift={0.5}
      />
    </group>
  );
}
