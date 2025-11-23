# 🎈 New Puff Tool - Complete Implementation Plan

## 📋 Executive Summary

**Goal:** Build a realistic, production-ready puff tool with smooth dome shapes, continuous flow, and proper 3D displacement that matches real-world puff printing techniques.

**Key Requirements:**
- ✅ Both continuous (brush-like) and discrete (click-to-place) drawing modes
- ✅ Smooth dome shapes with continuous flow
- ✅ Realistic height range: 0.2mm - 0.5mm (max 1mm)
- ✅ Texture/material options (smooth, textured, other types)
- ✅ Works on same "Texture Layer" as other tools
- ✅ Real-time visual feedback
- ✅ Full undo/redo support
- ✅ Proper layer system integration

---

## 🎯 Core Features & Specifications

### **1. Drawing Behavior**

#### **Mode A: Continuous Drawing (Brush-like)** ⭐ **DEFAULT**
- Click and drag to paint continuous puff strokes
- Smooth, flowing puffs that merge together
- Real-time displacement as you draw
- Similar to brush tool but with 3D displacement
- **Default mode** - starts with this

#### **Mode B: Discrete Placement (Click-to-Place)**
- Click once to place individual puff dome
- Each click creates one smooth dome at that location
- Puffs can overlap and blend
- Useful for precise placement

**Toggle:** Button in settings panel to switch between modes (defaults to continuous)

---

### **2. Visual Appearance**

#### **Dome Shape Profile**
- **Base:** Smooth dome using cosine interpolation
- **Formula:** `height = baseHeight * cos(t * π/2)` where `t` is normalized distance from center (0-1)
- **Edges:** Soft falloff controlled by "softness" parameter
- **Flow:** Continuous blending between puffs (no hard edges between individual domes)

#### **Texture/Material Types**
1. **Smooth** - Glossy, matte finish (default)
   - Metalness: 0.0, Roughness: 0.2
   - Clean, polished look

2. **Little Textured** - Slight texture, fabric-like
   - Metalness: 0.0, Roughness: 0.5
   - Subtle surface variation

3. **Textured** - More pronounced texture
   - Metalness: 0.0, Roughness: 0.8
   - Visible surface detail

4. **Custom Types** (future expansion):
   - Foam-like, rubber-like, etc.

#### **Material Application Toggle**
- **Toggle Option:** "Apply to All Puffs" / "Apply to Current Stroke"
  - **"Apply to All Puffs"** - Material properties apply globally to entire layer
  - **"Apply to Current Stroke"** - Material properties apply only to the stroke being drawn
  - Allows mixing different material types in same layer

---

### **3. Displacement & 3D**

#### **Height Range (Realistic)**
- **Minimum:** 0.2mm (subtle raise)
- **Default:** 0.3mm (typical puff print)
- **Maximum:** 1.0mm (very raised, for dramatic effects)
- **UI Slider:** 0.2 - 1.0mm with 0.1mm increments

#### **Displacement Map**
- **Base:** Black (0, 0, 0) = no displacement
- **Range:** 0-255 = full displacement range
- **Value Calculation:** `displacementValue = Math.floor((height / 1.0) * 255 * domeProfile * softness)`
- **Normal Maps:** Generated automatically from displacement for surface detail

#### **3D Application**
- Apply displacement map to model material
- `displacementScale`: Height value (in mm, converted to 3D units)
- `displacementBias`: 0 (black = no displacement)
- Real-time update during drawing

---

### **4. Settings Panel**

#### **Essential Controls:**

1. **Mode Toggle**
   - Button: "Continuous" / "Discrete"
   - Icon: 🖌️ / 🔘

2. **Height Slider**
   - Range: 0.2 - 1.0mm
   - Default: 0.3mm
   - Step: 0.1mm
   - Display: "Height: 0.3mm"

3. **Softness Slider**
   - Range: 0.0 - 1.0
   - Default: 0.5
   - Step: 0.01
   - Display: "Softness: 50%"
   - Controls edge falloff

4. **Brush Size Slider**
   - Range: 5 - 200px
   - Default: 30px
   - Step: 1px
   - Display: "Size: 30px"
   - Controls puff diameter

5. **Color Picker**
   - Standard color picker
   - Default: '#ff69b4' (pink)
   - Display: Color swatch + hex input

