/**
 * Layer Migration Utility
 * 
 * Handles migration from existing layer systems to the unified layer system.
 * Provides backward compatibility and smooth transition.
 */

import { UnifiedLayer, LayerType, ToolType, LayerMigrationData } from './types/UnifiedLayerTypes';
// import { UnifiedLayerManager } from './UnifiedLayerManager'; // REMOVED: File doesn't exist
import { CanvasManager } from './CanvasManager';

export class LayerMigration {
  constructor(
    private layerManager: any, // FIXED: UnifiedLayerManager doesn't exist
    private canvasManager: CanvasManager
  ) {}
  
  /**
   * Migrate from App.tsx layer system
   */
  migrateFromAppState(appState: any): UnifiedLayer[] {
    const migratedLayers: UnifiedLayer[] = [];
    
    if (!appState.layers || !Array.isArray(appState.layers)) {
      console.warn('No layers found in App state');
      return migratedLayers;
    }
    
    for (const appLayer of appState.layers) {
      try {
        const unifiedLayer = this.convertAppLayerToUnified(appLayer);
        if (unifiedLayer) {
          migratedLayers.push(unifiedLayer);
        }
      } catch (error) {
        console.error('Error migrating App layer:', error, appLayer);
      }
    }
    
    console.log(`🎨 LayerMigration: Migrated ${migratedLayers.length} layers from App state`);
    return migratedLayers;
  }
  
  /**
   * Convert App.tsx layer to UnifiedLayer
   */
  private convertAppLayerToUnified(appLayer: any): UnifiedLayer | null {
    if (!appLayer.id || !appLayer.canvas) {
      console.warn('Invalid App layer structure:', appLayer);
      return null;
    }
    
    // Create canvas for unified layer
    const canvas = this.canvasManager.createCanvas(appLayer.id, appLayer.canvas.width, appLayer.canvas.height);
    
    // Copy canvas content
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(appLayer.canvas, 0, 0);
    }
    
    // Determine layer type and tool type from layer name or properties
    const layerType = this.determineLayerType(appLayer);
    const toolType = this.determineToolType(appLayer);
    
    const unifiedLayer: UnifiedLayer = {
      id: appLayer.id,
      name: appLayer.name || 'Migrated Layer',
      type: layerType,
      toolType: toolType,
      canvas,
      isDirty: false,
      visible: appLayer.visible !== false,
      opacity: 1.0,
      blendMode: 'source-over',
      order: 0, // Will be set by layer manager
      toolData: this.extractToolData(appLayer),
      createdAt: new Date(),
      modifiedAt: new Date(),
      locked: appLayer.lockTransparent || false,
      mask: appLayer.mask || null,
      effects: []
    };
    
