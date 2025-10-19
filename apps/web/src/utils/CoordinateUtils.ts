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
