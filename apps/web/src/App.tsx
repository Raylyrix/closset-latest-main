import { useEffect, useState, useRef, useMemo } from 'react';
import { create } from 'zustand';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, GizmoHelper, GizmoViewport, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import localforage from 'localforage';
import LZString from 'lz-string';
import { unifiedPerformanceManager } from './utils/UnifiedPerformanceManager';
import { canvasPool } from './utils/CanvasPool';
import { useAdvancedLayerStoreV2, TextElement, AdvancedLayer } from './core/AdvancedLayerSystemV2';
import { useAutomaticLayerManager } from './core/AutomaticLayerManager';
import { createDisplacementCanvas, CANVAS_CONFIG } from './constants/CanvasSizes';
import ShirtRefactored from './components/ShirtRefactored'; // Use new refactored component
import { AdvancedLayerSystemV2Test } from './components/AdvancedLayerSystemV2Test';
// PERFORMANCE FIX: Removed Brush3DIntegration import to prevent conflicts with existing painting system
import { LeftPanel } from './components/LeftPanel';
import { Section } from './components/Section';
import { CustomSelect } from './components/CustomSelect';
import { ModelManager } from './components/ModelManager';
import { BackgroundManager } from './components/BackgroundManager';
import { BackgroundScene } from './components/BackgroundScene';
import { CursorOverlay } from './components/CursorOverlay';
import { MainLayout } from './components/MainLayout.tsx';
import { ResponsiveLayout } from './components/ResponsiveLayout';
import { ToolRouter } from './components/ToolRouter';
import { TransformGizmo } from './components/TransformGizmo';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { EmbroideryStitch, EmbroideryPattern } from './services/embroideryService';
import { handleRenderingError, handleCanvasError, ErrorCategory, ErrorSeverity } from './utils/CentralizedErrorHandler';
import { vectorStore } from './vector/vectorState';
import { puffVectorEngine, PuffVectorEngineState } from './vector/PuffVectorEngine';
import { renderStitchType } from './utils/stitchRendering';
import VectorEditorOverlay from './vector/VectorEditorOverlay';
// import { UnifiedPuffPrintSystem } from './components/UnifiedPuffPrintSystem'; // Disabled - using ShirtRefactored puff system
import { AdvancedPuff3DSystem } from './utils/AdvancedPuff3DSystem';
import { AdvancedUVSystem } from './utils/AdvancedUVSystem';
import { AdvancedPuffGenerator } from './utils/AdvancedPuffGenerator';
import { AdvancedPuffErrorHandler } from './utils/AdvancedPuffErrorHandler';
import './styles/AdvancedPuffPrint.css';
import { Project as AdvProject, Layer as AdvLayer, createDefaultStyles, createDefaultTransform } from './types/layers';
import { history } from './utils/history';

// Import new domain stores for state management
import { useModelStore, useToolStore, useProjectStore } from './stores/domainStores';

const cloneProject = (proj: AdvProject | null): AdvProject | null => {
  if (!proj) return null;
  return JSON.parse(JSON.stringify(proj)) as AdvProject;
};

type Tool =
  | 'brush' | 'eraser' | 'fill' | 'picker' | 'smudge' | 'blur' | 'select' | 'transform' | 'move' | 'text'
  | 'decals' | 'layers' | 'puffPrint' | 'patternMaker' | 'advancedSelection' | 'vectorTools' | 'aiAssistant'
  | 'printExport' | 'cloudSync' | 'layerEffects' | 'colorGrading' | 'animation' | 'templates' | 'batch'
  | 'advancedBrush' | 'meshDeformation' | 'proceduralGenerator' | '3dPainting' | 'smartFill'
  | 'line' | 'rect' | 'ellipse' | 'gradient' | 'moveText' | 'selectText' | 'undo' | 'redo' | 'embroidery' | 'vector' | 'shapes'
  | 'image' | 'importImage' | 'symmetry' | 'symmetryX' | 'symmetryY' | 'symmetryZ'
  | 'universalSelect';

type Layer = { id: string; name: string; visible: boolean; canvas: HTMLCanvasElement; history: ImageData[]; future: ImageData[]; lockTransparent?: boolean; mask?: HTMLCanvasElement | null; order: number; displacementCanvas?: HTMLCanvasElement };

// Vector path types (UV-native)
type VectorHandle = { u: number; v: number } | null;
type VectorAnchor = {
  u: number;
  v: number;
  inHandle: VectorHandle;
  outHandle: VectorHandle;
  world?: [number, number, number];
  curveControl?: boolean; // if true, this anchor acts as a control point to curve its neighboring segment(s)
};
type VectorPath = {
  id: string;
  points: VectorAnchor[];
  closed: boolean;
};

type Decal = { id: string; name: string; image: ImageBitmap; width: number; height: number; u: number; v: number; scale: number; rotation: number; opacity: number; blendMode: GlobalCompositeOperation; layerId?: string };


type SelectionTransform = {
  x: number; y: number; cx: number; cy: number; 
  width: number; height: number;
  rotation: number; scale: number;
  skewX: number; skewY: number;
};

type CheckpointMeta = { id: string; name: string; timestamp: number; size: number; createdAt: number; sizeBytes: number };

// Undo/Redo System Types
interface AppStateSnapshot {
  id: string;
  timestamp: number;
  action: string;
  state: Partial<AppState>;
  layerData?: Array<{
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    canvasData?: string; // Base64 encoded canvas data
  }>;
  puffCanvasData?: string; // Base64 encoded puff canvas data
  composedCanvasData?: string; // Base64 encoded composed canvas data
}

interface AppState {
  // Undo/Redo System
  history: AppStateSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
  saveState: (action?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Tools
  activeTool: Tool;
  setTool: (tool: Tool) => void;
  vectorMode: boolean;
  setVectorMode: (enabled: boolean) => void;
  showAnchorPoints: boolean;
  setShowAnchorPoints: (enabled: boolean) => void;
  showPuffVectorPrompt: boolean;
  puffVectorPromptMessage: string;
  setPuffVectorPrompt: (visible: boolean, message?: string) => void;
  
  // Brush settings
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  brushSpacing: number;
  brushShape: 'round' | 'square' | 'diamond' | 'triangle' | 'airbrush' | 'calligraphy' | 'spray' | 'texture' | 'watercolor' | 'oil' | 'charcoal' | 'pencil' | 'marker' | 'highlighter' | 'chalk' | 'ink' | 'pastel' | 'acrylic' | 'gouache' | 'stencil' | 'stamp' | 'blur' | 'smudge';
  brushRotation: number;
  brushDynamics: boolean;
  brushSymmetry: boolean;
  symmetryAngle: number;
  blendMode: GlobalCompositeOperation;
  cursorAngle: number;
  brushFlow: number;
  brushSmoothing: number;
  usePressureSize: boolean;
  usePressureOpacity: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeEnabled: boolean;
  
  
  // Symmetry settings
  symmetryX: boolean;
  symmetryY: boolean;
  symmetryZ: boolean;
  
  // Fill settings
  fillTolerance: number;
  fillGrow: number;
  fillAntiAlias: boolean;
  fillContiguous: boolean;
  
  // Fabric/Model settings
  roughness: number;
  metalness: number;
  fabric: string;
  fabricPreset: string;
  modelUrl: string | null;
  modelPosition: [number, number, number];
  modelRotation: [number, number, number];
  modelScale: number;
  modelChoice: 'tshirt' | 'sphere' | 'custom';
  modelType: string | null;
  modelScene: THREE.Group | null;
  modelBoundsHeight: number;
  modelMinDimension: number;
  
  // Imported images state
  importedImages: Array<{
    id: string;
    name: string;
    dataUrl: string;
    src?: string; // Additional src property for compatibility
    // UV coordinates (0-1 range) - PRIMARY for texture mapping
    u: number;          // UV X center (0-1)
    v: number;          // UV Y center (0-1)
    uWidth: number;     // Width in UV space (0-1)
    uHeight: number;    // Height in UV space (0-1)
    // Legacy pixel coordinates - DEPRECATED but kept for migration
    x?: number;
    y?: number;
    width?: number;
    height?: number;
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
  }>;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  
  // Shape settings
  shapeMode: 'fill' | 'stroke' | 'both';
  shapeStrokeWidth: number;
  shapeType: string;
  shapeSize: number;
  shapeOpacity: number;
  shapeColor: string;
  shapeRotation: number;
  shapePositionX: number;
  shapePositionY: number;
  shapeElements: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    opacity: number;
    color: string;
    rotation: number;
    positionX: number;
    positionY: number;
    gradient: any;
    // UV coordinates for 3D mapping
    u?: number;
    v?: number;
    uWidth?: number;
    uHeight?: number;
    // Stroke properties
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    // Additional properties for compatibility
    visible?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  }>;
  clearShapes: () => void;
  
  // Puff Print settings
  puffBrushSize: number;
  puffBrushOpacity: number;
  puffHeight: number;
  puffSoftness: number;
  puffOpacity: number;
  puffCurvature: number;
  puffShape: 'cube' | 'sphere' | 'cylinder' | 'pipe';
  puffColor: string;
  puffCanvas: HTMLCanvasElement | null;
  displacementCanvas: HTMLCanvasElement | null;
  normalCanvas: HTMLCanvasElement | null;
  
  // Embroidery settings
  embroideryStitches: EmbroideryStitch[];
  embroideryPattern: EmbroideryPattern | null;
  embroideryThreadType: 'cotton' | 'polyester' | 'silk' | 'metallic' | 'glow';
  embroideryThickness: number;
  embroideryOpacity: number;
  embroideryColor: string;
  embroideryStitchType: 'satin' | 'fill' | 'outline' | 'cross-stitch' | 'cross' | 'chain' | 'backstitch' | 
    'running' | 'running-stitch' | 'zigzag' | 'split' | 'fill_tatami' | 'seed' | 'french-knot' | 'french_knot' | 
    'couching' | 'blanket' | 'herringbone' | 'feather' | 'long_short_satin' | 'bullion' | 'stem' | 'cable' | 
    'coral' | 'fly' | 'lazy-daisy' | 'long-short' | 'padded-satin' | 'pistil' | 'satin-fill' | 'straight' | 'whip';
  embroideryPatternDescription: string;
  embroideryAIEnabled: boolean;
  embroideryThreadColor: string;
  embroideryThreadThickness: number;
  embroiderySpacing: number;
  embroideryDensity: number;
  embroideryCanvas: HTMLCanvasElement | null;
  embroideryAngle: number;
  embroideryScale: number;
  currentEmbroideryPath: {x: number, y: number}[]; // UV coordinates (0-1 range)
  lastEmbroideryPoint: {x: number, y: number} | null; // Track last point for continuous drawing
  
  // Vector tool settings (using existing VectorPath system)
  vectorStrokeColor: string;
  vectorStrokeWidth: number;
  vectorFillColor: string;
  vectorFill: boolean;
  setVectorStrokeColor: (color: string) => void;
  setVectorStrokeWidth: (width: number) => void;
  setVectorFillColor: (color: string) => void;
  setVectorFill: (fill: boolean) => void;
  
  // Vector editing state
  selectedAnchor: { pathId: string; anchorIndex: number } | null;
  vectorEditMode: 'pen' | 'select' | 'move' | 'curve';
  setSelectedAnchor: (anchor: { pathId: string; anchorIndex: number } | null) => void;
  setVectorEditMode: (mode: 'pen' | 'select' | 'move' | 'curve') => void;
  moveAnchor: (pathId: string, anchorIndex: number, newU: number, newV: number) => void;
  addCurveHandle: (pathId: string, anchorIndex: number, handleType: 'in' | 'out', u: number, v: number) => void;
  
  // Layers are now managed entirely by AdvancedLayerSystemV2
  // Legacy layer properties removed to prevent conflicts
  // But we need to add them back as getters for backward compatibility
  layers: Layer[];
  activeLayerId: string | null;
  composedCanvas: HTMLCanvasElement | null;
  textElements: TextElement[];
  brushStrokes: Array<{
    id: string;
    layerId: string;
    points: Array<{x: number, y: number}>;
    color: string;
    size: number;
    opacity: number;
    timestamp: number;
  }>;
  
  composedVersion: number;
  baseTexture: HTMLImageElement | HTMLCanvasElement | null;
  
  // Decals
  decals: Decal[];
  activeDecalId: string | null;
  
  // Text
  textSize: number;
  textFont: string;
  textColor: string;
  textBold: boolean;
  textItalic: boolean;
  textAlign: CanvasTextAlign;
  lastText: string;
  
  // Selection & Transform
  layerTransform: SelectionTransform | null;
  
  // Background
  backgroundScene: 'studio' | 'sky' | 'city' | 'forest' | 'space' | 'gradient';
  backgroundIntensity: number;
  backgroundRotation: number;
  
  activeTextId: string | null;
  hoveredTextId: string | null;
  
  // Shape elements
  activeShapeId: string | null;
  hoveredShapeId: string | null;
  
  // Panel states
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  modelManagerOpen: boolean;
  backgroundManagerOpen: boolean;
  
  // Universal Grid & Scale settings
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  showRulers: boolean;
  rulerUnits: 'px' | 'mm' | 'in';
  scale: number;
  showGuides: boolean;
  guideColor: string;
  snapToGrid: boolean;
  snapDistance: number;
  showMeasurements: boolean;
  measurementUnits: 'px' | 'mm' | 'in';
  
  // Controls
  controlsEnabled: boolean;
  controlsTarget: [number, number, number];
  controlsDistance: number;
  clickingOnModel: boolean;

  // Vector paths (UV-native)
  vectorPaths: VectorPath[];
  activePathId: string | null;
  puffVectorHistory: PuffVectorEngineState[];
  puffVectorFuture: PuffVectorEngineState[];

  
  // Methods
  setActiveTool: (tool: Tool) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushHardness: (hardness: number) => void;
  setBrushSpacing: (spacing: number) => void;
  setBrushShape: (shape: 'round' | 'square' | 'diamond' | 'triangle' | 'airbrush' | 'calligraphy' | 'spray' | 'texture' | 'watercolor' | 'oil' | 'charcoal' | 'pencil' | 'marker' | 'highlighter' | 'chalk' | 'ink' | 'pastel' | 'acrylic' | 'gouache' | 'stencil' | 'stamp' | 'blur' | 'smudge') => void;
  setBrushRotation: (rotation: number) => void;
  setBrushDynamics: (dynamics: boolean) => void;
  setBrushSymmetry: (symmetry: boolean) => void;
  setSymmetryX: (symmetry: boolean) => void;
  setSymmetryY: (symmetry: boolean) => void;
  setSymmetryZ: (symmetry: boolean) => void;
  setSymmetryAngle: (angle: number) => void;
  setBlendMode: (mode: GlobalCompositeOperation) => void;
  setCursorAngle: (angle: number) => void;
  setFillTolerance: (tolerance: number) => void;
  setFillGrow: (grow: number) => void;
  setFillAntiAlias: (antiAlias: boolean) => void;
  setFillContiguous: (contiguous: boolean) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeEnabled: (enabled: boolean) => void;
  setRoughness: (roughness: number) => void;
  setMetalness: (metalness: number) => void;
  setFabric: (fabric: string) => void;
  setModelUrl: (url: string | null) => void;
  setModelPosition: (position: [number, number, number]) => void;
  setModelRotation: (rotation: [number, number, number]) => void;
  setModelScale: (scale: number) => void;
  setActiveLayerId: (id: string | null) => void;
  setActiveDecalId: (id: string | null) => void;
  setTextSize: (size: number) => void;
  setTextFont: (font: string) => void;
  setTextColor: (color: string) => void;
  setTextBold: (bold: boolean) => void;
  setTextItalic: (italic: boolean) => void;
  setTextAlign: (align: CanvasTextAlign) => void;
  setLastText: (text: string) => void;
  setBackgroundScene: (scene: 'studio' | 'sky' | 'city' | 'forest' | 'space' | 'gradient') => void;
  setBackgroundIntensity: (intensity: number) => void;
  setBackgroundRotation: (rotation: number) => void;
  setActiveTextId: (id: string | null) => void;
  setActiveShapeId: (id: string | null) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setModelManagerOpen: (open: boolean) => void;
  openModelManager: () => void;
  closeModelManager: () => void;
  setControlsEnabled: (enabled: boolean) => void;
  setControlsTarget: (target: [number, number, number]) => void;
  setControlsDistance: (distance: number) => void;
  setClickingOnModel: (clicking: boolean) => void;
  // Vector methods
  startVectorPath: () => string;
  insertVectorAnchorAt: (pathId: string, insertIndex: number, uv: { u: number; v: number }) => void;
  addVectorAnchor: (uv: { u: number; v: number }) => void;
  moveVectorAnchor: (uv: { u: number; v: number }) => void;
  setAnchorProps: (pathId: string, anchorIndex: number, patch: Partial<VectorAnchor>) => void;
  // Multi-select support
  selectedAnchors?: Array<{ pathId: string; anchorIndex: number }>;
  setSelectedAnchors: (sels: Array<{ pathId: string; anchorIndex: number }>) => void;
  addSelectedAnchor: (sel: { pathId: string; anchorIndex: number }) => void;
  removeSelectedAnchor: (sel: { pathId: string; anchorIndex: number }) => void;
  clearSelectedAnchors: () => void;
  deleteSelectedAnchors: () => void;
  moveSelectedAnchorsBy: (du: number, dv: number) => void;
  setAnchorHandle: (which: 'in' | 'out', uv: { u: number; v: number }) => void;
  toggleActivePathClosed: () => void;
  setAnchorWorld: (world: [number, number, number]) => void;
  finishVectorPath: () => void;
  cancelVectorPath: () => void;
  clearVectorPaths: () => void;
  emergencyClearVectorPaths: () => boolean;
  recordPuffHistory: (snapshot?: PuffVectorEngineState) => void;
  restorePuffHistoryBackward: () => boolean;
  restorePuffHistoryForward: () => boolean;
  clearPuffHistory: () => void;
  
