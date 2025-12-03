/**
 * COMPREHENSIVE PROJECT METADATA SYSTEM
 * Every detail, every coordinate, every property - NOTHING is lost
 * 
 * This is a COMPLETE specification of the design file format
 */

import { BlendMode, LayerType } from '../AdvancedLayerSystemV2';

// ============================================================================
// COMPREHENSIVE PROJECT FILE STRUCTURE
// ============================================================================

export interface ComprehensiveProjectFile {
  // ==== FILE METADATA ====
  fileFormat: {
    magic: 'CLST';                    // Magic number for file identification
    version: string;                  // File format version (e.g., "2.0.0")
    compressionType: 'none' | 'lz' | 'gzip' | 'brotli';
    encrypted: boolean;
    checksum: string;                 // SHA-256 checksum of entire file
  };
  
  // ==== TIMESTAMP METADATA ====
  timestamps: {
    created: string;                  // ISO 8601 timestamp
    modified: string;
    lastOpened: string;
    lastSaved: string;
    totalEditTime: number;            // In seconds
    sessionCount: number;
  };
  
  // ==== PROJECT METADATA ====
  project: {
    id: string;
    name: string;
    description?: string;
    author: string;
    authorEmail?: string;
    version: string;                  // Project version
    tags: string[];
    category?: string;
    keywords: string[];
    copyright?: string;
    license?: string;
  };
  
  // ==== CANVAS CONFIGURATION ====
  canvas: {
    // Dimensions
    width: number;                    // Canvas width in pixels
    height: number;                   // Canvas height in pixels
    unit: 'px' | 'mm' | 'cm' | 'in' | 'pt';
    dpi: number;                      // Dots per inch
    
    // Color
    colorSpace: 'sRGB' | 'Adobe RGB' | 'Display P3' | 'ProPhoto RGB';
    bitDepth: 8 | 16 | 32;
    iccProfile?: string;              // ICC color profile
    backgroundColor: string;          // Hex color
    backgroundOpacity: number;
    
    // 3D/UV specific
    is3D: boolean;
    modelType?: 'tshirt' | 'sphere' | 'cylinder' | 'custom';
    uvMapping?: {
      type: 'planar' | 'cylindrical' | 'spherical' | 'unwrapped';
      scale: { u: number; v: number };
      offset: { u: number; v: number };
      rotation: number;
    };
  };
  
  // ==== LAYERS (COMPREHENSIVE) ====
  layers: ComprehensiveLayer[];
  layerOrder: string[];               // Z-order (bottom to top)
  layerHierarchy: LayerHierarchy;     // Parent-child relationships
  
  // ==== LAYER GROUPS ====
  groups: ComprehensiveLayerGroup[];
  
  // ==== ASSETS (COMPREHENSIVE) ====
  assets: ComprehensiveAssetRegistry;
  
  // ==== COLOR MANAGEMENT ====
  colors: {
    palette: ColorSwatch[];
    recentColors: string[];
    gradients: GradientDefinition[];
    patterns: PatternDefinition[];
  };
  
  // ==== HISTORY & UNDO/REDO ====
  history?: {
    snapshots: HistorySnapshot[];
    currentIndex: number;
    maxSnapshots: number;
  };
  
  // ==== APPLICATION STATE ====
  appState: ComprehensiveAppState;
  
  // ==== CUSTOM DATA ====
  userData?: Record<string, any>;
  pluginData?: Record<string, any>;
}

// ============================================================================
// COMPREHENSIVE LAYER DEFINITION
// ============================================================================

export interface ComprehensiveLayer {
  // ==== BASIC PROPERTIES ====
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;                    // 0-1
  blendMode: BlendMode;
  
  // ==== POSITION & TRANSFORM ====
  position: {
    // Pixel coordinates (canvas space)
    x: number;
    y: number;
    z?: number;                       // For 3D layers
    
    // UV coordinates (0-1 texture space)
    u?: number;
    v?: number;
    
    // World coordinates (3D space)
    worldX?: number;
    worldY?: number;
    worldZ?: number;
  };
  