6. **Opacity Slider**
   - Range: 0.0 - 1.0
   - Default: 0.9
   - Step: 0.01
   - Display: "Opacity: 90%"

7. **Blend Mode Dropdown**
   - Options: "Normal", "Multiply", "Screen", "Overlay", etc.
   - Default: "Normal"
   - Controls how puffs blend with underlying content
   - Uses layer system's blend modes

8. **Texture Type Dropdown**
   - Options: "Smooth", "Little Textured", "Textured"
   - Default: "Smooth"
   - Icons for each type

9. **Material Application Toggle**
   - Toggle: "Apply to All Puffs" / "Apply to Current Stroke"
   - Default: "Apply to Current Stroke"
   - Controls whether material properties apply globally or per-stroke

---

## 🏗️ Architecture & Implementation

### **File Structure**

```
apps/web/src/
├── components/
│   └── puff/
│       ├── NewPuffTool.tsx       # Main component (minimal, just integration)
│       └── PuffSettings.tsx      # Settings panel UI
├── utils/
│   └── puff/
│       ├── puffDisplacement.ts   # Pure functions for displacement calculations
│       ├── puffRendering.ts      # Pure functions for canvas rendering
│       ├── puffTypes.ts          # Type definitions
│       └── puffMaterials.ts      # Material/texture presets
```

---

### **Core Functions**

#### **`puffDisplacement.ts`**

```typescript
// Calculate dome profile height at given distance from center
export function calculateDomeProfile(
  normalizedDistance: number,  // 0 = center, 1 = edge
  softness: number             // 0.0 = hard edge, 1.0 = very soft
): number {
  // Cosine interpolation for smooth dome
  const cosValue = Math.cos(normalizedDistance * Math.PI / 2);
  // Apply softness (higher softness = softer edges)
  const softnessFactor = Math.pow(cosValue, 1 / (softness + 0.1));
  return softnessFactor;
}

// Calculate displacement map value for a pixel
export function calculateDisplacementValue(
  distanceFromCenter: number,  // Distance in pixels
  radius: number,              // Puff radius in pixels
  height: number,              // Height in mm (0.2-1.0)
  softness: number            // 0.0-1.0
): number {
  if (distanceFromCenter > radius) return 0;
  
  const normalizedDistance = distanceFromCenter / radius;
  const domeHeight = calculateDomeProfile(normalizedDistance, softness);
  const displacement = (height / 1.0) * 255 * domeHeight;
  
  return Math.floor(Math.max(0, Math.min(255, displacement)));
}

// Generate displacement map for a single puff
export function generatePuffDisplacement(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,        // Center coordinates
  radius: number,              // Radius in pixels
  height: number,              // Height in mm
  softness: number            // Softness 0.0-1.0
): void {
  // Create radial gradient with dome profile
  const stops = 16; // Smooth falloff
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const normalizedDistance = t;
    const domeHeight = calculateDomeProfile(normalizedDistance, softness);
    const displacementValue = calculateDisplacementValue(
      t * radius, radius, height, softness
    );
    // ... gradient stops
  }
}
```

#### **`puffRendering.ts`**

```typescript
// Draw puff color on canvas (for texture layer)
export function drawPuffColor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draw continuous puff stroke (for brush-like mode)
export function drawPuffStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<{x: number, y: number}>,
  radius: number,
  color: string,
  opacity: number,
  softness: number
): void {
  // Blend puffs together for continuous flow
  // Use path with rounded ends
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw smooth path connecting all points
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  
  // Add rounded caps at start and end
  drawPuffDome(ctx, points[0].x, points[0].y, radius, color, opacity, softness);
  drawPuffDome(ctx, points[points.length - 1].x, points[points.length - 1].y, radius, color, opacity, softness);
  
  ctx.restore();
}

// Draw single puff dome (for discrete mode or stroke caps)
export function drawPuffDome(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  opacity: number,
  softness: number
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  
  // Smooth dome profile using cosine interpolation
  const stops = 16;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const cosValue = Math.cos((1 - t) * Math.PI / 2);
    const alpha = opacity * cosValue * (1 - softness * 0.3);
    gradient.addColorStop(t, `rgba(${hexToRgb(color)}, ${alpha})`);
  }
  
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

#### **`puffMaterials.ts`**

```typescript
export interface PuffMaterial {
  name: string;
  metalness: number;
  roughness: number;
  description: string;
}

