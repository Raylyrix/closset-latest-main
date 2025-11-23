/**
 * Wet Brush Blending Module
 * Provides realistic watercolor-like blending with color mixing and bleeding effects
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/**
 * Mix two colors together (like watercolor bleeding)
 * Uses subtractive color mixing for realistic paint behavior
 */
export function mixColors(
  color1: string,
  color2: string,
  ratio: number = 0.5
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  // Subtractive color mixing (like mixing physical paints)
  // Average the RGB values weighted by ratio
  const r = rgb1.r * (1 - ratio) + rgb2.r * ratio;
  const g = rgb1.g * (1 - ratio) + rgb2.g * ratio;
  const b = rgb1.b * (1 - ratio) + rgb2.b * ratio;
  
  return rgbToHex(r, g, b);
}

/**
 * Apply wet brush blending to a canvas area
 * Simulates color bleeding and mixing when wet paint overlaps
 */
export function applyWetBrushBlending(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  wetness: number, // 0-1: How "wet" the brush is (affects bleeding amount)
  bleedingRadius: number // How far colors bleed beyond the brush stroke
): void {
  // Get the area around the brush stroke
  const sampleRadius = radius + bleedingRadius * wetness;
  const startX = Math.max(0, x - sampleRadius);
  const startY = Math.max(0, y - sampleRadius);
  const width = Math.min(ctx.canvas.width - startX, sampleRadius * 2);
  const height = Math.min(ctx.canvas.height - startY, sampleRadius * 2);
  
  if (width <= 0 || height <= 0) return;
  
  // Get image data from the area
  const imageData = ctx.getImageData(startX, startY, width, height);
  const data = imageData.data;
  
  // Create temporary canvas for mixing calculations
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Apply color bleeding effect
  const centerX = x - startX;
  const centerY = y - startY;
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - centerX;
      const dy = py - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only process pixels within bleeding radius
      if (distance > radius && distance <= sampleRadius) {
        const bleedingAmount = (distance - radius) / (bleedingRadius * wetness);
        if (bleedingAmount > 1) continue;
        
        // Sample nearby pixels for color mixing
        const sampleDistance = radius * 0.5;
        const sampleAngle = Math.atan2(dy, dx);
        const sampleX = Math.round(centerX + Math.cos(sampleAngle) * sampleDistance);
        const sampleY = Math.round(centerY + Math.sin(sampleAngle) * sampleDistance);
        
        if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
          const currentIndex = (py * width + px) * 4;
          const sampleIndex = (sampleY * width + sampleX) * 4;
          
          // Mix colors with bleeding effect
          const mixFactor = (1 - bleedingAmount) * wetness * 0.5;
          
          // Blend current pixel with sampled pixel
          data[currentIndex] = data[currentIndex] * (1 - mixFactor) + data[sampleIndex] * mixFactor;
          data[currentIndex + 1] = data[currentIndex + 1] * (1 - mixFactor) + data[sampleIndex + 1] * mixFactor;
          data[currentIndex + 2] = data[currentIndex + 2] * (1 - mixFactor) + data[sampleIndex + 2] * mixFactor;
          // Alpha remains unchanged (opacity handled separately)
        }
      }
    }
  }
  
  // Put modified image data back
  ctx.putImageData(imageData, startX, startY);
}

/**
 * Get blended color for wet brush overlapping existing paint
 * Mixes the new color with existing colors based on wetness
 */
export function getWetBlendedColor(
  existingColor: { r: number; g: number; b: number; a: number },
  newColor: { r: number; g: number; b: number; a: number },
  wetness: number,
  mixRatio: number = 0.5
): { r: number; g: number; b: number; a: number } {
  // When brush is wet, colors mix more (like watercolor)
  const effectiveMixRatio = mixRatio * wetness;
  
  return {
    r: existingColor.r * (1 - effectiveMixRatio) + newColor.r * effectiveMixRatio,
    g: existingColor.g * (1 - effectiveMixRatio) + newColor.g * effectiveMixRatio,
    b: existingColor.b * (1 - effectiveMixRatio) + newColor.b * effectiveMixRatio,
    a: Math.min(255, existingColor.a + newColor.a * wetness * 0.5) // Wet paint increases opacity
  };
}

