/**
 * 🎈 UNIFIED PUFF PRINT SYSTEM
 * 
 * A complete rebuild of the puff print system with:
 * - Single source of truth for all puff operations
 * - Performance-optimized displacement mapping
 * - Real-time 3D preview
 * - Multi-layer support
 * - Web Worker integration
 * - Modern UI with glassmorphism design
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { PuffDisplacementEngine } from '../core/PuffDisplacementEngine';
import { PuffPreviewRenderer } from '../core/PuffPreviewRenderer';
import { PuffPatternLibrary } from '../core/PuffPatternLibrary';
import { PuffMemoryManager } from '../core/PuffMemoryManager';
import '../styles/UnifiedPuffPrintSystem.css';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PuffLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  order: number;
  canvas: HTMLCanvasElement;
  displacementCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  needsUpdate: boolean;
  createdAt: number;
  modifiedAt: number;
}

export interface PuffSettings {
  height: number;        // 0.1 - 5.0
  softness: number;      // 0.0 - 1.0
  color: string;         // Hex color
  opacity: number;       // 0.0 - 1.0
  brushSize: number;    // 5 - 200px
  brushFlow: number;     // 0.0 - 1.0
  brushSpacing: number; // 0.0 - 1.0
  pattern: string;       // Pattern ID
  patternScale: number;  // 0.1 - 3.0
  patternRotation: number; // 0 - 360 degrees
}

export interface PuffPreviewSettings {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  lighting: 'studio' | 'natural' | 'dramatic';
  cameraAngle: 'front' | 'side' | 'top' | 'free';
  showWireframe: boolean;
  showNormals: boolean;
}

interface UnifiedPuffPrintSystemProps {
  active: boolean;
  onError?: (error: Error) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedPuffPrintSystem({ active, onError }: UnifiedPuffPrintSystemProps) {
  const { 
    modelScene, 
    composedCanvas, 
    activeTool,
    // Puff settings from global state
    puffBrushSize,
    puffBrushOpacity,
    puffHeight,
    puffSoftness,
    puffOpacity,
    puffColor,
    puffCurvature,
    puffShape,
    setPuffBrushSize,
    setPuffBrushOpacity,
    setPuffHeight,
    setPuffSoftness,
    setPuffOpacity,
    setPuffColor,
    setPuffCurvature,
    setPuffShape
  } = useApp();
  
  // Use V2 layer system instead of PuffLayerManager
  const { 
    activeLayerId: v2ActiveLayerId, 
    layers, 
    addPuffElementFromApp,
    getLayerCanvas,
    getLayerDisplacementCanvas,
    updateLayerContent
  } = useAdvancedLayerStoreV2();
  
  // Core system refs
  const displacementEngineRef = useRef<PuffDisplacementEngine | null>(null);
  const previewRendererRef = useRef<PuffPreviewRenderer | null>(null);
  const patternLibraryRef = useRef<PuffPatternLibrary | null>(null);
  const memoryManagerRef = useRef<PuffMemoryManager | null>(null);
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPaintTime, setLastPaintTime] = useState(0);
  
  // Pattern and preview settings state
  const [currentPattern, setCurrentPattern] = useState('round');
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [previewQuality, setPreviewQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
  const [previewLighting, setPreviewLighting] = useState<'studio' | 'natural' | 'dramatic'>('studio');
  
  // Performance monitoring
  const [fps, setFps] = useState(60);
  const [isOptimized, setIsOptimized] = useState(true);
  const [memoryUsage, setMemoryUsage] = useState(0);
  
  // Sync with global state
  const puffSettings: PuffSettings = {
    height: puffHeight,
    softness: puffSoftness,
    color: puffColor,
    opacity: puffOpacity,
    brushSize: puffBrushSize,
    brushFlow: 1.0,
    brushSpacing: 0.3,
    pattern: currentPattern,
    patternScale: 1.0,
    patternRotation: 0
  };
  
  const previewSettings: PuffPreviewSettings = {
    enabled: previewEnabled,
    quality: previewQuality,
    lighting: previewLighting,
    cameraAngle: 'front',
    showWireframe: false,
    showNormals: false
  };
  
  // Initialize core systems
  useEffect(() => {
    if (!active || !modelScene || !composedCanvas) return;
    
    try {
      initializeSystems();
    } catch (error) {
      console.error('Failed to initialize puff print system:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [active, modelScene, composedCanvas]);
  
  // Handle puff painting events
  const handlePuffPainting = useCallback((uv: THREE.Vector2, point: THREE.Vector3, originalEvent: any) => {
    if (!displacementEngineRef.current || !v2ActiveLayerId) {
      console.warn('🎈 Puff painting: System not ready');
      return;
    }
    
    console.log('🎈 Processing puff painting at UV:', uv, 'Point:', point);
    
    // Convert UV to canvas coordinates
    const canvasX = Math.floor(uv.x * composedCanvas!.width);
    const canvasY = Math.floor(uv.y * composedCanvas!.height);
    
    // Get the active layer canvas and displacement canvas from V2 system
    const layerCanvas = getLayerCanvas(v2ActiveLayerId);
    const displacementCanvas = getLayerDisplacementCanvas(v2ActiveLayerId);
    
    if (!layerCanvas) {
      console.warn('🎈 Puff painting: No active layer canvas');
      return;
    }
    
    // Create puff effect
    const puffRadius = puffSettings.brushSize / 2;
    const puffHeight = Math.floor(255 * puffSettings.height);
    
    // Draw puff color on the layer canvas
    const layerCtx = layerCanvas.getContext('2d');
    if (layerCtx) {
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.globalAlpha = puffSettings.opacity;
      layerCtx.fillStyle = puffSettings.color;
      layerCtx.beginPath();
      layerCtx.arc(canvasX, canvasY, puffRadius, 0, Math.PI * 2);
      layerCtx.fill();
    }
    
    // Draw displacement on the displacement canvas if available
    if (displacementCanvas) {
      const dispCtx = displacementCanvas.getContext('2d');
      if (dispCtx) {
        dispCtx.globalCompositeOperation = 'lighten'; // Prevent spikes
        
        // Create smooth radial gradient
        const gradient = dispCtx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, puffRadius);
        
        // Ultra-smooth dome using cosine interpolation
        const stops = 12;
        for (let i = 0; i <= stops; i++) {
          const t = i / stops;
          const cosValue = Math.cos((1 - t) * Math.PI / 2);
          const height = Math.floor(puffHeight * cosValue * puffSettings.softness);
          gradient.addColorStop(t, `rgb(${height}, ${height}, ${height})`);
        }
        gradient.addColorStop(1, 'rgb(0, 0, 0)');
        
        dispCtx.fillStyle = gradient;
        dispCtx.beginPath();
        dispCtx.arc(canvasX, canvasY, puffRadius, 0, Math.PI * 2);
        dispCtx.fill();
        
        dispCtx.globalCompositeOperation = 'source-over'; // Reset
      }
    }
    
    // Add puff element to V2 system
    addPuffElementFromApp({
      x: canvasX,
      y: canvasY,
      radius: puffRadius,
      height: puffSettings.height,
      softness: puffSettings.softness,
      color: puffSettings.color,
      opacity: puffSettings.opacity
    }, v2ActiveLayerId);
    
    // Update the model texture
    if (composedCanvas) {
      const ctx = composedCanvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = puffSettings.opacity;
        ctx.fillStyle = puffSettings.color;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, puffRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    console.log('🎈 Puff painting completed');
  }, [composedCanvas, puffSettings, v2ActiveLayerId, getLayerCanvas, getLayerDisplacementCanvas, addPuffElementFromApp]);
  
  // Listen for puff print events from ShirtRefactored
  useEffect(() => {
    if (!active) return;
    
    const handlePuffEvent = (event: CustomEvent) => {
      const { uv, point, event: originalEvent } = event.detail;
      
      console.log('🎈 UnifiedPuffPrintSystem received puff event:', { uv, point });
      
      // Handle the puff painting
      handlePuffPainting(uv, point, originalEvent);
    };
    
    window.addEventListener('puffPrintEvent', handlePuffEvent as EventListener);
    
    return () => {
      window.removeEventListener('puffPrintEvent', handlePuffEvent as EventListener);
    };
  }, [active, handlePuffPainting]);
  
  // Initialize all core systems
  const initializeSystems = useCallback(() => {
    console.log('🎈 Initializing Unified Puff Print System...');
    
    // Initialize memory manager first
    memoryManagerRef.current = new PuffMemoryManager();
    
    // Initialize displacement engine
    displacementEngineRef.current = new PuffDisplacementEngine(
      modelScene!,
      composedCanvas!,
      memoryManagerRef.current
    );
    
    // Initialize pattern library
    patternLibraryRef.current = new PuffPatternLibrary();
    
    // Initialize preview renderer
    previewRendererRef.current = new PuffPreviewRenderer(
      modelScene!,
      previewSettings
    );
    
    console.log('🎈 Unified Puff Print System initialized successfully');
  }, [modelScene, composedCanvas, previewSettings]);
  
  // Handle painting on the model
  const handlePaint = useCallback((uv: THREE.Vector2, pressure: number = 1.0) => {
    if (!active || !displacementEngineRef.current || !v2ActiveLayerId) return;
    
    const now = performance.now();
    const timeSinceLastPaint = now - lastPaintTime;
    const minPaintInterval = 1000 / 60; // 60fps max
    
    if (timeSinceLastPaint < minPaintInterval) return;
    
    // Get the active layer canvas from V2 system
    const layerCanvas = getLayerCanvas(v2ActiveLayerId);
    if (!layerCanvas) return;
    
    // Get current pattern
    const pattern = patternLibraryRef.current?.getPattern(puffSettings.pattern);
    if (!pattern) return;
    
    // Calculate effective settings
    const effectiveSize = puffSettings.brushSize * pressure;
    const effectiveOpacity = puffSettings.opacity * pressure;
    
    // Paint puff using displacement engine
    displacementEngineRef.current.paintPuff(
      uv,
      effectiveSize,
      puffSettings.height,
      puffSettings.softness,
      puffSettings.color,
      effectiveOpacity,
      pattern,
      puffSettings.patternScale,
      puffSettings.patternRotation,
      activeLayer
    );
    
    // Update preview if enabled
    if (previewSettings.enabled && previewRendererRef.current) {
      previewRendererRef.current.updatePreview(activeLayer);
    }
    
    setLastPaintTime(now);
    setIsPainting(true);
    
    // Stop painting indicator after short delay
    setTimeout(() => setIsPainting(false), 100);
  }, [active, v2ActiveLayerId, puffSettings, previewSettings, lastPaintTime, getLayerCanvas]);
  
  // Handle mouse/touch events
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (!active) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert screen coordinates to UV coordinates
    const uv = new THREE.Vector2(x / rect.width, y / rect.height);
    
    handlePaint(uv, 1.0);
  }, [active, handlePaint]);
  
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!active || !isPainting) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const uv = new THREE.Vector2(x / rect.width, y / rect.height);
    
    handlePaint(uv, 0.8); // Slightly less pressure for continuous painting
  }, [active, isPainting, handlePaint]);
  
  // Performance monitoring
  useEffect(() => {
    const monitorPerformance = () => {
      if (memoryManagerRef.current) {
        const usage = memoryManagerRef.current.getMemoryUsage();
        setMemoryUsage(usage);
        setIsOptimized(usage < 0.8); // Consider optimized if < 80% memory usage
      }
      
      // Simple FPS calculation
      const now = performance.now();
      const deltaTime = now - (window as any).lastFrameTime || 16;
      const currentFps = Math.round(1000 / deltaTime);
      setFps(Math.min(60, currentFps));
      (window as any).lastFrameTime = now;
    };
    
    const interval = setInterval(monitorPerformance, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      memoryManagerRef.current?.cleanup();
      displacementEngineRef.current?.cleanup();
      previewRendererRef.current?.cleanup();
    };
  }, []);
  
  // Render settings panel
  const renderSettingsPanel = () => {
    if (!isSettingsOpen) return null;
    
    return (
      <div className="puff-settings-panel">
        {/* Header */}
        <div className="panel-header">
          <h3>🎈 Advanced Puff Print System</h3>
          <button 
            className="close-btn"
            onClick={() => setIsSettingsOpen(false)}
          >
            ✕
          </button>
        </div>
        
        {/* Performance Monitor */}
        <div className="performance-monitor">
          <div className="fps-indicator">
            <span className="fps-label">FPS:</span>
            <span className={`fps-value ${fps >= 50 ? 'good' : fps >= 30 ? 'warning' : 'critical'}`}>
              {fps}
            </span>
          </div>
          <div className="memory-indicator">
            <span className="memory-label">Memory:</span>
            <span className={`memory-value ${isOptimized ? 'good' : 'warning'}`}>
              {Math.round(memoryUsage * 100)}%
            </span>
          </div>
        </div>
        
        {/* Layers Section */}
        <div className="section">
          <h4>📁 Layers</h4>
          <div className="layers-list">
            {layers.map(layer => (
              <div 
                key={layer.id}
                className={`layer-item ${v2ActiveLayerId === layer.id ? 'active' : ''}`}
                onClick={() => {
                  // Set active layer in V2 system
                  const { setActiveLayer } = useAdvancedLayerStoreV2.getState();
                  setActiveLayer(layer.id);
                }}
              >
                <div className="layer-visibility">
                  <button 
                    className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const { setLayerVisibility } = useAdvancedLayerStoreV2.getState();
                      setLayerVisibility(layer.id, !layer.visible);
                    }}
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="layer-thumbnail">
                  <canvas 
                    ref={(canvas) => {
                      if (canvas && layer.content.canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(layer.content.canvas, 0, 0, canvas.width, canvas.height);
                        }
                      }
                    }}
                    width={32}
                    height={32}
                  />
                </div>
                <div className="layer-name">{layer.name}</div>
                <div className="layer-opacity">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={layer.opacity}
                    onChange={(e) => {
                      const { setLayerOpacity } = useAdvancedLayerStoreV2.getState();
                      setLayerOpacity(layer.id, parseFloat(e.target.value));
                    }}
                  />
                </div>
              </div>
            ))}
            <button 
              className="add-layer-btn"
              onClick={() => {
                const { createLayer, setActiveLayer } = useAdvancedLayerStoreV2.getState();
                const newLayerId = createLayer('paint', `Puff Layer ${Date.now()}`);
                setActiveLayer(newLayerId);
              }}
            >
              + Add Layer
            </button>
          </div>
        </div>
        
        {/* Puff Properties */}
        <div className="section">
          <h4>🎨 Puff Properties</h4>
          
          <div className="property-group">
            <label>Height: {puffHeight.toFixed(1)}x</label>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={puffHeight}
              onChange={(e) => setPuffHeight(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="property-group">
            <label>Softness: {Math.round(puffSoftness * 100)}%</label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={puffSoftness}
              onChange={(e) => setPuffSoftness(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="property-group">
            <label>Color</label>
            <div className="color-picker">
              <input
                type="color"
                value={puffColor}
                onChange={(e) => setPuffColor(e.target.value)}
              />
              <span className="color-preview" style={{ backgroundColor: puffColor }}></span>
            </div>
          </div>
          
          <div className="property-group">
            <label>Opacity: {Math.round(puffOpacity * 100)}%</label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={puffOpacity}
              onChange={(e) => setPuffOpacity(parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        {/* Brush Settings */}
        <div className="section">
          <h4>🔧 Brush Settings</h4>
          
          <div className="property-group">
            <label>Size: {puffBrushSize}px</label>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={puffBrushSize}
              onChange={(e) => setPuffBrushSize(parseInt(e.target.value))}
            />
          </div>
          
          <div className="property-group">
            <label>Opacity: {Math.round(puffBrushOpacity * 100)}%</label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={puffBrushOpacity}
              onChange={(e) => setPuffBrushOpacity(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="property-group">
            <label>Shape: {puffShape}</label>
            <select
              value={puffShape}
              onChange={(e) => setPuffShape(e.target.value as 'cube' | 'sphere' | 'cylinder' | 'pipe')}
            >
              <option value="sphere">Sphere</option>
              <option value="cube">Cube</option>
              <option value="cylinder">Cylinder</option>
              <option value="pipe">Pipe</option>
            </select>
          </div>
        </div>
        
        {/* Patterns */}
        <div className="section">
          <h4>🎭 Patterns</h4>
          <div className="pattern-grid">
            {patternLibraryRef.current?.getAvailablePatterns().map(pattern => (
              <button
                key={pattern.id}
                className={`pattern-btn ${puffSettings.pattern === pattern.id ? 'active' : ''}`}
                onClick={() => setCurrentPattern(pattern.id)}
                title={pattern.name}
              >
                {pattern.icon}
              </button>
            ))}
          </div>
          
          <div className="property-group">
            <label>Curvature: {Math.round(puffCurvature * 100)}%</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={puffCurvature}
              onChange={(e) => setPuffCurvature(parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        {/* Preview Settings */}
        <div className="section">
          <h4>👁️ Preview</h4>
          
          <div className="property-group">
            <label>
              <input
                type="checkbox"
                checked={previewSettings.enabled}
                onChange={(e) => setPreviewEnabled(e.target.checked)}
              />
              Enable Real-time Preview
            </label>
          </div>
          
          <div className="property-group">
            <label>Quality</label>
            <select
              value={previewSettings.quality}
              onChange={(e) => setPreviewQuality(e.target.value as 'low' | 'medium' | 'high' | 'ultra')}
            >
              <option value="low">Low (Fast)</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra (Slow)</option>
            </select>
          </div>
          
          <div className="property-group">
            <label>Lighting</label>
            <select
              value={previewSettings.lighting}
              onChange={(e) => setPreviewLighting(e.target.value as 'studio' | 'natural' | 'dramatic')}
            >
              <option value="studio">Studio</option>
              <option value="natural">Natural</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </div>
        </div>
        
        {/* Actions */}
        <div className="section">
          <h4>💾 Actions</h4>
          <div className="action-buttons">
            <button 
              className="action-btn export-btn"
              onClick={() => {
                if (v2ActiveLayerId) {
                  const displacementCanvas = getLayerDisplacementCanvas(v2ActiveLayerId);
                  if (displacementCanvas) {
                    // Export displacement map
                    const link = document.createElement('a');
                    link.download = 'displacement-map.png';
                    link.href = displacementCanvas.toDataURL();
                    link.click();
                  }
                }
              }}
            >
              Export Displacement
            </button>
            <button 
              className="action-btn export-btn"
              onClick={() => {
                if (v2ActiveLayerId) {
                  const layerCanvas = getLayerCanvas(v2ActiveLayerId);
                  if (layerCanvas) {
                    // Export normal map (placeholder - would need actual normal map generation)
                    const link = document.createElement('a');
                    link.download = 'normal-map.png';
                    link.href = layerCanvas.toDataURL();
                    link.click();
                  }
                }
              }}
            >
              Export Normal Map
            </button>
            <button 
              className="action-btn reset-btn"
              onClick={() => {
                // Reset global state to defaults
                setPuffHeight(2.0);
                setPuffSoftness(0.5);
                setPuffColor('#ff69b4');
                setPuffOpacity(0.8);
                setPuffBrushSize(20);
                setPuffBrushOpacity(1.0);
                setPuffCurvature(0.8);
                setPuffShape('sphere');
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Export functions
  const exportDisplacementMap = (layer: PuffLayer) => {
    const link = document.createElement('a');
    link.download = `puff-displacement-${layer.name}.png`;
    link.href = layer.displacementCanvas.toDataURL();
    link.click();
  };
  
  const exportNormalMap = (layer: PuffLayer) => {
    const link = document.createElement('a');
    link.download = `puff-normal-${layer.name}.png`;
    link.href = layer.normalCanvas.toDataURL();
    link.click();
  };
  
  // Main render
  return (
    <div className="unified-puff-print-system">
      {/* Tool Activation Button */}
      {!isSettingsOpen && (
        <button 
          className={`puff-tool-btn ${active ? 'active' : ''}`}
          onClick={() => setIsSettingsOpen(true)}
          title="Open Puff Print System"
        >
          🎈 Puff Print
        </button>
      )}
      
      {/* Settings Panel */}
      {renderSettingsPanel()}
      
      {/* Painting Overlay */}
      {active && (
        <div 
          className="painting-overlay"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setIsPainting(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'auto',
            zIndex: 1000
          }}
        />
      )}
      
      {/* Performance Indicator */}
      {active && (
        <div className="performance-indicator">
          <div className={`fps-dot ${fps >= 50 ? 'good' : fps >= 30 ? 'warning' : 'critical'}`}></div>
          <span className="fps-text">{fps}</span>
        </div>
      )}
    </div>
  );
}

export default UnifiedPuffPrintSystem;
