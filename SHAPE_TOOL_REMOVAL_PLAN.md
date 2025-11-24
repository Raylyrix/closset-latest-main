# Shape Tool Removal Plan

## Status: IN PROGRESS

Removing all shape tool code to rebuild from scratch with clean architecture.

## Files to Clean

### ✅ Completed
- [x] Shirt.tsx - Removed legacy shape tool handling (line 1218-1247)

### 🔄 In Progress  
- [ ] ShirtRefactored.tsx - Remove shape tool handling
  - [x] Removed shape creation code (line 5600-5897)
  - [ ] Remove getShapeBounds function (line 4287-4370)
  - [ ] Remove shape tool from onPointerMove (line 5636+)
  - [ ] Remove shape dragging/resizing code (line 6647+)

### ⏳ Pending
- [ ] App.tsx - Remove shape state and functions
  - Remove shapeElements array
  - Remove shapeType, shapeSize, shapeColor, etc.
  - Remove addShapeElement, updateShapeElement, deleteShapeElement
  - Remove activeShapeId, hoveredShapeId
  - Remove 'shapes' from Tool type

- [ ] AdvancedLayerSystemV2.ts - Remove shape rendering
  - Remove shape rendering code (line 3242-3507)
  - Remove shape selection border rendering

- [ ] UI Components
  - LeftPanelCompact.tsx - Remove shape buttons
  - RightPanelCompact.tsx - Remove shape settings panel
  - Toolbar.tsx - Remove shape tool buttons
  - ToolRouter.tsx - Remove 'shapes' route
  - Navigation.tsx - Remove shape tool from navigation

- [ ] Other files
  - Remove shape tool from CursorOverlay.tsx
  - Remove shape tool from any other references

## Next Steps After Removal

1. Create clean shape tool architecture
2. Implement unified coordinate system
3. Add proper shape types and rendering
4. Add shape manipulation (move, resize, rotate)
5. Add shape selection and editing

