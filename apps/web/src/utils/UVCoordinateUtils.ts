/**
 * UV COORDINATE UTILITIES
 * 
 * Utilities for converting between UV coordinates (0-1 range) and pixel coordinates
 * Used for image manipulation on 3D model textures
 * 
 * UV Space: (0, 0) = top-left, (1, 1) = bottom-right
 * Pixel Space: (0, 0) = top-left, (width, height) = bottom-right
 */

export interface UVCoordinates {
  u: number;      // 0-1 range, horizontal
  v: number;      // 0-1 range, vertical
  uWidth: number; // 0-1 range
  uHeight: number; // 0-1 range
}

export interface PixelCoordinates {
  x: number;      // pixel position
  y: number;      // pixel position
  width: number;  // pixel size
  height: number; // pixel size
}

/**
 * Convert UV coordinates to pixel coordinates
 * @param uv UV coordinates (0-1 range)
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Pixel coordinates
 */
export function uvToPixel(
  uv: UVCoordinates,
  canvasWidth: number,
  canvasHeight: number
): PixelCoordinates {
  // UV coordinates represent center of image
  // Convert to top-left corner for canvas drawing
  const pixelWidth = uv.uWidth * canvasWidth;
  const pixelHeight = uv.uHeight * canvasHeight;
  
  const centerX = uv.u * canvasWidth;
  const centerY = uv.v * canvasHeight;
  
  return {
    x: centerX - pixelWidth / 2,
    y: centerY - pixelHeight / 2,
    width: pixelWidth,
    height: pixelHeight
  };
}

/**
 * Convert pixel coordinates to UV coordinates
 * @param pixel Pixel coordinates
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns UV coordinates (0-1 range)
 */
export function pixelToUV(
  pixel: PixelCoordinates,
  canvasWidth: number,
  canvasHeight: number
): UVCoordinates {
  // Convert top-left corner to center
  const centerX = pixel.x + pixel.width / 2;
  const centerY = pixel.y + pixel.height / 2;
  
  return {
    u: centerX / canvasWidth,
    v: centerY / canvasHeight,
    uWidth: pixel.width / canvasWidth,
    uHeight: pixel.height / canvasHeight
  };
}

/**
 * Migrate legacy pixel-based image to UV-based image
 * @param image Image with pixel coordinates
 * @param canvasWidth Default canvas width (2048)
 * @param canvasHeight Default canvas height (2048)
 * @returns Image with UV coordinates
 */
export function migrateImageToUV(
  image: any,
  canvasWidth: number = 2048,
  canvasHeight: number = 2048
): any {
  // If already has UV coordinates, return as-is
  if (typeof image.u === 'number' && typeof image.v === 'number') {
    return image;
  }
  
  // Convert from pixel to UV
  const uv = pixelToUV(
    {
      x: image.x || 0,
      y: image.y || 0,
      width: image.width || 512,
      height: image.height || 512
    },
    canvasWidth,
    canvasHeight
  );
  
  return {
    ...image,
    ...uv,
    // Keep legacy coords for compatibility
    x: image.x,
    y: image.y,
    width: image.width,
    height: image.height,
    // Add locked property if missing
    locked: image.locked ?? false
  };
}

/**
 * Clamp UV coordinates to valid range (0-1)
 * @param uv UV coordinates
 * @returns Clamped UV coordinates
 */
export function clampUV(uv: UVCoordinates): UVCoordinates {
  return {
    u: Math.max(0, Math.min(1, uv.u)),
    v: Math.max(0, Math.min(1, uv.v)),
    uWidth: Math.max(0.01, Math.min(1, uv.uWidth)), // Min 1% of canvas
    uHeight: Math.max(0.01, Math.min(1, uv.uHeight))
  };
}

/**
 * Check if UV coordinates are within canvas bounds
 * @param uv UV coordinates
 * @returns True if within bounds
 */
export function isUVInBounds(uv: UVCoordinates): boolean {
  const halfWidth = uv.uWidth / 2;
  const halfHeight = uv.uHeight / 2;
  
  return (
    uv.u - halfWidth >= 0 &&
    uv.u + halfWidth <= 1 &&
    uv.v - halfHeight >= 0 &&
    uv.v + halfHeight <= 1
  );
}

/**
 * Get image bounds in UV space
 * @param uv UV coordinates (center-based)
 * @returns Bounds { left, right, top, bottom } in UV space
 */
export function getImageUVBounds(uv: UVCoordinates): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const halfWidth = uv.uWidth / 2;
  const halfHeight = uv.uHeight / 2;
  
  return {
    left: uv.u - halfWidth,
    right: uv.u + halfWidth,
    top: uv.v - halfHeight,
    bottom: uv.v + halfHeight
  };
}

/**
 * Check if a UV point is inside an image
 * @param pointU UV X coordinate
 * @param pointV UV Y coordinate
 * @param imageUV Image UV coordinates
 * @returns True if point is inside image
 */
export function isPointInImage(
  pointU: number,
  pointV: number,
  imageUV: UVCoordinates
): boolean {
  const bounds = getImageUVBounds(imageUV);
  
  return (
    pointU >= bounds.left &&
    pointU <= bounds.right &&
    pointV >= bounds.top &&
    pointV <= bounds.bottom
  );
}

/**
 * Throttle function for performance
 * @param func Function to throttle
 * @param limit Time limit in ms
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function for performance
 * @param func Function to debounce
 * @param delay Delay in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function(this: any, ...args: Parameters<T>): void {
    clearTimeout(timeoutId as any); // FIXED: Type mismatch
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}


