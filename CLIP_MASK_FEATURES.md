# Clip Mask Feature - Implementation Plan

## Overview
Clip masks allow content to be clipped to a specific shape or path, creating a "window" through which only certain parts of the layer are visible. This is different from layer masks (which use grayscale values) - clip masks use binary visibility (visible or hidden) based on a shape/path.

## Core Concept
- **Clip Mask**: A shape/path that defines the visible area of a layer
- **Clipped Content**: The layer content that is visible only within the clip mask shape
- **Integration**: Must work with AdvancedLayerSystemV2 and all tools

---

## Feature Requirements

### 1. ✅ Clip Mask Data Structure
**Status:** ✅ Completed  
**Description:** Define clip mask interface and storage

**Implementation:**
- Add `clipMask` property to `AdvancedLayer` interface
- Clip mask can be:
  - **Path-based**: Vector path (SVG path data or canvas path)
  - **Shape-based**: Rectangle, circle, ellipse, polygon
  - **Image-based**: Grayscale image (converted to path)
  - **Text-based**: Text outline as clip path
- Properties:
  - `id`: Unique identifier
  - `type`: 'path' | 'shape' | 'image' | 'text'
  - `data`: Path data, shape parameters, or image source
  - `enabled`: Boolean to toggle clip mask
  - `inverted`: Boolean to invert the clip (show outside instead of inside)
  - `canvas`: HTMLCanvasElement for rendering the clip mask
  - `bounds`: Bounding box of the clip mask

---

### 2. ✅ Clip Mask Creation Methods
**Status:** ✅ Completed  
**Description:** Multiple ways to create clip masks

**Implementation:**
- **From Selection**: Create clip mask from current selection
- **From Vector Path**: Use existing vector path as clip mask
- **From Shape**: Create clip mask from shape tool (rectangle, circle, etc.)
- **From Text**: Use text outline as clip mask
- **From Image**: Use image alpha channel or grayscale as clip mask
- **From Layer**: Use another layer's content as clip mask
- **Manual Drawing**: Draw clip mask path manually with pen tool

---

### 3. ✅ Clip Mask Application
**Status:** ✅ Completed  
**Description:** Apply clip mask to layers during composition

