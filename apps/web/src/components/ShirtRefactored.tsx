import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useBrushEngine } from '../hooks/useBrushEngine';
import { useFrame } from '@react-three/fiber';
import { Html, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { textureManager } from '../utils/TextureManager';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { canvasPool } from '../utils/CanvasPool';
import { geometryManager } from '../utils/GeometryManager';
import { performanceOptimizer } from '../utils/PerformanceOptimizer';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2, BlendMode } from '../core/AdvancedLayerSystemV2';
import { useStrokeSelection } from '../core/StrokeSelectionSystem';
import { StrokeSelectionCanvas } from './StrokeVisuals';
import { createDisplacementCanvas, createNormalCanvas, CANVAS_CONFIG } from '../constants/CanvasSizes';
import { convertUVToPixel, convertPixelToUV, getCanvasDimensions, isWhiteCanvas } from '../utils/CoordinateUtils';
import { puffGeometryManager, PuffSettings, PuffStrokePoint } from '../utils/puff/PuffGeometryManager';

// Import new modular components
import { ShirtRenderer } from './Shirt/ShirtRenderer';
// import { UVMapper } from './Shirt/UVMapper'; // TEMPORARILY DISABLED TO DEBUG
// REMOVED: Conflicting layer systems - using AdvancedLayerSystemV2 only
// import { useLayerManager } from '../stores/LayerManager';
// import { useAdvancedLayerStore } from '../core/AdvancedLayerSystem';
// import { layerBridge } from '../core/LayerSystemBridge';
// import { LAYER_SYSTEM_CONFIG } from '../config/LayerConfig';
// import { layerPersistenceManager } from '../core/LayerPersistenceManager';
// import { useAutomaticLayerManager } from '../core/AutomaticLayerManager';
// import { Brush3DIntegration } from './Brush3DIntegrationNew'; // Using existing useApp painting system instead

// Import selection system
import { useLayerSelectionSystem, elementDetection } from '../core/LayerSelectionSystem';
import SelectionVisualization from './SelectionVisualization';

// Import domain stores
import { useModelStore } from '../stores/domainStores';

// Import types
import { ModelData, BrushPoint } from '../types/app';
import { 
  createEnhancedBrushPoint, 
  createVelocityTracker,
  calculateAdvancedBrushDynamics 
} from '../utils/AdvancedBrushFeatures';
import { applySmudge, applyBlur, createSmudgeState } from '../utils/SmudgeBlurTools';
import { applyWetBrushBlending, applyColorBleeding, createWetBrushState } from '../utils/WetBrushBlending';
import { sampleAreaColor, rgbToHex, getColorHistory } from '../utils/AdvancedColorPicker';

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): {r: number, g: number, b: number} | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// ============================================================================
// VECTOR TOOL HELPER FUNCTIONS
// ============================================================================

// Standardized anchor detection threshold in UV space (2% of canvas)
const VECTOR_ANCHOR_DETECTION_THRESHOLD = 0.02;

// Calculate distance between two UV coordinates
const distanceInUV = (uv1: {u: number, v: number}, uv2: {u: number, v: number}): number => {
  return Math.sqrt((uv1.u - uv2.u) ** 2 + (uv1.v - uv2.v) ** 2);
};

// Convert UV to pixel coordinates
const uvToPixel = (uv: {u: number, v: number}, canvas: HTMLCanvasElement): {x: number, y: number} => {
  return {
    x: Math.floor(uv.u * canvas.width),
    y: Math.floor(uv.v * canvas.height)
  };
};

// Convert pixel to UV coordinates
const pixelToUV = (pixel: {x: number, y: number}, canvas: HTMLCanvasElement): {u: number, v: number} => {
  return {
    u: pixel.x / canvas.width,
    v: pixel.y / canvas.height
  };
};

// Find nearest anchor to a UV point
const findNearestAnchor = (
  vectorPaths: Array<{id: string; points: Array<{u: number; v: number}>}>,
  targetUV: {u: number, v: number},
  threshold: number = VECTOR_ANCHOR_DETECTION_THRESHOLD
): { pathId: string; anchorIndex: number; distance: number } | null => {
  let nearestAnchor: { pathId: string; anchorIndex: number; distance: number } | null = null;
  let minDistance = threshold;

  vectorPaths.forEach(path => {
    path.points.forEach((point, index) => {
      const distance = distanceInUV(targetUV, { u: point.u, v: point.v });
      if (distance < minDistance) {
        nearestAnchor = { pathId: path.id, anchorIndex: index, distance };
        minDistance = distance;
      }
    });
  });

  return nearestAnchor;
};

// Debug logging utilities (conditional based on DEBUG_TOOLS flag)
const DEBUG_TOOLS = (window as any).DEBUG_TOOLS !== false; // Default to true for development
const debugLog = (...args: any[]) => {
  if (DEBUG_TOOLS) {
    console.log(...args);
  }
};
const debugWarn = (...args: any[]) => {
  if (DEBUG_TOOLS) {
    console.warn(...args);
  }
};
const debugError = (...args: any[]) => {
  if (DEBUG_TOOLS) {
    console.error(...args);
  }
};

interface ShirtRefactoredProps {
  showDebugInfo?: boolean;
  enableBrushPainting?: boolean;
}

// Context Menu State
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  textId: string | null;
}

/**
 * ShirtRefactored - 3D scene content only
 * This component provides the 3D scene elements that go inside a Canvas
 * It does NOT contain the Canvas wrapper - that's handled by the parent
 */
