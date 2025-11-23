import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';
import { createLayerCanvas, createComposedCanvas, createDisplacementCanvas, CANVAS_CONFIG } from '../constants/CanvasSizes';
import { useApp } from '../App';
import { convertUVToPixel, getCanvasDimensions, isWhiteCanvas } from '../utils/CoordinateUtils';
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
  gradient?: {
    type: 'linear' | 'radial' | 'angular' | 'diamond';
    angle: number;
    stops: Array<{
      id: string;
      color: string;
      position: number;
    }>;
  };
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
  
  // PHASE 1: Individual stroke data for stroke-specific layers
  strokeData?: {
    id: string;              // Unique stroke ID
    points: Array<{ x: number; y: number }>; // Stroke path points
    bounds: {                // Stroke bounding box
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
    settings: {
      size: number;
      color: string;
      opacity: number;
      gradient?: any;
    };
    tool: string;           // 'brush', 'eraser', 'puffPrint', etc.
    createdAt: Date;
    isSelected: boolean;    // Selection state
  };
}

// Layer locking types (Photoshop-like)
export interface LayerLocking {
  position: boolean;      // Lock position (can't move)
  pixels: boolean;        // Lock pixels (can't paint/edit)
  transparency: boolean;  // Lock transparency (can't change alpha)
  all: boolean;          // Lock everything
}

// Main Layer interface
export interface AdvancedLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;        // Legacy simple lock
  locking: LayerLocking;  // Advanced locking system
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
  thumbnail?: string; // Base64 thumbnail for layer preview
  thumbnailCanvas?: HTMLCanvasElement; // Canvas for generating thumbnails
}

// Layer Group
export interface LayerGroup {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  locking: LayerLocking; // Advanced locking system for groups
  collapsed: boolean;
  layerIds: string[];
  childLayerIds: string[]; // Alias for layerIds for backward compatibility
  createdAt: Date;
  updatedAt: Date;
  order: number;
  thumbnail?: string; // Base64 thumbnail for group preview
  thumbnailCanvas?: HTMLCanvasElement; // Canvas for generating group thumbnails
}

// Duplication Options
export interface DuplicationOptions {
  name?: string; // Custom name for duplicated layer
  offsetX?: number; // X offset for duplicated layer
  offsetY?: number; // Y offset for duplicated layer
  includeEffects?: boolean; // Include layer effects (default: true)
  includeMasks?: boolean; // Include layer masks (default: true)
  includeTransform?: boolean; // Include transform properties (default: true)
  includeLocking?: boolean; // Include locking state (default: true)
  targetGroupId?: string; // Add duplicated layer to specific group
  preserveOpacity?: boolean; // Preserve original opacity (default: true)
  preserveBlendMode?: boolean; // Preserve original blend mode (default: true)
}

// Deletion Options
export interface DeletionOptions {
  skipConfirmation?: boolean; // Skip confirmation dialog (default: false)
  moveToTrash?: boolean; // Move to trash instead of permanent deletion (default: true)
  cleanupReferences?: boolean; // Clean up all references (default: true)
  updateComposition?: boolean; // Update composition after deletion (default: true)
  preserveHistory?: boolean; // Preserve deletion in history (default: true)
  deleteChildren?: boolean; // Delete child layers/groups (default: true)
  forceDelete?: boolean; // Force delete even if locked (default: false)
}

// Store state
interface AdvancedLayerStoreV2 {
  // Core data
  layers: AdvancedLayer[];
  groups: LayerGroup[];
  layerOrder: string[]; // Ordered list of layer IDs (top to bottom)
  
  // Deletion state
  deletedLayers: AdvancedLayer[]; // Trash for deleted layers
  deletedGroups: LayerGroup[]; // Trash for deleted groups
  
  // Selection state
  selectedLayerIds: string[];
  activeLayerId: string | null;
  
  // UI state
  showLayerPanel: boolean;
  autoGrouping: boolean;
  
  // Canvas state
  composedCanvas: HTMLCanvasElement | null;
  lastCompositionTime: number | null;
  
  // CRITICAL: Store instance ID for debugging
  id: string;
  
  // History state
  history: LayerHistoryState;
  
  // Actions
  createLayer: (type: LayerType, name?: string, blendMode?: BlendMode) => string;
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
  
  // Advanced Locking
  setLayerLocking: (id: string, locking: Partial<LayerLocking>) => void;
  toggleLayerPositionLock: (id: string) => void;
  toggleLayerPixelsLock: (id: string) => void;
  toggleLayerTransparencyLock: (id: string) => void;
  toggleLayerAllLock: (id: string) => void;
  isLayerPositionLocked: (id: string) => boolean;
  isLayerPixelsLocked: (id: string) => boolean;
  isLayerTransparencyLocked: (id: string) => boolean;
  isLayerAllLocked: (id: string) => boolean;
  canLayerMove: (id: string) => boolean;
  canLayerEdit: (id: string) => boolean;
  canLayerChangeOpacity: (id: string) => boolean;
  
  // Ordering
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
  reorderLayers: (newOrder: string[]) => void;
  
  // Drag & Drop
  dragLayerStart: (layerId: string) => void;
  dragLayerOver: (layerId: string, targetLayerId: string) => void;
  dragLayerEnd: (layerId: string, targetLayerId: string) => void;
  dropLayer: (layerId: string, targetLayerId: string, position: 'above' | 'below') => void;
  
  // Thumbnails
  generateLayerThumbnail: (layerId: string) => string | null;
  updateLayerThumbnail: (layerId: string) => void;
  getLayerThumbnail: (layerId: string) => string | null;
  
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
  
  // Enhanced Duplication Operations
  duplicateLayerAdvanced: (id: string, options?: DuplicationOptions) => string;
  duplicateSelectedLayers: (options?: DuplicationOptions) => string[];
  duplicateLayerWithOffset: (id: string, offsetX: number, offsetY: number) => string;
  duplicateLayerToGroup: (id: string, groupId: string) => string;
  duplicateLayerWithEffects: (id: string, includeEffects: boolean, includeMasks: boolean) => string;
  
  // Duplication Helper Methods
  deepCopyLayerContent: (content: LayerContent, layerType: LayerType) => LayerContent;
  cloneCanvas: (sourceCanvas: HTMLCanvasElement) => HTMLCanvasElement;
  
  // Enhanced Deletion Operations
  deleteLayerAdvanced: (id: string, options?: DeletionOptions) => boolean;
  deleteSelectedLayers: (options?: DeletionOptions) => number;
  deleteLayerWithConfirmation: (id: string, message?: string) => Promise<boolean>;
  deleteGroupAdvanced: (id: string, options?: DeletionOptions) => boolean;
  deleteGroupWithConfirmation: (id: string, message?: string) => Promise<boolean>;
  deleteAllLayers: (options?: DeletionOptions) => number;
  deleteEmptyGroups: () => number;
  restoreDeletedLayer: (layerData: AdvancedLayer) => string;
  restoreDeletedGroup: (groupData: LayerGroup) => string;
  
