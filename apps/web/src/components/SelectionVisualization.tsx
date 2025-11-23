/**
 * 🎯 Selection Visualization Component
 * 
 * Renders bounding boxes, transform handles, and selection feedback
 * for selected elements in the layer system
 */

import React, { useRef, useEffect, useState } from 'react';
import { useLayerSelectionSystem, SelectedElement } from '../core/LayerSelectionSystem';
import { useApp } from '../App';

interface SelectionVisualizationProps {
  canvasWidth: number;
  canvasHeight: number;
  onElementMove?: (elementId: string, newPosition: { x: number; y: number }) => void;
  onElementResize?: (elementId: string, newBounds: SelectedElement['bounds']) => void;
}

export const SelectionVisualization: React.FC<SelectionVisualizationProps> = ({
  canvasWidth,
  canvasHeight,
  onElementMove,
  onElementResize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragElement, setDragElement] = useState<string | null>(null);
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  const {
    selectedElements,
    activeElement,
    selectionBox,
    moveElement,
    resizeElement,
  } = useLayerSelectionSystem();

  const { composedCanvas } = useApp();

  // Render selection visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !composedCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Set canvas size to match composed canvas
    canvas.width = composedCanvas.width;
    canvas.height = composedCanvas.height;

    // Draw selection boxes for selected elements
    selectedElements.forEach((element, index) => {
      drawSelectionBox(ctx, element, index === 0); // First element is active
    });

    // Draw selection box (marquee selection)
    if (selectionBox.isActive) {
      drawSelectionBox(ctx, selectionBox);
    }
  }, [selectedElements, activeElement, selectionBox, composedCanvas, canvasWidth, canvasHeight]);

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    element: SelectedElement | any,
    isActive: boolean = false
  ) => {
    const { bounds } = element;
    
    // Selection box style
    ctx.strokeStyle = isActive ? '#00ff00' : '#0066ff';
    ctx.lineWidth = 2;
    ctx.setLineDash(isActive ? [] : [5, 5]);
    
    // Draw main bounding box
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    
    if (isActive) {
      // Draw transform handles
      drawTransformHandles(ctx, bounds);
    }
  };

  const drawTransformHandles = (ctx: CanvasRenderingContext2D, bounds: SelectedElement['bounds']) => {
    const handleSize = 8;
    const handles = [
      { x: bounds.minX - handleSize/2, y: bounds.minY - handleSize/2, type: 'nw' },
      { x: bounds.minX + bounds.width/2 - handleSize/2, y: bounds.minY - handleSize/2, type: 'n' },
      { x: bounds.maxX - handleSize/2, y: bounds.minY - handleSize/2, type: 'ne' },
      { x: bounds.maxX - handleSize/2, y: bounds.minY + bounds.height/2 - handleSize/2, type: 'e' },
      { x: bounds.maxX - handleSize/2, y: bounds.maxY - handleSize/2, type: 'se' },
      { x: bounds.minX + bounds.width/2 - handleSize/2, y: bounds.maxY - handleSize/2, type: 's' },
      { x: bounds.minX - handleSize/2, y: bounds.maxY - handleSize/2, type: 'sw' },
      { x: bounds.minX - handleSize/2, y: bounds.minY + bounds.height/2 - handleSize/2, type: 'w' },
    ];

    handles.forEach(handle => {
      // Handle background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      
      // Handle border
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  };

  const getHandleAtPoint = (x: number, y: number, bounds: SelectedElement['bounds']): string | null => {
    const handleSize = 8;
    const tolerance = 8; // CRITICAL FIX: Increase tolerance for easier handle clicking

    const handles = [
      { x: bounds.minX - handleSize/2, y: bounds.minY - handleSize/2, type: 'nw' },
      { x: bounds.minX + bounds.width/2 - handleSize/2, y: bounds.minY - handleSize/2, type: 'n' },
      { x: bounds.maxX - handleSize/2, y: bounds.minY - handleSize/2, type: 'ne' },
      { x: bounds.maxX - handleSize/2, y: bounds.minY + bounds.height/2 - handleSize/2, type: 'e' },
      { x: bounds.maxX - handleSize/2, y: bounds.maxY - handleSize/2, type: 'se' },
      { x: bounds.minX + bounds.width/2 - handleSize/2, y: bounds.maxY - handleSize/2, type: 's' },
      { x: bounds.minX - handleSize/2, y: bounds.maxY - handleSize/2, type: 'sw' },
      { x: bounds.minX - handleSize/2, y: bounds.minY + bounds.height/2 - handleSize/2, type: 'w' },
    ];

    for (const handle of handles) {
      if (
        x >= handle.x - tolerance &&
        x <= handle.x + handleSize + tolerance &&
        y >= handle.y - tolerance &&
        y <= handle.y + handleSize + tolerance
      ) {
        return handle.type;
      }
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a transform handle
    if (activeElement) {
      const handle = getHandleAtPoint(x, y, activeElement.bounds);
      if (handle) {
        setIsDragging(true);
        setDragStart({ x, y });
        setDragElement(activeElement.id);
        setDragHandle(handle);
        return;
      }
    }

    // Check if clicking on an element to move it
    const clickedElement = selectedElements.find(element => {
      const { bounds } = element;
      return (
        x >= bounds.minX &&
        x <= bounds.maxX &&
        y >= bounds.minY &&
        y <= bounds.maxY
      );
    });

    if (clickedElement) {
      setIsDragging(true);
      setDragStart({ x, y });
      setDragElement(clickedElement.id);
      setDragHandle('move');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update cursor based on hover state when not dragging
    if (!isDragging && activeElement) {
      const handle = getHandleAtPoint(x, y, activeElement.bounds);
      if (handle) {
        canvas.style.cursor = getCursorForHandle(handle);
      } else {
        // Check if hovering over element for move
        const { bounds } = activeElement;
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
          canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    }

    if (!isDragging || !dragElement) return;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    if (dragHandle === 'move') {
      // Move element
      const element = selectedElements.find(el => el.id === dragElement);
      if (element) {
        const newPosition = {
          x: element.position.x + deltaX,
          y: element.position.y + deltaY,
        };
        
        moveElement(dragElement, newPosition);
        onElementMove?.(dragElement, newPosition);
      }
    } else if (dragHandle && dragHandle !== 'move') {
      // Resize element
      const element = selectedElements.find(el => el.id === dragElement);
      if (element) {
        const newBounds = resizeElementByHandle(element.bounds, dragHandle, deltaX, deltaY);
        resizeElement(dragElement, newBounds);
        onElementResize?.(dragElement, newBounds);
      }
    }

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragElement(null);
    setDragHandle(null);
  };

  const resizeElementByHandle = (
    bounds: SelectedElement['bounds'],
    handle: string,
    deltaX: number,
    deltaY: number
  ): SelectedElement['bounds'] => {
    const newBounds = { ...bounds };

    switch (handle) {
      case 'nw':
        newBounds.minX += deltaX;
        newBounds.minY += deltaY;
        break;
      case 'n':
        newBounds.minY += deltaY;
        break;
      case 'ne':
        newBounds.maxX += deltaX;
        newBounds.minY += deltaY;
        break;
      case 'e':
        newBounds.maxX += deltaX;
        break;
      case 'se':
        newBounds.maxX += deltaX;
        newBounds.maxY += deltaY;
        break;
      case 's':
        newBounds.maxY += deltaY;
        break;
      case 'sw':
        newBounds.minX += deltaX;
        newBounds.maxY += deltaY;
        break;
      case 'w':
        newBounds.minX += deltaX;
        break;
    }

    // Recalculate width and height
    newBounds.width = newBounds.maxX - newBounds.minX;
    newBounds.height = newBounds.maxY - newBounds.minY;

    return newBounds;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none', // Disable pointer events on container
        zIndex: 1000,
      }}
    >
      {/* CRITICAL FIX: Render canvas with event handlers for resize handles */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop dragging when mouse leaves
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto', // Enable pointer events on canvas to capture mouse events
          cursor: isDragging && dragHandle ? getCursorForHandle(dragHandle) : 'default',
        }}
      />
    </div>
  );
};

// Helper function to get cursor style for resize handles
const getCursorForHandle = (handle: string | null): string => {
  if (!handle || handle === 'move') return 'move';
  
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    default:
      return 'default';
  }
};

export default SelectionVisualization;
