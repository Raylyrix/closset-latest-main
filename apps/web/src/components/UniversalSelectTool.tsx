/**
 * 🎯 Universal Select Tool
 * 
 * Main component that provides universal selection functionality
 * Integrates with existing tools and provides a unified selection experience
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { TransformGizmo } from './TransformGizmo';

interface UniversalSelectToolProps {
  active: boolean;
}

interface SelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  selectedElements: any[];
  selectionMode: 'replace' | 'add' | 'subtract' | 'intersect';
}

export function UniversalSelectTool({ active }: UniversalSelectToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    selectedElements: [],
    selectionMode: 'replace'
  });
  
  const { 
    activeTool,
    setActiveTool,
    controlsEnabled,
    setControlsEnabled
  } = useApp();

  const { layers, selectedLayerIds, setActiveLayer } = useAdvancedLayerStoreV2();

  // Initialize when tool becomes active
  useEffect(() => {
    if (active && !isInitialized) {
      setIsInitialized(true);
      
      // Find the main canvas element
      const mainCanvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (mainCanvas) {
        (canvasRef as any).current = mainCanvas; // FIXED: current is read-only
      }
    }
  }, [active, isInitialized]);

  // Handle selection changes
  const handleSelectionChange = useCallback((elements: any[]) => {
    console.log('Selection changed:', elements.length, 'elements selected');
    
    setSelectionState(prev => ({ ...prev, selectedElements: elements }));
    
    // Sync with existing tool states
    if (elements.length === 0) {
      // No selection - clear all tool selections
      const { selectTextElement, setSelectedImageId, setActiveShapeId } = useApp.getState();
      selectTextElement(null);
      setSelectedImageId(null);
      setActiveShapeId(null);
    } else if (elements.length === 1) {
      // Single selection - sync with appropriate tool
      const element = elements[0];
      const { selectTextElement, setSelectedImageId, setActiveShapeId } = useApp.getState();
      
      switch (element.type) {
        case 'text':
          selectTextElement(element.id);
          break;
        case 'image':
          setSelectedImageId(element.id);
          break;
        case 'shape':
          setActiveShapeId(element.id);
          break;
        case 'layer':
          setActiveLayer(element.id);
          break;
      }
    }
  }, [setActiveLayer]);

  // Marquee selection logic
  const handleMarqueeStart = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionState(prev => ({
      ...prev,
      isSelecting: true,
      startX,
      startY,
      endX: startX,
      endY: startY,
      selectionMode: e.ctrlKey ? 'add' : e.shiftKey ? 'subtract' : 'replace'
    }));
  }, [active]);

  const handleMarqueeMove = useCallback((e: React.MouseEvent) => {
    if (!selectionState.isSelecting || !active) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    setSelectionState(prev => ({
      ...prev,
      endX,
      endY
    }));
  }, [selectionState.isSelecting, active]);

  const handleMarqueeEnd = useCallback((e: React.MouseEvent) => {
    if (!selectionState.isSelecting || !active) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Calculate selection bounds
    const left = Math.min(selectionState.startX, endX);
    const top = Math.min(selectionState.startY, endY);
    const width = Math.abs(endX - selectionState.startX);
    const height = Math.abs(endY - selectionState.startY);

    // Find elements within selection bounds
    const elementsInBounds = findElementsInBounds(left, top, width, height);
    
    // Apply selection mode
    let newSelection: any[] = [];
    switch (selectionState.selectionMode) {
      case 'replace':
        newSelection = elementsInBounds;
        break;
      case 'add':
        newSelection = [...selectionState.selectedElements, ...elementsInBounds];
        break;
      case 'subtract':
        newSelection = selectionState.selectedElements.filter(
          el => !elementsInBounds.some(boundEl => boundEl.id === el.id)
        );
        break;
      case 'intersect':
        newSelection = selectionState.selectedElements.filter(
          el => elementsInBounds.some(boundEl => boundEl.id === el.id)
        );
        break;
    }

    // Remove duplicates
    newSelection = newSelection.filter((el, index, self) => 
      index === self.findIndex(e => e.id === el.id)
    );

    setSelectionState(prev => ({
      ...prev,
      isSelecting: false,
      selectedElements: newSelection
    }));

    handleSelectionChange(newSelection);
  }, [selectionState, active, handleSelectionChange]);

  // Find elements within selection bounds
  const findElementsInBounds = useCallback((left: number, top: number, width: number, height: number) => {
    const elements: any[] = [];
    
    // Check layers
    layers.forEach((layer) => {
      // This is a simplified check - in reality, you'd need to check actual element bounds
      if (layer.visible && (layer as any).canvas) { // FIXED: canvas property not in AdvancedLayer type
        elements.push({
          id: layer.id,
          type: 'layer',
          name: layer.name,
          bounds: { x: 0, y: 0, width: (layer as any).canvas.width, height: (layer as any).canvas.height } // FIXED: canvas property access
        });
      }
    });

    // Check other elements (text, images, shapes) from useApp state
    const { textElements, importedImages, shapeElements } = useApp.getState();
    
    // Add text elements
    textElements.forEach((text: any) => {
      elements.push({
        id: text.id,
        type: 'text',
        name: text.text || 'Text',
        bounds: { x: text.x, y: text.y, width: text.width || 100, height: text.height || 20 }
      });
    });

    // Add image elements
    importedImages.forEach((image) => {
      elements.push({
        id: image.id,
        type: 'image',
        name: 'Image',
        bounds: { 
          x: image.x || 0, 
          y: image.y || 0, 
          width: image.width || image.uWidth * 1024 || 100, 
          height: image.height || image.uHeight * 1024 || 100 
        }
      });
    });

    // Add shape elements
    shapeElements.forEach((shape) => {
      elements.push({
        id: shape.id,
        type: 'shape',
        name: shape.type || 'Shape',
        bounds: { 
          x: shape.x || 0, 
          y: shape.y || 0, 
          width: shape.width || shape.size || 100, 
          height: shape.height || shape.size || 100 
        }
      });
    });

    // Filter elements that intersect with selection bounds
    return elements.filter(element => {
      const bounds = element.bounds;
      return !(bounds.x > left + width || 
               bounds.x + bounds.width < left || 
               bounds.y > top + height || 
               bounds.y + bounds.height < top);
    });
  }, [layers]);

  // Handle element selection
  const handleElementSelect = (element: any) => {
    console.log('Element selected:', element.type, element.id);
  };

  // Handle element deselection
  const handleElementDeselect = (elementId: string) => {
    console.log('Element deselected:', elementId);
  };

  // AI-powered selection features
  const handleAISelection = useCallback((selectionType: 'object' | 'color' | 'similar') => {
    if (!active) return;
    
    console.log(`AI Selection: ${selectionType}`);
    
    switch (selectionType) {
      case 'object':
        // Object selection - detect objects in the canvas
        console.log('AI Object Selection: Detecting objects...');
        // TODO: Implement AI object detection
        break;
      case 'color':
        // Color-based selection - select similar colors
        console.log('AI Color Selection: Selecting similar colors...');
        // TODO: Implement color-based selection
        break;
      case 'similar':
        // Similar content selection
        console.log('AI Similar Selection: Finding similar content...');
        // TODO: Implement similarity-based selection
        break;
    }
  }, [active]);

  // Smart selection suggestions
  const getSelectionSuggestions = useCallback(() => {
    const suggestions = [];
    
    if (selectionState.selectedElements.length > 0) {
      const { autoGroupLayers } = useAdvancedLayerStoreV2.getState();
      const layerIds = selectionState.selectedElements
        .filter(el => el.type === 'layer')
        .map(el => el.id);
      
      if (layerIds.length > 1) {
        suggestions.push({
          type: 'group',
          label: 'Group Selected Layers',
          action: () => autoGroupLayers()
        });
      }
    }
    
    return suggestions;
  }, [selectionState.selectedElements]);

  // Transform selected elements
  const transformSelectedElements = useCallback((transform: { x?: number; y?: number; scaleX?: number; scaleY?: number; rotation?: number }) => {
    selectionState.selectedElements.forEach(element => {
      switch (element.type) {
        case 'text':
          // Update text position
          const { updateTextElement } = useApp.getState();
          updateTextElement(element.id, {
            x: element.bounds.x + (transform.x || 0),
            y: element.bounds.y + (transform.y || 0)
          });
          break;
        case 'image':
          // Update image position
          const { updateImportedImage } = useApp.getState();
          updateImportedImage(element.id, {
            x: element.bounds.x + (transform.x || 0),
            y: element.bounds.y + (transform.y || 0)
          });
          break;
        case 'shape':
          // Update shape position
          const { updateShapeElement } = useApp.getState();
          updateShapeElement(element.id, {
            x: element.bounds.x + (transform.x || 0),
            y: element.bounds.y + (transform.y || 0)
          });
          break;
        case 'layer':
          // Update layer transform
          const { setLayerTransform } = useAdvancedLayerStoreV2.getState();
          setLayerTransform(element.id, {
            x: (transform.x || 0),
            y: (transform.y || 0),
            scaleX: transform.scaleX || 1,
            scaleY: transform.scaleY || 1,
            rotation: transform.rotation || 0,
            skewX: 0,
            skewY: 0
          });
          break;
      }
    });
  }, [selectionState.selectedElements]);

  // Keyboard shortcuts for select tool
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Select all (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        // Select all elements
        const allElements = findElementsInBounds(0, 0, 2000, 2000); // Large bounds to select all
        handleSelectionChange(allElements);
      }

      // Deselect all (Escape)
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSelectionChange([]);
      }

      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        selectionState.selectedElements.forEach(element => {
          switch (element.type) {
            case 'text':
              const { deleteTextElement } = useApp.getState();
              deleteTextElement(element.id);
              break;
            case 'image':
              const { removeImportedImage } = useApp.getState();
              removeImportedImage(element.id);
              break;
            case 'shape':
              const { deleteShapeElement } = useApp.getState();
              deleteShapeElement(element.id);
              break;
            case 'layer':
              const { deleteLayer } = useAdvancedLayerStoreV2.getState();
              deleteLayer(element.id);
              break;
          }
        });
        handleSelectionChange([]);
      }

      // Arrow keys for nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1; // Shift for larger nudges
        let deltaX = 0;
        let deltaY = 0;

        switch (e.key) {
          case 'ArrowUp':
            deltaY = -nudgeAmount;
            break;
          case 'ArrowDown':
            deltaY = nudgeAmount;
            break;
          case 'ArrowLeft':
            deltaX = -nudgeAmount;
            break;
          case 'ArrowRight':
            deltaX = nudgeAmount;
            break;
        }

        transformSelectedElements({ x: deltaX, y: deltaY });
      }

      // Copy (Ctrl/Cmd + C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        console.log('Copy selected elements:', selectionState.selectedElements);
        // TODO: Implement copy functionality
      }

      // Paste (Ctrl/Cmd + V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        console.log('Paste elements');
        // TODO: Implement paste functionality
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, selectionState.selectedElements, handleSelectionChange, findElementsInBounds, transformSelectedElements]);

  // Tool settings panel
  const renderToolSettings = () => {
    if (!active) return null;

    const selectedCount = selectionState.selectedElements.length;

    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#1e1e1e',
          border: '1px solid #3c3c3c',
          borderRadius: '8px',
          margin: '8px 0'
        }}
      >
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '14px', 
          color: '#ffffff',
          fontWeight: 'bold'
        }}>
          🎯 Universal Selection
        </h3>

        {selectedCount > 0 ? (
          <div>
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '12px', 
              color: '#cccccc' 
            }}>
              {selectedCount} element{selectedCount !== 1 ? 's' : ''} selected
            </div>

            {/* Selection details */}
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '11px', 
              color: '#aaaaaa',
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              {selectionState.selectedElements.map((element, index) => (
                <div key={element.id} style={{ 
                  padding: '2px 0',
                  borderBottom: index < selectedCount - 1 ? '1px solid #333' : 'none'
                }}>
                  {element.type}: {element.name}
                </div>
              ))}
            </div>

            {/* AI Selection Tools */}
            <div style={{ 
              marginBottom: '12px', 
              padding: '8px', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '4px' 
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#888888', 
                marginBottom: '6px' 
              }}>
                🤖 AI Selection Tools:
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#6f42c1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => handleAISelection('object')}
                >
                  🎯 Object
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e83e8c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => handleAISelection('color')}
                >
                  🎨 Color
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#20c997',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => handleAISelection('similar')}
                >
                  🔍 Similar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007acc',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  console.log('Group elements functionality');
                  // TODO: Implement grouping
                }}
              >
                📦 Group Elements
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  console.log('Duplicate elements');
                  // TODO: Implement duplication
                }}
              >
                📋 Duplicate
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffc107',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  console.log('Align elements');
                  // TODO: Implement alignment
                }}
              >
                ⚖️ Align
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  handleSelectionChange([]);
                }}
              >
                🗑️ Clear Selection
              </button>
            </div>

            {/* Transform controls */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid #3c3c3c' 
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#888888',
                marginBottom: '8px'
              }}>
                Transform:
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => transformSelectedElements({ x: -1, y: 0 })}
                >
                  ←
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => transformSelectedElements({ x: 0, y: -1 })}
                >
                  ↑
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => transformSelectedElements({ x: 0, y: 1 })}
                >
                  ↓
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => transformSelectedElements({ x: 1, y: 0 })}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            fontSize: '12px', 
            color: '#888888',
            fontStyle: 'italic'
          }}>
            Click and drag to select elements, or click individual elements to select them.
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          paddingTop: '12px', 
          borderTop: '1px solid #3c3c3c' 
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#888888',
            marginBottom: '8px'
          }}>
            Keyboard Shortcuts:
          </div>
          <div style={{ fontSize: '10px', color: '#666666', lineHeight: '1.4' }}>
            <div>• Ctrl/Cmd + A: Select all</div>
            <div>• Ctrl/Cmd + Click: Add to selection</div>
            <div>• Shift + Click: Subtract from selection</div>
            <div>• Delete/Backspace: Delete selected</div>
            <div>• Escape: Clear selection</div>
            <div>• Arrow keys: Nudge selected</div>
            <div>• Shift + Arrow: Nudge by 10px</div>
          </div>
        </div>
      </div>
    );
  };

  if (!active) {
    return renderToolSettings();
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Selection interface */}
      <div
        ref={selectionRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          zIndex: 1000
        }}
        onMouseDown={handleMarqueeStart}
        onMouseMove={handleMarqueeMove}
        onMouseUp={handleMarqueeEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          
          if (selectionState.selectedElements.length > 0) {
            console.log('Universal Select: Context menu for selected elements');
            // In a real implementation, this would show a context menu
          } else {
            console.log('Universal Select: Context menu - no selection');
          }
        }}
      />
      
      {/* Marquee selection box */}
      {selectionState.isSelecting && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionState.startX, selectionState.endX),
            top: Math.min(selectionState.startY, selectionState.endY),
            width: Math.abs(selectionState.endX - selectionState.startX),
            height: Math.abs(selectionState.endY - selectionState.startY),
            border: '2px dashed #007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            pointerEvents: 'none',
            zIndex: 1001
          }}
        />
      )}
      
      {/* Transform Gizmo for selected elements */}
      <TransformGizmo
        selectedElements={selectionState.selectedElements}
        onTransform={transformSelectedElements}
        visible={selectionState.selectedElements.length > 0}
      />
      
      {/* Tool Settings */}
      {renderToolSettings()}
    </div>
  );
}

// Export for use in toolbar
export default UniversalSelectTool;
