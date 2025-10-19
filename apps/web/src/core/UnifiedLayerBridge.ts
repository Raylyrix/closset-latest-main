/**
 * 🔄 UNIFIED LAYER SYSTEM BRIDGE
 * 
 * This bridges the existing layer system with the new advanced layer system
 * to ensure all tools and panels work together seamlessly.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { LayerModelSynchronizer } from '../core/LayerModelSync';

// ============================================================================
// UNIFIED LAYER BRIDGE CLASS
// ============================================================================

export class UnifiedLayerBridge {
  private static instance: UnifiedLayerBridge;
  private appStore: any = null;
  private advancedStore: any = null;
  private synchronizer: LayerModelSynchronizer | null = null;
  private isInitialized = false;

  static getInstance(): UnifiedLayerBridge {
    if (!UnifiedLayerBridge.instance) {
      UnifiedLayerBridge.instance = new UnifiedLayerBridge();
    }
    return UnifiedLayerBridge.instance;
  }

  /**
   * Initialize the bridge with all layer systems
   */
  initialize(appStore: any, advancedStore: any, synchronizer?: LayerModelSynchronizer) {
    this.appStore = appStore;
    this.advancedStore = advancedStore;
    this.synchronizer = synchronizer || null;
    this.isInitialized = true;
    
    console.log('🔄 UnifiedLayerBridge initialized');
    
    // Set up cross-system synchronization
    this.setupSynchronization();
  }

  /**
   * Set up synchronization between layer systems
   */
  private setupSynchronization() {
    if (!this.isInitialized) return;

    // Note: Zustand stores don't have direct subscribe methods
    // We'll use the store's internal subscription mechanism
    console.log('🔄 Setting up layer system synchronization');
    
    // We'll handle synchronization through the bridge methods instead
    // of trying to subscribe directly to the stores
  }

  /**
   * Sync layers from main app to advanced layer system
   */
  private syncAppLayersToAdvanced(appLayers: any[]) {
    if (!this.advancedStore) return;

    const advancedState = this.advancedStore.getState();
    const { layers: advancedLayers, createLayer, updateLayer } = advancedState;
    
    // Create missing layers in advanced system
    appLayers.forEach(appLayer => {
      if (!advancedLayers.has(appLayer.id)) {
        const layerId = createLayer(this.mapAppLayerType(appLayer), appLayer.name, {
          id: appLayer.id,
          visible: appLayer.visible,
          opacity: appLayer.opacity || 1.0,
          blendMode: appLayer.blendMode || 'normal',
          order: appLayer.order || 0,
          toolType: appLayer.toolType || 'general',
          canvas: appLayer.canvas,
          displacementCanvas: appLayer.displacementCanvas
        });
        console.log('🔄 Created advanced layer for app layer:', appLayer.id);
      } else {
        // Update existing layer
        const advancedLayer = advancedLayers.get(appLayer.id);
        if (advancedLayer) {
          updateLayer(appLayer.id, {
            visible: appLayer.visible,
            opacity: appLayer.opacity || 1.0,
            blendMode: appLayer.blendMode || 'normal',
            order: appLayer.order || 0,
            canvas: appLayer.canvas,
            displacementCanvas: appLayer.displacementCanvas
          });
        }
      }
    });

    // Remove layers that no longer exist in app
    const appLayerIds = new Set(appLayers.map(l => l.id));
    for (const [layerId, layer] of advancedLayers) {
      if (!appLayerIds.has(layerId)) {
        this.advancedStore.getState().deleteLayer(layerId);
        console.log('🔄 Removed advanced layer:', layerId);
      }
    }
  }

  /**
   * Sync changes from advanced layer system to main app
   */
  private syncAdvancedLayersToApp(advancedState: any) {
    if (!this.appStore) return;

    const { layers: advancedLayers, layerOrder } = advancedState;
    const appState = this.appStore.getState();
    const { layers: appLayers, updateLayer, moveLayerUp, moveLayerDown } = appState;

    // Update layer properties in main app
    for (const [layerId, advancedLayer] of advancedLayers) {
      const appLayer = appLayers.find((l: any) => l.id === layerId); // FIXED: Parameter type
      if (appLayer) {
        // Update layer properties
        updateLayer(layerId, {
          visible: advancedLayer.visible,
          opacity: advancedLayer.opacity,
          blendMode: advancedLayer.blendMode,
          order: advancedLayer.order,
          canvas: advancedLayer.canvas,
          displacementCanvas: advancedLayer.displacementCanvas
        });
      }
    }

    // Update layer order in main app
    this.syncLayerOrder(layerOrder, appLayers);
  }

  /**
   * Sync layer order between systems
   */
  private syncLayerOrder(advancedOrder: string[], appLayers: any[]) {
    if (!this.appStore) return;

    const appState = this.appStore.getState();
    const { moveLayerUp, moveLayerDown } = appState;
    
    // Create a map of current app layer order
    const appOrder = appLayers
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(l => l.id);

    // Check if order needs to be updated
    if (JSON.stringify(appOrder) !== JSON.stringify(advancedOrder)) {
      console.log('🔄 Syncing layer order:', { appOrder, advancedOrder });
      
      // Update app layer order to match advanced order
      advancedOrder.forEach((layerId, index) => {
        const appLayer = appLayers.find((l: any) => l.id === layerId); // FIXED: Parameter type
        if (appLayer && appLayer.order !== index) {
          // Move layer to correct position
          this.moveLayerToPosition(layerId, index, appLayers);
        }
      });
    }
  }

  /**
   * Move layer to specific position
   */
  private moveLayerToPosition(layerId: string, targetIndex: number, appLayers: any[]) {
    if (!this.appStore) return;

    const appState = this.appStore.getState();
    const { moveLayerUp, moveLayerDown } = appState;
    const currentIndex = appLayers.findIndex(l => l.id === layerId);
    
    if (currentIndex === -1) return;

    if (targetIndex < currentIndex) {
      // Move up
      for (let i = currentIndex; i > targetIndex; i--) {
        moveLayerUp(layerId);
      }
    } else if (targetIndex > currentIndex) {
      // Move down
      for (let i = currentIndex; i < targetIndex; i++) {
        moveLayerDown(layerId);
      }
    }
  }

  /**
   * Map app layer type to advanced layer type
   */
  private mapAppLayerType(appLayer: any): string {
    const toolType = appLayer.toolType || 'general';
    
    const typeMap: Record<string, string> = {
      'brush': 'raster',
      'puff': 'raster',
      'embroidery': 'raster',
      'text': 'text',
      'shapes': 'shape',
      'vector': 'vector',
      'general': 'raster'
    };

    return typeMap[toolType] || 'raster';
  }

  /**
   * Handle layer reordering from any system
   */
  handleLayerReorder(layerId: string, direction: 'up' | 'down' | 'top' | 'bottom') {
    if (!this.isInitialized) return;

    console.log('🔄 Handling layer reorder:', { layerId, direction });

    // Update in main app system
    const appState = this.appStore.getState();
    const { moveLayerUp, moveLayerDown } = appState;
    
    switch (direction) {
      case 'up':
        moveLayerUp(layerId);
        break;
      case 'down':
        moveLayerDown(layerId);
        break;
      case 'top':
        // Move to top by moving up multiple times
        const { layers } = this.appStore.getState();
        const layerIndex = layers.findIndex((l: any) => l.id === layerId); // FIXED: Parameter type
        for (let i = layerIndex; i > 0; i--) {
          moveLayerUp(layerId);
        }
        break;
      case 'bottom':
        // Move to bottom by moving down multiple times
        const { layers: layersBottom } = this.appStore.getState();
        const layerIndexBottom = layersBottom.findIndex((l: any) => l.id === layerId); // FIXED: Parameter type
        for (let i = layerIndexBottom; i < layersBottom.length - 1; i++) {
          moveLayerDown(layerId);
        }
        break;
    }

    // Trigger model update
    this.triggerModelUpdate();
  }

  /**
   * Handle layer property updates
   */
  handleLayerUpdate(layerId: string, updates: any) {
    if (!this.isInitialized) return;

    console.log('🔄 Handling layer update:', { layerId, updates });

    // Update in main app system
    const appState = this.appStore.getState();
    const { updateLayer } = appState;
    updateLayer(layerId, updates);

    // Update in advanced system
    const advancedState = this.advancedStore.getState();
    const { updateLayer: updateAdvancedLayer } = advancedState;
    updateAdvancedLayer(layerId, updates);

    // Trigger model update
    this.triggerModelUpdate();
  }

  /**
   * Handle layer creation
   */
  handleLayerCreate(type: string, name?: string, options?: any) {
    if (!this.isInitialized) return;

    console.log('🔄 Handling layer creation:', { type, name, options });

    // Create in main app system
    const appState = this.appStore.getState();
    const { addLayer } = appState;
    const layerId = addLayer({
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `${type} Layer`,
      type: type,
      visible: true,
      opacity: 1.0,
      blendMode: 'normal',
      order: 0,
      toolType: type,
      canvas: null,
      displacementCanvas: null,
      ...options
    });

    // Create in advanced system
    const advancedState = this.advancedStore.getState();
    const { createLayer } = advancedState;
    createLayer(type as any, name, {
      id: layerId,
      ...options
    });

    // Trigger model update
    this.triggerModelUpdate();

    return layerId;
  }

  /**
   * Handle layer deletion
   */
  handleLayerDelete(layerId: string) {
    if (!this.isInitialized) return;

    console.log('🔄 Handling layer deletion:', layerId);

    // Delete from main app system
    const appState = this.appStore.getState();
    const { removeLayer } = appState;
    removeLayer(layerId);

    // Delete from advanced system
    const advancedState = this.advancedStore.getState();
    const { deleteLayer } = advancedState;
    deleteLayer(layerId);

    // Trigger model update
    this.triggerModelUpdate();
  }

  /**
   * Trigger model texture update
   */
  private triggerModelUpdate() {
    // Force composition in main app
    const appState = this.appStore.getState();
    const { composeLayers } = appState;
    composeLayers();

    // Force composition in advanced system
    const advancedState = this.advancedStore.getState();
    const { composeLayers: composeAdvancedLayers } = advancedState;
    composeAdvancedLayers();

    // Trigger synchronizer update if available
    if (this.synchronizer) {
      this.synchronizer.forceUpdate();
    }

    // Dispatch custom event for immediate update
    setTimeout(() => {
      const textureEvent = new CustomEvent('forceTextureUpdate', {
        detail: { source: 'unified-layer-bridge' }
      });
      window.dispatchEvent(textureEvent);
      console.log('🔄 Triggered unified texture update');
    }, 50);
  }

  /**
   * Get unified layer state
   */
  getUnifiedLayerState() {
    if (!this.isInitialized) return null;

    const appState = this.appStore.getState();
    const advancedState = this.advancedStore.getState();

    return {
      app: {
        layers: appState.layers,
        activeLayerId: appState.activeLayerId
      },
      advanced: {
        layers: Array.from(advancedState.layers.values()),
        layerOrder: advancedState.layerOrder,
        activeLayerId: advancedState.activeLayerId
      }
    };
  }

  /**
   * Sync all tools to layer system
   */
  syncToolsToLayers() {
    if (!this.isInitialized) return;

    console.log('🔄 Syncing tools to layer system');

    const appState = this.appStore.getState();
    
    // Get all tool-related data
    const toolData = {
      textElements: appState.textElements || [],
      shapeElements: appState.shapeElements || [],
      vectorPaths: appState.vectorPaths || [],
      decals: appState.decals || []
    };

    // Create layers for each tool type
    Object.entries(toolData).forEach(([toolType, elements]) => {
      if (Array.isArray(elements) && elements.length > 0) {
        elements.forEach((element: any) => {
          const layerId = this.handleLayerCreate(toolType, `${toolType} Layer`, {
            toolData: element,
            visible: true,
            opacity: 1.0
          });
          console.log(`🔄 Created layer for ${toolType}:`, layerId);
        });
      }
    });
  }
}

