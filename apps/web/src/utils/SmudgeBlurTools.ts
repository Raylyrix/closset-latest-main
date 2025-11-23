/**
 * Smudge and Blur Tools Implementation
 * Professional-grade smudging and blurring effects
 */

import { BrushPoint, BrushSettings } from '../types/app';

/**
 * Apply smudge effect - blends colors by sampling and mixing pixels
 */
export function applySmudge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  strength: number,
  previousPoint?: { x: number; y: number }
): void {
  const radius = size / 2;
  const sampleRadius = Math.max(1, radius * 0.8);
  
  // Get image data from canvas
  const imageData = ctx.getImageData(
    Math.max(0, x - radius),
    Math.max(0, y - radius),
    Math.min(ctx.canvas.width - Math.max(0, x - radius), radius * 2),
    Math.min(ctx.canvas.height - Math.max(0, y - radius), radius * 2)
  );
  
  if (!imageData) return;
  
  // Calculate smudge direction from previous point
  let dx = 0;
  let dy = 0;
  if (previousPoint) {
    dx = x - previousPoint.x;
    dy = y - previousPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      dx = (dx / distance) * strength;
      dy = (dy / distance) * strength;
    }
  }
  
  // Create temporary canvas for smudging
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Apply directional blur for smudge effect
  const centerX = radius;
  const centerY = radius;
  
  for (let py = 0; py < imageData.height; py++) {
    for (let px = 0; px < imageData.width; px++) {
      const distX = px - centerX;
      const distY = py - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      if (distance > radius) continue;
      
      // Sample from direction of movement
      const sampleX = Math.round(px - dx * (1 - distance / radius));
      const sampleY = Math.round(py - dy * (1 - distance / radius));
      
      if (sampleX >= 0 && sampleX < imageData.width && 
          sampleY >= 0 && sampleY < imageData.height) {
        const sampleIndex = (sampleY * imageData.width + sampleX) * 4;
        const currentIndex = (py * imageData.width + px) * 4;
        
        // Blend sampled color with current color
        const blendFactor = strength * (1 - distance / radius);
        imageData.data[currentIndex] = Math.round(
          imageData.data[currentIndex] * (1 - blendFactor) + 
          imageData.data[sampleIndex] * blendFactor
        );
        imageData.data[currentIndex + 1] = Math.round(
          imageData.data[currentIndex + 1] * (1 - blendFactor) + 
          imageData.data[sampleIndex + 1] * blendFactor
        );
        imageData.data[currentIndex + 2] = Math.round(
          imageData.data[currentIndex + 2] * (1 - blendFactor) + 
          imageData.data[sampleIndex + 2] * blendFactor
        );
      }
    }
  }
  
  // Put modified image data back
  ctx.putImageData(imageData, Math.max(0, x - radius), Math.max(0, y - radius));
}

/**
 * Apply blur effect using box blur algorithm
 */
export function applyBlur(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  strength: number
): void {
  const radius = size / 2;
  const blurRadius = Math.max(1, radius * strength);
  
  // Get image data from canvas
  const imageData = ctx.getImageData(
    Math.max(0, x - radius - blurRadius),
    Math.max(0, y - radius - blurRadius),
    Math.min(ctx.canvas.width - Math.max(0, x - radius - blurRadius), (radius + blurRadius) * 2),
    Math.min(ctx.canvas.height - Math.max(0, y - radius - blurRadius), (radius + blurRadius) * 2)
  );
  
  if (!imageData) return;
  
  // Apply box blur
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Horizontal blur pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let dx = -blurRadius; dx <= blurRadius; dx++) {
        const px = Math.max(0, Math.min(width - 1, x + dx));
        const index = (y * width + px) * 4;
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
        a += data[index + 3];
        count++;
      }
      
      const index = (y * width + x) * 4;
      data[index] = r / count;
      data[index + 1] = g / count;
      data[index + 2] = b / count;
      data[index + 3] = a / count;
    }
  }
  
  // Vertical blur pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let dy = -blurRadius; dy <= blurRadius; dy++) {
        const py = Math.max(0, Math.min(height - 1, y + dy));
        const index = (py * width + x) * 4;
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
        a += data[index + 3];
        count++;
      }
      
      const index = (y * width + x) * 4;
      data[index] = r / count;
      data[index + 1] = g / count;
      data[index + 2] = b / count;
      data[index + 3] = a / count;
    }
  }
  
  // Put modified image data back
  ctx.putImageData(imageData, Math.max(0, x - radius - blurRadius), Math.max(0, y - radius - blurRadius));
}

/**
 * Track last point for smudge direction calculation
 */
export interface SmudgeState {
  lastX: number;
  lastY: number;
  initialized: boolean;
}

export function createSmudgeState(): SmudgeState {
  return {
    lastX: 0,
    lastY: 0,
    initialized: false
  };
}

