/**
 * Centralized canvas size configuration
 * All canvas operations should use these standardized sizes
 */

// Device capability detection
const getDeviceCapabilities = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) return 'low';
  
  const maxTextureSize = (gl as any).getParameter((gl as any).MAX_TEXTURE_SIZE);
  const memoryInfo = (performance as any).memory;
  
  // Determine device tier based on capabilities
  if (maxTextureSize >= 4096 && memoryInfo && memoryInfo.jsHeapSizeLimit > 1000000000) {
    return 'high';
  } else if (maxTextureSize >= 2048 && memoryInfo && memoryInfo.jsHeapSizeLimit > 500000000) {
    return 'medium';
  } else {
    return 'low';
  }
};

// Adaptive canvas sizes based on device capabilities
const deviceTier = getDeviceCapabilities();

// Standard canvas sizes for different quality levels
export const CANVAS_SIZES = {
  // Standard size for all layer operations - adaptive based on device
  STANDARD: deviceTier === 'high' ? 2048 : deviceTier === 'medium' ? 1536 : 1024,
  
  // Performance levels - adaptive
  PERFORMANCE: deviceTier === 'high' ? 1024 : deviceTier === 'medium' ? 512 : 256,
  BALANCED: deviceTier === 'high' ? 1536 : deviceTier === 'medium' ? 1024 : 512,
  QUALITY: deviceTier === 'high' ? 2048 : deviceTier === 'medium' ? 1536 : 1024,
  ULTRA: deviceTier === 'high' ? 4096 : deviceTier === 'medium' ? 2048 : 1024,
  
  // Specific use cases - adaptive
  DISPLACEMENT_MAP: deviceTier === 'high' ? 2048 : deviceTier === 'medium' ? 1536 : 1024,
  NORMAL_MAP: deviceTier === 'high' ? 2048 : deviceTier === 'medium' ? 1536 : 1024,
  PREVIEW: deviceTier === 'high' ? 512 : deviceTier === 'medium' ? 256 : 128,
  EXPORT: deviceTier === 'high' ? 2048 : deviceTier === 'medium' ? 1536 : 1024,
} as const;

// Default canvas size for all operations
export const DEFAULT_CANVAS_SIZE = CANVAS_SIZES.STANDARD;

// Canvas size configuration for different contexts
export const CANVAS_CONFIG = {
  // Layer canvases
  LAYER: {
    width: DEFAULT_CANVAS_SIZE,
    height: DEFAULT_CANVAS_SIZE,
  },
  
  // Composed canvas
  COMPOSED: {
    width: DEFAULT_CANVAS_SIZE,
    height: DEFAULT_CANVAS_SIZE,
  },
  
  // Displacement maps
  DISPLACEMENT: {
    width: CANVAS_SIZES.DISPLACEMENT_MAP,
    height: CANVAS_SIZES.DISPLACEMENT_MAP,
  },
  
  // Normal maps
  NORMAL: {
    width: CANVAS_SIZES.NORMAL_MAP,
    height: CANVAS_SIZES.NORMAL_MAP,
  },
  
  // Preview thumbnails
  PREVIEW: {
    width: CANVAS_SIZES.PREVIEW,
    height: CANVAS_SIZES.PREVIEW,
  },
  
  // Export resolution
  EXPORT: {
    width: CANVAS_SIZES.EXPORT,
    height: CANVAS_SIZES.EXPORT,
  },
} as const;

// Helper function to create a canvas with standard size and HIGH QUALITY settings
export function createStandardCanvas(width: number = DEFAULT_CANVAS_SIZE, height: number = DEFAULT_CANVAS_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // CRITICAL: Enable high-quality rendering for all canvases
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  return canvas;
}

// Helper function to create a layer canvas
export function createLayerCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.LAYER.width, CANVAS_CONFIG.LAYER.height);
}

// Helper function to create a composed canvas
export function createComposedCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.COMPOSED.width, CANVAS_CONFIG.COMPOSED.height);
}

// Helper function to create a displacement canvas
export function createDisplacementCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.DISPLACEMENT.width, CANVAS_CONFIG.DISPLACEMENT.height);
}

// Helper function to create a normal canvas
export function createNormalCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.NORMAL.width, CANVAS_CONFIG.NORMAL.height);
}

// Helper function to create a preview canvas
export function createPreviewCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.PREVIEW.width, CANVAS_CONFIG.PREVIEW.height);
}

// Helper function to create an export canvas
export function createExportCanvas(): HTMLCanvasElement {
  return createStandardCanvas(CANVAS_CONFIG.EXPORT.width, CANVAS_CONFIG.EXPORT.height);
}
