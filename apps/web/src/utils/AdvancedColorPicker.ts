/**
 * Advanced Color Picker Module
 * Provides professional color selection features including:
 * - Color history tracking
 * - Area sampling (average color from region)
 * - HSV/RGB color manipulation
 * - Color palette/swatches management
 */

/**
 * Sample average color from an area
 */
export function sampleAreaColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): { r: number; g: number; b: number; a: number } | null {
  const startX = Math.max(0, x - radius);
  const startY = Math.max(0, y - radius);
  const width = Math.min(ctx.canvas.width - startX, radius * 2);
  const height = Math.min(ctx.canvas.height - startY, radius * 2);
  
  if (width <= 0 || height <= 0) return null;
  
  try {
    const imageData = ctx.getImageData(startX, startY, width, height);
    const data = imageData.data;
    
    let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
    let pixelCount = 0;
    
    // Average all pixels in the area
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Only count non-transparent pixels
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        totalA += data[i + 3];
        pixelCount++;
      }
    }
    
    if (pixelCount === 0) return null;
    
    return {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
      a: Math.round(totalA / pixelCount)
    };
  } catch (error) {
    console.error('Error sampling area color:', error);
    return null;
  }
}

/**
 * Convert RGB to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * Convert HSV to RGB
 */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  v = v / 100;
  
  const c = v * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (h >= 1/6 && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (h >= 2/6 && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (h >= 3/6 && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (h >= 4/6 && h < 5/6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Color history manager
 */
export class ColorHistory {
  private colors: string[] = [];
  private maxSize: number = 20;
  
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('colorHistory');
      if (saved) {
        this.colors = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load color history from localStorage:', error);
    }
  }
  
  addColor(color: string): void {
    // Remove if already exists
    const index = this.colors.indexOf(color);
    if (index !== -1) {
      this.colors.splice(index, 1);
    }
    
    // Add to front
    this.colors.unshift(color);
    
    // Limit size
    if (this.colors.length > this.maxSize) {
      this.colors = this.colors.slice(0, this.maxSize);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('colorHistory', JSON.stringify(this.colors));
    } catch (error) {
      console.warn('Failed to save color history to localStorage:', error);
    }
  }
  
  getColors(): string[] {
    return [...this.colors];
  }
  
  clear(): void {
    this.colors = [];
    try {
      localStorage.removeItem('colorHistory');
    } catch (error) {
      console.warn('Failed to clear color history from localStorage:', error);
    }
  }
}

/**
 * Color palette manager
 */
export class ColorPalette {
  private palettes: Map<string, string[]> = new Map();
  private currentPalette: string = 'default';
  
  constructor() {
    // Initialize default palette
    this.palettes.set('default', [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
      '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
    ]);
    
    // Load custom palettes from localStorage
    try {
      const saved = localStorage.getItem('colorPalettes');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([name, colors]) => {
          this.palettes.set(name, colors as string[]);
        });
      }
    } catch (error) {
      console.warn('Failed to load color palettes from localStorage:', error);
    }
  }
  
  getPalette(name?: string): string[] {
    const paletteName = name || this.currentPalette;
    return this.palettes.get(paletteName) || this.palettes.get('default') || [];
  }
  
  setPalette(name: string, colors: string[]): void {
    this.palettes.set(name, colors);
    try {
      const allPalettes: Record<string, string[]> = {};
      this.palettes.forEach((colors, name) => {
        allPalettes[name] = colors;
      });
      localStorage.setItem('colorPalettes', JSON.stringify(allPalettes));
    } catch (error) {
      console.warn('Failed to save color palettes to localStorage:', error);
    }
  }
  
  getCurrentPaletteName(): string {
    return this.currentPalette;
  }
  
  setCurrentPalette(name: string): void {
    if (this.palettes.has(name)) {
      this.currentPalette = name;
    }
  }
  
  getPaletteNames(): string[] {
    return Array.from(this.palettes.keys());
  }
}

// Singleton instances
let colorHistoryInstance: ColorHistory | null = null;
let colorPaletteInstance: ColorPalette | null = null;

export function getColorHistory(): ColorHistory {
  if (!colorHistoryInstance) {
    colorHistoryInstance = new ColorHistory();
  }
  return colorHistoryInstance;
}

export function getColorPalette(): ColorPalette {
  if (!colorPaletteInstance) {
    colorPaletteInstance = new ColorPalette();
  }
  return colorPaletteInstance;
}