  transform: {
    // Translation
    translateX: number;
    translateY: number;
    translateZ?: number;
    
    // Scale
    scaleX: number;
    scaleY: number;
    scaleZ?: number;
    maintainAspectRatio: boolean;
    
    // Rotation (degrees)
    rotation: number;
    rotationX?: number;               // 3D rotation
    rotationY?: number;
    rotationZ?: number;
    
    // Skew
    skewX: number;
    skewY: number;
    
    // Pivot point (0-1, relative to layer)
    pivotX: number;
    pivotY: number;
    
    // Matrix (for complex transforms)
    matrix?: number[];                // 4x4 transformation matrix
  };
  
  // ==== BOUNDS & GEOMETRY ====
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    
    // Tight bounding box (exact pixels)
    tightBounds?: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    
    // UV bounds
    uvBounds?: {
      uMin: number;
      vMin: number;
      uMax: number;
      vMax: number;
    };
  };
  
  // ==== LOCKING ====
  locking: {
    position: boolean;
    pixels: boolean;
    transparency: boolean;
    all: boolean;
    aspectRatio: boolean;
  };
  
  // ==== EFFECTS (COMPREHENSIVE) ====
  effects: LayerEffectDefinition[];
  
  // ==== MASKS (COMPREHENSIVE) ====
  masks: {
    layerMask?: ComprehensiveMask;
    clipMask?: ComprehensiveClipMask;
    vectorMask?: ComprehensiveVectorMask;
    clippingMask?: {
      clippedBy: string;              // Layer ID
      clippingMode: 'alpha' | 'luminosity' | 'inverted-alpha';
    };
  };
  
  // ==== CONTENT (TYPE-SPECIFIC) ====
  content: LayerContentDefinition;
  
  // ==== METADATA ====
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    modifiedBy: string[];
    revisionCount: number;
    
    // Parent/group
    groupId?: string;
    parentId?: string;
    
    // Order
    order: number;
    zIndex: number;
    
    // State
    selected: boolean;
    collapsed: boolean;
    
    // Notes
    notes?: string;
    tags?: string[];
  };
  
  // ==== THUMBNAIL ====
  thumbnail: {
    assetId: string;
    width: number;
    height: number;
    quality: number;
  };
  
  // ==== PERFORMANCE HINTS ====
  performance: {
    cached: boolean;
    dirty: boolean;
    needsRecomposite: boolean;
    gpuAccelerated: boolean;
  };
}

// ============================================================================
// LAYER CONTENT DEFINITIONS (TYPE-SPECIFIC)
// ============================================================================

export interface LayerContentDefinition {
  // ==== PAINT LAYER CONTENT ====
  paint?: {
    canvasAssetId: string;
    displacementAssetId?: string;
    normalMapAssetId?: string;
    
    brushStrokes: ComprehensiveBrushStroke[];
    
    // Texture properties
    seamless: boolean;
    tiling: { x: number; y: number };
  };
  
  // ==== TEXT LAYER CONTENT ====
  text?: {
    elements: ComprehensiveTextElement[];
    
    // Global text settings
    defaultFont: string;
    defaultSize: number;
    defaultColor: string;
    
    // Layout
    autoLayout: boolean;
    alignment: 'left' | 'center' | 'right' | 'justify';
    verticalAlignment: 'top' | 'middle' | 'bottom';
    direction: 'ltr' | 'rtl' | 'ttb';
  };
  
  // ==== IMAGE LAYER CONTENT ====
  image?: {
    elements: ComprehensiveImageElement[];
    
    // Image adjustments
    adjustments: {
      brightness: number;
      contrast: number;
      saturation: number;
      hue: number;
      temperature: number;
      tint: number;
      exposure: number;
      highlights: number;
      shadows: number;
      whites: number;
      blacks: number;
      clarity: number;
      vibrance: number;
      sharpness: number;
      noise: number;
    };
  };
  