  // Missing group operations
  renameGroup: (groupId: string, name: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  
  // Advanced Group Operations
  setGroupOpacity: (groupId: string, opacity: number) => void;
  setGroupBlendMode: (groupId: string, blendMode: BlendMode) => void;
  setGroupLocking: (groupId: string, locking: Partial<LayerLocking>) => void;
  toggleGroupPositionLock: (groupId: string) => void;
  toggleGroupPixelsLock: (groupId: string) => void;
  toggleGroupTransparencyLock: (groupId: string) => void;
  toggleGroupAllLock: (groupId: string) => void;
  isGroupPositionLocked: (groupId: string) => boolean;
  isGroupPixelsLocked: (groupId: string) => boolean;
  isGroupTransparencyLocked: (groupId: string) => boolean;
  isGroupAllLocked: (groupId: string) => boolean;
  canGroupMove: (groupId: string) => boolean;
  canGroupEdit: (groupId: string) => boolean;
  canGroupChangeOpacity: (groupId: string) => boolean;
  
  // Group Drag & Drop
  dragGroupStart: (groupId: string) => void;
  dragGroupOver: (groupId: string, targetGroupId: string) => void;
  dragGroupEnd: (groupId: string, targetGroupId: string) => void;
  dropGroup: (groupId: string, targetGroupId: string, position: 'above' | 'below') => void;
  
  // Group Thumbnails
  generateGroupThumbnail: (groupId: string) => string | null;
  updateGroupThumbnail: (groupId: string) => void;
  getGroupThumbnail: (groupId: string) => string | null;
  
  // Group Management
  moveLayerToGroup: (layerId: string, groupId: string) => void;
  moveLayerBetweenGroups: (layerId: string, fromGroupId: string, toGroupId: string) => void;
  duplicateGroup: (groupId: string) => string;
  mergeGroup: (groupId: string) => void;
  
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
  
  // Animation control
  startImageAnimation: () => void;
  
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

const createDefaultLocking = (): LayerLocking => ({
  position: false,
  pixels: false,
  transparency: false,
  all: false
});

const createDefaultContent = (type: LayerType): LayerContent => {
  switch (type) {
    case 'paint':
      // CRITICAL FIX: Use same dimensions as composed canvas to ensure perfect UV alignment
      // Always use CANVAS_CONFIG.COMPOSED dimensions to match composedCanvas
      const canvasSize = CANVAS_CONFIG.COMPOSED.width; // Use same size as composed canvas
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
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
    deletedLayers: [],
    deletedGroups: [],
    selectedLayerIds: [],
    activeLayerId: null,
    showLayerPanel: true,
    autoGrouping: true,
    composedCanvas: null,
    lastCompositionTime: null,
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
    createLayer: (type: LayerType, name?: string, blendMode?: BlendMode) => {
      const state = get();
      const layerName = name || generateLayerName(type, state.layers);
      const newOrder = state.layerOrder.length;
      
      const newLayer: AdvancedLayer = {
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: layerName,
        type,
        visible: true,
        opacity: 1.0,
        blendMode: blendMode || 'normal',
        locked: false,        // Legacy simple lock
        locking: createDefaultLocking(), // Advanced locking system
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
      
      // Generate thumbnail for the new layer
      setTimeout(() => {
        get().generateLayerThumbnail(newLayer.id);
      }, 100);
      
      console.log(`🎨 Created new ${type} layer: ${layerName}`, newLayer);
      return newLayer.id;
    },
    
    // Layer deletion
    deleteLayer: (id: string) => {
      // Use enhanced deletion with default options
      get().deleteLayerAdvanced(id, {
        skipConfirmation: true,
        moveToTrash: true,
        cleanupReferences: true,
        updateComposition: true,
        preserveHistory: true,
        deleteChildren: true,
        forceDelete: false
      });
    },
    
    // Layer duplication
    duplicateLayer: (id: string) => {
      const state = get();
      const originalLayer = state.layers.find(layer => layer.id === id);
      if (!originalLayer) return '';
      
      // Use enhanced duplication with default options
      return get().duplicateLayerAdvanced(id, {
        name: `${originalLayer.name} Copy`,
        includeEffects: true,
        includeMasks: true,
        includeTransform: true,
        includeLocking: true,
        preserveOpacity: true,
        preserveBlendMode: true
      });
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
      const state = get();
      
      set(state => ({
        activeLayerId: id,
        layers: state.layers.map(layer => ({
          ...layer,
          selected: layer.id === id
        }))
      }));
      
      console.log(`🎯 Set active layer: ${id}`);
      
      // PHASE 2: If layer has strokeData, also select the stroke
      const layer = state.layers.find((l: AdvancedLayer) => l.id === id);
      if (layer?.content?.strokeData) {
        // Delay execution to allow stroke selection module to load
        setTimeout(() => {
          try {
            const strokeSelectionModule = (window as any).__strokeSelectionModule;
            if (strokeSelectionModule?.useStrokeSelection) {
              const { selectStroke } = strokeSelectionModule.useStrokeSelection.getState();
              selectStroke(id);
              console.log('🎯 Also selected stroke for layer:', id);
            }
          } catch (e) {
            // Stroke selection system might not be available yet
          }
        }, 0);
      }
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
      // Check if opacity can be changed (transparency lock)
      if (!get().canLayerChangeOpacity(id)) {
        console.warn(`🔒 Cannot change opacity for layer ${id} - transparency is locked`);
        return;
      }
      
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
      // Check if position can be changed (position lock)
      if ((transform.x !== undefined || transform.y !== undefined) && !get().canLayerMove(id)) {
        console.warn(`🔒 Cannot change position for layer ${id} - position is locked`);
        // Remove position changes but allow other transform changes
        const { x, y, ...allowedTransform } = transform;
        if (Object.keys(allowedTransform).length === 0) {
          return; // No allowed changes
        }
        transform = allowedTransform;
      }
      
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
    
    // Advanced Locking Implementation
    setLayerLocking: (id: string, locking: Partial<LayerLocking>) => {
      set(state => ({
        layers: state.layers.map(layer =>
          layer.id === id ? {
            ...layer,
            locking: { ...layer.locking, ...locking },
            // Update legacy locked property if all is set
            locked: locking.all !== undefined ? locking.all : layer.locked,
            updatedAt: new Date()
          } : layer
        )
      }));
      
      console.log(`🔒 Set layer ${id} locking:`, locking);
    },
    
    toggleLayerPositionLock: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      
      const newPositionLock = !layer.locking.position;
      get().setLayerLocking(id, { position: newPositionLock });
      
      console.log(`🔒 Toggled position lock for layer ${id}: ${newPositionLock}`);
    },
    
    toggleLayerPixelsLock: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      
      const newPixelsLock = !layer.locking.pixels;
      get().setLayerLocking(id, { pixels: newPixelsLock });
      
      console.log(`🔒 Toggled pixels lock for layer ${id}: ${newPixelsLock}`);
    },
    
    toggleLayerTransparencyLock: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      
      const newTransparencyLock = !layer.locking.transparency;
      get().setLayerLocking(id, { transparency: newTransparencyLock });
      
      console.log(`🔒 Toggled transparency lock for layer ${id}: ${newTransparencyLock}`);
    },
    
    toggleLayerAllLock: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      
      const newAllLock = !layer.locking.all;
      get().setLayerLocking(id, { 
        all: newAllLock,
        position: newAllLock,
        pixels: newAllLock,
        transparency: newAllLock
      });
      
      console.log(`🔒 Toggled all locks for layer ${id}: ${newAllLock}`);
    },
    
    isLayerPositionLocked: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      return layer ? (layer.locking.all || layer.locking.position) : false;
    },
    
