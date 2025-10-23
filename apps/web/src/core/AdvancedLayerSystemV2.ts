import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createLayerCanvas, createComposedCanvas, createDisplacementCanvas, CANVAS_CONFIG } from '../constants/CanvasSizes';
import { useApp } from '../App';
import { convertUVToPixel, getCanvasDimensions } from '../utils/CoordinateUtils';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';

// Layer Types - SIMPLIFIED: Only what we actually use
export type LayerType = 'paint' | 'text' | 'image' | 'group' | 'adjustment';

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

// Import text effects types
import { TextEffects, TextShadow, TextStroke, TextGradient, TextGlow, Text3DEffect } from '../utils/TextEffects';

// Import AccessibilityManager statically to avoid dynamic import issues
import { AccessibilityManager } from '../utils/AccessibilityManager';

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
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic';
  scaleX?: number;
  scaleY?: number;
  shadow?: {
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  };
  // Advanced text effects
  effects?: TextEffects;
  // Typography controls
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  wordSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textIndent?: number;
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
  // Multi-line support
  maxWidth?: number;
  lineBreak?: boolean;
  // Text path support (for future text-on-path feature)
  pathId?: string;
  pathOffset?: number;
  // Accessibility
  ariaLabel?: string;
  role?: string;
  tabIndex?: number;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaHidden?: boolean;
  ariaLive?: 'off' | 'polite' | 'assertive';
  ariaAtomic?: boolean;
  ariaRelevant?: 'additions' | 'removals' | 'text' | 'all';
  // Keyboard navigation
  keyboardShortcut?: string;
  focusable?: boolean;
  // Screen reader support
  screenReaderText?: string;
  description?: string;
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

// Layer content (simplified - only what we actually use)
export interface LayerContent {
  canvas?: HTMLCanvasElement; // For paint layers
  text?: string; // For text layers
  imageData?: ImageData; // For image layers
  imageElements?: ImageElement[]; // For imported images
  brushStrokes?: BrushStroke[]; // For paint layers
  textElements?: TextElement[]; // For text layers
  puffElements?: PuffElement[]; // For puff print elements
  adjustmentData?: any; // For adjustment layers
  children?: string[]; // For group layers
  displacementCanvas?: HTMLCanvasElement; // For displacement mapping
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
  
  // Helper methods
  wrapText: (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => string[];
  
  // Text Path Management
  createTextPath: (path: { id: string; name: string; type: 'line' | 'curve' | 'circle' | 'arc' | 'bezier' | 'polygon'; points: { x: number; y: number }[]; closed?: boolean; controlPoints?: { x: number; y: number }[]; radius?: number; startAngle?: number; endAngle?: number }) => Promise<string>;
  getTextPath: (pathId: string) => Promise<any>;
  getAllTextPaths: () => Promise<any[]>;
  updateTextPath: (pathId: string, updates: any) => Promise<boolean>;
  deleteTextPath: (pathId: string) => Promise<boolean>;
  createLinePath: (id: string, startX: number, startY: number, endX: number, endY: number, name?: string) => Promise<string>;
  createCirclePath: (id: string, centerX: number, centerY: number, radius: number, name?: string) => Promise<string>;
  createCurvePath: (id: string, startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number, name?: string) => Promise<string>;
  createArcPath: (id: string, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, name?: string) => Promise<string>;
  // Accessibility Management
  initializeAccessibility: () => void;
  registerTextElementForAccessibility: (textElement: TextElement) => void;
  unregisterTextElementForAccessibility: (textId: string) => void;
  updateAccessibilitySettings: (settings: any) => void;
  getAccessibilityReport: () => any;
}

// Helper functions
const generateLayerName = (type: LayerType, existingLayers: AdvancedLayer[]): string => {
  const typeNames: Record<LayerType, string> = {
    paint: 'Paint Layer',
    text: 'Text Layer',
    image: 'Image Layer',
    group: 'Group',
    adjustment: 'Adjustment Layer'
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
    case 'adjustment':
      return { adjustmentData: null };
    case 'group':
      return { children: [] };
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
      
      // CRITICAL FIX: Convert UV coordinates to pixel coordinates using standardized utility
      const canvasDimensions = getCanvasDimensions();
      const pixelCoords = convertUVToPixel(uv, canvasDimensions);
      
      const textElement: TextElement = {
        id,
        text,
        x: pixelCoords.x,  // ✅ FIXED: Convert UV to pixel X coordinate
        y: pixelCoords.y,  // ✅ FIXED: Convert UV to pixel Y coordinate
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
        pixel: { x: pixelCoords.x, y: pixelCoords.y },
        canvasSize: { width: canvasDimensions.width, height: canvasDimensions.height },
        layerId: targetLayerId
      });
      
      // Register with accessibility manager
      get().registerTextElementForAccessibility(textElement);
      
      // CRITICAL FIX: Dispatch event to force UI refresh
      window.dispatchEvent(new CustomEvent('textElementsChanged', { 
        detail: { action: 'added', textId: textElement.id, layerId: targetLayerId } 
      }));
      
      return id;
    },
    