    return unifiedLayer;
  }
  
  /**
   * Determine layer type from App layer
   */
  private determineLayerType(appLayer: any): LayerType {
    // Check for specific properties that indicate layer type
    if (appLayer.vectorPaths) return 'vector';
    if (appLayer.textContent) return 'text';
    if (appLayer.imageData) return 'image';
    
    // Default to raster
    return 'raster';
  }
  
  /**
   * Determine tool type from App layer
   */
  private determineToolType(appLayer: any): ToolType | undefined {
    const name = (appLayer.name || '').toLowerCase();
    
    if (name.includes('brush') || name.includes('paint')) return 'brush';
    if (name.includes('puff') || name.includes('print')) return 'puffPrint';
    if (name.includes('embroidery') || name.includes('stitch')) return 'embroidery';
    if (name.includes('vector')) return 'vector';
    if (name.includes('text')) return 'general';
    
    // Check for tool-specific data
    if (appLayer.brushStrokes) return 'brush';
    if (appLayer.embroideryStitches) return 'embroidery';
    if (appLayer.puffData) return 'puffPrint';
    if (appLayer.vectorPaths) return 'vector';
    
    return undefined;
  }
  
  /**
   * Extract tool data from App layer
   */
  private extractToolData(appLayer: any): any {
    const toolData: any = {};
    
    // Extract brush strokes
    if (appLayer.brushStrokes && Array.isArray(appLayer.brushStrokes)) {
      toolData.brushStrokes = appLayer.brushStrokes.map((stroke: any) => ({
        id: stroke.id || `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        layerId: appLayer.id,
        points: stroke.points || [],
        color: stroke.color || '#000000',
        size: stroke.size || 5,
        opacity: stroke.opacity || 1.0,
        hardness: stroke.hardness || 1.0,
        flow: stroke.flow || 1.0,
        spacing: stroke.spacing || 1.0,
        shape: stroke.shape || 'round',
        blendMode: stroke.blendMode || 'source-over',
        timestamp: stroke.timestamp || Date.now()
      }));
    }
    
    // Extract embroidery stitches
    if (appLayer.embroideryStitches && Array.isArray(appLayer.embroideryStitches)) {
      toolData.embroideryStitches = appLayer.embroideryStitches.map((stitch: any) => ({
        id: stitch.id || `stitch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        layerId: appLayer.id,
        type: stitch.type || 'satin',
        color: stitch.color || '#ff0000',
        threadType: stitch.threadType || 'cotton',
        thickness: stitch.thickness || 1.0,
        opacity: stitch.opacity || 1.0,
        points: stitch.points || [],
        timestamp: stitch.timestamp || Date.now()
      }));
    }
    
    // Extract puff data
    if (appLayer.puffData && Array.isArray(appLayer.puffData)) {
      toolData.puffData = appLayer.puffData.map((puff: any) => ({
        id: puff.id || `puff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        layerId: appLayer.id,
        x: puff.x || 0,
        y: puff.y || 0,
        size: puff.size || 20,
        opacity: puff.opacity || 1.0,
        color: puff.color || '#ff69b4',
        height: puff.height || 1.0,
        curvature: puff.curvature || 0.5,
        timestamp: puff.timestamp || Date.now()
      }));
    }
    
    // Extract vector paths
    if (appLayer.vectorPaths && Array.isArray(appLayer.vectorPaths)) {
      toolData.vectorPaths = appLayer.vectorPaths.map((path: any) => ({
        id: path.id || `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        layerId: appLayer.id,
        points: path.points || [],
        closed: path.closed || false,
        timestamp: path.timestamp || Date.now()
      }));
    }
    
    return toolData;
  }
  
  /**
   * Migrate from LayerSystem.ts
   */
  migrateFromLayerSystem(layerSystemState: any): UnifiedLayer[] {
    const migratedLayers: UnifiedLayer[] = [];
    
    if (!layerSystemState.layers || !(layerSystemState.layers instanceof Map)) {
      console.warn('No layers found in LayerSystem state');
      return migratedLayers;
    }
    
    for (const [layerId, layerSystemLayer] of layerSystemState.layers) {
      try {
        const unifiedLayer = this.convertLayerSystemLayerToUnified(layerId, layerSystemLayer);
        if (unifiedLayer) {
          migratedLayers.push(unifiedLayer);
        }
      } catch (error) {
        console.error('Error migrating LayerSystem layer:', error, layerId, layerSystemLayer);
      }
    }
    
    console.log(`🎨 LayerMigration: Migrated ${migratedLayers.length} layers from LayerSystem`);
    return migratedLayers;
  }
  
  /**
   * Convert LayerSystem layer to UnifiedLayer
   */
  private convertLayerSystemLayerToUnified(layerId: string, layerSystemLayer: any): UnifiedLayer | null {
    if (!layerSystemLayer) {
      return null;
    }
    
    // Create canvas
    const canvas = this.canvasManager.createCanvas(layerId, 4096, 4096); // Default size
    
    // Copy canvas content if available
    if (layerSystemLayer.canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(layerSystemLayer.canvas, 0, 0);
      }
    }
    
    const unifiedLayer: UnifiedLayer = {
      id: layerId,
      name: layerSystemLayer.name || 'Migrated Layer',
      type: layerSystemLayer.type || 'raster',
      toolType: layerSystemLayer.toolType,
      canvas,
      isDirty: false,
      visible: layerSystemLayer.visible !== false,
      opacity: layerSystemLayer.opacity || 1.0,
      blendMode: layerSystemLayer.blendMode || 'source-over',
      order: layerSystemLayer.order || 0,
      toolData: layerSystemLayer.toolData || {},
      createdAt: layerSystemLayer.createdAt || new Date(),
      modifiedAt: layerSystemLayer.modifiedAt || new Date(),
      locked: layerSystemLayer.locked || false,
      mask: layerSystemLayer.mask || null,
      effects: layerSystemLayer.effects || []
    };
    
    return unifiedLayer;
  }
  
  /**
   * Migrate from domainStores
   */
  migrateFromDomainStores(domainState: any): UnifiedLayer[] {
    const migratedLayers: UnifiedLayer[] = [];
    
    if (!domainState.layers || !Array.isArray(domainState.layers)) {
      console.warn('No layers found in domain stores state');
      return migratedLayers;
    }
    
    for (const domainLayer of domainState.layers) {
      try {
        const unifiedLayer = this.convertDomainLayerToUnified(domainLayer);
        if (unifiedLayer) {
          migratedLayers.push(unifiedLayer);
        }
      } catch (error) {
        console.error('Error migrating domain layer:', error, domainLayer);
      }
    }
    
    console.log(`🎨 LayerMigration: Migrated ${migratedLayers.length} layers from domain stores`);
    return migratedLayers;
  }
  
  /**
   * Convert domain store layer to UnifiedLayer
   */
  private convertDomainLayerToUnified(domainLayer: any): UnifiedLayer | null {
    if (!domainLayer.id) {
      return null;
    }
    
    // Create canvas
    const canvas = this.canvasManager.createCanvas(domainLayer.id, 4096, 4096);
    
    const unifiedLayer: UnifiedLayer = {
      id: domainLayer.id,
      name: domainLayer.name || 'Migrated Layer',
      type: 'raster',
      toolType: undefined,
      canvas,
      isDirty: false,
      visible: true,
      opacity: 1.0,
      blendMode: 'source-over',
      order: 0,
      toolData: {},
      createdAt: new Date(),
      modifiedAt: new Date(),
      locked: false,
      effects: []
    };
    
    return unifiedLayer;
  }
  
  /**
   * Merge all existing layer systems
   */
  mergeAllLayerSystems(migrationData: LayerMigrationData): UnifiedLayer[] {
    const allLayers: UnifiedLayer[] = [];
    
    // Migrate from each system
    const appLayers = this.migrateFromAppState({ layers: migrationData.appLayers });
    const layerSystemLayers = this.migrateFromLayerSystem({ layers: migrationData.layerSystemLayers });
    const domainLayers = this.migrateFromDomainStores({ layers: migrationData.domainLayers });
    
    // Combine all layers
    allLayers.push(...appLayers);
    allLayers.push(...layerSystemLayers);
    allLayers.push(...domainLayers);
    
    // Remove duplicates based on ID
    const uniqueLayers = new Map<string, UnifiedLayer>();
    for (const layer of allLayers) {
      if (!uniqueLayers.has(layer.id)) {
        uniqueLayers.set(layer.id, layer);
      }
    }
    
    const finalLayers = Array.from(uniqueLayers.values());
    
    console.log(`🎨 LayerMigration: Merged ${finalLayers.length} unique layers from all systems`);
    return finalLayers;
  }
  
  /**
   * Apply migrated layers to the layer manager
   */
  applyMigratedLayers(layers: UnifiedLayer[]): void {
    // Clear existing layers
    this.layerManager.clearAllLayers();
    
    // Add migrated layers
    for (const layer of layers) {
      // Create new layer with migrated data
      const newLayer = this.layerManager.createLayer(layer.type, layer.name, layer.toolType);
      
      // Copy canvas content
      const ctx = newLayer.canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(layer.canvas, 0, 0);
      }
      
      // Copy properties
      newLayer.visible = layer.visible;
      newLayer.opacity = layer.opacity;
      newLayer.blendMode = layer.blendMode;
      newLayer.toolData = { ...layer.toolData };
      newLayer.locked = layer.locked;
      newLayer.mask = layer.mask;
      newLayer.effects = [...(layer.effects || [])];
    }
    
    console.log(`🎨 LayerMigration: Applied ${layers.length} migrated layers to layer manager`);
  }
  
  /**
   * Create migration report
   */
  createMigrationReport(migrationData: LayerMigrationData): {
    totalLayers: number;
    appLayers: number;
    layerSystemLayers: number;
    domainLayers: number;
    uniqueLayers: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let appLayers = 0;
    let layerSystemLayers = 0;
    let domainLayers = 0;
    
    try {
      appLayers = migrationData.appLayers?.length || 0;
    } catch (error) {
      errors.push(`App layers migration error: ${error}`);
    }
    
    try {
      layerSystemLayers = migrationData.layerSystemLayers?.size || 0;
    } catch (error) {
      errors.push(`LayerSystem layers migration error: ${error}`);
    }
    
    try {
      domainLayers = migrationData.domainLayers?.length || 0;
    } catch (error) {
      errors.push(`Domain layers migration error: ${error}`);
    }
    
    const totalLayers = appLayers + layerSystemLayers + domainLayers;
    const uniqueLayers = this.mergeAllLayerSystems(migrationData).length;
    
    return {
      totalLayers,
      appLayers,
      layerSystemLayers,
      domainLayers,
      uniqueLayers,
      errors
    };
  }
}

