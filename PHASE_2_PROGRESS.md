# Phase 2 Migration Progress

## ✅ Completed Migrations

### 1. ShirtRefactored.tsx
- ✅ Replaced `useApp.getState().layers` with `useAdvancedLayerStoreV2.getState().layers`
- ✅ Replaced `useApp.getState().activeLayerId` with V2 `activeLayerId`

### 2. UltimateLayerPanel.tsx
- ✅ Removed legacy sync logic with App.tsx
- ✅ Now uses V2 `activeLayerId` directly

### 3. three/Shirt.tsx
- ✅ Added `useAdvancedLayerStoreV2` import
- ✅ Replaced `getActiveLayer` from useApp with V2-based implementation
- ✅ Replaced `setActiveLayerId` to use V2 `setActiveLayer`
- ✅ Replaced `useApp.getState().layers` with V2 `layers`

---

## 🔄 Remaining Work

### High Priority

1. **App.tsx - Remove Legacy Getters**
   - Remove `get layers()` getter
   - Remove `get activeLayerId()` getter
   - Update `getActiveLayer()` to return V2 layer directly (no conversion)
   - Update `getOrCreateActiveLayer()` to return V2 layer directly
   - Remove legacy fallback in `getActiveLayer()`

2. **App.tsx - Update Internal Usage**
   - Find all `get().layers` usage in App.tsx
   - Replace with V2 system
   - Update `getLayerNameForTool()` to use V2
   - Update `createToolLayer()` to use V2

3. **Other Files**
   - `utils/LayerSystemValidator.ts` - Uses `store.layers`
   - `utils/ImprovedEmbroideryManager.js` - Uses `this.layers`
   - `utils/EnhancedEmbroideryManager.ts` - Uses `this.layers`
   - `vector/VectorLineSubtool.js` - Uses `appState.getActiveLayer?.()`

---

## 📊 Migration Status

**Files Migrated:** 3/8 (37.5%)
- ✅ ShirtRefactored.tsx
- ✅ UltimateLayerPanel.tsx
- ✅ three/Shirt.tsx

**Files Remaining:** 5
- ⏳ App.tsx (most complex)
- ⏳ utils/LayerSystemValidator.ts
- ⏳ utils/ImprovedEmbroideryManager.js
- ⏳ utils/EnhancedEmbroideryManager.ts
- ⏳ vector/VectorLineSubtool.js

---

## ⚠️ Next Steps

1. Continue with App.tsx migration (remove getters, update functions)
2. Test all tools after App.tsx changes
3. Migrate remaining utility files
4. Final verification

