# Phase 2: Legacy Layer System Migration Plan

## 📋 Overview

**Goal:** Remove legacy layer system from App.tsx and migrate all code to use AdvancedLayerSystemV2 directly.

**Current State:**
- App.tsx maintains `layers: Layer[]` and `activeLayerId: string | null` (legacy)
- `getActiveLayer()` converts V2 layers to legacy format
- `getOrCreateActiveLayer()` converts V2 layers to legacy format
- Multiple files access legacy layers via `useApp(s => s.layers)`

**Target State:**
- Remove legacy layer state from App.tsx
- All code uses `useAdvancedLayerStoreV2()` directly
- No format conversions needed

---

## 🔍 Files Requiring Migration

### High Priority (Core Files)

1. **App.tsx**
   - Remove `layers: Layer[]` state
   - Remove `activeLayerId: string | null` state
   - Update `getActiveLayer()` to return V2 layer directly
   - Update `getOrCreateActiveLayer()` to return V2 layer directly
   - Remove legacy fallback in `getActiveLayer()`
   - Update `getLayerNameForTool()` to use V2
   - Update `createToolLayer()` to use V2
   - Update `composeLayers()` wrapper

2. **three/Shirt.tsx**
   - Replace `useApp(s => s.getActiveLayer)` with V2
   - Replace `useApp.getState().layers` with V2
   - Replace `setActiveLayerId` with V2

3. **components/ShirtRefactored.tsx**
   - Replace `useApp.getState().layers` with V2
   - Replace `useApp.getState().activeLayerId` with V2

4. **components/UltimateLayerPanel.tsx**
   - Replace `useApp(state => state.activeLayerId)` with V2

### Medium Priority (Utility Files)

5. **utils/LayerSystemValidator.ts**
   - Uses `store.layers` - needs to use V2 store

6. **utils/ImprovedEmbroideryManager.js**
   - Uses `this.layers` - needs migration

7. **utils/EnhancedEmbroideryManager.ts**
   - Uses `this.layers` - needs migration

8. **vector/VectorLineSubtool.js**
   - Uses `appState.getActiveLayer?.()` - needs migration

---

## 📝 Migration Steps

### Step 1: Update App.tsx State

**Remove:**
```typescript
layers: Layer[],
activeLayerId: string | null,
```

**Keep:**
```typescript
composedCanvas: HTMLCanvasElement | null,
baseTexture: HTMLImageElement | HTMLCanvasElement | null,
```

### Step 2: Update getActiveLayer()

**Current (converts to legacy):**
```typescript
getActiveLayer: () => {
  const advancedStore = useAdvancedLayerStoreV2.getState();
  const { layers, activeLayerId } = advancedStore;
  if (activeLayerId) {
    const layer = layers.find((l: any) => l.id === activeLayerId);
    if (layer) {
      return {
        // Convert to legacy format...
      };
    }
  }
  // Fallback to legacy...
}
```

**New (returns V2 layer):**
```typescript
getActiveLayer: () => {
  const { layers, activeLayerId } = useAdvancedLayerStoreV2.getState();
  if (activeLayerId) {
    return layers.find(l => l.id === activeLayerId) || null;
  }
  return null;
}
```

### Step 3: Update getOrCreateActiveLayer()

**Current (converts to legacy):**
```typescript
getOrCreateActiveLayer: (toolType: string) => {
  // ... creates layer in V2 ...
  return {
    // Convert to legacy format...
  };
}
```

**New (returns V2 layer):**
```typescript
getOrCreateActiveLayer: (toolType: string) => {
  const v2Store = useAdvancedLayerStoreV2.getState();
  const { layers, activeLayerId, createLayer } = v2Store;
  
  if (activeLayerId) {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer && activeLayer.visible) {
      return activeLayer; // Return V2 layer directly
    }
  }
  
  const layerName = get().getLayerNameForTool(toolType);
  const layerId = createLayer(toolType as any, layerName);
  v2Store.setActiveLayer(layerId);
  
  return v2Store.layers.find(l => l.id === layerId) || null;
}
```

### Step 4: Update Files Using Legacy Layers

**Pattern to Replace:**
```typescript
// OLD:
const { layers, activeLayerId } = useApp();
const layer = layers.find(l => l.id === activeLayerId);

// NEW:
const { layers, activeLayerId } = useAdvancedLayerStoreV2();
const layer = layers.find(l => l.id === activeLayerId);
```

**Pattern to Replace:**
```typescript
// OLD:
const layers = useApp.getState().layers;
const activeLayerId = useApp.getState().activeLayerId;

// NEW:
const { layers, activeLayerId } = useAdvancedLayerStoreV2.getState();
```

---

## ⚠️ Risk Assessment

**Risk Level:** 🟡 **MEDIUM**

**Potential Issues:**
1. Some code may expect legacy layer format
2. Need to update all callers of `getActiveLayer()` to handle V2 format
3. Need to verify all tools work with V2 layers

**Mitigation:**
1. Test each tool after migration
2. Keep compatibility layer temporarily if needed
3. Update callers incrementally

---

## ✅ Verification Checklist

- [ ] All files migrated to use V2
- [ ] Legacy state removed from App.tsx
- [ ] No more format conversions
- [ ] All tools still work
- [ ] No broken imports
- [ ] No linter errors

---

## 🎯 Success Criteria

1. ✅ `layers` and `activeLayerId` removed from App.tsx state
2. ✅ All files use `useAdvancedLayerStoreV2()` directly
3. ✅ No legacy layer format conversions
4. ✅ All tools work correctly
5. ✅ Codebase is cleaner and more maintainable

