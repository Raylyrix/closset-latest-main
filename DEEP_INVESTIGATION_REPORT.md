# Deep Investigation Report: Critical Issues Found

## 🔴 CRITICAL ISSUE #1: Canvas Redraw Uses Only Points Array
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 261-267

**Problem**: When redrawing a moved stroke, the code just draws a brush stamp at each point in the `points` array. However, the original stroke was NOT created this way - it was created incrementally during mouse move events. The `points` array might only contain a SUBSET of the actual brush stamp locations.

**Critical Issue**: The `points` array is populated during drawing (lines 2010-2028 in ShirtRefactored.tsx), but those are only the MOUSE positions, not every brush stamp position. The actual canvas has MANY more brush stamps drawn than points tracked.

**Example**:
- User draws stroke: mouse at [100, 100], [120, 110], [140, 120]
- But brush engine draws stamps at: [98, 98], [99, 99], [100, 100], [102, 102], ... (many more stamps for brush continuity)
- Points array has: [{x:100, y:100}, {x:120, y:110}, {x:140, y:120}]
- When moving: we only redraw at those 3 points, missing all the intermediate brush stamps

**Impact**: Moved strokes will have DISCONTINUOUS gaps - they'll be spotty, not smooth continuous strokes.

**Fix Required**: Need to redraw the ORIGINAL canvas with offset, not recreate from points array.

---

## 🔴 CRITICAL ISSUE #2: Canvas Canvas Reference Might Be Lost
**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1688-1720

**Problem**: When creating a new layer for each stroke, we get the canvas from the V2 store (line 1705: `canvas: newLayer.content.canvas`). Then we draw to it during painting. But when we move the stroke and redraw, we're redrawing to `layer.content.canvas` - but is this the SAME canvas that was used during painting?

**Critical Issue**: If the canvas reference changed or is stale, we might be drawing to the wrong canvas or the redraw might not work.

**Need to Verify**: Does `layer.content.canvas` in moveStroke match the canvas used during painting?

---

## 🟡 ISSUE #3: Brush Engine Access via Window Global
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 247

**Problem**: Accessing brush engine via `(window as any).__brushEngine` is fragile. The brush engine might not be initialized or available.

**Impact**: If brush engine unavailable, stroke redraw falls back to simple circles, losing gradient and advanced effects.

**Fix Required**: Need to ensure brush engine is globally available before use.

---

## 🟡 ISSUE #4: Settings Might Be Undefined
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 240

**Problem**: Code checks `if (layer.content.canvas && settings)` but `settings` comes from `layer.content.strokeData.settings`. If settings is undefined or incomplete, redraw will fail or use fallback.

**Impact**: Moved strokes might lose color, size, or other properties.

---

## 🔴 CRITICAL ISSUE #5: Redrawing Disconnected Points
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 261-267

**Problem**: When redrawing, we call `ctx.drawImage(brushStamp, ...)` for each point. But the original stroke was not drawn as separate images - it was drawn as a CONTINUOUS stroke with overlapping stamps.

**Critical Issue**: The brushSpacing between stamps is critical for continuous strokes. Simply drawing stamps at the recorded points will NOT create a continuous stroke - it will create a series of dots.

**Example**:
- Original stroke: Spacing 0.3, size 10 → stamps every 3 pixels
- Points array: Only has every 20th mouse position
- Redraw: Draws stamps at recorded points (every 20px) → HUGE gaps

**Fix Required**: Need to INTERPOLATE between points to maintain proper brush spacing during redraw.

---

## 🟡 ISSUE #6: Hit Testing Coordinate System Mismatch
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 77-81

**Problem**: Hit testing converts UV to canvas coordinates: `x = uv.u * canvasWidth`. But which canvas? The composed canvas or the layer canvas?

**Critical Issue**: Strokes are drawn on LAYER canvases (2048x2048 or similar). Hit testing uses COMPOSED canvas dimensions. If they don't match, hit testing will be incorrect.

**Verify**: What dimensions does composedCanvas have vs layer canvases?

---

## 🟡 ISSUE #7: Global Alpha Applied Twice
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 259

**Problem**: Setting `ctx.globalAlpha = settings.opacity` for the ENTIRE redraw, then drawing multiple stamps. The original stroke had opacity applied PER STAMP during painting.

**Impact**: If opacity is less than 1.0, ALL stamps in the moved stroke will have reduced opacity applied on TOP of their original opacity, making them darker/semtransparent.

**Fix Required**: Don't apply globalAlpha if opacity is already in the stamp, or handle opacity differently.

---

## 🔴 CRITICAL ISSUE #8: No Stroke Spacing in Redraw
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` lines 261-267

**Problem**: The redraw code draws stamps at every point in the points array without considering brush spacing. The original stroke was created with `spacing: 0.3` or similar, which means stamps overlap. Simply drawing at each point will NOT recreate the continuous stroke.

**Impact**: Moved strokes will look different - more sparse or less smooth than original.

**Fix Required**: Need to interpolate points based on brush spacing to maintain stroke continuity.

---

## 🟡 ISSUE #9: Missing Settings Properties
**Location**: `apps/web/src/core/StrokeSelectionSystem.ts` line 250

**Problem**: When recreating brush stamp, we only pass: `size, color, opacity, gradient`. But the original brush settings had MANY more properties: `hardness, flow, spacing, shape, dynamics, texture`, etc.

**Impact**: Moved strokes might not look exactly like the original.

**Fix Required**: Pass ALL original brush settings, not just a subset.

---

## 🟡 ISSUE #10: Selection Border Redraw During Transform
**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1620-1658

**Problem**: The selection border is redrawn on every `selectedLayerId` change. During a transform (move/resize), the bounds change, so the border will be redrawn constantly, causing flicker.

**Impact**: Visual glitch during drag - border flickers.

**Fix Required**: Only render border when NOT in transform mode, or debounce the redraw.

---

## Summary

### 🔴 MUST FIX (Critical)
1. **Disconnected stroke redraw** - Points array doesn't match actual brush stamps
2. **No interpolation/spacing** - Redraw creates gaps in stroke
3. **Missing brush settings** - Only subset of settings used for redraw

### 🟡 SHOULD FIX (Important)
4. Brush engine availability check
5. Settings validation
6. Opacity double application
7. Hit testing coordinate system
8. Selection border during transform

### ⚠️ INVESTIGATE
9. Canvas reference consistency
10. Settings completeness


