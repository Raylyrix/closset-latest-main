# Stroke Selection and Performance Fixes

## Issues Fixed

### 1. ✅ Stroke Layer Creation Fixed
**Problem**: Layer was created but couldn't be found immediately after creation.

**Root Cause**: Zustand state updates are asynchronous. When `createLayer()` returned a `layerId`, the new layer wasn't yet in the `layers` array.

**Fix**: Re-read the layers from the store after calling `createLayer()`:
```typescript
const layerId = createLayer('paint', layerName);
const { layers: updatedLayers } = useAdvancedLayerStoreV2.getState(); // Re-read
const newLayer = updatedLayers.find(l => l.id === layerId);
```

### 2. ✅ Stroke Settings Capture
**Problem**: `strokeData` was missing because settings were `null` in `strokeSessionRef`.

**Fix**: Capture brush settings when creating stroke session:
```typescript
strokeSessionRef.current = {
  id: strokeId,
  layerId: layerId,
  points: [],
  bounds: null,
  settings: {
    size: brushSize,
    color: brushColor,
    opacity: brushOpacity,
    gradient: brushGradientData?.mode === 'gradient' ? { ... } : undefined
  },
  tool: activeTool
};
```

### 3. ✅ Performance Improvements
**Removed** excessive debug logging to improve performance during drawing.

### 4. ❌ Selection Border Issue (Still needs work)
**Problem**: When clicking on a layer, the stroke doesn't show a selection border.

**Status**: The border rendering logic exists in `useEffect` at lines 1655-1695, but it may not be triggering correctly when clicking layers.

## Next Steps for Selection Border

The selection border should work when:
1. User clicks on a stroke's layer in the layer panel
2. System calls `selectStroke(layerId)` 
3. `useEffect` at line 1655 detects `selectedLayerId` change
4. Border is drawn on the composed canvas
5. Texture is updated to show border

**Need to verify**: Is the layer panel calling `selectStroke()` when a layer is clicked?


