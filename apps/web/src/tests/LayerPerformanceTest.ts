/**
 * Layer System Performance Test
 * Tests the layer system with 100+ layers to ensure scalability
 */

import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';

export interface PerformanceTestResults {
  totalLayers: number;
  createTime: number;
  compositionTime: number;
  renderTime: number;
  memoryUsage: number;
  passed: boolean;
  errors: string[];
}

/**
 * Creates a large number of layers and measures performance
 */
export async function runLayerPerformanceTest(layerCount: number = 100): Promise<PerformanceTestResults> {
  const results: PerformanceTestResults = {
    totalLayers: layerCount,
    createTime: 0,
    compositionTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    passed: true,
    errors: []
  };
  
  console.log(`🧪 Starting performance test with ${layerCount} layers...`);
  
  try {
    const store = useAdvancedLayerStoreV2.getState();
    
    // Test 1: Layer Creation Performance
    console.log('🧪 Test 1: Creating layers...');
    const createStart = performance.now();
    
    const layerIds: string[] = [];
    for (let i = 0; i < layerCount; i++) {
      const layerId = store.createLayer('paint', `Test Layer ${i + 1}`);
      layerIds.push(layerId);
      
      // Add some content to random layers (20%)
      if (Math.random() < 0.2) {
        const layer = store.layers.find(l => l.id === layerId);
        if (layer && layer.content.canvas) {
          const ctx = layer.content.canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
            ctx.fillRect(Math.random() * 2048, Math.random() * 2048, 100, 100);
          }
        }
      }
    }
    
    const createEnd = performance.now();
    results.createTime = createEnd - createStart;
    console.log(`✅ Created ${layerCount} layers in ${results.createTime.toFixed(2)}ms`);
    
    // Test 2: Composition Performance
    console.log('🧪 Test 2: Composing layers...');
    const composeStart = performance.now();
    
    const composedCanvas = store.composeLayers();
    
    const composeEnd = performance.now();
    results.compositionTime = composeEnd - composeStart;
    console.log(`✅ Composed ${layerCount} layers in ${results.compositionTime.toFixed(2)}ms`);
    
    if (!composedCanvas) {
      results.errors.push('Composition failed - returned null canvas');
      results.passed = false;
    }
    
    // Test 3: Layer Operations Performance
    console.log('🧪 Test 3: Testing layer operations...');
    const opsStart = performance.now();
    
    // Random visibility toggles (10 layers)
    for (let i = 0; i < Math.min(10, layerIds.length); i++) {
      const randomId = layerIds[Math.floor(Math.random() * layerIds.length)];
      store.setLayerVisibility(randomId, false);
    }
    
    // Random opacity changes (10 layers)
    for (let i = 0; i < Math.min(10, layerIds.length); i++) {
      const randomId = layerIds[Math.floor(Math.random() * layerIds.length)];
      store.setLayerOpacity(randomId, Math.random());
    }
    
    // Random blend mode changes (10 layers)
    const blendModes = ['normal', 'multiply', 'screen', 'overlay'];
    for (let i = 0; i < Math.min(10, layerIds.length); i++) {
      const randomId = layerIds[Math.floor(Math.random() * layerIds.length)];
      store.setLayerBlendMode(randomId, blendModes[Math.floor(Math.random() * blendModes.length)] as any);
    }
    
    const opsEnd = performance.now();
    results.renderTime = opsEnd - opsStart;
    console.log(`✅ Performed operations in ${results.renderTime.toFixed(2)}ms`);
    
    // Test 4: Memory Usage (if available)
    if ((performance as any).memory) {
      results.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      console.log(`📊 Memory usage: ${results.memoryUsage.toFixed(2)}MB`);
    }
    
    // Test 5: Performance Thresholds
    console.log('🧪 Test 5: Checking performance thresholds...');
    
    const THRESHOLD_CREATE_PER_LAYER = 10; // ms per layer
    const THRESHOLD_COMPOSE = 500; // ms total
    const THRESHOLD_OPS = 1000; // ms total
    
    if (results.createTime / layerCount > THRESHOLD_CREATE_PER_LAYER) {
      results.errors.push(`Layer creation too slow: ${(results.createTime / layerCount).toFixed(2)}ms/layer (threshold: ${THRESHOLD_CREATE_PER_LAYER}ms)`);
      results.passed = false;
    }
    
    if (results.compositionTime > THRESHOLD_COMPOSE) {
      results.errors.push(`Composition too slow: ${results.compositionTime.toFixed(2)}ms (threshold: ${THRESHOLD_COMPOSE}ms)`);
      results.passed = false;
    }
    
    if (results.renderTime > THRESHOLD_OPS) {
      results.errors.push(`Operations too slow: ${results.renderTime.toFixed(2)}ms (threshold: ${THRESHOLD_OPS}ms)`);
      results.passed = false;
    }
    
    // Cleanup
    console.log('🧪 Cleaning up test layers...');
    layerIds.forEach(id => store.deleteLayer(id));
    
    console.log(`🧪 Performance test ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
  } catch (error) {
    results.errors.push(`Test error: ${error}`);
    results.passed = false;
    console.error('🧪 Performance test failed:', error);
  }
  
  return results;
}

/**
 * Quick performance check (can be called from console)
 */
export async function quickPerformanceCheck() {
  console.log('🧪 Running quick performance check (50 layers)...');
  const results = await runLayerPerformanceTest(50);
  console.table({
    'Total Layers': results.totalLayers,
    'Create Time (ms)': results.createTime.toFixed(2),
    'Composition Time (ms)': results.compositionTime.toFixed(2),
    'Operations Time (ms)': results.renderTime.toFixed(2),
    'Memory (MB)': results.memoryUsage ? results.memoryUsage.toFixed(2) : 'N/A',
    'Status': results.passed ? '✅ PASSED' : '❌ FAILED'
  });
  if (results.errors.length > 0) {
    console.error('Errors:', results.errors);
  }
  return results;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).runLayerPerformanceTest = runLayerPerformanceTest;
  (window as any).quickPerformanceCheck = quickPerformanceCheck;
}