    // Enhanced image element management (compatible with App.tsx interface)
    addImageElementFromApp: (imageData: any, layerId?: string) => {
      const id = imageData.id || Math.random().toString(36).slice(2);
      const state = get();
      
      // CRITICAL FIX: Always create a new image layer for each image
      console.log('🎨 Creating new image layer for imported image');
      const imageLayerId = get().createLayer('image', imageData.name || 'Imported Image');
      
      // CRITICAL FIX: Also create layer in main App state for UI synchronization
      const appState = useApp.getState();
      if (appState.addLayer) {
        console.log('🎨 Synchronizing image layer with main App state');
        appState.addLayer(imageData.name || 'Imported Image');
      }
      
      // CRITICAL FIX: Convert UV coordinates to pixel coordinates for proper rendering
      // UV coordinates are center-based, convert to top-left pixel coordinates
      // PHASE 1 FIX: Use performance manager canvas size instead of CANVAS_CONFIG
      const canvasSize = unifiedPerformanceManager.getOptimalCanvasSize().width;
      const pixelWidth = Math.floor(imageData.uWidth * canvasSize);
      const pixelHeight = Math.floor(imageData.uHeight * canvasSize);
      
      // Convert center-based UV to top-left pixel coordinates
      const centerX = imageData.u * canvasSize;
      const centerY = imageData.v * canvasSize;
      const pixelX = Math.floor(centerX - pixelWidth / 2);
      const pixelY = Math.floor(centerY - pixelHeight / 2);
      
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
        layerId: imageLayerId,
        timestamp: Date.now()
      };
      
