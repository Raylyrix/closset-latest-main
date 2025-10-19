/**
 * 🎨 Text Effects System
 * 
 * Features:
 * - Text shadows (multiple layers)
 * - Text strokes and outlines
 * - Gradient text fills
 * - Text glow effects
 * - 3D text effects
 */

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface TextStroke {
  width: number;
  color: string;
  opacity?: number;
}

export interface TextGradient {
  type: 'linear' | 'radial';
  colors: string[];
  stops: number[];
  angle?: number; // For linear gradients (degrees)
  center?: { x: number; y: number }; // For radial gradients
  radius?: number; // For radial gradients
}

export interface TextGlow {
  color: string;
  blur: number;
  opacity: number;
  intensity: number;
}

export interface Text3DEffect {
  depth: number;
  color: string;
  opacity: number;
  angle: number; // Light angle in degrees
  intensity: number;
}

export interface TextEffects {
  shadows?: TextShadow[];
  stroke?: TextStroke;
  gradient?: TextGradient;
  glow?: TextGlow;
  effect3D?: Text3DEffect;
}

// Predefined effect presets
export const TEXT_EFFECT_PRESETS = {
  // Shadow presets
  subtleShadow: {
    shadows: [{
      offsetX: 1,
      offsetY: 1,
      blur: 2,
      color: '#000000',
      opacity: 0.3
    }]
  },
  
  dramaticShadow: {
    shadows: [{
      offsetX: 3,
      offsetY: 3,
      blur: 6,
      color: '#000000',
      opacity: 0.5
    }]
  },
  
  multipleShadows: {
    shadows: [
      {
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: '#000000',
        opacity: 0.3
      },
      {
        offsetX: -1,
        offsetY: -1,
        blur: 2,
        color: '#ffffff',
        opacity: 0.2
      }
    ]
  },
  
  // Stroke presets
  thinStroke: {
    stroke: {
      width: 1,
      color: '#000000',
      opacity: 1
    }
  },
  
  thickStroke: {
    stroke: {
      width: 3,
      color: '#000000',
      opacity: 1
    }
  },
  
  coloredStroke: {
    stroke: {
      width: 2,
      color: '#ff3366',
      opacity: 1
    }
  },
  
  // Gradient presets
  rainbowGradient: {
    gradient: {
      type: 'linear' as const,
      colors: ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'],
      stops: [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.81, 0.9, 1],
      angle: 45
    }
  },
  
  goldGradient: {
    gradient: {
      type: 'linear' as const,
      colors: ['#ffd700', '#ffed4e', '#ffd700'],
      stops: [0, 0.5, 1],
      angle: 45
    }
  },
  
  blueGradient: {
    gradient: {
      type: 'linear' as const,
      colors: ['#4facfe', '#00f2fe'],
      stops: [0, 1],
      angle: 90
    }
  },
  
  // Glow presets
  subtleGlow: {
    glow: {
      color: '#ffffff',
      blur: 8,
      opacity: 0.6,
      intensity: 1
    }
  },
  
  neonGlow: {
    glow: {
      color: '#00ffff',
      blur: 12,
      opacity: 0.8,
      intensity: 2
    }
  },
  
  // 3D presets
  subtle3D: {
    effect3D: {
      depth: 2,
      color: '#000000',
      opacity: 0.3,
      angle: 45,
      intensity: 1
    }
  },
  
  dramatic3D: {
    effect3D: {
      depth: 5,
      color: '#000000',
      opacity: 0.6,
      angle: 135,
      intensity: 2
    }
  },
  
  // Combined effects
  neonStyle: {
    stroke: {
      width: 2,
      color: '#00ffff',
      opacity: 1
    },
    glow: {
      color: '#00ffff',
      blur: 10,
      opacity: 0.8,
      intensity: 2
    }
  },
  
  vintageStyle: {
    shadows: [{
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: '#8b4513',
      opacity: 0.4
    }],
    stroke: {
      width: 1,
      color: '#8b4513',
      opacity: 0.8
    }
  },
  
  modernStyle: {
    shadows: [{
      offsetX: 1,
      offsetY: 1,
      blur: 3,
      color: '#000000',
      opacity: 0.2
    }],
    gradient: {
      type: 'linear' as const,
      colors: ['#667eea', '#764ba2'],
      stops: [0, 1],
      angle: 45
    }
  }
};

// Text effects rendering utilities
export class TextEffectsRenderer {
  /**
   * Apply text effects to a canvas context
   */
  static applyEffects(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    effects: TextEffects
  ): void {
    if (!effects) return;

    // Apply shadows
    if (effects.shadows && effects.shadows.length > 0) {
      this.applyShadows(ctx, text, x, y, effects.shadows);
    }

    // Apply glow
    if (effects.glow) {
      this.applyGlow(ctx, text, x, y, effects.glow);
    }

    // Apply 3D effect
    if (effects.effect3D) {
      this.apply3DEffect(ctx, text, x, y, effects.effect3D);
    }

    // Apply stroke
    if (effects.stroke) {
      this.applyStroke(ctx, text, x, y, effects.stroke);
    }

    // Apply gradient fill
    if (effects.gradient) {
      this.applyGradient(ctx, text, x, y, effects.gradient);
    }
  }

