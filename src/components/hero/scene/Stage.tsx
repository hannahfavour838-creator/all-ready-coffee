"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "./context";
import { hero } from "../store";
import { T, ease, smoothstep, sub } from "../timeline";
import { createBeanGeometry, createBeanMaterial } from "./beanGeometry";
import { createChocolateSquareGeometry, createCinnamonGeometry } from "./props";
import { createBarkNormal, createNoiseNormal } from "./textures";

/** Backdrop, floor, pedestal and the final still-life props. */
export function Stage() {
  const { m, q } = useScene();
  const pedestal = useRef<THREE.Group>(null);
  const props = useRef<THREE.Group>(null);
  const beans = useRef<THREE.InstancedMesh>(null);

  const stoneNormal = useMemo(() => createNoiseNormal(256, 16, 21, 1.1), []);
  const stoneMat = useMemo(() => {
    const s = m.stone.clone();
    s.normalMap = stoneNormal;
    s.normalScale.set(0.35, 0.35);
    return s;
  }, [m.stone, stoneNormal]);
  const bark = useMemo(() => createBarkNormal(128), []);
  const cinMat = useMemo(() => {
    const c = m.cinnamon.clone();
    c.normalMap = bark;
    return c;
  }, [m.cinnamon, bark]);
  const geo = useMemo(
    () => ({
      pedestal: new THREE.CylinderGeometry(1.45, 1.5, 0.22, 96, 1),
      bevel: new THREE.TorusGeometry(1.45, 0.012, 8, 128),
      cinnamon: createCinnamonGeometry(1.0),
      square: createChocolateSquareGeometry(),
      bean: createBeanGeometry(28),
    }),
    [],
  );
  const beanMat = useMemo(() => createBeanMaterial(), []);
  const floorMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#bbbbbb");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const alpha = new THREE.CanvasTexture(c);
    return new THREE.MeshStandardMaterial({ color: "#120d0a", roughness: 0.55, metalness: 0.25, transparent: true, alphaMap: alpha, depthWrite: false, envMapIntensity: 0.6 });
  }, []);
  const BEANS = q.tier === "low" ? 10 : 22;
  const beanLayout = useMemo(() => {
    const out: { x: number; z: number; ry: number; rz: number; d: number }[] = [];
    for (let i = 0; i < BEANS; i++) {
      const a = (i / BEANS) * Math.PI * 2 + Math.sin(i * 3.3) * 0.4;
      const r = 1.0 + Math.abs(Math.sin(i * 7.7)) * 0.38;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.85 + 0.15, ry: i * 1.7, rz: Math.sin(i) * 0.3, d: (i % 6) * 0.012 });
    }
    return out;
  }, [BEANS]);

  useEffect(
    () => () => {
      stoneNormal.dispose();
      stoneMat.dispose();
      bark.dispose();
      cinMat.dispose();
      beanMat.dispose();
      floorMat.alphaMap?.dispose();
      floorMat.dispose();
      Object.values(geo).forEach((g) => g.dispose());
    },
    [stoneNormal, stoneMat, bark, cinMat, beanMat, floorMat, geo],
  );

  const mtx = useMemo(() => new THREE.Matrix4(), []);
  const pv = useMemo(() => new THREE.Vector3(), []);
  const qv = useMemo(() => new THREE.Quaternion(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);
  const ev = useMemo(() => new THREE.Euler(), []);

  useFrame(() => {
    const p = hero.p;
    const r = ease.outCubic(sub(p, [T.reveal[0] - 0.02, T.reveal[1]]));
    if (pedestal.current) {
      pedestal.current.visible = r > 0.001;
      pedestal.current.position.y = -0.11 - (1 - r) * 0.6;
    }
    if (props.current) props.current.visible = r > 0.001;
    const mesh = beans.current;
    if (mesh) {
      mesh.visible = r > 0.001;
      beanLayout.forEach((b, i) => {
        const k = smoothstep(i / BEANS * 0.5, i / BEANS * 0.5 + 0.5, r);
        pv.set(b.x, 0.03 + (1 - ease.outCubic(k)) * 1.2, b.z);
        ev.set(Math.PI / 2 - 0.1 + b.d * 4, b.ry, b.rz + (1 - k) * 3);
        qv.setFromEuler(ev);
        sv.setScalar(1.25 * k);
        mtx.compose(pv, qv, sv);
        mesh.setMatrixAt(i, mtx);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* floor: a soft-edged disc that fades into the backdrop, so there is never a hard horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow={q.shadows} material={floorMat}>
        <circleGeometry args={[9, 64]} />
      </mesh>

      <group ref={pedestal}>
        <mesh geometry={geo.pedestal} material={stoneMat} receiveShadow={q.shadows} castShadow={q.shadows} />
        <mesh geometry={geo.bevel} material={m.brass} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.11, 0]} />
      </group>

      <group ref={props}>
        <mesh geometry={geo.cinnamon} material={cinMat} position={[-1.05, 0.06, 0.55]} rotation={[Math.PI / 2, 0, 0.5]} castShadow={q.shadows} />
        <mesh geometry={geo.cinnamon} material={cinMat} position={[-0.9, 0.06, 0.78]} rotation={[Math.PI / 2, 0.1, 0.35]} castShadow={q.shadows} />
        <mesh geometry={geo.square} material={m.chocolate} position={[1.05, 0.04, 0.55]} rotation={[0.0, 0.5, 0]} castShadow={q.shadows} />
        <mesh geometry={geo.square} material={m.chocolate} position={[1.12, 0.12, 0.42]} rotation={[0.18, 0.95, 0.12]} castShadow={q.shadows} />
      </group>
      <instancedMesh ref={beans} args={[geo.bean, beanMat, BEANS]} castShadow={q.shadows} frustumCulled={false} />
    </group>
  );
}

/** Warm studio backdrop: a huge inward sphere with a vertical gradient and a soft glow behind the subject. */
export function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uGlow: { value: new THREE.Vector3(0, 2, -10) }, uP: { value: 0 } },
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          varying vec3 vW; uniform vec3 uGlow; uniform float uP;
          void main(){
            vec3 d = normalize(vW);
            float h = d.y * 0.5 + 0.5;
            vec3 top = vec3(0.045, 0.033, 0.027);
            vec3 bottom = vec3(0.018, 0.013, 0.011);
            vec3 col = mix(bottom, top, smoothstep(0.2, 0.85, h));
            float g = pow(max(dot(d, normalize(uGlow)), 0.0), 6.0);
            col += vec3(0.30, 0.17, 0.09) * g * 0.55;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ camera }) => {
    // glow sits behind whatever the camera is looking at
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    mat.uniforms.uGlow.value.lerp(dir.multiplyScalar(10).add(new THREE.Vector3(0, 1.5, 0)), 0.08);
  });
  return (
    <mesh material={mat} scale={60} renderOrder={-1}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}
