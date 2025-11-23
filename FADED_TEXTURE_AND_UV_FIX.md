# Faded Texture and UV Mismatch Fix

## 🔍 Problems Identified

1. **Faded Texture:** Texture remains faded once drawing starts
2. **UV Mismatch:** Brush draws in wrong location (drawing somewhere else when clicking somewhere else)

## 🐛 Root Causes

### Issue 1: Canvas Reuse Without Clearing
**Location:** `AdvancedLayerSystemV2.ts:composeLayers()`

**Problem:**
- Previous fix tried to reuse existing canvas to preserve content
- But this caused layers to accumulate without clearing
- Result: Faded appearance from multiple layer compositions

### Issue 2: Canvas Dimension Mismatch
**Location:** `AdvancedLayerSystemV2.ts:createDefaultContent()` and `composeLayers()`

**Problem:**
- Layer canvas created with `composedCanvas.width` (if exists) or 1024 fallback
- Composed canvas created with `CANVAS_CONFIG.COMPOSED.width`
- If dimensions don't match, UV coordinates are wrong
- Result: Brush draws in wrong location

---

## ✅ Fixes Applied

### Fix 1: Always Create New Canvas
**Location:** `AdvancedLayerSystemV2.ts:2427-2450`

**Change:**
- Always create new canvas (not reuse existing)
- Always clear canvas first
- Always restore base texture if available
- If base texture missing, fill with white (prevents transparent/faded)

**Code:**
```typescript
// Always create new canvas to ensure clean composition
const composedCanvas = createComposedCanvas();
const ctx = composedCanvas.getContext('2d');

// Always clear canvas first
ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);

// Restore base texture if available
if (appState.baseTexture) {
  ctx.drawImage(appState.baseTexture, 0, 0, ...);
} else {
  // Fill with white to prevent faded appearance
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, composedCanvas.width, composedCanvas.height);
}
```

### Fix 2: Ensure Canvas Dimensions Match
**Location:** `AdvancedLayerSystemV2.ts:636-644`

**Change:**
- Layer canvas now always uses `CANVAS_CONFIG.COMPOSED.width`
- Matches composed canvas dimensions exactly
- Prevents UV coordinate mismatch

**Code:**
```typescript
case 'paint':
  // Use same dimensions as composed canvas
  const canvasSize = CANVAS_CONFIG.COMPOSED.width;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
```

### Fix 3: Scale Layer Canvas if Dimensions Don't Match
**Location:** `AdvancedLayerSystemV2.ts:2484-2498`

**Change:**
- Check if layer canvas dimensions match composed canvas
- If not, scale layer canvas to match
- Prevents UV mismatch during composition

**Code:**
```typescript
if (layerCanvas.width !== composedCanvas.width || layerCanvas.height !== composedCanvas.height) {
  // Scale to match
  ctx.drawImage(layerCanvas, 0, 0, composedCanvas.width, composedCanvas.height);
} else {
  // Draw directly
  ctx.drawImage(layerCanvas, 0, 0);
}
```

---

## 🎯 Expected Results

1. ✅ **No Faded Texture:**
   - Base texture always restored
   - Canvas always cleared before composition
   - Layers don't accumulate

2. ✅ **Correct UV Mapping:**
   - Layer canvas and composed canvas have same dimensions
   - UV coordinates match between drawing and composition
   - Brush draws in correct location

---

## 🧪 Testing

**Test 1: Faded Texture**
1. Start drawing a stroke
2. Base texture should remain visible (not faded)
3. Drawing should appear on top of base texture

**Test 2: UV Mapping**
1. Click on a specific location on the model
2. Brush should draw exactly where you clicked
3. No offset or wrong location

---

## 📝 Notes

- Canvas dimensions are now consistent: `CANVAS_CONFIG.COMPOSED.width/height`
- Base texture is always restored before drawing layers
- If base texture is missing, white background prevents faded appearance

