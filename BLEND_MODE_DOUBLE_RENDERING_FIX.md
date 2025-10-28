# Blend Mode Double Rendering Fix

## Issue Identified

The user reported that when using blend modes, they see:
1. Normal paint on the bottom
2. Blend mode applied on top

This created a **double rendering** effect.

## Root Cause

Blend mode was being applied **twice**:

1. **During Brush Drawing** (line 2147-2149):
   ```typescript
   layerCtx.globalCompositeOperation = brushSettings.blendMode;
   ```
   - Brush drew to `layer.content.canvas` with blend mode applied

2. **During Layer Composition** (line 2481):
   ```typescript
   ctx.globalCompositeOperation = layer.blendMode;
   ctx.drawImage(layer.content.canvas, 0, 0);
   ```
   - Layer canvas was drawn AGAIN with blend mode applied

This resulted in **blend mode being applied twice**, creating a layered effect where you see:
- Normal paint (from the blend mode being applied during drawing)
- Blend mode effect (from the blend mode being applied again during composition)

## The Fix

**During brush drawing**, we should **NOT** apply the brush blend mode to the layer canvas.

```typescript
// BEFORE (Broken - Double blend mode):
layerCtx.globalCompositeOperation = brushSettings.blendMode || 'source-over';

// AFTER (Fixed - Single blend mode):
layerCtx.globalCompositeOperation = 'source-over';
```

**Layer composition** applies the blend mode correctly (line 2481) - this is where it should happen.

## How It Should Work

### Correct Behavior:

1. **Brush Drawing** (`ShirtRefactored.tsx` line 2149):
   - Draw to `layer.content.canvas` with `source-over` (no blend mode)
   - Store raw brush strokes in the layer canvas

2. **Layer Composition** (`AdvancedLayerSystemV2.ts` line 2481):
   - Apply layer blend mode
   - Draw `layer.content.canvas` to composed canvas
   - Blend mode is applied ONCE during composition

### Result:
✅ Normal paint on layer canvas  
✅ Blend mode applied during composition  
✅ No double rendering  
✅ Clean, correct result  

## Summary

✅ **Brush Drawing** - Uses `source-over` (no blend mode)  
✅ **Layer Composition** - Applies blend mode ONCE  
✅ **No Double Rendering** - Each layer blended once  
✅ **Correct Behavior** - Just like Photoshop  

Blend modes now work correctly without double rendering!


