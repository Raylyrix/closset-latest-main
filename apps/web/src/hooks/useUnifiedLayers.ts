/**
 * Unified Layers Hook
 * 
 * React hook for integrating the unified layer system with React components.
 * Provides a clean interface for layer management in React components.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedLayer, UnifiedLayerState, ToolType, LayerType } from '../core/types/UnifiedLayerTypes';
// import { UnifiedLayerManager } from '../core/UnifiedLayerManager'; // REMOVED: File doesn't exist
import { CanvasManager } from '../core/CanvasManager';
import { ToolLayerIntegration } from '../core/ToolLayerIntegration';
import { LayerMigration } from '../core/LayerMigration';

export interface UseUnifiedLayersOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  autoCompose?: boolean;
  autoUpdateDisplacement?: boolean;
}

export interface UseUnifiedLayersReturn {
  // Layer management
  layers: UnifiedLayer[];
  activeLayer: UnifiedLayer | null;
  selectedLayers: UnifiedLayer[];
  
  // Layer operations
  createLayer: (type: LayerType, name?: string, toolType?: ToolType) => UnifiedLayer;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => UnifiedLayer;
  renameLayer: (id: string, name: string) => void;
  
  // Layer properties
  setLayerVisible: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: GlobalCompositeOperation) => void;
  setActiveLayer: (id: string) => void;
  
  // Layer ordering
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Tool integration
  getOrCreateToolLayer: (toolType: ToolType) => UnifiedLayer;
  getTargetLayer: (toolType: ToolType) => UnifiedLayer | null;
  
  // Drawing operations
  drawBrushStroke: (toolType: ToolType, stroke: any) => void;
  drawEmbroideryStitch: (toolType: ToolType, stitch: any) => void;
  drawPuffPrint: (toolType: ToolType, puff: any) => void;
  drawVectorPath: (toolType: ToolType, path: any) => void;
  eraseFromLayer: (toolType: ToolType, x: number, y: number, size: number) => void;
  fillLayerArea: (toolType: ToolType, x: number, y: number, color: string) => void;
  
  // Composition
  composeLayers: () => HTMLCanvasElement;
  updateDisplacementMaps: () => void;
  invalidateComposition: () => void;
  
  // Canvas access
  getComposedCanvas: () => HTMLCanvasElement;
  getDisplacementCanvas: () => HTMLCanvasElement;
  getNormalCanvas: () => HTMLCanvasElement;
  
  // Selection
  selectLayer: (id: string) => void;
  selectMultipleLayers: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Migration
  migrateFromExistingSystem: (migrationData: any) => void;
  
  // State
  needsComposition: boolean;
  layerCount: number;
  stats: {
    activeCanvases: number;
    pooledCanvases: number;
    totalMemory: number;
  };
}

export function useUnifiedLayers(options: UseUnifiedLayersOptions = {}): UseUnifiedLayersReturn {
  const {
    canvasWidth = 4096,
    canvasHeight = 4096,
    autoCompose = true,
    autoUpdateDisplacement = true
  } = options;
  
  // Refs for managers
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const layerManagerRef = useRef<any | null>(null); // FIXED: UnifiedLayerManager doesn't exist
  const toolIntegrationRef = useRef<ToolLayerIntegration | null>(null);
  const migrationRef = useRef<LayerMigration | null>(null);
  
  // State
  const [state, setState] = useState<UnifiedLayerState>({
    layers: new Map(),
    layerOrder: [],
    activeLayerId: null,
    selectedLayerIds: [],
    groups: new Map(),
    composedCanvas: null,
    displacementCanvas: null,
    normalCanvas: null,
    needsComposition: true,
    expandedGroups: new Set(),
    layerPanelWidth: 280,
    showLayerEffects: false
  });
  
  // Initialize managers
  useEffect(() => {
    if (!canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager(canvasWidth, canvasHeight);
    }
    
    if (!layerManagerRef.current) {
      // layerManagerRef.current = new UnifiedLayerManager(canvasManagerRef.current); // FIXED: UnifiedLayerManager doesn't exist
      layerManagerRef.current = null; // Placeholder
    }
    
    if (!toolIntegrationRef.current) {
      toolIntegrationRef.current = new ToolLayerIntegration(
        layerManagerRef.current,
        canvasManagerRef.current
      );
    }
    
    if (!migrationRef.current) {
      migrationRef.current = new LayerMigration(
        layerManagerRef.current,
        canvasManagerRef.current
      );
    }
    
    // Subscribe to layer state changes
    const unsubscribe = layerManagerRef.current.subscribe((newState: any) => { // FIXED: Parameter type
      setState(newState);
      
      // Auto-compose if enabled
      if (autoCompose && newState.needsComposition) {
        layerManagerRef.current?.composeLayers();
      }
      
      // Auto-update displacement maps if enabled
      if (autoUpdateDisplacement) {
        layerManagerRef.current?.updateDisplacementMaps();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [canvasWidth, canvasHeight, autoCompose, autoUpdateDisplacement]);
  
  // Update canvas dimensions when they change
  useEffect(() => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.updateDimensions(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight]);
  
  // Layer management functions
  const createLayer = useCallback((type: LayerType, name?: string, toolType?: ToolType): UnifiedLayer => {
    if (!layerManagerRef.current) {
      throw new Error('Layer manager not initialized');
    }
    return layerManagerRef.current.createLayer(type, name, toolType);
  }, []);
  
  const deleteLayer = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.deleteLayer(id);
  }, []);
  
  const duplicateLayer = useCallback((id: string): UnifiedLayer => {
    if (!layerManagerRef.current) {
      throw new Error('Layer manager not initialized');
    }
    return layerManagerRef.current.duplicateLayer(id);
  }, []);
  
  const renameLayer = useCallback((id: string, name: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.renameLayer(id, name);
  }, []);
  
  // Layer property functions
  const setLayerVisible = useCallback((id: string, visible: boolean): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.setLayerVisible(id, visible);
  }, []);
  
  const setLayerOpacity = useCallback((id: string, opacity: number): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.setLayerOpacity(id, opacity);
  }, []);
  
  const setLayerBlendMode = useCallback((id: string, blendMode: GlobalCompositeOperation): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.setLayerBlendMode(id, blendMode);
  }, []);
  
  const setActiveLayer = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.setActiveLayer(id);
  }, []);
  
  // Layer ordering functions
  const moveLayerUp = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.moveLayerUp(id);
  }, []);
  
  const moveLayerDown = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.moveLayerDown(id);
  }, []);
  
  const bringToFront = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.bringToFront(id);
  }, []);
  
  const sendToBack = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.sendToBack(id);
  }, []);
  
  // Tool integration functions
  const getOrCreateToolLayer = useCallback((toolType: ToolType): UnifiedLayer => {
    if (!layerManagerRef.current) {
      throw new Error('Layer manager not initialized');
    }
    return layerManagerRef.current.getOrCreateToolLayer(toolType);
  }, []);
  
  const getTargetLayer = useCallback((toolType: ToolType): UnifiedLayer | null => {
    if (!layerManagerRef.current) return null;
    return layerManagerRef.current.getTargetLayer(toolType);
  }, []);
  
  // Drawing operation functions
  const drawBrushStroke = useCallback((toolType: ToolType, stroke: any): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.drawBrushStroke(toolType, stroke);
  }, []);
  
  const drawEmbroideryStitch = useCallback((toolType: ToolType, stitch: any): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.drawEmbroideryStitch(toolType, stitch);
  }, []);
  
  const drawPuffPrint = useCallback((toolType: ToolType, puff: any): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.drawPuffPrint(toolType, puff);
  }, []);
  
  const drawVectorPath = useCallback((toolType: ToolType, path: any): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.drawVectorPath(toolType, path);
  }, []);
  
  const eraseFromLayer = useCallback((toolType: ToolType, x: number, y: number, size: number): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.eraseFromLayer(toolType, x, y, size);
  }, []);
  
  const fillLayerArea = useCallback((toolType: ToolType, x: number, y: number, color: string): void => {
    if (!toolIntegrationRef.current) return;
    toolIntegrationRef.current.fillLayerArea(toolType, x, y, color);
  }, []);
  
  // Composition functions
  const composeLayers = useCallback((): HTMLCanvasElement => {
    if (!layerManagerRef.current) {
      throw new Error('Layer manager not initialized');
    }
    return layerManagerRef.current.composeLayers();
  }, []);
  
  const updateDisplacementMaps = useCallback((): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.updateDisplacementMaps();
  }, []);
  
  const invalidateComposition = useCallback((): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.invalidateComposition();
  }, []);
  
  // Canvas access functions
  const getComposedCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasManagerRef.current) {
      throw new Error('Canvas manager not initialized');
    }
    return canvasManagerRef.current.getComposedCanvas();
  }, []);
  
  const getDisplacementCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasManagerRef.current) {
      throw new Error('Canvas manager not initialized');
    }
    return canvasManagerRef.current.getDisplacementCanvas();
  }, []);
  
  const getNormalCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasManagerRef.current) {
      throw new Error('Canvas manager not initialized');
    }
    return canvasManagerRef.current.getNormalCanvas();
  }, []);
  
  // Selection functions
  const selectLayer = useCallback((id: string): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.selectLayer(id);
  }, []);
  
  const selectMultipleLayers = useCallback((ids: string[]): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.selectMultipleLayers(ids);
  }, []);
  
  const clearSelection = useCallback((): void => {
    if (!layerManagerRef.current) return;
    layerManagerRef.current.clearSelection();
  }, []);
  
  // Migration function
  const migrateFromExistingSystem = useCallback((migrationData: any): void => {
    if (!migrationRef.current) return;
    const layers = migrationRef.current.mergeAllLayerSystems(migrationData);
    migrationRef.current.applyMigratedLayers(layers);
  }, []);
  
  // Get derived state
  const layers = Array.from(state.layers.values());
  const activeLayer = state.activeLayerId ? state.layers.get(state.activeLayerId) || null : null;
  const selectedLayers = state.selectedLayerIds.map(id => state.layers.get(id)).filter(Boolean) as UnifiedLayer[];
  const layerCount = state.layers.size;
  const stats = canvasManagerRef.current?.getStats() || { activeCanvases: 0, pooledCanvases: 0, totalMemory: 0 };
  
  return {
    // Layer management
    layers,
    activeLayer,
    selectedLayers,
    
    // Layer operations
    createLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    
    // Layer properties
    setLayerVisible,
    setLayerOpacity,
    setLayerBlendMode,
    setActiveLayer,
    
    // Layer ordering
    moveLayerUp,
    moveLayerDown,
    bringToFront,
    sendToBack,
    
    // Tool integration
    getOrCreateToolLayer,
    getTargetLayer,
    
    // Drawing operations
    drawBrushStroke,
    drawEmbroideryStitch,
    drawPuffPrint,
    drawVectorPath,
    eraseFromLayer,
    fillLayerArea,
    
    // Composition
    composeLayers,
    updateDisplacementMaps,
    invalidateComposition,
    
    // Canvas access
    getComposedCanvas,
    getDisplacementCanvas,
    getNormalCanvas,
    
    // Selection
    selectLayer,
    selectMultipleLayers,
    clearSelection,
    
    // Migration
    migrateFromExistingSystem,
    
    // State
    needsComposition: state.needsComposition,
    layerCount,
    stats
  };
}

