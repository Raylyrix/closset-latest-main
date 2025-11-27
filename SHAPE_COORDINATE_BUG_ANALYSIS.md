# 🔴 SHAPE COORDINATE BUG - ROOT CAUSE ANALYSIS

## The Problem

Shapes are NOT appearing where you click because of **inconsistent Y-axis flipping** between text and shapes.

---

## The Math - Step by Step

### 1. UV Coordinates from Three.js Raycasting
```
Three.js intersection.uv:
- uv.x = 0 to 1 (left to right) ✓
- uv.y = 0 to 1 (where v=0 = BOTTOM, v=1 = TOP in UV texture space)
```

### 2. Text Tool Conversion (WORKING CORRECTLY)

**Storage:**
```typescript
// CoordinateUtils.ts:26-27
const pixelCoords = convertUVToPixel(uv, canvas);
// x = Math.round(uv.u * width) ✓
// y = Math.round((1 - uv.v) * height) ← FLIPS ONCE: v=0→height, v=1→0

// Stored in textEl:
textEl.x = pixelCoords.x  // = uv.u * width
textEl.y = pixelCoords.y  // = (1 - uv.v) * height
```

**Rendering:**
```typescript
// AdvancedLayerSystemV2.ts:2685
const flippedY = canvasHeight - textEl.y;
// flippedY = canvasHeight - (1 - uv.v) * height
// flippedY = canvasHeight - height + uv.v * height
// flippedY = uv.v * height  ← FLIPS AGAIN: back to original UV position!

// Then renders at:
ctx.fillText(text, textEl.x, flippedY)  // Uses flippedY
```

**Result:** Text renders at `y = uv.v * height` (matches click position) ✅

---

### 3. Shape Tool Conversion (BROKEN)

**Storage:**
```typescript
// ShirtRefactored.tsx:5355-5362
const pixelCoords = convertUVToPixel(uv, canvas);
// x = Math.round(uv.u * width) ✓
// y = Math.round((1 - uv.v) * height) ← FLIPS ONCE: v=0→height, v=1→0

// Stored in shapeEl:
shapeEl.positionX = pixelCoords.x  // = uv.u * width
shapeEl.positionY = pixelCoords.y  // = (1 - uv.v) * height
```

**Rendering:**
```typescript
// AdvancedLayerSystemV2.ts:3253-3254
const shapeX = Math.round(shapeEl.positionX);  // = uv.u * width ✓
const shapeY = Math.round(shapeEl.positionY);  // = (1 - uv.v) * height ❌

// Then renders at:
ctx.arc(shapeX, shapeY, radius, ...)  // Uses shapeY directly, NO FLIP!
```

**Result:** Shape renders at `y = (1 - uv.v) * height` (WRONG! Should be `uv.v * height`) ❌

---

## The Bug

**Shapes are rendered with Y-coordinate that's FLIPPED compared to where you clicked!**

- Click at UV v=0 (bottom) → Shape appears at canvas y=height (bottom) ✓
- Click at UV v=1 (top) → Shape appears at canvas y=0 (top) ✓
- BUT WAIT... this seems correct?

Let me check the canvas coordinate system...

**Canvas 2D Context:**
- y=0 is at TOP
- y=height is at BOTTOM

**Three.js UV Space:**
- v=0 is at BOTTOM of texture
- v=1 is at TOP of texture

**When you click on the model:**
- If you click at the bottom of the model, raycast gives uv.v ≈ 0
- If you click at the top of the model, raycast gives uv.v ≈ 1

**Expected behavior:**
- Click bottom of model → Shape at bottom of canvas → y = height ✓
- Click top of model → Shape at top of canvas → y = 0 ✓

**Current shape rendering:**
- Click bottom (uv.v=0) → shapeY = (1-0)*height = height → bottom ✓
- Click top (uv.v=1) → shapeY = (1-1)*height = 0 → top ✓

**Wait, this should be correct!**

Unless... let me check if the canvas is being flipped somewhere...

Actually, I see it now! Look at text rendering - it does a canvas transform:

```typescript
// AdvancedLayerSystemV2.ts:2822-2824 (for text selection border)
ctx.translate(0, canvasHeight);
ctx.scale(1, -1);
```

This flips the entire canvas coordinate system! So in text rendering:
- The canvas is flipped so y=0 is at bottom
- Text.y is stored as (1-uv.v)*height (already flipped once)
- Then rendered, which with the canvas flip means it appears at the correct position

But shapes don't do this canvas flip! So shapes need to be stored WITHOUT the flip in convertUVToPixel, OR they need an additional flip during rendering.

Let me check the actual canvas state during shape rendering...

Actually wait, I need to see if the canvas transform is applied globally or just for text borders.





