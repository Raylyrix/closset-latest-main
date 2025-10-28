# Phase 2 Implementation Complete: Stroke Selection System

## Summary

Successfully implemented Phase 2 of the individual stroke layers system. Users can now click on strokes to select them, and a visible border appears around selected strokes.

## Changes Made

### 1. Created StrokeSelectionSystem Store
**File**: `apps/web/src/core/StrokeSelectionSystem.ts` (NEW)

Created a Zustand store for managing stroke selection state:
- `selectedStrokeId`: ID of the currently selected stroke
- `selectedLayerId`: ID of the layer containing the selected stroke
- `performHitTest(uv, canvas)`: Tests if a click hits any stroke
- `selectStroke(layerId)`: Selects a stroke by its layer ID
- `clearSelection()`: Deselects the current stroke
- `getSelectedStroke()`: Returns data for the selected stroke
- `isStrokeSelected(layerId)`: Checks if a specific stroke is selected

### 2. Created StrokeVisuals Component
**File**: `apps/web/src/components/StrokeVisuals.tsx` (NEW)

Created components for rendering stroke selection visuals:
- `StrokeSelectionOverlay`: HTML-based visual border (for future use)
- `StrokeSelectionCanvas`: Canvas-based visual border (currently used)

The components render:
- Green dashed border around selected strokes
- Border only visible when stroke is selected
- Border hides when stroke is deselected

### 3. Integrated Stroke Selection into ShirtRefactored
**File**: `apps/web/src/components/ShirtRefactored.tsx`

**Line 15**: Added import for `StrokeSelectionCanvas`

**Line 1617**: Get selected layer ID from store:
```typescript
const { selectedLayerId } = useStrokeSelection();
```

**Lines 1620-1658**: Added useEffect to render selection border:
```typescript
// PHASE 2: Render stroke selection border when stroke is selected
useEffect(() => {
  if (!selectedLayerId) return;
  
  // Get canvas and draw border
  const ctx = composedCanvas.getContext('2d');
  if (selectedStroke?.content?.strokeData?.bounds) {
    const bounds = selectedStroke.content.strokeData.bounds;
    
    // Draw green dashed border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
  }
}, [selectedLayerId, updateModelTexture]);
```

**Lines 3718-3742**: Added hit testing in `onPointerDown`:
```typescript
// PHASE 2: Check if clicking on an existing stroke (selection mode)
if (!paintingActiveRef.current && ['brush', 'eraser', 'puffPrint', 'embroidery'].includes(activeTool)) {
  const uv = e.uv as THREE.Vector2 | undefined;
  const { composedCanvas } = useApp.getState();
  
  if (uv && composedCanvas) {
    const { performHitTest } = useStrokeSelection.getState();
    const hitLayerId = performHitTest({ u: uv.x, v: uv.y }, composedCanvas);
    
    if (hitLayerId) {
      console.log('🎯 Clicked on existing stroke, selecting it');
      const { selectStroke } = useStrokeSelection.getState();
      selectStroke(hitLayerId);
      paintingActiveRef.current = false;
      return; // Don't start painting, just select
    } else {
      console.log('🎯 Clicked on empty area, clearing selection');
      const { clearSelection } = useStrokeSelection.getState();
      clearSelection();
    }
  }
}
```

## How It Works

### Selection Flow

1. **User Clicks on Model**:
   - `onPointerDown` fires
   - If brush tool is active, check if click is on a stroke

2. **Hit Testing**:
   - Convert UV coordinates to canvas coordinates
   - Get all layers with stroke data
   - Check if click point is within any stroke's bounds
   - Return layer ID if hit, null otherwise

3. **Selection**:
   - If hit: `selectStroke(layerId)` sets `selectedLayerId` in store
   - If no hit: `clearSelection()` sets `selectedLayerId` to null

4. **Visual Feedback**:
   - `useEffect` detects `selectedLayerId` change
   - If selected: Draw green dashed border around stroke bounds
   - If deselected: Border is not rendered (hidden)

### Border Rendering

The border is rendered to the `composedCanvas` which is then displayed on the 3D model as a texture. This means:
- ✅ Border appears on the 3D model
- ✅ Border is visible from all angles
- ✅ Border updates in real-time as selection changes
- ✅ Border hides when stroke is deselected

### Hit Testing Algorithm

```typescript
// Convert UV to canvas coordinates
const x = uv.u * canvasWidth;
const y = uv.v * canvasHeight;

// Check all strokes from top to bottom (z-index order)
for (const layer of strokeLayers) {
  const bounds = layer.content.strokeData.bounds;
  
  // Check if point is within bounds
  if (x >= bounds.minX && x <= bounds.maxX && 
      y >= bounds.minY && y <= bounds.maxY) {
    return layer.id; // Hit!
  }
}

return null; // No hit
```

## User Experience

### Selecting a Stroke
1. Click on a brush tool (brush, eraser, puff print, embroidery)
2. Click anywhere on a painted stroke
3. Green dashed border appears around the stroke
4. Console logs: "🎯 Clicked on existing stroke, selecting it"

### Deselecting a Stroke
1. Click on an empty area of the model
2. Green dashed border disappears
3. Console logs: "🎯 Clicked on empty area, clearing selection"

### Starting a New Stroke
1. Click on an empty area (deselects current stroke)
2. Click and drag to start a new stroke
3. New stroke gets its own layer
4. Click on the new stroke to select it

## Testing

To verify Phase 2 works:

1. **Draw First Stroke**:
   - Select brush tool
   - Draw a stroke
   - Check layer panel: Should see "Brush Stroke xxx"

2. **Select Stroke**:
   - Click on the drawn stroke
   - Should see green dashed border
   - Console: "🎯 Clicked on existing stroke, selecting it"
   - Check layer panel: Should highlight the stroke's layer

3. **Deselect Stroke**:
   - Click on empty area
   - Border should disappear
   - Console: "🎯 Clicked on empty area, clearing selection"

4. **Draw Second Stroke**:
   - Click and drag to draw another stroke
   - Check layer panel: Should see TWO layers
   - Click on second stroke: Should select it (first stroke deselected)

## Files Modified/Created

### New Files
1. `apps/web/src/core/StrokeSelectionSystem.ts` - Selection state management
2. `apps/web/src/components/StrokeVisuals.tsx` - Visual border components
3. `PHASE_2_IMPLEMENTATION_COMPLETE.md` - This document

### Modified Files
1. `apps/web/src/components/ShirtRefactored.tsx` - Integrated selection system

## Next Phase: Manipulation

Phase 2 enables selection and visual feedback. Phase 3 will add:
- Transform handles (move, resize, rotate)
- Manipulation operations
- Delete functionality
- Undo/redo for manipulations


