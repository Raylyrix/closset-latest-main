// Domain-driven state management for ClOSSET
// This replaces the monolithic useApp store with focused domain stores

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';
import { UVCoordinate } from '../types/app';

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface UVPoint {
  worldPosition: THREE.Vector3;
  uv: THREE.Vector2;
  normal?: THREE.Vector3;
  tangent?: THREE.Vector3;
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  velocity: number;
  timestamp: number;
  distance: number;
  uv?: UVCoordinate;
  worldPosition?: THREE.Vector3;
}

export interface BrushSettings {
  size: number;
  opacity: number;
  hardness: number;
  flow: number;
  spacing: number;
  angle: number;
  roundness: number;
  color: string; // Add missing color property
  dynamics: {
    sizePressure: boolean;
    opacityPressure: boolean;
    anglePressure: boolean;
    spacingPressure: boolean;
    velocitySize: boolean;
    velocityOpacity: boolean;
  };
  texture: {
    enabled: boolean;
    pattern: string | null;
    scale: number;
    rotation: number;
    opacity: number;
    blendMode: GlobalCompositeOperation;
  };
  shape: 'round' | 'square' | 'diamond' | 'triangle' | 'airbrush' | 'calligraphy' | 'spray' | 'texture' | 'watercolor' | 'oil' | 'charcoal' | 'pencil' | 'marker' | 'highlighter' | 'chalk' | 'ink' | 'pastel' | 'acrylic' | 'gouache' | 'stencil' | 'stamp' | 'blur' | 'smudge';
  blendMode: GlobalCompositeOperation;
}

export interface VectorAnchor {
  x: number;
  y: number;
  in?: { x: number; y: number } | null;
  out?: { x: number; y: number } | null;
}

export interface VectorPath {
  id: string;
  anchors: VectorAnchor[];
  closed: boolean;
  fill: {
    type: 'solid' | 'gradient' | 'pattern';
    color?: string;
    gradient?: any;
    pattern?: string;
  };
  stroke: {
    enabled: boolean;
    color: string;
    width: number;
    join: 'miter' | 'round' | 'bevel';
    cap: 'butt' | 'round' | 'square';
  };
}

export interface TextElement {
  id: string;
  text: string;
  position: THREE.Vector3;
  uv?: THREE.Vector2;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  rotation: number;
  scale: number;
}

// ============================================================================
// MODEL STORE - 3D Models, UV Mapping, Geometry
// ============================================================================

interface ModelState {
  // 3D Model Data
  modelUrl: string | null;
  modelScene: THREE.Object3D | null;
  modelScale: number;
  modelPosition: THREE.Vector3;
  modelRotation: THREE.Vector3;
  modelBoundsHeight: number;
  modelType: 'gltf' | 'obj' | 'fbx' | 'dae' | 'ply';

  // UV Mapping
  uvCache: Map<string, UVPoint[]>;
  uvIndexCache: Map<string, {
    positions: Float32Array;
    uvs: Float32Array;
    indices: Uint16Array | Uint32Array | null;
    obj: THREE.Object3D | null;
  }>;

  // Geometry Processing
  processedMeshes: Map<string, THREE.Mesh>;
  vertexCache: Map<string, THREE.Vector3[]>;

  // Actions
  setModel: (url: string, scene: THREE.Object3D) => void;
  updateTransform: (scale: number, position: THREE.Vector3, rotation: THREE.Vector3) => void;
  cacheUVData: (meshId: string, uvPoints: UVPoint[]) => void;
  getUVPoint: (meshId: string, uv: THREE.Vector2) => UVPoint | null;
  clearCache: () => void;
}

export const useModelStore = create<ModelState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state - production ready defaults
    // Set a default model so the 3D view renders without requiring user action
    // Use local GLTF shirt asset available in public/ to avoid external network dependency
    modelUrl: '/models/shirt.glb',
    modelScene: (() => {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      );
      return cube;
    })(),
    modelScale: 1,
    modelPosition: new THREE.Vector3(0, 0, 0),
    modelRotation: new THREE.Vector3(0, 0, 0),
    modelBoundsHeight: 1,
    modelType: 'gltf',
    uvCache: new Map(),
    uvIndexCache: new Map(),
    processedMeshes: new Map(),
    vertexCache: new Map(),

    // Actions
    setModel: (url, scene) => set({ modelUrl: url, modelScene: scene }),

    updateTransform: (scale, position, rotation) =>
      set({ modelScale: scale, modelPosition: position, modelRotation: rotation }),

    cacheUVData: (meshId, uvPoints) => {
      const cache = new Map(get().uvCache);
      cache.set(meshId, uvPoints);
      set({ uvCache: cache });
    },

    getUVPoint: (meshId, uv) => {
      const uvPoints = get().uvCache.get(meshId);
      if (!uvPoints) return null;

      // Find closest UV point (simplified - should use barycentric)
      let closestPoint: UVPoint | null = null;
      let minDistance = Infinity;

      for (const point of uvPoints) {
        const distance = point.uv.distanceTo(uv);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }

      return closestPoint;
    },

    clearCache: () => set({
      uvCache: new Map(),
      uvIndexCache: new Map(),
      processedMeshes: new Map(),
      vertexCache: new Map()
    })
  }))
);

