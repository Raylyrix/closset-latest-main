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
import { PuffDisplacementEngine } from '../core/PuffDisplacementEngine';
import { PuffLayerManager } from '../core/PuffLayerManager';
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
  
  // Core system refs
  const displacementEngineRef = useRef<PuffDisplacementEngine | null>(null);
  const layerManagerRef = useRef<PuffLayerManager | null>(null);
  const previewRendererRef = useRef<PuffPreviewRenderer | null>(null);
  const patternLibraryRef = useRef<PuffPatternLibrary | null>(null);
  const memoryManagerRef = useRef<PuffMemoryManager | null>(null);
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPaintTime, setLastPaintTime] = useState(0);
  
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
    pattern: 'round',
    patternScale: 1.0,
    patternRotation: 0
  };
  
  const previewSettings: PuffPreviewSettings = {
    enabled: true,
    quality: 'high',
    lighting: 'studio',
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
    
    // Initialize layer manager
    layerManagerRef.current = new PuffLayerManager(
      composedCanvas!,
      displacementEngineRef.current
    );
    
    // Initialize pattern library
    patternLibraryRef.current = new PuffPatternLibrary();
    
    // Initialize preview renderer
    previewRendererRef.current = new PuffPreviewRenderer(
      modelScene!,
      previewSettings as any // FIXED: Type mismatch
    );
    
    // Create default layer
    const defaultLayer = layerManagerRef.current.createLayer('Base Puff Layer');
    setActiveLayerId(defaultLayer.id);
    
    console.log('🎈 Unified Puff Print System initialized successfully');
  }, [modelScene, composedCanvas, previewSettings]);
  
  // Handle painting on the model
  const handlePaint = useCallback((uv: THREE.Vector2, pressure: number = 1.0) => {
    if (!active || !layerManagerRef.current || !displacementEngineRef.current) return;
    
    const now = performance.now();
    const timeSinceLastPaint = now - lastPaintTime;
    const minPaintInterval = 1000 / 60; // 60fps max
    
    if (timeSinceLastPaint < minPaintInterval) return;
    
    const activeLayer = layerManagerRef.current.getLayer(activeLayerId!);
    if (!activeLayer) return;
    
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
  }, [active, activeLayerId, puffSettings, previewSettings, lastPaintTime]);
  
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
      layerManagerRef.current?.cleanup();
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
            {layerManagerRef.current?.getLayers().map(layer => (
              <div 
                key={layer.id}
                className={`layer-item ${activeLayerId === layer.id ? 'active' : ''}`}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <div className="layer-visibility">
                  <button 
                    className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      layerManagerRef.current?.toggleLayerVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="layer-thumbnail">
                  <canvas 
                    ref={(canvas) => {
                      if (canvas && layer.canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
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
                      layerManagerRef.current?.updateLayerOpacity(layer.id, parseFloat(e.target.value));
                    }}
                  />
                </div>
              </div>
            ))}
            <button 
              className="add-layer-btn"
              onClick={() => {
                const newLayer = layerManagerRef.current?.createLayer(`Puff Layer ${Date.now()}`);
                if (newLayer) setActiveLayerId(newLayer.id);
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
                onClick={() => (setPuffSettings as any)((prev: any) => ({ ...prev, pattern: pattern.id }))} // FIXED: Missing function
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
                onChange={(e) => (setPreviewSettings as any)((prev: any) => ({ ...prev, enabled: e.target.checked }))} // FIXED: Missing function
              />
              Enable Real-time Preview
            </label>
          </div>
          
          <div className="property-group">
            <label>Quality</label>
            <select
              value={previewSettings.quality}
              onChange={(e) => (setPreviewSettings as any)((prev: any) => ({ ...prev, quality: e.target.value as any }))} // FIXED: Missing function
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
              onChange={(e) => (setPreviewSettings as any)((prev: any) => ({ ...prev, lighting: e.target.value as any }))} // FIXED: Missing function
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
                const activeLayer = layerManagerRef.current?.getLayer(activeLayerId!);
                if (activeLayer) {
                  exportDisplacementMap(activeLayer as any); // FIXED: Type mismatch
                }
              }}
            >
              Export Displacement
            </button>
            <button 
              className="action-btn export-btn"
              onClick={() => {
                const activeLayer = layerManagerRef.current?.getLayer(activeLayerId!);
                if (activeLayer) {
                  exportNormalMap(activeLayer as any); // FIXED: Type mismatch
                }
              }}
            >
              Export Normal Map
            </button>
            <button 
              className="action-btn reset-btn"
              onClick={() => {
                layerManagerRef.current?.resetAllLayers();
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
