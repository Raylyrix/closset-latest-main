/**
 * 📁 PUFF LAYER MANAGER
 * 
 * Advanced layer management system for puff print operations:
 * - Multi-layer support with blending modes
 * - Layer composition and rendering
 * - Real-time layer updates
 * - Layer history and undo/redo
 * - Performance optimization
 */

import { PuffDisplacementEngine } from './PuffDisplacementEngine';
import { PuffMemoryManager } from './PuffMemoryManager';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PuffLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn';
  order: number;
  canvas: HTMLCanvasElement;
  displacementCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  heightCanvas: HTMLCanvasElement;
  needsUpdate: boolean;
  createdAt: number;
  modifiedAt: number;
  locked: boolean;
  mask?: HTMLCanvasElement;
  effects: LayerEffect[];
}

export interface LayerEffect {
  id: string;
  type: 'blur' | 'sharpen' | 'emboss' | 'glow' | 'shadow' | 'outline';
  enabled: boolean;
  intensity: number;
  radius?: number;
  color?: string;
  offset?: { x: number; y: number };
}

export interface LayerHistory {
  layers: PuffLayer[];
  timestamp: number;
  action: string;
}

export interface LayerComposition {
  displacementMap: HTMLCanvasElement;
  normalMap: HTMLCanvasElement;
  heightMap: HTMLCanvasElement;
  needsUpdate: boolean;
}

// ============================================================================
// LAYER MANAGER CLASS
// ============================================================================

export class PuffLayerManager {
  private layers: Map<string, PuffLayer> = new Map();
  private layerOrder: string[] = [];
  private activeLayerId: string | null = null;
  private baseCanvas: HTMLCanvasElement;
  private displacementEngine: PuffDisplacementEngine;
  private memoryManager: PuffMemoryManager;
  
  // Composition canvases
  private composedDisplacementCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private composedNormalCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private composedHeightCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private composedDisplacementCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  private composedNormalCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  private composedHeightCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  
  // History management
  private history: LayerHistory[] = [];
  private maxHistorySize: number = 50;
  private currentHistoryIndex: number = -1;
  
  // Performance tracking
  private lastCompositionTime: number = 0;
  private compositionThrottle: number = 16; // 60fps max
  
  constructor(
    baseCanvas: HTMLCanvasElement,
    displacementEngine: PuffDisplacementEngine
  ) {
    this.baseCanvas = baseCanvas;
    this.displacementEngine = displacementEngine;
    this.memoryManager = new PuffMemoryManager();
    
    this.initializeCompositionCanvases();
    this.createDefaultLayer();
    
    console.log('📁 PuffLayerManager initialized');
  }
  
