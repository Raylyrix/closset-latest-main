# Individual Stroke Layers - Architecture Plan

## Current System
- **Problem**: All brush strokes go to one default paint layer
- **Result**: Cannot select or manipulate individual strokes
- **Limitation**: All strokes are permanent once drawn

## Proposed System
- **Goal**: Each stroke gets its own layer automatically
- **Benefit**: Individual stroke selection and manipulation
- **Flexibility**: Move, resize, delete, transform individual strokes

---

## Architecture Design

### Phase 1: Stroke-to-Layer Creation
**Goal**: Automatically create a new layer for each stroke

#### 1.1 Stroke Lifecycle
```
Mouse Down → Create new layer for this stroke
Mouse Move → Draw to stroke's layer canvas
Mouse Up   → Finalize stroke layer, update thumbnails
```

#### 1.2 Data Structure
```typescript
interface StrokeLayer extends AdvancedLayer {
  type: 'paint';
  strokeData: {
    id: string;              // Stroke UUID
    points: BrushPoint[];     // Stroke path points
    settings: BrushSettings;  // Brush settings
    bounds: {                // Stroke bounding box
      x: number;
      y: number;
      width: number;
      height: number;
    };
    createdAt: Date;
    isSelected: boolean;
  };
  metadata: {
    tool: string;           // 'brush', 'eraser', 'puffPrint', etc.
    strokeIndex: number;    // Order in stroke sequence
  };
}
```

### Phase 2: Selection System
**Goal**: Click-to-select individual strokes for manipulation

#### 2.1 Selection Detection
**How it works**:
1. User clicks on 3D model
2. Convert 3D click to UV coordinates
3. Check all stroke layers (from top to bottom)
4. Detect if click is within any stroke's bounds
5. Select the top-most stroke at click position

**Implementation Strategy**:
```typescript
interface SelectionHitTest {
  performHitTest(
    uv: { u: number; v: number },
    layers: StrokeLayer[]
  ): StrokeLayer | null;
  
  checkPointInStroke(
    point: { u: number; v: number },
    stroke: StrokeLayer
  ): boolean;
  
  getStrokeBounds(stroke: StrokeLayer): Bounds;
}
```

#### 2.2 Visual Selection Feedback
**When stroke is selected**:
- **Show colored border around stroke bounds** ✅ REQUIRED
- Show transform handles (corners/edges for resize)
- Show selection overlay
- Show properties panel for selected stroke

**When stroke is deselected**:
- **Hide border immediately** ✅ REQUIRED
- Hide transform handles
- Hide selection overlay
- Hide properties panel (or clear it)

**Visual Indicators**:
```typescript
interface SelectionVisuals {
  borderColor: string;      // Color of selection border (e.g., "#00ff00" green)
  borderWidth: number;      // Thickness of selection border (e.g., 2px)
  isVisible: boolean;       // CRITICAL: Show/hide border based on selection
  transformHandles: Handle[]; // Corners and edges for manipulation
  overlayAlpha: number;     // Selection overlay transparency
}

// Border Behavior:
// ✅ SELECTED: Show border around stroke bounds
// ✅ DESELECTED: Hide border immediately
```

### Phase 3: Manipulation System
**Goal**: Move, resize, delete, and transform selected strokes

#### 3.1 Transformation Capabilities

**A. Movement**
```
- Click and drag selected stroke
- Update stroke layer position
- Maintain stroke shape and appearance
- Update bounding box
```

**B. Resizing**
```
- Scale stroke proportionally or non-proportionally
- Update all points in stroke
- Maintain brush settings
- Update bounding box
```

**C. Deletion**
```
- Delete key to remove selected stroke
- Remove stroke's layer from V2 store
- Update composition
```

**D. Rotation**
```
- Rotate stroke around its center
- Transform all stroke points
- Maintain brush appearance
```

#### 3.2 Transform Handles
**Location**: Corners and edges of stroke bounding box
```typescript
interface TransformHandles {
  corners: [topLeft, topRight, bottomLeft, bottomRight];
  edges: [top, right, bottom, left];
  center: { x: number; y: number };
}
```