  private static applyShadows(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    shadows: TextShadow[]
  ): void {
    shadows.forEach(shadow => {
      ctx.save();
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
      ctx.globalAlpha = shadow.opacity;
      ctx.fillText(text, x, y);
      ctx.restore();
    });
  }

  private static applyGlow(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    glow: TextGlow
  ): void {
    ctx.save();
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = glow.opacity;
    
    // Draw glow multiple times for intensity
    for (let i = 0; i < glow.intensity; i++) {
      ctx.fillText(text, x, y);
    }
    
    ctx.restore();
  }

  private static apply3DEffect(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    effect3D: Text3DEffect
  ): void {
    const angleRad = (effect3D.angle * Math.PI) / 180;
    const offsetX = Math.cos(angleRad) * effect3D.depth;
    const offsetY = Math.sin(angleRad) * effect3D.depth;

    ctx.save();
    ctx.fillStyle = effect3D.color;
    ctx.globalAlpha = effect3D.opacity;

    // Draw 3D depth layers
    for (let i = effect3D.depth; i > 0; i--) {
      const layerOffsetX = (offsetX * i) / effect3D.depth;
      const layerOffsetY = (offsetY * i) / effect3D.depth;
      ctx.fillText(text, x + layerOffsetX, y + layerOffsetY);
    }

    ctx.restore();
  }

  private static applyStroke(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    stroke: TextStroke
  ): void {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalAlpha = stroke.opacity || 1;
    ctx.strokeText(text, x, y);
    ctx.restore();
  }

  private static applyGradient(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    gradient: TextGradient
  ): void {
    ctx.save();

    let gradientObj: CanvasGradient;

    if (gradient.type === 'linear') {
      const angleRad = ((gradient.angle || 0) * Math.PI) / 180;
      const x1 = x + Math.cos(angleRad) * 100;
      const y1 = y + Math.sin(angleRad) * 100;
      gradientObj = ctx.createLinearGradient(x, y, x1, y1);
    } else {
      const centerX = gradient.center?.x || x;
      const centerY = gradient.center?.y || y;
      const radius = gradient.radius || 50;
      gradientObj = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    }

    // Add color stops
    gradient.colors.forEach((color, index) => {
      const stop = gradient.stops[index] || index / (gradient.colors.length - 1);
      gradientObj.addColorStop(stop, color);
    });

    ctx.fillStyle = gradientObj;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Get the bounding box for text with effects
   */
  static getTextBoundsWithEffects(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    effects: TextEffects
  ): { x: number; y: number; width: number; height: number } {
    const metrics = ctx.measureText(text);
    const fontSize = parseInt(ctx.font.match(/\d+/)?.[0] || '16');
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    let minX = x;
    let minY = y;
    let maxX = x + textWidth;
    let maxY = y + textHeight;

    // Account for shadows
    if (effects.shadows) {
      effects.shadows.forEach(shadow => {
        const shadowX = x + shadow.offsetX;
        const shadowY = y + shadow.offsetY;
        const shadowBlur = shadow.blur;
        
        minX = Math.min(minX, shadowX - shadowBlur);
        minY = Math.min(minY, shadowY - shadowBlur);
        maxX = Math.max(maxX, shadowX + textWidth + shadowBlur);
        maxY = Math.max(maxY, shadowY + textHeight + shadowBlur);
      });
    }

    // Account for glow
    if (effects.glow) {
      const glowBlur = effects.glow.blur;
      minX = Math.min(minX, x - glowBlur);
      minY = Math.min(minY, y - glowBlur);
      maxX = Math.max(maxX, x + textWidth + glowBlur);
      maxY = Math.max(maxY, y + textHeight + glowBlur);
    }

    // Account for 3D effect
    if (effects.effect3D) {
      const angleRad = (effects.effect3D.angle * Math.PI) / 180;
      const offsetX = Math.cos(angleRad) * effects.effect3D.depth;
      const offsetY = Math.sin(angleRad) * effects.effect3D.depth;
      
      minX = Math.min(minX, x + offsetX);
      minY = Math.min(minY, y + offsetY);
      maxX = Math.max(maxX, x + textWidth + offsetX);
      maxY = Math.max(maxY, y + textHeight + offsetY);
    }

    // Account for stroke
    if (effects.stroke) {
      const strokeWidth = effects.stroke.width;
      minX = Math.min(minX, x - strokeWidth);
      minY = Math.min(minY, y - strokeWidth);
      maxX = Math.max(maxX, x + textWidth + strokeWidth);
      maxY = Math.max(maxY, y + textHeight + strokeWidth);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
