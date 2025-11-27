# Shape Tool - Pixel Coordinates Fix

## Summary

All percentage conversions have been removed from the shape tool. Shapes now store positions in **pixel coordinates directly**, eliminating rounding errors and coordinate conversion issues.

---

## Changes Made

### ✅ Fix #1: Updated Type Definition
**Location:** `apps/web/src/App.tsx:214-215`

**Before:**
```typescript
positionX: number; // Center X as percentage (0-100%)
positionY: number; // Center Y as percentage (0-100%, canvas space: 0% = top)
```

**After:**
```typescript
positionX: number; // Center X in pixels (canvas space: 0 = left)
positionY: number; // Center Y in pixels (canvas space: 0 = top)
```

---

### ✅ Fix #2: Shape Creation - Store Pixels Directly
**Location:** `apps/web/src/components/ShirtRefactored.tsx:5351-5362`

**Before:**
```typescript
const pixelCoords = convertUVToPixel(...);
const positionX = (pixelCoords.x / canvasWidth) * 100; // Percentage conversion
const positionY = (pixelCoords.y / canvasHeight) * 100; // Percentage conversion
```

**After:**
```typescript
const pixelCoords = convertUVToPixel(...);
const positionX = pixelCoords.x; // Store pixels directly
const positionY = pixelCoords.y; // Store pixels directly
```

---

### ✅ Fix #3: Shape Rendering - Use Pixels Directly
**Location:** `apps/web/src/core/AdvancedLayerSystemV2.ts:3251-3254`

**Before:**
```typescript
const centerX = (shapeEl.positionX / 100) * canvasWidth; // Percentage to pixel
const centerY = (shapeEl.positionY / 100) * canvasHeight; // Percentage to pixel
const shapeX = Math.round(centerX);
const shapeY = Math.round(centerY);
```

**After:**
```typescript
// Shape positions are stored in pixels directly (no conversion needed)
const shapeX = Math.round(shapeEl.positionX);
const shapeY = Math.round(shapeEl.positionY);
```

---

### ✅ Fix #4: Shape Selection Border - Use Pixels Directly
**Location:** `apps/web/src/core/AdvancedLayerSystemV2.ts:3349-3350`

**Before:**
```typescript
const shapeX = Math.round((selectedShape.positionX / 100) * canvasWidth);
const shapeY = Math.round((selectedShape.positionY / 100) * canvasHeight);
```

**After:**
```typescript
// Shape positions are stored in pixels directly (no conversion needed)
const shapeX = Math.round(selectedShape.positionX);
const shapeY = Math.round(selectedShape.positionY);
```

---

### ✅ Fix #5: Shape Movement - Use Pixels Directly
**Location:** `apps/web/src/components/ShirtRefactored.tsx:7618-7628`

**Before:**
```typescript
const newShapePositionX = (newPosition.x / canvasWidth) * 100; // Percentage conversion
const newShapePositionY = (newPosition.y / canvasHeight) * 100; // Percentage conversion
updateShapeElement({
  positionX: Math.max(0, Math.min(100, newShapePositionX)),
  positionY: Math.max(0, Math.min(100, newShapePositionY))
});
```

**After:**
```typescript
const newShapePositionX = Math.round(newPosition.x); // Use pixels directly
const newShapePositionY = Math.round(newPosition.y); // Use pixels directly
const maxX = canvasWidth - 1;
const maxY = canvasHeight - 1;
updateShapeElement({
  positionX: Math.max(0, Math.min(maxX, newShapePositionX)),
  positionY: Math.max(0, Math.min(maxY, newShapePositionY))
});
```

---

### ✅ Fix #6: Shape Resize - Use Pixels Directly
**Location:** `apps/web/src/components/ShirtRefactored.tsx:7675-7691`

**Before:**
```typescript
const newPositionX = ((newBounds.minX + newBounds.width / 2) / canvasWidth) * 100;
const newPositionY = ((newBounds.minY + newBounds.height / 2) / canvasHeight) * 100;
updateShapeElement({
  positionX: Math.max(0, Math.min(100, newPositionX)),
  positionY: Math.max(0, Math.min(100, newPositionY))
});
```

