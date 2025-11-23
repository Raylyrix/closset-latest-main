/**
 * 🎈 Puff Tool Texture Generation
 * 
 * Procedural texture generation for different puff material types
 */

import { PuffTextureType } from './puffTypes';

/**
 * Generate procedural texture overlay based on texture type
 * Creates canvas with texture pattern that will be applied to puff surface
 * 
 * @param width - Canvas width
 * @param height - Canvas height
 * @param textureType - Type of texture (smooth, littleTextured, textured)
 * @param intensity - Texture intensity (0.0 - 1.0)
 * @returns HTMLCanvasElement with texture overlay
 */
export function generatePuffTexture(
  width: number,
  height: number,
  textureType: PuffTextureType = 'smooth',
  intensity: number = 1.0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return canvas;
  }
  
  switch (textureType) {
    case 'smooth':
      generateSmoothTexture(ctx, width, height, intensity);
      break;
    case 'littleTextured':
      generateLittleTexturedTexture(ctx, width, height, intensity);
      break;
    case 'textured':
      generateTexturedTexture(ctx, width, height, intensity);
      break;
  }
  
  return canvas;
}

/**
 * Generate smooth/glossy texture
 * Creates subtle highlight pattern for glossy finish
 */
function generateSmoothTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  // Create subtle radial gradient for glossy highlight
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;
  
  const gradient = ctx.createRadialGradient(
    centerX * 0.7, centerY * 0.7, 0,
    centerX, centerY, radius
  );
  
  // More visible highlight for glossy finish
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.25 * intensity})`);
  gradient.addColorStop(0.2, `rgba(255, 255, 255, ${0.15 * intensity})`);
  gradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.08 * intensity})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Generate little textured surface
 * Creates subtle fabric-like texture with small irregularities
 */
function generateLittleTexturedTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  // Create subtle noise pattern for fabric texture
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // More visible fabric-like texture
  const scale = 0.025; // Slightly larger texture scale
  const noiseIntensity = 25 * intensity; // Increased from 15 for better visibility
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Generate noise value
      const noise = (
        Math.sin(x * scale) * Math.cos(y * scale) +
        Math.sin(x * scale * 2.3) * Math.cos(y * scale * 1.7) * 0.5
      ) * noiseIntensity;
      
      // Apply as subtle brightness variation
      const value = 128 + noise;
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 255;   // A
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // More visible blend for fabric texture
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5 * intensity; // Increased from 0.3
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}

/**
 * Generate heavily textured surface
 * Creates pronounced texture pattern (canvas-like, rough fabric)
 */
function generateTexturedTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  // Create more pronounced noise pattern
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Multiple noise frequencies for complex texture
  const scales = [0.035, 0.06, 0.09]; // Slightly larger scales
  const weights = [1.0, 0.7, 0.4]; // Increased weights
  const noiseIntensity = 40 * intensity; // Increased from 30
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let noise = 0;
      
      // Combine multiple noise frequencies
      for (let i = 0; i < scales.length; i++) {
        const scale = scales[i];
        const weight = weights[i];
        noise += (
          Math.sin(x * scale) * Math.cos(y * scale) +
          Math.sin(x * scale * 2.1) * Math.cos(y * scale * 1.9) * 0.5
        ) * weight;
      }
      
      noise = (noise / scales.length) * noiseIntensity;
      
      const idx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, 128 + noise));
      
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Stronger blend for pronounced texture
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.7 * intensity; // Increased from 0.5
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}

/**
 * Apply texture overlay to existing canvas
 * Blends texture with existing puff drawing
 * 
 * @param ctx - Target canvas context
 * @param textureType - Type of texture
 * @param intensity - Texture intensity
 * @param x - X position (for localized texture)
 * @param y - Y position (for localized texture)
 * @param radius - Radius of puff (for localized texture)
 */
export function applyPuffTextureOverlay(
  ctx: CanvasRenderingContext2D,
  textureType: PuffTextureType,
  intensity: number,
  x?: number,
  y?: number,
  radius?: number
): void {
  const canvas = ctx.canvas;
  const width = radius ? radius * 2 : canvas.width;
  const height = radius ? radius * 2 : canvas.height;
  
  // Generate texture
  const textureCanvas = generatePuffTexture(width, height, textureType, intensity);
  
  if (x !== undefined && y !== undefined && radius !== undefined) {
    // Apply localized texture (for per-stroke material)
    ctx.save();
    // Use 'soft-light' for more visible texture effect
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.8 * intensity; // Increased from 0.6 for better visibility
    ctx.drawImage(textureCanvas, x - radius, y - radius);
    ctx.restore();
  } else {
    // Apply full canvas texture (for per-layer material)
    ctx.save();
    // Use 'soft-light' for more visible texture effect
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.8 * intensity; // Increased from 0.6 for better visibility
    ctx.drawImage(textureCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

