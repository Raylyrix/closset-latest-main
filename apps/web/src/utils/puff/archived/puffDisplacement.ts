/**
 * 🎈 Puff Tool Displacement Calculations
 * 
 * Pure functions for calculating puff dome profiles and displacement values
 */

/**
 * Calculate dome profile height at given distance from center
 * Uses cosine interpolation for smooth dome shape
 * 
 * @param normalizedDistance - Distance from center (0 = center, 1 = edge)
 * @param softness - Edge softness (0.0 = hard edge, 1.0 = very soft)
 * @returns Normalized height value (0.0 = no height, 1.0 = max height)
 */
export function calculateDomeProfile(
  normalizedDistance: number,
  softness: number
): number {
  if (normalizedDistance >= 1.0) return 0;
  
  // Cosine interpolation for smooth dome
  const cosValue = Math.cos(normalizedDistance * Math.PI / 2);
  
  // Apply softness (higher softness = softer edges)
  // Softness affects the falloff curve
  const softnessFactor = Math.pow(cosValue, 1 / (softness + 0.1));
  
  return Math.max(0, softnessFactor);
}

/**
 * Calculate displacement map value for a pixel
 * 
 * @param distanceFromCenter - Distance from puff center in pixels
 * @param radius - Puff radius in pixels
 * @param height - Height in mm (0.2-1.0)
 * @param softness - Edge softness (0.0-1.0)
 * @returns Displacement value in Three.js format (128-255, where 128 = neutral, 255 = max outward)
 */
export function calculateDisplacementValue(
  distanceFromCenter: number,
  radius: number,
  height: number,
  softness: number
): number {
  if (distanceFromCenter > radius) return 128; // CRITICAL FIX: Return 128 (neutral) for no displacement, not 0
  
  const normalizedDistance = distanceFromCenter / radius;
  const domeHeight = calculateDomeProfile(normalizedDistance, softness);
  
  // CRITICAL FIX: Dramatically increased displacement values for visible 3D effect
  // Height range: 0.2mm - 1.0mm
  // Goal: Even at 0.3mm, produce at least 50% of max displacement (191+)
  // At 1.0mm: produce full 255 displacement
  
  // Normalize height (0.2-1.0mm to 0-1)
  const heightRange = 1.0 - 0.2; // 0.8mm range
  const normalizedHeight = Math.max(0, Math.min(1, (height - 0.2) / heightRange));
  
  // Use less aggressive curve to preserve height differences
  // At 0.3mm: normalizedHeight = 0.125, curvedHeight = ~0.25 (25% of max)
  // At 1.0mm: normalizedHeight = 1.0, curvedHeight = 1.0 (100% of max)
  const curvedHeight = Math.pow(normalizedHeight, 0.5); // Square root curve
  
  // CRITICAL FIX: Convert to Three.js displacement format
  // Three.js format: 128 = neutral (no displacement), 255 = max outward displacement
  // Our internal format: 0 = no displacement, 1.0 = max displacement
  // Conversion: threeJsValue = 128 + (ourValue * 127)
  // Where ourValue ranges from 0.0 to 1.0
  const ourDisplacementValue = curvedHeight * domeHeight; // 0.0 to 1.0
  
  // Convert to Three.js format: 128 (neutral) to 255 (max outward)
  // Use full range 128-255 for maximum visibility
  const threeJsValue = 128 + (ourDisplacementValue * 127);
  
  const finalValue = Math.floor(Math.max(128, Math.min(255, threeJsValue)));
  
  // Debug logging for first few calls
  if (Math.random() < 0.01) {
    console.log('🎈 Displacement value (Three.js format):', {
      height,
      normalizedHeight,
      curvedHeight,
      domeHeight,
      ourDisplacementValue,
      threeJsValue,
      finalValue,
      note: '128 = neutral, 255 = max outward'
    });
  }
  
  return finalValue;
}

/**
 * Generate displacement map for a single puff
 * Draws a radial gradient with dome profile on displacement canvas
 * 
 * @param ctx - Displacement canvas 2D context
 * @param x - Center X coordinate (pixels)
 * @param y - Center Y coordinate (pixels)
 * @param radius - Puff radius (pixels)
 * @param height - Height in mm (0.2-1.0)
 * @param softness - Edge softness (0.0-1.0)
 */
export function generatePuffDisplacement(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  height: number,
  softness: number
): void {
  // CRITICAL: Use source-over to ensure displacement values are written correctly
  // Don't use additive blending - replace existing values
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  // Create radial gradient with dome profile
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  
  // Ultra-smooth dome using cosine interpolation
  const stops = 16; // Increased stops for smoother falloff
  let maxValue = 0;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const normalizedDistance = t;
    const domeHeight = calculateDomeProfile(normalizedDistance, softness);
    const displacementValue = calculateDisplacementValue(
      t * radius, radius, height, softness
    );
    
    maxValue = Math.max(maxValue, displacementValue);
    
    // Gradient stop: normalized distance -> displacement value
    gradient.addColorStop(t, `rgb(${displacementValue}, ${displacementValue}, ${displacementValue})`);
  }
  
  // CRITICAL FIX: Ensure edge is at 128 (neutral, no displacement) for Three.js format
  gradient.addColorStop(1, 'rgb(128, 128, 128)');
  
  // Draw the gradient
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Debug logging occasionally
  if (Math.random() < 0.01) {
    console.log('🎈 Generated displacement:', {
      x, y, radius, height, softness,
      maxDisplacementValue: maxValue,
      centerValue: calculateDisplacementValue(0, radius, height, softness)
    });
  }
}

/**
 * Generate normal map from displacement map
 * Calculates surface normals based on displacement gradients
 */
export function generateNormalMap(
  displacementCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number
): void {
  // This will be called after displacement is generated
  // Can be used for advanced normal mapping if needed
  // For now, normal maps are generated automatically from displacement in updateModelTexture
}

