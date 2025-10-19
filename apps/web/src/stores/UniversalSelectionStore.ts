/**
 * 🎯 Universal Selection Store
 * 
 * Zustand store for managing universal selection across all element types
 * Integrates with existing useApp store for seamless operation
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  UniversalElement, 
  SelectionState, 
  SelectionMode, 
  TransformType, 
  BoundingBox,
  SelectionTransform,
  ContextMenuAction,
  SelectableElementType
} from '../types/UniversalSelection';

interface UniversalSelectionStore extends SelectionState {
  // Selection operations
  selectElement: (id: string, mode?: SelectionMode) => boolean;
  selectElements: (ids: string[], mode?: SelectionMode) => boolean;
  deselectElement: (id: string) => boolean;
  deselectAll: () => void;
  toggleElement: (id: string) => boolean;
  
  // Element management
  addElement: (element: UniversalElement) => void;
  updateElement: (id: string, updates: Partial<UniversalElement>) => void;
  removeElement: (id: string) => void;
  getElement: (id: string) => UniversalElement | undefined;
  getAllElements: () => UniversalElement[];
  
  // Selection box (marquee selection)
  startSelectionBox: (x: number, y: number) => void;
  updateSelectionBox: (x: number, y: number) => void;
  endSelectionBox: () => void;
  
  // Transform operations
  startTransform: (type: TransformType, x: number, y: number) => void;
  updateTransform: (x: number, y: number) => void;
  endTransform: () => void;
  applyTransform: (transform: SelectionTransform) => void;
  
  // Group operations
  createGroup: (elementIds: string[]) => string;
  ungroup: (groupId: string) => string[];
  addToGroup: (elementId: string, groupId: string) => void;
  removeFromGroup: (elementId: string) => void;
  
  // Utility functions
  getSelectedElements: () => UniversalElement[];
  getSelectionBounds: () => BoundingBox | null;
  hitTest: (x: number, y: number) => UniversalElement | null;
  hitTestMultiple: (x: number, y: number) => UniversalElement[];
  
  // Context menu
  getContextMenuActions: (elements: UniversalElement[]) => ContextMenuAction[];
  
  // Settings
  setSelectionMode: (mode: SelectionMode) => void;
  setMultiSelectEnabled: (enabled: boolean) => void;
  
  // Integration with existing stores
  syncWithExistingStores: () => void;
}

export const useUniversalSelection = create<UniversalSelectionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedElements: new Map(),
    selectedIds: new Set(),
    activeElementId: null,
    selectionMode: 'replace',
    multiSelectEnabled: true,
    isTransforming: false,
    transformType: null,
    transformOrigin: null,
    transformStart: null,
    selectionBox: null,
    isSelecting: false,
    selectionBoxStart: null,
    hoveredElementId: null,
    groups: new Map(),

    // Selection operations
    selectElement: (id: string, mode: SelectionMode = 'replace') => {
      const element = get().selectedElements.get(id);
      if (!element || element.locked) return false;

      const state = get();
      
      switch (mode) {
        case 'replace':
          state.selectedElements.clear();
          state.selectedIds.clear();
          state.selectedElements.set(id, element);
          state.selectedIds.add(id);
          break;
        case 'add':
          if (!state.selectedIds.has(id)) {
            state.selectedElements.set(id, element);
            state.selectedIds.add(id);
          }
          break;
        case 'subtract':
          state.selectedElements.delete(id);
          state.selectedIds.delete(id);
          break;
        case 'intersect':
          if (state.selectedIds.has(id)) {
            state.selectedElements.clear();
            state.selectedIds.clear();
            state.selectedElements.set(id, element);
            state.selectedIds.add(id);
          } else {
            state.selectedElements.clear();
            state.selectedIds.clear();
          }
          break;
        case 'toggle':
          if (state.selectedIds.has(id)) {
            state.selectedElements.delete(id);
            state.selectedIds.delete(id);
          } else {
            state.selectedElements.set(id, element);
            state.selectedIds.add(id);
          }
          break;
      }

      set({
        selectedElements: new Map(state.selectedElements),
        selectedIds: new Set(state.selectedIds),
        activeElementId: state.selectedIds.size === 1 ? id : state.activeElementId
      });

      return true;
    },

    selectElements: (ids: string[], mode: SelectionMode = 'replace') => {
      const state = get();
      const elements = new Map(state.selectedElements);
      const selectedIds = new Set(state.selectedIds);

      if (mode === 'replace') {
        elements.clear();
        selectedIds.clear();
      }

      for (const id of ids) {
        const element = state.selectedElements.get(id);
        if (element && !element.locked) {
          if (mode === 'subtract') {
            elements.delete(id);
            selectedIds.delete(id);
          } else {
            elements.set(id, element);
            selectedIds.add(id);
          }
        }
      }

      set({
        selectedElements: elements,
        selectedIds: selectedIds,
        activeElementId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
      });

      return true;
    },

    deselectElement: (id: string) => {
      const state = get();
      const elements = new Map(state.selectedElements);
      const selectedIds = new Set(state.selectedIds);
      
      elements.delete(id);
      selectedIds.delete(id);

      set({
        selectedElements: elements,
        selectedIds: selectedIds,
        activeElementId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
      });

      return true;
    },

    deselectAll: () => {
      set({
        selectedElements: new Map(),
        selectedIds: new Set(),
        activeElementId: null,
        isTransforming: false,
        transformType: null,
        transformOrigin: null,
        transformStart: null
      });
    },

    toggleElement: (id: string) => {
      return get().selectElement(id, 'toggle');
    },

    // Element management
    addElement: (element: UniversalElement) => {
      const state = get();
      const elements = new Map(state.selectedElements);
      elements.set(element.id, element);
      
      set({ selectedElements: elements });
    },

    updateElement: (id: string, updates: Partial<UniversalElement>) => {
      const state = get();
      const element = state.selectedElements.get(id);
      if (!element) return;

      const updatedElement = { ...element, ...updates };
      const elements = new Map(state.selectedElements);
      elements.set(id, updatedElement);
      
      set({ selectedElements: elements });
    },

    removeElement: (id: string) => {
      const state = get();
      const elements = new Map(state.selectedElements);
      const selectedIds = new Set(state.selectedIds);
      
      elements.delete(id);
      selectedIds.delete(id);

      set({
        selectedElements: elements,
        selectedIds: selectedIds,
        activeElementId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
      });
    },

    getElement: (id: string) => {
      return get().selectedElements.get(id);
    },

    getAllElements: () => {
      return Array.from(get().selectedElements.values());
    },

    // Selection box (marquee selection)
    startSelectionBox: (x: number, y: number) => {
      set({
        isSelecting: true,
        selectionBoxStart: { x, y },
        selectionBox: { x, y, width: 0, height: 0 }
      });
    },

    updateSelectionBox: (x: number, y: number) => {
      const state = get();
      if (!state.selectionBoxStart) return;

      const startX = Math.min(state.selectionBoxStart.x, x);
      const startY = Math.min(state.selectionBoxStart.y, y);
      const width = Math.abs(x - state.selectionBoxStart.x);
      const height = Math.abs(y - state.selectionBoxStart.y);

      set({
        selectionBox: { x: startX, y: startY, width, height }
      });
    },

    endSelectionBox: () => {
      const state = get();
      if (!state.selectionBox) {
        set({ isSelecting: false, selectionBoxStart: null, selectionBox: null });
        return;
      }

      // Find elements that intersect with the selection box
      const intersectingElements: string[] = [];
      for (const [id, element] of state.selectedElements) {
        if (state.selectionBox && (get() as any).elementIntersectsBox(element, state.selectionBox)) { // FIXED: method doesn't exist
          intersectingElements.push(id);
        }
      }

      // Select intersecting elements
      if (intersectingElements.length > 0) {
        get().selectElements(intersectingElements, state.selectionMode);
      }

      set({ isSelecting: false, selectionBoxStart: null, selectionBox: null });
    },

    // Transform operations
    startTransform: (type: TransformType, x: number, y: number) => {
      const selectedElements = get().getSelectedElements();
      if (selectedElements.length === 0) return;

      const bounds = (get() as any).calculateSelectionBounds(selectedElements); // FIXED: method doesn't exist
      const origin = bounds ? { x: bounds.centerX || bounds.x + bounds.width / 2, y: bounds.centerY || bounds.y + bounds.height / 2 } : { x, y };

      set({
        isTransforming: true,
        transformType: type,
        transformOrigin: origin,
        transformStart: { x, y }
      });
    },

    updateTransform: (x: number, y: number) => {
      const state = get();
      if (!state.isTransforming || !state.transformStart || !state.transformOrigin) return;

      const deltaX = x - state.transformStart.x;
      const deltaY = y - state.transformStart.y;

      // Apply transform based on type
      const selectedElements = get().getSelectedElements();
      for (const element of selectedElements) {
        // This would be implemented based on transform type
        // For now, just update position for move transforms
        if (state.transformType === 'move') {
          get().updateElement(element.id, {
            bounds: {
              ...element.bounds,
              x: element.bounds.x + deltaX,
              y: element.bounds.y + deltaY
            }
          });
        }
      }

      set({ transformStart: { x, y } });
    },

    endTransform: () => {
      set({
        isTransforming: false,
        transformType: null,
        transformOrigin: null,
        transformStart: null
      });
    },

    applyTransform: (transform: SelectionTransform) => {
      const selectedElements = get().getSelectedElements();
      for (const element of selectedElements) {
        const updatedBounds = {
          ...element.bounds,
          x: element.bounds.x + transform.translateX,
          y: element.bounds.y + transform.translateY,
          width: element.bounds.width * transform.scaleX,
          height: element.bounds.height * transform.scaleY,
          rotation: (element.bounds.rotation || 0) + transform.rotation
        };

        get().updateElement(element.id, { bounds: updatedBounds });
      }
    },

    // Group operations
    createGroup: (elementIds: string[]) => {
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const groups = new Map(get().groups);
      groups.set(groupId, elementIds);
      
      set({ groups });
      return groupId;
    },

    ungroup: (groupId: string) => {
      const groups = new Map(get().groups);
      const elementIds = groups.get(groupId) || [];
      groups.delete(groupId);
      
      set({ groups });
      return elementIds;
    },

    addToGroup: (elementId: string, groupId: string) => {
      const groups = new Map(get().groups);
      const groupElements = groups.get(groupId) || [];
      if (!groupElements.includes(elementId)) {
        groupElements.push(elementId);
        groups.set(groupId, groupElements);
      }
      
      set({ groups });
    },

    removeFromGroup: (elementId: string) => {
      const groups = new Map(get().groups);
      for (const [groupId, elementIds] of groups) {
        const index = elementIds.indexOf(elementId);
        if (index !== -1) {
          elementIds.splice(index, 1);
          if (elementIds.length === 0) {
            groups.delete(groupId);
          }
          break;
        }
      }
      
      set({ groups });
    },

    // Utility functions
    getSelectedElements: () => {
      const state = get();
      return Array.from(state.selectedElements.values()).filter(element => 
        state.selectedIds.has(element.id)
      );
    },

    getSelectionBounds: () => {
      const selectedElements = get().getSelectedElements();
      return (get() as any).calculateSelectionBounds(selectedElements); // FIXED: method doesn't exist
    },

    hitTest: (x: number, y: number) => {
      const elements = get().getAllElements();
      // Sort by z-index (highest first)
      const sortedElements = elements.sort((a, b) => b.zIndex - a.zIndex);
      
      for (const element of sortedElements) {
        if ((get() as any).pointInBounds(x, y, element.bounds)) { // FIXED: method doesn't exist
          return element;
        }
      }
      
      return null;
    },

    hitTestMultiple: (x: number, y: number) => {
      const elements = get().getAllElements();
      return elements.filter(element => (get() as any).pointInBounds(x, y, element.bounds)); // FIXED: method doesn't exist
    },

    // Context menu
    getContextMenuActions: (elements: UniversalElement[]) => {
      const actions: ContextMenuAction[] = [
        // Edit category
        {
          id: 'copy',
          label: 'Copy',
          icon: '📋',
          shortcut: 'Ctrl+C',
          category: 'edit',
          enabled: elements.length > 0,
          action: () => console.log('Copy elements')
        },
        {
          id: 'paste',
          label: 'Paste',
          icon: '📋',
          shortcut: 'Ctrl+V',
          category: 'edit',
          enabled: true, // Would check clipboard
          action: () => console.log('Paste elements')
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: '📄',
          shortcut: 'Ctrl+D',
          category: 'edit',
          enabled: elements.length > 0,
          action: () => console.log('Duplicate elements')
        },
        
        // Transform category
        {
          id: 'rotate_90',
          label: 'Rotate 90°',
          icon: '🔄',
          category: 'transform',
          enabled: elements.length > 0,
          action: () => get().applyTransform({ translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: Math.PI / 2, skewX: 0, skewY: 0 })
        },
        {
          id: 'flip_horizontal',
          label: 'Flip Horizontal',
          icon: '↔️',
          category: 'transform',
          enabled: elements.length > 0,
          action: () => get().applyTransform({ translateX: 0, translateY: 0, scaleX: -1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 })
        },
        {
          id: 'flip_vertical',
          label: 'Flip Vertical',
          icon: '↕️',
          category: 'transform',
          enabled: elements.length > 0,
          action: () => get().applyTransform({ translateX: 0, translateY: 0, scaleX: 1, scaleY: -1, rotation: 0, skewX: 0, skewY: 0 })
        },
        
        // Arrange category
        {
          id: 'bring_to_front',
          label: 'Bring to Front',
          icon: '⬆️',
          category: 'arrange',
          enabled: elements.length > 0,
          action: () => console.log('Bring to front')
        },
        {
          id: 'send_to_back',
          label: 'Send to Back',
          icon: '⬇️',
          category: 'arrange',
          enabled: elements.length > 0,
          action: () => console.log('Send to back')
        },
        
        // Group category
        {
          id: 'group',
          label: 'Group',
          icon: '📦',
          shortcut: 'Ctrl+G',
          category: 'group',
          enabled: elements.length > 1,
          action: () => {
            const elementIds = elements.map(el => el.id);
            get().createGroup(elementIds);
          }
        },
        {
          id: 'ungroup',
          label: 'Ungroup',
          icon: '📦',
          shortcut: 'Ctrl+Shift+G',
          category: 'group',
          enabled: elements.length === 1 && elements[0].groupId !== undefined,
          action: () => {
            if (elements[0].groupId) {
              get().ungroup(elements[0].groupId);
            }
          }
        },
        
        // Delete category
        {
          id: 'delete',
          label: 'Delete',
          icon: '🗑️',
          shortcut: 'Delete',
          category: 'delete',
          enabled: elements.length > 0,
          action: () => {
            for (const element of elements) {
              get().removeElement(element.id);
            }
          }
        }
      ];

      return actions;
    },

    // Settings
    setSelectionMode: (mode: SelectionMode) => {
      set({ selectionMode: mode });
    },

    setMultiSelectEnabled: (enabled: boolean) => {
      set({ multiSelectEnabled: enabled });
    },

    // Integration with existing stores
    syncWithExistingStores: () => {
      // This would sync with the existing useApp store
      // Implementation would depend on how the existing store is structured
      console.log('Syncing with existing stores...');
    },

    // Helper methods
    elementIntersectsBox: (element: UniversalElement, box: BoundingBox): boolean => {
      const elementBounds = element.bounds;
      return !(elementBounds.x + elementBounds.width < box.x ||
               elementBounds.x > box.x + box.width ||
               elementBounds.y + elementBounds.height < box.y ||
               elementBounds.y > box.y + box.height);
    },

    pointInBounds: (x: number, y: number, bounds: BoundingBox): boolean => {
      return x >= bounds.x && x <= bounds.x + bounds.width &&
             y >= bounds.y && y <= bounds.y + bounds.height;
    },

    calculateSelectionBounds: (elements: UniversalElement[]): BoundingBox | null => {
      if (elements.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const element of elements) {
        const bounds = element.bounds;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
      };
    }
  }))
);
