# Investigation Report: Individual Stroke Layers System

## Overview
Investigation of the individual stroke layers system to identify issues and broken logic.

## Issues Found

### 🔴 CRITICAL ISSUE #1: Canvas Redraw Not Implemented
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 231-237

**Problem**: When moving a stroke, the code clears the layer canvas but doesn't redraw the stroke with the new points.

```typescript
// Update layer canvas
if (layer.content.canvas) {
  const ctx = layer.content.canvas.getContext('2d');
  if (ctx) {
    // Clear and redraw
    ctx.clearRect(0, 0, layer.content.canvas.width, layer.content.canvas.height);
    // TODO: Redraw stroke based on new points (requires brush engine)
  }
}
```

**Impact**: Moving a stroke will clear it but not redraw it - the stroke disappears.

**Fix Required**: Implement proper canvas redraw using brush engine to render the stroke with updated points.

---

### 🔴 CRITICAL ISSUE #2: Bounds Recalculation Missing
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 216-222

**Problem**: When moving a stroke, bounds are updated by simple addition (deltaX, deltaY). This is correct for movement. However, the width and height are NOT recalculated.

```typescript
const newBounds = {
  ...bounds,
  minX: bounds.minX + deltaX,
  minY: bounds.minY + deltaY,
  maxX: bounds.maxX + deltaX,
  maxY: bounds.maxY + deltaY
};
// Missing: width and height recalculation
```

**Impact**: After moving, bounds may be incorrect, affecting hit testing and selection.

**Fix Required**: Recalculate width and height after updating bounds.

---

### 🟡 ISSUE #3: Transform DragStartPos Not Reset
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 180-202

**Problem**: During `updateTransform`, the `dragStartPos` is never updated to the current position. This causes accumulated delta instead of incremental movement.

**Impact**: On each move event, the entire accumulated distance is applied, causing "jumping" behavior.

**Fix Required**: Update `dragStartPos` after each transform update.

---

### 🟡 ISSUE #4: No Undo/Redo for Transformations
**Location**: No implementation found

**Problem**: Transformations (move, resize, rotate, delete) are not saved to history, so undo/redo won't work.

**Impact**: Users cannot undo moving or deleting a stroke.

**Fix Required**: Add `saveHistorySnapshot` calls after transformations.

---

### 🟡 ISSUE #5: Transform Not Ending on Mouse Up in All Cases
**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 5770-5783

**Problem**: Transform end is only called for certain conditions. If user presses ESC or some other event, transform may remain active.

**Impact**: Transform state might persist incorrectly.

**Fix Required**: Add ESC key handler to end transforms.

---

### 🟡 ISSUE #6: Multiple Layers Using Same Canvas Reference
**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1676-1741

**Problem**: When creating a new layer for each stroke, we might be getting the same canvas reference in some cases.

**Impact**: Strokes might overwrite each other.

**Fix Required**: Ensure each layer gets a unique canvas instance.

---

### 🟢 WARNING #1: Resize and Rotate Not Implemented
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 258-267

**Problem**: Resize and rotate functions are placeholders with TODO comments.

**Impact**: These features don't work yet.

**Status**: Known limitation, documented.

---

### 🟢 WARNING #2: No Keyboard Shortcut for Delete
**Location**: Implementation missing

**Problem**: Delete key shortcut handler is not implemented.

**Impact**: Users cannot press Delete to delete a stroke (unless implemented elsewhere).

**Fix Required**: Add keyboard event listener for Delete key.

---

### 🟢 WARNING #3: Stroke Selection Border Renders Before Transform
**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1620-1658

**Problem**: The selection border is rendered on every change, even during transforms when the stroke is being moved.

**Impact**: Visual glitch - border might flicker or lag during drag.

**Fix Required**: Only render border when not in transform mode.

---

## Summary of Issues

### Critical (Must Fix)
1. ❌ Canvas redraw not implemented - moving stroke will delete it
2. ❌ Bounds width/height not recalculated

### Important (Should Fix)
3. ⚠️ Transform dragStartPos never updates
4. ⚠️ No undo/redo for transformations
5. ⚠️ Transform might not end properly

### Nice to Have
6. ⚠️ Keyboard shortcut for Delete
7. ⚠️ Selection border during transform

### Known Limitations
8. ℹ️ Resize not implemented (documented)
9. ℹ️ Rotate not implemented (documented)

## Recommended Priority

1. **Fix Issue #1** (Canvas redraw) - Moving stroke will delete it
2. **Fix Issue #2** (Bounds recalculation) - Hit testing might fail
3. **Fix Issue #3** (Transform position update) - Movement will be jumpy
4. **Fix Issue #4** (Undo/redo) - Users can't undo
5. **Fix Issue #5** (Transform end) - State might get stuck

## Code Locations

- StrokeSelectionSystem: `apps/web/src/core/StrokeSelectionSystem.ts`
- Integration: `apps/web/src/components/ShirtRefactored.tsx`
- Visual components: `apps/web/src/components/StrokeVisuals.tsx`


