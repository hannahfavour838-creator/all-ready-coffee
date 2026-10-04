import * as THREE from "three";

/** Shared PBR materials. Created once per scene and disposed on unmount. */
export function createMaterials(opts: { transmission: boolean }) {
  const glass = opts.transmission
    ? new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 0.035,
        metalness: 0,
        transmission: 1,
        thickness: 0.18,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.4,
        attenuationColor: new THREE.Color("#f1ece4"),
        attenuationDistance: 3,
        transparent: false,
      })
    : new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#e8eef2"),
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0.2,
        envMapIntensity: 1.8,
        clearcoat: 1,
        depthWrite: false,
      });

  return {
    glass,
    blackMetal: new THREE.MeshPhysicalMaterial({ color: "#14100e", roughness: 0.34, metalness: 0.7, clearcoat: 0.35, clearcoatRoughness: 0.25 }),
    satinBlack: new THREE.MeshStandardMaterial({ color: "#0f0c0b", roughness: 0.55, metalness: 0.3 }),
    brass: new THREE.MeshPhysicalMaterial({ color: "#b38a5e", roughness: 0.28, metalness: 1, clearcoat: 0.2 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: "#d9d6d2", roughness: 0.12, metalness: 1 }),
    steel: new THREE.MeshPhysicalMaterial({ color: "#c9c5c0", roughness: 0.22, metalness: 1, clearcoat: 0.4 }),
    walnut: new THREE.MeshPhysicalMaterial({ color: "#3a2216", roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    grounds: new THREE.MeshStandardMaterial({ color: "#2c1a10", roughness: 1, metalness: 0 }),
    stone: new THREE.MeshPhysicalMaterial({ color: "#1b1512", roughness: 0.62, metalness: 0, clearcoat: 0.15 }),
    caramel: new THREE.MeshPhysicalMaterial({ color: "#a65f22", roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color("#ffb070"), emissive: new THREE.Color("#3a1604"), emissiveIntensity: 0.25 }),
    chocolate: new THREE.MeshPhysicalMaterial({ color: "#2a140b", roughness: 0.32, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.4 }),
    cinnamon: new THREE.MeshStandardMaterial({ color: "#7a3d1c", roughness: 0.85, metalness: 0 }),
    ice: opts.transmission
      ? new THREE.MeshPhysicalMaterial({ color: "#f4f8fb", roughness: 0.14, transmission: 1, thickness: 0.35, ior: 1.31, envMapIntensity: 1.2 })
      : new THREE.MeshPhysicalMaterial({ color: "#eef4f8", roughness: 0.1, transparent: true, opacity: 0.5, envMapIntensity: 1.6, depthWrite: false }),
    water: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 2.4, clearcoat: 1 }),
    milk: new THREE.MeshPhysicalMaterial({ color: "#f3ece1", roughness: 0.22, metalness: 0, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color("#ffffff") }),
  };
}

export type SceneMaterials = ReturnType<typeof createMaterials>;

export function disposeMaterials(m: SceneMaterials) {
  Object.values(m).forEach((mat) => mat.dispose());
}
