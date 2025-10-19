/**
 * 🛡️ LAYER SYSTEM VALIDATOR
 * 
 * Comprehensive validation framework for layer system consolidation.
 * Ensures all functionality works before and after changes.
 */

import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { useApp } from '../App';

export interface ValidationResult {
  layerCreation: boolean;
  layerDeletion: boolean;
  layerOpacity: boolean;
  layerVisibility: boolean;
  textureUpdates: boolean;
  layerComposition: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    layerCreationTime: number;
    opacityChangeTime: number;
    textureUpdateTime: number;
  };
}

export class LayerSystemValidator {
  private static instance: LayerSystemValidator;
  
  static getInstance(): LayerSystemValidator {
    if (!LayerSystemValidator.instance) {
      LayerSystemValidator.instance = new LayerSystemValidator();
    }
    return LayerSystemValidator.instance;
  }
  
  /**
   * Test all layer operations comprehensively
   */
  async validateLayerOperations(): Promise<ValidationResult> {
    const results: ValidationResult = {
      layerCreation: false,
      layerDeletion: false,
      layerOpacity: false,
      layerVisibility: false,
      textureUpdates: false,
      layerComposition: false,
      errors: [],
      warnings: [],
      performance: {
        layerCreationTime: 0,
        opacityChangeTime: 0,
        textureUpdateTime: 0
      }
    };
    
    try {
      console.log('🔍 Starting comprehensive layer system validation...');
      
      // Test layer creation
      results.layerCreation = await this.testLayerCreation(results);
      
      // Test layer opacity changes
      results.layerOpacity = await this.testLayerOpacity(results);
      
      // Test layer visibility
      results.layerVisibility = await this.testLayerVisibility(results);
      
      // Test texture updates
      results.textureUpdates = await this.testTextureUpdates(results);
      
      // Test layer composition
      results.layerComposition = await this.testLayerComposition(results);
      
      // Test layer deletion
      results.layerDeletion = await this.testLayerDeletion(results);
      
      console.log('✅ Layer system validation completed:', results);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Validation failed: ${errorMessage}`);
      console.error('❌ Layer system validation failed:', error);
    }
    
    return results;
  }
  
  /**
   * Test layer creation functionality
   */
  private async testLayerCreation(results: ValidationResult): Promise<boolean> {
    try {
      const startTime = performance.now();
      const store = useAdvancedLayerStoreV2.getState();
      const initialCount = store.layers.length;
      
      // Test creating different layer types
      const paintLayerId = store.createLayer('paint', 'Test Paint Layer');
      const textLayerId = store.createLayer('text', 'Test Text Layer');
      const vectorLayerId = store.createLayer('vector', 'Test Vector Layer');
      
      const newCount = store.layers.length;
      const endTime = performance.now();
      
      results.performance.layerCreationTime = endTime - startTime;
      
      const success = newCount === initialCount + 3 && 
                     !!paintLayerId && !!textLayerId && !!vectorLayerId;
      
      if (!success) {
        results.errors.push('Layer creation failed');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Layer creation test failed: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Test layer opacity changes
   */
  private async testLayerOpacity(results: ValidationResult): Promise<boolean> {
    try {
      const startTime = performance.now();
      const store = useAdvancedLayerStoreV2.getState();
      
      if (store.layers.length === 0) {
        store.createLayer('paint', 'Test Layer');
      }
      
      const layerId = store.layers[0].id;
      const originalOpacity = store.layers[0].opacity;
      
      // Test opacity change
      store.setLayerOpacity(layerId, 0.5);
      
      const layer = store.layers.find(l => l.id === layerId);
      const endTime = performance.now();
      
      results.performance.opacityChangeTime = endTime - startTime;
      
      const success = layer?.opacity === 0.5;
      
      if (!success) {
        results.errors.push('Layer opacity change failed');
      }
      
      // Restore original opacity
      store.setLayerOpacity(layerId, originalOpacity);
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Layer opacity test failed: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Test layer visibility changes
   */
  private async testLayerVisibility(results: ValidationResult): Promise<boolean> {
    try {
      const store = useAdvancedLayerStoreV2.getState();
      
      if (store.layers.length === 0) {
        store.createLayer('paint', 'Test Layer');
      }
      
      const layerId = store.layers[0].id;
      const originalVisibility = store.layers[0].visible;
      
      // Test visibility toggle
      store.setLayerVisibility(layerId, false);
      
      let layer = store.layers.find(l => l.id === layerId);
      const hiddenSuccess = layer?.visible === false;
      
      // Test visibility restore
      store.setLayerVisibility(layerId, true);
      
      layer = store.layers.find(l => l.id === layerId);
      const shownSuccess = layer?.visible === true;
      
      const success = hiddenSuccess && shownSuccess;
      
      if (!success) {
        results.errors.push('Layer visibility change failed');
      }
      
      // Restore original visibility
      store.setLayerVisibility(layerId, originalVisibility);
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Layer visibility test failed: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Test texture updates (real-time updates)
   */
  private async testTextureUpdates(results: ValidationResult): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let textureUpdateReceived = false;
      
      const handleTextureUpdate = (event: Event) => {
        textureUpdateReceived = true;
        const endTime = performance.now();
        results.performance.textureUpdateTime = endTime - startTime;
        
        window.removeEventListener('forceTextureUpdate', handleTextureUpdate);
        console.log('✅ Texture update event received');
        resolve(true);
      };
      
      window.addEventListener('forceTextureUpdate', handleTextureUpdate as EventListener);
      
      // Trigger a layer change that should cause texture update
      try {
        const store = useAdvancedLayerStoreV2.getState();
        if (store.layers.length === 0) {
          store.createLayer('paint', 'Test Layer');
        }
        
        // This should trigger texture update if the system is working
        store.setLayerOpacity(store.layers[0].id, 0.7);
        
        // Timeout after 3 seconds
        setTimeout(() => {
          if (!textureUpdateReceived) {
            window.removeEventListener('forceTextureUpdate', handleTextureUpdate as EventListener);
            results.warnings.push('Texture update not received within timeout');
            console.warn('⚠️ Texture update not received within timeout');
            resolve(false);
          }
        }, 3000);
        
      } catch (error) {
        window.removeEventListener('forceTextureUpdate', handleTextureUpdate as EventListener);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Texture update test failed: ${errorMessage}`);
        resolve(false);
      }
    });
  }
  
  /**
   * Test layer composition
   */
  private async testLayerComposition(results: ValidationResult): Promise<boolean> {
    try {
      const store = useAdvancedLayerStoreV2.getState();
      
      // Ensure we have layers to compose
      if (store.layers.length === 0) {
        store.createLayer('paint', 'Test Layer 1');
        store.createLayer('text', 'Test Layer 2');
      }
      
      // Test composition
      const composedCanvas = store.composeLayers();
      
      const success = composedCanvas !== null && 
                     composedCanvas.width > 0 && 
                     composedCanvas.height > 0;
      
      if (!success) {
        results.errors.push('Layer composition failed');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Layer composition test failed: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Test layer deletion
   */
  private async testLayerDeletion(results: ValidationResult): Promise<boolean> {
    try {
      const store = useAdvancedLayerStoreV2.getState();
      
      // Create a test layer
      const layerId = store.createLayer('paint', 'Test Delete Layer');
      const initialCount = store.layers.length;
      
      // Delete the layer
      store.deleteLayer(layerId);
      
      const finalCount = store.layers.length;
      const layerStillExists = store.layers.find(l => l.id === layerId);
      
      const success = finalCount === initialCount - 1 && !layerStillExists;
      
      if (!success) {
        results.errors.push('Layer deletion failed');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Layer deletion test failed: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Check for broken imports and dependencies
   */
  async checkForBrokenImports(): Promise<string[]> {
    const brokenImports: string[] = [];
    
    try {
      // This would need to be implemented based on your build system
      // For now, we'll check for common issues
      
      // Check if AdvancedLayerSystemV2 is properly imported
      try {
        const store = useAdvancedLayerStoreV2.getState();
        if (!store) {
          brokenImports.push('useAdvancedLayerStoreV2 not accessible');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        brokenImports.push(`useAdvancedLayerStoreV2 import broken: ${errorMessage}`);
      }
      
      // Check if App store is accessible
      try {
        const appState = useApp.getState();
        if (!appState) {
          brokenImports.push('useApp not accessible');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        brokenImports.push(`useApp import broken: ${errorMessage}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      brokenImports.push(`Import check failed: ${errorMessage}`);
    }
    
    return brokenImports;
  }
  
  /**
   * Performance benchmark
   */
  async benchmarkPerformance(): Promise<{
    layerCreation: number;
    opacityChange: number;
    textureUpdate: number;
    composition: number;
  }> {
    const benchmark = {
      layerCreation: 0,
      opacityChange: 0,
      textureUpdate: 0,
      composition: 0
    };
    
    try {
      // Benchmark layer creation
      const start = performance.now();
      const store = useAdvancedLayerStoreV2.getState();
      store.createLayer('paint', 'Benchmark Layer');
      benchmark.layerCreation = performance.now() - start;
      
      // Benchmark opacity change
      const opacityStart = performance.now();
      store.setLayerOpacity(store.layers[0].id, 0.5);
      benchmark.opacityChange = performance.now() - opacityStart;
      
      // Benchmark composition
      const compStart = performance.now();
      store.composeLayers();
      benchmark.composition = performance.now() - compStart;
      
    } catch (error) {
      console.error('Benchmark failed:', error);
    }
    
    return benchmark;
  }
}

-++++++

















































































































































































































































































































































































































































-