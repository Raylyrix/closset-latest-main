/**
 * 🎯 Shirt Rendering Hook
 * 
 * Handles all rendering logic for the shirt component
 * Extracted from Shirt.js for better separation of concerns
 */

import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useApp } from '../../../App';
import { useAdvancedLayerStoreV2 } from '../../../core/AdvancedLayerSystemV2';
import { vectorStore } from '../../../vector/vectorState';
import { renderStitchType } from '../../../utils/stitchRendering';
import { performanceMonitor } from '../../../utils/PerformanceMonitor';

export const useShirtRendering = () => {
  // Use V2 system for composed canvas
  const { composedCanvas } = useAdvancedLayerStoreV2();
  const getActiveLayer = useApp(s => s.getActiveLayer);
  const composeLayers = useApp(s => s.composeLayers);
  const brushColor = useApp(s => s.brushColor);
  const brushSize = useApp(s => s.brushSize);
  const brushOpacity = useApp(s => s.brushOpacity);
  const activeTool = useApp(s => s.activeTool);
  const vectorMode = useApp(s => s.vectorMode);
  
  const renderThrottleRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  
  // Throttled rendering for performance
  const throttledRender = useCallback((fn: () => void, delay: number = 8) => {
    if (renderThrottleRef.current) {
      clearTimeout(renderThrottleRef.current);
    }
    
    renderThrottleRef.current = window.setTimeout(() => {
      const now = performance.now();
      if (now - lastRenderTimeRef.current >= delay) {
        fn();
        lastRenderTimeRef.current = now;
      }
    }, delay);
  }, []);
  
  // Render vectors to active layer
  const renderVectorsToActiveLayer = useCallback(() => {
    if (!composedCanvas) return;
    
    const layer = getActiveLayer();
    if (!layer) return;
    
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Clear canvas for fresh rendering
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      
      // Get vector shapes from store
      const vectorState = vectorStore.getState();
      const shapes = vectorState.shapes || [];
      
      console.log(`🎨 Rendering ${shapes.length} vector shapes to active layer`);
      
      // Render each VectorPath-like shape
      shapes.forEach((shape: any) => {
        if (!shape || !shape.points) return;

        // Set up rendering context from global brush settings
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.globalAlpha = brushOpacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Render as vector path
        renderVectorPath(ctx, { points: shape.points });

        // Optionally render as stitch overlay if style indicates
        if (shape.stroke && String(activeTool).includes('stitch')) {
          renderStitchPath(ctx, { points: shape.points }, String(activeTool));
        }
      });
      
      // Update composed canvas
      composeLayers();
      
      console.log('✅ Vector rendering completed');
      
    } catch (error) {
      console.error('❌ Error rendering vectors:', error);
      performanceMonitor.trackError(error as Error, 'useShirtRendering', 'high', { phase: 'render_vectors' });
    }
  }, [composedCanvas, getActiveLayer, composeLayers, brushColor, brushSize, brushOpacity, activeTool]);
  
  // Render vector path
  const renderVectorPath = useCallback((ctx: CanvasRenderingContext2D, path: any) => {
    if (!path || !path.points || path.points.length === 0) return;
    
    ctx.beginPath();
    
    path.points.forEach((point: any, index: number) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.stroke();
  }, []);
  
  // Render stitch path
  const renderStitchPath = useCallback((ctx: CanvasRenderingContext2D, path: any, stitchType: string) => {
    if (!path || !path.points || path.points.length === 0) return;
    
    const points = path.points.map((point: any) => ({
      x: point.x,
      y: point.y
    }));
    
    const config = {
      type: stitchType,
      color: brushColor,
      thickness: brushSize,
      opacity: brushOpacity
    };
    
    renderStitchType(ctx, points, config);
  }, [brushColor, brushSize, brushOpacity]);
  
  // Render anchor points
  const renderAnchorPoints = useCallback((ctx: CanvasRenderingContext2D, shapes: any[]) => {
    if (!vectorMode) return;
    
    shapes.forEach(shape => {
      if (!shape || !shape.points) return;
      
      shape.points.forEach((point: any) => {
        if (point.anchor) {
          // Draw anchor point
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw control handles if they exist
          if (point.controlIn || point.controlOut) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            if (point.controlIn) {
              ctx.moveTo(point.x, point.y);
              ctx.lineTo(point.controlIn.x, point.controlIn.y);
            }
            
            if (point.controlOut) {
              ctx.moveTo(point.x, point.y);
              ctx.lineTo(point.controlOut.x, point.controlOut.y);
            }
            
            ctx.stroke();
          }
        }
      });
    });
  }, [vectorMode]);
  
  // Clear canvas
  const clearCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
  }, []);
  
  // Update texture from canvas
  const updateTexture = useCallback((texture: THREE.CanvasTexture) => {
    if (texture) {
      texture.needsUpdate = true;
    }
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (renderThrottleRef.current) {
        clearTimeout(renderThrottleRef.current);
      }
    };
  }, []);
  
  return {
    renderVectorsToActiveLayer,
    renderAnchorPoints,
    clearCanvas,
    updateTexture,
    throttledRender
  };
};

export default useShirtRendering;
