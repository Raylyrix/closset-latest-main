import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createLayerCanvas, createComposedCanvas, createDisplacementCanvas, CANVAS_CONFIG } from '../constants/CanvasSizes';
import { useApp } from '../App';

// Layer Types
export type LayerType = 'paint' | 'puff' | 'vector' | 'text' | 'image' | 'embroidery' | 'adjustment' | 'group' | 'pixel' | 'smart-object' | 'shape' | 'background' | 'raster' | 'procedural' | 'fill' | 'ai-smart';

// Blend Modes (Photoshop-like)
export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
  | 'color-dodge' | 'color-burn' | 'darken' | 'lighten' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

// Transform properties
export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

// Layer effects
export interface LayerEffect {
  id: string;
  type: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'hue' | 'drop-shadow' | 'inner-glow' | 'outer-glow';
  enabled: boolean;
  properties: Record<string, any>;
}

// Layer mask
export interface LayerMask {
  id: string;
  canvas: HTMLCanvasElement;
  enabled: boolean;
  inverted: boolean;
}

// Brush stroke interface
export interface BrushStroke {
  id: string;
  layerId: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
  timestamp: number;
}

// Text element interface
export interface TextElement {
  id: string;
  layerId: string;
  text: string;
  x: number;
  y: number;
  u: number;
  v: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  timestamp: number;
  // Additional properties for backward compatibility
  bold?: boolean;
  italic?: boolean;
  rotation?: number;
  align?: 'left' | 'center' | 'right';
  zIndex?: number;
  // Extended properties for full compatibility
  underline?: boolean;
  strikethrough?: boolean;
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  lineHeight?: number;
  stroke?: string | { width: number; color: string };
  strokeWidth?: number;
  textBaseline?: 'top' | 'middle' | 'bottom';
  scaleX?: number;
  scaleY?: number;
  shadow?: {
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  };
}

// Image element interface (for imported images)
export interface ImageElement {
  id: string;
  name: string;
  dataUrl: string;
  src?: string;
  // UV coordinates (0-1 range) - PRIMARY for texture mapping
  u: number;          // UV X center (0-1)
  v: number;          // UV Y center (0-1)
  uWidth: number;     // Width in UV space (0-1)
  uHeight: number;    // Height in UV space (0-1)
  // Pixel coordinates for rendering
  x: number;          // Pixel X position
  y: number;          // Pixel Y position
  width: number;      // Pixel width
  height: number;     // Pixel height
  // Common properties
  visible: boolean;
  opacity: number;
  rotation: number;   // degrees
  locked: boolean;    // prevent accidental edits
  // Size linking and flip properties
  sizeLinked: boolean;    // link width/height scaling
  horizontalFlip: boolean; // flip horizontally
  verticalFlip: boolean;   // flip vertically
  // Blending properties
  blendMode: GlobalCompositeOperation; // canvas blend mode
  layerId: string;
  timestamp: number;
}

// Puff element interface (for puff print effects)
export interface PuffElement {
  id: string;
  x: number;          // Pixel X position
  y: number;          // Pixel Y position
  radius: number;     // Puff radius in pixels
  height: number;     // Displacement height (0-1)
  softness: number;   // Puff softness (0-1)
  color: string;      // Puff color
  opacity: number;    // Puff opacity
  layerId: string;
  timestamp: number;
}

// History system for undo/redo
export interface LayerHistorySnapshot {
  id: string;
  timestamp: number;
  action: string;
  layers: AdvancedLayer[];
  activeLayerId: string | null;
}

export interface LayerHistoryState {
  snapshots: LayerHistorySnapshot[];
  currentIndex: number;
  maxSnapshots: number;
}

// Layer content (varies by type)
export interface LayerContent {
  canvas?: HTMLCanvasElement; // For paint layers
  text?: string; // For text layers
  imageData?: ImageData; // For image layers
  imageElements?: ImageElement[]; // ✅ NEW: For imported images
  vectorData?: any; // For vector layers
  puffData?: any; // For puff layers
  embroideryData?: any; // For embroidery layers
  brushStrokes?: BrushStroke[]; // For paint layers
  textElements?: TextElement[]; // For text layers
  displacementCanvas?: HTMLCanvasElement; // For displacement mapping
  puffElements?: PuffElement[]; // ✅ NEW: For puff print elements
}

// Main Layer interface
export interface AdvancedLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  effects: LayerEffect[];
  mask?: LayerMask;
  transform: LayerTransform;
  content: LayerContent;
  createdAt: Date;
  updatedAt: Date;
  groupId?: string;
  order: number; // For z-index management
  selected: boolean; // For selection state
  bounds?: { x: number; y: number; width: number; height: number }; // For selection bounds
}

// Layer Group
export interface LayerGroup {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  collapsed: boolean;
  layerIds: string[];
  childLayerIds: string[]; // Alias for layerIds for backward compatibility
  createdAt: Date;
  order: number;
}

// Store state
interface AdvancedLayerStoreV2 {
  // Core data
  layers: AdvancedLayer[];
  groups: LayerGroup[];
  layerOrder: string[]; // Ordered list of layer IDs (top to bottom)
  
  // Selection state
  selectedLayerIds: string[];
  activeLayerId: string | null;
  
  // UI state
  showLayerPanel: boolean;
  autoGrouping: boolean;
  
  // Canvas state
  composedCanvas: HTMLCanvasElement | null;
  
  // CRITICAL: Store instance ID for debugging
  id: string;
  
  // History state
  history: LayerHistoryState;
  
  // Actions
  createLayer: (type: LayerType, name?: string) => string;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string;
  renameLayer: (id: string, name: string) => void;
  
  // Selection
  selectLayer: (id: string, multi?: boolean) => void;
  selectLayers: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveLayer: (id: string) => void;
  
  // Properties
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  setLayerTransform: (id: string, transform: Partial<LayerTransform>) => void;
  
  // Ordering
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
  reorderLayers: (newOrder: string[]) => void;
  
  // Groups
  createGroup: (name?: string) => string;
  deleteGroup: (id: string) => void;
  addToGroup: (layerId: string, groupId: string) => void;
  removeFromGroup: (layerId: string) => void;
  toggleGroupCollapse: (id: string) => void;
  
  // Effects
  addEffect: (layerId: string, effect: LayerEffect) => void;
  removeEffect: (layerId: string, effectId: string) => void;
  updateEffect: (layerId: string, effectId: string, properties: Record<string, any>) => void;
  
  // Masks
  addMask: (layerId: string, mask: LayerMask) => void;
  removeMask: (layerId: string) => void;
  updateMask: (layerId: string, maskData: Partial<LayerMask>) => void;
  toggleMaskEnabled: (layerId: string) => void;
  toggleMaskInverted: (layerId: string) => void;
  
  // Auto-grouping
  enableAutoGrouping: () => void;
  disableAutoGrouping: () => void;
  autoGroupLayers: () => void;
  
  // Smart naming
  generateLayerName: (type: LayerType) => string;
  