**Handle Types**:
- **Corners**: Scale (maintain aspect ratio)
- **Edges**: Scale in one direction
- **Center**: Move stroke
- **Rotation**: Rotate around center

### Phase 4: Stroke Interaction
**Goal**: Rich interaction with individual strokes

#### 4.1 Stroke Properties Panel
**When stroke is selected**, show:
- Brush type
- Brush size
- Color/Gradient
- Opacity
- Blend mode
- Position (x, y)
- Dimensions (width, height)

**Editable Properties**:
- Change color
- Change opacity
- Change brush size (scale stroke)
- Change blend mode
- Duplicate stroke
- Delete stroke

#### 4.2 Context Menu
**Right-click on stroke**:
- Duplicate
- Delete
- Copy
- Paste
- Lock/Unlock
- Group with other strokes

---

## Implementation Plan

### Step 1: Modify stroke creation (ShirtRefactored.tsx)
**File**: `apps/web/src/components/ShirtRefactored.tsx`

**Changes needed**:
1. **Track stroke start** (line ~1665):
   ```typescript
   // NEW: Create layer for this stroke session
   const strokeId = `stroke_${Date.now()}`;
   const strokeLayer = v2Store.createLayer('paint', `Brush Stroke ${strokeId}`);
   ```

2. **Track stroke state during drag**:
   ```typescript
   // NEW: Store stroke metadata
   const strokeRef = useRef<{
     id: string;
     layerId: string;
     points: BrushPoint[];
     bounds: Bounds;
   } | null>(null);
   ```

3. **Update stroke on mouse up**:
   ```typescript
   // NEW: Finalize stroke
   if (strokeRef.current) {
     v2Store.finalizeStroke({
       layerId: strokeRef.current.layerId,
       bounds: calculateBounds(strokeRef.current.points)
     });
   }
   ```

### Step 2: Implement selection detection
**File**: `apps/web/src/core/StrokeSelectionSystem.ts`

**New file for**:
```typescript
export const useStrokeSelection = create<StrokeSelectionState>()({
  // Selection state
  selectedStrokeId: string | null = null,
  
  // Perform hit test
  performHitTest: (uv: { u: number; v: number }) => {
    const { layers } = useAdvancedLayerStoreV2.getState();
    
    // Get all stroke layers (type === 'paint' with strokeData)
    const strokeLayers = layers.filter(l => l.strokeData);
    
    // Check from top to bottom (reverse order)
    for (const layer of strokeLayers.reverse()) {
      if (isPointInStroke(uv, layer.strokeData.bounds)) {
        return layer;
      }
    }
    
    return null;
  },
  
  // Selection management
  selectStroke: (layerId: string) => {
    // CRITICAL: When stroke is selected, set selectedStrokeId
    set({ selectedStrokeId: layerId });
    
    // Trigger visual update (border will show automatically)
    console.log('✅ Stroke selected:', layerId);
  },
  
  clearSelection: () => {
    // CRITICAL: When deselected, set selectedStrokeId to null
    // Border will hide automatically
    set({ selectedStrokeId: null });
    
    console.log('✅ Stroke deselected - border hidden');
  },
  
  // Get selected stroke
  getSelectedStroke: () => {
    const { selectedStrokeId, layers } = get();
    if (!selectedStrokeId) return null;
    
    return layers.find(l => l.id === selectedStrokeId) || null;
  },
});
```

### Step 3: Add visual indicators
**File**: `apps/web/src/components/StrokeVisuals.tsx`

