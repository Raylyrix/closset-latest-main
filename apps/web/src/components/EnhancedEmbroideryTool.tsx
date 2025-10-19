/**
 * Enhanced Embroidery Tool
 * Advanced embroidery tool with persistent stitches, layering, and AI features
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../App';
import EnhancedEmbroideryManager from '../utils/EnhancedEmbroideryManager';
import type { EmbroideryStitch as ServiceEmbroideryStitch } from '../services/embroideryService';
import type { StitchLayer, StitchPoint } from '../utils/EnhancedEmbroideryManager';
import EnhancedStitchGenerator, { StitchGenerationConfig } from '../utils/EnhancedStitchGenerator';

interface EnhancedEmbroideryToolProps {
  active?: boolean;
}

const EnhancedEmbroideryTool: React.FC<EnhancedEmbroideryToolProps> = ({ active = true }) => {
  // Global state
  const {
    embroideryStitches,
    setEmbroideryStitches,
    embroideryStitchType,
    setEmbroideryStitchType,
    embroideryColor,
    setEmbroideryColor,
    embroideryThickness,
    setEmbroideryThickness,
    embroideryOpacity,
    setEmbroideryOpacity,
    embroideryThreadType,
    setEmbroideryThreadType,
    composedCanvas
  } = useApp();

  // Local state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStitch, setCurrentStitch] = useState<ServiceEmbroideryStitch | null>(null);
  const [selectedStitches, setSelectedStitches] = useState<string[]>([]);
  const [showLayers, setShowLayers] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [undoStack, setUndoStack] = useState<ServiceEmbroideryStitch[][]>([]);
  const [redoStack, setRedoStack] = useState<ServiceEmbroideryStitch[][]>([]);

  // Refs
  const managerRef = useRef<EnhancedEmbroideryManager | null>(null);
  const generatorRef = useRef<EnhancedStitchGenerator | null>(null);
  const frameRequestRef = useRef<number | null>(null);

  // Initialize managers
  useEffect(() => {
    if (composedCanvas) {
      managerRef.current = new EnhancedEmbroideryManager(composedCanvas);
      generatorRef.current = new EnhancedStitchGenerator(false);
      
      // Set performance mode
      managerRef.current.setPerformanceMode(performanceMode);
    }
  }, [composedCanvas, performanceMode]);

  // Save state for undo
  const mapToServiceStitch = useCallback((s: any): ServiceEmbroideryStitch => {
    // Validate and narrow stitch type to the known union
    const allowedTypes: ServiceEmbroideryStitch['type'][] = [
      'satin','fill','outline','cross-stitch','chain','backstitch','french-knot','bullion','lazy-daisy','feather','couching','appliqué','seed','stem','split','brick','long-short','fishbone','herringbone','satin-ribbon','metallic','glow-thread','variegated','gradient'
    ];
    const t = allowedTypes.includes(s.type) ? s.type : 'satin';
    return { ...s, type: t } as ServiceEmbroideryStitch;
  }, []);

  const saveState = useCallback(() => {
    if (managerRef.current) {
      const currentStitches = managerRef.current.getAllStitches().map(mapToServiceStitch);
      setUndoStack(prev => [...prev.slice(-9), currentStitches]); // Keep last 10 states
      setRedoStack([]); // Clear redo when new action is performed
    }
  }, [mapToServiceStitch]);

  // Undo functionality
  const undo = useCallback(() => {
    if (undoStack.length > 0 && managerRef.current) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, managerRef.current!.getAllStitches().map(mapToServiceStitch)]);
      setUndoStack(prev => prev.slice(0, -1));
      
      // Restore previous state
      managerRef.current.clearAll();
      previousState.forEach(stitch => {
        managerRef.current!.addStitch({ ...(stitch as any), visible: true, locked: false } as any);
      });
      
      // Update global state
      setEmbroideryStitches(previousState.map(mapToServiceStitch));
    }
  }, [undoStack, setEmbroideryStitches, mapToServiceStitch]);

  // Redo functionality
  const redo = useCallback(() => {
    if (redoStack.length > 0 && managerRef.current) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, managerRef.current!.getAllStitches().map(mapToServiceStitch)]);
      setRedoStack(prev => prev.slice(0, -1));
      
      // Restore next state
      managerRef.current.clearAll();
      nextState.forEach(stitch => {
        managerRef.current!.addStitch({ ...(stitch as any), visible: true, locked: false } as any);
      });
      
      // Update global state
      setEmbroideryStitches(nextState);
    }
  }, [redoStack, setEmbroideryStitches, mapToServiceStitch]);

  // Drawing handlers
  const handleStartDrawing = useCallback((e: CustomEvent) => {
    if (!managerRef.current || !generatorRef.current) return;
    
    const { u, v } = e.detail;
    setIsDrawing(true);
    
    const config: StitchGenerationConfig = {
      type: embroideryStitchType,
      color: embroideryColor,
      thickness: embroideryThickness,
      opacity: embroideryOpacity,
      threadType: embroideryThreadType,
      quality: 'high'
    };

    const initialStitch = generatorRef.current.generateStitchFromInput(
      [{ x: u, y: v, pressure: 0.5, timestamp: Date.now() }],
      config
    ) as any;

    setCurrentStitch(mapToServiceStitch(initialStitch));
    saveState();
  }, [embroideryStitchType, embroideryColor, embroideryThickness, embroideryOpacity, embroideryThreadType, saveState, mapToServiceStitch]);

  const handleMoveDrawing = useCallback((e: CustomEvent) => {
    if (!isDrawing || !currentStitch || !generatorRef.current) return;
    
    const { u, v } = e.detail;
    
    // Throttle move events
    const now = Date.now();
    if (typeof currentStitch.lastMoveTime === 'number' && now - currentStitch.lastMoveTime < 32) {
      return;
    }

    const newPoints = [...currentStitch.points, { x: u, y: v, pressure: 0.5, timestamp: now }];
    
    const config: StitchGenerationConfig = {
      type: embroideryStitchType,
      color: embroideryColor,
      thickness: embroideryThickness,
      opacity: embroideryOpacity,
      threadType: embroideryThreadType,
      quality: 'high'
    };

    const updatedStitch = generatorRef.current.generateStitchFromInput(newPoints, config) as any;
    const mapped = mapToServiceStitch(updatedStitch);
    setCurrentStitch({ ...mapped, lastMoveTime: now });
  }, [isDrawing, currentStitch, embroideryStitchType, embroideryColor, embroideryThickness, embroideryOpacity, embroideryThreadType, mapToServiceStitch]);

  const handleEndDrawing = useCallback(() => {
    if (!isDrawing || !currentStitch || !managerRef.current) return;
    
    setIsDrawing(false);
    
    // Add stitch to manager
    const stitchId = managerRef.current.addStitch(currentStitch as any);
    
    // Update global state
    const allStitches = managerRef.current.getAllStitches().map(mapToServiceStitch);
    setEmbroideryStitches(allStitches);
    
    setCurrentStitch(null);
  }, [isDrawing, currentStitch, setEmbroideryStitches, mapToServiceStitch]);

  // Pattern generation
  const generatePattern = useCallback((patternId: string) => {
    if (!managerRef.current || !generatorRef.current) return;
    
    const centerX = composedCanvas?.width ? composedCanvas.width / 2 : 400;
    const centerY = composedCanvas?.height ? composedCanvas.height / 2 : 300;
    
    const config: Partial<StitchGenerationConfig> = {
      color: embroideryColor,
      thickness: embroideryThickness,
      opacity: embroideryOpacity,
      threadType: embroideryThreadType
    };

    const stitch = generatorRef.current.generatePatternStitch(patternId, centerX, centerY, 1.0, config) as any;
    if (stitch) {
      saveState();
      const stitchId = managerRef.current.addStitch(stitch);
      const allStitches = managerRef.current.getAllStitches().map(mapToServiceStitch);
      setEmbroideryStitches(allStitches);
    }
  }, [composedCanvas, embroideryColor, embroideryThickness, embroideryOpacity, embroideryThreadType, setEmbroideryStitches, saveState, mapToServiceStitch]);

  // AI generation removed per requirements

  // Layer management
  const createLayer = useCallback((name: string) => {
    if (!managerRef.current) return;
    
    const layerId = managerRef.current.createLayer(name);
    console.log('Created layer:', layerId);
  }, []);

  const switchLayer = useCallback((layerId: string) => {
    if (!managerRef.current) return;
    
    managerRef.current.setCurrentLayer(layerId);
  }, []);

  // Stitch management
  const deleteSelectedStitches = useCallback(() => {
    if (!managerRef.current || selectedStitches.length === 0) return;
    
    saveState();
    selectedStitches.forEach(stitchId => {
      managerRef.current!.removeStitch(stitchId);
    });
    
    const allStitches = managerRef.current.getAllStitches().map(mapToServiceStitch);
    setEmbroideryStitches(allStitches);
    setSelectedStitches([]);
  }, [selectedStitches, setEmbroideryStitches, saveState]);

  const clearAllStitches = useCallback(() => {
    if (!managerRef.current) return;
    
    saveState();
    managerRef.current.clearAll();
    setEmbroideryStitches([]);
    setSelectedStitches([]);
  }, [setEmbroideryStitches, saveState]);

  // Event listeners
  useEffect(() => {
    window.addEventListener('embroideryStart', handleStartDrawing as EventListener);
    window.addEventListener('embroideryMove', handleMoveDrawing as EventListener);
    window.addEventListener('embroideryEnd', handleEndDrawing);

    return () => {
      window.removeEventListener('embroideryStart', handleStartDrawing as EventListener);
      window.removeEventListener('embroideryMove', handleMoveDrawing as EventListener);
      window.removeEventListener('embroideryEnd', handleEndDrawing);
    };
  }, [handleStartDrawing, handleMoveDrawing, handleEndDrawing]);

  // Statistics
  const statistics = useMemo(() => {
    if (!managerRef.current) return null;
    return managerRef.current.getStatistics();
  }, [embroideryStitches]);

  // Available patterns
  const availablePatterns = useMemo(() => {
    if (!generatorRef.current) return [];
    return generatorRef.current.getAvailablePatterns();
  }, []);

  // Available layers
  const availableLayers = useMemo(() => {
    if (!managerRef.current) return [];
    return managerRef.current.getAllLayers();
  }, [embroideryStitches]);

  if (!active) return null;

  return (
    <div className="enhanced-embroidery-tool">
      {/* Header */}
      <div className="tool-header">
        <h3>Enhanced Embroidery Tool</h3>
        <div className="tool-actions">
          <button onClick={undo} disabled={undoStack.length === 0} title="Undo">
            ↶
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} title="Redo">
            ↷
          </button>
          <button onClick={clearAllStitches} title="Clear All">
            🗑️
          </button>
        </div>
      </div>

      {/* Main Controls */}
      <div className="control-section">
        <h4>Stitch Settings</h4>
        
        <div className="control-group">
          <label>Stitch Type:</label>
          <select 
            value={embroideryStitchType} 
            onChange={(e) => setEmbroideryStitchType(e.target.value as any)} // FIXED: Type mismatch
          >
            <option value="satin">Satin</option>
            <option value="cross-stitch">Cross Stitch</option>
            <option value="chain">Chain</option>
            <option value="fill">Fill</option>
            <option value="bullion">Bullion</option>
            <option value="feather">Feather</option>
            <option value="backstitch">Backstitch</option>
            <option value="french-knot">French Knot</option>
          </select>
        </div>

        <div className="control-group">
          <label>Color:</label>
          <input
            type="color"
            value={embroideryColor}
            onChange={(e) => setEmbroideryColor(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Thickness:</label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.1"
            value={embroideryThickness}
            onChange={(e) => setEmbroideryThickness(parseFloat(e.target.value))}
          />
          <span>{embroideryThickness.toFixed(1)}</span>
        </div>

        <div className="control-group">
          <label>Opacity:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={embroideryOpacity}
            onChange={(e) => setEmbroideryOpacity(parseFloat(e.target.value))}
          />
          <span>{Math.round(embroideryOpacity * 100)}%</span>
        </div>

        <div className="control-group">
          <label>Thread Type:</label>
          <select 
            value={embroideryThreadType} 
            onChange={(e) => setEmbroideryThreadType(e.target.value as typeof embroideryThreadType)}
          >
            <option value="cotton">Cotton</option>
            <option value="silk">Silk</option>
            <option value="polyester">Polyester</option>
            <option value="metallic">Metallic</option>
            <option value="glow">Glow</option>
            <option value="variegated">Variegated</option>
          </select>
        </div>
      </div>

      {/* Pattern Library */}
      <div className="control-section">
        <div className="section-header">
          <h4>Pattern Library</h4>
          <button 
            onClick={() => setShowPatterns(!showPatterns)}
            className="toggle-btn"
          >
            {showPatterns ? '−' : '+'}
          </button>
        </div>
        
        {showPatterns && (
          <div className="pattern-grid">
            {availablePatterns.map(pattern => (
              <div 
                key={pattern.id}
                className="pattern-item"
                onClick={() => generatePattern(pattern.id)}
                title={pattern.description}
              >
                <div className="pattern-preview">
                  {pattern.name}
                </div>
                <div className="pattern-info">
                  <span className="pattern-type">{pattern.type}</span>
                  <span className="pattern-complexity">
                    {'★'.repeat(pattern.complexity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Generation removed per requirements */}

      {/* Layer Management */}
      <div className="control-section">
        <div className="section-header">
          <h4>Layers</h4>
          <button 
            onClick={() => setShowLayers(!showLayers)}
            className="toggle-btn"
          >
            {showLayers ? '−' : '+'}
          </button>
        </div>
        
        {showLayers && (
          <div className="layer-controls">
            <div className="layer-list">
              {availableLayers.map(layer => (
                <div key={layer.id} className="layer-item">
                  <input
                    type="radio"
                    name="currentLayer"
                    checked={layer.id === managerRef.current?.getCurrentLayer().id}
                    onChange={() => switchLayer(layer.id)}
                  />
                  <span className="layer-name">{layer.name}</span>
                  <span className="layer-count">({layer.stitches.length})</span>
                </div>
              ))}
            </div>
            
            <div className="layer-actions">
              <input
                type="text"
                placeholder="New layer name"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    createLayer(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Selection Management */}
      {selectedStitches.length > 0 && (
        <div className="control-section">
          <h4>Selected Stitches ({selectedStitches.length})</h4>
          <div className="selection-actions">
            <button onClick={deleteSelectedStitches} className="danger-btn">
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Performance & Statistics */}
      <div className="control-section">
        <div className="section-header">
          <h4>Performance & Stats</h4>
          <button 
            onClick={() => setShowStatistics(!showStatistics)}
            className="toggle-btn"
          >
            {showStatistics ? '−' : '+'}
          </button>
        </div>
        
        {showStatistics && statistics && (
          <div className="statistics">
            <div className="stat-item">
              <span>Total Stitches:</span>
              <span>{statistics.totalStitches}</span>
            </div>
            <div className="stat-item">
              <span>Visible Stitches:</span>
              <span>{statistics.visibleStitches}</span>
            </div>
            <div className="stat-item">
              <span>Layers:</span>
              <span>{statistics.layerCount}</span>
            </div>
            <div className="stat-item">
              <span>Total Length:</span>
              <span>{statistics.totalLength.toFixed(1)}px</span>
            </div>
            <div className="stat-item">
              <span>Avg Quality:</span>
              <span>{(statistics.averageQuality * 100).toFixed(1)}%</span>
            </div>
            
            <div className="performance-controls">
              <label>
                <input
                  type="checkbox"
                  checked={performanceMode}
                  onChange={(e) => setPerformanceMode(e.target.checked)}
                />
                Performance Mode
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Stitch Type Breakdown */}
      {statistics && statistics.stitchesByType && Object.keys(statistics.stitchesByType).length > 0 && (
        <div className="control-section">
          <h4>Stitch Types</h4>
          <div className="stitch-breakdown">
            {Object.entries(statistics.stitchesByType).map(([type, count]) => (
              <div key={type} className="stitch-type-item">
                <span className="stitch-type-name">{type}</span>
                <span className="stitch-type-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .enhanced-embroidery-tool {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e9ecef;
        }

        .tool-header h3 {
          margin: 0;
          color: #495057;
        }

        .tool-actions {
          display: flex;
          gap: 8px;
        }

        .tool-actions button {
          padding: 6px 12px;
          border: 1px solid #dee2e6;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .tool-actions button:hover:not(:disabled) {
          background: #e9ecef;
        }

        .tool-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-section {
          margin-bottom: 20px;
          background: white;
          border-radius: 6px;
          padding: 16px;
          border: 1px solid #e9ecef;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-header h4 {
          margin: 0;
          color: #495057;
        }

        .toggle-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #6c757d;
        }

        .control-group {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
        }

        .control-group label {
          min-width: 80px;
          font-weight: 500;
          color: #495057;
        }

        .control-group input,
        .control-group select {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }

        .pattern-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .pattern-item {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .pattern-item:hover {
          border-color: #007bff;
          box-shadow: 0 2px 4px rgba(0,123,255,0.1);
        }

        .pattern-preview {
          font-weight: 500;
          margin-bottom: 8px;
          color: #495057;
        }

        .pattern-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6c757d;
        }

        .ai-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ai-controls textarea {
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          resize: vertical;
        }

        .ai-generate-btn {
          padding: 10px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .ai-generate-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .ai-generate-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .layer-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .layer-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .layer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .layer-item:hover {
          background: #f8f9fa;
        }

        .layer-name {
          flex: 1;
          font-weight: 500;
        }

        .layer-count {
          color: #6c757d;
          font-size: 12px;
        }

        .layer-actions input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
        }

        .selection-actions {
          display: flex;
          gap: 8px;
        }

        .danger-btn {
          padding: 8px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .danger-btn:hover {
          background: #c82333;
        }

        .statistics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .performance-controls {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e9ecef;
        }

        .performance-controls label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .stitch-breakdown {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stitch-type-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .stitch-type-name {
          font-weight: 500;
          text-transform: capitalize;
        }

        .stitch-type-count {
          color: #6c757d;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default EnhancedEmbroideryTool;

