// ============================================================================
// TOOL STORE - Active Tools, Brush Settings, Tool State
// ============================================================================

type ToolType = 'select' | 'brush' | 'eraser' | 'text' | 'vector' | 'move' | 'rotate' | 'scale';

interface ToolState {
  // Active Tool
  activeTool: ToolType;
  previousTool: ToolType;

  // Brush Settings
  brushSettings: BrushSettings;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  brushFlow: number;
  brushShape: BrushSettings['shape'];
  brushSpacing: number;

  // Tool-specific state
  isDrawing: boolean;
  currentStroke: BrushPoint[];
  strokeHistory: BrushPoint[][];

  // Symmetry
  symmetryX: boolean;
  symmetryY: boolean;
  symmetryZ: boolean;

  // Blend Mode
  blendMode: GlobalCompositeOperation;

  // Vector Tool State
  vectorMode: boolean;
  vectorPaths: VectorPath[];
  selectedAnchors: string[];
  draggingAnchor: { pathId: string; anchorIndex: number } | null;

  // Text Tool State
  selectedTextId: string | null;
  textElements: TextElement[];

  // Actions
  setActiveTool: (tool: ToolType) => void;
  updateBrushSettings: (settings: Partial<BrushSettings>) => void;
  startStroke: (point: BrushPoint) => void;
  addToStroke: (point: BrushPoint) => void;
  endStroke: () => void;
  clearStrokes: () => void;
  setSymmetry: (x: boolean, y: boolean, z: boolean) => void;
  addVectorPath: (path: VectorPath) => void;
  updateVectorPath: (id: string, updates: Partial<VectorPath>) => void;
  deleteVectorPath: (id: string) => void;
  selectTextElement: (id: string | null) => void;
  addTextElement: (text: TextElement) => void;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  deleteTextElement: (id: string) => void;
}

export const useToolStore = create<ToolState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeTool: 'select',
    previousTool: 'select',

    brushSettings: {
      color: '#000000', // FIXED: Missing color property
      size: 50,
      opacity: 1,
      hardness: 0.5,
      flow: 1,
      spacing: 0.1,
      angle: 0,
      roundness: 1,
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
        blendMode: 'source-over'
      },
      shape: 'round',
      blendMode: 'source-over'
    },

    brushColor: '#000000',
    brushSize: 50,
    brushOpacity: 1,
    brushHardness: 0.5,
    brushFlow: 1,
    brushShape: 'round' as BrushSettings['shape'],
    brushSpacing: 0.1,

    isDrawing: false,
    currentStroke: [],
    strokeHistory: [],

    symmetryX: false,
    symmetryY: false,
    symmetryZ: false,

    blendMode: 'source-over',

    vectorMode: false,
    vectorPaths: [],
    selectedAnchors: [],
    draggingAnchor: null,

    selectedTextId: null,
    textElements: [],

    // Actions
    setActiveTool: (tool) => set({ activeTool: tool }),

    updateBrushSettings: (settings) =>
      set((state) => ({
        brushSettings: { ...state.brushSettings, ...settings }
      })),

    startStroke: (point) =>
      set({ isDrawing: true, currentStroke: [point] }),

    addToStroke: (point) =>
      set((state) => ({
        currentStroke: [...state.currentStroke, point]
      })),

    endStroke: () =>
      set((state) => ({
        isDrawing: false,
        strokeHistory: [...state.strokeHistory, state.currentStroke],
        currentStroke: []
      })),

    clearStrokes: () => set({ strokeHistory: [], currentStroke: [] }),

    setSymmetry: (x, y, z) => set({ symmetryX: x, symmetryY: y, symmetryZ: z }),

    addVectorPath: (path) =>
      set((state) => ({
        vectorPaths: [...state.vectorPaths, path]
      })),

    updateVectorPath: (id, updates) =>
      set((state) => ({
        vectorPaths: state.vectorPaths.map(path =>
          path.id === id ? { ...path, ...updates } : path
        )
      })),

    deleteVectorPath: (id) =>
      set((state) => ({
        vectorPaths: state.vectorPaths.filter(path => path.id !== id)
      })),

    selectTextElement: (id) => set({ selectedTextId: id }),

    addTextElement: (text) =>
      set((state) => ({
        textElements: [...state.textElements, text]
      })),

    updateTextElement: (id, updates) =>
      set((state) => ({
        textElements: state.textElements.map(text =>
          text.id === id ? { ...text, ...updates } : text
        )
      })),

    deleteTextElement: (id) =>
      set((state) => ({
        textElements: state.textElements.filter(text => text.id !== id)
      }))
  }))
);

// ============================================================================
// LAYER STORE - Canvas Layers, Effects, Composition
// ============================================================================

