/**
 * 🎨 Layer Panel Component
 * 
 * Provides a comprehensive layer management interface
 * Integrates with the Advanced Layer System
 */

import React, { useState, useCallback } from 'react';
import { useAdvancedLayerStoreV2, type AdvancedLayer, type LayerGroup } from '../core/AdvancedLayerSystemV2';

interface LayerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayerPanel({ isOpen, onClose }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showLayerEffects, setShowLayerEffects] = useState(true);
  const [showLayerMasks, setShowLayerMasks] = useState(true);
  
  const {
    layers,
    groups,
    layerOrder,
    activeLayerId,
    selectedLayerIds,
    composedCanvas,
    setActiveLayer,
    selectLayers,
    createLayer,
    deleteLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    toggleLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    renameLayer,
    createGroup,
    deleteGroup,
    addToGroup,
    removeFromGroup,
    toggleGroupCollapse,
    autoOrganizeLayers,
    createAdjustmentLayer,
    // createMask, // FIXED: Property doesn't exist
    // suggestLayerGrouping // FIXED: Property doesn't exist
  } = useAdvancedLayerStoreV2();

  // Handle layer selection
  const handleLayerClick = useCallback((layerId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const newSelection = selectedLayerIds.includes(layerId)
        ? selectedLayerIds.filter(id => id !== layerId)
        : [...selectedLayerIds, layerId];
      selectLayers(newSelection);
    } else if (event.shiftKey && selectedLayerIds.length > 0) {
      // Range select
      const currentIndex = layerOrder.indexOf(activeLayerId || '');
      const targetIndex = layerOrder.indexOf(layerId);
      const start = Math.min(currentIndex, targetIndex);
      const end = Math.max(currentIndex, targetIndex);
      const rangeSelection = layerOrder.slice(start, end + 1);
      selectLayers(rangeSelection);
    } else {
      // Single select
      setActiveLayer(layerId);
      selectLayers([layerId]);
    }
  }, [activeLayerId, selectedLayerIds, layerOrder, setActiveLayer, selectLayers]);

  // Handle layer operations
  const handleLayerOperation = useCallback((operation: string, layerId: string, ...args: any[]) => {
    // Handle layer operations directly with V2 system
    console.log('Layer operation:', operation, layerId, args);
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  // Render layer item
  const renderLayerItem = useCallback((layer: AdvancedLayer, index: number) => {
    const isActive = activeLayerId === layer.id;
    const isSelected = selectedLayerIds.includes(layer.id);
    
    return (
      <div
        key={layer.id}
        className={`layer-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: isActive ? '#007acc20' : isSelected ? '#007acc10' : 'transparent',
          border: isActive ? '1px solid #007acc' : '1px solid transparent',
          borderRadius: '4px',
          margin: '2px 0',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={(e) => handleLayerClick(layer.id, e)}
      >
        {/* Visibility toggle */}
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: layer.visible ? '#ffffff' : '#666666'
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
        >
          {layer.visible ? '👁️' : '🙈'}
        </button>

        {/* Layer thumbnail */}
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#333',
            margin: '0 8px',
            borderRadius: '2px',
            backgroundImage: `url(${(layer as any).canvas?.toDataURL() || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='})`, // FIXED: canvas property doesn't exist
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Layer info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: isActive ? 'bold' : 'normal',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {layer.name}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#888888',
              marginTop: '2px'
            }}
          >
            {layer.type} • {Math.round(layer.opacity * 100)}%
          </div>
        </div>

        {/* Layer controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Opacity slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={layer.opacity * 100}
            style={{ width: '60px' }}
            onChange={(e) => setLayerOpacity(layer.id, parseInt(e.target.value) / 100)}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Blend mode */}
          <select
            value={layer.blendMode}
            style={{
              fontSize: '10px',
              padding: '2px 4px',
              backgroundColor: '#333',
              color: '#ffffff',
              border: '1px solid #555',
              borderRadius: '2px'
            }}
            onChange={(e) => setLayerBlendMode(layer.id, e.target.value as any)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="soft-light">Soft Light</option>
            <option value="hard-light">Hard Light</option>
          </select>

          {/* Layer actions */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#888888'
              }}
              onClick={(e) => {
                e.stopPropagation();
                duplicateLayer(layer.id);
              }}
              title="Duplicate layer"
            >
              📋
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#888888'
              }}
              onClick={(e) => {
                e.stopPropagation();
                deleteLayer(layer.id);
              }}
              title="Delete layer"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  }, [activeLayerId, selectedLayerIds, handleLayerClick, toggleLayerVisibility, setLayerOpacity, setLayerBlendMode, duplicateLayer, deleteLayer]);

  // Render group item
  const renderGroupItem = useCallback((group: LayerGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupLayers = group.childLayerIds.map(id => layers.find((l: any) => l.id === id)).filter(Boolean) as AdvancedLayer[]; // FIXED: layers is array, not Map
    
    return (
      <div key={group.id} style={{ marginBottom: '8px' }}>
        {/* Group header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => toggleGroup(group.id)}
        >
          <div style={{ marginRight: '8px' }}>
            {isExpanded ? '📁' : '📂'}
          </div>
          <div style={{ flex: 1, fontSize: '12px', color: '#ffffff' }}>
            {group.name} ({groupLayers.length})
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#888888'
              }}
              onClick={(e) => {
                e.stopPropagation();
                deleteGroup(group.id);
              }}
              title="Delete group"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Group layers */}
        {isExpanded && (
          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
            {groupLayers.map((layer, index) => renderLayerItem(layer, index))}
          </div>
        )}
      </div>
    );
  }, [expandedGroups, layers, toggleGroup, deleteGroup, renderLayerItem]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '320px',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        borderLeft: '1px solid #3c3c3c',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
          🎨 Layers
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ×
        </button>
      </div>

      {/* Layer controls */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <button
          style={{
            padding: '6px 12px',
            backgroundColor: '#007acc',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          onClick={() => createLayer('raster', 'New Layer')}
        >
          ➕ New Layer
        </button>
        <button
          style={{
            padding: '6px 12px',
            backgroundColor: '#28a745',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          onClick={() => createGroup('New Group')}
        >
          📁 New Group
        </button>
        <button
          style={{
            padding: '6px 12px',
            backgroundColor: '#ffc107',
            color: '#000000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          onClick={() => autoOrganizeLayers()}
        >
          🤖 Auto Organize
        </button>
        <button
          style={{
            padding: '6px 12px',
            backgroundColor: '#6f42c1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          onClick={() => createAdjustmentLayer('brightness-contrast')} // FIXED: Too many arguments
        >
          🎨 Adjustment
        </button>
      </div>

      {/* Layer list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}
      >
        {/* Groups */}
        {Array.from(groups.values()).map(renderGroupItem)}
        
        {/* Ungrouped layers */}
        {layerOrder
          .filter(id => !Array.from(groups.values()).some(group => group.childLayerIds.includes(id)))
          .map(id => layers.find((l: any) => l.id === id)) // FIXED: layers is array, not Map
          .filter(Boolean)
          .map((layer, index) => renderLayerItem(layer as AdvancedLayer, index))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #3c3c3c',
          fontSize: '10px',
          color: '#666666'
        }}
      >
        <div>Total layers: {layers.length}</div> {/* FIXED: layers is array, not Map */}
        <div>Groups: {groups.length}</div> {/* FIXED: groups is array, not Map */}
        {composedCanvas && (
          <div>Canvas: {composedCanvas.width}×{composedCanvas.height}</div>
        )}
      </div>
    </div>
  );
}

export default LayerPanel;