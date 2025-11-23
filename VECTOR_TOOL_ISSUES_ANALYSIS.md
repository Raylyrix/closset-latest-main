# Vector Tool Issues - Line-by-Line Analysis

## Date
2025-01-27

## Issues Found

### 🔴 **ISSUE 1: Curve Tool Not Working - No Drag Support for Bezier Handles**

**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 2146-2197

**Problem**:
- Curve mode only sets handle positions on click
- Once a handle is created, it CANNOT be dragged
- No drag state tracking for handles (only `isDraggingAnchorRef` exists for anchors)
- `addCurveHandle` is called once on click, but handles can't be repositioned

**Root Cause**:
```typescript
// Line 2159-2162: Sets handle on click, but no drag tracking
if (anchor.outHandle) {
  const handleUV = { u: anchor.outHandle.u, v: anchor.outHandle.v };
  if (distanceInUV(clickUV, handleUV) < VECTOR_ANCHOR_DETECTION_THRESHOLD) {
    useApp.getState().addCurveHandle(selectedAnchor.pathId, selectedAnchor.anchorIndex, 'out', uv.x, uv.y);
    return; // ❌ No drag state set, can't drag the handle
  }
}
```

**Missing Code**:
- No `isDraggingHandleRef` for tracking handle drag state
- No drag start position tracking for handles
- No handle dragging logic in `onPointerMove` (only anchor dragging exists at line 6276)

**Fix Required**:
1. Add drag state refs for handles: `isDraggingHandleRef`, `draggingHandleTypeRef`, `handleDragStartRef`
2. Set drag state when clicking on handle in curve mode
3. Add handle dragging logic in `onPointerMove` callback
4. Add `moveCurveHandle` function in `App.tsx` (similar to `moveAnchor`)

---

### 🔴 **ISSUE 2: finishVectorPath Clearing activePathId**

**Location**: `apps/web/src/App.tsx` line 1512

**Problem**:
- `finishVectorPath` sets `activePathId: null` which makes the path "inactive"
- The path is NOT removed from `vectorPaths`, but losing `activePathId` can cause issues
- User can't continue editing the path after it's "finished"

**Root Cause**:
```typescript
// Line 1512: Clears activePathId, but path remains in vectorPaths
set({ activePathId: null, selectedAnchor: null });
```

**Expected Behavior**:
- Path should remain editable after finishing
- `activePathId` should stay set to allow continued editing
- OR path should be explicitly marked as "completed" but still editable

**Fix Required**:
1. Keep `activePathId` set to the finished path (for continued editing)
2. Add `completed: true` flag to path instead of clearing activePathId
3. Or don't call `finishVectorPath` automatically - let user decide when to finish

---

### 🔴 **ISSUE 3: cancelVectorPath Actually Deletes Path**

**Location**: `apps/web/src/App.tsx` lines 1523-1527

**Problem**:
- `cancelVectorPath` removes the path from `vectorPaths` array
- This is PERMANENT deletion - no way to recover
- Should probably just clear `activePathId` instead

**Root Cause**:
```typescript
// Line 1526: Actually removes path from array - permanent deletion
set(state => ({ 
  vectorPaths: state.vectorPaths.filter(p => p.id !== activePathId), 
  activePathId: null, 
  selectedAnchor: null 
}));
```

**Expected Behavior**:
- Cancel should just stop editing, not delete
- Path should remain in vectorPaths for undo/redo or re-editing

**Fix Required**:
1. Change `cancelVectorPath` to only clear `activePathId`, not remove path
2. Or add a "delete path" function separately for explicit deletion

---

### 🔴 **ISSUE 4: Apply Button Clears All Vector Paths**

**Location**: `apps/web/src/components/MainLayout.tsx` lines 1557-1562

**Problem**:
- After applying tool to paths, ALL vector paths are cleared
- User loses all paths after applying - can't apply another tool
- This is by design but may not be desired behavior

**Root Cause**:
```typescript
// Line 1558: Clears all paths after applying
useApp.setState({ 
  vectorPaths: [],        // ❌ All paths cleared - can't apply another tool
  activePathId: null,
  selectedAnchor: null
});
```