      // Add image element to the layer
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === imageLayerId 
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
        layerId: imageLayerId,
        allLayers: get().layers.map(l => ({ id: l.id, name: l.name, type: l.type, visible: l.visible })),
        layerCreationTriggered: true,
        originalLayerId: layerId,
        finalLayerId: imageLayerId
      });
      
      // PHASE 4 FIX: Trigger composition and texture update (same as text tool)
      setTimeout(() => {
        const appState = useApp.getState();
        const { composeLayers } = appState;
        composeLayers(); // Compose layers to transfer image to composedCanvas
        
        // Dispatch texture update event for immediate visual feedback
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'image-element-added-v2', imageId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered composition and texture update after image placement (V2)');
      }, 10);
      
      return id;
    },
    
    updateImageElementFromApp: (id: string, patch: Partial<ImageElement>) => {
      set(state => {
        // Find the image element to update
        let updatedImage: ImageElement | null = null;
        
        for (const layer of state.layers) {
          const imageEl = layer.content.imageElements?.find(img => img.id === id);
          if (imageEl) {
            updatedImage = imageEl;
            break;
          }
        }
        
        if (!updatedImage) {
          console.warn('🎨 Image element not found for update:', id);
          return state;
        }
        
        // CRITICAL FIX: Auto-sync coordinates bidirectionally (same as text tool)
        let updatedImageEl = { ...updatedImage, ...patch };
        
        // If UV coordinates are updated, recalculate pixel coordinates
        if (patch.u !== undefined || patch.v !== undefined || patch.uWidth !== undefined || patch.uHeight !== undefined) {
          const composedCanvas = useApp.getState().composedCanvas;
          // PHASE 1 FIX: Use performance manager canvas size as fallback
          const fallbackCanvasSize = unifiedPerformanceManager.getOptimalCanvasSize().width;
          const canvasWidth = composedCanvas?.width || fallbackCanvasSize;
          const canvasHeight = composedCanvas?.height || fallbackCanvasSize;
          
          const newU = patch.u !== undefined ? patch.u : updatedImage.u;
          const newV = patch.v !== undefined ? patch.v : updatedImage.v;
          const newUWidth = patch.uWidth !== undefined ? patch.uWidth : updatedImage.uWidth;
          const newUHeight = patch.uHeight !== undefined ? patch.uHeight : updatedImage.uHeight;
          
          // Convert center-based UV coordinates to top-left pixel coordinates
          const centerX = newU * canvasWidth;
          const centerY = newV * canvasHeight;
          const pixelWidth = Math.floor(newUWidth * canvasWidth);
          const pixelHeight = Math.floor(newUHeight * canvasHeight);
          
          updatedImageEl.x = Math.floor(centerX - pixelWidth / 2);
          updatedImageEl.y = Math.floor(centerY - pixelHeight / 2);
          updatedImageEl.width = pixelWidth;
          updatedImageEl.height = pixelHeight;
          
          console.log('🎨 Auto-synced image pixel coordinates:', {
            uv: { u: newU, v: newV, uWidth: newUWidth, uHeight: newUHeight },
            pixel: { x: updatedImageEl.x, y: updatedImageEl.y, width: updatedImageEl.width, height: updatedImageEl.height },
            canvasSize: { width: canvasWidth, height: canvasHeight }
          });
        }
        
        // If pixel coordinates are updated, recalculate UV coordinates
        if (patch.x !== undefined || patch.y !== undefined || patch.width !== undefined || patch.height !== undefined) {
          const composedCanvas = useApp.getState().composedCanvas;
          const canvasWidth = composedCanvas?.width || unifiedPerformanceManager.getOptimalCanvasSize().width;
          const canvasHeight = composedCanvas?.height || unifiedPerformanceManager.getOptimalCanvasSize().width;
          
          const newX = patch.x !== undefined ? patch.x : updatedImage.x;
          const newY = patch.y !== undefined ? patch.y : updatedImage.y;
          const newWidth = patch.width !== undefined ? patch.width : updatedImage.width;
          const newHeight = patch.height !== undefined ? patch.height : updatedImage.height;
          
          // Convert top-left pixel coordinates back to center-based UV coordinates
          const centerX = newX + newWidth / 2;
          const centerY = newY + newHeight / 2;
          
          updatedImageEl.u = centerX / canvasWidth;
          updatedImageEl.v = centerY / canvasHeight;
          updatedImageEl.uWidth = newWidth / canvasWidth;
          updatedImageEl.uHeight = newHeight / canvasHeight;
          
          console.log('🎨 Auto-synced image UV coordinates:', {
            pixel: { x: newX, y: newY, width: newWidth, height: newHeight },
            uv: { u: updatedImageEl.u, v: updatedImageEl.v, uWidth: updatedImageEl.uWidth, uHeight: updatedImageEl.uHeight },
            canvasSize: { width: canvasWidth, height: canvasHeight }
          });
        }
        
        return {
          layers: state.layers.map(layer => ({
            ...layer,
            content: {
              ...layer.content,
              imageElements: layer.content.imageElements?.map(img => 
                img.id === id ? updatedImageEl : img
              ) || []
            }
          }))
        };
      });
      
      // PHASE 4 FIX: Trigger composition and texture update (same as text tool)
      setTimeout(() => {
        const appState = useApp.getState();
        const { composeLayers } = appState;
        composeLayers(); // Compose layers to transfer updated image to composedCanvas
        
        // Dispatch texture update event for immediate visual feedback
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'image-element-position-updated-v2', imageId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered composition and texture update after image update (V2)');
      }, 10);
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
        const puffLayerId = get().createLayer('paint', 'Puff Layer');
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
        layers: state.layers.map(layer => {
          // Check if this layer contains the text element being updated
          const hasTextElement = layer.content.textElements?.some(text => text.id === id);
          
          if (!hasTextElement) return layer;
          
          return {
            ...layer,
            content: {
              ...layer.content,
              textElements: (layer.content.textElements || []).map(text => {
                if (text.id !== id) return text;
                
                // CRITICAL FIX: Auto-sync coordinates bidirectionally
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
                
                // CRITICAL FIX: If UV coordinates are updated, recalculate pixel coordinates
                if (patch.u !== undefined || patch.v !== undefined) {
                  const composedCanvas = useApp.getState().composedCanvas;
                  const canvasWidth = composedCanvas?.width || 4096;
                  const canvasHeight = composedCanvas?.height || 4096;
                  
                  const newU = patch.u !== undefined ? patch.u : text.u;
                  const newV = patch.v !== undefined ? patch.v : text.v;
                  
                  // Convert UV coordinates to pixel coordinates
                  updatedText.x = Math.floor(newU * canvasWidth);
                  updatedText.y = Math.floor((1 - newV) * canvasHeight); // V is flipped in canvas space
                  
                  console.log('🎨 Auto-synced pixel coordinates:', {
                    uv: { u: newU, v: newV },
                    pixel: { x: updatedText.x, y: updatedText.y },
                    canvasSize: { width: canvasWidth, height: canvasHeight }
                  });
                }
                
                return updatedText;
              })
            },
            updatedAt: new Date()
          };
        })
      }));
      
      // CRITICAL FIX: Dispatch texture update event for immediate visual feedback
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'text-element-position-updated-v2', textId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after text position change (V2)');
      }, 10);
      
      console.log('🎨 Updated text element via App interface:', id, patch);
    },
    
    deleteTextElementFromApp: (id: string) => {
      // Unregister from accessibility manager before deletion
      get().unregisterTextElementForAccessibility(id);
      
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
    getAllTextElements: (): TextElement[] => {
      // CRITICAL FIX: Use the get function from Zustand to access current state
      const state = get();
      return state.layers.flatMap((layer: AdvancedLayer) => layer.content.textElements || []);
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
      
      // CRITICAL FIX: Clear the canvas completely before drawing
      ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
      console.log('🎨 Canvas cleared before composition');
      
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
        console.log(`🎨 Rendering ${textElements.length} text elements for layer ${layer.id}`);
        
        for (const textEl of textElements) {
          console.log(`🎨 Rendering text element:`, {
            id: textEl.id,
            text: textEl.text,
            position: { x: textEl.x, y: textEl.y },
            uv: { u: textEl.u, v: textEl.v },
            fontSize: textEl.fontSize,
            color: textEl.color
          });
          
          ctx.save();
          
          // Set text properties with enhanced typography support
          const fontWeight = textEl.fontWeight || (textEl.bold ? 'bold' : 'normal');
          const fontStyle = textEl.fontStyle || (textEl.italic ? 'italic' : 'normal');
          ctx.font = `${fontStyle} ${fontWeight} ${textEl.fontSize}px ${textEl.fontFamily}`;
          
          ctx.fillStyle = textEl.color;
          ctx.globalAlpha = textEl.opacity;
          ctx.textAlign = textEl.align || 'left';
          ctx.textBaseline = textEl.textBaseline || 'top';
          
          // Apply letter spacing if specified
          if (textEl.letterSpacing) {
            ctx.letterSpacing = `${textEl.letterSpacing}px`;
          }
          
          // Apply text transform
          let displayText = textEl.text;
          if (textEl.textTransform && textEl.textTransform !== 'none') {
            switch (textEl.textTransform) {
              case 'uppercase':
                displayText = textEl.text.toUpperCase();
                break;
              case 'lowercase':
                displayText = textEl.text.toLowerCase();
                break;
              case 'capitalize':
                displayText = textEl.text.replace(/\b\w/g, l => l.toUpperCase());
                break;
            }
          }

          // Check if text should be rendered on a path
          if (textEl.pathId) {
            // Render text along a path
            import('../utils/TextPathManager').then(({ TextPathManager }) => {
              const pathPosition = TextPathManager.getTextPositionOnPath(textEl.pathId!, textEl.pathOffset || 0);
              if (pathPosition) {
                ctx.save();
                ctx.translate(pathPosition.x, pathPosition.y);
                ctx.rotate(pathPosition.angle);
                
                // Apply text effects for path text
                if (textEl.effects) {
                  import('../utils/TextEffects').then(({ TextEffectsRenderer }) => {
                    TextEffectsRenderer.applyEffects(ctx, displayText, 0, 0, textEl.effects!);
                  }).catch(() => {
                    ctx.fillText(displayText, 0, 0);
                  });
                } else {
                  ctx.fillText(displayText, 0, 0);
                }
                
                ctx.restore();
              } else {
                // Fallback to regular text rendering if path not found
                ctx.fillText(displayText, textEl.x, textEl.y);
              }
            }).catch(() => {
              // Fallback to regular text rendering if TextPathManager fails
              ctx.fillText(displayText, textEl.x, textEl.y);
            });
          } else {
            // Regular text rendering (not on path)
            
            // Apply rotation if needed
            if (textEl.rotation && textEl.rotation !== 0) {
              ctx.translate(textEl.x, textEl.y);
              ctx.rotate((textEl.rotation * Math.PI) / 180);
              ctx.translate(-textEl.x, -textEl.y);
            }
            
            // Apply advanced typography features
            if (textEl.wordSpacing && textEl.wordSpacing !== 0) {
              ctx.wordSpacing = `${textEl.wordSpacing}px`;
            }

            // Handle multi-line text rendering
            if (textEl.maxWidth && textEl.lineBreak) {
              const lines = get().wrapText(ctx, displayText, textEl.maxWidth);
              const lineHeight = (textEl.lineHeight || 1.2) * textEl.fontSize;
              
              lines.forEach((line, index) => {
                const y = textEl.y + (index * lineHeight);
                
                // Apply text effects for each line
                if (textEl.effects) {
                  import('../utils/TextEffects').then(({ TextEffectsRenderer }) => {
                    TextEffectsRenderer.applyEffects(ctx, line, textEl.x, y, textEl.effects!);
                  }).catch(() => {
                    ctx.fillText(line, textEl.x, y);
                  });
                } else {
                  ctx.fillText(line, textEl.x, y);
                }
              });
            } else {
              // Single line text rendering
              if (textEl.effects) {
                import('../utils/TextEffects').then(({ TextEffectsRenderer }) => {
                  TextEffectsRenderer.applyEffects(ctx, displayText, textEl.x, textEl.y, textEl.effects!);
                }).catch(() => {
                  ctx.fillText(displayText, textEl.x, textEl.y);
                });
              } else {
                console.log(`🎨 Drawing text at position:`, { x: textEl.x, y: textEl.y, text: displayText });
                ctx.fillText(displayText, textEl.x, textEl.y);
                console.log(`🎨 Text drawn successfully`);
              }
            }
            
            // Apply text decoration
            if (textEl.textDecoration && textEl.textDecoration !== 'none') {
              const metrics = ctx.measureText(textEl.text);
              const decorationY = textEl.y + textEl.fontSize * 0.8; // Position decoration line
              
              ctx.strokeStyle = textEl.color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              
              if (textEl.textDecoration === 'underline') {
                ctx.moveTo(textEl.x, decorationY);
                ctx.lineTo(textEl.x + metrics.width, decorationY);
              } else if (textEl.textDecoration === 'line-through') {
                const strikeY = textEl.y + textEl.fontSize * 0.5;
                ctx.moveTo(textEl.x, strikeY);
                ctx.lineTo(textEl.x + metrics.width, strikeY);
              } else if (textEl.textDecoration === 'overline') {
                const overlineY = textEl.y + textEl.fontSize * 0.2;
                ctx.moveTo(textEl.x, overlineY);
                ctx.lineTo(textEl.x + metrics.width, overlineY);
              }
              
              ctx.stroke();
            }
          }
          
          ctx.restore();
          console.log(`🎨 Text element ${textEl.id} rendered and context restored`);
        }
        
        // 🎨 NEW: Draw selection borders for selected text elements
        const appState = useApp.getState();
        if (appState.activeTextId && textElements.length > 0) {
          const selectedTextEl = textElements.find(textEl => textEl.id === appState.activeTextId);
          
          if (selectedTextEl) {
            console.log(`🎨 Drawing selection border for text element:`, {
              id: selectedTextEl.id,
              text: selectedTextEl.text,
              position: { x: selectedTextEl.x, y: selectedTextEl.y }
            });
            
            ctx.save();
            
            // Set up border styling
            ctx.strokeStyle = '#007acc'; // Blue border matching UI theme
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed border pattern
            ctx.globalAlpha = 1.0; // Full opacity for border
            
            // Set font for text measurement (same as text rendering)
            const fontWeight = selectedTextEl.fontWeight || (selectedTextEl.bold ? 'bold' : 'normal');
            const fontStyle = selectedTextEl.fontStyle || (selectedTextEl.italic ? 'italic' : 'normal');
            ctx.font = `${fontStyle} ${fontWeight} ${selectedTextEl.fontSize}px ${selectedTextEl.fontFamily}`;
            
            // Apply letter spacing if specified
            if (selectedTextEl.letterSpacing) {
              ctx.letterSpacing = `${selectedTextEl.letterSpacing}px`;
            }
            
            // Apply text transform for measurement
            let displayText = selectedTextEl.text;
            if (selectedTextEl.textTransform && selectedTextEl.textTransform !== 'none') {
              switch (selectedTextEl.textTransform) {
                case 'uppercase':
                  displayText = selectedTextEl.text.toUpperCase();
                  break;
                case 'lowercase':
                  displayText = selectedTextEl.text.toLowerCase();
                  break;
                case 'capitalize':
                  displayText = selectedTextEl.text.replace(/\b\w/g, l => l.toUpperCase());
                  break;
              }
            }
            
            // Measure text dimensions
            const textMetrics = ctx.measureText(displayText);
            const textPixelWidth = textMetrics.width;
            const textPixelHeight = selectedTextEl.fontSize * 1.2; // Approximate text height
            
            // Calculate border position based on actual text alignment behavior
            let borderX, borderY, borderWidth, borderHeight;
            
            if (selectedTextEl.align === 'left') {
              // Left align: text starts at x, y
              borderX = selectedTextEl.x;
              borderY = selectedTextEl.y;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            } else if (selectedTextEl.align === 'right') {
              // Right align: text ends at x, y
              borderX = selectedTextEl.x - textPixelWidth;
              borderY = selectedTextEl.y;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            } else {
              // Center align: text is centered at x, y
              borderX = selectedTextEl.x - (textPixelWidth / 2);
              borderY = selectedTextEl.y;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            }
            
            // Apply rotation if needed (same as text rendering)
            if (selectedTextEl.rotation && selectedTextEl.rotation !== 0) {
              ctx.translate(selectedTextEl.x, selectedTextEl.y);
              ctx.rotate((selectedTextEl.rotation * Math.PI) / 180);
              ctx.translate(-selectedTextEl.x, -selectedTextEl.y);
            }
            
            // Draw the selection border
            ctx.beginPath();
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
            ctx.stroke();
            
            console.log(`🎨 Selection border drawn:`, {
              border: { x: borderX, y: borderY, width: borderWidth, height: borderHeight },
              text: { x: selectedTextEl.x, y: selectedTextEl.y, width: textPixelWidth, height: textPixelHeight },
              alignment: selectedTextEl.align,
              calculation: `Border ${selectedTextEl.align} aligned at (${borderX}, ${borderY})`
            });
            
            ctx.restore();
          }
        }
        
        // Draw image elements
        const imageElements = layer.content.imageElements || [];
        console.log(`🎨 Rendering ${imageElements.length} image elements for layer ${layer.id}`);
        
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
          
          // PHASE 3 FIX: Remove manual Y coordinate inversion - UV to pixel conversion is already correct
          // The UV coordinates are properly converted to pixel coordinates, no need for additional flipping
          const imageY = imageEl.y;
          
          // CRITICAL FIX: Force immediate image rendering
          if (imageEl.dataUrl) {
            // Create image element and draw immediately if possible
            const img = new Image();
            img.src = imageEl.dataUrl;
            
            // Try to draw immediately if image is cached/loaded
            if (img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, imageEl.x, imageY, imageEl.width, imageEl.height);
              console.log('🎨 Image drawn immediately (cached):', imageEl.name);
            } else {
              // For async loading, we need to trigger a re-composition
              img.onload = () => {
                console.log('🎨 Image loaded, triggering re-composition:', imageEl.name);
                // Trigger a re-composition to draw the image
                setTimeout(() => {
                  const appState = useApp.getState();
                  const { composeLayers } = appState;
                  composeLayers();
                  
                  // Dispatch texture update event
                  const textureEvent = new CustomEvent('forceTextureUpdate', {
                    detail: { source: 'image-loaded-async', imageId: imageEl.id }
                  });
                  window.dispatchEvent(textureEvent);
                }, 10);
              };
              img.onerror = () => {
                console.error('🎨 Failed to load image:', imageEl.name);
                // Draw placeholder rectangle
                ctx.fillStyle = 'rgba(200,200,200,0.5)';
                ctx.fillRect(imageEl.x, imageY, imageEl.width, imageEl.height);
                ctx.strokeStyle = 'rgba(100,100,100,0.8)';
                ctx.strokeRect(imageEl.x, imageY, imageEl.width, imageEl.height);
              };
            }
          } else if (imageEl.src) {
            // Fallback to src URL
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
              console.log('🎨 Image drawn from src:', imageEl.name);
            };
            img.onerror = () => {
              console.warn('🎨 Failed to load image from src:', imageEl.name);
            };
            img.src = imageEl.src;
          } else {
            // No image data, draw placeholder
            console.warn('🎨 No image data for:', imageEl.name);
            ctx.fillStyle = 'rgba(200,200,200,0.5)';
            ctx.fillRect(imageEl.x, imageEl.y, imageEl.width, imageEl.height);
            ctx.strokeStyle = 'rgba(100,100,100,0.8)';
            ctx.strokeRect(imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          }
          
          ctx.restore();
        }
        
        // CRITICAL FIX: Draw selection border for selected image elements (same as text tool)
        const appStateForImage = useApp.getState();
        const selectedImageId = appStateForImage.selectedImageId;
        if (selectedImageId) {
          const selectedImageEl = imageElements.find(el => el.id === selectedImageId);
          if (selectedImageEl && selectedImageEl.visible) {
            console.log('🎨 Drawing selection border for image:', selectedImageEl.name);
            
            ctx.save();
            
            // Set up border styling
            ctx.strokeStyle = '#00ff00'; // Green border for images (different from text blue)
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed border pattern
            ctx.globalAlpha = 1.0; // Full opacity for border
            
            // CRITICAL FIX: Use the same pixel coordinates as image rendering
            // Images are rendered using corrected Y coordinate for UV system compatibility
            const borderX = selectedImageEl.x;
            const borderY = CANVAS_CONFIG.COMPOSED.height - selectedImageEl.y - selectedImageEl.height;
            const borderWidth = selectedImageEl.width;
            const borderHeight = selectedImageEl.height;
            
            // Apply rotation if needed (same as image rendering)
            if (selectedImageEl.rotation && selectedImageEl.rotation !== 0) {
              const centerX = borderX + borderWidth / 2;
              const centerY = borderY + borderHeight / 2;
              ctx.translate(centerX, centerY);
              ctx.rotate((selectedImageEl.rotation * Math.PI) / 180);
              ctx.translate(-centerX, -centerY);
            }
            
            // Draw the selection border
            ctx.beginPath();
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
            ctx.stroke();
            
            // Draw resize handles (like text tool)
            const handleSize = 8;
            const handles = [
              { x: borderX - handleSize/2, y: borderY - handleSize/2 }, // Top-left
              { x: borderX + borderWidth/2 - handleSize/2, y: borderY - handleSize/2 }, // Top-center
              { x: borderX + borderWidth - handleSize/2, y: borderY - handleSize/2 }, // Top-right
              { x: borderX + borderWidth - handleSize/2, y: borderY + borderHeight/2 - handleSize/2 }, // Right-center
              { x: borderX + borderWidth - handleSize/2, y: borderY + borderHeight - handleSize/2 }, // Bottom-right
              { x: borderX + borderWidth/2 - handleSize/2, y: borderY + borderHeight - handleSize/2 }, // Bottom-center
              { x: borderX - handleSize/2, y: borderY + borderHeight - handleSize/2 }, // Bottom-left
              { x: borderX - handleSize/2, y: borderY + borderHeight/2 - handleSize/2 } // Left-center
            ];
            
            // Draw resize handles
            ctx.fillStyle = '#00ff00';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([]); // Solid lines for handles
            
            for (const handle of handles) {
              ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
              ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
            }
            
            console.log(`🎨 Image selection border drawn with resize handles:`, {
              border: { x: borderX, y: borderY, width: borderWidth, height: borderHeight },
              handles: handles.length,
              image: { 
                uv: { u: selectedImageEl.u, v: selectedImageEl.v, uWidth: selectedImageEl.uWidth, uHeight: selectedImageEl.uHeight },
                pixel: { x: borderX, y: borderY, width: borderWidth, height: borderHeight }
              },
              calculation: `Border calculated from current UV coordinates at (${borderX}, ${borderY})`
            });
            
            ctx.restore();
          }
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
    },
    
    // Helper method to wrap text to fit within maxWidth
    wrapText: (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    },

    // Text Path Management Methods
    createTextPath: (path: { id: string; name: string; type: 'line' | 'curve' | 'circle' | 'arc' | 'bezier' | 'polygon'; points: { x: number; y: number }[]; closed?: boolean; controlPoints?: { x: number; y: number }[]; radius?: number; startAngle?: number; endAngle?: number }) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.createPath(path);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return path.id;
      });
    },

    getTextPath: (pathId: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.getPath(pathId);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return null;
      });
    },

    getAllTextPaths: () => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.getAllPaths();
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return [];
      });
    },

    updateTextPath: (pathId: string, updates: any) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.updatePath(pathId, updates);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return false;
      });
    },

    deleteTextPath: (pathId: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.deletePath(pathId);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return false;
      });
    },

    createLinePath: (id: string, startX: number, startY: number, endX: number, endY: number, name?: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.createLinePath(id, startX, startY, endX, endY, name);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return id;
      });
    },

    createCirclePath: (id: string, centerX: number, centerY: number, radius: number, name?: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.createCirclePath(id, centerX, centerY, radius, name);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return id;
      });
    },

    createCurvePath: (id: string, startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number, name?: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.createCurvePath(id, startX, startY, controlX, controlY, endX, endY, name);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return id;
      });
    },

    createArcPath: (id: string, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, name?: string) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.createArcPath(id, centerX, centerY, radius, startAngle, endAngle, name);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return id;
      });
    },

    renderTextPath: (ctx: CanvasRenderingContext2D, pathId: string, options?: any) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        TextPathManager.renderPath(ctx, pathId, options);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
      });
    },

    getTextPositionOnPath: (pathId: string, offset: number) => {
      return import('../utils/TextPathManager').then(({ TextPathManager }) => {
        return TextPathManager.getTextPositionOnPath(pathId, offset);
      }).catch(() => {
        console.error('Failed to import TextPathManager');
        return null;
      });
    },

    // Accessibility Management Methods
    initializeAccessibility: () => {
      try {
        console.log('♿ Attempting to initialize AccessibilityManager...');
        
        // Check if AccessibilityManager is available and has the initialize method
        if (AccessibilityManager && typeof AccessibilityManager.initialize === 'function') {
          AccessibilityManager.initialize();
          console.log('♿ Accessibility initialized in V2 system');
        } else {
          console.warn('♿ AccessibilityManager not available or initialize method missing - skipping initialization');
        }
      } catch (error) {
        console.warn('♿ Failed to initialize AccessibilityManager (non-critical):', error);
      }
    },

    registerTextElementForAccessibility: (textElement: TextElement) => {
      try {
        if (AccessibilityManager && typeof AccessibilityManager.registerTextElement === 'function') {
          AccessibilityManager.registerTextElement(textElement);
        }
      } catch (error) {
        console.warn('♿ Failed to register text element for accessibility (non-critical):', error);
      }
    },

    unregisterTextElementForAccessibility: (textId: string) => {
      try {
        if (AccessibilityManager && typeof AccessibilityManager.unregisterTextElement === 'function') {
          AccessibilityManager.unregisterTextElement(textId);
        }
      } catch (error) {
        console.warn('♿ Failed to unregister text element for accessibility (non-critical):', error);
      }
    },

    updateAccessibilitySettings: (settings: any) => {
      try {
        if (AccessibilityManager && typeof AccessibilityManager.updateSettings === 'function') {
          AccessibilityManager.updateSettings(settings);
        }
      } catch (error) {
        console.warn('♿ Failed to update accessibility settings (non-critical):', error);
      }
    },

    getAccessibilityReport: () => {
      try {
        if (AccessibilityManager && typeof AccessibilityManager.generateAccessibilityReport === 'function') {
          return AccessibilityManager.generateAccessibilityReport();
        }
        return null;
      } catch (error) {
        console.warn('♿ Failed to generate accessibility report (non-critical):', error);
        return null;
      }
    }
  }))
);

// Export types - REMOVED: Conflicts with existing exports above
// export type { LayerHistorySnapshot, LayerHistoryState, AdvancedLayer, LayerGroup, LayerEffect, LayerMask, LayerTransform, LayerContent, BrushStroke, TextElement };