export function ShirtRefactored({
  showDebugInfo = false,
  enableBrushPainting = true
}: ShirtRefactoredProps) {
  // Initialize undo/redo system
  useUndoRedo();
  
  // Initialize brush engine for realistic brush effects
  const brushEngine = useBrushEngine();
  
  // Initialize automatic layer manager - REMOVED (simplified system)
  const triggerBrushStart = () => { /* Brush start - simplified system */ };
  const triggerBrushEnd = () => { /* Brush end - simplified system */ };
  const triggerTextCreated = () => { /* Text created - simplified system */ };
  
  // Initialize selection system
  const {
    selectedElements,
    activeElement,
    selectElement,
    clearSelection,
    setSelectionMode,
    addToSelection,
    removeFromSelection,
  } = useLayerSelectionSystem();
  
  // Track modifier keys for selection behavior
  const [modifierKeys, setModifierKeys] = useState({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false // Cmd key on Mac
  });
  
  // PHASE 1: Track individual stroke sessions
  // This ref stores the current stroke being drawn
  const strokeSessionRef = useRef<{
    id: string;
    layerId: string | null;
    points: Array<{ x: number; y: number }>;
    bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
    settings: any;
    tool: string;
  } | null>(null);
  
  // PERFORMANCE: Track when to save history (debounced)
  const lastHistorySaveRef = useRef(0);
  const HISTORY_SAVE_DELAY = 500; // Don't save history more than once every 500ms
  
  // ADVANCED BRUSH FEATURES: Velocity tracking for pressure simulation
  const velocityTrackerRef = useRef(createVelocityTracker(10));
  const lastBrushPointRef = useRef<BrushPoint | null>(null);
  
  // SMUDGE/BLUR TOOLS: Track last position for directional effects
  const smudgeStateRef = useRef({ lastX: 0, lastY: 0, initialized: false });
  
  // WET BRUSH BLENDING: Track wet brush state for watercolor effects
  const wetBrushStateRef = useRef<{ points: Array<{ x: number; y: number }>; initialized: boolean }>({
    points: [],
    initialized: false
  });
  
  // SMOOTH BRUSH: Track last paint position for interpolation
  const lastPaintPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  // VECTOR TOOL: Track path count for optimized rendering
  const lastVectorPathCountRef = useRef(0);
  const lastVectorPathsHashRef = useRef<string>('');
  
  // PERFORMANCE: Throttle composeLayers and texture updates
  const composeLayersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textureUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastComposeTimeRef = useRef(0);
  const lastTextureUpdateTimeRef = useRef(0);
  const COMPOSE_THROTTLE_MS = 50; // Throttle composeLayers to max once per 50ms
  const TEXTURE_UPDATE_THROTTLE_MS = 16; // Throttle texture updates to ~60fps
  
  // Reduced logging frequency to prevent console spam
  if (Math.random() < 0.01) { // Only log 1% of the time
    // ShirtRefactored component mounting with props
  }
  
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when text elements change
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    textId: null
  });

  // PERFORMANCE: Enhanced FPS tracking and adaptive optimization
  useFrame((state, delta) => {
    // CRITICAL FIX: Record actual frame time for accurate FPS tracking
    const frameTime = delta * 1000; // Convert to milliseconds
    unifiedPerformanceManager.recordFrameTime(frameTime);
    
    // Also update PerformanceOptimizer FPS tracking
    performanceOptimizer.updateFPS();
    
    // PERFORMANCE: Adaptive optimization based on actual performance
    if (performanceOptimizer.shouldUseAggressiveOptimizations()) {
      performanceOptimizer.forceGarbageCollection();
      
      // PERFORMANCE: Use unified performance manager for quality adjustments
      const capabilities = unifiedPerformanceManager.getDeviceCapabilities();
      if (capabilities.isLowEnd) {
        // Reduce texture resolution dynamically for low-end devices
        const optimalSize = unifiedPerformanceManager.getOptimalCanvasSize();
        // This could be used to dynamically resize canvases if needed
      }
    }
  });

  // Cleanup textures on component unmount to prevent memory leaks
  useEffect(() => {
    // ShirtRefactored: Component mounted, setting up cleanup
    return () => {
      // ShirtRefactored: Cleaning up textures on unmount
      // Note: We don't dispose all textures here as other components might be using them
      // Only dispose the specific texture we created
      textureManager.disposeTexture('model-texture');
    };
  }, []);

  // CRITICAL FIX: Listen for text elements changes to force re-render
  useEffect(() => {
    const handleTextElementsChange = () => {
      // Force re-render when text elements change
      setForceUpdate(prev => prev + 1);
      // Text elements changed, forcing re-render
    };
    
    window.addEventListener('textElementsChanged', handleTextElementsChange);
    return () => window.removeEventListener('textElementsChanged', handleTextElementsChange);
  }, []);

  // Track modifier keys for selection behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifierKeys(prev => ({
        ...prev,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      }));
      
      // FIX #5: Delete key shortcut for stroke deletion
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedLayerId, deleteStroke } = useStrokeSelection.getState();
        if (selectedLayerId) {
          console.log('🗑️ Delete key pressed - deleting stroke:', selectedLayerId);
          deleteStroke(selectedLayerId);
          
          // Update texture
          if ((window as any).updateModelTexture) {
            (window as any).updateModelTexture(false, false);
          }
          
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      // FIX #5: ESC key to end transform
      if (e.key === 'Escape') {
        const { transformMode, endTransform } = useStrokeSelection.getState();
        if (transformMode) {
          console.log('🚫 ESC pressed - ending transform');
          endTransform();
          
          // Re-compose layers
          const v2Store = useAdvancedLayerStoreV2.getState();
          v2Store.composeLayers();
          const { composeLayers } = useApp.getState();
          composeLayers();
          
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      // VECTOR TOOL KEYBOARD SHORTCUTS
      if (activeTool === 'vector') {
        const appState = useApp.getState();
        
        // P - Pen mode (create/edit paths)
        if (e.key === 'p' || e.key === 'P') {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            appState.setVectorEditMode('pen');
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Vector: Switched to pen mode');
          }
        }
        
        // V - Select mode
        if (e.key === 'v' || e.key === 'V') {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            appState.setVectorEditMode('select');
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Vector: Switched to select mode');
          }
        }
        
        // C - Curve mode (edit bezier handles)
        if (e.key === 'c' || e.key === 'C') {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            appState.setVectorEditMode('curve');
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Vector: Switched to curve mode');
          }
        }
        
        // A - Add anchor (when path is selected)
        if (e.key === 'a' || e.key === 'A') {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const { vectorPaths, activePathId } = appState;
            if (activePathId) {
              // Switch to addAnchor mode temporarily
              appState.setVectorEditMode('addAnchor');
              e.preventDefault();
              e.stopPropagation();
              console.log('🎯 Vector: Add anchor mode activated');
            }
          }
        }
        
        // Delete/Backspace - Remove selected anchor
        if ((e.key === 'Delete' || e.key === 'Backspace') && appState.selectedAnchor) {
          const { selectedAnchor, vectorPaths } = appState;
          if (selectedAnchor) {
            const path = vectorPaths.find(p => p.id === selectedAnchor.pathId);
            if (path && path.points.length > 2) {
              appState.removeAnchor(selectedAnchor.pathId, selectedAnchor.anchorIndex);
              appState.setSelectedAnchor(null);
              e.preventDefault();
              e.stopPropagation();
              console.log('🎯 Vector: Removed anchor');
            }
          }
        }
        
        // Enter - Close/open path
        if (e.key === 'Enter' && appState.activePathId) {
          const { activePathId, vectorPaths } = appState;
          const path = vectorPaths.find(p => p.id === activePathId);
          if (path && path.points.length > 2) {
            if (path.closed) {
              appState.openPath(activePathId);
              console.log('🎯 Vector: Opened path');
            } else {
              appState.closePath(activePathId);
              console.log('🎯 Vector: Closed path');
            }
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifierKeys(prev => ({
        ...prev,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      }));
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Get current tool state for conditional rendering
  const activeTool = useApp(state => state.activeTool);
  const vectorPaths = useApp(state => state.vectorPaths || []);
  // Vector mode removed - vector tool is now a standalone tool
  
  // Brush tool state management
  const paintingActiveRef = useRef(false);
  const lastTextureUpdateRef = useRef(0);
  const lastPuffUpdateRef = useRef(0);
  const isDraggingAnchorRef = useRef(false);
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);
  
  // VECTOR TOOL: Track handle dragging for curve mode
  const isDraggingHandleRef = useRef(false);
  const draggingHandleInfoRef = useRef<{pathId: string; anchorIndex: number; handleType: 'in' | 'out'} | null>(null);
  const textPromptActiveRef = useRef(false); // Prevent double text prompts
  const lastTextPromptTimeRef = useRef(0); // Track last prompt time
  const userManuallyEnabledControlsRef = useRef(false); // Track when user manually enables controls
  const setControlsEnabled = useApp(s => s.setControlsEnabled);
  // ShirtRefactored: Brush tool state set up
  
  // Get all brush settings in a single useApp call to reduce re-renders
  // ShirtRefactored: Getting brush settings...
  const brushSettings = useApp(s => ({
    brushColor: s.brushColor,
    brushSize: s.brushSize,
    brushOpacity: s.brushOpacity,
    brushHardness: s.brushHardness,
    brushFlow: s.brushFlow,
    brushShape: s.brushShape,
    brushSpacing: s.brushSpacing,
    blendMode: s.blendMode,
    getActiveLayer: s.getActiveLayer,
    modelScene: s.modelScene
  }));
  
  // ShirtRefactored: Brush settings obtained
  
  // Destructure brush settings for easier access
  const { brushColor, brushSize, brushOpacity, brushHardness, brushFlow, brushShape, brushSpacing, blendMode, getActiveLayer, modelScene } = brushSettings;
  
  // CRITICAL FIX: Clear brush cache when brush shape or blend mode changes
  // This ensures all brush types (Basic Shapes, Digital Brushes, Traditional Media, Drawing Tools, Special Effects)
  // and all blend modes work correctly without stale cache data
  useEffect(() => {
    if (brushEngine) {
      // Brush settings changed - clearing cache
      brushEngine.clearCache();
    }
  }, [brushShape, blendMode, brushEngine]);
  
  const modelScale = useModelStore(s => s.modelScale);
  // ShirtRefactored: Layer and model scene obtained

  // Create displacement map for puff print 3D effects
  // ShirtRefactored: About to define createDisplacementMap function...
  const createDisplacementMap = useCallback((canvas: HTMLCanvasElement) => {
    // Use CanvasPool to prevent memory leaks
    const displacementCanvas = canvasPool.createTemporaryCanvas({ 
      width: canvas.width, 
      height: canvas.height 
    });
    const dispCtx = displacementCanvas.getContext('2d');
    
    if (!dispCtx) return null;

    // Create displacement map based on painted areas
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return null;

    const dispImageData = dispCtx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const dispData = dispImageData.data;

    // Convert painted areas to height values for displacement
    // Puff settings removed - will be rebuilt with new 3D geometry approach
    // Using default values for now
    const puffHeight = 0.3; // mm (default)
    const puffSoftness = 0.5; // (default)
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        // Create height based on alpha and puff settings with enhanced scaling for embroidery
        const baseHeight = (alpha / 255) * puffHeight;
        
        // NEW PUFF TOOL: Use softness instead of curvature for height variation
        const curvatureFactor = THREE.MathUtils.lerp(0.3, 1.0, puffSoftness);
        
        // Enhanced displacement scaling for embroidery - much stronger 3D effect
        const displacementMultiplier = 1.5; // Increased from 0.3 to 1.5 for stronger effect
        const height = baseHeight * curvatureFactor * displacementMultiplier;
        
        // CRITICAL FIX: Ensure displacement is always outward (128+ = outward, <128 = inward)
        // Convert height to displacement map format where 128 = neutral, 255 = max outward
        // Use larger displacement range for embroidery to create more pronounced 3D effect
        const displacementRange = 100; // Increased from 63 to 100 for stronger displacement
        const displacementValue = Math.floor(THREE.MathUtils.clamp(128 + (height * displacementRange), 128, 228));
        
        dispData[i] = displacementValue;     // R
        dispData[i + 1] = displacementValue; // G
        dispData[i + 2] = displacementValue; // B
        dispData[i + 3] = 255;              // A
        
        // Displacement value calculated
      } else {
        // No displacement for transparent areas (neutral gray = 128)
        dispData[i] = 128;     // R (neutral)
        dispData[i + 1] = 128; // G (neutral)
        dispData[i + 2] = 128; // B (neutral)
        dispData[i + 3] = 255; // A
      }
    }

    dispCtx.putImageData(dispImageData, 0, 0);
    return displacementCanvas;
  }, []);

  // ShirtRefactored: createDisplacementMap function defined successfully

  // Create normal map for puff print 3D effects
  // ShirtRefactored: About to define createNormalMap function...
  const createNormalMap = useCallback((canvas: HTMLCanvasElement) => {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = canvas.width;
    normalCanvas.height = canvas.height;
    const normalCtx = normalCanvas.getContext('2d');
    
    if (!normalCtx) return null;

    // Create normal map based on painted areas
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return null;

    const normalImageData = normalCtx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const normalData = normalImageData.data;

    // Generate normal vectors for 3D lighting
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = data[idx + 3];
        
        if (alpha > 0) {
          // Calculate normal vector based on surrounding pixels
          const left = x > 0 ? data[((y * canvas.width + (x - 1)) * 4) + 3] : 0;
          const right = x < canvas.width - 1 ? data[((y * canvas.width + (x + 1)) * 4) + 3] : 0;
          const up = y > 0 ? data[(((y - 1) * canvas.width + x) * 4) + 3] : 0;
          const down = y < canvas.height - 1 ? data[(((y + 1) * canvas.width + x) * 4) + 3] : 0;
          
          // Calculate gradient
          const dx = (right - left) / 255;
          const dy = (down - up) / 255;
          const dz = Math.sqrt(1 - dx * dx - dy * dy);
          
          // Convert to normal map format (0-255 range)
          normalData[idx] = Math.floor((dx + 1) * 127.5);     // R (X component)
          normalData[idx + 1] = Math.floor((dy + 1) * 127.5); // G (Y component)
          normalData[idx + 2] = Math.floor((dz + 1) * 127.5); // B (Z component)
          normalData[idx + 3] = 255;                          // A
        } else {
          // Default normal (pointing up)
          normalData[idx] = 128;     // R
          normalData[idx + 1] = 128; // G
          normalData[idx + 2] = 255; // B
          normalData[idx + 3] = 255; // A
        }
      }
    }

    normalCtx.putImageData(normalImageData, 0, 0);
    return normalCanvas;
  }, []);

  // ShirtRefactored: createNormalMap function defined successfully

  // Helper function to subdivide geometry for better displacement
  // ShirtRefactored: About to define subdivideGeometry function...
  const subdivideGeometry = useCallback((geometry: THREE.BufferGeometry, subdivisions: number): THREE.BufferGeometry => {
    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    const uvs = geometry.attributes.uv?.array;
    const index = geometry.index?.array;

    if (!index) return geometry; // Can't subdivide without index

    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    const newIndices: number[] = [];

    // Simple subdivision by adding midpoints
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i] * 3;
      const b = index[i + 1] * 3;
      const c = index[i + 2] * 3;

      // Get vertices
      const vA = new THREE.Vector3(positions[a], positions[a + 1], positions[a + 2]);
      const vB = new THREE.Vector3(positions[b], positions[b + 1], positions[b + 2]);
      const vC = new THREE.Vector3(positions[c], positions[c + 1], positions[c + 2]);

      // Create midpoints
      const midAB = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
      const midBC = new THREE.Vector3().addVectors(vB, vC).multiplyScalar(0.5);
      const midCA = new THREE.Vector3().addVectors(vC, vA).multiplyScalar(0.5);

      // Add vertices
      const baseIndex = newPositions.length / 3;
      newPositions.push(vA.x, vA.y, vA.z);
      newPositions.push(vB.x, vB.y, vB.z);
      newPositions.push(vC.x, vC.y, vC.z);
      newPositions.push(midAB.x, midAB.y, midAB.z);
      newPositions.push(midBC.x, midBC.y, midBC.z);
      newPositions.push(midCA.x, midCA.y, midCA.z);

      // Add normals if available
      if (normals) {
        const nA = new THREE.Vector3(normals[a], normals[a + 1], normals[a + 2]);
        const nB = new THREE.Vector3(normals[b], normals[b + 1], normals[b + 2]);
        const nC = new THREE.Vector3(normals[c], normals[c + 1], normals[c + 2]);
        
        const midN_AB = new THREE.Vector3().addVectors(nA, nB).multiplyScalar(0.5).normalize();
        const midN_BC = new THREE.Vector3().addVectors(nB, nC).multiplyScalar(0.5).normalize();
        const midN_CA = new THREE.Vector3().addVectors(nC, nA).multiplyScalar(0.5).normalize();

        newNormals.push(nA.x, nA.y, nA.z);
        newNormals.push(nB.x, nB.y, nB.z);
        newNormals.push(nC.x, nC.y, nC.z);
        newNormals.push(midN_AB.x, midN_AB.y, midN_AB.z);
        newNormals.push(midN_BC.x, midN_BC.y, midN_BC.z);
        newNormals.push(midN_CA.x, midN_CA.y, midN_CA.z);
      }

      // Add UVs if available
      if (uvs && uvs.length >= (Math.max(a, b, c) + 1) * 2) {
        // CRITICAL FIX: Check bounds before accessing UV coordinates to prevent errors
        const uvA = new THREE.Vector2(uvs[a * 2] || 0, uvs[a * 2 + 1] || 0);
        const uvB = new THREE.Vector2(uvs[b * 2] || 0, uvs[b * 2 + 1] || 0);
        const uvC = new THREE.Vector2(uvs[c * 2] || 0, uvs[c * 2 + 1] || 0);
        
        const midUV_AB = new THREE.Vector2().addVectors(uvA, uvB).multiplyScalar(0.5);
        const midUV_BC = new THREE.Vector2().addVectors(uvB, uvC).multiplyScalar(0.5);
        const midUV_CA = new THREE.Vector2().addVectors(uvC, uvA).multiplyScalar(0.5);

        newUvs.push(uvA.x, uvA.y);
        newUvs.push(uvB.x, uvB.y);
        newUvs.push(uvC.x, uvC.y);
        newUvs.push(midUV_AB.x, midUV_AB.y);
        newUvs.push(midUV_BC.x, midUV_BC.y);
        newUvs.push(midUV_CA.x, midUV_CA.y);
      }

      // Create new triangles
      newIndices.push(baseIndex, baseIndex + 3, baseIndex + 5); // A, midAB, midCA
      newIndices.push(baseIndex + 3, baseIndex + 1, baseIndex + 4); // midAB, B, midBC
      newIndices.push(baseIndex + 5, baseIndex + 4, baseIndex + 2); // midCA, midBC, C
      newIndices.push(baseIndex + 3, baseIndex + 4, baseIndex + 5); // midAB, midBC, midCA
    }

    // Create new geometry
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (newNormals.length > 0) {
      newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }
    if (newUvs.length > 0) {
      newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }
    newGeometry.setIndex(newIndices);

    return newGeometry;
  }, []);

  // ShirtRefactored: subdivideGeometry function defined successfully


  // Helper function to check if canvas has actual content
  const checkIfCanvasHasContent = useCallback((canvas: HTMLCanvasElement): boolean => {
    if (!canvas) return false;
    
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false, // Disable alpha for better performance
      desynchronized: true // Allow async operations
    });
    if (!ctx) return false;
    
    // CRITICAL FIX: Sample only a subset of pixels for performance
    // Check every 100th pixel to avoid performance issues
    const sampleRate = 100;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // For displacement maps, we need to check if any pixel deviates from neutral gray (128, 128, 128)
    // Three.js format: 128 = neutral (no displacement), values > 128 = outward displacement
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if pixel deviates from neutral gray (128) by more than tolerance
      // Allow tolerance for rounding errors and blur effects
      const tolerance = 5; // Allow ±5 for rounding errors
      const isNeutral = Math.abs(r - 128) < tolerance && 
                        Math.abs(g - 128) < tolerance && 
                        Math.abs(b - 128) < tolerance;
      
      if (!isNeutral) {
        // Found non-neutral pixel - has displacement content
        return true;
      }
    }
    
    // All sampled pixels are neutral - no displacement content
    return false;
  }, []);

  // Puff normal/displacement map functions removed - will be rebuilt with new 3D geometry approach


  // PERFORMANCE: Smart texture update system - only update what's needed
  const TEXTURE_UPDATE_THROTTLE = 16; // ~60fps max
  
  const updateModelTexture = useCallback((forceUpdate = false, updateDisplacement = false) => {
    const now = Date.now();
    
    // CRITICAL FIX: Skip throttling for text and image dragging to ensure real-time updates
    const isTextDragging = (window as any).__textDragging;
    const isImageDragging = (window as any).__imageDragging;
    if (!forceUpdate && !isTextDragging && !isImageDragging && now - lastTextureUpdateRef.current < TEXTURE_UPDATE_THROTTLE) {
      console.log('🎨 updateModelTexture throttled - skipping update');
      return;
    }
    lastTextureUpdateRef.current = now;
    
    console.log('🎨 updateModelTexture called with:', { forceUpdate, updateDisplacement, isTextDragging, isImageDragging });
    
    // CRITICAL FIX: Skip additional throttling for text and image dragging
    const textureUpdateThrottle = performanceOptimizer.getConfig().deviceTier === 'low' ? 200 : 100; // ms between texture updates
    if (!forceUpdate && !isTextDragging && !isImageDragging && (window as any).lastTextureUpdateTime && (now - (window as any).lastTextureUpdateTime) < textureUpdateThrottle) {
      console.log('🎨 Texture update throttled');
      return;
    }
    (window as any).lastTextureUpdateTime = now;
    
    // CRITICAL FIX: Access modelScene from store to ensure it's always current
    const currentModelScene = useApp.getState().modelScene;
    
    // PERFORMANCE: Early exit checks without logging
    if (!currentModelScene) {
      console.log('🎨 Early exit: no modelScene');
      return;
    }
    
    // CRITICAL FIX: Ensure base texture exists BEFORE composing layers
    // This prevents faded texture during strokes
    const appState = useApp.getState();
    
    // Ensure base texture is captured before composition
    if (!appState.baseTexture && appState.modelScene) {
      console.log('🎨 Base texture missing during texture update - extracting from model...');
      if (appState.generateBaseLayer) {
        appState.generateBaseLayer();
        // Re-read state after generation
        const updatedState = useApp.getState();
        if (updatedState.baseTexture) {
          console.log('🎨 Base texture extracted successfully');
        }
      }
    }
    
    // CRITICAL FIX: Ensure composedCanvas exists by triggering layer composition if needed
    let { composedCanvas } = useApp.getState();
    
    if (!composedCanvas) {
      console.log('🎨 No composedCanvas available - triggering layer composition...');
      useApp.getState().composeLayers();
      composedCanvas = useApp.getState().composedCanvas;
      
      if (!composedCanvas) {
        console.log('🎨 Still no composedCanvas after composition - skipping texture update');
        return;
      }
    }
    
    // CRITICAL FIX: Check if composedCanvas has content before updating
    // We should update the model if composedCanvas has content, even if baseTexture is null
    // Only skip if composedCanvas is empty/white AND baseTexture is missing
    
    // Check if composedCanvas has content (not white/empty)
    const composedCanvasHasContent = !isWhiteCanvas(composedCanvas);
    
    if (!composedCanvasHasContent) {
      // ComposedCanvas is empty/white - check if we should preserve original texture
      if (!appState.baseTexture) {
        console.warn('⚠️ ComposedCanvas is empty and baseTexture is missing - skipping texture update to preserve model texture');
        return;
      }
      
      // Base texture exists but composedCanvas is empty - this shouldn't happen, but skip update
      console.warn('⚠️ ComposedCanvas is empty despite baseTexture existing - skipping texture update');
      return;
    }
    
    // ComposedCanvas has content - proceed with texture update
    // Note: We don't require baseTexture to exist here because composedCanvas already has content
    // The base texture might be null if extraction failed, but layers have been drawn on top
    console.log('🎨 ComposedCanvas has content - proceeding with texture update');
    
    console.log('🎨 Using composedCanvas directly for perfect UV alignment:', {
      width: composedCanvas.width,
      height: composedCanvas.height
    });
    
    // Create fresh texture from the composedCanvas with perfect UV alignment
    const texture = new THREE.CanvasTexture(composedCanvas);
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.name = `composed-texture-${Date.now()}`;
    
    // CRITICAL FIX: Set proper texture wrap settings to prevent stretching/distortion
    // This ensures texture maps correctly regardless of model scale
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1); // Ensure 1:1 mapping without tiling
    texture.offset.set(0, 0); // Ensure no offset
    
    // CRITICAL FIX: Ensure high quality texture generation to prevent fading
    texture.generateMipmaps = true;
    texture.anisotropy = 16; // Maximum anisotropy for best quality
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    console.log('🎨 Created texture from composedCanvas with perfect UV alignment');
    
    console.log('🎨 Created layered texture with proper wrap settings:', texture.name);
    
    // PERFORMANCE FIX: Batch material updates to reduce GPU calls
    const materialUpdates: { mesh: any; material: any }[] = [];
    
    // Collect all mesh updates first
    currentModelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial && texture) {
            // Apply unified performance manager texture quality settings
            const capabilities = unifiedPerformanceManager.getDeviceCapabilities();
            const preset = unifiedPerformanceManager.getCurrentPreset();
            
            // Set texture properties based on device capabilities and preset
            if (capabilities.isLowEnd || preset.textureQuality === 'low') {
              texture.generateMipmaps = false;
              texture.anisotropy = 1;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
            } else if (capabilities.isMidRange || preset.textureQuality === 'medium') {
              texture.generateMipmaps = true;
              texture.anisotropy = 4;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
            } else if (preset.textureQuality === 'high') {
              texture.generateMipmaps = true;
              texture.anisotropy = 8;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
            } else { // ultra
              texture.generateMipmaps = true;
              texture.anisotropy = 16;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
            }
            
            // Always update texture to ensure changes are applied
            mat.map = texture;
            mat.needsUpdate = true;
            mat.map.needsUpdate = true;
            
            // CRITICAL FIX: Force immediate texture update
            if (mat.map) {
              mat.map.needsUpdate = true;
              mat.map.version++;
            }
            
            // CRITICAL FIX: Apply material properties to prevent texture fading
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.alphaTest = 0.0;
            
            // CRITICAL: Reset emissive to prevent washing out
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
            mat.emissiveMap = null;
            
            // ULTRA-REALISTIC: Material properties for natural cotton fabric appearance
            // Default fabric material properties
            mat.roughness = 0.5;
            mat.metalness = 0.0;
            
            mat.normalScale = new THREE.Vector2(1, 1);
            
            // Subtle fabric sheen (much less than before for realism)
            mat.sheen = 0.05;
            mat.sheenRoughness = 0.9;
            mat.sheenColor = new THREE.Color(0xffffff);
            
            // Optimized color space for accurate fabric colors
            mat.toneMapped = true;
            mat.colorSpace = THREE.SRGBColorSpace;
            mat.outputColorSpace = THREE.SRGBColorSpace;
            
            // Natural fabric lighting properties
            mat.envMapIntensity = 0.4;
            mat.reflectivity = 0.05;
              
              mat.needsUpdate = true;
              materialUpdates.push({ mesh: child, material: mat });
          }
        });
      }
    });
    
    // CRITICAL FIX: Apply material updates immediately for visual feedback
    if (materialUpdates.length > 0) {
        console.log(`🎨 Applying ${materialUpdates.length} immediate material updates`);
        materialUpdates.forEach(({ material }) => {
          if (material && material.needsUpdate !== undefined) {
            material.needsUpdate = true;
            console.log('🎨 Material updated immediately:', material);
          }
        });
    } else {
      console.log('🎨 No material updates needed');
    }
    
    // NEW PUFF TOOL: Displacement maps are handled during painting
    // The new puff tool generates displacement directly using generatePuffDisplacement
    // Apply displacement map to model materials when updateDisplacement is true
    // PERFORMANCE: Only update displacement maps periodically, not on every frame
    if (updateDisplacement || forceUpdate) {
      const displacementCanvas = (useApp.getState() as any).displacementCanvas as HTMLCanvasElement | undefined;
      console.log('🎈 Puff tool: Displacement update check', {
        updateDisplacement,
        forceUpdate,
        hasDisplacementCanvas: !!displacementCanvas,
        hasModelScene: !!currentModelScene,
        displacementCanvasSize: displacementCanvas ? `${displacementCanvas.width}x${displacementCanvas.height}` : 'none'
      });
      
      if (displacementCanvas && currentModelScene) {
        // CRITICAL FIX: Check if displacement canvas has actual displacement content
        // If canvas is all neutral (128), don't apply displacement to avoid breaking the model
        const hasDisplacementContent = checkIfCanvasHasContent(displacementCanvas);
        
        if (!hasDisplacementContent) {
          console.log('🎨 No displacement content detected - removing displacement maps');
          // Remove displacement maps from all materials
          currentModelScene.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat: any) => {
                if (mat.isMeshStandardMaterial) {
                  mat.displacementMap = null;
                  mat.displacementScale = 0;
                  mat.needsUpdate = true;
                }
              });
            }
          });
          return; // Early exit - no displacement to apply
        }
        
        // PERFORMANCE: Throttle displacement updates to prevent lag
        const lastDisplacementUpdate = (window as any).__lastDisplacementUpdate || 0;
        const displacementUpdateThrottle = performanceOptimizer.getConfig().deviceTier === 'low' ? 500 : 200; // ms between displacement updates
        const now = Date.now();
        
        // Skip displacement update if called too recently (unless forced)
        if (!forceUpdate && (now - lastDisplacementUpdate) < displacementUpdateThrottle) {
          console.log('🎈 Puff tool: Displacement update throttled', {
            timeSinceLastUpdate: now - lastDisplacementUpdate,
            throttleTime: displacementUpdateThrottle
          });
          return; // Early exit - texture already updated above
        }
        (window as any).__lastDisplacementUpdate = now;
        
        console.log('🎨 Applying displacement map to model (has displacement content)');
        
        // PERFORMANCE: Cache blurred displacement - only regenerate when displacement canvas changes
        const displacementCanvasId = (displacementCanvas as any).__id || Date.now();
        const cachedBlurredDisp = (window as any).__cachedBlurredDisplacement;
        const cachedDisplacementId = (window as any).__cachedDisplacementId;
        
        let blurredDisp: HTMLCanvasElement;
        if (cachedBlurredDisp && cachedDisplacementId === displacementCanvasId) {
          // Reuse cached blurred displacement
          blurredDisp = cachedBlurredDisp;
        } else {
          // Apply gaussian blur for ultra-smooth displacement (eliminates spikes)
          blurredDisp = document.createElement('canvas');
          blurredDisp.width = displacementCanvas.width;
          blurredDisp.height = displacementCanvas.height;
          const blurCtx = blurredDisp.getContext('2d');
          
          if (blurCtx) {
            // Apply blur filter for smoothness
            blurCtx.filter = 'blur(2px)'; // Gaussian blur
            blurCtx.drawImage(displacementCanvas, 0, 0);
            blurCtx.filter = 'none'; // Reset filter
          }
          
          // Cache the blurred displacement
          (window as any).__cachedBlurredDisplacement = blurredDisp;
          (window as any).__cachedDisplacementId = displacementCanvasId;
        }
        
        // PERFORMANCE: Cache displacement texture - only recreate when blurred displacement changes
        const cachedDispTexture = (window as any).__cachedDisplacementTexture;
        const cachedBlurredId = (blurredDisp as any).__id || Date.now();
        const cachedBlurredTextureId = (window as any).__cachedBlurredTextureId;
        
        let dispTexture: THREE.CanvasTexture;
        if (cachedDispTexture && cachedBlurredTextureId === cachedBlurredId) {
          // Reuse cached texture, just update it
          dispTexture = cachedDispTexture;
          dispTexture.needsUpdate = true;
        } else {
          // Create new texture
          dispTexture = new THREE.CanvasTexture(blurredDisp);
          dispTexture.flipY = false;
          dispTexture.needsUpdate = true;
          dispTexture.wrapS = THREE.ClampToEdgeWrapping;
          dispTexture.wrapT = THREE.ClampToEdgeWrapping;
          
          // Cache the texture
          (window as any).__cachedDisplacementTexture = dispTexture;
          (window as any).__cachedBlurredTextureId = cachedBlurredId;
        }
        
        // Puff height removed - will be rebuilt with new 3D geometry approach
        const currentPuffHeight = 0.3; // Default 0.3mm (placeholder)
        
        // CRITICAL FIX: DRAMATICALLY increased displacement scale for visible 3D
        // Displacement scale determines how much the geometry moves based on displacement map
        // Higher scale = more visible 3D effect
        // Height range: 0.2mm - 1.0mm
        // At 0.3mm: scale = 10.0 (was 0.75) - 13x increase!
        // At 1.0mm: scale = 20.0 (was 2.5) - 8x increase!
        // Convert height (mm) to Three.js units (assuming 1 unit = 1mm)
        const heightFactor = Math.pow((currentPuffHeight - 0.2) / 0.8, 0.5); // Square root curve
        const displacementScale = 10.0 + (heightFactor * 10.0); // Range: 10.0 - 20.0
        
        console.log('🎈 Puff tool: Applying displacement', {
          height: currentPuffHeight,
          heightFactor,
          displacementScale,
          hasDisplacementCanvas: !!displacementCanvas,
          displacementCanvasSize: displacementCanvas ? `${displacementCanvas.width}x${displacementCanvas.height}` : 'none'
        });
        
        currentModelScene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            // CRITICAL: Geometry MUST be subdivided for displacement to work!
            // Displacement maps require sufficient vertex density to show 3D effect
            if (child.geometry && !child.geometry.userData.puffSubdivided) {
              const vertexCount = child.geometry.attributes.position.count;
              // Subdivide more aggressively for better displacement visibility
              // More vertices = smoother displacement effect
              if (vertexCount < 50000) { // Increased limit for more subdivision
                child.geometry = subdivideGeometry(child.geometry, 4); // More subdivision (was 3)
                child.geometry.userData.puffSubdivided = true;
                console.log('🎈 Puff tool: Subdivided geometry:', vertexCount, '→', child.geometry.attributes.position.count);
              }
            }
            
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any) => {
              if (mat.isMeshStandardMaterial) {
                mat.displacementMap = dispTexture;
                mat.displacementScale = displacementScale;
                mat.displacementBias = 0;
                
                // PERFORMANCE: Cache normal maps - only regenerate when displacement actually changes
                const cachedNormalTexture = (mat.userData as any)?.cachedPuffNormalTexture;
                const cachedNormalId = (mat.userData as any)?.cachedNormalDisplacementId;
                
                if (!cachedNormalTexture || cachedNormalId !== cachedBlurredId) {
                  // Generate normal map for realistic lighting
                  const normalCanvas = document.createElement('canvas');
                  // PERFORMANCE: Generate normal map at lower resolution for better performance
                  const deviceTier = performanceOptimizer.getConfig().deviceTier;
                  const normalMapScale = deviceTier === 'low' ? 0.5 : deviceTier === 'medium' ? 0.75 : 1.0;
                  normalCanvas.width = Math.floor(blurredDisp.width * normalMapScale);
                  normalCanvas.height = Math.floor(blurredDisp.height * normalMapScale);
                  const normCtx = normalCanvas.getContext('2d', { willReadFrequently: true });
                  const tempDispCtx = blurredDisp.getContext('2d', { willReadFrequently: true });
                  
                  if (normCtx && tempDispCtx) {
                    // PERFORMANCE: Sample at lower resolution for normal map generation
                    const sampleWidth = normalCanvas.width;
                    const sampleHeight = normalCanvas.height;
                    const sampleDispData = tempDispCtx.getImageData(0, 0, blurredDisp.width, blurredDisp.height);
                    const normData = normCtx.createImageData(sampleWidth, sampleHeight);
                    
                    const stepX = blurredDisp.width / sampleWidth;
                    const stepY = blurredDisp.height / sampleHeight;
                    
                    for (let y = 1; y < sampleHeight - 1; y++) {
                      for (let x = 1; x < sampleWidth - 1; x++) {
                        const srcX = Math.floor(x * stepX);
                        const srcY = Math.floor(y * stepY);
                        
                        const idx = (y * sampleWidth + x) * 4;
                        const srcIdx = (srcY * blurredDisp.width + srcX) * 4;
                        const leftIdx = (srcY * blurredDisp.width + Math.max(0, srcX - 1)) * 4;
                        const rightIdx = (srcY * blurredDisp.width + Math.min(blurredDisp.width - 1, srcX + 1)) * 4;
                        const upIdx = (Math.max(0, srcY - 1) * blurredDisp.width + srcX) * 4;
                        const downIdx = (Math.min(blurredDisp.height - 1, srcY + 1) * blurredDisp.width + srcX) * 4;
                        
                        const left = sampleDispData.data[leftIdx];
                        const right = sampleDispData.data[rightIdx];
                        const up = sampleDispData.data[upIdx];
                        const down = sampleDispData.data[downIdx];
                        
                        const dx = (right - left) / 255;
                        const dy = (down - up) / 255;
                        const dz = 1.0;
                        
                        normData.data[idx] = Math.floor((dx + 1) * 127.5);
                        normData.data[idx + 1] = Math.floor((dy + 1) * 127.5);
                        normData.data[idx + 2] = Math.floor((dz + 1) * 127.5);
                        normData.data[idx + 3] = 255;
                      }
                    }
                    normCtx.putImageData(normData, 0, 0);
                    
                    const normTexture = new THREE.CanvasTexture(normalCanvas);
                    normTexture.flipY = false;
                    normTexture.needsUpdate = true;
                    mat.normalMap = normTexture;
                    mat.normalScale = new THREE.Vector2(1.5, 1.5);
                    
                    // Cache the normal texture
                    if (!mat.userData) mat.userData = {};
                    (mat.userData as any).cachedPuffNormalTexture = normTexture;
                    (mat.userData as any).cachedNormalDisplacementId = cachedBlurredId;
                  }
                } else {
                  // Reuse cached normal texture
                  mat.normalMap = cachedNormalTexture;
                  mat.normalScale = new THREE.Vector2(1.5, 1.5);
                }
                
                mat.needsUpdate = true;
                if (forceUpdate) {
                  console.log('🎈 Puff tool: Displacement applied - scale:', displacementScale, 'height:', currentPuffHeight);
                }
              }
            });
          }
        });
      }
    }
    
    console.log('🎨 Model texture updated');
    
    // CRITICAL FIX: Force scene re-render to ensure visual update
    if (currentModelScene && currentModelScene.parent) {
      console.log('🎨 Forcing scene re-render for visual update');
      // Trigger a re-render by updating the scene
      currentModelScene.parent.updateMatrixWorld(true);
    }
  }, [modelScene]);

  console.log('🎯 ShirtRefactored: updateModelTexture function defined successfully');

  // Make updateModelTexture available globally for direct calls
  useEffect(() => {
    (window as any).updateModelTexture = updateModelTexture;
    return () => {
      delete (window as any).updateModelTexture;
    };
  }, [updateModelTexture]);

   // Close context menu on click outside
   useEffect(() => {
     const handleClickOutside = () => {
       if (contextMenu.visible) {
         setContextMenu({ visible: false, x: 0, y: 0, textId: null });
       }
     };
     
     window.addEventListener('click', handleClickOutside);
     return () => window.removeEventListener('click', handleClickOutside);
   }, [contextMenu.visible]);

   // KEYBOARD SHORTCUTS for text tool
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       const { activeTool, activeTextId, updateTextElement, setActiveTextId } = useApp.getState();
       const { getAllTextElements } = useAdvancedLayerStoreV2.getState();
       const textElements = getAllTextElements();
       
       // Only handle shortcuts when text tool is active or text is selected
       if (activeTool !== 'text' && !activeTextId) return;
       
       const selectedText = textElements.find(t => t.id === activeTextId);
       if (!selectedText && activeTool !== 'text') return;
       
       // Prevent shortcuts if user is typing in an input field
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
         return;
       }
       
       // ARROW KEYS: Nudge text position
       if (e.key.startsWith('Arrow') && selectedText) {
         e.preventDefault();
         const nudgeAmount = e.shiftKey ? 0.01 : 0.001; // 10px or 1px in UV space (approx)
         const currentU = selectedText.u || 0.5;
         const currentV = selectedText.v || 0.5;
         
         let newU = currentU;
         let newV = currentV;
         
         switch (e.key) {
           case 'ArrowLeft':
             newU = Math.max(0, currentU - nudgeAmount);
             break;
           case 'ArrowRight':
             newU = Math.min(1, currentU + nudgeAmount);
             break;
           case 'ArrowUp':
             newV = Math.min(1, currentV + nudgeAmount);
             break;
           case 'ArrowDown':
             newV = Math.max(0, currentV - nudgeAmount);
             break;
         }
         
         updateTextElement(selectedText.id, { u: newU, v: newV });
         console.log(`⌨️ Arrow key: Moved text ${e.shiftKey ? '10px' : '1px'}`);
       }
       
       // +/- KEYS: Adjust font size
       if ((e.key === '=' || e.key === '+' || e.key === '-') && selectedText) {
         e.preventDefault();
         const currentSize = selectedText.fontSize;
         const delta = (e.key === '-') ? -1 : 1;
         const newSize = Math.max(8, Math.min(200, currentSize + delta));
         updateTextElement(selectedText.id, { fontSize: newSize });
         console.log(`⌨️ Font size: ${newSize}px`);
       }
       
       // DELETE: Remove selected text
       if ((e.key === 'Delete' || e.key === 'Backspace') && selectedText) {
         e.preventDefault();
         const { deleteTextElementFromApp } = useAdvancedLayerStoreV2.getState();
         deleteTextElementFromApp(selectedText.id);
         setActiveTextId(null);
         console.log(`⌨️ Deleted text: "${selectedText.text}"`);
         
         // Trigger texture update
         setTimeout(() => {
           const { composeLayers } = useApp.getState();
           composeLayers(true);
           if ((window as any).updateModelTexture) {
             (window as any).updateModelTexture(true, false);
           }
         }, 10);
       }
       
       // ESCAPE: Deselect text
       if (e.key === 'Escape' && activeTextId) {
         e.preventDefault();
         setActiveTextId(null);
         console.log(`⌨️ Deselected text`);
       }
       
       // CTRL+D: Duplicate text
       if (e.ctrlKey && e.key === 'd' && selectedText) {
         e.preventDefault();
         const { addTextElementFromApp } = useAdvancedLayerStoreV2.getState();
         const newTextId = addTextElementFromApp(selectedText.text, { u: (selectedText.u || 0.5) + 0.02, v: (selectedText.v || 0.5) + 0.02 });
         setActiveTextId(newTextId);
         console.log(`⌨️ Duplicated text: "${selectedText.text}"`);
         
         // Trigger texture update
         setTimeout(() => {
           const { composeLayers } = useApp.getState();
           composeLayers(true);
           if ((window as any).updateModelTexture) {
             (window as any).updateModelTexture(true, false);
           }
         }, 10);
       }
       
       // CTRL+C: Copy text
       if (e.ctrlKey && e.key === 'c' && selectedText) {
         e.preventDefault();
         (window as any).__copiedText = { ...selectedText };
         console.log(`⌨️ Copied text: "${selectedText.text}"`);
       }
       
       // CTRL+V: Paste text
       if (e.ctrlKey && e.key === 'v' && (window as any).__copiedText) {
         e.preventDefault();
         const copiedText = (window as any).__copiedText;
         const { addTextElementFromApp } = useAdvancedLayerStoreV2.getState();
         const newTextId = addTextElementFromApp(copiedText.text, { u: (copiedText.u || 0.5) + 0.02, v: (copiedText.v || 0.5) + 0.02 });
         setActiveTextId(newTextId);
         console.log(`⌨️ Pasted text: "${copiedText.text}"`);
         
         // Trigger texture update
         setTimeout(() => {
           const { composeLayers } = useApp.getState();
           composeLayers(true);
           if ((window as any).updateModelTexture) {
             (window as any).updateModelTexture(true, false);
           }
         }, 10);
       }
     };
     
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);

   // Apply Tool Integration - Handle all texture system events
  useEffect(() => {
     console.log('🎨 Setting up Apply Tool event listeners for all texture systems');


     // Handle embroidery effects application
     const handleApplyEmbroideryEffects = () => {
       console.log('🎨 Apply Tool: Applying embroidery effects to texture maps');
       const appState = useApp.getState();
       if (appState.embroideryCanvas && modelScene) {
         // Update model texture to include embroidery effects
         updateModelTexture(false, false); // No displacement maps needed for embroidery
       }
     };

     // Handle brush effects application
     const handleApplyBrushEffects = () => {
       console.log('🎨 Apply Tool: Applying brush effects to all texture layers');
       const appState = useApp.getState();
       if (appState.composedCanvas && modelScene) {
         // Update model texture to include brush effects
         updateModelTexture(false, false); // No displacement maps needed for brush
       }
     };

    // Handle displacement maps update
    const handleUpdateDisplacementMaps = () => {
      console.log('🎨 Apply Tool: Updating displacement maps only');
      if (modelScene) {
        updateModelTexture(false, true); // Only update displacement maps
      }
    };

    // Handle force model texture update
    const handleForceModelTextureUpdate = () => {
      console.log('🎨 Apply Tool: Forcing 3D model texture update with unified system');
      if (modelScene) {
        // Update main texture with unified system
        updateModelTexture(true, true); // Force update with displacement maps
      }
    };

     // Add event listeners
     document.addEventListener('applyEmbroideryEffects', handleApplyEmbroideryEffects);
     document.addEventListener('applyBrushEffects', handleApplyBrushEffects);
     document.addEventListener('updateDisplacementMaps', handleUpdateDisplacementMaps);
     document.addEventListener('forceModelTextureUpdate', handleForceModelTextureUpdate);

     // Cleanup
     return () => {
       document.removeEventListener('applyEmbroideryEffects', handleApplyEmbroideryEffects);
       document.removeEventListener('applyBrushEffects', handleApplyBrushEffects);
       document.removeEventListener('updateDisplacementMaps', handleUpdateDisplacementMaps);
       document.removeEventListener('forceModelTextureUpdate', handleForceModelTextureUpdate);
     };
   }, [modelScene, updateModelTexture]);

  // PERFORMANCE FIX: Removed separate puff displacement handling
  // Puff print effects are now integrated into the unified texture system
  // No special handling needed when switching tools
  
  // Render vector paths when they change - render on COMPOSED canvas for visibility
  const showAnchorPoints = useApp(s => s.showAnchorPoints);
  const vectorStrokeColor = useApp(s => s.vectorStrokeColor);
  const vectorStrokeWidth = useApp(s => s.vectorStrokeWidth);
  const vectorFillColor = useApp(s => s.vectorFillColor);
  const vectorFill = useApp(s => s.vectorFill);
  const vectorEditMode = useApp(s => s.vectorEditMode || 'pen');
  const selectedAnchor = useApp(s => s.selectedAnchor);
  
  // CRITICAL FIX: Real-time rendering for vector paths - no debounce
  useEffect(() => {
    // CRITICAL FIX: Only render if vector tool is active
    if (activeTool !== 'vector') {
      // Return cleanup function that does nothing when tool is not active
      return () => {};
    }
    
    // CRITICAL FIX: Render immediately for real-time feedback - NO debounce
    // Use vectorPaths from dependency directly, not getState()
    // This ensures we're using the subscribed value that triggered the effect
    const freshVectorPaths = vectorPaths || [];
    
    // Always render vector paths when vector tool is active, regardless of showAnchorPoints
    if (freshVectorPaths.length === 0) {
      // Clear vector paths from composed canvas if no paths exist
      const composedCanvas = useApp.getState().composedCanvas;
      if (composedCanvas) {
        useApp.getState().composeLayers();
        updateModelTexture(false, false);
      }
      return;
    }
    
    // CRITICAL FIX: Ensure composedCanvas is available
    let composedCanvas = useApp.getState().composedCanvas;
    if (!composedCanvas) {
      console.warn('🎯 Vector tool: No composedCanvas - initializing...');
      // Try to trigger layer composition
      useApp.getState().composeLayers();
      composedCanvas = useApp.getState().composedCanvas;
      
      if (!composedCanvas) {
        console.error('🎯 Vector tool: Failed to initialize composedCanvas');
        return;
      }
    }
    
    // PERFORMANCE FIX: Only recompose layers if needed (not on every render)
    // Check if we need to recompose (path count changed, or first render)
    const currentPathHash = JSON.stringify(freshVectorPaths.map(p => ({ id: p.id, pointCount: p.points.length })));
    const needsRecompose = lastVectorPathsHashRef.current !== currentPathHash || lastVectorPathCountRef.current !== freshVectorPaths.length;
    
    if (needsRecompose) {
      // PERFORMANCE: Throttle composeLayers calls
      const now = Date.now();
      if (now - lastComposeTimeRef.current >= COMPOSE_THROTTLE_MS) {
        useApp.getState().composeLayers();
        lastComposeTimeRef.current = now;
      } else {
        // Clear existing timeout and schedule new one
        if (composeLayersTimeoutRef.current) {
          clearTimeout(composeLayersTimeoutRef.current);
        }
        composeLayersTimeoutRef.current = setTimeout(() => {
          useApp.getState().composeLayers();
          lastComposeTimeRef.current = Date.now();
        }, COMPOSE_THROTTLE_MS - (now - lastComposeTimeRef.current));
      }
      
      lastVectorPathsHashRef.current = currentPathHash;
      lastVectorPathCountRef.current = freshVectorPaths.length;
    }
    
    // Re-get composedCanvas after composition to ensure we have the latest version
    composedCanvas = useApp.getState().composedCanvas;
    if (!composedCanvas) {
      return;
    }
    
    const ctx = composedCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    // CRITICAL FIX: Use vector settings from dependencies directly (already subscribed)
    const strokeColor = vectorStrokeColor || '#000000';
    const strokeWidth = vectorStrokeWidth || 2;
    const fillColor = vectorFillColor || '#FF0000';
    const vectorFillEnabled = vectorFill || false;
    
    // Then render vector paths on top (use fresh paths from state)
    freshVectorPaths.forEach((path: any) => {
      if (path.points.length === 0) return; // Skip empty paths
      
      // For single-point paths, just draw a dot
      if (path.points.length === 1) {
        const point = path.points[0];
        const px = Math.floor(point.u * composedCanvas.width);
        const py = Math.floor(point.v * composedCanvas.height);
        
        ctx.save();
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(px, py, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      
      ctx.save();
      
      // Use actual vector stroke settings
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0; // Full opacity
      
      ctx.beginPath();
      
      path.points.forEach((point: any, index: number) => {
        const px = Math.floor(point.u * composedCanvas.width);
        const py = Math.floor(point.v * composedCanvas.height);
        
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          // Draw bezier curve if handles exist
          const prevPoint = path.points[index - 1];
          if (prevPoint.outHandle || point.inHandle) {
            const prevX = Math.floor(prevPoint.u * composedCanvas.width);
            const prevY = Math.floor(prevPoint.v * composedCanvas.height);
            const cp1X = prevPoint.outHandle ? Math.floor(prevPoint.outHandle.u * composedCanvas.width) : prevX;
            const cp1Y = prevPoint.outHandle ? Math.floor(prevPoint.outHandle.v * composedCanvas.height) : prevY;
            const cp2X = point.inHandle ? Math.floor(point.inHandle.u * composedCanvas.width) : px;
            const cp2Y = point.inHandle ? Math.floor(point.inHandle.v * composedCanvas.height) : py;
            
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
      });
      
      if (path.closed && path.points.length > 2) {
        ctx.closePath();
      }
      
      // Fill the path if fill is enabled and path is closed
      if (vectorFillEnabled && path.closed && path.points.length > 2) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      
      ctx.stroke();
      ctx.restore();
      
      // CRITICAL FIX: Always show anchors when vector tool is active for better UX
      // Anchors should always be visible when vector tool is active for better user experience
      path.points.forEach((point: any, index: number) => {
        const px = Math.floor(point.u * composedCanvas.width);
        const py = Math.floor(point.v * composedCanvas.height);
        const isSelected = selectedAnchor && 
          selectedAnchor.pathId === path.id && 
          selectedAnchor.anchorIndex === index;
        
        ctx.save();
        
        // Anchor point with black outline for selected
        ctx.fillStyle = isSelected ? '#FFFFFF' : '#3B82F6';
        ctx.beginPath();
        ctx.arc(px, py, isSelected ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        
        // White outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Black outline for selected anchors
        if (isSelected) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        
        ctx.restore();
      });
    }); // Close forEach
    
    // PERFORMANCE FIX: Throttle texture updates to ~60fps
    const now = Date.now();
    if (now - lastTextureUpdateTimeRef.current >= TEXTURE_UPDATE_THROTTLE_MS) {
      updateModelTexture(false, false);
      lastTextureUpdateTimeRef.current = now;
    } else {
      // Clear existing timeout and schedule new one
      if (textureUpdateTimeoutRef.current) {
        clearTimeout(textureUpdateTimeoutRef.current);
      }
      textureUpdateTimeoutRef.current = setTimeout(() => {
        updateModelTexture(false, false);
        lastTextureUpdateTimeRef.current = Date.now();
      }, TEXTURE_UPDATE_THROTTLE_MS - (now - lastTextureUpdateTimeRef.current));
    }
    
    // Cleanup function to clear timeouts
    return () => {
      if (composeLayersTimeoutRef.current) {
        clearTimeout(composeLayersTimeoutRef.current);
        composeLayersTimeoutRef.current = null;
      }
      if (textureUpdateTimeoutRef.current) {
        clearTimeout(textureUpdateTimeoutRef.current);
        textureUpdateTimeoutRef.current = null;
      }
    };
    }, [activeTool, vectorPaths, vectorEditMode, selectedAnchor, vectorStrokeColor, vectorStrokeWidth, vectorFillColor, vectorFill, showAnchorPoints, updateModelTexture]); // CRITICAL FIX: Include updateModelTexture in dependencies
  
  // PHASE 2: Get selected layer ID and transform mode for rendering
  const { selectedLayerId, transformMode } = useStrokeSelection();
  
  // PHASE 2: Render stroke selection border when stroke is selected
  // CRITICAL FIX: Also update border during transform to follow movement
  useEffect(() => {
    console.log('🎯 Border useEffect triggered, selectedLayerId:', selectedLayerId, 'transformMode:', transformMode);
    
    if (!selectedLayerId) {
      // CRITICAL FIX: No selection - clear border by recomposing layers from scratch
      const { composeLayers } = useAdvancedLayerStoreV2.getState();
      composeLayers();
      
      // Force immediate texture update to clear border
      updateModelTexture(true);
      console.log('🎯 Deselected - cleared border');
      return;
    }
    
    let mounted = true;
    let animationFrameId: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const drawBorder = () => {
      if (!mounted) return;
      
      // CRITICAL FIX: Re-compose layers and update texture FIRST
      // Then draw border on top of the rendered texture
      const { composeLayers } = useAdvancedLayerStoreV2.getState();
      composeLayers();
      
      // Update texture to show layers first
      updateModelTexture(true);
      
      console.log('🎯 Composed layers and updated texture, waiting to draw border...');
      
      // Use requestAnimationFrame + delay to draw border AFTER texture update completes
      animationFrameId = requestAnimationFrame(() => {
        if (!mounted) return;
        
        timeoutId = setTimeout(() => {
          if (!mounted) return;
          
          console.log('🎯 Attempting to draw border on model surface...');
          
          // Get selected stroke data
          const { layers } = useAdvancedLayerStoreV2.getState();
          const selectedStroke = layers.find((l: any) => l.id === selectedLayerId);
          
          if (!selectedStroke?.content?.strokeData?.points) {
            console.warn('⚠️ Selected stroke has no points:', selectedStroke);
            return;
          }
          
          const points = selectedStroke.content.strokeData.points;
          const settings = selectedStroke.content.strokeData.settings;
          const brushSize = settings?.size || 20;
          const outlineRadius = brushSize / 2 + 6;
          
          console.log('🎯 Drawing border tracing full stroke outline, points:', points.length, 'size:', brushSize);
          
          // Draw border directly on the 3D model by updating the composed canvas
          const composedCanvas = useApp.getState().composedCanvas;
          if (!composedCanvas) {
            console.warn('⚠️ No composed canvas available');
            return;
          }
          
          const ctx = composedCanvas.getContext('2d');
          if (!ctx) {
            console.warn('⚠️ Could not get context');
            return;
          }
          
          // CRITICAL FIX: Store and restore the composed canvas state to avoid affecting it
          // Save the current canvas state before drawing border
          const currentImageData = ctx.getImageData(0, 0, composedCanvas.width, composedCanvas.height);
          
          // Draw green dashed OUTLINE border - continuous smooth outline
          ctx.save();
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3; // Slightly thicker for visibility
          ctx.setLineDash([15, 5]);
          // CRITICAL FIX: Don't set globalAlpha to avoid fading the underlying content
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // CRITICAL FIX: Draw a continuous outline using the stroke path with offset
          // This creates a proper outline border that follows the stroke shape
          if (points.length > 0) {
            const outlineRadius = brushSize / 2 + 3; // Outline slightly outside brush size
            
            // Draw continuous outline by tracing the path with offset
            if (points.length === 1) {
              // Single point - draw circle outline
              ctx.beginPath();
              ctx.arc(points[0].x, points[0].y, outlineRadius, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              // Multiple points - draw connected path outline
              // Use quadratic curves for smoother outline
              ctx.beginPath();
              
              // Start with first point
              const p0 = points[0];
              ctx.moveTo(p0.x, p0.y - outlineRadius);
              
              // Draw curved path along the outline
              for (let i = 0; i < points.length; i++) {
                const p = points[i];
                
                if (i === 0) {
                  // Start point - curve up
                  ctx.lineTo(p.x, p.y - outlineRadius);
                } else if (i === points.length - 1) {
                  // End point - curve down to close
                  ctx.lineTo(p.x, p.y + outlineRadius);
                } else {
                  // Middle points - follow the stroke with outline offset
                  ctx.lineTo(p.x, p.y - outlineRadius);
                }
              }
              
              // Close the outline by going back along the other side
              for (let i = points.length - 1; i >= 0; i--) {
                const p = points[i];
                ctx.lineTo(p.x, p.y + outlineRadius);
              }
              
              ctx.stroke();
            }
          }
          
          ctx.restore();
          
          console.log('✅ Border drawn, updating texture...');
          
          // Force texture update to show border (bypass throttling)
          updateModelTexture(true);
          
          console.log('✅ Stroke selection border rendered for:', selectedLayerId);
        }, 200); // Increased delay to ensure texture update completes
      });
    };
    
    // Start the draw process
    drawBorder();
    
          // Cleanup function to prevent memory leaks
          return () => {
            mounted = false;
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          };
        }, [selectedLayerId, transformMode]); // CRITICAL FIX: Removed updateModelTexture from deps to prevent excessive re-renders
  
  // PERFORMANCE OPTIMIZATION: Aggressively optimized painting function
  const paintAtEvent = useCallback((e: any) => {
    // CRITICAL FIX: Get fresh activeTool from store to avoid stale closures
    const currentActiveTool = useApp.getState().activeTool;
    
    // Puff tool handled below after embroidery
    
    // CRITICAL FIX: Only create layer once per stroke, not for each paint event
    // Check if we're already in a stroke session
    // PERFORMANCE: Disable all console logging in hot path for maximum performance
    // Only log critical errors
    
    // CRITICAL FIX: Extract and validate UV coordinates first
    const uv = e.uv as THREE.Vector2 | undefined;
    if (!uv) {
      console.warn('🎨 No UV coordinates in event');
      return;
    }
    
    // CRITICAL FIX: Validate UV coordinates and ensure they're in valid range
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
      console.warn('🎨 Invalid UV coordinates:', uv);
      return;
    }
    
    // CRITICAL FIX: Check if UV coordinates are reasonable (not NaN or Infinity)
    if (!isFinite(uv.x) || !isFinite(uv.y)) {
      console.warn('🎨 Non-finite UV coordinates:', uv);
      return;
    }
    
    // Handle picker tool first - optimized for performance
    if (currentActiveTool === 'picker') {
      debugLog('🎨 Picker tool: Starting color pick at UV:', { u: uv.x, v: uv.y });
      
      if (!modelScene) {
        if (DEBUG_TOOLS) console.warn('🎨 Picker tool: No modelScene available');
        return;
      }
      
      // PERFORMANCE: Use cached composed canvas for faster color sampling
      const composedCanvas = useApp.getState().composedCanvas;
      if (!composedCanvas) {
        if (DEBUG_TOOLS) console.warn('🎨 Picker tool: No composedCanvas available');
        return;
      }
      
      const ctx = composedCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        if (DEBUG_TOOLS) console.warn('🎨 Picker tool: Could not get canvas context');
        return;
      }
      
      // CRITICAL FIX: Ensure coordinates are within canvas bounds
      const x = Math.max(0, Math.min(composedCanvas.width - 1, Math.floor(uv.x * composedCanvas.width)));
      const y = Math.max(0, Math.min(composedCanvas.height - 1, Math.floor(uv.y * composedCanvas.height)));
      
      debugLog('🎨 Picker tool: Sampling color at pixel:', { x, y, canvasWidth: composedCanvas.width, canvasHeight: composedCanvas.height });
      
      try {
        // ADVANCED: Support area sampling mode (average color from region)
        const samplingMode = (useApp.getState() as any).pickerSamplingMode || 'single'; // 'single' or 'area'
        const samplingRadius = (useApp.getState() as any).pickerSamplingRadius || 3; // Pixels to sample around
        
        let sampledColor: string;
        
        if (samplingMode === 'area') {
          // Sample average color from area
          const avgColor = sampleAreaColor(ctx, x, y, samplingRadius);
          if (avgColor) {
            sampledColor = rgbToHex(avgColor.r, avgColor.g, avgColor.b);
          } else {
            // Fallback to single pixel
            const data = ctx.getImageData(x, y, 1, 1).data;
            sampledColor = `#${[data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`;
          }
        } else {
          // Single pixel sampling (original behavior)
          const data = ctx.getImageData(x, y, 1, 1).data;
          sampledColor = `#${[data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`;
        }
        
        debugLog('🎨 Picker tool: Sampled color:', sampledColor, 'Mode:', samplingMode);
        
        // ADVANCED: Add to color history
        getColorHistory().addColor(sampledColor);
        
        // PERFORMANCE: Batch state updates
        useApp.setState({ 
          brushColor: sampledColor, 
          activeTool: 'brush' // Switch to brush tool after picking
        });
        
        debugLog('🎨 Picker tool: Color picked and brush color updated, switched to brush tool');
      } catch (error) {
        console.error('🎨 Picker tool: Error sampling color:', error);
      }
      
      return;
    }
    
    // CRITICAL FIX: Handle vector tool BEFORE layer check (vector tool doesn't need a layer)
    if (currentActiveTool === 'vector') {
      console.log('🎯 Vector tool: paintAtEvent called at UV:', { u: uv.x, v: uv.y });
      // UNIFIED VECTOR TOOL - Works with all element types (text, image, shapes, vector paths)
      // CRITICAL FIX: Get fresh state each time to avoid stale state issues
      const vectorState = useApp.getState();
      let { vectorEditMode, selectedAnchor, vectorPaths, activeTextId, activeShapeId, selectedImageId } = vectorState;
      
      // CRITICAL FIX: Ensure composedCanvas is available or initialize it
      let composedCanvas = useApp.getState().composedCanvas;
      if (!composedCanvas) {
        console.warn('🎯 Vector tool: No composed canvas - initializing...');
        // Trigger layer composition to create composedCanvas
        useApp.getState().composeLayers();
        composedCanvas = useApp.getState().composedCanvas;
        
        if (!composedCanvas) {
          console.error('🎯 Vector tool: Failed to initialize composedCanvas. Vector tool requires composed canvas to function.');
          // Show user-visible error instead of silently failing
          // TODO: Add toast/notification UI here
          return;
        }
      }
      const canvas = composedCanvas;
      
      // SIMPLIFIED MODE SYSTEM: Only 3 core modes (pen, select, curve)
      // Other operations (add/remove anchor, convert) are handled via shortcuts or context
      // But we still support them as temporary modes
      type VectorMode = 'pen' | 'select' | 'curve' | 'addAnchor' | 'removeAnchor' | 'convertAnchor' | 'move';
      const validModes: VectorMode[] = ['pen', 'select', 'curve', 'addAnchor', 'removeAnchor', 'convertAnchor', 'move'];
      
      if (!vectorEditMode || !validModes.includes(vectorEditMode as VectorMode)) {
        vectorEditMode = 'pen';
        useApp.setState({ vectorEditMode: 'pen' });
        console.log('🎯 Vector: Auto-set to pen mode for immediate drawing');
      }
      
      // Map legacy 'move' mode to 'select' mode
      if (vectorEditMode === 'move') {
        vectorEditMode = 'select'; // Move is now part of select mode
        useApp.setState({ vectorEditMode: 'select' });
      }
      
      console.log('🎯 Vector: Mode:', vectorEditMode, 'at UV:', { u: uv.x, v: uv.y }, 'VectorPaths:', vectorPaths.length, 'Canvas:', canvas.width, 'x', canvas.height);

      // STEP 1: Check if clicking on existing elements (text, image, shape) first
      const v2State = useAdvancedLayerStoreV2.getState();
      const clickU = uv.x;
      const clickV = 1 - uv.y; // Flip V for texture space
      
      // Check text elements
      const allTextElements = v2State.getAllTextElements();
      let clickedTextElement = null;
      for (const textEl of allTextElements) {
        const textU = textEl.u;
        const textV = textEl.v;
        const textWidth = (textEl.fontSize || 20) * (textEl.text?.length || 0) * 0.6 / canvas.width;
        const textHeight = (textEl.fontSize || 20) / canvas.height;
        
        if (clickU >= textU - textWidth/2 && clickU <= textU + textWidth/2 &&
            clickV >= textV - textHeight/2 && clickV <= textV + textHeight/2) {
          clickedTextElement = textEl;
          break;
        }
      }
      
      // Check image elements
      const allImageElements = v2State.getAllImageElements();
      let clickedImageElement = null;
      for (const imgEl of allImageElements) {
        const imgU = imgEl.u;
        const imgV = imgEl.v;
        const imgWidth = (imgEl.width || 256) / canvas.width;
        const imgHeight = (imgEl.height || 256) / canvas.height;
        
        if (clickU >= imgU - imgWidth/2 && clickU <= imgU + imgWidth/2 &&
            clickV >= imgV - imgHeight/2 && clickV <= imgV + imgHeight/2) {
          clickedImageElement = imgEl;
          break;
        }
      }
      
      // Check shape elements
      const appState = useApp.getState();
      let clickedShapeElement = null;
      for (const shapeEl of appState.shapeElements || []) {
        // Shape bounds calculation (simplified - adjust based on actual shape implementation)
        const shapeU = shapeEl.u || 0.5;
        const shapeV = shapeEl.v || 0.5;
        const shapeSize = (shapeEl.size || 50) / canvas.width;
        
        if (clickU >= shapeU - shapeSize/2 && clickU <= shapeU + shapeSize/2 &&
            clickV >= shapeV - shapeSize/2 && clickV <= shapeV + shapeSize/2) {
          clickedShapeElement = shapeEl;
          break;
        }
      }

      // STEP 2: Handle element selection/editing
      if (clickedTextElement || clickedImageElement || clickedShapeElement) {
        if (vectorEditMode === 'select') {
          // Select mode - select the element
          if (clickedTextElement) {
            useApp.setState({ activeTextId: clickedTextElement.id, activeShapeId: null, selectedImageId: null });
            debugLog('🎯 Vector: Selected text element:', clickedTextElement.id);
          } else if (clickedImageElement) {
            useApp.setState({ selectedImageId: clickedImageElement.id, activeTextId: null, activeShapeId: null });
            debugLog('🎯 Vector: Selected image element:', clickedImageElement.id);
          } else if (clickedShapeElement) {
            useApp.setState({ activeShapeId: clickedShapeElement.id, activeTextId: null, selectedImageId: null });
            debugLog('🎯 Vector: Selected shape element:', clickedShapeElement.id);
          }
          return; // Don't create vector path when selecting elements
        } else if (vectorEditMode === 'pen') {
          // Pen mode - convert element to vector path or start editing
          debugLog('🎯 Vector: Clicked on element in pen mode - can convert to vector path');
          // For now, just select the element. Conversion to vector path can be added later.
          if (clickedTextElement) {
            useApp.setState({ activeTextId: clickedTextElement.id });
          } else if (clickedImageElement) {
            useApp.setState({ selectedImageId: clickedImageElement.id });
          } else if (clickedShapeElement) {
            useApp.setState({ activeShapeId: clickedShapeElement.id });
          }
          return;
        }
      }

      // STEP 3: Handle vector path editing (existing logic)
      if (vectorEditMode === 'pen') {
        // Smart pen mode - check if clicking near existing anchor first
        // IMPROVED: Use standardized UV-based anchor detection
        const clickUV = { u: uv.x, v: uv.y };
        const nearestAnchor = findNearestAnchor(vectorPaths || [], clickUV, VECTOR_ANCHOR_DETECTION_THRESHOLD);

        debugLog('🎯 Vector: Checking for nearby anchors at UV:', clickUV);

        if (nearestAnchor) {
          // Clicked near existing anchor - select it and start dragging
          debugLog('🎯 Vector: Selecting anchor:', nearestAnchor);
          
          // Clear any previous selection and select only this anchor
          useApp.setState({ 
            selectedAnchor: { 
              pathId: nearestAnchor.pathId, 
              anchorIndex: nearestAnchor.anchorIndex 
            },
            activePathId: nearestAnchor.pathId, // Also set active path
            activeTextId: null,
            activeShapeId: null,
            selectedImageId: null
          });
          
          isDraggingAnchorRef.current = true;
          dragStartPosRef.current = { x: uv.x, y: uv.y }; // Store UV coordinates
          return; // Don't create new anchor, just select existing one
        } else {
          // No nearby anchor - clear any existing selection and create new anchor
          const freshState = useApp.getState();
          const activePathId = freshState.activePathId;
          
          debugLog('🎯 Vector: activePathId:', activePathId, 'total paths:', (freshState.vectorPaths || []).length);
          
          // Clear any existing selection first
          useApp.setState({ 
            selectedAnchor: null,
            activeTextId: null,
            activeShapeId: null,
            selectedImageId: null
          });
          
          // Create VectorAnchor with proper UV coordinates and bezier handles
          const anchor = {
            u: uv.x,  // UV coordinate (0-1 range)
            v: uv.y,  // UV coordinate (0-1 range)
            inHandle: null,   // Bezier control handle (in)
            outHandle: null,  // Bezier control handle (out)
            curveControl: false
          };

          // CRITICAL FIX: Use fresh vectorPaths from current state
          const currentVectorPaths = freshState.vectorPaths || [];
          const activePath = currentVectorPaths.find(p => p.id === activePathId);

          if (!activePath) {
            // Start new vector path with proper settings
            const appState = useApp.getState();
            const gradientSettings = (window as any).getGradientSettings?.();
            const brushGradientData = gradientSettings?.brush;
            const shouldUseGradient = brushGradientData && brushGradientData.mode === 'gradient';
            
            const newPath = {
              id: `vpath-${Date.now()}`,
              points: [anchor],
              closed: false
            };
            
            useApp.setState({ 
              vectorPaths: [...currentVectorPaths, newPath],
              activePathId: newPath.id,
              selectedAnchor: { 
                pathId: newPath.id, 
                anchorIndex: 0 
              }
            });
            console.log('🎯 Vector: Started new path at UV:', { u: uv.x, v: uv.y }, 'Path ID:', newPath.id);
            // Note: useEffect will handle rendering and texture update when vectorPaths changes
          } else {
            // Add anchor to existing path
            const updatedPaths = currentVectorPaths.map(p => 
              p.id === activePathId 
                ? { ...p, points: [...p.points, anchor] }
                : p
            );
            
            const newAnchorIndex = activePath.points.length;
            useApp.setState({ 
              vectorPaths: updatedPaths,
              selectedAnchor: { 
                pathId: activePathId!, 
                anchorIndex: newAnchorIndex 
              }
            });
            console.log('🎯 Vector: Added anchor, total:', newAnchorIndex + 1, 'Path ID:', activePathId);
            // Note: useEffect will handle rendering and texture update when vectorPaths changes
          }
        }

      } else if (vectorEditMode === 'select') {
        // Select mode - find and select nearest anchor or path
        // IMPROVED: Use standardized UV-based anchor detection
        const clickUV = { u: uv.x, v: uv.y };
        const nearestAnchor = findNearestAnchor(vectorPaths || [], clickUV, VECTOR_ANCHOR_DETECTION_THRESHOLD);

        if (nearestAnchor) {
          useApp.setState({ 
            selectedAnchor: { 
              pathId: nearestAnchor.pathId, 
              anchorIndex: nearestAnchor.anchorIndex 
            },
            activePathId: nearestAnchor.pathId, // Also set active path
            activeTextId: null,
            activeShapeId: null,
            selectedImageId: null
          });
          
          // Start dragging immediately in select mode
          isDraggingAnchorRef.current = true;
          dragStartPosRef.current = { x: uv.x, y: uv.y }; // Store UV coordinates
          debugLog('🎯 Vector: Selected anchor for moving:', nearestAnchor);
        } else {
          // No anchor clicked - deselect everything
          useApp.setState({ 
            selectedAnchor: null,
            activeTextId: null,
            activeShapeId: null,
            selectedImageId: null
          });
          debugLog('🎯 Vector: No anchor selected');
        }

      } else if (vectorEditMode === 'addAnchor') {
        // Add anchor mode - add anchor at clicked position (temporary mode, switches back to select after use)
        const nearestPath = (vectorPaths || []).reduce((closest, path) => {
          if (path.points.length < 2) return closest;
          
          let minDist = Infinity;
          for (let i = 0; i < path.points.length; i++) {
            const p1 = path.points[i];
            const p2 = path.points[(i + 1) % path.points.length];
            
            // Distance from point to line segment
            const dx = p2.u - p1.u;
            const dy = p2.v - p1.v;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) continue;
            
            const t = Math.max(0, Math.min(1, ((uv.x - p1.u) * dx + (uv.y - p1.v) * dy) / (length * length)));
            const projU = p1.u + t * dx;
            const projV = p1.v + t * dy;
            const dist = Math.sqrt((uv.x - projU) ** 2 + (uv.y - projV) ** 2);
            
            if (dist < minDist) {
              minDist = dist;
              return { path, dist };
            }
          }
          return closest;
        }, null as { path: typeof vectorPaths[0], dist: number } | null);
        
        if (nearestPath && nearestPath.dist < VECTOR_ANCHOR_DETECTION_THRESHOLD) {
          useApp.getState().addAnchorAtPoint(nearestPath.path.id, uv.x, uv.y);
          // Switch back to select mode after adding anchor
          useApp.setState({ vectorEditMode: 'select' });
          debugLog('🎯 Vector: Added anchor to path');
        }
        
      } else if (vectorEditMode === 'removeAnchor') {
        // Remove anchor mode - remove nearest anchor (temporary mode, now also handled via Delete key shortcut)
        // IMPROVED: Use standardized UV-based anchor detection
        const clickUV = { u: uv.x, v: uv.y };
        const nearestAnchor = findNearestAnchor(vectorPaths || [], clickUV, VECTOR_ANCHOR_DETECTION_THRESHOLD);
        
        if (nearestAnchor) {
          const targetPath = (vectorPaths || []).find(p => p.id === nearestAnchor.pathId);
          if (targetPath && targetPath.points.length > 2) {
            useApp.getState().removeAnchor(nearestAnchor.pathId, nearestAnchor.anchorIndex);
            // Switch back to select mode after removing anchor
            useApp.setState({ vectorEditMode: 'select' });
            debugLog('🎯 Vector: Removed anchor');
          }
        }
        
      } else if (vectorEditMode === 'convertAnchor' && selectedAnchor) {
        // Convert anchor mode - cycle through anchor types (temporary mode)
        // Type guard: ensure selectedAnchor is not null
        if (!selectedAnchor) return;
        const { pathId, anchorIndex } = selectedAnchor;
        const path = (vectorPaths || []).find(p => p.id === pathId);
        const anchor = path?.points[anchorIndex];
        
        if (anchor) {
          // Determine current type and convert
          let newType: 'corner' | 'smooth' | 'symmetric' = 'corner';
          if (!anchor.inHandle && !anchor.outHandle) {
            newType = 'smooth'; // Corner -> Smooth
          } else if (anchor.inHandle && anchor.outHandle && 
                     Math.abs(anchor.inHandle.u - (2 * anchor.u - anchor.outHandle.u)) < 0.001) {
            newType = 'symmetric'; // Smooth -> Symmetric
          } else {
            newType = 'corner'; // Symmetric -> Corner
          }
          
          useApp.getState().convertAnchorType(pathId, anchorIndex, newType);
          // Switch back to select mode after converting anchor
          useApp.setState({ vectorEditMode: 'select' });
          debugLog('🎯 Vector: Converted anchor to', newType);
        }
        
      } else if (vectorEditMode === 'curve') {
        // Curve mode - edit bezier handles of selected anchor
        // CRITICAL FIX: Support dragging handles, not just clicking
        
        // First, try to select anchor if none selected
        if (!selectedAnchor) {
          const clickUV = { u: uv.x, v: uv.y };
          const nearestAnchor = findNearestAnchor(vectorPaths || [], clickUV, VECTOR_ANCHOR_DETECTION_THRESHOLD);
          if (nearestAnchor) {
            useApp.setState({ 
              selectedAnchor: { 
                pathId: nearestAnchor.pathId, 
                anchorIndex: nearestAnchor.anchorIndex 
              },
              activePathId: nearestAnchor.pathId
            });
            debugLog('🎯 Vector: Selected anchor in curve mode');
            return; // Exit to allow user to click again to edit handle
          } else {
            debugLog('🎯 Vector: No anchor selected and none found nearby');
            return; // Can't edit handles without anchor
          }
        }
        
        // Anchor is selected - check if clicking on handle or creating new one
        const clickUV = { u: uv.x, v: uv.y };
        const path = (vectorPaths || []).find(p => p.id === selectedAnchor.pathId);
        const anchor = path?.points[selectedAnchor.anchorIndex];
        
        if (!anchor) {
          debugLog('🎯 Vector: Selected anchor not found in path');
          return;
        }
        
        // Check if clicking near out handle
        if (anchor.outHandle) {
          const handleUV = { u: anchor.outHandle.u, v: anchor.outHandle.v };
          const dist = distanceInUV(clickUV, handleUV);
          if (dist < VECTOR_ANCHOR_DETECTION_THRESHOLD) {
            // CRITICAL FIX: Set drag state for handle dragging
            isDraggingHandleRef.current = true;
            draggingHandleInfoRef.current = {
              pathId: selectedAnchor.pathId,
              anchorIndex: selectedAnchor.anchorIndex,
              handleType: 'out'
            };
            dragStartPosRef.current = { x: uv.x, y: uv.y };
            debugLog('🎯 Vector: Started dragging out handle');
            return;
          }
        }
        
        // Check if clicking near in handle
        if (anchor.inHandle) {
          const handleUV = { u: anchor.inHandle.u, v: anchor.inHandle.v };
          const dist = distanceInUV(clickUV, handleUV);
          if (dist < VECTOR_ANCHOR_DETECTION_THRESHOLD) {
            // CRITICAL FIX: Set drag state for handle dragging
            isDraggingHandleRef.current = true;
            draggingHandleInfoRef.current = {
              pathId: selectedAnchor.pathId,
              anchorIndex: selectedAnchor.anchorIndex,
              handleType: 'in'
            };
            dragStartPosRef.current = { x: uv.x, y: uv.y };
            debugLog('🎯 Vector: Started dragging in handle');
            return;
          }
        }
        
        // Not clicking on handle - create new handle at click position
        // Default to out handle if neither exists, otherwise create opposite
        const handleType = !anchor.outHandle ? 'out' : (!anchor.inHandle ? 'in' : 'out');
        useApp.getState().addCurveHandle(selectedAnchor.pathId, selectedAnchor.anchorIndex, handleType, uv.x, uv.y);
        
        // CRITICAL FIX: Set drag state immediately after creating handle so user can drag it
        isDraggingHandleRef.current = true;
        draggingHandleInfoRef.current = {
          pathId: selectedAnchor.pathId,
          anchorIndex: selectedAnchor.anchorIndex,
          handleType: handleType
        };
        dragStartPosRef.current = { x: uv.x, y: uv.y };
        debugLog(`🎯 Vector: Created and started dragging ${handleType} handle`);
      }

      // CRITICAL FIX: Vector tool updates state - useEffect will handle rendering
      // The useEffect will trigger immediately when vectorPaths state changes
      console.log('🎯 Vector tool: State updated, useEffect will render immediately');
      
      // No need to call composeLayers or updateModelTexture here - useEffect handles it
      // State update will trigger the useEffect which renders immediately (no debounce)
      return; // Exit early - vector tool doesn't need canvas operations below
    }
    
    const point = e.point as THREE.Vector3 | undefined; // World coordinates
    
    // DEBUG: Add detailed logging to understand the issue
    if (!uv) {
      console.log('🎨 ShirtRefactored: paintAtEvent - missing UV coordinates');
      return;
    }
    
    if (!point) {
      console.log('🎨 ShirtRefactored: paintAtEvent - missing world coordinates');
      return;
    }
    
    // SINGLE TEXTURE LAYER: All tools work on the same texture layer
    let layer;
    
    // CRITICAL FIX: Always read fresh value from ref
    const currentStrokeSession = strokeSessionRef.current;
    
    // SINGLE TEXTURE LAYER: Use existing active layer (Texture Layer) instead of creating per stroke
    if (!currentStrokeSession || !currentStrokeSession.layerId) {
      try {
        // Use AdvancedLayerSystemV2 directly
        const { layers, activeLayerId, setActiveLayer } = useAdvancedLayerStoreV2.getState();
        
        // SINGLE TEXTURE LAYER: Find or use existing "Texture Layer"
        const textureLayerName = 'Texture Layer';
        let textureLayer = layers.find(l => l.name === textureLayerName);
        
        if (!textureLayer) {
          // Create texture layer once if it doesn't exist
          console.log('🎨 Creating single Texture Layer for all tools');
          const { createLayer } = useAdvancedLayerStoreV2.getState();
          const currentBlendMode = useApp.getState().blendMode;
          const layerBlendMode = (currentBlendMode === 'source-over' ? 'normal' : currentBlendMode) as BlendMode;
          const layerId = createLayer('paint', textureLayerName, layerBlendMode);
          setActiveLayer(layerId);
          
          // Re-read to get the newly created layer
          const { layers: updatedLayers } = useAdvancedLayerStoreV2.getState();
          textureLayer = updatedLayers.find(l => l.id === layerId) || undefined;
        } else {
          // Use existing texture layer
          if (activeLayerId !== textureLayer.id) {
            setActiveLayer(textureLayer.id);
          }
        }
        
        const newLayer = textureLayer;
        
        if (newLayer) {
          // SINGLE TEXTURE LAYER: Capture current brush settings for this stroke session
          const brushColor = useApp.getState().brushColor;
          const brushSize = useApp.getState().brushSize;
          const brushOpacity = useApp.getState().brushOpacity;
          const gradientSettings = (window as any).getGradientSettings?.();
          const brushGradientData = gradientSettings?.brush;
          
          // SINGLE TEXTURE LAYER: Initialize stroke session using texture layer
          const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          strokeSessionRef.current = {
            id: strokeId,
            layerId: newLayer.id,
            points: [],
            bounds: null,
            settings: {
              size: brushSize,
              color: brushColor,
              opacity: brushOpacity,
              gradient: brushGradientData?.mode === 'gradient' ? {
                type: brushGradientData.type,
                angle: brushGradientData.angle,
                stops: brushGradientData.stops
              } : undefined
            },
            tool: currentActiveTool
          };
          
          layer = {
            id: newLayer.id,
            name: newLayer.name,
            canvas: newLayer.content.canvas || document.createElement('canvas')
          };
          
          console.log('🎨 SINGLE TEXTURE LAYER: Using Texture Layer for stroke:', strokeId);
        }
      } catch (error) {
        console.warn('🎨 Advanced layer system V2 failed, fallback:', error);
        const getOrCreateActiveLayer = useApp.getState().getOrCreateActiveLayer;
        layer = getOrCreateActiveLayer ? getOrCreateActiveLayer(activeTool) : null;
      }
    } else {
      // PHASE 1: Continue using the current stroke's layer (reuse existing layer)
      try {
        const { layers } = useAdvancedLayerStoreV2.getState();
        const strokeLayer = layers.find(l => l.id === currentStrokeSession.layerId);
        
        if (strokeLayer) {
          layer = {
            id: strokeLayer.id,
            name: strokeLayer.name,
            canvas: strokeLayer.content.canvas || document.createElement('canvas')
          };
        }
      } catch (error) {
        console.warn('🎨 Advanced layer system V2 failed, using fallback:', error);
        const getOrCreateActiveLayer = useApp.getState().getOrCreateActiveLayer;
        layer = getOrCreateActiveLayer ? getOrCreateActiveLayer(activeTool) : null;
      }
    }
    
    if (!layer) {
      return;
    }
    

    // Vector tool is now handled earlier in the function (around line 3108)
    // Layer is already retrieved above (line 1573-1668), so we can use it directly
    // The layer check is already done at line 1670-1672
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get symmetry settings
    const symmetryX = useApp.getState().symmetryX;
    const symmetryY = useApp.getState().symmetryY;
    const symmetryZ = useApp.getState().symmetryZ;
    
    
    // Debug: Check if any symmetry is enabled
    if (symmetryX || symmetryY || symmetryZ) {
      console.log('🔄 Symmetry settings detected:', { symmetryX, symmetryY, symmetryZ });
    } else {
      console.log('🔄 No symmetry enabled');
    }
    
    // SIMPLE: Helper function to draw at multiple positions based on symmetry
    const drawWithSymmetry = (drawFn: (x: number, y: number) => void) => {
      // SIMPLE: Use the layer canvas dimensions directly
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // SIMPLE: Convert UV to canvas coordinates
      const x = Math.floor(uv.x * canvasWidth);
      const y = Math.floor(uv.y * canvasHeight);
      
      // SIMPLE: Draw at original position
      drawFn(x, y);
      
      // SIMPLE: Apply symmetry if enabled
      if (symmetryX) {
        const mirrorX = canvasWidth - 1 - x;
        drawFn(mirrorX, y);
      }
      
      if (symmetryY) {
        const mirrorY = canvasHeight - 1 - y;
        drawFn(x, mirrorY);
      }
      
      if (symmetryZ) {
        const mirrorX = canvasWidth - 1 - x;
        const mirrorY = canvasHeight - 1 - y;
        drawFn(mirrorX, mirrorY);
      }
    };

    // Convert UV coordinates to canvas coordinates
    const x = Math.floor(uv.x * canvas.width);
    const y = Math.floor(uv.y * canvas.height);

    // DEBUG: Log UV to canvas conversion for brush tool
    if (activeTool === 'brush') {
      console.log('🖌️ UV TO CANVAS CONVERSION:', { 
        originalUV: { x: uv.x, y: uv.y },
        canvasCoords: { x, y },
        canvasSize: { width: canvas.width, height: canvas.height }
      });
    }
    // CRITICAL FIX: Read all settings directly from app state to ensure they're up-to-date
    // This ensures the right sidebar settings are always used
    const appState = useApp.getState();
    const currentBrushColor = appState.brushColor;
    const currentBrushSize = appState.brushSize;
    const currentBrushOpacity = appState.brushOpacity;
    const currentBrushHardness = appState.brushHardness;
    const currentBrushFlow = appState.brushFlow;
    const currentBrushShape = appState.brushShape;
    const currentBrushSpacing = appState.brushSpacing;
    const currentBlendMode = appState.blendMode;
    
    // PERFORMANCE FIX: Reduced debug logging
    if (Date.now() % 3000 < 100) { // Only log every 3 seconds
      console.log('🎨 Brush settings:', { 
        color: currentBrushColor, 
        size: currentBrushSize, 
        opacity: currentBrushOpacity, 
        hardness: currentBrushHardness,
        flow: currentBrushFlow,
        shape: currentBrushShape,
        spacing: currentBrushSpacing,
        blendMode: currentBlendMode,
        activeTool: currentActiveTool 
      });
    }

      // PERFORMANCE: Optimized canvas operations
      ctx.save();
      
      // PERFORMANCE: Pre-configure context for optimal drawing
      ctx.imageSmoothingEnabled = false; // Faster for pixel art
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    if (currentActiveTool === 'brush') {
      // SIMPLE FIX: Direct mouse-to-brush mapping
      const brushEngine = (window as any).__brushEngine;
      if (!brushEngine) {
        console.warn('🖌️ Brush engine not available');
        return;
      }

      // Get current settings - read directly from app state for real-time updates
      const actualBrushColor = currentBrushColor;
      
      // SIMPLE: Use the layer canvas dimensions directly
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // SIMPLE: Convert UV to canvas coordinates ONCE
      const canvasX = Math.floor(uv.x * canvasWidth);
      const canvasY = Math.floor(uv.y * canvasHeight);
      
      // ADVANCED: Create enhanced brush point with pressure, velocity, tilt, and stabilization
      // Get stabilization settings (defaults if not set)
      const stabilization = (appState as any).brushStabilization || 0;
      const stabilizationRadius = 10;
      const stabilizationWindow = 5;
      
      const brushPoint = createEnhancedBrushPoint(
        e,
        canvasX,
        canvasY,
        velocityTrackerRef.current,
        lastBrushPointRef.current || undefined,
        stabilization,
        stabilizationRadius,
        stabilizationWindow
      );
      
      // Update last brush point for next iteration
      lastBrushPointRef.current = brushPoint;
      
      // Use stabilized coordinates
      const finalX = brushPoint.x;
      const finalY = brushPoint.y;
      
      // Get gradient settings if in gradient mode
      const gradientSettings = (window as any).getGradientSettings?.();
      const brushGradientData = gradientSettings?.brush;
      
      // Only log if actually using gradient (debug mode)
      if (brushGradientData?.mode === 'gradient') {
        debugLog('🎨 Using gradient mode for brush stroke');
      }
      
      // SIMPLE: Create brush settings - use values from app state
      const brushSettings = {
        size: currentBrushSize,
        opacity: currentBrushOpacity,
        hardness: currentBrushHardness,
        flow: currentBrushFlow,
        spacing: currentBrushSpacing,
        angle: 0,
        roundness: 1,
        color: actualBrushColor,
        gradient: brushGradientData?.mode === 'gradient' ? {
          type: brushGradientData.type,
          angle: brushGradientData.angle,
          stops: brushGradientData.stops
        } : undefined,
        blendMode: currentBlendMode,
        shape: currentBrushShape,
        dynamics: {
          sizePressure: true,
          opacityPressure: true,
          anglePressure: false,
          spacingPressure: false,
          velocitySize: true, // Enable velocity-based size for natural strokes
          velocityOpacity: true // Enable velocity-based opacity for natural strokes
        },
        // ADVANCED: Add pressure curve for natural pressure response
        pressureCurve: 'sigmoid' as const, // Smooth S-curve for natural feel
        pressureMapSize: 1.0, // Map pressure to brush size (0.5-2.0)
        pressureMapOpacity: 1.0, // Map pressure to opacity (0.5-2.0)
        simulatePressureFromVelocity: true, // Simulate pressure from mouse velocity
        // ADVANCED: Stroke stabilization for smooth lines
        stabilization: (appState as any).brushStabilization || 0, // 0-1: How much stabilization
        stabilizationRadius: 10, // Maximum deviation in pixels
        stabilizationWindow: 5, // Number of points to average
        texture: { 
          enabled: false, 
          pattern: null, 
          scale: 1, 
          rotation: 0, 
          opacity: 1, 
          blendMode: 'multiply' 
        }
      };

      // CRITICAL FIX: Render directly to layer.canvas instead of brushStrokes array
      // Get layer canvas context and render the brush point immediately
      const layerCtx = layer.canvas.getContext('2d');
      if (layerCtx && brushEngine && brushEngine.createBrushStamp) {
        const brushStamp = brushEngine.createBrushStamp(brushSettings);
        layerCtx.save();
        
        // CRITICAL FIX: Always use source-over when drawing to individual layer canvas
        // Blend mode is applied ONLY during layer composition (composeLayers)
        // This prevents double blending and incorrect behavior
        layerCtx.globalCompositeOperation = 'source-over';
        
        // CRITICAL FIX: Apply flow to opacity
        // Flow controls how much paint is applied per stamp (builds up paint gradually)
        // Multiply opacity by flow to control paint buildup
        layerCtx.globalAlpha = brushSettings.opacity * brushSettings.flow;
        
        // SMOOTH BRUSH: Interpolate between last and current position to prevent gaps
        // CRITICAL FIX: Only interpolate if distance is reasonable (same stroke)
        // If distance is too large, it's a new stroke - don't connect them
        const lastPos = lastPaintPositionRef.current;
        if (lastPos) {
          const dx = finalX - lastPos.x;
          const dy = finalY - lastPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // CRITICAL FIX: Maximum distance threshold - if exceeded, it's a new stroke
          // Use 3x brush size as threshold (if user moves more than 3 brush widths, it's a new stroke)
          const maxStrokeDistance = brushSettings.size * 3;
          
          if (distance > maxStrokeDistance) {
            // New stroke detected - don't interpolate, just draw at current position
            // Reset last position to current to prevent future connections
            lastPaintPositionRef.current = { x: finalX, y: finalY };
            layerCtx.drawImage(
              brushStamp,
              finalX - brushSettings.size / 2,
              finalY - brushSettings.size / 2
            );
          } else {
            // Same stroke - interpolate to fill gaps
            const minSpacing = brushSettings.size * brushSettings.spacing;
            
            if (distance > minSpacing) {
              // Draw intermediate stamps to fill gaps
              const steps = Math.ceil(distance / minSpacing);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPos.x + t * dx;
                const interpY = lastPos.y + t * dy;
                
                layerCtx.drawImage(
                  brushStamp,
                  interpX - brushSettings.size / 2,
                  interpY - brushSettings.size / 2
                );
              }
            } else {
              // Draw single stamp if points are close enough
              layerCtx.drawImage(
                brushStamp,
                finalX - brushSettings.size / 2,
                finalY - brushSettings.size / 2
              );
            }
          }
        } else {
          // First point - just draw the stamp
          layerCtx.drawImage(
            brushStamp,
            finalX - brushSettings.size / 2,
            finalY - brushSettings.size / 2
          );
        }
        
        layerCtx.restore();
        
        // Update last paint position for next interpolation (use stabilized coordinates)
        lastPaintPositionRef.current = { x: finalX, y: finalY };
        
        // PHASE 1: Track this point in the stroke session
        if (strokeSessionRef.current) {
          strokeSessionRef.current.points.push({ x: finalX, y: finalY });
          strokeSessionRef.current.settings = brushSettings;
          
          // Update bounds as we draw (use stabilized coordinates)
          const brushRadius = brushSettings.size / 2;
          if (!strokeSessionRef.current.bounds) {
            strokeSessionRef.current.bounds = {
              minX: finalX - brushRadius,
              minY: finalY - brushRadius,
              maxX: finalX + brushRadius,
              maxY: finalY + brushRadius
            };
          } else {
            strokeSessionRef.current.bounds.minX = Math.min(strokeSessionRef.current.bounds.minX, finalX - brushRadius);
            strokeSessionRef.current.bounds.minY = Math.min(strokeSessionRef.current.bounds.minY, finalY - brushRadius);
            strokeSessionRef.current.bounds.maxX = Math.max(strokeSessionRef.current.bounds.maxX, finalX + brushRadius);
            strokeSessionRef.current.bounds.maxY = Math.max(strokeSessionRef.current.bounds.maxY, finalY + brushRadius);
          }
        }
        
        // SIMPLE BRUSH - Rendered directly to layer.canvas
      } else if (layerCtx) {
        // Fallback to simple circle rendering
        layerCtx.save();
        layerCtx.fillStyle = actualBrushColor;
        layerCtx.globalAlpha = brushOpacity;
        layerCtx.beginPath();
        layerCtx.arc(finalX, finalY, currentBrushSize / 2, 0, Math.PI * 2);
        layerCtx.fill();
        layerCtx.restore();
        
        // PHASE 1: Track this point (use stabilized coordinates)
        if (strokeSessionRef.current) {
          strokeSessionRef.current.points.push({ x: finalX, y: finalY });
          strokeSessionRef.current.settings = brushSettings;
        }
        
        // SIMPLE BRUSH - Rendered to layer.canvas (fallback)
      }
      
      // PERFORMANCE: Don't update texture/thumbnail on every paint event
      // This causes massive performance degradation during continuous drawing
      // These updates should only happen once at the end of the stroke (in onPointerUp)
    } else if (currentActiveTool === 'fill') {
      // Fill tool - flood fill algorithm
      console.log('🪣 Fill: Starting flood fill at position:', { x, y });
      
      // CRITICAL FIX: Read all fill settings directly from app state
      const fillColor = appState.brushColor; // Fill uses brush color
      const fillTolerance = appState.fillTolerance;
      const fillGrow = appState.fillGrow;
      const fillAntiAlias = appState.fillAntiAlias;
      const fillContiguous = appState.fillContiguous;
      
      debugLog('🪣 Fill settings:', { fillColor, fillTolerance, fillGrow, fillAntiAlias, fillContiguous });
      
      // Get the current pixel color at the click position
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelIndex = (y * canvas.width + x) * 4;
      const targetR = imageData.data[pixelIndex];
      const targetG = imageData.data[pixelIndex + 1];
      const targetB = imageData.data[pixelIndex + 2];
      const targetA = imageData.data[pixelIndex + 3];
      
      debugLog('🪣 Target pixel color:', { r: targetR, g: targetG, b: targetB, a: targetA });
      
      // Convert fill color to RGB
      const fillRgb = hexToRgb(fillColor);
      if (!fillRgb) {
        console.error('🪣 Invalid fill color:', fillColor);
        ctx.restore();
        return;
      }
      
      debugLog('🪣 Fill color RGB:', fillRgb);
      
      // PERFORMANCE OPTIMIZED: Chunked flood fill to prevent UI blocking
      const fillColorRgba = {
        r: fillRgb.r,
        g: fillRgb.g,
        b: fillRgb.b,
        a: Math.floor(brushOpacity * 255)
      };
      
      const visited = new Set<string>();
      const stack: Array<{x: number, y: number}> = [{x, y}];
      const PIXELS_PER_CHUNK = 1000; // Process 1000 pixels per frame
      let isProcessing = true;
      let totalPixelsFilled = 0;
      
      const processChunk = () => {
        if (!isProcessing) return;
        
        let processed = 0;
        while (stack.length > 0 && processed < PIXELS_PER_CHUNK) {
          const {x: currentX, y: currentY} = stack.pop()!;
          const key = `${currentX},${currentY}`;
          
          if (visited.has(key) || currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height) {
            continue;
          }
          
          visited.add(key);
          processed++;
          
          const currentPixelIndex = (currentY * canvas.width + currentX) * 4;
          const currentR = imageData.data[currentPixelIndex];
          const currentG = imageData.data[currentPixelIndex + 1];
          const currentB = imageData.data[currentPixelIndex + 2];
          const currentA = imageData.data[currentPixelIndex + 3];
          
          // Check if pixel matches target color within tolerance
          const colorDistance = Math.sqrt(
            Math.pow(currentR - targetR, 2) +
            Math.pow(currentG - targetG, 2) +
            Math.pow(currentB - targetB, 2) +
            Math.pow(currentA - targetA, 2)
          );
          
          if (colorDistance <= fillTolerance) {
            // Update pixel immediately for visual feedback
            imageData.data[currentPixelIndex] = fillColorRgba.r;
            imageData.data[currentPixelIndex + 1] = fillColorRgba.g;
            imageData.data[currentPixelIndex + 2] = fillColorRgba.b;
            imageData.data[currentPixelIndex + 3] = fillColorRgba.a;
            totalPixelsFilled++;
            
            // Add neighboring pixels to stack
            if (fillContiguous) {
              stack.push({x: currentX + 1, y: currentY});
              stack.push({x: currentX - 1, y: currentY});
              stack.push({x: currentX, y: currentY + 1});
              stack.push({x: currentX, y: currentY - 1});
            }
          }
        }
        
        // Update canvas periodically for visual feedback (every 5000 pixels)
        if (totalPixelsFilled > 0 && totalPixelsFilled % 5000 === 0) {
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Continue processing if stack is not empty
        if (stack.length > 0) {
          requestAnimationFrame(processChunk);
        } else {
          // Final update
          ctx.putImageData(imageData, 0, 0);
          isProcessing = false;
          debugLog('🪣 Fill completed with', totalPixelsFilled, 'pixels filled');
        }
      };
      
      // Start chunked processing
      processChunk();
      
    } else if (currentActiveTool === 'eraser') {
      // Eraser tool - erase from ALL texture layers and displacement layers
      console.log('🧽 Eraser: Erasing from all texture layers and displacement layers at position:', { x, y });
      
      // CRITICAL FIX: Get current brush size directly from app state
      const currentBrushSize = appState.brushSize;
      const halfSize = currentBrushSize / 2;
      // Note: appState is already declared at the top of paintAtEvent
      
      // Helper function to erase from any canvas
      const eraseFromCanvas = (canvas: HTMLCanvasElement | null, canvasName: string, isDisplacement = false, isNormal = false) => {
        if (!canvas) return;
        
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;
        
        canvasCtx.save();
        // FIXED: Use full opacity (1.0) for eraser to completely remove pixels, not just make them transparent
        canvasCtx.globalAlpha = 1.0;
        
        if (isDisplacement) {
          // CRITICAL FIX: For displacement maps, set to neutral gray (128) for no displacement
          // Three.js format: 128 = neutral (no displacement), 0 = max inward, 255 = max outward
          canvasCtx.globalCompositeOperation = 'source-over';
          canvasCtx.fillStyle = '#808080'; // Neutral gray (128) for no displacement
          console.log(`🧽 Setting ${canvasName} to neutral gray (128 = no displacement)`);
        } else if (isNormal) {
          // For normal maps, set to default normal (pointing up)
          canvasCtx.globalCompositeOperation = 'source-over';
          canvasCtx.fillStyle = '#8080FF'; // Default normal (128, 128, 255) pointing up
          console.log(`🧽 Setting ${canvasName} to default normal values`);
        } else {
          // For regular canvases, use destination-out to erase
          canvasCtx.globalCompositeOperation = 'destination-out';
          canvasCtx.fillStyle = '#000000';
          console.log(`🧽 Erasing from ${canvasName} canvas`);
        }
        
        canvasCtx.beginPath();
        switch (brushShape) {
          case 'round':
            canvasCtx.arc(x, y, halfSize, 0, Math.PI * 2);
          break;
          case 'square':
            canvasCtx.rect(x - halfSize, y - halfSize, currentBrushSize, currentBrushSize);
            break;
          default:
            canvasCtx.arc(x, y, halfSize, 0, Math.PI * 2);
        }
        
        canvasCtx.fill();
        canvasCtx.restore();
      };
      
      // FIXED: DON'T erase from composedCanvas - it contains the base model texture!
      // Only erase from individual layer canvases, then composeLayers() will regenerate composedCanvas
      // eraseFromCanvas(canvas, 'main composed'); // ❌ REMOVED - this was fading the model texture
      
      // 1. Erase from all individual layer canvases AND their texture layers (displacementCanvas)
      const { layers } = useAdvancedLayerStoreV2.getState();
      layers.forEach((layer: any) => {
        if (layer.visible) {
          // CRITICAL FIX: Support both old layer structure (layer.canvas) and V2 structure (layer.content.canvas)
          const layerCanvas = layer.content?.canvas || layer.canvas;
          if (layerCanvas) {
            eraseFromCanvas(layerCanvas, `layer: ${layer.name}`);
            debugLog(`🧽 Erasing from layer "${layer.name}" main canvas`);
          }
          
          // CRITICAL FIX: Also erase from layer's displacementCanvas if it exists (texture layer)
          // Support both old structure (layer.displacementCanvas) and V2 structure (layer.content.displacementCanvas)
          const layerDisplacementCanvas = layer.content?.displacementCanvas || layer.displacementCanvas;
          if (layerDisplacementCanvas) {
            eraseFromCanvas(layerDisplacementCanvas, `layer: ${layer.name} displacement`, true, false);
            debugLog(`🧽 Erasing from layer "${layer.name}" displacementCanvas (texture layer)`);
          }
        }
      });
      
      // 3. Erase from all texture layer canvases
      // REMOVED: puffCanvas - old puff tool removed
      // NEW PUFF TOOL: Puffs are drawn on the layer canvas, displacement on displacementCanvas
      const textureCanvases = [
        { canvas: (appState as any).displacementCanvas, name: 'displacement', isDisplacement: true, isNormal: false },
        { canvas: (appState as any).normalCanvas, name: 'normal', isDisplacement: false, isNormal: true },
        { canvas: (appState as any).embroideryCanvas, name: 'embroidery', isDisplacement: false, isNormal: false }
      ];
      
      textureCanvases.forEach(({ canvas, name, isDisplacement, isNormal }) => {
        eraseFromCanvas(canvas, name, isDisplacement, isNormal);
      });
      
      // 4. Erase text and shape elements that intersect with eraser area
      const composedCanvas = appState.composedCanvas;
      if (composedCanvas) {
        const uv = { u: x / composedCanvas.width, v: y / composedCanvas.height };
        
        // Erase text elements (partial erasing by modifying text content)
        const { textElements, updateTextElement } = appState;
        const eraserRadius = currentBrushSize / 2;
        const eraserX = x;
        const eraserY = y;
        
        textElements.forEach(textEl => {
          // Convert text UV coordinates to canvas coordinates
          const textX = Math.round(textEl.u * composedCanvas.width);
          const textY = Math.round((1 - textEl.v) * composedCanvas.height);
          
          // Calculate text bounds (approximate)
          const textWidth = textEl.text.length * textEl.fontSize * 0.6; // Approximate width
          const textHeight = textEl.fontSize;
          
          // Check if eraser intersects with text bounds
          const intersects = (
            eraserX + eraserRadius >= textX - textWidth/2 &&
            eraserX - eraserRadius <= textX + textWidth/2 &&
            eraserY + eraserRadius >= textY &&
            eraserY - eraserRadius <= textY + textHeight
          );
          
          if (intersects) {
            // Calculate which characters are within eraser radius
            const charWidth = textEl.fontSize * 0.6;
            const startX = textX - textWidth/2;
            
            let newText = '';
            for (let i = 0; i < textEl.text.length; i++) {
              const charX = startX + (i * charWidth) + charWidth/2;
              const charY = textY + textHeight/2;
              
              const distance = Math.sqrt((eraserX - charX) ** 2 + (eraserY - charY) ** 2);
              
              if (distance > eraserRadius) {
                newText += textEl.text[i];
              }
            }
            
            if (newText !== textEl.text) {
              console.log('🧽 Partially erasing text:', textEl.text, '->', newText);
              updateTextElement(textEl.id, { text: newText });
            }
          }
        });
        
        // Erase shape elements (partial erasing by reducing opacity)
        const { shapeElements, updateShapeElement } = appState;
        shapeElements.forEach(shapeEl => {
          // Convert shape position percentages to canvas coordinates
          const shapeX = Math.round((shapeEl.positionX / 100) * composedCanvas.width);
          const shapeY = Math.round((shapeEl.positionY / 100) * composedCanvas.height);
          
          // Calculate shape bounds
          const shapeRadius = shapeEl.size / 2;
          
          // Check if eraser intersects with shape bounds
          const distance = Math.sqrt((eraserX - shapeX) ** 2 + (eraserY - shapeY) ** 2);
          const intersects = distance <= (eraserRadius + shapeRadius);
          
          if (intersects) {
            // Calculate how much of the shape is within eraser radius
            const overlapRadius = Math.min(eraserRadius, shapeRadius);
            const overlapArea = Math.PI * overlapRadius * overlapRadius;
            const totalArea = Math.PI * shapeRadius * shapeRadius;
            const overlapPercentage = overlapArea / totalArea;
            
            // Reduce opacity based on overlap percentage
            // CRITICAL FIX: Use currentBrushOpacity from app state
            const opacityReduction = overlapPercentage * currentBrushOpacity;
            const newOpacity = Math.max(0, shapeEl.opacity - opacityReduction);
            
            if (newOpacity !== shapeEl.opacity) {
              console.log('🧽 Partially erasing shape:', shapeEl.type, 'opacity:', shapeEl.opacity, '->', newOpacity);
              updateShapeElement(shapeEl.id, { opacity: newOpacity });
            }
          }
        });
        
        // REMOVED: Puff erase event - old puff tool removed
        // NEW PUFF TOOL: Erasing is handled directly on the layer canvas
        
        // Dispatch embroidery erase event
        if (appState.embroideryCanvas) {
          const embroideryEraseEvent = new CustomEvent('embroideryErase', {
            detail: { uv, pressure: 1.0 }
          });
          document.dispatchEvent(embroideryEraseEvent);
          console.log('🧽 Dispatched embroidery erase event');
        }
        
        // Dispatch general texture erase event for any other tools
        const textureEraseEvent = new CustomEvent('textureErase', {
          detail: { uv, pressure: 1.0, brushSize, brushOpacity, brushShape }
        });
        document.dispatchEvent(textureEraseEvent);
        console.log('🧽 Dispatched general texture erase event');
        
        // CRITICAL FIX: Don't call composeLayers - it clears the original model texture!
        // Instead, update texture directly from layer canvases
        setTimeout(() => {
          if ((window as any).updateModelTexture) {
            (window as any).updateModelTexture(true, true);
          }
        }, 10);
      }
      
      // CRITICAL FIX: Don't call composeLayers - it clears the original model texture!
      // Instead, update texture directly from layer canvases
      debugLog('🧽 Skipping composeLayers to preserve original model texture');
      
      // 7. Force texture updates on the 3D model with a slight delay to ensure composition is complete
      setTimeout(() => {
        try {
          // NEW PUFF TOOL: Check if displacement canvas has content
          const displacementCanvas = (useApp.getState() as any).displacementCanvas as HTMLCanvasElement | undefined;
          const needsDisplacementUpdate = !!(displacementCanvas && modelScene);
          
          updateModelTexture(false, needsDisplacementUpdate);
          debugLog('🧽 Updated 3D model texture after erasure');
          
          // Trigger any texture update callbacks
          const textureUpdateEvent = new CustomEvent('textureUpdate', {
            detail: { type: 'erase', position: { x, y }, brushSize, brushOpacity }
          });
          document.dispatchEvent(textureUpdateEvent);
          debugLog('🧽 Dispatched texture update event');
        } catch (error) {
          if (DEBUG_TOOLS) console.error('Texture update event failed:', error);
        }
      }, 50); // Small delay to ensure composition is complete
      
      debugLog('🧽 Eraser applied to ALL texture layers and displacement layers at position:', { x, y });
      
    } else if (currentActiveTool === 'embroidery') {
      // Handle embroidery tool - draw continuous stitch patterns (PERFORMANCE OPTIMIZED)
      debugLog('🎨 Embroidery: Drawing stitch with symmetry');

      // Get embroidery settings from store
      const embroiderySettings = useApp.getState();
      const embroideryThreadColor = embroiderySettings.embroideryThreadColor || '#ff0000';
      const embroideryThreadThickness = embroiderySettings.embroideryThreadThickness || 0.5;
      const embroideryStitchType = embroiderySettings.embroideryStitchType || 'satin';
      const lastPoint = embroiderySettings.lastEmbroideryPoint;

      // Define embroidery drawing function for symmetry
      const drawEmbroideryAt = (x: number, y: number) => {
      // PERFORMANCE: Quick setup
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      // PERFORMANCE: Adaptive thread size based on device tier
      const deviceTier = performanceOptimizer.getConfig().deviceTier;
      const threadSizeMultiplier = deviceTier === 'high' ? 2.5 : deviceTier === 'medium' ? 2 : 1.5; // Reduced multipliers for better performance
      const threadSize = embroideryThreadThickness * threadSizeMultiplier;
      
      // PERFORMANCE: Skip complex effects for low-end devices
      const useSimpleEmbroidery = deviceTier === 'low';
      
      // PERFORMANCE OPTIMIZED: Batch thread rendering with Path2D and cached gradients
      const gradientCache = new Map<string, CanvasGradient>();
      const darken = (color: string, factor: number) => {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
        return `rgb(${r}, ${g}, ${b})`;
      };
      
      // Create realistic thread texture with multiple layers (OPTIMIZED)
      const drawThreadStitch = (startX: number, startY: number, endX: number, endY: number) => {
        if (useSimpleEmbroidery) {
          // Simple embroidery for low-end devices - single stroke
          ctx.strokeStyle = embroideryThreadColor;
          ctx.lineWidth = threadSize;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          return;
        }
        
        // Complex embroidery for high-end devices - OPTIMIZED with Path2D
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        
        // PERFORMANCE: Cache gradients to avoid recreation
        const gradientKey = `${embroideryThreadColor}_${threadSize}`;
        let gradient = gradientCache.get(gradientKey);
        if (!gradient) {
          const newGradient = ctx.createLinearGradient(0, -threadSize/2, 0, threadSize/2);
          const baseColor = embroideryThreadColor;
          newGradient.addColorStop(0, darken(baseColor, 0.7));
          newGradient.addColorStop(0.3, darken(baseColor, 0.9));
          newGradient.addColorStop(0.5, baseColor);
          newGradient.addColorStop(0.7, darken(baseColor, 0.9));
          newGradient.addColorStop(1, darken(baseColor, 0.7));
          gradientCache.set(gradientKey, newGradient);
          gradient = newGradient;
        }
        
        // PERFORMANCE: Use Path2D for thread body (faster rendering)
        const threadPath = new Path2D();
        threadPath.ellipse(length/2, 0, length/2, threadSize/2, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill(threadPath);
        
        // PERFORMANCE: Batch texture lines into single Path2D
        const deviceTier = performanceOptimizer.getConfig().deviceTier;
        const textureSpacing = deviceTier === 'high' ? threadSize * 0.5 : deviceTier === 'medium' ? threadSize * 0.8 : threadSize * 1.2;
        
        if (deviceTier !== 'low') {
          const texturePath = new Path2D();
          for (let i = 0; i < length; i += textureSpacing) {
            texturePath.moveTo(i, -threadSize/4);
            texturePath.lineTo(i + threadSize * 0.3, threadSize/4);
          }
          ctx.strokeStyle = darken(embroideryThreadColor, 0.8);
          ctx.lineWidth = 1;
          ctx.stroke(texturePath); // Single stroke for all texture lines
        }
        
        // PERFORMANCE: Cache sheen gradient
        const sheenKey = `sheen_${threadSize}`;
        let sheenGradient = gradientCache.get(sheenKey);
        if (!sheenGradient) {
          const newSheenGradient = ctx.createLinearGradient(0, -threadSize/2, 0, threadSize/2);
          newSheenGradient.addColorStop(0, 'transparent');
          newSheenGradient.addColorStop(0.3, '#FFFFFF');
          newSheenGradient.addColorStop(0.5, 'transparent');
          newSheenGradient.addColorStop(1, 'transparent');
          gradientCache.set(sheenKey, newSheenGradient);
          sheenGradient = newSheenGradient;
        }
        
        // Add sheen with Path2D
        ctx.globalAlpha = 0.6;
        const sheenPath = new Path2D();
        sheenPath.ellipse(length/2, -threadSize/4, length/2.5, threadSize/6, 0, 0, Math.PI * 2);
        ctx.fillStyle = sheenGradient;
        ctx.fill(sheenPath);
        ctx.globalAlpha = 1.0;
        
        // PERFORMANCE: Batch highlights into single Path2D
        if (deviceTier !== 'low') {
          const highlightPath = new Path2D();
          const highlightSpacing = deviceTier === 'high' ? threadSize * 0.3 : threadSize * 0.6;
          for (let i = 0; i < length; i += highlightSpacing) {
            highlightPath.moveTo(i, -threadSize/4);
            highlightPath.lineTo(i + threadSize * 0.15, -threadSize/6);
          }
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1;
          ctx.stroke(highlightPath); // Single stroke for all highlights
          ctx.globalAlpha = 1.0;
        }
        
        // Add shadow with Path2D
        ctx.globalAlpha = 0.4;
        const shadowPath = new Path2D();
        shadowPath.moveTo(0, threadSize/2);
        shadowPath.lineTo(length, threadSize/2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = threadSize / 3;
        ctx.stroke(shadowPath);
        ctx.globalAlpha = 1.0;
        
        ctx.restore();
      };
      
      // Draw continuous patterns between last point and current point
      if (lastPoint) {
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        switch (embroideryStitchType) {
          case 'cross-stitch':
          case 'cross':
            // Draw realistic cross stitch with thread texture
            const crossSpacing = threadSize * 2;
            for (let d = 0; d < distance; d += crossSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              const halfSize = threadSize * 1.2;
              
              // Draw diagonal thread stitches to form X
              drawThreadStitch(px - halfSize, py - halfSize, px + halfSize, py + halfSize);
              drawThreadStitch(px + halfSize, py - halfSize, px - halfSize, py + halfSize);
            }
          break;
          
          case 'chain':
            // PERFORMANCE: Batch chain loops with Path2D
            const chainSpacing = threadSize * 1.5;
            const chainLoopPath = new Path2D();
            const chainTexturePath = new Path2D();
            const chainConnections: Array<{start: {x: number, y: number}, end: {x: number, y: number}}> = [];
            
            for (let d = 0; d < distance; d += chainSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              const loopRadius = threadSize * 0.8;
              
              // Batch loop arcs
              chainLoopPath.arc(px, py, loopRadius, 0, Math.PI * 2);
              
              // Batch texture lines
              if (deviceTier !== 'low') {
                for (let i = 0; i < Math.PI * 2; i += 0.3) {
                  chainTexturePath.moveTo(
                    px + Math.cos(i) * (loopRadius - threadSize/4),
                    py + Math.sin(i) * (loopRadius - threadSize/4)
                  );
                  chainTexturePath.lineTo(
                    px + Math.cos(i) * (loopRadius + threadSize/4),
                    py + Math.sin(i) * (loopRadius + threadSize/4)
                  );
                }
              }
              
              // Store connection for later
              if (d > 0) {
                const prevPx = lastPoint.x + (dx / distance) * (d - chainSpacing);
                const prevPy = lastPoint.y + (dy / distance) * (d - chainSpacing);
                chainConnections.push({ start: {x: prevPx, y: prevPy}, end: {x: px, y: py} });
              }
            }
            
            // Draw batched loops
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize * 0.3;
            ctx.stroke(chainLoopPath);
            
            // Draw batched texture
            if (deviceTier !== 'low') {
              ctx.lineWidth = 1;
              ctx.stroke(chainTexturePath);
            }
            
            // Draw connections
            chainConnections.forEach(conn => {
              drawThreadStitch(conn.start.x, conn.start.y, conn.end.x, conn.end.y);
            });
            break;

          case 'french-knot':
          case 'french_knot':
            // Draw realistic French knots with thread texture
            const knotSpacing = threadSize * 3;
            for (let d = 0; d < distance; d += knotSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              
              // Draw French knot as coiled thread
              ctx.save();
              ctx.translate(px, py);
              
              // Create knot with multiple thread wraps
              const knotRadius = threadSize * 1.5;
              for (let wrap = 0; wrap < 3; wrap++) {
                const radius = knotRadius - (wrap * threadSize * 0.2);
          ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.strokeStyle = embroideryThreadColor;
                ctx.lineWidth = threadSize * 0.4;
                ctx.stroke();
                
                // Add thread texture to each wrap
                for (let i = 0; i < Math.PI * 2; i += 0.5) {
              ctx.beginPath();
                  ctx.moveTo(Math.cos(i) * (radius - threadSize/6), Math.sin(i) * (radius - threadSize/6));
                  ctx.lineTo(Math.cos(i) * (radius + threadSize/6), Math.sin(i) * (radius + threadSize/6));
                  ctx.stroke();
                }
              }
              
              // Add highlight to knot
              ctx.strokeStyle = embroideryThreadColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(-knotRadius * 0.3, -knotRadius * 0.3, knotRadius * 0.4, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.restore();
            }
          break;
          
          case 'seed':
            // Draw realistic seed stitches with thread texture
            const seedSpacing = threadSize * 2;
            for (let d = 0; d < distance; d += seedSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              
              // Draw random seed stitch as small thread segment
              const seedLength = threadSize * 0.8;
              const seedAngle = Math.random() * Math.PI;
              
      ctx.save();
              ctx.translate(px, py);
              ctx.rotate(seedAngle);
              
              // Draw seed as small thread with texture
              const seedGradient = ctx.createLinearGradient(-seedLength/2, 0, seedLength/2, 0);
              seedGradient.addColorStop(0, embroideryThreadColor);
              seedGradient.addColorStop(0.5, embroideryThreadColor);
              seedGradient.addColorStop(1, embroideryThreadColor);
              
              ctx.fillStyle = seedGradient;
              ctx.beginPath();
              ctx.ellipse(0, 0, seedLength/2, threadSize/4, 0, 0, Math.PI * 2);
              ctx.fill();
              
              // Add thread texture
              ctx.strokeStyle = embroideryThreadColor;
              ctx.lineWidth = 1;
              for (let i = -seedLength/2; i < seedLength/2; i += threadSize * 0.2) {
                ctx.beginPath();
                ctx.moveTo(i, -threadSize/6);
                ctx.lineTo(i + threadSize * 0.1, threadSize/6);
              ctx.stroke();
              }
              
              ctx.restore();
            }
          break;
          
          case 'feather': {
            // PERFORMANCE: Batch feather stitch with Path2D
            const featherSpacing = threadSize * 2;
            const featherPath = new Path2D();
            featherPath.moveTo(lastPoint.x, lastPoint.y);
            featherPath.lineTo(x, y);
            
            const perpAngle = angle + Math.PI / 2;
            const branchLength = threadSize * 1.5;
            for (let d = featherSpacing; d < distance; d += featherSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              const side = (Math.floor(d / featherSpacing) % 2) * 2 - 1;
              featherPath.moveTo(px, py);
              featherPath.lineTo(
                px + Math.cos(perpAngle) * branchLength * side,
                py + Math.sin(perpAngle) * branchLength * side
              );
            }
            
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.stroke(featherPath);
            break;
          }
          
          case 'bullion':
            // Draw wrapped coil stitches
            const bullionSpacing = threadSize * 2.5;
            for (let d = 0; d < distance; d += bullionSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
      ctx.save();
              ctx.translate(px, py);
              ctx.rotate(angle);
              // Draw coiled effect
              for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(i * threadSize * 0.3, 0, threadSize * 0.8, 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.restore();
            }
            break;

          case 'running-stitch':
          case 'running':
            // PERFORMANCE: Use Path2D for running stitch
            ctx.setLineDash([threadSize * 1.5, threadSize * 1.5]);
            const runningPath = new Path2D();
            runningPath.moveTo(lastPoint.x, lastPoint.y);
            runningPath.lineTo(x, y);
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.lineCap = 'round';
            ctx.stroke(runningPath);
            ctx.setLineDash([]); // Reset dash
          break;
          
          case 'zigzag': {
            // PERFORMANCE: Use Path2D for zigzag
            const zigzagSpacing = threadSize * 1.5;
            const zigzagHeight = threadSize;
            const zigzagPath = new Path2D();
            zigzagPath.moveTo(lastPoint.x, lastPoint.y);
            const perpAngle = angle + Math.PI / 2;
            for (let d = 0; d < distance; d += zigzagSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              const side = (Math.floor(d / zigzagSpacing) % 2) * 2 - 1;
              zigzagPath.lineTo(
                px + Math.cos(perpAngle) * zigzagHeight * side,
                py + Math.sin(perpAngle) * zigzagHeight * side
              );
            }
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.stroke(zigzagPath);
            break;
          }
          
          case 'blanket':
            // PERFORMANCE: Batch blanket stitch with Path2D
            const blanketSpacing = threadSize * 2;
            const blanketPath = new Path2D();
            blanketPath.moveTo(lastPoint.x, lastPoint.y);
            blanketPath.lineTo(x, y);
            
            const perpBlanket = angle + Math.PI / 2;
            for (let d = blanketSpacing; d < distance; d += blanketSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              blanketPath.moveTo(px, py);
              blanketPath.lineTo(
                px + Math.cos(perpBlanket) * threadSize * 1.5,
                py + Math.sin(perpBlanket) * threadSize * 1.5
              );
            }
            
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.stroke(blanketPath);
          break;
          
          case 'herringbone':
            // PERFORMANCE: Batch herringbone with Path2D
            const herringSpacing = threadSize * 1.5;
            const perpHerring = angle + Math.PI / 2;
            const herringPath = new Path2D();
            
            for (let d = 0; d < distance; d += herringSpacing) {
              const px = lastPoint.x + (dx / distance) * d;
              const py = lastPoint.y + (dy / distance) * d;
              const side = (Math.floor(d / herringSpacing) % 2) * 2 - 1;
              
              herringPath.moveTo(
                px + Math.cos(perpHerring) * threadSize * side,
                py + Math.sin(perpHerring) * threadSize * side
              );
              herringPath.lineTo(
                px + Math.cos(angle) * threadSize * 1.5 - Math.cos(perpHerring) * threadSize * side,
                py + Math.sin(angle) * threadSize * 1.5 - Math.sin(perpHerring) * threadSize * side
              );
            }
            
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.stroke(herringPath);
          break;
          
          case 'backstitch':
          case 'outline':
            // PERFORMANCE: Use Path2D for backstitch
            const backstitchPath = new Path2D();
            backstitchPath.moveTo(lastPoint.x, lastPoint.y);
            backstitchPath.lineTo(x, y);
            ctx.strokeStyle = embroideryThreadColor;
            ctx.lineWidth = threadSize;
            ctx.lineCap = 'round';
            ctx.stroke(backstitchPath);
            break;

          case 'satin':
          case 'fill':
          case 'long_short_satin':
          case 'fill_tatami':
          default:
            // PERFORMANCE: Default satin stitch - optimized rendering
            drawThreadStitch(lastPoint.x, lastPoint.y, x, y);
            
            // PERFORMANCE: Use Path2D for highlight
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.2;
            const highlightPath = new Path2D();
            highlightPath.moveTo(lastPoint.x, lastPoint.y);
            highlightPath.lineTo(x, y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = threadSize * 0.6;
            ctx.stroke(highlightPath);
            ctx.globalAlpha = 1.0;
          break;
        }
      } else {
        // First point - just draw a dot
        ctx.beginPath();
        ctx.arc(x, y, threadSize, 0, Math.PI * 2);
      ctx.fill();
      }

        // PERFORMANCE: Throttle embroidery stitch creation to reduce overhead
        const stitchThrottle = deviceTier === 'low' ? 100 : deviceTier === 'medium' ? 50 : 25; // ms between stitch records
        const now = Date.now();
        const shouldCreateStitch = !(window as any).lastEmbroideryStitchTime || (now - (window as any).lastEmbroideryStitchTime) >= stitchThrottle;
        
        if (shouldCreateStitch) {
          (window as any).lastEmbroideryStitchTime = now;

        // Create embroidery stitch record with layer ID using V2 system
        let currentLayer;
        try {
          // Use AdvancedLayerSystemV2 directly
          const { layers, activeLayerId, createLayer } = useAdvancedLayerStoreV2.getState();
          
          // Check if we have an active layer
          if (activeLayerId) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer && activeLayer.visible) {
              currentLayer = {
                id: activeLayer.id,
                name: activeLayer.name,
                canvas: activeLayer.content.canvas || document.createElement('canvas')
              };
            }
          }
          
          // Create a new layer if none exists
          if (!currentLayer) {
            const layerId = createLayer('paint', `${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Layer`);
            const newLayer = layers.find(l => l.id === layerId);
            if (newLayer) {
              currentLayer = {
                id: newLayer.id,
                name: newLayer.name,
                canvas: newLayer.content.canvas || document.createElement('canvas')
              };
            }
          }
        } catch (error) {
          console.warn('🎨 Advanced layer system V2 failed, using fallback:', error);
          const getOrCreateActiveLayer = useApp.getState().getOrCreateActiveLayer;
          currentLayer = getOrCreateActiveLayer ? getOrCreateActiveLayer(activeTool) : null;
        }
        if (currentLayer) {
          const newStitch = {
            id: `stitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            layerId: currentLayer.id,
            type: embroideryStitchType,
            color: embroideryThreadColor,
            threadType: 'cotton',
            thickness: embroideryThreadThickness,
            opacity: 1.0,
              points: (lastPoint && paintingActiveRef.current) ? [{ x: lastPoint.x, y: lastPoint.y }, { x, y }] : [{ x, y }],
            timestamp: Date.now()
          };
          
          // Add to embroidery stitches array
          const currentStitches = useApp.getState().embroideryStitches || [];
          useApp.setState({ 
            embroideryStitches: [...currentStitches, newStitch as any],
            lastEmbroideryPoint: { x, y }
          });
          
          console.log('🎨 Embroidery stitch created and linked to layer:', currentLayer.id, newStitch);
        } else {
          // Fallback: just update last point
            useApp.setState({ lastEmbroideryPoint: { x, y } });
          }
        } else {
          // Just update last point without creating stitch record
          useApp.setState({ lastEmbroideryPoint: { x, y } });
        }

        // PERFORMANCE: Reduced logging (only in debug mode)
        debugLog('🎨 Embroidery stitch drawn:', embroideryStitchType, 'at position:', { x, y });
      };

      // Draw with symmetry
      drawWithSymmetry(drawEmbroideryAt);

    } else if (currentActiveTool === 'puffPrint') {
      // 🎈 PUFF TOOL - Create actual 3D geometry on model surface
      if (!modelScene) {
        console.warn('🎈 Puff tool: No modelScene available');
        return;
      }

      // Get world position and normal from intersection
      const point = e.point as THREE.Vector3 | undefined;
      const face = e.face as THREE.Face | undefined;
      const object = e.object as THREE.Mesh | undefined;
      
      if (!point || !face || !object) {
        if (DEBUG_TOOLS) console.warn('🎈 Puff tool: Missing point, face, or object');
        return;
      }
      
      // CRITICAL FIX: Get the root scene from the object (not modelScene)
      // The mesh should be added to the root scene, not modelScene, so world positions work correctly
      let targetScene: THREE.Object3D | null = null;
      if (object.parent) {
        // Traverse up to find the root scene
        let current: THREE.Object3D | null = object;
        while (current && current.parent) {
          current = current.parent;
        }
        targetScene = current;
      } else {
        // Fallback to modelScene if we can't find root
        targetScene = modelScene;
      }
      
      if (!targetScene) {
        if (DEBUG_TOOLS) console.warn('🎈 Puff tool: Could not find target scene');
        return;
      }

      // Get puff settings from app state
      const appState = useApp.getState();
      const currentPuffSize = appState.puffSize || 20; // Get puff size in pixels
      const puffHeightMultiplier = appState.puffHeight || 1.2; // Height multiplier
      const puffColor = appState.puffColor || '#ff69b4';
      const puffOpacity = appState.puffOpacity || 0.9;
      const puffSoftness = appState.puffSoftness || 0.5;
      
      // Phase 1: Shape Customization
      const puffTopShape = appState.puffTopShape || 'rounded';
      const puffBottomShape = appState.puffBottomShape || 'rounded';
      const puffCrossSectionShape = appState.puffCrossSectionShape || 'circle';
      const puffProfileCurve = appState.puffProfileCurve || 'cubic';
      const puffEdgeRadius = appState.puffEdgeRadius || 10;
      const puffTaperAmount = appState.puffTaperAmount || 0;
      
      // Phase 3: Material & Texture
      const puffFabricType = appState.puffFabricType || 'cotton';
      const puffRoughness = appState.puffRoughness !== undefined ? appState.puffRoughness : 0.8;
      const puffTextureIntensity = appState.puffTextureIntensity !== undefined ? appState.puffTextureIntensity : 0.3;
      const puffEnableNormalMap = appState.puffEnableNormalMap !== undefined ? appState.puffEnableNormalMap : true;
      
      // Phase 4: Edge Details
      const puffEdgeType = appState.puffEdgeType || 'none';
      const puffEdgeWidth = appState.puffEdgeWidth || 2;
      const puffEdgeColor = appState.puffEdgeColor || '#000000';
      
      // Phase 5: Advanced
      const puffDetailLevel = appState.puffDetailLevel || 'auto';
      const puffSmoothness = appState.puffSmoothness !== undefined ? appState.puffSmoothness : 80;
      
      // Get gradient settings if in gradient mode
      const gradientSettings = (window as any).getGradientSettings?.();
      const puffGradientData = gradientSettings?.puff;
      
      // Calculate world scale based on model bounds
      let pixelToWorldScale = 0.01; // Default scale
      if (modelScene) {
        const box = new THREE.Box3().setFromObject(modelScene);
        const modelSize = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        // Canvas is typically 2048px, model is maxDimension units
        // So 1 pixel = maxDimension / 2048 world units
        pixelToWorldScale = maxDimension / 2048;
        debugLog('🎈 Model scale calculation:', { maxDimension, pixelToWorldScale, puffSize: currentPuffSize });
      }
      
      // Convert puff size (pixels) to world units
      const puffSize = currentPuffSize * pixelToWorldScale; // Size in world units
      const puffHeight = puffSize * puffHeightMultiplier; // Height based on multiplier
      
      debugLog('🎈 Puff settings:', { 
        puffSizePixels: currentPuffSize, 
        pixelToWorldScale, 
        puffSizeWorld: puffSize, 
        puffHeight,
        puffHeightMultiplier,
        puffColor,
        puffOpacity,
        puffSoftness
      });

      // Calculate surface normal from face
      let normal = face.normal ? face.normal.clone() : new THREE.Vector3(0, 1, 0);
      
      // Transform normal to world space
      if (object.matrixWorld) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
        normal.applyMatrix3(normalMatrix).normalize();
      }
      
      // Initialize stroke if this is the first point
      // CRITICAL: Always start a new stroke when paintingActiveRef is false
      // This ensures each new click creates a separate puff, not bridging to previous ones
      if (!paintingActiveRef.current) {
        const strokeId = `puff-stroke-${Date.now()}`;
        puffGeometryManager.startStroke(strokeId);
        debugLog('🎈 Started new puff stroke:', strokeId);
      }

      // Create stroke point
      const strokePoint: PuffStrokePoint = {
        uv: uv.clone(),
        worldPosition: point.clone(),
        normal: normal
      };

      // Add point to current stroke
      puffGeometryManager.addPointToStroke(strokePoint);

              // Get settings - include all customization options
              const settings: PuffSettings = {
                height: puffHeight,
                size: puffSize,
                softness: puffSoftness,
                color: puffColor,
                opacity: puffOpacity,
                
                // Phase 1: Shape Customization
                topShape: puffTopShape,
                bottomShape: puffBottomShape,
                crossSectionShape: puffCrossSectionShape,
                profileCurve: puffProfileCurve,
                edgeRadius: puffEdgeRadius,
                taperAmount: puffTaperAmount,
                
                // Phase 3: Material & Texture
                fabricType: puffFabricType,
                roughness: puffRoughness,
                textureIntensity: puffTextureIntensity,
                enableNormalMap: puffEnableNormalMap,
                
                // Phase 4: Edge Details
                edgeType: puffEdgeType,
                edgeWidth: puffEdgeWidth,
                edgeColor: puffEdgeColor,
                
                // Phase 5: Advanced
                detailLevel: puffDetailLevel,
                smoothness: puffSmoothness,
                
                // Existing features
                hairs: appState.puffHairs || false,
                hairHeight: appState.puffHairHeight || 0.5,
                hairDensity: appState.puffHairDensity || 50,
                hairThickness: appState.puffHairThickness || 0.02,
                hairVariation: appState.puffHairVariation || 0.2,
                gradient: puffGradientData?.mode === 'gradient' ? {
                  type: puffGradientData.type,
                  angle: puffGradientData.angle,
                  stops: puffGradientData.stops
                } : undefined
              };

      // Update stroke mesh (creates/updates the 3D geometry)
      // CRITICAL: Use targetScene (root scene) instead of modelScene
      puffGeometryManager.updateCurrentStroke(settings, targetScene);
      
      debugLog('🎈 Puff tool: Added 3D geometry point to stroke');
    }
    
    // PERFORMANCE: Minimal logging
    if (Math.random() < 0.001) { // Only log 0.1% of the time
      console.log('🎨 Canvas state restored after drawing');
    }
    
    // CRITICAL FIX: Don't call composeLayers immediately - it clears the canvas!
    // Instead, update the model texture directly from the layer canvas
    
    // Throttle texture updates to improve performance
    if (performanceOptimizer.canUpdateTexture()) {
      const now = performance.now();
      const lastUpdate = (window as any).lastTextureUpdate || 0;
      const updateInterval = 100; // 100ms between texture updates
      
      if (now - lastUpdate > updateInterval) {
        // Update model texture directly from the active layer
        // This preserves the original model texture while adding tool effects
        updateModelTexture(false, false); // Don't force update, don't update displacement
        
        // Track last update time
        (window as any).lastTextureUpdate = now;
      }
    }
  }, [activeTool, brushColor, brushSize, brushOpacity, brushHardness, brushFlow, brushShape, brushSpacing, blendMode, getActiveLayer, updateModelTexture]);
  
  // Smart control management - only disable rotation/pan for tools that need it, but keep zoom enabled
  const shouldDisableControls = useCallback((tool: string) => {
    // Only disable controls for tools that need continuous drawing and would conflict with camera movement
    const continuousDrawingTools = ['brush', 'eraser', 'embroidery', 'fill', 'puffPrint', 'vector', 'smudge', 'blur'];
    return continuousDrawingTools.includes(tool);
  }, []);
  
  const manageControls = useCallback((tool: string, shouldDisable: boolean) => {
    const currentState = useApp.getState().controlsEnabled;
    console.log(`🎮 manageControls called: tool=${tool}, shouldDisable=${shouldDisable}, shouldDisableControls=${shouldDisableControls(tool)}, currentState=${currentState}`);
    if (shouldDisableControls(tool)) {
      // Only disable rotation and pan, but keep zoom enabled
      setControlsEnabled(!shouldDisable);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎮 Controls ${!shouldDisable ? 'enabled' : 'disabled'} for tool: ${tool} (was: ${currentState})`);
        console.log(`🎮 Note: Zoom controls remain always enabled`);
      }
    } else {
      console.log(`🎮 Tool ${tool} does not require control management`);
    }
  }, [shouldDisableControls, setControlsEnabled]);

  // Listen for manual control enabling from Canvas clicks
  useEffect(() => {
    const handleUserManuallyEnabledControls = (event: CustomEvent) => {
      const { tool, enabled } = event.detail;
      console.log(`🎮 Received manual control enable signal for tool: ${tool}, enabled: ${enabled}`);
      userManuallyEnabledControlsRef.current = enabled;
    };

    window.addEventListener('userManuallyEnabledControls', handleUserManuallyEnabledControls as EventListener);
    
    return () => {
      window.removeEventListener('userManuallyEnabledControls', handleUserManuallyEnabledControls as EventListener);
    };
  }, []);

  // PERFORMANCE: Optimized controls management with minimal logging
  useEffect(() => {
    // PERFORMANCE: Early exit if user manually enabled controls
    if (userManuallyEnabledControlsRef.current && shouldDisableControls(activeTool)) {
      return;
    }
    
    const shouldDisable = shouldDisableControls(activeTool);
    setControlsEnabled(!shouldDisable);
    
    if (!shouldDisable) {
      userManuallyEnabledControlsRef.current = false; // Reset manual flag
    }
  }, [activeTool, setControlsEnabled, shouldDisableControls]);

  // Texture Layer Management System
  const textureLayerManager = useCallback(() => {
    console.log('🎨 ===== TEXTURE LAYER MANAGER INITIALIZATION =====');
    
    // Define the proper layer order and tool assignments
    const textureLayers = {
      base: {
        name: 'Base/Diffuse Layer',
        purpose: 'Original model texture',
        toolTarget: 'none',
        priority: 0
      },
      brush: {
        name: 'Brush/Paint Layer',
        purpose: 'Brush strokes and paint',
        toolTarget: 'brush',
        priority: 1,
        maps: ['map', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap']
      },
      embroidery: {
        name: 'Embroidery Layer',
        purpose: 'Stitched patterns',
        toolTarget: 'embroidery',
        priority: 3,
        maps: ['normalMap', 'bumpMap', 'displacementMap', 'map']
      },
      effects: {
        name: 'Effects Layer',
        purpose: 'Post-processing effects',
        toolTarget: 'none',
        priority: 4,
        maps: ['emissiveMap', 'specularMap', 'envMap']
      }
    };
    
    console.log('🎨 Texture Layer Configuration:', textureLayers);
    console.log('🎨 ===== END TEXTURE LAYER MANAGER =====');
    
    return textureLayers;
  }, []);
  
  // Initialize texture layer manager
  useEffect(() => {
    textureLayerManager();
  }, [textureLayerManager]);

  // Initialize layer persistence and layer system
  useEffect(() => {
    const initializeLayerSystem = async () => {
      console.log('🎨 ShirtRefactored: Initializing layer system...');
      
      // Initialize AdvancedLayerSystemV2
      try {
        console.log('🎨 Initializing AdvancedLayerSystemV2');
        // V2 system initializes automatically, just log success
        console.log('🎨 AdvancedLayerSystemV2 initialized successfully');
      } catch (error) {
        console.warn('🎨 AdvancedLayerSystemV2 initialization failed:', error);
      }
    };
    
    initializeLayerSystem();
  }, []);

  // PROACTIVE CONTROL MANAGEMENT: Disable controls when a drawing tool is selected
  useEffect(() => {
    const continuousDrawingTools = ['brush', 'eraser', 'embroidery', 'fill', 'puffPrint', 'vector', 'smudge', 'blur'];
    
    // CRITICAL: When vector tool is selected, default to 'pen' mode for immediate drawing
    // Also ensure composedCanvas is initialized
    if (activeTool === 'vector') {
      const appState = useApp.getState();
      const currentMode = appState.vectorEditMode;
      
      // Initialize vectorEditMode if not set or invalid
      if (!currentMode || !['pen', 'select', 'move', 'curve', 'addAnchor', 'removeAnchor', 'convertAnchor'].includes(currentMode)) {
        useApp.setState({ vectorEditMode: 'pen' });
        console.log('🎯 Vector tool: Auto-set to pen mode for immediate drawing');
      }
      
      // CRITICAL FIX: Ensure composedCanvas is initialized when vector tool is activated
      let composedCanvas = appState.composedCanvas;
      if (!composedCanvas) {
        console.warn('🎯 Vector tool: No composedCanvas - initializing...');
        // Trigger layer composition to create composedCanvas
        appState.composeLayers();
        composedCanvas = useApp.getState().composedCanvas;
        
        if (!composedCanvas) {
          console.error('🎯 Vector tool: Failed to initialize composedCanvas on tool activation');
        } else {
          console.log('🎯 Vector tool: ComposedCanvas initialized successfully');
        }
      }
    }
    
    console.log(`🎮 Tool changed to: ${activeTool}, shouldDisable: ${continuousDrawingTools.includes(activeTool)}, userManuallyEnabled: ${userManuallyEnabledControlsRef.current}`);
    
    // Respect user's manual control enabling
    if (userManuallyEnabledControlsRef.current && continuousDrawingTools.includes(activeTool)) {
      console.log(`🎮 User manually enabled controls - not overriding for tool: ${activeTool}`);
      return;
    }
    
    // Proactively disable controls for drawing tools
    if (continuousDrawingTools.includes(activeTool)) {
      console.log(`🎮 PROACTIVELY disabling controls for drawing tool: ${activeTool}`);
      setControlsEnabled(false);
      useApp.setState({ controlsEnabled: false }); // Force immediate update
    } else {
      console.log(`🎮 PROACTIVELY enabling controls for non-drawing tool: ${activeTool}`);
      setControlsEnabled(true);
      useApp.setState({ controlsEnabled: true }); // Force immediate update
      userManuallyEnabledControlsRef.current = false;
    }
  }, [activeTool, setControlsEnabled]);

  // Add event listeners for undo/redo restoration
  useEffect(() => {
    const handleDisplacementMapUpdate = (event: CustomEvent) => {
      console.log('🔄 Received displacement map update event:', event.detail);
      // NEW PUFF TOOL: Check displacementCanvas instead of puffCanvas
      const displacementCanvas = (useApp.getState() as any).displacementCanvas as HTMLCanvasElement | undefined;
      if (displacementCanvas) {
        // Only update displacement maps, not the main texture
        updateModelTexture(false, true);
      }
    };

    const handleEmbroideryUpdate = (event: CustomEvent) => {
      console.log('🔄 Received embroidery update event:', event.detail);
      // Force embroidery path re-rendering if needed
      // This will be handled by the existing embroidery system
    };

    const handleTextureUpdate = (event: CustomEvent) => {
      console.log('🔄 Received forced texture update event:', event.detail);
      
      // Check if this is a layer operation that affects both texture and displacement
      const source = event.detail?.source;
      const layerOperations = [
        'layer-reorder', 'layer-visibility', 'layer-opacity', 'layer-blendmode',
        'layer-opacity-v2', 'layer-visibility-v2', 'layer-blendmode-v2',
        'layer-reorder-up-v2', 'layer-reorder-down-v2'
      ];
      const needsDisplacementUpdate = layerOperations.includes(source);
      
      if (needsDisplacementUpdate) {
        // For layer operations, update both texture AND displacement maps
        console.log('🔄 Layer operation detected - updating both texture and displacement maps:', source);
        updateModelTexture(true, true); // Force update both texture and displacement
      } else {
        // For other events, only update main texture
        console.log('🔄 Calling updateModelTexture(true, true) for general texture and displacement update');
        updateModelTexture(true, true);
      }
      console.log('🔄 updateModelTexture completed');
    };

    window.addEventListener('updateDisplacementMaps', handleDisplacementMapUpdate as EventListener);
    window.addEventListener('updateEmbroideryPaths', handleEmbroideryUpdate as EventListener);
    window.addEventListener('forceTextureUpdate', handleTextureUpdate as EventListener);

    return () => {
      window.removeEventListener('updateDisplacementMaps', handleDisplacementMapUpdate as EventListener);
      window.removeEventListener('updateEmbroideryPaths', handleEmbroideryUpdate as EventListener);
      window.removeEventListener('forceTextureUpdate', handleTextureUpdate as EventListener);
    };
  }, [updateModelTexture]);

  // UNIFIED IMAGE BOUNDS CALCULATION
  // This function calculates image bounds once and uses them everywhere
  // No more separate calculations for hitbox, borderbox, and resize anchors!
  const getImageBounds = useCallback((imageEl: any) => {
    // CRITICAL FIX: Use the actual composed canvas size, not the performance manager's optimal size
    const appState = useApp.getState();
    const composedCanvas = appState.composedCanvas;
    const canvasSize = composedCanvas ? composedCanvas.width : unifiedPerformanceManager.getOptimalCanvasSize().width;
    
    // CRITICAL FIX: Use the actual pixel coordinates that are used for rendering
    // These are already calculated and stored in the image element
    const pixelX = imageEl.x || 0;
    const pixelY = imageEl.y || 0;
    const pixelWidth = imageEl.width || 256;
    const pixelHeight = imageEl.height || 256;
    
    // Calculate center coordinates
    const centerX = pixelX + pixelWidth / 2;
    const centerY = pixelY + pixelHeight / 2;
    
    // Convert pixel coordinates back to UV for hitbox detection
    // CRITICAL FIX: Apply the same Y-flipping as click coordinates (1 - uv.y)
    const uvLeft = pixelX / canvasSize;
    const uvRight = (pixelX + pixelWidth) / canvasSize;
    const uvTop = 1 - (pixelY + pixelHeight) / canvasSize; // Flip Y to match click coordinates
    const uvBottom = 1 - pixelY / canvasSize; // Flip Y to match click coordinates
    
    // Calculate bounds (top-left corner and dimensions)
    const bounds = {
      x: pixelX,
      y: pixelY,
      width: pixelWidth,
      height: pixelHeight,
      centerX,
      centerY,
      // UV bounds for hitbox detection
      uvLeft,
      uvRight,
      uvTop,
      uvBottom
    };
    
    return bounds;
  }, []);

  // Brush tool event handlers with smart behavior
  const onPointerDown = useCallback((e: any) => {
    console.log('🎨 ============================================================');
    console.log('🎨 onPointerDown FIRED');
    console.log('🎨 activeTool:', activeTool);
    console.log('🎨 timestamp:', Date.now());
    console.log('🎨 Event object:', e);
    console.log('🎨 Event details:', { 
      hasIntersections: !!e.intersections,
      intersectionsLength: e.intersections?.length || 0, 
      intersections: e.intersections,
      hasUV: !!e.uv,
      uv: e.uv ? { x: e.uv.x, y: e.uv.y } : 'none',
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.nativeEvent ? (e.nativeEvent as MouseEvent).button : 'unknown'
    });
    console.log('🎨 ============================================================');
    
    // 🌟 GLOBAL DESELECTION CHECK: Deselect image when clicking outside, regardless of active tool
    const uv = e.uv as THREE.Vector2 | undefined;
    if (uv) {
      const clickU = uv.x;
      const clickV = 1 - uv.y; // Flip V for texture space
      
      // Check if click is on any image
      const v2State = useAdvancedLayerStoreV2.getState();
      const imageElements = v2State.getAllImageElements();
      let clickedOnImage = false;
      
      for (const img of imageElements) {
        if (!img.visible) continue;
        
        const bounds = getImageBounds(img);
        const isWithinBounds = (
          clickU >= bounds.uvLeft &&
          clickU <= bounds.uvRight &&
          clickV >= bounds.uvTop &&
          clickV <= bounds.uvBottom
        );
        
        if (isWithinBounds) {
          clickedOnImage = true;
          break;
        }
      }
      
      // If clicked outside any image, deselect current image
      if (!clickedOnImage) {
        const { selectedImageId: currentSelectedId } = useApp.getState();
        if (currentSelectedId) {
          console.log('🎨 GLOBAL DESELECTION: Clicked outside image - deselecting current image');
          const { setSelectedImageId } = useApp.getState();
          setSelectedImageId(null);
        }
      }
    }
    
    // 🎨 PICKER TOOL - Handle color picking FIRST (before selection logic)
    if (activeTool === 'picker') {
      console.log('🎨 Picker tool: Handling color pick');
      
      // Check if click is on model (has UV)
      if (e.uv && e.intersections && e.intersections.length > 0) {
        // Call paintAtEvent to handle color picking
        paintAtEvent(e);
        return; // Don't process as selection
      } else {
        console.log('🎨 Picker tool: Click outside model - no color to pick');
        return; // Click outside model, nothing to pick
      }
    }
    
    // 🎯 CLICK-TO-SELECT FUNCTIONALITY
    // Check if we're in selection mode or if user wants to select elements
    if (activeTool === 'universalSelect' || modifierKeys.ctrl) {
      console.log('🎯 Selection mode detected - checking for elements to select');
      
      // Determine selection mode based on modifier keys
      const isCtrlClick = modifierKeys.ctrl;
      const isShiftClick = modifierKeys.shift;
      
      let selectionMode: 'single' | 'multi' | 'add' | 'subtract' = 'single';
      if (isCtrlClick) {
        selectionMode = 'add';
      } else if (isShiftClick) {
        selectionMode = 'subtract';
      } else if (activeTool === 'universalSelect') {
        selectionMode = 'multi';
      }
      
      debugLog('🎯 Selection mode:', selectionMode, 'Ctrl:', isCtrlClick, 'Shift:', isShiftClick);
      
      if (e.uv) {
        // Convert UV coordinates to canvas coordinates
        const { composedCanvas } = useApp.getState();
        if (composedCanvas) {
          const canvasX = e.uv.x * composedCanvas.width;
          const canvasY = e.uv.y * composedCanvas.height;
          
          debugLog('🎯 Checking for elements at canvas position:', { canvasX, canvasY });
          
          // Get all brush strokes from the current layer
          const { layers } = useAdvancedLayerStoreV2.getState();
          const { brushStrokes } = useApp.getState();
          const activeLayer = layers.find((layer: any) => layer.id === 'paint');
          
          if (activeLayer && brushStrokes) {
            // Filter brush strokes for the active layer
            const layerBrushStrokes = brushStrokes.filter(stroke => stroke.layerId === activeLayer.id);
            
            // Check each brush stroke for intersection
            for (const stroke of layerBrushStrokes) {
              if (stroke.points && stroke.points.length > 0) {
                const bounds = elementDetection.calculateBrushStrokeBounds(stroke);
                
                if (
                  canvasX >= bounds.minX &&
                  canvasX <= bounds.maxX &&
                  canvasY >= bounds.minY &&
                  canvasY <= bounds.maxY
                ) {
                  debugLog('🎯 Found intersecting brush stroke:', stroke.id);
                  
                  // Create selected element
                  const selectedElement = {
                    id: stroke.id,
                    type: 'brush-stroke' as const,
                    layerId: activeLayer.id,
                    bounds,
                    position: { x: bounds.minX, y: bounds.minY },
                    data: stroke,
                  };
                  
                  // Apply selection mode
                  if (selectionMode === 'single' || selectionMode === 'multi') {
                    setSelectionMode(selectionMode);
                    selectElement(selectedElement);
                  } else if (selectionMode === 'add') {
                    setSelectionMode('multi');
                    addToSelection(selectedElement);
                  } else if (selectionMode === 'subtract') {
                    removeFromSelection(stroke.id);
                  }
                  
                  // Stop event propagation to prevent drawing
                  e.stopPropagation();
                  e.nativeEvent?.stopPropagation();
                  
                  debugLog('🎯 Element selected:', selectedElement);
                  return;
                }
              }
            }
          }
        }
      }
      
      // If no element was found and not adding to selection, clear selection
      if (selectionMode !== 'add') {
        clearSelection();
        console.log('🎯 No element found - cleared selection');
      }
      return;
    }
    
    // For continuous drawing tools, we need to detect if click is on model or outside
    console.log('🎨 DECISION POINT 1: Checking if tool is continuous drawing tool');
    console.log('🎨   activeTool:', activeTool);
    console.log('🎨   Is in [brush, eraser, embroidery, fill]?', ['brush', 'eraser', 'embroidery', 'fill'].includes(activeTool));
    
    // CRITICAL FIX: Handle 'select' tool FIRST - it should enable camera but allow selection
    if ((activeTool as string) === 'select') {
      console.log('🎯 SELECT TOOL: Detected - handling selection');
      
      const uv = e.uv as THREE.Vector2 | undefined;
      const { composedCanvas } = useApp.getState();
      
      if (uv && composedCanvas) {
        const { selectedLayerId, transformMode } = useStrokeSelection.getState();
        
        // If we're in transform mode (moving a stroke), disable camera
        if (transformMode) {
          console.log('🎯 Transform mode active - disabling camera');
          setControlsEnabled(false);
          useApp.setState({ controlsEnabled: false });
        }
        
        // CRITICAL: Actually run selection logic here for select tool
        // Check if clicking on a handle first
        let handle = null;
        
        if (selectedLayerId) {
          const { layers } = useAdvancedLayerStoreV2.getState();
          const selectedLayer = layers.find((l: any) => l.id === selectedLayerId);
          
          if (selectedLayer?.content?.strokeData?.bounds) {
            const bounds = selectedLayer.content.strokeData.bounds;
            const canvasX = uv.x * composedCanvas.width;
            const canvasY = uv.y * composedCanvas.height;
            const handleSize = 12;
            
            // Check corners and edges
            if (Math.abs(canvasX - bounds.minX) < handleSize && Math.abs(canvasY - bounds.minY) < handleSize) {
              handle = 'topLeft';
            } else if (Math.abs(canvasX - bounds.maxX) < handleSize && Math.abs(canvasY - bounds.minY) < handleSize) {
              handle = 'topRight';
            } else if (Math.abs(canvasX - bounds.minX) < handleSize && Math.abs(canvasY - bounds.maxY) < handleSize) {
              handle = 'bottomLeft';
            } else if (Math.abs(canvasX - bounds.maxX) < handleSize && Math.abs(canvasY - bounds.maxY) < handleSize) {
              handle = 'bottomRight';
            } else if (Math.abs(canvasY - bounds.minY) < handleSize) {
              handle = 'top';
            } else if (Math.abs(canvasY - bounds.maxY) < handleSize) {
              handle = 'bottom';
            } else if (Math.abs(canvasX - bounds.minX) < handleSize) {
              handle = 'left';
            } else if (Math.abs(canvasX - bounds.maxX) < handleSize) {
              handle = 'right';
            }
            
            if (handle) {
              console.log('🎯 Starting transform for handle:', handle);
              const { startTransform } = useStrokeSelection.getState();
              startTransform(
                handle.includes('topLeft') || handle.includes('topRight') || handle.includes('bottomLeft') || handle.includes('bottomRight') ? 'resize' : 'move',
                handle,
                { x: canvasX, y: canvasY }
              );
              return;
            }
          }
        }
        
        // Hit test for stroke selection
        const { performHitTest } = useStrokeSelection.getState();
        const hitLayerId = performHitTest({ u: uv.x, v: uv.y }, composedCanvas);
        
        if (hitLayerId) {
          console.log('🎯 SELECT TOOL: Clicked on stroke, selecting it:', hitLayerId);
          const { selectStroke, startTransform } = useStrokeSelection.getState();
          
          const multiSelect = modifierKeys.ctrl || modifierKeys.meta;
          selectStroke(hitLayerId, multiSelect);
          
          // CRITICAL FIX: Always start move transform when clicking on a stroke (for drag functionality)
          if (!multiSelect && hitLayerId) {
            const canvasX = uv.x * composedCanvas.width;
            const canvasY = uv.y * composedCanvas.height;
            console.log('🎯 Starting move transform for drag:', { canvasX, canvasY });
            startTransform('move', null, { x: canvasX, y: canvasY });
          }
          
          return;
        } else {
          console.log('🎯 SELECT TOOL: Clicked on empty area');
          
          if (!modifierKeys.ctrl && !modifierKeys.meta) {
            const { clearSelection } = useStrokeSelection.getState();
            clearSelection();
          }
          
          return;
        }
      }
      
      return; // Exit early for select tool
    } else if ((activeTool as string) === 'picker') {
      // Picker tool - handle color picking (one-click action)
      console.log('🎨 Picker tool detected - handling color pick');
      
      // Check if click is on model (has intersection)
      const isOnModel = e.intersections && e.intersections.length > 0;
      if (isOnModel) {
        console.log('🎨 Picker tool: Click on model - calling paintAtEvent');
        paintAtEvent(e);
        // Picker doesn't need paintingActiveRef - it's a one-click action
      } else {
        console.log('🎨 Picker tool: Click outside model - nothing to pick');
      }
      return; // Exit early for picker tool
    } else if (['brush', 'eraser', 'embroidery', 'fill', 'puffPrint', 'vector'].includes(activeTool)) {
      console.log('🎨 Continuous drawing tool detected:', activeTool);
      
      // Controls should already be disabled by useEffect when tool was selected
      console.log('🎨 Controls should already be disabled for continuous drawing tool:', activeTool);
      
      // Check if the click is on the model (has intersection)
      const isOnModel = e.intersections && e.intersections.length > 0;
      console.log('🎨 Click on model:', isOnModel, 'intersections:', e.intersections?.length || 0);
      console.log('🎨 Intersections array:', e.intersections);
      
      if (isOnModel) {
        // Click is on model - start drawing
        console.log('🎨 Click on model - starting drawing');
        
        // CRITICAL FIX: Check for stroke selection FIRST, before starting to paint
        // This must happen BEFORE setting paintingActiveRef.current to true
        const uv = e.uv as THREE.Vector2 | undefined;
        const { composedCanvas } = useApp.getState();
        
        // CRITICAL: For drawing tools (brush, eraser, etc.), clear selection when starting to paint
        // This prevents auto-selection after drawing and allows immediate drawing
        if (uv && composedCanvas && !paintingActiveRef.current) {
          const { performHitTest } = useStrokeSelection.getState();
          const hitLayerId = performHitTest({ u: uv.x, v: uv.y }, composedCanvas);
          
          if (hitLayerId) {
            console.log('🎯 Drawing tool: Clicked on stroke BUT we want to draw, clearing selection');
            const { clearSelection } = useStrokeSelection.getState();
            clearSelection();
            // Continue with drawing...
          }
        }
        
        // PERFORMANCE: Debounce history saves to prevent excessive saves
        const now = Date.now();
        if (now - lastHistorySaveRef.current >= HISTORY_SAVE_DELAY) {
          lastHistorySaveRef.current = now;
          
          // Save state before drawing starts (for undo)
          const { saveState } = useApp.getState();
          const actionName = activeTool === 'brush' ? 'Brush Stroke' :
                            activeTool === 'eraser' ? 'Erase' :
                            activeTool === 'puffPrint' ? 'Puff Print' :
                            activeTool === 'embroidery' ? 'Embroidery Stitch' :
                            activeTool === 'fill' ? 'Fill' :
                            'Drawing Operation';
          saveState(`Before ${actionName}`);
          console.log('💾 State saved before drawing:', actionName);
        }

        // 🚀 AUTOMATIC LAYER CREATION: Trigger layer creation for drawing events
        triggerBrushStart();
        
        // CRITICAL FIX: Only block left-click events for drawing
        // Allow right-click and middle-click for rotation
        const nativeEvent = e.nativeEvent || e;
        const isLeftClick = nativeEvent.button === 0 || nativeEvent.button === undefined; // Default to left if undefined
        const isRightClick = nativeEvent.button === 2;
        const isMiddleClick = nativeEvent.button === 1;
        
        // Only block left-click events - allow rotation controls for right/middle click
        if (isLeftClick) {
          if (e.stopPropagation) {
            e.stopPropagation();
            console.log('🎨 Stopped event propagation to prevent rotation (left-click only)');
          }
          // Note: preventDefault may not work on passive listeners, that's OK
          if (e.preventDefault) {
            try {
              e.preventDefault();
              console.log('🎨 Prevented default behavior (left-click only)');
            } catch (err) {
              // Ignore preventDefault errors on passive listeners
              console.log('🎨 preventDefault failed (passive listener)');
            }
          }
          if (e.nativeEvent) {
            e.nativeEvent.stopPropagation();
            console.log('🎨 Stopped native event propagation (left-click only)');
          }
        } else {
          console.log('🎨 Allowing event through for rotation (right/middle click)');
        }
        
        // Disable controls immediately and forcefully when starting to draw on model
        console.log('🎨 Disabling controls for drawing on model with tool:', activeTool);
        console.log('🎨 Current controlsEnabled state before disabling:', useApp.getState().controlsEnabled);
        setControlsEnabled(false);
        useApp.setState({ controlsEnabled: false }); // Force immediate state update
        userManuallyEnabledControlsRef.current = false; // Reset manual flag since we're now drawing
        console.log('🎨 Controls forcefully disabled, new state:', useApp.getState().controlsEnabled);
        
        // CRITICAL: For puff tool, DON'T set paintingActiveRef before calling paintAtEvent
        // paintAtEvent needs to check if paintingActiveRef is false to start a new stroke
        // For other tools, set it before calling paintAtEvent
        if (activeTool !== 'vector' && activeTool !== 'puffPrint') {
          paintingActiveRef.current = true;
          console.log('🎨 Set paintingActiveRef to true for tool:', activeTool);
          
          // Clear last embroidery point when starting a new drawing session
          if (activeTool === 'embroidery') {
            useApp.setState({ lastEmbroideryPoint: null });
            console.log('🎨 Cleared lastEmbroideryPoint for new embroidery session');
          }
        }
        
        // Call the actual painting function from useApp store
        
        // Handle picker tool separately (it doesn't need paintingActiveRef)
        if ((activeTool as string) === 'picker') {
          debugLog('🎨 Picker tool: Calling paintAtEvent for color picking');
          paintAtEvent(e);
          // Picker tool doesn't set paintingActiveRef - it's a one-click action
        } else if (['brush', 'eraser', 'embroidery', 'fill', 'puffPrint', 'vector'].includes(activeTool)) {
          console.log('🎨 Calling paintAtEvent for tool:', activeTool);
          paintAtEvent(e);
          
          // CRITICAL: For puff tool, set paintingActiveRef AFTER paintAtEvent
          // This ensures paintAtEvent can check if it's a new stroke
          if (activeTool === 'puffPrint') {
            paintingActiveRef.current = true;
            console.log('🎨 Set paintingActiveRef to true for puff tool after paintAtEvent');
          }
          // Vector tool doesn't need paintingActiveRef - it handles its own state
        }
      } else {
        // Click is outside model - enable controls for camera movement
        console.log('🎨 Click outside model - enabling controls for camera movement with tool:', activeTool);
        console.log('🎨 Current controlsEnabled state before enabling:', useApp.getState().controlsEnabled);
        setControlsEnabled(true);
        userManuallyEnabledControlsRef.current = true; // Mark as manually enabled
        console.log('🎨 Controls enabled, new state:', useApp.getState().controlsEnabled);
        paintingActiveRef.current = false;
      }
    } else if (['text', 'shapes', 'move'].includes(activeTool) || (activeTool as string) === 'image') {
      // For text, shapes, move, and image tools, allow camera movement but handle clicks on model
      // NOTE: Vector tool is now handled as a drawing tool in the continuousDrawingTools section above
      console.log('🎨 ============================================================');
      console.log('🎨 DECISION POINT 2: Non-drawing tool detected');
      console.log('🎨 Vector/Text/Shapes/Move/Image tool detected:', activeTool);
      console.log('🎨 ============================================================');
      
      // Check if the click is on the model (has intersection)
      const isOnModel = e.intersections && e.intersections.length > 0;
      console.log('🎨 DECISION POINT 3: Checking if click is on model');
      console.log('🎨   isOnModel:', isOnModel);
      console.log('🎨   e.intersections:', e.intersections);
      console.log('🎨   intersections length:', e.intersections?.length || 0);
      
      if (isOnModel) {
        // Click is on model - handle tool-specific logic
        console.log('🎨 ============================================================');
        console.log('🎨 DECISION POINT 4: Click is ON MODEL - handling tool logic');
        console.log('🎨 activeTool:', activeTool);
        console.log('🎨 ============================================================');
        
        // Vector tool is now handled in the main drawing tools section above
        if (activeTool === 'text') {
          // Text tool - select existing text or create new text
          console.log('🎨 ========== TEXT TOOL: onPointerDown TRIGGERED ==========');
          console.log('🎨 Event:', e);
          console.log('🎨 Button:', e.nativeEvent ? (e.nativeEvent as MouseEvent).button : 'unknown');
          
          const uv = e.uv as THREE.Vector2 | undefined;
          if (uv) {
            const clickU = uv.x;
            const clickV = 1 - uv.y; // Flip V to match how text.v is stored (see line 3546)
            
            console.log('🎨 Text tool: Click at UV:', { u: clickU, v: clickV });
            
            // Check for RIGHT CLICK - show context menu
            if (e.nativeEvent && (e.nativeEvent as MouseEvent).button === 2) {
              console.log('🖱️ RIGHT CLICK detected on text tool');
              e.stopPropagation();
              
              // Check if right-click is on existing text
              const { textElements } = useApp.getState();
              let rightClickedText: any = null;
              
              for (const txt of textElements) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) continue;
                
                let font = '';
                if (txt.bold) font += 'bold ';
                if (txt.italic) font += 'italic ';
                font += `${txt.fontSize}px ${txt.fontFamily}`;
                tempCtx.font = font;
                
                const textPixelWidth = tempCtx.measureText(txt.text).width;
                const textPixelHeight = txt.fontSize * 1.2;
                const txtU = txt.u || 0.5;
                const txtV = txt.v || 0.5;
                
                const composedCanvas = useApp.getState().composedCanvas;
                // PHASE 1 FIX: Use performance manager canvas size as fallback
                const fallbackCanvasSize = unifiedPerformanceManager.getOptimalCanvasSize().width;
                const canvasDimensions = {
                  width: composedCanvas?.width || fallbackCanvasSize,
                  height: composedCanvas?.height || fallbackCanvasSize
                };
                
                const textWidth = textPixelWidth / canvasDimensions.width;
                const textHeight = textPixelHeight / canvasDimensions.height;
                
                // Simple hitbox check (can be refined)
                const hitboxMultiplier = 1.5;
                if (
                  clickU >= txtU - textWidth * hitboxMultiplier / 2 &&
                  clickU <= txtU + textWidth * hitboxMultiplier / 2 &&
                  clickV >= txtV - textHeight * hitboxMultiplier / 2 &&
                  clickV <= txtV + textHeight * hitboxMultiplier / 2
                ) {
                  rightClickedText = txt;
                  break;
                }
              }
              
              if (rightClickedText) {
                // Show context menu at mouse position
                const mouseX = (e.nativeEvent as MouseEvent).clientX;
                const mouseY = (e.nativeEvent as MouseEvent).clientY;
                
                setContextMenu({
                  visible: true,
                  x: mouseX,
                  y: mouseY,
                  textId: rightClickedText.id
                });
                
                console.log('📋 Context menu opened for text:', rightClickedText.text);
              }
              
              return; // Don't process as normal click
            }
            
            // Check if click is on any existing text element (LEFT CLICK)
            const { textElements, activeTextId, setActiveTextId, updateTextElement } = useApp.getState();
            let clickedText: any = null;
            
            console.log('🎨 Text tool: Checking', textElements.length, 'text elements');
            
            for (const txt of textElements) {
              // CRITICAL: Calculate ACTUAL text bounds using canvas measureText (same as App.tsx border rendering)
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              if (!tempCtx) continue;
              
              // Set font to match text rendering
              let font = '';
              if (txt.bold) font += 'bold ';
              if (txt.italic) font += 'italic ';
              font += `${txt.fontSize}px ${txt.fontFamily}`;
              tempCtx.font = font;
              
              // Measure ACTUAL text width
              const textPixelWidth = tempCtx.measureText(txt.text).width;
              const textPixelHeight = txt.fontSize * 1.2;
              
              const txtU = txt.u || 0.5;
              const txtV = txt.v || 0.5;
              
              // Use standardized coordinate conversion
              const canvasDimensions = getCanvasDimensions();
              
              // SIMPLIFIED hitbox detection for better reliability
              const textWidth = textPixelWidth / canvasDimensions.width;
              const textHeight = textPixelHeight / canvasDimensions.height;
              
              console.log('🎨 Checking text:', txt.text, 'at UV:', txtU, txtV, 'bounds:', textWidth, 'x', textHeight);
              
              // Use a more generous hitbox multiplier for easier clicking
              const hitboxMultiplier = 1.5;
              
              const hitboxWidthUV = textWidth * hitboxMultiplier;
              const hitboxHeightUV = textHeight * hitboxMultiplier;
              
              console.log('🎨 Hitbox check for text "' + txt.text + '":');
              console.log('  Click UV:', clickU, clickV);
              console.log('  Text center UV:', txtU, txtV);
              console.log('  Hitbox size UV:', hitboxWidthUV, hitboxHeightUV);
              console.log('  Hitbox bounds:', 
                'U:', txtU - hitboxWidthUV/2, 'to', txtU + hitboxWidthUV/2,
                'V:', txtV - hitboxHeightUV/2, 'to', txtV + hitboxHeightUV/2
              );
              
              // Simple hitbox check without rotation complexity
              if (
                clickU >= txtU - hitboxWidthUV / 2 &&
                clickU <= txtU + hitboxWidthUV / 2 &&
                clickV >= txtV - hitboxHeightUV / 2 &&
                clickV <= txtV + hitboxHeightUV / 2
              ) {
                console.log('✅ HIT! Found clicked text:', txt.text);
                clickedText = txt;
                break;
              } else {
                console.log('❌ MISS! Click outside hitbox for text:', txt.text);
              }
            }
            
            if (!clickedText) {
              console.log('❌ No text found at click position');
              console.log('🎨 Text tool: Clicked empty area - checking if text is selected');
            } else {
              console.log('✅ Text click detected! Text:', clickedText.text, 'ID:', clickedText.id);
            }
            
            // CRITICAL: If text is already selected, don't show prompt - just deselect
            const { activeTextId: currentActiveId } = useApp.getState();
            if (!clickedText && currentActiveId) {
              console.log('🎨 Text tool: Deselecting current text (clicked empty area)');
              setActiveTextId(null);
              return;
            }
            
            if (clickedText) {
              // ===== CLICKED ON EXISTING TEXT - SELECT IT =====
              console.log('🎨 Text tool: Clicked on existing text:', clickedText.id);
              
              // CRITICAL: If clicking on already-selected text, don't re-select (just allow anchor interaction)
              if (currentActiveId === clickedText.id) {
                console.log('🎨 Text tool: Text already selected, allowing anchor interaction only');
                // Don't re-set activeTextId, just continue to anchor detection
              } else {
                // CRITICAL: Select the text FIRST
                console.log('🔍 DEBUG: Setting activeTextId to:', clickedText.id);
                setActiveTextId(clickedText.id);
              }
              
              // Verify the selection was set
              setTimeout(() => {
                const { activeTextId: verifyId } = useApp.getState();
                console.log('🔍 DEBUG: Verified activeTextId after set:', verifyId);
              }, 100);
              
              // CRITICAL: Stop event propagation to prevent double triggers
              if (e.stopPropagation) e.stopPropagation();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();
              
              // If locked, just select and return
              if (clickedText.locked) {
                console.log('🎨 Text tool: Text is locked, cannot interact');
                return;
              }
              
              // Check if clicked on resize anchor - use ACTUAL text bounds
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              if (!tempCtx) return;
              
              let font = '';
              if (clickedText.bold) font += 'bold ';
              if (clickedText.italic) font += 'italic ';
              font += `${clickedText.fontSize}px ${clickedText.fontFamily}`;
              tempCtx.font = font;
              
              const textPixelWidth = tempCtx.measureText(clickedText.text).width;
              const textPixelHeight = clickedText.fontSize * 1.2;
              const txtU = clickedText.u || 0.5;
              const txtV = clickedText.v || 0.5;
              
              // CRITICAL: Get actual canvas size from state (same as App.tsx uses)
              const composedCanvas = useApp.getState().composedCanvas;
const canvasDimensions = {
                  width: composedCanvas?.width || unifiedPerformanceManager.getOptimalCanvasSize().width,
                  height: composedCanvas?.height || unifiedPerformanceManager.getOptimalCanvasSize().width
                };
              
              // CRITICAL: Calculate text position in pixel space (for rotation calculations)
              // These are used for rotation handle and rotation calculations
              const x = Math.round(txtU * canvasDimensions.width);
              const y = Math.round((1 - txtV) * canvasDimensions.height);
              
              // CRITICAL: Use EXACT SAME calculation as AdvancedLayerSystemV2.ts border rendering
              // The border uses selectedTextEl.x and flippedY directly, so we need to match that
              // Text element has .x and .y in pixel coordinates (from UV conversion during creation)
              const textXPixels = clickedText.x || x; // Use text element's x or fallback to calculated x
              const textYPixels = clickedText.y || y; // Use text element's y or fallback to calculated y
              
              // Calculate flippedY (same as border rendering)
              const canvasHeight = canvasDimensions.height;
              const flippedY = canvasHeight - textYPixels;
              
              // Calculate border position (EXACT SAME as AdvancedLayerSystemV2.ts lines 2824-2842)
              let borderXPixels: number;
              let borderYPixels: number;
              
              if (clickedText.align === 'left') {
                // Left align: text starts at x, flippedY
                borderXPixels = textXPixels;
                borderYPixels = flippedY;
              } else if (clickedText.align === 'right') {
                // Right align: text ends at x, flippedY
                borderXPixels = textXPixels - textPixelWidth;
                borderYPixels = flippedY;
              } else {
                // Center align: text is centered at x, flippedY
                borderXPixels = textXPixels - (textPixelWidth / 2);
                borderYPixels = flippedY;
              }
              
              // Convert to UV for hitbox calculations
              const textWidth = textPixelWidth / canvasDimensions.width;
              const textHeight = textPixelHeight / canvasDimensions.height;
              
              console.log('🎨 Text anchor check - Using EXACT border calculation:', {
                textXPixels,
                textYPixels,
                flippedY,
                borderXPixels,
                borderYPixels,
                textPixelWidth,
                textPixelHeight
              });
              
              // Match visual anchor sizes from AdvancedLayerSystemV2.ts EXACTLY
              const cornerAnchorSize = 12; // 12px square (visual size)
              const edgeAnchorSize = 10;   // 10px diameter circle (visual size)
              
              // CRITICAL: Hitbox matches EXACT visual size - no larger hitbox
              // Corner anchors are 12px squares, so hitbox is 6px radius (half of 12px)
              const cornerHitboxRadius = cornerAnchorSize / 2; // 6px (exact match to visual)
              // Edge anchors are 10px circles, so hitbox is 5px radius (half of 10px)
              const edgeHitboxRadius = edgeAnchorSize / 2;   // 5px (exact match to visual)
              
              // CRITICAL: Anchor positions match EXACTLY where they're drawn in AdvancedLayerSystemV2.ts
              // The anchors are drawn at border corners in the FLIPPED coordinate system
              // So we calculate them in the same flipped coordinate system
              const topLeftPixelX = borderXPixels;
              const topLeftPixelY = borderYPixels;
              const topRightPixelX = borderXPixels + textPixelWidth;
              const topRightPixelY = borderYPixels;
              const bottomLeftPixelX = borderXPixels;
              const bottomLeftPixelY = borderYPixels + textPixelHeight;
              const bottomRightPixelX = borderXPixels + textPixelWidth;
              const bottomRightPixelY = borderYPixels + textPixelHeight;
              
              // Edge anchor positions (at border edges)
              const topEdgePixelX = borderXPixels + textPixelWidth / 2;
              const topEdgePixelY = borderYPixels;
              const bottomEdgePixelX = borderXPixels + textPixelWidth / 2;
              const bottomEdgePixelY = borderYPixels + textPixelHeight;
              const leftEdgePixelX = borderXPixels;
              const leftEdgePixelY = borderYPixels + textPixelHeight / 2;
              const rightEdgePixelX = borderXPixels + textPixelWidth;
              const rightEdgePixelY = borderYPixels + textPixelHeight / 2;
              
              // Get rotation for cursor calculation (use textRotation to avoid conflict with later declaration)
              const textRotation = clickedText.rotation || 0;
              
              // Helper function to get cursor for anchor (accounting for rotation)
              // Use the same rotation-aware cursor logic as in onPointerMove
              const rotationDeg = (textRotation * 180 / Math.PI) % 360;
              const getRotatedCursor = (baseCursor: string, anchorName: string): string => {
                if (textRotation === 0 || Math.abs(textRotation) < 0.01) {
                  return baseCursor; // No rotation, use base cursor
                }
                
                // Map base cursors to angles (0° = North, 90° = East, etc.)
                const cursorAngles: {[key: string]: number} = {
                  'n-resize': 0,
                  'ne-resize': 45,
                  'e-resize': 90,
                  'se-resize': 135,
                  's-resize': 180,
                  'sw-resize': 225,
                  'w-resize': 270,
                  'nw-resize': 315
                };
                
                const baseAngle = cursorAngles[baseCursor] || 0;
                let newAngle = (baseAngle + rotationDeg) % 360;
                if (newAngle < 0) newAngle += 360;
                
                // Map angle back to cursor
                let resultCursor = baseCursor;
                if (newAngle >= 337.5 || newAngle < 22.5) resultCursor = 'n-resize';
                else if (newAngle >= 22.5 && newAngle < 67.5) resultCursor = 'ne-resize';
                else if (newAngle >= 67.5 && newAngle < 112.5) resultCursor = 'e-resize';
                else if (newAngle >= 112.5 && newAngle < 157.5) resultCursor = 'se-resize';
                else if (newAngle >= 157.5 && newAngle < 202.5) resultCursor = 's-resize';
                else if (newAngle >= 202.5 && newAngle < 247.5) resultCursor = 'sw-resize';
                else if (newAngle >= 247.5 && newAngle < 292.5) resultCursor = 'w-resize';
                else if (newAngle >= 292.5 && newAngle < 337.5) resultCursor = 'nw-resize';
                
                return resultCursor;
              };
              
              // CRITICAL: Convert anchor pixel positions to UV coordinates
              // Anchors are calculated in FLIPPED pixel space (borderYPixels = flippedY)
              // But UV coordinates are in NORMAL space (V=0 at top, V=1 at bottom)
              // Since borderYPixels is already in flipped space, we convert: v = pixelY / height
              const anchors = [
                // Corner anchors (check these first for priority) with hitbox radius in pixels and cursor
                { name: 'topLeft', u: topLeftPixelX / canvasDimensions.width, v: topLeftPixelY / canvasDimensions.height, hitboxPx: cornerHitboxRadius, cursor: getRotatedCursor('nw-resize', 'topLeft') },
                { name: 'topRight', u: topRightPixelX / canvasDimensions.width, v: topRightPixelY / canvasDimensions.height, hitboxPx: cornerHitboxRadius, cursor: getRotatedCursor('ne-resize', 'topRight') },
                { name: 'bottomLeft', u: bottomLeftPixelX / canvasDimensions.width, v: bottomLeftPixelY / canvasDimensions.height, hitboxPx: cornerHitboxRadius, cursor: getRotatedCursor('sw-resize', 'bottomLeft') },
                { name: 'bottomRight', u: bottomRightPixelX / canvasDimensions.width, v: bottomRightPixelY / canvasDimensions.height, hitboxPx: cornerHitboxRadius, cursor: getRotatedCursor('se-resize', 'bottomRight') },
                // Edge anchors (check these after corners) with hitbox radius in pixels and cursor
                { name: 'top', u: topEdgePixelX / canvasDimensions.width, v: topEdgePixelY / canvasDimensions.height, hitboxPx: edgeHitboxRadius, cursor: getRotatedCursor('n-resize', 'top') },
                { name: 'bottom', u: bottomEdgePixelX / canvasDimensions.width, v: bottomEdgePixelY / canvasDimensions.height, hitboxPx: edgeHitboxRadius, cursor: getRotatedCursor('s-resize', 'bottom') },
                { name: 'left', u: leftEdgePixelX / canvasDimensions.width, v: leftEdgePixelY / canvasDimensions.height, hitboxPx: edgeHitboxRadius, cursor: getRotatedCursor('w-resize', 'left') },
                { name: 'right', u: rightEdgePixelX / canvasDimensions.width, v: rightEdgePixelY / canvasDimensions.height, hitboxPx: edgeHitboxRadius, cursor: getRotatedCursor('e-resize', 'right') }
              ];
              
              console.log('🎨 DEBUG ANCHOR POSITIONS:');
              console.log('  Text UV:', txtU, txtV);
              console.log('  Text pixel:', x, y);
              console.log('  Text pixel dimensions:', textPixelWidth, 'x', textPixelHeight);
              console.log('  Border offset (pixels):', borderXPixels, borderYPixels);
              console.log('  TopLeft pixel (absolute):', topLeftPixelX, topLeftPixelY);
              console.log('  TopLeft UV (calculated):', anchors[0].u, anchors[0].v);
              console.log('  TopRight pixel (absolute):', topRightPixelX, topRightPixelY);
              console.log('  TopRight UV (calculated):', anchors[1].u, anchors[1].v);
              console.log('  Click UV:', clickU, clickV);
              console.log('  Corner hitbox:', cornerHitboxRadius, 'px, Edge hitbox:', edgeHitboxRadius, 'px');
              
              // CRITICAL: Transform click point to text's local coordinate system (accounting for rotation)
              const rotation = clickedText.rotation || 0;
              let localClickU = clickU;
              let localClickV = clickV;
              
              if (rotation !== 0) {
                // Convert click UV to pixels
                const clickPixelX = clickU * canvasDimensions.width;
                const clickPixelY = (1 - clickV) * canvasDimensions.height;
                
                // Translate to text origin
                const relX = clickPixelX - x;
                const relY = clickPixelY - y;
                
                // Rotate by -rotation to get into text's local space
                const cosR = Math.cos(-rotation);
                const sinR = Math.sin(-rotation);
                const localX = relX * cosR - relY * sinR;
                const localY = relX * sinR + relY * cosR;
                
                // Convert back to UV coordinates
                localClickU = (x + localX) / canvasDimensions.width;
                localClickV = 1 - ((y + localY) / canvasDimensions.height);
              }
              
              // ROTATION HANDLE: Check if clicking on rotation handle (PRIORITY - check before anchors)
              const rotationHandleDistance = 40; // Same as in AdvancedLayerSystemV2.ts
              const rotationHandleSize = 12; // Same as in AdvancedLayerSystemV2.ts (12px diameter circle)
              const rotationHandleRadius = rotationHandleSize / 2; // 6px radius (exact match to visual)
              // Rotation handle is positioned relative to text center (textXPixels, flippedY)
              const rotationHandlePixelX = textXPixels;
              const rotationHandlePixelY = flippedY - textPixelHeight / 2 - rotationHandleDistance;
              // Convert to UV: rotationHandlePixelY is in flipped space, so v = pixelY / height
              const rotationHandleU = rotationHandlePixelX / canvasDimensions.width;
              const rotationHandleV = rotationHandlePixelY / canvasDimensions.height;
              
              const rotationHandleDist = Math.sqrt(Math.pow(localClickU - rotationHandleU, 2) + Math.pow(localClickV - rotationHandleV, 2));
              // CRITICAL: Hitbox matches EXACT visual size - rotation handle is 12px circle = 6px radius
              const rotationHandleHitbox = rotationHandleRadius / canvasDimensions.width; // Exact match to visual
              
              console.log('🔄 Rotation handle check:');
              console.log('  Handle position (pixels):', rotationHandlePixelX, rotationHandlePixelY);
              console.log('  Handle UV:', rotationHandleU, rotationHandleV);
              console.log('  Click UV (original):', clickU, clickV);
              console.log('  Click UV (local/rotated):', localClickU, localClickV);
              console.log('  Distance:', rotationHandleDist);
              console.log('  Hitbox threshold:', rotationHandleHitbox);
              console.log('  Will trigger:', rotationHandleDist < rotationHandleHitbox ? 'YES ✅' : 'NO ❌');
              
              if (rotationHandleDist < rotationHandleHitbox) {
                // Start rotating!
                console.log('🔄 ========== ROTATION HANDLE CLICKED! ==========');
                (window as any).__textRotating = true;
                (window as any).__textResizing = false; // Ensure resize is OFF
                (window as any).__textDragging = false; // Ensure drag is OFF
                (window as any).__textRotateStart = {
                  textId: clickedText.id,
                  initialRotation: clickedText.rotation || 0,
                  centerU: txtU,
                  centerV: txtV,
                  startU: clickU,
                  startV: clickV
                };
                setControlsEnabled(false);
                e.stopPropagation();
                return;
              }
              
              let clickedAnchor = null;
              console.log('🎨 ========== ANCHOR DETECTION ==========');
              console.log('🎨 Click UV (original):', clickU, clickV);
              console.log('🎨 Click UV (local/rotated):', localClickU, localClickV);
              console.log('🎨 Text rotation:', rotation, 'radians =', (rotation * 180 / Math.PI).toFixed(1), '°');
              
              // CRITICAL FIX: Transform anchor positions to rotated coordinate system
              // OR check clicks in original coordinate system - using original for consistency
              // When text is rotated, we need to check anchors in the ORIGINAL coordinate system
              // because anchors are calculated in pixel space which is not rotated
              const checkClickU = rotation !== 0 ? clickU : localClickU; // Use original if rotated
              const checkClickV = rotation !== 0 ? clickV : localClickV;
              
              // Calculate consistent hitbox sizes in UV space
              const cornerHitboxUV = cornerHitboxRadius / canvasDimensions.width;
              const edgeHitboxUV = edgeHitboxRadius / canvasDimensions.width;
              console.log('🎨 Corner hitbox UV:', cornerHitboxUV.toFixed(6), 'Edge hitbox UV:', edgeHitboxUV.toFixed(6));
              console.log('🎨 Using check coordinates (original for rotated text):', checkClickU.toFixed(4), checkClickV.toFixed(4));
              
              for (const anchor of anchors) {
                // CRITICAL: For rotated text, anchors are in original coordinate system
                // So we check against original click coordinates, not rotated ones
                const dist = Math.sqrt(Math.pow(checkClickU - anchor.u, 2) + Math.pow(checkClickV - anchor.v, 2));
                const distPixels = dist * canvasDimensions.width;
                
                // Use consistent hitbox size based on anchor type
                const isCornerAnchor = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(anchor.name);
                const hitboxUV = isCornerAnchor ? cornerHitboxUV : edgeHitboxUV;
                const willHit = dist < hitboxUV;
                
                console.log(`🎨 Anchor ${anchor.name}:`, 
                  'UV:', anchor.u.toFixed(4), anchor.v.toFixed(4),
                  'Distance:', dist.toFixed(6), '(' + distPixels.toFixed(1) + 'px)',
                  'Hitbox UV:', hitboxUV.toFixed(6), '(' + (hitboxUV * canvasDimensions.width).toFixed(1) + 'px)',
                  willHit ? '✅ HIT!' : '❌ miss'
                );
                if (willHit) {
                  clickedAnchor = anchor.name;
                  console.log('✅ ========== ANCHOR CLICKED:', anchor.name, '==========');
                  break;
                }
              }
              
              if (!clickedAnchor) {
                console.log('❌ No anchor clicked');
              }
              
              if (clickedAnchor) {
                // Start resizing (same as image tool - store anchor name and all dimensions)
                console.log('🎨 Text tool: ===== STARTING RESIZE MODE =====');
                console.log('🎨 Anchor:', clickedAnchor);
                (window as any).__textResizing = true;
                (window as any).__textDragging = false; // Ensure drag is OFF
                (window as any).__textResizeStart = {
                  textId: clickedText.id,
                  anchor: clickedAnchor, // Store anchor name (topLeft, topRight, etc.)
                  u: clickU,               // Current mouse position
                  v: clickV,
                  txtU: clickedText.u || 0.5,  // Text position
                  txtV: clickedText.v || 0.5,
                  txtWidth: textWidth,     // Text dimensions in UV space
                  txtHeight: textHeight,
                  originalFontSize: clickedText.fontSize
                };
                
                // CRITICAL FIX: Properly disable 3D controls to prevent model rotation during resize
                setControlsEnabled(false);
                useApp.setState({ controlsEnabled: false });
                
                // CRITICAL: Stop event propagation to prevent text input prompt
                if (e.stopPropagation) e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                if (e.nativeEvent?.stopPropagation) e.nativeEvent.stopPropagation();
                if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
                
                // Force immediate state synchronization
                setTimeout(() => {
                  const currentState = useApp.getState().controlsEnabled;
                  console.log('🎨 Resize mode activated. Controls disabled to prevent model rotation. State:', currentState);
                  
                  // Dispatch event to force OrbitControls update
                  window.dispatchEvent(new CustomEvent('controlsStateChanged', {
                    detail: { enabled: false, reason: 'text-resizing' }
                  }));
                }, 0);
                console.log('🎨 Drag mode:', (window as any).__textDragging, 'Resize mode:', (window as any).__textResizing);
                
                // CRITICAL: Return immediately to prevent text input prompt or any other handlers
                return;
              } else {
                // Start dragging - SAME AS IMAGE TOOL
                console.log('🎨 Text tool: ===== STARTING DRAG MODE =====');
                console.log('🎨 Text tool: clickedText:', clickedText);
                console.log('🎨 Text tool: clickedText.u:', clickedText.u, 'clickedText.v:', clickedText.v);
                (window as any).__textDragging = true;
                (window as any).__textResizing = false; // Ensure resize is OFF
                (window as any).__textDragStart = {
                  u: clickU,  // Current mouse position
                  v: clickV,
                  txtU: clickedText.u || 0.5,  // Text position
                  txtV: clickedText.v || 0.5,
                  textId: clickedText.id
                };
                
                // CRITICAL FIX: Properly disable 3D controls to prevent model rotation
                setControlsEnabled(false);
                useApp.setState({ controlsEnabled: false });
                
                // Force immediate state synchronization
                setTimeout(() => {
                  const currentState = useApp.getState().controlsEnabled;
                  console.log('🎨 Drag mode activated! Controls disabled to prevent model rotation. State:', currentState);
                  
                  // Dispatch event to force OrbitControls update
                  window.dispatchEvent(new CustomEvent('controlsStateChanged', {
                    detail: { enabled: false, reason: 'text-dragging' }
                  }));
                }, 0);
                console.log('🎨 __textDragging:', (window as any).__textDragging);
                console.log('🎨 __textResizing:', (window as any).__textResizing);
                console.log('🎨 __textDragStart:', (window as any).__textDragStart);
              }
              
              // CRITICAL: Return here to prevent prompt from showing
              // This ensures that clicking on selected text (even if no anchor is hit) doesn't create new text
              console.log('🎨 Text tool: Clicked on text, returning early to prevent new text creation');
              return;
            } else {
              // No text clicked - create new text
              // CRITICAL: Also check if text is already selected - if so, don't create new text
              const { activeTextId: checkActiveId } = useApp.getState();
              if (checkActiveId) {
                console.log('🎨 Text tool: Text already selected, not creating new text on empty click');
                return;
              }
              
              // CRITICAL: Prevent double prompts with timestamp check
              const now = Date.now();
              if (now - lastTextPromptTimeRef.current < 500) {
                console.log('🎨 Text tool: Skipping - prompt triggered too soon (within 500ms)');
                return;
              }
              
              // CRITICAL: Don't show prompt if any text is already selected
              const { activeTextId } = useApp.getState();
              console.log('🎨 Text tool: Checking activeTextId:', activeTextId);
              if (activeTextId) {
                console.log('🎨 Text tool: Skipping - text already selected, click empty area to deselect first');
                return;
              }
              
              // CRITICAL: Stop all event propagation to prevent double triggers
              if (e.stopPropagation) e.stopPropagation();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();
              if (e.nativeEvent?.stopPropagation) e.nativeEvent.stopPropagation();
              if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
              
              // Prevent double prompts with flag
              if (textPromptActiveRef.current) {
                console.log('🎨 Text tool: Skipping - prompt already active');
                return;
              }
              
              console.log('🎨 Text tool: About to show prompt - activeTextId check passed');
              console.log('🎨 Text tool: Creating new text');
              textPromptActiveRef.current = true;
              lastTextPromptTimeRef.current = now;
              
          const defaultText = useApp.getState().lastText || '';
          const userText = window.prompt('Enter text:', defaultText);
              
              setTimeout(() => {
                textPromptActiveRef.current = false;
              }, 100);
          
          if (userText) {
            useApp.setState({ lastText: userText });
            
              try {
                console.log('🎨 Adding text element:', userText);
                setControlsEnabled(false);
                
                const appState = useApp.getState();
                if (appState.addTextElement) {
                    // Use standardized UV coordinate conversion
                    const textUV = { u: uv.x, v: 1 - uv.y };
                    const textId = appState.addTextElement(userText, textUV);
                  console.log('🎨 Text element added successfully with ID:', textId);
                  
                  // ✅ CRITICAL FIX: Automatically select the newly created text
                  appState.setActiveTextId(textId);
                  console.log('🎨 Text automatically selected:', textId);
                  
                  // 🚀 AUTOMATIC LAYER CREATION: Trigger layer creation for text
                  triggerTextCreated();
                  
                  setTimeout(() => {
                    if ((window as any).updateModelTexture) {
                      (window as any).updateModelTexture();
                    }
                  }, 100);
                } else {
                  console.error('🎨 addTextElement function not available');
                }
              } catch (error) {
                console.error('🎨 Error adding text element:', error);
            }
            
            console.log('🎨 Text tool: Re-enabling controls after text placement');
            setControlsEnabled(true);
              } else {
                // Deselect if cancelled
                setActiveTextId(null);
              }
            }
          }
        } else if ((activeTool as string) === 'image') {
          // Image tool - select or place images
          const uv = e.uv as THREE.Vector2 | undefined;
          if (uv) {
            const clickU = uv.x;
            const clickV = 1 - uv.y; // Flip V for texture space
            
            console.log('🎨 Image tool: Click at UV:', { u: clickU, v: clickV });
            
            // Check if click is on any image - CRITICAL FIX: Use layer system data like text tool
            const { setSelectedImageId } = useApp.getState();
            const v2State = useAdvancedLayerStoreV2.getState();
            const imageElements = v2State.getAllImageElements();
            let clickedImage: any = null;
            
            console.log('🎨 Image tool: Checking', imageElements.length, 'image elements from layer system');
            
            for (const img of imageElements) {
              if (!img.visible) continue;
              
              // SIMPLIFIED: Use unified bounds calculation
              const bounds = getImageBounds(img);
              
              // Simple hitbox detection using UV bounds
              const isWithinBounds = (
                clickU >= bounds.uvLeft &&
                clickU <= bounds.uvRight &&
                clickV >= bounds.uvTop &&
                clickV <= bounds.uvBottom
              );
              
              if (isWithinBounds) {
                clickedImage = img;
                console.log('🎨 Image tool: Hitbox detection successful', {
                  clickedUV: { u: clickU, v: clickV },
                  imageUV: { u: img.u, v: img.v },
                  imageSize: { width: img.width, height: img.height },
                  hitboxBounds: { 
                    uvLeft: bounds.uvLeft, 
                    uvTop: bounds.uvTop, 
                    uvRight: bounds.uvRight, 
                    uvBottom: bounds.uvBottom 
                  }
                });
                break;
              }
            }
            
            if (clickedImage) {
              console.log('🎨 Image tool: Clicked on image:', clickedImage.name);
              setSelectedImageId(clickedImage.id);
              
              if (!clickedImage.locked) {
                // CRITICAL FIX: Use unified bounds calculation for resize anchor detection
                // This ensures resize anchors are positioned exactly where the image bounds are
                const bounds = getImageBounds(clickedImage);
                const anchorSize = 0.04; // Anchor hitbox size
                
                // Calculate anchor positions using unified bounds
                const anchors = {
                  // Corner anchors
                  topLeft: { u: bounds.uvLeft - anchorSize/2, v: bounds.uvTop - anchorSize/2 },
                  topRight: { u: bounds.uvRight - anchorSize/2, v: bounds.uvTop - anchorSize/2 },
                  bottomLeft: { u: bounds.uvLeft - anchorSize/2, v: bounds.uvBottom - anchorSize/2 },
                  bottomRight: { u: bounds.uvRight - anchorSize/2, v: bounds.uvBottom - anchorSize/2 },
                  // Edge anchors
                  top: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvTop - anchorSize/2 },
                  bottom: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvBottom - anchorSize/2 },
                  left: { u: bounds.uvLeft - anchorSize/2, v: (bounds.uvTop + bounds.uvBottom)/2 - anchorSize/2 },
                  right: { u: bounds.uvRight - anchorSize/2, v: (bounds.uvTop + bounds.uvBottom)/2 - anchorSize/2 },
                  // Rotation anchor (above the image)
                  rotate: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvTop - anchorSize - 0.02 }
                };
                
                // Check which anchor was clicked (corners first, then edges)
                let clickedAnchor: string | null = null;
                for (const [anchorName, anchorPos] of Object.entries(anchors)) {
                  if (
                    clickU >= anchorPos.u &&
                    clickU <= anchorPos.u + anchorSize &&
                    clickV >= anchorPos.v &&
                    clickV <= anchorPos.v + anchorSize
                  ) {
                    clickedAnchor = anchorName;
                    break;
                  }
                }
                
                if (clickedAnchor) {
                  if (clickedAnchor === 'rotate') {
                    console.log('🎨 Image tool: Clicked on rotation anchor');
                    // Start rotating the image
                    (window as any).__imageRotating = true;
                    (window as any).__imageRotateStart = { 
                      u: clickU, 
                      v: clickV, 
                      imgU: clickedImage.u, 
                      imgV: 1 - clickedImage.v, // CRITICAL FIX: Store image V in same flipped coordinate system as clickV
                      imgRotation: clickedImage.rotation || 0,
                      imageId: clickedImage.id
                    };
                  } else {
                    console.log('🎨 Image tool: Clicked on resize anchor:', clickedAnchor);
                    // Start resizing the image
                    (window as any).__imageResizing = true;
                    (window as any).__imageResizeStart = { 
                      u: clickU, 
                      v: clickV, 
                      imgU: clickedImage.u, 
                      imgV: 1 - clickedImage.v, // CRITICAL FIX: Store image V in same flipped coordinate system as clickV
                      imgWidth: clickedImage.uWidth || 0.25,
                      imgHeight: clickedImage.uHeight || 0.25,
                      imageId: clickedImage.id,
                      anchor: clickedAnchor
                    };
                  }
      } else {
                  // Start dragging the image
                  console.log('🎨 Image tool: Started dragging image');
                  (window as any).__imageDragging = true;
                  (window as any).__imageDragStart = { 
                    u: clickU, 
                    v: clickV, 
                    imgU: clickedImage.u, 
                    imgV: 1 - clickedImage.v, // CRITICAL FIX: Store image V in same flipped coordinate system as clickV
                    imageId: clickedImage.id
                  };
                }
                
                // Disable controls during drag/resize
                setControlsEnabled(false);
              } else {
                console.log('🎨 Image tool: Image is locked, cannot drag');
              }
            } else {
              // PHASE 5 FIX: Simplified image tool - no click-to-place, just deselect
              console.log('🎨 Image tool: Clicked empty area - deselecting any selected image');
              
              // Note: Global deselection is now handled at the top of onPointerDown
              // This ensures deselection works regardless of active tool
              console.log('🎨 Image tool: Global deselection already handled');
            }
          }
        } else if (activeTool === 'shapes') {
          // CRITICAL: Prevent double shape creation with timestamp check
          const now = Date.now();
          if (now - lastTextPromptTimeRef.current < 500) {
            console.log('🎨 Shapes tool: Skipping - shape creation triggered too soon (within 500ms)');
            return;
          }
          
          // CRITICAL: Stop all event propagation to prevent double triggers
          if (e.stopPropagation) e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.nativeEvent?.stopPropagation) e.nativeEvent.stopPropagation();
          if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
          
          // Prevent double shape creation with flag
          if (textPromptActiveRef.current) {
            console.log('🎨 Shapes tool: Skipping - shape creation already active');
            return;
          }
          
          // Handle shapes tool - draw shape at click position
          console.log('🎨 Shapes tool: Handling shape placement');
          textPromptActiveRef.current = true;
          lastTextPromptTimeRef.current = now;
          
          // Get UV coordinates from the event
          const uv = e.uv as THREE.Vector2 | undefined;
          if (uv) {
            try {
              console.log('🎨 Adding shape element at UV:', uv.x, uv.y);
              
              // Get shape settings from store
              const appState = useApp.getState();
              const shapeSettings = {
                type: appState.shapeType || 'rectangle',
                size: appState.shapeSize || 50,
                opacity: appState.shapeOpacity || 1,
                color: appState.shapeColor || '#ff69b4',
                rotation: appState.shapeRotation || 0,
                positionX: uv.x * 100, // Convert UV to percentage
                positionY: uv.y * 100, // Convert UV to percentage
                gradient: null // Will be set based on color mode
              };
              
              // Check if gradient mode is active for shapes
              const gradientSettings = (window as any).getGradientSettings ? (window as any).getGradientSettings() : null;
              const isShapesGradientMode = gradientSettings && gradientSettings.shapes && gradientSettings.shapes.mode === 'gradient';
              
              if (isShapesGradientMode && gradientSettings) {
                shapeSettings.gradient = gradientSettings.shapes;
              }
              
              // Add shape element using the existing addShapeElement function
              if (appState.addShapeElement) {
                appState.addShapeElement(shapeSettings);
                console.log('🎨 Shape element added successfully');
                
                // Trigger texture update
                setTimeout(() => {
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture(true, true);
                  }
                }, 10);
              } else {
                console.error('🎨 addShapeElement function not found');
              }
            } catch (error) {
              console.error('🎨 Error adding shape element:', error);
            }
          } else {
            console.log('🎨 Shapes tool: No UV coordinates available');
          }
          
          // Reset flag after shape creation with a small delay to prevent rapid re-triggers
          setTimeout(() => {
            textPromptActiveRef.current = false;
          }, 100);
        } else if (activeTool === 'move') {
          // Handle move tool - move selected shape to click position
          console.log('🎨 Move tool: Handling shape movement');
          
          const appState = useApp.getState();
          const activeShapeId = appState.activeShapeId;
          
          if (!activeShapeId) {
            console.log('🎨 Move tool: No active shape selected');
            return;
          }
          
          // Get UV coordinates from the event
          const uv = e.uv as THREE.Vector2 | undefined;
          if (uv) {
            try {
              console.log('🎨 Moving shape to UV:', uv.x, uv.y);
              
              // Update shape position
              if (appState.updateShapeElement) {
                appState.updateShapeElement(activeShapeId, {
                  positionX: uv.x * 100, // Convert UV to percentage
                  positionY: uv.y * 100   // Convert UV to percentage
                });
                
                console.log('🎨 Shape moved successfully');
                
                // Trigger texture update
                setTimeout(() => {
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture(true, true);
                  }
                }, 10);
              } else {
                console.error('🎨 updateShapeElement function not found');
              }
            } catch (error) {
              console.error('🎨 Error moving shape:', error);
            }
          } else {
            console.log('🎨 Move tool: No UV coordinates available');
          }
        }
      } else {
        // Click is outside model - allow camera movement for vector/text/shapes/move tools
        console.log('🎨 Click outside model - allowing camera movement for', activeTool, 'tool');
      }
    }
  }, [activeTool, setControlsEnabled]);

  // PERFORMANCE: Throttled pointer move handler
  const onPointerMove = useCallback((() => {
    let lastMoveTime = 0;
    let lastTextureUpdateTime = 0;
    
    return (e: any) => {
      const now = Date.now();
      // Get current config dynamically for reactive performance settings
      const moveThrottle = performanceOptimizer.getConfig().deviceTier === 'low' ? 50 : 20; // 20fps or 50fps (reduced from 60fps)
      if (now - lastMoveTime < moveThrottle) return; // Throttle moves
      lastMoveTime = now;
      
      // PHASE 3: Handle stroke transform during drag
      const { transformMode } = useStrokeSelection.getState();
      if (transformMode && e.uv) {
        const uv = e.uv as THREE.Vector2;
        const { composedCanvas } = useApp.getState();
        if (composedCanvas) {
          const canvasX = uv.x * composedCanvas.width;
          const canvasY = uv.y * composedCanvas.height;
          const { updateTransform } = useStrokeSelection.getState();
          updateTransform({ x: canvasX, y: canvasY });
          return; // Don't process other actions during transform
        }
      }
      
      // Update cursor for image tool when hovering over anchors
      if ((activeTool as string) === 'image' && !(window as any).__imageDragging && !(window as any).__imageResizing && !(window as any).__imageRotating) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const hoverU = uv.x;
          const hoverV = 1 - uv.y; // Flip V for texture space
          
          // CRITICAL FIX: Use layer system data instead of App state
          const { selectedImageId } = useApp.getState();
          const v2State = useAdvancedLayerStoreV2.getState();
          const imageElements = v2State.getAllImageElements();
          const selectedImage = imageElements.find((img: any) => img.id === selectedImageId);
          
          if (selectedImage && selectedImage.visible) {
            // SIMPLIFIED: Use unified bounds calculation
            const bounds = getImageBounds(selectedImage);
            const anchorSize = 0.04; // Anchor hitbox size
            
            // Calculate anchor positions using unified bounds
            const anchors = {
              // Corner anchors
              topLeft: { u: bounds.uvLeft - anchorSize/2, v: bounds.uvTop - anchorSize/2, cursor: 'nw-resize' },
              topRight: { u: bounds.uvRight - anchorSize/2, v: bounds.uvTop - anchorSize/2, cursor: 'ne-resize' },
              bottomLeft: { u: bounds.uvLeft - anchorSize/2, v: bounds.uvBottom - anchorSize/2, cursor: 'sw-resize' },
              bottomRight: { u: bounds.uvRight - anchorSize/2, v: bounds.uvBottom - anchorSize/2, cursor: 'se-resize' },
              // Edge anchors
              top: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvTop - anchorSize/2, cursor: 'n-resize' },
              bottom: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvBottom - anchorSize/2, cursor: 's-resize' },
              left: { u: bounds.uvLeft - anchorSize/2, v: (bounds.uvTop + bounds.uvBottom)/2 - anchorSize/2, cursor: 'w-resize' },
              right: { u: bounds.uvRight - anchorSize/2, v: (bounds.uvTop + bounds.uvBottom)/2 - anchorSize/2, cursor: 'e-resize' },
              // Rotation anchor
              rotate: { u: (bounds.uvLeft + bounds.uvRight)/2 - anchorSize/2, v: bounds.uvTop - anchorSize - 0.02, cursor: 'grab' }
            };
            
            // Check if hovering over any anchor
            let overAnchor = false;
            for (const [anchorName, anchorData] of Object.entries(anchors)) {
              if (
                hoverU >= anchorData.u &&
                hoverU <= anchorData.u + anchorSize &&
                hoverV >= anchorData.v &&
                hoverV <= anchorData.v + anchorSize
              ) {
                document.body.style.cursor = anchorData.cursor;
                overAnchor = true;
                break;
              }
            }
            
            // If not over anchor but over image, show move cursor
            if (!overAnchor) {
              const isOverImage = 
                hoverU >= bounds.uvLeft &&
                hoverU <= bounds.uvRight &&
                hoverV >= bounds.uvTop &&
                hoverV <= bounds.uvBottom;
              
              if (isOverImage) {
                document.body.style.cursor = 'move';
              } else {
                document.body.style.cursor = 'default';
              }
            }
          } else {
            document.body.style.cursor = 'default';
          }
        }
      }
      
      // Update cursor for text tool when hovering over text/anchors
      // ONLY update cursor when pointer is over the canvas (inside onPointerMove)
      if (activeTool === 'text' && !(window as any).__textDragging && !(window as any).__textResizing && !(window as any).__textRotating) {
        // Throttle cursor updates to reduce fighting between frames
        const now = Date.now();
        if (!(window as any).__lastCursorUpdate) {
          (window as any).__lastCursorUpdate = 0;
        }
        
        // Only update cursor every 16ms (60fps) to prevent flickering but keep responsive
        const shouldUpdateCursor = (now - (window as any).__lastCursorUpdate) >= 16;
        if (shouldUpdateCursor) {
          (window as any).__lastCursorUpdate = now;
        }
        
        if (!shouldUpdateCursor) {
          return; // Skip cursor update completely
        }
        
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv && shouldUpdateCursor) {
          // We're inside the canvas, safe to change cursor
          const hoverU = uv.x;
          const hoverV = 1 - uv.y; // Flip V to match how text.v is stored
          
          const { textElements, activeTextId } = useApp.getState();
          
          // Check if hovering over ANY text (not just selected) - use ACTUAL bounds
          let hoveredText: any = null;
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            for (const txt of textElements) {
              // Measure ACTUAL text width
              let font = '';
              if (txt.bold) font += 'bold ';
              if (txt.italic) font += 'italic ';
              font += `${txt.fontSize}px ${txt.fontFamily}`;
              tempCtx.font = font;
              
              const textPixelWidth = tempCtx.measureText(txt.text).width;
              const textPixelHeight = txt.fontSize * 1.2;
              const txtU = txt.u || 0.5;
              const txtV = txt.v || 0.5;
              
              // CRITICAL: Get actual canvas size from state (same as App.tsx uses)
              const composedCanvas = useApp.getState().composedCanvas;
const canvasDimensions = {
                  width: composedCanvas?.width || unifiedPerformanceManager.getOptimalCanvasSize().width,
                  height: composedCanvas?.height || unifiedPerformanceManager.getOptimalCanvasSize().width
                };
              
              // CRITICAL: Calculate canvas pixel position
              const textX = Math.round(txtU * canvasDimensions.width);
              const textY = Math.round((1 - txtV) * canvasDimensions.height);
              
              // CRITICAL: Account for rotation - transform hover point to text's local coordinate system
              const rotation = txt.rotation || 0;
              let localHoverU = hoverU;
              let localHoverV = hoverV;
              
              if (rotation !== 0) {
                // Convert hover UV to pixels
                const hoverPixelX = hoverU * canvasDimensions.width;
                const hoverPixelY = (1 - hoverV) * canvasDimensions.height;
                
                // Translate to text origin
                const relX = hoverPixelX - textX;
                const relY = hoverPixelY - textY;
                
                // Rotate by -rotation to get into text's local space
                const cosR = Math.cos(-rotation);
                const sinR = Math.sin(-rotation);
                const localX = relX * cosR - relY * sinR;
                const localY = relX * sinR + relY * cosR;
                
                // Convert back to UV coordinates
                localHoverU = (textX + localX) / canvasDimensions.width;
                localHoverV = 1 - ((textY + localY) / canvasDimensions.height);
              }
              
              // CRITICAL: Use EXACT SAME formula as App.tsx border rendering (lines 3186-3196)
              let borderXPixels = 0;
              if (txt.align === 'left') {
                borderXPixels = textPixelWidth / 2; // Text starts at 0, so border center is at width/2
              } else if (txt.align === 'right') {
                borderXPixels = -textPixelWidth / 2; // Text ends at 0, so border center is at -width/2
              } else {
                borderXPixels = 0; // Center alignment (default)
              }
              
              // Border Y position (textBaseline is 'top', so border top is at 0)
              const borderYPixels = textPixelHeight / 2; // Center border vertically
              
              // Convert to UV for hitbox calculations
              const textWidth = textPixelWidth / canvasDimensions.width;
              const textHeight = textPixelHeight / canvasDimensions.height;
              
              // CRITICAL: Calculate border center in PIXEL space, then convert to UV (using textX, textY already calculated above)
              const borderCenterPixelX = textX + borderXPixels;
              const borderCenterPixelY = textY + borderYPixels;
              const centerU = borderCenterPixelX / canvasDimensions.width;
              const centerV = 1 - (borderCenterPixelY / canvasDimensions.height); // Flip Y when converting to UV
              
              const isOverText = 
                localHoverU >= centerU - textWidth / 2 &&
                localHoverU <= centerU + textWidth / 2 &&
                localHoverV >= centerV - textHeight / 2 &&
                localHoverV <= centerV + textHeight / 2;
              
              if (isOverText) {
                hoveredText = txt;
                break;
              }
            }
          }
          
          // If hovering over selected text, check for anchors
          if (hoveredText && hoveredText.id === activeTextId && tempCtx) {
            let font = '';
            if (hoveredText.bold) font += 'bold ';
            if (hoveredText.italic) font += 'italic ';
            font += `${hoveredText.fontSize}px ${hoveredText.fontFamily}`;
            tempCtx.font = font;
            
            const textPixelWidth = tempCtx.measureText(hoveredText.text).width;
            const textPixelHeight = hoveredText.fontSize * 1.2;
            const txtU = hoveredText.u || 0.5;
            const txtV = hoveredText.v || 0.5;
            
            // CRITICAL: Get actual canvas size from state (same as App.tsx uses)
            const composedCanvas = useApp.getState().composedCanvas;
const canvasDimensions = {
                  width: composedCanvas?.width || unifiedPerformanceManager.getOptimalCanvasSize().width,
                  height: composedCanvas?.height || unifiedPerformanceManager.getOptimalCanvasSize().width
                };
            
            // CRITICAL: Calculate text position in pixel space (for rotation calculations)
            // These are used for rotation handle and rotation calculations
            const textX = Math.round(txtU * canvasDimensions.width);
            const textY = Math.round((1 - txtV) * canvasDimensions.height);
            
            // CRITICAL: Use EXACT SAME calculation as AdvancedLayerSystemV2.ts border rendering
            // The border uses selectedTextEl.x and flippedY directly, so we need to match that
            // Text element has .x and .y in pixel coordinates (from UV conversion during creation)
            const textXPixels = hoveredText.x || textX; // Use text element's x or fallback to calculated x
            const textYPixels = hoveredText.y || textY; // Use text element's y or fallback to calculated y
            
            // Calculate flippedY (same as border rendering)
            const canvasHeight = canvasDimensions.height;
            const flippedY = canvasHeight - textYPixels;
            
            // Calculate border position (EXACT SAME as AdvancedLayerSystemV2.ts lines 2824-2842)
            let borderXPixels: number;
            let borderYPixels: number;
            
            if (hoveredText.align === 'left') {
              // Left align: text starts at x, flippedY
              borderXPixels = textXPixels;
              borderYPixels = flippedY;
            } else if (hoveredText.align === 'right') {
              // Right align: text ends at x, flippedY
              borderXPixels = textXPixels - textPixelWidth;
              borderYPixels = flippedY;
            } else {
              // Center align: text is centered at x, flippedY
              borderXPixels = textXPixels - (textPixelWidth / 2);
              borderYPixels = flippedY;
            }
            
            // Convert to UV for hitbox calculations
            const textWidth = textPixelWidth / canvasDimensions.width;
            const textHeight = textPixelHeight / canvasDimensions.height;
            
            // Match visual anchor sizes from AdvancedLayerSystemV2.ts EXACTLY
            const cornerAnchorSize = 12; // 12px square (visual size)
            const edgeAnchorSize = 10;   // 10px diameter circle (visual size)
            
            // CRITICAL: Hitbox matches EXACT visual size - no larger hitbox
            // Corner anchors are 12px squares, so hitbox is 6px radius (half of 12px)
            const cornerHitboxRadius = cornerAnchorSize / 2; // 6px (exact match to visual)
            // Edge anchors are 10px circles, so hitbox is 5px radius (half of 10px)
            const edgeHitboxRadius = edgeAnchorSize / 2;   // 5px (exact match to visual)
            
            // CRITICAL: Anchor positions match EXACTLY where they're drawn in AdvancedLayerSystemV2.ts
            // The anchors are drawn at border corners in the FLIPPED coordinate system
            const topLeftPixelX = borderXPixels;
            const topLeftPixelY = borderYPixels;
            const topRightPixelX = borderXPixels + textPixelWidth;
            const topRightPixelY = borderYPixels;
            const bottomLeftPixelX = borderXPixels;
            const bottomLeftPixelY = borderYPixels + textPixelHeight;
            const bottomRightPixelX = borderXPixels + textPixelWidth;
            const bottomRightPixelY = borderYPixels + textPixelHeight;
            
            // Edge anchor positions (at border edges)
            const topEdgePixelX = borderXPixels + textPixelWidth / 2;
            const topEdgePixelY = borderYPixels;
            const bottomEdgePixelX = borderXPixels + textPixelWidth / 2;
            const bottomEdgePixelY = borderYPixels + textPixelHeight;
            const leftEdgePixelX = borderXPixels;
            const leftEdgePixelY = borderYPixels + textPixelHeight / 2;
            const rightEdgePixelX = borderXPixels + textPixelWidth;
            const rightEdgePixelY = borderYPixels + textPixelHeight / 2;
            
            // ROTATION-AWARE CURSORS: Calculate cursor direction based on text rotation
            // When text is rotated, the visual direction of anchors changes!
            const rotation = hoveredText.rotation || 0;
            const rotationDeg = (rotation * 180 / Math.PI) % 360;
            
            // Helper function to get rotation-adjusted cursor
            const getRotatedCursor = (baseCursor: string, anchorName: string): string => {
              if (rotation === 0 || Math.abs(rotation) < 0.01) {
                console.log(`🔄 No rotation - ${anchorName}: ${baseCursor}`);
                return baseCursor; // No rotation, use base cursor
              }
              
              // Map base cursors to angles (0° = North, 90° = East, etc.)
              const cursorAngles: {[key: string]: number} = {
                'n-resize': 0,
                'ne-resize': 45,
                'e-resize': 90,
                'se-resize': 135,
                's-resize': 180,
                'sw-resize': 225,
                'w-resize': 270,
                'nw-resize': 315
              };
              
              const baseAngle = cursorAngles[baseCursor] || 0;
              let newAngle = (baseAngle + rotationDeg) % 360;
              if (newAngle < 0) newAngle += 360;
              
              // Map angle back to cursor
              let resultCursor = baseCursor;
              if (newAngle >= 337.5 || newAngle < 22.5) resultCursor = 'n-resize';
              else if (newAngle >= 22.5 && newAngle < 67.5) resultCursor = 'ne-resize';
              else if (newAngle >= 67.5 && newAngle < 112.5) resultCursor = 'e-resize';
              else if (newAngle >= 112.5 && newAngle < 157.5) resultCursor = 'se-resize';
              else if (newAngle >= 157.5 && newAngle < 202.5) resultCursor = 's-resize';
              else if (newAngle >= 202.5 && newAngle < 247.5) resultCursor = 'sw-resize';
              else if (newAngle >= 247.5 && newAngle < 292.5) resultCursor = 'w-resize';
              else if (newAngle >= 292.5 && newAngle < 337.5) resultCursor = 'nw-resize';
              
              console.log(`🔄 Rotated cursor - ${anchorName}: ${baseCursor} (${baseAngle}°) + rotation (${rotationDeg.toFixed(1)}°) = ${newAngle.toFixed(1)}° → ${resultCursor}`);
              return resultCursor;
            };
            
            // CRITICAL: Convert anchor pixel positions to UV coordinates
            // Anchors are calculated in FLIPPED pixel space (borderYPixels = flippedY)
            // But UV coordinates are in NORMAL space (V=0 at top, V=1 at bottom)
            // Since borderYPixels is already in flipped space, we convert: v = pixelY / height
            const anchors = {
              // Corner anchors with rotation-adjusted cursors and hitbox radius in pixels
              topLeft: { u: topLeftPixelX / canvasDimensions.width, v: topLeftPixelY / canvasDimensions.height, cursor: getRotatedCursor('nw-resize', 'topLeft'), hitboxPx: cornerHitboxRadius },
              topRight: { u: topRightPixelX / canvasDimensions.width, v: topRightPixelY / canvasDimensions.height, cursor: getRotatedCursor('ne-resize', 'topRight'), hitboxPx: cornerHitboxRadius },
              bottomLeft: { u: bottomLeftPixelX / canvasDimensions.width, v: bottomLeftPixelY / canvasDimensions.height, cursor: getRotatedCursor('sw-resize', 'bottomLeft'), hitboxPx: cornerHitboxRadius },
              bottomRight: { u: bottomRightPixelX / canvasDimensions.width, v: bottomRightPixelY / canvasDimensions.height, cursor: getRotatedCursor('se-resize', 'bottomRight'), hitboxPx: cornerHitboxRadius },
              // Edge anchors with rotation-adjusted cursors and hitbox radius in pixels
              top: { u: topEdgePixelX / canvasDimensions.width, v: topEdgePixelY / canvasDimensions.height, cursor: getRotatedCursor('n-resize', 'top'), hitboxPx: edgeHitboxRadius },
              bottom: { u: bottomEdgePixelX / canvasDimensions.width, v: bottomEdgePixelY / canvasDimensions.height, cursor: getRotatedCursor('s-resize', 'bottom'), hitboxPx: edgeHitboxRadius },
              left: { u: leftEdgePixelX / canvasDimensions.width, v: leftEdgePixelY / canvasDimensions.height, cursor: getRotatedCursor('w-resize', 'left'), hitboxPx: edgeHitboxRadius },
              right: { u: rightEdgePixelX / canvasDimensions.width, v: rightEdgePixelY / canvasDimensions.height, cursor: getRotatedCursor('e-resize', 'right'), hitboxPx: edgeHitboxRadius }
            };
            
            // CRITICAL: Transform hover point to text's local coordinate system (accounting for rotation)
            // rotation is already defined above for cursor calculation
            let localHoverU = hoverU;
            let localHoverV = hoverV;
            
            if (rotation !== 0) {
              // Convert hover UV to pixels
              const hoverPixelX = hoverU * canvasDimensions.width;
              const hoverPixelY = (1 - hoverV) * canvasDimensions.height;
              
              // Translate to text origin
              const relX = hoverPixelX - textX;
              const relY = hoverPixelY - textY;
              
              // Rotate by -rotation to get into text's local space
              const cosR = Math.cos(-rotation);
              const sinR = Math.sin(-rotation);
              const localX = relX * cosR - relY * sinR;
              const localY = relX * sinR + relY * cosR;
              
              // Convert back to UV coordinates
              localHoverU = (textX + localX) / canvasDimensions.width;
              localHoverV = 1 - ((textY + localY) / canvasDimensions.height);
            }
            
            // PRIORITY 1: Check rotation handle FIRST (before anchors)
            const rotationHandleDistance = 40; // Same as in AdvancedLayerSystemV2.ts
            const rotationHandleSize = 12; // Same as in AdvancedLayerSystemV2.ts (12px diameter circle)
            const rotationHandleRadius = rotationHandleSize / 2; // 6px radius (exact match to visual)
            // Rotation handle is positioned relative to text center (textXPixels, flippedY)
            const rotationHandlePixelX = textXPixels;
            const rotationHandlePixelY = flippedY - textPixelHeight / 2 - rotationHandleDistance;
            // Convert to UV: rotationHandlePixelY is in flipped space, so v = pixelY / height
            const rotationHandleU = rotationHandlePixelX / canvasDimensions.width;
            const rotationHandleV = rotationHandlePixelY / canvasDimensions.height;
            const rotationHandleDist = Math.sqrt(Math.pow(localHoverU - rotationHandleU, 2) + Math.pow(localHoverV - rotationHandleV, 2));
            // CRITICAL: Hitbox matches EXACT visual size - rotation handle is 12px circle = 6px radius
            const rotationHandleHitbox = rotationHandleRadius / canvasDimensions.width; // Exact match to visual
            
            let overAnchor = false;
            if (rotationHandleDist < rotationHandleHitbox) {
              console.log('🖱️ CURSOR: Over rotation handle → grab');
              document.body.style.cursor = 'grab';
              document.body.style.setProperty('cursor', 'grab', 'important');
              overAnchor = true; // Prevent checking other anchors
            }
            
            // CRITICAL: Calculate check coordinates for anchor detection and border detection
            // For rotated text, anchors are in original coordinate system
            // So we check against original hover coordinates, not rotated ones
            const checkHoverU = rotation !== 0 ? hoverU : localHoverU;
            const checkHoverV = rotation !== 0 ? hoverV : localHoverV;
            
            // PRIORITY 2: Check resize anchors (with improved hitbox calculations)
            if (!overAnchor) {
              // Calculate consistent hitbox sizes in UV space
              const cornerHitboxUV = cornerHitboxRadius / canvasDimensions.width;
              const edgeHitboxUV = edgeHitboxRadius / canvasDimensions.width;
              
              console.log('🖱️ ANCHOR DEBUG - Hover position (original):', hoverU.toFixed(4), hoverV.toFixed(4));
              console.log('🖱️ ANCHOR DEBUG - Hover position (local/rotated):', localHoverU.toFixed(4), localHoverV.toFixed(4));
              console.log('🖱️ ANCHOR DEBUG - Using check coordinates (original for rotated):', checkHoverU.toFixed(4), checkHoverV.toFixed(4));
              console.log('🖱️ ANCHOR DEBUG - Corner hitbox UV:', cornerHitboxUV.toFixed(6), 'Edge hitbox UV:', edgeHitboxUV.toFixed(6));
              
              for (const [anchorName, anchorData] of Object.entries(anchors)) {
                // CRITICAL: For rotated text, anchors are in original coordinate system
                // So we check against original hover coordinates
                const dist = Math.sqrt(Math.pow(checkHoverU - anchorData.u, 2) + Math.pow(checkHoverV - anchorData.v, 2));
                const distPx = dist * canvasDimensions.width;
                
                // Use consistent hitbox size based on anchor type
                const isCornerAnchor = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(anchorName);
                const hitboxUV = isCornerAnchor ? cornerHitboxUV : edgeHitboxUV;
                const willHit = dist < hitboxUV;
                
                console.log(`🖱️ ${anchorName}:`, 
                  'UV:', anchorData.u.toFixed(4), anchorData.v.toFixed(4),
                  'Dist:', dist.toFixed(6), '(' + distPx.toFixed(1) + 'px)',
                  'Hitbox UV:', hitboxUV.toFixed(6), '(' + (hitboxUV * canvasDimensions.width).toFixed(1) + 'px)',
                  'Cursor:', anchorData.cursor,
                  willHit ? '✅ HIT!' : '❌'
                );
                
                if (willHit) {
                  console.log('🖱️ ✅ CURSOR SET TO:', anchorData.cursor, 'for', anchorName);
                  // Set cursor with MAXIMUM priority
                  document.body.style.cursor = anchorData.cursor;
                  document.body.style.setProperty('cursor', anchorData.cursor, 'important');
                  overAnchor = true;
                  break;
                }
              }
            }
            
            // PRIORITY 3: If not over anchor or rotation handle, check if inside text borders
            if (!overAnchor) {
              // Check if hover is actually inside the text border bounds
              // Border bounds in UV space (using borderXPixels and borderYPixels from flipped space)
              const borderMinU = borderXPixels / canvasDimensions.width;
              const borderMaxU = (borderXPixels + textPixelWidth) / canvasDimensions.width;
              const borderMinV = borderYPixels / canvasDimensions.height;
              const borderMaxV = (borderYPixels + textPixelHeight) / canvasDimensions.height;
              
              // Check if hover point is inside border bounds
              const isInsideBorder = 
                checkHoverU >= borderMinU && 
                checkHoverU <= borderMaxU &&
                checkHoverV >= borderMinV && 
                checkHoverV <= borderMaxV;
              
              if (isInsideBorder) {
                console.log('🖱️ CURSOR: Over selected text (inside border) → move');
                document.body.style.cursor = 'move';
                document.body.style.setProperty('cursor', 'move', 'important');
              } else {
                // Outside borders - reset to default cursor
                document.body.style.cursor = 'default';
                document.body.style.setProperty('cursor', 'default', 'important');
              }
            }
          } else if (hoveredText) {
            // Hovering over unselected text - show pointer to indicate clickable
            console.log('🖱️ CURSOR: Over unselected text → pointer');
            document.body.style.cursor = 'pointer';
            document.body.style.setProperty('cursor', 'pointer', 'important');
          } else {
            // Not hovering over any text - show text cursor to create new text
            console.log('🖱️ CURSOR: Not over any text → text');
            document.body.style.cursor = 'text';
            document.body.style.setProperty('cursor', 'text', 'important');
          }
        }
      }
      
      // Handle image rotation (separate from dragging and resizing)
      if ((activeTool as string) === 'image' && (window as any).__imageRotating && (window as any).__imageRotateStart) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // Flip V for texture space
          
          const rotateStart = (window as any).__imageRotateStart;
          
          // Calculate rotation angle based on mouse movement
          const centerU = rotateStart.imgU;
          const centerV = 1 - rotateStart.imgV; // Convert back to flipped coordinates for calculation
          
          const startAngle = Math.atan2(rotateStart.v - centerV, rotateStart.u - centerU);
          const currentAngle = Math.atan2(currentV - centerV, currentU - centerU);
          const deltaAngle = currentAngle - startAngle;
          
          const newRotation = rotateStart.imgRotation + (deltaAngle * 180 / Math.PI);
          
          // PHASE 2 FIX: Update image via V2 system
          const { composeLayers } = useApp.getState();
          if (rotateStart.imageId) {
            const v2State = useAdvancedLayerStoreV2.getState();
            v2State.updateImageElementFromApp(rotateStart.imageId, {
              rotation: newRotation
            });
            
            // CRITICAL FIX: Force immediate layer composition and texture update
            console.log('🎨 Image rotating - Forcing immediate layer composition');
            composeLayers(true); // Force layer composition
            
            // CRITICAL FIX: Trigger texture update with bypass throttling
            console.log('🎨 Image rotating - Triggering texture update for visual feedback');
            updateModelTexture(true, false); // Force update for real-time feedback
          }
        }
        return;
      }
      
      // Handle image resizing (separate from dragging)
      if ((activeTool as string) === 'image' && (window as any).__imageResizing && (window as any).__imageResizeStart) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // Flip V for texture space
          
          const resizeStart = (window as any).__imageResizeStart;
          const deltaU = currentU - resizeStart.u;
          const deltaV = currentV - resizeStart.v;
          
          // Calculate new size and position based on anchor (Photoshop-style scaling from anchor)
          let newWidth = resizeStart.imgWidth;
          let newHeight = resizeStart.imgHeight;
          let newU = resizeStart.imgU;
          let newV = resizeStart.imgV;
          
          // Calculate half widths/heights for the original image
          const halfWidth = resizeStart.imgWidth / 2;
          const halfHeight = resizeStart.imgHeight / 2;
          
          switch (resizeStart.anchor) {
            // Corner anchors - resize both width and height
            case 'topLeft':
              // Scale from bottom-right corner (opposite anchor stays fixed)
              newWidth = resizeStart.imgWidth - deltaU * 2;
              newHeight = resizeStart.imgHeight - deltaV * 2;
              // Keep bottom-right corner fixed, so center moves
              newU = resizeStart.imgU + deltaU;
              newV = resizeStart.imgV + deltaV;
              break;
            case 'topRight':
              // Scale from bottom-left corner
              newWidth = resizeStart.imgWidth + deltaU * 2;
              newHeight = resizeStart.imgHeight - deltaV * 2;
              // Keep bottom-left corner fixed
              newU = resizeStart.imgU + deltaU;
              newV = resizeStart.imgV + deltaV;
              break;
            case 'bottomLeft':
              // Scale from top-right corner
              newWidth = resizeStart.imgWidth - deltaU * 2;
              newHeight = resizeStart.imgHeight + deltaV * 2;
              // Keep top-right corner fixed
              newU = resizeStart.imgU + deltaU;
              newV = resizeStart.imgV + deltaV;
              break;
            case 'bottomRight':
              // Scale from top-left corner
              newWidth = resizeStart.imgWidth + deltaU * 2;
              newHeight = resizeStart.imgHeight + deltaV * 2;
              // Keep top-left corner fixed
              newU = resizeStart.imgU + deltaU;
              newV = resizeStart.imgV + deltaV;
              break;
            
            // Edge anchors - resize only one dimension
            case 'top':
              // Scale height from bottom edge (top edge moves)
              newHeight = resizeStart.imgHeight - deltaV * 2;
              newV = resizeStart.imgV + deltaV;
              break;
            case 'bottom':
              // Scale height from top edge (bottom edge moves)
              newHeight = resizeStart.imgHeight + deltaV * 2;
              newV = resizeStart.imgV + deltaV;
              break;
            case 'left':
              // Scale width from right edge (left edge moves)
              newWidth = resizeStart.imgWidth - deltaU * 2;
              newU = resizeStart.imgU + deltaU;
              break;
            case 'right':
              // Scale width from left edge (right edge moves)
              newWidth = resizeStart.imgWidth + deltaU * 2;
              newU = resizeStart.imgU + deltaU;
              break;
          }
          
          // Clamp size to reasonable limits
          const minSize = 0.05; // 5% of texture size
          const maxSize = 0.8; // 80% of texture size
          newWidth = Math.max(minSize, Math.min(maxSize, newWidth));
          newHeight = Math.max(minSize, Math.min(maxSize, newHeight));
          
          // PHASE 2 FIX: Update image via V2 system
          const { composeLayers } = useApp.getState();
          if (resizeStart.imageId) {
            const v2State = useAdvancedLayerStoreV2.getState();
            v2State.updateImageElementFromApp(resizeStart.imageId, {
              uWidth: newWidth,
              uHeight: newHeight,
              u: Math.max(0, Math.min(1, newU)),
              v: Math.max(0, Math.min(1, 1 - newV)) // CRITICAL FIX: Convert back to original UV coordinate system
            });
            
            // CRITICAL FIX: Force immediate layer composition and texture update
            console.log('🎨 Image resizing - Forcing immediate layer composition');
            composeLayers(true); // Force layer composition
            
            // CRITICAL FIX: Trigger texture update with bypass throttling
            console.log('🎨 Image resizing - Triggering texture update for visual feedback');
            updateModelTexture(true, false); // Force update for real-time feedback
            
            // CRITICAL FIX: Force immediate material updates to ensure visual feedback
            const currentModelScene = useApp.getState().modelScene;
            if (currentModelScene) {
              currentModelScene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  const mat = child.material;
                  if (mat.map) {
                    mat.map.needsUpdate = true;
                    mat.map.version++;
                    mat.needsUpdate = true;
                  }
                }
              });
              
              // Force scene re-render
              currentModelScene.parent?.updateMatrixWorld(true);
            }
          }
        }
        return;
      }
      
      // DEBUG: Log text tool state at start of pointer move
      if (activeTool === 'text' && ((window as any).__textDragging || (window as any).__textResizing || (window as any).__textRotating)) {
        console.log('🎨 onPointerMove - Text tool state:', {
          dragging: (window as any).__textDragging,
          resizing: (window as any).__textResizing,
          rotating: (window as any).__textRotating
        });
      }
      
      // Handle text rotation (separate from dragging and resizing)
      if (activeTool === 'text' && (window as any).__textRotating && (window as any).__textRotateStart) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // Flip V
          
          const rotateStart = (window as any).__textRotateStart;
          const centerU = rotateStart.centerU;
          const centerV = rotateStart.centerV;
          
          // Calculate angle from center to current mouse position
          const currentAngle = Math.atan2(currentV - centerV, currentU - centerU);
          const startAngle = Math.atan2(rotateStart.startV - centerV, rotateStart.startU - centerU);
          const deltaAngle = currentAngle - startAngle;
          
          let newRotation = rotateStart.initialRotation + deltaAngle;
          
          // Snap to 15° increments if Shift key is pressed
          if (e.shiftKey) {
            const snapIncrement = (15 * Math.PI) / 180; // 15 degrees in radians
            newRotation = Math.round(newRotation / snapIncrement) * snapIncrement;
          }
          
          // Normalize to 0-2π range
          while (newRotation < 0) newRotation += Math.PI * 2;
          while (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
          
          const rotationDegrees = (newRotation * 180 / Math.PI).toFixed(1);
          console.log('🔄 Rotating text - Angle:', rotationDegrees, '°');
          
          // Update text rotation
          const { updateTextElement } = useApp.getState();
          if (rotateStart.textId) {
            updateTextElement(rotateStart.textId, { rotation: newRotation });
          }
          
          // TODO: Display rotation angle on canvas as tooltip
        }
        return;
      }
      
      // Handle text resizing (separate from dragging) - EXACTLY LIKE IMAGE TOOL
      if (activeTool === 'text' && (window as any).__textResizing && (window as any).__textResizeStart) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // Flip V to match how text.v is stored
          
          const resizeStart = (window as any).__textResizeStart;
          const deltaU = currentU - resizeStart.u;
          const deltaV = currentV - resizeStart.v;
          
          console.log('🔍 RESIZE DEBUG:');
          console.log('  Anchor:', resizeStart.anchor);
          console.log('  Mouse start UV:', resizeStart.u, resizeStart.v);
          console.log('  Mouse current UV:', currentU, currentV);
          console.log('  Delta UV:', deltaU, deltaV);
          console.log('  Original dimensions UV:', resizeStart.txtWidth, resizeStart.txtHeight);
          
          // Calculate new size based on anchor (Photoshop-style scaling from opposite corner)
          // For text, we scale the fontSize proportionally based on width/height changes
          let scaleFactorU = 1;
          let scaleFactorV = 1;
          let newTxtU = resizeStart.txtU;
          let newTxtV = resizeStart.txtV;
          
          // Calculate new dimensions based on anchor (FIXED SCALING LOGIC)
          // When dragging outward from a corner = text grows (dimensions increase)
          // When dragging inward to a corner = text shrinks (dimensions decrease)
          // The text should stay ANCHORED to the OPPOSITE corner (that corner doesn't move)
          let newWidth = resizeStart.txtWidth;
          let newHeight = resizeStart.txtHeight;
          
          // PHOTOSHOP-STYLE SCALING: Opposite corner stays fixed (SAME AS IMAGE TOOL)
          switch (resizeStart.anchor) {
            case 'topLeft':
              // Scale from bottom-right corner (opposite anchor stays fixed)
              newWidth = resizeStart.txtWidth - deltaU * 2;
              newHeight = resizeStart.txtHeight - deltaV * 2;
              // Keep bottom-right corner fixed, so center moves
              newTxtU = resizeStart.txtU + deltaU;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            case 'topRight':
              // Scale from bottom-left corner
              newWidth = resizeStart.txtWidth + deltaU * 2;
              newHeight = resizeStart.txtHeight - deltaV * 2;
              // Keep bottom-left corner fixed
              newTxtU = resizeStart.txtU + deltaU;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            case 'bottomLeft':
              // Scale from top-right corner
              newWidth = resizeStart.txtWidth - deltaU * 2;
              newHeight = resizeStart.txtHeight + deltaV * 2;
              // Keep top-right corner fixed
              newTxtU = resizeStart.txtU + deltaU;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            case 'bottomRight':
              // Scale from top-left corner
              newWidth = resizeStart.txtWidth + deltaU * 2;
              newHeight = resizeStart.txtHeight + deltaV * 2;
              // Keep top-left corner fixed
              newTxtU = resizeStart.txtU + deltaU;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            
            // Edge anchors - scale only one dimension
            case 'top':
              // Scale from bottom edge
              newHeight = resizeStart.txtHeight - deltaV * 2;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            case 'bottom':
              // Scale from top edge
              newHeight = resizeStart.txtHeight + deltaV * 2;
              newTxtV = resizeStart.txtV + deltaV;
              break;
            case 'left':
              // Scale from right edge
              newWidth = resizeStart.txtWidth - deltaU * 2;
              newTxtU = resizeStart.txtU + deltaU;
              break;
            case 'right':
              // Scale from left edge
              newWidth = resizeStart.txtWidth + deltaU * 2;
              newTxtU = resizeStart.txtU + deltaU;
              break;
          }
          
          // Calculate scale factors from dimension changes
          scaleFactorU = newWidth / resizeStart.txtWidth;
          scaleFactorV = newHeight / resizeStart.txtHeight;
          
          // MAINTAIN ASPECT RATIO: If Shift key is held, use uniform scaling
          let finalScaleFactor;
          if (e.shiftKey) {
            // Use the larger scale factor for uniform scaling (prevents shrinking to 0)
            finalScaleFactor = Math.max(Math.abs(scaleFactorU), Math.abs(scaleFactorV));
            // Preserve sign (grow vs shrink)
            if (scaleFactorU < 0 || scaleFactorV < 0) {
              finalScaleFactor = -finalScaleFactor;
            }
            console.log('🔒 SHIFT KEY: Maintaining aspect ratio - Uniform scale:', finalScaleFactor);
          } else {
            // Normal mode: average scale factor
            finalScaleFactor = (scaleFactorU + scaleFactorV) / 2;
          }
          
          let newFontSize = resizeStart.originalFontSize * finalScaleFactor;
          
          // Clamp font size to reasonable limits
          newFontSize = Math.max(8, Math.min(200, newFontSize));
          
          console.log('🎨 Text resizing - Anchor:', resizeStart.anchor, 'ScaleU:', scaleFactorU, 'ScaleV:', scaleFactorV, 'Final:', finalScaleFactor, 'New size:', newFontSize, 'Shift:', e.shiftKey);
          
          // Update text font size AND position (text center moves when scaling from corner)
          const { updateTextElement } = useApp.getState();
          if (resizeStart.textId) {
            updateTextElement(resizeStart.textId, {
              fontSize: Math.round(newFontSize),
              u: Math.max(0, Math.min(1, newTxtU)),
              v: Math.max(0, Math.min(1, newTxtV))
            });
          }
        }
        return;
      }
      
      // Handle text dragging (separate from resizing) - EXACTLY LIKE IMAGE TOOL
      if (activeTool === 'text' && (window as any).__textDragging && (window as any).__textDragStart) {
        console.log('🎨 ===== TEXT DRAG ACTIVE IN POINTER MOVE =====');
        const uv = e.uv as THREE.Vector2 | undefined;
        console.log('🎨 Text drag - UV available:', !!uv);
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // Flip V to match how text.v is stored
          
          const dragStart = (window as any).__textDragStart;
          console.log('🎨 Text drag - dragStart:', dragStart);
          const deltaU = currentU - dragStart.u;
          const deltaV = currentV - dragStart.v;
          
          let newU = dragStart.txtU + deltaU;
          let newV = dragStart.txtV + deltaV;
          
          console.log('🎨 Text dragging - Current UV:', { currentU, currentV });
          console.log('🎨 Text dragging - Delta:', { deltaU, deltaV });
          console.log('🎨 Text dragging - New pos (before snap):', { newU, newV });
          
          // SMART SNAPPING: Snap to grid or other text elements
          const { showGrid, textElements } = useApp.getState();
          // PHASE 1 FIX: Calculate snap threshold based on actual canvas size
          const canvasSize = unifiedPerformanceManager.getOptimalCanvasSize().width;
          const snapThreshold = 5 / canvasSize; // 5px threshold in UV space
          
          // 1. Snap to grid (if grid is visible)
          if (showGrid) {
            const gridSize = 0.1; // Grid size in UV space (10% intervals)
            const snappedU = Math.round(newU / gridSize) * gridSize;
            const snappedV = Math.round(newV / gridSize) * gridSize;
            
            if (Math.abs(newU - snappedU) < snapThreshold) {
              newU = snappedU;
              console.log('📐 Snapped to grid U:', snappedU);
            }
            if (Math.abs(newV - snappedV) < snapThreshold) {
              newV = snappedV;
              console.log('📐 Snapped to grid V:', snappedV);
            }
          }
          
          // 2. Snap to other text elements (alignment guides)
          const otherTexts = textElements.filter(t => t.id !== dragStart.textId);
          for (const otherText of otherTexts) {
            const otherU = otherText.u || 0.5;
            const otherV = otherText.v || 0.5;
            
            // Snap horizontally (align U coordinates)
            if (Math.abs(newU - otherU) < snapThreshold) {
              newU = otherU;
              console.log('📐 Snapped to text horizontally:', otherText.text);
            }
            
            // Snap vertically (align V coordinates)
            if (Math.abs(newV - otherV) < snapThreshold) {
              newV = otherV;
              console.log('📐 Snapped to text vertically:', otherText.text);
            }
          }
          
          console.log('🎨 Text dragging - New pos (after snap):', { newU, newV });
          
          // Update text position (same as image tool - with throttling)
          const { updateTextElement, composeLayers } = useApp.getState();
          if (dragStart.textId) {
            console.log('🎨 Text dragging - Calling updateTextElement with textId:', dragStart.textId);
            updateTextElement(dragStart.textId, {
              u: Math.max(0, Math.min(1, newU)),
              v: Math.max(0, Math.min(1, newV))
            });
            
            // CRITICAL FIX: Force immediate layer composition and texture update
            console.log('🎨 Text dragging - Forcing immediate layer composition');
            composeLayers(true); // Force layer composition
            
            // CRITICAL FIX: Trigger texture update with bypass throttling
            console.log('🎨 Text dragging - Triggering texture update for visual feedback');
            updateModelTexture(true, false); // Force update for real-time feedback
            
            // CRITICAL FIX: Force immediate material updates to ensure visual feedback
            const currentModelScene = useApp.getState().modelScene;
            if (currentModelScene) {
              currentModelScene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  const mat = child.material;
                  if (mat.map) {
                    mat.map.needsUpdate = true;
                    mat.map.version++;
                    mat.needsUpdate = true;
                  }
                }
              });
              
              // Force scene re-render
              currentModelScene.parent?.updateMatrixWorld(true);
            }
          } else {
            console.error('🎨 Text dragging - NO textId in dragStart!');
          }
        }
        return;
      }
      
      // CRITICAL FIX: Handle vector handle dragging (before anchor dragging)
      if (activeTool === 'vector' && isDraggingHandleRef.current && draggingHandleInfoRef.current && dragStartPosRef.current) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const handleInfo = draggingHandleInfoRef.current;
          const { vectorPaths } = useApp.getState();
          const path = vectorPaths.find(p => p.id === handleInfo.pathId);
          
          if (path && path.points[handleInfo.anchorIndex]) {
            const anchor = path.points[handleInfo.anchorIndex];
            const currentHandle = handleInfo.handleType === 'in' ? anchor.inHandle : anchor.outHandle;
            
            if (currentHandle) {
              // Move handle directly to new position (relative to anchor)
              // For bezier handles, we store absolute UV position
              useApp.getState().moveCurveHandle(
                handleInfo.pathId,
                handleInfo.anchorIndex,
                handleInfo.handleType,
                uv.x,
                uv.y
              );
              
              debugLog(`🎯 Vector: Dragging ${handleInfo.handleType} handle to`, { u: uv.x, v: uv.y });
            }
          }
        }
        return;
      }
      
      // Handle vector anchor dragging
      // PERFORMANCE: Throttle anchor dragging updates using requestAnimationFrame
      if (activeTool === 'vector' && isDraggingAnchorRef.current && dragStartPosRef.current) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          // PERFORMANCE: Use requestAnimationFrame to batch updates
          requestAnimationFrame(() => {
            const { selectedAnchor, vectorPaths } = useApp.getState();
            if (selectedAnchor) {
              const path = vectorPaths.find(p => p.id === selectedAnchor.pathId);
              if (path && path.points[selectedAnchor.anchorIndex]) {
                // Calculate delta in UV space (both are already in UV coordinates)
                const deltaU = uv.x - dragStartPosRef.current!.x;
                const deltaV = uv.y - dragStartPosRef.current!.y;
                
                // Move anchor
                const currentPoint = path.points[selectedAnchor.anchorIndex];
                const newU = Math.max(0, Math.min(1, currentPoint.u + deltaU));
                const newV = Math.max(0, Math.min(1, currentPoint.v + deltaV));
                
                useApp.getState().moveAnchor(selectedAnchor.pathId, selectedAnchor.anchorIndex, newU, newV);
                
                // Update drag start position for next move (use current UV)
                dragStartPosRef.current = { x: uv.x, y: uv.y };
              }
            }
          });
        }
        return;
      }

      // Handle image dragging (separate from resizing)
      if ((activeTool as string) === 'image' && (window as any).__imageDragging && (window as any).__imageDragStart) {
        const uv = e.uv as THREE.Vector2 | undefined;
        if (uv) {
          const currentU = uv.x;
          const currentV = 1 - uv.y; // CRITICAL FIX: Use same flipped coordinates as hitbox detection
          
          const dragStart = (window as any).__imageDragStart;
          const deltaU = currentU - dragStart.u;
          const deltaV = currentV - dragStart.v;
          
          // CRITICAL FIX: Use direct delta calculation since both coordinates are in same system
          const newU = dragStart.imgU + deltaU;
          const newV = 1 - (dragStart.imgV + deltaV); // Convert back to original UV coordinate system
          
          // PHASE 2 FIX: Update image position via V2 system
          const { composeLayers } = useApp.getState();
          if (dragStart.imageId) {
            const v2State = useAdvancedLayerStoreV2.getState();
            v2State.updateImageElementFromApp(dragStart.imageId, {
              u: Math.max(0, Math.min(1, newU)),
              v: Math.max(0, Math.min(1, newV))
            });
            
            // CRITICAL FIX: Force immediate layer composition and texture update
            console.log('🎨 Image dragging - Forcing immediate layer composition');
            composeLayers(true); // Force layer composition
            
            // CRITICAL FIX: Trigger texture update with bypass throttling
            console.log('🎨 Image dragging - Triggering texture update for visual feedback');
            updateModelTexture(true, false); // Force update for real-time feedback
            
            // CRITICAL FIX: Force immediate material updates to ensure visual feedback
            const currentModelScene = useApp.getState().modelScene;
            if (currentModelScene) {
              currentModelScene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  const mat = child.material;
                  if (mat.map) {
                    mat.map.needsUpdate = true;
                    mat.map.version++;
                    mat.needsUpdate = true;
                  }
                }
              });
              
              // Force scene re-render
              currentModelScene.parent?.updateMatrixWorld(true);
            }
          }
        }
        return;
      }
      
      // PERFORMANCE: Early exit for non-drawing tools
      const currentActiveTool = useApp.getState().activeTool;
      if (!['brush', 'eraser', 'embroidery', 'fill', 'puffPrint'].includes(currentActiveTool)) return;
      
      // PERFORMANCE: Only paint if actively drawing
      if (paintingActiveRef.current) {
        paintAtEvent(e);
        
        // PERFORMANCE: Use unified performance manager to determine optimal update frequency
        const preset = unifiedPerformanceManager.getCurrentPreset();
        const maxUpdatesPerSecond = preset.maxTextureUpdatesPerSecond || 5;
        const textureUpdateThrottle = 1000 / maxUpdatesPerSecond; // Convert updates/sec to ms
        
        // PERFORMANCE CRITICAL: Don't update texture every frame during painting
        // This causes massive lag. Only update texture occasionally for visual feedback
        // The final update happens in onPointerUp
        if (now - lastTextureUpdateTime >= textureUpdateThrottle) {
          lastTextureUpdateTime = now;
          const { composeLayers } = useApp.getState();
          composeLayers();
          updateModelTexture(false, false);
        }
      }
    };
  })(), [activeTool, paintAtEvent, updateModelTexture]);

  const onPointerUp = useCallback((e: any) => {
    const currentActiveTool = useApp.getState().activeTool;
    let layerIdToUpdate: string | null = null;
    
    // Finish puff stroke if active
    // CRITICAL: Finish stroke BEFORE resetting paintingActiveRef to ensure stroke is properly closed
    if (currentActiveTool === 'puffPrint' && paintingActiveRef.current) {
      const appState = useApp.getState();
      const currentModelScene = appState.modelScene;
      
      // Get the root scene (same logic as in paintAtEvent)
      let targetScene: THREE.Object3D | null = currentModelScene;
      
      if (!targetScene) {
        console.warn('🎈 Puff tool: No scene available for finishing stroke');
        return;
      }
      const currentPuffSize = appState.puffSize || 20;
      const puffHeightMultiplier = appState.puffHeight || 1.2;
      
      // Calculate world scale based on model bounds (same as in paintAtEvent)
      let pixelToWorldScale = 0.01; // Default scale
      if (modelScene) {
        const box = new THREE.Box3().setFromObject(modelScene);
        const modelSize = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        pixelToWorldScale = maxDimension / 2048;
      }
      
      // Convert puff size (pixels) to world units
      const puffSize = currentPuffSize * pixelToWorldScale;
      const puffHeight = puffSize * puffHeightMultiplier;
      const puffSoftness = appState.puffSoftness || 0.5;
      const puffColor = appState.puffColor || '#ff69b4';
      const puffOpacity = appState.puffOpacity || 0.9;

      // Phase 1: Shape Customization
      const puffTopShape = appState.puffTopShape || 'rounded';
      const puffBottomShape = appState.puffBottomShape || 'rounded';
      const puffCrossSectionShape = appState.puffCrossSectionShape || 'circle';
      const puffProfileCurve = appState.puffProfileCurve || 'cubic';
      const puffEdgeRadius = appState.puffEdgeRadius || 10;
      const puffTaperAmount = appState.puffTaperAmount || 0;
      
      // Phase 3: Material & Texture
      const puffFabricType = appState.puffFabricType || 'cotton';
      const puffRoughness = appState.puffRoughness !== undefined ? appState.puffRoughness : 0.8;
      const puffTextureIntensity = appState.puffTextureIntensity !== undefined ? appState.puffTextureIntensity : 0.3;
      const puffEnableNormalMap = appState.puffEnableNormalMap !== undefined ? appState.puffEnableNormalMap : true;
      
      // Phase 4: Edge Details
      const puffEdgeType = appState.puffEdgeType || 'none';
      const puffEdgeWidth = appState.puffEdgeWidth || 2;
      const puffEdgeColor = appState.puffEdgeColor || '#000000';
      
      // Phase 5: Advanced
      const puffDetailLevel = appState.puffDetailLevel || 'auto';
      const puffSmoothness = appState.puffSmoothness !== undefined ? appState.puffSmoothness : 80;

      // Get gradient settings if in gradient mode
      const gradientSettings = (window as any).getGradientSettings?.();
      const puffGradientData = gradientSettings?.puff;
      
      const settings: PuffSettings = {
        height: puffHeight,
        size: puffSize,
        softness: puffSoftness,
        color: puffColor,
        opacity: puffOpacity,
        
        // Phase 1: Shape Customization
        topShape: puffTopShape,
        bottomShape: puffBottomShape,
        crossSectionShape: puffCrossSectionShape,
        profileCurve: puffProfileCurve,
        edgeRadius: puffEdgeRadius,
        taperAmount: puffTaperAmount,
        
        // Phase 3: Material & Texture
        fabricType: puffFabricType,
        roughness: puffRoughness,
        textureIntensity: puffTextureIntensity,
        enableNormalMap: puffEnableNormalMap,
        
        // Phase 4: Edge Details
        edgeType: puffEdgeType,
        edgeWidth: puffEdgeWidth,
        edgeColor: puffEdgeColor,
        
        // Phase 5: Advanced
        detailLevel: puffDetailLevel,
        smoothness: puffSmoothness,
        
        // Existing features
        hairs: appState.puffHairs || false,
        hairHeight: appState.puffHairHeight || 0.5,
        hairDensity: appState.puffHairDensity || 50,
        hairThickness: appState.puffHairThickness || 0.02,
        hairVariation: appState.puffHairVariation || 0.2,
        gradient: puffGradientData?.mode === 'gradient' ? {
          type: puffGradientData.type,
          angle: puffGradientData.angle,
          stops: puffGradientData.stops
        } : undefined
      };
      
      puffGeometryManager.finishStroke(settings, targetScene);
      console.log('🎈 Puff tool: Finished stroke');
      
      // CRITICAL: Reset paintingActiveRef immediately after finishing stroke
      // This prevents the puff tool from continuing to draw after mouse is lifted
      paintingActiveRef.current = false;
      // Reset velocity tracker for next stroke
      velocityTrackerRef.current = createVelocityTracker(10);
      lastBrushPointRef.current = null;
      console.log('🎈 Puff tool: Reset paintingActiveRef to false');
      
      // CRITICAL FIX: Re-enable 3D controls after puff drawing ends
      // This allows rotation/zoom to work again after drawing
      setControlsEnabled(true);
      useApp.setState({ controlsEnabled: true });
      console.log('🎈 Puff tool: Controls re-enabled after drawing');
      
      // Force immediate state synchronization
      setTimeout(() => {
        const currentState = useApp.getState().controlsEnabled;
        console.log('🎈 Puff drawing ended - controls re-enabled. State:', currentState);
        
        // Dispatch event to force OrbitControls update
        window.dispatchEvent(new CustomEvent('controlsStateChanged', {
          detail: { enabled: true, reason: 'puff-drawing-ended' }
        }));
      }, 0);
    }
    
    if (paintingActiveRef.current) {
      console.log('🎨 ShirtRefactored: onPointerUp - ending painting');
      paintingActiveRef.current = false;
      // Reset velocity tracker for next stroke
      velocityTrackerRef.current = createVelocityTracker(10);
      lastBrushPointRef.current = null;
      
      // 🚀 AUTOMATIC LAYER CREATION: Trigger layer creation end for drawing events
      triggerBrushEnd();
      
      // PHASE 1: Finalize stroke session and store stroke data
      if (strokeSessionRef.current) {
        const { layerId, points, bounds, settings, tool } = strokeSessionRef.current;
        layerIdToUpdate = layerId;
        
        if (bounds) {
          // Calculate final bounds
          const finalBounds = {
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
          
          // Store stroke data in layer
          const v2Store = useAdvancedLayerStoreV2.getState();
          const { layers } = v2Store;
          const strokeLayer = layers.find(l => l.id === layerId);
          
          if (strokeLayer && settings) {
            // PHASE 1: Update layer content with stroke data using proper method
            if (layerId) {
              v2Store.updateLayerContent(layerId, {
              strokeData: {
                id: strokeSessionRef.current!.id,
                points: points,
                bounds: finalBounds,
                settings: {
                  size: settings.size || 10,
                  color: settings.color || '#000000',
                  opacity: settings.opacity || 1.0,
                  gradient: settings.gradient
                },
                tool: tool,
                createdAt: new Date(),
                isSelected: false
              }
            });
            }
            
            console.log('🎨 PHASE 1: Stroke finalized with data:', {
              strokeId: strokeSessionRef.current!.id,
              layerId: layerId,
              pointsCount: points.length,
              bounds: finalBounds
            });
          }
        }
        
        // Clear stroke session
        strokeSessionRef.current = null;
      }
    }
    
    // CRITICAL FIX: For continuous drawing tools, compose layers before returning
    if (['brush', 'eraser', 'embroidery', 'fill'].includes(activeTool)) {
      console.log('🎨 Continuous drawing tool - composing layers for:', activeTool);
      
      // CRITICAL FIX: For specific tools, explicitly update layer content before composition
      if (layerIdToUpdate) {
        const v2StoreForUpdate = useAdvancedLayerStoreV2.getState();
        const layer = v2StoreForUpdate.layers.find(l => l.id === layerIdToUpdate);
        if (layer && layer.content.canvas) {
          // Explicitly update layer content to ensure latest canvas is saved
          v2StoreForUpdate.updateLayerContent(layerIdToUpdate, { 
            canvas: layer.content.canvas 
          });
          console.log('🎨 (onPointerUp): Explicitly updated layer content before composition', {
            layerId: layerIdToUpdate,
            canvasSize: `${layer.content.canvas.width}x${layer.content.canvas.height}`
          });
        }
      }
      
      // CRITICAL FIX: Call composeLayers to transfer layer content to composedCanvas
      console.log('🎨 Composing V2 layers to transfer drawings to composedCanvas');
      const v2Store = useAdvancedLayerStoreV2.getState();
      v2Store.composeLayers();
      
      console.log('🎨 Composing App layers');
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // PERFORMANCE: Batch all UI updates at the end of the stroke
      // Update thumbnails and final texture update ONCE
      if (layerIdToUpdate) {
        setTimeout(() => {
          v2Store.updateLayer(layerIdToUpdate!, { updatedAt: new Date() });
          v2Store.generateLayerThumbnail(layerIdToUpdate!);
        }, 100);
      }
      
      // Final texture update when painting ends
      updateModelTexture(false, false);
      
      // Update displacement maps for embroidery (REAL 3D geometry)
      if (activeTool === 'embroidery') {
        console.log('🎨 Updating displacement maps for embroidery');
        if ((window as any).updateModelWithEmbroideryDisplacement) {
          (window as any).updateModelWithEmbroideryDisplacement();
        }
      }
      
      console.log('🎨 Continuous drawing tool - keeping controls disabled for:', activeTool);
      return; // Don't re-enable controls for continuous drawing tools
    }
    
    // Handle image tool resize end
    if ((activeTool as string) === 'image' && (window as any).__imageResizing) {
      console.log('🎨 Image tool: Ended resizing');
      (window as any).__imageResizing = false;
      delete (window as any).__imageResizeStart;
      setControlsEnabled(true);
    }
    
    // Handle image tool drag end
    if ((activeTool as string) === 'image' && (window as any).__imageDragging) {
      console.log('🎨 Image tool: Ended dragging');
      (window as any).__imageDragging = false;
      delete (window as any).__imageDragStart;
      setControlsEnabled(true);
    }
    
    // PHASE 3: Handle stroke transform end
    const { transformMode } = useStrokeSelection.getState();
    if (transformMode) {
      console.log('🎯 PHASE 3: Transform ended');
      const { endTransform } = useStrokeSelection.getState();
      endTransform();
      
      // CRITICAL FIX: Re-enable camera after transform ends
      if ((activeTool as string) === 'select') {
        console.log('🎯 Re-enabling camera after transform');
        setControlsEnabled(true);
        useApp.setState({ controlsEnabled: true });
        
        // Dispatch event to force OrbitControls update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('controlsStateChanged', {
            detail: { enabled: true, reason: 'stroke-transform-ended' }
          }));
        }, 0);
      }
      
      // Re-compose layers after transform
      const v2Store = useAdvancedLayerStoreV2.getState();
      v2Store.composeLayers();
      const { composeLayers } = useApp.getState();
      composeLayers();
      updateModelTexture(false, false);
    }
    
    // Handle text tool rotation end
    if (activeTool === 'text' && (window as any).__textRotating) {
      console.log('🔄 Text tool: Ended rotating - updating texture');
      (window as any).__textRotating = false;
      delete (window as any).__textRotateStart;
      
      // CRITICAL FIX: Properly re-enable 3D controls after text rotation
      setControlsEnabled(true);
      useApp.setState({ controlsEnabled: true });
      console.log('🎨 Text rotation ended - controls re-enabled');
      
      // Trigger final texture update
      const { composeLayers } = useApp.getState();
      composeLayers(true);
      if ((window as any).updateModelTexture) {
        (window as any).updateModelTexture(true, false);
      }
    }
    
    // Handle text tool resize end
    if (activeTool === 'text' && (window as any).__textResizing) {
      console.log('🎨 Text tool: Ended resizing - updating texture');
      (window as any).__textResizing = false;
      delete (window as any).__textResizeStart;
      
      // CRITICAL FIX: Properly re-enable 3D controls after text resizing
      setControlsEnabled(true);
      useApp.setState({ controlsEnabled: true });
      console.log('🎨 Text resizing ended - controls re-enabled');
      
      // Trigger final texture update
      const { composeLayers } = useApp.getState();
      composeLayers(true);
      if ((window as any).updateModelTexture) {
        (window as any).updateModelTexture(true, false);
      }
    }
    
    // Handle text tool drag end
    if (activeTool === 'text' && (window as any).__textDragging) {
      console.log('🎨 Text tool: Ended dragging - updating texture');
      (window as any).__textDragging = false;
      delete (window as any).__textDragStart;
      
      // CRITICAL FIX: Properly re-enable 3D controls after text dragging
      setControlsEnabled(true);
      useApp.setState({ controlsEnabled: true });
      
      // Force immediate state synchronization
      setTimeout(() => {
        const currentState = useApp.getState().controlsEnabled;
        console.log('🎨 Text dragging ended - controls re-enabled. State:', currentState);
        
        // Dispatch event to force OrbitControls update
        window.dispatchEvent(new CustomEvent('controlsStateChanged', {
          detail: { enabled: true, reason: 'text-dragging-ended' }
        }));
      }, 0);
      
      // Trigger final texture update
      const { composeLayers } = useApp.getState();
      composeLayers(true);
      if ((window as any).updateModelTexture) {
        (window as any).updateModelTexture(true, false);
      }
    }
    
    // CRITICAL FIX: Reset handle dragging state
    if (activeTool === 'vector' && isDraggingHandleRef.current) {
      isDraggingHandleRef.current = false;
      draggingHandleInfoRef.current = null;
      dragStartPosRef.current = null;
      console.log('🎯 Vector: onPointerUp - handle drag ended');
    }
    
    // Reset anchor dragging state
    if (activeTool === 'vector' && isDraggingAnchorRef.current) {
      console.log('🎨 Vector: Stopped dragging anchor');
      isDraggingAnchorRef.current = false;
      dragStartPosRef.current = null;
    }

    // SMOOTH BRUSH: Reset last paint position to prevent connecting different strokes
    lastPaintPositionRef.current = null;
    
    // Reset velocity tracker and smudge state for next stroke
    velocityTrackerRef.current = createVelocityTracker(10);
    lastBrushPointRef.current = null;
    smudgeStateRef.current = { lastX: 0, lastY: 0, initialized: false };
    
    // WET BRUSH BLENDING: Apply color bleeding for watercolor brushes before resetting
    if (activeTool === 'brush' && wetBrushStateRef.current.initialized && wetBrushStateRef.current.points.length > 0) {
      const layer = getActiveLayer();
      const layerCtx = layer?.canvas?.getContext('2d');
      const currentBrushShape = useApp.getState().brushShape;
      if (layerCtx && currentBrushShape === 'watercolor') {
        const wetness = 0.8; // Default wetness for watercolor
        const brushSize = useApp.getState().brushSize;
        
        // Apply color bleeding along the entire stroke path
        applyColorBleeding(
          layerCtx,
          wetBrushStateRef.current.points,
          brushSize / 2,
          wetness,
          2.0 // Bleeding multiplier
        );
        
        // Recompose layers to show the bleeding effect
        useApp.getState().composeLayers();
        updateModelTexture(false, false);
      }
      
      // Reset wet brush state for next stroke
      wetBrushStateRef.current = { points: [], initialized: false };
    }
    
    // Clear last embroidery point when mouse released
    if (activeTool === 'embroidery') {
      useApp.setState({ lastEmbroideryPoint: null });
    }

    // Stop dragging anchor when mouse released
    if (activeTool === 'vector' && isDraggingAnchorRef.current) {
      console.log('🎨 Vector: Stopped dragging anchor');
      isDraggingAnchorRef.current = false;
      dragStartPosRef.current = null;
    }
    
    // Keep controls disabled for continuous drawing tools (they're managed by useEffect)
    if (['brush', 'eraser', 'embroidery', 'fill'].includes(activeTool)) {
      // PERFORMANCE: Reduced logging
      if (Math.random() < 0.01) {
        console.log('🎨 Mouse released - keeping controls disabled for continuous drawing tool:', activeTool);
      }
      
      // CRITICAL FIX: Call composeLayers to transfer layer content to composedCanvas
      // This is essential for making drawings visible on the model
      console.log('🎨 Composing layers to transfer drawings to composedCanvas');
      const { composeLayers } = useApp.getState();
      composeLayers();
      
      // Final texture update when painting ends
      updateModelTexture(false, false);
      
      // Update displacement maps for embroidery (REAL 3D geometry)
      if (false) { // Puff tool removed - will be rebuilt
        const composedDispRaw = (useApp.getState() as any).displacementCanvas;
        
        if (composedDispRaw instanceof HTMLCanvasElement && modelScene) {
          const composedDisp = composedDispRaw;
          // Apply gaussian blur for ultra-smooth displacement (eliminates spikes)
          const blurredDisp = document.createElement('canvas');
          blurredDisp.width = composedDisp.width;
          blurredDisp.height = composedDisp.height;
          const blurCtx = blurredDisp.getContext('2d');
          
          if (blurCtx) {
            // Apply blur filter for smoothness
            // TypeScript: blurCtx is checked above, safe to use
            (blurCtx as CanvasRenderingContext2D).filter = 'blur(2px)'; // Gaussian blur
            (blurCtx as CanvasRenderingContext2D).drawImage(composedDisp, 0, 0);
            (blurCtx as CanvasRenderingContext2D).filter = 'none'; // Reset filter
            
            const dispTexture = new THREE.CanvasTexture(blurredDisp);
            dispTexture.flipY = false;
            dispTexture.needsUpdate = true;
            dispTexture.wrapS = THREE.ClampToEdgeWrapping;
            dispTexture.wrapT = THREE.ClampToEdgeWrapping;
            
            // Puff height removed - will be rebuilt with new 3D geometry approach
            const currentPuffHeight = 1.0; // Default (placeholder)
            
            // CRITICAL FIX: Much larger displacement scale for visible 3D
            // OLD: Scale = 0.5 was too low, puffs were barely visible
            // NEW: Scale = 2.0 means maximum displacement of 2 units when texture is white (255)
            // This ensures puffs are clearly visible and match real garment puffs
            const displacementScale = currentPuffHeight * 2.0;
            
            if (modelScene) {
              // TypeScript: modelScene is checked above, safe to use
              (modelScene as THREE.Object3D).traverse((child: any) => {
              if (child.isMesh && child.material) {
                // One-time geometry subdivision
                if (child.geometry && !child.geometry.userData.puffSubdivided) {
                  const vertexCount = child.geometry.attributes.position.count;
                  if (vertexCount < 10000) {
                    child.geometry = subdivideGeometry(child.geometry, 3); // More subdivision for smoother
                    child.geometry.userData.puffSubdivided = true;
                    console.log('🎨 Subdivided geometry:', vertexCount, '→', child.geometry.attributes.position.count);
                  }
                }
                
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat: any) => {
                  if (mat.isMeshStandardMaterial) {
                    mat.displacementMap = dispTexture;
                    mat.displacementScale = displacementScale;
                    mat.displacementBias = 0;
                    
                    // Generate normal map for realistic lighting
                    const normalCanvas = document.createElement('canvas');
                    normalCanvas.width = blurredDisp.width;
                    normalCanvas.height = blurredDisp.height;
                    const normCtx = normalCanvas.getContext('2d');
                    const tempDispCtx = blurredDisp.getContext('2d');
                    
                    if (normCtx && tempDispCtx) {
                      // Convert blurred displacement to normal map
                      const dispData = tempDispCtx.getImageData(0, 0, blurredDisp.width, blurredDisp.height);
                      const normData = normCtx.createImageData(blurredDisp.width, blurredDisp.height);
                      
                      for (let y = 1; y < blurredDisp.height - 1; y++) {
                        for (let x = 1; x < blurredDisp.width - 1; x++) {
                          const idx = (y * blurredDisp.width + x) * 4;
                          const center = dispData.data[idx];
                          const left = dispData.data[((y * blurredDisp.width + (x - 1)) * 4)];
                          const right = dispData.data[((y * blurredDisp.width + (x + 1)) * 4)];
                          const up = dispData.data[(((y - 1) * blurredDisp.width + x) * 4)];
                          const down = dispData.data[(((y + 1) * blurredDisp.width + x) * 4)];
                          
                          const dx = (right - left) / 255;
                          const dy = (down - up) / 255;
                          const dz = 1.0;
                          
                          normData.data[idx] = Math.floor((dx + 1) * 127.5);
                          normData.data[idx + 1] = Math.floor((dy + 1) * 127.5);
                          normData.data[idx + 2] = Math.floor((dz + 1) * 127.5);
                          normData.data[idx + 3] = 255;
                        }
                      }
                      normCtx.putImageData(normData, 0, 0);
                      
                      const normTexture = new THREE.CanvasTexture(normalCanvas);
                      normTexture.flipY = false;
                      normTexture.needsUpdate = true;
                      mat.normalMap = normTexture;
                      mat.normalScale = new THREE.Vector2(1.5, 1.5);
                    }
                    
                    mat.needsUpdate = true;
                    console.log('🎨 Displacement applied - scale:', displacementScale);
                  }
                });
                }
              });
            }
          }
        }
      } else if (activeTool === 'embroidery') {
        console.log('🎨 Embroidery - updating displacement maps');
        const { composeDisplacementMaps } = useApp.getState();
        composeDisplacementMaps();
        completeEmbroideryPath();
      }
      
      // Save state for undo/redo after drawing operation completes
      const { saveState } = useApp.getState();
      const actionName = activeTool === 'brush' ? 'Brush Stroke' :
                        activeTool === 'eraser' ? 'Erase' :
                        activeTool === 'puffPrint' ? 'Puff Print' :
                        activeTool === 'embroidery' ? 'Embroidery Stitch' :
                        activeTool === 'fill' ? 'Fill' :
                        'Drawing Operation';
      saveState(actionName);
    }
  }, [activeTool, updateModelTexture]);

  // Complete embroidery path - clear current path
  const completeEmbroideryPath = useCallback(() => {
    console.log('🎨 Embroidery: Completing path - clearing current path');
    useApp.setState({ currentEmbroideryPath: [] });
  }, []);

  const onPointerLeave = useCallback((e: any) => {
    if (paintingActiveRef.current) {
      console.log('🎨 ShirtRefactored: onPointerLeave - ending painting');
      paintingActiveRef.current = false;
    }
    
    // Reset cursor when leaving canvas
    document.body.style.cursor = 'default';
    
    // Keep controls disabled for continuous drawing tools (they're managed by useEffect)
    if (['brush', 'eraser', 'embroidery', 'fill'].includes(activeTool)) {
      console.log('🎨 Mouse left - keeping controls disabled for continuous drawing tool:', activeTool);
      
      // Complete embroidery path if mouse leaves during embroidery
      if (activeTool === 'embroidery') {
        completeEmbroideryPath();
    }
    }
  }, [activeTool, completeEmbroideryPath]);

  // Get model data from main app state (no need for synchronization)
  const modelUrl = useApp(state => state.modelUrl);
  const modelType = useApp(state => state.modelType);

  // Handle model loading
  const handleModelLoaded = useCallback((data: ModelData) => {
    setModelData(data);
    setIsLoading(false);
    console.log('✅ Model loaded:', data.url);
    
    // Puff maps initialization removed - will be rebuilt with new 3D geometry approach
  }, []);

  // Embroidery tool now draws simple lines like brush tool with thread effects

  // Helper function to get 3D world position from UV coordinates
  const getWorldPositionFromUV = useCallback((uv: THREE.Vector2): THREE.Vector3 | null => {
    if (!modelScene) return null;

    // Find the closest vertex on the model surface
    let closestVertex: THREE.Vector3 | null = null;
    let minDistance = Infinity;

    modelScene.traverse((child: any) => {
      if (child.isMesh && child.geometry && child.geometry.attributes.position) {
        const positions = child.geometry.attributes.position;
        const uvs = child.geometry.attributes.uv;

        if (uvs) {
          // Find the UV coordinate that matches our target UV
          for (let i = 0; i < uvs.count; i++) {
            const u = uvs.getX(i);
            const v = uvs.getY(i);

            const distance = Math.sqrt((u - uv.x) ** 2 + (v - uv.y) ** 2);
            if (distance < minDistance) {
              minDistance = distance;
              closestVertex = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
              );
            }
          }
        }
      }
    });

    return closestVertex;
  }, [modelScene]);

  // PERFORMANCE: Cache for world-to-UV conversion to avoid expensive searches
  const worldToUVCache = useRef(new Map<string, THREE.Vector2>());
  const CACHE_SIZE_LIMIT = 1000; // Limit cache size to prevent memory leaks

  // Helper function to get UV coordinates from 3D world position
  const getUVFromWorldPosition = useCallback((worldPos: THREE.Vector3): THREE.Vector2 | null => {
    if (!modelScene) return null;

    // PERFORMANCE: Check cache first
    const cacheKey = `${worldPos.x.toFixed(3)},${worldPos.y.toFixed(3)},${worldPos.z.toFixed(3)}`;
    if (worldToUVCache.current.has(cacheKey)) {
      return worldToUVCache.current.get(cacheKey)!;
    }

    // PERFORMANCE: Use a more efficient search with early termination
    let closestUV: THREE.Vector2 | null = null;
    let minDistance = Infinity;
    const searchThreshold = 0.1; // Early termination threshold

    modelScene.traverse((child: any) => {
      if (child.isMesh && child.geometry && child.geometry.attributes.position) {
        const positions = child.geometry.attributes.position;
        const uvs = child.geometry.attributes.uv;

        if (uvs) {
          // PERFORMANCE: Sample every 4th vertex to reduce search time
          for (let i = 0; i < positions.count; i += 4) {
            const vertexPos = new THREE.Vector3(
              positions.getX(i),
              positions.getY(i),
              positions.getZ(i)
            );

            const distance = worldPos.distanceTo(vertexPos);
            if (distance < minDistance) {
              minDistance = distance;
              closestUV = new THREE.Vector2(
                uvs.getX(i),
                uvs.getY(i)
              );
              
              // PERFORMANCE: Early termination if we find a very close match
              if (distance < searchThreshold) {
                break;
              }
            }
          }
        }
      }
    });

    // PERFORMANCE: Cache the result
    if (closestUV && worldToUVCache.current.size < CACHE_SIZE_LIMIT) {
      worldToUVCache.current.set(cacheKey, closestUV);
    }

    return closestUV;
  }, [modelScene]);

  // Create realistic thread geometry with memory leak fix
  const createThreadGeometry = useCallback((
    stitchGroup: THREE.Group,
    worldStart: THREE.Vector3,
    worldEnd: THREE.Vector3,
    stitch: any
  ) => {
    // Calculate thread properties
    const threadLength = worldStart.distanceTo(worldEnd);
    const threadRadius = (stitch.thickness || 0.02) / 2;
    const threadSegments = Math.max(8, Math.floor(threadLength * 20)); // More segments for longer threads

    // Create twisted thread geometry using multiple cylinders
    const twistAmount = 2; // Number of twists per unit length
    const twistSegments = Math.max(4, Math.floor(threadLength * twistAmount));

    // Store geometries and materials for cleanup
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    for (let twist = 0; twist < twistSegments; twist++) {
      const t = twist / twistSegments;
      const segmentStart = worldStart.clone().lerp(worldEnd, t);
      const segmentEnd = worldStart.clone().lerp(worldEnd, (twist + 1) / twistSegments);

      const segmentLength = segmentStart.distanceTo(segmentEnd);

      if (segmentLength < 0.001) continue;

      // Create thread segment geometry
      // Note: We can't use GeometryManager here because each cylinder has unique parameters
      const threadGeometry = new THREE.CylinderGeometry(
        threadRadius * (0.8 + Math.sin(t * Math.PI * 4) * 0.2), // Slight variation in radius
        threadRadius * (0.8 + Math.sin((t + 0.5) * Math.PI * 4) * 0.2),
        segmentLength,
        8,
        2,
        false
      );

      // Position and rotate the thread segment
      const direction = segmentEnd.clone().sub(segmentStart).normalize();
      const midpoint = segmentStart.clone().add(segmentEnd).multiplyScalar(0.5);

      const up = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

      threadGeometry.applyQuaternion(quaternion);
      threadGeometry.translate(midpoint.x, midpoint.y, midpoint.z);

      // Add twist rotation
      threadGeometry.rotateZ(t * Math.PI * 2);

      // Create realistic thread material with subtle texture
      const threadMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(stitch.color || '#ff69b4'),
        roughness: 0.4 + Math.random() * 0.2, // Slight variation for realism
        metalness: 0.05,
        emissive: new THREE.Color(stitch.color || '#ff69b4').multiplyScalar(0.1),
        transparent: true,
        opacity: 0.95,
        // Add subtle normal map for thread texture
        normalScale: new THREE.Vector2(0.1, 0.1)
      });

      const threadMesh = new THREE.Mesh(threadGeometry, threadMaterial);
      threadMesh.castShadow = true;
      threadMesh.receiveShadow = true;

      // Add slight random offset for more realistic thread appearance
      threadMesh.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002
      ));

      // Track for cleanup
      geometriesToDispose.push(threadGeometry);
      materialsToDispose.push(threadMaterial);

      stitchGroup.add(threadMesh);
    }

    // Add cleanup function to the stitch group
    (stitchGroup as any)._disposeThreadResources = () => {
      geometriesToDispose.forEach(geom => geom.dispose());
      materialsToDispose.forEach(mat => mat.dispose());
      console.log('🧠 Disposed', geometriesToDispose.length, 'thread geometries and materials');
    };
  }, []);


  // REMOVED: initializePuffMaps - old puff tool removed
  // initializePuffMaps removed - will be rebuilt with new 3D geometry approach

  // Embroidery tool draws directly on canvas - no 3D geometry needed

  // Handle UV mapping callbacks
  console.log('🎯 ShirtRefactored: About to define handleUVPointFound function...');
  const handleUVPointFound = useCallback((uvPoint: any) => {
    console.log('🎯 UV Point found:', uvPoint);
  }, []);
  console.log('🎯 ShirtRefactored: handleUVPointFound function defined successfully');


  // Handle model loading errors
  console.log('🎯 ShirtRefactored: About to define handleModelError function...');
  const handleModelError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setIsLoading(false);
    console.error('❌ Model loading error:', errorMsg);
  }, []);
  console.log('🎯 ShirtRefactored: handleModelError function defined successfully');

  console.log('🎯 ShirtRefactored: About to return JSX');
  
  return (
    <>
      {/* Enhanced Lighting - Optimized for vibrant fabric materials */}
      {/* <Environment 
        preset="studio" 
        background={false}
        environmentIntensity={1.2}
      /> */}
      
      {/* DEBUG: Check if we reach here */}
      {console.log('🎯 ShirtRefactored: Environment component rendered')}
      
      {/* Additional directional light for highlights and vibrancy */}
      {/* <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.6} 
        color="#ffffff"
        castShadow={false}
      /> */}
      
      {/* Fill light for even illumination */}
      {/* <directionalLight 
        position={[-3, 2, -3]} 
        intensity={0.3} 
        color="#ffffff"
        castShadow={false}
      /> */}

      {/* 3D Model Renderer */}
      {(() => {
        console.log('🎯 ShirtRefactored: About to render ShirtRenderer component');
        console.log('🎯 ShirtRefactored: Props being passed:', {
          onModelLoaded: !!handleModelLoaded,
          onModelError: !!handleModelError,
          wireframe: false,
          showNormals: showDebugInfo
        });
        return (
          <ShirtRenderer
            onModelLoaded={handleModelLoaded}
            onModelError={handleModelError}
            wireframe={false}
            showNormals={showDebugInfo}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
          />
        );
      })()}

      {/* UV Coordinate Mapper - TEMPORARILY DISABLED TO DEBUG */}
      {/* <UVMapper
        onUVPointFound={handleUVPointFound}
        onUVError={(error) => console.warn('UV Mapping error:', error)}
      /> */}

      {/* Using existing useApp painting system instead of Brush3DIntegration */}
      {/* Brush painting is now handled through paintAtEvent calls in pointer handlers */}


      {/* Context Menu for Text Tool */}
      {contextMenu.visible && contextMenu.textId && (
        <Html>
          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              background: 'rgba(30, 30, 30, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              minWidth: '180px',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Context Menu Items */}
            {[
              { label: '✏️ Edit Text', action: () => {
                const { setActiveTextId } = useApp.getState();
                setActiveTextId(contextMenu.textId);
                setContextMenu({ visible: false, x: 0, y: 0, textId: null });
              }},
              { label: '📋 Duplicate', action: () => {
                const { textElements } = useApp.getState();
                const text = textElements.find(t => t.id === contextMenu.textId);
                if (text) {
                  const newText = {
                    ...text,
                    id: `text-${Date.now()}`,
                    u: (text.u || 0.5) + 0.02,
                    v: (text.v || 0.5) + 0.02
                  };
                  const { addTextElementFromApp } = useAdvancedLayerStoreV2.getState();
                  addTextElementFromApp(newText.text, { u: newText.u || 0.5, v: newText.v || 0.5 });
                  const { composeLayers } = useApp.getState();
                  setTimeout(() => {
                    composeLayers(true);
                    if ((window as any).updateModelTexture) {
                      (window as any).updateModelTexture(true, false);
                    }
                  }, 10);
                }
                setContextMenu({ visible: false, x: 0, y: 0, textId: null });
              }},
              { label: '📤 Bring to Front', action: () => {
                const { textElements, updateTextElement } = useApp.getState();
                // Find the highest zIndex among all text elements
                const maxZIndex = Math.max(...textElements.map(t => t.zIndex || 0), 0);
                // Set this text's zIndex to be higher than all others
                updateTextElement(contextMenu.textId!, { zIndex: maxZIndex + 1 });
                console.log('📤 Brought text to front with zIndex:', maxZIndex + 1);
                setContextMenu({ visible: false, x: 0, y: 0, textId: null });
              }},
              { label: '📥 Send to Back', action: () => {
                const { textElements, updateTextElement } = useApp.getState();
                // Find the lowest zIndex among all text elements
                const minZIndex = Math.min(...textElements.map(t => t.zIndex || 0), 0);
                // Set this text's zIndex to be lower than all others
                updateTextElement(contextMenu.textId!, { zIndex: minZIndex - 1 });
                console.log('📥 Sent text to back with zIndex:', minZIndex - 1);
                setContextMenu({ visible: false, x: 0, y: 0, textId: null });
              }},
              { label: '🗑️ Delete', action: () => {
                const { deleteTextElementFromApp } = useAdvancedLayerStoreV2.getState();
                const { setActiveTextId } = useApp.getState();
                if (contextMenu.textId) {
                  deleteTextElementFromApp(contextMenu.textId);
                }
                setActiveTextId(null);
                const { composeLayers } = useApp.getState();
                setTimeout(() => {
                  composeLayers(true);
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture(true, false);
                  }
                }, 10);
                setContextMenu({ visible: false, x: 0, y: 0, textId: null });
              }, divider: true}
            ].map((item, index) => (
              <React.Fragment key={index}>
                {item.divider && index > 0 && (
                  <div style={{
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    margin: '4px 0'
                  }} />
                )}
                <div
                  onClick={item.action}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#fff',
                    transition: 'background 0.15s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {item.label}
                </div>
              </React.Fragment>
            ))}
          </div>
        </Html>
      )}

      {/* Debug Helpers */}
      {showDebugInfo && (
        <axesHelper args={[5]} />
      )}

      {/* Loading indicator inside 3D scene */}
      {isLoading && (
        <Html center>
          <div style={{
            color: '#fff',
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #fff',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }} />
            Loading 3D model...
          </div>
        </Html>
      )}

      {/* Error display inside 3D scene */}
      {error && (
        <Html center>
          <div style={{
            color: '#fff',
            background: 'rgba(255,0,0,0.9)',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Model Loading Error</div>
            <div style={{ fontSize: '0.9em', marginBottom: '15px' }}>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </Html>
      )}

      {/* Selection Visualization - Shows bounding boxes and transform handles */}
      {selectedElements.length > 0 && (
        <SelectionVisualization
          canvasWidth={1024}
          canvasHeight={1024}
          onElementMove={(elementId, newPosition) => {
            console.log('🎯 Element moved:', elementId, newPosition);
            
            // Find the element in the selection system
            const element = selectedElements.find(el => el.id === elementId);
            if (!element) return;
            
            // Convert pixel coordinates to UV coordinates
            const { composedCanvas } = useApp.getState();
            const canvasWidth = composedCanvas?.width || 1024;
            const canvasHeight = composedCanvas?.height || 1024;
            const newU = newPosition.x / canvasWidth;
            const newV = 1 - (newPosition.y / canvasHeight); // Flip V for texture space
            
            // Update element based on type
            switch (element.type) {
              case 'text':
                useApp.getState().updateTextElement(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV))
                });
                break;
              case 'image': {
                const v2State = useAdvancedLayerStoreV2.getState();
                v2State.updateImageElementFromApp(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV))
                });
                break;
              }
              case 'shape':
                useApp.getState().updateShapeElement(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV))
                });
                break;
            }
            
            // Force layer composition and texture update
            useApp.getState().composeLayers();
            updateModelTexture(true, false);
          }}
          onElementResize={(elementId, newBounds) => {
            console.log('🎯 Element resized:', elementId, newBounds);
            
            // Find the element in the selection system
            const element = selectedElements.find(el => el.id === elementId);
            if (!element) return;
            
            // Convert pixel coordinates to UV coordinates
            const { composedCanvas } = useApp.getState();
            const canvasWidth = composedCanvas?.width || 1024;
            const canvasHeight = composedCanvas?.height || 1024;
            const newU = newBounds.minX / canvasWidth;
            const newV = 1 - (newBounds.minY / canvasHeight); // Flip V for texture space
            const newUWidth = newBounds.width / canvasWidth;
            const newUHeight = newBounds.height / canvasHeight;
            
            // Update element based on type
            switch (element.type) {
              case 'text':
                // Text elements use fontSize instead of width/height
                const fontSize = Math.max(8, Math.min(200, newBounds.width * 0.5));
                useApp.getState().updateTextElement(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV)),
                  fontSize: fontSize
                });
                break;
              case 'image': {
                const v2State = useAdvancedLayerStoreV2.getState();
                v2State.updateImageElementFromApp(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV)),
                  uWidth: Math.max(0.01, Math.min(1, newUWidth)),
                  uHeight: Math.max(0.01, Math.min(1, newUHeight))
                });
                break;
              }
              case 'shape':
                useApp.getState().updateShapeElement(elementId, {
                  u: Math.max(0, Math.min(1, newU)),
                  v: Math.max(0, Math.min(1, newV)),
                  uWidth: Math.max(0.01, Math.min(1, newUWidth)),
                  uHeight: Math.max(0.01, Math.min(1, newUHeight))
                });
                break;
            }
            
            // Force layer composition and texture update
            useApp.getState().composeLayers();
            updateModelTexture(true, false);
          }}
        />
      )}

    </>
  );
}

export default ShirtRefactored;