**Expected Behavior**:
- Paths should remain after applying (for applying another tool)
- OR have option to keep/clear paths
- OR clear only after explicit "Clear" action

**Fix Required**:
1. Add option to keep paths after applying
2. Only clear paths on explicit "Clear" button
3. Or preserve paths until user explicitly clears

---

### 🟡 **ISSUE 5: No Visual Feedback for Dragging Handles**

**Location**: `apps/web/src/components/ShirtRefactored.tsx` - Vector rendering useEffect

**Problem**:
- Bezier handles are rendered but don't show drag state
- No visual indication that handle is being dragged
- Hard to know which handle is being edited

**Fix Required**:
1. Add visual highlight for active handle
2. Show drag state visually
3. Improve handle rendering in vector rendering useEffect

---

### 🟡 **ISSUE 6: Curve Mode Requires Anchor Selection First**

**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 2182-2196

**Problem**:
- Curve mode only works if anchor is already selected
- If no anchor selected, it tries to select one
- User must select anchor first, then switch to curve mode
- Should work more seamlessly

**Root Cause**:
```typescript
// Line 2148: Requires selectedAnchor to edit handles
if (selectedAnchor) {
  // Edit handles
} else {
  // Try to select anchor first
  // ❌ User might not understand this flow
}
```

**Fix Required**:
1. Auto-select nearest anchor when clicking in curve mode
2. Better UI feedback about needing anchor selection
3. Or allow creating handles even without pre-selection

---

### 🟡 **ISSUE 7: No Undo/Redo for Handle Operations**

**Location**: `apps/web/src/App.tsx` - `addCurveHandle` function

**Problem**:
- Handle operations (`addCurveHandle`) don't save to history
- Can't undo handle edits
- Can't undo anchor conversions, deletions, etc.

**Fix Required**:
1. Add history saves for handle operations
2. Add undo/redo support for all vector operations
3. Include vector operations in commit/history system

---

## Summary of Critical Issues

### Must Fix:
1. ✅ **Curve tool drag support** - Handles can't be dragged
2. ✅ **Path clearing issues** - Paths cleared unexpectedly
3. ✅ **finishVectorPath behavior** - Should preserve path for editing

### Should Fix:
4. ⚠️ **Visual feedback** - Better handle rendering and drag state
5. ⚠️ **UX improvements** - Smoother curve mode workflow
6. ⚠️ **Undo/redo** - Support for all vector operations

---

## Implementation Plan

### Phase 1: Fix Curve Tool (Critical)
1. Add handle drag state tracking
2. Implement handle dragging in `onPointerMove`
3. Add `moveCurveHandle` function in `App.tsx`
4. Update curve mode click handler to set drag state

### Phase 2: Fix Path Clearing (Critical)
1. Fix `finishVectorPath` to preserve activePathId
2. Fix `cancelVectorPath` to not delete path
3. Add option to keep paths after Apply button
4. Test all path clearing scenarios

### Phase 3: Improvements (Important)
1. Add visual feedback for handle dragging
2. Improve curve mode UX
3. Add undo/redo for vector operations
4. Better error handling and validation

---

## Files to Modify

1. **apps/web/src/components/ShirtRefactored.tsx**
   - Add handle drag state refs
   - Add handle dragging logic
   - Fix curve mode click handler

2. **apps/web/src/App.tsx**
   - Add `moveCurveHandle` function
   - Fix `finishVectorPath` behavior
   - Fix `cancelVectorPath` behavior
   - Add history support for vector operations

3. **apps/web/src/components/MainLayout.tsx**
   - Add option to keep paths after Apply
   - Better path management

4. **apps/web/src/components/ShirtRefactored.tsx** (vector rendering)
   - Improve handle rendering
   - Add drag state visuals

---

## Testing Checklist

- [ ] Curve tool: Can drag bezier handles
- [ ] Curve tool: Can create new handles
- [ ] Curve tool: Handles stay editable
- [ ] Path operations: finishVectorPath preserves path
- [ ] Path operations: cancelVectorPath doesn't delete
- [ ] Apply button: Option to keep/clear paths
- [ ] Visual feedback: Handles show drag state
- [ ] Undo/redo: All vector operations reversible

