/**
 * SimpleTextTool - A robust, simplified text tool system
 * Bypasses complex layer systems for direct, reliable text management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Simple text element interface
export interface SimpleTextElement {
  id: string;
  text: string;
  x: number; // Canvas pixel coordinates
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  rotation: number;
  visible: boolean;
  selected: boolean;
  timestamp: number;
}

// Text tool state interface
interface SimpleTextToolState {
  // Core state
  textElements: SimpleTextElement[];
  activeTextId: string | null;
  isCreating: boolean;
  
  // Canvas reference
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  
  // Actions
  setCanvas: (canvas: HTMLCanvasElement) => void;
  addTextElement: (text: string, x: number, y: number) => string;
  updateTextElement: (id: string, updates: Partial<SimpleTextElement>) => void;
  deleteTextElement: (id: string) => void;
  selectTextElement: (id: string | null) => void;
  getTextElementAt: (x: number, y: number) => SimpleTextElement | null;
  renderTextElements: () => void;
  clearSelection: () => void;
  
  // Utility functions
  getSelectedText: () => SimpleTextElement | null;
  getAllTextElements: () => SimpleTextElement[];
}

// Create the simple text tool store
export const useSimpleTextTool = create<SimpleTextToolState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    textElements: [],
    activeTextId: null,
    isCreating: false,
    canvas: null,
    ctx: null,
    
    // Set canvas reference
    setCanvas: (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      set({ canvas, ctx });
      console.log('🎨 SimpleTextTool: Canvas set', { width: canvas.width, height: canvas.height });
    },
    
    // Add new text element
    addTextElement: (text: string, x: number, y: number) => {
      const id = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newElement: SimpleTextElement = {
        id,
        text,
        x,
        y,
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        opacity: 1,
        rotation: 0,
        visible: true,
        selected: true,
        timestamp: Date.now()
      };
      
      set(state => ({
        textElements: [...state.textElements, newElement],
        activeTextId: id,
        isCreating: false
      }));
      
      console.log('🎨 SimpleTextTool: Added text element', { id, text, x, y });
      
      // Trigger re-render
      get().renderTextElements();
      
      return id;
    },
    
    // Update text element
    updateTextElement: (id: string, updates: Partial<SimpleTextElement>) => {
      set(state => ({
        textElements: state.textElements.map(element =>
          element.id === id ? { ...element, ...updates } : element
        )
      }));
      
      console.log('🎨 SimpleTextTool: Updated text element', { id, updates });
      
      // Trigger re-render
      get().renderTextElements();
    },
    
    // Delete text element
    deleteTextElement: (id: string) => {
      set(state => ({
        textElements: state.textElements.filter(element => element.id !== id),
        activeTextId: state.activeTextId === id ? null : state.activeTextId
      }));
      
      console.log('🎨 SimpleTextTool: Deleted text element', { id });
      
      // Trigger re-render
      get().renderTextElements();
    },
    
    // Select text element
    selectTextElement: (id: string | null) => {
      set(state => ({
        activeTextId: id,
        textElements: state.textElements.map(element => ({
          ...element,
          selected: element.id === id
        }))
      }));
      
      console.log('🎨 SimpleTextTool: Selected text element', { id });
      
      // Trigger re-render
      get().renderTextElements();
    },
    
    // Get text element at coordinates
    getTextElementAt: (x: number, y: number) => {
      const { textElements } = get();
      
      // Check each text element for hit
      for (const element of textElements) {
        if (!element.visible) continue;
        
        // Simple bounding box hit test
        const padding = 10; // Extra padding for easier clicking
        const textWidth = element.text.length * element.fontSize * 0.6; // Rough estimate
        const textHeight = element.fontSize;
        
        if (x >= element.x - padding &&
            x <= element.x + textWidth + padding &&
            y >= element.y - padding &&
            y <= element.y + textHeight + padding) {
          console.log('🎨 SimpleTextTool: Hit text element', { id: element.id, text: element.text });
          return element;
        }
      }
      
      console.log('🎨 SimpleTextTool: No text element found at', { x, y });
      return null;
    },
    
    // Render all text elements
    renderTextElements: () => {
      const { canvas, ctx, textElements } = get();
      
      if (!canvas || !ctx) {
        console.warn('🎨 SimpleTextTool: No canvas context available for rendering');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render each text element
      textElements.forEach(element => {
        if (!element.visible) return;
        
        ctx.save();
        
        // Set text properties
        ctx.font = `${element.fontSize}px ${element.fontFamily}`;
        ctx.fillStyle = element.color;
        ctx.globalAlpha = element.opacity;
        
        // Apply rotation if needed
        if (element.rotation !== 0) {
          ctx.translate(element.x, element.y);
          ctx.rotate(element.rotation);
          ctx.fillText(element.text, 0, element.fontSize);
        } else {
          ctx.fillText(element.text, element.x, element.y + element.fontSize);
        }
        
        // Draw selection indicator
        if (element.selected) {
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = 2;
          ctx.strokeRect(element.x - 5, element.y - 5, element.text.length * element.fontSize * 0.6 + 10, element.fontSize + 10);
        }
        
        ctx.restore();
      });
      
      console.log('🎨 SimpleTextTool: Rendered', textElements.length, 'text elements');
    },
    
    // Clear selection
    clearSelection: () => {
      set(state => ({
        activeTextId: null,
        textElements: state.textElements.map(element => ({
          ...element,
          selected: false
        }))
      }));
      
      console.log('🎨 SimpleTextTool: Cleared selection');
      
      // Trigger re-render
      get().renderTextElements();
    },
    
    // Get selected text element
    getSelectedText: () => {
      const { textElements, activeTextId } = get();
      return textElements.find(element => element.id === activeTextId) || null;
    },
    
    // Get all text elements
    getAllTextElements: () => {
      return get().textElements;
    }
  }))
);

// Export types
export type { SimpleTextElement, SimpleTextToolState };
