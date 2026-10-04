import * as THREE from "three";

/**
 * Procedural roasted coffee bean: a flattened ellipsoid with a deep S-shaped crease on its flat face
 * and a subtle asymmetric dome on the back. Units: ~0.24 long.
 */
export function createBeanGeometry(detail = 40): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // base ellipsoid: length (y), width (x), thickness (z)
    let x = v.x * 0.72;
    const y = v.y * 1.0;
    let z = v.z * 0.5;

    if (z > 0) {
      // flatten the front face
      z *= 0.62 + 0.38 * (1 - Math.abs(v.z));
      // S-curve crease along y
      const s = 0.09 * Math.sin(y * 2.4);
      const d = x - s;
      const crease = Math.exp(-(d * d) / 0.0065);
      z -= crease * 0.24 * (1 - Math.pow(Math.abs(y), 6));
      // slight pinch either side of the crease
      x += Math.sign(d) * crease * 0.03;
    } else {
      // back dome: subtle asymmetry
      z *= 1.0 + 0.06 * Math.sin(y * 1.7 + 0.4);
    }
    // taper the ends a little and add organic irregularity
    const taper = 1 - 0.12 * Math.pow(Math.abs(y), 3);
    x *= taper;
    const n = 0.012 * Math.sin(x * 13.1 + y * 7.3) + 0.01 * Math.sin(y * 17.7 - z * 9.1);
    pos.setXYZ(i, x * (1 + n), y * (1 + n * 0.5), z * (1 + n));
  }
  geo.computeVertexNormals();
  geo.scale(0.12, 0.12, 0.12);
  geo.rotateX(Math.PI / 2); // lie flat by default (crease up)
  return geo;
}

/** Simple roasted-bean material: oily sheen from clearcoat, slight per-instance tint via instanceColor. */
export function createBeanMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#5a3220"),
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.35,
    sheen: 0.35,
    sheenColor: new THREE.Color("#7a4a2a"),
    sheenRoughness: 0.6,
  });
}
