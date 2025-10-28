# Phase 1 Implementation Complete: Individual Stroke Layers

## Summary

Successfully implemented Phase 1 of the individual stroke layers system. Each brush stroke now creates its own layer in AdvancedLayerSystemV2 with complete stroke metadata stored.

## Changes Made

### 1. Extended LayerContent Interface
**File**: `apps/web/src/core/AdvancedLayerSystemV2.ts`

Added `strokeData` property to `LayerContent` interface (lines 215-236):
```typescript
strokeData?: {
  id: string;              // Unique stroke ID
  points: Array<{ x: number; y: number }>; // Stroke path points
  bounds: {                // Stroke bounding box
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  settings: {
    size: number;
    color: string;
    opacity: number;
    gradient?: any;
  };
  tool: string;           // 'brush', 'eraser', 'puffPrint', etc.
  createdAt: Date;
  isSelected: boolean;    // Selection state
};
```

### 2. Added Stroke Session Tracking
**File**: `apps/web/src/components/ShirtRefactored.tsx`

Added `strokeSessionRef` to track the current stroke being drawn (lines 100-109):
```typescript
const strokeSessionRef = useRef<{
  id: string;
  layerId: string | null;
  points: Array<{ x: number; y: number }>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  settings: any;
  tool: string;
} | null>(null);
```

### 3. Modified Stroke Creation Logic
**File**: `apps/web/src/components/ShirtRefactored.tsx`

**Lines 1676-1741**: Modified `paintAtEvent` to create a new layer for each stroke:
- When starting a new stroke (no active session), creates a new layer
- Stores stroke session data in `strokeSessionRef`
- Continues using the same layer for the duration of the stroke

**Key Code**:
```typescript
// PHASE 1: Check if we're starting a new stroke session
if (!strokeSession || !strokeSession.layerId) {
  // CRITICAL: Create a new layer for THIS specific stroke
  const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const layerName = `${activeTool} Stroke ${strokeId}`;
  const layerId = createLayer('paint', layerName);
  
  // Initialize stroke session
  strokeSessionRef.current = {
    id: strokeId,
    layerId: layerId,
    points: [],
    bounds: null,
    settings: null,
    tool: activeTool
  };
}
```

### 4. Point and Bounds Tracking
**File**: `apps/web/src/components/ShirtRefactored.tsx`

**Lines 2008-2048**: During drawing, track each point and update bounds in real-time:

```typescript
// PHASE 1: Track this point in the stroke session
if (strokeSessionRef.current) {
  strokeSessionRef.current.points.push({ x: canvasX, y: canvasY });
  strokeSessionRef.current.settings = brushSettings;
  
  // Update bounds as we draw
  const brushRadius = brushSettings.size / 2;
  if (!strokeSessionRef.current.bounds) {
    strokeSessionRef.current.bounds = {
      minX: canvasX - brushRadius,
      minY: canvasY - brushRadius,
      maxX: canvasX + brushRadius,
      maxY: canvasY + brushRadius
    };
  } else {
    // Expand bounds to include new point
    strokeSessionRef.current.bounds.minX = Math.min(...);
    strokeSessionRef.current.bounds.minY = Math.min(...);
    strokeSessionRef.current.bounds.maxX = Math.max(...);
    strokeSessionRef.current.bounds.maxY = Math.max(...);
  }
}
```

### 5. Stroke Finalization on Mouse Up
**File**: `apps/web/src/components/ShirtRefactored.tsx`

**Lines 5541-5603**: On mouse up, finalize the stroke and store its data:

```typescript
// PHASE 1: Finalize stroke session and store stroke data
if (strokeSessionRef.current) {
  const { layerId, points, bounds, settings, tool } = strokeSessionRef.current;
  
  if (bounds) {
    // Calculate final bounds
    const finalBounds = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY
    };
    
    // Store stroke data in layer
    const updatedLayers = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          content: {
            ...l.content,
            strokeData: {
              id: strokeSessionRef.current!.id,
              points: points,
              bounds: finalBounds,
              settings: { ... },
              tool: tool,
              createdAt: new Date(),
              isSelected: false
            }
          }
        };
      }
      return l;
    });
    
    v2Store.setState({ layers: updatedLayers });
  }
  
  // Clear stroke session
  strokeSessionRef.current = null;
}
```

## How It Works

### Stroke Creation Flow

1. **Mouse Down** (`onPointerDown`):
   - User clicks on 3D model with brush tool
   - `paintingActiveRef.current = true`
   - Calls `paintAtEvent(e)`

2. **First `paintAtEvent` Call** (starting new stroke):
   - Checks if `strokeSessionRef.current` is null (no active session)
   - Creates new layer: `createLayer('paint', 'Brush Stroke xxx')`
   - Initializes `strokeSessionRef` with:
     - `id`: Unique stroke ID
     - `layerId`: The created layer's ID
     - `points`: Empty array
     - `bounds`: null
     - `settings`: null
     - `tool`: Current active tool
   - Returns layer to use for painting

3. **Mouse Move** (subsequent `paintAtEvent` calls):
   - Retrieves layer from `strokeSessionRef.current.layerId`
   - Renders brush stamp to layer's canvas
   - **Tracks point**: Adds `{x, y}` to `strokeSessionRef.current.points[]`
   - **Updates bounds**: Expands bounds to include new point
   - Stores brush settings

4. **Mouse Up** (`onPointerUp`):
   - Finalizes stroke data
   - Calculates final bounds (with width and height)
   - Stores `strokeData` in the layer's content:
     - Points array
     - Bounds
     - Settings (size, color, opacity, gradient)
     - Tool type
     - Creation date
     - Selection state (false)
   - Updates layer in V2 store
   - Calls `composeLayers()` to update composed canvas
   - Clears `strokeSessionRef.current`

### Result

Each stroke now:
- ✅ Has its own layer in AdvancedLayerSystemV2
- ✅ Stores complete stroke metadata (points, bounds, settings)
- ✅ Can be identified individually in the layer panel
- ✅ Has bounding box data for future selection
- ✅ Is ready for Phase 2 (selection and manipulation)

## Testing

To verify Phase 1 works:

1. **Draw First Stroke**:
   - Click and drag to draw a stroke
   - Check console: "🎨 PHASE 1: Created new layer for stroke"
   - Check layer panel: Should see one layer with a name like "Brush Stroke xxx"
   - Release mouse
   - Check console: "🎨 PHASE 1: Stroke finalized with data"

2. **Draw Second Stroke**:
   - Click and drag again to draw another stroke
   - Check layer panel: Should now see TWO layers
   - Each stroke has its own layer

3. **Verify Stroke Data**:
   - Check the layer in the UI
   - Each layer should have stroke data stored
   - Thumbnails should show the strokes

## Next Phase: Selection

Phase 1 creates the foundation. Phase 2 will:
- Implement hit testing to select strokes by clicking
- Show border when stroke is selected
- Hide border when deselected
- Add transform handles for manipulation

## Files Modified

1. `apps/web/src/core/AdvancedLayerSystemV2.ts` - Added strokeData to LayerContent
2. `apps/web/src/components/ShirtRefactored.tsx` - Stroke session tracking and finalization


