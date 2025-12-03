/**
 * Clip Mask Overlay Component
 * 
 * Renders visual indicators for clip masks on the canvas:
 * - Shows clip mask outline
 * - Displays transform handles for editing
 * - Interactive editing (drag, resize, rotate)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { ClipMask } from '../core/AdvancedLayerSystemV2';

interface ClipMaskOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef?: React.RefObject<HTMLDivElement>;
  onTransformStart?: () => void;
  onTransformUpdate?: (layerId: string, transform: any) => void;
  onTransformEnd?: () => void;
}

export function ClipMaskOverlay({ 
  canvasRef,
  containerRef,
  onTransformStart,
  onTransformUpdate,
  onTransformEnd 
}: ClipMaskOverlayProps) {
  const { layers, activeLayerId, updateClipMask } = useAdvancedLayerStoreV2();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialTransform, setInitialTransform] = useState<any>(null);

  // Get active layer's clip mask
  const activeLayer = activeLayerId ? layers.find(l => l.id === activeLayerId) : null;
  const clipMask = activeLayer?.clipMask;

  // Calculate clip mask bounds and position
  const getClipMaskBounds = useCallback((mask: ClipMask) => {
    if (!mask || !mask.bounds) return null;

    const bounds = mask.bounds;
    const transform = mask.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

    // Calculate transformed bounds
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // Apply transform
    const transformedX = centerX + transform.x;
    const transformedY = centerY + transform.y;
    const transformedWidth = bounds.width * (transform.scaleX || 1);
    const transformedHeight = bounds.height * (transform.scaleY || 1);

    return {
      x: transformedX - transformedWidth / 2,
      y: transformedY - transformedHeight / 2,
      width: transformedWidth,
      height: transformedHeight,
      rotation: transform.rotation || 0,
      centerX: transformedX,
      centerY: transformedY
    };
  }, []);

  const bounds = clipMask && clipMask.enabled ? getClipMaskBounds(clipMask) : null;

  // Handle mouse down for dragging/resizing
  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    if (!clipMask || !bounds) return;

    e.preventDefault();
    e.stopPropagation();

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialTransform({ ...clipMask.transform });

    if (onTransformStart) {
      onTransformStart();
    }
  }, [clipMask, bounds, onTransformStart]);

  // Handle mouse move for dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;
    if (!dragStart || !clipMask || !bounds || !initialTransform) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Convert screen coordinates to canvas coordinates
      // This is a simplified conversion - you may need to adjust based on your canvas setup
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const canvasDeltaX = deltaX * scaleX;
      const canvasDeltaY = deltaY * scaleY;

      let newTransform = { ...initialTransform };

      if (isDragging) {
        // Move clip mask
        newTransform.x = (initialTransform.x || 0) + canvasDeltaX;
        newTransform.y = (initialTransform.y || 0) + canvasDeltaY;
      } else if (isResizing && resizeHandle) {
        // Resize clip mask
        const aspectRatio = bounds.width / bounds.height;
        let newWidth = bounds.width;
        let newHeight = bounds.height;

        // Calculate resize based on handle
        switch (resizeHandle) {
          case 'nw':
            newWidth = bounds.width - canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            newTransform.y = (initialTransform.y || 0) + canvasDeltaY / 2;
            break;
          case 'ne':
            newWidth = bounds.width + canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            newTransform.y = (initialTransform.y || 0) - canvasDeltaY / 2;
            break;
          case 'sw':
            newWidth = bounds.width - canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            newTransform.y = (initialTransform.y || 0) - canvasDeltaY / 2;
            break;
          case 'se':
            newWidth = bounds.width + canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            newTransform.y = (initialTransform.y || 0) + canvasDeltaY / 2;
            break;
          case 'n':
            newHeight = bounds.height - canvasDeltaY;
            newWidth = newHeight * aspectRatio;
            newTransform.y = (initialTransform.y || 0) + canvasDeltaY / 2;
            break;
          case 's':
            newHeight = bounds.height + canvasDeltaY;
            newWidth = newHeight * aspectRatio;
            newTransform.y = (initialTransform.y || 0) + canvasDeltaY / 2;
            break;
          case 'e':
            newWidth = bounds.width + canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            break;
          case 'w':
            newWidth = bounds.width - canvasDeltaX;
            newHeight = newWidth / aspectRatio;
            newTransform.x = (initialTransform.x || 0) + canvasDeltaX / 2;
            break;
        }

        // Update scale based on new size
        const originalWidth = clipMask.bounds.width;
        const originalHeight = clipMask.bounds.height;
        newTransform.scaleX = (newTransform.scaleX || 1) * (newWidth / originalWidth);
        newTransform.scaleY = (newTransform.scaleY || 1) * (newHeight / originalHeight);
      }

      // Update clip mask
      if (activeLayerId) {
        updateClipMask(activeLayerId, {
          ...clipMask,
          transform: newTransform
        });

        if (onTransformUpdate) {
          onTransformUpdate(activeLayerId, newTransform);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
      setDragStart(null);
      setResizeHandle(null);
      setInitialTransform(null);

      if (onTransformEnd) {
        onTransformEnd();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, dragStart, resizeHandle, clipMask, bounds, initialTransform, activeLayerId, updateClipMask, canvasRef, onTransformUpdate, onTransformEnd]);

  // Don't render if no clip mask
  if (!clipMask || !clipMask.enabled || !bounds) {
    return null;
  }

  // Convert canvas coordinates to screen coordinates
  // Use container if provided, otherwise use canvas
  const container = containerRef?.current || canvasRef.current?.parentElement;
  const canvas = canvasRef.current;
  if (!canvas || !container) return null;

  const containerRect = container.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  
  // Calculate scale based on canvas size vs displayed size
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;

  // Position relative to container
  const screenX = bounds.x * scaleX;
  const screenY = bounds.y * scaleY;
  const screenWidth = bounds.width * scaleX;
  const screenHeight = bounds.height * scaleY;

  // Calculate rotation in degrees
  const rotationDeg = (bounds.rotation || 0) * (180 / Math.PI);

  // Transform handles
  const handleSize = 8;
  const handles = [
    { x: 0, y: 0, type: 'nw' },
    { x: screenWidth / 2, y: 0, type: 'n' },
    { x: screenWidth, y: 0, type: 'ne' },
    { x: screenWidth, y: screenHeight / 2, type: 'e' },
    { x: screenWidth, y: screenHeight, type: 'se' },
    { x: screenWidth / 2, y: screenHeight, type: 's' },
    { x: 0, y: screenHeight, type: 'sw' },
    { x: 0, y: screenHeight / 2, type: 'w' },
  ];

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        transform: `rotate(${rotationDeg}deg)`,
        transformOrigin: 'center center',
        pointerEvents: 'auto',
        zIndex: 10000,
        border: '2px dashed #00ff00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => handleMouseDown(e)}
    >
      {/* Transform handles */}
      {handles.map((handle, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${handle.x - handleSize / 2}px`,
            top: `${handle.y - handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            backgroundColor: '#ffffff',
            border: '2px solid #00ff00',
            borderRadius: '2px',
            cursor: `${handle.type}-resize`,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, handle.type);
          }}
        />
      ))}

      {/* Rotation handle */}
      <div
        style={{
          position: 'absolute',
          left: `${screenWidth / 2 - 6}px`,
          top: `-20px`,
          width: '12px',
          height: '12px',
          backgroundColor: '#00ff00',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'grab',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsRotating(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          setInitialTransform({ ...clipMask.transform });
        }}
      />
    </div>
  );
}