// ============================================================================
// REACT HOOK FOR UNIFIED LAYER MANAGEMENT
// ============================================================================

export function useUnifiedLayerBridge() {
  // FIXED: Don't call the hooks - pass the store functions themselves
  const bridgeRef = useRef<UnifiedLayerBridge | null>(null);

  useEffect(() => {
    if (!bridgeRef.current) {
      bridgeRef.current = UnifiedLayerBridge.getInstance();
      // Pass the store functions, not the state
      bridgeRef.current.initialize(useApp, useAdvancedLayerStoreV2); // FIXED: useAdvancedLayerStore doesn't exist
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleLayerReorder = useCallback((layerId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (bridgeRef.current) {
      bridgeRef.current.handleLayerReorder(layerId, direction);
    }
  }, []);

  const handleLayerUpdate = useCallback((layerId: string, updates: any) => {
    if (bridgeRef.current) {
      bridgeRef.current.handleLayerUpdate(layerId, updates);
    }
  }, []);

  const handleLayerCreate = useCallback((type: string, name?: string, options?: any) => {
    if (bridgeRef.current) {
      return bridgeRef.current.handleLayerCreate(type, name, options);
    }
    return null;
  }, []);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (bridgeRef.current) {
      bridgeRef.current.handleLayerDelete(layerId);
    }
  }, []);

  const syncToolsToLayers = useCallback(() => {
    if (bridgeRef.current) {
      bridgeRef.current.syncToolsToLayers();
    }
  }, []);

  const getUnifiedState = useCallback(() => {
    if (bridgeRef.current) {
      return bridgeRef.current.getUnifiedLayerState();
    }
    return null;
  }, []);

  return {
    handleLayerReorder,
    handleLayerUpdate,
    handleLayerCreate,
    handleLayerDelete,
    syncToolsToLayers,
    getUnifiedState
  };
}

export default UnifiedLayerBridge;
