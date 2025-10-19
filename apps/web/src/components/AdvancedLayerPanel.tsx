/**
 * 🎨 ADVANCED LAYER PANEL UI
 * 
 * A comprehensive layer panel with Photoshop-level features:
 * - Drag & drop reordering
 * - Layer groups and folders
 * - Layer effects and styles
 * - Blend modes and opacity
 * - Layer masks and clipping
 * - Smart objects
 * - Adjustment layers
 * - Real-time preview
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { LayerEffectRenderer, EffectPresets } from '../core/LayerEffects';
import { LayerEffect, BlendMode } from '../core/AdvancedLayerSystemV2';
import { useUnifiedLayerBridge } from '../core/UnifiedLayerBridge';
import { useToolLayerManager } from '../core/ToolLayerManager';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LayerPanelProps {
  width?: number;
  height?: number;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: any) => void;
}

interface LayerItemProps {
  layerId: string;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (layerId: string) => void;
  onActivate: (layerId: string) => void;
  onUpdate: (layerId: string, updates: any) => void;
}

interface LayerEffectsPanelProps {
  layerId: string;
  effects: LayerEffect[];
  onEffectsChange: (effects: LayerEffect[]) => void;
}

// ============================================================================
// MAIN LAYER PANEL COMPONENT
// ============================================================================

export function AdvancedLayerPanel({ 
  width = 300, 
  height = 600,
  onLayerSelect,
  onLayerUpdate 
}: LayerPanelProps) {
  const {
    layers,
    groups,
    layerOrder,
    activeLayerId,
    selectedLayerIds,
    expandedGroups,
    showLayerEffects,
    showLayerMasks,
    createLayer,
    deleteLayer,
    duplicateLayer,
    setActiveLayer,
    selectLayers,
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    createGroup,
    deleteGroup,
    toggleGroupCollapse,
    updateLayer
  } = useAdvancedLayerStoreV2();

  // Use unified layer bridge for cross-system operations
  const {
    handleLayerReorder,
    handleLayerUpdate: bridgeUpdateLayer,
    handleLayerCreate: bridgeCreateLayer,
    handleLayerDelete: bridgeDeleteLayer,
    syncToolsToLayers
  } = useUnifiedLayerBridge();

  // Use tool layer manager for tool integration
  const {
    ensureToolLayer,
    getLayerForTool,
    updateToolLayer,
    syncAllToolsToLayers,
    getToolLayerStats
  } = useToolLayerManager();

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedLayerForEffects, setSelectedLayerForEffects] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Handle layer selection
  const handleLayerSelect = useCallback((layerId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      const newSelection = selectedLayerIds.includes(layerId)
        ? selectedLayerIds.filter(id => id !== layerId)
        : [...selectedLayerIds, layerId];
      selectLayers(newSelection);
    } else {
      selectLayers([layerId]);
      setActiveLayer(layerId);
    }
    onLayerSelect?.(layerId);
  }, [selectedLayerIds, selectLayers, setActiveLayer, onLayerSelect]);

  // Handle layer activation
  const handleLayerActivate = useCallback((layerId: string) => {
    setActiveLayer(layerId);
    onLayerSelect?.(layerId);
  }, [setActiveLayer, onLayerSelect]);

  // Handle layer updates
  const handleLayerUpdate = useCallback((layerId: string, updates: any) => {
    // Use unified bridge for cross-system updates
    bridgeUpdateLayer(layerId, updates);
    onLayerUpdate?.(layerId, updates);
  }, [bridgeUpdateLayer, onLayerUpdate]);

  // Handle drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    setDragOverLayerId(layerId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    
    if (draggedLayerId && draggedLayerId !== targetLayerId) {
      const draggedIndex = layerOrder.indexOf(draggedLayerId);
      const targetIndex = layerOrder.indexOf(targetLayerId);
      
      if (draggedIndex < targetIndex) {
        // Move down
        handleLayerReorder(draggedLayerId, 'down');
      } else {
        // Move up
        handleLayerReorder(draggedLayerId, 'up');
      }
    }
    
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, [draggedLayerId, layerOrder, handleLayerReorder]);

  // Create new layer
  const handleCreateLayer = useCallback((type: any) => {
    const layerId = bridgeCreateLayer(type);
    if (layerId) {
      setActiveLayer(layerId);
    }
    setShowCreateMenu(false);
  }, [bridgeCreateLayer, setActiveLayer]);

  // Delete selected layers
  const handleDeleteSelected = useCallback(() => {
    selectedLayerIds.forEach(layerId => {
      bridgeDeleteLayer(layerId);
    });
  }, [selectedLayerIds, bridgeDeleteLayer]);

  // Duplicate selected layers
  const handleDuplicateSelected = useCallback(() => {
    selectedLayerIds.forEach(layerId => {
      duplicateLayer(layerId);
    });
  }, [selectedLayerIds, duplicateLayer]);

  // Sync tools to layers on mount
  useEffect(() => {
    syncAllToolsToLayers();
  }, [syncAllToolsToLayers]);

  return (
    <div 
      ref={panelRef}
      className="advanced-layer-panel"
      style={{
        width,
        height,
        backgroundColor: '#2a2a2a',
        border: '1px solid #404040',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff'
      }}
    >
      {/* Header */}
      <div className="layer-panel-header" style={{
        padding: '8px 12px',
        borderBottom: '1px solid #404040',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#333333'
      }}>
        <span style={{ fontWeight: 'bold' }}>Layers</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Create new layer"
          >
            ➕
          </button>
          <button
            onClick={syncAllToolsToLayers}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a90e2',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Sync tools to layers"
          >
            🔄
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedLayerIds.length === 0}
            style={{
              background: 'none',
              border: 'none',
              color: selectedLayerIds.length > 0 ? '#ff6b6b' : '#666666',
              cursor: selectedLayerIds.length > 0 ? 'pointer' : 'not-allowed',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Delete selected layers"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Create Menu */}
      {showCreateMenu && (
        <div className="create-menu" style={{
          position: 'absolute',
          top: '40px',
          right: '8px',
          backgroundColor: '#333333',
          border: '1px solid #404040',
          borderRadius: '4px',
          padding: '8px',
          zIndex: 1000,
          minWidth: '150px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Create Layer</div>
          <button onClick={() => handleCreateLayer('raster')} style={menuButtonStyle}>Raster Layer</button>
          <button onClick={() => handleCreateLayer('text')} style={menuButtonStyle}>Text Layer</button>
          <button onClick={() => handleCreateLayer('shape')} style={menuButtonStyle}>Shape Layer</button>
          <button onClick={() => handleCreateLayer('adjustment')} style={menuButtonStyle}>Adjustment Layer</button>
          <button onClick={() => handleCreateLayer('smart-object')} style={menuButtonStyle}>Smart Object</button>
        </div>
      )}

      {/* Layer List */}
      <div className="layer-list" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px'
      }}>
        {layerOrder.map(layerId => {
          const layer = layers.find((l: any) => l.id === layerId); // FIXED: layers is array, not Map
          if (!layer) return null;

          return (
            <LayerItem
              key={layerId}
              layerId={layerId}
              isSelected={selectedLayerIds.includes(layerId)}
              isActive={activeLayerId === layerId}
              onSelect={handleLayerSelect}
              onActivate={handleLayerActivate}
              onUpdate={handleLayerUpdate}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="layer-panel-footer" style={{
        padding: '8px 12px',
        borderTop: '1px solid #404040',
        backgroundColor: '#333333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => useAdvancedLayerStoreV2.setState({ showLayerEffects: !showLayerEffects })}
            style={{
              background: showLayerEffects ? '#4a90e2' : 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            Effects
          </button>
          <button
            onClick={() => useAdvancedLayerStoreV2.setState({ showLayerMasks: !showLayerMasks })}
            style={{
              background: showLayerMasks ? '#4a90e2' : 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            Masks
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#888888' }}>
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'} {/* FIXED: layers is array, not Map */}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LAYER ITEM COMPONENT
// ============================================================================

function LayerItem({ 
  layerId, 
  isSelected, 
  isActive, 
  onSelect, 
  onActivate, 
  onUpdate 
}: LayerItemProps) {
  const layer = useAdvancedLayerStoreV2(state => state.layers.find(l => l.id === layerId));
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEffects, setShowEffects] = useState(false);

  if (!layer) return null;

  const handleVisibilityToggle = useCallback(() => {
    onUpdate(layerId, { visible: !layer.visible });
  }, [layerId, layer.visible, onUpdate]);

  const handleLockToggle = useCallback(() => {
    onUpdate(layerId, { locked: !layer.locked });
  }, [layerId, layer.locked, onUpdate]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(layerId, { opacity: parseFloat(e.target.value) });
  }, [layerId, onUpdate]);

  const handleBlendModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(layerId, { blendMode: e.target.value as BlendMode });
  }, [layerId, onUpdate]);

  const handleRename = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const newName = e.target.value.trim();
    if (newName && newName !== layer.name) {
      onUpdate(layerId, { name: newName });
    }
  }, [layerId, layer.name, onUpdate]);

  return (
    <div
      className={`layer-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
      style={{
        backgroundColor: isSelected ? '#4a90e2' : isActive ? '#555555' : 'transparent',
        border: '1px solid transparent',
        borderRadius: '4px',
        margin: '2px 0',
        padding: '4px',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={() => onSelect(layerId)}
      onDoubleClick={() => onActivate(layerId)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Handle drag start
      }}
    >
      {/* Layer Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Visibility Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleVisibilityToggle();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: layer.visible ? '#ffffff' : '#666666',
            cursor: 'pointer',
            padding: '2px',
            fontSize: '10px'
          }}
        >
          {layer.visible ? '👁️' : '🚫'}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLockToggle();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: layer.locked ? '#ff6b6b' : '#666666',
            cursor: 'pointer',
            padding: '2px',
            fontSize: '10px'
          }}
        >
          {layer.locked ? '🔒' : '🔓'}
        </button>

        {/* Layer Type Icon */}
        <div style={{ fontSize: '12px', minWidth: '16px' }}>
          {getLayerTypeIcon(layer.type)}
        </div>

        {/* Layer Name */}
        <input
          type="text"
          defaultValue={layer.name}
          onBlur={handleRename}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '12px',
            flex: 1,
            outline: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Effects Indicator */}
        {layer.effects.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEffects(!showEffects);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffd700',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '10px'
            }}
          >
            ✨
          </button>
        )}
      </div>

      {/* Layer Properties */}
      <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Opacity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '60px' }}>
          <span style={{ fontSize: '10px', color: '#888888' }}>Opacity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layer.opacity}
            onChange={handleOpacityChange}
            style={{ width: '40px' }}
            onClick={(e) => e.stopPropagation()}
          />
          <span style={{ fontSize: '10px', minWidth: '30px' }}>
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>

        {/* Blend Mode */}
        <select
          value={layer.blendMode}
          onChange={handleBlendModeChange}
          style={{
            background: '#333333',
            border: '1px solid #555555',
            color: '#ffffff',
            fontSize: '10px',
            padding: '2px',
            borderRadius: '2px',
            minWidth: '80px'
          }}
          onClick={(e) => e.stopPropagation()}
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
          <option value="exclusion">Exclusion</option>
          <option value="hue">Hue</option>
          <option value="saturation">Saturation</option>
          <option value="color">Color</option>
          <option value="luminosity">Luminosity</option>
        </select>
      </div>

      {/* Effects Panel */}
      {showEffects && layer.effects.length > 0 && (
        <LayerEffectsPanel
          layerId={layerId}
          effects={layer.effects}
          onEffectsChange={(effects) => onUpdate(layerId, { effects })}
        />
      )}
    </div>
  );
}

// ============================================================================
// LAYER EFFECTS PANEL COMPONENT
// ============================================================================

function LayerEffectsPanel({ layerId, effects, onEffectsChange }: LayerEffectsPanelProps) {
  const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

  const toggleEffect = useCallback((effectId: string) => {
    const updatedEffects = effects.map(effect =>
      effect.id === effectId ? { ...effect, enabled: !effect.enabled } : effect
    );
    onEffectsChange(updatedEffects);
  }, [effects, onEffectsChange]);

  const updateEffect = useCallback((effectId: string, updates: any) => {
    const updatedEffects = effects.map(effect =>
      effect.id === effectId ? { ...effect, ...updates } : effect
    );
    onEffectsChange(updatedEffects);
  }, [effects, onEffectsChange]);

  const removeEffect = useCallback((effectId: string) => {
    const updatedEffects = effects.filter(effect => effect.id !== effectId);
    onEffectsChange(updatedEffects);
  }, [effects, onEffectsChange]);

  const addEffect = useCallback((effectType: string) => {
    const newEffect: LayerEffect = {
      id: `effect_${Date.now()}`,
      type: effectType as any,
      enabled: true,
      properties: {} // FIXED: Added missing properties field
    };
    onEffectsChange([...effects, newEffect]);
  }, [effects, onEffectsChange]);

  return (
    <div style={{
      marginTop: '8px',
      padding: '8px',
      backgroundColor: '#333333',
      borderRadius: '4px',
      border: '1px solid #555555'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Layer Effects</span>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addEffect(e.target.value);
              e.target.value = '';
            }
          }}
          style={{
            background: '#444444',
            border: '1px solid #666666',
            color: '#ffffff',
            fontSize: '10px',
            padding: '2px',
            borderRadius: '2px'
          }}
        >
          <option value="">Add Effect</option>
          <option value="drop-shadow">Drop Shadow</option>
          <option value="inner-shadow">Inner Shadow</option>
          <option value="outer-glow">Outer Glow</option>
          <option value="inner-glow">Inner Glow</option>
          <option value="bevel-emboss">Bevel & Emboss</option>
          <option value="stroke">Stroke</option>
          <option value="color-overlay">Color Overlay</option>
          <option value="gradient-overlay">Gradient Overlay</option>
          <option value="pattern-overlay">Pattern Overlay</option>
        </select>
      </div>

      {effects.map(effect => (
        <div key={effect.id} style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={effect.enabled}
              onChange={() => toggleEffect(effect.id)}
              style={{ margin: 0 }}
            />
            <span style={{ fontSize: '10px', flex: 1 }}>
              {getEffectDisplayName(effect.type)}
            </span>
            <button
              onClick={() => removeEffect(effect.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b6b',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '10px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getLayerTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'raster': '🖼️',
    'vector': '📐',
    'text': '📝',
    'shape': '🔷',
    'adjustment': '🎛️',
    'smart-object': '🧠',
    'group': '📁'
  };
  return icons[type] || '❓';
}

function getEffectDisplayName(type: string): string {
  const names: Record<string, string> = {
    'drop-shadow': 'Drop Shadow',
    'inner-shadow': 'Inner Shadow',
    'outer-glow': 'Outer Glow',
    'inner-glow': 'Inner Glow',
    'bevel-emboss': 'Bevel & Emboss',
    'stroke': 'Stroke',
    'color-overlay': 'Color Overlay',
    'gradient-overlay': 'Gradient Overlay',
    'pattern-overlay': 'Pattern Overlay'
  };
  return names[type] || type;
}

function getDefaultEffectSettings(type: string): any {
  const defaults: Record<string, any> = {
    'drop-shadow': {
      color: '#000000',
      opacity: 0.75,
      angle: 135,
      distance: 5,
      spread: 0,
      size: 5,
      noise: 0,
      antiAlias: true
    },
    'inner-shadow': {
      color: '#000000',
      opacity: 0.75,
      angle: 135,
      distance: 5,
      choke: 0,
      size: 5,
      noise: 0,
      antiAlias: true
    },
    'outer-glow': {
      color: '#ffffff',
      opacity: 0.8,
      technique: 'softer',
      spread: 0,
      size: 10,
      noise: 0,
      antiAlias: true
    },
    'inner-glow': {
      color: '#ffffff',
      opacity: 0.8,
      technique: 'softer',
      choke: 0,
      size: 10,
      noise: 0,
      antiAlias: true
    },
    'bevel-emboss': {
      style: 'outer-bevel',
      technique: 'smooth',
      depth: 100,
      direction: 'up',
      size: 5,
      soften: 0,
      angle: 120,
      altitude: 30,
      highlightMode: 'screen',
      highlightOpacity: 0.75,
      highlightColor: '#ffffff',
      shadowMode: 'multiply',
      shadowOpacity: 0.75,
      shadowColor: '#000000'
    },
    'stroke': {
      size: 2,
      position: 'outside',
      blendMode: 'normal',
      opacity: 1.0,
      fillType: 'color',
      color: '#000000'
    },
    'color-overlay': {
      color: '#ff0000',
      blendMode: 'normal',
      opacity: 0.5
    },
    'gradient-overlay': {
      gradient: {
        type: 'linear',
        stops: [
          { color: '#ff0000', position: 0, opacity: 1 },
          { color: '#0000ff', position: 1, opacity: 1 }
        ],
        angle: 0
      },
      blendMode: 'normal',
      opacity: 0.5,
      style: 'linear',
      angle: 0,
      scale: 100,
      reverse: false,
      alignWithLayer: true
    },
    'pattern-overlay': {
      pattern: null,
      blendMode: 'normal',
      opacity: 0.5,
      scale: 100,
      linkWithLayer: true
    }
  };
  return defaults[type] || {};
}

const menuButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: 'none',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  padding: '4px 8px',
  textAlign: 'left',
  fontSize: '11px',
  borderRadius: '2px'
};

export default AdvancedLayerPanel;
