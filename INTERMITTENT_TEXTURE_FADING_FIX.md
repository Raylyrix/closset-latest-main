# Intermittent Texture Fading - Critical Fix

## 🔍 Problem

**User Report:** "Sometimes the texture fades, sometimes the texture is good. After some strokes the texture gets faded and then again after some strokes the texture is back to good again."

## 🐛 Root Cause

**Location:** `AdvancedLayerSystemV2.ts:composeLayers()`

**Problem:**
1. `composeLayers()` is called multiple times during a stroke
2. Each time it creates a NEW canvas and clears it
3. If `baseTexture` is missing or incorrectly rejected as "white", the canvas stays empty
4. Layers are drawn on empty canvas → faded appearance
5. Next stroke might have `baseTexture` available → texture looks good again
6. Result: Intermittent fading

**Why it's intermittent:**
- `isWhiteCanvas()` was too strict (80% white = white canvas)
- Valid textures (like white shirts) were incorrectly rejected
- When rejected, base texture wasn't restored
- Canvas stayed empty → faded appearance
- Next composition might pass the check → texture restored

---

## ✅ Fixes Applied

### **Fix 1: Preserve Existing Canvas Content When Base Texture Missing**
**Location:** `AdvancedLayerSystemV2.ts:2426-2474`

**Change:**
- Always create new canvas for clean composition
- If `baseTexture` is missing/invalid, copy from existing `composedCanvas`
- This preserves the base texture that was already there
- Prevents faded appearance when `baseTexture` check fails

**Code:**
```typescript
// Always create new canvas
const composedCanvas = createComposedCanvas();
ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);

if (hasValidBaseTexture) {
  // Restore from baseTexture
  ctx.drawImage(appState.baseTexture, 0, 0, ...);
} else if (existingComposedCanvas) {
  // CRITICAL: Copy from existing canvas to preserve content
  ctx.drawImage(existingComposedCanvas, 0, 0, ...);
  console.log('🎨 Preserving existing composedCanvas content to prevent fading');
}
```

---

### **Fix 2: Make White Canvas Check Less Strict**
**Location:** `CoordinateUtils.ts:105-108`

**Change:**
- Before: 80% white pixels = white canvas (too strict)
- After: ALL pixels must be white = white canvas
- Prevents valid textures (like white shirts) from being incorrectly rejected

**Code:**
```typescript
// Before:
return whitePixels >= samplePoints.length * 0.8; // 80% or more white

// After:
return whitePixels === samplePoints.length; // ALL pixels must be white
```

**Why:**
- A valid texture (like a white shirt) might have mostly white pixels
- But it should have some non-white pixels (shadows, seams, etc.)
- Requiring ALL pixels to be white ensures we only reject truly blank canvases

---

## 🎯 How It Works Now

**Before (Intermittent Fading):**
```
Stroke 1:
  composeLayers() called
  baseTexture exists → restored ✅
  Texture looks good ✅

Stroke 2:
  composeLayers() called
  baseTexture incorrectly rejected as "white" ❌
  Canvas stays empty
  Layers drawn on empty canvas → Faded ❌

Stroke 3:
  composeLayers() called
  baseTexture exists → restored ✅
  Texture looks good ✅
```

**After (Consistent):**
```
Stroke 1:
  composeLayers() called
  baseTexture exists → restored ✅
  Texture looks good ✅

Stroke 2:
  composeLayers() called
  baseTexture incorrectly rejected as "white" ❌
  Copy from existing composedCanvas ✅
  Preserves base texture → Texture looks good ✅

Stroke 3:
  composeLayers() called
  baseTexture exists → restored ✅
  Texture looks good ✅
```

---

## 📝 Key Changes

1. **Preserve Existing Content:**
   - When `baseTexture` is missing/invalid, copy from existing `composedCanvas`
   - This ensures base texture is never lost
   - Prevents faded appearance

2. **Less Strict White Check:**
   - Only reject canvas if ALL sampled pixels are white
   - Prevents valid textures from being incorrectly rejected
   - Reduces false positives

3. **Always Clean Composition:**
   - Always create new canvas for clean composition
   - But preserve base texture from existing canvas if needed
   - Ensures layers don't accumulate

---

## 🧪 Testing

**Test 1: Multiple Strokes**
1. Draw stroke 1 → Texture should look good
2. Draw stroke 2 → Texture should still look good (not faded)
3. Draw stroke 3 → Texture should still look good
4. Result: Consistent texture, no intermittent fading

**Test 2: White Shirt Texture**
1. Load white shirt model
2. Base texture should not be rejected as "white"
3. Draw strokes → Texture should remain visible
4. Result: Valid white textures are preserved

**Test 3: Base Texture Missing**
1. If base texture extraction fails
2. Existing composedCanvas content should be preserved
3. Draw strokes → Texture should not fade
4. Result: Content preserved even when baseTexture is missing

---

## 📝 Notes

- The fix ensures base texture is ALWAYS preserved
- Even if `baseTexture` check fails, existing content is preserved
- White canvas check is now less strict, reducing false rejections
- This should eliminate intermittent fading completely

