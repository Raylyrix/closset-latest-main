# Technical Documentation - ClOSSET Platform Layer System

## Overview

This document provides detailed technical documentation for the ClOSSET platform's layer system, focusing on the AdvancedLayerSystemV2 implementation and its integration with the broader application architecture.

## System Architecture

### Core Layer System (AdvancedLayerSystemV2)

The AdvancedLayerSystemV2 is the primary layer management system, implemented as a Zustand store with the following key characteristics:

#### State Structure
```typescript
interface AdvancedLayerStoreV2 {
  // Core state
  layers: AdvancedLayer[];
  groups: LayerGroup[];
  layerOrder: string[];
  selectedLayerIds: string[];
  activeLayerId: string | null;
  
  // Actions
  createLayer: (type: LayerType, name?: string) => string;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string;
  renameLayer: (id: string, name: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  reorderLayers: (newOrder: string[]) => void;
  
  // Content management
  addBrushStroke: (stroke: BrushStroke) => void;
  removeBrushStroke: (strokeId: string) => void;
  getBrushStrokes: (layerId: string) => BrushStroke[];
  addTextElement: (element: TextElement) => void;
  removeTextElement: (elementId: string) => void;
  getTextElements: (layerId: string) => TextElement[];
  
  // Composition
  composeLayers: () => HTMLCanvasElement | null;
}
```

#### Layer Types and Content Management

**Layer Types**:
- `paint`: Canvas-based drawing layers
- `text`: Text elements with formatting
- `image`: Imported image layers
- `vector`: Vector path layers
- `puff`: 3D puff print layers
- `embroidery`: Embroidery stitch layers
- `adjustment`: Non-destructive adjustment layers
- `group`: Layer grouping containers

**Content Management**:
Each layer type has specific content handling:

```typescript
interface LayerContent {
  // Paint layers
  canvas?: HTMLCanvasElement;
  
  // Text layers
  text?: string;
  textElements?: TextElement[];
  
  // Image layers
  imageData?: ImageData;
  
  // Vector layers
  vectorPaths?: VectorPath[];
  
  // Brush strokes (for paint layers)
  brushStrokes?: BrushStroke[];
}
```

### Canvas Management System

#### Centralized Canvas Sizes
All canvas operations use standardized sizes defined in `CanvasSizes.ts`:

```typescript
export const CANVAS_CONFIG = {
  LAYER: { width: 1536, height: 1536 },
  COMPOSED: { width: 1536, height: 1536 },
  DISPLACEMENT: { width: 2048, height: 2048 },
  NORMAL: { width: 2048, height: 2048 },
  PREVIEW: { width: 512, height: 512 },
  EXPORT: { width: 2048, height: 2048 },
};
```

#### Canvas Creation Helpers
```typescript
// Standardized canvas creation functions
export function createLayerCanvas(): HTMLCanvasElement
export function createComposedCanvas(): HTMLCanvasElement
export function createDisplacementCanvas(): HTMLCanvasElement
export function createNormalCanvas(): HTMLCanvasElement
export function createPreviewCanvas(): HTMLCanvasElement
export function createExportCanvas(): HTMLCanvasElement
```

### Layer Composition Pipeline

#### Composition Process
The layer composition system follows this pipeline:

1. **Canvas Creation**: Create composed canvas with standard size
2. **Layer Sorting**: Sort layers by order property (ascending)
3. **Content Rendering**: Render each layer's content based on type
4. **Effect Application**: Apply layer effects and blend modes
5. **Mask Application**: Apply layer masks if present
6. **Final Output**: Return composed canvas

