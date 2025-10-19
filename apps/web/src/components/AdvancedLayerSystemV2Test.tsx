/**
 * Advanced Layer System V2 Test Component
 * 
 * Comprehensive test component to verify the AdvancedLayerSystemV2 works correctly.
 * Tests all layer operations, canvas management, and integration points.
 */

import React, { useState, useEffect } from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { useAutomaticLayerManager } from '../core/AutomaticLayerManager';
import { CANVAS_CONFIG } from '../constants/CanvasSizes';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: string;
}

export function AdvancedLayerSystemV2Test() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const {
    layers,
    groups,
    activeLayerId,
    createLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    setActiveLayer,
    setLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayers,
    addBrushStroke,
    removeBrushStroke,
    getBrushStrokes,
    addTextElement,
    removeTextElement,
    getTextElements,
    composeLayers
  } = useAdvancedLayerStoreV2();

  const { triggerBrushStart } = useAutomaticLayerManager(); // FIXED: createLayerForTool doesn't exist

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const addTestResult = (test: Omit<TestResult, 'id'>) => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTestResults(prev => [...prev, { ...test, id }]);
    return id;
  };

  const runTest = async (testName: string, testFn: () => Promise<void> | void) => {
    const testId = addTestResult({
      name: testName,
      status: 'running',
      message: 'Running test...'
    });

    try {
      await testFn();
      updateTestResult(testId, {
        status: 'passed',
        message: '✅ Test passed'
      });
    } catch (error) {
      updateTestResult(testId, {
        status: 'failed',
        message: `❌ Test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Layer Creation
    await runTest('Layer Creation', async () => {
      const initialCount = layers.length;
      
      const paintLayer = createLayer('paint', 'Test Paint Layer');
      const textLayer = createLayer('text', 'Test Text Layer');
      const imageLayer = createLayer('image', 'Test Image Layer');
      
      if (layers.length !== initialCount + 3) {
        throw new Error(`Expected ${initialCount + 3} layers, got ${layers.length}`);
      }
      
      if (!paintLayer || !textLayer || !imageLayer) {
        throw new Error('Failed to create layers');
      }
    });

    // Test 2: Layer Properties
    await runTest('Layer Properties', async () => {
      const testLayer = layers[0];
      if (!testLayer) throw new Error('No layers available for testing');

      setLayerVisibility(testLayer.id, false);
      setLayerOpacity(testLayer.id, 0.5);
      setLayerBlendMode(testLayer.id, 'multiply');

      const updatedLayer = layers.find(l => l.id === testLayer.id);
      if (!updatedLayer) throw new Error('Layer not found after update');

      if (updatedLayer.visible !== false) {
        throw new Error('Visibility not updated correctly');
      }
      if (updatedLayer.opacity !== 0.5) {
        throw new Error('Opacity not updated correctly');
      }
      if (updatedLayer.blendMode !== 'multiply') {
        throw new Error('Blend mode not updated correctly');
      }
    });

    // Test 3: Layer Reordering
    await runTest('Layer Reordering', async () => {
      if (layers.length < 2) throw new Error('Need at least 2 layers for reordering test');

      const originalOrder = layers.map(l => l.id);
      const newOrder = [...originalOrder].reverse();
      
      reorderLayers(newOrder);
      
      const reorderedLayers = layers.map(l => l.id);
      if (JSON.stringify(reorderedLayers) !== JSON.stringify(newOrder)) {
        throw new Error('Layer reordering failed');
      }
    });

    // Test 4: Brush Stroke Management
    await runTest('Brush Stroke Management', async () => {
      const testLayer = layers[0];
      if (!testLayer) throw new Error('No layers available for testing');

      const brushStroke = {
        id: `stroke_${Date.now()}`,
        layerId: testLayer.id,
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
          { x: 300, y: 300 }
        ],
        color: '#ff0000',
        size: 10,
        opacity: 1.0,
        timestamp: Date.now()
      };

      addBrushStroke(testLayer.id, brushStroke); // FIXED: Use testLayer.id instead of undefined layerId
      const strokes = getBrushStrokes(testLayer.id);
      
      if (strokes.length !== 1) {
        throw new Error(`Expected 1 brush stroke, got ${strokes.length}`);
      }
      
      if (strokes[0].id !== brushStroke.id) {
        throw new Error('Brush stroke ID mismatch');
      }

      removeBrushStroke(testLayer.id, brushStroke.id); // FIXED: Use testLayer.id instead of undefined layerId
      const remainingStrokes = getBrushStrokes(testLayer.id);
      
      if (remainingStrokes.length !== 0) {
        throw new Error(`Expected 0 brush strokes after removal, got ${remainingStrokes.length}`);
      }
    });

    // Test 5: Text Element Management
    await runTest('Text Element Management', async () => {
      const testLayer = layers.find(l => l.type === 'text');
      if (!testLayer) throw new Error('No text layer available for testing');

      const textElement = {
        id: `text_${Date.now()}`,
        layerId: testLayer.id,
        text: 'Test Text',
        x: 100, // FIXED: Added missing x property
        y: 100, // FIXED: Added missing y property
        u: 0.5,
        v: 0.5,
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        opacity: 1.0,
        zIndex: 0,
        timestamp: Date.now() // FIXED: Added missing timestamp property
      };

      addTextElement(testLayer.id, textElement); // FIXED: Use testLayer.id instead of undefined layerId
      const texts = getTextElements(testLayer.id);
      
      if (texts.length !== 1) {
        throw new Error(`Expected 1 text element, got ${texts.length}`);
      }
      
      if (texts[0].id !== textElement.id) {
        throw new Error('Text element ID mismatch');
      }

      removeTextElement(testLayer.id, textElement.id); // FIXED: Use testLayer.id instead of undefined layerId
      const remainingTexts = getTextElements(testLayer.id);
      
      if (remainingTexts.length !== 0) {
        throw new Error(`Expected 0 text elements after removal, got ${remainingTexts.length}`);
      }
    });

    // Test 6: Canvas Size Standardization
    await runTest('Canvas Size Standardization', async () => {
      const testLayer = layers[0];
      if (!testLayer) throw new Error('No layers available for testing');

      const canvas = testLayer.content.canvas;
      if (!canvas) throw new Error('Layer canvas not found');

      if (canvas.width !== CANVAS_CONFIG.LAYER.width) {
        throw new Error(`Expected canvas width ${CANVAS_CONFIG.LAYER.width}, got ${canvas.width}`);
      }
      
      if (canvas.height !== CANVAS_CONFIG.LAYER.height) {
        throw new Error(`Expected canvas height ${CANVAS_CONFIG.LAYER.height}, got ${canvas.height}`);
      }
    });

    // Test 7: Layer Composition
    await runTest('Layer Composition', async () => {
      const composedCanvas = composeLayers();
      
      if (!composedCanvas) {
        throw new Error('Layer composition returned null');
      }
      
      if (composedCanvas.width !== CANVAS_CONFIG.COMPOSED.width) {
        throw new Error(`Expected composed canvas width ${CANVAS_CONFIG.COMPOSED.width}, got ${composedCanvas.width}`);
      }
      
      if (composedCanvas.height !== CANVAS_CONFIG.COMPOSED.height) {
        throw new Error(`Expected composed canvas height ${CANVAS_CONFIG.COMPOSED.height}, got ${composedCanvas.height}`);
      }
    });

    // Test 8: Automatic Layer Manager Integration
    await runTest('Automatic Layer Manager Integration', async () => {
      const initialCount = layers.length;
      
      const newLayer = triggerBrushStart({ size: 10, color: '#000000' }); // FIXED: createLayerForTool doesn't exist, use triggerBrushStart
      
      if (layers.length !== initialCount + 1) {
        throw new Error(`Expected ${initialCount + 1} layers after automatic creation, got ${layers.length}`);
      }
      
      if (!newLayer) {
        throw new Error('Automatic layer creation returned null');
      }
      
      if (newLayer.type !== 'paint') {
        throw new Error(`Expected paint layer type, got ${newLayer.type}`);
      }
    });

    // Test 9: Layer Deletion
    await runTest('Layer Deletion', async () => {
      const initialCount = layers.length;
      const testLayer = layers[0];
      
      if (!testLayer) throw new Error('No layers available for deletion test');
      
      deleteLayer(testLayer.id);
      
      if (layers.length !== initialCount - 1) {
        throw new Error(`Expected ${initialCount - 1} layers after deletion, got ${layers.length}`);
      }
      
      const deletedLayer = layers.find(l => l.id === testLayer.id);
      if (deletedLayer) {
        throw new Error('Layer still exists after deletion');
      }
    });

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '#00ff00';
      case 'failed': return '#ff0000';
      case 'running': return '#ffff00';
      default: return '#666666';
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '800px',
      margin: '20px auto'
    }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>
        🧪 Advanced Layer System V2 Test Suite
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            background: isRunning ? '#666' : '#007acc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
        </button>
        
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#999' }}>
          Layers: {layers.length} | Groups: {groups.length} | Active: {activeLayerId || 'None'}
        </div>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {testResults.map((test) => (
          <div
            key={test.id}
            style={{
              padding: '8px',
              marginBottom: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              borderLeft: `4px solid ${getStatusColor(test.status)}`
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {test.name}
            </div>
            <div style={{ color: getStatusColor(test.status) }}>
              {test.message}
            </div>
            {test.details && (
              <div style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
                {test.details}
              </div>
            )}
          </div>
        ))}
      </div>

      {testResults.length > 0 && (
        <div style={{ marginTop: '20px', fontSize: '10px', color: '#999' }}>
          Tests completed: {testResults.filter(t => t.status === 'passed' || t.status === 'failed').length} / {testResults.length}
        </div>
      )}
    </div>
  );
}