**New component**:
```typescript
export function StrokeSelectionOverlay() {
  const { selectedStroke } = useStrokeSelection();
  
  // CRITICAL: Only show border when stroke is actually selected
  // Hide border when selectedStroke is null/undefined
  
  return (
    <g>
      {/* Selection border - ONLY visible when selectedStroke exists */}
      {selectedStroke && (
        <rect
          x={selectedStroke.bounds.x}
          y={selectedStroke.bounds.y}
          width={selectedStroke.bounds.width}
          height={selectedStroke.bounds.height}
          fill="none"
          stroke="#00ff00"  // Green border for visibility
          strokeWidth={2}
          strokeDasharray="5,5"  // Dashed border for better visibility
          opacity={0.8}
        />
      )}
      
      {/* Transform handles - ONLY visible when selected */}
      {selectedStroke && <TransformHandles stroke={selectedStroke} />}
    </g>
  );
}

// Border Behavior Implementation:
// 1. When stroke is selected: selectedStroke !== null → border visible
// 2. When stroke is deselected: selectedStroke === null → border hidden
// 3. Real-time updates as selection changes
```

### Step 4: Implement manipulation
**File**: `apps/web/src/core/StrokeManipulationSystem.ts`

**New system**:
```typescript
export const useStrokeManipulation = create<ManipulationState>()({
  // Move stroke
  moveStroke: (layerId: string, offset: { x: number; y: number }) => {
    // Update stroke layer position
    // Redraw stroke at new position
  },
  
  // Resize stroke
  resizeStroke: (layerId: string, scale: { x: number; y: number }) => {
    // Scale all points
    // Update bounding box
    // Redraw stroke at new size
  },
  
  // Delete stroke
  deleteStroke: (layerId: string) => {
    // Remove stroke layer
    // Update composition
  },
});
```

### Step 5: Stroke properties panel
**File**: `apps/web/src/components/StrokePropertiesPanel.tsx`

**New component**:
```typescript
export function StrokePropertiesPanel() {
  const { selectedStroke } = useStrokeSelection();
  
  if (!selectedStroke) return null;
  
  return (
    <div>
      <h3>Stroke Properties</h3>
      <PropertyControl name="Color" value={selectedStroke.settings.color} />
      <PropertyControl name="Size" value={selectedStroke.settings.size} />
      <PropertyControl name="Opacity" value={selectedStroke.settings.opacity} />
      {/* etc */}
    </div>
  );
}
```

---

## Data Flow

### Stroke Creation Flow
```
User starts drawing
    ↓
onPointerDown → Create new layer for this stroke
    ↓
Store stroke metadata (id, layerId, startPoint)
    ↓
onPointerMove → Draw to layer.canvas
    ↓
Store stroke points in array
    ↓
onPointerUp → Finalize stroke
    ↓
Calculate stroke bounds
    ↓
Store strokeData in layer
    ↓
Generate thumbnail
    ↓
Done! Stroke has its own layer
```

### Selection Flow
```
User clicks on model
    ↓
Get UV coordinates from click
    ↓
Perform hit test on all stroke layers
    ↓
Find top-most stroke at click position
    ↓
Select that stroke layer
    ↓
Update selection state (selectedStrokeId = layerId)
    ↓
SHOW BORDER ✅ (StrokeVisuals re-renders with selectedStroke)
    ↓
Show transform handles
    ↓
Show properties panel
    ↓
Ready for manipulation
```

### Deselection Flow
```
User clicks elsewhere (no stroke hit)
    ↓
Clear selection state (selectedStrokeId = null)
    ↓
HIDE BORDER ✅ (StrokeVisuals re-renders with null)
    ↓
Hide transform handles
    ↓
Hide properties panel
    ↓
Ready for new selection
```

### Manipulation Flow
```
Stroke selected
    ↓
User drags transform handle
    ↓
Calculate new bounds/position
    ↓
Transform stroke points
    ↓
Redraw stroke to layer.canvas
    ↓
Update stroke metadata
    ↓
Regenerate thumbnail
    ↓
Recompose layers
    ↓
Update 3D model
```

---

## Technical Challenges

### Challenge 1: Stroke Bounds Calculation
**Problem**: Need to calculate bounding box for complex strokes
**Solution**: Track min/max coordinates during drawing

