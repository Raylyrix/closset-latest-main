/**
 * Project Metadata System
 * Defines the complete structure for project files
 */

import { AdvancedLayer, LayerGroup, BlendMode, LayerType } from '../AdvancedLayerSystemV2';

// ============================================================================
// PROJECT FILE STRUCTURE
// ============================================================================

/**
 * Main project file structure (.closset format)
 * This is the root structure saved to disk
 */
export interface ProjectFile {
  // File metadata
  fileVersion: string; // e.g., "1.0.0"
  fileType: 'closset-project';
  createdAt: string; // ISO date string
  modifiedAt: string; // ISO date string
  
  // Project metadata
  project: ProjectMetadata;
  
  // Content
  layers: SerializedLayer[];
  groups: SerializedLayerGroup[];
  layerOrder: string[];
  
  // Assets
  assets: AssetRegistry;
  
  // History (optional, can be large)
  history?: ProjectHistory;
  
  // Application state
  appState: AppStateSnapshot;
  
  // Custom data
  userData?: Record<string, any>;
}

// ============================================================================
// PROJECT METADATA
// ============================================================================

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string; // Project version
  
  // Canvas configuration
  canvas: {
    width: number;
    height: number;
    unit: 'px' | 'mm' | 'cm' | 'in';
    dpi: number;
    colorSpace: 'sRGB' | 'Adobe RGB' | 'Display P3';
    backgroundColor: string;
  };
  
  // Statistics
  stats: {
    layerCount: number;
    assetCount: number;
    fileSize: number; // In bytes
    lastSaveTime: string;
    totalEditTime: number; // In seconds
  };
  
  // Tags and organization
  tags: string[];
  category?: string;
  
  // Thumbnail
  thumbnail?: string; // Base64 or asset reference
}

// ============================================================================
// SERIALIZED LAYER STRUCTURE
// ============================================================================

/**
 * Serialized layer - optimized for file storage
 * HTMLCanvasElement and other non-serializable objects are converted
 */
export interface SerializedLayer {
  // Core properties (from AdvancedLayer)
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locking: {
    position: boolean;
    pixels: boolean;
    transparency: boolean;
    all: boolean;
  };
  
  // Transform
  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
  };
  
  // Effects
  effects: SerializedEffect[];
  
  // Masks
  mask?: SerializedMask;
  clipMask?: SerializedClipMask;
  clippedByLayerId?: string;
  
  // Content - references to assets or inline data
  content: SerializedLayerContent;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  groupId?: string;
  order: number;
  selected: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
  
  // Thumbnail reference
  thumbnailAssetId?: string;
}

export interface SerializedLayerContent {
  // Canvas data stored as asset reference or data URL
  canvasAssetId?: string; // Reference to asset in asset registry
  canvasDataUrl?: string; // Inline data URL (for small canvases)
  
  // Text content
  text?: string;
  
  // Image data
  imageDataAssetId?: string;
  imageElements?: SerializedImageElement[];
  
  // Brush strokes
  brushStrokes?: SerializedBrushStroke[];
  
  // Text elements
  textElements?: SerializedTextElement[];
  
  // Puff elements
  puffElements?: SerializedPuffElement[];
  
  // Adjustment data
  adjustmentData?: any;
  
  // Children (for groups)
  children?: string[];
  
  // Displacement canvas
  displacementCanvasAssetId?: string;
  
  // Stroke data
  strokeData?: {
    id: string;
    points: Array<{ x: number; y: number }>;
    bounds: {
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
    tool: string;
    createdAt: string;
    isSelected: boolean;
  };
}

export interface SerializedEffect {
  id: string;
  type: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'hue' | 'drop-shadow' | 'inner-glow' | 'outer-glow';
  enabled: boolean;
  properties: Record<string, any>;
}

export interface SerializedMask {
  id: string;
  canvasAssetId: string; // Canvas stored as asset
  enabled: boolean;
  inverted: boolean;
}

export interface SerializedClipMask {
  id: string;
  type: 'path' | 'shape' | 'image' | 'text' | 'layer';
  data: {
    path?: string;
    points?: Array<{ x: number; y: number }>;
    shape?: 'rectangle' | 'circle' | 'ellipse' | 'polygon';
    shapeParams?: Record<string, any>;
    image?: string;
    threshold?: number;
    text?: string;
    font?: string;
    fontSize?: number;
    x?: number;
    y?: number;
  };
  enabled: boolean;
  inverted: boolean;
  canvasAssetId: string;
  bounds: { x: number; y: number; width: number; height: number };
  transform: {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    skewX?: number;
    skewY?: number;
  };
  feather?: number;
  clipsLayerIds?: string[];
}

export interface SerializedBrushStroke {
  id: string;
  layerId: string;
  points: Array<{ x: number; y: number; pressure?: number }>;
  color: string;
  size: number;
  opacity: number;
  tool: string;
  timestamp: string;
  blendMode?: string;
}

export interface SerializedTextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rotation?: number;
  effects?: any[];
}

