/**
 * SIMPLIFIED LAYER SYSTEM
 * 
 * Clean, minimal layer system that actually works.
 * Replaces the overengineered 2912-line AdvancedLayerSystemV2.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createLayerCanvas } from '../constants/CanvasSizes';

// ============================================================================
// SIMPLE TYPES - Only what we actually need
// ============================================================================

export type LayerType = 'paint' | 'text' | 'image' | 'group' | 'adjustment';

export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
  | 'color-dodge' | 'color-burn' | 'darken' | 'lighten' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export interface BrushStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
  timestamp: number;
}

export interface TextContent {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface ImageContent {
  imageData: string; // Base64 or URL
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface AdjustmentContent {
  type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'levels' | 'curves';
  value: number;
  settings?: Record<string, any>;
}

// ============================================================================
// SIMPLE LAYER INTERFACE
// ============================================================================

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  transform: Transform;
  order: number;
  
  // Content - only one type per layer
  content: {
    // For paint layers
    canvas?: HTMLCanvasElement;
    brushStrokes?: BrushStroke[];
    
    // For text layers
    text?: TextContent;
    
    // For image layers
    image?: ImageContent;
    
    // For adjustment layers
    adjustment?: AdjustmentContent;
    
    // For group layers
    children?: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SIMPLE STORE INTERFACE
// ============================================================================

interface SimplifiedLayerStore {
  // Core state
  layers: Layer[];
  layerOrder: string[];
  selectedLayerIds: string[];
  activeLayerId: string | null;
  
  // Actions
  createLayer: (type: LayerType, name?: string) => string;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string;
  renameLayer: (id: string, name: string) => void;
  
  // Selection
  selectLayer: (id: string, multi?: boolean) => void;
  selectLayers: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveLayer: (id: string) => void;
  
  // Properties
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  setLayerTransform: (id: string, transform: Partial<Transform>) => void;
  
  // Ordering
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
  reorderLayers: (newOrder: string[]) => void;
  
  // Content management
  updateLayerContent: (id: string, content: Partial<Layer['content']>) => void;
  addBrushStroke: (layerId: string, stroke: BrushStroke) => void;
  removeBrushStroke: (layerId: string, strokeId: string) => void;
  
  // Groups
  createGroup: (name?: string) => string;
  addToGroup: (layerId: string, groupId: string) => void;
  removeFromGroup: (layerId: string) => void;
  
  // Composition
  composeLayers: () => HTMLCanvasElement | null;
  
  // Image management (simplified)
  addImageToLayer: (layerId: string, imageData: string, width: number, height: number) => void;
  getAllImageLayers: () => Layer[];
  
  // Text management (simplified)
  addTextToLayer: (layerId: string, text: string, font: string, fontSize: number, color: string) => void;
  getAllTextLayers: () => Layer[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createDefaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  skewX: 0,
  skewY: 0
});

const generateLayerName = (type: LayerType, existingLayers: Layer[]): string => {
  const typeNames = {
    paint: 'Paint',
    text: 'Text',
    image: 'Image',
    group: 'Group',
    adjustment: 'Adjustment'
  };
  
  const baseName = typeNames[type];
  const existingNames = existingLayers.map(l => l.name);
  
  let counter = 1;
  let name = baseName;
  
  while (existingNames.includes(name)) {
    name = `${baseName} ${counter}`;
    counter++;
  }
  
  return name;
};

// ============================================================================
// SIMPLIFIED LAYER STORE
// ============================================================================

export const useSimplifiedLayerStore = create<SimplifiedLayerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    layers: [],
    layerOrder: [],
    selectedLayerIds: [],
    activeLayerId: null,
    
    // Layer creation
    createLayer: (type: LayerType, name?: string) => {
      const state = get();
      const layerName = name || generateLayerName(type, state.layers);
      const newOrder = state.layerOrder.length;
      
      const newLayer: Layer = {
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: layerName,
        type,
        visible: true,
        opacity: 1.0,
        blendMode: 'normal',
        locked: false,
        transform: createDefaultTransform(),
        order: newOrder,
        content: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Initialize content based on type
      if (type === 'paint') {
        newLayer.content.canvas = createLayerCanvas();
        newLayer.content.brushStrokes = [];
      } else if (type === 'group') {
        newLayer.content.children = [];
      }
      
      set(state => ({
        layers: [...state.layers, newLayer],
        layerOrder: [...state.layerOrder, newLayer.id],
        activeLayerId: newLayer.id,
        selectedLayerIds: [newLayer.id]
      }));
      
      console.log(`🎨 Created new ${type} layer: ${layerName}`, newLayer);
      return newLayer.id;
    },
    
    // Layer deletion
    deleteLayer: (id: string) => {
      set(state => ({
        layers: state.layers.filter(layer => layer.id !== id),
        layerOrder: state.layerOrder.filter(layerId => layerId !== id),
        selectedLayerIds: state.selectedLayerIds.filter(layerId => layerId !== id),
        activeLayerId: state.activeLayerId === id ? null : state.activeLayerId
      }));
      
      console.log(`🎨 Deleted layer: ${id}`);
    },
    
    // Layer duplication
    duplicateLayer: (id: string) => {
      const state = get();
      const originalLayer = state.layers.find(l => l.id === id);
      if (!originalLayer) return '';
      
      const duplicatedLayer: Layer = {
        ...originalLayer,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${originalLayer.name} Copy`,
        order: state.layerOrder.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Deep copy content
      duplicatedLayer.content = { ...originalLayer.content };
      if (originalLayer.content.canvas) {
        // Create new canvas and copy content
        duplicatedLayer.content.canvas = createLayerCanvas();
        const ctx = duplicatedLayer.content.canvas!.getContext('2d')!;
        ctx.drawImage(originalLayer.content.canvas, 0, 0);
      }
      
      set(state => ({
        layers: [...state.layers, duplicatedLayer],
        layerOrder: [...state.layerOrder, duplicatedLayer.id],
        activeLayerId: duplicatedLayer.id,
        selectedLayerIds: [duplicatedLayer.id]
      }));
      
      console.log(`🎨 Duplicated layer: ${originalLayer.name} -> ${duplicatedLayer.name}`);
      return duplicatedLayer.id;
    },
    
    // Layer renaming
    renameLayer: (id: string, name: string) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { ...layer, name, updatedAt: new Date() } : layer
        )
      }));
      
      console.log(`🎨 Renamed layer ${id} to: ${name}`);
    },
    
    // Selection
    selectLayer: (id: string, multi = false) => {
      set(state => ({
        selectedLayerIds: multi 
          ? [...state.selectedLayerIds, id]
          : [id],
        activeLayerId: id
      }));
    },
    
    selectLayers: (ids: string[]) => {
      set(state => ({
        selectedLayerIds: ids,
        activeLayerId: ids[0] || null
      }));
    },
    
    clearSelection: () => {
      set(state => ({
        selectedLayerIds: [],
        activeLayerId: null
      }));
    },
    
    setActiveLayer: (id: string) => {
      set(state => ({
        activeLayerId: id,
        selectedLayerIds: state.selectedLayerIds.includes(id) 
          ? state.selectedLayerIds 
          : [...state.selectedLayerIds, id]
      }));
    },
    
    // Properties
    setLayerVisibility: (id: string, visible: boolean) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { ...layer, visible, updatedAt: new Date() } : layer
        )
      }));
    },
    
    setLayerOpacity: (id: string, opacity: number) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { ...layer, opacity, updatedAt: new Date() } : layer
        )
      }));
    },
    
    setLayerBlendMode: (id: string, blendMode: BlendMode) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { ...layer, blendMode, updatedAt: new Date() } : layer
        )
      }));
    },
    
    setLayerLocked: (id: string, locked: boolean) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id ? { ...layer, locked, updatedAt: new Date() } : layer
        )
      }));
    },
    
    setLayerTransform: (id: string, transform: Partial<Transform>) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id 
            ? { ...layer, transform: { ...layer.transform, ...transform }, updatedAt: new Date() }
            : layer
        )
      }));
    },
    
    // Ordering
    moveLayerUp: (id: string) => {
      const state = get();
      const currentIndex = state.layerOrder.indexOf(id);
      if (currentIndex < state.layerOrder.length - 1) {
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        
        set({ layerOrder: newOrder });
        console.log(`🎨 Moved layer ${id} up`);
      }
    },
    
    moveLayerDown: (id: string) => {
      const state = get();
      const currentIndex = state.layerOrder.indexOf(id);
      if (currentIndex > 0) {
        const newOrder = [...state.layerOrder];
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        
        set({ layerOrder: newOrder });
        console.log(`🎨 Moved layer ${id} down`);
      }
    },
    
    moveLayerToTop: (id: string) => {
      const state = get();
      const newOrder = state.layerOrder.filter(layerId => layerId !== id);
      newOrder.push(id);
      
      set({ layerOrder: newOrder });
      console.log(`🎨 Moved layer ${id} to top`);
    },
    
    moveLayerToBottom: (id: string) => {
      const state = get();
      const newOrder = state.layerOrder.filter(layerId => layerId !== id);
      newOrder.unshift(id);
      
      set({ layerOrder: newOrder });
      console.log(`🎨 Moved layer ${id} to bottom`);
    },
    
    reorderLayers: (newOrder: string[]) => {
      set({ layerOrder: newOrder });
      console.log(`🎨 Reordered layers:`, newOrder);
    },
    
    // Content management
    updateLayerContent: (id: string, content: Partial<Layer['content']>) => {
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === id 
            ? { ...layer, content: { ...layer.content, ...content }, updatedAt: new Date() }
            : layer
        )
      }));
      
      console.log(`🎨 Updated content for layer ${id}:`, content);
    },
    
    addBrushStroke: (layerId: string, stroke: BrushStroke) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && layer.type === 'paint') {
        const updatedStrokes = [...(layer.content.brushStrokes || []), stroke];
        get().updateLayerContent(layerId, { brushStrokes: updatedStrokes });
        console.log(`🎨 Added brush stroke to layer ${layerId}`);
      }
    },
    
    removeBrushStroke: (layerId: string, strokeId: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && layer.type === 'paint') {
        const updatedStrokes = (layer.content.brushStrokes || []).filter(s => s.id !== strokeId);
        get().updateLayerContent(layerId, { brushStrokes: updatedStrokes });
        console.log(`🎨 Removed brush stroke ${strokeId} from layer ${layerId}`);
      }
    },
    
    // Groups
    createGroup: (name?: string) => {
      return get().createLayer('group', name);
    },
    
    addToGroup: (layerId: string, groupId: string) => {
      const state = get();
      const group = state.layers.find(l => l.id === groupId);
      if (group && group.type === 'group') {
        const updatedChildren = [...(group.content.children || []), layerId];
        get().updateLayerContent(groupId, { children: updatedChildren });
        console.log(`🎨 Added layer ${layerId} to group ${groupId}`);
      }
    },
    
    removeFromGroup: (layerId: string) => {
      const state = get();
      const groups = state.layers.filter(l => l.type === 'group');
      
      groups.forEach(group => {
        if (group.content.children?.includes(layerId)) {
          const updatedChildren = group.content.children.filter(id => id !== layerId);
          get().updateLayerContent(group.id, { children: updatedChildren });
          console.log(`🎨 Removed layer ${layerId} from group ${group.id}`);
        }
      });
    },
    
    // Composition
    composeLayers: () => {
      const state = get();
      const canvas = createLayerCanvas();
      const ctx = canvas.getContext('2d')!;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw layers in order
      state.layerOrder.forEach(layerId => {
        const layer = state.layers.find(l => l.id === layerId);
        if (!layer || !layer.visible) return;
        
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
        
        // Apply transform
        const { x, y, scaleX, scaleY, rotation, skewX, skewY } = layer.transform;
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(scaleX, scaleY);
        ctx.transform(1, skewY, skewX, 1, 0, 0);
        
        // Draw content based on type
        if (layer.type === 'paint' && layer.content.canvas) {
          ctx.drawImage(layer.content.canvas, 0, 0);
        } else if (layer.type === 'image' && layer.content.image) {
          const img = new Image();
          img.src = layer.content.image.imageData;
          ctx.drawImage(img, 0, 0, layer.content.image.width, layer.content.image.height);
        } else if (layer.type === 'text' && layer.content.text) {
          const { text, font, fontSize, color } = layer.content.text;
          ctx.font = `${fontSize}px ${font}`;
          ctx.fillStyle = color;
          ctx.fillText(text, 0, 0);
        }
        
        ctx.restore();
      });
      
      console.log(`🎨 Composed ${state.layers.length} layers`);
      return canvas;
    },
    
    // Image management (simplified)
    addImageToLayer: (layerId: string, imageData: string, width: number, height: number) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && layer.type === 'image') {
        // Get natural dimensions from image
        const img = new Image();
        img.onload = () => {
          get().updateLayerContent(layerId, {
            image: {
              imageData,
              width,
              height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            }
          });
          console.log(`🎨 Added image to layer ${layerId}`);
        };
        img.src = imageData;
      }
    },
    
    getAllImageLayers: () => {
      const state = get();
      return state.layers.filter(layer => layer.type === 'image');
    },
    
    // Text management (simplified)
    addTextToLayer: (layerId: string, text: string, font: string, fontSize: number, color: string) => {
      const state = get();
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && layer.type === 'text') {
        get().updateLayerContent(layerId, {
          text: { text, font, fontSize, color }
        });
        console.log(`🎨 Added text to layer ${layerId}`);
      }
    },
    
    getAllTextLayers: () => {
      const state = get();
      return state.layers.filter(layer => layer.type === 'text');
    }
  }))
);

// ============================================================================
// BACKWARD COMPATIBILITY HELPERS
// ============================================================================

// For components that still expect the old interface
export const useAdvancedLayerStoreV2 = useSimplifiedLayerStore;