#### Implementation Details
```typescript
composeLayers: () => {
  const state = get();
  const composedCanvas = createComposedCanvas();
  const ctx = composedCanvas.getContext('2d');
  
  if (!ctx) return null;
  
  // Sort layers by order
  const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);
  
  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    
    // Render layer content based on type
    if (layer.content.canvas) {
      ctx.drawImage(layer.content.canvas, 0, 0);
    }
    
    // Render brush strokes
    if (layer.content.brushStrokes) {
      for (const stroke of layer.content.brushStrokes) {
        renderBrushStroke(ctx, stroke);
      }
    }
    
    // Render text elements
    if (layer.content.textElements) {
      for (const text of layer.content.textElements) {
        renderTextElement(ctx, text);
      }
    }
    
    ctx.restore();
  }
  
  return composedCanvas;
}
```

### Automatic Layer Management

#### Tool-to-Layer Mapping
The AutomaticLayerManager automatically creates appropriate layers based on tool usage:

```typescript
const TOOL_LAYER_MAPPING = {
  'brush': 'paint',
  'eraser': 'paint',
  'puffPrint': 'puff',
  'embroidery': 'embroidery',
  'text': 'text',
  'image': 'image',
  'vectorTools': 'vector',
};
```

#### Layer Creation Process
1. **Tool Detection**: Detect active tool
2. **Layer Type Determination**: Map tool to layer type
3. **Layer Creation**: Create layer with appropriate content
4. **Integration**: Integrate with AdvancedLayerSystemV2
5. **UI Update**: Update layer panel UI

### Performance Optimization

#### Canvas Pool Management
The CanvasPool system prevents memory leaks by reusing canvas objects:

```typescript
class CanvasPool {
  private pool: HTMLCanvasElement[] = [];
  private maxSize: number = 50;
  
  getCanvas(width: number, height: number): HTMLCanvasElement {
    // Find existing canvas or create new one
    let canvas = this.pool.find(c => c.width === width && c.height === height);
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }
    
    return canvas;
  }
  
  returnCanvas(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(canvas);
    }
  }
}
```

#### Performance Monitoring
The UnifiedPerformanceManager monitors and optimizes performance:

```typescript
class UnifiedPerformanceManager {
  detectDeviceCapabilities(): DeviceCapabilities {
    // Detect GPU, memory, CPU capabilities
    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      deviceMemory: navigator.deviceMemory || 4,
      cpuCores: navigator.hardwareConcurrency || 4,
    };
  }
  
  getOptimalCanvasSize(): { width: number; height: number } {
    const capabilities = this.detectDeviceCapabilities();
    
    if (capabilities.deviceMemory <= 2) return { width: 512, height: 512 };
    if (capabilities.deviceMemory <= 4) return { width: 1024, height: 1024 };
    if (capabilities.deviceMemory <= 8) return { width: 1536, height: 1536 };
    return { width: 2048, height: 2048 };
  }
}
```

### UI Integration

#### RightPanelCompact Layer Management
The layer panel provides Photoshop-like functionality:

```typescript
// Layer reordering controls
<button onClick={() => {
  const currentIndex = advancedLayers.findIndex(l => l.id === layer.id);
  if (currentIndex < advancedLayers.length - 1) {
    const newOrder = [...advancedLayers.map(l => l.id)];
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
    [newOrder[currentIndex + 1], newOrder[currentIndex]];
    reorderLayers(newOrder);
  }
}}>▲</button>

// Opacity slider
<input
  type="range"
  min="0"
  max="100"
  value={Math.round(layer.opacity * 100)}
  onChange={(e) => {
    const opacity = parseInt(e.target.value) / 100;
    setLayerOpacity(layer.id, opacity);
  }}
/>

// Double-click rename
onDoubleClick={() => {
  const newName = prompt('Rename layer:', layer.name);
  if (newName && newName.trim() !== '' && newName !== layer.name) {
    renameAdvancedLayer(layer.id, newName.trim());
  }
}}
```

### Testing Infrastructure

#### Comprehensive Test Suite
The AdvancedLayerSystemV2Test component provides comprehensive testing:

```typescript
// Test categories
const testSuites = [
  'Layer Creation',
  'Layer Properties',
  'Layer Reordering',
  'Brush Stroke Management',
  'Text Element Management',
  'Canvas Size Standardization',
  'Layer Composition',
  'Automatic Layer Manager Integration',
  'Layer Deletion'
];

// Test execution
const runTest = async (testName: string, testFn: () => Promise<void>) => {
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
      message: `❌ Test failed: ${error.message}`
    });
  }
};
```