export interface SerializedImageElement {
  id: string;
  assetId: string; // Reference to image asset
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  filters?: any[];
}

export interface SerializedPuffElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  height3D: number;
  color: string;
  type: string;
  assetId?: string; // Canvas data
}

export interface SerializedLayerGroup {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
  expanded: boolean;
  layerIds: string[];
  order: number;
  parentId?: string;
}

// ============================================================================
// ASSET MANAGEMENT
// ============================================================================

export interface AssetRegistry {
  version: string;
  assets: Record<string, Asset>;
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  mimeType: string;
  size: number; // Bytes
  
  // Storage location
  storage: AssetStorage;
  
  // Metadata
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    compression?: string;
    createdAt: string;
    lastAccessed?: string;
  };
  
  // References
  usedByLayers: string[]; // Layer IDs using this asset
  
  // Checksum for integrity
  checksum?: string;
}

export type AssetType = 
  | 'canvas' 
  | 'image' 
  | 'thumbnail' 
  | 'mask' 
  | 'displacement'
  | 'font'
  | 'brush'
  | 'pattern'
  | 'gradient';

export interface AssetStorage {
  type: 'inline' | 'file' | 'external';
  
  // For inline storage (small assets)
  data?: string; // Base64 or data URL
  
  // For file storage (large assets)
  path?: string; // Relative path within project folder
  
  // For external storage
  url?: string;
}

// ============================================================================
// HISTORY & UNDO/REDO
// ============================================================================

export interface ProjectHistory {
  version: string;
  snapshots: HistorySnapshot[];
  currentIndex: number;
  maxSnapshots: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  
  // State delta or full state
  type: 'delta' | 'full';
  
  // For delta snapshots
  changes?: {
    layersModified?: string[];
    layersAdded?: string[];
    layersDeleted?: string[];
    propertyChanges?: Record<string, any>;
  };
  
  // For full snapshots (checkpoints)
  state?: {
    layers: SerializedLayer[];
    layerOrder: string[];
  };
  
  // Metadata
  size: number; // Snapshot size in bytes
}

// ============================================================================
// APP STATE
// ============================================================================

export interface AppStateSnapshot {
  // Active selections
  selectedLayerIds: string[];
  activeLayerId: string | null;
  
  // Active tool
  activeTool?: string;
  
  // View state
  view: {
    zoom: number;
    pan: { x: number; y: number };
    rotation: number;
  };
  
  // Tool settings
  toolSettings?: Record<string, any>;
  
  // UI state
  ui: {
    showLayerPanel: boolean;
    showToolbar: boolean;
    expandedGroups: string[];
  };
  
  // Performance settings
  performance?: {
    maxHistorySnapshots: number;
    autoSaveInterval: number;
    thumbnailQuality: number;
  };
}

// ============================================================================
// PROJECT MANIFEST (for quick project loading/browsing)
// ============================================================================

export interface ProjectManifest {
  id: string;
  name: string;
  thumbnail?: string;
  modifiedAt: string;
  size: number;
  layerCount: number;
  version: string;
}

// ============================================================================
// FILE FORMAT INFO
// ============================================================================

export const PROJECT_FILE_FORMAT = {
  extension: '.closset',
  mimeType: 'application/x-closset-project',
  version: '1.0.0',
  magic: 'CLST', // File magic number
} as const;

export const ASSET_FOLDER_NAME = 'assets';
export const THUMBNAIL_FOLDER_NAME = 'thumbnails';
export const TEMP_FOLDER_NAME = '.temp';
export const BACKUP_FOLDER_NAME = '.backups';