export const PUFF_MATERIALS: Record<string, PuffMaterial> = {
  smooth: {
    name: 'Smooth',
    metalness: 0.0,
    roughness: 0.2,
    description: 'Glossy, polished finish'
  },
  littleTextured: {
    name: 'Little Textured',
    metalness: 0.0,
    roughness: 0.5,
    description: 'Slight texture, fabric-like'
  },
  textured: {
    name: 'Textured',
    metalness: 0.0,
    roughness: 0.8,
    description: 'Pronounced texture'
  }
};

export function applyPuffMaterial(
  material: THREE.MeshStandardMaterial,
  materialType: string
): void {
  const preset = PUFF_MATERIALS[materialType] || PUFF_MATERIALS.smooth;
  material.metalness = preset.metalness;
  material.roughness = preset.roughness;
  material.needsUpdate = true;
}
```

---

### **5. Layer Z-Index & Ordering**

- **Z-Index Control:** Handled automatically by layer system
  - Puffs drawn on the same "Texture Layer" as other tools
  - Layer order in panel controls what appears on top
  - Can reorder layers to change puff position relative to other content
  - Each layer has an `order` property that determines rendering order

- **Layer Composition:** 
  - When composing layers, layer with higher `order` renders on top
  - Puffs on same layer as brush strokes: drawn content determines order (last drawn = on top)
  - To separate puffs from other content: create separate layers and reorder them

---

### **Integration with Existing Systems**

#### **1. Hook into `paintAtEvent`**

**Location:** `ShirtRefactored.tsx` → `paintAtEvent` function

```typescript
// In paintAtEvent function, add puff tool handling:
else if (currentActiveTool === 'puffPrint') {
  const { drawPuffColor, drawPuffStroke, drawPuffDome } = require('../utils/puff/puffRendering');
  const { generatePuffDisplacement } = require('../utils/puff/puffDisplacement');
  const { layers, activeLayerId, saveHistorySnapshot } = useAdvancedLayerStoreV2.getState();
  const activeLayer = layers.find(l => l.id === activeLayerId);
  
  if (!activeLayer) return;
  
  const puffSettings = useApp.getState();
  const mode = puffSettings.puffMode || 'continuous'; // 'continuous' | 'discrete' - DEFAULT: 'continuous'
  const height = puffSettings.puffHeight || 0.3; // mm
  const softness = puffSettings.puffSoftness || 0.5;
  const brushSize = puffSettings.puffBrushSize || 30; // px
  const color = puffSettings.puffColor || '#ff69b4';
  const opacity = puffSettings.puffOpacity || 0.9;
  const blendMode = puffSettings.puffBlendMode || 'normal'; // Layer blend mode
  const materialApplyMode = puffSettings.puffMaterialApplyMode || 'current'; // 'all' | 'current'
  const textureType = puffSettings.puffTextureType || 'smooth';
  
  // Get canvas and context
  const canvas = activeLayer.content.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Convert UV to canvas coordinates
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const canvasX = Math.floor(uv.x * canvasWidth);
  const canvasY = Math.floor(uv.y * canvasHeight);
  const radius = brushSize / 2;
  
  if (mode === 'discrete') {
    // Discrete mode: Single dome per click
    if (!strokeSessionRef.current || strokeSessionRef.current.id !== 'puff-discrete') {
      // Save snapshot for undo BEFORE drawing
      saveHistorySnapshot('puff_discrete');
      
      // New click - create discrete puff
      ctx.save();
      ctx.globalCompositeOperation = blendMode; // Apply blend mode
      drawPuffDome(ctx, canvasX, canvasY, radius, color, opacity, softness);
      ctx.restore();
      
      // Generate displacement
      const displacementCanvas = useApp.getState().displacementCanvas;
      if (displacementCanvas) {
        const dispCtx = displacementCanvas.getContext('2d');
        if (dispCtx) {
          generatePuffDisplacement(dispCtx, canvasX, canvasY, radius, height, softness);
        }
      }
      
      // Store material properties if apply to current stroke
      if (materialApplyMode === 'current') {
        // Store material properties with stroke data (for per-stroke materials)
        // This will be used when applying materials to model
      }
      
      // Update model
      updateModelTexture(false, true); // Update displacement
    }
  } else {
    // Continuous mode: Brush-like stroke (DEFAULT)
    if (!strokeSessionRef.current || strokeSessionRef.current.tool !== 'puffPrint') {
      // Start new stroke
      const strokeId = `puff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save snapshot for undo BEFORE starting stroke
      saveHistorySnapshot('puff_stroke_start');
      
      strokeSessionRef.current = {
        id: strokeId,
        layerId: activeLayer.id,
        points: [{ x: canvasX, y: canvasY }],
        tool: 'puffPrint',
        settings: { 
          height, softness, brushSize, color, opacity, 
          blendMode, textureType, materialApplyMode 
        }
      };
      
      // Draw initial point
      ctx.save();
      ctx.globalCompositeOperation = blendMode; // Apply blend mode
      drawPuffDome(ctx, canvasX, canvasY, radius, color, opacity, softness);
      ctx.restore();
    } else {
      // Continue stroke
      strokeSessionRef.current.points.push({ x: canvasX, y: canvasY });
      
      // Draw continuous puff stroke with blend mode
      ctx.save();
      ctx.globalCompositeOperation = strokeSessionRef.current.settings.blendMode; // Apply blend mode
      drawPuffStroke(
        ctx,
        strokeSessionRef.current.points,
        radius,
        color,
        opacity,
        softness
      );
      ctx.restore();
      
      // Generate displacement for entire stroke
      const displacementCanvas = useApp.getState().displacementCanvas;
      if (displacementCanvas) {
        const dispCtx = displacementCanvas.getContext('2d');
        if (dispCtx) {
          // Generate displacement for each point in stroke
          strokeSessionRef.current.points.forEach(point => {
            generatePuffDisplacement(dispCtx, point.x, point.y, radius, height, softness);
          });
        }
      }
      
      // Real-time update (throttled)
      requestAnimationFrame(() => {
        updateModelTexture(false, true);
      });
    }
  }
}
```

#### **2. Add State to App.tsx**

```typescript
// In App.tsx, add to useApp store:
puffMode: 'continuous' | 'discrete';  // Drawing mode - DEFAULT: 'continuous'
puffHeight: number;                   // 0.2 - 1.0 (mm) - DEFAULT: 0.3
puffSoftness: number;                 // 0.0 - 1.0 - DEFAULT: 0.5
puffBrushSize: number;                // 5 - 200 (px) - DEFAULT: 30
puffColor: string;                    // Hex color - DEFAULT: '#ff69b4'
puffOpacity: number;                  // 0.0 - 1.0 - DEFAULT: 0.9
puffTextureType: string;              // 'smooth' | 'littleTextured' | 'textured' - DEFAULT: 'smooth'
puffBlendMode: BlendMode;             // Layer blend mode - DEFAULT: 'normal'
puffMaterialApplyMode: 'all' | 'current'; // Material application - DEFAULT: 'current'

// Setters:
setPuffMode: (mode: 'continuous' | 'discrete') => void;
setPuffHeight: (height: number) => void;
setPuffSoftness: (softness: number) => void;
setPuffBrushSize: (size: number) => void;
setPuffColor: (color: string) => void;
setPuffOpacity: (opacity: number) => void;
setPuffTextureType: (type: string) => void;
setPuffBlendMode: (mode: BlendMode) => void;
setPuffMaterialApplyMode: (mode: 'all' | 'current') => void;
```

#### **3. Settings Panel Component**

**File:** `components/puff/PuffSettings.tsx`

```typescript
import React from 'react';
import { useApp } from '../../App';
import { PUFF_MATERIALS } from '../../utils/puff/puffMaterials';

export const PuffSettings: React.FC = () => {
  const {
    puffMode,
    puffHeight,
    puffSoftness,
    puffBrushSize,
    puffColor,
    puffOpacity,
    puffTextureType,
    setPuffMode,
    setPuffHeight,
    setPuffSoftness,
    setPuffBrushSize,
    setPuffColor,
    setPuffOpacity,
    setPuffTextureType
  } = useApp();
  
  return (
    <div className="puff-settings">
      {/* Mode Toggle */}
      <div className="setting-group">
        <label>Drawing Mode</label>
        <div className="mode-toggle">
          <button
            onClick={() => setPuffMode('continuous')}
            className={puffMode === 'continuous' ? 'active' : ''}
          >
            🖌️ Continuous
          </button>
          <button
            onClick={() => setPuffMode('discrete')}
            className={puffMode === 'discrete' ? 'active' : ''}
          >
            🔘 Discrete
          </button>
        </div>
      </div>
      
      {/* Height */}
      <div className="setting-group">
        <label>Height: {puffHeight.toFixed(1)}mm</label>
        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.1"
          value={puffHeight}
          onChange={(e) => setPuffHeight(parseFloat(e.target.value))}
        />
      </div>
      
      {/* Softness */}
      <div className="setting-group">
        <label>Softness: {Math.round(puffSoftness * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={puffSoftness}
          onChange={(e) => setPuffSoftness(parseFloat(e.target.value))}
        />
      </div>
      
      {/* Brush Size */}
      <div className="setting-group">
        <label>Size: {puffBrushSize}px</label>
        <input
          type="range"
          min="5"
          max="200"
          step="1"
          value={puffBrushSize}
          onChange={(e) => setPuffBrushSize(parseInt(e.target.value))}
        />
      </div>
      
      {/* Color */}
      <div className="setting-group">
        <label>Color</label>
        <input
          type="color"
          value={puffColor}
          onChange={(e) => setPuffColor(e.target.value)}
        />
        <input
          type="text"
          value={puffColor}
          onChange={(e) => setPuffColor(e.target.value)}
        />
      </div>
      
      {/* Opacity */}
      <div className="setting-group">
        <label>Opacity: {Math.round(puffOpacity * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={puffOpacity}
          onChange={(e) => setPuffOpacity(parseFloat(e.target.value))}
        />
      </div>
      
      {/* Blend Mode */}
      <div className="setting-group">
        <label>Blend Mode</label>
        <select
          value={puffBlendMode}
          onChange={(e) => setPuffBlendMode(e.target.value as BlendMode)}
        >
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft Light</option>
          <option value="hard-light">Hard Light</option>
          <option value="color-dodge">Color Dodge</option>
          <option value="color-burn">Color Burn</option>
          <option value="darken">Darken</option>
          <option value="lighten">Lighten</option>
          <option value="difference">Difference</option>
        </select>
      </div>
      
      {/* Texture Type */}
      <div className="setting-group">
        <label>Texture</label>
        <select
          value={puffTextureType}
          onChange={(e) => setPuffTextureType(e.target.value)}
        >
          {Object.keys(PUFF_MATERIALS).map(key => (
            <option key={key} value={key}>
              {PUFF_MATERIALS[key].name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Material Application Mode */}
      <div className="setting-group">
        <label>Material Application</label>
        <div className="toggle-group">
          <button
            onClick={() => setPuffMaterialApplyMode('all')}
            className={puffMaterialApplyMode === 'all' ? 'active' : ''}
          >
            Apply to All Puffs
          </button>
          <button
            onClick={() => setPuffMaterialApplyMode('current')}
            className={puffMaterialApplyMode === 'current' ? 'active' : ''}
          >
            Apply to Current Stroke
          </button>
        </div>
        <small>
          {puffMaterialApplyMode === 'all' 
            ? 'Material properties apply to entire layer' 
            : 'Material properties apply only to current stroke'}
        </small>
      </div>
    </div>
  );
};
```

#### **4. Add to ToolRouter.tsx**

```typescript
// In ToolRouter.tsx:
'puffPrint': <PuffSettings />, // Render settings panel
```

#### **5. Add to RightPanelCompact.tsx**

```typescript
// In RightPanelCompact.tsx, add puff settings:
{activeTool === 'puffPrint' && (
  <PuffSettings />
)}
```

---

## 🔄 Undo/Redo Integration

The layer system already supports undo/redo via `saveSnapshot()`. The puff tool will automatically work with undo/redo by:

1. **Calling `saveSnapshot()` before each operation:**
   - Before starting a new stroke (continuous mode)
   - Before placing each discrete puff (discrete mode)

2. **Using layer system's built-in undo/redo:**
   - `useAdvancedLayerStoreV2.getState().undo()`
   - `useAdvancedLayerStoreV2.getState().redo()`
   - Works automatically with layer canvas changes

3. **Restoring displacement maps on undo:**
   - Need to regenerate displacement maps when undoing
   - Store displacement canvas state in layer snapshot if needed

---

## 📐 Displacement Map Updates

### **When to Update Displacement:**
- **During drawing (continuous mode):** Throttled updates (~60fps max)
- **After each discrete puff:** Immediate update
- **After stroke ends:** Final update
- **On undo/redo:** Regenerate from layer content

### **How to Update:**
```typescript
// After drawing puff on layer canvas:
const { updateModelTexture } = useApp.getState();
updateModelTexture(false, true); // forceDisplacement = true

// In updateModelTexture:
// 1. Compose layers (gets puff color from layer canvas)
// 2. Regenerate displacement map from layer content
// 3. Apply displacement map to model material
// 4. Apply material properties based on texture type
```

---

## 🎨 Real-Time Performance

### **Optimization Strategies:**

1. **Throttle Updates:**
   - Use `requestAnimationFrame` for displacement updates
   - Max 60fps during continuous drawing

2. **Optimize Dome Calculations:**
   - Pre-calculate dome profile for common values
   - Cache gradient stops for repeated use

3. **Smart Displacement Updates:**
   - Only update affected regions of displacement map
   - Use dirty rectangles for partial updates

4. **Layer Canvas Updates:**
   - Use existing layer system (already optimized)
   - Compose layers only when needed

---

## ✅ Implementation Checklist

### **Phase 1: Core Functions (2-3 hours)**
- [ ] Create `puffDisplacement.ts` with dome profile calculations
- [ ] Create `puffRendering.ts` with canvas drawing functions
- [ ] Create `puffMaterials.ts` with material presets
- [ ] Create `puffTypes.ts` with TypeScript interfaces
- [ ] Test functions in isolation

### **Phase 2: Integration (3-4 hours)**
- [ ] Add puff state to `App.tsx` store
- [ ] Add puff tool handling to `paintAtEvent` in `ShirtRefactored.tsx`
- [ ] Implement continuous mode drawing
- [ ] Implement discrete mode drawing
- [ ] Integrate with displacement map system

### **Phase 3: UI Components (2-3 hours)**
- [ ] Create `PuffSettings.tsx` component
- [ ] Add settings panel to `RightPanelCompact.tsx`
- [ ] Add to `ToolRouter.tsx`
- [ ] Style settings panel

### **Phase 4: Undo/Redo & Polish (2-3 hours)**
- [ ] Integrate undo/redo snapshots
- [ ] Test undo/redo with puff operations
- [ ] Add material texture application
- [ ] Performance optimization
- [ ] Testing and bug fixes

### **Phase 5: Testing (1-2 hours)**
- [ ] Test continuous mode
- [ ] Test discrete mode
- [ ] Test all settings
- [ ] Test undo/redo
- [ ] Test real-time performance
- [ ] Test layer integration

**Total Estimated Time: 10-15 hours**

---

## 🎯 Success Criteria

### **MVP Must Have:**
- ✅ User can select puff tool
- ✅ Default mode: Continuous (can switch to discrete)
- ✅ User can draw puffs (both modes)
- ✅ Puffs appear on model with 3D displacement
- ✅ Settings work (height, softness, size, color, opacity, texture, blend mode)
- ✅ Smooth dome shapes (not conical)
- ✅ Continuous flow (no hard edges between puffs)
- ✅ Realistic height range (0.2-1.0mm)
- ✅ Real-time visual feedback
- ✅ Undo/redo support
- ✅ Works on same layer as other tools
- ✅ Blend modes for controlling how puffs blend with underlying content
- ✅ Material application toggle (all puffs vs current stroke)
- ✅ Layer z-index/ordering handles puff position relative to other content

### **Nice to Have (Post-MVP):**
- [ ] Additional texture types
- [ ] Preset configurations
- [ ] Preview mode
- [ ] Pattern support (dots, stripes)
- [ ] Export displacement maps

---

## 📚 References

### **Real Puff Printing:**
- Heat-activated ink that expands to create 3D raised effects
- Typical thickness: 0.3-0.5mm
- Smooth, dome-like elevations
- Continuous flow in designs
- Various texture finishes available

### **Technical References:**
- Three.js displacement mapping
- Canvas 2D API for rendering
- Cosine interpolation for smooth profiles
- UV coordinate systems
- Layer composition systems

---

**Status:** 📋 **PLAN COMPLETE - READY FOR IMPLEMENTATION**

**Next Action:** Start Phase 1 - Create core functions

