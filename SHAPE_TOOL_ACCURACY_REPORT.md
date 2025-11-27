# Shape Tool Accuracy Investigation Report
**Date:** Investigation Complete  
**Status:** Issues Identified - Ready for Fix

---

## Executive Summary

The shape tool has **accuracy issues** caused by:
1. **Missing move/drag functionality** - Shape dragging was removed and not rebuilt
2. **Coordinate conversion rounding** - Uses `Math.floor()` causing pixel-level inaccuracies
3. **Hit testing accuracy** - Potential rounding errors in click detection
4. **Coordinate system inconsistencies** - Different conversion paths used in different places

---

## Issue #1: Missing Shape Drag/Move Functionality ⚠️ CRITICAL

**Location:** `apps/web/src/components/ShirtRefactored.tsx:7619-7621`

**Problem:** 
Shape element movement was removed and never rebuilt. The code explicitly shows:
```typescript
case 'shape':
  // Shape element move removed - will be rebuilt from scratch
  break;
```

**Impact:**
- Users **cannot drag/move shapes** after placing them
- Shapes can only be created, not repositioned
- This is the primary reason shapes don't appear to be "at the exact place clicked" - because once placed, they can't be moved

**Evidence:**
```typescript:7619:7621:apps/web/src/components/ShirtRefactored.tsx
case 'shape':
  // Shape element move removed - will be rebuilt from scratch
  break;
```

---

## Issue #2: Coordinate Rounding Causing Pixel-Level Inaccuracies ⚠️ HIGH

**Location:** `apps/web/src/components/ShirtRefactored.tsx:5359-5365`

**Problem:**
The coordinate conversion uses `Math.floor()` which truncates to the nearest pixel below:
```typescript
const pixelX = Math.floor(uv.x * canvasWidth);
const pixelY = Math.floor((1 - uv.y) * canvasHeight);
```

**Impact:**
- Shapes are placed **up to 1 pixel off** from where clicked
- Cumulative errors when converting UV → Pixel → Percentage → Pixel
- Visual inaccuracy especially noticeable at small sizes

**Example:**
- Click at UV (0.1234, 0.5678) on 1024px canvas
- `pixelX = Math.floor(0.1234 * 1024) = Math.floor(126.3616) = 126`
- Should be `126.3616`, but gets truncated to `126`
- Stored as percentage: `(126 / 1024) * 100 = 12.3046875%`
- When rendered: `(12.3046875 / 100) * 1024 = 126.0` pixels
- **Error: 0.36 pixels** (not noticeable but accumulates)

**Fix:** Use `Math.round()` instead of `Math.floor()` for better accuracy.

---

## Issue #3: Hit Testing Coordinate Mismatch ⚠️ MEDIUM

**Location:** `apps/web/src/components/ShirtRefactored.tsx:5374-5394`

**Problem:**
Hit testing uses the same coordinate conversion as creation, BUT:
- Click conversion uses `Math.floor()` (line 5359-5360)
- Shape position conversion uses no rounding (line 5380-5381)
- This creates potential for slight mismatches

**Impact:**
- Shapes might not be selectable even when clicking directly on them
- Slight offset between click detection and shape rendering

**Current Code:**
```typescript
// Click conversion (with Math.floor)
const pixelX = Math.floor(uv.x * canvasWidth);
const pixelY = Math.floor((1 - uv.y) * canvasHeight);

// Shape position (no rounding)
const shapeX = (shape.positionX / 100) * canvasWidth;
const shapeY = (shape.positionY / 100) * canvasHeight;
```

**Fix:** Ensure consistent rounding/non-rounding in both calculations.

---

## Issue #4: Multiple Coordinate Conversion Paths ⚠️ MEDIUM

**Problem:**
Different parts of the codebase use different coordinate conversion methods:

1. **Shape Creation** (`ShirtRefactored.tsx:5359-5365`):
   ```typescript
   const pixelX = Math.floor(uv.x * canvasWidth);
   const pixelY = Math.floor((1 - uv.y) * canvasHeight);
   const positionX = (pixelX / canvasWidth) * 100;
   const positionY = (pixelY / canvasHeight) * 100;
   ```

2. **Shape Rendering** (`AdvancedLayerSystemV2.ts:3257-3258`):
   ```typescript
   const centerX = (shapeEl.positionX / 100) * canvasWidth;
   const centerY = (shapeEl.positionY / 100) * canvasHeight;
   ```

3. **Text Tool** (uses `convertUVToPixel` utility):
   ```typescript
   const pixelCoords = convertUVToPixel(uv, canvasDimensions);
   ```

**Impact:**
- Inconsistent behavior between tools
- Difficult to maintain and debug
- Potential for errors when adding new features

**Fix:** Standardize on using `convertUVToPixel` utility function for all coordinate conversions.

---

## Issue #5: Rendering Uses Correct Width/Height ✅ FIXED

