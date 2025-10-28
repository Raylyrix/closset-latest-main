/**
 * 🎯 Stroke Selection System - Phase 2
 * 
 * Handles selection of individual strokes (one layer per stroke)
 * - Hit testing to detect click on stroke
 * - Visual border when selected
 * - Hide border when deselected
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface StrokeSelectionState {
  selectedStrokeId: string | null;
  selectedLayerId: string | null;
  transformMode: 'none' | 'move' | 'resize' | 'rotate' | null;
  transformHandle: string | null;
  dragStartPos: { x: number; y: number } | null;
}

interface StrokeSelectionActions {
  // Hit testing
  performHitTest: (uv: { u: number; v: number }, composedCanvas: HTMLCanvasElement | null) => string | null;
  
  // Selection management
  selectStroke: (layerId: string) => void;
  clearSelection: () => void;
  
  // Get selected stroke data
  getSelectedStroke: () => any | null;
  
  // Check if stroke is selected
  isStrokeSelected: (layerId: string) => boolean;
  
  // PHASE 3: Manipulation
  startTransform: (mode: 'move' | 'resize' | 'rotate', handle: string | null, startPos: { x: number; y: number }) => void;
  endTransform: () => void;
  updateTransform: (currentPos: { x: number; y: number }) => void;
  
  // Transform operations
  moveStroke: (layerId: string, deltaX: number, deltaY: number) => void;
  resizeStroke: (layerId: string, handle: string, deltaX: number, deltaY: number) => void;
  rotateStroke: (layerId: string, angle: number) => void;
  deleteStroke: (layerId: string) => void;
}

export const useStrokeSelection = create<StrokeSelectionState & StrokeSelectionActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
      selectedStrokeId: null,
    selectedLayerId: null,
    transformMode: null,
    transformHandle: null,
    dragStartPos: null,
    
    // Perform hit test on strokes
    performHitTest: (uv: { u: number; v: number }, composedCanvas: HTMLCanvasElement | null) => {
      if (!composedCanvas) {
        console.warn('⚠️ No composed canvas for hit testing');
        return null;
      }
      
      // Import V2 store
      const useAdvancedLayerStoreV2 = (window as any).__layerStore;
      if (!useAdvancedLayerStoreV2) {
        console.warn('⚠️ V2 layer store not available');
        return null;
      }
      
      const { layers } = useAdvancedLayerStoreV2.getState();
      
      // Get all layers with stroke data
      const strokeLayers = layers.filter((l: any) => l.content?.strokeData);
      
      console.log(`🎯 Hit testing ${strokeLayers.length} stroke layers at UV:`, uv);
      
      // Convert UV to canvas coordinates
      const canvasWidth = composedCanvas.width;
      const canvasHeight = composedCanvas.height;
      const x = uv.u * canvasWidth;
      const y = uv.v * canvasHeight;
      
      // Check from top to bottom (reverse order for z-index)
      for (const layer of [...strokeLayers].reverse()) {
        const strokeData = layer.content.strokeData;
        if (!strokeData || !strokeData.bounds) continue;
        
        const bounds = strokeData.bounds;
        
        // Check if point is within bounds
        if (
          x >= bounds.minX &&
          x <= bounds.maxX &&
          y >= bounds.minY &&
          y <= bounds.maxY
        ) {
          console.log('🎯 Hit stroke:', layer.name, 'at layer:', layer.id);
          return layer.id;
        }
      }
      
      console.log('🎯 No stroke hit');
      return null;
    },
    
    // Select a stroke by layer ID
    selectStroke: (layerId: string) => {
      const useAdvancedLayerStoreV2 = (window as any).__layerStore;
      if (!useAdvancedLayerStoreV2) {
        console.warn('⚠️ V2 layer store not available');
        return;
      }
      
      const { layers } = useAdvancedLayerStoreV2.getState();
      const layer = layers.find((l: any) => l.id === layerId);
      
      if (layer && layer.content?.strokeData) {
        // Set selection state
        set({ 
          selectedStrokeId: layer.content.strokeData.id,
          selectedLayerId: layerId 
        });
        
        console.log('✅ Stroke selected:', layer.content.strokeData.id);
      } else {
        console.warn('⚠️ Could not find stroke for layer:', layerId);
      }
    },
    
    // Clear selection
    clearSelection: () => {
      set({ 
        selectedStrokeId: null,
        selectedLayerId: null 
      });
      
      console.log('✅ Stroke deselected - border hidden');
    },
    
    // Get selected stroke data
    getSelectedStroke: () => {
      const { selectedLayerId } = get();
      if (!selectedLayerId) return null;
      
      const useAdvancedLayerStoreV2 = (window as any).__layerStore;
      if (!useAdvancedLayerStoreV2) return null;
      
      const { layers } = useAdvancedLayerStoreV2.getState();
      const layer = layers.find((l: any) => l.id === selectedLayerId);
      
      return layer ? { ...layer, strokeData: layer.content?.strokeData } : null;
    },
    
    // Check if stroke is selected
    isStrokeSelected: (layerId: string) => {
      const { selectedLayerId } = get();
      return selectedLayerId === layerId;
    },
    
    // PHASE 3: Start transform operation
    startTransform: (mode: 'move' | 'resize' | 'rotate', handle: string | null, startPos: { x: number; y: number }) => {
      set({ 
        transformMode: mode,
        transformHandle: handle,
        dragStartPos: startPos
      });
      console.log('🎯 PHASE 3: Transform started:', mode, 'handle:', handle);
    },
    
    // PHASE 3: End transform operation
    endTransform: () => {
      set({ 
        transformMode: null,
        transformHandle: null,
        dragStartPos: null
      });
      console.log('🎯 PHASE 3: Transform ended');
    },
    
    // PHASE 3: Update transform based on current position
    updateTransform: (currentPos: { x: number; y: number }) => {
      const { transformMode, dragStartPos, selectedLayerId } = get();
      
      if (!dragStartPos || !selectedLayerId || !transformMode) return;
      
      const deltaX = currentPos.x - dragStartPos.x;
      const deltaY = currentPos.y - dragStartPos.y;
      
      // FIX #3: Update dragStartPos after transform to prevent jumpy movement
      // Call appropriate transform function
      if (transformMode === 'move') {
        get().moveStroke(selectedLayerId, deltaX, deltaY);
        // FIX #3: Update dragStartPos to current position after move
        set({ dragStartPos: currentPos });
      } else if (transformMode === 'resize') {
        const { transformHandle } = get();
        if (transformHandle) {
          get().resizeStroke(selectedLayerId, transformHandle, deltaX, deltaY);
          // FIX #3: Update dragStartPos to current position after resize
          set({ dragStartPos: currentPos });
        }
      } else if (transformMode === 'rotate') {
        // Calculate angle from center
        const angle = Math.atan2(deltaY, deltaX);
        get().rotateStroke(selectedLayerId, angle);
        // FIX #3: Update dragStartPos to current position after rotate
        set({ dragStartPos: currentPos });
      }
    },
    
    // PHASE 3: Move stroke
    moveStroke: (layerId: string, deltaX: number, deltaY: number) => {
      const useAdvancedLayerStoreV2 = (window as any).__layerStore;
      if (!useAdvancedLayerStoreV2) {
        console.error('⚠️ V2 layer store not available for move');
        return;
      }
      
      // CRITICAL FIX: Refetch layer to ensure we have the latest reference
      // Layers are updated during painting, so we need fresh data
      const { layers } = useAdvancedLayerStoreV2.getState();
      const layer = layers.find((l: any) => l.id === layerId);
      
      if (!layer) {
        console.error('⚠️ Layer not found:', layerId);
        return;
      }
      
      if (!layer.content?.strokeData) {
        console.error('⚠️ Layer has no stroke data:', layerId);
        return;
      }
      
      const { bounds, points, settings } = layer.content.strokeData;
      
      if (!bounds || !points || !settings) {
        console.error('⚠️ Invalid stroke data:', { bounds, points, settings });
        return;
      }
      
      // FIX #1 & #2: Update bounds with recalculated width/height
      const newBounds = {
        ...bounds,
        minX: bounds.minX + deltaX,
        minY: bounds.minY + deltaY,
        maxX: bounds.maxX + deltaX,
        maxY: bounds.maxY + deltaY,
        width: bounds.maxX - bounds.minX,  // FIX #2: Recalculate width
        height: bounds.maxY - bounds.minY  // FIX #2: Recalculate height
      };
      
      // Update points with bounds validation
      const canvasWidth = layer.content.canvas?.width || 2048;
      const canvasHeight = layer.content.canvas?.height || 2048;
      
        const newPoints = points.map((p: any) => {
        const x = p.x + deltaX;
        const y = p.y + deltaY;
        // Clamp to canvas bounds to prevent drawing off-canvas
        return {
          x: Math.max(0, Math.min(canvasWidth, x)),
          y: Math.max(0, Math.min(canvasHeight, y))
        };
      });
      
      // CRITICAL FIX: Redraw stroke on layer canvas using brush engine WITH proper interpolation
      // The points array only contains MOUSE positions, not all brush stamp positions
      // We need to interpolate between points to maintain continuous stroke appearance
      if (!layer.content.canvas) {
        console.error('⚠️ Layer has no canvas:', layerId);
        return;
      }
      
      const ctx = layer.content.canvas.getContext('2d');
      if (!ctx) {
        console.error('⚠️ Could not get canvas context for layer:', layerId);
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, layer.content.canvas.width, layer.content.canvas.height);
      
      // Get brush engine to redraw stroke
      const brushEngine = (window as any).__brushEngine;
      if (!brushEngine || !brushEngine.createBrushStamp) {
        console.warn('⚠️ Brush engine not available, using fallback rendering');
      }
      
      if (brushEngine && brushEngine.createBrushStamp) {
        // CRITICAL: Recreate brush stamp with ALL settings, not just subset
        const brushSettings: any = {
          size: settings.size || 10,
          opacity: settings.opacity || 1.0,
          hardness: 0.5,
          flow: 0.8,
          spacing: 0.3,  // CRITICAL: Ensure proper spacing between stamps
          angle: 0,
          roundness: 1,
          color: settings.color || '#000000',
          gradient: settings.gradient,
          blendMode: 'source-over',
          shape: 'round',
          dynamics: {
            sizePressure: false,
            opacityPressure: false
          },
          texture: { enabled: false }
        };
        
        const brushStamp = brushEngine.createBrushStamp(brushSettings);
        const brushSize = brushSettings.size;
        const spacing = brushSettings.spacing || 0.3;
        const minSpacing = brushSize * spacing;
        
        ctx.save();
        ctx.globalAlpha = settings.opacity || 1.0;
        
        // CRITICAL FIX: Interpolate between points to maintain continuous stroke
        for (let i = 0; i < newPoints.length; i++) {
          const currentPoint = newPoints[i];
          const nextPoint = newPoints[i + 1];
          
          // Draw stamp at current point
          ctx.drawImage(
            brushStamp,
            currentPoint.x - brushSize / 2,
            currentPoint.y - brushSize / 2
          );
          
          // CRITICAL: Draw stamps BETWEEN points if they're far apart
          // This maintains the continuous appearance of the original stroke
          if (nextPoint) {
            const dx = nextPoint.x - currentPoint.x;
            const dy = nextPoint.y - currentPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If points are far apart, interpolate stamps between them
            if (distance > minSpacing) {
              const steps = Math.ceil(distance / minSpacing);
              for (let j = 1; j < steps; j++) {
                const t = j / steps;
                const x = currentPoint.x + t * dx;
                const y = currentPoint.y + t * dy;
                
                ctx.drawImage(
                  brushStamp,
                  x - brushSize / 2,
                  y - brushSize / 2
                );
              }
            }
          }
        }
        
        ctx.restore();
        
        console.log('✅ CRITICAL FIX: Redrew stroke with proper interpolation after move');
      } else {
        // Fallback: Simple circle rendering with interpolation
        ctx.save();
        ctx.fillStyle = settings.color || '#000000';
        ctx.globalAlpha = settings.opacity || 1.0;
        
        const brushSize = settings.size || 10;
        const spacing = 0.3;
        const minSpacing = brushSize * spacing;
        
        for (let i = 0; i < newPoints.length; i++) {
          const currentPoint = newPoints[i];
          const nextPoint = newPoints[i + 1];
          
          // Draw stamp at current point
          ctx.beginPath();
          ctx.arc(currentPoint.x, currentPoint.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Interpolate between points
          if (nextPoint) {
            const dx = nextPoint.x - currentPoint.x;
            const dy = nextPoint.y - currentPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > minSpacing) {
              const steps = Math.ceil(distance / minSpacing);
              for (let j = 1; j < steps; j++) {
                const t = j / steps;
                const x = currentPoint.x + t * dx;
                const y = currentPoint.y + t * dy;
                
                ctx.beginPath();
                ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
        
        ctx.restore();
        console.log('✅ CRITICAL FIX: Redrew stroke with interpolation (fallback)');
      }
      
      // Update stroke data
      useAdvancedLayerStoreV2.getState().updateLayerContent(layerId, {
        strokeData: {
          ...layer.content.strokeData,
          bounds: newBounds,
          points: newPoints
        }
      });
      
      // Update composed canvas
      const { composeLayers } = useAdvancedLayerStoreV2.getState();
      composeLayers();
      
      // FIX #4: Save to history for undo/redo
      useAdvancedLayerStoreV2.getState().saveHistorySnapshot(`Move Stroke: ${layer.name}`);
      
      console.log('✅ PHASE 3: Stroke moved by', deltaX, deltaY);
    },
    
    // PHASE 3: Resize stroke
    resizeStroke: (layerId: string, handle: string, deltaX: number, deltaY: number) => {
      // TODO: Implement resize logic
      console.log('🔧 PHASE 3: Resize stroke - TODO implementation');
    },
    
    // PHASE 3: Rotate stroke
    rotateStroke: (layerId: string, angle: number) => {
      // TODO: Implement rotation logic
      console.log('🔧 PHASE 3: Rotate stroke - TODO implementation');
    },
    
    // PHASE 3: Delete stroke
    deleteStroke: (layerId: string) => {
      const useAdvancedLayerStoreV2 = (window as any).__layerStore;
      if (!useAdvancedLayerStoreV2) return;
      
      const { layers, deleteLayer } = useAdvancedLayerStoreV2.getState();
      const layer = layers.find((l: any) => l.id === layerId);
      const layerName = layer?.name || 'Unknown';
      
      // FIX #4: Save to history before deleting for undo/redo
      useAdvancedLayerStoreV2.getState().saveHistorySnapshot(`Delete Stroke: ${layerName}`);
      
      deleteLayer(layerId);
      
      // Clear selection
      set({ selectedStrokeId: null, selectedLayerId: null });
      
      // Update composed canvas
      const { composeLayers } = useAdvancedLayerStoreV2.getState();
      composeLayers();
      
      console.log('✅ PHASE 3: Stroke deleted:', layerId);
    },
  }))
);