  // Initialize composition canvases
  private initializeCompositionCanvases(): void {
    const size = this.baseCanvas.width;
    
    // Create composition canvases
    this.composedDisplacementCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'displacement');
    this.composedNormalCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'normal');
    this.composedHeightCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'height');
    
    // Get contexts
    this.composedDisplacementCtx = this.composedDisplacementCanvas.getContext('2d')!;
    this.composedNormalCtx = this.composedNormalCanvas.getContext('2d')!;
    this.composedHeightCtx = this.composedHeightCanvas.getContext('2d')!;
    
    // Initialize with neutral values
    this.clearCompositionCanvases();
  }
  
  // Clear composition canvases
  private clearCompositionCanvases(): void {
    // CRITICAL FIX: Clear displacement canvas with black (0 = no displacement)
    this.composedDisplacementCtx.fillStyle = 'rgb(0, 0, 0)';
    this.composedDisplacementCtx.fillRect(0, 0, this.composedDisplacementCanvas.width, this.composedDisplacementCanvas.height);
    
    // Clear normal canvas (neutral normal)
    this.composedNormalCtx.fillStyle = 'rgb(128, 128, 255)';
    this.composedNormalCtx.fillRect(0, 0, this.composedNormalCanvas.width, this.composedNormalCanvas.height);
    
    // Clear height canvas (black)
    this.composedHeightCtx.fillStyle = 'rgb(0, 0, 0)';
    this.composedHeightCtx.fillRect(0, 0, this.composedHeightCanvas.width, this.composedHeightCanvas.height);
  }
  
  // Create default layer
  private createDefaultLayer(): void {
    const defaultLayer = this.createLayer('Base Layer');
    this.setActiveLayer(defaultLayer.id);
  }
  
  // Create a new layer
  public createLayer(name: string): PuffLayer {
    const size = this.baseCanvas.width;
    const id = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create canvases for the layer
    const canvas = this.memoryManager.createOptimizedCanvas(size, size, 'preview');
    const displacementCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'displacement');
    const normalCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'normal');
    const heightCanvas = this.memoryManager.createOptimizedCanvas(size, size, 'height');
    
    // Initialize canvases
    this.initializeLayerCanvases(canvas, displacementCanvas, normalCanvas, heightCanvas);
    
    const layer: PuffLayer = {
      id,
      name,
      visible: true,
      opacity: 1.0,
      blendMode: 'normal',
      order: this.layers.size,
      canvas,
      displacementCanvas,
      normalCanvas,
      heightCanvas,
      needsUpdate: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      locked: false,
      effects: []
    };
    
    this.layers.set(id, layer);
    this.layerOrder.push(id);
    
    // Save to history
    this.saveToHistory('create_layer');
    
    console.log(`📁 Created layer: ${name} (${id})`);
    return layer;
  }
  
  // Initialize layer canvases
  private initializeLayerCanvases(
    canvas: HTMLCanvasElement,
    displacementCanvas: HTMLCanvasElement,
    normalCanvas: HTMLCanvasElement,
    heightCanvas: HTMLCanvasElement
  ): void {
    const size = canvas.width;
    
    // Initialize main canvas (transparent)
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    
    // CRITICAL FIX: Initialize displacement canvas with black (0 = no displacement)
    const dispCtx = displacementCanvas.getContext('2d')!;
    dispCtx.fillStyle = 'rgb(0, 0, 0)';
    dispCtx.fillRect(0, 0, size, size);
    
    // Initialize normal canvas (neutral normal)
    const normCtx = normalCanvas.getContext('2d')!;
    normCtx.fillStyle = 'rgb(128, 128, 255)';
    normCtx.fillRect(0, 0, size, size);
    
    // Initialize height canvas (black)
    const heightCtx = heightCanvas.getContext('2d')!;
    heightCtx.fillStyle = 'rgb(0, 0, 0)';
    heightCtx.fillRect(0, 0, size, size);
  }
  
  // Get a layer by ID
  public getLayer(id: string): PuffLayer | undefined {
    return this.layers.get(id);
  }
  
  // Get all layers
  public getLayers(): PuffLayer[] {
    return this.layerOrder.map(id => this.layers.get(id)!).filter(Boolean);
  }
  
  // Get visible layers in order
  public getVisibleLayers(): PuffLayer[] {
    return this.getLayers()
      .filter(layer => layer.visible)
      .sort((a, b) => a.order - b.order);
  }
  
  // Set active layer
  public setActiveLayer(id: string): void {
    if (this.layers.has(id)) {
      this.activeLayerId = id;
    }
  }
  
  // Get active layer
  public getActiveLayer(): PuffLayer | undefined {
    return this.activeLayerId ? this.layers.get(this.activeLayerId) : undefined;
  }
  
  // Update layer properties
  public updateLayer(id: string, updates: Partial<PuffLayer>): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    
    const updatedLayer = { ...layer, ...updates, modifiedAt: Date.now() };
    this.layers.set(id, updatedLayer);
    
    // Mark for composition update
    this.scheduleCompositionUpdate();
    
    // Save to history
    this.saveToHistory('update_layer');
  }
  
  // Update layer opacity
  public updateLayerOpacity(id: string, opacity: number): void {
    this.updateLayer(id, { opacity });
  }
  
  // Toggle layer visibility
  public toggleLayerVisibility(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    
    this.updateLayer(id, { visible: !layer.visible });
  }
  
  // Toggle layer lock
  public toggleLayerLock(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    
    this.updateLayer(id, { locked: !layer.locked });
  }
  
  // Duplicate layer
  public duplicateLayer(id: string): PuffLayer | undefined {
    const layer = this.layers.get(id);
    if (!layer) return undefined;
    
    const duplicatedLayer = this.createLayer(`${layer.name} Copy`);
    
    // Copy canvas content
    const dupCtx = duplicatedLayer.canvas.getContext('2d')!;
    const dupDispCtx = duplicatedLayer.displacementCanvas.getContext('2d')!;
    const dupNormCtx = duplicatedLayer.normalCanvas.getContext('2d')!;
    const dupHeightCtx = duplicatedLayer.heightCanvas.getContext('2d')!;
    
    dupCtx.drawImage(layer.canvas, 0, 0);
    dupDispCtx.drawImage(layer.displacementCanvas, 0, 0);
    dupNormCtx.drawImage(layer.normalCanvas, 0, 0);
    dupHeightCtx.drawImage(layer.heightCanvas, 0, 0);
    
    // Copy properties
    duplicatedLayer.opacity = layer.opacity;
    duplicatedLayer.blendMode = layer.blendMode;
    duplicatedLayer.effects = [...layer.effects];
    
    this.setActiveLayer(duplicatedLayer.id);
    
    console.log(`📁 Duplicated layer: ${layer.name} → ${duplicatedLayer.name}`);
    return duplicatedLayer;
  }
  
  // Delete layer
  public deleteLayer(id: string): boolean {
    if (this.layers.size <= 1) {
      console.warn('Cannot delete the last layer');
      return false;
    }
    
    const layer = this.layers.get(id);
    if (!layer) return false;
    
    // Release canvas resources
    this.memoryManager.releaseCanvas(layer.canvas);
    this.memoryManager.releaseCanvas(layer.displacementCanvas);
    this.memoryManager.releaseCanvas(layer.normalCanvas);
    this.memoryManager.releaseCanvas(layer.heightCanvas);
    
    // Remove from collections
    this.layers.delete(id);
    this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
    
    // Update active layer if needed
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layerOrder[0] || null;
    }
    
    // Save to history
    this.saveToHistory('delete_layer');
    
    console.log(`📁 Deleted layer: ${layer.name}`);
    return true;
  }
  
  // Move layer up in order
  public moveLayerUp(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index > 0) {
      [this.layerOrder[index - 1], this.layerOrder[index]] = [this.layerOrder[index], this.layerOrder[index - 1]];
      this.updateLayerOrders();
      this.scheduleCompositionUpdate();
    }
  }
  
  // Move layer down in order
  public moveLayerDown(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index < this.layerOrder.length - 1) {
      [this.layerOrder[index], this.layerOrder[index + 1]] = [this.layerOrder[index + 1], this.layerOrder[index]];
      this.updateLayerOrders();
      this.scheduleCompositionUpdate();
    }
  }
  
  // Move layer to top
  public moveLayerToTop(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index > 0) {
      this.layerOrder.splice(index, 1);
      this.layerOrder.unshift(id);
      this.updateLayerOrders();
      this.scheduleCompositionUpdate();
    }
  }
  
  // Move layer to bottom
  public moveLayerToBottom(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index < this.layerOrder.length - 1) {
      this.layerOrder.splice(index, 1);
      this.layerOrder.push(id);
      this.updateLayerOrders();
      this.scheduleCompositionUpdate();
    }
  }
  
  // Update layer orders
  private updateLayerOrders(): void {
    this.layerOrder.forEach((id, index) => {
      const layer = this.layers.get(id);
      if (layer) {
        layer.order = index;
      }
    });
  }
  
  // Schedule composition update
  private scheduleCompositionUpdate(): void {
    const now = performance.now();
    if (now - this.lastCompositionTime < this.compositionThrottle) {
      return;
    }
    
    this.lastCompositionTime = now;
    this.composeLayers();
  }
  
  // Compose all layers
  public composeLayers(): LayerComposition {
    this.clearCompositionCanvases();
    
    const visibleLayers = this.getVisibleLayers();
    
    visibleLayers.forEach(layer => {
      if (!layer.visible || layer.opacity <= 0) return;
      
      // Apply layer effects
      const processedLayer = this.applyLayerEffects(layer);
      
      // Compose displacement map
      this.composeDisplacementMap(processedLayer);
      
      // Compose normal map
      this.composeNormalMap(processedLayer);
      
      // Compose height map
      this.composeHeightMap(processedLayer);
    });
    
    return {
      displacementMap: this.composedDisplacementCanvas,
      normalMap: this.composedNormalCanvas,
      heightMap: this.composedHeightCanvas,
      needsUpdate: true
    };
  }
  
  // Apply layer effects
  private applyLayerEffects(layer: PuffLayer): PuffLayer {
    if (layer.effects.length === 0) return layer;
    
    // For now, return the layer as-is
    // TODO: Implement layer effects processing
    return layer;
  }
  
  // Compose displacement map
  private composeDisplacementMap(layer: PuffLayer): void {
    this.composedDisplacementCtx.save();
    
    // Set blend mode
    this.composedDisplacementCtx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
    this.composedDisplacementCtx.globalAlpha = layer.opacity;
    
    // Draw layer displacement map
    this.composedDisplacementCtx.drawImage(layer.displacementCanvas, 0, 0);
    
    this.composedDisplacementCtx.restore();
  }
  
  // Compose normal map
  private composeNormalMap(layer: PuffLayer): void {
    this.composedNormalCtx.save();
    
    this.composedNormalCtx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
    this.composedNormalCtx.globalAlpha = layer.opacity;
    
    this.composedNormalCtx.drawImage(layer.normalCanvas, 0, 0);
    
    this.composedNormalCtx.restore();
  }
  
  // Compose height map
  private composeHeightMap(layer: PuffLayer): void {
    this.composedHeightCtx.save();
    
    this.composedHeightCtx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
    this.composedHeightCtx.globalAlpha = layer.opacity;
    
    this.composedHeightCtx.drawImage(layer.heightCanvas, 0, 0);
    
    this.composedHeightCtx.restore();
  }
  
  // Get blend mode for canvas context
  private getBlendMode(blendMode: PuffLayer['blendMode']): GlobalCompositeOperation {
    const blendModes: Record<PuffLayer['blendMode'], GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn'
    };
    
    return blendModes[blendMode] || 'source-over';
  }
  
  // Add effect to layer
  public addLayerEffect(layerId: string, effect: LayerEffect): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.effects.push(effect);
    this.updateLayer(layerId, { effects: layer.effects });
  }
  
  // Remove effect from layer
  public removeLayerEffect(layerId: string, effectId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.effects = layer.effects.filter(effect => effect.id !== effectId);
    this.updateLayer(layerId, { effects: layer.effects });
  }
  
  // Update layer effect
  public updateLayerEffect(layerId: string, effectId: string, updates: Partial<LayerEffect>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    const effectIndex = layer.effects.findIndex(effect => effect.id === effectId);
    if (effectIndex === -1) return;
    
    layer.effects[effectIndex] = { ...layer.effects[effectIndex], ...updates };
    this.updateLayer(layerId, { effects: layer.effects });
  }
  
  // History management
  private saveToHistory(action: string): void {
    const historyEntry: LayerHistory = {
      layers: this.getLayers().map(layer => ({ ...layer })), // Deep copy
      timestamp: Date.now(),
      action
    };
    
    // Remove future history if we're not at the end
    this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    
    // Add new entry
    this.history.push(historyEntry);
    this.currentHistoryIndex = this.history.length - 1;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentHistoryIndex--;
    }
  }
  
  // Undo last action
  public undo(): boolean {
    if (this.currentHistoryIndex <= 0) return false;
    
    this.currentHistoryIndex--;
    this.restoreFromHistory(this.history[this.currentHistoryIndex]);
    
    console.log('📁 Undo performed');
    return true;
  }
  
  // Redo next action
  public redo(): boolean {
    if (this.currentHistoryIndex >= this.history.length - 1) return false;
    
    this.currentHistoryIndex++;
    this.restoreFromHistory(this.history[this.currentHistoryIndex]);
    
    console.log('📁 Redo performed');
    return true;
  }
  
  // Restore from history
  private restoreFromHistory(historyEntry: LayerHistory): void {
    // Clear current layers
    this.layers.forEach(layer => {
      this.memoryManager.releaseCanvas(layer.canvas);
      this.memoryManager.releaseCanvas(layer.displacementCanvas);
      this.memoryManager.releaseCanvas(layer.normalCanvas);
      this.memoryManager.releaseCanvas(layer.heightCanvas);
    });
    
    this.layers.clear();
    this.layerOrder.length = 0;
    
    // Restore layers
    historyEntry.layers.forEach(layer => {
      this.layers.set(layer.id, layer);
      this.layerOrder.push(layer.id);
    });
    
    // Update active layer
    this.activeLayerId = this.layerOrder[0] || null;
    
    // Re-compose layers
    this.composeLayers();
  }
  
  // Reset all layers
  public resetAllLayers(): void {
    this.layers.forEach(layer => {
      this.memoryManager.releaseCanvas(layer.canvas);
      this.memoryManager.releaseCanvas(layer.displacementCanvas);
      this.memoryManager.releaseCanvas(layer.normalCanvas);
      this.memoryManager.releaseCanvas(layer.heightCanvas);
    });
    
    this.layers.clear();
    this.layerOrder.length = 0;
    this.activeLayerId = null;
    
    this.createDefaultLayer();
    this.saveToHistory('reset_all');
  }
  
  // Get layer statistics
  public getLayerStats(): { total: number; visible: number; locked: number; withEffects: number } {
    const layers = this.getLayers();
    
    return {
      total: layers.length,
      visible: layers.filter(layer => layer.visible).length,
      locked: layers.filter(layer => layer.locked).length,
      withEffects: layers.filter(layer => layer.effects.length > 0).length
    };
  }
  
  // Export layer as image
  public exportLayer(layerId: string, type: 'displacement' | 'normal' | 'height' | 'preview'): string {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error('Layer not found');
    
    let canvas: HTMLCanvasElement;
    switch (type) {
      case 'displacement':
        canvas = layer.displacementCanvas;
        break;
      case 'normal':
        canvas = layer.normalCanvas;
        break;
      case 'height':
        canvas = layer.heightCanvas;
        break;
      case 'preview':
        canvas = layer.canvas;
        break;
      default:
        throw new Error('Invalid export type');
    }
    
    return canvas.toDataURL('image/png');
  }
  
  // Cleanup resources
  public cleanup(): void {
    console.log('🧹 PuffLayerManager cleanup started');
    
    // Cleanup all layer canvases
    this.layers.forEach(layer => {
      if (layer.canvas) {
        this.memoryManager.releaseCanvas(layer.canvas);
      }
      if (layer.displacementCanvas) {
        this.memoryManager.releaseCanvas(layer.displacementCanvas);
      }
      if (layer.normalCanvas) {
        this.memoryManager.releaseCanvas(layer.normalCanvas);
      }
      if (layer.heightCanvas) {
        this.memoryManager.releaseCanvas(layer.heightCanvas);
      }
    });
    
    // Cleanup composition canvases
    if (this.composedDisplacementCanvas) {
      this.memoryManager.releaseCanvas(this.composedDisplacementCanvas);
    }
    if (this.composedNormalCanvas) {
      this.memoryManager.releaseCanvas(this.composedNormalCanvas);
    }
    if (this.composedHeightCanvas) {
      this.memoryManager.releaseCanvas(this.composedHeightCanvas);
    }
    
    // Clear canvas contexts
    if (this.composedDisplacementCtx) {
      this.composedDisplacementCtx.clearRect(0, 0, this.composedDisplacementCanvas.width, this.composedDisplacementCanvas.height);
    }
    if (this.composedNormalCtx) {
      this.composedNormalCtx.clearRect(0, 0, this.composedNormalCanvas.width, this.composedNormalCanvas.height);
    }
    if (this.composedHeightCtx) {
      this.composedHeightCtx.clearRect(0, 0, this.composedHeightCanvas.width, this.composedHeightCanvas.height);
    }
    
    // Clear references
    this.composedDisplacementCanvas = null as any;
    this.composedNormalCanvas = null as any;
    this.composedHeightCanvas = null as any;
    this.composedDisplacementCtx = null as any;
    this.composedNormalCtx = null as any;
    this.composedHeightCtx = null as any;
    
    // Cleanup memory manager
    if (this.memoryManager) {
      this.memoryManager.cleanup();
    }
    
    // Clear layers
    this.layers.clear();
    this.layerOrder.length = 0;
    this.history.length = 0;
    
    console.log('🧹 PuffLayerManager cleanup completed');
  }
}

export default PuffLayerManager;

