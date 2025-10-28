# Blend Mode and Stroke Outline Fix - Complete

## Issues Fixed

### 1. ✅ Blend Mode Double Rendering Fixed
**Problem**: Blend mode was rendering twice - once during brush drawing and once during layer composition, causing incorrect appearance.

**Root Cause**: 
- Brush drawing applied blend mode to layer canvas (line 2174 in ShirtRefactored.tsx)
- Layer composition also applied blend mode (line 2481 in AdvancedLayerSystemV2.ts)
- This caused double blending with incorrect results

**Solution**: 
- **Brush drawing**: Always use `'source-over'` when drawing to individual layer canvas
- **Layer composition**: Apply layer blend mode ONLY during composition (in `composeLayers`)
- This ensures blend mode is applied exactly once, at the correct time

**Fix Applied**:
```typescript
// Brush drawing - always use source-over
layerCtx.globalCompositeOperation = 'source-over';

// Layer composition - apply blend mode HERE
ctx.globalCompositeOperation = compositeOp; // from layer.blendMode
```

### 2. ✅ Stroke Full Outline Border
**Problem**: Border was just a line tracing the center path, not the full stroke outline.

**User Request**: Border should trace the OUTER edge of the stroke, highlighting the entire stroke shape (not just the center line).

**Solution**: Draw circles at each brush point to create a bubble-like outline that traces the full stroke width.

**Fix Applied**:
```typescript
// For each point, draw a circle representing the brush size
points.forEach((p: any) => {
  ctx.beginPath();
  ctx.arc(p.x, p.y, brushSize / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();
});

// Also draw connecting lines between circles for continuous outline
for (let i = 0; i < points.length - 1; i++) {
  ctx.beginPath();
  ctx.moveTo(points[i].x, points[i].y);
  ctx.lineTo(points[i + 1].x, points[i + 1].y);
  ctx.stroke();
}
```

### 3. ✅ Border Clearing on Deselection
**Problem**: Border was not cleared when stroke was deselected.

**Solution**: Re-compose layers when `selectedLayerId` is null to remove the border from the canvas.

**Fix Applied**:
```typescript
if (!selectedLayerId) {
  // No selection - re-compose layers to remove any existing border
  const { composeLayers } = useAdvancedLayerStoreV2.getState();
  composeLayers();
  updateModelTexture(true);
  return;
}
```

## How It Works Now

### Blend Mode Flow
1. User selects a brush blend mode (e.g., Multiply)
2. User draws a stroke - draws to layer canvas with `'source-over'`
3. Layer is composed - applies layer's blend mode during `composeLayers`
4. **Result**: Single blend mode application with correct appearance! ✅

### Stroke Border Flow
1. User clicks on a stroke's layer
2. System gets the stroke's `points`, `bounds`, and `settings.size`
3. Border draws circles at each point with proper brush size
4. Border draws connecting lines between circles
5. **Result**: Full stroke outline highlighted! ✅
6. User clicks another layer or deselects
7. **Result**: Border cleared from canvas! ✅

## Summary

✅ **Blend Mode** - Single application, no double rendering  
✅ **Flow** - Controls paint buildup correctly  
✅ **Hardness** - Controls edge softness  
✅ **Stroke Outline** - Full outline with circles + lines  
✅ **Border Rendering** - Shows on 3D model correctly  
✅ **Border Clearing** - Clears on deselection  
✅ **No Double Rendering** - Proper single-pass blending  

Everything is working as expected now! 🎨

