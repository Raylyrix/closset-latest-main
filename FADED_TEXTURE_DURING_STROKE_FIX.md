# Faded Texture During Stroke - Fix

## 🔍 Problem

**User Report:** "The faded texture still appears while I am drawing a stroke."

## 🐛 Root Cause

### Issue: `updateModelTexture` Called During Stroke Without Base Texture

**Location:** `ShirtRefactored.tsx:updateModelTexture()`

**Problem:**
1. During a stroke, `updateModelTexture()` is called (line 3523, 2640)
2. `updateModelTexture()` uses `composedCanvas` directly
3. If `composedCanvas` doesn't exist, it calls `composeLayers()`
4. `composeLayers()` might not have `baseTexture` set yet
5. Result: Blank/transparent canvas is applied to model → faded appearance

---

## ✅ Fix Applied

### Change 1: Check Base Texture Before Composition
**Location:** `ShirtRefactored.tsx:899-914`

**Added:**
```typescript
// Ensure base texture is captured before composition
if (!appState.baseTexture && appState.modelScene) {
  console.log('🎨 Base texture missing during texture update - extracting from model...');
  if (appState.generateBaseLayer) {
    appState.generateBaseLayer();
    // Re-read state after generation
    const updatedState = useApp.getState();
    if (updatedState.baseTexture) {
      console.log('🎨 Base texture extracted successfully');
    }
  }
}
```

### Change 2: Skip Texture Update If Base Texture Missing
**Location:** `ShirtRefactored.tsx:930-935`

**Added:**
```typescript
// Verify composedCanvas has base texture before applying
// If base texture is missing, don't update model (preserve original texture)
if (!appState.baseTexture) {
  console.warn('⚠️ Base texture still missing - skipping texture update to preserve model texture');
  return;
}
```

---

## 🎯 How It Works Now

**Before:**
```
Stroke starts
  ↓
updateModelTexture() called
  ↓
composeLayers() called (baseTexture missing)
  ↓
Blank canvas created
  ↓
Applied to model → Faded texture ❌
```

**After:**
```
Stroke starts
  ↓
updateModelTexture() called
  ↓
Check: baseTexture exists?
  ↓ NO
Extract baseTexture from model immediately
  ↓
composeLayers() called (baseTexture now exists)
  ↓
Base texture + layers composed
  ↓
Applied to model → Correct texture ✅
```

---

## 📝 Additional Notes

- If base texture cannot be extracted, texture update is skipped
- This preserves the original model texture instead of applying blank canvas
- Prevents faded appearance during strokes

---

## 🧪 Testing

**Test:**
1. Start drawing a stroke
2. Base texture should remain visible
3. No faded texture should appear during stroke
4. Drawing should appear on top of base texture