  // ==== PUFF/3D LAYER CONTENT ====
  puff?: {
    elements: ComprehensivePuffElement[];
    
    // Global puff settings
    globalHeight: number;
    globalSoftness: number;
    displacementMapAssetId: string;
  };
  
  // ==== GROUP LAYER CONTENT ====
  group?: {
    childLayerIds: string[];
    clipChildren: boolean;
    passThrough: boolean;
  };
  
  // ==== ADJUSTMENT LAYER CONTENT ====
  adjustment?: {
    type: 'brightness-contrast' | 'hue-saturation' | 'color-balance' | 'curves' | 'levels' | 'posterize' | 'threshold' | 'gradient-map' | 'channel-mixer';
    properties: Record<string, any>;
    affectedLayers: string[];         // Which layers this affects
  };
}

// ============================================================================
// BRUSH STROKE (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveBrushStroke {
  id: string;
  layerId: string;
  
  // ==== STROKE PATH ====
  points: StrokePoint[];
  
  // ==== BRUSH PROPERTIES ====
  brush: {
    type: 'round' | 'flat' | 'texture' | 'pattern' | 'custom';
    assetId?: string;                 // For custom brushes
    
    size: number;
    hardness: number;                 // 0-1
    spacing: number;                  // 0-1
    angle: number;                    // degrees
    roundness: number;                // 0-1
    
    // Dynamics
    sizeJitter: number;
    opacityJitter: number;
    angleJitter: number;
    positionJitter: number;
    
    // Pressure sensitivity
    pressureSize: boolean;
    pressureOpacity: boolean;
    pressureAngle: boolean;
    
    // Tilt sensitivity (for stylus)
    tiltAngle: boolean;
    tiltOpacity: boolean;
  };
  
  // ==== COLOR ====
  color: ColorDefinition;
  opacity: number;
  
  // ==== BLEND MODE ====
  blendMode: BlendMode;
  
  // ==== TOOL ====
  tool: 'brush' | 'eraser' | 'smudge' | 'blur' | 'sharpen' | 'dodge' | 'burn';
  
  // ==== BOUNDS ====
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  
  // ==== METADATA ====
  timestamp: string;
  duration: number;                   // Milliseconds
  device: 'mouse' | 'touch' | 'stylus' | 'trackpad';
  selected: boolean;
}

export interface StrokePoint {
  // Position
  x: number;
  y: number;
  u?: number;                         // UV coordinates
  v?: number;
  
  // Pressure (0-1)
  pressure: number;
  
  // Tilt (stylus)
  tiltX?: number;                     // -1 to 1
  tiltY?: number;
  
  // Velocity
  velocityX?: number;
  velocityY?: number;
  speed?: number;
  
  // Rotation (stylus rotation)
  rotation?: number;
  
  // Timestamp
  timestamp: number;
}

