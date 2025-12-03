import { useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { BrushPoint, BrushSettings, UVCoordinate } from '../types/app';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';
import { CANVAS_CONFIG } from '../constants/CanvasSizes';
import { ProfessionalToolSet, ToolDefinition, ToolConfig } from '../vector/ProfessionalToolSet';
import { applyBlur, applySharpen, applyEdgeDetection } from '../utils/imageProcessing';

// Enhanced interfaces for the unified brush system
interface BrushEngineState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  brushCache: Map<string, HTMLCanvasElement>;
  strokeCache: Map<string, BrushPoint[]>;
  imageCache: Map<string, HTMLImageElement>; // Cache for loaded custom brush images
  performanceMetrics: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    lastUpdate: number;
  };
}

interface BrushPreset {
  id: string;
  name: string;
  category: 'basic' | 'artistic' | 'digital' | 'natural' | 'specialty' | 'custom';
  description: string;
  settings: BrushSettings;
  tags: string[];
  createdAt: number;
  modifiedAt: number;
}

interface PuffSettings {
  height: number;        // 0.1 - 5.0
  softness: number;      // 0.0 - 1.0
  color: string;         // Hex color
  opacity: number;       // 0.0 - 1.0
  brushSize: number;    // 5 - 200px
  brushFlow: number;     // 0.0 - 1.0
  brushSpacing: number; // 0.0 - 1.0
  pattern: string;       // Pattern ID
  patternScale: number;  // 0.1 - 3.0
  patternRotation: number; // 0 - 360 degrees
}

// Vector tool interfaces
interface VectorPoint {
  x: number;
  y: number;
  u: number;
  v: number;
  pressure?: number;
  timestamp?: number;
}

interface VectorPath {
  id: string;
  points: VectorPoint[];
  closed: boolean;
  tool: string;
  settings: ToolConfig;
  createdAt: number;
  modifiedAt: number;
}

interface VectorToolState {
  activeTool: string | null;
  currentPath: VectorPath | null;
  paths: VectorPath[];
  selectedPaths: string[];
  isDrawing: boolean;
}

interface BrushEngineAPI {
  // Core rendering
  renderBrushStroke: (points: BrushPoint[], settings: BrushSettings, targetCtx?: CanvasRenderingContext2D) => void;
  createBrushStamp: (settings: BrushSettings) => HTMLCanvasElement;
  calculateBrushDynamics: (point: BrushPoint, settings: BrushSettings, index: number) => {
    size: number;
    opacity: number;
    angle: number;
    spacing: number;
  };
  
  // Preset management
  getPresets: () => BrushPreset[];
  getPreset: (id: string) => BrushPreset | null;
  addPreset: (preset: BrushPreset) => void;
  updatePreset: (id: string, updates: Partial<BrushPreset>) => void;
  deletePreset: (id: string) => boolean;
  
  // Performance
  getBrushCacheKey: (settings: BrushSettings) => string;
  clearCache: () => void;
  getPerformanceMetrics: () => BrushEngineState['performanceMetrics'];
  getPerformanceReport: () => { fps: number; frameTime: number; memoryUsage: number; cacheSize: number; brushCacheSize: number; strokeCacheSize: number; lastUpdate: number; performanceLevel: string };
  optimizeForPerformance: () => void;
  startPerformanceMonitoring: () => void;
  stopPerformanceMonitoring: () => void;
  
  // 3D Integration
  renderBrushToUV: (point: BrushPoint, settings: BrushSettings, uvCanvas: HTMLCanvasElement) => void;
  screenToUV: (x: number, y: number, camera: THREE.Camera, scene: THREE.Scene) => { uv: THREE.Vector2; mesh: THREE.Mesh } | null;
  
  // Layer integration
  addBrushStrokeToLayer: (layerId: string, stroke: { points: BrushPoint[]; settings: BrushSettings }) => void;
  
  // Puff tool support
  renderPuffStroke: (points: BrushPoint[], puffSettings: PuffSettings, targetCtx?: CanvasRenderingContext2D) => void;
  createPuffStamp: (puffSettings: PuffSettings) => HTMLCanvasElement;
  
  // Vector tool support
  getVectorTools: () => ToolDefinition[];
  getVectorTool: (id: string) => ToolDefinition | null;
  setActiveVectorTool: (toolId: string) => boolean;
  getActiveVectorTool: () => ToolDefinition | null;
  createVectorPath: (toolId: string, startPoint: VectorPoint) => VectorPath;
  addPointToVectorPath: (pathId: string, point: VectorPoint) => boolean;
  closeVectorPath: (pathId: string) => boolean;
  renderVectorPath: (path: VectorPath, targetCtx: CanvasRenderingContext2D) => void;
  renderAllVectorPaths: (paths: VectorPath[], targetCtx: CanvasRenderingContext2D) => void;
  getVectorToolState: () => VectorToolState;
  updateVectorToolState: (updates: Partial<VectorToolState>) => void;
  
  // Cleanup
  dispose: () => void;
}

/**
 * useBrushEngine - Unified brush system with all advanced features
 * Replaces all previous brush implementations with a single, comprehensive system
 */
