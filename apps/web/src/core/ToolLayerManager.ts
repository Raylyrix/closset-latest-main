/**
 * 🛠️ TOOL-TO-LAYER INTEGRATION SYSTEM
 * 
 * This system automatically creates and manages layers for all tools
 * in the left panel, ensuring everything is trackable and controllable.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { UnifiedLayerBridge } from './UnifiedLayerBridge';

// ============================================================================
// TOOL LAYER MANAGER CLASS
// ============================================================================

export class ToolLayerManager {
  private static instance: ToolLayerManager;
  private appStore: any = null;
  private advancedStore: any = null;
  private bridge: UnifiedLayerBridge | null = null;
  private toolLayers: Map<string, string> = new Map(); // toolId -> layerId mapping
  private isInitialized = false;

  static getInstance(): ToolLayerManager {
    if (!ToolLayerManager.instance) {
      ToolLayerManager.instance = new ToolLayerManager();
    }
    return ToolLayerManager.instance;
  }

  /**
   * Initialize the tool layer manager
   */
  initialize(appStore: any, advancedStore: any, bridge: UnifiedLayerBridge) {
    this.appStore = appStore;
    this.advancedStore = advancedStore;
    this.bridge = bridge;
    this.isInitialized = true;
    
    console.log('🛠️ ToolLayerManager initialized');
    
    // Set up tool monitoring
    this.setupToolMonitoring();
  }

  /**
   * Set up monitoring for tool changes
   */
  private setupToolMonitoring() {
    if (!this.isInitialized) return;

    // Note: We'll handle tool monitoring through manual calls
    // instead of trying to subscribe directly to Zustand stores
    console.log('🛠️ Setting up tool monitoring');
    
    // We'll monitor tools through the bridge methods instead
  }

  /**
   * Ensure a layer exists for the given tool
   */
  ensureToolLayer(toolId: string): string {
    if (!this.isInitialized) return '';

    // Check if layer already exists for this tool
    if (this.toolLayers.has(toolId)) {
      return this.toolLayers.get(toolId)!;
    }

    // Create new layer for tool
    const layerId = this.createToolLayer(toolId);
    this.toolLayers.set(toolId, layerId);
    
    console.log(`🛠️ Created layer for tool: ${toolId} -> ${layerId}`);
    return layerId;
  }

  /**
   * Create a layer for a specific tool
   */
  private createToolLayer(toolId: string): string {
    if (!this.bridge) return '';

    const toolConfig = this.getToolConfig(toolId);
    const layerId = this.bridge.handleLayerCreate(
      toolConfig.type,
      toolConfig.name,
      {
        toolId,
        toolType: toolId,
        visible: true,
        opacity: 1.0,
        blendMode: toolConfig.blendMode,
        order: this.getNextLayerOrder()
      }
    );

    return layerId || '';
  }

  /**
   * Get configuration for a tool
   */
  private getToolConfig(toolId: string): any {
    const toolConfigs: Record<string, any> = {
      'brush': {
        type: 'raster',
        name: 'Brush Layer',
        blendMode: 'normal'
      },
      'eraser': {
        type: 'raster',
        name: 'Eraser Layer',
        blendMode: 'destination-out'
      },
      'puffPrint': {
        type: 'raster',
        name: 'Puff Print Layer',
        blendMode: 'multiply'
      },
      'embroidery': {
        type: 'raster',
        name: 'Embroidery Layer',
        blendMode: 'overlay'
      },
      'text': {
        type: 'text',
        name: 'Text Layer',
        blendMode: 'normal'
      },
      'shapes': {
        type: 'shape',
        name: 'Shape Layer',
        blendMode: 'normal'
      },
      'vector': {
        type: 'vector',
        name: 'Vector Layer',
        blendMode: 'normal'
      },
      'fill': {
        type: 'raster',
        name: 'Fill Layer',
        blendMode: 'normal'
      },
      'picker': {
        type: 'raster',
        name: 'Picker Layer',
        blendMode: 'normal'
      },
      'smudge': {
        type: 'raster',
        name: 'Smudge Layer',
        blendMode: 'normal'
      },
      'blur': {
        type: 'raster',
        name: 'Blur Layer',
        blendMode: 'normal'
      }
    };

    return toolConfigs[toolId] || {
      type: 'raster',
      name: `${toolId} Layer`,
      blendMode: 'normal'
    };
  }

  /**
   * Get the next layer order number
   */
  private getNextLayerOrder(): number {
    if (!this.appStore) return 0;
    
    const { layers } = this.appStore.getState();
    return layers.length;
  }

  /**
   * Sync tool data to layers
   */
  private syncToolDataToLayers(state: any) {
    if (!this.isInitialized) return;

    // Sync text elements
    if (state.textElements && Array.isArray(state.textElements)) {
      state.textElements.forEach((textElement: any) => {
        this.syncTextElementToLayer(textElement);
      });
    }

    // Sync shape elements
    if (state.shapeElements && Array.isArray(state.shapeElements)) {
      state.shapeElements.forEach((shapeElement: any) => {
        this.syncShapeElementToLayer(shapeElement);
      });
    }

    // Sync vector paths
    if (state.vectorPaths && Array.isArray(state.vectorPaths)) {
      state.vectorPaths.forEach((vectorPath: any) => {
        this.syncVectorPathToLayer(vectorPath);
      });
    }

    // Sync decals
    if (state.decals && Array.isArray(state.decals)) {
      state.decals.forEach((decal: any) => {
        this.syncDecalToLayer(decal);
      });
    }
  }

  /**
   * Sync text element to layer
   */
  private syncTextElementToLayer(textElement: any) {
    const layerId = this.ensureToolLayer('text');
    if (!layerId || !this.bridge) return;

    this.bridge.handleLayerUpdate(layerId, {
      textData: {
        content: textElement.content,
        fontFamily: textElement.fontFamily,
        fontSize: textElement.fontSize,
        fontWeight: textElement.fontWeight,
        fontStyle: textElement.fontStyle,
        color: textElement.color,
        alignment: textElement.alignment,
        lineHeight: textElement.lineHeight,
        letterSpacing: textElement.letterSpacing,
        wordSpacing: textElement.wordSpacing,
        textDecoration: textElement.textDecoration,
        textTransform: textElement.textTransform,
        textShadow: textElement.textShadow
      },
      visible: textElement.visible !== false,
      opacity: textElement.opacity || 1.0
    });
  }

  /**
   * Sync shape element to layer
   */
  private syncShapeElementToLayer(shapeElement: any) {
    const layerId = this.ensureToolLayer('shapes');
    if (!layerId || !this.bridge) return;

    this.bridge.handleLayerUpdate(layerId, {
      shapeData: {
        shapeType: shapeElement.shapeType,
        fillColor: shapeElement.fillColor,
        strokeColor: shapeElement.strokeColor,
        strokeWidth: shapeElement.strokeWidth,
        pathData: shapeElement.pathData,
        cornerRadius: shapeElement.cornerRadius,
        sides: shapeElement.sides,
        innerRadius: shapeElement.innerRadius
      },
      visible: shapeElement.visible !== false,
      opacity: shapeElement.opacity || 1.0
    });
  }

  /**
   * Sync vector path to layer
   */
  private syncVectorPathToLayer(vectorPath: any) {
    const layerId = this.ensureToolLayer('vector');
    if (!layerId || !this.bridge) return;

    this.bridge.handleLayerUpdate(layerId, {
      vectorData: {
        points: vectorPath.points,
        closed: vectorPath.closed,
        strokeColor: vectorPath.strokeColor,
        strokeWidth: vectorPath.strokeWidth,
        fillColor: vectorPath.fillColor
      },
      visible: vectorPath.visible !== false,
      opacity: vectorPath.opacity || 1.0
    });
  }

  /**
   * Sync decal to layer
   */
  private syncDecalToLayer(decal: any) {
    const layerId = this.ensureToolLayer('decal');
    if (!layerId || !this.bridge) return;

    this.bridge.handleLayerUpdate(layerId, {
      decalData: {
        image: decal.image,
        position: decal.position,
        scale: decal.scale,
        rotation: decal.rotation,
        opacity: decal.opacity
      },
      visible: decal.visible !== false,
      opacity: decal.opacity || 1.0
    });
  }

  /**
   * Get layer ID for a tool
   */
  getLayerForTool(toolId: string): string | null {
    return this.toolLayers.get(toolId) || null;
  }

  /**
   * Get all tool layers
   */
  getAllToolLayers(): Map<string, string> {
    return new Map(this.toolLayers);
  }

  /**
   * Remove tool layer
   */
  removeToolLayer(toolId: string) {
    const layerId = this.toolLayers.get(toolId);
    if (layerId && this.bridge) {
      this.bridge.handleLayerDelete(layerId);
      this.toolLayers.delete(toolId);
      console.log(`🛠️ Removed layer for tool: ${toolId}`);
    }
  }

  /**
   * Update tool layer properties
   */
  updateToolLayer(toolId: string, updates: any) {
    const layerId = this.toolLayers.get(toolId);
    if (layerId && this.bridge) {
      this.bridge.handleLayerUpdate(layerId, updates);
    }
  }

  /**
   * Sync all existing tools to layers
   */
  syncAllToolsToLayers() {
    if (!this.isInitialized) return;

    console.log('🛠️ Syncing all tools to layers...');

    const appState = this.appStore.getState();
    
    // Create layers for all active tools
    const activeTool = appState.activeTool;
    if (activeTool) {
      this.ensureToolLayer(activeTool);
    }

    // Sync all tool data
    this.syncToolDataToLayers(appState);

    console.log('🛠️ Tool-to-layer sync completed');
  }

  /**
   * Get tool layer statistics
   */
  getToolLayerStats() {
    return {
      totalToolLayers: this.toolLayers.size,
      toolLayers: Array.from(this.toolLayers.entries()).map(([toolId, layerId]) => ({
        toolId,
        layerId,
        config: this.getToolConfig(toolId)
      }))
    };
  }
}