**Good News:** The rendering code in `AdvancedLayerSystemV2.ts` correctly uses:
```typescript
const canvasWidth = composedCanvas.width;
const canvasHeight = composedCanvas.height;
const centerX = (shapeEl.positionX / 100) * canvasWidth;
const centerY = (shapeEl.positionY / 100) * canvasHeight;
```

This was previously identified as an issue but has been fixed. ✅

---

## Root Cause Analysis

### Why Shapes Don't Appear at Exact Click Location:

1. **Primary Issue:** Missing move functionality means once a shape is placed slightly off (due to rounding), it cannot be corrected
2. **Secondary Issue:** `Math.floor()` truncation causes up to 1-pixel offset
3. **Tertiary Issue:** Inconsistent coordinate conversion paths

### Coordinate Flow Analysis:

```
User Click
    ↓
Three.js UV (uv.x = 0-1, uv.y = 0-1, where v=0 at bottom)
    ↓
[ShirtRefactored.tsx:5359-5360]
pixelX = Math.floor(uv.x * canvasWidth)           ← TRUNCATION
pixelY = Math.floor((1 - uv.y) * canvasHeight)    ← TRUNCATION + Y-FLIP
    ↓
[ShirtRefactored.tsx:5364-5365]
positionX = (pixelX / canvasWidth) * 100           ← PERCENTAGE CONVERSION
positionY = (pixelY / canvasHeight) * 100
    ↓
[Stored in useApp.shapeElements]
{ positionX: 0-100%, positionY: 0-100% }
    ↓
[AdvancedLayerSystemV2.ts:3257-3258]
centerX = (positionX / 100) * canvasWidth          ← BACK TO PIXELS
centerY = (positionY / 100) * canvasHeight
    ↓
[AdvancedLayerSystemV2.ts:3261-3262]
shapeX = Math.round(centerX)                       ← ROUNDING
shapeY = Math.round(centerY)
    ↓
Canvas rendering
```

**Problems in this flow:**
- **Double rounding:** `Math.floor()` on creation + `Math.round()` on rendering
- **Loss of precision:** Each conversion loses precision
- **Inconsistent rounding:** Different rounding strategies

---

## Recommended Fixes

### Priority 1: Critical Fixes

1. **Restore Shape Move Functionality**
   - Implement shape dragging in `SelectionVisualization` component
   - Use same coordinate conversion as creation

2. **Fix Coordinate Rounding**
   - Replace `Math.floor()` with `Math.round()` in shape creation
   - Ensure consistent rounding strategy throughout

3. **Standardize Coordinate Conversions**
   - Use `convertUVToPixel` utility function everywhere
   - Remove duplicate coordinate conversion code

### Priority 2: Accuracy Improvements

1. **Improve Hit Testing**
   - Add tolerance zone for click detection
   - Account for rounding errors

2. **Eliminate Double Rounding**
   - Choose one rounding point (either creation OR rendering)
   - Store positions with full precision

3. **Add Coordinate Conversion Utility**
   - Create unified `uvToShapePosition(uv, canvas)` function
   - Use it in creation, hit testing, and move operations

---

## Testing Recommendations

### Test Cases to Verify Fixes:

1. **Click Accuracy Test:**
   - Click at known UV coordinates (0, 0), (0.5, 0.5), (1, 1)
   - Verify shape appears exactly at click location (within 1 pixel)

2. **Move Accuracy Test:**
   - Create shape at position A
   - Drag to position B
   - Verify shape appears exactly at position B

3. **Hit Testing Test:**
   - Click directly on shape center
   - Verify shape is selected
   - Click 1-2 pixels away
   - Verify shape is still selectable (with tolerance)

4. **Non-Square Canvas Test:**
   - Test on rectangular canvas (e.g., 1024x512)
   - Verify shapes appear at correct positions
   - Verify no distortion

---

## Summary of Findings

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Missing move functionality | CRITICAL | Shapes cannot be repositioned | Needs Fix |
| Math.floor() truncation | HIGH | Up to 1px offset on placement | Needs Fix |
| Hit testing mismatch | MEDIUM | Shapes may not be selectable | Needs Fix |
| Multiple conversion paths | MEDIUM | Code inconsistency | Needs Fix |
| Rendering width/height | LOW | Already fixed | ✅ Fixed |

---

## Conclusion

The shape tool accuracy issues are primarily caused by:
1. **Missing move functionality** (critical - shapes can't be repositioned)
2. **Coordinate rounding** (high - causes pixel-level inaccuracies)
3. **Inconsistent coordinate conversion** (medium - maintainability issue)

**Primary Fix Required:** Restore shape move/drag functionality with correct coordinate conversion.

**Secondary Fixes:** Standardize coordinate conversions and improve rounding accuracy.

---

## Next Steps

1. ✅ Complete investigation report
2. ⏭️ Fix missing move functionality
3. ⏭️ Fix coordinate rounding issues
4. ⏭️ Standardize coordinate conversions
5. ⏭️ Test accuracy improvements