```typescript
function updateStrokeBounds(
  currentBounds: Bounds,
  newPoint: BrushPoint
): Bounds {
  return {
    minX: Math.min(currentBounds.minX, newPoint.x - settings.size / 2),
    minY: Math.min(currentBounds.minY, newPoint.y - settings.size / 2),
    maxX: Math.max(currentBounds.maxX, newPoint.x + settings.size / 2),
    maxY: Math.max(currentBounds.maxY, newPoint.y + settings.size / 2),
    width: maxX - minX,
    height: maxY - minY
  };
}
```

### Challenge 2: Point-in-Stroke Detection
**Problem**: Detect if click is within a stroke's bounds
**Solution**: Simple bounding box check first, then detailed path check if needed

```typescript
function isPointInStroke(
  point: { u: number; v: number },
  stroke: StrokeLayer
): boolean {
  const bounds = stroke.strokeData.bounds;
  const canvasWidth = composedCanvas.width;
  const canvasHeight = composedCanvas.height;
  
  const x = point.u * canvasWidth;
  const y = point.v * canvasHeight;
  
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY
  );
}
```

### Challenge 3: Stroke Transformation
**Problem**: Transform stroke points when moving/resizing
**Solution**: Apply transformation matrix to all points

```typescript
function transformStroke(
  points: BrushPoint[],
  transform: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
  }
): BrushPoint[] {
  return points.map(point => ({
    ...point,
    x: point.x * transform.scaleX + transform.translateX,
    y: point.y * transform.scaleY + transform.translateY
  }));
}
```

---

## Migration Plan

### Phase 1 (Week 1): Foundation
- ✅ Modify paintAtEvent to create layer per stroke
- ✅ Track stroke metadata
- ✅ Store stroke bounds
- ✅ Test stroke creation

### Phase 2 (Week 2): Selection
- Implement hit testing
- Add visual selection indicators
- Add selection state management
- Test selection system

### Phase 3 (Week 3): Manipulation
- Implement stroke movement
- Implement stroke resizing
- Implement stroke deletion
- Add undo/redo for operations

### Phase 4 (Week 4): Polish
- Add transform handles
- Add properties panel
- Add context menu
- Performance optimization

---

## Benefits of This Architecture

1. **Individual Stroke Control**: Each stroke is independently manageable
2. **Select and Manipulate**: Users can click to select and transform strokes
3. **Better Organization**: Each stroke appears as its own layer in UI
4. **Undo/Redo Support**: Can undo/redo individual stroke operations
5. **Stroke Duplication**: Easy to duplicate strokes
6. **Stroke Grouping**: Can group multiple strokes together
7. **Stroke Reordering**: Change stroke order in layer stack
8. **Stroke Effects**: Apply effects to individual strokes

---

## Files to Create/Modify

### New Files:
1. `apps/web/src/core/StrokeSelectionSystem.ts` - Selection detection
2. `apps/web/src/core/StrokeManipulationSystem.ts` - Transformation system
3. `apps/web/src/components/StrokeVisuals.tsx` - Visual indicators
4. `apps/web/src/components/StrokePropertiesPanel.tsx` - Properties UI

### Modified Files:
1. `apps/web/src/components/ShirtRefactored.tsx` - Stroke creation
2. `apps/web/src/core/AdvancedLayerSystemV2.ts` - Add strokeData to layer
3. `apps/web/src/components/RightPanelCompact.tsx` - Add stroke properties

---

## Testing Plan

1. **Stroke Creation**:
   - Draw stroke → verify layer created
   - Draw second stroke → verify second layer created
   - Check layer panel for both layers

2. **Selection**:
   - Click on stroke → verify selected AND border appears ✅
   - Click elsewhere → verify deselected AND border disappears ✅
   - Click on another stroke → verify selection changes AND border moves to new stroke ✅
   - Visual verification: border should only be visible on selected stroke

3. **Manipulation**:
   - Drag handle → verify stroke moves/resizes
   - Press Delete → verify stroke deleted
   - Right-click → verify context menu

4. **Properties**:
   - Select stroke → verify properties panel shows
   - Change opacity → verify stroke updates
   - Change color → verify stroke updates

