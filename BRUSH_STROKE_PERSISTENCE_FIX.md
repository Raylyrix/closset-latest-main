# Brush Stroke Persistence Fix

## Problem

When drawing a stroke using the brush tool (from mouse down to mouse up), the stroke would render visually during the drawing process but **would not be added to AdvancedLayerSystemV2**. This meant strokes were rendered to `layer.canvas` during mouse move events but were not persisted to the composed canvas.

## Root Cause

The issue was in `onPointerUp` callback in `ShirtRefactored.tsx`. When a continuous drawing tool (brush, eraser, puffPrint, embroidery, fill) was used, the function was returning early **before composing the layers**, which meant:

1. ✅ Strokes were rendered to `layer.canvas` during mouse move (`onPointerMove` → `paintAtEvent`)
2. ✅ Strokes appeared visually during drawing
3. ❌ Strokes were NOT transferred to `composedCanvas` when mouse was released
4. ❌ Strokes were NOT persisted to AdvancedLayerSystemV2

## The Fix

### File: `apps/web/src/components/ShirtRefactored.tsx`
### Location: Lines 5472-5505

**Before:**
```typescript
if (['brush', 'eraser', 'puffPrint', 'embroidery', 'fill'].includes(activeTool)) {
  console.log('🎨 Continuous drawing tool - keeping controls disabled for:', activeTool);
  return; // ❌ RETURNED EARLY - NO LAYER COMPOSITION!
}
```

**After:**
```typescript
if (['brush', 'eraser', 'puffPrint', 'embroidery', 'fill'].includes(activeTool)) {
  console.log('🎨 Continuous drawing tool - composing layers for:', activeTool);
  
  // CRITICAL FIX: Call composeLayers to transfer layer content to composedCanvas
  console.log('🎨 Composing V2 layers to transfer drawings to composedCanvas');
  const v2Store = useAdvancedLayerStoreV2.getState();
  v2Store.composeLayers();
  
  console.log('🎨 Composing App layers');
  const { composeLayers } = useApp.getState();
  composeLayers();
  
  // Final texture update when painting ends
  updateModelTexture(false, false);
  
  // Update displacement maps for puff and embroidery
  if (activeTool === 'puffPrint') {
    console.log('🎨 Updating displacement maps for puff print');
    if ((window as any).updateModelWithPuffDisplacement) {
      (window as any).updateModelWithPuffDisplacement();
    }
  }
  
  if (activeTool === 'embroidery') {
    console.log('🎨 Updating displacement maps for embroidery');
    if ((window as any).updateModelWithEmbroideryDisplacement) {
      (window as any).updateModelWithEmbroideryDisplacement();
    }
  }
  
  console.log('🎨 Continuous drawing tool - keeping controls disabled for:', activeTool);
  return; // ✅ Return AFTER composing layers
}
```

## What Changed

1. **V2 Layer Composition**: Added call to `useAdvancedLayerStoreV2.getState().composeLayers()` to compose all V2 layers to the composed canvas
2. **App Layer Composition**: Added call to `useApp.getState().composeLayers()` to compose app layers
3. **Texture Update**: Ensured final texture update when painting ends
4. **Displacement Map Updates**: Added proper displacement map updates for puff print and embroidery tools

## How It Works Now

1. **Mouse Down** (`onPointerDown`):
   - Sets `paintingActiveRef.current = true`
   - Calls `paintAtEvent(e)` for initial point
   
2. **Mouse Move** (`onPointerMove`):
   - Calls `paintAtEvent(e)` repeatedly
   - Renders brush stamps to `layer.canvas`
   - Updates model texture in real-time (throttled for performance)
   
3. **Mouse Up** (`onPointerUp`): ← **FIXED HERE**
   - Sets `paintingActiveRef.current = false`
   - ✅ Calls `v2Store.composeLayers()` to compose V2 layers
   - ✅ Calls `composeLayers()` to compose app layers
   - ✅ Updates model texture
   - ✅ Updates displacement maps if needed
   - Then returns

## Flow Diagram

```
Mouse Down → paintAtEvent() → Render to layer.canvas
                ↓
           Mouse Move
                ↓
         paintAtEvent() × N → Render multiple stamps to layer.canvas
                ↓
           Mouse Up ← FIXED
                ↓
    ✅ v2Store.composeLayers()  ← Composes all V2 layers to composedCanvas
                ↓
    ✅ composeLayers()          ← Composes all layers to composedCanvas
                ↓
    ✅ updateModelTexture()     ← Updates 3D model texture
                ↓
    ✅ updateModelWithPuffDisplacement() (if puff/embroidery)
                ↓
         RETURN ← Strokes are now persisted!
```

## Testing

To verify the fix works:

1. Select brush tool
2. Draw a stroke (mouse down → mouse move → mouse up)
3. ✅ Stroke should appear on the 3D model
4. ✅ Stroke should persist after releasing mouse
5. ✅ Stroke should remain visible when switching layers and switching back
6. ✅ Undo/redo should work with strokes

## Related Files

- `apps/web/src/components/ShirtRefactored.tsx` - Main fix location
- `apps/web/src/core/AdvancedLayerSystemV2.ts` - Layer composition logic
- `apps/web/src/App.tsx` - App-level layer composition

## Summary

The fix ensures that when a continuous drawing tool finishes (mouse up), both V2 layer composition and app layer composition are called **before returning**. This transfers the rendered strokes from `layer.canvas` to `composedCanvas`, making them visible on the 3D model and persisted in the AdvancedLayerSystemV2.


