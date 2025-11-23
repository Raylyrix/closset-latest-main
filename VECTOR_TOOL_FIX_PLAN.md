# Vector Tool Fix Plan

## Current Issues

1. **Multiple State Stores**: `useApp` and `vectorStore` (separate Zustand store) causing sync issues
2. **Complex Architecture**: Multiple vector tool classes (EnhancedVectorTools, AdvancedVectorTools, ProfessionalVectorTools, ComprehensiveVectorSystem)
3. **Confusing Vector Mode Toggle**: `vectorMode` boolean that toggles behavior of other tools
4. **Not Integrated**: Doesn't work with text, image, and shape elements
5. **Hard to Use**: Complex edit modes, confusing UI

## Solution

### Phase 1: State Consolidation
- Remove `vectorStore` dependency
- Use only `useApp` store for all vector state
- Remove `vectorMode` toggle - vector tool is just another tool

### Phase 2: Unified Vector Tool
- Single, simple vector tool implementation
- Works with all element types (text, image, shapes, vector paths)
- Simple edit modes: `pen` (create/edit), `select` (select/move), `curve` (edit curves)

### Phase 3: Integration with Other Tools
- Vector tool can select and edit text elements
- Vector tool can select and edit image elements
- Vector tool can select and edit shape elements
- Convert elements to vector paths when needed

### Phase 4: Simplified UI
- Remove vector mode toggle from UI
- Simple tool selector: Pen, Select, Curve
- Clear visual feedback

## Implementation Steps

1. ✅ Remove `vectorStore` imports and usage
2. ✅ Consolidate all vector state into `useApp`
3. ✅ Simplify vector tool logic in `ShirtRefactored.tsx`
4. ✅ Add integration with text/image/shape elements
5. ✅ Update UI to remove vector mode toggle
6. ✅ Test with all element types