    isLayerPixelsLocked: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      return layer ? (layer.locking.all || layer.locking.pixels) : false;
    },
    
    isLayerTransparencyLocked: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      return layer ? (layer.locking.all || layer.locking.transparency) : false;
    },
    
    isLayerAllLocked: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      return layer ? layer.locking.all : false;
    },
    
    canLayerMove: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return false;
      
      // Can't move if position is locked or all is locked
      return !(layer.locking.all || layer.locking.position);
    },
    
    canLayerEdit: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return false;
      
      // Can't edit if pixels are locked or all is locked
      return !(layer.locking.all || layer.locking.pixels);
    },
    
    canLayerChangeOpacity: (id: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return false;
      
      // Can't change opacity if transparency is locked or all is locked
      return !(layer.locking.all || layer.locking.transparency);
    },
    
    // Ordering
    moveLayerUp: (id: string) => {
      set(state => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex <= 0) return state;
        
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        
        // CRITICAL FIX: Create new layers array with updated order to ensure React re-renders
        const updatedLayers = state.layers.map((layer) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
        }));
        
        return {
          layerOrder: newOrder,
          layers: updatedLayers
        };
      });
      
      // CRITICAL FIX: Force immediate composition and visual update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model (no delay for real-time updates)
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder-up-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer move up (V2)');
      
      console.log(`⬆️ Moved layer ${id} up`);
    },
    
    moveLayerDown: (id: string) => {
      set(state => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex >= state.layerOrder.length - 1) return state;
        
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        
        // CRITICAL FIX: Create new layers array with updated order to ensure React re-renders
        const updatedLayers = state.layers.map((layer) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
        }));
        
        return {
          layerOrder: newOrder,
          layers: updatedLayers
        };
      });
      
      // CRITICAL FIX: Force immediate composition and visual update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model (no delay for real-time updates)
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder-down-v2', layerId: id }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer move down (V2)');
      
      console.log(`⬇️ Moved layer ${id} down`);
    },
    
    moveLayerToTop: (id: string) => {
      set(state => {
        const newOrder = state.layerOrder.filter(layerId => layerId !== id);
        newOrder.unshift(id);
        
        // CRITICAL FIX: Create new layers array with updated order to ensure React re-renders
        const updatedLayers = state.layers.map((layer) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
        }));
        
        return {
          layerOrder: newOrder,
          layers: updatedLayers
        };
      });
      
      // CRITICAL FIX: Force immediate composition and visual update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-reorder-to-top-v2', layerId: id }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer move to top (V2)');
      
      console.log(`🔝 Moved layer ${id} to top`);
    },
    
    moveLayerToBottom: (id: string) => {
      set(state => {
        const newOrder = state.layerOrder.filter(layerId => layerId !== id);
        newOrder.push(id);
        
        // CRITICAL FIX: Create new layers array with updated order to ensure React re-renders
        const updatedLayers = state.layers.map((layer) => ({
            ...layer,
            order: newOrder.indexOf(layer.id)
        }));
        
        return {
          layerOrder: newOrder,
          layers: updatedLayers
        };
      });
      
      // CRITICAL FIX: Force immediate composition and visual update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-reorder-to-bottom-v2', layerId: id }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer move to bottom (V2)');
      
      console.log(`🔻 Moved layer ${id} to bottom`);
    },
    
    reorderLayers: (newOrder: string[]) => {
      set(state => {
        // CRITICAL FIX: Create new layers array with updated order to ensure React re-renders
        const updatedLayers = state.layers.map(layer => ({
          ...layer,
          order: newOrder.length - 1 - newOrder.indexOf(layer.id) // Reverse order for descending sort
        }));
        
        return {
          layerOrder: newOrder,
          layers: updatedLayers
        };
      });
      
      // CRITICAL FIX: Force immediate composition and visual update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-reorder-v2', newOrder }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer reorder (V2)');
      
      console.log(`🔄 Reordered layers:`, newOrder);
    },
    
    // Drag & Drop Implementation
    dragLayerStart: (layerId: string) => {
      console.log(`🎯 Drag started for layer: ${layerId}`);
      // Store the dragged layer ID globally for drag operations
      (window as any).__draggedLayerId = layerId;
    },
    
    dragLayerOver: (layerId: string, targetLayerId: string) => {
      console.log(`🎯 Drag over layer: ${layerId} -> ${targetLayerId}`);
      // Visual feedback could be added here (highlighting drop zones)
    },
    
    dragLayerEnd: (layerId: string, targetLayerId: string) => {
      console.log(`🎯 Drag ended for layer: ${layerId}`);
      // Clean up drag state
      delete (window as any).__draggedLayerId;
    },
    
    dropLayer: (layerId: string, targetLayerId: string, position: 'above' | 'below') => {
      const state = get();
      const draggedIndex = state.layerOrder.indexOf(layerId);
      const targetIndex = state.layerOrder.indexOf(targetLayerId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.warn('Invalid layer IDs for drop operation');
        return;
      }
      
      // Don't drop on itself
      if (layerId === targetLayerId) {
        console.log('Cannot drop layer on itself');
        return;
      }
      
      const newOrder = [...state.layerOrder];
      const draggedLayer = newOrder.splice(draggedIndex, 1)[0];
      
      // Calculate new position
      let newIndex = targetIndex;
      if (position === 'below') {
        newIndex = targetIndex + 1;
      }
      
      // Adjust for the removed element
      if (draggedIndex < targetIndex) {
        newIndex -= 1;
      }
      
      newOrder.splice(newIndex, 0, draggedLayer);
      
      // Update the layer order
      get().reorderLayers(newOrder);
      
      // Force composition update
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-drag-drop-v2', layerId, targetLayerId }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer drag & drop (V2)');
      }, 50);
      
      console.log(`🎯 Dropped layer ${layerId} ${position} ${targetLayerId}`);
    },
    
    // Thumbnail Implementation
    generateLayerThumbnail: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) return null;
      
      try {
        // Create thumbnail canvas
        const thumbnailSize = 64; // 64x64 thumbnail
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;
        const ctx = thumbnailCanvas.getContext('2d');
        
        if (!ctx) return null;
        
        // Set high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Generate thumbnail based on layer type
        if (layer.type === 'image' && layer.content.imageElements) {
          // For image layers, create a preview of the images
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
          
          // Draw a simple representation of images
          layer.content.imageElements.forEach((imageEl, index) => {
            if (!imageEl.visible) return;
            
            // Calculate thumbnail position (simplified)
            const thumbX = (imageEl.x / 4096) * thumbnailSize;
            const thumbY = (imageEl.y / 4096) * thumbnailSize;
            const thumbWidth = Math.max(8, (imageEl.width / 4096) * thumbnailSize);
            const thumbHeight = Math.max(8, (imageEl.height / 4096) * thumbnailSize);
            
            // Draw image placeholder
            ctx.fillStyle = `hsl(${index * 60}, 70%, 60%)`;
            ctx.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
            
            // Add border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(thumbX, thumbY, thumbWidth, thumbHeight);
          });
        } else if (layer.type === 'text' && layer.content.textElements) {
          // For text layers, show text preview
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
          
          layer.content.textElements.forEach((textEl, index) => {
            ctx.fillStyle = textEl.color || '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Show first few characters
            const previewText = textEl.text.substring(0, 8);
            ctx.fillText(previewText, thumbnailSize / 2, thumbnailSize / 2 + (index * 12));
          });
        } else if (layer.type === 'paint' && layer.content.canvas) {
          // For paint layers, show canvas preview
          const sourceCanvas = layer.content.canvas;
          const scale = thumbnailSize / Math.max(sourceCanvas.width, sourceCanvas.height);
          const scaledWidth = sourceCanvas.width * scale;
          const scaledHeight = sourceCanvas.height * scale;
          
          ctx.drawImage(sourceCanvas, 
            (thumbnailSize - scaledWidth) / 2, 
            (thumbnailSize - scaledHeight) / 2, 
            scaledWidth, 
            scaledHeight
          );
        } else {
          // Default thumbnail for other layer types
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
          
          // Add layer type indicator
          ctx.fillStyle = '#666';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.type.toUpperCase(), thumbnailSize / 2, thumbnailSize / 2);
        }
        
        // Convert to base64
        const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/png');
        
        // Update layer with thumbnail
        set(state => ({
          layers: state.layers.map(l => 
            l.id === layerId 
              ? { ...l, thumbnail: thumbnailDataUrl, thumbnailCanvas }
              : l
          )
        }));
        
        console.log(`🖼️ Generated thumbnail for layer: ${layerId}`);
        return thumbnailDataUrl;
        
      } catch (error) {
        console.error('Error generating layer thumbnail:', error);
        return null;
      }
    },
    
    updateLayerThumbnail: (layerId: string) => {
      console.log(`🖼️ Updating thumbnail for layer: ${layerId}`);
      get().generateLayerThumbnail(layerId);
    },
    
    getLayerThumbnail: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      return layer?.thumbnail || null;
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
        locking: createDefaultLocking(), // Advanced locking system
        collapsed: false,
        layerIds: [],
        childLayerIds: [], // Alias for layerIds
        createdAt: new Date(),
        updatedAt: new Date(),
        order: state.layerOrder.length
      };
      
      set(state => ({
        groups: [...state.groups, newGroup]
      }));
      
      get().saveHistorySnapshot(`Create Group: ${groupName}`);
      
      // Generate thumbnail for the new group
      setTimeout(() => {
        get().generateGroupThumbnail(newGroup.id);
      }, 100);
      
      console.log(`📁 Created group: ${groupName}`);
      return newGroup.id;
    },
    
    deleteGroup: (id: string) => {
      // Use enhanced deletion with default options
      get().deleteGroupAdvanced(id, {
        skipConfirmation: true,
        moveToTrash: true,
        cleanupReferences: true,
        updateComposition: true,
        preserveHistory: true,
        deleteChildren: true,
        forceDelete: false
      });
    },
    
    addToGroup: (layerId: string, groupId: string) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId
            ? { ...group, layerIds: [...group.layerIds, layerId], updatedAt: new Date() }
            : group
        ),
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, groupId, updatedAt: new Date() } : layer
        )
      }));
      
      get().saveHistorySnapshot(`Add Layer to Group: ${layerId} -> ${groupId}`);
      
      // Update group thumbnail after adding layer
      setTimeout(() => {
        get().updateGroupThumbnail(groupId);
      }, 100);
      
      console.log(`➕ Added layer ${layerId} to group ${groupId}`);
    },
    
    removeFromGroup: (layerId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      const groupId = layer?.groupId;
      
      set(state => ({
        groups: state.groups.map(group => ({
          ...group,
          layerIds: group.layerIds.filter(id => id !== layerId),
          updatedAt: group.layerIds.includes(layerId) ? new Date() : group.updatedAt
        })),
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, groupId: undefined, updatedAt: new Date() } : layer
        )
      }));
      
      get().saveHistorySnapshot(`Remove Layer from Group: ${layerId}`);
      
      // Update group thumbnail after removing layer
      if (groupId) {
        setTimeout(() => {
          get().updateGroupThumbnail(groupId);
        }, 100);
      }
      
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
      
      // Added brush stroke to layer
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
      
      // Removed brush stroke from layer
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
      
      // CRITICAL FIX: Only create layer in V2 system, not in main App state
      console.log('🎨 Creating new image layer for imported image');
      const imageLayerId = get().createLayer('image', imageData.name || 'Imported Image');
      
      // REMOVED: Duplicate layer creation in main App state
      // This was causing duplicate layers to appear
      console.log('🎨 Image layer created in V2 system only:', imageLayerId);
      
      // CRITICAL FIX: Convert UV coordinates to pixel coordinates for proper rendering
      // UV coordinates are center-based, convert to top-left pixel coordinates
      // CRITICAL FIX: Use the same canvas size calculation as unified bounds
      const appState = useApp.getState();
      const composedCanvas = appState.composedCanvas;
      const canvasSize = composedCanvas ? composedCanvas.width : unifiedPerformanceManager.getOptimalCanvasSize().width;
      const pixelWidth = Math.floor(imageData.uWidth * canvasSize);
      const pixelHeight = Math.floor(imageData.uHeight * canvasSize);
      
      // Convert center-based UV to top-left pixel coordinates
      const centerX = imageData.u * canvasSize;
      const centerY = imageData.v * canvasSize;
      const pixelX = Math.floor(centerX - pixelWidth / 2);
      // CRITICAL FIX: No Y-flipping needed - UV coordinates are already correct for canvas space
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
        
        // Generate thumbnail for the layer after image is added
        get().updateLayerThumbnail(imageLayerId);
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
          // CRITICAL FIX: Use the same canvas size calculation as unified bounds
          const appState = useApp.getState();
          const composedCanvas = appState.composedCanvas;
          const canvasSize = composedCanvas ? composedCanvas.width : unifiedPerformanceManager.getOptimalCanvasSize().width;
          const canvasWidth = canvasSize;
          const canvasHeight = canvasSize;
          
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
          // CRITICAL FIX: Use the same canvas size calculation as unified bounds
          const appState = useApp.getState();
          const composedCanvas = appState.composedCanvas;
          const canvasSize = composedCanvas ? composedCanvas.width : unifiedPerformanceManager.getOptimalCanvasSize().width;
          const canvasWidth = canvasSize;
          const canvasHeight = canvasSize;
          
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
    
  // Start continuous animation for selected image
  startImageAnimation: () => {
    const appState = useApp.getState();
    if (appState.selectedImageId) {
      console.log('🎨 Starting continuous animation for selected image');
      
      // Start the animation loop immediately
      const animate = () => {
        const currentAppState = useApp.getState();
        const currentState = get();
        
        // Only continue if image is still selected
        if (currentAppState.selectedImageId && currentState.composeLayers) {
          // Trigger composition and texture update
          currentState.composeLayers();
          
          // Trigger texture update to make animation visible
          if ((window as any).updateModelTexture) {
            (window as any).updateModelTexture(true, false);
          }
          
          // Schedule next frame with efficient interval
          setTimeout(animate, 100); // 10fps for smooth animation
        }
      };
      
      // Start the animation loop
      animate();
    }
  },

  // Layer composition
  composeLayers: () => {
    const state = get();
    
    // PERFORMANCE: Throttle composition to prevent excessive calls
    const now = Date.now();
    if (state.lastCompositionTime && now - state.lastCompositionTime < 16) { // ~60fps max
      return state.composedCanvas;
    }
    
    const composeThrottle = 16; // 60fps max
    if ((state as any).lastComposeTime && (now - (state as any).lastComposeTime) < composeThrottle) {
      return state.composedCanvas;
    }
    (state as any).lastComposeTime = now;
    
    // Update the lastCompositionTime
    set(state => ({ ...state, lastCompositionTime: now }));
    
    // CRITICAL FIX: Check for baseTexture BEFORE creating new canvas
    // This prevents faded texture when baseTexture is missing
    const appState = useApp.getState();
    
    // Try to extract base texture from model if missing (BEFORE creating canvas)
    if (!appState.baseTexture && appState.modelScene) {
      console.log('🎨 No base texture found, extracting from model immediately...');
      const { generateBaseLayer } = appState;
      if (generateBaseLayer) {
        generateBaseLayer();
        // Re-read state after generation
        const updatedAppState = useApp.getState();
        if (updatedAppState.baseTexture) {
          console.log('🎨 Successfully extracted base texture from model');
        } else {
          console.warn('⚠️ Failed to extract base texture - composition may result in faded texture');
        }
      }
    }
    
    // CRITICAL FIX: Always create new canvas for clean composition
    // But preserve base texture from existing canvas if baseTexture is missing/invalid
    const existingComposedCanvas = state.composedCanvas;
    const composedCanvas = createComposedCanvas();
    const ctx = composedCanvas.getContext('2d');
    if (!ctx) return null;
    
    // Always clear the new canvas
    ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
    
    // CRITICAL FIX: Check if we have a valid base texture
    const hasValidBaseTexture = appState.baseTexture && !isWhiteCanvas(appState.baseTexture);
    
    if (hasValidBaseTexture) {
      // We have valid base texture - restore it
      ctx.save();
      ctx.globalAlpha = 1.0; // Always draw base texture at full opacity
      ctx.globalCompositeOperation = 'source-over'; // Ensure base texture is drawn properly
      ctx.drawImage(appState.baseTexture, 0, 0, composedCanvas.width, composedCanvas.height);
      ctx.restore();
      console.log('🎨 Preserved base model texture in composition at full opacity');
    } else if (existingComposedCanvas) {
      // Base texture missing/invalid - copy from existing composedCanvas to preserve content
      // This prevents intermittent fading when baseTexture check fails
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(existingComposedCanvas, 0, 0, composedCanvas.width, composedCanvas.height);
      ctx.restore();
      console.log('🎨 Base texture missing/invalid - preserving existing composedCanvas content to prevent fading');
    } else {
      // No base texture and no existing canvas - this is the first composition
      // Fill with white as fallback (shouldn't happen if baseTexture was captured)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, composedCanvas.width, composedCanvas.height);
      console.warn('⚠️ Base texture missing and no existing canvas - using white fallback');
    }
      
      // Sort layers by order
      const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);
      
      for (const layer of sortedLayers) {
        if (!layer.visible) continue;
        
        // Only apply layer opacity to the layer content, not the base texture
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        // Apply blend mode
        const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
          'normal': 'source-over',
          'multiply': 'multiply',
          'screen': 'screen',
          'overlay': 'overlay',
          'soft-light': 'soft-light',
          'hard-light': 'hard-light',
          'color-dodge': 'color-dodge',
          'color-burn': 'color-burn',
          'darken': 'darken',
          'lighten': 'lighten',
          'difference': 'difference',
          'exclusion': 'exclusion',
          'hue': 'hue',
          'saturation': 'saturation',
          'color': 'color',
          'luminosity': 'luminosity'
        };
        const compositeOp = blendModeMap[layer.blendMode] || 'source-over';
        ctx.globalCompositeOperation = compositeOp;
        console.log(`🎨 Layer ${layer.name} blend mode: ${layer.blendMode} -> ${compositeOp}`);
        
        // CRITICAL FIX: Draw layer canvas with proper dimensions to prevent UV mismatch
        // Ensure layer canvas matches composed canvas dimensions
        if (layer.content.canvas) {
          const layerCanvas = layer.content.canvas;
          
          // DEBUG: Check if canvas has content before drawing
          const canvasCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
          if (canvasCtx) {
            const sampleImageData = canvasCtx.getImageData(0, 0, Math.min(100, layerCanvas.width), Math.min(100, layerCanvas.height));
            const hasNonTransparentPixels = Array.from(sampleImageData.data).some((val, idx) => idx % 4 === 3 && val > 0);
            console.log(`🎨 Layer ${layer.name} (${layer.id}): Drawing canvas`, {
              dimensions: `${layerCanvas.width}x${layerCanvas.height}`,
              hasContent: hasNonTransparentPixels,
              composedDimensions: `${composedCanvas.width}x${composedCanvas.height}`
            });
          }
          
          // CRITICAL FIX: Check if dimensions match - if not, scale to match
          if (layerCanvas.width !== composedCanvas.width || layerCanvas.height !== composedCanvas.height) {
            console.warn(`⚠️ Layer canvas dimensions (${layerCanvas.width}x${layerCanvas.height}) don't match composed canvas (${composedCanvas.width}x${composedCanvas.height}) - scaling to match`);
            // Scale layer canvas to match composed canvas dimensions
            ctx.drawImage(layerCanvas, 0, 0, composedCanvas.width, composedCanvas.height);
          } else {
            // Dimensions match - draw directly
            ctx.drawImage(layerCanvas, 0, 0);
          }
        } else {
          console.warn(`⚠️ Layer ${layer.name} (${layer.id}): No canvas found in layer.content`);
        }
        
        // Apply layer effects
        if (layer.effects && layer.effects.length > 0) {
          console.log(`🎨 Applying ${layer.effects.length} effects to layer ${layer.name}`);
          for (const effect of layer.effects) {
            if (!effect.enabled) continue;
            
            console.log(`🎨 Applying effect: ${effect.type}`, effect.properties);
            ctx.save();
            
            // CRITICAL FIX: Reset blend mode to source-over for effects
            // Effects should not inherit the layer's blend mode to avoid double rendering
            ctx.globalCompositeOperation = 'source-over';
            
            switch (effect.type) {
              case 'drop-shadow':
                const shadowProps = effect.properties;
                ctx.shadowColor = shadowProps.color || '#000000';
                ctx.shadowBlur = shadowProps.blur || 5;
                ctx.shadowOffsetX = shadowProps.offsetX || 2;
                ctx.shadowOffsetY = shadowProps.offsetY || 2;
                console.log(`🎨 Drop shadow: color=${ctx.shadowColor}, blur=${ctx.shadowBlur}, offset=(${ctx.shadowOffsetX}, ${ctx.shadowOffsetY})`);
                // Re-draw the layer content with shadow
                if (layer.content.canvas) {
                  ctx.drawImage(layer.content.canvas, 0, 0);
                }
                break;
                
              case 'outer-glow':
                const glowProps = effect.properties;
                ctx.shadowColor = glowProps.color || '#FFFFFF';
                ctx.shadowBlur = glowProps.radius || 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                console.log(`🎨 Outer glow: color=${ctx.shadowColor}, radius=${ctx.shadowBlur}`);
                // Re-draw the layer content with glow
                if (layer.content.canvas) {
                  ctx.drawImage(layer.content.canvas, 0, 0);
                }
                break;
                
              case 'brightness':
                const brightnessProps = effect.properties;
                const brightness = brightnessProps.amount || 0;
                console.log(`🎨 Brightness: amount=${brightness}`);
                // Apply brightness filter
                ctx.filter = `brightness(${1 + brightness / 100})`;
                if (layer.content.canvas) {
                  ctx.drawImage(layer.content.canvas, 0, 0);
                }
                break;
            }
            
            ctx.restore();
          }
        }
        
        // CRITICAL: Removed brushStrokes rendering - using layer.canvas as single source of truth
        // All strokes are rendered directly to layer.canvas during painting/application
        // The brushStrokes array is kept for metadata but not used for rendering in composeLayers
        // This prevents double rendering and ensures consistency
        
        // CRITICAL FIX: Reset canvas filter after all layer operations to prevent interference
        // This must happen BEFORE restore to avoid affecting subsequent layers
        ctx.filter = 'none';
        
        // Draw text elements
        const textElements = layer.content.textElements || [];
        // Rendering text elements for layer
        
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
          
          // CRITICAL FIX: Flip Y-axis for text rendering to match canvas coordinate system
          // Canvas Y increases downward, but texture on 3D model may be flipped
          const canvasHeight = composedCanvas.height;
          
          // Flip the entire canvas context vertically
          ctx.translate(0, canvasHeight);
          ctx.scale(1, -1);
          
          // Adjust Y coordinate for flipped coordinate system
          const flippedY = canvasHeight - textEl.y;
          
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
                // Flip path Y coordinate as well
                const flippedPathY = canvasHeight - pathPosition.y;
                ctx.translate(pathPosition.x, flippedPathY);
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
                // Fallback to regular text rendering if path not found (use flippedY)
                ctx.fillText(displayText, textEl.x, flippedY);
              }
            }).catch(() => {
              // Fallback to regular text rendering if TextPathManager fails (use flippedY)
              ctx.fillText(displayText, textEl.x, flippedY);
            });
          } else {
            // Regular text rendering (not on path)
            
            // Apply rotation if needed (use flippedY for rotation center)
            if (textEl.rotation && textEl.rotation !== 0) {
              ctx.translate(textEl.x, flippedY);
              ctx.rotate((textEl.rotation * Math.PI) / 180);
              ctx.translate(-textEl.x, -flippedY);
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
                const y = flippedY + (index * lineHeight);
                
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
              // Single line text rendering (use flippedY)
              if (textEl.effects) {
                import('../utils/TextEffects').then(({ TextEffectsRenderer }) => {
                  TextEffectsRenderer.applyEffects(ctx, displayText, textEl.x, flippedY, textEl.effects!);
                }).catch(() => {
                  ctx.fillText(displayText, textEl.x, flippedY);
                });
              } else {
                console.log(`🎨 Drawing text at position:`, { x: textEl.x, y: flippedY, originalY: textEl.y, text: displayText });
                ctx.fillText(displayText, textEl.x, flippedY);
                console.log(`🎨 Text drawn successfully`);
              }
            }
            
            // Apply text decoration (use flippedY)
            if (textEl.textDecoration && textEl.textDecoration !== 'none') {
              const metrics = ctx.measureText(displayText);
              const decorationY = flippedY + textEl.fontSize * 0.8; // Position decoration line
              
              ctx.strokeStyle = textEl.color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              
              if (textEl.textDecoration === 'underline') {
                ctx.moveTo(textEl.x, decorationY);
                ctx.lineTo(textEl.x + metrics.width, decorationY);
              } else if (textEl.textDecoration === 'line-through') {
                const strikeY = flippedY + textEl.fontSize * 0.5;
                ctx.moveTo(textEl.x, strikeY);
                ctx.lineTo(textEl.x + metrics.width, strikeY);
              } else if (textEl.textDecoration === 'overline') {
                const overlineY = flippedY + textEl.fontSize * 0.2;
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
            
            // CRITICAL FIX: Apply the same Y-axis flip as text rendering
            // This ensures the border appears in the same coordinate system as the text
            const canvasHeight = composedCanvas.height;
            ctx.translate(0, canvasHeight);
            ctx.scale(1, -1);
            
            // Calculate flipped Y coordinate (same as text rendering)
            const flippedY = canvasHeight - selectedTextEl.y;
            
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
            // Use flippedY to match text rendering
            let borderX, borderY, borderWidth, borderHeight;
            
            if (selectedTextEl.align === 'left') {
              // Left align: text starts at x, flippedY
              borderX = selectedTextEl.x;
              borderY = flippedY;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            } else if (selectedTextEl.align === 'right') {
              // Right align: text ends at x, flippedY
              borderX = selectedTextEl.x - textPixelWidth;
              borderY = flippedY;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            } else {
              // Center align: text is centered at x, flippedY
              borderX = selectedTextEl.x - (textPixelWidth / 2);
              borderY = flippedY;
              borderWidth = textPixelWidth;
              borderHeight = textPixelHeight;
            }
            
            // CRITICAL FIX: Apply rotation using the same center as text rendering (x, flippedY)
            if (selectedTextEl.rotation && selectedTextEl.rotation !== 0) {
              ctx.translate(selectedTextEl.x, flippedY);
              ctx.rotate((selectedTextEl.rotation * Math.PI) / 180);
              ctx.translate(-selectedTextEl.x, -flippedY);
            }
            
            // Draw the selection border
            ctx.beginPath();
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
            ctx.stroke();
            
            // Draw corner anchors (resize handles)
            const anchorSize = 12; // 12px square anchors
            const anchorHalfSize = anchorSize / 2;
            
            // Corner anchor positions
            const corners = [
              { x: borderX, y: borderY }, // topLeft
              { x: borderX + borderWidth, y: borderY }, // topRight
              { x: borderX, y: borderY + borderHeight }, // bottomLeft
              { x: borderX + borderWidth, y: borderY + borderHeight } // bottomRight
            ];
            
            // Draw corner anchors (filled squares)
            ctx.fillStyle = '#007acc'; // Same blue as border
            ctx.setLineDash([]); // Solid for anchors
            for (const corner of corners) {
              ctx.fillRect(corner.x - anchorHalfSize, corner.y - anchorHalfSize, anchorSize, anchorSize);
            }
            
            // Draw edge anchors (smaller circles)
            const edgeAnchorSize = 10; // 10px diameter
            const edgeAnchorRadius = edgeAnchorSize / 2;
            const edges = [
              { x: borderX + borderWidth / 2, y: borderY }, // top
              { x: borderX + borderWidth / 2, y: borderY + borderHeight }, // bottom
              { x: borderX, y: borderY + borderHeight / 2 }, // left
              { x: borderX + borderWidth, y: borderY + borderHeight / 2 } // right
            ];
            
            for (const edge of edges) {
              ctx.beginPath();
              ctx.arc(edge.x, edge.y, edgeAnchorRadius, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Draw rotation handle (above the text)
            const rotationHandleDistance = 40;
            const rotationHandleY = borderY - rotationHandleDistance;
            const rotationHandleX = borderX + borderWidth / 2;
            const rotationHandleSize = 12;
            
            ctx.beginPath();
            ctx.arc(rotationHandleX, rotationHandleY, rotationHandleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw rotation handle line (connecting to top edge)
            ctx.strokeStyle = '#007acc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rotationHandleX, borderY);
            ctx.lineTo(rotationHandleX, rotationHandleY);
            ctx.stroke();
            
            console.log(`🎨 Selection border and anchors drawn:`, {
              border: { x: borderX, y: borderY, width: borderWidth, height: borderHeight },
              text: { x: selectedTextEl.x, y: selectedTextEl.y, width: textPixelWidth, height: textPixelHeight },
              alignment: selectedTextEl.align,
              anchors: { cornerSize: anchorSize, edgeSize: edgeAnchorSize, rotationHandleSize }
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
          // CRITICAL FIX: Use BOTH layer opacity AND image opacity for proper layering
          const layerOpacity = layer.opacity || 1.0;
          const imageOpacity = imageEl.opacity || 1.0;
          const combinedOpacity = layerOpacity * imageOpacity;
          ctx.globalAlpha = combinedOpacity;
          // Apply blend mode
          const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
            'normal': 'source-over',
            'multiply': 'multiply',
            'screen': 'screen',
            'overlay': 'overlay',
            'soft-light': 'soft-light',
            'hard-light': 'hard-light',
            'color-dodge': 'color-dodge',
            'color-burn': 'color-burn',
            'darken': 'darken',
            'lighten': 'lighten',
            'difference': 'difference',
            'exclusion': 'exclusion',
            'hue': 'hue',
            'saturation': 'saturation',
            'color': 'color',
            'luminosity': 'luminosity'
          };
          ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over';
          console.log(`🎨 Image element blend mode: ${layer.blendMode} -> ${ctx.globalCompositeOperation}`);
          
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
          
          // CRITICAL FIX: Force immediate image rendering with HIGH QUALITY settings
          if (imageEl.dataUrl) {
            // Create image element and draw immediately if possible
            const img = new Image();
            img.src = imageEl.dataUrl;
            
            // CRITICAL: Enable high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Try to draw immediately if image is cached/loaded
            if (img.complete && img.naturalWidth > 0) {
              console.log('🎨 Drawing image with coordinates:', {
                x: imageEl.x,
                y: imageY,
                width: imageEl.width,
                height: imageEl.height,
                opacity: ctx.globalAlpha,
                blendMode: ctx.globalCompositeOperation
              });
              ctx.drawImage(img, imageEl.x, imageY, imageEl.width, imageEl.height);
              console.log('🎨 Image drawn immediately (cached) with HIGH QUALITY:', imageEl.name);
            } else {
              // For async loading, we need to trigger a re-composition
              img.onload = () => {
                console.log('🎨 Image loaded, triggering re-composition with HIGH QUALITY:', imageEl.name);
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
            // Fallback to src URL with HIGH QUALITY settings
            const img = new Image();
            img.onload = () => {
              // CRITICAL: Enable high-quality image rendering
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
              console.log('🎨 Image drawn from src with HIGH QUALITY:', imageEl.name);
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
        
        // CRITICAL FIX: Draw selection border for selected image elements (unified bounds)
        const appStateForImage = useApp.getState();
        const selectedImageId = appStateForImage.selectedImageId;
        
        // Only draw borderbox if an image is actually selected
        if (selectedImageId) {
          const selectedImageEl = imageElements.find(el => el.id === selectedImageId);
          if (selectedImageEl && selectedImageEl.visible) {
            console.log('🎨 Drawing selection border for image:', selectedImageEl.name);
            
            ctx.save();
            
            // UNIFIED BOUNDS: Use the same pixel coordinates as image rendering
            // Use the actual pixel coordinates stored in the image element
            const borderX = selectedImageEl.x;
            const borderY = selectedImageEl.y;
            const borderWidth = selectedImageEl.width;
            const borderHeight = selectedImageEl.height;
            
            // ULTRA-VIBRANT STATIC BORDER - NO ANIMATION, MAXIMUM VISIBILITY
            // Draw base border with ULTRA-VIBRANT static colors
            ctx.save();
            ctx.strokeStyle = '#FF0000'; // Bright red base for maximum visibility
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 6]); // Longer dashes for maximum visibility
            ctx.globalAlpha = 1.0; // Maximum opacity
            ctx.beginPath();
            ctx.rect(borderX, borderY, borderWidth, borderHeight);
            ctx.stroke();
            ctx.restore();
            
            // Draw static multi-layer glow effect with ULTRA-VIBRANT colors (no animation)
            const staticGlowLayers = [
              { color: '#FF0000', width: 15, alpha: 0.6 }, // Bright red outer glow
              { color: '#00FF00', width: 12, alpha: 0.7 }, // Bright green
              { color: '#0000FF', width: 10, alpha: 0.8 }, // Bright blue
              { color: '#FFFF00', width: 8, alpha: 0.9 }, // Bright yellow
              { color: '#FF00FF', width: 6, alpha: 1.0 }, // Bright magenta
              { color: '#00FFFF', width: 4, alpha: 1.0 } // Bright cyan
            ];
            
            for (const layer of staticGlowLayers) {
              ctx.save();
              ctx.strokeStyle = layer.color;
              ctx.lineWidth = layer.width;
              ctx.globalAlpha = layer.alpha; // Static alpha, no animation
              ctx.setLineDash([]); // Solid line for glow
              
              // Draw static glow border
              ctx.beginPath();
              ctx.rect(borderX, borderY, borderWidth, borderHeight);
              ctx.stroke();
              ctx.restore();
            }
            
            // Set up main border styling with ULTRA-VIBRANT colors
            ctx.strokeStyle = '#FF0000'; // Bright red border for maximum visibility
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 6]); // Longer dashes for maximum visibility
            ctx.globalAlpha = 1.0; // Maximum opacity for visibility
            
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
            
            // Draw resize handles (8 handles: corners + edges)
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
            
            // Draw ULTRA-VIBRANT static resize handles (no animation)
            for (const handle of handles) {
              // Draw base handle with ULTRA-VIBRANT colors
              ctx.save();
              ctx.fillStyle = '#FF0000'; // Bright red for maximum visibility
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 3;
              ctx.globalAlpha = 1.0; // Maximum opacity
              ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
              ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
              ctx.restore();
              
              // Draw ULTRA-VIBRANT static glow effect on handles (no animation)
              const handleCenterX = handle.x + handleSize / 2;
              const handleCenterY = handle.y + handleSize / 2;
              
              // Draw multiple ULTRA-VIBRANT static glow layers for handles
              const handleGlowLayers = [
                { color: '#FF0000', size: handleSize + 12, alpha: 0.5 }, // Bright red
                { color: '#00FF00', size: handleSize + 10, alpha: 0.6 }, // Bright green
                { color: '#0000FF', size: handleSize + 8, alpha: 0.7 }, // Bright blue
                { color: '#FFFF00', size: handleSize + 6, alpha: 0.8 }, // Bright yellow
                { color: '#FF00FF', size: handleSize + 4, alpha: 0.9 }, // Bright magenta
                { color: '#00FFFF', size: handleSize + 2, alpha: 1.0 } // Bright cyan
              ];
              
              for (const glowLayer of handleGlowLayers) {
                ctx.save();
                ctx.fillStyle = glowLayer.color;
                ctx.globalAlpha = glowLayer.alpha; // Static alpha, no animation
                ctx.fillRect(
                  handleCenterX - glowLayer.size / 2,
                  handleCenterY - glowLayer.size / 2,
                  glowLayer.size,
                  glowLayer.size
                );
                ctx.restore();
              }
            }
            
            console.log(`🎨 Image selection border drawn with unified bounds:`, {
              border: { x: borderX, y: borderY, width: borderWidth, height: borderHeight },
              handles: handles.length,
              image: { 
                uv: { u: selectedImageEl.u, v: selectedImageEl.v, uWidth: selectedImageEl.uWidth, uHeight: selectedImageEl.uHeight },
                pixel: { x: borderX, y: borderY, width: borderWidth, height: borderHeight }
              },
              calculation: `Unified bounds calculation - no Y-flipping!`
            });
            
            ctx.restore();
          }
        }
        
        // Draw shape elements (rectangles, circles, triangles, stars, etc.)
        const appStateForShapes = useApp.getState();
        const shapeElements = appStateForShapes.shapeElements || [];
        console.log(`🔷 Rendering ${shapeElements.length} shape elements for layer ${layer.id}`);
        
        for (const shapeEl of shapeElements) {
          if (shapeEl.visible === false) continue;
          
          // DEBUG: Log shape type to verify it's preserved
          if (Math.random() < 0.1) { // Log 10% of shapes to avoid spam
            console.log(`🔷 Rendering shape:`, {
              id: shapeEl.id,
              type: shapeEl.type,
              positionX: shapeEl.positionX,
              positionY: shapeEl.positionY,
              size: shapeEl.size
            });
          }
          
          ctx.save();
          
          // Convert position percentages (0-100) to canvas coordinates
          const shapeX = Math.round((shapeEl.positionX / 100) * composedCanvas.width);
          const shapeY = Math.round((shapeEl.positionY / 100) * composedCanvas.height);
          const shapeSize = shapeEl.size || 50;
          const shapeRadius = shapeSize / 2;
          
          // Apply opacity
          ctx.globalAlpha = (shapeEl.opacity || 1) * (layer.opacity || 1);
          
          // Set fill color (support gradient if present)
          let fillStyle: string | CanvasGradient = shapeEl.color || shapeEl.fill || '#ff69b4';
          
          if (shapeEl.gradient) {
            const grad = ctx.createLinearGradient(
              shapeX - shapeRadius,
              shapeY - shapeRadius,
              shapeX + shapeRadius,
              shapeY + shapeRadius
            );
            if (shapeEl.gradient.stops && Array.isArray(shapeEl.gradient.stops)) {
              shapeEl.gradient.stops.forEach((stop: any) => {
                grad.addColorStop(stop.position || 0, stop.color || '#ff69b4');
              });
            }
            fillStyle = grad;
          }
          
          ctx.fillStyle = fillStyle;
          ctx.strokeStyle = shapeEl.stroke || shapeEl.color || '#000000';
          ctx.lineWidth = shapeEl.strokeWidth || 0;
          
          // Apply rotation
          if (shapeEl.rotation && shapeEl.rotation !== 0) {
            ctx.translate(shapeX, shapeY);
            ctx.rotate((shapeEl.rotation * Math.PI) / 180);
            ctx.translate(-shapeX, -shapeY);
          }
          
          // Draw shape based on type
          ctx.beginPath();
          
          // CRITICAL: Ensure type is a string and handle case variations
          const shapeType = String(shapeEl.type || 'circle').toLowerCase();
          
          switch (shapeType) {
            case 'rectangle':
            case 'rect':
              ctx.rect(shapeX - shapeRadius, shapeY - shapeRadius, shapeSize, shapeSize);
              break;
              
            case 'circle':
              ctx.arc(shapeX, shapeY, shapeRadius, 0, Math.PI * 2);
              break;
              
            case 'triangle':
              ctx.moveTo(shapeX, shapeY - shapeRadius);
              ctx.lineTo(shapeX - shapeRadius, shapeY + shapeRadius);
              ctx.lineTo(shapeX + shapeRadius, shapeY + shapeRadius);
              ctx.closePath();
              break;
              
            case 'star':
              // Draw 5-pointed star
              const spikes = 5;
              const outerRadius = shapeRadius;
              const innerRadius = shapeRadius * 0.4;
              for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                const x = shapeX + radius * Math.cos(angle);
                const y = shapeY + radius * Math.sin(angle);
                if (i === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              ctx.closePath();
              break;
              
            case 'polygon':
              // Draw hexagon
              const sides = 6;
              for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                const x = shapeX + shapeRadius * Math.cos(angle);
                const y = shapeY + shapeRadius * Math.sin(angle);
                if (i === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              ctx.closePath();
              break;
              
            case 'heart':
              // Draw heart shape
              const heartSize = shapeRadius;
              ctx.moveTo(shapeX, shapeY + heartSize * 0.3);
              ctx.bezierCurveTo(
                shapeX, shapeY,
                shapeX - heartSize * 0.5, shapeY - heartSize * 0.5,
                shapeX - heartSize * 0.5, shapeY - heartSize * 0.2
              );
              ctx.bezierCurveTo(
                shapeX - heartSize * 0.5, shapeY + heartSize * 0.1,
                shapeX, shapeY + heartSize * 0.6,
                shapeX, shapeY + heartSize * 0.9
              );
              ctx.bezierCurveTo(
                shapeX, shapeY + heartSize * 0.6,
                shapeX + heartSize * 0.5, shapeY + heartSize * 0.1,
                shapeX + heartSize * 0.5, shapeY - heartSize * 0.2
              );
              ctx.bezierCurveTo(
                shapeX + heartSize * 0.5, shapeY - heartSize * 0.5,
                shapeX, shapeY,
                shapeX, shapeY + heartSize * 0.3
              );
              break;
              
            case 'diamond':
              ctx.moveTo(shapeX, shapeY - shapeRadius);
              ctx.lineTo(shapeX + shapeRadius, shapeY);
              ctx.lineTo(shapeX, shapeY + shapeRadius);
              ctx.lineTo(shapeX - shapeRadius, shapeY);
              ctx.closePath();
              break;
              
            default:
              // Default to circle
              ctx.arc(shapeX, shapeY, shapeRadius, 0, Math.PI * 2);
          }
          
          // Fill and stroke
          ctx.fill();
          if (ctx.lineWidth > 0) {
            ctx.stroke();
          }
          
          ctx.restore();
        }
        
        // Draw selection border for selected shape elements
        const appStateForShapeSelection = useApp.getState();
        if (appStateForShapeSelection.activeShapeId && shapeElements.length > 0) {
          const selectedShapeEl = shapeElements.find(shapeEl => shapeEl.id === appStateForShapeSelection.activeShapeId);
          
          if (selectedShapeEl) {
            console.log(`🔷 Drawing selection border for shape element:`, selectedShapeEl.id);
            
            ctx.save();
            
            const shapeX = Math.round((selectedShapeEl.positionX / 100) * composedCanvas.width);
            const shapeY = Math.round((selectedShapeEl.positionY / 100) * composedCanvas.height);
            const shapeSize = selectedShapeEl.size || 50;
            const shapeRadius = shapeSize / 2;
            
            // Apply rotation if needed
            if (selectedShapeEl.rotation && selectedShapeEl.rotation !== 0) {
              ctx.translate(shapeX, shapeY);
              ctx.rotate((selectedShapeEl.rotation * Math.PI) / 180);
              ctx.translate(-shapeX, -shapeY);
            }
            
            // Draw selection border
            ctx.strokeStyle = '#007acc';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.rect(shapeX - shapeRadius - 5, shapeY - shapeRadius - 5, shapeSize + 10, shapeSize + 10);
            ctx.stroke();
            
            // Draw resize handles
            const handleSize = 8;
            const handles = [
              { x: shapeX - shapeRadius - 5, y: shapeY - shapeRadius - 5 }, // Top-left
              { x: shapeX + shapeRadius + 5, y: shapeY - shapeRadius - 5 }, // Top-right
              { x: shapeX - shapeRadius - 5, y: shapeY + shapeRadius + 5 }, // Bottom-left
              { x: shapeX + shapeRadius + 5, y: shapeY + shapeRadius + 5 }  // Bottom-right
            ];
            
            ctx.fillStyle = '#007acc';
            ctx.setLineDash([]);
            for (const handle of handles) {
              ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            }
            
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
      
      // Apply layer masks to the final composition
      for (const layer of sortedLayers) {
        if (!layer.visible || !layer.mask || !layer.mask.enabled) continue;
        
        console.log(`🎨 Applying mask to layer ${layer.name}`, layer.mask);
        ctx.save();
        ctx.globalCompositeOperation = layer.mask.inverted ? 'destination-out' : 'destination-in';
        if (layer.mask.canvas) {
          ctx.drawImage(layer.mask.canvas, 0, 0);
        }
        ctx.restore();
      }
      
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
    
    // Advanced Group Operations
    setGroupOpacity: (groupId: string, opacity: number) => {
      if (!get().canGroupChangeOpacity(groupId)) {
        console.warn(`🔒 Cannot change opacity for group ${groupId} - transparency is locked`);
        return;
      }
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? { ...group, opacity, updatedAt: new Date() } : group
        )
      }));
      get().saveHistorySnapshot(`Set Group Opacity: ${groupId} to ${opacity}`);
      console.log(`🎨 Set group ${groupId} opacity to: ${opacity}`);
    },
    
    setGroupBlendMode: (groupId: string, blendMode: BlendMode) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? { ...group, blendMode, updatedAt: new Date() } : group
        )
      }));
      get().saveHistorySnapshot(`Set Group Blend Mode: ${groupId} to ${blendMode}`);
      console.log(`🎨 Set group ${groupId} blend mode to: ${blendMode}`);
    },
    
    setGroupLocking: (groupId: string, locking: Partial<LayerLocking>) => {
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? {
            ...group,
            locking: { ...group.locking, ...locking },
            locked: locking.all !== undefined ? locking.all : group.locked,
            updatedAt: new Date()
          } : group
        )
      }));
      get().saveHistorySnapshot(`Set Group Locking: ${groupId}`);
      console.log(`🔒 Set group ${groupId} locking:`, locking);
    },
    
    toggleGroupPositionLock: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        get().setGroupLocking(groupId, { position: !group.locking.position });
        console.log(`🔒 Toggled group ${groupId} position lock: ${!group.locking.position}`);
      }
    },
    
    toggleGroupPixelsLock: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        get().setGroupLocking(groupId, { pixels: !group.locking.pixels });
        console.log(`🔒 Toggled group ${groupId} pixels lock: ${!group.locking.pixels}`);
      }
    },
    
    toggleGroupTransparencyLock: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        get().setGroupLocking(groupId, { transparency: !group.locking.transparency });
        console.log(`🔒 Toggled group ${groupId} transparency lock: ${!group.locking.transparency}`);
      }
    },
    
    toggleGroupAllLock: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        get().setGroupLocking(groupId, { all: !group.locking.all });
        console.log(`🔒 Toggled group ${groupId} all lock: ${!group.locking.all}`);
      }
    },
    
    isGroupPositionLocked: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      return group?.locking.all || group?.locking.position || false;
    },
    
    isGroupPixelsLocked: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      return group?.locking.all || group?.locking.pixels || false;
    },
    
    isGroupTransparencyLocked: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      return group?.locking.all || group?.locking.transparency || false;
    },
    
    isGroupAllLocked: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      return group?.locking.all || false;
    },
    
    canGroupMove: (groupId: string) => {
      return !get().isGroupPositionLocked(groupId);
    },
    
    canGroupEdit: (groupId: string) => {
      return !get().isGroupPixelsLocked(groupId);
    },
    
    canGroupChangeOpacity: (groupId: string) => {
      return !get().isGroupTransparencyLocked(groupId);
    },
    
    // Group Drag & Drop
    dragGroupStart: (groupId: string) => {
      console.log(`🎯 Drag started for group: ${groupId}`);
      (window as any).__draggedGroupId = groupId;
    },
    
    dragGroupOver: (groupId: string, targetGroupId: string) => {
      console.log(`🎯 Drag over group: ${groupId} -> ${targetGroupId}`);
    },
    
    dragGroupEnd: (groupId: string, targetGroupId: string) => {
      console.log(`🎯 Drag ended for group: ${groupId}`);
      delete (window as any).__draggedGroupId;
    },
    
    dropGroup: (groupId: string, targetGroupId: string, position: 'above' | 'below') => {
      const state = get();
      const draggedIndex = state.groups.findIndex(g => g.id === groupId);
      const targetIndex = state.groups.findIndex(g => g.id === targetGroupId);
      
      if (draggedIndex === -1 || targetIndex === -1 || groupId === targetGroupId) {
        console.warn('Invalid group IDs for drop operation or cannot drop on itself');
        return;
      }
      
      const newGroups = [...state.groups];
      const draggedGroup = newGroups.splice(draggedIndex, 1)[0];
      
      let newIndex = targetIndex;
      if (position === 'below') {
        newIndex = targetIndex + 1;
      }
      if (draggedIndex < targetIndex) {
        newIndex -= 1;
      }
      
      newGroups.splice(newIndex, 0, draggedGroup);
      
      // Update order property for all groups
      const updatedGroups = newGroups.map((group, index) => ({
        ...group,
        order: index,
        updatedAt: new Date()
      }));
      
      set({ groups: updatedGroups });
      get().saveHistorySnapshot(`Reorder Groups: ${groupId} ${position} ${targetGroupId}`);
      
      const { composeLayers } = useApp.getState();
      composeLayers();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('forceTextureUpdate', { detail: { source: 'group-drag-drop-v2', groupId, targetGroupId } }));
        console.log('🔄 Triggered texture update after group drag & drop (V2)');
      }, 50);
      
      console.log(`🎯 Dropped group ${groupId} ${position} ${targetGroupId}`);
    },
    
    // Group Thumbnails
    generateGroupThumbnail: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return null;
      
      try {
        const thumbnailSize = 64;
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;
        const ctx = thumbnailCanvas.getContext('2d');
        
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw group thumbnail based on child layers
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
        
        // Draw preview of child layers
        group.layerIds.forEach((layerId, index) => {
          const layer = state.layers.find(l => l.id === layerId);
          if (!layer || !layer.visible) return;
          
          const thumbX = (index % 2) * (thumbnailSize / 2);
          const thumbY = Math.floor(index / 2) * (thumbnailSize / 2);
          const thumbWidth = thumbnailSize / 2 - 2;
          const thumbHeight = thumbnailSize / 2 - 2;
          
          ctx.fillStyle = `hsl(${index * 60}, 70%, 60%)`;
          ctx.fillRect(thumbX + 1, thumbY + 1, thumbWidth, thumbHeight);
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.strokeRect(thumbX + 1, thumbY + 1, thumbWidth, thumbHeight);
        });
        
        // Draw group folder icon overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(thumbnailSize - 16, thumbnailSize - 16, 14, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📁', thumbnailSize - 9, thumbnailSize - 9);
        
        const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/png');
        set(state => ({
          groups: state.groups.map(g => g.id === groupId ? { ...g, thumbnail: thumbnailDataUrl, thumbnailCanvas } : g)
        }));
        
        console.log(`🖼️ Generated thumbnail for group: ${groupId}`);
        return thumbnailDataUrl;
      } catch (error) {
        console.error('Error generating group thumbnail:', error);
        return null;
      }
    },
    
    updateGroupThumbnail: (groupId: string) => {
      console.log(`🖼️ Updating thumbnail for group: ${groupId}`);
      get().generateGroupThumbnail(groupId);
    },
    
    getGroupThumbnail: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      return group?.thumbnail || null;
    },
    
    // Group Management
    moveLayerToGroup: (layerId: string, groupId: string) => {
      // Remove from current group first
      get().removeFromGroup(layerId);
      // Add to new group
      get().addToGroup(layerId, groupId);
      get().saveHistorySnapshot(`Move Layer to Group: ${layerId} -> ${groupId}`);
      console.log(`📁 Moved layer ${layerId} to group ${groupId}`);
    },
    
    moveLayerBetweenGroups: (layerId: string, fromGroupId: string, toGroupId: string) => {
      get().removeFromGroup(layerId);
      get().addToGroup(layerId, toGroupId);
      get().saveHistorySnapshot(`Move Layer Between Groups: ${layerId} from ${fromGroupId} to ${toGroupId}`);
      console.log(`📁 Moved layer ${layerId} from group ${fromGroupId} to ${toGroupId}`);
    },
    
    duplicateGroup: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return '';
      
      const newGroupId = get().createGroup(`${group.name} Copy`);
      const newGroup = state.groups.find(g => g.id === newGroupId);
      if (!newGroup) return '';
      
      // Duplicate all layers in the group
      group.layerIds.forEach(layerId => {
        const duplicatedLayerId = get().duplicateLayer(layerId);
        get().addToGroup(duplicatedLayerId, newGroupId);
      });
      
      get().saveHistorySnapshot(`Duplicate Group: ${groupId} -> ${newGroupId}`);
      console.log(`📁 Duplicated group ${groupId} to ${newGroupId}`);
      return newGroupId;
    },
    
    mergeGroup: (groupId: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === groupId);
      if (!group || group.layerIds.length === 0) return;
      
      // Merge all layers in the group
      get().mergeLayers(group.layerIds);
      
      // Delete the group
      get().deleteGroup(groupId);
      
      get().saveHistorySnapshot(`Merge Group: ${groupId}`);
      console.log(`📁 Merged group ${groupId}`);
    },
    
    // Enhanced Duplication Operations
    duplicateLayerAdvanced: (id: string, options: DuplicationOptions = {}) => {
      const state = get();
      const originalLayer = state.layers.find(layer => layer.id === id);
      if (!originalLayer) return '';
      
      // Default options
      const opts: Required<DuplicationOptions> = {
        name: options.name || `${originalLayer.name} Copy`,
        offsetX: options.offsetX || 0,
        offsetY: options.offsetY || 0,
        includeEffects: options.includeEffects !== false,
        includeMasks: options.includeMasks !== false,
        includeTransform: options.includeTransform !== false,
        includeLocking: options.includeLocking !== false,
        targetGroupId: options.targetGroupId || '',
        preserveOpacity: options.preserveOpacity !== false,
        preserveBlendMode: options.preserveBlendMode !== false
      };
      
      // Create duplicated layer with selective copying
      const duplicatedLayer: AdvancedLayer = {
        ...originalLayer,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: opts.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: state.layerOrder.length,
        selected: false,
        groupId: undefined, // Will be set later if targetGroupId is provided
        
        // Selective copying based on options
        effects: opts.includeEffects ? [...originalLayer.effects] : [],
        mask: opts.includeMasks ? originalLayer.mask : undefined,
        transform: opts.includeTransform ? {
          ...originalLayer.transform,
          x: originalLayer.transform.x + opts.offsetX,
          y: originalLayer.transform.y + opts.offsetY
        } : createDefaultTransform(),
        locking: opts.includeLocking ? { ...originalLayer.locking } : createDefaultLocking(),
        opacity: opts.preserveOpacity ? originalLayer.opacity : 1.0,
        blendMode: opts.preserveBlendMode ? originalLayer.blendMode : 'normal',
        
        // Deep copy content based on layer type
        content: get().deepCopyLayerContent(originalLayer.content, originalLayer.type)
      };
      
      set(state => ({
        layers: [...state.layers, duplicatedLayer],
        layerOrder: [...state.layerOrder, duplicatedLayer.id]
      }));
      
      // Add to target group if specified
      if (opts.targetGroupId) {
        get().addToGroup(duplicatedLayer.id, opts.targetGroupId);
      }
      
      // Generate thumbnail for duplicated layer
      setTimeout(() => {
        get().generateLayerThumbnail(duplicatedLayer.id);
      }, 100);
      
      get().saveHistorySnapshot(`Duplicate Layer Advanced: ${originalLayer.name} -> ${opts.name}`);
      console.log(`📋 Duplicated layer advanced: ${originalLayer.name} -> ${opts.name}`, opts);
      return duplicatedLayer.id;
    },
    
    duplicateSelectedLayers: (options: DuplicationOptions = {}) => {
      const state = get();
      const duplicatedIds: string[] = [];
      
      state.selectedLayerIds.forEach(layerId => {
        const duplicatedId = get().duplicateLayerAdvanced(layerId, {
          ...options,
          name: options.name ? `${options.name} ${duplicatedIds.length + 1}` : undefined
        });
        if (duplicatedId) {
          duplicatedIds.push(duplicatedId);
        }
      });
      
      get().saveHistorySnapshot(`Duplicate Selected Layers: ${state.selectedLayerIds.length} layers`);
      console.log(`📋 Duplicated selected layers: ${duplicatedIds.length} layers`);
      return duplicatedIds;
    },
    
    duplicateLayerWithOffset: (id: string, offsetX: number, offsetY: number) => {
      return get().duplicateLayerAdvanced(id, {
        offsetX,
        offsetY,
        name: undefined // Will use default naming
      });
    },
    
    duplicateLayerToGroup: (id: string, groupId: string) => {
      return get().duplicateLayerAdvanced(id, {
        targetGroupId: groupId,
        name: undefined // Will use default naming
      });
    },
    
    duplicateLayerWithEffects: (id: string, includeEffects: boolean, includeMasks: boolean) => {
      return get().duplicateLayerAdvanced(id, {
        includeEffects,
        includeMasks,
        name: undefined // Will use default naming
      });
    },
    
    // Helper method for deep copying layer content
    deepCopyLayerContent: (content: LayerContent, layerType: LayerType): LayerContent => {
      switch (layerType) {
        case 'paint':
          return {
            ...content,
            canvas: content.canvas ? get().cloneCanvas(content.canvas) : undefined
          };
        case 'image':
          return {
            ...content,
            imageElements: content.imageElements ? content.imageElements.map(img => ({
              ...img,
              // Create new image element with copied properties
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })) : []
          };
        case 'text':
          return {
            ...content,
            textElements: content.textElements ? content.textElements.map(text => ({
              ...text,
              // Create new text element with copied properties
              id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })) : []
          };
        default:
          return { ...content };
      }
    },
    
    // Helper method for cloning canvas
    cloneCanvas: (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = sourceCanvas.width;
      clonedCanvas.height = sourceCanvas.height;
      
      const ctx = clonedCanvas.getContext('2d');
      const sourceCtx = sourceCanvas.getContext('2d');
      
      if (ctx && sourceCtx) {
        ctx.drawImage(sourceCanvas, 0, 0);
      }
      
      return clonedCanvas;
    },
    
    // Enhanced Deletion Operations
    deleteLayerAdvanced: (id: string, options: DeletionOptions = {}) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return false;
      
      // Default options
      const opts: Required<DeletionOptions> = {
        skipConfirmation: options.skipConfirmation || false,
        moveToTrash: options.moveToTrash !== false,
        cleanupReferences: options.cleanupReferences !== false,
        updateComposition: options.updateComposition !== false,
        preserveHistory: options.preserveHistory !== false,
        deleteChildren: options.deleteChildren !== false,
        forceDelete: options.forceDelete || false
      };
      
      // Check if layer is locked and force delete is not enabled
      if (!opts.forceDelete && (layer.locked || layer.locking.all)) {
        console.warn(`🔒 Cannot delete locked layer: ${layer.name}`);
        return false;
      }
      
      // Move to trash or permanent deletion
      if (opts.moveToTrash) {
        set(state => ({
          layers: state.layers.filter(l => l.id !== id),
          layerOrder: state.layerOrder.filter(layerId => layerId !== id),
          selectedLayerIds: state.selectedLayerIds.filter(layerId => layerId !== id),
          activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
          deletedLayers: [...state.deletedLayers, layer]
        }));
      } else {
        set(state => ({
          layers: state.layers.filter(l => l.id !== id),
          layerOrder: state.layerOrder.filter(layerId => layerId !== id),
          selectedLayerIds: state.selectedLayerIds.filter(layerId => layerId !== id),
          activeLayerId: state.activeLayerId === id ? null : state.activeLayerId
        }));
      }
      
      // Clean up references
      if (opts.cleanupReferences) {
        // Remove from any groups
        set(state => ({
          groups: state.groups.map(group => ({
            ...group,
            layerIds: group.layerIds.filter(layerId => layerId !== id)
          }))
        }));
      }
      
      // Update composition
      if (opts.updateComposition) {
        const { composeLayers } = useApp.getState();
        composeLayers();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceTextureUpdate', { detail: { source: 'layer-deleted-v2', layerId: id } }));
          console.log('🔄 Triggered texture update after layer deletion (V2)');
        }, 50);
      }
      
      // Save history
      if (opts.preserveHistory) {
        get().saveHistorySnapshot(`Delete Layer: ${layer.name}`);
      }
      
      console.log(`🗑️ Deleted layer: ${layer.name} (${opts.moveToTrash ? 'moved to trash' : 'permanent'})`);
      return true;
    },
    
    deleteSelectedLayers: (options: DeletionOptions = {}) => {
      const state = get();
      let deletedCount = 0;
      
      state.selectedLayerIds.forEach(layerId => {
        if (get().deleteLayerAdvanced(layerId, options)) {
          deletedCount++;
        }
      });
      
      get().saveHistorySnapshot(`Delete Selected Layers: ${deletedCount} layers`);
      console.log(`🗑️ Deleted selected layers: ${deletedCount} layers`);
      return deletedCount;
    },
    
    deleteLayerWithConfirmation: async (id: string, message?: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return false;
      
      const defaultMessage = `Are you sure you want to delete "${layer.name}"?`;
      const confirmed = window.confirm(message || defaultMessage);
      
      if (confirmed) {
        return get().deleteLayerAdvanced(id, {
          skipConfirmation: true,
          moveToTrash: true,
          cleanupReferences: true,
          updateComposition: true,
          preserveHistory: true,
          deleteChildren: true,
          forceDelete: false
        });
      }
      
      return false;
    },
    
    deleteGroupAdvanced: (id: string, options: DeletionOptions = {}) => {
      const state = get();
      const group = state.groups.find(g => g.id === id);
      if (!group) return false;
      
      // Default options
      const opts: Required<DeletionOptions> = {
        skipConfirmation: options.skipConfirmation || false,
        moveToTrash: options.moveToTrash !== false,
        cleanupReferences: options.cleanupReferences !== false,
        updateComposition: options.updateComposition !== false,
        preserveHistory: options.preserveHistory !== false,
        deleteChildren: options.deleteChildren !== false,
        forceDelete: options.forceDelete || false
      };
      
      // Check if group is locked and force delete is not enabled
      if (!opts.forceDelete && (group.locked || group.locking.all)) {
        console.warn(`🔒 Cannot delete locked group: ${group.name}`);
        return false;
      }
      
      // Delete child layers if requested
      if (opts.deleteChildren) {
        group.layerIds.forEach(layerId => {
          get().deleteLayerAdvanced(layerId, {
            skipConfirmation: true,
            moveToTrash: opts.moveToTrash,
            cleanupReferences: opts.cleanupReferences,
            updateComposition: false, // Will update after group deletion
            preserveHistory: false, // Will save history after group deletion
            deleteChildren: false,
            forceDelete: opts.forceDelete
          });
        });
      }
      
      // Move to trash or permanent deletion
      if (opts.moveToTrash) {
        set(state => ({
          groups: state.groups.filter(g => g.id !== id),
          deletedGroups: [...state.deletedGroups, group]
        }));
      } else {
        set(state => ({
          groups: state.groups.filter(g => g.id !== id)
        }));
      }
      
      // Update composition
      if (opts.updateComposition) {
        const { composeLayers } = useApp.getState();
        composeLayers();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceTextureUpdate', { detail: { source: 'group-deleted-v2', groupId: id } }));
          console.log('🔄 Triggered texture update after group deletion (V2)');
        }, 50);
      }
      
      // Save history
      if (opts.preserveHistory) {
        get().saveHistorySnapshot(`Delete Group: ${group.name}`);
      }
      
      console.log(`🗑️ Deleted group: ${group.name} (${opts.moveToTrash ? 'moved to trash' : 'permanent'})`);
      return true;
    },
    
    deleteGroupWithConfirmation: async (id: string, message?: string) => {
      const state = get();
      const group = state.groups.find(g => g.id === id);
      if (!group) return false;
      
      const defaultMessage = `Are you sure you want to delete "${group.name}" and all its contents?`;
      const confirmed = window.confirm(message || defaultMessage);
      
      if (confirmed) {
        return get().deleteGroupAdvanced(id, {
          skipConfirmation: true,
          moveToTrash: true,
          cleanupReferences: true,
          updateComposition: true,
          preserveHistory: true,
          deleteChildren: true,
          forceDelete: false
        });
      }
      
      return false;
    },
    
    deleteAllLayers: (options: DeletionOptions = {}) => {
      const state = get();
      let deletedCount = 0;
      
      // Delete all layers
      state.layers.forEach(layer => {
        if (get().deleteLayerAdvanced(layer.id, {
          ...options,
          skipConfirmation: true,
          updateComposition: false // Will update after all deletions
        })) {
          deletedCount++;
        }
      });
      
      // Update composition once after all deletions
      if (options.updateComposition !== false) {
        const { composeLayers } = useApp.getState();
        composeLayers();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceTextureUpdate', { detail: { source: 'all-layers-deleted-v2' } }));
          console.log('🔄 Triggered texture update after all layers deletion (V2)');
        }, 50);
      }
      
      get().saveHistorySnapshot(`Delete All Layers: ${deletedCount} layers`);
      console.log(`🗑️ Deleted all layers: ${deletedCount} layers`);
      return deletedCount;
    },
    
    deleteEmptyGroups: () => {
      const state = get();
      let deletedCount = 0;
      
      state.groups.forEach(group => {
        if (group.layerIds.length === 0) {
          if (get().deleteGroupAdvanced(group.id, {
            skipConfirmation: true,
            moveToTrash: true,
            cleanupReferences: true,
            updateComposition: false,
            preserveHistory: false,
            deleteChildren: false,
            forceDelete: false
          })) {
            deletedCount++;
          }
        }
      });
      
      // Update composition once after all deletions
      if (deletedCount > 0) {
        const { composeLayers } = useApp.getState();
        composeLayers();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceTextureUpdate', { detail: { source: 'empty-groups-deleted-v2' } }));
          console.log('🔄 Triggered texture update after empty groups deletion (V2)');
        }, 50);
      }
      
      get().saveHistorySnapshot(`Delete Empty Groups: ${deletedCount} groups`);
      console.log(`🗑️ Deleted empty groups: ${deletedCount} groups`);
      return deletedCount;
    },
    
    restoreDeletedLayer: (layerData: AdvancedLayer) => {
      const state = get();
      const restoredLayer: AdvancedLayer = {
        ...layerData,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: state.layerOrder.length,
        selected: false
      };
      
      set(state => ({
        layers: [...state.layers, restoredLayer],
        layerOrder: [...state.layerOrder, restoredLayer.id],
        deletedLayers: state.deletedLayers.filter(l => l.id !== layerData.id)
      }));
      
      // Generate thumbnail for restored layer
      setTimeout(() => {
        get().generateLayerThumbnail(restoredLayer.id);
      }, 100);
      
      get().saveHistorySnapshot(`Restore Deleted Layer: ${restoredLayer.name}`);
      console.log(`♻️ Restored deleted layer: ${restoredLayer.name}`);
      return restoredLayer.id;
    },
    
    restoreDeletedGroup: (groupData: LayerGroup) => {
      const state = get();
      const restoredGroup: LayerGroup = {
        ...groupData,
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: state.layerOrder.length
      };
      
      set(state => ({
        groups: [...state.groups, restoredGroup],
        deletedGroups: state.deletedGroups.filter(g => g.id !== groupData.id)
      }));
      
      get().saveHistorySnapshot(`Restore Deleted Group: ${restoredGroup.name}`);
      console.log(`♻️ Restored deleted group: ${restoredGroup.name}`);
      return restoredGroup.id;
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

// CRITICAL FIX: Expose layer store globally for brush engine integration
if (typeof window !== 'undefined') {
  (window as any).__layerStore = useAdvancedLayerStoreV2.getState();
}

// Export types - REMOVED: Conflicts with existing exports above
// export type { LayerHistorySnapshot, LayerHistoryState, AdvancedLayer, LayerGroup, LayerEffect, LayerMask, LayerTransform, LayerContent, BrushStroke, TextElement };
