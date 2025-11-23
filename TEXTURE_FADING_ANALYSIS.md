# Texture Fading - Root Cause Analysis

## 🔍 What's Happening

The texture fades when you start drawing because:

### **Issue 1: Base Texture Not Captured Before First Draw**
**Problem:**
- Model loads → `generateBaseLayer()` called with 100ms delay
- User starts drawing immediately
- `composeLayers()` called before `generateBaseLayer()` completes
- Result: `baseTexture` is `null` → white background → faded appearance

**Evidence:**
```typescript
// ShirtRenderer.tsx:290-293
setTimeout(() => {
  useApp.getState().generateBaseLayer(); // ⏰ 100ms delay
}, 100);
```

---

### **Issue 2: Base Texture Canvas Gets Modified**
**Problem:**
- `baseTexture` is stored as a canvas reference
- If the canvas is modified elsewhere, base texture is lost
- Canvas might be getting cleared or overwritten

**Evidence:**
```typescript
// App.tsx:2337
get().setBaseTexture(baseTextureCanvas as any); // Stores canvas reference
```

**Risk:** If `baseTextureCanvas` is modified, base texture is lost.

---

### **Issue 3: Layers Drawing with Opacity Affecting Base**
**Problem:**
- Layers might be drawing with opacity/alpha that affects the base texture
- Blend modes might be causing the base texture to fade
- Multiple compositions might be accumulating opacity

**Evidence:**
```typescript
// AdvancedLayerSystemV2.ts:2470
ctx.globalAlpha = layer.opacity; // Layer opacity applied
```

---

### **Issue 4: Base Texture Not Preserved During Composition**
**Problem:**
- `composeLayers()` creates a NEW canvas each time
- Base texture is drawn, but if it's missing, white background is used
- If base texture extraction fails, white background persists

**Evidence:**
```typescript
// AdvancedLayerSystemV2.ts:2444-2448
} else {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, composedCanvas.width, composedCanvas.height);
  // White background = faded appearance
}
```

---

### **Issue 5: Base Texture Extraction Fails**
**Problem:**
- `generateBaseLayer()` might fail to extract texture from model
- Falls back to white background
- White background stored as `baseTexture`
- Result: Always white → faded appearance

**Evidence:**
```typescript
// App.tsx:2327-2331
} else {
  // Fallback to white background if no texture found
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, baseTextureCanvas.width, baseTextureCanvas.height);
}
get().setBaseTexture(baseTextureCanvas); // Stores WHITE canvas as baseTexture!
```

---

## 🎯 Root Cause Summary

**Primary Cause:** Base texture is either:
1. **Not captured in time** (race condition)
2. **Extraction fails** (falls back to white)
3. **Stored as white canvas** (when extraction fails)
4. **Canvas reference gets modified** (if canvas is reused)

**Secondary Cause:** 
- White background is being used when base texture is missing
- This white background is then stored as the "base texture"
- Subsequent compositions use white instead of original model texture

---

## ✅ Ways to Prevent Texture Fading

### **Solution 1: Capture Base Texture IMMEDIATELY on Model Load**
**Change:** Remove setTimeout, capture texture synchronously

**Current:**
```typescript
setTimeout(() => {
  useApp.getState().generateBaseLayer();
}, 100); // ❌ Delay causes race condition
```

**Fix:**
```typescript
// Capture IMMEDIATELY when model loads
useApp.getState().generateBaseLayer(); // ✅ No delay
```

---

### **Solution 2: Clone Base Texture Canvas (Don't Store Reference)**
**Problem:** Storing canvas reference means it can be modified

**Current:**
```typescript
get().setBaseTexture(baseTextureCanvas); // ❌ Stores reference
```

**Fix:**
```typescript
// Clone the canvas to prevent modification
const clonedCanvas = document.createElement('canvas');
clonedCanvas.width = baseTextureCanvas.width;
clonedCanvas.height = baseTextureCanvas.height;
clonedCanvas.getContext('2d')?.drawImage(baseTextureCanvas, 0, 0);
get().setBaseTexture(clonedCanvas); // ✅ Stores clone
```

---

### **Solution 3: Don't Store White Background as Base Texture**
**Problem:** When extraction fails, white canvas is stored as baseTexture

**Current:**
```typescript
if (!textureImage) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  get().setBaseTexture(baseTextureCanvas); // ❌ Stores white!
}
```

**Fix:**
```typescript
if (!textureImage) {
  // Don't store white - leave baseTexture as null
  console.warn('⚠️ Cannot extract base texture - leaving as null');
  // Don't call setBaseTexture() - keep it null
  return; // ✅ Don't store white background
}
```

---

### **Solution 4: Preserve Original Model Texture in THREE.js**
**Problem:** We're extracting from model, but model texture might be modified

**Fix:**
```typescript
// Store original texture IMMEDIATELY when model loads
// Before any modifications
const originalTexture = model.material.map;
// Clone it immediately
const baseTextureCanvas = cloneTextureToCanvas(originalTexture);
get().setBaseTexture(baseTextureCanvas);
```

---

### **Solution 5: Check Base Texture Before Every Composition**
**Fix:**
```typescript
composeLayers: () => {
  // ALWAYS check if baseTexture exists and is valid
  if (!appState.baseTexture || isWhiteCanvas(appState.baseTexture)) {
    // Try to extract from model
    if (appState.modelScene) {
      generateBaseLayer();
    }
    // Re-check after extraction
    if (!appState.baseTexture || isWhiteCanvas(appState.baseTexture)) {
      // Don't compose - preserve original model texture
      return existingComposedCanvas || null;
    }
  }
  // ... rest of composition
}
```

---

### **Solution 6: Don't Apply Texture Update If Base Texture Is White**
**Fix:**
```typescript
updateModelTexture: () => {
  // Check if base texture is actually valid (not white)
  if (isWhiteCanvas(appState.baseTexture)) {
    console.warn('⚠️ Base texture is white - skipping update to preserve model');
    return; // Don't apply white texture to model
  }
  // ... rest of update
}
```

---

## 🎯 Recommended Implementation Order

1. **Priority 1:** Clone base texture canvas (Solution 2)
2. **Priority 2:** Don't store white as base texture (Solution 3)
3. **Priority 3:** Capture immediately on model load (Solution 1)
4. **Priority 4:** Add validation checks (Solutions 5 & 6)

---

## 📝 Helper Function Needed

```typescript
function isWhiteCanvas(canvas: HTMLCanvasElement | null): boolean {
  if (!canvas) return true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  
  // Sample center pixel
  const imageData = ctx.getImageData(
    canvas.width / 2, 
    canvas.height / 2, 
    1, 
    1
  );
  const [r, g, b] = imageData.data;
  
  // Check if pixel is white (or very close to white)
  return r > 250 && g > 250 && b > 250;
}
```

---

## 🔍 Debugging Steps

1. **Check if baseTexture exists:**
   ```javascript
   console.log('Base texture:', useApp.getState().baseTexture);
   ```

2. **Check if baseTexture is white:**
   ```javascript
   const canvas = useApp.getState().baseTexture;
   const ctx = canvas?.getContext('2d');
   const pixel = ctx?.getImageData(canvas.width/2, canvas.height/2, 1, 1);
   console.log('Base texture center pixel:', pixel?.data);
   ```

3. **Check when baseTexture is set:**
   - Add logging in `generateBaseLayer()`
   - Add logging in `setBaseTexture()`
   - Check if it's being cleared/modified

4. **Check composition flow:**
   - Log when `composeLayers()` is called
   - Log if baseTexture exists during composition
   - Log what's drawn to composedCanvas