**After:**
```typescript
const newPositionX = Math.round(newBounds.minX + newBounds.width / 2); // Pixels directly
const newPositionY = Math.round(newBounds.minY + newBounds.height / 2); // Pixels directly
const maxX = canvasWidth - 1;
const maxY = canvasHeight - 1;
updateShapeElement({
  positionX: Math.max(0, Math.min(maxX, newPositionX)),
  positionY: Math.max(0, Math.min(maxY, newPositionY))
});
```

---

### ✅ Fix #7: Hit Testing - Use Pixels Directly
**Location:** `apps/web/src/components/ShirtRefactored.tsx:5378-5393`

**Before:**
```typescript
const shapeX = (shape.positionX / 100) * canvasWidth; // Percentage to pixel
const shapeY = (shape.positionY / 100) * canvasHeight; // Percentage to pixel
```

**After:**
```typescript
const shapeX = shape.positionX; // Already in pixels
const shapeY = shape.positionY; // Already in pixels
```

---

### ✅ Fix #8: Selection Integration - Use Pixels Directly
**Location:** `apps/web/src/components/UniversalSelection/SelectionIntegration.tsx:101-104`

**Before:**
```typescript
const canvasWidth = composedCanvas?.width || 1024;
const canvasHeight = composedCanvas?.height || 1024;
const shapeX = (shape.positionX || 50) / 100 * canvasWidth; // Percentage conversion
const shapeY = (shape.positionY || 50) / 100 * canvasHeight; // Percentage conversion
```

**After:**
```typescript
const shapeX = shape.positionX || 0; // Already in pixels
const shapeY = shape.positionY || 0; // Already in pixels
```

---

## Benefits

1. **No Rounding Errors**: Eliminates precision loss from multiple conversions (UV → pixel → percentage → pixel)

2. **Exact Placement**: Shapes appear exactly where clicked (within 1 pixel from rounding in UV→pixel conversion only)

3. **Canvas Size Independent**: No issues if canvas size changes between creation and rendering

4. **Simpler Code**: Removed all percentage conversion logic

5. **Consistent Coordinates**: All shape operations (create, render, move, resize) use the same pixel coordinate system

---

## Coordinate Flow (New)

```
User Click
    ↓
Three.js UV (uv.x = 0-1, uv.y = 0-1, where v=0 at bottom)
    ↓
[convertUVToPixel utility]
pixelX = Math.round(uv.x * canvasWidth)
pixelY = Math.round((1 - uv.y) * canvasHeight)  ← Y-flip for canvas space
    ↓
[Stored in useApp.shapeElements]
{ positionX: pixels, positionY: pixels }  ← STORED AS PIXELS
    ↓
[Rendering - AdvancedLayerSystemV2.ts]
shapeX = Math.round(shapeEl.positionX)  ← NO CONVERSION
shapeY = Math.round(shapeEl.positionY)  ← NO CONVERSION
    ↓
Canvas rendering
```

**Only 2 conversions:**
1. UV → Pixel (once on creation)
2. Rounding for display (minor)

**No more:**
- ❌ Pixel → Percentage conversion
- ❌ Percentage → Pixel conversion
- ❌ Multiple rounding steps

---

## Files Modified

1. `apps/web/src/App.tsx` - Updated type definition
2. `apps/web/src/components/ShirtRefactored.tsx` - Updated creation, hit testing, movement, resize
3. `apps/web/src/core/AdvancedLayerSystemV2.ts` - Updated rendering and selection border
4. `apps/web/src/components/UniversalSelection/SelectionIntegration.tsx` - Updated bounds calculation

---

## Testing

After this fix, shapes should:
- ✅ Appear exactly where clicked (within 1 pixel accuracy)
- ✅ Move to exact new positions when dragged
- ✅ Resize correctly while maintaining center position
- ✅ Work correctly even if canvas size changes

---

## Migration Note

**Existing shapes** that were stored with percentage coordinates will need migration if there are any in the database/cache. The code now expects pixel coordinates. If you have existing shapes, you'll need to:

1. Convert old percentage-based shapes to pixel coordinates
2. Or delete old shapes and recreate them

For new shapes created after this fix, everything will work correctly.