  // Grid & Scale setters
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setGridColor: (color: string) => void;
  setGridOpacity: (opacity: number) => void;
  setShowRulers: (show: boolean) => void;
  setRulerUnits: (units: 'px' | 'mm' | 'in') => void;
  setScale: (scale: number) => void;
  setShowGuides: (show: boolean) => void;
  setGuideColor: (color: string) => void;
  setSnapToGrid: (snap: boolean) => void;
  setSnapDistance: (distance: number) => void;
  setShowMeasurements: (show: boolean) => void;
  setMeasurementUnits: (units: 'px' | 'mm' | 'in') => void;
  
  // Puff Print setters
  setPuffBrushSize: (size: number) => void;
  setPuffBrushOpacity: (opacity: number) => void;
  setPuffHeight: (height: number) => void;
  setPuffSoftness: (softness: number) => void;
  setPuffOpacity: (opacity: number) => void;
  setPuffCurvature: (curvature: number) => void;
  setPuffShape: (shape: 'cube' | 'sphere' | 'cylinder' | 'pipe') => void;
  setPuffColor: (color: string) => void;
  
  // Embroidery setters
  setEmbroideryStitches: (stitches: EmbroideryStitch[]) => void;
  setEmbroideryPattern: (pattern: EmbroideryPattern | null) => void;
  setEmbroideryThreadType: (type: 'cotton' | 'polyester' | 'silk' | 'metallic' | 'glow') => void;
  setEmbroideryThickness: (thickness: number) => void;
  setEmbroideryOpacity: (opacity: number) => void;
  setEmbroideryColor: (color: string) => void;
  setEmbroideryStitchType: (type: 'satin' | 'fill' | 'outline' | 'cross-stitch' | 'cross' | 'chain' | 'backstitch' | 
    'running' | 'running-stitch' | 'zigzag' | 'split' | 'fill_tatami' | 'seed' | 'french-knot' | 'french_knot' | 
    'couching' | 'blanket' | 'herringbone' | 'feather' | 'long_short_satin' | 'bullion') => void;
  setEmbroideryPatternDescription: (description: string) => void;
  setEmbroideryAIEnabled: (enabled: boolean) => void;
  setEmbroideryThreadColor: (color: string) => void;
  setEmbroideryThreadThickness: (thickness: number) => void;
  setEmbroiderySpacing: (spacing: number) => void;
  setEmbroideryDensity: (density: number) => void;
  setEmbroideryAngle: (angle: number) => void;
  setEmbroideryScale: (scale: number) => void;
  setCurrentEmbroideryPath: (path: {x: number, y: number}[]) => void;
  