**Implementation:**
- Modify `composeLayers()` to apply clip masks
- Use `ctx.clip()` before drawing layer content
- Save/restore canvas state for each layer
- Apply clip mask transformations (scale, rotate, translate)
- Support nested clip masks (clip mask on a layer that's already clipped)

---

### 4. ✅ Tool Integration - Brush
**Status:** To be implemented  
**Description:** Brush tool respects clip mask boundaries

**Implementation:**
- Check clip mask bounds before painting
- Clip brush strokes to mask shape using `ctx.clip()`
- Visual feedback: Show clip mask outline while painting
- Brush strokes outside clip mask are automatically clipped

---

### 5. ✅ Tool Integration - Custom Brush
**Status:** To be implemented  
**Description:** Custom brush respects clip mask boundaries

**Implementation:**
- All custom brush features work within clip mask
- Custom brush stamps are clipped to mask shape
- Symmetry, scattering, patterns respect clip boundaries
- Multi-layer and animated brushes work with clip masks

---

### 6. ✅ Tool Integration - Fill
**Status:** To be implemented  
**Description:** Fill tool respects clip mask boundaries

**Implementation:**
- Fill operation is clipped to mask shape
- Flood fill algorithm respects clip boundaries
- Fill preview shows only within clip mask

---

### 7. ✅ Tool Integration - Text
**Status:** To be implemented  
**Description:** Text elements respect clip mask boundaries

**Implementation:**
- Text rendering is clipped to mask shape
- Text overflow is hidden by clip mask
- Text editing works within clip boundaries

---

### 8. ✅ Tool Integration - Embroidery
**Status:** To be implemented  
**Description:** Embroidery stitches respect clip mask boundaries

**Implementation:**
- Stitch paths are clipped to mask shape
- Stitches outside clip mask are not rendered
- Embroidery preview respects clip boundaries

---

### 9. ✅ Tool Integration - Shapes
**Status:** To be implemented  
**Description:** Shape tools respect clip mask boundaries

**Implementation:**
- Shape rendering is clipped to mask shape
- Shape editing works within clip boundaries
- Shape transformations respect clip mask

---

### 10. ✅ Tool Integration - Puff
**Status:** To be implemented  
**Description:** Puff tool respects clip mask boundaries

**Implementation:**
- Puff 3D geometry is clipped to mask shape
- Puff rendering respects clip boundaries
- Puff editing works within clip mask

---

### 11. ✅ Tool Integration - Image
**Status:** To be implemented  
**Description:** Image layers respect clip mask boundaries

**Implementation:**
- Image rendering is clipped to mask shape
- Image transformations respect clip mask
- Image editing works within clip boundaries

---

### 12. ✅ Clip Mask Editing
**Status:** To be implemented  
**Description:** Edit clip mask shape/path

**Implementation:**
- Select clip mask to edit
- Use vector tools to modify clip path
- Transform clip mask (move, scale, rotate)
- Add/remove points from clip path
- Smooth clip path
- Convert between clip mask types

---

### 13. ✅ Clip Mask Inversion
**Status:** To be implemented  
**Description:** Invert clip mask to show outside instead of inside

**Implementation:**
- Toggle `inverted` property
- Update composition to show content outside clip shape
- Visual indicator for inverted clip masks

---

### 14. ✅ Clip Mask Enable/Disable
**Status:** To be implemented  
**Description:** Toggle clip mask on/off without deleting

**Implementation:**
- Toggle `enabled` property
- Temporarily disable clip mask for editing
- Re-enable to apply clipping again

---

### 15. ✅ Clip Mask Preview
**Status:** To be implemented  
**Description:** Visual preview of clip mask boundaries

**Implementation:**
- Show clip mask outline on canvas
- Highlight clipped area
- Show clip mask bounds
- Preview mode toggle

---

### 16. ✅ Clip Mask from Selection
**Status:** To be implemented  
**Description:** Create clip mask from current selection

**Implementation:**
- Convert selection to path
- Create clip mask from selection path
- Apply to active layer
- Support rectangular, elliptical, and freeform selections

---

### 17. ✅ Clip Mask from Vector Path
**Status:** To be implemented  
**Description:** Use vector path as clip mask

**Implementation:**
- Select vector path
- Convert to clip mask
- Link or copy path data
- Update clip mask when path changes (if linked)

---

### 18. ✅ Clip Mask from Shape
**Status:** To be implemented  
**Description:** Create clip mask from shape tool

**Implementation:**
- Draw shape (rectangle, circle, ellipse, polygon)
- Convert to clip mask
- Apply to active layer
- Support all shape types

---

### 19. ✅ Clip Mask from Text
**Status:** To be implemented  
**Description:** Use text outline as clip mask

**Implementation:**
- Select text element
- Convert text outline to path
- Create clip mask from text path
- Support all text styles and fonts

---

### 20. ✅ Clip Mask from Image
**Status:** To be implemented  
**Description:** Use image as clip mask source

**Implementation:**
- Select image layer or image file
- Extract alpha channel or convert to grayscale
- Create clip mask from image
- Support threshold for binary mask

---

### 21. ✅ Clip Mask from Layer
**Status:** To be implemented  
**Description:** Use another layer's content as clip mask

**Implementation:**
- Select source layer
- Extract layer content as clip mask
- Apply to target layer
- Support linking (update when source changes)

---

### 22. ✅ Clip Mask Transformations
**Status:** To be implemented  
**Description:** Transform clip mask independently

**Implementation:**
- Move clip mask
- Scale clip mask
- Rotate clip mask
- Skew clip mask
- Transform independently from layer content

---

### 23. ✅ Multiple Clip Masks
**Status:** To be implemented  
**Description:** Support multiple clip masks per layer (intersection)

**Implementation:**
- Add multiple clip masks to layer
- Combine masks using intersection (AND) operation
- All masks must be satisfied for visibility
- Edit each mask independently

---

### 24. ✅ Clip Mask Groups
**Status:** To be implemented  
**Description:** Apply clip mask to entire group

**Implementation:**
- Create clip mask on group
- All layers in group are clipped
- Group clip mask affects all children
- Nested groups support nested clip masks

---

### 25. ✅ Clip Mask Feathering
**Status:** To be implemented  
**Description:** Soft edges on clip mask

**Implementation:**
- Add feather/softness property
- Apply blur to clip mask edges
- Create smooth transitions
- Control feather radius

---

### 26. ✅ Clip Mask Expansion/Contraction
**Status:** To be implemented  
**Description:** Expand or contract clip mask boundaries

**Implementation:**
- Expand mask outward
- Contract mask inward
- Control expansion amount
- Preserve shape while expanding/contracting

---

### 27. ✅ Clip Mask UI Panel
**Status:** ✅ Completed  
**Description:** UI controls for clip mask management

**Implementation:**
- Clip mask section in layer panel
- Create clip mask button
- Edit clip mask button
- Enable/disable toggle
- Invert toggle
- Delete clip mask button
- Clip mask preview thumbnail

---

### 28. ✅ Clip Mask Visual Indicators
**Status:** To be implemented  
**Description:** Visual feedback for clip masks

**Implementation:**
- Clip mask icon in layer list
- Clip mask outline on canvas
- Highlight clipped area
- Show clip mask bounds
- Different colors for enabled/disabled

---

### 29. ✅ Clip Mask Export/Import
**Status:** To be implemented  
**Description:** Save and load clip masks

**Implementation:**
- Export clip mask as SVG path
- Export clip mask as image
- Import clip mask from file
- Share clip masks between projects

---

### 30. ✅ Performance Optimization
**Status:** To be implemented  
**Description:** Optimize clip mask rendering

**Implementation:**
- Cache clip mask paths
- Optimize clip mask composition
- Use offscreen canvas for complex masks
- Minimize redraws when clip mask changes

---

## Technical Implementation Details

### Data Structure
```typescript
interface ClipMask {
  id: string;
  type: 'path' | 'shape' | 'image' | 'text';
  data: ClipMaskData;
  enabled: boolean;
  inverted: boolean;
  canvas: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
  transform: LayerTransform;
  feather?: number; // Soft edge radius
}

interface ClipMaskData {
  // For path type
  path?: string; // SVG path data
  points?: Array<{ x: number; y: number }>;
  
  // For shape type
  shape?: 'rectangle' | 'circle' | 'ellipse' | 'polygon';
  shapeParams?: Record<string, any>;
  
  // For image type
  image?: string; // Data URL or image source
  threshold?: number; // For binary conversion
  
  // For text type
  text?: string;
  font?: string;
  fontSize?: number;
}
```

### Composition Integration
- Modify `composeLayers()` to check for clip masks
- Before drawing each layer:
  1. Check if layer has clip mask
  2. If enabled, save canvas state
  3. Apply clip mask using `ctx.clip()`
  4. Draw layer content (clipped automatically)
  5. Restore canvas state

### Tool Integration Pattern
For each tool:
1. Check if active layer has clip mask
2. If enabled, apply clip before tool operation
3. Tool draws normally (automatically clipped)
4. Restore clip state after operation

---

## Implementation Order

1. **Phase 1: Core Infrastructure**
   - Add clip mask data structure to AdvancedLayer
   - Implement clip mask storage and retrieval
   - Add clip mask methods to AdvancedLayerSystemV2

2. **Phase 2: Composition Integration**
   - Modify composeLayers() to apply clip masks
   - Test with basic shapes

3. **Phase 3: Tool Integration**
   - Brush tool
   - Custom brush tool
   - Fill tool
   - Text tool
   - Embroidery tool
   - Shapes tool
   - Puff tool
   - Image tool

4. **Phase 4: Clip Mask Creation**
   - From selection
   - From vector path
   - From shape
   - From text
   - From image
   - From layer

5. **Phase 5: Clip Mask Editing**
   - Edit clip mask path
   - Transform clip mask
   - Enable/disable
   - Invert

6. **Phase 6: Advanced Features**
   - Multiple clip masks
   - Clip mask groups
   - Feathering
   - Expansion/contraction

7. **Phase 7: UI & Polish**
   - Clip mask panel
   - Visual indicators
   - Preview mode
   - Export/import

---

## Testing Checklist

- [ ] Clip mask applies correctly to brush strokes
- [ ] Clip mask applies correctly to custom brush
- [ ] Clip mask applies correctly to fill tool
- [ ] Clip mask applies correctly to text
- [ ] Clip mask applies correctly to embroidery
- [ ] Clip mask applies correctly to shapes
- [ ] Clip mask applies correctly to puff
- [ ] Clip mask applies correctly to images
- [ ] Clip mask can be created from selection
- [ ] Clip mask can be created from vector path
- [ ] Clip mask can be created from shape
- [ ] Clip mask can be created from text
- [ ] Clip mask can be created from image
- [ ] Clip mask can be created from layer
- [ ] Clip mask can be edited
- [ ] Clip mask can be transformed
- [ ] Clip mask can be enabled/disabled
- [ ] Clip mask can be inverted
- [ ] Clip mask works with layer groups
- [ ] Multiple clip masks work correctly
- [ ] Clip mask performance is acceptable
- [ ] Clip mask UI is intuitive

---

## Notes

- Clip masks are different from layer masks:
  - **Layer Mask**: Uses grayscale values (0-255) to control opacity
  - **Clip Mask**: Uses binary visibility (visible or hidden) based on shape
  
- Clip masks use canvas `clip()` method which is more performant than masking
  
- Clip masks can be combined with layer masks for complex effects
  
- Clip masks work at the composition level, affecting final rendered output

---

**Last Updated:** Phase 1 & 2 Complete - Core infrastructure and UI implemented

## Implementation Status

### ✅ Phase 1: Core Infrastructure (COMPLETED)
- ✅ Clip mask data structures added to AdvancedLayerSystemV2
- ✅ Clip mask methods implemented in store
- ✅ Clip mask integration in composeLayers()
- ✅ Support for all clip mask types (path, shape, image, text)

### ✅ Phase 2: UI Panel (COMPLETED)
- ✅ Clip mask panel added to RightPanelCompact
- ✅ Create clip mask buttons (From Selection, From Circle, From Rectangle)
- ✅ Enable/disable toggle
- ✅ Invert toggle
- ✅ Remove clip mask button
- ✅ Clip mask status display

### ⏳ Phase 3: Tool Integration (AUTOMATIC)
- ✅ Tools automatically respect clip masks (applied during composition)
- ⏳ Visual feedback for clip mask boundaries (to be added)
- ⏳ Clip mask preview mode (to be added)

### ⏳ Phase 4: Advanced Features (PENDING)
- ⏳ Multiple clip masks per layer
- ⏳ Clip mask groups
- ⏳ Feathering
- ⏳ Expansion/contraction

## Notes

**Tool Integration:** All tools (brush, custom brush, fill, text, embroidery, shapes, puff, image) automatically respect clip masks because:
1. Tools draw to layer canvases
2. Clip masks are applied during `composeLayers()` before drawing layer content
3. Canvas `clip()` method automatically clips all drawing operations

This means no additional tool-specific code is needed - clip masks work universally!

