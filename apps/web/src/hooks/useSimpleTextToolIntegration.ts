/**
 * useSimpleTextToolIntegration - React hook for integrating SimpleTextTool with 3D model
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSimpleTextTool } from './SimpleTextTool';
import { useApp } from '../App';

export const useSimpleTextToolIntegration = () => {
  const {
    textElements,
    activeTextId,
    setCanvas,
    addTextElement,
    updateTextElement,
    deleteTextElement,
    selectTextElement,
    getTextElementAt,
    renderTextElements,
    clearSelection,
    getSelectedText,
    getAllTextElements
  } = useSimpleTextTool();
  
  const appState = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Initialize canvas when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [setCanvas]);
  
  // Handle text creation
  const handleTextCreation = useCallback((text: string, uv: { u: number; v: number }) => {
    if (!canvasRef.current) return;
    
    // Convert UV coordinates to canvas coordinates
    const x = Math.floor(uv.u * canvasRef.current.width);
    const y = Math.floor((1 - uv.v) * canvasRef.current.height); // Flip V coordinate
    
    console.log('🎨 SimpleTextTool: Creating text', { text, uv, x, y });
    
    const textId = addTextElement(text, x, y);
    
    // Update the main composed canvas
    if (appState.composedCanvas) {
      const ctx = appState.composedCanvas.getContext('2d');
      if (ctx) {
        const element = getSelectedText();
        if (element) {
          ctx.font = `${element.fontSize}px ${element.fontFamily}`;
          ctx.fillStyle = element.color;
          ctx.globalAlpha = element.opacity;
          ctx.fillText(element.text, element.x, element.y + element.fontSize);
          
          console.log('🎨 SimpleTextTool: Updated composed canvas');
          
          // Trigger texture update
          window.dispatchEvent(new CustomEvent('forceTextureUpdate', {
            detail: { source: 'simple-text-tool' }
          }));
        }
      }
    }
    
    return textId;
  }, [addTextElement, appState.composedCanvas, getSelectedText]);
  
  // Handle text click detection
  const handleTextClick = useCallback((uv: { u: number; v: number }) => {
    if (!canvasRef.current) return null;
    
    // Convert UV coordinates to canvas coordinates
    const x = Math.floor(uv.u * canvasRef.current.width);
    const y = Math.floor((1 - uv.v) * canvasRef.current.height); // Flip V coordinate
    
    console.log('🎨 SimpleTextTool: Checking click at', { uv, x, y });
    
    const clickedElement = getTextElementAt(x, y);
    
    if (clickedElement) {
      selectTextElement(clickedElement.id);
      console.log('🎨 SimpleTextTool: Selected text element', { id: clickedElement.id, text: clickedElement.text });
      return clickedElement;
    } else {
      clearSelection();
      console.log('🎨 SimpleTextTool: No text element clicked, cleared selection');
      return null;
    }
  }, [getTextElementAt, selectTextElement, clearSelection]);
  
  // Handle text updates
  const handleTextUpdate = useCallback((id: string, updates: Partial<any>) => {
    updateTextElement(id, updates);
    
    // Update the main composed canvas
    if (appState.composedCanvas) {
      const ctx = appState.composedCanvas.getContext('2d');
      if (ctx) {
        // Re-render all text elements
        const allElements = getAllTextElements();
        allElements.forEach(element => {
          if (element.visible) {
            ctx.font = `${element.fontSize}px ${element.fontFamily}`;
            ctx.fillStyle = element.color;
            ctx.globalAlpha = element.opacity;
            ctx.fillText(element.text, element.x, element.y + element.fontSize);
          }
        });
        
        console.log('🎨 SimpleTextTool: Updated composed canvas with all text elements');
        
        // Trigger texture update
        window.dispatchEvent(new CustomEvent('forceTextureUpdate', {
          detail: { source: 'simple-text-tool-update' }
        }));
      }
    }
  }, [updateTextElement, appState.composedCanvas, getAllTextElements]);
  
  // Handle text deletion
  const handleTextDelete = useCallback((id: string) => {
    deleteTextElement(id);
    
    // Update the main composed canvas
    if (appState.composedCanvas) {
      const ctx = appState.composedCanvas.getContext('2d');
      if (ctx) {
        // Re-render all text elements
        const allElements = getAllTextElements();
        allElements.forEach(element => {
          if (element.visible) {
            ctx.font = `${element.fontSize}px ${element.fontFamily}`;
            ctx.fillStyle = element.color;
            ctx.globalAlpha = element.opacity;
            ctx.fillText(element.text, element.x, element.y + element.fontSize);
          }
        });
        
        console.log('🎨 SimpleTextTool: Updated composed canvas after deletion');
        
        // Trigger texture update
        window.dispatchEvent(new CustomEvent('forceTextureUpdate', {
          detail: { source: 'simple-text-tool-delete' }
        }));
      }
    }
  }, [deleteTextElement, appState.composedCanvas, getAllTextElements]);
  
  return {
    // State
    textElements,
    activeTextId,
    canvasRef,
    
    // Actions
    handleTextCreation,
    handleTextClick,
    handleTextUpdate,
    handleTextDelete,
    
    // Direct access to store methods
    selectTextElement,
    clearSelection,
    getSelectedText,
    getAllTextElements,
    renderTextElements
  };
};