/**
 * Apply watercolor-like bleeding effect after drawing
 * Simulates paint spreading outward from the brush stroke
 */
export function applyColorBleeding(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  radius: number,
  wetness: number,
  bleedingAmount: number = 2 // Multiplier for how far colors bleed
): void {
  if (points.length < 2) return;
  
  // Get canvas bounds for the entire stroke
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  const padding = radius * bleedingAmount * wetness;
  const startX = Math.max(0, minX - padding);
  const startY = Math.max(0, minY - padding);
  const width = Math.min(ctx.canvas.width - startX, maxX - minX + padding * 2);
  const height = Math.min(ctx.canvas.height - startY, maxY - minY + padding * 2);
  
  if (width <= 0 || height <= 0) return;
  
  // Get image data
  const imageData = ctx.getImageData(startX, startY, width, height);
  const data = imageData.data;
  
  // Apply bleeding along the stroke path
  const bleedingRadius = radius * bleedingAmount * wetness;
  
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    
    // Get points along the line segment
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance);
    
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const px = p1.x + dx * t;
      const py = p1.y + dy * t;
      
      // Sample color at this point
      const localX = Math.round(px - startX);
      const localY = Math.round(py - startY);
      
      if (localX < 0 || localX >= width || localY < 0 || localY >= height) continue;
      
      const centerIndex = (localY * width + localX) * 4;
      const centerR = data[centerIndex];
      const centerG = data[centerIndex + 1];
      const centerB = data[centerIndex + 2];
      const centerA = data[centerIndex + 3];
      
      if (centerA === 0) continue; // Skip transparent pixels
      
      // Bleed color outward
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const bleedX = px + Math.cos(angle) * bleedingRadius;
        const bleedY = py + Math.sin(angle) * bleedingRadius;
        
        const bleedLocalX = Math.round(bleedX - startX);
        const bleedLocalY = Math.round(bleedY - startY);
        
        if (bleedLocalX < 0 || bleedLocalX >= width || bleedLocalY < 0 || bleedLocalY >= height) continue;
        
        const bleedIndex = (bleedLocalY * width + bleedLocalX) * 4;
        const bleedDistance = Math.sqrt((bleedLocalX - localX) ** 2 + (bleedLocalY - localY) ** 2);
        const bleedFactor = 1 - (bleedDistance / bleedingRadius);
        
        if (bleedFactor > 0) {
          // Mix existing color with bleeding color
          const mixFactor = bleedFactor * wetness * 0.3;
          data[bleedIndex] = data[bleedIndex] * (1 - mixFactor) + centerR * mixFactor;
          data[bleedIndex + 1] = data[bleedIndex + 1] * (1 - mixFactor) + centerG * mixFactor;
          data[bleedIndex + 2] = data[bleedIndex + 2] * (1 - mixFactor) + centerB * mixFactor;
          // Slightly increase opacity for wet effect
          data[bleedIndex + 3] = Math.min(255, data[bleedIndex + 3] + centerA * mixFactor * 0.5);
        }
      }
    }
  }
  
  // Put modified image data back
  ctx.putImageData(imageData, startX, startY);
}

/**
 * Wet brush state for tracking paint wetness
 */
export interface WetBrushState {
  wetness: number; // 0-1: Current wetness level
  lastPoint?: { x: number; y: number };
  colorHistory: Array<{ r: number; g: number; b: number; a: number }>; // Track color mixing
}

export function createWetBrushState(wetness: number = 0.8): WetBrushState {
  return {
    wetness,
    colorHistory: []
  };
}