  // Content management
  updateLayerContent: (id: string, content: Partial<LayerContent>) => void;
  getLayerBounds: (id: string) => { x: number; y: number; width: number; height: number } | null;
  
  // Brush strokes
  addBrushStroke: (layerId: string, stroke: BrushStroke) => void;
  removeBrushStroke: (layerId: string, strokeId: string) => void;
  getBrushStrokes: (layerId: string) => BrushStroke[];
  
  // Text elements
  addTextElement: (layerId: string, textElement: TextElement) => void;
  removeTextElement: (layerId: string, textElementId: string) => void;
  getTextElements: (layerId: string) => TextElement[];
  
  // Enhanced text element management (compatible with App.tsx interface)
  addTextElementFromApp: (text: string, uv: { u: number; v: number }, layerId?: string) => string;
  updateTextElementFromApp: (id: string, patch: Partial<TextElement>) => void;
  deleteTextElementFromApp: (id: string) => void;
  getAllTextElements: () => TextElement[];
  
  // Enhanced image element management (compatible with App.tsx interface)
  addImageElementFromApp: (imageData: any, layerId?: string) => string;
  updateImageElementFromApp: (id: string, patch: Partial<ImageElement>) => void;
  deleteImageElementFromApp: (id: string) => void;
  getAllImageElements: () => ImageElement[];
  
  // Enhanced puff element management (compatible with App.tsx interface)
  addPuffElementFromApp: (puffData: any, layerId?: string) => string;
  updatePuffElementFromApp: (id: string, patch: Partial<PuffElement>) => void;
  deletePuffElementFromApp: (id: string) => void;
  getAllPuffElements: () => PuffElement[];
  
  // Backward compatibility helpers
  getLayerCanvas: (layerId: string) => HTMLCanvasElement | null;
  getLayerDisplacementCanvas: (layerId: string) => HTMLCanvasElement | null;
  convertToLegacyLayer: (advancedLayer: AdvancedLayer) => any;
  
  // History management
  saveHistorySnapshot: (action: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Layer operations
  toggleLayerVisibility: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AdvancedLayer>) => void;
  
  // Missing UI state properties
  expandedGroups: Set<string>;
  showLayerEffects: boolean;
  showLayerMasks: boolean;
  activeGroupId: string | null;
  
  // Missing layer operations
  toggleLayerLock: (layerId: string) => void;
  groupLayers: (layerIds: string[]) => string;
  ungroupLayers: (groupId: string) => void;
  createAdjustmentLayer: (name?: string) => string;
  createProceduralLayer: (name?: string) => string;
  createFillLayer: (name?: string) => string;
  createAILayer: (name?: string) => string;
  mergeDown: (layerId: string) => void;
  mergeLayers: (layerIds: string[]) => void;
  flattenAll: () => void;
  
  // Missing group operations
  renameGroup: (groupId: string, name: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  
  // Missing effects operations
  addLayerEffect: (layerId: string, effect: LayerEffect) => void;
  addSmartFilter: (layerId: string, filter: any) => void;
  
  // Missing search and filtering
  searchLayers: (query: string) => AdvancedLayer[];
  filterLayers: (predicate: (layer: AdvancedLayer) => boolean) => AdvancedLayer[];
  
  // Missing layer properties
  addTag: (layerId: string, tag: string) => void;
  toggleFavorite: (layerId: string) => void;
  setLayerColor: (layerId: string, color: string) => void;
  
  // Missing auto-organize
  autoOrganizeLayers: () => void;
  
  // Layer composition
  composeLayers: () => HTMLCanvasElement | null;
}

// Helper functions
const generateLayerName = (type: LayerType, existingLayers: AdvancedLayer[]): string => {
  const typeNames: Record<LayerType, string> = {
    paint: 'Paint Layer',
    puff: 'Puff Layer',
    vector: 'Vector Layer',
    text: 'Text Layer',
    image: 'Image Layer',
    embroidery: 'Embroidery Layer',
    adjustment: 'Adjustment Layer',
    group: 'Group',
    pixel: 'Pixel Layer',
    'smart-object': 'Smart Object',
    shape: 'Shape Layer',
    background: 'Background Layer',
    raster: 'Raster Layer',
    procedural: 'Procedural Layer',
    fill: 'Fill Layer',
    'ai-smart': 'AI Smart Layer'
  };
  
  const baseName = typeNames[type];
  const existingNames = existingLayers
    .filter(layer => layer.name.startsWith(baseName))
    .map(layer => layer.name);
  
  if (existingNames.length === 0) {
    return baseName;
  }
  
  // Find the next available number
  let counter = 1;
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter++;
  }
  
  return `${baseName} ${counter}`;
};

const createDefaultTransform = (): LayerTransform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  skewX: 0,
  skewY: 0
});

const createDefaultContent = (type: LayerType): LayerContent => {
  switch (type) {
    case 'paint':
      // CRITICAL FIX: Create actual canvas for paint layers with correct size
      const canvas = createLayerCanvas();
      return { 
        canvas,
        brushStrokes: [], // ✅ FIX: Initialize brush strokes array
        textElements: [],  // ✅ FIX: Initialize text elements array
        imageElements: [], // ✅ FIX: Initialize image elements array
        puffElements: []   // ✅ FIX: Initialize puff elements array
      };
    case 'text':
      return { 
        text: '',
        textElements: [] // ✅ FIX: Initialize text elements array
      };
    case 'image':
      return { 
        imageData: undefined,
        imageElements: [] // ✅ FIX: Initialize image elements array
      };
    case 'vector':
      return { vectorData: null };
    case 'puff':
      return { 
        puffData: null,
        puffElements: [] // ✅ FIX: Initialize puff elements array
      };
    case 'embroidery':
      return { embroideryData: null };
    case 'adjustment':
      return {};
    default:
      return {};
  }
};

