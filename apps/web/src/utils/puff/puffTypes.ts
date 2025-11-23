/**
 * 🎈 Puff Tool Type Definitions
 * 
 * TypeScript interfaces and types for the new puff tool system
 */

export type PuffMode = 'continuous' | 'discrete';

export type PuffTextureType = 'smooth' | 'littleTextured' | 'textured';

export type PuffMaterialApplyMode = 'all' | 'current';

export interface PuffSettings {
  mode: PuffMode;
  height: number;        // 0.2 - 1.0 (mm)
  softness: number;      // 0.0 - 1.0
  brushSize: number;     // 5 - 200 (px)
  color: string;         // Hex color
  opacity: number;       // 0.0 - 1.0
  textureType: PuffTextureType;
  blendMode: string;     // Layer blend mode
  materialApplyMode: PuffMaterialApplyMode;
}

export interface PuffStroke {
  id: string;
  layerId: string;
  points: Array<{ x: number; y: number }>;
  settings: PuffSettings;
  timestamp: number;
}

export interface PuffPoint {
  x: number;
  y: number;
  uv: { x: number; y: number };
  worldPosition: { x: number; y: number; z: number };
}

/**
 * Material settings for a puff stroke or layer
 */
export interface PuffMaterialSettings {
  textureType: PuffTextureType;
  roughness: number;
  metalness: number;
  intensity?: number; // Texture intensity (0.0 - 1.0)
}

