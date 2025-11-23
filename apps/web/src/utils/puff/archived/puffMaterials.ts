/**
 * 🎈 Puff Tool Material Presets
 * 
 * Material properties for different puff texture types
 */

export interface PuffMaterial {
  name: string;
  metalness: number;
  roughness: number;
  description: string;
}

export const PUFF_MATERIALS: Record<string, PuffMaterial> = {
  smooth: {
    name: 'Smooth',
    metalness: 0.0,
    roughness: 0.2,
    description: 'Glossy, polished finish'
  },
  littleTextured: {
    name: 'Little Textured',
    metalness: 0.0,
    roughness: 0.5,
    description: 'Slight texture, fabric-like'
  },
  textured: {
    name: 'Textured',
    metalness: 0.0,
    roughness: 0.8,
    description: 'Pronounced texture'
  }
};

/**
 * Apply puff material properties to a Three.js material
 */
export function applyPuffMaterial(
  material: THREE.MeshStandardMaterial,
  textureType: string
): void {
  const preset = PUFF_MATERIALS[textureType] || PUFF_MATERIALS.smooth;
  material.metalness = preset.metalness;
  material.roughness = preset.roughness;
  material.needsUpdate = true;
}

/**
 * Get material preset by type
 */
export function getPuffMaterial(textureType: string): PuffMaterial {
  return PUFF_MATERIALS[textureType] || PUFF_MATERIALS.smooth;
}