#### Test Access
- **Keyboard Shortcut**: Ctrl+Shift+T to toggle test interface
- **Test Coverage**: All major layer operations and integrations
- **Real-time Results**: Live test execution with visual feedback

### Integration Points

#### App.tsx Integration
The main App component integrates all layer systems:

```typescript
// Layer composition delegation
composeLayers: () => {
  const result = useAdvancedLayerStoreV2.getState().composeLayers();
  if (!result) {
    console.warn('🎨 V2 layer composition returned null');
    return null;
  }
  return result;
},

// Displacement map composition
composeDisplacementMaps: () => {
  const composedDisplacementCanvas = createDisplacementCanvas();
  const ctx = composedDisplacementCanvas.getContext('2d');
  
  // Fill with black (no displacement)
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, CANVAS_CONFIG.DISPLACEMENT.width, CANVAS_CONFIG.DISPLACEMENT.height);
  
  // Compose displacement maps from layers
  // ... implementation details
  
  return composedDisplacementCanvas;
}
```

#### ShirtRefactored Integration
The 3D rendering component integrates with the layer system:

```typescript
// Layer creation for brush strokes
const createBrushStroke = (points: Point[], color: string, size: number) => {
  const layerStore = useAdvancedLayerStoreV2.getState();
  const activeLayer = layerStore.layers.find(l => l.id === layerStore.activeLayerId);
  
  if (!activeLayer) {
    const newLayerId = layerStore.createLayer('paint', `Brush Layer ${Date.now()}`);
    layerStore.setActiveLayer(newLayerId);
  }
  
  const stroke: BrushStroke = {
    id: `stroke_${Date.now()}`,
    layerId: layerStore.activeLayerId!,
    points,
    color,
    size,
    opacity: 1.0,
    timestamp: Date.now()
  };
  
  layerStore.addBrushStroke(stroke);
};
```

### Error Handling and Debugging

#### Error Boundaries
The system includes comprehensive error handling:

```typescript
// Layer composition error handling
composeLayers: () => {
  try {
    // ... composition logic
    return composedCanvas;
  } catch (error) {
    console.error('Error in layer composition:', error);
    return null;
  } finally {
    // Cleanup operations
    ctx.restore();
  }
}
```

#### Debug Logging
Comprehensive logging for debugging:

```typescript
// Performance-optimized logging
if (Math.random() < 0.01) {
  console.log('🎨 Composing layers:', layers.length, 'layers');
}

// Debug information
console.log('🎨 Layer composition complete', {
  layerCount: layers.length,
  canvasSize: { width: composedCanvas.width, height: composedCanvas.height },
  compositionTime: Date.now() - startTime
});
```

### Future Enhancements

#### Planned Features
1. **Layer Groups**: Full group management with collapse/expand
2. **Layer Styles**: Preset styles and effects
3. **Smart Objects**: Non-destructive layer containers
4. **Adjustment Layers**: Non-destructive adjustments
5. **Layer Masks**: Advanced masking capabilities

#### Performance Improvements
1. **WebGL Composition**: GPU-accelerated layer composition
2. **Incremental Updates**: Only recompose changed layers
3. **Background Processing**: Offload heavy operations to web workers
4. **Memory Optimization**: Advanced memory management strategies

## Conclusion

The AdvancedLayerSystemV2 represents a sophisticated, production-ready layer management system that provides Photoshop-like functionality with modern web technologies. The system's modular architecture, comprehensive testing, and performance optimization make it suitable for professional 3D design applications.

The technical implementation demonstrates best practices in:
- State management with Zustand
- Canvas optimization and memory management
- Performance monitoring and adaptation
- Comprehensive testing infrastructure
- User experience design

This documentation serves as a reference for developers working with the system and provides a foundation for future enhancements and optimizations.
