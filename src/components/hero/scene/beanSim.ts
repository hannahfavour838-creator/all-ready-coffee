import { LAYOUT } from "../timeline";

/**
 * Deterministic rigid-body bake for the falling beans.
 * Beans are simulated as spheres (gravity, restitution, friction, spin, bean↔bean collisions with a
 * spatial hash, and a funnel collider for the grinder hopper). The result is baked into frames so the
 * sequence can be scrubbed forwards AND backwards by scroll — something a live physics engine can't do.
 */
export type BeanBake = {
  count: number;
  frames: number;
  duration: number;
  positions: Float32Array; // frames * count * 3
  quaternions: Float32Array; // frames * count * 4
  scale: Float32Array; // count — base size multiplier
  inHopper: Uint8Array; // 1 if the bean ends inside the hopper
  drift: Float32Array; // count * 4 — idle float params (phase, amp, speed, spin)
};

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bakeBeans(count: number, seed = 7): BeanBake {
  const R = 0.105;
  const G = -9.8;
  const DT = 1 / 200;
  const DURATION = 2.6;
  const STEPS = Math.round(DURATION / DT);
  const STORE_EVERY = 4;
  const FRAMES = Math.floor(STEPS / STORE_EVERY) + 1;
  const H = LAYOUT.hopper;
  const rand = rng(seed);

  const p = new Float32Array(count * 3);
  const v = new Float32Array(count * 3);
  const q = new Float32Array(count * 4);
  const w = new Float32Array(count * 3);
  const scale = new Float32Array(count);
  const inHopper = new Uint8Array(count);
  const drift = new Float32Array(count * 4);
  const flyer = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const isFlyer = i % 3 === 0;
    flyer[i] = isFlyer ? 1 : 0;
    let x: number, y: number, z: number;
    if (isFlyer) {
      // Foreground / background beans that sweep past the camera and fall away.
      const side = rand() < 0.5 ? -1 : 1;
      x = side * (0.6 + rand() * 3.6);
      if (x < 0 && x > -3.2) x = 0.4 + rand() * 3.4; // keep flyers away from the hopper column
      y = 8.6 + rand() * 2.6;
      z = rand() < 0.45 ? 2.6 + rand() * 3.0 : -3.5 + rand() * 4.5;
    } else {
      // Beans that pour into the hopper, spread wide around the headline at first.
      x = H.x + (rand() - 0.35) * 4.2;
      y = 8.4 + rand() * 3.4;
      z = (rand() - 0.5) * 2.8;
    }
    p.set([x, y, z], i * 3);

    // Ballistic aim toward the hopper mouth.
    const fallH = Math.max(0.5, y - (H.y1 + 0.3));
    const tFall = Math.sqrt((2 * fallH) / -G);
    if (!isFlyer) {
      const tx = H.x + (rand() - 0.5) * 0.9;
      const tz = H.z + (rand() - 0.5) * 0.9;
      v.set([(tx - x) / tFall, 0.6 + rand() * 0.8, (tz - z) / tFall], i * 3);
    } else {
      v.set([(rand() - 0.5) * 1.2, rand() * 1.0, (rand() - 0.5) * 1.2 + (z > 2 ? 0.8 : 0)], i * 3);
    }
    // random orientation
    const u1 = rand(), u2 = rand(), u3 = rand();
    const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
    q.set([s1 * Math.sin(2 * Math.PI * u2), s1 * Math.cos(2 * Math.PI * u2), s2 * Math.sin(2 * Math.PI * u3), s2 * Math.cos(2 * Math.PI * u3)], i * 4);
    w.set([(rand() - 0.5) * 9, (rand() - 0.5) * 9, (rand() - 0.5) * 9], i * 3);
    scale[i] = 0.88 + rand() * 0.28 + (isFlyer && z > 2.5 ? 0.25 : 0);
    drift.set([rand() * Math.PI * 2, 0.05 + rand() * 0.12, 0.4 + rand() * 0.6, (rand() - 0.5) * 0.8], i * 4);
  }

  const positions = new Float32Array(FRAMES * count * 3);
  const quaternions = new Float32Array(FRAMES * count * 4);
  const cell = R * 2.2;
  const grid = new Map<number, number[]>();
  const key = (cx: number, cy: number, cz: number) => ((cx + 512) * 1024 + (cy + 512)) * 1024 + (cz + 512);
  const slope = (H.r1 - H.r0) / (H.y1 - H.y0);
  const nLen = Math.sqrt(1 + slope * slope);

  let frame = 0;
  const store = () => {
    positions.set(p, frame * count * 3);
    quaternions.set(q, frame * count * 4);
    frame++;
  };
  store();

  for (let step = 1; step <= STEPS; step++) {
    // integrate
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      v[o + 1] += G * DT;
      p[o] += v[o] * DT;
      p[o + 1] += v[o + 1] * DT;
      p[o + 2] += v[o + 2] * DT;
    }

    // funnel + floor collisions (only for beans near the hopper column)
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const dx = p[o] - H.x;
      const dz = p[o + 2] - H.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1e-6;
      const y = p[o + 1];
      if (y < H.y1 + R && y > H.y0 - R && d < H.r1 + R * 1.5) {
        const Ry = H.r0 + slope * (y - H.y0);
        const signed = (Ry - d) / nLen; // distance to wall measured inward
        if (signed < R && d < Ry + R) {
          // inward normal in (radial, y): (-1, slope)/nLen
          const nx = (-dx / d) / nLen;
          const ny = slope / nLen;
          const nz = (-dz / d) / nLen;
          const pen = R - signed;
          p[o] += nx * pen;
          p[o + 1] += ny * pen;
          p[o + 2] += nz * pen;
          const vn = v[o] * nx + v[o + 1] * ny + v[o + 2] * nz;
          if (vn < 0) {
            v[o] -= 1.35 * vn * nx;
            v[o + 1] -= 1.35 * vn * ny;
            v[o + 2] -= 1.35 * vn * nz;
            v[o] *= 0.82;
            v[o + 2] *= 0.82;
            w[o] = w[o] * 0.7 + (v[o + 2]) * 6;
            w[o + 2] = w[o + 2] * 0.7 - v[o] * 6;
          }
          inHopper[i] = 1;
        }
        // burr floor
        if (d < H.r0 + 0.02 && y - R < H.y0) {
          p[o + 1] = H.y0 + R;
          if (v[o + 1] < 0) v[o + 1] *= -0.25;
          v[o] *= 0.7;
          v[o + 2] *= 0.7;
        }
      }
    }

    // bean ↔ bean (spatial hash)
    grid.clear();
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const k = key(Math.floor(p[o] / cell), Math.floor(p[o + 1] / cell), Math.floor(p[o + 2] / cell));
      const list = grid.get(k);
      if (list) list.push(i);
      else grid.set(k, [i]);
    }
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const cx = Math.floor(p[o] / cell), cy = Math.floor(p[o + 1] / cell), cz = Math.floor(p[o + 2] / cell);
      for (let ax = -1; ax <= 1; ax++)
        for (let ay = -1; ay <= 1; ay++)
          for (let az = -1; az <= 1; az++) {
            const list = grid.get(key(cx + ax, cy + ay, cz + az));
            if (!list) continue;
            for (const j of list) {
              if (j <= i) continue;
              const oj = j * 3;
              const dx = p[oj] - p[o], dy = p[oj + 1] - p[o + 1], dz = p[oj + 2] - p[o + 2];
              const d2 = dx * dx + dy * dy + dz * dz;
              const min = R * 2;
              if (d2 >= min * min || d2 < 1e-10) continue;
              const d = Math.sqrt(d2);
              const nx = dx / d, ny = dy / d, nz = dz / d;
              const pen = (min - d) * 0.5;
              p[o] -= nx * pen; p[o + 1] -= ny * pen; p[o + 2] -= nz * pen;
              p[oj] += nx * pen; p[oj + 1] += ny * pen; p[oj + 2] += nz * pen;
              const rv = (v[oj] - v[o]) * nx + (v[oj + 1] - v[o + 1]) * ny + (v[oj + 2] - v[o + 2]) * nz;
              if (rv < 0) {
                const jImp = -(1 + 0.35) * rv * 0.5;
                v[o] -= jImp * nx; v[o + 1] -= jImp * ny; v[o + 2] -= jImp * nz;
                v[oj] += jImp * nx; v[oj + 1] += jImp * ny; v[oj + 2] += jImp * nz;
                // collisions impart spin
                w[o] += (ny - nz) * jImp * 14; w[o + 1] += (nz - nx) * jImp * 14;
                w[oj] -= (ny - nz) * jImp * 14; w[oj + 1] -= (nz - nx) * jImp * 14;
              }
            }
          }
    }

    // rotation integration + resting damping
    for (let i = 0; i < count; i++) {
      const o = i * 3, oq = i * 4;
      const speed = Math.abs(v[o]) + Math.abs(v[o + 1]) + Math.abs(v[o + 2]);
      const damp = inHopper[i] && speed < 0.6 ? 0.9 : 0.999;
      w[o] *= damp; w[o + 1] *= damp; w[o + 2] *= damp;
      if (inHopper[i] && speed < 0.4) { v[o] *= 0.94; v[o + 2] *= 0.94; }
      const hx = w[o] * DT * 0.5, hy = w[o + 1] * DT * 0.5, hz = w[o + 2] * DT * 0.5;
      const qx = q[oq], qy = q[oq + 1], qz = q[oq + 2], qw = q[oq + 3];
      let nx = qx + hx * qw + hy * qz - hz * qy;
      let ny = qy + hy * qw + hz * qx - hx * qz;
      let nz = qz + hz * qw + hx * qy - hy * qx;
      let nw = qw - hx * qx - hy * qy - hz * qz;
      const l = Math.hypot(nx, ny, nz, nw) || 1;
      nx /= l; ny /= l; nz /= l; nw /= l;
      q[oq] = nx; q[oq + 1] = ny; q[oq + 2] = nz; q[oq + 3] = nw;
    }

    if (step % STORE_EVERY === 0) store();
  }

  // Classify by final resting place: inside the funnel → will be ground. Flyers never count.
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const dx = p[o] - H.x;
    const dz = p[o + 2] - H.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const y = p[o + 1];
    const Ry = H.r0 + slope * (y - H.y0);
    inHopper[i] = !flyer[i] && y > H.y0 - 0.1 && y < H.y1 + 0.4 && d < Ry + R ? 1 : 0;
  }
  return { count, frames: frame, duration: DURATION, positions, quaternions, scale, inHopper, drift };
}
