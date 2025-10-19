/**
 * 🔄 REAL-TIME LAYER SYNCHRONIZATION WITH 3D MODEL
 * 
 * This system provides:
 * - Real-time updates when layers change
 * - Automatic texture composition
 * - Displacement and normal map generation
 * - Performance optimization
 * - Memory management
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { LayerEffectRenderer } from '../core/LayerEffects';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ModelSyncConfig {
  textureSize: number;
  enableDisplacement: boolean;
  enableNormalMaps: boolean;
  enableRealTimeUpdates: boolean;
  updateThrottle: number; // ms
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface TextureMaps {
  diffuse: THREE.CanvasTexture | null;
  displacement: THREE.CanvasTexture | null;
  normal: THREE.CanvasTexture | null;
  roughness: THREE.CanvasTexture | null;
  metalness: THREE.CanvasTexture | null;
  ao: THREE.CanvasTexture | null;
}

// ============================================================================
// LAYER MODEL SYNCHRONIZER CLASS
// ============================================================================

export class LayerModelSynchronizer {
  private static instance: LayerModelSynchronizer;
  private modelScene: THREE.Group | null = null;
  private layerStore: any = null;
  private effectRenderer: LayerEffectRenderer;
  private config: ModelSyncConfig;
  private lastUpdateTime: number = 0;
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private textureMaps: TextureMaps = {
    diffuse: null,
    displacement: null,
    normal: null,
    roughness: null,
    metalness: null,
    ao: null
  };
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  constructor(config: ModelSyncConfig = {
    textureSize: 1024,
    enableDisplacement: true,
    enableNormalMaps: true,
    enableRealTimeUpdates: true,
    updateThrottle: 16, // ~60fps
    qualityLevel: 'high'
  }) {
    this.config = config;
    this.effectRenderer = new LayerEffectRenderer(config.textureSize, config.textureSize);
  }

  static getInstance(config?: ModelSyncConfig): LayerModelSynchronizer {
    if (!LayerModelSynchronizer.instance) {
      LayerModelSynchronizer.instance = new LayerModelSynchronizer(config);
    }
    return LayerModelSynchronizer.instance;
  }

  /**
   * Initialize the synchronizer with model and layer store
   */
  initialize(modelScene: THREE.Group, layerStore: any): void {
    this.modelScene = modelScene;
    this.layerStore = layerStore;
    
    // Store original materials
    this.storeOriginalMaterials();
    
    // Subscribe to layer changes
    this.subscribeToLayerChanges();
    
    // Initial composition
    this.updateModelTexture();
    
    console.log('🎨 LayerModelSynchronizer initialized');
  }

  /**
   * Store original materials for restoration
   */
  private storeOriginalMaterials(): void {
    if (!this.modelScene) return;

    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        this.originalMaterials.set(child, child.material.clone());
      }
    });
  }

  /**
   * Subscribe to layer store changes
   */
  private subscribeToLayerChanges(): void {
    if (!this.layerStore) return;

    this.layerStore.subscribe((state: any) => {
      if (state.needsComposition && this.config.enableRealTimeUpdates) {
        this.scheduleUpdate();
      }
    });
  }

  /**
   * Schedule an update with throttling
   */
  private scheduleUpdate(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout as any);
    }

    this.updateTimeout = setTimeout(() => {
      this.updateModelTexture();
    }, this.config.updateThrottle);
  }

  /**
   * Update model texture with current layer composition
   */
  updateModelTexture(): void {
    if (!this.modelScene || !this.layerStore) return;

    const now = Date.now();
    if (now - this.lastUpdateTime < this.config.updateThrottle) {
      return; // Throttle updates
    }
    this.lastUpdateTime = now;

    try {
      // Compose layers
      this.composeLayers();
      
      // Generate texture maps
      this.generateTextureMaps();
      
      // Apply to model
      this.applyTexturesToModel();
      
      console.log('🎨 Model texture updated');
    } catch (error) {
      console.error('Error updating model texture:', error);
    }
  }

  /**
   * Compose all layers into final canvas
   */
  private composeLayers(): void {
    const { layers, layerOrder, groups } = this.layerStore.getState();
    
    // Create composed canvas
    const composedCanvas = document.createElement('canvas');
    composedCanvas.width = this.config.textureSize;
    composedCanvas.height = this.config.textureSize;
    const ctx = composedCanvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
    
    // Sort layers by order
    const sortedLayers = this.getSortedLayers(layerOrder, layers, groups);
    
    // Draw layers
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      ctx.save();
      
      // Apply layer properties
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
      
      // Apply transform
      if (layer.transform) {
        ctx.translate(layer.transform.x, layer.transform.y);
        ctx.rotate(layer.transform.rotation);
        ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
      }
      
      // Render layer with effects
      const layerCanvas = this.renderLayerWithEffects(layer);
      ctx.drawImage(layerCanvas, 0, 0);
      
      // Apply mask if present
      if (layer.mask) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(layer.mask.canvas, 0, 0);
      }
      
      ctx.restore();
    }
    
    // Store composed canvas
    this.textureMaps.diffuse = new THREE.CanvasTexture(composedCanvas);
    this.textureMaps.diffuse.generateMipmaps = true;
    this.textureMaps.diffuse.minFilter = THREE.LinearMipmapLinearFilter;
    this.textureMaps.diffuse.magFilter = THREE.LinearFilter;
    this.textureMaps.diffuse.needsUpdate = true;
  }

  /**
   * Generate additional texture maps (displacement, normal, etc.)
   */
  private generateTextureMaps(): void {
    if (!this.config.enableDisplacement && !this.config.enableNormalMaps) return;

    const { layers, layerOrder } = this.layerStore.getState();
    
    // Generate displacement map
    if (this.config.enableDisplacement) {
      this.generateDisplacementMap(layers, layerOrder);
    }
    
    // Generate normal map
    if (this.config.enableNormalMaps) {
      this.generateNormalMap(layers, layerOrder);
    }
  }

  /**
   * Generate displacement map from layers
   */
  private generateDisplacementMap(layers: Map<string, any>, layerOrder: string[]): void {
    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = this.config.textureSize;
    displacementCanvas.height = this.config.textureSize;
    const ctx = displacementCanvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, displacementCanvas.width, displacementCanvas.height);
    
    for (const layerId of layerOrder) {
      const layer = layers.get(layerId);
      if (layer && layer.visible && layer.displacementCanvas) {
        ctx.drawImage(layer.displacementCanvas, 0, 0);
      }
    }
    
    this.textureMaps.displacement = new THREE.CanvasTexture(displacementCanvas);
    this.textureMaps.displacement.generateMipmaps = true;
    this.textureMaps.displacement.minFilter = THREE.LinearMipmapLinearFilter;
    this.textureMaps.displacement.magFilter = THREE.LinearFilter;
    this.textureMaps.displacement.needsUpdate = true;
  }

  /**
   * Generate normal map from layers
   */
  private generateNormalMap(layers: Map<string, any>, layerOrder: string[]): void {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = this.config.textureSize;
    normalCanvas.height = this.config.textureSize;
    const ctx = normalCanvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, normalCanvas.width, normalCanvas.height);
    
    for (const layerId of layerOrder) {
      const layer = layers.get(layerId);
      if (layer && layer.visible && layer.normalCanvas) {
        ctx.drawImage(layer.normalCanvas, 0, 0);
      }
    }
    
    this.textureMaps.normal = new THREE.CanvasTexture(normalCanvas);
    this.textureMaps.normal.generateMipmaps = true;
    this.textureMaps.normal.minFilter = THREE.LinearMipmapLinearFilter;
    this.textureMaps.normal.magFilter = THREE.LinearFilter;
    this.textureMaps.normal.needsUpdate = true;
  }

  /**
   * Apply textures to model materials
   */
  private applyTexturesToModel(): void {
    if (!this.modelScene) return;

    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            // Apply diffuse texture
            if (this.textureMaps.diffuse) {
              mat.map = this.textureMaps.diffuse;
            }
            
            // Apply displacement map
            if (this.textureMaps.displacement) {
              mat.displacementMap = this.textureMaps.displacement;
              mat.displacementScale = this.getDisplacementScale();
            }
            
            // Apply normal map
            if (this.textureMaps.normal) {
              mat.normalMap = this.textureMaps.normal;
              mat.normalScale = new THREE.Vector2(1, 1);
            }
            
            // Apply quality settings
            this.applyQualitySettings(mat);
            
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  /**
   * Render layer with effects applied
   */
  private renderLayerWithEffects(layer: any): HTMLCanvasElement {
    if (layer.effects && layer.effects.length > 0) {
      return this.effectRenderer.renderEffects(layer.canvas, layer.effects);
    }
    return layer.canvas;
  }

  /**
   * Get sorted layers including groups
   */
  private getSortedLayers(layerOrder: string[], layers: Map<string, any>, groups: Map<string, any>): any[] {
    const sortedLayers: any[] = [];
    
    for (const itemId of layerOrder) {
      const layer = layers.get(itemId);
      const group = groups.get(itemId);
      
      if (layer) {
        sortedLayers.push(layer);
      } else if (group && !group.collapsed) {
        // Add group layers
        for (const childId of group.childLayerIds) {
          const childLayer = layers.get(childId);
          if (childLayer) {
            sortedLayers.push(childLayer);
          }
        }
      }
    }
    
    return sortedLayers;
  }

  /**
   * Get blend mode for canvas context
   */
  private getBlendMode(blendMode: string): GlobalCompositeOperation {
    const modeMap: Record<string, GlobalCompositeOperation> = {
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
    return modeMap[blendMode] || 'source-over';
  }

  /**
   * Get displacement scale based on quality level
   */
  private getDisplacementScale(): number {
    const scales = {
      'low': 0.1,
      'medium': 0.3,
      'high': 0.5,
      'ultra': 1.0
    };
    return scales[this.config.qualityLevel] || 0.5;
  }

  /**
   * Apply quality settings to material
   */
  private applyQualitySettings(mat: THREE.MeshStandardMaterial): void {
    switch (this.config.qualityLevel) {
      case 'low':
        mat.roughness = 0.8;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.5;
        break;
      case 'medium':
        mat.roughness = 0.5;
        mat.metalness = 0.1;
        mat.envMapIntensity = 0.7;
        break;
      case 'high':
        mat.roughness = 0.3;
        mat.metalness = 0.2;
        mat.envMapIntensity = 1.0;
        break;
      case 'ultra':
        mat.roughness = 0.1;
        mat.metalness = 0.3;
        mat.envMapIntensity = 1.2;
        break;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ModelSyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Resize effect renderer if texture size changed
    if (newConfig.textureSize) {
      this.effectRenderer.resize(newConfig.textureSize, newConfig.textureSize);
    }
    
    // Force update
    this.updateModelTexture();
  }

  /**
   * Force immediate update
   */
  forceUpdate(): void {
    this.lastUpdateTime = 0; // Reset throttle
    this.updateModelTexture();
  }

  /**
   * Get current texture maps
   */
  getTextureMaps(): TextureMaps {
    return { ...this.textureMaps };
  }

  /**
   * Restore original materials
   */
  restoreOriginalMaterials(): void {
    if (!this.modelScene) return;

    this.modelScene.traverse((child: any) => {
      if (child.isMesh && this.originalMaterials.has(child)) {
        child.material = this.originalMaterials.get(child);
      }
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout as any);
    }
    
    this.effectRenderer.dispose();
    
    // Dispose textures
    Object.values(this.textureMaps).forEach(texture => {
      if (texture) {
        texture.dispose();
      }
    });
    
    this.textureMaps = {
      diffuse: null,
      displacement: null,
      normal: null,
      roughness: null,
      metalness: null,
      ao: null
    };
    
    console.log('🎨 LayerModelSynchronizer disposed');
  }
}

// ============================================================================
// REACT HOOK FOR LAYER SYNCHRONIZATION
// ============================================================================

export function useLayerModelSync(modelScene: THREE.Group | null) {
  const layerStore = useAdvancedLayerStoreV2();
  const synchronizerRef = useRef<LayerModelSynchronizer | null>(null);

  useEffect(() => {
    if (!modelScene) return;

    // Initialize synchronizer
    synchronizerRef.current = LayerModelSynchronizer.getInstance({
      textureSize: 1024,
      enableDisplacement: true,
      enableNormalMaps: true,
      enableRealTimeUpdates: true,
      updateThrottle: 16,
      qualityLevel: 'high'
    });

    synchronizerRef.current.initialize(modelScene, layerStore);

    return () => {
      if (synchronizerRef.current) {
        synchronizerRef.current.dispose();
        synchronizerRef.current = null;
      }
    };
  }, [modelScene, layerStore]);

  const forceUpdate = useCallback(() => {
    if (synchronizerRef.current) {
      synchronizerRef.current.forceUpdate();
    }
  }, []);

  const updateConfig = useCallback((config: Partial<ModelSyncConfig>) => {
    if (synchronizerRef.current) {
      synchronizerRef.current.updateConfig(config);
    }
  }, []);

  const getTextureMaps = useCallback(() => {
    if (synchronizerRef.current) {
      return synchronizerRef.current.getTextureMaps();
    }
    return null;
  }, []);

  return {
    forceUpdate,
    updateConfig,
    getTextureMaps
  };
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

export class LayerSyncPerformanceMonitor {
  private static instance: LayerSyncPerformanceMonitor;
  private updateTimes: number[] = [];
  private maxSamples: number = 60; // 1 second at 60fps
  private averageUpdateTime: number = 0;
  private lastUpdateTime: number = 0;

  static getInstance(): LayerSyncPerformanceMonitor {
    if (!LayerSyncPerformanceMonitor.instance) {
      LayerSyncPerformanceMonitor.instance = new LayerSyncPerformanceMonitor();
    }
    return LayerSyncPerformanceMonitor.instance;
  }

  recordUpdateTime(updateTime: number): void {
    this.updateTimes.push(updateTime);
    
    if (this.updateTimes.length > this.maxSamples) {
      this.updateTimes.shift();
    }
    
    this.averageUpdateTime = this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
    this.lastUpdateTime = updateTime;
  }

  getStats(): {
    averageUpdateTime: number;
    lastUpdateTime: number;
    fps: number;
    isPerformingWell: boolean;
  } {
    const fps = this.averageUpdateTime > 0 ? 1000 / this.averageUpdateTime : 0;
    const isPerformingWell = fps >= 30; // Consider good performance above 30fps
    
    return {
      averageUpdateTime: this.averageUpdateTime,
      lastUpdateTime: this.lastUpdateTime,
      fps,
      isPerformingWell
    };
  }

  reset(): void {
    this.updateTimes = [];
    this.averageUpdateTime = 0;
    this.lastUpdateTime = 0;
  }
}

export default LayerModelSynchronizer;



