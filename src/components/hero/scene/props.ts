import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Procedural ingredient geometry. */

export function createIceGeometry() {
  const g = new RoundedBoxGeometry(0.34, 0.32, 0.33, 3, 0.06);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.03 * Math.sin(x * 21 + y * 13) * Math.cos(z * 17);
    pos.setXYZ(i, x * n, y * n, z * n);
  }
  g.computeVertexNormals();
  return g;
}

export function createChocolateChunkGeometry(seed = 1) {
  const g = new RoundedBoxGeometry(0.3, 0.17, 0.22, 2, 0.025);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // fractured edge on one side
    const cut = x > 0.08 ? 1 - 0.25 * Math.sin(y * 31 + z * 23 + seed) * Math.cos(z * 19 + seed) : 1;
    pos.setXYZ(i, x * cut + Math.sin(z * 40 + seed) * 0.004, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Chocolate square with scored grooves (for the final still life). */
export function createChocolateSquareGeometry() {
  const g = new RoundedBoxGeometry(0.42, 0.08, 0.42, 3, 0.02);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > 0.02) {
      const gx = Math.exp(-Math.pow((Math.abs(x) - 0.0) * 40, 2));
      const gz = Math.exp(-Math.pow((Math.abs(z) - 0.0) * 40, 2));
      pos.setY(i, y - Math.max(gx, gz) * 0.025);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Cinnamon quill: a tightly rolled bark spiral, extruded along its length. */
export function createCinnamonGeometry(length = 1.1) {
  const shape = new THREE.Shape();
  const turns = 2.3;
  const steps = 90;
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const r = 0.075 - t * 0.04;
    outer.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    inner.push(new THREE.Vector2(Math.cos(a) * (r - 0.012), Math.sin(a) * (r - 0.012)));
  }
  shape.moveTo(outer[0]!.x, outer[0]!.y);
  outer.forEach((p) => shape.lineTo(p.x, p.y));
  for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i]!.x, inner[i]!.y);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4, steps: 1 });
  g.translate(0, 0, -length / 2);
  g.rotateX(Math.PI / 2); // stand along Y
  // set UVs along length for bark texture
  g.computeVertexNormals();
  return g;
}
