/**
 * 🎈 Puff Tool Canvas Rendering
 * 
 * Pure functions for drawing puffs on canvas (color layer)
 */

/**
 * Helper: Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [255, 105, 180]; // Default pink
}

/**
 * Simple Perlin-like noise function for surface texture
 */
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smooth noise interpolation
 */
function smoothNoise(x: number, y: number): number {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fracX = x - fx;
  const fracY = y - fy;
  
  const v1 = noise(fx, fy);
  const v2 = noise(fx + 1, fy);
  const v3 = noise(fx, fy + 1);
  const v4 = noise(fx + 1, fy + 1);
  
  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;
  
  return i1 * (1 - fracY) + i2 * fracY;
}

/**
 * Draw single puff dome on canvas
 * Creates realistic dome shape with surface texture and lighting
 * 
 * @param ctx - Canvas 2D context
 * @param x - Center X coordinate (pixels)
 * @param y - Center Y coordinate (pixels)
 * @param radius - Puff radius (pixels)
 * @param color - Hex color string
 * @param opacity - Opacity (0.0-1.0)
 * @param softness - Edge softness (0.0-1.0)
 */
export function drawPuffDome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
  softness: number
): void {
  const [r, g, b] = hexToRgb(color);
  
  // Create offscreen canvas for better quality
  const canvas = document.createElement('canvas');
  canvas.width = radius * 2 + 4;
  canvas.height = radius * 2 + 4;
  const offCtx = canvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) {
    // Fallback to direct drawing if offscreen canvas fails
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const stops = 16;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const cosValue = Math.cos((1 - t) * Math.PI / 2);
      const alpha = opacity * cosValue * (1 - softness * 0.3);
      gradient.addColorStop(t, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    }
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const imageData = offCtx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;
  
  // Generate realistic puff with surface detail
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const dx = px - centerX;
      const dy = py - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalizedDistance = distance / radius;
      
      if (normalizedDistance > 1.0) {
        // Outside radius - fully transparent
        const idx = (py * canvas.width + px) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }
      
      // Cosine interpolation for smooth dome profile
      const cosValue = Math.cos(normalizedDistance * Math.PI / 2);
      const baseAlpha = opacity * cosValue * (1 - softness * 0.3);
      
      // Add surface texture/noise for realism
      const noiseScale = 0.15; // Texture detail scale
      const noiseValue = smoothNoise(px * noiseScale, py * noiseScale) - 0.5;
      const textureIntensity = 0.08; // How much texture affects the surface
      const textureOffset = noiseValue * textureIntensity;
      
      // Add lighting effect (highlight in center, shadow at edges)
      const lightingIntensity = 0.15;
      const lighting = (1 - normalizedDistance * 0.5) * lightingIntensity;
      
      // Combine base color with texture and lighting
      const finalR = Math.max(0, Math.min(255, r + textureOffset * 255 + lighting * 255));
      const finalG = Math.max(0, Math.min(255, g + textureOffset * 255 + lighting * 255));
      const finalB = Math.max(0, Math.min(255, b + textureOffset * 255 + lighting * 255));
      const finalAlpha = Math.max(0, Math.min(255, baseAlpha * 255));
      
      const idx = (py * canvas.width + px) * 4;
      data[idx] = finalR;
      data[idx + 1] = finalG;
      data[idx + 2] = finalB;
      data[idx + 3] = finalAlpha;
    }
  }
  
  offCtx.putImageData(imageData, 0, 0);
  
  // Draw the offscreen canvas to the main canvas
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(canvas, x - centerX, y - centerY);
  ctx.restore();
}

/**
 * Draw continuous puff stroke (for brush-like mode)
 * Blends multiple puffs together for smooth continuous flow
 * 
 * @param ctx - Canvas 2D context
 * @param points - Array of points in the stroke
 * @param radius - Puff radius (pixels)
 * @param color - Hex color string
 * @param opacity - Opacity (0.0-1.0)
 * @param softness - Edge softness (0.0-1.0)
 */
export function drawPuffStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  radius: number,
  color: string,
  opacity: number,
  softness: number
): void {
  if (points.length === 0) return;
  
  const [r, g, b] = hexToRgb(color);
  
  // Draw smooth path connecting all points
  ctx.save();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw smooth path
  if (points.length === 1) {
    // Single point - draw as dome
    drawPuffDome(ctx, points[0].x, points[0].y, radius, color, opacity, softness);
  } else {
    // Multiple points - draw connected path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
    
    // Add rounded caps at start and end for smooth dome shape
    drawPuffDome(ctx, points[0].x, points[0].y, radius, color, opacity, softness);
    drawPuffDome(ctx, points[points.length - 1].x, points[points.length - 1].y, radius, color, opacity, softness);
    
    // Fill gaps between points with small domes for continuous flow
    for (let i = 1; i < points.length - 1; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      const distance = Math.sqrt(
        Math.pow(currPoint.x - prevPoint.x, 2) + 
        Math.pow(currPoint.y - prevPoint.y, 2)
      );
      
      // If points are far apart, add intermediate domes for smooth flow
      if (distance > radius) {
        const steps = Math.ceil(distance / radius);
        for (let j = 1; j < steps; j++) {
          const t = j / steps;
          const interX = prevPoint.x + (currPoint.x - prevPoint.x) * t;
          const interY = prevPoint.y + (currPoint.y - prevPoint.y) * t;
          drawPuffDome(ctx, interX, interY, radius, color, opacity, softness);
        }
      }
    }
  }
  
  ctx.restore();
}

/**
 * Draw puff color with blend mode
 * Wrapper function that applies blend mode before drawing
 * 
 * @param ctx - Canvas 2D context
 * @param x - Center X coordinate
 * @param y - Center Y coordinate
 * @param radius - Puff radius
 * @param color - Hex color string
 * @param opacity - Opacity (0.0-1.0)
 * @param softness - Edge softness (0.0-1.0)
 * @param blendMode - Canvas blend mode (e.g., 'multiply', 'screen', etc.)
 */
export function drawPuffColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
  softness: number,
  blendMode: string = 'source-over'
): void {
  ctx.save();
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
  drawPuffDome(ctx, x, y, radius, color, opacity, softness);
  ctx.restore();
}

