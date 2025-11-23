# Remaining Cleanup Items

## 📋 Summary

After completing Phases 1A, 1B, and 1C, here are remaining cleanup opportunities:

---

## 🧪 Test Files to Move

### Core Directory Test Files (6 files)
These test files should be moved to `tests/` directory:

1. ✅ `core/CoreSystemTests.ts` - Test framework
2. ✅ `core/StepByStepTest.ts` - Step-by-step testing
3. ✅ `core/StitchTypeTest.ts` - Stitch type tests
4. ✅ `core/UXFlowTest.ts` - UX flow tests
5. ✅ `core/VectorStitchTest.ts` - Vector stitch tests
6. ✅ `core/TestingFramework.ts` - Testing framework

**Action:** Move to `tests/` directory (similar to what we did with AdvancedLayerSystemV2Test)

---

## 🔍 Potential Duplicate Files

### Shirt Component Files
- `components/Shirt/ShirtDebugger.js` - Appears to be compiled JSX (has jsx-runtime imports)
- `components/Shirt/ShirtOverlay.js` - Appears to be compiled JSX (has jsx-runtime imports)

**Status:** Both have `.tsx` counterparts
- `ShirtDebugger.tsx` exists
- `ShirtOverlay.tsx` exists

**Action:** Verify if .js files are imported anywhere. If not, delete them (they're likely build artifacts).

---

## 📝 Remaining .js Files (31 files)

These are files without .ts counterparts. They may be:
- Legacy files that haven't been migrated
- Intentionally kept as .js
- Service files

**Evaluation Needed:** Check if these should be:
1. Migrated to TypeScript
2. Kept as-is (if intentionally .js)
3. Deleted (if unused)

**Files:**
- `api.js`
- `AppWithErrorBoundary.js`
- `exporters.js`
- `components/Shirt/ShirtDebugger.js`
- `components/Shirt/ShirtOverlay.js`
- `services/*.js` (multiple)
- `three/materials/PuffPrintMaterial.js`
- `three/shaders/*.js` (multiple)
- `utils/*.js` (multiple - files without .ts counterparts)

---

## ⚠️ Phase 2 Items (Require Migration)

These are NOT cleanup items but migration tasks:

1. **Legacy Layer System in App.tsx**
   - Remove legacy layer state
   - Migrate all tools to use V2 system
   - Remove wrapper functions

2. **Composition Function Simplification**
   - Remove `App.composeLayers()` wrapper
   - Direct calls to V2 system

3. **Event System Consolidation**
   - Standardize event names
   - Remove duplicate event types

---

## ✅ Quick Wins (Safe to Do Now)

### 1. Move Test Files
**Risk:** 🟢 **ZERO** - Just moving files, no code changes
**Files:** 6 test files in `core/`

### 2. Delete Compiled JSX Files (if not imported)
**Risk:** 🟢 **LOW** - If not imported, safe to delete
**Files:** `ShirtDebugger.js`, `ShirtOverlay.js`

---

## 🎯 Recommendation

**Immediate Actions:**
1. ✅ Move 6 test files from `core/` to `tests/`
2. ✅ Check and delete `ShirtDebugger.js` and `ShirtOverlay.js` if not imported
3. ⏸️ Evaluate remaining .js files in Phase 2 (requires more analysis)

**Total Potential Cleanup:**
- 6 test files to move
- 2 compiled JSX files to delete (if unused)
- 31 .js files to evaluate (Phase 2)

