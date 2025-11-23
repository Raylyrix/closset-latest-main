import { useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { BrushPoint, BrushSettings, UVCoordinate } from '../types/app';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';
import { CANVAS_CONFIG } from '../constants/CanvasSizes';
import { ProfessionalToolSet, ToolDefinition, ToolConfig } from '../vector/ProfessionalToolSet';

// Enhanced interfaces for the unified brush system
interface BrushEngineState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  brushCache: Map<string, HTMLCanvasElement>;
  strokeCache: Map<string, BrushPoint[]>;
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

    // Ensure reasonable bounds
    size = Math.max(0.5, Math.min(size, 500));
    opacity = Math.max(0, Math.min(opacity, 1));
    spacing = Math.max(0.01, Math.min(spacing, 1));

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
    return `${settings.size}-${settings.opacity}-${settings.hardness}-${settings.flow}-${settings.spacing}-${settings.color}-${settings.blendMode}-${settings.shape}-${settings.angle}-${gradientKey}-${JSON.stringify(settings.texture)}`;
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

      // Create brush-specific stamp based on shape
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
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Add canvas-like grain
        const textureNoise = Math.sin(x * 0.2) * Math.cos(y * 0.2) + Math.sin(x * 0.5) * Math.sin(y * 0.5);
        const textureFactor = 0.8 + textureNoise * 0.4;
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
    // Create realistic watercolor with water flow and bleeding effects
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1.2) continue; // Allow some bleeding outside
        
        const index = (y * size + x) * 4;
        
        // Create water flow patterns
        const flowX = Math.sin(x * 0.05) * Math.cos(y * 0.03);
        const flowY = Math.cos(x * 0.03) * Math.sin(y * 0.05);
        const flowMagnitude = Math.sqrt(flowX * flowX + flowY * flowY);
        
        // Create bleeding effect - color spreads more in certain directions
        const bleedingFactor = 1 + flowMagnitude * 0.4;
        const waterSaturation = Math.sin(x * 0.08) * Math.cos(y * 0.08) + 
                               Math.sin(x * 0.15) * Math.sin(y * 0.15);
        
        // Watercolor has variable opacity based on water content
        const waterContent = 0.6 + waterSaturation * 0.4;
        const baseAlpha = settings.opacity * 255 * waterContent;
        
        // Create soft, organic falloff with bleeding
        let alpha = baseAlpha;
        if (normalizedDistance <= 0.8) {
          // Core area - full opacity
          alpha = baseAlpha;
        } else if (normalizedDistance <= 1.0) {
          // Transition area - gradual falloff
          const falloff = 1 - (normalizedDistance - 0.8) / 0.2;
          alpha = baseAlpha * falloff;
        } else {
          // Bleeding area - very soft, directional
          const bleedDistance = normalizedDistance - 1.0;
          const bleedAlpha = baseAlpha * 0.3 * bleedingFactor * Math.exp(-bleedDistance * 5);
          alpha = bleedAlpha;
        }
        
        // Add some paper texture variation
        const paperTexture = Math.sin(x * 0.2) * Math.cos(y * 0.2);
        const textureVariation = 0.9 + paperTexture * 0.2;
        alpha *= textureVariation;
        
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

  const createOilBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    // Create realistic oil paint with thick, rich texture and brush stroke patterns
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        
        // Create brush stroke patterns (oil paint shows brush marks)
        const strokeAngle = Math.atan2(dy, dx);
        const strokePattern = Math.sin(strokeAngle * 8 + x * 0.1 + y * 0.1);
        const strokeVariation = 0.85 + strokePattern * 0.3;
        
        // Create thick paint texture with impasto effect
        const paintThickness = Math.sin(x * 0.03) * Math.cos(y * 0.03) + 
                              Math.sin(x * 0.07) * Math.sin(y * 0.07);
        const thicknessVariation = 0.8 + paintThickness * 0.4;
        
        // Oil paint has rich, opaque coverage with some texture variation
        const baseOpacity = settings.opacity * 255 * thicknessVariation * strokeVariation;
        
        // Create smooth falloff with slight texture
        let alpha = baseOpacity;
        if (normalizedDistance <= 0.7) {
          // Core area - full rich coverage
          alpha = baseOpacity;
        } else {
          // Edge area - gradual falloff with paint texture
          const falloff = 1 - (normalizedDistance - 0.7) / 0.3;
          const edgeTexture = Math.sin(x * 0.1) * Math.cos(y * 0.1);
          const textureFactor = 0.9 + edgeTexture * 0.2;
          alpha = baseOpacity * falloff * textureFactor;
        }
        
        // Add some random paint globules for realistic texture
        const globuleChance = Math.random();
        if (globuleChance < 0.05) { // 5% chance of paint globule
          const globuleIntensity = Math.random() * 0.3 + 0.7;
          alpha += settings.opacity * 255 * globuleIntensity * 0.2;
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

  const createAcrylicBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Quick-drying acrylic with slight texture
        const acrylicTexture = Math.sin(x * 0.12) * Math.cos(y * 0.12);
        const textureFactor = 0.85 + acrylicTexture * 0.3;
        const alpha = settings.opacity * 255 * textureFactor * Math.exp(-normalizedDistance * normalizedDistance * 0.9);
        
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

  const createGouacheBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Matte gouache with flat coverage
        const alpha = settings.opacity * 255 * Math.exp(-normalizedDistance * normalizedDistance * 0.7);
        
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

  const createInkBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Sharp, precise ink brush
        const alpha = settings.opacity * 255 * Math.exp(-normalizedDistance * normalizedDistance * 3);
        
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
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 1) continue;
        
        const index = (y * size + x) * 4;
        // Marker with smooth, even coverage
        const alpha = settings.opacity * 255 * Math.exp(-normalizedDistance * normalizedDistance * 1.2);
        
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
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const angleRad = (settings.angle * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const rotatedDx = dx * cos - dy * sin;
        const rotatedDy = dx * sin + dy * cos;
        const ellipseDist = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy * 2) / radius;
        
        if (ellipseDist > 1) continue;
        
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

  const createStencilBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        const maxDist = Math.max(dx, dy);
        const normalizedDistance = maxDist / radius;
        
        if (normalizedDistance > 0.95) continue;
        
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

  const createStampBrush = (data: Uint8ClampedArray, size: number, centerX: number, centerY: number, radius: number, settings: BrushSettings) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / radius;
        
        if (normalizedDistance > 0.9) continue;
        
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

    // Process each point in the stroke
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const dynamics = calculateBrushDynamics(point, settings, i);

      // Create or get brush stamp
      const brushStamp = createBrushStamp({
        ...settings,
        size: dynamics.size,
        opacity: dynamics.opacity,
        angle: dynamics.angle
      });

      // Position and draw the stamp
      if (dynamics.angle !== 0) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate((dynamics.angle * Math.PI) / 180);
        ctx.drawImage(brushStamp, -brushStamp.width / 2, -brushStamp.height / 2);
        ctx.restore();
      } else {
        // Non-rotated: draw centered at point
        ctx.drawImage(brushStamp, point.x - brushStamp.width / 2, point.y - brushStamp.height / 2);
      }
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