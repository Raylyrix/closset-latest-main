/**
 * Coordinate conversion utilities for consistent UV-to-pixel conversion
 * across all text tool components
 */

export interface UVCoordinates {
  u: number;
  v: number;
}

export interface PixelCoordinates {
  x: number;
  y: number;
}

/**
 * Convert UV coordinates to pixel coordinates
 * @param uv UV coordinates (0-1 range)
 * @param canvas Canvas element or dimensions
 * @returns Pixel coordinates
 */
export const convertUVToPixel = (uv: UVCoordinates, canvas: HTMLCanvasElement | { width: number; height: number }): PixelCoordinates => {
  const width = canvas.width;
  const height = canvas.height;
  
  const x = Math.floor(uv.u * width);
  const y = Math.floor((1 - uv.v) * height); // Flip V-axis for canvas space
  
  return { x, y };
};

/**
 * Convert pixel coordinates to UV coordinates
 * @param pixel Pixel coordinates
 * @param canvas Canvas element or dimensions
 * @returns UV coordinates (0-1 range)
 */
export const convertPixelToUV = (pixel: PixelCoordinates, canvas: HTMLCanvasElement | { width: number; height: number }): UVCoordinates => {
  const width = canvas.width;
  const height = canvas.height;
  
  const u = pixel.x / width;
  const v = 1 - (pixel.y / height); // Flip V-axis for UV space
  
  return { u, v };
};

/**
 * Get canvas dimensions from composed canvas or fallback
 * @returns Canvas dimensions
 */
export const getCanvasDimensions = (): { width: number; height: number } => {
  // Try to get from App state first
  if (typeof window !== 'undefined' && (window as any).useApp) {
    try {
      const appState = (window as any).useApp.getState();
      if (appState?.composedCanvas) {
        return {
          width: appState.composedCanvas.width,
          height: appState.composedCanvas.height
        };
      }
    } catch (error) {
      console.warn('Could not get canvas dimensions from App state:', error);
    }
  }
  
  // Fallback to default dimensions
  return { width: 4096, height: 4096 };
};

/**
 * SOLUTION 4: Check if a canvas is white (or very close to white)
 * Used to validate base texture - if base texture is white, it means extraction failed
 * @param canvas Canvas element to check
 * @returns True if canvas appears to be white/empty
 */
export const isWhiteCanvas = (canvas: HTMLCanvasElement | HTMLImageElement | null): boolean => {
  if (!canvas) return true;
  
  try {
    // Use willReadFrequently for better performance when calling getImageData multiple times
    const ctx = (canvas as HTMLCanvasElement).getContext?.('2d', { willReadFrequently: true });
    if (!ctx) return true;
    
    // Sample multiple pixels to check if canvas is white
    const samplePoints = [
      { x: canvas.width / 2, y: canvas.height / 2 }, // Center
      { x: canvas.width / 4, y: canvas.height / 4 }, // Top-left quadrant
      { x: (canvas.width * 3) / 4, y: canvas.height / 4 }, // Top-right quadrant
      { x: canvas.width / 4, y: (canvas.height * 3) / 4 }, // Bottom-left quadrant
      { x: (canvas.width * 3) / 4, y: (canvas.height * 3) / 4 }, // Bottom-right quadrant
    ];
    
    let whitePixels = 0;
    for (const point of samplePoints) {
      const imageData = ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1);
      const [r, g, b] = imageData.data;
      
      // Check if pixel is white (or very close to white, > 250)
      if (r > 250 && g > 250 && b > 250) {
        whitePixels++;
      }
    }
    
    // CRITICAL FIX: Only consider canvas white if ALL sampled pixels are white
    // This prevents valid textures (like white shirts) from being incorrectly rejected
    // A valid texture might have white areas but should have some non-white pixels
    return whitePixels === samplePoints.length; // ALL pixels must be white
  } catch (error) {
    console.warn('⚠️ Error checking if canvas is white:', error);
    return true; // Assume white if check fails
  }
};