// ============================================================================
// TEXT ELEMENT (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveTextElement {
  id: string;
  layerId: string;
  
  // ==== CONTENT ====
  text: string;
  
  // ==== POSITION ====
  position: {
    x: number;
    y: number;
    u?: number;
    v?: number;
  };
  
  // ==== TYPOGRAPHY ====
  typography: {
    // Font
    fontFamily: string;
    fontWeight: number | string;      // 100-900 or 'bold'
    fontStyle: 'normal' | 'italic' | 'oblique';
    fontSize: number;
    
    // Spacing
    letterSpacing: number;
    wordSpacing: number;
    lineHeight: number;
    
    // Alignment
    textAlign: 'left' | 'center' | 'right' | 'justify';
    verticalAlign: 'top' | 'middle' | 'bottom' | 'baseline';
    
    // Transform
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecoration: 'none' | 'underline' | 'overline' | 'line-through';
    
    // Advanced
    textIndent: number;
    whiteSpace: 'normal' | 'nowrap' | 'pre' | 'pre-wrap';
    wordBreak: 'normal' | 'break-all' | 'keep-all';
    direction: 'ltr' | 'rtl';
  };
  
  // ==== COLOR & FILL ====
  fill: {
    type: 'solid' | 'gradient' | 'pattern' | 'image';
    color?: string;
    gradient?: GradientDefinition;
    patternId?: string;
    imageId?: string;
    opacity: number;
  };
  
  // ==== STROKE ====
  stroke?: {
    color: string;
    width: number;
    position: 'outside' | 'inside' | 'center';
    opacity: number;
  };
  
  // ==== SHADOW ====
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
    opacity: number;
  };
  
  // ==== EFFECTS ====
  effects: {
    glow?: {
      inner: boolean;
      outer: boolean;
      color: string;
      size: number;
      intensity: number;
    };
    
    bevel?: {
      type: 'inner' | 'outer' | 'emboss';
      depth: number;
      size: number;
      angle: number;
      highlightColor: string;
      shadowColor: string;
    };
    
    gradient?: GradientDefinition;
    
    pattern?: {
      patternId: string;
      scale: number;
      opacity: number;
    };
    
    texture?: {
      assetId: string;
      scale: number;
      opacity: number;
      blendMode: BlendMode;
    };
  };
  
  // ==== TRANSFORM ====
  transform: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
  };
  
  // ==== PATH (FOR TEXT ON PATH) ====
  path?: {
    pathId: string;
    offset: number;
    stretch: boolean;
    baseline: 'top' | 'middle' | 'bottom';
  };
  
  // ==== METADATA ====
  metadata: {
    timestamp: string;
    opacity: number;
    visible: boolean;
    locked: boolean;
    zIndex: number;
  };
  
  // ==== ACCESSIBILITY ====
  accessibility: {
    ariaLabel?: string;
    role?: string;
    tabIndex?: number;
    screenReaderText?: string;
    description?: string;
  };
}

// ============================================================================
// IMAGE ELEMENT (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveImageElement {
  id: string;
  layerId: string;
  name: string;
  
  // ==== IMAGE DATA ====
  assetId: string;
  originalAssetId: string;            // Reference to original unmodified image
  
  // ==== POSITION (UV - PRIMARY) ====
  uvPosition: {
    u: number;                        // Center U (0-1)
    v: number;                        // Center V (0-1)
    uWidth: number;                   // Width in UV space
    uHeight: number;                  // Height in UV space
  };
  
  // ==== POSITION (PIXEL) ====
  pixelPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // ==== TRANSFORM ====
  transform: {
    scaleX: number;
    scaleY: number;
    rotation: number;                 // degrees
    flipHorizontal: boolean;
    flipVertical: boolean;
    maintainAspectRatio: boolean;
  };
  
  // ==== BLEND MODE ====
  blendMode: GlobalCompositeOperation;
  opacity: number;
  
  // ==== FILTERS ====
  filters: {
    brightness: number;               // -100 to 100
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    sharpen: number;
    grayscale: number;                // 0-1
    sepia: number;
    invert: number;
    
    // Advanced filters
    colorMatrix?: number[];           // 4x5 color matrix
    convolutionMatrix?: number[];     // Custom convolution
  };
  
  // ==== CROPPING ====
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // ==== METADATA ====
  metadata: {
    timestamp: string;
    visible: boolean;
    locked: boolean;
    zIndex: number;
    
    // Original image info
    originalWidth: number;
    originalHeight: number;
    originalFormat: string;
    fileSize: number;
  };
}

// ============================================================================
// PUFF ELEMENT (3D DISPLACEMENT - COMPREHENSIVE)
// ============================================================================

export interface ComprehensivePuffElement {
  id: string;
  layerId: string;
  
  // ==== POSITION ====
  position: {
    x: number;
    y: number;
    u?: number;
    v?: number;
  };
  
  // ==== GEOMETRY ====
  geometry: {
    type: 'circle' | 'ellipse' | 'rectangle' | 'polygon' | 'custom';
    radius?: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  };
  