export function useBrushEngine(canvas?: HTMLCanvasElement): BrushEngineAPI {
  const stateRef = useRef<BrushEngineState | null>(null);
  const presetsRef = useRef<Map<string, BrushPreset>>(new Map());
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  
  // Vector tool state
  const vectorToolSetRef = useRef<ProfessionalToolSet | null>(null);
  const vectorStateRef = useRef<VectorToolState>({
    activeTool: null,
    currentPath: null,
    paths: [],
    selectedPaths: [],
    isDrawing: false
  });

  // Initialize brush engine state
  const initializeEngine = useCallback(() => {
    if (stateRef.current) return stateRef.current;

    try {
      const targetCanvas = canvas || document.createElement('canvas');
      
      // CRITICAL FIX: Use performance-managed canvas size instead of hardcoded 2048
      const optimalSize = unifiedPerformanceManager.getOptimalCanvasSize();
      targetCanvas.width = optimalSize.width;
      targetCanvas.height = optimalSize.height;

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context from canvas');
      }

      stateRef.current = {
        canvas: targetCanvas,
        ctx,
        brushCache: new Map(),
        strokeCache: new Map(),
        imageCache: new Map(),
        performanceMetrics: {
          fps: 60,
          frameTime: 16.67,
          memoryUsage: 0,
          lastUpdate: Date.now()
        }
      };

      // Initialize vector tool set
      if (!vectorToolSetRef.current) {
        vectorToolSetRef.current = ProfessionalToolSet.getInstance();
      }

      return stateRef.current;
    } catch (error) {
      console.error('❌ Brush Engine Initialization Error:', error);
      // Return a minimal fallback state
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 1024;
      fallbackCanvas.height = 1024;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      
      if (!fallbackCtx) {
        throw new Error('Critical: Cannot create fallback canvas context');
      }
      
      stateRef.current = {
        canvas: fallbackCanvas,
        ctx: fallbackCtx,
        brushCache: new Map(),
        imageCache: new Map(),
        strokeCache: new Map(),
        performanceMetrics: {
          fps: 30, // Reduced performance for fallback
          frameTime: 33.33,
          memoryUsage: 0,
          lastUpdate: Date.now()
        }
      };

      // Initialize vector tool set even in fallback mode
      if (!vectorToolSetRef.current) {
        vectorToolSetRef.current = ProfessionalToolSet.getInstance();
      }
      
      console.warn('⚠️ Brush Engine using fallback configuration');
      return stateRef.current;
    }
  }, [canvas]);

  // Enhanced performance optimization with adaptive strategies
  const optimizeForPerformance = useCallback(() => {
    const state = initializeEngine();
    const metrics = state.performanceMetrics;
    
    // Adaptive cache management based on performance
    if (metrics.fps < 30) {
      // Performance is poor - aggressive optimization
      console.warn('⚠️ Low FPS detected, applying aggressive optimization');
      
      // Clear least recently used cache entries
      const brushCacheEntries = Array.from(state.brushCache.entries());
      if (brushCacheEntries.length > 20) {
        // Keep only the most recent 10 entries
        const recentEntries = brushCacheEntries.slice(-10);
        state.brushCache.clear();
        recentEntries.forEach(([key, value]) => state.brushCache.set(key, value));
      }
      
      // Clear stroke cache to free memory
      state.strokeCache.clear();
    } else if (metrics.fps < 45) {
      // Moderate performance - conservative optimization
      const brushCacheEntries = Array.from(state.brushCache.entries());
      if (brushCacheEntries.length > 40) {
        // Keep only the most recent 25 entries
        const recentEntries = brushCacheEntries.slice(-25);
        state.brushCache.clear();
        recentEntries.forEach(([key, value]) => state.brushCache.set(key, value));
      }
    }
    
    // Memory management
    if (metrics.memoryUsage > 50) {
      // High memory usage - reduce cache sizes
      const brushCacheEntries = Array.from(state.brushCache.entries());
      if (brushCacheEntries.length > 30) {
        // Keep only the most recent 15 entries
        const recentEntries = brushCacheEntries.slice(-15);
        state.brushCache.clear();
        recentEntries.forEach(([key, value]) => state.brushCache.set(key, value));
      }
    }
    
    // Adaptive quality settings based on performance
    if (metrics.fps < 25) {
      // Very poor performance - reduce quality
      console.warn('⚠️ Very low FPS, reducing brush quality');
      // This could trigger UI notifications to reduce brush size or complexity
    }
  }, [initializeEngine]);

  // Enhanced performance monitoring and optimization
  const updatePerformanceMetrics = useCallback(() => {
    const state = initializeEngine();
    const now = Date.now();
    frameCountRef.current++;
    
    // Update FPS every second
    if (now - lastFpsUpdateRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));
      state.performanceMetrics.fps = fps;
      state.performanceMetrics.frameTime = 1000 / fps;
      state.performanceMetrics.lastUpdate = now;
      
      // Reset counters
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
      
      // Adaptive performance optimization
      if (fps < 30) {
        // Performance is poor - trigger optimization
        optimizeForPerformance();
      }
    }
    
    // Estimate memory usage based on cache sizes
    const brushCacheSize = state.brushCache.size;
    const strokeCacheSize = state.strokeCache.size;
    state.performanceMetrics.memoryUsage = (brushCacheSize + strokeCacheSize) * 0.1; // Rough estimate
  }, [initializeEngine, optimizeForPerformance]);

  // Initialize default presets
  const initializePresets = useCallback(() => {
    if (presetsRef.current.size > 0) return;

    const defaultPresets: BrushPreset[] = [
      {
        id: 'hard_round',
        name: 'Hard Round',
        category: 'basic',
        description: 'Classic hard-edged round brush',
        settings: {
          size: 20,
          opacity: 1,
          hardness: 1,
          flow: 1,
          spacing: 0.1,
          shape: 'round',
          angle: 0,
          roundness: 1,
          color: '#000000',
          blendMode: 'source-over',
          dynamics: {
            sizePressure: true,
            opacityPressure: true,
            anglePressure: false,
            spacingPressure: false,
            velocitySize: false,
            velocityOpacity: false
          },
          texture: {
            enabled: false,
            pattern: 'solid',
            scale: 1,
            rotation: 0,
            opacity: 1,
            blendMode: 'multiply'
          }
        },
        tags: ['basic', 'round', 'hard'],
        createdAt: Date.now(),
        modifiedAt: Date.now()
      },
      {
        id: 'watercolor_flat',
        name: 'Watercolor Flat',
        category: 'artistic',
        description: 'Soft watercolor brush with edge variation',
        settings: {
          size: 30,
          opacity: 0.6,
          hardness: 0.3,
          flow: 0.8,
          spacing: 0.05,
          shape: 'watercolor',
          angle: 0,
          roundness: 0.8,
          color: '#4A90E2',
          blendMode: 'multiply',
          dynamics: {
            sizePressure: true,
            opacityPressure: true,
            anglePressure: false,
            spacingPressure: false,
            velocitySize: true,
            velocityOpacity: false
          },
          texture: {
            enabled: true,
            pattern: 'watercolor',
            scale: 1.2,
            rotation: 0,
            opacity: 0.7,
            blendMode: 'multiply'
          }
        },
        tags: ['artistic', 'watercolor', 'soft', 'natural'],
        createdAt: Date.now(),
        modifiedAt: Date.now()
      },
      {
        id: 'charcoal_soft',
        name: 'Soft Charcoal',
        category: 'natural',
        description: 'Soft charcoal pencil with natural texture',
        settings: {
          size: 25,
          opacity: 0.7,
          hardness: 0.1,
          flow: 0.9,
          spacing: 0.02,
          shape: 'charcoal',
          angle: 0,
          roundness: 0.6,
          color: '#2C2C2C',
          blendMode: 'multiply',
          dynamics: {
            sizePressure: true,
            opacityPressure: true,
            anglePressure: true,
            spacingPressure: false,
            velocitySize: true,
            velocityOpacity: false
          },
          texture: {
            enabled: true,
            pattern: 'paper',
            scale: 0.8,
            rotation: 0,
            opacity: 0.8,
            blendMode: 'multiply'
          }
        },
        tags: ['natural', 'charcoal', 'pencil', 'soft'],
        createdAt: Date.now(),
        modifiedAt: Date.now()
      }
    ];

    defaultPresets.forEach(preset => {
      presetsRef.current.set(preset.id, preset);
    });
  }, []);

  // Update performance metrics (moved to enhanced version below)

  /**
   * Calculate dynamic brush properties based on input and settings
   */
  const calculateBrushDynamics = useCallback((point: BrushPoint, settings: BrushSettings, index: number) => {
    let size = settings.size;
    let opacity = settings.opacity;
    let angle = settings.angle;
    let spacing = settings.spacing;

    // Apply pressure dynamics
    if (settings.dynamics.sizePressure && point.pressure !== undefined) {
      size *= point.pressure;
    }

    if (settings.dynamics.opacityPressure && point.pressure !== undefined) {
      opacity *= point.pressure;
    }

    if (settings.dynamics.anglePressure && point.pressure !== undefined) {
      angle += (point.pressure - 1) * 45; // Pressure affects angle
    }

    // Apply velocity dynamics
    if (settings.dynamics.velocitySize && point.velocity > 0) {
      const velocityFactor = Math.max(0.1, 1 - point.velocity * 0.01);
      size *= velocityFactor;
    }

    if (settings.dynamics.velocityOpacity && point.velocity > 0) {
      const velocityFactor = Math.max(0.2, 1 - point.velocity * 0.3);
      opacity *= velocityFactor;
    }

    // Feature 23: Velocity-based rotation
    if (settings.dynamics.velocityRotation && point.velocity > 0) {
      const rotationAmount = settings.dynamics.velocityRotationAmount !== undefined 
        ? settings.dynamics.velocityRotationAmount 
        : 90; // Default: 90 degrees per unit velocity
      
      // Rotate based on velocity magnitude (faster = more rotation)
      // In a full implementation, we'd use velocity vector direction
      const velocityRotation = (point.velocity * rotationAmount) % 360;
      angle += velocityRotation;
    }

    // Feature 23: Velocity-based scale changes
    if (settings.dynamics.velocityScale && point.velocity > 0) {
      const scaleAmount = settings.dynamics.velocityScaleAmount !== undefined 
        ? settings.dynamics.velocityScaleAmount 
        : 0.5; // Default: 0.5x scale change per unit velocity
      
      // Faster strokes = smaller brush (more scale reduction)
      const velocityScaleFactor = Math.max(0.1, 1 - (point.velocity * scaleAmount));
      size *= velocityScaleFactor;
    }

    // Ensure reasonable bounds
    size = Math.max(0.5, Math.min(size, 500));
    opacity = Math.max(0, Math.min(opacity, 1));
    spacing = Math.max(0.01, Math.min(spacing, 1));
    angle = angle % 360;

    return { size, opacity, angle, spacing };
  }, []);

  /**
   * Create a brush stamp based on current settings
   */
  // Helper function to get color at a specific position for gradients
  const getColorAtPosition = (settings: BrushSettings, x: number, y: number, centerX: number, centerY: number, radius: number): string => {
    if (!settings.gradient) {
      return settings.color;
    }

    const gradient = settings.gradient;
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    
    // Calculate position based on gradient type
    let position = 0;
    
    if (gradient.type === 'linear') {
      // Linear gradient based on angle
      const dx = x - centerX;
      const dy = y - centerY;
      const angle = (gradient.angle * Math.PI) / 180;
      const distance = dx * Math.cos(angle) + dy * Math.sin(angle);
      position = (distance + radius) / (2 * radius);
    } else if (gradient.type === 'radial') {
      // Radial gradient from center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      position = distance / radius;
    }
    
    // Clamp position between 0 and 1
    position = Math.max(0, Math.min(1, position));
    
    // Find the two stops to interpolate between
    let stop1 = sortedStops[0];
    let stop2 = sortedStops[sortedStops.length - 1];
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      if (position >= sortedStops[i].position / 100 && position <= sortedStops[i + 1].position / 100) {
        stop1 = sortedStops[i];
        stop2 = sortedStops[i + 1];
        break;
      }
    }
    
    // Interpolate between the two stops
    const stop1Pos = stop1.position / 100;
    const stop2Pos = stop2.position / 100;
    const t = (position - stop1Pos) / (stop2Pos - stop1Pos);
    
    // Parse colors
    const color1 = stop1.color;
    const color2 = stop2.color;
    
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate RGB values
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    const finalColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    return finalColor;
  };

  /**
   * Generate cache key for brush settings
   */
  const getBrushCacheKey = useCallback((settings: BrushSettings): string => {
    const gradientKey = settings.gradient ? JSON.stringify(settings.gradient) : 'none';
    const customBrushKey = settings.customBrushImage ? settings.customBrushImage.substring(0, 50) : 'none'; // Use first 50 chars of image data for cache key
    const customRotationKey = settings.customBrushRotation !== undefined ? settings.customBrushRotation : 'none';
    const customScaleKey = settings.customBrushScale !== undefined ? settings.customBrushScale : 'none';
    const customFlipHKey = settings.customBrushFlipHorizontal ? 'h' : 'nh';
    const customFlipVKey = settings.customBrushFlipVertical ? 'v' : 'nv';
    const customColorizationKey = settings.customBrushColorizationMode || 'tint';
    const customAlphaThresholdKey = settings.customBrushAlphaThreshold !== undefined ? settings.customBrushAlphaThreshold : 'none';
    const customFilterKey = settings.customBrushFilter || 'none';
    const customFilterAmountKey = settings.customBrushFilterAmount !== undefined ? settings.customBrushFilterAmount : 1;
    const customLayersKey = settings.customBrushLayers ? JSON.stringify(settings.customBrushLayers.map(l => ({ id: l.id, opacity: l.opacity, blendMode: l.blendMode, enabled: l.enabled }))) : 'none';
    const customAnimatedKey = settings.customBrushAnimated ? 'anim' : 'static';
    const customFrameKey = settings.customBrushAnimationFrame !== undefined ? settings.customBrushAnimationFrame : 0;
    return `${settings.size}-${settings.opacity}-${settings.hardness}-${settings.flow}-${settings.spacing}-${settings.color}-${settings.blendMode}-${settings.shape}-${settings.angle}-${gradientKey}-${JSON.stringify(settings.texture)}-${customBrushKey}-${customRotationKey}-${customScaleKey}-${customFlipHKey}-${customFlipVKey}-${customColorizationKey}-${customAlphaThresholdKey}-${customFilterKey}-${customFilterAmountKey}-${customLayersKey}-${customAnimatedKey}-${customFrameKey}`;
  }, []);

  const createBrushStamp = useCallback((settings: BrushSettings): HTMLCanvasElement => {
    try {
      const state = initializeEngine();
      const cacheKey = getBrushCacheKey(settings);

      // Check cache first with performance tracking
      if (state.brushCache.has(cacheKey)) {
        // Cache hit - update performance metrics
        updatePerformanceMetrics();
        return state.brushCache.get(cacheKey)!;
      }

      // Validate settings
      if (!settings || typeof settings.size !== 'number' || settings.size <= 0) {
        throw new Error(`Invalid brush settings: size must be a positive number, got ${settings?.size}`);
      }

      // Performance optimization: Limit brush size for very large brushes
      const maxBrushSize = 200; // Reasonable maximum
      const optimizedSize = Math.min(settings.size, maxBrushSize);

      // Create new brush stamp with optimized size
      const stampSize = Math.ceil(optimizedSize * 2);
      const stampCanvas = document.createElement('canvas');
      stampCanvas.width = stampSize;
      stampCanvas.height = stampSize;
      const stampCtx = stampCanvas.getContext('2d');

      if (!stampCtx) {
        throw new Error('Failed to get 2D context for brush stamp canvas');
      }

      const centerX = stampSize / 2;
      const centerY = stampSize / 2;
      const radius = optimizedSize;

      // Clear canvas
      stampCtx.clearRect(0, 0, stampSize, stampSize);

      // Feature 21: Check for multi-layer brushes first, then single custom brush image
      if (settings.customBrushLayers && settings.customBrushLayers.length > 0) {
        // Multi-layer brush: composite multiple images
        const enabledLayers = settings.customBrushLayers.filter(layer => layer.enabled);
        
        if (enabledLayers.length > 0) {
          // Use the existing stamp canvas (which is 2x optimizedSize)
          const actualBrushSize = settings.size;
          const customStampSize = Math.ceil(actualBrushSize * 2);
          
          // Create a new canvas matching brush size for proper scaling
          const customCanvas = document.createElement('canvas');
          customCanvas.width = customStampSize;
          customCanvas.height = customStampSize;
          const customCtx = customCanvas.getContext('2d', { alpha: true });
          
          if (!customCtx) {
            throw new Error('Failed to get 2D context for custom brush stamp');
          }
          
          // Clear the canvas
          customCtx.clearRect(0, 0, customStampSize, customStampSize);
          
          // Composite each layer
          for (const layer of enabledLayers) {
            let layerImg = state.imageCache.get(layer.image);
            
            if (!layerImg) {
              layerImg = new Image();
              layerImg.crossOrigin = 'anonymous';
              layerImg.src = layer.image;
              state.imageCache.set(layer.image, layerImg);
            }
            
            if (layerImg.complete && layerImg.width > 0 && layerImg.height > 0) {
              // Calculate scaling for this layer
              const imageMaxDimension = Math.max(layerImg.width, layerImg.height);
              const baseScale = actualBrushSize / imageMaxDimension;
              const customScale = settings.customBrushScale !== undefined ? settings.customBrushScale : 1.0;
              const scale = baseScale * customScale;
              
              const scaledWidth = layerImg.width * scale;
              const scaledHeight = layerImg.height * scale;
              
              // Set blend mode and opacity
              customCtx.globalCompositeOperation = layer.blendMode;
              customCtx.globalAlpha = layer.opacity;
              
              // Draw layer centered
              const drawX = (customStampSize - scaledWidth) / 2;
              const drawY = (customStampSize - scaledHeight) / 2;
              
              customCtx.drawImage(layerImg, drawX, drawY, scaledWidth, scaledHeight);
            }
          }
          
          // Reset global alpha
          customCtx.globalAlpha = 1.0;
          customCtx.globalCompositeOperation = 'source-over';
          
          // Apply transformations (rotation, flip) to the composite
          const rotation = settings.customBrushRotation !== undefined ? settings.customBrushRotation : 0;
          const rotationRad = (rotation * Math.PI) / 180;
          const flipH = settings.customBrushFlipHorizontal || false;
          const flipV = settings.customBrushFlipVertical || false;
          
          if (rotation !== 0 || flipH || flipV) {
            customCtx.save();
            customCtx.translate(customStampSize / 2, customStampSize / 2);
            customCtx.rotate(rotationRad);
            customCtx.scale(flipH ? -1 : 1, flipV ? 1 : -1);
            customCtx.translate(-customStampSize / 2, -customStampSize / 2);
            
            // Get current image data, apply transform, then put back
            const imageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            customCtx.clearRect(0, 0, customStampSize, customStampSize);
            customCtx.putImageData(imageData, 0, 0);
            customCtx.restore();
          }
          
          // Apply brightness/contrast if specified
          const brightness = settings.customBrushBrightness || 0;
          const contrast = settings.customBrushContrast || 0;
          
          if (brightness !== 0 || contrast !== 0) {
            const imageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue;
              
              let r = data[i];
              let g = data[i + 1];
              let b = data[i + 2];
              
              if (brightness !== 0) {
                r = Math.max(0, Math.min(255, r + brightness));
                g = Math.max(0, Math.min(255, g + brightness));
                b = Math.max(0, Math.min(255, b + brightness));
              }
              
              if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
              }
              
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }
            customCtx.putImageData(imageData, 0, 0);
          }
          
          // Apply filter if specified
          if (settings.customBrushFilter && settings.customBrushFilter !== 'none') {
            const stampImageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            let filteredData: ImageData = stampImageData;
            const filterAmount = settings.customBrushFilterAmount !== undefined ? settings.customBrushFilterAmount : 1;
            
            switch (settings.customBrushFilter) {
              case 'blur':
                filteredData = applyBlur(stampImageData, filterAmount);
                break;
              case 'sharpen':
                filteredData = applySharpen(stampImageData, filterAmount);
                break;
              case 'edge':
                filteredData = applyEdgeDetection(stampImageData);
                break;
            }
            
            customCtx.putImageData(filteredData, 0, 0);
          }
          
          // Feature 25: Apply texture overlay if specified
          if (settings.customBrushTextureOverlay && settings.customBrushTextureImage) {
            let textureImg = state.imageCache.get(settings.customBrushTextureImage);
            
            if (!textureImg) {
              textureImg = new Image();
              textureImg.crossOrigin = 'anonymous';
              textureImg.src = settings.customBrushTextureImage;
              state.imageCache.set(settings.customBrushTextureImage, textureImg);
            }
            
            if (textureImg.complete && textureImg.width > 0 && textureImg.height > 0) {
              customCtx.save();
              customCtx.globalCompositeOperation = settings.customBrushTextureBlendMode || 'overlay';
              customCtx.globalAlpha = settings.customBrushTextureOpacity !== undefined ? settings.customBrushTextureOpacity : 0.5;
              
              const textureScale = settings.customBrushTextureScale !== undefined ? settings.customBrushTextureScale : 1.0;
              const textureWidth = customStampSize * textureScale;
              const textureHeight = customStampSize * textureScale;
              
              // Center the texture
              const textureX = (customStampSize - textureWidth) / 2;
              const textureY = (customStampSize - textureHeight) / 2;
              
              // Create pattern for tiling
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = textureWidth;
              patternCanvas.height = textureHeight;
              const patternCtx = patternCanvas.getContext('2d');
              
              if (patternCtx) {
                patternCtx.drawImage(textureImg, 0, 0, textureWidth, textureHeight);
                const pattern = customCtx.createPattern(patternCanvas, 'repeat');
                
                if (pattern) {
                  customCtx.fillStyle = pattern;
                  customCtx.fillRect(0, 0, customStampSize, customStampSize);
                } else {
                  // Fallback: draw texture directly
                  customCtx.drawImage(textureImg, textureX, textureY, textureWidth, textureHeight);
                }
              } else {
                // Fallback: draw texture directly
                customCtx.drawImage(textureImg, textureX, textureY, textureWidth, textureHeight);
              }
              
              customCtx.restore();
            }
          }
          
          // Copy to main stamp canvas
          stampCtx.clearRect(0, 0, stampSize, stampSize);
          stampCtx.drawImage(customCanvas, 0, 0, stampSize, stampSize);
          
          return stampCanvas;
        }
      }
      
      // Feature 22: Check for animated brush (GIF frames)
      if (settings.customBrushAnimated && settings.customBrushFrames && settings.customBrushFrames.length > 0) {
        const currentFrameIndex = settings.customBrushAnimationFrame !== undefined 
          ? Math.floor(settings.customBrushAnimationFrame) % settings.customBrushFrames.length 
          : 0;
        const currentFrame = settings.customBrushFrames[currentFrameIndex];
        
        if (currentFrame && currentFrame.image && currentFrame.image.complete && currentFrame.image.width > 0) {
          const img = currentFrame.image;
          // Use the same logic as single custom brush but with animated frame
          const actualBrushSize = settings.size;
          const customStampSize = Math.ceil(actualBrushSize * 2);
          
          const customCanvas = document.createElement('canvas');
          customCanvas.width = customStampSize;
          customCanvas.height = customStampSize;
          const customCtx = customCanvas.getContext('2d', { alpha: true });
          
          if (!customCtx) {
            throw new Error('Failed to get 2D context for animated brush stamp');
          }
          
          customCtx.clearRect(0, 0, customStampSize, customStampSize);
          
          const imageMaxDimension = Math.max(img.width, img.height);
          const baseScale = actualBrushSize / imageMaxDimension;
          const customScale = settings.customBrushScale !== undefined ? settings.customBrushScale : 1.0;
          const scale = baseScale * customScale;
          
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          
          customCtx.imageSmoothingEnabled = true;
          customCtx.imageSmoothingQuality = 'high';
          
          const scaledDrawWidth = scaledWidth * 2;
          const scaledDrawHeight = scaledHeight * 2;
          const drawX = (customStampSize - scaledDrawWidth) / 2;
          
          customCtx.save();
          customCtx.globalAlpha = settings.opacity || 1.0;
          
          const rotation = settings.customBrushRotation || 0;
          const rotationRad = (rotation * Math.PI) / 180;
          const flipH = settings.customBrushFlipHorizontal || false;
          const flipV = settings.customBrushFlipVertical || false;
          
          customCtx.translate(customStampSize / 2, customStampSize / 2);
          customCtx.rotate(rotationRad);
          customCtx.scale(flipH ? -1 : 1, flipV ? 1 : -1);
          customCtx.translate(-customStampSize / 2, -customStampSize / 2);
          
          const drawY = (customStampSize - scaledDrawHeight) / 2;
          customCtx.drawImage(img, drawX, drawY, scaledDrawWidth, scaledDrawHeight);
          customCtx.restore();
          
          // Apply brightness/contrast
          const brightness = settings.customBrushBrightness || 0;
          const contrast = settings.customBrushContrast || 0;
          
          if (brightness !== 0 || contrast !== 0) {
            const imageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue;
              
              let r = data[i];
              let g = data[i + 1];
              let b = data[i + 2];
              
              if (brightness !== 0) {
                r = Math.max(0, Math.min(255, r + brightness));
                g = Math.max(0, Math.min(255, g + brightness));
                b = Math.max(0, Math.min(255, b + brightness));
              }
              
              if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
              }
              
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }
            customCtx.putImageData(imageData, 0, 0);
          }
          
          // Apply filter if specified
          if (settings.customBrushFilter && settings.customBrushFilter !== 'none') {
            const stampImageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            let filteredData: ImageData = stampImageData;
            const filterAmount = settings.customBrushFilterAmount !== undefined ? settings.customBrushFilterAmount : 1;
            
            switch (settings.customBrushFilter) {
              case 'blur':
                filteredData = applyBlur(stampImageData, filterAmount);
                break;
              case 'sharpen':
                filteredData = applySharpen(stampImageData, filterAmount);
                break;
              case 'edge':
                filteredData = applyEdgeDetection(stampImageData);
                break;
            }
            
            customCtx.putImageData(filteredData, 0, 0);
          }
          
          stampCtx.clearRect(0, 0, stampSize, stampSize);
          stampCtx.drawImage(customCanvas, 0, 0, stampSize, stampSize);
          
          return stampCanvas;
        }
      }
      
      // Check if custom brush image is provided (single layer)
      if (settings.customBrushImage) {
        // Check if image is already cached and loaded
        let img = state.imageCache.get(settings.customBrushImage);
        
        if (!img) {
          // Image not cached, create and cache it (will load asynchronously)
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = settings.customBrushImage;
          state.imageCache.set(settings.customBrushImage, img);
        }
        
        // If image is loaded and ready, use it as a stencil
        if (img.complete && img.width > 0 && img.height > 0) {
          // Feature 20: Apply image filter if specified (synchronous processing)
          let processedImage = img;
          if (settings.customBrushFilter && settings.customBrushFilter !== 'none') {
            try {
              // Create temporary canvas to apply filter
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;
              const tempCtx = tempCanvas.getContext('2d', { alpha: true });
              
              if (tempCtx) {
                tempCtx.drawImage(img, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                
                // Apply filter synchronously
                let processedData: ImageData = imageData;
                const filterAmount = settings.customBrushFilterAmount !== undefined ? settings.customBrushFilterAmount : 1;
                
                switch (settings.customBrushFilter) {
                  case 'blur':
                    processedData = applyBlur(imageData, filterAmount);
                    break;
                  case 'sharpen':
                    processedData = applySharpen(imageData, filterAmount);
                    break;
                  case 'edge':
                    processedData = applyEdgeDetection(imageData);
                    break;
                  default:
                    processedData = imageData;
                }
                
                tempCtx.putImageData(processedData, 0, 0);
                
                // Create new image from processed canvas
                // The canvas data URL is immediately available, so we can use it
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL('image/png');
                // For immediate use, we'll draw from the canvas directly if image isn't loaded yet
                if (processedImg.complete) {
                  processedImage = processedImg;
                } else {
                  // If not complete, we'll use the canvas directly in drawing
                  // Store canvas reference for later use
                  (tempCanvas as any).__isProcessed = true;
                  processedImage = img; // Fallback to original, but we'll use canvas when drawing
                }
              }
            } catch (error) {
              console.warn('Failed to apply filter, using original image:', error);
              processedImage = img;
            }
          }
          
          // FIXED: Use actual brush size for proper scaling
          // The stamp size should match brush size, but we'll render at higher quality
          const actualBrushSize = settings.size; // Use actual brush size so it scales correctly
          const imageMaxDimension = Math.max(processedImage.width || img.width, processedImage.height || img.height);
          
          // Calculate base scaling to fit the ACTUAL brush size - this ensures size changes with brush size
          const baseScale = actualBrushSize / imageMaxDimension;
          
          // Apply custom brush scale multiplier (0.5x-3.0x)
          const customScale = settings.customBrushScale !== undefined ? settings.customBrushScale : 1.0;
          const scale = baseScale * customScale;
          
          const scaledWidth = processedImage.width * scale;
          const scaledHeight = processedImage.height * scale;
          
          // Use the existing stamp canvas (which is 2x optimizedSize)
          // But for custom brushes, use actual brush size to match exactly
          const customStampSize = Math.ceil(actualBrushSize * 2); // 2x for quality
          
          // Create a new canvas matching brush size for proper scaling
          const customCanvas = document.createElement('canvas');
          customCanvas.width = customStampSize;
          customCanvas.height = customStampSize;
          const customCtx = customCanvas.getContext('2d', { alpha: true });
          
          if (!customCtx) {
            throw new Error('Failed to get 2D context for custom brush stamp');
          }
          
          // Clear the canvas
          customCtx.clearRect(0, 0, customStampSize, customStampSize);
          
          // Get brush color and opacity
          const brushColor = settings.color || '#000000';
          const brushOpacity = (settings.opacity || 1.0);
          
          // QUALITY: Use high-quality image smoothing for crisp results
          customCtx.imageSmoothingEnabled = true;
          customCtx.imageSmoothingQuality = 'high';
          
          // Scale the image dimensions to match the high-res canvas
          const scaledDrawWidth = scaledWidth * 2; // Scale to 2x for quality
          const scaledDrawHeight = scaledHeight * 2;
          const drawX = (customStampSize - scaledDrawWidth) / 2;
          
          // Draw the image at high resolution (includes alpha channel/mask)
          customCtx.save();
          customCtx.globalAlpha = brushOpacity;
          
          // Apply rotation if specified
          const rotation = settings.customBrushRotation || 0;
          const rotationRad = (rotation * Math.PI) / 180;
          
          // Apply flip settings
          const flipH = settings.customBrushFlipHorizontal || false;
          const flipV = settings.customBrushFlipVertical || false;
          
          // FIX Y-AXIS INVERSION: Flip the image vertically (base flip for coordinate system)
          // Translate to center, apply rotation, apply flips, flip Y-axis (scale Y by -1)
          customCtx.translate(customStampSize / 2, customStampSize / 2);
          customCtx.rotate(rotationRad); // Apply rotation
          customCtx.scale(flipH ? -1 : 1, flipV ? 1 : -1); // Apply horizontal flip, then vertical flip (inverted for coordinate system)
          customCtx.translate(-customStampSize / 2, -customStampSize / 2);
          
          // Draw image centered (drawY calculated for flipped coordinate system)
          const drawY = (customStampSize - scaledDrawHeight) / 2;
          
          // Feature 20: Draw image first, then apply filter if needed
          customCtx.drawImage(img, drawX, drawY, scaledDrawWidth, scaledDrawHeight);
          
          // Reset transform
          customCtx.restore();
          
          // Feature 20: Apply filter to the final stamp if specified
          if (settings.customBrushFilter && settings.customBrushFilter !== 'none') {
            const stampImageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            let filteredData: ImageData = stampImageData;
            const filterAmount = settings.customBrushFilterAmount !== undefined ? settings.customBrushFilterAmount : 1;
            
            switch (settings.customBrushFilter) {
              case 'blur':
                filteredData = applyBlur(stampImageData, filterAmount);
                break;
              case 'sharpen':
                filteredData = applySharpen(stampImageData, filterAmount);
                break;
              case 'edge':
                filteredData = applyEdgeDetection(stampImageData);
                break;
            }
            
            customCtx.putImageData(filteredData, 0, 0);
          }
          
          // Feature 25: Apply texture overlay if specified
          if (settings.customBrushTextureOverlay && settings.customBrushTextureImage) {
            let textureImg = state.imageCache.get(settings.customBrushTextureImage);
            
            if (!textureImg) {
              textureImg = new Image();
              textureImg.crossOrigin = 'anonymous';
              textureImg.src = settings.customBrushTextureImage;
              state.imageCache.set(settings.customBrushTextureImage, textureImg);
            }
            
            if (textureImg.complete && textureImg.width > 0 && textureImg.height > 0) {
              customCtx.save();
              customCtx.globalCompositeOperation = settings.customBrushTextureBlendMode || 'overlay';
              customCtx.globalAlpha = settings.customBrushTextureOpacity !== undefined ? settings.customBrushTextureOpacity : 0.5;
              
              const textureScale = settings.customBrushTextureScale !== undefined ? settings.customBrushTextureScale : 1.0;
              const textureWidth = customStampSize * textureScale;
              const textureHeight = customStampSize * textureScale;
              
              // Center the texture
              const textureX = (customStampSize - textureWidth) / 2;
              const textureY = (customStampSize - textureHeight) / 2;
              
              // Create pattern for tiling
              const patternCanvas = document.createElement('canvas');
              patternCanvas.width = textureWidth;
              patternCanvas.height = textureHeight;
              const patternCtx = patternCanvas.getContext('2d');
              
              if (patternCtx) {
                patternCtx.drawImage(textureImg, 0, 0, textureWidth, textureHeight);
                const pattern = customCtx.createPattern(patternCanvas, 'repeat');
                
                if (pattern) {
                  customCtx.fillStyle = pattern;
                  customCtx.fillRect(0, 0, customStampSize, customStampSize);
                } else {
                  // Fallback: draw texture directly
                  customCtx.drawImage(textureImg, textureX, textureY, textureWidth, textureHeight);
                }
              } else {
                // Fallback: draw texture directly
                customCtx.drawImage(textureImg, textureX, textureY, textureWidth, textureHeight);
              }
              
              customCtx.restore();
            }
          }
          
          // Feature 18: Apply brightness/contrast adjustments
          const brightness = settings.customBrushBrightness !== undefined ? settings.customBrushBrightness : 0;
          const contrast = settings.customBrushContrast !== undefined ? settings.customBrushContrast : 0;
          
          if (brightness !== 0 || contrast !== 0) {
            const imageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue; // Skip transparent pixels
              
              let r = data[i];
              let g = data[i + 1];
              let b = data[i + 2];
              
              // Apply brightness
              if (brightness !== 0) {
                r = Math.max(0, Math.min(255, r + brightness));
                g = Math.max(0, Math.min(255, g + brightness));
                b = Math.max(0, Math.min(255, b + brightness));
              }
              
              // Apply contrast
              if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
              }
              
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }
            
            customCtx.putImageData(imageData, 0, 0);
          }
          
          // Apply alpha threshold if specified
          const alphaThreshold = settings.customBrushAlphaThreshold !== undefined ? settings.customBrushAlphaThreshold : 50;
          if (alphaThreshold > 0) {
            // Get image data and apply threshold
            const imageData = customCtx.getImageData(0, 0, customStampSize, customStampSize);
            const data = imageData.data;
            const thresholdValue = Math.floor((alphaThreshold / 100) * 255);
            
            // Apply threshold: pixels below threshold become transparent
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] < thresholdValue) {
                data[i] = 0; // Set alpha to 0 (transparent)
              }
            }
            
            customCtx.putImageData(imageData, 0, 0);
          }
          
          // Apply colorization based on mode
          const colorizationMode = settings.customBrushColorizationMode || 'tint';
          customCtx.save();
          
          if (colorizationMode === 'preserve') {
            // Don't apply any color - preserve original image colors
            // Nothing to do here
          } else if (colorizationMode === 'tint') {
            // Tint: Apply color using source-atop (only colors opaque parts)
            customCtx.globalCompositeOperation = 'source-atop';
            customCtx.fillStyle = brushColor;
            customCtx.fillRect(0, 0, customStampSize, customStampSize);
          } else if (colorizationMode === 'multiply') {
            // Multiply: Darken the image with the brush color
            customCtx.globalCompositeOperation = 'multiply';
            customCtx.fillStyle = brushColor;
            customCtx.fillRect(0, 0, customStampSize, customStampSize);
          } else if (colorizationMode === 'overlay') {
            // Overlay: Blend color with image
            customCtx.globalCompositeOperation = 'overlay';
            customCtx.fillStyle = brushColor;
            customCtx.fillRect(0, 0, customStampSize, customStampSize);
          } else if (colorizationMode === 'colorize') {
            // Colorize: Replace colors while preserving luminance
            customCtx.globalCompositeOperation = 'color';
            customCtx.fillStyle = brushColor;
            customCtx.fillRect(0, 0, customStampSize, customStampSize);
          }
          
          customCtx.restore();
          
          // Use this canvas as the stamp
          const qualityStampCanvas = customCanvas;
          
          // Cache the high-quality result
          if (state.brushCache.size < 100) {
            state.brushCache.set(cacheKey, qualityStampCanvas);
          } else {
            const entries = Array.from(state.brushCache.entries());
            const oldestEntries = entries.slice(0, 20);
            oldestEntries.forEach(([key]) => state.brushCache.delete(key));
            state.brushCache.set(cacheKey, qualityStampCanvas);
          }
          
          updatePerformanceMetrics();
          return qualityStampCanvas;
        } else {
          // Image not ready yet, fall back to default brush
          // This can happen on first load - the image will be ready on next call
          console.warn('Custom brush image not ready yet, using default brush. Will use custom image once loaded.');
          createBrushSpecificStamp(stampCtx, { ...settings, size: optimizedSize }, stampSize, centerX, centerY, radius);
          if (state.brushCache.size < 100) {
            state.brushCache.set(cacheKey, stampCanvas);
          }
          updatePerformanceMetrics();
          return stampCanvas;
        }
      }

      // Create brush-specific stamp based on shape (default behavior)
      createBrushSpecificStamp(stampCtx, { ...settings, size: optimizedSize }, stampSize, centerX, centerY, radius);

      // Cache the result with size limit
      if (state.brushCache.size < 100) { // Prevent unlimited cache growth
        state.brushCache.set(cacheKey, stampCanvas);
      } else {
        // Remove oldest entries if cache is full
        const entries = Array.from(state.brushCache.entries());
        const oldestEntries = entries.slice(0, 20); // Remove 20 oldest
        oldestEntries.forEach(([key]) => state.brushCache.delete(key));
        state.brushCache.set(cacheKey, stampCanvas);
      }

      // Update performance metrics
      updatePerformanceMetrics();

      return stampCanvas;
    } catch (error) {
      console.error('❌ Brush Stamp Creation Error:', error);
      
      // Return a fallback brush stamp
      const fallbackSize = 20;
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = fallbackSize;
      fallbackCanvas.height = fallbackSize;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      
      if (fallbackCtx) {
        fallbackCtx.fillStyle = settings?.color || '#000000';
        fallbackCtx.beginPath();
        fallbackCtx.arc(fallbackSize / 2, fallbackSize / 2, fallbackSize / 2, 0, Math.PI * 2);
        fallbackCtx.fill();
      }
      
      console.warn('⚠️ Using fallback brush stamp');
      return fallbackCanvas;
    }
  }, [initializeEngine, getBrushCacheKey, updatePerformanceMetrics]);

  /**
   * Create brush-specific stamp with unique characteristics for each type
   */
  const createBrushSpecificStamp = (
    ctx: CanvasRenderingContext2D, 
    settings: BrushSettings, 
    size: number, 
    centerX: number, 
    centerY: number, 
    radius: number
  ) => {
    // Get image data for pixel manipulation
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    // Create unique patterns for each brush type
    switch (settings.shape) {
      case 'round':
        createRoundBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'square':
        createSquareBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'diamond':
        createDiamondBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'triangle':
        createTriangleBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'airbrush':
        createAirbrushBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'spray':
        createSprayBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'texture':
        createTextureBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'watercolor':
        createWatercolorBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'oil':
        createOilBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'acrylic':
        createAcrylicBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'gouache':
        createGouacheBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'ink':
        createInkBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'pencil':
        createPencilBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'charcoal':
        createCharcoalBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'pastel':
        createPastelBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'chalk':
        createChalkBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'marker':
        createMarkerBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'highlighter':
        createHighlighterBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'calligraphy':
        createCalligraphyBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'stencil':
        createStencilBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'stamp':
        createStampBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'blur':
        createBlurBrush(data, size, centerX, centerY, radius, settings);
        break;
      case 'smudge':
        createSmudgeBrush(data, size, centerX, centerY, radius, settings);
        break;
      default:
        createRoundBrush(data, size, centerX, centerY, radius, settings);
    }
    
    // Put the image data back to canvas
    ctx.putImageData(imageData, 0, 0);
  };

  // Individual brush creation functions with unique characteristics
  const createRoundBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        const hardness = settings.hardness;
        let alpha = settings.opacity * 255;
        
        if (normalizedDistance > hardness) {
          const falloff = 1 - (normalizedDistance - hardness) / (1 - hardness);
          alpha *= Math.max(0, falloff);
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;     // R
        data[index + 1] = g; // G
        data[index + 2] = b; // B
        data[index + 3] = alpha; // A
      }
    }
  };

  const createSquareBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        const maxDist = Math.max(dx, dy);
        const normalizedDistance = maxDist / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        const alpha = settings.opacity * 255;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = alpha;
      }
    }
  };

  const createDiamondBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const diamondDist = (Math.abs(dx) + Math.abs(dy)) / Math.SQRT2;
        const normalizedDistance = diamondDist / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        const alpha = settings.opacity * 255;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = alpha;
      }
    }
  };

  const createTriangleBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const angle = Math.atan2(dy, dx);
        const segment = Math.floor((angle + Math.PI) / (Math.PI * 2) * 3);
        const baseAngle = segment * Math.PI * 2 / 3;
        const relativeAngle = Math.abs(angle - baseAngle);
        const triangleDist = Math.sqrt(dx * dx + dy * dy) * Math.cos(relativeAngle);
        const normalizedDistance = triangleDist / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        const alpha = settings.opacity * 255;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = alpha;
      }
    }
  };

  const createAirbrushBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic airbrush with pressure variations and nozzle patterns
    const nozzleCount = Math.floor(radius / 3) + 1;
    const pressureVariation = 0.3;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Create multiple nozzle pattern
        let totalAlpha = 0;
        for (let nozzle = 0; nozzle < nozzleCount; nozzle++) {
          const nozzleAngle = (nozzle / nozzleCount) * Math.PI * 2;
          const nozzleDistance = (nozzle % 2 === 0) ? 0 : radius * 0.3;
          
          const nozzleX = centerX + Math.cos(nozzleAngle) * nozzleDistance;
          const nozzleY = centerY + Math.sin(nozzleAngle) * nozzleDistance;
          
          const nozzleDx = x - nozzleX;
          const nozzleDy = y - nozzleY;
          const nozzleDist = Math.sqrt(nozzleDx * nozzleDx + nozzleDy * nozzleDy);
          const nozzleNormDist = nozzleDist / (radius * 0.7);
          
          if (nozzleNormDist <= 1) {
            const pressure = 0.7 + Math.sin(x * 0.2 + y * 0.15 + nozzle) * pressureVariation;
            const turbulence = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.05) * Math.sin(y * 0.05);
            const turbulenceFactor = 1 + turbulence * 0.2;
            
            const nozzleAlpha = settings.opacity * 255 * pressure * turbulenceFactor * 
                               Math.exp(-nozzleNormDist * nozzleNormDist * 1.5);
            totalAlpha += nozzleAlpha;
          }
        }
        
        // Add some random speckles for realistic airbrush texture
        const speckleChance = Math.random();
        if (speckleChance < 0.1) {
          const speckleIntensity = Math.random() * 0.5 + 0.5;
          totalAlpha += settings.opacity * 255 * speckleIntensity * 0.3;
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, totalAlpha / nozzleCount));
      }
    }
  };

  const createSprayBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic spray can effect with scattered particles
    const particleCount = Math.floor(radius * radius * 0.3);
    
    for (let i = 0; i < particleCount; i++) {
      // Generate random position within spray area
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const sprayX = centerX + Math.cos(angle) * distance;
      const sprayY = centerY + Math.sin(angle) * distance;
      
      // Add some randomness to particle size
      const particleSize = Math.random() * 3 + 1;
      const particleOpacity = Math.random() * 0.8 + 0.2;
      
      // Create individual particle
      for (let py = Math.floor(sprayY - particleSize); py <= Math.floor(sprayY + particleSize); py++) {
        for (let px = Math.floor(sprayX - particleSize); px <= Math.floor(sprayX + particleSize); px++) {
          if (px < 0 || px >= size || py < 0 || py >= size) continue;
          
          const particleDx = px - sprayX;
          const particleDy = py - sprayY;
          const particleDist = Math.sqrt(particleDx * particleDx + particleDy * particleDy);
          
          if (particleDist <= particleSize) {
            const index = (py * size + px) * 4;
            const falloff = 1 - (particleDist / particleSize);
            const alpha = settings.opacity * 255 * particleOpacity * falloff;
            
            // Parse brush color and apply it
            const color = getColorAtPosition(settings, sprayX, sprayY, centerX, centerY, radius);
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = Math.max(0, Math.min(255, alpha));
          }
        }
      }
    }
  };

  const createTextureBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic textured brush with canvas/paper-like grain
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Create multi-layered texture for realistic canvas/paper grain
        let textureFactor = 0;
        const textureLayers = 3;
        
        for (let layer = 0; layer < textureLayers; layer++) {
          const layerScale = Math.pow(2, layer);
          const freqX = 0.15 * layerScale;
          const freqY = 0.15 * layerScale;
          
          // Create canvas weave pattern
          const weave1 = Math.sin(x * freqX) * Math.cos(y * freqY);
          const weave2 = Math.sin(x * freqX * 1.3) * Math.sin(y * freqY * 0.8);
          const weave3 = Math.cos(x * freqX * 0.7) * Math.cos(y * freqY * 1.2);
          
          const combinedWeave = (weave1 + weave2 + weave3) / 3;
          const layerIntensity = 0.7 + combinedWeave * 0.3;
          textureFactor += layerIntensity / textureLayers;
        }
        
        // Add some random texture variation
        const randomVariation = Math.sin(x * 0.3 + y * 0.2) * Math.cos(x * 0.1 - y * 0.15);
        textureFactor += randomVariation * 0.1;
        
        // Normalize texture factor
        textureFactor = Math.max(0.6, Math.min(1.0, textureFactor));
        
        const alpha = settings.opacity * 255 * textureFactor * Math.exp(-normalizedDistance * normalizedDistance);
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createWatercolorBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // REALISTIC WATERCOLOR: Transparent, luminous, with granulation and soft bleeding
    // Key characteristics: 30-50% opacity, soft edges, paper texture visible, granulation
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1.3) continue; // Extended bleeding area
        
        const index = (y * size + x) * 4;
        
        // WATERCOLOR: High transparency (30-50% of normal opacity)
        const baseTransparency = 0.4; // Watercolor is naturally transparent
        const baseAlpha = settings.opacity * 255 * baseTransparency;
        
        // Create water flow patterns for realistic bleeding
        const flowX = Math.sin(x * 0.05) * Math.cos(y * 0.03);
        const flowY = Math.cos(x * 0.03) * Math.sin(y * 0.05);
        const flowMagnitude = Math.sqrt(flowX * flowX + flowY * flowY);
        
        // GRANULATION: Pigment settling into paper texture (grainy effect)
        const granulation1 = Math.sin(x * 0.15) * Math.cos(y * 0.15);
        const granulation2 = Math.sin(x * 0.25) * Math.sin(y * 0.2);
        const granulation3 = Math.cos(x * 0.1) * Math.cos(y * 0.12);
        const combinedGranulation = (granulation1 + granulation2 + granulation3) / 3;
        const granulationFactor = 0.7 + combinedGranulation * 0.6; // Creates grainy texture
        
        // PAPER TEXTURE: Visible through transparent paint
        const paperTexture1 = Math.sin(x * 0.3) * Math.cos(y * 0.3);
        const paperTexture2 = Math.sin(x * 0.5) * Math.sin(y * 0.4);
        const paperTexture = (paperTexture1 + paperTexture2) / 2;
        const paperFactor = 0.85 + paperTexture * 0.3; // Paper shows through
        
        // SOFT EDGES: Very feathered, organic falloff
        let alpha = baseAlpha;
        if (normalizedDistance <= 0.6) {
          // Core area - moderate opacity with granulation
          alpha = baseAlpha * granulationFactor * paperFactor;
        } else if (normalizedDistance <= 0.9) {
          // Transition area - very soft falloff
          const falloff = 1 - (normalizedDistance - 0.6) / 0.3;
          alpha = baseAlpha * falloff * granulationFactor * paperFactor;
        } else {
          // Bleeding area - very soft, directional bleeding
          const bleedDistance = normalizedDistance - 0.9;
          const bleedFactor = Math.exp(-bleedDistance * 3) * (1 + flowMagnitude * 0.5);
          alpha = baseAlpha * 0.2 * bleedFactor * granulationFactor;
        }
        
        // LUMINOUS EFFECT: Watercolor glows (light passes through)
        const luminousFactor = 1.1; // Slight brightness boost for glow
        
        // Get color (solid or gradient) - watercolor colors are more vibrant due to transparency
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Apply luminous effect (slight brightness increase)
        const finalR = Math.min(255, r * luminousFactor);
        const finalG = Math.min(255, g * luminousFactor);
        const finalB = Math.min(255, b * luminousFactor);
        
        data[index] = finalR;
        data[index + 1] = finalG;
        data[index + 2] = finalB;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createOilBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // REALISTIC OIL PAINT: Rich, thick, visible brush strokes, glossy sheen, impasto
    // Key characteristics: 100% opacity, visible brush marks, thick texture, glossy finish
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // OIL PAINT: Full opacity (100%) - completely opaque
        const baseOpacity = 1.0;
        const baseAlpha = settings.opacity * 255 * baseOpacity;
        
        // VISIBLE BRUSH STROKES: Oil paint shows brush marks clearly
        const strokeAngle = Math.atan2(dy, dx);
        const strokePattern1 = Math.sin(strokeAngle * 6 + x * 0.15 + y * 0.1);
        const strokePattern2 = Math.cos(strokeAngle * 4 - x * 0.1 + y * 0.15);
        const combinedStroke = (strokePattern1 + strokePattern2) / 2;
        const strokeVariation = 0.75 + combinedStroke * 0.5; // Strong brush mark variation
        
        // IMPASTO EFFECT: Thick paint application creates texture depth
        const impasto1 = Math.sin(x * 0.04) * Math.cos(y * 0.04);
        const impasto2 = Math.sin(x * 0.08) * Math.sin(y * 0.06);
        const impasto3 = Math.cos(x * 0.06) * Math.cos(y * 0.08);
        const combinedImpasto = (impasto1 + impasto2 + impasto3) / 3;
        const thicknessVariation = 0.7 + combinedImpasto * 0.6; // Strong thickness variation
        
        // RICH TEXTURE: Oil paint has more texture than acrylic
        const textureVariation = Math.sin(x * 0.1) * Math.cos(y * 0.1) + 
                                Math.sin(x * 0.05) * Math.sin(y * 0.05);
        const textureFactor = 0.8 + textureVariation * 0.4;
        
        // Calculate alpha with all variations
        let alpha = baseAlpha * strokeVariation * thicknessVariation * textureFactor;
        
        // Smooth falloff
        if (normalizedDistance <= 0.75) {
          // Core area - full rich coverage with all texture
          alpha = baseAlpha * strokeVariation * thicknessVariation * textureFactor;
        } else {
          // Edge area - gradual falloff
          const falloff = 1 - (normalizedDistance - 0.75) / 0.25;
          alpha = baseAlpha * falloff * strokeVariation * thicknessVariation * textureFactor;
        }
        
        // Add paint globules for impasto texture
        const globuleChance = Math.random();
        if (globuleChance < 0.08) { // 8% chance - more globules than before
          const globuleIntensity = Math.random() * 0.4 + 0.6;
          alpha += settings.opacity * 255 * globuleIntensity * 0.3;
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // GLOSSY SHEEN: Oil paint has natural sheen (slight brightness boost)
        const sheenFactor = 1.08; // 8% brightness for glossy effect
        const finalR = Math.min(255, r * sheenFactor);
        const finalG = Math.min(255, g * sheenFactor);
        const finalB = Math.min(255, b * sheenFactor);
        
        data[index] = finalR;
        data[index + 1] = finalG;
        data[index + 2] = finalB;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createAcrylicBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // REALISTIC ACRYLIC: Opaque, vibrant, smooth finish, sharp edges
    // Key characteristics: 90-100% opacity, vibrant colors, smooth texture, defined edges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // ACRYLIC: High opacity (90-100% of normal opacity) - opaque coverage
        const baseOpacity = 0.95; // Acrylic is opaque
        const baseAlpha = settings.opacity * 255 * baseOpacity;
        
        // SMOOTH TEXTURE: Acrylic has smooth, even finish (less texture than oil)
        const smoothTexture = Math.sin(x * 0.08) * Math.cos(y * 0.08);
        const textureFactor = 0.92 + smoothTexture * 0.16; // Subtle texture variation
        
        // SHARP EDGES: Acrylic dries quickly, creating defined edges
        let alpha = baseAlpha;
        if (normalizedDistance <= 0.85) {
          // Core area - full opaque coverage
          alpha = baseAlpha * textureFactor;
        } else {
          // Edge area - sharper falloff than watercolor
          const falloff = 1 - (normalizedDistance - 0.85) / 0.15;
          alpha = baseAlpha * falloff * textureFactor;
        }
        
        // VIBRANT COLORS: Acrylic colors are more saturated
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Enhance color saturation for vibrant acrylic look
        const saturationBoost = 1.15; // 15% more vibrant
        const avgColor = (r + g + b) / 3;
        const finalR = Math.min(255, avgColor + (r - avgColor) * saturationBoost);
        const finalG = Math.min(255, avgColor + (g - avgColor) * saturationBoost);
        const finalB = Math.min(255, avgColor + (b - avgColor) * saturationBoost);
        
        data[index] = finalR;
        data[index + 1] = finalG;
        data[index + 2] = finalB;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createGouacheBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // REALISTIC GOUACHE: Opaque like acrylic but MATTE finish, flat coverage
    // Key characteristics: 95% opacity, matte finish (no sheen), flat even coverage
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // GOUACHE: High opacity (95%) - opaque like acrylic
        const baseOpacity = 0.95;
        const baseAlpha = settings.opacity * 255 * baseOpacity;
        
        // FLAT COVERAGE: Gouache has very even, flat coverage (no texture variation)
        const flatCoverage = 0.98; // Very consistent
        
        // MATTE FINISH: No sheen/gloss (reduces brightness slightly)
        const matteFactor = 0.92; // Slight darkening for matte effect
        
        // Smooth falloff
        let alpha = baseAlpha * flatCoverage;
        if (normalizedDistance <= 0.85) {
          alpha = baseAlpha * flatCoverage;
        } else {
          const falloff = 1 - (normalizedDistance - 0.85) / 0.15;
          alpha = baseAlpha * falloff * flatCoverage;
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // MATTE EFFECT: Reduce brightness for matte finish (opposite of oil's sheen)
        const finalR = Math.min(255, r * matteFactor);
        const finalG = Math.min(255, g * matteFactor);
        const finalB = Math.min(255, b * matteFactor);
        
        data[index] = finalR;
        data[index + 1] = finalG;
        data[index + 2] = finalB;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createInkBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // REALISTIC INK: Sharp, precise, very dark, hard edges, no transparency
    // Key characteristics: 100% opacity, very sharp edges, deep dark colors, precise lines
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // INK: Full opacity (100%) - completely opaque, no transparency
        const baseOpacity = 1.0;
        const baseAlpha = settings.opacity * 255 * baseOpacity;
        
        // VERY SHARP EDGES: Ink has extremely sharp, defined edges
        let alpha = baseAlpha;
        if (normalizedDistance <= 0.9) {
          // Core area - full opacity
          alpha = baseAlpha;
        } else {
          // Edge area - very sharp falloff (much sharper than other brushes)
          const falloff = 1 - (normalizedDistance - 0.9) / 0.1;
          alpha = baseAlpha * falloff * falloff; // Squared for extra sharpness
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // DARK, RICH INK: Ink is typically very dark and rich
        // Slightly darken colors for authentic ink look
        const inkDarkness = 0.95; // Slight darkening for ink depth
        const finalR = Math.max(0, r * inkDarkness);
        const finalG = Math.max(0, g * inkDarkness);
        const finalB = Math.max(0, b * inkDarkness);
        
        data[index] = finalR;
        data[index + 1] = finalG;
        data[index + 2] = finalB;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createPencilBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Pencil with graphite texture
        const pencilGrain = Math.sin(x * 0.4) * Math.cos(y * 0.4) + Math.sin(x * 0.8) * Math.sin(y * 0.8);
        const grainFactor = 0.7 + pencilGrain * 0.3;
        const alpha = settings.opacity * 255 * grainFactor * Math.exp(-normalizedDistance * normalizedDistance * 2);
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createCharcoalBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic charcoal with rough, grainy texture and irregular coverage
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Create multiple layers of charcoal grain
        let totalAlpha = 0;
        const grainLayers = 3;
        
        for (let layer = 0; layer < grainLayers; layer++) {
          const layerScale = Math.pow(2, layer); // Different grain sizes
          const grainFreq = 0.1 * layerScale;
          
          // Create rough charcoal texture
          const grain1 = Math.sin(x * grainFreq) * Math.cos(y * grainFreq);
          const grain2 = Math.sin(x * grainFreq * 1.7) * Math.sin(y * grainFreq * 1.3);
          const grain3 = Math.sin(x * grainFreq * 2.3) * Math.cos(y * grainFreq * 0.7);
          
          const combinedGrain = (grain1 + grain2 + grain3) / 3;
          const grainIntensity = 0.6 + combinedGrain * 0.4;
          
          // Charcoal has irregular coverage - some areas are dense, others sparse
          const coverage = Math.sin(x * 0.05 + layer) * Math.cos(y * 0.05 + layer);
          const coverageVariation = 0.7 + coverage * 0.6;
          
          const layerAlpha = settings.opacity * 255 * grainIntensity * coverageVariation * 
                           Math.exp(-normalizedDistance * normalizedDistance * (1.2 + layer * 0.3));
          
          totalAlpha += layerAlpha / grainLayers;
        }
        
        // Add some random charcoal particles for realistic texture
        const particleChance = Math.random();
        if (particleChance < 0.15) { // 15% chance of charcoal particle
          const particleSize = Math.random() * 2 + 1;
          const particleIntensity = Math.random() * 0.8 + 0.2;
          
          // Check if this pixel is within a particle
          const particleX = Math.floor(x / particleSize) * particleSize;
          const particleY = Math.floor(y / particleSize) * particleSize;
          const particleDx = x - particleX - particleSize/2;
          const particleDy = y - particleY - particleSize/2;
          const particleDist = Math.sqrt(particleDx * particleDx + particleDy * particleDy);
          
          if (particleDist <= particleSize/2) {
            const particleAlpha = settings.opacity * 255 * particleIntensity * 
                                (1 - particleDist / (particleSize/2));
            totalAlpha += particleAlpha * 0.3;
          }
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, totalAlpha));
      }
    }
  };

  const createPastelBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Soft pastel with chalky texture
        const pastelChalk = Math.sin(x * 0.15) * Math.cos(y * 0.15);
        const chalkFactor = 0.75 + pastelChalk * 0.5;
        const alpha = settings.opacity * 255 * chalkFactor * Math.exp(-normalizedDistance * normalizedDistance * 0.6);
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createChalkBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic chalk with powdery, dusty texture and irregular coverage
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1.1) continue; // Allow some dust particles outside
        
        const index = (y * size + x) * 4;
        
        // Create powdery chalk texture with multiple grain sizes
        let totalAlpha = 0;
        const dustLayers = 4;
        
        for (let layer = 0; layer < dustLayers; layer++) {
          const layerScale = Math.pow(1.5, layer); // Different dust particle sizes
          const dustFreq = 0.15 * layerScale;
          
          // Create chalk dust patterns
          const dust1 = Math.sin(x * dustFreq) * Math.cos(y * dustFreq);
          const dust2 = Math.sin(x * dustFreq * 1.3) * Math.sin(y * dustFreq * 0.8);
          const dust3 = Math.sin(x * dustFreq * 0.7) * Math.cos(y * dustFreq * 1.4);
          
          const combinedDust = (dust1 + dust2 + dust3) / 3;
          const dustIntensity = 0.4 + combinedDust * 0.6;
          
          // Chalk has very irregular coverage - lots of gaps and clumps
          const coverage = Math.sin(x * 0.08 + layer) * Math.cos(y * 0.08 + layer);
          const coverageVariation = 0.3 + coverage * 0.7;
          
          const layerAlpha = settings.opacity * 255 * dustIntensity * coverageVariation * 
                           Math.exp(-normalizedDistance * normalizedDistance * (0.4 + layer * 0.2));
          
          totalAlpha += layerAlpha / dustLayers;
        }
        
        // Add random chalk dust particles
        const dustChance = Math.random();
        if (dustChance < 0.25) { // 25% chance of dust particle
          const dustSize = Math.random() * 4 + 2;
          const dustIntensity = Math.random() * 0.6 + 0.4;
          
          // Create individual dust particles
          const dustX = Math.floor(x / dustSize) * dustSize;
          const dustY = Math.floor(y / dustSize) * dustSize;
          const dustDx = x - dustX - dustSize/2;
          const dustDy = y - dustY - dustSize/2;
          const dustDist = Math.sqrt(dustDx * dustDx + dustDy * dustDy);
          
          if (dustDist <= dustSize/2) {
            const dustAlpha = settings.opacity * 255 * dustIntensity * 
                            (1 - dustDist / (dustSize/2)) * 0.8;
            totalAlpha += dustAlpha;
          }
        }
        
        // Add some chalk streaks for realistic texture
        const streakChance = Math.random();
        if (streakChance < 0.1) { // 10% chance of chalk streak
          const streakIntensity = Math.random() * 0.4 + 0.6;
          totalAlpha += settings.opacity * 255 * streakIntensity * 0.2;
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, totalAlpha));
      }
    }
  };

  const createMarkerBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic marker with smooth coverage and slight streak patterns
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Marker has smooth, even coverage with slight streak patterns
        const baseAlpha = settings.opacity * 255;
        
        // Add marker streak patterns (markers often leave streaks)
        const streakPattern = Math.sin(x * 0.12 + y * 0.08);
        const streakFactor = 0.92 + streakPattern * 0.16;
        
        // Smooth falloff
        const falloff = Math.exp(-normalizedDistance * normalizedDistance * 1.2);
        const alpha = baseAlpha * streakFactor * falloff;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createHighlighterBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic highlighter with translucent, glowing effect and smooth coverage
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Highlighter has very low base opacity (translucent)
        const baseOpacity = settings.opacity * 255 * 0.3; // 30% of normal opacity
        
        // Create smooth, even coverage with slight glow variation
        const glowVariation = Math.sin(x * 0.08) * Math.cos(y * 0.08);
        const glowFactor = 0.9 + glowVariation * 0.2;
        
        // Highlighter has very soft, even falloff
        const alpha = baseOpacity * glowFactor * Math.exp(-normalizedDistance * normalizedDistance * 0.5);
        
        // Add some subtle streaks for realistic highlighter texture
        const streakPattern = Math.sin(x * 0.15 + y * 0.1);
        const streakFactor = 1 + streakPattern * 0.1;
        
        const finalAlpha = alpha * streakFactor;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, finalAlpha));
      }
    }
  };

  const createCalligraphyBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic calligraphy brush with angled tip and ink flow variation
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const angleRad = (settings.angle * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const rotatedDx = dx * cos - dy * sin;
        const rotatedDy = dx * sin + dy * cos;
        
        // Elliptical shape (wider perpendicular to angle)
        const ellipseDist = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy * 2.5) / radius;
        
        if (ellipseDist > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Calligraphy brush has variable ink flow based on angle and pressure
        const baseAlpha = settings.opacity * 255;
        
        // Ink flow variation (more ink at center, less at edges)
        const flowVariation = Math.sin(rotatedDx * 0.1) * Math.cos(rotatedDy * 0.1);
        const flowFactor = 0.85 + flowVariation * 0.3;
        
        // Smooth falloff
        const falloff = Math.exp(-ellipseDist * ellipseDist * 1.5);
        const alpha = baseAlpha * flowFactor * falloff;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createStencilBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic stencil effect with hard edges and cutout pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        const maxDist = Math.max(dx, dy);
        const normalizedDistance = maxDist / radius;
        
        if (normalizedDistance > 0.95) continue;
        
        const index = (y * size + x) * 4;
        
        // Stencil has hard edges with slight bleed effect
        let alpha = settings.opacity * 255;
        
        // Create stencil cutout pattern (grid-like openings)
        const gridSize = Math.max(4, Math.floor(radius / 4));
        const gridX = Math.floor((x - centerX + radius) / gridSize);
        const gridY = Math.floor((y - centerY + radius) / gridSize);
        
        // Create alternating pattern for stencil effect
        const isCutout = (gridX + gridY) % 2 === 0;
        if (isCutout && normalizedDistance < 0.8) {
          // Cutout area - no paint
          alpha = 0;
        } else {
          // Stencil area - full opacity with hard edges
          if (normalizedDistance > 0.85) {
            // Edge area - slight bleed
            const edgeFalloff = (0.95 - normalizedDistance) / 0.1;
            alpha *= edgeFalloff;
          }
        }
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createStampBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic stamp effect with even coverage and slight texture variation
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 0.9) continue;
        
        const index = (y * size + x) * 4;
        
        // Stamp has even coverage with slight texture for realism
        const textureVariation = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const textureFactor = 0.95 + textureVariation * 0.1;
        
        // Hard edges with slight softness at very edge
        let alpha = settings.opacity * 255;
        if (normalizedDistance > 0.85) {
          // Very edge - slight falloff
          const edgeFalloff = (0.9 - normalizedDistance) / 0.05;
          alpha *= edgeFalloff;
        }
        alpha *= textureFactor;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  const createBlurBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic blur effect with very soft, diffused edges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1.5) continue; // Extended blur area
        
        const index = (y * size + x) * 4;
        
        // Blur has very soft, gradual falloff
        let alpha = 0;
        
        if (normalizedDistance <= 0.5) {
          // Core area - moderate opacity
          alpha = settings.opacity * 255 * 0.8;
        } else if (normalizedDistance <= 1.0) {
          // Transition area - gradual falloff
          const falloff = 1 - (normalizedDistance - 0.5) / 0.5;
          alpha = settings.opacity * 255 * 0.8 * falloff;
        } else {
          // Extended blur area - very soft diffusion
          const blurDistance = normalizedDistance - 1.0;
          alpha = settings.opacity * 255 * 0.3 * Math.exp(-blurDistance * 2);
        }
        
        // Add some subtle variation for realistic blur texture
        const blurVariation = Math.sin(x * 0.05) * Math.cos(y * 0.05);
        const variationFactor = 0.95 + blurVariation * 0.1;
        
        const finalAlpha = alpha * variationFactor;
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, finalAlpha));
      }
    }
  };

  const createSmudgeBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Smudge with directional texture
        const smudgeDirection = Math.sin(x * 0.2 + y * 0.1) * Math.cos(x * 0.1 - y * 0.2);
        const directionFactor = 0.8 + smudgeDirection * 0.4;
        const alpha = settings.opacity * 255 * directionFactor * Math.exp(-normalizedDistance * normalizedDistance * 0.7);
        
        // Get color (solid or gradient)
        const color = getColorAtPosition(settings, x, y, centerX, centerY, radius);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  };

  /**
   * Render a complete brush stroke
   */
  const renderBrushStroke = useCallback((points: BrushPoint[], settings: BrushSettings, targetCtx?: CanvasRenderingContext2D) => {
    if (points.length === 0) return;

    const ctx = targetCtx || initializeEngine().ctx;

    // Save context state
    ctx.save();

    // Set blend mode
    ctx.globalCompositeOperation = settings.blendMode;

    // Get randomization amount (0-100%)
    const randomization = settings.customBrushRandomization !== undefined ? settings.customBrushRandomization : 0;

    // Process each point in the stroke
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      // Override pressure dynamics for custom brushes if specified
      const customPressureSettings = settings.customBrushImage ? {
        sizePressure: settings.customBrushPressureSize !== undefined ? settings.customBrushPressureSize : settings.dynamics.sizePressure,
        opacityPressure: settings.customBrushPressureOpacity !== undefined ? settings.customBrushPressureOpacity : settings.dynamics.opacityPressure,
        anglePressure: settings.dynamics.anglePressure,
        spacingPressure: settings.dynamics.spacingPressure,
        velocitySize: settings.dynamics.velocitySize,
        velocityOpacity: settings.dynamics.velocityOpacity
      } : settings.dynamics;
      
      const dynamics = calculateBrushDynamics(point, {
        ...settings,
        dynamics: customPressureSettings
      }, i);

      // Apply randomization if enabled (only for custom brushes)
      let finalRotation = dynamics.angle;
      let finalSize = dynamics.size;
      
      if (randomization > 0 && settings.customBrushImage) {
        // Random rotation variation: ±(randomization% of 360°)
        const rotationVariation = (randomization / 100) * 360;
        const randomRotation = (Math.random() * 2 - 1) * rotationVariation; // -variation to +variation
        finalRotation = dynamics.angle + randomRotation;

        // Random scale variation: ±(randomization% of scale)
        const scaleVariation = (randomization / 100);
        const randomScale = 1 + (Math.random() * 2 - 1) * scaleVariation; // 1±variation
        finalSize = dynamics.size * randomScale;
      }

      // Create or get brush stamp (without randomization in cache key)
      const brushStamp = createBrushStamp({
        ...settings,
        size: finalSize,
        opacity: dynamics.opacity,
        angle: finalRotation
      });

      // Position and draw the stamp
      ctx.save();
      ctx.translate(point.x, point.y);
      
      // Apply rotation if needed
      if (finalRotation !== 0) {
        ctx.rotate((finalRotation * Math.PI) / 180);
      }
      
      // Apply scale if randomized
      if (randomization > 0 && settings.customBrushImage && finalSize !== dynamics.size) {
        const scaleFactor = finalSize / dynamics.size;
        ctx.scale(scaleFactor, scaleFactor);
      }
      
      ctx.drawImage(brushStamp, -brushStamp.width / 2, -brushStamp.height / 2);
      ctx.restore();
    }

    // Restore context state
    ctx.restore();
    
    // Update performance metrics
    updatePerformanceMetrics();
  }, [initializeEngine, calculateBrushDynamics, createBrushStamp, updatePerformanceMetrics]);

  // Preset management functions
  const getPresets = useCallback((): BrushPreset[] => {
    initializePresets();
    return Array.from(presetsRef.current.values());
  }, [initializePresets]);

  const getPreset = useCallback((id: string): BrushPreset | null => {
    initializePresets();
    return presetsRef.current.get(id) || null;
  }, [initializePresets]);

  const addPreset = useCallback((preset: BrushPreset): void => {
    presetsRef.current.set(preset.id, { ...preset, modifiedAt: Date.now() });
  }, []);

  const updatePreset = useCallback((id: string, updates: Partial<BrushPreset>): BrushPreset | null => {
    const preset = presetsRef.current.get(id);
    if (!preset) return null;

    const updatedPreset = {
      ...preset,
      ...updates,
      modifiedAt: Date.now()
    };

    presetsRef.current.set(id, updatedPreset);
    return updatedPreset;
  }, []);

  const deletePreset = useCallback((id: string): boolean => {
    return presetsRef.current.delete(id);
  }, []);

  // Performance functions
  const getPerformanceMetrics = useCallback(() => {
    const state = initializeEngine();
    return { ...state.performanceMetrics };
  }, [initializeEngine]);

  // Performance monitoring and optimization
  const startPerformanceMonitoring = useCallback(() => {
    const state = initializeEngine();
    
    // Start performance monitoring loop
    const monitorPerformance = () => {
      updatePerformanceMetrics();
      
      // Schedule next monitoring cycle
      if (state.performanceMetrics.fps > 0) {
        setTimeout(monitorPerformance, 1000); // Monitor every second
      }
    };
    
    monitorPerformance();
  }, [initializeEngine, updatePerformanceMetrics]);

  const stopPerformanceMonitoring = useCallback(() => {
    // Performance monitoring will stop automatically when FPS drops to 0
    // This is handled by the monitoring loop itself
  }, []);

  const getPerformanceReport = useCallback(() => {
    const state = initializeEngine();
    const metrics = state.performanceMetrics;
    
    return {
      fps: metrics.fps,
      frameTime: metrics.frameTime,
      memoryUsage: metrics.memoryUsage,
      cacheSize: state.brushCache.size + state.strokeCache.size,
      brushCacheSize: state.brushCache.size,
      strokeCacheSize: state.strokeCache.size,
      lastUpdate: metrics.lastUpdate,
      performanceLevel: metrics.fps >= 60 ? 'excellent' : 
                       metrics.fps >= 45 ? 'good' : 
                       metrics.fps >= 30 ? 'fair' : 'poor'
    };
  }, [initializeEngine]);

  // 3D Integration functions
  const screenToUV = useCallback((x: number, y: number, camera: THREE.Camera, scene: THREE.Scene): { uv: THREE.Vector2; mesh: THREE.Mesh } | null => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const mesh = intersect.object as THREE.Mesh;
      const uv = intersect.uv;

      if (uv && mesh) {
        return { uv, mesh };
      }
    }

    return null;
  }, []);

  const renderBrushToUV = useCallback((point: BrushPoint, settings: BrushSettings, uvCanvas: HTMLCanvasElement) => {
    try {
      // Validate inputs
      if (!point) {
        console.warn('⚠️ renderBrushToUV: Invalid brush point');
        return;
      }
      
      if (!settings) {
        console.warn('⚠️ renderBrushToUV: Invalid brush settings');
        return;
      }
      
      if (!uvCanvas) {
        console.warn('⚠️ renderBrushToUV: Invalid UV canvas');
        return;
      }

      if (!point.uv) {
        console.warn('⚠️ renderBrushToUV: No UV coordinates in brush point');
        return;
      }

      // Validate canvas context
      const ctx = uvCanvas.getContext('2d');
      if (!ctx) {
        console.error('❌ renderBrushToUV: Failed to get 2D context from UV canvas');
        return;
      }

      // Performance optimization: Skip rendering if brush size is too small
      if (settings.size < 0.5) {
        return; // Skip very small brushes for performance
      }

      // Create brush stamp with error handling
      const brushStamp = createBrushStamp(settings);
      if (!brushStamp) {
        console.error('❌ renderBrushToUV: Failed to create brush stamp');
        return;
      }
      
      // CRITICAL FIX: Use the already-converted canvas coordinates directly
      // Brush3DIntegrationNew now properly converts UV to canvas coordinates before calling this function
      const canvasX = point.x;
      const canvasY = point.y;

      // Validate coordinates
      if (typeof canvasX !== 'number' || typeof canvasY !== 'number' || 
          !isFinite(canvasX) || !isFinite(canvasY)) {
        console.warn('⚠️ renderBrushToUV: Invalid canvas coordinates:', { canvasX, canvasY });
        return;
      }

      // Performance optimization: Batch canvas operations
      ctx.save();
      
      // FIX: Apply blend mode with fallback (critical for blend modes to work)
      ctx.globalCompositeOperation = settings.blendMode || 'source-over';
      
      // FIX: Apply opacity (flow should control how much paint is applied per stamp, not opacity)
      const pressureMultiplier = point.pressure || 1;
      // Flow should not reduce opacity, it controls paint buildup - remove flow multiplier from opacity
      ctx.globalAlpha = (settings.opacity || 1) * pressureMultiplier;
      
      // Performance optimization: Use integer coordinates for better performance
      const drawX = Math.round(canvasX - brushStamp.width / 2);
      const drawY = Math.round(canvasY - brushStamp.height / 2);
      
      ctx.drawImage(brushStamp, drawX, drawY);
      
      ctx.restore();
      
      // Update performance metrics
      updatePerformanceMetrics();
    } catch (error) {
      console.error('❌ renderBrushToUV Error:', error);
      console.warn('⚠️ Brush rendering failed, skipping this stroke');
    }
  }, [createBrushStamp, updatePerformanceMetrics]);

  // Layer integration function - FIXED: Proper dependency injection
  const addBrushStrokeToLayer = useCallback((layerId: string, stroke: { points: BrushPoint[]; settings: BrushSettings }) => {
    try {
      // Validate inputs
      if (!layerId || typeof layerId !== 'string') {
        console.warn('⚠️ addBrushStrokeToLayer: Invalid layer ID:', layerId);
        return;
      }
      
      if (!stroke || !stroke.points || !Array.isArray(stroke.points)) {
        console.warn('⚠️ addBrushStrokeToLayer: Invalid stroke data:', stroke);
        return;
      }
      
      if (!stroke.settings) {
        console.warn('⚠️ addBrushStrokeToLayer: Invalid stroke settings');
        return;
      }

      const strokeData = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        points: stroke.points,
        settings: stroke.settings,
        timestamp: Date.now(),
        layerId
      };
      
      // Store in stroke cache
      const state = initializeEngine();
      state.strokeCache.set(strokeData.id, strokeData.points);
      
      // CRITICAL FIX: Properly integrate with layer system using Zustand store
      try {
        // Access the layer store directly
        // Since we're in a useCallback, we can access it dynamically
        const layerStore = (window as any).__layerStore;
        
        if (layerStore && layerStore.layers) {
          // Convert BrushPoint[] to simple {x, y}[] for layer storage
          const simplePoints = stroke.points.map(point => ({ x: point.x, y: point.y }));
          
          // Create layer-compatible brush stroke
          const layerStroke = {
            id: strokeData.id,
            layerId: layerId,
            points: simplePoints,
            color: stroke.settings.color,
            size: stroke.settings.size,
            opacity: stroke.settings.opacity,
            timestamp: strokeData.timestamp,
            gradient: stroke.settings.gradient
          };
          
          // Add brush stroke to the layer
          const layer = layerStore.layers.find((l: any) => l.id === layerId);
          if (layer && layer.content) {
            if (!layer.content.brushStrokes) {
              layer.content.brushStrokes = [];
            }
            layer.content.brushStrokes.push(layerStroke);
            
            // Force layer composition to update the composed canvas
            if (layerStore.composeLayers) {
              layerStore.composeLayers();
            }
          }
        }
      } catch (layerError) {
        console.warn('⚠️ Failed to add brush stroke to layer system:', layerError);
        // Continue execution - stroke is still cached for performance
      }
    } catch (error) {
      console.error('❌ addBrushStrokeToLayer Error:', error);
      console.warn('⚠️ Failed to add brush stroke to layer');
    }
  }, [initializeEngine]);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    if (stateRef.current) {
      stateRef.current.brushCache.clear();
      stateRef.current.strokeCache.clear();
    }
  }, []);

  /**
   * Dispose of resources
   */
  const dispose = useCallback(() => {
    clearCache();
    stateRef.current = null;
  }, [clearCache]);

  /**
   * Create a puff stamp for puff tool rendering
   */
  const createPuffStamp = useCallback((puffSettings: PuffSettings): HTMLCanvasElement => {
    const size = Math.max(32, puffSettings.brushSize);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;
    
    // Create puff effect with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    
    // Parse color
    const r = parseInt(puffSettings.color.slice(1, 3), 16) || 255;
    const g = parseInt(puffSettings.color.slice(3, 5), 16) || 0;
    const b = parseInt(puffSettings.color.slice(5, 7), 16) || 255;
    
    // Create puff gradient with softness
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${puffSettings.opacity})`);
    gradient.addColorStop(puffSettings.softness, `rgba(${r}, ${g}, ${b}, ${puffSettings.opacity * 0.6})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
  }, []);

  /**
   * Render a puff stroke
   */
  const renderPuffStroke = useCallback((points: BrushPoint[], puffSettings: PuffSettings, targetCtx?: CanvasRenderingContext2D) => {
    if (points.length === 0) return;

    const ctx = targetCtx || initializeEngine().ctx;

    // Save context state
    ctx.save();

    // Set blend mode for puff effect
    ctx.globalCompositeOperation = 'source-over';

    // Process each point in the stroke
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      // Create puff stamp
      const puffStamp = createPuffStamp(puffSettings);
      
      // Draw the puff stamp centered at the point
      ctx.drawImage(puffStamp, point.x - puffStamp.width / 2, point.y - puffStamp.height / 2);
    }

    // Restore context state
    ctx.restore();
    
    // Update performance metrics
    updatePerformanceMetrics();
  }, [initializeEngine, createPuffStamp, updatePerformanceMetrics]);

  // Initialize presets on first use
  useEffect(() => {
    initializePresets();
  }, [initializePresets]);

  // Return the comprehensive API
  const brushEngineAPI = useMemo(() => ({
    // Core rendering
    renderBrushStroke,
    createBrushStamp,
    calculateBrushDynamics,
    
    // Preset management
    getPresets,
    getPreset,
    addPreset,
    updatePreset,
    deletePreset,
    
    // Performance
    getBrushCacheKey,
    clearCache,
    getPerformanceMetrics,
    getPerformanceReport,
    optimizeForPerformance,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    
    // 3D Integration
    renderBrushToUV,
    screenToUV,
    
    // Layer integration
    addBrushStrokeToLayer,
    
    // Puff tool support
    renderPuffStroke,
    createPuffStamp,
    
    // Vector tool support
    getVectorTools: () => {
      const toolSet = vectorToolSetRef.current;
      if (!toolSet) return [];
      return toolSet.getAllTools();
    },
    
    getVectorTool: (id: string) => {
      const toolSet = vectorToolSetRef.current;
      if (!toolSet) return null;
      return toolSet.getTool(id) || null;
    },
    
    setActiveVectorTool: (toolId: string) => {
      const toolSet = vectorToolSetRef.current;
      if (!toolSet) return false;
      
      try {
        const tool = toolSet.getTool(toolId);
        if (!tool) return false;
        
        vectorStateRef.current.activeTool = toolId;
        return true;
      } catch (error) {
        console.error('❌ Failed to set active vector tool:', error);
        return false;
      }
    },
    
    getActiveVectorTool: () => {
      const toolSet = vectorToolSetRef.current;
      if (!toolSet || !vectorStateRef.current.activeTool) return null;
      return toolSet.getTool(vectorStateRef.current.activeTool) || null;
    },
    
    createVectorPath: (toolId: string, startPoint: VectorPoint) => {
      const tool = vectorToolSetRef.current?.getTool(toolId);
      if (!tool) {
        throw new Error(`Vector tool '${toolId}' not found`);
      }
      
      const path: VectorPath = {
        id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        points: [startPoint],
        closed: false,
        tool: toolId,
        settings: { ...tool.config },
        createdAt: Date.now(),
        modifiedAt: Date.now()
      };
      
      vectorStateRef.current.currentPath = path;
      vectorStateRef.current.isDrawing = true;
      
      return path;
    },
    
    addPointToVectorPath: (pathId: string, point: VectorPoint) => {
      const currentPath = vectorStateRef.current.currentPath;
      if (!currentPath || currentPath.id !== pathId) {
        return false;
      }
      
      currentPath.points.push(point);
      currentPath.modifiedAt = Date.now();
      
      return true;
    },
    
    closeVectorPath: (pathId: string) => {
      const currentPath = vectorStateRef.current.currentPath;
      if (!currentPath || currentPath.id !== pathId) {
        return false;
      }
      
      currentPath.closed = true;
      currentPath.modifiedAt = Date.now();
      
      // Move to completed paths
      vectorStateRef.current.paths.push(currentPath);
      vectorStateRef.current.currentPath = null;
      vectorStateRef.current.isDrawing = false;
      
      return true;
    },
    
    renderVectorPath: (path: VectorPath, targetCtx: CanvasRenderingContext2D) => {
      if (!path.points.length) return;
      
      // CRITICAL FIX: Check if settings exist before accessing
      if (!path.settings) {
        console.warn('⚠️ renderVectorPath: Path has no settings, using defaults');
        // Fallback: Draw simple path without brush engine
        targetCtx.save();
        targetCtx.strokeStyle = '#000000';
        targetCtx.lineWidth = 2;
        targetCtx.globalAlpha = 1.0;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        targetCtx.beginPath();
        path.points.forEach((point, index) => {
          if (index === 0) {
            targetCtx.moveTo(point.x, point.y);
          } else {
            targetCtx.lineTo(point.x, point.y);
          }
        });
        if (path.closed) {
          targetCtx.closePath();
        }
        targetCtx.stroke();
        targetCtx.restore();
        return;
      }
      
      // CRITICAL FIX: Handle case where tool is not found or tool set is not available
      // If tool set is not available or tool is not found, fall back to simple rendering
      const tool = vectorToolSetRef.current?.getTool(path.tool);
      if (!tool) {
        console.warn(`⚠️ renderVectorPath: Tool "${path.tool}" not found in tool set, using fallback rendering`);
        // Fallback: Draw simple path without brush engine
        targetCtx.save();
        targetCtx.strokeStyle = path.settings.color || '#000000';
        targetCtx.lineWidth = path.settings.size || 2;
        targetCtx.globalAlpha = path.settings.opacity || 1.0;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        targetCtx.beginPath();
        path.points.forEach((point, index) => {
          const px = point.x ?? (point.u * (targetCtx.canvas.width || 2048));
          const py = point.y ?? (point.v * (targetCtx.canvas.height || 2048));
          if (index === 0) {
            targetCtx.moveTo(px, py);
          } else {
            targetCtx.lineTo(px, py);
          }
        });
        if (path.closed) {
          targetCtx.closePath();
        }
        targetCtx.stroke();
        targetCtx.restore();
        return;
      }
      
      targetCtx.save();
      
      // Apply tool settings
      targetCtx.strokeStyle = path.settings.color || '#000000';
      targetCtx.lineWidth = path.settings.size || 2;
      targetCtx.globalAlpha = path.settings.opacity || 1.0;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';
      
      // FIXED: Use brush engine for textured strokes along the path
      // If this is a brush tool path, render using brush stamps instead of simple lines
      if (path.tool === 'brush' || path.tool === 'watercolor' || path.tool === 'pencil' || path.tool === 'marker') {
        // Create brush settings from path settings
        const brushSettings: BrushSettings = {
          size: path.settings.size || 10,
          opacity: path.settings.opacity || 1.0,
          hardness: path.settings.hardness || 0.5,
          flow: path.settings.flow || 0.8,
          spacing: 0.3,
          angle: 0,
          roundness: 1,
          color: path.settings.color || '#000000',
          // CRITICAL FIX: Preserve gradient from path settings
          gradient: path.settings.gradient || undefined,
          blendMode: 'source-over' as any,
          shape: 'round',
          dynamics: {
            sizePressure: false,
            opacityPressure: false,
            anglePressure: false,
            spacingPressure: false,
            velocitySize: false,
            velocityOpacity: false
          },
          texture: {
            enabled: false,
            pattern: null,
            scale: 1,
            rotation: 0,
            opacity: 1,
            blendMode: 'multiply'
          }
        };
        
        // Render brush strokes along the path
        // CRITICAL FIX: Sample points along the path to create continuous stroke
        const brushStamps = createBrushStamp(brushSettings);
        const spacing = brushSettings.spacing || 0.3;
        const minSpacing = brushSettings.size * spacing;
        
        // Sample points between path anchors for continuous stroke
        for (let i = 0; i < path.points.length; i++) {
          const currentPoint = path.points[i];
          const nextPoint = path.points[i + 1];
          
          // Extract x, y coordinates (handle both canvas and UV formats)
          const currX = currentPoint.x ?? (currentPoint.u * (targetCtx.canvas.width || 2048));
          const currY = currentPoint.y ?? (currentPoint.v * (targetCtx.canvas.height || 2048));
          
          // Draw stamp at current point
          targetCtx.drawImage(
            brushStamps,
            currX - brushStamps.width / 2,
            currY - brushStamps.height / 2
          );
          
          // Draw stamps between current and next point if they're far apart
          if (nextPoint) {
            const nextX = nextPoint.x ?? (nextPoint.u * (targetCtx.canvas.width || 2048));
            const nextY = nextPoint.y ?? (nextPoint.v * (targetCtx.canvas.height || 2048));
            
            const dx = nextX - currX;
            const dy = nextY - currY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > minSpacing) {
              const steps = Math.ceil(distance / minSpacing);
              for (let j = 1; j < steps; j++) {
                const t = j / steps;
                const x = currX + t * dx;
                const y = currY + t * dy;
                
                targetCtx.drawImage(
                  brushStamps,
                  x - brushStamps.width / 2,
                  y - brushStamps.height / 2
                );
              }
            }
          }
        }
      } else {
        // For non-brush paths, draw as connected line
        targetCtx.beginPath();
        path.points.forEach((point, index) => {
          // Extract x, y coordinates (handle both canvas and UV formats)
          const px = point.x ?? (point.u * (targetCtx.canvas.width || 2048));
          const py = point.y ?? (point.v * (targetCtx.canvas.height || 2048));
          
          if (index === 0) {
            targetCtx.moveTo(px, py);
          } else {
            targetCtx.lineTo(px, py);
          }
        });
        
        if (path.closed) {
          targetCtx.closePath();
        }
        
        targetCtx.stroke();
      }
      
      targetCtx.restore();
    },
    
    renderAllVectorPaths: (paths: VectorPath[], targetCtx: CanvasRenderingContext2D) => {
      paths.forEach(path => {
        if (!path.points.length) return;
        
        // CRITICAL FIX: Check if settings exist before accessing
        if (!path.settings) {
          console.warn('⚠️ renderAllVectorPaths: Path has no settings, skipping');
          return;
        }
        
        const tool = vectorToolSetRef.current?.getTool(path.tool);
        if (!tool) return;
        
        targetCtx.save();
        
        // FIXED: Use the same improved rendering logic as renderVectorPath
        // Apply tool settings
        targetCtx.strokeStyle = path.settings.color || '#000000';
        targetCtx.lineWidth = path.settings.size || 2;
        targetCtx.globalAlpha = path.settings.opacity || 1.0;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        
        // If this is a brush tool path, render using brush stamps
        if (path.tool === 'brush' || path.tool === 'watercolor' || path.tool === 'pencil' || path.tool === 'marker') {
          const brushSettings: BrushSettings = {
            size: path.settings.size || 10,
            opacity: path.settings.opacity || 1.0,
            hardness: path.settings.hardness || 0.5,
            flow: path.settings.flow || 0.8,
            spacing: 0.3,
            angle: 0,
            roundness: 1,
            color: path.settings.color || '#000000',
            // CRITICAL FIX: Preserve gradient from path settings for renderAllVectorPaths
            gradient: path.settings.gradient || undefined,
            blendMode: 'source-over' as any,
            shape: 'round',
            dynamics: {
              sizePressure: false,
              opacityPressure: false,
              anglePressure: false,
              spacingPressure: false,
              velocitySize: false,
              velocityOpacity: false
            },
            texture: {
              enabled: false,
              pattern: null,
              scale: 1,
              rotation: 0,
              opacity: 1,
              blendMode: 'multiply'
            }
          };
          
          const brushStamps = createBrushStamp(brushSettings);
          const spacing = brushSettings.spacing || 0.3;
          const minSpacing = brushSettings.size * spacing;
          
          // CRITICAL FIX: Sample points along the path to create continuous stroke
          // Sample points between path anchors for continuous stroke
          for (let i = 0; i < path.points.length; i++) {
            const currentPoint = path.points[i];
            const nextPoint = path.points[i + 1];
            
            // Extract x, y coordinates (handle both canvas and UV formats)
            const currX = currentPoint.x ?? (currentPoint.u * (targetCtx.canvas.width || 2048));
            const currY = currentPoint.y ?? (currentPoint.v * (targetCtx.canvas.height || 2048));
            
            // Draw stamp at current point
            targetCtx.drawImage(
              brushStamps,
              currX - brushStamps.width / 2,
              currY - brushStamps.height / 2
            );
            
            // Draw stamps between current and next point if they're far apart
            if (nextPoint) {
              const nextX = nextPoint.x ?? (nextPoint.u * (targetCtx.canvas.width || 2048));
              const nextY = nextPoint.y ?? (nextPoint.v * (targetCtx.canvas.height || 2048));
              
              const dx = nextX - currX;
              const dy = nextY - currY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > minSpacing) {
                const steps = Math.ceil(distance / minSpacing);
                for (let j = 1; j < steps; j++) {
                  const t = j / steps;
                  const x = currX + t * dx;
                  const y = currY + t * dy;
                  
                  targetCtx.drawImage(
                    brushStamps,
                    x - brushStamps.width / 2,
                    y - brushStamps.height / 2
                  );
                }
              }
            }
          }
        } else {
          // Draw the path
          targetCtx.beginPath();
          path.points.forEach((point, index) => {
            // Extract x, y coordinates (handle both canvas and UV formats)
            const px = point.x ?? (point.u * (targetCtx.canvas.width || 2048));
            const py = point.y ?? (point.v * (targetCtx.canvas.height || 2048));
            
            if (index === 0) {
              targetCtx.moveTo(px, py);
            } else {
              targetCtx.lineTo(px, py);
            }
          });
          
          if (path.closed) {
            targetCtx.closePath();
          }
          
          targetCtx.stroke();
        }
        
        targetCtx.restore();
      });
    },
    
    getVectorToolState: () => ({ ...vectorStateRef.current }),
    
    updateVectorToolState: (updates: Partial<VectorToolState>) => {
      vectorStateRef.current = { ...vectorStateRef.current, ...updates };
    },
    
    // Cleanup
    dispose
  }), [
    renderBrushStroke,
    createBrushStamp,
    calculateBrushDynamics,
    getPresets,
    getPreset,
    addPreset,
    updatePreset,
    deletePreset,
    getBrushCacheKey,
    clearCache,
    getPerformanceMetrics,
    getPerformanceReport,
    optimizeForPerformance,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    renderBrushToUV,
    screenToUV,
    addBrushStrokeToLayer,
    renderPuffStroke,
    createPuffStamp,
    dispose
  ]);

  // Expose brush engine globally for use in other components
  useEffect(() => {
    (window as any).__brushEngine = brushEngineAPI;
    // Brush engine exposed globally for debugging
    return () => {
      delete (window as any).__brushEngine;
      // Brush engine removed from global scope
    };
  }, [brushEngineAPI]);

  return brushEngineAPI;
}

// Export types for use in other components
export type { BrushPreset, BrushEngineAPI, PuffSettings };