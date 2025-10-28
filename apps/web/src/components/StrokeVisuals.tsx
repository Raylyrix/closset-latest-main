/**
 * 🎨 Stroke Visuals Component - Phase 2
 * 
 * Renders visual indicators for selected strokes:
 * - Border around selected stroke
 * - Hide border when deselected
 */

import React from 'react';
import { useStrokeSelection } from '../core/StrokeSelectionSystem';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';

export function StrokeSelectionOverlay() {
  const { selectedLayerId } = useStrokeSelection();
  const { layers } = useAdvancedLayerStoreV2();
  const { composedCanvas } = useAdvancedLayerStoreV2.getState();
  
  // Get selected stroke data
  const selectedStroke = selectedLayerId 
    ? layers.find(l => l.id === selectedLayerId)
    : null;
  
  const strokeData = selectedStroke?.content?.strokeData;
  
  // CRITICAL: Only render border when stroke is actually selected
  if (!selectedStroke || !strokeData || !strokeData.bounds) {
    return null;
  }
  
  const bounds = strokeData.bounds;
  const canvasWidth = composedCanvas?.width || 2048;
  const canvasHeight = composedCanvas?.height || 2048;
  
  // Convert bounds to SVG coordinates
  // Bounds are in canvas pixels, need to convert to UV for display
  const uvBounds = {
    x: bounds.minX / canvasWidth,
    y: bounds.minY / canvasHeight,
    width: bounds.width / canvasWidth,
    height: bounds.height / canvasHeight
  };
  
  // Convert to screen coordinates if needed (depends on rendering context)
  const rectStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${uvBounds.x * 100}%`,
    top: `${uvBounds.y * 100}%`,
    width: `${uvBounds.width * 100}%`,
    height: `${uvBounds.height * 100}%`,
    border: '2px dashed #00ff00',
    pointerEvents: 'none',
    zIndex: 10000,
    opacity: 0.8,
    transition: 'all 0.2s ease'
  };
  
  return (
    <div style={rectStyle} />
  );
}

// Canvas-based rendering component (for 2D canvas overlay)
export function StrokeSelectionCanvas({ ctx }: { ctx: CanvasRenderingContext2D | null }) {
  const { selectedLayerId } = useStrokeSelection();
  const { layers } = useAdvancedLayerStoreV2();
  
  if (!ctx || !selectedLayerId) return null;
  
  const selectedStroke = layers.find(l => l.id === selectedLayerId);
  const strokeData = selectedStroke?.content?.strokeData;
  
  // CRITICAL: Only render border when stroke is selected
  if (!selectedStroke || !strokeData || !strokeData.bounds) {
    return null;
  }
  
  const bounds = strokeData.bounds;
  
  // Draw border around selected stroke
  ctx.save();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.globalAlpha = 0.8;
  
  ctx.strokeRect(
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height
  );
  
  ctx.restore();
  
  return null;
}