  // Additional missing methods
  selectTextElement: (id: string | null) => void;
  removeTextElement: (id: string) => void;
  setModelChoice: (choice: 'tshirt' | 'sphere' | 'custom') => void;
  setModelType: (type: string | null) => void;
  setModelBoundsHeight: (height: number) => void;
  setModelMinDimension: (dimension: number) => void;
  setFrame: (target: [number, number, number], distance: number) => void;
  resetModelTransform: () => void;
  setLastHitUV: (uv: { u: number; v: number }) => void;
  setHoveredTextId: (id: string | null) => void;
  openBackgroundManager: () => void;
  closeBackgroundManager: () => void;
  snapshot: () => void;
  selectLayerForTransform: (layerId: string) => void;
  updateLayerTransform: (patch: Partial<SelectionTransform>) => void;
  applyLayerTransform: () => void;
  cancelLayerTransform: () => void;
  addDecal: (image: ImageBitmap, name?: string) => string;
  updateDecal: (id: string, patch: Partial<Decal>) => void;
  deleteDecal: (id: string) => void;
  addTextElement: (text: string, uv: { u: number; v: number }, layerId?: string) => string;
  updateTextElement: (id: string, patch: Partial<TextElement>) => void;
  deleteTextElement: (id: string) => void;
  addShapeElement: (shape: any) => string;
  updateShapeElement: (id: string, patch: any) => void;
  deleteShapeElement: (id: string) => void;
  duplicateShapeElement: (id: string) => string | null;
  addLayer?: (name?: string) => string;
  deleteLayer?: (id: string) => void;
  reorderLayers?: (from: number, to: number) => void;
  mergeDown?: (id: string) => void;
  selectActiveLayerContent?: () => void;
  saveCheckpoint: (name?: string) => Promise<CheckpointMeta>;
  loadCheckpoint: (id: string) => Promise<void>;
  listCheckpoints: () => Promise<CheckpointMeta[]>;
  deleteCheckpoint: (id: string) => Promise<void>;
  initCanvases: (w: number, h: number) => void;
  getActiveLayer: () => Layer | any | null;
  getOrCreateActiveLayer: (toolType: string) => Layer | any | null;
  getLayerNameForTool: (toolType: string) => string;
  createToolLayer: (toolType: string, options?: any) => string;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: string) => void;
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string;
  composeLayers: (forceClear?: boolean) => void;
  composeDisplacementMaps: () => HTMLCanvasElement | null;
  commit: () => void;
  setBaseTexture: (texture: HTMLImageElement | HTMLCanvasElement | null) => void;
  generateBaseLayer: () => void;
  addDecalFromFile: (file: File) => Promise<string>;
  forceRerender: () => void;

  // Phase 1: Advanced Layer System (scaffold)
  project: AdvProject | null;
  selectedLayerV2: string | null;
  setProject: (p: AdvProject | null) => void;
  addLayerV2: (layer: AdvLayer, index?: number) => void;
  updateLayerV2: (id: string, patch: Partial<AdvLayer>) => void;
  reorderLayersV2: (from: number, to: number) => void;
  selectLayerV2: (id: string | null) => void;

  // Phase 2: Image layer operations (v2)
  addImageV2: (fileOrUrl: File | string) => Promise<string>;
  replaceImageV2: (layerId: string, fileOrUrl: File | string) => Promise<void>;
  setImagePropsV2: (layerId: string, patch: Partial<{ opacity: number; blendMode: GlobalCompositeOperation; transform: Partial<{ x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX?: number; skewY?: number; }> }>) => void;
  setClipMaskV2: (layerId: string, maskLayerId: string | null) => void;
  convertToSmartV2: (layerId: string) => void;
  rasterizeV2: (layerId: string) => void;
  
  // Browser caching methods
  saveProjectState: () => Promise<boolean>;
  loadProjectState: () => Promise<boolean>;
  clearProjectState: () => Promise<boolean>;
  
  // Imported image management methods
  addImportedImage: (image: any) => void;
  updateImportedImage: (id: string, updates: any) => void;
  removeImportedImage: (id: string) => void;
  
  // Layer management methods - delegated to AdvancedLayerSystemV2
  setLayers: (layers: Layer[]) => void;
  setComposedCanvas: (canvas: HTMLCanvasElement | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  // Undo/Redo System - Default state
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  
  // Undo/Redo System - Methods
  saveState: (action = 'Unknown Action') => {
    const state = get();
    console.log('💾 SaveState called with action:', action);
    const timestamp = Date.now();
    const snapshotId = `snapshot_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create snapshot of current state
    const snapshot: AppStateSnapshot = {
      id: snapshotId,
      timestamp,
      action,
      state: {
        // Tool settings
        activeTool: state.activeTool,
        brushColor: state.brushColor,
        brushSize: state.brushSize,
        brushOpacity: state.brushOpacity,
        brushHardness: state.brushHardness,
        brushSpacing: state.brushSpacing,
        brushShape: state.brushShape,
        brushRotation: state.brushRotation,
        brushDynamics: state.brushDynamics,
        brushFlow: state.brushFlow,
        blendMode: state.blendMode,
        cursorAngle: state.cursorAngle,
        usePressureSize: state.usePressureSize,
        usePressureOpacity: state.usePressureOpacity,
        
        // Symmetry settings
        symmetryX: state.symmetryX,
        symmetryY: state.symmetryY,
        symmetryZ: state.symmetryZ,
        
        // Fill settings
        fillTolerance: state.fillTolerance,
        fillGrow: state.fillGrow,
        fillAntiAlias: state.fillAntiAlias,
        fillContiguous: state.fillContiguous,
        
        // Puff settings
        puffBrushSize: state.puffBrushSize,
        puffBrushOpacity: state.puffBrushOpacity,
        puffHeight: state.puffHeight,
        puffSoftness: state.puffSoftness,
        puffOpacity: state.puffOpacity,
        puffCurvature: state.puffCurvature,
        puffShape: state.puffShape,
        puffColor: state.puffColor,
        
        // Embroidery settings
        embroideryStitchType: state.embroideryStitchType,
        embroiderySpacing: state.embroiderySpacing,
        embroideryDensity: state.embroideryDensity,
        embroideryThreadColor: state.embroideryThreadColor,
        embroideryThreadThickness: state.embroideryThreadThickness,
        
        // Layer settings - delegated to AdvancedLayerSystemV2
        // Legacy activeLayerId removed to prevent conflicts
        
        // Text settings
        textSize: state.textSize,
        textFont: state.textFont,
        textColor: state.textColor,
        textBold: state.textBold,
        textItalic: state.textItalic,
        textAlign: state.textAlign,
        activeTextId: state.activeTextId,
        
        // Panel states
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
        modelManagerOpen: state.modelManagerOpen,
        backgroundManagerOpen: state.backgroundManagerOpen,
        
        // Background settings
        backgroundScene: state.backgroundScene,
        backgroundIntensity: state.backgroundIntensity,
        backgroundRotation: state.backgroundRotation,
        
        // Model settings
        modelPosition: state.modelPosition,
        modelRotation: state.modelRotation,
        modelScale: state.modelScale,
        
        // Material settings
        roughness: state.roughness,
        metalness: state.metalness,
        fabric: state.fabric,
      },
        // Layer data - delegated to AdvancedLayerSystemV2
        // Legacy layerData removed to prevent conflicts
      puffCanvasData: state.puffCanvas ? state.puffCanvas.toDataURL() : undefined,
      // Composed canvas - delegated to AdvancedLayerSystemV2
      // Legacy composedCanvasData removed to prevent conflicts
    };
    
    // Add to history
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), snapshot];
    const trimmedHistory = newHistory.slice(-state.maxHistorySize);
    
    set({
      history: trimmedHistory,
      historyIndex: trimmedHistory.length - 1
    });
    
    console.log(`💾 State saved: ${action} (History: ${trimmedHistory.length}/${state.maxHistorySize})`);
  },
  
  undo: () => {
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.undo();
    
    // Force composition and visual update
    get().composeLayers();
    
    // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'undo' }
        });
        window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after undo');
    }, 50);
  },
  
  redo: () => {
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.redo();
    
    // Force composition and visual update
    get().composeLayers();
    
    // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'redo' }
        });
        window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after redo');
    }, 50);
  },
  
  canUndo: () => {
    const v2State = useAdvancedLayerStoreV2.getState();
    return v2State.canUndo();
  },
  
  canRedo: () => {
    const v2State = useAdvancedLayerStoreV2.getState();
    return v2State.canRedo();
  },
  
  clearHistory: () => {
    set({
      history: [],
      historyIndex: -1
    });
    console.log('🗑️ History cleared');
  },
  
  // Default state
  activeTool: 'brush',
  setTool: (tool: Tool) => {
    // Allow all tools to work with vector mode
    const currentTool = get().activeTool;
    set({ activeTool: tool });
    
    // Save state for undo/redo when switching tools
    if (currentTool !== tool) {
      get().saveState(`Switch to ${tool} tool`);
    }
  },
  vectorMode: false,
  setVectorMode: (enabled: boolean) => {
    // Allow vector mode with all tools including puff print and embroidery
    set({ vectorMode: enabled });
  },
  showAnchorPoints: false,
  setShowAnchorPoints: (enabled: boolean) => set({ showAnchorPoints: enabled }),
  showPuffVectorPrompt: false,
  puffVectorPromptMessage: 'Vector paths on puff tools COMING SOON..',
  setPuffVectorPrompt: (visible: boolean, message?: string) => {
    set({
      showPuffVectorPrompt: visible,
      puffVectorPromptMessage: message ?? get().puffVectorPromptMessage
    });
  },
  brushColor: '#ff3366',
  brushSize: 50,
  brushOpacity: 1,
  brushHardness: 1,
  brushSpacing: 0.05,
  brushShape: 'round',
  brushRotation: 0,
  brushDynamics: false,
  brushSymmetry: false,
  symmetryAngle: 0,
  blendMode: 'source-over',
  cursorAngle: 0,
  brushFlow: 1,
  brushSmoothing: 0.5,
  usePressureSize: false,
  usePressureOpacity: false,
  strokeColor: '#000000',
  strokeWidth: 2,
  strokeEnabled: false,
  
  // Brush stroke tracking
  // Brush strokes are now managed by V2 system
  symmetryX: false,
  symmetryY: false,
  symmetryZ: false,
  fillTolerance: 32,
  fillGrow: 0,
  fillAntiAlias: true,
  fillContiguous: true,
  roughness: 0.8,
  metalness: 0,
  fabric: 'cotton',
  fabricPreset: 'cotton',
  modelUrl: '/models/shirt.glb',
  modelPosition: [0, 0, 0],
  modelRotation: [0, 0, 0],
  modelScale: 1,
  modelChoice: 'tshirt',
  modelType: 'glb',
  modelScene: null,
  modelBoundsHeight: 0,
  modelMinDimension: 0,
  
  // Imported images initial state
  importedImages: [],
  selectedImageId: null,
  shapeMode: 'fill',
  shapeStrokeWidth: 2,
  shapeType: 'rectangle',
  shapeSize: 50,
  shapeOpacity: 1,
  shapeColor: '#ff69b4',
  shapeRotation: 0,
  shapePositionX: 50,
  shapePositionY: 50,
  
  // Puff Print defaults
  puffBrushSize: 20,
  puffBrushOpacity: 1.0,
  puffHeight: 2.0,
  puffSoftness: 0.5,
  puffOpacity: 0.8,
  puffCurvature: 0.8,
  puffShape: 'sphere',
  puffColor: '#ff69b4',
  puffCanvas: null,
  displacementCanvas: null,
  normalCanvas: null,
  
  // Embroidery defaults
  embroideryStitches: [],
  embroideryPattern: null,
  embroideryThreadType: 'cotton',
  embroideryThickness: 3,
  embroideryOpacity: 1.0,
  embroideryColor: '#ff69b4',
  embroideryStitchType: 'satin',
  embroideryPatternDescription: '',
  embroideryAIEnabled: true,
  embroideryThreadColor: '#ff69b4',
  embroideryThreadThickness: 0.5,
  embroiderySpacing: 2.0,
  embroideryDensity: 1.0,
  embroideryCanvas: null,
  embroideryAngle: 0,
  embroideryScale: 1.0,
  currentEmbroideryPath: [],
  lastEmbroideryPoint: null,
  
  // Vector tool initial state
  vectorStrokeColor: '#000000',
  vectorStrokeWidth: 2,
  vectorFillColor: '#ffffff',
  vectorFill: false,
  
  // Layers are now managed entirely by AdvancedLayerSystemV2
  // Legacy layer properties removed to prevent conflicts
  // But we need to add them back as getters for backward compatibility
  get layers() {
    const v2State = useAdvancedLayerStoreV2.getState();
    return v2State.layers.map(layer => v2State.convertToLegacyLayer(layer));
  },
  
  get activeLayerId() {
    const v2State = useAdvancedLayerStoreV2.getState();
    return v2State.activeLayerId;
  },
  
  get composedCanvas() {
    const v2State = useAdvancedLayerStoreV2.getState();
    return v2State.composedCanvas;
  },
  
  get textElements() {
    const v2State = useAdvancedLayerStoreV2.getState();
    
    console.log('🔍 DEBUG: App.tsx textElements getter - V2 state check:', {
      hasV2State: !!v2State,
      hasLayers: !!v2State?.layers,
      layersCount: v2State?.layers?.length || 0,
      timestamp: Date.now()
    });
    
    // CRITICAL FIX: Check if V2 system is properly initialized
    if (!v2State || !v2State.layers) {
      console.log('🔍 DEBUG: App.tsx textElements getter - V2 system not initialized yet, returning empty array');
      return [];
    }
    
    const result = v2State.getAllTextElements();
    console.log('🔍 DEBUG: App.tsx textElements getter called - returning', result.length, 'elements');
    console.log('🔍 DEBUG: App.tsx textElements result:', result.map(t => ({ id: t.id, text: t.text })));
    return result;
  },
  
  get brushStrokes() {
    const v2State = useAdvancedLayerStoreV2.getState();
    
    // CRITICAL FIX: Check if V2 system is properly initialized
    if (!v2State || !v2State.layers) {
      console.log('🔍 DEBUG: App.tsx brushStrokes getter - V2 system not initialized yet, returning empty array');
      return [];
    }
    
    const allBrushStrokes: any[] = [];
    v2State.layers.forEach(layer => {
      if (layer.content.brushStrokes) {
        allBrushStrokes.push(...layer.content.brushStrokes);
      }
    });
    return allBrushStrokes;
  },
  
  composedVersion: 0,
  baseTexture: null,
  decals: [],
  activeDecalId: null,
  textSize: 48,
  textFont: 'Arial',
  textColor: '#FFFFFF',
  textBold: false,
  textItalic: false,
  textAlign: 'left',
  lastText: '',
  layerTransform: null,
  backgroundScene: 'studio',
  backgroundIntensity: 1,
  backgroundRotation: 0,
  activeTextId: null,
  hoveredTextId: null,
  shapeElements: [],
  activeShapeId: null,
  hoveredShapeId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,
  modelManagerOpen: false,
  backgroundManagerOpen: false,
  
  // Universal Grid & Scale defaults
  showGrid: true,
  gridSize: 20,
  gridColor: '#333333',
  gridOpacity: 0.3,
  showRulers: true,
  rulerUnits: 'px',
  scale: 1.0,
  showGuides: false,
  guideColor: '#FF0000',
  snapToGrid: true,
  snapDistance: 5,
  showMeasurements: false,
  measurementUnits: 'px',
  
  controlsEnabled: true,
  controlsTarget: [0, 0, 0],
  controlsDistance: 2,
  clickingOnModel: false,

  // Phase 1: Advanced Layer System defaults
  project: null,
  selectedLayerV2: null,

  // Vector paths state
  vectorPaths: [],
  activePathId: null,
  selectedAnchor: null,
  vectorEditMode: 'pen',
  puffVectorHistory: [puffVectorEngine.getStateSnapshot()],
  puffVectorFuture: [],

  // Methods
  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushHardness: (hardness) => set({ brushHardness: hardness }),
  setBrushSpacing: (spacing) => set({ brushSpacing: spacing }),
  setBrushShape: (shape) => set({ brushShape: shape }),
  setBrushRotation: (rotation) => set({ brushRotation: rotation }),
  setBrushDynamics: (dynamics) => set({ brushDynamics: dynamics }),
  setBrushSymmetry: (symmetry) => set({ brushSymmetry: symmetry }),
  setSymmetryX: (symmetry) => set({ symmetryX: symmetry }),
  setSymmetryY: (symmetry) => set({ symmetryY: symmetry }),
  setSymmetryZ: (symmetry) => set({ symmetryZ: symmetry }),
  setSymmetryAngle: (angle) => set({ symmetryAngle: angle }),
  setBlendMode: (mode) => set({ blendMode: mode }),
  setCursorAngle: (angle) => set({ cursorAngle: angle }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setStrokeEnabled: (enabled) => set({ strokeEnabled: enabled }),
  setFillTolerance: (tolerance) => set({ fillTolerance: tolerance }),
  setFillGrow: (grow) => set({ fillGrow: grow }),
  setFillAntiAlias: (antiAlias) => set({ fillAntiAlias: antiAlias }),
  setFillContiguous: (contiguous) => set({ fillContiguous: contiguous }),
  setRoughness: (roughness) => set({ roughness: roughness }),
  setMetalness: (metalness) => set({ metalness: metalness }),
  setFabric: (fabric) => set({ fabric: fabric }),
  setModelUrl: (url) => set({ modelUrl: url }),
  setModelPosition: (position) => set({ modelPosition: position }),
  setModelRotation: (rotation) => set({ modelRotation: rotation }),
  setModelScale: (scale) => set({ modelScale: scale }),
  
  // Layer management - delegated to AdvancedLayerSystemV2
  setActiveLayerId: (id: string | null) => {
    const v2State = useAdvancedLayerStoreV2.getState();
    if (id) {
      v2State.setActiveLayer(id);
    } else {
      v2State.clearSelection(); // This sets activeLayerId to null
    }
    console.log(`🎨 Set active layer ID: ${id}`);
  },
  
  setActiveDecalId: (id) => set({ activeDecalId: id }),
  
  // Layer management methods - delegated to AdvancedLayerSystemV2
  setLayers: (layers: Layer[]) => {
    console.log('🎨 setLayers called - delegating to V2 system');
    // This method is kept for backward compatibility but doesn't do anything
    // as layers are now managed entirely by V2 system
  },
  
  setComposedCanvas: (canvas: HTMLCanvasElement | null) => {
    console.log('🎨 setComposedCanvas called - delegating to V2 system');
    // This method is kept for backward compatibility but doesn't do anything
    // as composed canvas is now managed entirely by V2 system
  },
  setTextSize: (size) => set({ textSize: size }),
  setTextFont: (font) => set({ textFont: font }),
  setTextColor: (color) => set({ textColor: color }),
  setTextBold: (bold) => set({ textBold: bold }),
  setTextItalic: (italic) => set({ textItalic: italic }),
  setTextAlign: (align) => set({ textAlign: align }),
  setLastText: (text) => set({ lastText: text }),
  setBackgroundScene: (scene) => set({ backgroundScene: scene }),
  setBackgroundIntensity: (intensity) => set({ backgroundIntensity: intensity }),
  setBackgroundRotation: (rotation) => set({ backgroundRotation: rotation }),
  setActiveTextId: (id) => set({ activeTextId: id }),
  setActiveShapeId: (id) => set({ activeShapeId: id }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setModelManagerOpen: (open) => set({ modelManagerOpen: open }),
  openModelManager: () => set({ modelManagerOpen: true }),
  closeModelManager: () => set({ modelManagerOpen: false }),
  setControlsEnabled: (enabled) => set({ controlsEnabled: enabled }),
  setControlsTarget: (target) => set({ controlsTarget: target }),
  setControlsDistance: (distance) => set({ controlsDistance: distance }),
  setClickingOnModel: (clicking: boolean) => set({ clickingOnModel: clicking }),

  // Vector editing setters
  setSelectedAnchor: (anchor) => set({ selectedAnchor: anchor }),
  setVectorEditMode: (mode) => set({ vectorEditMode: mode }),
  moveAnchor: (pathId, anchorIndex, newU, newV) => {
    set(state => ({
      vectorPaths: state.vectorPaths.map(path => 
        path.id === pathId 
          ? {
              ...path,
              points: path.points.map((point, index) => 
                index === anchorIndex 
                  ? { ...point, u: newU, v: newV }
                  : point
              )
            }
          : path
      )
    }));
  },
  addCurveHandle: (pathId, anchorIndex, handleType, u, v) => {
    set(state => ({
      vectorPaths: state.vectorPaths.map(path => 
        path.id === pathId 
          ? {
              ...path,
              points: path.points.map((point, index) => 
                index === anchorIndex 
                  ? {
                      ...point,
                      [handleType === 'in' ? 'inHandle' : 'outHandle']: { u, v }
                    }
                  : point
              )
            }
          : path
      )
    }));
  },

  // Phase 1: Advanced Layer System methods (scaffold)
  setProject: (p) => set({ project: p }),
  addLayerV2: (layer, index) => {
    set(state => {
      const proj: AdvProject = state.project ?? { layerOrder: [], layers: {}, assets: { images: {}, canvases: {}, smart: {} }, selection: { ids: [] }, version: 1 } as AdvProject;
      if (!proj.layers[layer.id]) {
        const order = proj.layerOrder.slice();
        if (typeof index === 'number' && index >= 0 && index <= order.length) order.splice(index, 0, layer.id); else order.push(layer.id);
        const layers = { ...proj.layers, [layer.id]: layer } as any;
        return { project: { ...proj, layers, layerOrder: order } } as any;
      }
      return { project: proj } as any;
    });
  },
  updateLayerV2: (id, patch) => {
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[id]) return {} as any;
      const updated = { ...(proj.layers[id] as any), ...patch } as AdvLayer;
      return { project: { ...proj, layers: { ...proj.layers, [id]: updated } } } as any;
    });
  },
  reorderLayersV2: (from, to) => {
    set(state => {
      const proj = state.project; if (!proj) return {} as any;
      const order = proj.layerOrder.slice();
      const fromIdx = Math.max(0, Math.min(from, order.length - 1));
      const [moved] = order.splice(fromIdx, 1);
      const toIdx = Math.max(0, Math.min(to, order.length));
      order.splice(toIdx, 0, moved);
      return { project: { ...proj, layerOrder: order } } as any;
    });
  },
  selectLayerV2: (id) => set({ selectedLayerV2: id }),

  // Vector methods
  startVectorPath: () => {
    const id = Math.random().toString(36).slice(2);
    set(state => ({ vectorPaths: [...state.vectorPaths, { id, points: [], closed: false }], activePathId: id }));

// Debug helpers (non-production): allow inspecting state from DevTools
try {
  const w: any = window as any;
  if (!w.__appGet) {
    w.__appGet = () => useApp.getState();
    w.__getEmbroideryStitches = () => useApp.getState().embroideryStitches;
    w.__getActiveTool = () => useApp.getState().activeTool;
  }
} catch {}
    return id;
  },
  insertVectorAnchorAt: (pathId: string, insertIndex: number, { u, v }: { u: number; v: number; }) => {
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== pathId) return p;
        const pts = p.points.slice();
        const idx = Math.min(Math.max(0, insertIndex), pts.length);
        pts.splice(idx, 0, { u, v, inHandle: null, outHandle: null, curveControl: false });
        return { ...p, points: pts };
      })
    }));
    // Update selection to the inserted point and set active path
    set(state => ({ selectedAnchor: { pathId, anchorIndex: insertIndex }, selectedAnchors: [{ pathId, anchorIndex: insertIndex }], activePathId: pathId }));
    get().composeLayers();
  },
  setAnchorProps: (pathId: string, anchorIndex: number, patch: Partial<VectorAnchor>) => {
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== pathId) return p;
        const pts = p.points.slice();
        if (!pts[anchorIndex]) return p;
        pts[anchorIndex] = { ...pts[anchorIndex], ...patch };
        return { ...p, points: pts };
      })
    }));
    get().composeLayers();
  },
  setAnchorWorld: (world) => {
    const sel = get().selectedAnchor;
    if (!sel) return;
    if (process.env.NODE_ENV !== 'production') console.log('[Vector] setAnchorWorld', { sel, world });
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== sel.pathId) return p;
        const pts = p.points.slice();
        if (!pts[sel.anchorIndex]) return p;
        pts[sel.anchorIndex] = { ...pts[sel.anchorIndex], world };
        return { ...p, points: pts };
      })
    }));
  },
  setSelectedAnchors: (sels) => set({ selectedAnchors: sels, selectedAnchor: sels[0] ?? null }),
  addSelectedAnchor: (sel) => set(state => {
    const list = state.selectedAnchors || [];
    const exists = list.some(x => x.pathId === sel.pathId && x.anchorIndex === sel.anchorIndex);
    return exists ? {} as any : { selectedAnchors: [...list, sel], selectedAnchor: sel };
  }),
  removeSelectedAnchor: (sel) => set(state => ({
    selectedAnchors: (state.selectedAnchors || []).filter(x => !(x.pathId === sel.pathId && x.anchorIndex === sel.anchorIndex)),
    selectedAnchor: null
  })),
  clearSelectedAnchors: () => set({ selectedAnchors: [], selectedAnchor: null }),
  deleteSelectedAnchors: () => {
    const sels = get().selectedAnchors || (get().selectedAnchor ? [get().selectedAnchor!] : []);
    if (!sels.length) return;
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        const mine = sels.filter(s => s.pathId === p.id).map(s => s.anchorIndex);
        if (!mine.length) return p;
        const keep = p.points.filter((_, idx) => !mine.includes(idx));
        return { ...p, points: keep };
      }),
      selectedAnchors: [],
      selectedAnchor: null
    }));
    get().composeLayers();
  },
  moveSelectedAnchorsBy: (du, dv) => {
    const sels = get().selectedAnchors || (get().selectedAnchor ? [get().selectedAnchor!] : []);
    if (!sels.length) return;
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        const mine = sels.filter(s => s.pathId === p.id).map(s => s.anchorIndex);
        if (!mine.length) return p;
        const pts = p.points.map((pt, idx) => mine.includes(idx) ? { ...pt, u: Math.min(1, Math.max(0, pt.u + du)), v: Math.min(1, Math.max(0, pt.v + dv)) } : pt);
        return { ...p, points: pts };
      })
    }));
    get().composeLayers();
  },
  setAnchorHandle: (which, { u, v }) => {
    const sel = get().selectedAnchor;
    if (!sel) return;
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== sel.pathId) return p;
        const pts = p.points.slice();
        if (!pts[sel.anchorIndex]) return p;
        const a = { ...pts[sel.anchorIndex] };
        const cu = Math.min(1, Math.max(0, u));
        const cv = Math.min(1, Math.max(0, v));
        if (which === 'in') a.inHandle = { u: cu, v: cv };
        if (which === 'out') a.outHandle = { u: cu, v: cv };
        pts[sel.anchorIndex] = a;
        return { ...p, points: pts };
      })
    }));
    get().composeLayers();
  },
  toggleActivePathClosed: () => {
    const { activePathId } = get();
    if (!activePathId) return;
    if (process.env.NODE_ENV !== 'production') console.log('[Vector] toggleActivePathClosed', activePathId);
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => p.id === activePathId ? { ...p, closed: !p.closed } : p)
    }));
    get().composeLayers();
  },
  addVectorAnchor: ({ u, v }) => {
    let { activePathId, vectorPaths, selectedAnchor } = get();
    
    // PERFORMANCE: Check if we're adding too many anchor points
    const totalPoints = vectorPaths.reduce((sum, path) => sum + path.points.length, 0);
    const maxPoints = unifiedPerformanceManager.getMaxElements('text'); // Use text limit as proxy for vector points
    
    if (totalPoints >= maxPoints) {
      console.warn(`⚠️ Maximum vector points limit reached (${maxPoints}). Please reduce anchor points or clear some paths.`);
      return;
    }
    
    // Ensure active path exists
    if (!activePathId) {
      activePathId = get().startVectorPath();
      vectorPaths = get().vectorPaths;
    }
    const targetId = selectedAnchor && selectedAnchor.pathId ? selectedAnchor.pathId : activePathId!;
    if (process.env.NODE_ENV !== 'production') console.log('[Vector] addVectorAnchor', { targetId, uv: { u, v }, totalPoints: totalPoints + 1 });
    
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== targetId) return p;
        const pts = p.points.slice();
        if (state.selectedAnchor && state.selectedAnchor.pathId === p.id) {
          const insertAt = Math.min(Math.max(0, state.selectedAnchor.anchorIndex + 1), pts.length);
          pts.splice(insertAt, 0, { u, v, inHandle: null, outHandle: null, curveControl: false });
          return { ...p, points: pts };
        } else {
          return { ...p, points: [...pts, { u, v, inHandle: null, outHandle: null, curveControl: false }] };
        }
      }),
    }));
    
    // Update selection to the newly inserted point
    const pNow = get().vectorPaths.find(p => p.id === targetId)!;
    let newIndex = pNow.points.length - 1;
    if (get().selectedAnchor && get().selectedAnchor!.pathId === targetId) {
      newIndex = Math.min(get().selectedAnchor!.anchorIndex + 1, pNow.points.length - 1);
    }
    set({ selectedAnchor: { pathId: targetId, anchorIndex: newIndex }, selectedAnchors: [{ pathId: targetId, anchorIndex: newIndex }], activePathId: targetId });
    
    // PERFORMANCE: Debounce composeLayers to prevent overwhelming the system
    const addVectorAnchorFn = get().addVectorAnchor;
    clearTimeout((addVectorAnchorFn as any).composeTimeout);
    (addVectorAnchorFn as any).composeTimeout = setTimeout(() => {
    get().composeLayers();
    }, 100); // Debounce by 100ms
  },
  moveVectorAnchor: ({ u, v }) => {
    const sel = get().selectedAnchor;
    if (!sel) return;
    if (process.env.NODE_ENV !== 'production') console.log('[Vector] moveVectorAnchor', { sel, uv: { u, v } });
    set(state => ({
      vectorPaths: state.vectorPaths.map(p => {
        if (p.id !== sel.pathId) return p;
        const pts = p.points.slice();
        if (!pts[sel.anchorIndex]) return p;
        pts[sel.anchorIndex] = { ...pts[sel.anchorIndex], u, v };
        return { ...p, points: pts };
      })
    }));
    get().composeLayers();
  },
  finishVectorPath: () => {
    const appState: any = get();
    const { activePathId, vectorPaths, composedCanvas, activeTool } = appState;
    if (!activePathId) return;
    const path = vectorPaths.find((p: any) => p.id === activePathId);
    if (process.env.NODE_ENV !== 'production') console.log('[Vector] finishVectorPath', { activeTool, pathPoints: path?.points.length });
    if (!path || path.points.length < 2 || !composedCanvas) {
      set({ activePathId: null, selectedAnchor: null });
      get().composeLayers();
      return;
    }

    // Sample UV path into canvas pixel coords
    const sampled: { x: number; y: number }[] = [];
    const W = composedCanvas.width, H = composedCanvas.height;
    const stepsBase = 24;
    const getPt = (i: number) => path.points[(i + path.points.length) % path.points.length];
    const segCount = path.closed ? path.points.length : path.points.length - 1;
    for (let i = 0; i < segCount; i++) {
      const a = getPt(i);
      const b = getPt(i + 1);
      const hasOut = !!a?.outHandle;
      const hasIn = !!b?.inHandle;
      for (let s = 0; s <= stepsBase; s++) {
        const t = s / stepsBase;
        let u: number, v: number;
        if (hasOut && hasIn) {
          const h1 = a.outHandle!;
          const h2 = b.inHandle!;
          const mt = 1 - t;
          u = mt*mt*mt*a.u + 3*mt*mt*t*h1.u + 3*mt*t*t*h2.u + t*t*t*b.u;
          v = mt*mt*mt*a.v + 3*mt*mt*t*h1.v + 3*mt*t*t*h2.v + t*t*t*b.v;
        } else if (hasOut || hasIn) {
          const h1 = hasOut ? a.outHandle! : { u: a.u, v: a.v };
          const h2 = hasIn ? b.inHandle! : { u: b.u, v: b.v };
          const mt = 1 - t;
          u = mt*mt*mt*a.u + 3*mt*mt*t*h1.u + 3*mt*t*t*h2.u + t*t*t*b.u;
          v = mt*mt*mt*a.v + 3*mt*mt*t*h1.v + 3*mt*t*t*h2.v + t*t*t*b.v;
        } else if (a?.curveControl || b?.curveControl) {
          const p0 = getPt(i - 1);
          const p3 = getPt(i + 2);
          const t2 = t * t, t3 = t2 * t;
          u = 0.5 * ((2 * a.u) + (-p0.u + b.u) * t + (2 * p0.u - 5 * a.u + 4 * b.u - p3.u) * t2 + (-p0.u + 3 * a.u - 3 * b.u + p3.u) * t3);
          v = 0.5 * ((2 * a.v) + (-p0.v + b.v) * t + (2 * p0.v - 5 * a.v + 4 * b.v - p3.v) * t2 + (-p0.v + 3 * a.v - 3 * b.v + p3.v) * t3);
        } else {
          u = a.u + (b.u - a.u) * t;
          v = a.v + (b.v - a.v) * t;
        }
        sampled.push({ x: Math.round(u * W), y: Math.round(v * H) });
      }
    }

    const puffBridge = typeof ((window as any).__applyPuffFromVector) === 'function'
      ? (window as any).__applyPuffFromVector as (pts: Array<{ x: number; y: number }>, opts: { width?: number; opacity?: number; color?: string }) => void
      : undefined;

    const uvPoints = path.points.map((pt: any) => ({
      u: pt.u,
      v: pt.v,
      inHandle: pt.inHandle ? { u: pt.inHandle.u, v: pt.inHandle.v } : null,
      outHandle: pt.outHandle ? { u: pt.outHandle.u, v: pt.outHandle.v } : null,
    }));

    const paintToLayerFallback = () => {
      const layer = typeof appState.getActiveLayer === 'function' ? appState.getActiveLayer() : null;
      if (layer) {
        const ctx = layer.canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = appState.brushOpacity;
        ctx.globalCompositeOperation = appState.blendMode;
        ctx.strokeStyle = appState.brushColor;
        ctx.lineWidth = appState.brushSize;
        ctx.beginPath();
        if (sampled.length) {
          ctx.moveTo(sampled[0].x, sampled[0].y);
          for (let i = 1; i < sampled.length; i++) ctx.lineTo(sampled[i].x, sampled[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    };

    if (activeTool === 'embroidery') {
      const stitchType = appState.embroideryStitchType || 'satin';
      const color = appState.embroideryColor || '#ff69b4';
      const thickness = appState.embroideryThickness ?? 2;
      const opacity = appState.embroideryOpacity ?? 1.0;
      const density = appState.embroideryDensity ?? 1.0;
      const stitch = {
        id: `stitch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: stitchType,
        color,
        thickness,
        opacity,
        density,
        points: sampled,
        createdFromVector: true
      } as any;
      const prev = appState.embroideryStitches || [];
      set({ embroideryStitches: [...prev, stitch] });
    } else {
      paintToLayerFallback();
    }

    // Clear selection and schedule compose
    set({ activePathId: null, selectedAnchor: null });
    try {
      const raf = requestAnimationFrame(() => { get().composeLayers(); });
      setTimeout(() => {
        get().composeLayers();
        setTimeout(() => get().composeLayers(), 100);
      }, 0);
    } catch {
      get().composeLayers();
    }
  },
  cancelVectorPath: () => {
    const { activePathId } = get();
    if (!activePathId) return;
    set(state => ({ vectorPaths: state.vectorPaths.filter(p => p.id !== activePathId), activePathId: null, selectedAnchor: null }));
    get().composeLayers();
  },
  clearVectorPaths: () => {
    set({ vectorPaths: [], activePathId: null, selectedAnchor: null });
    puffVectorEngine.clear();
    get().clearPuffHistory();
    get().composeLayers();
  },

  // PERFORMANCE: Emergency cleanup for too many vector points
  emergencyClearVectorPaths: () => {
    const { vectorPaths } = get();
    const totalPoints = vectorPaths.reduce((sum, path) => sum + path.points.length, 0);
    
    if (totalPoints > 1000) {
      console.warn('🚨 Emergency vector cleanup: Too many anchor points detected, clearing all vector paths');
      set({ vectorPaths: [], activePathId: null, selectedAnchor: null });
      puffVectorEngine.clear();
      get().clearPuffHistory();
      get().composeLayers();
      return true;
    }
    return false;
  },

  recordPuffHistory: (snapshot) => {
    const snap = snapshot || puffVectorEngine.getStateSnapshot();
    set(state => {
      const merged = [...state.puffVectorHistory, snap];
      const limit = 50;
      const trimmed = merged.length > limit ? merged.slice(merged.length - limit) : merged;
      return { puffVectorHistory: trimmed, puffVectorFuture: [] };
    });
  },
  restorePuffHistoryBackward: () => {
    const state = get();
    if (state.puffVectorHistory.length <= 1) return false;
    const history = state.puffVectorHistory.slice(0, state.puffVectorHistory.length - 1);
    const current = state.puffVectorHistory[state.puffVectorHistory.length - 1];
    const previous = history[history.length - 1];
    const future = [current, ...state.puffVectorFuture];
    puffVectorEngine.replaceState(previous);
    try { window.dispatchEvent(new Event('puff-updated')); } catch {}
    set({ puffVectorHistory: history, puffVectorFuture: future });
    return true;
  },
  restorePuffHistoryForward: () => {
    const state = get();
    if (!state.puffVectorFuture.length) return false;
    const [next, ...rest] = state.puffVectorFuture;
    const history = [...state.puffVectorHistory, next];
    puffVectorEngine.replaceState(next);
    try { window.dispatchEvent(new Event('puff-updated')); } catch {}
    set({ puffVectorHistory: history, puffVectorFuture: rest });
    return true;
  },
  clearPuffHistory: () => {
    const snap = puffVectorEngine.getStateSnapshot();
    set({ puffVectorHistory: [snap], puffVectorFuture: [] });
  },
  
  // Grid & Scale setters
  setShowGrid: (show) => set({ showGrid: show }),
  setGridSize: (size) => set({ gridSize: size }),
  setGridColor: (color) => set({ gridColor: color }),
  setGridOpacity: (opacity) => set({ gridOpacity: opacity }),
  setShowRulers: (show) => set({ showRulers: show }),
  setRulerUnits: (units) => set({ rulerUnits: units }),
  setScale: (scale) => set({ scale: scale }),
  setShowGuides: (show) => set({ showGuides: show }),
  setGuideColor: (color) => set({ guideColor: color }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setSnapDistance: (distance) => set({ snapDistance: distance }),
  setShowMeasurements: (show) => set({ showMeasurements: show }),
  setMeasurementUnits: (units) => set({ measurementUnits: units }),

  
  // Puff Print setters
  setPuffBrushSize: (size) => set({ puffBrushSize: size }),
  setPuffBrushOpacity: (opacity) => set({ puffBrushOpacity: opacity }),
  setPuffHeight: (height) => set({ puffHeight: height }),
  setPuffSoftness: (softness: number) => set({ puffSoftness: softness }),
  setPuffOpacity: (opacity: number) => set({ puffOpacity: opacity }),
  setPuffCurvature: (curvature) => set({ puffCurvature: curvature }),
  setPuffShape: (shape) => set({ puffShape: shape }),
  setPuffColor: (color) => set({ puffColor: color }),
  
  // Embroidery setters
  setEmbroideryStitches: (stitches) => set({ embroideryStitches: stitches }),
  setEmbroideryPattern: (pattern) => set({ embroideryPattern: pattern }),
  setEmbroideryThreadType: (type) => set({ embroideryThreadType: type }),
  setEmbroideryThickness: (thickness) => set({ embroideryThickness: thickness }),
  setEmbroideryOpacity: (opacity) => set({ embroideryOpacity: opacity }),
  setEmbroideryColor: (color) => {
    // Validate hex color format
    if (color && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
      set({ embroideryColor: color });
    } else {
      console.warn('Invalid embroidery color provided:', color, 'Using default color');
      set({ embroideryColor: '#ff69b4' });
    }
  },
  setEmbroideryStitchType: (type) => set({ embroideryStitchType: type }),
  setEmbroideryPatternDescription: (description) => set({ embroideryPatternDescription: description }),
  setEmbroideryAIEnabled: (enabled) => set({ embroideryAIEnabled: enabled }),
  setEmbroideryThreadColor: (color: string) => set({ embroideryThreadColor: color }),
  setEmbroideryThreadThickness: (thickness: number) => set({ embroideryThreadThickness: thickness }),
  setEmbroiderySpacing: (spacing: number) => set({ embroiderySpacing: spacing }),
  setEmbroideryDensity: (density: number) => set({ embroideryDensity: density }),
  setEmbroideryAngle: (angle: number) => set({ embroideryAngle: angle }),
  setEmbroideryScale: (scale: number) => set({ embroideryScale: scale }),
  setCurrentEmbroideryPath: (path: {x: number, y: number}[]) => set({ currentEmbroideryPath: path }),
  
  // Vector tool setters
  setVectorStrokeColor: (color: string) => set({ vectorStrokeColor: color }),
  setVectorStrokeWidth: (width: number) => set({ vectorStrokeWidth: width }),
  setVectorFillColor: (color: string) => set({ vectorFillColor: color }),
  setVectorFill: (fill: boolean) => set({ vectorFill: fill }),
  

  selectLayerForTransform: (layerId: string) => {
    const layer = get().layers.find(l => l.id === layerId);
    const composed = get().composedCanvas;
    if (!layer || !composed) return;
    set({ layerTransform: { x: 100, y: 100, cx: 200, cy: 200, width: 200, height: 200, rotation: 0, scale: 1, skewX: 0, skewY: 0 } });
  },

  updateLayerTransform: (patch: Partial<SelectionTransform>) => {
    const current = get().layerTransform;
    if (!current) return;
    set({ layerTransform: { ...current, ...patch } });
  },

  applyLayerTransform: () => {
    set({ layerTransform: null });
  },

  cancelLayerTransform: () => {
    set({ layerTransform: null });
  },

  addDecal: (image: ImageBitmap, name?: string) => {
    const id = Math.random().toString(36).slice(2);
    const composed = get().composedCanvas;
    const w = image.width; const h = image.height;
    const scale = composed ? Math.min(composed.width, composed.height) * 0.25 / Math.max(w, h) : 0.25;
    const decal: Decal = {
      id, name: name || `Decal ${id.slice(0, 4)}`, image, width: w, height: h,
      u: 0.5, v: 0.5, scale, rotation: 0, opacity: 1, blendMode: 'source-over',
      layerId: get().activeLayerId || undefined
    };
    set(state => ({ decals: [...state.decals, decal] }));
    return id;
  },

  updateDecal: (id: string, patch: Partial<Decal>) => {
    set(state => ({ decals: state.decals.map(d => d.id === id ? { ...d, ...patch } : d) }));
    get().composeLayers();
  },

  deleteDecal: (id: string) => {
    set(state => ({ decals: state.decals.filter(d => d.id !== id) }));
    get().composeLayers();
  },

  addTextElement: (text: string, uv: { u: number; v: number }, layerId?: string) => {
    console.log('🎨 addTextElement called - delegating to V2 system');
    
    // Delegate to V2 system
    const v2State = useAdvancedLayerStoreV2.getState();
    const id = v2State.addTextElementFromApp(text, uv, layerId);
    
    // Trigger composition
    get().composeLayers();
    
    // Force texture update to show the new text immediately
    setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'text-element-added-v2' }
      });
      window.dispatchEvent(textureEvent);
    }, 50);
    
    return id;
  },

  // Phase 2: Image layer operations (v2) - with history integration
  addImageV2: async (fileOrUrl: File | string) => {
    const oldProject = cloneProject(get().project);
    const result = await (async () => {
    const projInit = () => ({ layerOrder: [], layers: {}, assets: { images: {}, canvases: {}, smart: {} }, selection: { ids: [] }, version: 1 } as AdvProject);
    const id = Math.random().toString(36).slice(2);
    let imageKey = Math.random().toString(36).slice(2);
    let w = 1024, h = 1024, src: string = '';
    try {
      if (typeof fileOrUrl === 'string') {
        src = fileOrUrl;
        // Best-effort to get dimensions
        const img = new Image();
        const dim = await new Promise<{ w: number; h: number }>((resolve) => { img.onload = () => resolve({ w: img.naturalWidth||w, h: img.naturalHeight||h }); img.src = src; });
        w = dim.w || w; h = dim.h || h;
      } else {
        const bmp = await createImageBitmap(fileOrUrl);
        w = bmp.width; h = bmp.height;
        src = URL.createObjectURL(fileOrUrl);
      }
    } catch {}
    set(state => {
      const proj = state.project ?? projInit();
      proj.assets.images[imageKey] = src;
      const layer: AdvLayer = {
        id,
        name: `Image ${id.slice(0,4)}`,
        visible: true,
        locked: false,
        transform: createDefaultTransform(),
        styles: createDefaultStyles(),
        type: 'image',
        imageId: imageKey,
        naturalSize: { w, h },
      } as any;
      return { project: { ...proj, layers: { ...proj.layers, [id]: layer }, layerOrder: [...proj.layerOrder, id] } } as any;
    });
      return id;
    })();
    
    // Add to history
    const newProject = cloneProject(get().project);
    if (JSON.stringify(newProject) !== JSON.stringify(oldProject)) {
      history.push({
        label: 'Add Image Layer',
        apply: () => set({ project: cloneProject(newProject) }),
        revert: () => set({ project: cloneProject(oldProject) })
      });
    }
    
    return result;
  },

  replaceImageV2: async (layerId: string, fileOrUrl: File | string) => {
    let imageKey = Math.random().toString(36).slice(2);
    let src = '';
    try {
      if (typeof fileOrUrl === 'string') src = fileOrUrl; else src = URL.createObjectURL(fileOrUrl);
    } catch {}
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[layerId]) return {} as any;
      proj.assets.images[imageKey] = src;
      const layer = proj.layers[layerId] as any;
      const patched = { ...layer, imageId: imageKey };
      return { project: { ...proj, layers: { ...proj.layers, [layerId]: patched } } } as any;
    });
  },
  setImagePropsV2: (layerId, patch) => {
    const oldProject = cloneProject(get().project);
    let changed = false;
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[layerId]) return {} as any;
      const layer = proj.layers[layerId] as any;
      const styles = { ...layer.styles };
      if (patch.blendMode) styles.blendMode = patch.blendMode;
      const transform = { ...layer.transform, ...(patch.transform || {}) };
      const hasOpacityChange = patch.opacity != null;
      const updated = {
        ...layer,
        transform,
        styles,
        ...(hasOpacityChange ? { transform: { ...transform, opacity: patch.opacity } } : {})
      };
      changed = JSON.stringify(updated) !== JSON.stringify(layer);
      if (!changed) return {} as any;
      return { project: { ...proj, layers: { ...proj.layers, [layerId]: updated } } } as any;
    });
    if (!changed) return;
    const newProject = cloneProject(get().project);
    if (JSON.stringify(newProject) !== JSON.stringify(oldProject)) {
      history.push({
        label: 'Update Image Properties',
        apply: () => set({ project: cloneProject(newProject) }),
        revert: () => set({ project: cloneProject(oldProject) })
      });
    }
  },
  setClipMaskV2: (layerId, maskLayerId) => {
    const oldProject = cloneProject(get().project);
    let changed = false;
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[layerId]) return {} as any;
      const layer = proj.layers[layerId] as any;
      const currentMask = layer.mask?.layerId ?? null;
      const nextMask = maskLayerId ?? null;
      if (currentMask === nextMask) return {} as any;
      changed = true;
      const updated: any = { ...layer, mask: nextMask ? { layerId: nextMask, mode: 'clip' } : undefined };
      return { project: { ...proj, layers: { ...proj.layers, [layerId]: updated } } } as any;
    });
    if (!changed) return;
    const newProject = cloneProject(get().project);
    if (JSON.stringify(newProject) !== JSON.stringify(oldProject)) {
      history.push({
        label: 'Set Clip Mask',
        apply: () => set({ project: cloneProject(newProject) }),
        revert: () => set({ project: cloneProject(oldProject) })
      });
    }
  },
  convertToSmartV2: (layerId) => {
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[layerId]) return {} as any;
      const srcId = 'smart_' + Math.random().toString(36).slice(2);
      const layer = proj.layers[layerId] as any;
      const updated = { ...layer, isSmartObject: true, sourceRef: srcId };
      proj.assets.smart[srcId] = { snapshot: undefined };
      return { project: { ...proj, layers: { ...proj.layers, [layerId]: updated } } } as any;
    });
  },
  rasterizeV2: (layerId) => {
    // Placeholder: marking as rasterized; full implementation renders to a bitmap and replaces content
    set(state => {
      const proj = state.project; if (!proj || !proj.layers[layerId]) return {} as any;
      const layer = proj.layers[layerId] as any;
      const updated = { ...layer, rasterized: true };
      return { project: { ...proj, layers: { ...proj.layers, [layerId]: updated } } } as any;
    });
  },

  updateTextElement: (id: string, patch: Partial<TextElement>) => {
    console.log('🎨 updateTextElement called - delegating to V2 system');
    
    // Delegate to V2 system
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.updateTextElementFromApp(id, patch);
    
    // Trigger composition
    get().composeLayers();
    
    // Force texture update
      setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'text-element-updated-v2' }
      });
      window.dispatchEvent(textureEvent);
      }, 10);
  },

  deleteTextElement: (id: string) => {
    console.log('🎨 deleteTextElement called - delegating to V2 system');
    
    // Delegate to V2 system
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.deleteTextElementFromApp(id);
    
    // Trigger composition
    get().composeLayers();
  },

  // Shape management functions
  updateShapeElement: (id: string, patch: any) => {
    console.log('🔷 updateShapeElement called with:', { id, patch });
    set(state => ({ shapeElements: state.shapeElements.map(s => s.id === id ? { ...s, ...patch } : s) }));
    console.log('🔷 Shape element updated in store');
    get().composeLayers();
  },

  deleteShapeElement: (id: string) => {
    set(state => ({ shapeElements: state.shapeElements.filter(s => s.id !== id) }));
    get().composeLayers();
  },

  duplicateShapeElement: (id: string) => {
    const shape = get().shapeElements.find(s => s.id === id);
    if (shape) {
      const newId = Math.random().toString(36).slice(2);
      const duplicatedShape = {
        ...shape,
        id: newId,
        name: `${shape.name || 'Shape'} Copy`,
        positionX: shape.positionX + 5, // Offset slightly
        positionY: shape.positionY + 5
      };
      set(state => ({ shapeElements: [...state.shapeElements, duplicatedShape] }));
      get().composeLayers();
      return newId;
    }
    return null;
  },

  // Shape management
  addShapeElement: (shape: any) => {
    const id = Math.random().toString(36).slice(2);
    const newShape = {
      id,
      name: `Shape ${get().shapeElements.length + 1}`,
      ...shape
    };
    set(state => ({ 
      shapeElements: [...state.shapeElements, newShape],
      activeShapeId: id 
    }));
    get().composeLayers();
    return id;
  },

  clearShapes: () => {
    set(state => ({ shapeElements: [] }));
    get().composeLayers();
  },

  // Layer management
  addLayer: (name) => {
    // Delegate to AdvancedLayerSystemV2
    const v2State = useAdvancedLayerStoreV2.getState();
    const layerId = v2State.createLayer('paint', name || 'New Layer');
    
    // Update active layer - delegated to AdvancedLayerSystemV2
    // Legacy set({ activeLayerId: layerId }) removed to prevent conflicts
    
    // Force composition and visual update
    get().composeLayers();
    
    // Trigger immediate visual update on 3D model
    setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-creation', layerId }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer creation');
    }, 50);
    
    return layerId;
  },

  deleteLayer: (id: string) => {
    // Delegate to AdvancedLayerSystemV2
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.deleteLayer(id);
    
    // Update active layer - delegated to AdvancedLayerSystemV2
    // Legacy activeLayerId management removed to prevent conflicts
    
    // Force composition and visual update
    get().composeLayers();
    
    // Trigger immediate visual update on 3D model
    setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-deletion', layerId: id }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer deletion');
    }, 50);
    
    console.log(`🎨 Successfully deleted layer: ${id}`);
  },

  initCanvases: (w = 4096, h = 4096) => {
    // PERFORMANCE FIX: Prevent multiple canvas initializations
    const currentState = get();
    if (currentState.composedCanvas && 
        currentState.composedCanvas.width === w && 
        currentState.composedCanvas.height === h) {
      console.log('🎨 Canvases already initialized with correct size:', w, 'x', h);
      return;
    }
    
    console.log('🎨 Initializing device-optimized canvases with size:', w, 'x', h);
    
    const base = document.createElement('canvas');
    base.width = w; base.height = h;
    // PERFORMANCE FIX: Use device-optimized canvas context settings
    const baseCtx = base.getContext('2d', unifiedPerformanceManager.getOptimalCanvasContextOptions());
    if (baseCtx && 'imageSmoothingEnabled' in baseCtx) {
      (baseCtx as CanvasRenderingContext2D).imageSmoothingEnabled = true;
      (baseCtx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
      (baseCtx as CanvasRenderingContext2D).lineCap = 'round';
      (baseCtx as CanvasRenderingContext2D).lineJoin = 'round';
    }
    
    const composed = document.createElement('canvas');
    composed.width = w; composed.height = h;
    // PERFORMANCE FIX: Use high-quality canvas context settings for better color preservation
    const composedCtx = composed.getContext('2d', { 
      willReadFrequently: true,
      alpha: true,
      desynchronized: false
    });
    if (composedCtx) {
      composedCtx.imageSmoothingEnabled = true;
      composedCtx.imageSmoothingQuality = 'high';
      composedCtx.lineCap = 'round';
      composedCtx.lineJoin = 'round';
    }
    
    const paint = document.createElement('canvas');
    paint.width = w; paint.height = h;
    // Optimize paint canvas for frequent readback operations with high quality
    const paintCtx = paint.getContext('2d', { 
      willReadFrequently: true,
      alpha: true,
      desynchronized: false
    });
    if (paintCtx) {
      paintCtx.imageSmoothingEnabled = true;
      paintCtx.imageSmoothingQuality = 'high';
      paintCtx.lineCap = 'round';
      paintCtx.lineJoin = 'round';
    }
    // Create displacement canvas for the paint layer
    const paintDisplacementCanvas = document.createElement('canvas');
    paintDisplacementCanvas.width = paint.width;
    paintDisplacementCanvas.height = paint.height;
    const paintDispCtx = paintDisplacementCanvas.getContext('2d', { willReadFrequently: true })!;
    paintDispCtx.imageSmoothingEnabled = true;
    paintDispCtx.imageSmoothingQuality = 'high';
    // CRITICAL FIX: Fill with black (0) for no displacement, not gray (128)
    paintDispCtx.fillStyle = 'rgb(0, 0, 0)'; // Black = no displacement
    paintDispCtx.fillRect(0, 0, paint.width, paint.height);
    
    const layers = [
      { id: 'paint', name: 'Paint', visible: true, canvas: paint, history: [], future: [], order: 0, displacementCanvas: paintDisplacementCanvas }
    ];
    console.log('🎨 High-quality canvases initialized with size:', w, 'x', h);
    set({ layers, activeLayerId: 'paint', composedCanvas: composed });
    console.log('🎨 ComposedCanvas set, current store state:', {
      modelScene: !!get().modelScene,
      composedCanvas: !!get().composedCanvas
    });
    get().composeLayers();
  },

  // Imported image management methods
  setSelectedImageId: (id: string | null) => {
    console.log('📷 Setting selected image:', id);
    set({ selectedImageId: id });
  },

  addImportedImage: (image: any) => {
    console.log('📷 Adding imported image:', image.name);
    
    // Convert pixel coords to UV if needed (migration support)
    const pixelToUV = (pixel: any, canvasWidth: number, canvasHeight: number) => {
      const centerX = pixel.x + pixel.width / 2;
      const centerY = pixel.y + pixel.height / 2;
      return {
        u: centerX / canvasWidth,
        v: centerY / canvasHeight,
        uWidth: pixel.width / canvasWidth,
        uHeight: pixel.height / canvasHeight
      };
    };
    
    let imageWithUV = { ...image };
    if (typeof image.u !== 'number' || typeof image.v !== 'number') {
      const canvasSize = 2048; // Standard texture size
      const uvCoords = pixelToUV(
        {
          x: image.x || 512,
          y: image.y || 512,
          width: image.width || 512,
          height: image.height || 512
        },
        canvasSize,
        canvasSize
      );
      imageWithUV = { ...image, ...uvCoords };
    }
    
    // Ensure all required properties exist
    const imageWithDefaults = {
      ...imageWithUV,
      rotation: imageWithUV.rotation || 0,
      locked: imageWithUV.locked ?? false,
      // Size linking and flip properties
      sizeLinked: imageWithUV.sizeLinked ?? true,    // Default to linked
      horizontalFlip: imageWithUV.horizontalFlip ?? false,
      verticalFlip: imageWithUV.verticalFlip ?? false,
      // Blending properties
      blendMode: imageWithUV.blendMode || 'source-over', // Default to normal blend
      // Keep legacy coords for backward compatibility
      x: imageWithUV.x,
      y: imageWithUV.y,
      width: imageWithUV.width,
      height: imageWithUV.height
    };
    
    console.log('📷 Image with UV coordinates:', {
      name: imageWithDefaults.name,
      uv: { u: imageWithDefaults.u, v: imageWithDefaults.v },
      size: { uWidth: imageWithDefaults.uWidth, uHeight: imageWithDefaults.uHeight }
    });
    
    // Pre-load and cache the image before adding to state
    if (!(window as any).__imageCache) {
      (window as any).__imageCache = new Map<string, HTMLImageElement>();
    }
    const imageCache = (window as any).__imageCache;
    
    const imageElement = new Image();
    imageElement.src = imageWithDefaults.dataUrl;
    imageCache.set(imageWithDefaults.id, imageElement);
    
    console.log('📷 Pre-loading image:', imageWithDefaults.name);
    
    // Wait for image to load, then add to state and render
    const loadAndRender = () => {
      set(state => ({ 
        importedImages: [...state.importedImages, imageWithDefaults],
        selectedImageId: imageWithDefaults.id // Auto-select newly added image
      }));
      
      console.log('📷 Image added to state, triggering render');
      
      // CRITICAL FIX: Also add image to V2 layer system
      const v2State = useAdvancedLayerStoreV2.getState();
      v2State.addImageElementFromApp(imageWithDefaults); // ✅ Image integration with V2
      
      // CRITICAL: Trigger composeLayers first (to draw image), then updateModelTexture (same as text)
      setTimeout(() => {
        const { composeLayers } = get();
        composeLayers(); // Draw image to composedCanvas
        if ((window as any).updateModelTexture) {
          (window as any).updateModelTexture(true, false); // Apply to model
        }
      }, 50);
    };
    
    // If image already loaded (from cache/data URL), render immediately
    if (imageElement.complete && imageElement.naturalHeight !== 0) {
      console.log('📷 Image already loaded, rendering immediately');
      loadAndRender();
    } else {
      // Wait for image to load
      imageElement.onload = () => {
        console.log('📷 Image loaded, rendering now');
        loadAndRender();
      };
      imageElement.onerror = () => {
        console.error('📷 Failed to load image:', imageWithDefaults.name);
      };
    }
  },

  updateImportedImage: (id: string, updates: any) => {
    console.log('📷 Updating imported image:', id, updates);
    set(state => ({
      importedImages: state.importedImages.map(img =>
        img.id === id ? { ...img, ...updates } : img
      )
    }));
    
    // PERFORMANCE: Throttled live update (same as text system)
    // This updates the composedCanvas and then refreshes the model texture
    if (!(window as any).__imageUpdateThrottle) {
      (window as any).__imageUpdateThrottle = {
        lastUpdate: 0,
        pendingUpdate: null
      };
    }
    
    const throttle = (window as any).__imageUpdateThrottle;
    const now = Date.now();
    const throttleDelay = 16; // 60fps for smooth updates
    
    if (now - throttle.lastUpdate >= throttleDelay) {
      // Update immediately (same as text)
      throttle.lastUpdate = now;
      setTimeout(() => {
        const { composeLayers } = get();
        composeLayers(true); // Force clear and redraw composedCanvas with updated image
        if ((window as any).updateModelTexture) {
          (window as any).updateModelTexture(true, false); // Update model from composedCanvas
        }
      }, 10);
    } else {
      // Schedule delayed update
      if (throttle.pendingUpdate) {
        clearTimeout(throttle.pendingUpdate);
      }
      throttle.pendingUpdate = setTimeout(() => {
        throttle.lastUpdate = Date.now();
        const { composeLayers } = get();
        composeLayers(true); // Force clear and redraw composedCanvas with updated image
        if ((window as any).updateModelTexture) {
          (window as any).updateModelTexture(true, false);
        }
        throttle.pendingUpdate = null;
      }, throttleDelay);
    }
  },

  removeImportedImage: (id: string) => {
    console.log('📷 Removing imported image:', id);
    
    // Clear from image cache
    if ((window as any).__imageCache) {
      (window as any).__imageCache.delete(id);
      console.log('📷 Cleared image from cache:', id);
    }
    
    set(state => ({ 
      importedImages: state.importedImages.filter(img => img.id !== id),
      selectedImageId: state.selectedImageId === id ? null : state.selectedImageId
    }));
    
    // CRITICAL: Call composeLayers first to redraw composedCanvas without the deleted image
    // Then call updateModelTexture to apply the updated composedCanvas to the model
    setTimeout(() => {
      console.log('📷 Re-composing layers after image deletion');
      const { composeLayers } = get();
      composeLayers(true); // Force clear and redraw composedCanvas without the deleted image
      
      if ((window as any).updateModelTexture) {
        (window as any).updateModelTexture(true, false); // Apply updated composedCanvas to model
      }
    }, 50);
  },

  selectImportedImage: (id: string) => {
    console.log('📷 Selecting imported image:', id);
    set({ selectedImageId: id });
  },

  getActiveLayer: () => {
    // CRITICAL FIX: Use Advanced Layer System V2 instead of legacy layers
    const advancedStore = useAdvancedLayerStoreV2.getState();
    const { layers, activeLayerId } = advancedStore;
    
    if (activeLayerId) {
      const layer = layers.find(l => l.id === activeLayerId);
      if (layer) {
        // Convert advanced layer to legacy format for compatibility
        return {
          id: layer.id, // CRITICAL: Use the actual Advanced Layer System V2 ID
          name: layer.name,
          type: layer.type,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          order: layer.order,
          toolType: layer.type, // Use type as toolType
          canvas: layer.content.canvas || document.createElement('canvas'),
          displacementCanvas: null // Not used in Advanced Layer System V2
        };
      }
    }
    
    // Fallback to legacy system if no advanced layers exist
    const { layers: legacyLayers, activeLayerId: legacyActiveLayerId } = get();
    return legacyLayers.find(l => l.id === legacyActiveLayerId) || null;
  },

  // Enhanced layer management for all tools
  getOrCreateActiveLayer: (toolType: string) => {
    // CRITICAL FIX: Use Advanced Layer System V2 instead of legacy layers
    const advancedStore = useAdvancedLayerStoreV2.getState();
    const { layers, activeLayerId, createLayer } = advancedStore;
    
    // If we have an active layer, check if it's suitable for the current tool
    if (activeLayerId) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer && activeLayer.visible) {
        // Convert advanced layer to legacy format for compatibility
        return {
          id: activeLayer.id, // CRITICAL: Use the actual Advanced Layer System V2 ID
          name: activeLayer.name,
          type: activeLayer.type,
          visible: activeLayer.visible,
          opacity: activeLayer.opacity,
          blendMode: activeLayer.blendMode,
          order: activeLayer.order,
          toolType: activeLayer.type, // Use type as toolType
          canvas: activeLayer.content.canvas || document.createElement('canvas'),
          displacementCanvas: null // Not used in Advanced Layer System V2
        };
      }
    }

    // Create a new layer for the tool if none exists or current one is hidden
    const layerName = get().getLayerNameForTool(toolType);
    const layerId = createLayer(toolType as any, layerName);
    
    // Set the new layer as active
    useAdvancedLayerStoreV2.setState({ activeLayerId: layerId });
    
    console.log(`🎨 Created new layer "${layerName}" for tool: ${toolType} with ID: ${layerId}`);
    
    const newLayer = layers.find(l => l.id === layerId);
    if (newLayer) {
      return {
        id: newLayer.id, // CRITICAL: Use the actual Advanced Layer System V2 ID
        name: newLayer.name,
        type: newLayer.type,
        visible: newLayer.visible,
        opacity: newLayer.opacity,
        blendMode: newLayer.blendMode,
        order: newLayer.order,
        toolType: newLayer.type, // Use type as toolType
        canvas: newLayer.content.canvas || document.createElement('canvas'),
        displacementCanvas: null // Not used in Advanced Layer System V2
      };
    }
    
    return null;
  },

  getLayerNameForTool: (toolType: string) => {
    const baseName = toolType.charAt(0).toUpperCase() + toolType.slice(1);
    const { layers } = get();
    
    // Check if a layer with this name already exists
    let counter = 1;
    let layerName = baseName;
    
    while (layers.some(l => l.name === layerName)) {
      layerName = `${baseName} ${counter}`;
      counter++;
    }
    
    return layerName;
  },

  // Enhanced layer operations with tool integration
  createToolLayer: (toolType: string, options?: any) => {
    const layerName = get().getLayerNameForTool(toolType);
    const addLayerFunc = get().addLayer;
    if (!addLayerFunc) return '';
    const layerId = addLayerFunc(layerName);
    
    // Set layer properties based on tool type
    const updatedLayers = get().layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          toolType: toolType,
          blendMode: options?.blendMode || 'normal',
          opacity: options?.opacity || 1.0,
          visible: true,
          locked: false,
          order: get().layers.length - 1 // Set order to be at the end
        };
      }
      return l;
    });
    
    set({ layers: updatedLayers, activeLayerId: layerId });
    
    console.log(`🎨 Created tool-specific layer "${layerName}" for ${toolType}`);
    return layerId;
  },

  // Layer management functions - delegated to AdvancedLayerSystemV2
  toggleLayerVisibility: (layerId: string) => {
    const v2State = useAdvancedLayerStoreV2.getState();
    const layer = v2State.layers.find(l => l.id === layerId);
    if (layer) {
      v2State.setLayerVisibility(layerId, !layer.visible);
    }
    console.log(`🎨 Toggled visibility for layer: ${layerId}`);
  },

  setLayerOpacity: (layerId: string, opacity: number) => {
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.setLayerOpacity(layerId, Math.max(0, Math.min(1, opacity)));
    console.log(`🎨 Set opacity for layer ${layerId}: ${opacity}`);
  },

  setLayerBlendMode: (layerId: string, blendMode: string) => {
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.setLayerBlendMode(layerId, blendMode as any);
    console.log(`🎨 Set blend mode for layer ${layerId}: ${blendMode}`);
  },

  moveLayerUp: (layerId: string) => {
    console.log('🎨 moveLayerUp called for layerId:', layerId);
    const { layers } = get();
    console.log('🎨 Current layers before move:', layers.map(l => ({ id: l.id, name: l.name, order: l.order })));
    
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex > 0) {
      const newLayers = [...layers];
      [newLayers[layerIndex], newLayers[layerIndex - 1]] = [newLayers[layerIndex - 1], newLayers[layerIndex]];
      
      // Update order property
      const updatedLayers = newLayers.map((layer, index) => ({
        ...layer,
        order: index
      }));
      
      console.log('🎨 Updated layers after move:', updatedLayers.map(l => ({ id: l.id, name: l.name, order: l.order })));
      
      set({ layers: updatedLayers });
      
      // Force composition and visual update
      console.log('🎨 Calling composeLayers()');
      get().composeLayers();
      
      // Also update displacement maps for puff effects
      get().composeDisplacementMaps();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder', layerId }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer reorder');
      }, 50);
      
      // V2 system handles layer reordering automatically
      
      console.log(`🎨 Moved layer ${layerId} up`);
    } else {
      console.log('🎨 Cannot move layer up - already at top or not found');
    }
  },

  moveLayerDown: (layerId: string) => {
    console.log('🎨 moveLayerDown called for layerId:', layerId);
    const { layers } = get();
    console.log('🎨 Current layers before move:', layers.map(l => ({ id: l.id, name: l.name, order: l.order })));
    
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[layerIndex], newLayers[layerIndex + 1]] = [newLayers[layerIndex + 1], newLayers[layerIndex]];
      
      // Update order property
      const updatedLayers = newLayers.map((layer, index) => ({
        ...layer,
        order: index
      }));
      
      console.log('🎨 Updated layers after move:', updatedLayers.map(l => ({ id: l.id, name: l.name, order: l.order })));
      set({ layers: updatedLayers });
      
      // Force composition and visual update
      get().composeLayers();
      
      // Also update displacement maps for puff effects
      get().composeDisplacementMaps();
      
      // Trigger immediate visual update on 3D model
      setTimeout(() => {
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-reorder', layerId }
        });
        window.dispatchEvent(textureEvent);
        console.log('🔄 Triggered texture update after layer reorder');
      }, 50);
      
      // V2 system handles layer reordering automatically
      
      console.log(`🎨 Moved layer ${layerId} down`);
    }
  },

  duplicateLayer: (layerId: string) => {
    const { layers } = get();
    const layerToDuplicate = layers.find(l => l.id === layerId);
    if (!layerToDuplicate) return '';

    const newLayerName = `${layerToDuplicate.name} Copy`;
    const addLayerFunc = get().addLayer;
    if (!addLayerFunc) return '';
    const newLayerId = addLayerFunc(newLayerName);
    
    // Copy layer properties and canvas content
    const updatedLayers = get().layers.map(layer => {
      if (layer.id === newLayerId) {
        // Create a new displacement canvas for the duplicated layer
        const newDisplacementCanvas = document.createElement('canvas');
        newDisplacementCanvas.width = layerToDuplicate.canvas.width;
        newDisplacementCanvas.height = layerToDuplicate.canvas.height;
        const newDispCtx = newDisplacementCanvas.getContext('2d', { willReadFrequently: true })!;
        newDispCtx.imageSmoothingEnabled = true;
        newDispCtx.imageSmoothingQuality = 'high';
        
        // Copy displacement data if the original layer has a displacement canvas
        if (layerToDuplicate.displacementCanvas) {
          newDispCtx.drawImage(layerToDuplicate.displacementCanvas, 0, 0);
        } else {
          // CRITICAL FIX: Fill with black (0) for no displacement
          newDispCtx.fillStyle = 'rgb(0, 0, 0)';
          newDispCtx.fillRect(0, 0, newDisplacementCanvas.width, newDisplacementCanvas.height);
        }
        
        return {
          ...layer,
          ...layerToDuplicate,
          id: newLayerId,
          name: newLayerName,
          order: layers.length,
          displacementCanvas: newDisplacementCanvas
        };
      }
      return layer;
    });
    
    // Copy canvas content
    const newLayer = updatedLayers.find(l => l.id === newLayerId);
    if (newLayer && layerToDuplicate.canvas && newLayer.canvas) {
      const sourceCtx = layerToDuplicate.canvas.getContext('2d');
      const targetCtx = newLayer.canvas.getContext('2d');
      if (sourceCtx && targetCtx) {
        targetCtx.clearRect(0, 0, newLayer.canvas.width, newLayer.canvas.height);
        targetCtx.drawImage(layerToDuplicate.canvas, 0, 0);
      }
    }
    
    set({ layers: updatedLayers, activeLayerId: newLayerId });
    
    // Force composition and visual update
    get().composeLayers();
    
    // Trigger immediate visual update on 3D model
    setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'layer-duplication', layerId: newLayerId }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered texture update after layer duplication');
    }, 50);
    
    // V2 system handles layer duplication automatically
    
    console.log(`🎨 Duplicated layer: ${layerId} -> ${newLayerId}`);
    return newLayerId;
  },

  composeLayers: (forceClear = false) => {
    console.log('🎨 composeLayers called - using V2 system');
    
    try {
      // Use V2 system for layer composition
      const { composeLayers: v2ComposeLayers } = useAdvancedLayerStoreV2.getState();
      const composedCanvas = v2ComposeLayers();
      
      if (composedCanvas) {
        // Update the composed canvas in the app state
        set({ composedCanvas });
        console.log('🎨 Layer composition completed using V2 system');
        
        // Trigger texture update
        const textureEvent = new CustomEvent('forceTextureUpdate', {
          detail: { source: 'layer-composition-v2' }
        });
        window.dispatchEvent(textureEvent);
      } else {
        console.warn('🎨 V2 layer composition returned null');
      }
    } catch (error) {
      console.error('🎨 Error in V2 layer composition:', error);
    }
  },

  composeDisplacementMaps: () => {
    try {
      // Use V2 system for displacement map composition
      const v2State = useAdvancedLayerStoreV2.getState();
      const { layers } = v2State;
      
      // PERFORMANCE: Reduced debug logging
      if (Math.random() < 0.01) {
        console.log('🎨 Composing displacement maps using V2 system:', layers.length, 'layers');
      }
      
      if (layers.length === 0) return null;
      
      // Create composed displacement canvas with standard size
      const composedDisplacementCanvas = createDisplacementCanvas();
      
      const ctx = composedDisplacementCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // CRITICAL FIX: Fill with black (0) for no displacement, not gray (128)
      // With black base and bias=0, only painted areas will be displaced
      ctx.fillStyle = 'rgb(0, 0, 0)'; // Black = no displacement
      ctx.fillRect(0, 0, CANVAS_CONFIG.DISPLACEMENT.width, CANVAS_CONFIG.DISPLACEMENT.height);
      
      // Sort layers by order for proper layering
      const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
      
      // PERFORMANCE: Only log layer composition occasionally
      if (Math.random() < 0.1) {
        console.log('🎨 composeDisplacementMaps - sorted layers by order:', sortedLayers.map(l => ({ 
          id: l.id, 
          name: l.name, 
          order: l.order,
          visible: l.visible,
          brushStrokesCount: l.content.brushStrokes?.length || 0
        })));
      }

      for (const layer of sortedLayers) {
        if (!layer.visible) continue;
        
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        
        // Draw brush strokes as displacement data
        const brushStrokes = layer.content.brushStrokes || [];
        for (const stroke of brushStrokes) {
          if (stroke.points && stroke.points.length > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgb(128, 128, 128)'; // Gray for displacement
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
        
        ctx.restore();
      }
      
      console.log('🎨 Displacement map composition complete using V2 system');
      return composedDisplacementCanvas;
      
    } catch (error) {
      console.error('Error in composeDisplacementMaps:', error);
      return null;
    }
  },

  commit: () => {
    // TODO: Implement commit functionality with AdvancedLayerSystemV2
    console.log('🔄 Commit called - Currently disabled during V2 migration');
  },

  forceRerender: () => {
    try {
      console.log('Force rerendering...');
      const { composedCanvas } = get();
      if (composedCanvas) {
        get().composeLayers();
      }
    } catch (error) {
      handleRenderingError(
        error as Error,
        { component: 'App', function: 'forceRerender' }
      );
    }
  },

  setBaseTexture: (texture) => set({ baseTexture: texture }),
  generateBaseLayer: () => {
    console.log('🎨 ===== GENERATE BASE LAYER DEBUG =====');
    const { modelScene, composedCanvas } = get();
    console.log('🎨 ModelScene exists:', !!modelScene);
    console.log('🎨 ComposedCanvas exists:', !!composedCanvas);
    
    if (!modelScene || !composedCanvas) {
      console.log('🎨 Cannot generate base layer: missing modelScene or composedCanvas');
      return;
    }

    console.log('🎨 Generating base layer from model...');
    
    // CRITICAL FIX: Create a separate canvas for the original model texture
    // Don't modify the composedCanvas - it might already have tool effects
    const baseTextureCanvas = document.createElement('canvas');
    baseTextureCanvas.width = composedCanvas.width;
    baseTextureCanvas.height = composedCanvas.height;
    const ctx = baseTextureCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    // CRITICAL FIX: Ensure high-quality rendering for perfect UV alignment
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear the base texture canvas
    ctx.clearRect(0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
    
    // Try to extract texture from the model
    let modelTexture: THREE.Texture | null = null;
    modelScene.traverse((child: any) => {
      if (child.isMesh && child.material && child.material.map && !modelTexture) {
        modelTexture = child.material.map;
        console.log('🎨 Found model texture:', modelTexture?.name || 'unnamed');
        console.log('🎨 Texture details:', {
          type: modelTexture?.type,
          format: modelTexture?.format,
          hasImage: !!(modelTexture as any).image,
          hasSource: !!(modelTexture as any).source,
          imageType: typeof (modelTexture as any).image,
          imageConstructor: (modelTexture as any).image?.constructor?.name
        });
      }
    });
    
    if (modelTexture) {
      // Try different ways to extract the texture image
      let textureImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null = null;
      
      // Method 1: Direct image property
      if ((modelTexture as any).image) {
        textureImage = (modelTexture as any).image;
        console.log('🎨 Using direct image property');
      }
      // Method 2: Source data
      else if ((modelTexture as any).source?.data) {
        textureImage = (modelTexture as any).source.data;
        console.log('🎨 Using source data');
      }
      // Method 3: Try to convert texture to canvas
      else {
        console.log('🎨 Attempting to convert texture to canvas');
        try {
          // Create a temporary canvas to render the texture
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = (modelTexture as any).image?.width || 2048;
          tempCanvas.height = (modelTexture as any).image?.height || 2048;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx && (modelTexture as any).image) {
            tempCtx.drawImage((modelTexture as any).image, 0, 0);
            textureImage = tempCanvas;
            console.log('🎨 Successfully converted texture to canvas');
          }
        } catch (error) {
          console.log('🎨 Failed to convert texture:', error);
        }
      }
      
      if (textureImage) {
        try {
          console.log('🎨 Drawing texture to base layer');
          console.log('🎨 Original texture size:', textureImage.width, 'x', textureImage.height);
          console.log('🎨 Canvas size:', baseTextureCanvas.width, 'x', baseTextureCanvas.height);
          
          // CRITICAL FIX: Draw texture at exact canvas size for perfect UV alignment
          // This ensures 1:1 pixel correspondence between UV coordinates and texture pixels
          ctx.drawImage(textureImage, 0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
          console.log('🎨 Successfully drew model texture as base layer with perfect UV alignment');
        } catch (error) {
          console.log('🎨 Failed to draw texture, using fallback:', error);
          // Fallback to white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
        }
      } else {
        // Fallback to white background if no texture found
        console.log('🎨 No usable texture found, using white background');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
      }
    } else {
      // Fallback to white background if no texture found
      console.log('🎨 No model texture found, using white background');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
    }
    
    // CRITICAL FIX: Store the original model texture directly as canvas
    // This avoids the Image conversion which might lose data
    console.log('🎨 Storing base texture canvas directly');
    get().setBaseTexture(baseTextureCanvas as any);
    
    // CRITICAL FIX: Copy the original texture to the composed canvas
    // This preserves the original model texture as the base layer
    const composedCtx = composedCanvas.getContext('2d');
    if (composedCtx) {
      composedCtx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
      composedCtx.drawImage(baseTextureCanvas, 0, 0);
      console.log('🎨 Original model texture copied to composed canvas');
      
      // DEBUG: Check if the composed canvas has content
      const imageData = composedCtx.getImageData(composedCanvas.width/2, composedCanvas.height/2, 1, 1);
      const pixel = imageData.data;
      console.log('🎨 DEBUG: Composed canvas center pixel after base texture copy:', `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);
    }
    
    console.log('🎨 Base texture generation complete');
  },

  addDecalFromFile: async (file: File) => {
    const image = await createImageBitmap(file);
    const id = Math.random().toString(36).slice(2);
    const composed = get().composedCanvas;
    const w = image.width; const h = image.height;
    const scale = composed ? Math.min(composed.width, composed.height) * 0.25 / Math.max(w, h) : 0.25;
    const decal: Decal = {
      id, name: file.name.replace(/\.[^/.]+$/, '') || `Decal ${id.slice(0, 4)}`, image, width: w, height: h,
      u: 0.5, v: 0.5, scale, rotation: 0, opacity: 1, blendMode: 'source-over',
      layerId: get().activeLayerId || undefined
    };
    set(state => ({ decals: [...state.decals, decal] }));
    get().composeLayers();
    return id;
  },

  // Checkpoint system
  saveCheckpoint: async (name?: string) => {
    const state = get();
    const id = Math.random().toString(36).slice(2);
    const checkpoint = {
      id,
      name: name || `Checkpoint ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      modelUrl: state.modelUrl,
      modelPosition: state.modelPosition,
      modelRotation: state.modelRotation,
      modelScale: state.modelScale,
      backgroundScene: state.backgroundScene,
      // Text elements are now managed by V2 system
    };
    
    const layerEntries: { id: string; name: string; visible: boolean; width: number; height: number; key: string }[] = [];
    let totalBytes = 0;
    const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve) => canvas.toBlob(b => resolve(b || new Blob()), 'image/png'));
    for (let i = 0; i < state.layers.length; i++) {
      const l = state.layers[i];
      const blob = await canvasToBlob(l.canvas);
      totalBytes += blob.size;
      const key = `checkpoint-${id}-layer-${i}`;
      await localforage.setItem(key, blob);
      layerEntries.push({ id: l.id, name: l.name, visible: l.visible, width: l.canvas.width, height: l.canvas.height, key });
    }
    
    (checkpoint as any).layers = layerEntries;
    const compressedData = LZString.compress(JSON.stringify(checkpoint));
    await localforage.setItem(`checkpoint-${id}`, compressedData);
    const meta: CheckpointMeta = { 
      id, 
      name: checkpoint.name, 
      timestamp: checkpoint.timestamp, 
      size: totalBytes,
      createdAt: checkpoint.timestamp,
      sizeBytes: totalBytes
    };
    return meta;
  },

  loadCheckpoint: async (id: string) => {
    const compressed = await localforage.getItem<string>(`checkpoint-${id}`);
    if (!compressed) throw new Error('Checkpoint not found');
    const data = JSON.parse(LZString.decompress(compressed) || '{}');
    
    const layers: Layer[] = [];
    for (const lp of data.layers || []) {
      const blob = await localforage.getItem<Blob>(lp.key);
      if (!blob) continue;
      const canvas = document.createElement('canvas');
      canvas.width = lp.width; canvas.height = lp.height;
        const ctx = canvas.getContext('2d')!;
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = URL.createObjectURL(blob);
      });
      ctx.drawImage(img, 0, 0);
      // Create displacement canvas for the loaded layer
      const layerDisplacementCanvas = document.createElement('canvas');
      layerDisplacementCanvas.width = canvas.width;
      layerDisplacementCanvas.height = canvas.height;
      const layerDispCtx = layerDisplacementCanvas.getContext('2d', { willReadFrequently: true })!;
      layerDispCtx.imageSmoothingEnabled = true;
      layerDispCtx.imageSmoothingQuality = 'high';
      // CRITICAL FIX: Fill with black (0) for no displacement
      layerDispCtx.fillStyle = 'rgb(0, 0, 0)';
      layerDispCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      layers.push({ id: lp.id, name: lp.name, visible: lp.visible, canvas, history: [], future: [], order: layers.length, displacementCanvas: layerDisplacementCanvas });
    }
    const composedCanvas = document.createElement('canvas');
    const base = layers[0];
    composedCanvas.width = base?.canvas.width || 4096; composedCanvas.height = base?.canvas.height || 4096;
    useApp.setState({
      modelUrl: data.modelUrl || null,
      modelPosition: data.modelPosition || [0, 0, 0],
      modelRotation: data.modelRotation || [0, 0, 0],
      modelScale: data.modelScale || 1,
      backgroundScene: data.backgroundScene || 'studio',
      backgroundIntensity: data.backgroundIntensity || 1,
      backgroundRotation: data.backgroundRotation || 0,
      // Text elements are now managed by V2 system
      layers,
      activeLayerId: layers[0]?.id || null,
      composedCanvas,
      decals: [],
    } as Partial<AppState>);
    get().composeLayers();
  },

  listCheckpoints: async () => {
    const keys = await localforage.keys();
    const checkpointKeys = keys.filter(k => k.startsWith('checkpoint-') && !k.includes('-layer-'));
    const metas: CheckpointMeta[] = [];
    for (const key of checkpointKeys) {
      try {
        const compressed = await localforage.getItem<string>(key);
        if (!compressed) continue;
        const data = JSON.parse(LZString.decompress(compressed) || '{}');
        metas.push({ 
          id: data.id, 
          name: data.name, 
          timestamp: data.timestamp, 
          size: 0,
          createdAt: data.timestamp,
          sizeBytes: 0
        });
      } catch (e) { }
    }
    return metas.sort((a, b) => b.timestamp - a.timestamp);
  },

  deleteCheckpoint: async (id: string) => {
    await localforage.removeItem(`checkpoint-${id}`);
    const keys = await localforage.keys();
    const layerKeys = keys.filter(k => k.startsWith(`checkpoint-${id}-layer-`));
    for (const key of layerKeys) {
      await localforage.removeItem(key);
    }
  },

  // Browser caching functions for project state persistence
  saveProjectState: async () => {
    const state = get();
    console.log('💾 Saving project state to browser cache...');
    
    try {
      // Helper function to convert canvas to blob
      const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => 
        new Promise((resolve) => canvas.toBlob(b => resolve(b || new Blob()), 'image/png'));
      
      // Save layer canvases as blobs
      const layerData = [];
      for (let i = 0; i < state.layers.length; i++) {
        const layer = state.layers[i];
        const blob = await canvasToBlob(layer.canvas);
        const key = `project-layer-${layer.id}`;
        await localforage.setItem(key, blob);
        layerData.push({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          width: layer.canvas.width,
          height: layer.canvas.height,
          key
        });
      }

      // Save puff and displacement canvases
      const puffCanvas = state.puffCanvas;
      const displacementCanvas = state.displacementCanvas;
      const normalCanvas = state.normalCanvas;
      
      if (puffCanvas) {
        const puffBlob = await canvasToBlob(puffCanvas);
        await localforage.setItem('project-puff-canvas', puffBlob);
      }
      
      if (displacementCanvas) {
        const dispBlob = await canvasToBlob(displacementCanvas);
        await localforage.setItem('project-displacement-canvas', dispBlob);
      }
      
      if (normalCanvas) {
        const normalBlob = await canvasToBlob(normalCanvas);
        await localforage.setItem('project-normal-canvas', normalBlob);
      }

      // Create project state object (exclude canvases and functions)
      const projectState = {
        // Tool settings
        activeTool: state.activeTool,
        brushColor: state.brushColor,
        brushSize: state.brushSize,
        brushOpacity: state.brushOpacity,
        brushHardness: state.brushHardness,
        brushSpacing: state.brushSpacing,
        brushShape: state.brushShape,
        brushRotation: state.brushRotation,
        brushDynamics: state.brushDynamics,
        brushFlow: state.brushFlow,
        blendMode: state.blendMode,
        
        // Fill settings
        fillTolerance: state.fillTolerance,
        fillGrow: state.fillGrow,
        fillAntiAlias: state.fillAntiAlias,
        fillContiguous: state.fillContiguous,
        
        // Stroke settings
        strokeColor: state.strokeColor,
        strokeWidth: state.strokeWidth,
        strokeEnabled: state.strokeEnabled,
        
        // Material settings
        roughness: state.roughness,
        metalness: state.metalness,
        fabric: state.fabric,
        
        // Model settings
        modelUrl: state.modelUrl,
        modelPosition: state.modelPosition,
        modelRotation: state.modelRotation,
        modelScale: state.modelScale,
        modelChoice: state.modelChoice,
        modelType: state.modelType,
        modelBoundsHeight: state.modelBoundsHeight,
        modelMinDimension: state.modelMinDimension,
        
        // Layer settings
        activeLayerId: state.activeLayerId,
        layers: layerData,
        
        // Text settings
        textSize: state.textSize,
        textFont: state.textFont,
        textColor: state.textColor,
        textBold: state.textBold,
        textItalic: state.textItalic,
        textAlign: state.textAlign,
        // Text elements are now managed by V2 system
        
        // Background settings
        backgroundScene: state.backgroundScene,
        backgroundIntensity: state.backgroundIntensity,
        backgroundRotation: state.backgroundRotation,
        
        // UI settings
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
        modelManagerOpen: state.modelManagerOpen,
        
        // Camera settings
        controlsEnabled: state.controlsEnabled,
        controlsTarget: state.controlsTarget,
        controlsDistance: state.controlsDistance,
        
        // Vector settings
        vectorPaths: state.vectorPaths,
        activePathId: state.activePathId,
        vectorMode: state.vectorMode,
        puffVectorHistory: state.puffVectorHistory,
        puffVectorFuture: state.puffVectorFuture,
        
        // Puff settings
        puffBrushSize: state.puffBrushSize,
        puffBrushOpacity: state.puffBrushOpacity,
        puffColor: state.puffColor,
        puffHeight: state.puffHeight,
        puffCurvature: state.puffCurvature,
        
        // Embroidery settings
        embroideryStitches: state.embroideryStitches,
        embroideryPattern: state.embroideryPattern,
        embroideryThreadType: state.embroideryThreadType,
        embroideryThickness: state.embroideryThickness,
        embroideryOpacity: state.embroideryOpacity,
        embroideryColor: state.embroideryColor,
        embroideryStitchType: state.embroideryStitchType,
        embroideryPatternDescription: state.embroideryPatternDescription,
        embroideryAIEnabled: state.embroideryAIEnabled,
        embroideryThreadColor: state.embroideryThreadColor,
        embroideryThreadThickness: state.embroideryThreadThickness,
        embroiderySpacing: state.embroiderySpacing,
        embroideryDensity: state.embroideryDensity,
        embroideryCanvas: state.embroideryCanvas,
        embroideryAngle: state.embroideryAngle,
        embroideryScale: state.embroideryScale,
        currentEmbroideryPath: state.currentEmbroideryPath,
        lastEmbroideryPoint: state.lastEmbroideryPoint,
        
        // Grid settings
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        gridColor: state.gridColor,
        gridOpacity: state.gridOpacity,
        showRulers: state.showRulers,
        rulerUnits: state.rulerUnits,
        scale: state.scale,
        showGuides: state.showGuides,
        guideColor: state.guideColor,
        snapToGrid: state.snapToGrid,
        
        // Symmetry settings
        brushSymmetry: state.brushSymmetry,
        symmetryX: state.symmetryX,
        symmetryY: state.symmetryY,
        symmetryZ: state.symmetryZ,
        symmetryAngle: state.symmetryAngle,
        
        // Timestamp
        savedAt: Date.now()
      };

      // Compress and save the project state
      const compressedData = LZString.compress(JSON.stringify(projectState));
      await localforage.setItem('project-state', compressedData);
      
      console.log('💾 Project state saved successfully');
      return true;
    } catch (error) {
      console.error('💾 Failed to save project state:', error);
      return false;
    }
  },

  loadProjectState: async () => {
    console.log('💾 Loading project state from browser cache...');
    
    try {
      const compressed = await localforage.getItem<string>('project-state');
      if (!compressed) {
        console.log('💾 No saved project state found');
        return false;
      }

      const projectState = JSON.parse(LZString.decompress(compressed) || '{}');
      
      // Load layer canvases
      const layers: Layer[] = [];
      for (const layerData of projectState.layers || []) {
        const blob = await localforage.getItem<Blob>(layerData.key);
        if (!blob) continue;
        
        const canvas = document.createElement('canvas');
        canvas.width = layerData.width;
        canvas.height = layerData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = URL.createObjectURL(blob);
        }
        
        // Create displacement canvas for the loaded layer
        const layerDisplacementCanvas = document.createElement('canvas');
        layerDisplacementCanvas.width = canvas.width;
        layerDisplacementCanvas.height = canvas.height;
        const layerDispCtx = layerDisplacementCanvas.getContext('2d', { willReadFrequently: true })!;
        layerDispCtx.imageSmoothingEnabled = true;
        layerDispCtx.imageSmoothingQuality = 'high';
        // CRITICAL FIX: Fill with black (0) for no displacement
        layerDispCtx.fillStyle = 'rgb(0, 0, 0)';
        layerDispCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        layers.push({
          id: layerData.id,
          name: layerData.name,
          visible: layerData.visible,
          canvas,
          history: [],
          future: [],
          order: layers.length,
          displacementCanvas: layerDisplacementCanvas
        });
      }

      // Load puff and displacement canvases
      let puffCanvas = null;
      let displacementCanvas = null;
      let normalCanvas = null;
      
      const puffBlob = await localforage.getItem<Blob>('project-puff-canvas');
      if (puffBlob) {
        puffCanvas = document.createElement('canvas');
        puffCanvas.width = 2048;
        puffCanvas.height = 2048;
        const puffCtx = puffCanvas.getContext('2d');
        if (puffCtx) {
          const puffImg = new Image();
          puffImg.onload = () => puffCtx.drawImage(puffImg, 0, 0);
          puffImg.src = URL.createObjectURL(puffBlob);
        }
      }
      
      const dispBlob = await localforage.getItem<Blob>('project-displacement-canvas');
      if (dispBlob) {
        displacementCanvas = document.createElement('canvas');
        displacementCanvas.width = 2048;
        displacementCanvas.height = 2048;
        const dispCtx = displacementCanvas.getContext('2d');
        if (dispCtx) {
          const dispImg = new Image();
          dispImg.onload = () => dispCtx.drawImage(dispImg, 0, 0);
          dispImg.src = URL.createObjectURL(dispBlob);
        }
      }
      
      const normalBlob = await localforage.getItem<Blob>('project-normal-canvas');
      if (normalBlob) {
        normalCanvas = document.createElement('canvas');
        normalCanvas.width = 2048;
        normalCanvas.height = 2048;
        const normalCtx = normalCanvas.getContext('2d');
        if (normalCtx) {
          const normalImg = new Image();
          normalImg.onload = () => normalCtx.drawImage(normalImg, 0, 0);
          normalImg.src = URL.createObjectURL(normalBlob);
        }
      }

      // Update the state with loaded data
      set({
        // Tool settings
        activeTool: projectState.activeTool || 'brush',
        brushColor: projectState.brushColor || '#000000',
        brushSize: projectState.brushSize || 20,
        brushOpacity: projectState.brushOpacity || 1,
        brushHardness: projectState.brushHardness || 1,
        brushSpacing: projectState.brushSpacing || 0.25,
        brushShape: projectState.brushShape || 'round',
        brushRotation: projectState.brushRotation || 0,
        brushDynamics: projectState.brushDynamics || false,
        brushFlow: projectState.brushFlow || 1,
        blendMode: projectState.blendMode || 'source-over',
        
        // Fill settings
        fillTolerance: projectState.fillTolerance || 30,
        fillGrow: projectState.fillGrow || 0,
        fillAntiAlias: projectState.fillAntiAlias || true,
        fillContiguous: projectState.fillContiguous || true,
        
        // Stroke settings
        strokeColor: projectState.strokeColor || '#000000',
        strokeWidth: projectState.strokeWidth || 2,
        strokeEnabled: projectState.strokeEnabled || false,
        
        // Material settings
        roughness: projectState.roughness || 0.7,
        metalness: projectState.metalness || 0,
        fabric: projectState.fabric || 'cotton',
        
        // Model settings
        modelUrl: projectState.modelUrl || '/models/shirt.glb',
        modelPosition: projectState.modelPosition || [0, 0, 0],
        modelRotation: projectState.modelRotation || [0, 0, 0],
        modelScale: projectState.modelScale || 1,
        modelChoice: projectState.modelChoice || 'tshirt',
        modelType: projectState.modelType || 'glb',
        modelBoundsHeight: projectState.modelBoundsHeight || 0,
        modelMinDimension: projectState.modelMinDimension || 0,
        
        // Layer settings
        activeLayerId: projectState.activeLayerId || null,
        layers: layers,
        
        // Text settings
        textSize: projectState.textSize || 24,
        textFont: projectState.textFont || 'Arial',
        textColor: projectState.textColor || '#000000',
        textBold: projectState.textBold || false,
        textItalic: projectState.textItalic || false,
        textAlign: projectState.textAlign || 'left',
        lastText: projectState.lastText || '',
        activeTextId: projectState.activeTextId || null,
        // Text elements are now managed by V2 system
        
        // Background settings
        backgroundScene: projectState.backgroundScene || 'studio',
        backgroundIntensity: projectState.backgroundIntensity || 1,
        backgroundRotation: projectState.backgroundRotation || 0,
        
        // UI settings
        leftPanelOpen: projectState.leftPanelOpen || true,
        rightPanelOpen: projectState.rightPanelOpen || true,
        modelManagerOpen: projectState.modelManagerOpen || false,
        
        // Camera settings
        controlsEnabled: projectState.controlsEnabled !== undefined ? projectState.controlsEnabled : true,
        controlsTarget: projectState.controlsTarget || [0, 0, 0],
        controlsDistance: projectState.controlsDistance || 5,
        
        // Vector settings
        vectorPaths: projectState.vectorPaths || [],
        activePathId: projectState.activePathId || null,
        vectorMode: projectState.vectorMode || false,
        puffVectorHistory: projectState.puffVectorHistory || [],
        puffVectorFuture: projectState.puffVectorFuture || [],
        
        // Puff settings
        puffBrushSize: projectState.puffBrushSize || 20,
        puffBrushOpacity: projectState.puffBrushOpacity || 1,
        puffColor: projectState.puffColor || '#ff69b4',
        puffHeight: projectState.puffHeight || 2,
        puffCurvature: projectState.puffCurvature || 0.5,
        
        // Embroidery settings
        embroideryStitches: projectState.embroideryStitches || [],
        embroideryPattern: projectState.embroideryPattern || null,
        embroideryThreadType: projectState.embroideryThreadType || 'cotton',
        embroideryThickness: projectState.embroideryThickness || 3,
        embroideryOpacity: projectState.embroideryOpacity || 1.0,
        embroideryColor: projectState.embroideryColor || '#ff69b4',
        embroideryStitchType: projectState.embroideryStitchType || 'satin',
        embroideryPatternDescription: projectState.embroideryPatternDescription || '',
        embroideryAIEnabled: projectState.embroideryAIEnabled !== undefined ? projectState.embroideryAIEnabled : true,
        embroideryThreadColor: projectState.embroideryThreadColor || '#ff69b4',
        embroideryThreadThickness: projectState.embroideryThreadThickness || 0.5,
        embroiderySpacing: projectState.embroiderySpacing || 2.0,
        embroideryDensity: projectState.embroideryDensity || 1.0,
        embroideryCanvas: projectState.embroideryCanvas || null,
        embroideryAngle: projectState.embroideryAngle || 0,
        embroideryScale: projectState.embroideryScale || 1.0,
        currentEmbroideryPath: projectState.currentEmbroideryPath || [],
        lastEmbroideryPoint: projectState.lastEmbroideryPoint || null,
        
        // Grid settings
        showGrid: projectState.showGrid || false,
        gridSize: projectState.gridSize || 50,
        gridColor: projectState.gridColor || '#cccccc',
        gridOpacity: projectState.gridOpacity || 0.5,
        showRulers: projectState.showRulers || false,
        rulerUnits: projectState.rulerUnits || 'px',
        scale: projectState.scale || 1,
        showGuides: projectState.showGuides || false,
        guideColor: projectState.guideColor || '#ff0000',
        snapToGrid: projectState.snapToGrid || false,
        
        // Symmetry settings
        brushSymmetry: projectState.brushSymmetry || false,
        symmetryX: projectState.symmetryX || false,
        symmetryY: projectState.symmetryY || false,
        symmetryZ: projectState.symmetryZ || false,
        symmetryAngle: projectState.symmetryAngle || 0,
        
        // Canvas settings
        puffCanvas: puffCanvas,
        displacementCanvas: displacementCanvas,
        normalCanvas: normalCanvas
      });

      console.log('💾 Project state loaded successfully');
      
      // Trigger layer composition after loading
      setTimeout(() => {
        get().composeLayers();
      }, 100);
      
      return true;
    } catch (error) {
      console.error('💾 Failed to load project state:', error);
      return false;
    }
  },

  clearProjectState: async () => {
    console.log('💾 Clearing project state from browser cache...');
    
    try {
      // Remove main project state
      await localforage.removeItem('project-state');
      
      // Remove layer canvases
      const keys = await localforage.keys();
      const projectKeys = keys.filter(k => k.startsWith('project-'));
      for (const key of projectKeys) {
        await localforage.removeItem(key);
      }
      
      console.log('💾 Project state cleared successfully');
      return true;
    } catch (error) {
      console.error('💾 Failed to clear project state:', error);
      return false;
    }
  },

  // Additional missing methods
  selectTextElement: (id: string | null) => set({ activeTextId: id }),
  removeTextElement: (id: string) => {
    // Text elements are now managed by V2 system
    const v2State = useAdvancedLayerStoreV2.getState();
    v2State.deleteTextElementFromApp(id);
    get().composeLayers();
  },
  setModelChoice: (choice: 'tshirt' | 'sphere' | 'custom') => set({ modelChoice: choice }),
  setModelType: (type: string | null) => set({ modelType: type }),
  setModelBoundsHeight: (height: number) => set({ modelBoundsHeight: height }),
  setModelMinDimension: (dimension: number) => set({ modelMinDimension: dimension }),
  setFrame: (target: [number, number, number], distance: number) => {
    set({ controlsTarget: target, controlsDistance: distance });
  },
  resetModelTransform: () => {
    set({ 
      modelPosition: [0, 0, 0], 
      modelRotation: [0, 0, 0], 
      modelScale: 1 
    });
  },
  setLastHitUV: (uv: { u: number; v: number }) => {
    // This would typically store the last hit UV coordinates
    console.log('Last hit UV:', uv);
  },
  setHoveredTextId: (id: string | null) => set({ hoveredTextId: id }),
  openBackgroundManager: () => set({ backgroundManagerOpen: true }),
  closeBackgroundManager: () => set({ backgroundManagerOpen: false }),
  snapshot: () => {
    // This would typically take a snapshot of the current state
    console.log('Taking snapshot...');
  }
}));