// ============================================================================
// REACT HOOK FOR TOOL LAYER MANAGEMENT
// ============================================================================

export function useToolLayerManager() {
  // FIXED: Don't call the hooks - pass the store functions themselves
  const managerRef = useRef<ToolLayerManager | null>(null);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = ToolLayerManager.getInstance();
      
      // Get the unified bridge
      const bridge = (window as any).unifiedLayerBridge;
      if (bridge) {
        // Pass the store functions, not the state
        managerRef.current.initialize(useApp, useAdvancedLayerStoreV2, bridge); // FIXED: useAdvancedLayerStore doesn't exist
      } else {
        console.warn('🛠️ UnifiedLayerBridge not found, tool layer manager will initialize later');
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  const ensureToolLayer = useCallback((toolId: string) => {
    if (managerRef.current) {
      return managerRef.current.ensureToolLayer(toolId);
    }
    return '';
  }, []);

  const getLayerForTool = useCallback((toolId: string) => {
    if (managerRef.current) {
      return managerRef.current.getLayerForTool(toolId);
    }
    return null;
  }, []);

  const updateToolLayer = useCallback((toolId: string, updates: any) => {
    if (managerRef.current) {
      managerRef.current.updateToolLayer(toolId, updates);
    }
  }, []);

  const syncAllToolsToLayers = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.syncAllToolsToLayers();
    }
  }, []);

  const getToolLayerStats = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.getToolLayerStats();
    }
    return null;
  }, []);

  return {
    ensureToolLayer,
    getLayerForTool,
    updateToolLayer,
    syncAllToolsToLayers,
    getToolLayerStats
  };
}

export default ToolLayerManager;