  // ==== 3D PROPERTIES ====
  displacement: {
    height: number;                   // Displacement height (0-1)
    softness: number;                 // Edge softness (0-1)
    falloff: 'linear' | 'smooth' | 'exponential' | 'custom';
    customFalloffCurve?: number[];    // Bezier curve points
  };
  
  // ==== COLOR & TEXTURE ====
  appearance: {
    color: string;
    opacity: number;
    textureAssetId?: string;
    normalMapAssetId?: string;
    
    // Material properties
    metallic?: number;
    roughness?: number;
    reflectivity?: number;
  };
  
  // ==== METADATA ====
  metadata: {
    timestamp: string;
    visible: boolean;
    locked: boolean;
  };
}

// ============================================================================
// MASKS (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveMask {
  id: string;
  type: 'layer' | 'vector' | 'clip';
  
  // ==== MASK DATA ====
  assetId: string;                    // Canvas/image asset
  
  // ==== PROPERTIES ====
  enabled: boolean;
  inverted: boolean;
  linked: boolean;                    // Link to layer position
  
  // ==== DENSITY & FEATHER ====
  density: number;                    // 0-1
  feather: number;                    // Pixels
  
  // ==== BOUNDS ====
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // ==== TRANSFORM (INDEPENDENT OF LAYER) ====
  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
}

export interface ComprehensiveClipMask {
  id: string;
  type: 'path' | 'shape' | 'image' | 'text' | 'layer';
  
  // ==== SHAPE DATA ====
  path?: {
    d: string;                        // SVG path data
    fillRule: 'nonzero' | 'evenodd';
  };
  
  shape?: {
    type: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'custom';
    properties: Record<string, any>;
  };
  
  // ==== PROPERTIES ====
  enabled: boolean;
  inverted: boolean;
  feather: number;
  
  // ==== CLIPPING MODE ====
  clippingMode: {
    type: 'alpha' | 'luminosity' | 'color';
    threshold?: number;
  };
  
  // ==== AFFECTED LAYERS ====
  clipsLayerIds: string[];
  
  // ==== MASK CANVAS ====
  assetId: string;
}

export interface ComprehensiveVectorMask {
  id: string;
  
  // ==== VECTOR PATHS ====
  paths: VectorPath[];
  
  // ==== PROPERTIES ====
  enabled: boolean;
  inverted: boolean;
  
  // ==== RESOLUTION ====
  resolution: 'low' | 'medium' | 'high' | 'ultra';
}

export interface VectorPath {
  id: string;
  closed: boolean;
  fillRule: 'nonzero' | 'evenodd';
  
  // ==== POINTS ====
  points: VectorPoint[];
}

export interface VectorPoint {
  x: number;
  y: number;
  u?: number;
  v?: number;
  
  // ==== HANDLES (BEZIER) ====
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
  
  // ==== PROPERTIES ====
  cornerRadius?: number;
  smooth: boolean;
}

// ============================================================================
// EFFECTS (COMPREHENSIVE)
// ============================================================================

export interface LayerEffectDefinition {
  id: string;
  type: EffectType;
  enabled: boolean;
  opacity: number;
  blendMode: BlendMode;
  
  // ==== EFFECT-SPECIFIC PROPERTIES ====
  properties: EffectProperties;
}

export type EffectType = 
  | 'blur' | 'gaussian-blur' | 'motion-blur' | 'radial-blur' | 'zoom-blur'
  | 'sharpen' | 'unsharp-mask'
  | 'drop-shadow' | 'inner-shadow'
  | 'outer-glow' | 'inner-glow'
  | 'bevel-emboss'
  | 'satin'
  | 'color-overlay'
  | 'gradient-overlay'
  | 'pattern-overlay'
  | 'stroke'
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'color-balance'
  | 'curves'
  | 'levels'
  | 'posterize'
  | 'threshold'
  | 'noise'
  | 'distort'
  | 'custom';

export interface EffectProperties {
  // Blur
  blurRadius?: number;
  blurAngle?: number;
  blurQuality?: 'low' | 'medium' | 'high';
  
