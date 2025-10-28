# Blend Mode and Stroke Border Fixes

## Issues Fixed

### 1. **Blend Mode Double Rendering** ✅
**Problem**: Blend mode was being applied twice:
1. When drawing layer content with blend mode
2. When applying effects, the layer content was redrawn with the same blend mode

**Fix Applied**:
- In `AdvancedLayerSystemV2.ts` (line 2500), set `ctx.globalCompositeOperation = 'source-over'` for effects
- This prevents effects from inheriting the layer's blend mode and causing double rendering
- Effects now render with normal blend mode, while the layer blend mode is applied only once during composition

**Location**: `apps/web/src/core/AdvancedLayerSystemV2.ts` lines 2498-2500

### 2. **Stroke Outline Border Not Tracing Entire Stroke** ✅
**Problem**: The border was just outlining individual points instead of creating a continuous outline

**Fix Applied**:
- The border rendering logic in `ShirtRefactored.tsx` now:
  1. Draws circles at each point (radius = brushSize / 2 + 6)
  2. Connects the circles with lines, calculating the edge points properly
  3. Creates a continuous "bubble-like" outline that traces the full stroke width

**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1731-1762

### 3. **Stroke Border Not Clearing on Deselection** ✅
**Problem**: Border was preserved after deselecting a stroke

**Fix Applied**:
- Updated the border rendering logic to:
  1. Re-compose layers and update texture FIRST (lines 1676-1680)
  2. Then draw the border on top of the rendered texture (lines 1684-1772)
  3. On deselection (lines 1658-1664), explicitly call `composeLayers()` and `updateModelTexture(true)` to clear the border

**Location**: `apps/web/src/components/ShirtRefactored.tsx` lines 1658-1794

### 4. **Build Errors (TypeScript)** ✅
**Problem**: Redundant property definitions in `UnifiedToolSystem.ts`

**Fix Applied**:
- Used destructuring to extract duplicate properties from `vectorTool.config` before spreading
- This prevents "specified more than once" errors
- Extract: `size`, `opacity`, `hardness`, `flow`, `spacing`, `angle`, `roundness`, `color`, `blendMode`
- Spread only: `...otherConfig` for remaining properties

**Location**: `apps/web/src/core/UnifiedToolSystem.ts` lines 209, 219

## How It Works Now

### Blend Modes:
1. Brush draws to layer canvas with `source-over` (no blend mode during drawing)
2. Layer composition applies the layer's blend mode ONCE
3. Effects render with `source-over` to prevent double blending
4. Filter is reset after effects to prevent interference

### Stroke Selection Border:
1. When a stroke is selected:
   - Layers are composed and texture is updated first
   - A green dashed border is drawn tracing the full stroke outline
   - Border is rendered AFTER texture update to ensure visibility
2. When deselected:
   - Layers are recomposed without border
   - Texture is updated to remove the border
3. Border creates a continuous outline by:
   - Drawing circles at each point based on brush size
   - Connecting circles with lines between edge points
   - Creates a bubble-like outline following the stroke path

## Testing
- Build errors in `UnifiedToolSystem.ts` are fixed
- Blend modes should now work correctly without double rendering
- Stroke selection border should trace the entire stroke and clear on deselection

