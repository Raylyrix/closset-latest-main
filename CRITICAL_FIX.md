# Critical Fixes Applied

## Issues Identified

1. **Syntax Error**: Extra indentation in `StrokeSelectionSystem.ts` causing "Unexpected ." error
2. **Layer Creation**: The logic is correct - one stroke = one layer
3. **Cache Issue**: Vite build cache not clearing

## Fixes Applied

### 1. Syntax Error
- File: `apps/web/src/core/StrokeSelectionSystem.ts`
- Fixed indentation in `moveStroke` function (lines 241-418)
- Changed from 8-space to 6-space indentation

### 2. Layer Creation Logic
The logic is ALREADY CORRECT in `ShirtRefactored.tsx`:
- Line 1701: Checks if `currentStrokeSession` exists
- Line 1768-1794: Only creates new layer if session is null
- Line 1799-1808: Reuses existing layer during drag

**The problem**: The console error prevents the app from loading, so you can't see the correct behavior.

### 3. Rendering Issue
- Strokes are drawn to `layer.canvas` 
- Need to ensure `composeLayers()` is called after each stroke
- Check `onPointerUp` function

## Next Steps

1. Clear Vite cache
2. Restart dev server
3. Test stroke creation - should see ONE layer per stroke
4. Verify rendering on model surface

## Expected Behavior

- ✅ One stroke (mouse down → drag → mouse up) = ONE layer
- ✅ Each layer visible in layer panel
- ✅ Strokes render on 3D model surface
- ✅ Selection border appears when clicking on stroke


