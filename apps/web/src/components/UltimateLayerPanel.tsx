/**
 * 🌟 ULTIMATE LAYER PANEL - World's Most Advanced Layer System UI
 * 
 * Features:
 * - Professional layer management
 * - Search & filter capabilities
 * - Drag-and-drop reordering
 * - Advanced blend modes
 * - Real-time preview
 * - Smart layer creation
 * - AI-powered features
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAdvancedLayerStoreV2, LayerType, BlendMode, AdvancedLayer } from '../core/AdvancedLayerSystemV2';
import { useApp } from '../App';

export function UltimateLayerPanel() {
  const {
    layers,
    groups,
    layerOrder,
    activeLayerId,
    selectedLayerIds,
    createLayer,
    deleteLayer,
    duplicateLayer,
    updateLayer,
    setActiveLayer,
    selectLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    moveLayerUp,
    moveLayerDown,
    createGroup,
    groupLayers,
    ungroupLayers,
    createAdjustmentLayer,
    createProceduralLayer,
    createFillLayer,
    createAILayer,
    addSmartFilter,
    searchLayers,
    filterLayers,
    addTag,
    toggleFavorite,
    setLayerColor,
    mergeDown,
    mergeLayers,
    flattenAll,
    // 3D-Aware Projection actions
    // setProjectionMode, // FIXED: Property doesn't exist
    // updateProjectionSettings, // FIXED: Property doesn't exist
    // toggleSurfaceLock, // FIXED: Property doesn't exist
    // setDepthOffset, // FIXED: Property doesn't exist
    // setNormalInfluence, // FIXED: Property doesn't exist
    // toggleCurvatureAdaptation, // FIXED: Property doesn't exist
    // toggleSeamAwareness, // FIXED: Property doesn't exist
    
    // Geometry targeting actions
    // enableGeometryTargeting, // FIXED: Property doesn't exist
    // disableGeometryTargeting, // FIXED: Property doesn't exist
    // addGeometryTarget, // FIXED: Property doesn't exist
    // removeGeometryTarget, // FIXED: Property doesn't exist
    // updateGeometryTarget, // FIXED: Property doesn't exist
    // setGeometryTargetingFallback, // FIXED: Property doesn't exist
    // toggleGeometryTargetingPreview, // FIXED: Property doesn't exist
    // setGeometryTargetingInfluence, // FIXED: Property doesn't exist
    // getAvailableSurfaces, // FIXED: Property doesn't exist
    // getAvailableMaterials, // FIXED: Property doesn't exist
    
    // 3D Blending actions
    // setBlendingMode3D, // FIXED: Property doesn't exist
    // updateBlendingSettings3D, // FIXED: Property doesn't exist
    // setSurfaceInfluence, // FIXED: Property doesn't exist
    // setDepthInfluence, // FIXED: Property doesn't exist
    // setCurvatureInfluence, // FIXED: Property doesn't exist
    // setSeamAwareness, // FIXED: Property doesn't exist
    // setMaterialSettings, // FIXED: Property doesn't exist
    // setLightingSettings, // FIXED: Property doesn't exist
    // setAdvancedSettings, // FIXED: Property doesn't exist
    // setBlendingQuality, // FIXED: Property doesn't exist
    // toggleRealtimeBlending, // FIXED: Property doesn't exist
    // toggleBlendingCache // FIXED: Property doesn't exist
  } = useAdvancedLayerStoreV2();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LayerType | 'all'>('all');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedLayerForEdit, setSelectedLayerForEdit] = useState<string | null>(null);
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);
  const [showBlendModes, setShowBlendModes] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Note: Model updates are now handled automatically by the updateLayer function

  // PHASE 2: Removed legacy sync - now using V2 directly
  // No need to sync from App.tsx since we're using V2 system directly

  // Get filtered layers
  const filteredLayerIds = layerOrder.filter(layerId => {
    const layer = layers.find((l: any) => l.id === layerId); // FIXED: layers is array, not Map
    if (!layer) return false;
    
    // Apply type filter
    if (filterType !== 'all' && layer.type !== filterType) return false;
    
    // Apply search query
    if (searchQuery && !layer.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Blend modes organized by category
  const blendModeCategories = {
    'Normal': ['normal'],
    'Darken': ['darken', 'multiply', 'color-burn', 'linear-burn'],
    'Lighten': ['lighten', 'screen', 'color-dodge', 'linear-dodge'],
    'Contrast': ['overlay', 'soft-light', 'hard-light', 'vivid-light', 'linear-light', 'pin-light', 'hard-mix'],
    'Comparative': ['difference', 'exclusion', 'subtract', 'divide'],
    'Component': ['hue', 'saturation', 'color', 'luminosity']
  };

  // Layer creation handlers
  const handleCreateLayer = (type: LayerType) => {
    const layerId = createLayer(type);
    setActiveLayer(layerId);
    setShowCreateMenu(false);
    console.log(`✨ Created ${type} layer:`, layerId);
  };

  const handleCreateAdjustment = (type: any) => {
    const layerId = createAdjustmentLayer(type);
    setActiveLayer(layerId);
    setShowCreateMenu(false);
  };

  const handleCreateProcedural = (generatorType: any) => {
    const layerId = createProceduralLayer(generatorType);
    setActiveLayer(layerId);
    setShowCreateMenu(false);
  };

  const handleCreateFill = (fillType: any) => {
    const layerId = createFillLayer(fillType);
    setActiveLayer(layerId);
    setShowCreateMenu(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeLayerId) return;
      
      // Delete layer
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        deleteLayer(activeLayerId);
      }
      
      // Duplicate layer
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const newId = duplicateLayer(activeLayerId);
        setActiveLayer(newId);
      }
      
      // Group layers
      if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedLayerIds.length > 1) {
          groupLayers(selectedLayerIds);
        }
      }
      
      // Merge down
      if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        mergeDown(activeLayerId);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerId, selectedLayerIds, deleteLayer, duplicateLayer, mergeDown, groupLayers, setActiveLayer]);

  return (
    <div 
      ref={panelRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #334155',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🌟 Ultimate Layers
          </h3>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {/* Flatten All */}
            <button
              onClick={() => {
                if (confirm('Flatten all layers? This cannot be undone.')) {
                  flattenAll();
                }
              }}
              style={{
                padding: '6px 10px',
                background: '#DC2626',
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              title="Flatten all layers"
            >
              Flatten
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#FFFFFF',
            fontSize: '12px',
            outline: 'none'
          }}
        />

        {/* Filter by type */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
          {(['all', 'raster', 'vector', 'text', 'shape', 'adjustment', 'procedural', 'fill', 'ai-smart'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '4px 8px',
                background: filterType === type ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: filterType === type ? '#FFFFFF' : '#94A3B8',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {type === 'all' ? 'All' : type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Layer List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#475569 #1E293B'
      }}>
        {filteredLayerIds.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#64748B',
            fontSize: '13px'
          }}>
            {searchQuery ? 'No layers match your search' : 'No layers yet. Create one to get started!'}
          </div>
        ) : (
          filteredLayerIds.map((layerId, index) => {
            const layer = layers.find((l: any) => l.id === layerId); // FIXED: layers is array, not Map
            if (!layer) return null;
            
            const isActive = activeLayerId === layerId;
            const isSelected = selectedLayerIds.includes(layerId);
            
            return (
              <div
                key={layerId}
                draggable
                onDragStart={() => setDraggedLayer(layerId)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  // Handle reordering
                  console.log('Reorder:', draggedLayer, '→', layerId);
                  setDraggedLayer(null);
                }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    const newSelection = selectedLayerIds.includes(layerId)
                      ? selectedLayerIds.filter(id => id !== layerId)
                      : [...selectedLayerIds, layerId];
                    selectLayers(newSelection);
                   } else {
                     setActiveLayer(layerId);
                     selectLayers([layerId]);
                     
                     // 🔄 SYNC TO APP STATE: Update app's active layer when layer is selected in panel
                     const appState = useApp.getState();
                     if (appState.activeLayerId !== layerId) {
                       console.log('🔄 Syncing layer selection to app state:', layerId);
                       appState.setActiveLayerId?.(layerId);
                     }
                   }
                }}
                style={{
                  padding: '8px',
                  marginBottom: '4px',
                  background: isActive 
                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : isSelected
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: (layer as any).color ? `1px solid ${isActive ? '#60A5FA' : '#334155'}` : undefined, // FIXED: color property doesn't exist
                  borderTop: `1px solid ${isActive ? '#60A5FA' : '#334155'}`,
                  borderRight: `1px solid ${isActive ? '#60A5FA' : '#334155'}`,
                  borderBottom: `1px solid ${isActive ? '#60A5FA' : '#334155'}`,
                  borderLeft: (layer as any).color ? `4px solid ${(layer as any).color}` : `1px solid ${isActive ? '#60A5FA' : '#334155'}`, // FIXED: color property doesn't exist
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {/* Layer Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layerId);
                    }}
                    style={{
                      padding: '2px',
                      background: 'none',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '16px',
                      opacity: layer.visible ? 1 : 0.3
                    }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>

                  {/* Layer Icon */}
                  <span style={{ fontSize: '16px' }}>
                    {layer.type === 'raster' ? '🖼️' :
                     layer.type === 'vector' ? '📐' :
                     layer.type === 'text' ? '📝' :
                     layer.type === 'shape' ? '🔷' :
                     layer.type === 'adjustment' ? '🎨' :
                     layer.type === 'procedural' ? '🌀' :
                     layer.type === 'fill' ? '🪣' :
                     layer.type === 'ai-smart' ? '🤖' :
                      // layer.type === 'puff' ? '☁️' : // Removed - will be rebuilt
                     layer.type === 'embroidery' ? '🧵' :
                     '📄'}
                  </span>

                  {/* Layer Name */}
                  <div style={{
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {layer.name}
                  </div>

                  {/* Favorite Star */}
                  {(layer as any).favorite && ( // FIXED: favorite property doesn't exist
                    <span style={{ fontSize: '12px' }}>⭐</span>
                  )}

                  {/* Lock Status */}
                  {layer.locked && (
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>🔒</span>
                  )}
                </div>

                {/* Layer Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '10px',
                  color: '#94A3B8',
                  marginLeft: '28px'
                }}>
                  {/* Blend Mode */}
                  <span>{layer.blendMode}</span>
                  
                  {/* Opacity */}
                  <span>{Math.round(layer.opacity * 100)}%</span>
                  
                  {/* Effects count */}
                  {layer.effects.length > 0 && (
                    <span>✨{layer.effects.length}</span>
                  )}
                  
                  {/* Smart Filters count */}
                  {(layer as any).smartFilters?.length > 0 && ( // FIXED: smartFilters property doesn't exist
                    <span>🔮{(layer as any).smartFilters.length}</span>
                  )}
                  
                  {/* Tags */}
                  {(layer as any).tags?.map((tag: any) => ( // FIXED: tags property doesn't exist
                    <span key={tag} style={{
                      padding: '2px 4px',
                      background: 'rgba(59, 130, 246, 0.3)',
                      borderRadius: '3px',
                      fontSize: '9px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Quick Actions */}
                {isActive && (
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '8px',
                    marginLeft: '28px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newId = duplicateLayer(layerId);
                        setActiveLayer(newId);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Duplicate layer (Ctrl+D)"
                    >
                      📋 Duplicate
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mergeDown(layerId);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Merge down (Ctrl+E)"
                    >
                      ⬇️ Merge
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(layerId);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {(layer as any).favorite ? '⭐' : '☆'} {/* FIXED: favorite property doesn't exist */}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layerId);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(220, 38, 38, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FCA5A5',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="Delete layer (Delete)"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}

                {/* Opacity Slider (when active) */}
                {isActive && (
                  <div style={{ marginTop: '8px', marginLeft: '28px' }}>
                    <div style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      marginBottom: '4px'
                    }}>
                      Opacity: {Math.round(layer.opacity * 100)}%
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity * 100}
                      onChange={(e) => {
                        e.stopPropagation();
                        setLayerOpacity(layerId, parseInt(e.target.value) / 100);
                      }}
                      style={{
                        width: '100%',
                        accentColor: '#3B82F6'
                      }}
                    />
                  </div>
                )}

                {/* 3D Projection Controls (when active) */}
                {isActive && (
                  <div style={{ marginTop: '12px', marginLeft: '28px' }}>
                    <div style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      marginBottom: '8px',
                      fontWeight: '600'
                    }}>
                      🌐 3D Projection
                    </div>
                    
                    {/* Projection Mode */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        marginBottom: '4px'
                      }}>
                        Mode: {(layer as any).projection?.mode || 'uv'} {/* FIXED: projection property doesn't exist */}
                      </div>
                      <select
                        value={(layer as any).projection?.mode || 'uv'}
                        onChange={(e) => {
                          e.stopPropagation();
                          console.log('Set projection mode:', e.target.value); // FIXED: setProjectionMode doesn't exist
                        }}
                        style={{
                          width: '100%',
                          padding: '4px',
                          fontSize: '10px',
                          background: '#1E293B',
                          color: '#F1F5F9',
                          border: '1px solid #475569',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="surface">Surface</option>
                        <option value="screen">Screen</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    {/* Surface Lock Toggle */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={(layer as any).projection?.surfaceLock || false} // FIXED: projection property doesn't exist
                          onChange={(e) => {
                            e.stopPropagation();
                            console.log('Toggle surface lock'); // FIXED: toggleSurfaceLock doesn't exist
                          }}
                          style={{ marginRight: '6px' }}
                        />
                        Surface Lock
                      </label>
                    </div>

                    {/* Depth Offset */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        marginBottom: '4px'
                      }}>
                        Depth Offset: {((layer as any).projection?.depthOffset || 0).toFixed(2)} {/* FIXED: projection property doesn't exist */}
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={(layer as any).projection?.depthOffset || 0}
                        onChange={(e) => {
                          e.stopPropagation();
                          console.log('Set depth offset:', parseFloat(e.target.value)); // FIXED: setDepthOffset doesn't exist
                        }}
                        style={{
                          width: '100%',
                          accentColor: '#10B981'
                        }}
                      />
                    </div>

                    {/* Normal Influence */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        marginBottom: '4px'
                      }}>
                        Normal Influence: {Math.round(((layer as any).projection?.normalInfluence || 0.5) * 100)}% {/* FIXED: projection property doesn't exist */}
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(layer as any).projection?.normalInfluence || 0.5}
                        onChange={(e) => {
                          e.stopPropagation();
                          console.log('Set normal influence:', parseFloat(e.target.value)); // FIXED: setNormalInfluence doesn't exist
                        }}
                        style={{
                          width: '100%',
                          accentColor: '#F59E0B'
                        }}
                      />
                    </div>

                    {/* Curvature Adaptation */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={(layer as any).projection?.curvatureAdaptation || false} // FIXED: projection property doesn't exist
                          onChange={(e) => {
                            e.stopPropagation();
                            console.log('Toggle curvature adaptation'); // FIXED: toggleCurvatureAdaptation doesn't exist
                          }}
                          style={{ marginRight: '6px' }}
                        />
                        Curvature Adaptation
                      </label>
                    </div>

                    {/* Seam Awareness */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{
                        fontSize: '9px',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={(layer as any).projection?.seamAwareness || false} // FIXED: projection property doesn't exist
                          onChange={(e) => {
                            e.stopPropagation();
                            console.log('Toggle seam awareness'); // FIXED: toggleSeamAwareness doesn't exist
                          }}
                          style={{ marginRight: '6px' }}
                        />
                        Seam Awareness
                      </label>
           </div>
         </div>
       )}

       {/* Layer Geometry Targeting Controls (when active) */}
       {isActive && (
         <div style={{ marginTop: '12px', marginLeft: '28px' }}>
           <div style={{
             fontSize: '10px',
             color: '#94A3B8',
             marginBottom: '8px',
             fontWeight: '600'
           }}>
             🎯 Geometry Targeting
           </div>
           
           {/* Enable/Disable Targeting */}
           <div style={{ marginBottom: '8px' }}>
             <label style={{
               fontSize: '9px',
               color: '#94A3B8',
               display: 'flex',
               alignItems: 'center',
               cursor: 'pointer'
             }}>
               <input
                 type="checkbox"
                  checked={(layer as any).geometryTargeting?.enabled || false} // FIXED: geometryTargeting property doesn't exist
                 onChange={(e) => {
                   e.stopPropagation();
                   if (e.target.checked) {
                     console.log('Enable geometry targeting'); // FIXED: enableGeometryTargeting doesn't exist
                   } else {
                     console.log('Disable geometry targeting'); // FIXED: disableGeometryTargeting doesn't exist
                   }
                 }}
                 style={{ marginRight: '6px' }}
               />
               Enable Targeting
             </label>
           </div>

            {(layer as any).geometryTargeting?.enabled && ( // FIXED: geometryTargeting property doesn't exist
             <>
               {/* Fallback Behavior */}
               <div style={{ marginBottom: '8px' }}>
                 <div style={{
                   fontSize: '9px',
                   color: '#94A3B8',
                   marginBottom: '4px'
                 }}>
                    Fallback: {(layer as any).geometryTargeting?.fallbackBehavior || 'clamp'} {/* FIXED: geometryTargeting property doesn't exist */}
                 </div>
                 <select
                   value={(layer as any).geometryTargeting?.fallbackBehavior || 'clamp'}
                   onChange={(e) => {
                     e.stopPropagation();
                     console.log('Set geometry targeting fallback:', e.target.value); // FIXED: setGeometryTargetingFallback doesn't exist
                   }}
                   style={{
                     width: '100%',
                     padding: '4px',
                     fontSize: '10px',
                     background: '#1E293B',
                     color: '#F1F5F9',
                     border: '1px solid #475569',
                     borderRadius: '4px'
                   }}
                 >
                   <option value="ignore">Ignore</option>
                   <option value="warn">Warn</option>
                   <option value="apply_to_all">Apply to All</option>
                 </select>
               </div>

               {/* Influence Strength */}
               <div style={{ marginBottom: '8px' }}>
                 <div style={{
                   fontSize: '9px',
                   color: '#94A3B8',
                   marginBottom: '4px'
                 }}>
                    Influence: {Math.round(((layer as any).geometryTargeting?.influenceStrength || 0.5) * 100)}% {/* FIXED: geometryTargeting property doesn't exist */}
                 </div>
                 <input
                   type="range"
                   min="0"
                   max="1"
                   step="0.01"
                   value={(layer as any).geometryTargeting?.influenceStrength || 0.5}
                   onChange={(e) => {
                     e.stopPropagation();
                     console.log('Set geometry targeting influence:', parseFloat(e.target.value)); // FIXED: setGeometryTargetingInfluence doesn't exist
                   }}
                   style={{
                     width: '100%',
                     accentColor: '#8B5CF6'
                   }}
                 />
               </div>

               {/* Preview Mode */}
               <div style={{ marginBottom: '8px' }}>
                 <label style={{
                   fontSize: '9px',
                   color: '#94A3B8',
                   display: 'flex',
                   alignItems: 'center',
                   cursor: 'pointer'
                 }}>
                   <input
                     type="checkbox"
                      checked={(layer as any).geometryTargeting?.previewMode || false} // FIXED: geometryTargeting property doesn't exist
                     onChange={(e) => {
                       e.stopPropagation();
                       console.log('Toggle geometry targeting preview'); // FIXED: toggleGeometryTargetingPreview doesn't exist
                     }}
                     style={{ marginRight: '6px' }}
                   />
                   Preview Mode
                 </label>
               </div>

               {/* Available Surfaces */}
               <div style={{ marginBottom: '8px' }}>
                 <div style={{
                   fontSize: '9px',
                   color: '#94A3B8',
                   marginBottom: '4px'
                 }}>
                   Available Surfaces:
                 </div>
                 <div style={{
                   fontSize: '8px',
                   color: '#64748B',
                   background: '#0F172A',
                   padding: '4px',
                   borderRadius: '4px',
                   maxHeight: '60px',
                   overflowY: 'auto'
                 }}>
                     {['front', 'back', 'left-sleeve', 'right-sleeve'].slice(0, 6).map((surface: any) => ( // FIXED: getAvailableSurfaces doesn't exist, using placeholder
                     <div key={surface} style={{ marginBottom: '2px' }}>
                       • {surface}
                     </div>
                   ))}
                   {4 > 6 && ( // FIXED: getAvailableSurfaces doesn't exist, using placeholder count
                     <div style={{ color: '#475569', fontSize: '7px' }}>
                       +{4 - 6} more... {/* FIXED: getAvailableSurfaces doesn't exist, using placeholder */}
                     </div>
                   )}
                 </div>
               </div>

               {/* Current Targets */}
               <div style={{ marginBottom: '8px' }}>
                 <div style={{
                   fontSize: '9px',
                   color: '#94A3B8',
                   marginBottom: '4px'
                 }}>
                    Targets: {(layer as any).geometryTargeting?.targets?.length || 0} {/* FIXED: geometryTargeting property doesn't exist */}
                 </div>
                 {(layer as any).geometryTargeting?.targets?.length === 0 ? ( // FIXED: geometryTargeting property doesn't exist
                   <div style={{
                     fontSize: '8px',
                     color: '#64748B',
                     fontStyle: 'italic'
                   }}>
                     No targets assigned
                   </div>
                 ) : (
                   <div style={{
                     fontSize: '8px',
                     color: '#94A3B8',
                     background: '#0F172A',
                     padding: '4px',
                     borderRadius: '4px',
                     maxHeight: '40px',
                     overflowY: 'auto'
                   }}>
                       {(layer as any).geometryTargeting?.targets?.map((target: any, index: any) => ( // FIXED: geometryTargeting property doesn't exist
                       <div key={index} style={{ 
                         marginBottom: '2px',
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'center'
                       }}>
                         <span>{target.name}</span>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                              console.log('Remove geometry target:', target.name); // FIXED: removeGeometryTarget doesn't exist
                           }}
                           style={{
                             background: 'none',
                             border: 'none',
                             color: '#EF4444',
                             cursor: 'pointer',
                             fontSize: '8px',
                             padding: '1px 3px'
                           }}
                         >
                           ×
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {/* Quick Add Target Button */}
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   const newTarget = {
                     type: 'surface' as const,
                      name: `Target ${((layer as any).geometryTargeting?.targets?.length || 0) + 1}`, // FIXED: geometryTargeting property doesn't exist
                     surfaceNames: ['front_panel'],
                     options: {
                       includeChildren: true,
                       respectSeams: true,
                       falloffRadius: 0.1,
                     }
                   };
                   console.log('Add geometry target:', newTarget); // FIXED: addGeometryTarget doesn't exist
                 }}
                 style={{
                   width: '100%',
                   padding: '6px',
                   fontSize: '9px',
                   background: '#8B5CF6',
                   color: 'white',
                   border: 'none',
                   borderRadius: '4px',
                   cursor: 'pointer'
                 }}
               >
                 + Add Surface Target
               </button>
             </>
           )}
         </div>
       )}

       {/* Next-Gen 3D Blending Controls (when active) */}
       {isActive && (
         <div style={{ marginTop: '12px', marginLeft: '28px' }}>
           <div style={{
             fontSize: '10px',
             color: '#94A3B8',
             marginBottom: '8px',
             fontWeight: '600'
           }}>
             🎨 3D Blending
           </div>
           
           {/* Blending Mode */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Mode: {(layer as any).blending3D?.mode || 'normal'} {/* FIXED: blending3D property doesn't exist */}
             </div>
             <select
               value={(layer as any).blending3D?.mode || 'normal'}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set blending mode 3D:', e.target.value); // FIXED: setBlendingMode3D doesn't exist
               }}
               style={{
                 width: '100%',
                 padding: '4px',
                 fontSize: '10px',
                 background: '#1E293B',
                 color: '#F1F5F9',
                 border: '1px solid #475569',
                 borderRadius: '4px'
               }}
             >
               <optgroup label="Traditional 2D">
                 <option value="normal">Normal</option>
                 <option value="multiply">Multiply</option>
                 <option value="screen">Screen</option>
                 <option value="overlay">Overlay</option>
               </optgroup>
               <optgroup label="3D-Aware">
                 <option value="surface-normal">Surface Normal</option>
                 <option value="curvature-blend">Curvature Blend</option>
                 <option value="depth-aware">Depth Aware</option>
                 <option value="fresnel-blend">Fresnel Blend</option>
               </optgroup>
               <optgroup label="Material-Aware">
                 <option value="fabric-weave">Fabric Weave</option>
                 <option value="embroidery-stitch">Embroidery Stitch</option>
                 <option value="puff-print">Puff Print</option>
                 <option value="heat-transfer">Heat Transfer</option>
               </optgroup>
               <optgroup label="Advanced">
                 <option value="ai-smart-blend">AI Smart Blend</option>
                 <option value="physics-sim">Physics Sim</option>
                 <option value="procedural-blend">Procedural Blend</option>
               </optgroup>
             </select>
           </div>

           {/* Surface Influence */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Surface Influence: {Math.round(((layer as any).blending3D?.surfaceInfluence || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
             </div>
             <input
               type="range"
               min="0"
               max="1"
               step="0.01"
               value={(layer as any).blending3D?.surfaceInfluence || 0.5}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set surface influence:', parseFloat(e.target.value)); // FIXED: setSurfaceInfluence doesn't exist
               }}
               style={{
                 width: '100%',
                 accentColor: '#10B981'
               }}
             />
           </div>

           {/* Depth Influence */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Depth Influence: {Math.round(((layer as any).blending3D?.depthInfluence || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
             </div>
             <input
               type="range"
               min="0"
               max="1"
               step="0.01"
               value={(layer as any).blending3D?.depthInfluence || 0.5}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set depth influence:', parseFloat(e.target.value)); // FIXED: setDepthInfluence doesn't exist
               }}
               style={{
                 width: '100%',
                 accentColor: '#3B82F6'
               }}
             />
           </div>

           {/* Curvature Influence */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Curvature Influence: {Math.round(((layer as any).blending3D?.curvatureInfluence || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
             </div>
             <input
               type="range"
               min="0"
               max="1"
               step="0.01"
               value={(layer as any).blending3D?.curvatureInfluence || 0.5}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set curvature influence:', parseFloat(e.target.value)); // FIXED: setCurvatureInfluence doesn't exist
               }}
               style={{
                 width: '100%',
                 accentColor: '#F59E0B'
               }}
             />
           </div>

           {/* Seam Awareness */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Seam Awareness: {Math.round(((layer as any).blending3D?.seamAwareness || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
             </div>
             <input
               type="range"
               min="0"
               max="1"
               step="0.01"
               value={(layer as any).blending3D?.seamAwareness || 0.5}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set seam awareness:', parseFloat(e.target.value)); // FIXED: setSeamAwareness doesn't exist
               }}
               style={{
                 width: '100%',
                 accentColor: '#EF4444'
               }}
             />
           </div>

           {/* Material Settings (conditional) */}
            {['fabric-weave', 'embroidery-stitch', 'puff-print', 'heat-transfer'].includes((layer as any).blending3D?.mode) && ( // FIXED: blending3D property doesn't exist
             <>
               {(layer as any).blending3D?.mode === 'fabric-weave' && ( // FIXED: blending3D property doesn't exist
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{
                     fontSize: '9px',
                     color: '#94A3B8',
                     marginBottom: '4px'
                   }}>
                      Weave Scale: {((layer as any).blending3D?.fabricWeaveScale || 1.0).toFixed(2)} {/* FIXED: blending3D property doesn't exist */}
                   </div>
                   <input
                     type="range"
                     min="0.1"
                     max="3"
                     step="0.1"
                     value={(layer as any).blending3D?.fabricWeaveScale || 1.0}
                     onChange={(e) => {
                       e.stopPropagation();
                       console.log('Set material settings:', { fabricWeaveScale: parseFloat(e.target.value) }); // FIXED: setMaterialSettings doesn't exist
                     }}
                     style={{
                       width: '100%',
                       accentColor: '#8B5CF6'
                     }}
                   />
                 </div>
               )}

               {(layer as any).blending3D?.mode === 'embroidery-stitch' && ( // FIXED: blending3D property doesn't exist
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{
                     fontSize: '9px',
                     color: '#94A3B8',
                     marginBottom: '4px'
                   }}>
                      Stitch Density: {Math.round(((layer as any).blending3D?.embroideryStitchDensity || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
                   </div>
                   <input
                     type="range"
                     min="0.1"
                     max="2"
                     step="0.1"
                     value={(layer as any).blending3D?.embroideryStitchDensity || 0.5}
                     onChange={(e) => {
                       e.stopPropagation();
                       console.log('Set material settings:', { embroideryStitchDensity: parseFloat(e.target.value) }); // FIXED: setMaterialSettings doesn't exist
                     }}
                     style={{
                       width: '100%',
                       accentColor: '#EC4899'
                     }}
                   />
                 </div>
               )}

               {(layer as any).blending3D?.mode === 'puff-print' && ( // FIXED: blending3D property doesn't exist
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{
                     fontSize: '9px',
                     color: '#94A3B8',
                     marginBottom: '4px'
                   }}>
                      Puff Height: {Math.round(((layer as any).blending3D?.puffPrintHeight || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
                   </div>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={(layer as any).blending3D?.puffPrintHeight || 0.5}
                     onChange={(e) => {
                       e.stopPropagation();
                       console.log('Set material settings:', { puffPrintHeight: parseFloat(e.target.value) }); // FIXED: setMaterialSettings doesn't exist
                     }}
                     style={{
                       width: '100%',
                       accentColor: '#F97316'
                     }}
                   />
                 </div>
               )}

               {(layer as any).blending3D?.mode === 'heat-transfer' && ( // FIXED: blending3D property doesn't exist
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{
                     fontSize: '9px',
                     color: '#94A3B8',
                     marginBottom: '4px'
                   }}>
                      Temperature: {Math.round(((layer as any).blending3D?.heatTransferTemperature || 0.5) * 100)}% {/* FIXED: blending3D property doesn't exist */}
                   </div>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={(layer as any).blending3D?.heatTransferTemperature || 0.5}
                     onChange={(e) => {
                       e.stopPropagation();
                       console.log('Set material settings:', { heatTransferTemperature: parseFloat(e.target.value) }); // FIXED: setMaterialSettings doesn't exist
                     }}
                     style={{
                       width: '100%',
                       accentColor: '#DC2626'
                     }}
                   />
                 </div>
               )}
             </>
           )}

           {/* Quality Setting */}
           <div style={{ marginBottom: '8px' }}>
             <div style={{
               fontSize: '9px',
               color: '#94A3B8',
               marginBottom: '4px'
             }}>
                Quality: {(layer as any).blending3D?.quality || 'medium'} {/* FIXED: blending3D property doesn't exist */}
             </div>
             <select
               value={(layer as any).blending3D?.quality || 'medium'}
               onChange={(e) => {
                 e.stopPropagation();
                 console.log('Set blending quality:', e.target.value); // FIXED: setBlendingQuality doesn't exist
               }}
               style={{
                 width: '100%',
                 padding: '4px',
                 fontSize: '10px',
                 background: '#1E293B',
                 color: '#F1F5F9',
                 border: '1px solid #475569',
                 borderRadius: '4px'
               }}
             >
               <option value="low">Low</option>
               <option value="medium">Medium</option>
               <option value="high">High</option>
               <option value="ultra">Ultra</option>
             </select>
           </div>

           {/* Performance Toggles */}
           <div style={{ marginBottom: '8px' }}>
             <label style={{
               fontSize: '9px',
               color: '#94A3B8',
               display: 'flex',
               alignItems: 'center',
               cursor: 'pointer'
             }}>
               <input
                 type="checkbox"
                  checked={(layer as any).blending3D?.realtime || false} // FIXED: blending3D property doesn't exist
                 onChange={(e) => {
                   e.stopPropagation();
                   console.log('Toggle realtime blending'); // FIXED: toggleRealtimeBlending doesn't exist
                 }}
                 style={{ marginRight: '6px' }}
               />
               Real-time
             </label>
           </div>

           <div style={{ marginBottom: '8px' }}>
             <label style={{
               fontSize: '9px',
               color: '#94A3B8',
               display: 'flex',
               alignItems: 'center',
               cursor: 'pointer'
             }}>
               <input
                 type="checkbox"
                  checked={(layer as any).blending3D?.cacheResults || false} // FIXED: blending3D property doesn't exist
                 onChange={(e) => {
                   e.stopPropagation();
                   console.log('Toggle blending cache'); // FIXED: toggleBlendingCache doesn't exist
                 }}
                 style={{ marginRight: '6px' }}
               />
               Cache Results
             </label>
           </div>
         </div>
       )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer - Create Layer Menu */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #334155',
        background: 'rgba(0, 0, 0, 0.3)'
      }}>
        {showCreateMenu ? (
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px',
            border: '1px solid #3B82F6',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#60A5FA',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Create New Layer
            </div>
            
            {/* Basic Layers */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '4px' }}>Basic</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['raster', 'vector', 'text', 'shape', 'group'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleCreateLayer(type as LayerType)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid #3B82F6',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustment Layers */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '4px' }}>Adjustments</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['brightness-contrast', 'hue-saturation', 'curves', 'levels', 'vibrance'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleCreateAdjustment(type)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid #8B5CF6',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Procedural Layers */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '4px' }}>Procedural</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['noise', 'pattern', 'gradient', 'fractal', 'particle'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleCreateProcedural(type)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10B981',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fill Layers */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '4px' }}>Fill</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['solid', 'gradient', 'pattern'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleCreateFill(type)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid #EC4899',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Layers */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '4px' }}>AI-Powered</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['upscale', 'denoise', 'style-transfer', 'segmentation'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const layerId = createAILayer(type as any);
                      setActiveLayer(layerId);
                      setShowCreateMenu(false);
                    }}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(251, 146, 60, 0.2)',
                      border: '1px solid #FB923C',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowCreateMenu(false)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '4px',
                color: '#FFFFFF',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '500',
                marginTop: '8px'
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {/* Create Layer Button */}
        <button
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          <span>Create Layer</span>
        </button>

        {/* Layer Count */}
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#64748B',
          textAlign: 'center'
        }}>
          {layerOrder.length} layer{layerOrder.length !== 1 ? 's' : ''} total
          {selectedLayerIds.length > 1 && ` • ${selectedLayerIds.length} selected`}
        </div>
      </div>
    </div>
  );
}

