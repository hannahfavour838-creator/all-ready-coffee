import * as THREE from "three";

/* Procedural textures generated at runtime — zero network requests, tiny memory footprint. */

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function heightToNormal(height: Float32Array, size: number, strength: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const h = (xx: number, yy: number) => height[((yy + size) % size) * size + ((xx + size) % size)]!;
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Condensation: hundreds of tiny droplet bumps + a few running trails. */
export function createCondensationNormal(size = 256, seed = 11) {
  const r = rng(seed);
  const h = new Float32Array(size * size);
  const drop = (cx: number, cy: number, rad: number) => {
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) {
        const d = Math.sqrt(x * x + y * y) / rad;
        if (d > 1) continue;
        const px = (Math.round(cx + x) + size) % size;
        const py = (Math.round(cy + y) + size) % size;
        h[py * size + px] = Math.max(h[py * size + px]!, Math.sqrt(1 - d * d));
      }
  };
  for (let i = 0; i < 700; i++) drop(r() * size, r() * size, 1 + Math.floor(r() * r() * 4));
  for (let i = 0; i < 9; i++) {
    let x = r() * size;
    const y0 = r() * size;
    const len = 30 + r() * 90;
    for (let y = 0; y < len; y++) {
      x += (r() - 0.5) * 0.8;
      drop(x, y0 + y, 1 + (y > len - 4 ? 2 : 0));
    }
  }
  return heightToNormal(h, size, 2.2);
}

/** Fine value-noise normal (stone, bark, chocolate micro-texture). */
export function createNoiseNormal(size = 128, freq = 8, seed = 3, strength = 1.5) {
  const r = rng(seed);
  const g = freq + 1;
  const grid = new Float32Array(g * g).map(() => r());
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let amp = 1, total = 0, f = 1;
      for (let o = 0; o < 3; o++) {
        const fx = ((x / size) * freq * f) % freq;
        const fy = ((y / size) * freq * f) % freq;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const v = (a: number, b: number) => grid[(b % freq) * g + (a % freq)]!;
        const n = v(ix, iy) * (1 - sx) * (1 - sy) + v(ix + 1, iy) * sx * (1 - sy) + v(ix, iy + 1) * (1 - sx) * sy + v(ix + 1, iy + 1) * sx * sy;
        total += n * amp;
        amp *= 0.5;
        f *= 2;
      }
      h[y * size + x] = total;
    }
  return heightToNormal(h, size, strength);
}

/** Bark stripes for cinnamon quills. */
export function createBarkNormal(size = 128) {
  const r = rng(5);
  const h = new Float32Array(size * size);
  const phases = Array.from({ length: 12 }, () => r() * Math.PI * 2);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      phases.forEach((ph, k) => (v += Math.sin((x / size) * Math.PI * 2 * (k + 3) + ph + Math.sin(y * 0.05 + k) * 0.6) / (k + 1)));
      h[y * size + x] = v * 0.5 + r() * 0.15;
    }
  return heightToNormal(h, size, 1.2);
}

/** Brand decal for the glass and grinder — rendered with the site's display face when available. */
export function createBrandDecal(opts: { width?: number; height?: number; text?: string; sub?: string; color?: string } = {}) {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = opts.color ?? "rgba(244,236,222,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(height * 0.42)}px "Instrument Serif", "Iowan Old Style", Georgia, serif`;
  ctx.fillText(opts.text ?? "All Ready", width / 2, height * 0.42);
  ctx.font = `600 ${Math.round(height * 0.1)}px ui-sans-serif, system-ui, sans-serif`;
  const sub = (opts.sub ?? "COFFEE · PORTLAND").split("").join(String.fromCharCode(8202));
  ctx.fillText(sub, width / 2, height * 0.78);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Radial soft sprite for particles (grounds, cocoa dust, steam). */
export function createSoftSprite(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