export function App() {
  const composedCanvas = useApp(s => s.composedCanvas);
  const activeTool = useApp(s => s.activeTool);
  const vectorMode = useApp(s => s.vectorMode);
  const showPuffVectorPrompt = useApp(s => s.showPuffVectorPrompt);
  const puffVectorPromptMessage = useApp(s => s.puffVectorPromptMessage);
  const setPuffVectorPrompt = useApp(s => s.setPuffVectorPrompt);
  const setTool = useApp(s => s.setTool);
  const setVectorMode = useApp(s => s.setVectorMode);
  const [showLayerTest, setShowLayerTest] = useState(false);
  // Keyboard shortcut to toggle layer test (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setShowLayerTest(prev => !prev);
        console.log('🧪 Layer test toggled:', !showLayerTest);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLayerTest]);

  const drawingActive = vectorMode || [
    'brush','eraser','fill','picker','smudge','blur','select','transform','move','puffPrint','embroidery',
    'line','rect','ellipse','moveText','gradient','vectorTools','advancedSelection',
    'advancedBrush','meshDeformation','3dPainting','smartFill'
  ].includes(activeTool as any); // Removed 'text' and 'image' - they need normal cursor, not custom overlay
  const wrapRef = useRef<HTMLDivElement>(null);
  const controlsTarget = useApp(s => s.controlsTarget);
  const controlsDistance = useApp(s => s.controlsDistance);
  const cameraView = useApp(s => (s as any).cameraView || null);
  const controlsRef = useRef<any>(null);
  const decals = useApp(s => s.decals);
  const activeDecalId = useApp(s => s.activeDecalId);
  const clickingOnModel = useApp(s => s.clickingOnModel);
  const setClickingOnModel = useApp(s => s.setClickingOnModel);

  // Expose vector store globally for debugging/console access
  useEffect(() => {
    try { (window as any).vectorStore = vectorStore; } catch {}
  }, []);


  const handleClosePuffPrompt = () => setPuffVectorPrompt(false);
  const handleSwitchToPuff = () => {
    setVectorMode(false);
    setPuffVectorPrompt(false);
    setTool('puffPrint');
  };

  // Initialize canvases with reduced resolution for better performance
  useEffect(() => {
    // PERFORMANCE: Reduce canvas resolution from 2048x2048 to 1024x1024 for 4x better performance
    // PERFORMANCE: Use adaptive canvas size based on detected environment
    const optimalSize = unifiedPerformanceManager.getOptimalCanvasSize();
    useApp.getState().initCanvases(optimalSize.width, optimalSize.height);
    
    // CRITICAL FIX: Create default paint layer if no layers exist using Advanced Layers V2
    const appState = useApp.getState();
    const advancedLayerStore = useAdvancedLayerStoreV2.getState();
    
    if (appState.layers.length === 0 && appState.addLayer) {
      console.log('🎨 Creating default paint layer...');
      appState.addLayer('Paint Layer');
      console.log('✅ Default paint layer created');
    }
    
    // Also ensure Advanced Layers V2 has a default layer
    if (advancedLayerStore.layers.length === 0) {
      console.log('🚀 Creating default layer in Advanced Layers V2...');
      const defaultLayerId = advancedLayerStore.createLayer('paint', 'Default Paint Layer');
      advancedLayerStore.setActiveLayer(defaultLayerId);
      console.log('✅ Default layer created in Advanced Layers V2:', defaultLayerId);
    }
  }, []);

  // Initialize Unified Performance Manager
  useEffect(() => {
    console.log('🚀 Initializing Unified Performance Manager...');
    
    // Make performance manager available globally for debugging
    (window as any).unifiedPerformanceManager = unifiedPerformanceManager;
    
    // Make layer stores available globally for debugging
    (window as any).useApp = useApp;
    (window as any).useAdvancedLayerStoreV2 = useAdvancedLayerStoreV2;
    
    // Log initial performance settings
    const preset = unifiedPerformanceManager.getCurrentPreset();
    const capabilities = unifiedPerformanceManager.getDeviceCapabilities();
    
    console.log('🎯 Performance settings initialized:', {
      preset: unifiedPerformanceManager.getPresetName(),
      deviceTier: capabilities.isLowEnd ? 'low' : capabilities.isMidRange ? 'mid' : 'high',
      canvasSize: unifiedPerformanceManager.getOptimalCanvasSize(),
      maxElements: {
        text: unifiedPerformanceManager.getMaxElements('text'),
        shape: unifiedPerformanceManager.getMaxElements('shape'),
        layer: unifiedPerformanceManager.getMaxElements('layer')
      }
    });
    
    // Set up performance event listeners
    const handlePerformanceChange = (event: CustomEvent) => {
      console.log('🔄 Performance preset changed:', event.detail);
    };
    
    window.addEventListener('performancePresetChanged', handlePerformanceChange as EventListener);
    
    return () => {
      window.removeEventListener('performancePresetChanged', handlePerformanceChange as EventListener);
    };
  }, []);

  // DISABLED: Unified Layer Bridge and Tool Layer Manager
  // These systems were conflicting with the new texture preservation system
  // They were calling composeLayers() which was clearing the original model texture
  useEffect(() => {
    console.log('🔄 Layer synchronization systems DISABLED to preserve original model texture');
    console.log('🔄 Using new layered texture system instead');
    
    // V2 system is now the primary layer management system
    
    console.log('🔄 Texture preservation system active - original model texture will be preserved');
  }, []);

  // Automatic project state caching
  useEffect(() => {
    // Load saved project state on app initialization
    const loadSavedState = async () => {
      console.log('💾 Loading saved project state on app initialization...');
      const success = await useApp.getState().loadProjectState();
      if (success) {
        console.log('💾 Project state loaded successfully on startup');
      } else {
        console.log('💾 No saved project state found, starting fresh');
      }
    };

    loadSavedState();
  }, []);

  // Auto-save project state on significant changes
  useEffect(() => {
    const saveState = async () => {
      // Debounce saves to avoid excessive storage writes
      const timeoutId = setTimeout(async () => {
        console.log('💾 Auto-saving project state...');
        await useApp.getState().saveProjectState();
      }, 2000); // Save 2 seconds after last change

      return () => clearTimeout(timeoutId);
    };

    // CRITICAL FIX: DISABLE auto-save completely - it's causing infinite re-render loops
    // Auto-save will be triggered manually by user actions instead
    return () => {};
  }, []);

  // PERFORMANCE FIX: Removed redundant auto-save triggers to prevent excessive saving
  // Auto-save is now handled by the main debounced effect above

  // Global cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 App component unmounting - triggering cleanup...');
      
      // Trigger memory cleanup
      if ((window as any).unifiedPerformanceManager) {
        (window as any).unifiedPerformanceManager.triggerMemoryCleanup();
      }
      
      // Clear any pending timeouts/intervals
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
      
      console.log('🧹 App cleanup completed');
    };
  }, []);

  // Save state before page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      console.log('💾 Saving project state before page unload...');
      await useApp.getState().saveProjectState();
      
      // Trigger memory cleanup before unload
      console.log('🧹 Triggering memory cleanup before unload...');
      if ((window as any).unifiedPerformanceManager) {
        (window as any).unifiedPerformanceManager.triggerMemoryCleanup();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Handle model click detection
  useEffect(() => {
    const handleModelClick = () => {
      setClickingOnModel(true);
    };
    
    const handleModelClickEnd = () => {
      setClickingOnModel(false);
    };

    // Listen for custom events from the Shirt component
    window.addEventListener('modelClick', handleModelClick);
    window.addEventListener('modelClickEnd', handleModelClickEnd);
    window.addEventListener('mouseup', handleModelClickEnd);
    window.addEventListener('mouseleave', handleModelClickEnd);

    return () => {
      window.removeEventListener('modelClick', handleModelClick);
      window.removeEventListener('modelClickEnd', handleModelClickEnd);
      window.removeEventListener('mouseup', handleModelClickEnd);
      window.removeEventListener('mouseleave', handleModelClickEnd);
    };
  }, [setClickingOnModel]);

  // Camera view effect
  useEffect(() => {
    // Guarded: avoid touching controls ref to prevent drei null checks during re-render
    if (!cameraView) return;
    // If needed later, switch camera view via an in-canvas helper using useThree()
  }, [cameraView, controlsTarget, controlsDistance]);

  return (
    <>
      {/* Layer System Test Component - Toggle with Ctrl+Shift+T */}
      {showLayerTest && <AdvancedLayerSystemV2Test />}
      
      <ResponsiveLayout>
        <div ref={wrapRef} className={`canvas-wrap ${drawingActive ? 'drawing' : ''}`}>
          <Canvas 
            shadows 
            camera={{ position: [0.6, 0.9, 1.6], fov: 45 }} 
            dpr={[1,2]} 
            gl={{ powerPreference: 'high-performance', antialias: true }}
            onPointerDown={(e) => {
              // Handle clicks outside the model for camera controls
              const activeTool = useApp.getState().activeTool;
              const continuousDrawingTools = ['brush', 'eraser', 'puffPrint', 'embroidery', 'fill'];
              
              if (continuousDrawingTools.includes(activeTool)) {
                // For Canvas-level events, we assume clicks are outside the model
                // since the ShirtRenderer handles clicks on the model
                console.log('🎨 Canvas: Click detected - enabling controls for camera movement with tool:', activeTool);
                console.log('🎨 Canvas: Current controlsEnabled state before enabling:', useApp.getState().controlsEnabled);
                
                // Force immediate state update
                useApp.setState({ controlsEnabled: true });
                
                // Also call the setter function for consistency
                useApp.getState().setControlsEnabled(true);
                
                // Signal to ShirtRefactored that user manually enabled controls
                // This prevents the useEffect from overriding the manual control enabling
                window.dispatchEvent(new CustomEvent('userManuallyEnabledControls', {
                  detail: { tool: activeTool, enabled: true }
                }));
                
                console.log('🎨 Canvas: Controls enabled, new state:', useApp.getState().controlsEnabled);
                console.log('🎨 Canvas: Manual control flag set for tool:', activeTool);
                
                // Force OrbitControls to re-evaluate by triggering a small delay
                setTimeout(() => {
                  console.log('🎨 Canvas: After delay - controlsEnabled state:', useApp.getState().controlsEnabled);
                }, 10);
              }
            }}
          >
            <color attach="background" args={[0.06,0.07,0.09]} />
            <ShirtRefactored
              showDebugInfo={process.env.NODE_ENV === 'development'}
              enableBrushPainting={true}
            />
            <Grid position={[0,0,0]} infiniteGrid={false} args={[50, 50]} cellSize={0.1} cellThickness={0.6} sectionSize={1} sectionThickness={1.4} sectionColor="#64748b" cellColor="#334155" fadeDistance={0} />
            <axesHelper args={[2]} />
            <Html position={[0,0,0]} center style={{ pointerEvents: 'none' }}>
              <div style={{ width: 12, height: 12, borderRadius: 999, background: '#eab308', boxShadow: '0 0 8px rgba(234,179,8,0.9), 0 0 1px #000 inset' }} />
            </Html>
            <BackgroundScene
              backgroundType={useApp(s => s.backgroundScene)}
              intensity={useApp(s => s.backgroundIntensity)}
              rotation={useApp(s => s.backgroundRotation)}
            />
            <OrbitControls
              key={`orbit-controls-${useApp(s => s.controlsEnabled)}`} // PERFORMANCE FIX: Only re-render when controlsEnabled changes
              // Enhanced orbital controls that work properly with all tools
              enablePan={useApp(s => s.controlsEnabled)}
              enableZoom={true} // Always enable zoom - users need to zoom while drawing
              enableRotate={useApp(s => s.controlsEnabled)}
              zoomToCursor={true}
              enabled={true} // Always enabled - we'll control behavior via mouse buttons
              minDistance={useApp(s=> {
                const h = (s as any).modelBoundsHeight || (s.controlsDistance ?? 1);
                const scale = (s as any).modelScale || 1;
                const minDim = (s as any).modelMinDimension || h * 0.1;
                return Math.max(0.1, Math.min(h * scale * 0.1, minDim * scale * 0.1));
              })}
              maxDistance={useApp(s=> Math.max(5, (s.controlsDistance ?? 1) * 100))}
              target={[0, 0, 0]}
              dampingFactor={0.05}
              enableDamping={true}
              screenSpacePanning={false}
              mouseButtons={useMemo(() => {
                const controlsEnabled = useApp.getState().controlsEnabled;
                return {
                  LEFT: controlsEnabled ? THREE.MOUSE.ROTATE : undefined,
                  MIDDLE: THREE.MOUSE.DOLLY, // Always allow zoom with middle mouse
                  RIGHT: controlsEnabled ? THREE.MOUSE.PAN : THREE.MOUSE.DOLLY
                };
              }, [useApp(s => s.controlsEnabled)])}
              touches={useMemo(() => {
                const controlsEnabled = useApp.getState().controlsEnabled;
                return {
                  ONE: controlsEnabled ? THREE.TOUCH.ROTATE : THREE.TOUCH.DOLLY_PAN,
                  TWO: THREE.TOUCH.DOLLY_PAN
                };
              }, [useApp(s => s.controlsEnabled)])}
            />
            <GizmoHelper alignment="bottom-right" margin={[60,60]}>
              <GizmoViewport axisColors={["#ef4444","#22c55e","#60a5fa"]} labelColor="#e5e7eb" />
            </GizmoHelper>
          </Canvas>
          {useApp(s => s.vectorMode) && (
            <VectorEditorOverlay wrapRef={wrapRef} />
          )}
          {useApp(s => s.selectedLayerV2) && (
            <TransformGizmo 
              selectedElements={[{ id: useApp.getState().selectedLayerV2!, type: 'layer', bounds: { x: 0, y: 0, width: 100, height: 100 } }]}
              onTransform={(transform: any) => {
                const { selectedLayerV2, updateLayerV2 } = useApp.getState();
                if (selectedLayerV2) {
                  updateLayerV2(selectedLayerV2, { transform: { ...transform } });
                }
              }}
              visible={true}
            />
          )}
          <CursorManager wrapRef={wrapRef} drawingActive={drawingActive} />
          <ToolRouter active={true} />
          {/* UnifiedPuffPrintSystem disabled - using ShirtRefactored puff system instead */}
          {/* <UnifiedPuffPrintSystem
            active={useApp(s => s.activeTool === 'puffPrint')}
            onError={(error) => console.error('Puff Print Error:', error)}
          /> */}
                </div>
      </ResponsiveLayout>

      <ModelManager 
          isOpen={useApp(s => s.modelManagerOpen)} 
          onClose={useApp(s => s.closeModelManager)} 
        />
      <BackgroundManager />

      {/* Performance Monitor */}
      <PerformanceMonitor />

      {/* Removed puff vector prompt - puff print and embroidery now work with vector paths */}
      {false && showPuffVectorPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(6px)', zIndex: 999999999 }}>
          <div style={{ maxWidth: 420, margin: '12vh auto 0', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: '18px', padding: '32px 28px', boxShadow: '0 40px 80px rgba(15, 23, 42, 0.55)', border: '1px solid rgba(148, 163, 184, 0.22)', position: 'relative' }}>
            <button
              onClick={handleClosePuffPrompt}
              aria-label="Close puff/vector prompt"
              style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(148, 163, 184, 0.12)', border: '1px solid rgba(148, 163, 184, 0.28)', color: '#cbd5f5', width: 32, height: 32, borderRadius: '8px', cursor: 'pointer', fontSize: 16, fontWeight: 600 }}
            >
              ×
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: '20px', background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontSize: 28, fontWeight: 700, boxShadow: '0 18px 35px rgba(250, 204, 21, 0.35)' }}>
                  ⚠️
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Vector paths & puff print</h2>
                  <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: '#cbd5f5' }}>{puffVectorPromptMessage}</p>
                </div>
              </div>
              <ul style={{ margin: '0 0 8px', paddingLeft: 22, color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                <li>Vector mode is designed for precise path editing on the overlay.</li>
                <li>Puff print brushes render directly to the garment texture.</li>
                <li>Switch tools or exit vector mode before returning to puff print.</li>
              </ul>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button
                  onClick={handleSwitchToPuff}
                  style={{ flex: '1 1 180px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)', color: '#ffffff', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 18px 40px rgba(236, 72, 153, 0.35)' }}
                >
                  Switch to Puff Brush
                </button>
                <button
                  onClick={handleClosePuffPrompt}
                  style={{ flex: '1 1 170px', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.35)', background: 'rgba(148, 163, 184, 0.12)', color: '#e2e8f0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  Keep Editing Vectors
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CursorManager({ wrapRef, drawingActive }: { wrapRef: React.RefObject<HTMLDivElement>; drawingActive: boolean }) {
  const tool = useApp(s => s.activeTool);
  const vectorMode = useApp(s => s.vectorMode);
  const brushSize = useApp(s => s.brushSize);
  const puffBrushSize = useApp(s => s.puffBrushSize);
  const textSize = useApp(s => s.textSize);
  const shapeSize = useApp(s => s.shapeSize);
  const shape = useApp(s => s.brushShape);
  const angle = useApp(s => s.cursorAngle);
  const [pos, setPos] = useState<{x:number;y:number}>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  // Track current vector subtool from the vector store
  const [vectorTool, setVectorTool] = useState<string>(vectorStore.getState().tool);
  useEffect(() => {
    const unsub = vectorStore.subscribe(state => setVectorTool(state.tool));
    return () => unsub();
  }, []);
  
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(drawingActive);
    
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mouseenter', onEnter);
    
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mouseenter', onEnter);
    };
  }, [wrapRef, drawingActive, tool, vectorMode, vectorTool]);
  
  useEffect(() => { 
    if (!drawingActive) setVisible(false); 
  }, [drawingActive]);
  
  // Determine the correct size based on the active tool
  const getToolSize = () => {
    switch (tool) {
      case 'brush':
      case 'eraser':
      case 'smudge':
      case 'blur':
      case 'fill':
        return brushSize;
      case 'puffPrint':
        return puffBrushSize;
      case 'text':
        return textSize;
      case 'shapes':
        return shapeSize;
      case 'embroidery':
        return brushSize; // Use brush size for embroidery
      default:
        return brushSize;
    }
  };

  const size = getToolSize();
  
  // When vector mode is enabled, reflect the current vector subtool in the overlay
  const overlayTool = vectorMode ? (vectorTool as any) : (tool as any);
  return <CursorOverlay x={pos.x} y={pos.y} visible={visible} tool={overlayTool} size={size} shape={shape} angle={angle} />;
}

export default App;
