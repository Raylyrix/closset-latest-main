# Base Texture Fading Issue - Analysis

## 🔍 Problem

**User Report:** "At some point while drawing, a faded texture appears on the model."

## 🐛 Root Cause

### Issue 1: Canvas Cleared Before Base Texture Check
**Location:** `AdvancedLayerSystemV2.ts:2412-2450`

**Current Flow:**
```typescript
composeLayers: () => {
  // 1. Clear canvas FIRST
  ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height); // ❌ Clears everything
  
  // 2. THEN check if baseTexture exists
  if (appState.baseTexture) {
    // Draw base texture
  } else {
    // ❌ Canvas is already cleared - no base texture to draw
    // Result: Blank/transparent canvas = faded appearance
  }
}
```

**Problem:**
- Canvas is cleared BEFORE checking if baseTexture exists
- If baseTexture is missing, canvas stays blank/transparent
- When layers are composed on blank canvas, model appears faded

---

### Issue 2: Race Condition - Base Texture Not Captured in Time
**Location:** `ShirtRenderer.tsx:290-293`

**Current Flow:**
```typescript
// Model loads
useApp.setState({ modelScene: scene });

// Generate base layer AFTER model loads (with delay)
setTimeout(() => {
  useApp.getState().generateBaseLayer(); // ⏰ Called 100ms later
}, 100);
```

**Problem:**
- `composeLayers()` might be called BEFORE `generateBaseLayer()` completes
- If user starts drawing immediately, baseTexture is still null
- Composition happens without base texture → faded appearance

---

## ✅ Solution

### Fix 1: Don't Clear Canvas If Base Texture Missing
**Change:** Check for baseTexture BEFORE clearing, and extract it from model if missing

**New Flow:**
```typescript
composeLayers: () => {
  const appState = useApp.getState();
  
  // 1. Check for baseTexture FIRST
  if (!appState.baseTexture) {
    // Try to extract from model immediately
    if (appState.modelScene) {
      generateBaseLayer(); // Extract texture from model
    }
  }
  
  // 2. Clear canvas ONLY if we have baseTexture to restore
  if (appState.baseTexture) {
    ctx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
    // Draw base texture immediately
    ctx.drawImage(appState.baseTexture, 0, 0, ...);
  } else {
    // DON'T clear - preserve whatever is there (might be original model texture)
    // Or extract from current model texture if possible
  }
}
```

### Fix 2: Capture Base Texture Immediately on Model Load
**Change:** Extract texture synchronously when model loads, before any composition

**New Flow:**
```typescript
// When model loads
useApp.setState({ modelScene: scene });

// Extract texture IMMEDIATELY (no setTimeout)
extractBaseTextureFromModel(scene); // Synchronous extraction
```

---

## 🎯 Recommended Fix

**Priority:** Extract base texture from model BEFORE clearing canvas in composeLayers()

**Implementation:**
1. In `composeLayers()`, check if baseTexture exists
2. If missing, try to extract from modelScene immediately
3. Only clear canvas if we have baseTexture to restore
4. If baseTexture still missing, don't clear (preserve existing)

---

## 📝 Current Status

**Tools are:**
- ✅ Using the base model texture (when available)
- ❌ Creating new texture when baseTexture is missing
- ❌ Clearing canvas before checking if baseTexture exists

**Result:** Faded texture appears when baseTexture is not captured in time.