  // Shadow/Glow
  offsetX?: number;
  offsetY?: number;
  color?: string;
  spread?: number;
  size?: number;
  choke?: number;
  
  // Bevel
  depth?: number;
  direction?: 'up' | 'down';
  softness?: number;
  angle?: number;
  altitude?: number;
  highlightColor?: string;
  shadowColor?: string;
  
  // Overlay
  overlayColor?: string;
  gradientId?: string;
  patternId?: string;
  
  // Stroke
  strokeWidth?: number;
  strokeColor?: string;
  strokePosition?: 'inside' | 'outside' | 'center';
  
  // Color adjustments
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  
  // Curves/Levels
  curvePoints?: Array<{ x: number; y: number }>;
  inputLevels?: { black: number; gray: number; white: number };
  outputLevels?: { black: number; white: number };
  
  // Custom
  [key: string]: any;
}

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================

export interface ColorDefinition {
  type: 'solid' | 'gradient' | 'pattern';
  
  // Solid color
  solid?: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    hsv: { h: number; s: number; v: number };
    alpha: number;
  };
  
  // Gradient
  gradient?: GradientDefinition;
  
  // Pattern
  pattern?: {
    patternId: string;
    scale: number;
    rotation: number;
  };
}

export interface GradientDefinition {
  id: string;
  type: 'linear' | 'radial' | 'angular' | 'diamond' | 'conical';
  
  // Direction/Position
  angle?: number;                     // For linear/angular
  position?: {                        // For radial
    x: number;
    y: number;
  };
  scale?: {
    x: number;
    y: number;
  };
  
  // Color stops
  stops: GradientStop[];
  
  // Repeat
  repeat: 'no-repeat' | 'repeat' | 'reflect';
}

export interface GradientStop {
  id: string;
  position: number;                   // 0-1
  color: string;
  opacity: number;
}

export interface PatternDefinition {
  id: string;
  name: string;
  assetId: string;
  
  // Repeat
  repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
  
  // Transform
  scale: number;
  rotation: number;
  offset: { x: number; y: number };
}

export interface ColorSwatch {
  id: string;
  name: string;
  color: string;
  category?: string;
  favorite: boolean;
}

// ============================================================================
// ASSET REGISTRY (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveAssetRegistry {
  version: string;
  assets: Record<string, ComprehensiveAsset>;
  
  // Asset organization
  collections: AssetCollection[];
  tags: string[];
}

export interface ComprehensiveAsset {
  id: string;
  name: string;
  type: AssetType;
  category?: string;
  
  // ==== FILE INFO ====
  file: {
    mimeType: string;
    size: number;
    originalName?: string;
    extension?: string;
  };
  
  // ==== STORAGE ====
  storage: {
    type: 'inline' | 'file' | 'external' | 'cdn';
    data?: string;                    // Base64 for inline
    path?: string;                    // Relative path for file
    url?: string;                     // External URL
    compression?: 'none' | 'gzip' | 'brotli';
  };
  
  // ==== METADATA ====
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    colorSpace?: string;
    bitDepth?: number;
    hasAlpha?: boolean;
    
    // Timestamps
    createdAt: string;
    modifiedAt: string;
    lastAccessed?: string;
    
    // Usage
    usedByLayers: string[];
    referenceCount: number;
  };
  
  // ==== INTEGRITY ====
  integrity: {
    checksum: string;                 // SHA-256
    verified: boolean;
  };
  
  // ==== OPTIMIZATION ====
  optimization: {
    optimized: boolean;
    originalSize?: number;
    optimizedSize?: number;
    compressionRatio?: number;
  };
}

export type AssetType = 
  | 'canvas'
  | 'image'
  | 'thumbnail'
  | 'mask'
  | 'displacement'
  | 'normal-map'
  | 'font'
  | 'brush'
  | 'pattern'
  | 'gradient'
  | 'texture'
  | 'model-3d'
  | 'audio'
  | 'video'
  | 'custom';