interface LayerState {
  // Layer Management
  layers: any[]; // TODO: Use proper Layer types
  activeLayerId: string;
  layerOrder: string[];

  // Canvas Management
  composedCanvas: HTMLCanvasElement | null;
  layerCanvases: Map<string, HTMLCanvasElement>;

  // Effects & Filters
  activeEffects: any[];
  layerEffects: Map<string, any[]>;

  // History
  history: any[];
  historyIndex: number;

  // Actions
  addLayer: (layer: any) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  updateLayer: (id: string, updates: any) => void;
  reorderLayers: (newOrder: string[]) => void;
  composeLayers: () => void;
  undo: () => void;
  redo: () => void;
}

export const useLayerStore = create<LayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    layers: [],
    activeLayerId: '',
    layerOrder: [],
    composedCanvas: null,
    layerCanvases: new Map(),
    activeEffects: [],
    layerEffects: new Map(),
    history: [],
    historyIndex: -1,

    // Actions
    addLayer: (layer) =>
      set((state) => ({
        layers: [...state.layers, layer],
        layerOrder: [...state.layerOrder, layer.id]
      })),

    removeLayer: (id) =>
      set((state) => ({
        layers: state.layers.filter(l => l.id !== id),
        layerOrder: state.layerOrder.filter(lid => lid !== id),
        layerCanvases: new Map([...state.layerCanvases].filter(([key]) => key !== id))
      })),

    setActiveLayer: (id) => set({ activeLayerId: id }),

    updateLayer: (id, updates) =>
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, ...updates } : layer
        )
      })),

    reorderLayers: (newOrder) => set({ layerOrder: newOrder }),

    composeLayers: () => {
      // TODO: Implement layer composition
      console.log('Composing layers...');
    },

    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const previousState = state.history[state.historyIndex - 1];
        set({
          ...previousState,
          historyIndex: state.historyIndex - 1
        });
      }
    },

    redo: () => {
      const state = get();
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        set({
          ...nextState,
          historyIndex: state.historyIndex + 1
        });
      }
    }
  }))
);

// ============================================================================
// PROJECT STORE - Save/Load, Assets, Metadata
// ============================================================================

interface ProjectState {
  // Project Metadata
  projectId: string | null;
  projectName: string;
  lastSaved: Date | null;
  version: string;

  // Assets
  images: Map<string, string>; // id -> url/data
  canvases: Map<string, string>; // id -> canvas data
  fonts: Map<string, any>; // id -> font data

  // Export Settings
  exportFormat: 'png' | 'jpg' | 'svg' | 'pdf';
  exportQuality: number;
  exportResolution: { width: number; height: number };

  // Actions
  createProject: (name: string) => void;
  saveProject: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  exportProject: (format: string) => Promise<void>;
  addAsset: (type: 'image' | 'canvas' | 'font', id: string, data: any) => void;
  removeAsset: (type: 'image' | 'canvas' | 'font', id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projectId: null,
    projectName: 'Untitled Project',
    lastSaved: null,
    version: '1.0.0',

    images: new Map(),
    canvases: new Map(),
    fonts: new Map(),

    exportFormat: 'png',
    exportQuality: 0.9,
    exportResolution: { width: 2048, height: 2048 },

    // Actions
    createProject: (name) =>
      set({
        projectName: name,
        projectId: `project-${Date.now()}`,
        lastSaved: new Date()
      }),

    saveProject: async () => {
      const state = get();
      // TODO: Implement save logic using storage service
      console.log('Saving project:', state.projectName);
      set({ lastSaved: new Date() });
    },

    loadProject: async (id) => {
      // TODO: Implement load logic using storage service
      console.log('Loading project:', id);
    },

    exportProject: async (format) => {
      // TODO: Implement export logic
      console.log('Exporting project as:', format);
    },

    addAsset: (type, id, data) => {
      const assetMap = type === 'image' ? 'images' :
                      type === 'canvas' ? 'canvases' : 'fonts';
      set((state) => ({
        [assetMap]: new Map([...(state as any)[assetMap], [id, data]])
      }));
    },

    removeAsset: (type, id) => {
      const assetMap = type === 'image' ? 'images' :
                      type === 'canvas' ? 'canvases' : 'fonts';
      set((state) => {
        const newMap = new Map((state as any)[assetMap]);
        newMap.delete(id);
        return { [assetMap]: newMap };
      });
    }
  }))
);

// ============================================================================
// COMBINED STORE SELECTORS
// ============================================================================

// Convenient selectors for commonly used state
export const useBrushSettings = () => useToolStore(state => state.brushSettings);
export const useActiveTool = () => useToolStore(state => state.activeTool);
export const useModelData = () => useModelStore(state => ({
  modelScene: state.modelScene,
  modelScale: state.modelScale,
  modelPosition: state.modelPosition,
  modelRotation: state.modelRotation
}));
export const useLayerData = () => useLayerStore(state => ({
  layers: state.layers,
  activeLayerId: state.activeLayerId,
  composedCanvas: state.composedCanvas
}));
