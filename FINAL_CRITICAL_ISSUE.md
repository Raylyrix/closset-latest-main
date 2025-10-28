# Final Critical Issue Found

## 🔴 CRITICAL BUG: Canvas Reference Issue

**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 243

### Problem

When moving a stroke, the code does:
```typescript
const ctx = layer.content.canvas.getContext('2d');
```

But `layer` is fetched from `useAdvancedLayerStoreV2.getState().layers` at line 209.

However, during PAINTING (ShirtRefactored.tsx lines 1765-1804), the layer is fetched FRESH each time from the store.

The problem: The `layer` variable might be STALE when we try to move it later. The layer reference obtained during moveStroke might not match the actual current state of the layer in the V2 store.

### Critical Scenario

1. User draws stroke → layer created with ID "layer_123"
2. Paint adds to `layer.content.canvas` directly (line 2079: `layer.canvas.getContext('2d')`)
3. Paint modifies the V2 store's layer canvas
4. User moves stroke → `moveStroke` fetches layer again (line 209)
5. But the canvas reference might be STALE - it's the old canvas from when layer was created, not the updated one

### Impact

- Moving might redraw to the wrong canvas
- Canvas changes during painting might not be seen during move
- Redraw might overwrite or conflict with existing content

### Fix Required

Need to refetch layer from V2 store INSIDE moveStroke to ensure we have the latest reference, or ensure canvas reference is always synced.

---

## Additional Issues Found

### Issue #1: Gradient Settings Incomplete
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 261

Only stores basic gradient data (from settings.gradient), but the full gradient structure needs: type, angle, stops, etc. This might not preserve gradients correctly.

### Issue #2: No Validation of Moved Points
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 234-237

No check if new points are outside canvas bounds. Moved strokes could go off-canvas and become invisible but still take up bounds space.

### Issue #3: Transform State Not Cleared on Delete
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 323-344

If a stroke is deleted while being moved (ESC + Delete), the transform state might not be cleared properly.

### Issue #4: Brush Engine May Be Undefined
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 249

No check if `(window as any).__brushEngine` is defined before use. Will crash if brush engine not initialized.

### Issue #5: Multiple ComposeLayers Calls
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 375, 376

Called `composeLayers()` twice - once in V2 store, once in App store. This might cause double composition or conflicts.