export interface AssetCollection {
  id: string;
  name: string;
  assetIds: string[];
  thumbnail?: string;
}

// ============================================================================
// HISTORY & UNDO/REDO
// ============================================================================

export interface HistorySnapshot {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  
  // ==== SNAPSHOT TYPE ====
  type: 'full' | 'delta';
  
  // ==== DELTA CHANGES (EFFICIENT) ====
  delta?: {
    layersModified: Record<string, Partial<ComprehensiveLayer>>;
    layersAdded: string[];
    layersDeleted: string[];
    assetsModified: Record<string, Partial<ComprehensiveAsset>>;
    assetsAdded: string[];
    assetsDeleted: string[];
  };
  
  // ==== FULL STATE (CHECKPOINTS) ====
  fullState?: {
    layers: ComprehensiveLayer[];
    layerOrder: string[];
    assets: Record<string, ComprehensiveAsset>;
  };
  
  // ==== METADATA ====
  size: number;                       // Bytes
  compressed: boolean;
}

// ============================================================================
// APPLICATION STATE (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveAppState {
  // ==== SELECTION ====
  selection: {
    selectedLayerIds: string[];
    activeLayerId: string | null;
    selectionBounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  
  // ==== VIEW STATE ====
  view: {
    zoom: number;
    zoomMin: number;
    zoomMax: number;
    
    pan: { x: number; y: number };
    
    rotation: number;
    
    // 3D camera
    camera?: {
      position: [number, number, number];
      target: [number, number, number];
      fov: number;
      near: number;
      far: number;
    };
  };
  
  // ==== ACTIVE TOOL ====
  tool: {
    activeTool: string;
    toolSettings: Record<string, any>;
    recentTools: string[];
  };
  
  // ==== UI STATE ====
  ui: {
    panels: {
      layers: { visible: boolean; width: number; side: 'left' | 'right' };
      properties: { visible: boolean; width: number; side: 'left' | 'right' };
      tools: { visible: boolean; width: number; side: 'left' | 'right' };
      timeline: { visible: boolean; height: number };
    };
    
    expandedGroups: string[];
    collapsedSections: string[];
    
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  
  // ==== GRID & GUIDES ====
  grid: {
    enabled: boolean;
    size: number;
    color: string;
    opacity: number;
    snapToGrid: boolean;
  };
  
  guides: {
    enabled: boolean;
    guides: Array<{
      id: string;
      type: 'horizontal' | 'vertical';
      position: number;
      color: string;
    }>;
    snapToGuides: boolean;
  };
  
  // ==== PERFORMANCE SETTINGS ====
  performance: {
    maxHistorySnapshots: number;
    autoSaveInterval: number;
    thumbnailQuality: number;
    gpuAcceleration: boolean;
    maxTextureSize: number;
    cacheSize: number;
  };
}

// ============================================================================
// LAYER HIERARCHY
// ============================================================================

export interface LayerHierarchy {
  root: string[];                     // Top-level layer IDs
  tree: Record<string, LayerHierarchyNode>;
}

export interface LayerHierarchyNode {
  id: string;
  parentId: string | null;
  childIds: string[];
  depth: number;
  expanded: boolean;
}

// ============================================================================
// LAYER GROUP (COMPREHENSIVE)
// ============================================================================

export interface ComprehensiveLayerGroup {
  id: string;
  name: string;
  
  // ==== PROPERTIES ====
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locking: {
    position: boolean;
    pixels: boolean;
    transparency: boolean;
    all: boolean;
  };
  
  // ==== HIERARCHY ====
  childLayerIds: string[];
  parentGroupId?: string;
  
  // ==== BEHAVIOR ====
  clipChildren: boolean;
  passThrough: boolean;               // Pass-through blending
  collapsed: boolean;
  
  // ==== METADATA ====
  metadata: {
    createdAt: string;
    updatedAt: string;
    order: number;
    thumbnail?: string;
  };
}