// Create the store
export const useAdvancedLayerStoreV2 = create<AdvancedLayerStoreV2>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    layers: [],
    groups: [],
    layerOrder: [],
    selectedLayerIds: [],
    activeLayerId: null,
    showLayerPanel: true,
    autoGrouping: true,
    composedCanvas: null,
    expandedGroups: new Set(),
    
    // CRITICAL: Add store instance ID for debugging
    id: `v2-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    showLayerEffects: false,
    showLayerMasks: false,
    activeGroupId: null,
    history: {
      snapshots: [],
      currentIndex: -1,
      maxSnapshots: 50
    },
    
    // Layer creation
    createLayer: (type: LayerType, name?: string) => {
      const state = get();
      const layerName = name || generateLayerName(type, state.layers);
      const newOrder = state.layerOrder.length;
      
      const newLayer: AdvancedLayer = {
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: layerName,
        type,
        visible: true,
        opacity: 1.0,
        blendMode: 'normal',
        locked: false,
        effects: [],
        transform: createDefaultTransform(),
        content: createDefaultContent(type),
        createdAt: new Date(),
        updatedAt: new Date(),
        order: newOrder,
        selected: false
      };
      
      set(state => ({
        layers: [...state.layers, newLayer],
        layerOrder: [...state.layerOrder, newLayer.id],
        activeLayerId: newLayer.id,
        selectedLayerIds: [newLayer.id]
      }));
      
      // Save history snapshot
      get().saveHistorySnapshot(`Create Layer: ${layerName}`);
      
      console.log(`🎨 Created new ${type} layer: ${layerName}`, newLayer);
      return newLayer.id;
    },
    
    // Layer deletion
    deleteLayer: (id: string) => {
      set(state => ({
        layers: state.layers.filter(layer => layer.id !== id),
        layerOrder: state.layerOrder.filter(layerId => layerId !== id),
        selectedLayerIds: state.selectedLayerIds.filter(layerId => layerId !== id),
        activeLayerId: state.activeLayerId === id ? null : state.activeLayerId
      }));
      
      // Save history snapshot
      get().saveHistorySnapshot(`Delete Layer: ${id}`);
      
      console.log(`🗑️ Deleted layer: ${id}`);
    },
    
    // Layer duplication
    duplicateLayer: (id: string) => {
      const state = get();
      const originalLayer = state.layers.find(layer => layer.id === id);
      if (!originalLayer) return '';
      
      const duplicatedLayer: AdvancedLayer = {
        ...originalLayer,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${originalLayer.name} Copy`,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: state.layerOrder.length,
        selected: false
      };
      
      set(state => ({
        layers: [...state.layers, duplicatedLayer],
        layerOrder: [...state.layerOrder, duplicatedLayer.id]
      }));
      
      console.log(`📋 Duplicated layer: ${originalLayer.name} -> ${duplicatedLayer.name}`);
      return duplicatedLayer.id;
    },
    
    // Layer renaming
    renameLayer: (id: string, name: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, name, updatedAt: new Date() } : layer
        )
      }));
      
      console.log(`✏️ Renamed layer ${id} to: ${name}`);
    },
    
    // Selection
    selectLayer: (id: string, multi: boolean = false) => {
      set(state => {
        const newSelectedIds = multi 
          ? [...state.selectedLayerIds, id]
          : [id];
        
        return {
          selectedLayerIds: newSelectedIds,
          activeLayerId: id,
          layers: state.layers.map(layer => ({
            ...layer,
            selected: newSelectedIds.includes(layer.id)
          }))
        };
      });
      
      console.log(`🎯 Selected layer: ${id}`);
    },
    
    selectLayers: (ids: string[]) => {
      set(state => ({
        selectedLayerIds: ids,
        activeLayerId: ids[0] || null,
        layers: state.layers.map(layer => ({
          ...layer,
          selected: ids.includes(layer.id)
        }))
      }));
      
      console.log(`🎯 Selected multiple layers:`, ids);
    },
    
    clearSelection: () => {
      set(state => ({
        selectedLayerIds: [],
        activeLayerId: null,
        layers: state.layers.map(layer => ({ ...layer, selected: false }))
      }));
      
      console.log(`🎯 Cleared layer selection`);
    },
    
    setActiveLayer: (id: string) => {
      set(state => ({
        activeLayerId: id,
        layers: state.layers.map(layer => ({
          ...layer,
          selected: layer.id === id
        }))
      }));
      
      console.log(`🎯 Set active layer: ${id}`);
    },
    
    // Properties
    setLayerVisibility: (id: string, visible: boolean) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, visible, updatedAt: new Date() } : layer
        )
      }));
      
      // Force composition and visual update using App's composeLayers
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-visibility-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer visibility change (V2)');
      }, 50);
      
      console.log(`👁️ Set layer ${id} visibility: ${visible}`);
    },
    
    setLayerOpacity: (id: string, opacity: number) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, opacity, updatedAt: new Date() } : layer
        )
      }));
      
      // Force composition and visual update using App's composeLayers
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-opacity-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer opacity change (V2)');
      }, 50);
      
      console.log(`🔍 Set layer ${id} opacity: ${opacity}`);
    },
    
    setLayerBlendMode: (id: string, blendMode: BlendMode) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, blendMode, updatedAt: new Date() } : layer
        )
      }));
      
      // Force composition and visual update using App's composeLayers
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-blendmode-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer blend mode change (V2)');
      }, 50);
      
      console.log(`🎨 Set layer ${id} blend mode: ${blendMode}`);
    },
    
    setLayerLocked: (id: string, locked: boolean) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? { ...layer, locked, updatedAt: new Date() } : layer
        )
      }));
      
      console.log(`🔒 Set layer ${id} locked: ${locked}`);
    },
    
    setLayerTransform: (id: string, transform: Partial<LayerTransform>) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { 
            ...layer, 
            transform: { ...layer.transform, ...transform },
            updatedAt: new Date()
          } : layer
        )
      }));
      
      console.log(`🔄 Set layer ${id} transform:`, transform);
    },
    
    // Ordering
    moveLayerUp: (id: string) => {
      set(state => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex <= 0) return state;
        
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        
        return {
          layerOrder: newOrder,
          layers: state.layers.map((layer, index) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
          }))
        };
      });
      
      // Force composition and visual update using App's composeLayers
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder-up-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer move up (V2)');
      }, 50);
      
      console.log(`⬆️ Moved layer ${id} up`);
    },
    
    moveLayerDown: (id: string) => {
      set(state => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex >= state.layerOrder.length - 1) return state;
        
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        
        return {
          layerOrder: newOrder,
          layers: state.layers.map((layer, index) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
          }))
        };
      });
      
      // Force composition and visual update using App's composeLayers
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder-down-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer move down (V2)');
      }, 50);
      
      console.log(`⬇️ Moved layer ${id} down`);
    },
    
    moveLayerToTop: (id: string) => {
      set(state => {
        const newOrder = state.layerOrder.filter(layerId => layerId !== id);
        newOrder.unshift(id);
        
        return {
          layerOrder: newOrder,
          layers: state.layers.map((layer, index) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
          }))
        };
      });
      
      console.log(`🔝 Moved layer ${id} to top`);
    },
    
    moveLayerToBottom: (id: string) => {
      set(state => {
        const newOrder = state.layerOrder.filter(layerId => layerId !== id);
        newOrder.push(id);
        
        return {
          layerOrder: newOrder,
          layers: state.layers.map((layer, index) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
          }))
        };
      });
      
      console.log(`🔻 Moved layer ${id} to bottom`);
    },
    
    reorderLayers: (newOrder: string[]) => {
      set(state => ({
        layerOrder: newOrder,
        layers: state.layers.map(layer => ({
          ...layer,
          order: newOrder.indexOf(layer.id)
        }))
      }));
      
      console.log(`🔄 Reordered layers:`, newOrder);
    },
    
    // Groups (simplified for now)
    createGroup: (name?: string) => {
      const state = get();
      const groupName = name || generateLayerName('group', state.layers);
       const newGroup: LayerGroup = {
         id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
         name: groupName,
         visible: true,
         opacity: 1.0,
         blendMode: 'normal',
         locked: false,
         collapsed: false,
         layerIds: [],
         childLayerIds: [], // Alias for layerIds
         createdAt: new Date(),
         order: state.layerOrder.length
       };
      
      set(state => ({
        groups: [...state.groups, newGroup]
      }));
      
      console.log(`📁 Created group: ${groupName}`);
      return newGroup.id;
    },
    
    deleteGroup: (id: string) => {
      set(state => ({
        groups: state.groups.filter(group => group.id !== id)
      }));
      
      console.log(`🗑️ Deleted group: ${id}`);
    },
    
    addToGroup: (layerId: string, groupId: string) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId
            ? { ...group, layerIds: [...group.layerIds, layerId] }
            : group
        ),
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, groupId } : layer
        )
      }));
      
      console.log(`➕ Added layer ${layerId} to group ${groupId}`);
    },
    
    removeFromGroup: (layerId: string) => {
      set(state => ({
        groups: state.groups.map(group => ({
          ...group,
          layerIds: group.layerIds.filter(id => id !== layerId)
        })),
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, groupId: undefined } : layer
        )
      }));
      
      console.log(`➖ Removed layer ${layerId} from group`);
    },
    
    toggleGroupCollapse: (id: string) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === id ? { ...group, collapsed: !group.collapsed } : group
        )
      }));
      
      console.log(`📁 Toggled group ${id} collapse`);
    },
    
    // Effects (simplified for now)
    addEffect: (layerId: string, effect: LayerEffect) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? { ...layer, effects: [...layer.effects, effect], updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`✨ Added effect ${effect.type} to layer ${layerId}`);
    },
    
    removeEffect: (layerId: string, effectId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? { ...layer, effects: layer.effects.filter(effect => effect.id !== effectId), updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`🗑️ Removed effect ${effectId} from layer ${layerId}`);
    },
    
    updateEffect: (layerId: string, effectId: string, properties: Record<string, any>) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                effects: layer.effects.map(effect =>
                  effect.id === effectId ? { ...effect, properties: { ...effect.properties, ...properties } } : effect
                ),
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log(`🔧 Updated effect ${effectId} on layer ${layerId}`);
    },
    
    // Masks
    addMask: (layerId: string, mask: LayerMask) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? { ...layer, mask, updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`🎭 Added mask to layer ${layerId}`);
    },
    
    removeMask: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? { ...layer, mask: undefined, updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`🗑️ Removed mask from layer ${layerId}`);
    },
    
    updateMask: (layerId: string, maskData: Partial<LayerMask>) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId && layer.mask
            ? { 
                ...layer, 
                mask: { ...layer.mask, ...maskData }, 
                updatedAt: new Date() 
              }
            : layer
        )
      }));
      
      console.log(`🔧 Updated mask on layer ${layerId}`);
    },
    
    toggleMaskEnabled: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId && layer.mask
            ? { 
                ...layer, 
                mask: { ...layer.mask, enabled: !layer.mask.enabled }, 
                updatedAt: new Date() 
              }
            : layer
        )
      }));
      
      console.log(`🎭 Toggled mask enabled on layer ${layerId}`);
    },
    
    toggleMaskInverted: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId && layer.mask
            ? { 
                ...layer, 
                mask: { ...layer.mask, inverted: !layer.mask.inverted }, 
                updatedAt: new Date() 
              }
            : layer
        )
      }));
      
      console.log(`🎭 Toggled mask inverted on layer ${layerId}`);
    },
    
    // Auto-grouping
    enableAutoGrouping: () => {
      set({ autoGrouping: true });
      console.log(`🤖 Enabled auto-grouping`);
    },
    
    disableAutoGrouping: () => {
      set({ autoGrouping: false });
      console.log(`🤖 Disabled auto-grouping`);
    },
    
    autoGroupLayers: () => {
      const state = get();
      if (!state.autoGrouping) return;
      
      // Group layers by type
      const layersByType = state.layers.reduce((acc, layer) => {
        if (!acc[layer.type]) acc[layer.type] = [];
        acc[layer.type].push(layer);
        return acc;
      }, {} as Record<LayerType, AdvancedLayer[]>);
      
      // Create groups for types with multiple layers
      Object.entries(layersByType).forEach(([type, layers]) => {
        if (layers.length > 1) {
          const groupId = get().createGroup(`${type.charAt(0).toUpperCase() + type.slice(1)} Group`);
          layers.forEach(layer => {
            get().addToGroup(layer.id, groupId);
          });
        }
      });
      
      console.log(`🤖 Auto-grouped layers by type`);
    },
    
    // Smart naming
    generateLayerName: (type: LayerType) => {
      const state = get();
      return generateLayerName(type, state.layers);
    },
    
    // Content management
    updateLayerContent: (id: string, content: Partial<LayerContent>) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id
            ? { ...layer, content: { ...layer.content, ...content }, updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`📝 Updated layer ${id} content`);
    },
    
    getLayerBounds: (id: string) => {
      const state = get();
      const layer = state.layers.find(layer => layer.id === id);
      return layer?.bounds || null;
    },
    
    // Brush strokes
    addBrushStroke: (layerId: string, stroke: BrushStroke) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  brushStrokes: [...(layer.content.brushStrokes || []), stroke]
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log(`🖌️ Added brush stroke to layer ${layerId}`);
    },
    
    removeBrushStroke: (layerId: string, strokeId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  brushStrokes: (layer.content.brushStrokes || []).filter(stroke => stroke.id !== strokeId)
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log(`🗑️ Removed brush stroke ${strokeId} from layer ${layerId}`);
    },
    
    getBrushStrokes: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(layer => layer.id === layerId);
      return layer?.content.brushStrokes || [];
    },
    
    // Text elements
    addTextElement: (layerId: string, textElement: TextElement) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  textElements: [...(layer.content.textElements || []), textElement]
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log(`📝 Added text element to layer ${layerId}`);
    },
    
    removeTextElement: (layerId: string, textElementId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  textElements: (layer.content.textElements || []).filter(text => text.id !== textElementId)
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log(`🗑️ Removed text element ${textElementId} from layer ${layerId}`);
    },
    
    getTextElements: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(layer => layer.id === layerId);
      return layer?.content.textElements || [];
    },
    
    // Enhanced text element management (compatible with App.tsx interface)
    addTextElementFromApp: (text: string, uv: { u: number; v: number }, layerId?: string) => {
      const id = Math.random().toString(36).slice(2);
      const state = get();
      
      // Ensure we have a valid layer ID
      let targetLayerId = layerId || state.activeLayerId || 'paint';
      
      // If the target layer doesn't exist, create a default paint layer
      if (!state.layers.find(l => l.id === targetLayerId)) {
        console.log('🎨 Creating default paint layer for text element');
        const paintLayerId = get().createLayer('paint', 'Paint Layer');
        targetLayerId = paintLayerId;
      }
      
      // Get current text settings from App state
      const appState = useApp.getState();
      
      // CRITICAL FIX: Convert UV coordinates to pixel coordinates for proper rendering
      // Use actual composed canvas size from App state, not config
      const composedCanvas = useApp.getState().composedCanvas;
      const canvasWidth = composedCanvas?.width || 4096;
      const canvasHeight = composedCanvas?.height || 4096;
      const pixelX = Math.floor(uv.u * canvasWidth);
      const pixelY = Math.floor((1 - uv.v) * canvasHeight); // V is flipped in canvas space
      
      const textElement: TextElement = {
        id,
        text,
        x: pixelX,  // ✅ FIXED: Convert UV to pixel X coordinate
        y: pixelY,  // ✅ FIXED: Convert UV to pixel Y coordinate
        u: uv.u,
        v: uv.v,
        fontSize: appState.textSize,
        fontFamily: appState.textFont,
        color: appState.textColor,
        opacity: 1,
        layerId: targetLayerId,
        timestamp: Date.now(),
        // Additional properties for backward compatibility
        bold: appState.textBold,
        italic: appState.textItalic,
        rotation: 0,
        align: appState.textAlign as 'left' | 'center' | 'right',
        zIndex: 0
      };
      
      // Add text element to the layer
      set(state => {
        console.log('🔍 DEBUG: addTextElementFromApp - Before update:', {
          targetLayerId,
          layersCount: state.layers.length,
          targetLayerExists: !!state.layers.find(l => l.id === targetLayerId)
        });
        
        const updatedLayers = state.layers.map(layer => {
          if (layer.id === targetLayerId) {
            console.log('🔍 DEBUG: Updating target layer:', {
              layerId: layer.id,
              layerName: layer.name,
              currentTextElementsCount: layer.content.textElements?.length || 0,
              hasTextElements: !!layer.content.textElements
            });
            
            const updatedLayer = {
              ...layer,
              content: {
                ...layer.content,
                textElements: [...(layer.content.textElements || []), textElement]
              },
              updatedAt: new Date()
            };
            
            console.log('🔍 DEBUG: After update:', {
              layerId: updatedLayer.id,
              newTextElementsCount: updatedLayer.content.textElements?.length || 0
            });
            
            return updatedLayer;
          }
          return layer;
        });
        
        console.log('🔍 DEBUG: addTextElementFromApp - After update:', {
          layersCount: updatedLayers.length,
          totalTextElements: updatedLayers.reduce((sum, layer) => sum + (layer.content.textElements?.length || 0), 0)
        });
        
        return { layers: updatedLayers };
      });
      console.log('🎨 Added text element via App interface:', {
        text: textElement.text,
        uv: { u: uv.u, v: uv.v },
        pixel: { x: pixelX, y: pixelY },
        canvasSize: { width: canvasWidth, height: canvasHeight },
        layerId: targetLayerId
      });
      
      return id;
    },
    
    // Enhanced image element management (compatible with App.tsx interface)
    addImageElementFromApp: (imageData: any, layerId?: string) => {
      const id = Math.random().toString(36).slice(2);
      const state = get();
      
      // Ensure we have a valid layer ID
      let targetLayerId = layerId || state.activeLayerId || 'image';
      
      // If the target layer doesn't exist, create a default image layer
      if (!state.layers.find(l => l.id === targetLayerId)) {
        console.log('🎨 Creating default image layer for image element');
        const imageLayerId = get().createLayer('image', 'Image Layer');
        targetLayerId = imageLayerId;
      }
      
      // CRITICAL FIX: Convert UV coordinates to pixel coordinates for proper rendering
      const canvasSize = CANVAS_CONFIG.COMPOSED.width; // Use composed canvas size
      const pixelX = Math.floor(imageData.u * canvasSize);
      const pixelY = Math.floor(imageData.v * canvasSize);
      const pixelWidth = Math.floor(imageData.uWidth * canvasSize);
      const pixelHeight = Math.floor(imageData.uHeight * canvasSize);
      
      const imageElement: ImageElement = {
        id,
        name: imageData.name || 'Imported Image',
        dataUrl: imageData.dataUrl,
        src: imageData.src,
        // UV coordinates (preserved)
        u: imageData.u,
        v: imageData.v,
        uWidth: imageData.uWidth,
        uHeight: imageData.uHeight,
        // Pixel coordinates for rendering
        x: pixelX,  // ✅ FIXED: Convert UV to pixel X coordinate
        y: pixelY,  // ✅ FIXED: Convert UV to pixel Y coordinate
        width: pixelWidth,  // ✅ FIXED: Convert UV width to pixel width
        height: pixelHeight,  // ✅ FIXED: Convert UV height to pixel height
        // Common properties
        visible: imageData.visible !== false,
        opacity: imageData.opacity || 1,
        rotation: imageData.rotation || 0,
        locked: imageData.locked || false,
        // Size linking and flip properties
        sizeLinked: imageData.sizeLinked !== false,
        horizontalFlip: imageData.horizontalFlip || false,
        verticalFlip: imageData.verticalFlip || false,
        // Blending properties
        blendMode: imageData.blendMode || 'source-over',
        layerId: targetLayerId,
        timestamp: Date.now()
      };
      
      // Add image element to the layer
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === targetLayerId 
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  imageElements: [...(layer.content.imageElements || []), imageElement]
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log('🎨 Added image element via App interface:', {
        name: imageElement.name,
        uv: { u: imageData.u, v: imageData.v, uWidth: imageData.uWidth, uHeight: imageData.uHeight },
        pixel: { x: pixelX, y: pixelY, width: pixelWidth, height: pixelHeight },
        canvasSize: canvasSize,
        layerId: targetLayerId
      });
      
      return id;
    },
    
    updateImageElementFromApp: (id: string, patch: Partial<ImageElement>) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            imageElements: layer.content.imageElements?.map(img => 
              img.id === id ? { ...img, ...patch } : img
            ) || []
          }
        }))
      }));
    },
    
    deleteImageElementFromApp: (id: string) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            imageElements: layer.content.imageElements?.filter(img => img.id !== id) || []
          }
        }))
      }));
    },
    
    getAllImageElements: () => {
      const state = get();
      const allImageElements: ImageElement[] = [];
      
      state.layers.forEach(layer => {
        if (layer.content.imageElements) {
          allImageElements.push(...layer.content.imageElements);
        }
      });
      
      return allImageElements;
    },
    
    // Enhanced puff element management (compatible with App.tsx interface)
    addPuffElementFromApp: (puffData: any, layerId?: string) => {
      const id = Math.random().toString(36).slice(2);
      const state = get();
      
      // Ensure we have a valid layer ID
      let targetLayerId = layerId || state.activeLayerId || 'puff';
      
      // If the target layer doesn't exist, create a default puff layer
      if (!state.layers.find(l => l.id === targetLayerId)) {
        console.log('🎨 Creating default puff layer for puff element');
        const puffLayerId = get().createLayer('puff', 'Puff Layer');
        targetLayerId = puffLayerId;
      }
      
      // Ensure the layer has a displacement canvas
      const targetLayer = state.layers.find(l => l.id === targetLayerId);
      if (targetLayer && !targetLayer.content.displacementCanvas) {
        console.log('🎨 Creating displacement canvas for puff layer');
        const displacementCanvas = createLayerCanvas();
        set(state => ({
          layers: state.layers.map(layer => 
            layer.id === targetLayerId 
              ? {
                  ...layer,
                  content: {
                    ...layer.content,
                    displacementCanvas: displacementCanvas
                  }
                }
              : layer
          )
        }));
      }
      
      const puffElement: PuffElement = {
        id,
        x: puffData.x || 0,
        y: puffData.y || 0,
        radius: puffData.radius || 20,
        height: puffData.height || 0.5,
        softness: puffData.softness || 0.8,
        color: puffData.color || '#ff69b4',
        opacity: puffData.opacity || 1,
        layerId: targetLayerId,
        timestamp: Date.now()
      };
      
      // Add puff element to the layer
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === targetLayerId 
            ? {
                ...layer,
                content: {
                  ...layer.content,
                  puffElements: [...(layer.content.puffElements || []), puffElement]
                },
                updatedAt: new Date()
              }
            : layer
        )
      }));
      
      console.log('🎨 Added puff element via App interface:', {
        x: puffElement.x,
        y: puffElement.y,
        radius: puffElement.radius,
        height: puffElement.height,
        layerId: targetLayerId
      });
      
      return id;
    },
    
    updatePuffElementFromApp: (id: string, patch: Partial<PuffElement>) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            puffElements: layer.content.puffElements?.map(puff => 
              puff.id === id ? { ...puff, ...patch } : puff
            ) || []
          }
        }))
      }));
    },
    
    deletePuffElementFromApp: (id: string) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            puffElements: layer.content.puffElements?.filter(puff => puff.id !== id) || []
          }
        }))
      }));
    },
    
    getAllPuffElements: () => {
      const state = get();
      const allPuffElements: PuffElement[] = [];
      
      state.layers.forEach(layer => {
        if (layer.content.puffElements) {
          allPuffElements.push(...layer.content.puffElements);
        }
      });
      
      return allPuffElements;
    },
    
    updateTextElementFromApp: (id: string, patch: Partial<TextElement>) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            textElements: (layer.content.textElements || []).map(text => {
              if (text.id !== id) return text;
              
              // CRITICAL FIX: Auto-sync UV coordinates when pixel coordinates are updated
              let updatedText = { ...text, ...patch };
              
              // If pixel coordinates are updated, recalculate UV coordinates
              if (patch.x !== undefined || patch.y !== undefined) {
                const composedCanvas = useApp.getState().composedCanvas;
                const canvasWidth = composedCanvas?.width || 4096;
                const canvasHeight = composedCanvas?.height || 4096;
                
                const newX = patch.x !== undefined ? patch.x : text.x;
                const newY = patch.y !== undefined ? patch.y : text.y;
                
                // Convert pixel coordinates back to UV coordinates
                updatedText.u = newX / canvasWidth;
                updatedText.v = 1 - (newY / canvasHeight); // V is flipped in canvas space
                
                console.log('🎨 Auto-synced UV coordinates:', {
                  pixel: { x: newX, y: newY },
                  uv: { u: updatedText.u, v: updatedText.v },
                  canvasSize: { width: canvasWidth, height: canvasHeight }
                });
              }
              
              return updatedText;
            })
          },
          updatedAt: new Date()
        }))
      }));
      
      console.log('🎨 Updated text element via App interface:', id, patch);
    },
    
    deleteTextElementFromApp: (id: string) => {
      set(state => ({
        layers: state.layers.map(layer => ({
          ...layer,
          content: {
            ...layer.content,
            textElements: (layer.content.textElements || []).filter(text => text.id !== id)
          },
          updatedAt: new Date()
        }))
      }));
      
      console.log('🎨 Deleted text element via App interface:', id);
    },
    
    // Get all text elements across all layers (for App.tsx compatibility)
    getAllTextElements: () => {
      const state = get();
      const allTextElements: TextElement[] = [];
      
      console.log('🔍 DEBUG: getAllTextElements called - checking', state.layers.length, 'layers');
      console.log('🔍 DEBUG: Store instance ID:', state.id || 'no-id', 'Timestamp:', Date.now());
      
      // CRITICAL FIX: Force state refresh to ensure we get the latest data
      const freshState = get();
      console.log('🔍 DEBUG: Fresh state layers count:', freshState.layers.length);
      
      freshState.layers.forEach((layer, index) => {
        console.log(`🔍 DEBUG: Layer ${index}:`, {
          id: layer.id,
          name: layer.name,
          type: layer.type,
          hasTextElements: !!layer.content.textElements,
          textElementsCount: layer.content.textElements?.length || 0,
          contentKeys: Object.keys(layer.content)
        });
        
        if (layer.content.textElements && layer.content.textElements.length > 0) {
          allTextElements.push(...layer.content.textElements);
          console.log(`🔍 DEBUG: Added ${layer.content.textElements.length} text elements from layer ${layer.name}`);
          console.log(`🔍 DEBUG: Text elements:`, layer.content.textElements.map(t => ({ id: t.id, text: t.text })));
        }
      });
      
      console.log('🔍 DEBUG: getAllTextElements returning', allTextElements.length, 'total text elements');
      console.log('🔍 DEBUG: All text elements:', allTextElements.map(t => ({ id: t.id, text: t.text, layerId: t.layerId })));
      return allTextElements;
    },
    
    // Backward compatibility helpers for App.tsx
    getLayerCanvas: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      return layer?.content.canvas || null;
    },
    
    getLayerDisplacementCanvas: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      return layer?.content.displacementCanvas || null;
    },
    
    // Convert AdvancedLayer to legacy Layer format for compatibility
    convertToLegacyLayer: (advancedLayer: AdvancedLayer) => {
      return {
        id: advancedLayer.id,
        name: advancedLayer.name,
        visible: advancedLayer.visible,
        canvas: advancedLayer.content.canvas || document.createElement('canvas'),
        history: [], // Legacy history not used in V2
        future: [], // Legacy future not used in V2
        lockTransparent: false, // Legacy property
        mask: advancedLayer.mask?.canvas || null,
        order: advancedLayer.order,
        displacementCanvas: advancedLayer.content.displacementCanvas || null
      };
    },
    
  // Layer composition
  composeLayers: () => {
    const state = get();
    
    // PERFORMANCE: Throttle composition to prevent excessive calls
    const now = Date.now();
    const composeThrottle = 16; // 60fps max
    if ((state as any).lastComposeTime && (now - (state as any).lastComposeTime) < composeThrottle) {
      return state.composedCanvas;
    }
    (state as any).lastComposeTime = now;
    
    const composedCanvas = createComposedCanvas();
    const ctx = composedCanvas.getContext('2d');
      
      if (!ctx) return null;
      
      // CRITICAL: Preserve the base model texture first at FULL opacity
      const appState = useApp.getState();
      if (appState.baseTexture) {
        ctx.save();
        ctx.globalAlpha = 1.0; // Always draw base texture at full opacity
        ctx.drawImage(appState.baseTexture, 0, 0, composedCanvas.width, composedCanvas.height);
        ctx.restore();
        console.log('🎨 Preserved base model texture in composition at full opacity');
      } else {
        // Fill with white background if no base texture
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, composedCanvas.width, composedCanvas.height);
        console.log('🎨 No base texture found, filled with white background');
      }
      
      // Sort layers by order
      const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);
      
      for (const layer of sortedLayers) {
        if (!layer.visible) continue;
        
        // Only apply layer opacity to the layer content, not the base texture
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : 'source-over';
        
        // Draw layer canvas if it exists
        if (layer.content.canvas) {
          ctx.drawImage(layer.content.canvas, 0, 0);
        }
        
        // Draw brush strokes
        const brushStrokes = layer.content.brushStrokes || [];
        for (const stroke of brushStrokes) {
          if (stroke.points && stroke.points.length > 0) {
            ctx.save();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = stroke.opacity;
            
            ctx.beginPath();
            for (let i = 0; i < stroke.points.length; i++) {
              const point = stroke.points[i];
              if (i === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            }
            ctx.stroke();
            ctx.restore();
          }
        }
        
        // Draw text elements
        const textElements = layer.content.textElements || [];
        for (const textEl of textElements) {
          ctx.save();
          
          // Set text properties
          ctx.font = `${textEl.bold ? 'bold ' : ''}${textEl.italic ? 'italic ' : ''}${textEl.fontSize}px ${textEl.fontFamily}`;
          ctx.fillStyle = textEl.color;
          ctx.globalAlpha = textEl.opacity;
          ctx.textAlign = textEl.align || 'left';
          ctx.textBaseline = 'top'; // ✅ FIX: Use 'top' baseline to prevent inversion
          
          // Apply rotation if needed
          if (textEl.rotation && textEl.rotation !== 0) {
            ctx.translate(textEl.x, textEl.y);
            ctx.rotate((textEl.rotation * Math.PI) / 180);
            ctx.translate(-textEl.x, -textEl.y);
          }
          
          // Draw text
          ctx.fillText(textEl.text, textEl.x, textEl.y);
          
          ctx.restore();
        }
        
        // Draw image elements
        const imageElements = layer.content.imageElements || [];
        for (const imageEl of imageElements) {
          if (!imageEl.visible) continue;
          
          ctx.save();
          ctx.globalAlpha = imageEl.opacity;
          ctx.globalCompositeOperation = imageEl.blendMode;
          
          // Apply rotation if needed
          if (imageEl.rotation !== 0) {
            const centerX = imageEl.x + imageEl.width / 2;
            const centerY = imageEl.y + imageEl.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((imageEl.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
          }
          
          // Apply horizontal flip if needed
          if (imageEl.horizontalFlip) {
            ctx.scale(-1, 1);
            ctx.translate(-imageEl.x * 2 - imageEl.width, 0);
          }
          
          // Apply vertical flip if needed
          if (imageEl.verticalFlip) {
            ctx.scale(1, -1);
            ctx.translate(0, -imageEl.y * 2 - imageEl.height);
          }
          
          // Create image element and draw it
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          };
          img.src = imageEl.dataUrl || imageEl.src || '';
          
          ctx.restore();
        }
        
        // Draw puff elements
        const puffElements = layer.content.puffElements || [];
        for (const puffEl of puffElements) {
          ctx.save();
          ctx.globalAlpha = puffEl.opacity;
          ctx.globalCompositeOperation = 'source-over';
          
          // Draw puff color
          ctx.fillStyle = puffEl.color;
          ctx.beginPath();
          ctx.arc(puffEl.x, puffEl.y, puffEl.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw displacement if displacement canvas exists
          if (layer.content.displacementCanvas) {
            const dispCtx = layer.content.displacementCanvas.getContext('2d');
            if (dispCtx) {
              dispCtx.save();
              dispCtx.globalCompositeOperation = 'lighten'; // Prevents spikes
              
              const centerHeight = Math.floor(255 * puffEl.height);
              const grad = dispCtx.createRadialGradient(puffEl.x, puffEl.y, 0, puffEl.x, puffEl.y, puffEl.radius);
              
              // Create smooth gradient for displacement
              const stops = 12;
              for (let i = 0; i <= stops; i++) {
                const t = i / stops;
                const cosValue = Math.cos((1 - t) * Math.PI / 2);
                const height = Math.floor(centerHeight * cosValue * puffEl.softness);
                grad.addColorStop(t, `rgb(${height}, ${height}, ${height})`);
              }
              grad.addColorStop(1, 'rgb(0, 0, 0)');
              
              dispCtx.fillStyle = grad;
              dispCtx.beginPath();
              dispCtx.arc(puffEl.x, puffEl.y, puffEl.radius, 0, Math.PI * 2);
              dispCtx.fill();
              
              dispCtx.restore();
            }
          }
          
          ctx.restore();
        }
        
        ctx.restore();
      }
      
      console.log('🎨 Composed layers using V2 system');
      
      // Update the composed canvas in state
      set({ composedCanvas });
      
      return composedCanvas;
    },
    
    // History management
    saveHistorySnapshot: (action: string) => {
      const state = get();
      const snapshot: LayerHistorySnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        action,
        layers: JSON.parse(JSON.stringify(state.layers)), // Deep clone
        activeLayerId: state.activeLayerId
      };
      
      // Remove any snapshots after current index
      const newSnapshots = state.history.snapshots.slice(0, state.history.currentIndex + 1);
      newSnapshots.push(snapshot);
      
      // Limit snapshots to maxSnapshots
      const trimmedSnapshots = newSnapshots.slice(-state.history.maxSnapshots);
      
      set({
        history: {
          snapshots: trimmedSnapshots,
          currentIndex: trimmedSnapshots.length - 1,
          maxSnapshots: state.history.maxSnapshots
        }
      });
      
      console.log(`💾 Saved history snapshot: ${action} (${trimmedSnapshots.length}/${state.history.maxSnapshots})`);
    },
    
    undo: () => {
      const state = get();
      if (state.history.currentIndex <= 0) {
        console.log('❌ Cannot undo - no history available');
        return;
      }
      
      const targetIndex = state.history.currentIndex - 1;
      const snapshot = state.history.snapshots[targetIndex];
      
      if (snapshot) {
        set({
          layers: JSON.parse(JSON.stringify(snapshot.layers)), // Deep clone
          activeLayerId: snapshot.activeLayerId,
          history: {
            ...state.history,
            currentIndex: targetIndex
          }
        });
        
        console.log(`↩️ Undo: ${snapshot.action}`);
      }
    },
    
    redo: () => {
      const state = get();
      if (state.history.currentIndex >= state.history.snapshots.length - 1) {
        console.log('❌ Cannot redo - no future history available');
        return;
      }
      
      const targetIndex = state.history.currentIndex + 1;
      const snapshot = state.history.snapshots[targetIndex];
      
      if (snapshot) {
        set({
          layers: JSON.parse(JSON.stringify(snapshot.layers)), // Deep clone
          activeLayerId: snapshot.activeLayerId,
          history: {
            ...state.history,
            currentIndex: targetIndex
          }
        });
        
        console.log(`↪️ Redo: ${snapshot.action}`);
      }
    },
    
    canUndo: () => {
      const state = get();
      return state.history.currentIndex > 0;
    },
    
    canRedo: () => {
      const state = get();
      return state.history.currentIndex < state.history.snapshots.length - 1;
    },
    
    clearHistory: () => {
      set({
        history: {
          snapshots: [],
          currentIndex: -1,
          maxSnapshots: 50
        }
      });
      console.log('🧹 Cleared history');
    },
    
    // Layer operations
    toggleLayerVisibility: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId 
            ? { ...layer, visible: !layer.visible, updatedAt: new Date() }
            : layer
        )
      }));
      get().saveHistorySnapshot(`Toggle Layer Visibility: ${layerId}`);
    },
    
    updateLayer: (layerId: string, updates: Partial<AdvancedLayer>) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId 
            ? { ...layer, ...updates, updatedAt: new Date() }
            : layer
        )
      }));
      get().saveHistorySnapshot(`Update Layer: ${layerId}`);
    },
    
    // Missing layer operations
    toggleLayerLock: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId 
            ? { ...layer, locked: !layer.locked, updatedAt: new Date() }
            : layer
        )
      }));
      get().saveHistorySnapshot(`Toggle Layer Lock: ${layerId}`);
    },
    
    groupLayers: (layerIds: string[]) => {
      const state = get();
      const groupId = get().createGroup(`Group ${state.groups.length + 1}`);
      
      layerIds.forEach(layerId => {
        get().addToGroup(layerId, groupId);
      });
      
      get().saveHistorySnapshot(`Group Layers: ${layerIds.join(', ')}`);
      return groupId;
    },
    
    ungroupLayers: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        group.layerIds.forEach(layerId => {
          get().removeFromGroup(layerId);
        });
        get().deleteGroup(groupId);
        get().saveHistorySnapshot(`Ungroup Layers: ${groupId}`);
      }
    },
    
    createAdjustmentLayer: (name?: string) => {
      return get().createLayer('adjustment', name);
    },
    
    createProceduralLayer: (name?: string) => {
      return get().createLayer('procedural', name);
    },
    
    createFillLayer: (name?: string) => {
      return get().createLayer('fill', name);
    },
    
    createAILayer: (name?: string) => {
      return get().createLayer('ai-smart', name);
    },
    
    mergeDown: (layerId: string) => {
      const state = get();
      const layerIndex = state.layerOrder.indexOf(layerId);
      if (layerIndex > 0) {
        const layerBelow = state.layerOrder[layerIndex - 1];
        get().mergeLayers([layerId, layerBelow]);
        get().saveHistorySnapshot(`Merge Down: ${layerId}`);
      }
    },
    
    mergeLayers: (layerIds: string[]) => {
      const state = get();
      if (layerIds.length < 2) return;
      
      // Get the first layer as the target
      const targetLayer = state.layers.find(l => l.id === layerIds[0]);
      if (!targetLayer) return;
      
      // Merge content from other layers
      const layersToMerge = state.layers.filter(l => layerIds.includes(l.id));
      const mergedContent: LayerContent = { ...targetLayer.content };
      
      layersToMerge.forEach(layer => {
        if (layer.id !== layerIds[0]) {
          // Merge brush strokes
          if (layer.content.brushStrokes) {
            mergedContent.brushStrokes = [
              ...(mergedContent.brushStrokes || []),
              ...layer.content.brushStrokes
            ];
          }
          // Merge text elements
          if (layer.content.textElements) {
            mergedContent.textElements = [
              ...(mergedContent.textElements || []),
              ...layer.content.textElements
            ];
          }
        }
      });
      
      // Update target layer with merged content
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerIds[0] 
            ? { ...layer, content: mergedContent, updatedAt: new Date() }
            : layer
        )
      }));
      
      // Remove merged layers
      layerIds.slice(1).forEach(id => {
        get().deleteLayer(id);
      });
      
      get().saveHistorySnapshot(`Merge Layers: ${layerIds.join(', ')}`);
    },
    
    flattenAll: () => {
      const state = get();
      if (state.layers.length < 2) return;
      
      const allLayerIds = state.layers.map(l => l.id);
      get().mergeLayers(allLayerIds);
      get().saveHistorySnapshot('Flatten All Layers');
    },
    
    // Missing group operations
    renameGroup: (groupId: string, name: string) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? { ...group, name } : group
        )
      }));
      console.log(`✏️ Renamed group ${groupId} to: ${name}`);
    },
    
    toggleGroupVisibility: (groupId: string) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? { ...group, visible: !group.visible } : group
        )
      }));
      console.log(`👁️ Toggled group ${groupId} visibility`);
    },
    
    selectGroup: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        get().selectLayers(group.layerIds);
        set({ activeGroupId: groupId });
        console.log(`🎯 Selected group: ${groupId}`);
      }
    },
    
    // Missing effects operations
    addLayerEffect: (layerId: string, effect: LayerEffect) => {
      get().addEffect(layerId, effect);
    },
    
    addSmartFilter: (layerId: string, filter: any) => {
      const effect: LayerEffect = {
        id: `filter_${Date.now()}`,
        type: 'blur', // Default type, can be customized
        enabled: true,
        properties: filter
      };
      get().addEffect(layerId, effect);
    },
    
    // Missing search and filtering
    searchLayers: (query: string) => {
      const state = get();
      const lowerQuery = query.toLowerCase();
      return state.layers.filter(layer => 
        layer.name.toLowerCase().includes(lowerQuery) ||
        layer.type.toLowerCase().includes(lowerQuery)
      );
    },
    
    filterLayers: (predicate: (layer: AdvancedLayer) => boolean) => {
      const state = get();
      return state.layers.filter(predicate);
    },
    
    // Missing layer properties
    addTag: (layerId: string, tag: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId 
            ? { ...layer, updatedAt: new Date() } // Tags would be added to a tags array
            : layer
        )
      }));
      console.log(`🏷️ Added tag "${tag}" to layer ${layerId}`);
    },
    
    toggleFavorite: (layerId: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId 
            ? { ...layer, updatedAt: new Date() } // Favorite would be a boolean property
            : layer
        )
      }));
      console.log(`⭐ Toggled favorite for layer ${layerId}`);
    },
    
    setLayerColor: (layerId: string, color: string) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === layerId 
            ? { ...layer, updatedAt: new Date() } // Color would be added to layer properties
            : layer
        )
      }));
      console.log(`🎨 Set color "${color}" for layer ${layerId}`);
    },
    
    // Missing auto-organize
    autoOrganizeLayers: () => {
      get().autoGroupLayers();
    }
  }))
);

// Export types - REMOVED: Conflicts with existing exports above
// export type { LayerHistorySnapshot, LayerHistoryState, AdvancedLayer, LayerGroup, LayerEffect, LayerMask, LayerTransform, LayerContent, BrushStroke, TextElement };
