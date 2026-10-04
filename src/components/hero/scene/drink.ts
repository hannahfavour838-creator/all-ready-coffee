import * as THREE from "three";
import { T, smoothstep, sub, window4 } from "../timeline";

/** Liquid state of the glass at progress p — shared by the glass, streams and splash. */
export function liquidState(p: number) {
  const e = sub(p, T.espresso);
  const mk = sub(p, T.milk);
  const ing = sub(p, T.ingredients);
  const esp = 0.42 * smoothstep(0.12, 0.88, e);
  const milk = 1.22 * smoothstep(0.1, 0.9, mk);
  const disp = 0.2 * smoothstep(0.25, 0.85, ing);
  const level = esp + milk + disp;
  return {
    level,
    milkFrac: level > 0.001 ? milk / Math.max(0.0001, esp + milk) : 0,
    turbulence: Math.max(window4(mk, 0.05, 0.25, 0.8, 1.0) * 1.0, window4(sub(p, T.splash), 0.0, 0.1, 0.4, 0.9) * 0.7),
    pourMilk: mk,
    pourEspresso: e,
  };
}

/** Lightweight lit shader for pouring streams (espresso and milk). */
export function createStreamMaterial(a: string, b: string, opts: { stripes?: number; gloss?: number } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uLen: { value: 1 },
      uOpacity: { value: 1 },
      uStripes: { value: opts.stripes ?? 1 },
      uGloss: { value: opts.gloss ?? 0.6 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uLen;
      varying vec3 vN; varying vec3 vV; varying float vY; varying float vA;
      void main(){
        vec3 p = position;
        float y = -p.y; // 0 at spout, 1 at landing
        float taper = mix(1.0, 0.62, smoothstep(0.0, 0.35, y)) * (1.0 + 0.25 * smoothstep(0.85, 1.0, y));
        p.xz *= taper;
        float wob = sin(y * uLen * 7.0 - uTime * 9.0) * 0.18 + sin(y * uLen * 13.0 - uTime * 15.0) * 0.07;
        p.x += wob * y;
        vY = y; vA = atan(position.z, position.x);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform float uTime; uniform float uLen; uniform float uOpacity; uniform float uStripes; uniform float uGloss;
      varying vec3 vN; varying vec3 vV; varying float vY; varying float vA;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(vV);
        float n = noise(vec2(vA * 2.0, vY * uLen * 9.0 - uTime * 14.0));
        n = mix(0.5, n, uStripes);
        vec3 base = mix(uA, uB, smoothstep(0.25, 0.85, n));
        vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0) * uGloss;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
        vec3 col = base * (0.42 + 0.78 * diff) + spec + fres * mix(uB, vec3(1.0), 0.4) * 0.35;
        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

/** A unit stream: top at y = 0, hanging down to y = -1. Scale y = length, xz = radius. */
export function createStreamGeometry(radial = 14, height = 48) {
  const g = new THREE.CylinderGeometry(1, 1, 1, radial, height, true);
  g.translate(0, -0.5, 0);
  return g;
}
