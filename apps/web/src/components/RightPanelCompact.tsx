import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { useApp } from '../App';
// REMOVED: Conflicting layer systems - using AdvancedLayerSystemV2 only
// import { useLayerManager } from '../stores/LayerManager';
// import { layerIntegration } from '../services/LayerIntegration';
// import { useAdvancedLayerStore } from '../core/AdvancedLayerSystem';
import { useAdvancedLayerStoreV2, AdvancedLayer, LayerGroup, BlendMode, LayerEffect, LayerMask } from '../core/AdvancedLayerSystemV2';
import { useLayerSelectionSystem } from '../core/LayerSelectionSystem';
import { EnhancedTextSettings } from './EnhancedTextSettings';
// PuffSettings removed - will be rebuilt with new 3D geometry approach

// Enhanced Layer Item Component
interface EnhancedLayerItemProps {
  layer: AdvancedLayer;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetOpacity: (opacity: number) => void;
  onSetBlendMode: (blendMode: BlendMode) => void;
  onReorderLayers: (newOrder: string[]) => void;
  allLayers: AdvancedLayer[];
}

const EnhancedLayerItem: React.FC<EnhancedLayerItemProps> = ({
  layer,
  isActive,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onSetOpacity,
  onSetBlendMode,
  onReorderLayers,
  allLayers
}) => {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [tempName, setTempName] = React.useState(layer.name);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
  const [showDuplicationMenu, setShowDuplicationMenu] = React.useState(false);
  const [showDeletionMenu, setShowDeletionMenu] = React.useState(false);
  const [showLockMenu, setShowLockMenu] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleGlobalClick = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('click', handleGlobalClick);
      return () => document.removeEventListener('click', handleGlobalClick);
    }
  }, [showContextMenu]);

  const handleRename = () => {
    if (tempName.trim() && tempName !== layer.name) {
      onRename(tempName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTempName(layer.name);
      setIsRenaming(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleLayerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd
      onSelect();
    } else {
      // Single select
      onSelect();
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', layer.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    console.log('🎨 Drag started for layer:', layer.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    console.log('🎨 Drag ended for layer:', layer.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedLayerId = e.dataTransfer.getData('text/plain');
    if (draggedLayerId !== layer.id) {
      // Get the current layer order
      const currentLayers = Array.from(allLayers).sort((a, b) => b.order - a.order);
      const draggedIndex = currentLayers.findIndex(l => l.id === draggedLayerId);
      const targetIndex = currentLayers.findIndex(l => l.id === layer.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Create new order array
        const newOrder = currentLayers.map(l => l.id);
        
        // Remove dragged layer from its current position
        newOrder.splice(draggedIndex, 1);
        
        // Insert dragged layer at target position
        const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newOrder.splice(insertIndex, 0, draggedLayerId);
        
        // Apply the new order
        onReorderLayers(newOrder);
        console.log('🎨 Reordered layers:', newOrder);
      }
    }
  };

  const getLayerIcon = () => {
    switch (layer.type) {
      case 'paint': return '🎨';
      case 'image': return '🖼️';
      case 'text': return '📝';
      case 'group': return '📁';
      case 'adjustment': return '🎛️';
      default: return '📄';
    }
  };

  return (
    <div 
      style={{
        padding: '6px 8px',
        marginBottom: '2px',
        background: isActive 
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
          : isSelected 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03))'
            : 'rgba(255, 255, 255, 0.02)',
        border: isActive 
          ? '1px solid rgba(255, 255, 255, 0.15)' 
          : isSelected
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '9px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        opacity: layer.visible ? 1 : 0.4,
        transform: isDragging ? 'scale(0.98)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive 
          ? '0 2px 8px rgba(0, 0, 0, 0.3)'
          : isSelected 
            ? '0 1px 4px rgba(0, 0, 0, 0.2)'
            : 'none',
        backdropFilter: 'blur(8px)',
        minHeight: '32px',
        maxHeight: '40px'
      }}
      onClick={handleLayerClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Visibility Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: layer.visible ? '#E8E8E8' : '#666666',
            cursor: 'pointer',
            fontSize: '10px',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px'
          }}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? '👁️' : '🙈'}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: layer.locked ? '#E8E8E8' : '#666666',
            cursor: 'pointer',
            fontSize: '10px',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px'
          }}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? '🔒' : '🔓'}
        </button>

        {/* Layer Icon */}
        <span style={{ 
          fontSize: '12px', 
          color: '#D0D0D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px'
        }}>
          {getLayerIcon()}
        </span>

        {/* Layer Thumbnail */}
        <div style={{
          width: '20px',
          height: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: '#999',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {layer.thumbnail ? (
            <img 
              src={layer.thumbnail} 
              alt={layer.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '3px'
              }}
            />
          ) : (
            <span style={{ fontSize: '8px', color: '#666' }}>{getLayerIcon()}</span>
          )}
        </div>

        {/* Layer Name */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#F5F5F5',
              width: '120px',
              fontWeight: '400',
              letterSpacing: '0.3px',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
          />
        ) : (
          <span 
            style={{ 
              color: isActive ? '#F5F5F5' : '#C0C0C0',
              fontWeight: isActive ? '500' : '400',
              fontSize: '11px',
              letterSpacing: '0.3px',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginLeft: '8px',
              cursor: 'pointer'
            }}
            onDoubleClick={() => setIsRenaming(true)}
          >
            {layer.name}
          </span>
        )}

        {/* Layer Type Badge */}
        <span style={{ 
          fontSize: '6px', 
          color: '#999',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '1px 3px',
          borderRadius: '2px'
        }}>
          {layer.type}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Move Up */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            style={{
              padding: '2px',
              fontSize: '7px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              color: '#C0C0C0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px'
            }}
            title="Move up (higher in stack)"
          >
            ▲
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            style={{
              padding: '2px',
              fontSize: '7px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              color: '#C0C0C0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px'
            }}
            title="Move down (lower in stack)"
          >
            ▼
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            style={{
              padding: '2px',
              fontSize: '7px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              color: '#C0C0C0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px'
            }}
            title="Duplicate layer"
          >
            📋
          </button>

          {/* Enhanced Duplication Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDuplicationMenu(!showDuplicationMenu); }}
              style={{
                padding: '2px',
                fontSize: '7px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '3px',
                color: '#C0C0C0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px'
              }}
              title="Advanced duplicate options"
            >
              ⚙️
            </button>
            
            {/* Duplication Menu */}
            {showDuplicationMenu && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(30, 30, 30, 0.98))',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 99999,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                minWidth: '200px'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowDuplicationMenu(false); }}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    color: '#E8E8E8',
                    textAlign: 'left',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    transition: 'all 0.15s ease',
                    fontWeight: '400'
                  }}
                >
                  📋 Duplicate Layer
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowDuplicationMenu(false); }}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '7px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    marginTop: '2px'
                  }}
                >
                  ✨ Duplicate + Effects
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Deletion Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeletionMenu(!showDeletionMenu); }}
              style={{
                padding: '1px 2px',
                fontSize: '6px',
                background: layer.locked ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                border: 'none',
                color: layer.locked ? '#ff6b6b' : '#ff6666',
                cursor: 'pointer',
                borderRadius: '2px'
              }}
              title="Delete options"
            >
              🗑️
            </button>
            
            {/* Deletion Menu */}
            {showDeletionMenu && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 0, 0, 0.98)',
                border: '2px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '6px',
                padding: '8px',
                zIndex: 99999,
                minWidth: '150px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowDeletionMenu(false); }}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '7px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff6666',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete Layer
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowDeletionMenu(false); }}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '7px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff6666',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    marginTop: '2px'
                  }}
                >
                  💀 Permanent Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Opacity Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(layer.opacity * 100)}
          onChange={(e) => {
            const opacity = parseInt(e.target.value) / 100;
            onSetOpacity(opacity);
          }}
          style={{
            width: '24px',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.15)',
            outline: 'none',
            cursor: 'pointer',
            borderRadius: '1px'
          }}
          title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
        />
        <span style={{ fontSize: '6px', color: '#999', minWidth: '16px', textAlign: 'center' }}>
          {Math.round(layer.opacity * 100)}%
        </span>
      </div>

      {/* Right-Click Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(30, 30, 30, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 99999,
            minWidth: '180px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)'
          }}
          onClick={closeContextMenu}
        >
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            marginBottom: '8px', 
            color: '#F5F5F5',
            letterSpacing: '0.3px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '6px'
          }}>
            {layer.name}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {layer.visible ? '👁️' : '🙈'} {layer.visible ? 'Hide Layer' : 'Show Layer'}
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: layer.locked ? '#ff6b6b' : '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {layer.locked ? '🔒' : '🔓'} {layer.locked ? 'Unlock Layer' : 'Lock Layer'}
            </button>
            
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '3px 0' }}></div>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              📋 Duplicate Layer
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              ↑ Move Up
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              ↓ Move Down
            </button>
            
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '3px 0' }}></div>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '10px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '4px',
                color: '#EF4444',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontWeight: '500'
              }}
            >
              🗑️ Delete Layer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Group Item Component
interface EnhancedGroupItemProps {
  group: LayerGroup;
  isActive: boolean;
  isSelected: boolean;
  layers: Map<string, AdvancedLayer>;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetOpacity: (opacity: number) => void;
  onSetBlendMode: (blendMode: BlendMode) => void;
}

const EnhancedGroupItem: React.FC<EnhancedGroupItemProps> = ({
  group,
  isActive,
  isSelected,
  layers,
  onSelect,
  onToggleCollapse,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onSetOpacity,
  onSetBlendMode
}) => {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [tempName, setTempName] = React.useState(group.name);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
  const [showDuplicationMenu, setShowDuplicationMenu] = React.useState(false);
  const [showDeletionMenu, setShowDeletionMenu] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleGlobalClick = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('click', handleGlobalClick);
      return () => document.removeEventListener('click', handleGlobalClick);
    }
  }, [showContextMenu]);

  const handleRename = () => {
    if (tempName.trim() && tempName !== group.name) {
      onRename(tempName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTempName(group.name);
      setIsRenaming(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleGroupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd
      onSelect();
    } else {
      // Single select
      onSelect();
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', group.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    console.log('🎨 Drag started for group:', group.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    console.log('🎨 Drag ended for group:', group.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== group.id) {
      // Determine drop position based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
      console.log('🎨 Dropped item', draggedId, position, 'group', group.id);
      // Note: We would need to implement reordering logic here
    }
  };

  const childLayers = Array.from(layers.values()).filter(layer => layer.groupId === group.id);
  const visibleChildCount = childLayers.filter(layer => layer.visible).length;

  return (
    <div 
      style={{
        padding: '6px 8px',
        marginBottom: '2px',
        background: isActive 
          ? 'rgba(255, 165, 0, 0.2)' 
          : isSelected 
            ? 'rgba(255, 165, 0, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
        border: isActive 
          ? '1px solid rgba(255, 165, 0, 0.5)' 
          : isSelected
            ? '1px solid rgba(255, 165, 0, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '9px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s ease'
      }}
      onClick={handleGroupClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Collapse/Expand Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            color: '#FFA500',
            cursor: 'pointer',
            fontSize: '8px'
          }}
          title={group.collapsed ? 'Expand group' : 'Collapse group'}
        >
          {group.collapsed ? '▶️' : '🔽'}
        </button>

        {/* Visibility Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            color: group.visible ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: '8px'
          }}
          title={group.visible ? 'Hide group' : 'Show group'}
        >
          {group.visible ? '👁️' : '🙈'}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            color: group.locked ? '#ff6b6b' : '#999',
            cursor: 'pointer',
            fontSize: '8px'
          }}
          title={group.locked ? 'Unlock group' : 'Lock group'}
        >
          {group.locked ? '🔒' : '🔓'}
        </button>

        {/* Group Icon */}
        <span style={{ fontSize: '10px' }}>📁</span>

        {/* Group Name */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.5)',
              borderRadius: '2px',
              padding: '1px 4px',
              fontSize: '8px',
              color: '#fff',
              width: '80px'
            }}
          />
        ) : (
          <span 
            style={{ 
              color: group.visible ? '#fff' : '#666',
              fontWeight: isActive ? '600' : '400',
              fontSize: '8px'
            }}
            onDoubleClick={() => setIsRenaming(true)}
          >
            {group.name}
          </span>
        )}

        {/* Layer Count Badge */}
        <span style={{ 
          fontSize: '6px', 
          color: '#FFA500',
          background: 'rgba(255, 165, 0, 0.2)',
          padding: '1px 3px',
          borderRadius: '2px'
        }}>
          {childLayers.length} layers
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Move Up */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            style={{
              padding: '1px 2px',
              fontSize: '6px',
              background: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer'
            }}
            title="Move group up"
          >
            ▲
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            style={{
              padding: '1px 2px',
              fontSize: '6px',
              background: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer'
            }}
            title="Move group down"
          >
            ▼
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            style={{
              padding: '1px 2px',
              fontSize: '6px',
              background: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer'
            }}
            title="Duplicate group"
          >
            📋
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              padding: '1px 2px',
              fontSize: '6px',
              background: group.locked ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 0, 0, 0.2)',
              border: 'none',
              color: group.locked ? '#ff6b6b' : '#ff6666',
              cursor: 'pointer',
              borderRadius: '2px'
            }}
            title="Delete group"
          >
            🗑️
          </button>
        </div>

        {/* Opacity Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(group.opacity * 100)}
          onChange={(e) => {
            const opacity = parseInt(e.target.value) / 100;
            onSetOpacity(opacity);
          }}
          style={{
            width: '30px',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.2)',
            outline: 'none',
            cursor: 'pointer'
          }}
          title={`Group Opacity: ${Math.round(group.opacity * 100)}%`}
        />
        <span style={{ fontSize: '6px', color: '#999', minWidth: '20px' }}>
          {Math.round(group.opacity * 100)}%
        </span>
      </div>

      {/* Right-Click Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '8px',
            zIndex: 99999,
            minWidth: '150px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
          onClick={closeContextMenu}
        >
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: '#FFA500' }}>
            {group.name}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {group.visible ? '👁️' : '🙈'} {group.visible ? 'Hide Group' : 'Show Group'}
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: group.locked ? '#ff6b6b' : '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {group.locked ? '🔒' : '🔓'} {group.locked ? 'Unlock Group' : 'Lock Group'}
            </button>
            
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '3px 0' }}></div>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              📋 Duplicate Group
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              ↑ Move Up
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              ↓ Move Down
            </button>
            
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '3px 0' }}></div>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); closeContextMenu(); }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                fontSize: '8px',
                background: 'transparent',
                border: 'none',
                color: '#ff6666',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface RightPanelCompactProps {
  activeToolSidebar?: string | null;
}

export function RightPanelCompact({ activeToolSidebar }: RightPanelCompactProps) {
  // Panel height state for resizing
  const [toolSettingsHeight, setToolSettingsHeight] = React.useState(400);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [dragStartHeight, setDragStartHeight] = React.useState(0);

  // Legacy stores
  const {
    brushColor,
    brushSize,
    brushOpacity,
    brushHardness,
    brushFlow,
    brushShape,
    brushSpacing,
    blendMode,
    symmetryX,
    symmetryY,
    symmetryZ,
    activeTool,
    customBrushImage,
    setBrushColor,
    setBrushSize,
    setBrushOpacity,
    setBrushHardness,
    setBrushShape,
    setBrushSpacing,
    setBrushFlow,
    setBlendMode,
    setBrushSymmetry,
    setCustomBrushImage,
    setSymmetryX,
    setSymmetryY,
    setSymmetryZ,
    // Embroidery settings
    embroideryStitchType,
    embroideryThreadColor,
    embroideryThreadThickness,
    embroiderySpacing,
    embroideryDensity,
    embroideryPattern,
    setEmbroideryStitchType,
    setEmbroideryThreadColor,
    setEmbroideryThreadThickness,
    setEmbroiderySpacing,
    setEmbroideryDensity,
    setEmbroideryPattern,
    // Puff tool settings
    puffSize,
    puffHeight,
    puffColor,
    puffOpacity,
    puffSoftness,
    puffHairs,
    puffHairHeight,
    puffHairDensity,
    puffHairThickness,
    puffHairVariation,
    setPuffSize,
    setPuffHeight,
    setPuffColor,
    setPuffOpacity,
    setPuffSoftness,
    setPuffHairs,
    setPuffHairHeight,
    setPuffHairDensity,
    setPuffHairThickness,
    setPuffHairVariation,
    // Phase 1: Shape Customization
    puffTopShape,
    puffBottomShape,
    puffCrossSectionShape,
    puffProfileCurve,
    puffEdgeRadius,
    puffTaperAmount,
    setPuffTopShape,
    setPuffBottomShape,
    setPuffCrossSectionShape,
    setPuffProfileCurve,
    setPuffEdgeRadius,
    setPuffTaperAmount,
    // Phase 3: Material & Texture
    puffFabricType,
    puffRoughness,
    puffTextureIntensity,
    puffEnableNormalMap,
    setPuffFabricType,
    setPuffRoughness,
    setPuffTextureIntensity,
    setPuffEnableNormalMap,
    // Phase 4: Edge Details
    puffEdgeType,
    puffEdgeWidth,
    puffEdgeColor,
    setPuffEdgeType,
    setPuffEdgeWidth,
    setPuffEdgeColor,
    // Phase 5: Advanced
    puffDetailLevel,
    puffSmoothness,
    setPuffDetailLevel,
    setPuffSmoothness,
    // Text settings
    textSize,
    textFont,
    textColor,
    textBold,
    textItalic,
    textAlign,
    setTextSize,
    setTextFont,
    setTextColor,
    setTextBold,
    setTextItalic,
    setTextAlign,
    // Text elements and management
    textElements,
    activeTextId,
    selectTextElement,
    updateTextElement,
    deleteTextElement,
    addTextElement,
    // Shape settings
    shapeElements,
    activeShapeId,
    setActiveShapeId,
    updateShapeElement,
    deleteShapeElement,
    duplicateShapeElement,
    // Image settings
    selectedImageId,
    setSelectedImageId,
    removeImportedImage,
    // Vector tool settings
    vectorEditMode,
    setVectorEditMode,
    vectorPaths,
    activePathId,
    selectedAnchor,
    vectorStrokeColor,
    vectorStrokeWidth,
    vectorFillColor,
    vectorFill,
    setVectorStrokeColor,
    setVectorStrokeWidth,
    setVectorFillColor,
    setVectorFill,
    setSelectedAnchor,
    addAnchorAtPoint,
    removeAnchor,
    convertAnchorType,
    closePath,
    openPath,
    joinPaths,
    splitPath,
    reversePath,
    simplifyPath,
    smoothPath,
    offsetPath,
    unionPaths,
    subtractPaths,
    intersectPaths,
    excludePaths,
    scalePath,
    rotatePath,
    flipPath,
    alignAnchors
  } = useApp();

  // Advanced Layer Store V2
  const {
    layers: advancedLayers,
    groups: advancedGroups,
    layerOrder: advancedLayerOrder,
    selectedLayerIds: advancedSelectedLayerIds,
    activeLayerId: advancedActiveLayerId,
    createLayer: createLayer,
    deleteLayer: deleteLayer,
    duplicateLayer: duplicateLayer,
    renameLayer: renameLayer,
    selectLayer: selectLayer,
    clearSelection: clearLayerSelection,
    setActiveLayer: setActiveLayer,
    setLayerVisibility: setLayerVisibility,
    setLayerOpacity: setLayerOpacity,
    setLayerBlendMode: setLayerBlendMode,
    setLayerLocked: setLayerLocked,
    moveLayerUp: moveLayerUp,
    moveLayerDown: moveLayerDown,
    moveLayerToTop: moveLayerToTop,
    moveLayerToBottom: moveLayerToBottom,
    reorderLayers: reorderLayers,
    createGroup: createGroup,
    deleteGroup: deleteGroup,
    addToGroup: addToGroup,
    removeFromGroup: removeFromGroup,
    toggleGroupCollapse: toggleGroupCollapse,
    autoGroupLayers: autoGroupLayers,
    addEffect,
    removeEffect,
    updateEffect,
    addMask,
    removeMask,
    updateMask,
    toggleMaskEnabled,
    toggleMaskInverted,
    generateLayerName: generateAdvancedLayerName,
    selectLayers,
    clearSelection,
    deleteSelectedLayers,
    duplicateSelectedLayers,
    renameGroup
  } = useAdvancedLayerStoreV2();

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('🎨 Keyboard event:', e.key, 'Ctrl:', e.ctrlKey, 'Selected layers:', advancedSelectedLayerIds.length);
      
      // Ctrl+A: Select all layers
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        // Select all layers
        const allLayerIds = advancedLayers.map(layer => layer.id);
        selectLayers(allLayerIds);
        console.log('🎨 Selected all layers (Ctrl+A)');
      }
      
      // Escape: Clear selection
      if (e.key === 'Escape') {
        clearSelection();
        console.log('🎨 Cleared layer selection (Escape)');
      }
      
      // Delete: Delete selected layers
      if (e.key === 'Delete' && advancedSelectedLayerIds.length > 0) {
        e.preventDefault();
        console.log('🎨 Attempting to delete selected layers:', advancedSelectedLayerIds);
        deleteSelectedLayers();
        console.log('🎨 Deleted selected layers (Delete key)');
      }
      
      // Ctrl+D: Duplicate selected layers
      if (e.ctrlKey && e.key === 'd' && advancedSelectedLayerIds.length > 0) {
        e.preventDefault();
        console.log('🎨 Attempting to duplicate selected layers:', advancedSelectedLayerIds);
        duplicateSelectedLayers();
        console.log('🎨 Duplicated selected layers (Ctrl+D)');
      }
    };

    console.log('🎨 Adding keyboard event listener');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('🎨 Removing keyboard event listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advancedSelectedLayerIds, advancedLayers, selectLayers, clearSelection, deleteSelectedLayers, duplicateSelectedLayers]);

  // Automatic Layer Manager - REMOVED (simplified system)
  const autoCreationEnabled = false;
  const eventHistory: any[] = [];
  const autoManagerLayers: any[] = [];
  const autoManagerActiveLayerId = null;
  const autoManagerSelectedLayerIds: string[] = [];

  // Selection System
  const {
    selectedElements,
    activeElement,
    selectionMode,
    clearSelection: clearElementSelection,
    setSelectionMode,
    moveElement,
    resizeElement,
  } = useLayerSelectionSystem();

  // Remove old Advanced Layer Store usage - using V2 only

  const [activeTab, setActiveTab] = React.useState('brush');
  const [userSelectedTab, setUserSelectedTab] = React.useState(false); // Track if user manually selected a tab
  const [fontUpdateTrigger, setFontUpdateTrigger] = React.useState(0); // Trigger re-render when fonts are loaded
  
  // Color/Gradient mode states for each tool
  const [brushColorMode, setBrushColorMode] = React.useState<'solid' | 'gradient'>('solid');
  const [puffColorMode, setPuffColorMode] = React.useState<'solid' | 'gradient'>('solid');
  const [embroideryColorMode, setEmbroideryColorMode] = React.useState<'solid' | 'gradient'>('solid');
  const [textColorMode, setTextColorMode] = React.useState<'solid' | 'gradient'>('solid');
  const [shapesColorMode, setShapesColorMode] = React.useState<'solid' | 'gradient'>('solid');

  // State to force re-render when Google Fonts are loaded
  const [googleFontsLoaded, setGoogleFontsLoaded] = React.useState(0);

  // Get active shape for editing
  const activeShape = activeShapeId ? shapeElements.find(s => s.id === activeShapeId) : null;

  // Listen for Google Font loaded events
  React.useEffect(() => {
    const handleGoogleFontLoaded = () => {
      setGoogleFontsLoaded(prev => prev + 1);
    };
    
    window.addEventListener('googleFontLoaded', handleGoogleFontLoaded);
    return () => window.removeEventListener('googleFontLoaded', handleGoogleFontLoaded);
  }, []);

  // Function to analyze font characteristics from text content
  const analyzeFontFromText = (text: string) => {
    if (!text || text.trim().length === 0) return {};
    
    const cleanText = text.trim();
    const hasUpperCase = /[A-Z]/.test(cleanText);
    const hasNumbers = /\d/.test(cleanText);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(cleanText);
    const hasPunctuation = /[.,!?;:]/.test(cleanText);
    
    // Estimate font size based on text length and characteristics
    let estimatedFontSize = 24; // Default
    
    if (cleanText.length <= 5) {
      estimatedFontSize = 48; // Large for short text (likely titles)
    } else if (cleanText.length <= 20) {
      estimatedFontSize = 36; // Medium-large for medium text
    } else if (cleanText.length <= 50) {
      estimatedFontSize = 24; // Normal for regular text
    } else {
      estimatedFontSize = 18; // Smaller for long text
    }
    
    // Estimate font family based on character patterns
    let estimatedFontFamily = 'Arial'; // Default
    
    if (hasNumbers && hasSpecialChars) {
      estimatedFontFamily = 'Courier New'; // Monospace for technical/code text
    } else if (hasUpperCase && !hasNumbers && cleanText.length < 20) {
      estimatedFontFamily = 'Impact'; // Bold display font for short uppercase text
    } else if (hasPunctuation && cleanText.length > 30) {
      estimatedFontFamily = 'Times New Roman'; // Serif for formal/long text
    } else if (cleanText.length > 50) {
      estimatedFontFamily = 'Georgia'; // Serif for very long text
    } else if (cleanText.length <= 10) {
      estimatedFontFamily = 'Helvetica'; // Clean sans-serif for short text
    } else {
      estimatedFontFamily = 'Arial'; // Default sans-serif
    }
    
    // Estimate bold based on text characteristics
    const isBold = cleanText.length <= 15 && hasUpperCase && !hasNumbers;
    
    // Estimate italic based on text patterns
    const isItalic = cleanText.includes('i') && cleanText.length < 20;
    
    // Estimate color based on content
    let estimatedColor = '#000000'; // Default black
    if (hasNumbers && hasSpecialChars) {
      estimatedColor = '#0066CC'; // Blue for technical text
    } else if (cleanText.length <= 10) {
      estimatedColor = '#CC0000'; // Red for short/important text
    }
    
    // Estimate alignment
    let textAlign = 'left';
    if (cleanText.length <= 15) {
      textAlign = 'center'; // Center short text
    }
    
    return {
      fontFamily: estimatedFontFamily,
      fontSize: estimatedFontSize,
      bold: isBold,
      italic: isItalic,
      color: estimatedColor,
      textAlign: textAlign
    };
  };

  // Gradient states for each tool
  type ColorStop = { color: string; position: number; id: string };
  
  const [brushGradient, setBrushGradient] = React.useState({
    type: 'linear' as 'linear' | 'radial' | 'angular' | 'diamond',
    angle: 45,
    stops: [
      { id: '1', color: '#ff0000', position: 0 },
      { id: '2', color: '#0000ff', position: 100 }
    ] as ColorStop[]
  });

  const [puffGradient, setPuffGradient] = React.useState({
    type: 'linear' as 'linear' | 'radial' | 'angular' | 'diamond',
    angle: 45,
    stops: [
      { id: '1', color: '#ff69b4', position: 0 },
      { id: '2', color: '#ff1493', position: 100 }
    ] as ColorStop[]
  });

  const [embroideryGradient, setEmbroideryGradient] = React.useState({
    type: 'linear' as 'linear' | 'radial' | 'angular' | 'diamond',
    angle: 135,
    stops: [
      { id: '1', color: '#ffd700', position: 0 },
      { id: '2', color: '#ff4500', position: 100 }
    ] as ColorStop[]
  });

  const [textGradient, setTextGradient] = React.useState({
    type: 'linear' as 'linear' | 'radial' | 'angular' | 'diamond',
    angle: 0,
    stops: [
      { id: '1', color: '#ff6b6b', position: 0 },
      { id: '2', color: '#4ecdc4', position: 100 }
    ] as ColorStop[]
  });

  const [shapesGradient, setShapesGradient] = React.useState({
    type: 'linear' as 'linear' | 'radial' | 'angular' | 'diamond',
    angle: 45,
    stops: [
      { id: '1', color: '#00ff00', position: 0 },
      { id: '2', color: '#ff00ff', position: 100 }
    ] as ColorStop[]
  });

  // Helper function to generate gradient CSS
  const getGradientCSS = (gradient: typeof brushGradient) => {
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
    
    if (gradient.type === 'linear') {
      return `linear-gradient(${gradient.angle}deg, ${stopsStr})`;
    } else if (gradient.type === 'radial') {
      return `radial-gradient(circle, ${stopsStr})`;
    }
    return `linear-gradient(${gradient.angle}deg, ${stopsStr})`;
  };

  // Listen for Google Font loaded events
  React.useEffect(() => {
    const handleFontLoaded = () => {
      setFontUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('googleFontLoaded', handleFontLoaded);
    return () => window.removeEventListener('googleFontLoaded', handleFontLoaded);
  }, []);

  // Expose gradient data globally for painting logic
  React.useEffect(() => {
    const gradientData = {
      brush: { mode: brushColorMode, ...brushGradient },
      puff: { mode: puffColorMode, ...puffGradient },
      embroidery: { mode: embroideryColorMode, ...embroideryGradient },
      text: { mode: textColorMode, ...textGradient },
      shapes: { mode: shapesColorMode, ...shapesGradient },
      getGradientCSS
    };
    
    console.log('🎨 GRADIENT DATA EXPOSED:', gradientData);
    console.log('🎨 BRUSH GRADIENT DATA:', gradientData.brush);
    console.log('🎨 PUFF GRADIENT DATA:', gradientData.puff);
    console.log('🎨 BRUSH COLOR MODE:', brushColorMode);
    console.log('🎨 BRUSH GRADIENT STOPS:', brushGradient.stops);
    
    (window as any).getGradientSettings = () => gradientData;
  }, [brushColorMode, brushGradient, puffColorMode, puffGradient, embroideryColorMode, embroideryGradient, textColorMode, textGradient, shapesColorMode, shapesGradient]);

  // Removed old tabs system - now using activeTool-based display

  // PRIORITY 1: Use activeToolSidebar prop from MainLayout if provided
  React.useEffect(() => {
    if (activeToolSidebar) {
      console.log('🎯 Activated tool from activeToolSidebar prop:', activeToolSidebar);
      setActiveTab(activeToolSidebar as any);
    }
  }, [activeToolSidebar]);

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setDragStartY(e.clientY);
    setDragStartHeight(toolSettingsHeight);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaY = e.clientY - dragStartY;
    const newHeight = Math.max(200, Math.min(600, dragStartHeight + deltaY));
    setToolSettingsHeight(newHeight);
  }, [isResizing, dragStartY, dragStartHeight]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Helper functions for tool display
  const getToolIcon = (tool: string) => {
    const toolIcons: { [key: string]: string } = {
      'brush': '🖌️',
      'eraser': '🧽',
      'fill': '🪣',
      'picker': '🎨',
      'puffPrint': '☁️',
      'embroidery': '🧵',
      'text': '📝',
      'shapes': '🔷',
      'image': '📷',
      'universalSelect': '🎯'
    };
    return toolIcons[tool] || '🛠️';
  };

  const getToolName = (tool: string) => {
    const toolNames: { [key: string]: string } = {
      'brush': 'Brush',
      'eraser': 'Eraser',
      'fill': 'Fill',
      'picker': 'Picker',
      'puffPrint': 'Puff Print',
      'embroidery': 'Embroidery',
      'text': 'Text',
      'shapes': 'Shapes',
      'image': 'Image',
      'universalSelect': 'Select'
    };
    return toolNames[tool] || 'Tool';
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000000',
      borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '11px',
      boxShadow: '-2px 0 20px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)'
    }}>

      {/* Tool Settings Panel (Top) */}
      <div style={{
        height: `${toolSettingsHeight}px`,
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Tool Settings Header */}
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '10px',
          color: '#a0aec0',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {activeTool ? `${getToolIcon(activeTool)} ${getToolName(activeTool)} Settings` : 'Tool Settings'}
        </div>

        {/* Tool Settings Content */}
        <div style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto'
        }}>
        {/* Brush Settings */}
        {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'fill') && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🖌️ Brush Settings
            </div>
            
            {/* Color/Gradient Mode Tabs */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Color Mode
              </div>
              
              {/* Tab Buttons */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <button
                  onClick={() => setBrushColorMode('solid')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: brushColorMode === 'solid' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                    color: brushColorMode === 'solid' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🎨 Solid Color
                </button>
                <button
                  onClick={() => {
                    console.log('🎨 GRADIENT TAB CLICKED - Setting brushColorMode to gradient');
                    setBrushColorMode('gradient');
                    console.log('🎨 GRADIENT TAB - brushColorMode set to:', 'gradient');
                    console.log('🎨 GRADIENT TAB - brushGradient data:', brushGradient);
                    
                    // Force a small delay to ensure state is updated
                    setTimeout(() => {
                      console.log('🎨 GRADIENT TAB - After timeout, brushColorMode:', brushColorMode);
                      console.log('🎨 GRADIENT TAB - After timeout, brushGradient:', brushGradient);
                    }, 100);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: brushColorMode === 'gradient' ? '#BA55D3' : 'rgba(255,255,255,0.1)',
                    color: brushColorMode === 'gradient' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🌈 Gradient {brushColorMode === 'gradient' ? '✓' : ''}
                </button>
              </div>

              {/* Solid Color Content */}
              {brushColorMode === 'solid' && (
                      <div>
              <div style={{
                width: '100%',
                height: '200px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #333'
              }}>
                <HexColorPicker
                  color={brushColor}
                  onChange={setBrushColor}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Color Code Input */}
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '8px',
                  color: '#999',
                  minWidth: '30px'
                }}>
                  Code:
                </div>
                <input
                  type="text"
                  value={brushColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
                      setBrushColor(value);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    color: '#fff',
                    fontFamily: 'monospace'
                  }}
                  placeholder="#000000"
                />
                <div style={{
                  width: '20px',
                  height: '16px',
                  background: brushColor,
                  borderRadius: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  flexShrink: 0
                }} />
              </div>
                      </div>
                    )}

              {/* Gradient Content */}
              {brushColorMode === 'gradient' && (
                <div style={{ padding: '8px', background: 'rgba(138,43,226,0.05)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
                  {/* Test Button */}
                  <div style={{ marginBottom: '8px' }}>
                    <button
                      onClick={() => {
                        console.log('🧪 GRADIENT TEST - Testing gradient functionality');
                        const gradientSettings = (window as any).getGradientSettings?.();
                        console.log('🧪 GRADIENT TEST - Current gradient settings:', gradientSettings);
                        console.log('🧪 GRADIENT TEST - Brush gradient data:', gradientSettings?.brush);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        fontSize: '8px',
                        background: 'rgba(138,43,226,0.2)',
                        color: '#fff',
                        border: '1px solid rgba(138,43,226,0.5)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🧪 Test Gradient
                    </button>
                  </div>
                  
                  {/* Gradient Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Type</div>
                    <select
                      value={brushGradient.type}
                      onChange={(e) => setBrushGradient({ ...brushGradient, type: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        fontSize: '8px'
                      }}
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                      <option value="angular">Angular</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  {/* Gradient Angle */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Angle</span>
                      <span style={{ color: '#999' }}>{brushGradient.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={brushGradient.angle}
                      onChange={(e) => setBrushGradient({ ...brushGradient, angle: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#BA55D3' }}
                    />
                  </div>

                  {/* Gradient Colors */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color Stops</div>
                    
                    {brushGradient.stops.map((stop, index) => (
                      <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = [...brushGradient.stops];
                            newStops[index] = { ...stop, color: e.target.value };
                            setBrushGradient({ ...brushGradient, stops: newStops });
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '3px'
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stop.position}
                          onChange={(e) => {
                            const newStops = [...brushGradient.stops];
                            newStops[index] = { ...stop, position: parseInt(e.target.value) };
                            setBrushGradient({ ...brushGradient, stops: newStops });
                          }}
                          style={{ flex: 1, accentColor: '#BA55D3' }}
                        />
                        <span style={{ fontSize: '7px', color: '#999', minWidth: '24px' }}>{stop.position}%</span>
                        <button
                          onClick={() => {
                            if (brushGradient.stops.length > 2) {
                              const newStops = brushGradient.stops.filter((_, i) => i !== index);
                              setBrushGradient({ ...brushGradient, stops: newStops });
                            } else {
                              alert('Gradient must have at least 2 color stops');
                            }
                          }}
                          disabled={brushGradient.stops.length <= 2}
                          style={{
                            padding: '2px 6px',
                            fontSize: '7px',
                            background: brushGradient.stops.length <= 2 ? 'rgba(100,100,100,0.2)' : 'rgba(220,53,69,0.2)',
                            color: brushGradient.stops.length <= 2 ? '#666' : '#dc3545',
                            border: '1px solid rgba(220,53,69,0.3)',
                            borderRadius: '2px',
                            cursor: brushGradient.stops.length <= 2 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add Color Stop Button */}
                    <button
                      onClick={() => {
                        const newStop = {
                          id: Date.now().toString(),
                          color: '#888888',
                          position: 50
                        };
                        setBrushGradient({ ...brushGradient, stops: [...brushGradient.stops, newStop] });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '8px',
                        background: 'rgba(138,43,226,0.2)',
                        color: '#BA55D3',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginTop: '2px'
                      }}
                    >
                      + Add Color Stop
                    </button>
                  </div>

                  {/* Gradient Preview */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Preview</div>
                    <div style={{
                      width: '100%',
                      height: '30px',
                      background: getGradientCSS(brushGradient),
                      borderRadius: '3px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Brush Size */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Size</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{brushSize}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Opacity */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Opacity</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(brushOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brushOpacity}
                onChange={(e) => setBrushOpacity(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Hardness */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Hardness</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(brushHardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brushHardness}
                onChange={(e) => setBrushHardness(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Flow */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Flow</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(brushFlow * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brushFlow}
                onChange={(e) => setBrushFlow(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Spacing</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(brushSpacing * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brushSpacing}
                onChange={(e) => setBrushSpacing(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Custom Brush Image (Stencil) */}
            <div style={{ marginBottom: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Custom Brush Image (Stencil)
              </div>
              <div style={{
                fontSize: '7px',
                color: '#999',
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>
                Upload an image to use as a stencil. Only opaque areas will be painted.
              </div>
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  fontSize: '9px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        // Preload the image to ensure it's ready for use
                        const img = new Image();
                        img.onload = () => {
                          setCustomBrushImage(dataUrl);
                          // Clear brush cache to force regeneration with new image
                          if ((window as any).__brushEngine) {
                            (window as any).__brushEngine.clearCache();
                          }
                        };
                        img.onerror = () => {
                          alert('Failed to load brush image. Please try a different image.');
                        };
                        img.src = dataUrl;
                      };
                      reader.onerror = () => {
                        alert('Failed to read brush image file. Please try again.');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ 
                    display: 'none'
                  }}
                />
                📁 Click to Upload Image
              </label>
              {customBrushImage && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ 
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '100%',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: '8px'
                  }}>
                    <img
                      src={customBrushImage}
                      alt="Custom brush preview"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        imageRendering: 'pixelated'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCustomBrushImage(null);
                      // Clear brush cache when removing custom brush
                      if ((window as any).__brushEngine) {
                        (window as any).__brushEngine.clearCache();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '8px',
                      fontWeight: '600'
                    }}
                  >
                    Remove Custom Brush
                  </button>
                </div>
              )}
            </div>

            {/* Brush Type */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Brush Type
              </div>
              <select
                value={brushShape}
                onChange={(e) => setBrushShape(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  background: '#000000',
                  color: '#CCC',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  fontSize: '9px'
                }}
              >
                {/* Basic Shapes */}
                <optgroup label="Basic Shapes">
                  <option value="round">🟢 Round</option>
                  <option value="square">⬜ Square</option>
                  <option value="diamond">💎 Diamond</option>
                  <option value="triangle">🔺 Triangle</option>
                </optgroup>
                
                {/* Digital Brushes */}
                <optgroup label="Digital Brushes">
                  <option value="airbrush">🎨 Airbrush</option>
                  <option value="spray">💨 Spray</option>
                  <option value="texture">🖼️ Texture</option>
                  <option value="stencil">📐 Stencil</option>
                  <option value="stamp">🏷️ Stamp</option>
                </optgroup>
                
                {/* Traditional Media */}
                <optgroup label="Traditional Media">
                  <option value="watercolor">🎨 Watercolor</option>
                  <option value="oil">🖌️ Oil</option>
                  <option value="acrylic">🎭 Acrylic</option>
                  <option value="gouache">🎪 Gouache</option>
                  <option value="ink">🖋️ Ink</option>
                </optgroup>
                
                {/* Drawing Tools */}
                <optgroup label="Drawing Tools">
                  <option value="pencil">✏️ Pencil</option>
                  <option value="charcoal">🖤 Charcoal</option>
                  <option value="pastel">🌈 Pastel</option>
                  <option value="chalk">🖍️ Chalk</option>
                  <option value="marker">🖍️ Marker</option>
                </optgroup>
                
                {/* Special Effects */}
                <optgroup label="Special Effects">
                  <option value="calligraphy">✍️ Calligraphy</option>
                  <option value="highlighter">🖍️ Highlighter</option>
                  <option value="blur">🌀 Blur</option>
                  <option value="smudge">👆 Smudge</option>
                </optgroup>
              </select>
            </div>

            {/* Blend Mode */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Blend Mode
              </div>
              <select
                value={blendMode}
                onChange={(e) => setBlendMode(e.target.value as GlobalCompositeOperation)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  background: '#000000',
                  color: '#CCC',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  fontSize: '9px'
                }}
              >
                <option value="source-over">Normal</option>
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
          </div>
        )}

        {/* Puff Print Settings removed - will be rebuilt with new 3D geometry approach */}

        {/* OLD PUFF SETTINGS - REMOVED - Now using PuffSettings component */}
        {/* This entire block was removed - using PuffSettings component from ToolRouter instead */}

        {/* Embroidery Settings */}
        {activeTool === 'embroidery' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '10px',
              color: '#999',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Embroidery Settings
            </div>

            {/* Thread Color/Gradient Mode */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Color Mode
              </div>
              
              {/* Tab Buttons */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <button
                  onClick={() => setEmbroideryColorMode('solid')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: embroideryColorMode === 'solid' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                    color: embroideryColorMode === 'solid' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🎨 Solid Color
                </button>
                <button
                  onClick={() => setEmbroideryColorMode('gradient')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: embroideryColorMode === 'gradient' ? '#BA55D3' : 'rgba(255,255,255,0.1)',
                    color: embroideryColorMode === 'gradient' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🌈 Gradient
                </button>
              </div>

              {/* Solid Color Content */}
              {embroideryColorMode === 'solid' && (
                <div>
              <div style={{
                width: '100%',
                height: '200px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #333'
              }}>
                <HexColorPicker
                  color={embroideryThreadColor}
                  onChange={setEmbroideryThreadColor}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Color Code Input */}
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '8px',
                  color: '#999',
                  minWidth: '30px'
                }}>
                  Code:
                </div>
                <input
                  type="text"
                  value={embroideryThreadColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
                      setEmbroideryThreadColor(value);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    color: '#fff',
                    fontFamily: 'monospace'
                  }}
                  placeholder="#000000"
                />
                <div style={{
                  width: '20px',
                  height: '16px',
                  background: embroideryThreadColor,
                  borderRadius: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  flexShrink: 0
                }} />
              </div>
                </div>
              )}

              {/* Gradient Content */}
              {embroideryColorMode === 'gradient' && (
                <div style={{ padding: '8px', background: 'rgba(138,43,226,0.05)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
                  {/* Gradient Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Type</div>
                    <select
                      value={embroideryGradient.type}
                      onChange={(e) => setEmbroideryGradient({ ...embroideryGradient, type: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        fontSize: '8px'
                      }}
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                      <option value="angular">Angular</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  {/* Gradient Angle */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Angle</span>
                      <span style={{ color: '#999' }}>{embroideryGradient.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={embroideryGradient.angle}
                      onChange={(e) => setEmbroideryGradient({ ...embroideryGradient, angle: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#BA55D3' }}
                    />
                  </div>

                  {/* Color Stops */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color Stops</div>
                    
                    {embroideryGradient.stops.map((stop, index) => (
                      <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = [...embroideryGradient.stops];
                            newStops[index] = { ...stop, color: e.target.value };
                            setEmbroideryGradient({ ...embroideryGradient, stops: newStops });
                          }}
                          style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stop.position}
                          onChange={(e) => {
                            const newStops = [...embroideryGradient.stops];
                            newStops[index] = { ...stop, position: parseInt(e.target.value) };
                            setEmbroideryGradient({ ...embroideryGradient, stops: newStops });
                          }}
                          style={{ flex: 1, accentColor: '#BA55D3' }}
                        />
                        <span style={{ fontSize: '7px', color: '#999', minWidth: '24px' }}>{stop.position}%</span>
                        <button
                          onClick={() => {
                            if (embroideryGradient.stops.length > 2) {
                              const newStops = embroideryGradient.stops.filter((_, i) => i !== index);
                              setEmbroideryGradient({ ...embroideryGradient, stops: newStops });
                            }
                          }}
                          disabled={embroideryGradient.stops.length <= 2}
                          style={{
                            padding: '2px 6px',
                            fontSize: '7px',
                            background: embroideryGradient.stops.length <= 2 ? 'rgba(100,100,100,0.2)' : 'rgba(220,53,69,0.2)',
                            color: embroideryGradient.stops.length <= 2 ? '#666' : '#dc3545',
                            border: '1px solid rgba(220,53,69,0.3)',
                            borderRadius: '2px',
                            cursor: embroideryGradient.stops.length <= 2 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add Color Stop Button */}
                    <button
                      onClick={() => {
                        const newStop = { id: Date.now().toString(), color: '#888888', position: 50 };
                        setEmbroideryGradient({ ...embroideryGradient, stops: [...embroideryGradient.stops, newStop] });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '8px',
                        background: 'rgba(138,43,226,0.2)',
                        color: '#BA55D3',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginTop: '2px'
                      }}
                    >
                      + Add Color Stop
                    </button>
                  </div>

                  {/* Preview */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Preview</div>
                    <div style={{
                      width: '100%',
                      height: '30px',
                      background: getGradientCSS(embroideryGradient),
                      borderRadius: '3px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Thread Thickness */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Thickness</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{embroideryThreadThickness}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={embroideryThreadThickness}
                onChange={(e) => setEmbroideryThreadThickness(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>

            {/* Stitch Type */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Stitch Type
              </div>
              <select
                value={embroideryStitchType}
                onChange={(e) => setEmbroideryStitchType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  background: '#000000',
                  color: '#CCC',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  fontSize: '9px'
                }}
              >
                <option value="satin">Satin Stitch</option>
                <option value="cross-stitch">Cross Stitch</option>
                <option value="chain">Chain Stitch</option>
                <option value="french-knot">French Knot</option>
                <option value="french_knot">French Knot (Alt)</option>
                <option value="seed">Seed Stitch</option>
                <option value="backstitch">Backstitch</option>
                <option value="running">Running Stitch</option>
                <option value="stem">Stem Stitch</option>
                <option value="split">Split Stitch</option>
                <option value="cable">Cable Stitch</option>
                <option value="coral">Coral Stitch</option>
                <option value="feather">Feather Stitch</option>
                <option value="fly">Fly Stitch</option>
                <option value="herringbone">Herringbone</option>
                <option value="lazy-daisy">Lazy Daisy</option>
                <option value="long-short">Long & Short</option>
                <option value="padded-satin">Padded Satin</option>
                <option value="pistil">Pistil Stitch</option>
                <option value="satin-fill">Satin Fill</option>
                <option value="straight">Straight Stitch</option>
                <option value="whip">Whip Stitch</option>
                <option value="zigzag">Zigzag Stitch</option>
              </select>
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Spacing</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{embroiderySpacing}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={embroiderySpacing}
                onChange={(e) => setEmbroiderySpacing(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#0066CC'
                }}
              />
            </div>
          </div>
        )}

        {/* Puff Tool Settings */}
        {activeTool === 'puffPrint' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              ☁️ Puff Settings
            </div>

            {/* Color/Gradient Mode Tabs */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Color Mode
              </div>
              
              {/* Tab Buttons */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <button
                  onClick={() => setPuffColorMode('solid')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: puffColorMode === 'solid' ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                    color: puffColorMode === 'solid' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🎨 Solid Color
                </button>
                <button
                  onClick={() => setPuffColorMode('gradient')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '9px',
                    background: puffColorMode === 'gradient' ? '#BA55D3' : 'rgba(255,255,255,0.1)',
                    color: puffColorMode === 'gradient' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🌈 Gradient {puffColorMode === 'gradient' ? '✓' : ''}
                </button>
              </div>

              {/* Solid Color Content */}
              {puffColorMode === 'solid' && (
                <div>
                  <div style={{
                    width: '100%',
                    height: '150px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #333'
                  }}>
                    <HexColorPicker
                      color={puffColor}
                      onChange={setPuffColor}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  
                  {/* Color Code Input */}
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      fontSize: '8px',
                      color: '#999',
                      minWidth: '30px'
                    }}>
                      Code:
                    </div>
                    <input
                      type="text"
                      value={puffColor}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
                          setPuffColor(value);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        color: '#fff',
                        fontFamily: 'monospace'
                      }}
                      placeholder="#ff69b4"
                    />
                    <div style={{
                      width: '20px',
                      height: '16px',
                      background: puffColor,
                      borderRadius: '2px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      flexShrink: 0
                    }} />
                  </div>
                </div>
              )}

              {/* Gradient Content */}
              {puffColorMode === 'gradient' && (
                <div style={{ padding: '8px', background: 'rgba(138,43,226,0.05)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
                  {/* Gradient Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Type</div>
                    <select
                      value={puffGradient.type}
                      onChange={(e) => setPuffGradient({ ...puffGradient, type: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        fontSize: '8px'
                      }}
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                      <option value="angular">Angular</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  {/* Gradient Angle */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Angle</span>
                      <span style={{ color: '#999' }}>{puffGradient.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={puffGradient.angle}
                      onChange={(e) => setPuffGradient({ ...puffGradient, angle: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#BA55D3' }}
                    />
                  </div>

                  {/* Gradient Colors */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color Stops</div>
                    
                    {puffGradient.stops.map((stop, index) => (
                      <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = [...puffGradient.stops];
                            newStops[index] = { ...stop, color: e.target.value };
                            setPuffGradient({ ...puffGradient, stops: newStops });
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '3px'
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stop.position}
                          onChange={(e) => {
                            const newStops = [...puffGradient.stops];
                            newStops[index] = { ...stop, position: parseInt(e.target.value) };
                            setPuffGradient({ ...puffGradient, stops: newStops });
                          }}
                          style={{ flex: 1, accentColor: '#BA55D3' }}
                        />
                        <span style={{ fontSize: '7px', color: '#999', minWidth: '24px' }}>{stop.position}%</span>
                        <button
                          onClick={() => {
                            if (puffGradient.stops.length > 2) {
                              const newStops = puffGradient.stops.filter((_, i) => i !== index);
                              setPuffGradient({ ...puffGradient, stops: newStops });
                            } else {
                              alert('Gradient must have at least 2 color stops');
                            }
                          }}
                          disabled={puffGradient.stops.length <= 2}
                          style={{
                            padding: '2px 6px',
                            fontSize: '7px',
                            background: puffGradient.stops.length <= 2 ? 'rgba(100,100,100,0.2)' : 'rgba(220,53,69,0.2)',
                            color: puffGradient.stops.length <= 2 ? '#666' : '#dc3545',
                            border: '1px solid rgba(220,53,69,0.3)',
                            borderRadius: '2px',
                            cursor: puffGradient.stops.length <= 2 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add Color Stop Button */}
                    <button
                      onClick={() => {
                        const newStop = {
                          id: Date.now().toString(),
                          color: '#888888',
                          position: 50
                        };
                        setPuffGradient({ ...puffGradient, stops: [...puffGradient.stops, newStop] });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '8px',
                        background: 'rgba(138,43,226,0.2)',
                        color: '#BA55D3',
                        border: '1px solid rgba(138,43,226,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginTop: '2px'
                      }}
                    >
                      + Add Color Stop
                    </button>
                  </div>

                  {/* Gradient Preview */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Preview</div>
                    <div style={{
                      width: '100%',
                      height: '30px',
                      background: getGradientCSS(puffGradient),
                      borderRadius: '3px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Size */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Size</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{puffSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={puffSize}
                onChange={(e) => setPuffSize(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#ff69b4'
                }}
              />
            </div>

            {/* Height */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Height</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{puffHeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={puffHeight}
                onChange={(e) => setPuffHeight(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#ff69b4'
                }}
              />
            </div>

            {/* Opacity */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Opacity</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(puffOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={puffOpacity}
                onChange={(e) => setPuffOpacity(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#ff69b4'
                }}
              />
            </div>

            {/* Softness */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Softness</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(puffSoftness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={puffSoftness}
                onChange={(e) => setPuffSoftness(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#ff69b4'
                }}
              />
            </div>

            {/* Hairs Toggle */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>🧵 Hairs</span>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '4px'
                }}>
                  <input
                    type="checkbox"
                    checked={puffHairs}
                    onChange={(e) => setPuffHairs(e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      accentColor: '#ff69b4'
                    }}
                  />
                  <span style={{ fontSize: '8px', color: puffHairs ? '#ff69b4' : '#999' }}>
                    {puffHairs ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {/* Hair Settings (only show if hairs enabled) */}
            {puffHairs && (
              <>
                {/* Hair Height */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '9px',
                    color: '#CCC',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Hair Height</span>
                    <span style={{ fontSize: '8px', color: '#999' }}>{(puffHairHeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={puffHairHeight}
                    onChange={(e) => setPuffHairHeight(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#ff69b4'
                    }}
                  />
                </div>

                {/* Hair Density */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '9px',
                    color: '#CCC',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Hair Density</span>
                    <span style={{ fontSize: '8px', color: '#999' }}>{puffHairDensity}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20000"
                    step="50"
                    value={puffHairDensity}
                    onChange={(e) => setPuffHairDensity(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#ff69b4'
                    }}
                  />
                </div>

                {/* Hair Thickness */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '9px',
                    color: '#CCC',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Hair Thickness</span>
                    <span style={{ fontSize: '8px', color: '#999' }}>{(puffHairThickness * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.1"
                    step="0.005"
                    value={puffHairThickness}
                    onChange={(e) => setPuffHairThickness(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#ff69b4'
                    }}
                  />
                </div>

                {/* Hair Variation */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '9px',
                    color: '#CCC',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Hair Variation</span>
                    <span style={{ fontSize: '8px', color: '#999' }}>{(puffHairVariation * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={puffHairVariation}
                    onChange={(e) => setPuffHairVariation(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#ff69b4'
                    }}
                  />
                  <div style={{ fontSize: '7px', color: '#888', marginTop: '2px' }}>
                    Controls random rotation & scale variation
                  </div>
                </div>
              </>
            )}

            {/* Phase 1: Shape Customization */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                fontSize: '10px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🎭 Shape Customization
              </div>

              {/* Top Shape */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Top Shape</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['flat', 'rounded', 'pointed', 'beveled'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setPuffTopShape(shape)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffTopShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffTopShape === shape ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffTopShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Shape */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Bottom Shape</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['square', 'rounded', 'beveled', 'tapered'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setPuffBottomShape(shape)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffBottomShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffBottomShape === shape ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffBottomShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cross-Section Shape */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Cross-Section</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['circle', 'square', 'roundedSquare', 'oval'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setPuffCrossSectionShape(shape)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffCrossSectionShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffCrossSectionShape === shape ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffCrossSectionShape === shape ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {shape === 'roundedSquare' ? 'Rounded Sq' : shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Curve */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Profile Curve</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['linear', 'quadratic', 'cubic', 'exponential'] as const).map((curve) => (
                    <button
                      key={curve}
                      onClick={() => setPuffProfileCurve(curve)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffProfileCurve === curve ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffProfileCurve === curve ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffProfileCurve === curve ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {curve}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Radius */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Edge Radius</span>
                  <span style={{ fontSize: '8px', color: '#999' }}>{puffEdgeRadius}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={puffEdgeRadius}
                  onChange={(e) => setPuffEdgeRadius(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff69b4'
                  }}
                />
              </div>

              {/* Taper Amount */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Taper Amount</span>
                  <span style={{ fontSize: '8px', color: '#999' }}>{puffTaperAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={puffTaperAmount}
                  onChange={(e) => setPuffTaperAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff69b4'
                  }}
                />
              </div>
            </div>

            {/* Phase 3: Material & Texture */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                fontSize: '10px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🎨 Material & Texture
              </div>

              {/* Fabric Type */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Fabric Type</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['cotton', 'silk', 'denim', 'leather', 'custom'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPuffFabricType(type)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffFabricType === type ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffFabricType === type ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffFabricType === type ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roughness */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Roughness</span>
                  <span style={{ fontSize: '8px', color: '#999' }}>{(puffRoughness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={puffRoughness}
                  onChange={(e) => setPuffRoughness(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff69b4'
                  }}
                />
              </div>

              {/* Texture Intensity */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Texture Intensity</span>
                  <span style={{ fontSize: '8px', color: '#999' }}>{(puffTextureIntensity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={puffTextureIntensity}
                  onChange={(e) => setPuffTextureIntensity(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff69b4'
                  }}
                />
              </div>

              {/* Enable Normal Map */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  color: '#CCC'
                }}>
                  <input
                    type="checkbox"
                    checked={puffEnableNormalMap}
                    onChange={(e) => setPuffEnableNormalMap(e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      accentColor: '#ff69b4'
                    }}
                  />
                  <span>Enable Normal Map</span>
                </label>
              </div>
            </div>

            {/* Phase 4: Edge Details */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                fontSize: '10px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ✂️ Edge Details
              </div>

              {/* Edge Type */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Edge Type</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['none', 'stitching', 'hemming', 'binding', 'raw'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPuffEdgeType(type)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffEdgeType === type ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffEdgeType === type ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffEdgeType === type ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Width (only show if edge type is not 'none') */}
              {puffEdgeType !== 'none' && (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{
                      fontSize: '9px',
                      color: '#CCC',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Edge Width</span>
                      <span style={{ fontSize: '8px', color: '#999' }}>{puffEdgeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={puffEdgeWidth}
                      onChange={(e) => setPuffEdgeWidth(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#ff69b4'
                      }}
                    />
                  </div>

                  {/* Edge Color */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Edge Color</div>
                    <div style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid #333'
                    }}>
                      <HexColorPicker
                        color={puffEdgeColor}
                        onChange={setPuffEdgeColor}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Phase 5: Advanced */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                fontSize: '10px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🌟 Advanced
              </div>

              {/* Detail Level */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Detail Level</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(['low', 'medium', 'high', 'auto'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setPuffDetailLevel(level)}
                      style={{
                        flex: 1,
                        minWidth: '60px',
                        padding: '6px 8px',
                        fontSize: '8px',
                        background: puffDetailLevel === level ? '#ff69b4' : 'rgba(255,255,255,0.1)',
                        color: puffDetailLevel === level ? '#FFFFFF' : '#CCC',
                        border: `1px solid ${puffDetailLevel === level ? '#ff69b4' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smoothness */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Smoothness</span>
                  <span style={{ fontSize: '8px', color: '#999' }}>{puffSmoothness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={puffSmoothness}
                  onChange={(e) => setPuffSmoothness(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff69b4'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Text Settings */}
        {activeTool === 'text' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '10px',
              color: '#999',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📝 Text Tools
            </div>

            {/* Instructions (when no text exists) */}
            {(() => {
              const { textElements } = useApp.getState();
              console.log('🔍 DEBUG: Instructions section - textElements.length:', textElements.length);
              
              // Show instructions ONLY if no text exists at all
              if (textElements.length === 0) {
                return (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '6px',
                    border: '1px dashed rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ fontSize: '10px', color: '#FFF', marginBottom: '6px', fontWeight: '600' }}>
                      ✏️ How to Use Text Tool
                    </div>
                    <div style={{ fontSize: '8px', color: '#CCC', lineHeight: '1.4' }}>
                      1. Click on the model to create new text<br/>
                      2. Click on existing text to select and edit it<br/>
                      3. Drag selected text to move it<br/>
                      4. Drag corner anchors to resize
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Text Selection Dropdown (always show if text exists) */}
            {(() => {
              // Show selector if any text exists
              if (textElements.length > 0) {
                return (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>
                      Select Text to Edit
                    </div>
                    <select
                      value={activeTextId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value || null;
                        selectTextElement(selectedId);
                        
                        // CRITICAL: Trigger texture update to show selection border
                        if (selectedId) {
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, false);
                            }
                          }, 50);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        fontSize: '9px'
                      }}
                    >
                      <option value="">-- Click text on model to select --</option>
                      {textElements.map((text, index) => (
                        <option key={text.id} value={text.id}>
                          {index + 1}. "{text.text}" ({text.fontSize}px)
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            })()}

            {/* Google Fonts Loader */}
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(76,175,80,0.1)', borderRadius: '4px', border: '1px solid rgba(76,175,80,0.3)' }}>
              <div style={{ fontSize: '8px', color: '#81C784', fontWeight: '600', marginBottom: '4px' }}>
                🌐 Load Google Font
              </div>
              <input
                type="text"
                placeholder="Paste Google Fonts URL or HTML"
                onKeyPress={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget.value.trim();
                    if (input) {
                      try {
                        // Extract font URL from various formats
                        let fontUrl = '';
                        
                        // Check if it's a direct Google Fonts CSS URL
                        if (input.includes('fonts.googleapis.com/css')) {
                          const match = input.match(/href=["']([^"']+)["']/);
                          fontUrl = match ? match[1] : input;
                        } else if (input.startsWith('http')) {
                          fontUrl = input;
                        }
                        
                        if (fontUrl) {
                          console.log('Loading Google Font from:', fontUrl);
                          
                          // Fetch the CSS to get font family name
                          const response = await fetch(fontUrl);
                          const cssText = await response.text();
                          
                          // Extract font family name from CSS
                          const familyMatch = cssText.match(/font-family:\s*['"]([^'"]+)['"]/);
                          const fontFamily = familyMatch ? familyMatch[1] : '';
                          
                          if (fontFamily) {
                            // Create and inject the font stylesheet
                            const link = document.createElement('link');
                            link.rel = 'stylesheet';
                            link.href = fontUrl;
                            document.head.appendChild(link);
                            
                            // Wait for font to load
                            await document.fonts.ready;
                            
                            // Store loaded font in session storage for persistence
                            const loadedFonts = JSON.parse(sessionStorage.getItem('loadedGoogleFonts') || '[]');
                            if (!loadedFonts.includes(fontFamily)) {
                              loadedFonts.push(fontFamily);
                              sessionStorage.setItem('loadedGoogleFonts', JSON.stringify(loadedFonts));
                            }
                            
                            console.log('Google Font loaded:', fontFamily);
                            alert(`✅ Font loaded: ${fontFamily}\n\nYou can now select it from the Font Family dropdown!`);
                            
                            // Clear input and trigger re-render
                            e.currentTarget.value = '';
                            
                            // Force component update to show new font in dropdown
                            window.dispatchEvent(new CustomEvent('googleFontLoaded', { detail: { fontFamily } }));
                            
                            // Also trigger state update directly
                            setGoogleFontsLoaded(prev => prev + 1);
                          } else {
                            alert('❌ Could not extract font name from the URL.');
                          }
                        } else {
                          alert('❌ Invalid Google Fonts URL or HTML.\n\nPlease paste:\n- Google Fonts CSS URL\n- Or the complete <link> tag');
                        }
                      } catch (error) {
                        console.error('Error loading Google Font:', error);
                        alert('❌ Error loading Google Font. Please check the URL.');
                      }
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '3px 4px',
                  fontSize: '7px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(76,175,80,0.3)',
                  borderRadius: '2px',
                  color: '#fff'
                }}
              />
              <div style={{ fontSize: '6px', color: '#81C784', marginTop: '1px' }}>
                Paste Google Fonts link tag or CSS URL, press Enter
              </div>
            </div>

            {/* Active Text Editing */}
            {(() => {
              console.log('🔍 DEBUG: Text editing section - activeTextId:', activeTextId, 'textElements.length:', textElements.length);
              if (!activeTextId) {
                console.log('🔍 DEBUG: No activeTextId, returning null');
                return null;
              }
              
              const activeText = textElements.find(t => t.id === activeTextId);
              if (!activeText) {
                console.log('🔍 DEBUG: activeTextId exists but text not found:', activeTextId);
                return null;
              }
              
              console.log('🔍 DEBUG: Found activeText, rendering controls:', activeText.text);

              return (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,150,255,0.1)', borderRadius: '4px', border: '1px solid rgba(0,150,255,0.3)' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#66B3FF' }}>
                    Editing: "{activeText.text}"
                  </div>
                  
                  {/* Text Content */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Text Content</div>
                    <textarea
                      value={activeText.text}
                      onChange={(e) => {
                        updateTextElement(activeTextId, { text: e.target.value });
                        
                        // Trigger live texture update (same as font size)
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        borderRadius: '3px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        resize: 'vertical',
                        minHeight: '40px',
                        fontSize: '8px'
                      }}
                      placeholder="Enter your text here..."
              />
            </div>

            {/* Font Family */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Font Family</div>
              <select
                      value={activeText.fontFamily}
                      onChange={(e) => {
                        console.log('🎨 Font family changed to:', e.target.value);
                        updateTextElement(activeTextId, { fontFamily: e.target.value });
                        
                        // Direct texture update without delays (same as font size)
                        setTimeout(() => {
                          console.log('🎨 Direct texture update for font family');
                          // Force recomposition first
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          
                          // Then update texture directly
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                style={{
                  width: '100%',
                  padding: '4px',
                  background: '#000000',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        fontSize: '8px'
                }}
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Courier New">Courier New</option>
                      <option value="Impact">Impact</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                      <option value="Palatino">Palatino</option>
                      <option value="Garamond">Garamond</option>
                      <option value="Bookman">Bookman</option>
                      <option value="Avant Garde">Avant Garde</option>
                      <option value="Helvetica Neue">Helvetica Neue</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Source Sans Pro">Source Sans Pro</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Nunito">Nunito</option>
                      <option value="Raleway">Raleway</option>
                      <option value="Ubuntu">Ubuntu</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="PT Serif">PT Serif</option>
                      <option value="PT Sans">PT Sans</option>
                      <option value="Droid Sans">Droid Sans</option>
                      <option value="Droid Serif">Droid Serif</option>
                      {/* Dynamically loaded Google Fonts */}
                      {(() => {
                        try {
                          // Use googleFontsLoaded state to force re-render
                          const loadedFonts = JSON.parse(sessionStorage.getItem('loadedGoogleFonts') || '[]');
                          console.log('🎨 Rendering Google Fonts dropdown, loaded fonts:', loadedFonts, 'state:', googleFontsLoaded);
                          return loadedFonts.map((font: string) => (
                            <option key={`${font}-${googleFontsLoaded}`} value={font} style={{ color: '#81C784', fontWeight: 'bold' }}>
                              🌐 {font}
                            </option>
                          ));
                        } catch (error) {
                          console.error('Error loading Google Fonts from sessionStorage:', error);
                          return null;
                        }
                      })()}
              </select>
            </div>

                  {/* Font Size */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                      Font Size: {activeText.fontSize}px
                    </div>
              <input
                      type="range"
                      min="8"
                      max="1000"
                      value={activeText.fontSize}
                      onChange={(e) => {
                        updateTextElement(activeTextId, { fontSize: parseInt(e.target.value) });
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                      style={{ width: '100%', accentColor: '#0066CC' }}
                    />
                    
                    {/* Precise Font Size Input */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#999', minWidth: '30px' }}>Size:</span>
                      <input
                        type="number"
                        min="8"
                        max="1000"
                        value={activeText.fontSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value) || 8;
                          updateTextElement(activeTextId, { fontSize: Math.max(8, Math.min(1000, newSize)) });
                        }}
                        style={{
                          flex: '1',
                          padding: '4px',
                fontSize: '9px',
                          background: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#FFF',
                          width: '60px'
                        }}
                      />
                      <span style={{ fontSize: '8px', color: '#999' }}>px</span>
                    </div>
                  </div>
                  
                  {/* Position Controls */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Position</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      <div style={{ flex: '1' }}>
                        <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>X:</div>
              <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.001"
                          value={(activeText.u || 0.5).toFixed(3)}
                          onChange={(e) => {
                            const newU = parseFloat(e.target.value);
                            if (!isNaN(newU)) {
                              updateTextElement(activeTextId, { u: Math.max(0, Math.min(1, newU)) });
                            }
                          }}
                style={{
                  width: '100%',
                            padding: '4px',
                            fontSize: '9px',
                            background: '#1a1a1a',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            color: '#FFF'
                          }}
                        />
                      </div>
                      <div style={{ flex: '1' }}>
                        <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>Y:</div>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.001"
                          value={(activeText.v || 0.5).toFixed(3)}
                          onChange={(e) => {
                            const newV = parseFloat(e.target.value);
                            if (!isNaN(newV)) {
                              updateTextElement(activeTextId, { v: Math.max(0, Math.min(1, newV)) });
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '9px',
                            background: '#1a1a1a',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            color: '#FFF'
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        updateTextElement(activeTextId, { u: 0.5, v: 0.5 });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '9px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        color: '#CCC',
                  cursor: 'pointer'
                }}
                    >
                      Center Text
                    </button>
                  </div>
                  
                  {/* Layer Ordering */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Layer Order</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          const maxZIndex = Math.max(...textElements.map(t => t.zIndex || 0), 0);
                          updateTextElement(activeTextId, { zIndex: maxZIndex + 1 });
                        }}
                        style={{
                          flex: '1',
                          padding: '6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Bring text to front"
                      >
                        📤 To Front
                      </button>
                      <button
                        onClick={() => {
                          const minZIndex = Math.min(...textElements.map(t => t.zIndex || 0), 0);
                          updateTextElement(activeTextId, { zIndex: minZIndex - 1 });
                        }}
                        style={{
                          flex: '1',
                          padding: '6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Send text to back"
                      >
                        📥 To Back
                      </button>
                    </div>
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                      Z-Index: {activeText.zIndex || 0}
                    </div>
                  </div>
                  
                  {/* Text Stroke/Outline */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Stroke/Outline</div>
                    
                    {/* Enable Stroke Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="checkbox"
                        checked={!!(activeText.stroke && typeof activeText.stroke === 'object' && activeText.stroke.width > 0)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateTextElement(activeTextId, { 
                              stroke: { width: 2, color: '#000000' } 
                            });
                          } else {
                            updateTextElement(activeTextId, { 
                              stroke: { width: 0, color: '#000000' } 
                            });
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '9px', color: '#CCC' }}>Enable Stroke</span>
                    </div>
                    
                    {/* Stroke Controls (only show if enabled) */}
                    {activeText.stroke && typeof activeText.stroke === 'object' && activeText.stroke.width > 0 && (
                      <>
                        {/* Stroke Width */}
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>
                            Width: {typeof activeText.stroke === 'object' ? activeText.stroke.width : 0}px
                </div>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={typeof activeText.stroke === 'object' ? activeText.stroke.width : 0}
                            onChange={(e) => {
                              updateTextElement(activeTextId, { 
                                stroke: { 
                                  ...(typeof activeText.stroke === 'object' ? activeText.stroke : { width: 0, color: '#000000' }), 
                                  width: parseInt(e.target.value) 
                                } 
                              });
                            }}
                            style={{ width: '100%', accentColor: '#0066CC' }}
                          />
                        </div>
                        
                        {/* Stroke Color */}
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>Color</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="color"
                              value={typeof activeText.stroke === 'object' ? activeText.stroke.color : '#000000'}
                              onChange={(e) => {
                                updateTextElement(activeTextId, { 
                                  stroke: { 
                                    ...(typeof activeText.stroke === 'object' ? activeText.stroke : { width: 0, color: '#000000' }), 
                                    color: e.target.value 
                                  } 
                                });
                              }}
                              style={{
                                width: '40px',
                                height: '24px',
                                border: '1px solid #444',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                background: 'none'
                              }}
                            />
                <input
                  type="text"
                              value={typeof activeText.stroke === 'object' ? activeText.stroke.color : '#000000'}
                  onChange={(e) => {
                                updateTextElement(activeTextId, { 
                                  stroke: { 
                                    ...(typeof activeText.stroke === 'object' ? activeText.stroke : { width: 0, color: '#000000' }), 
                                    color: e.target.value 
                                  } 
                                });
                              }}
                              style={{
                                flex: '1',
                                padding: '4px',
                                fontSize: '9px',
                                background: '#1a1a1a',
                                border: '1px solid #444',
                                borderRadius: '3px',
                                color: '#fff'
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text Color/Gradient Mode */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color Mode</div>
                    
                    {/* Tab Buttons */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                      <button
                        onClick={() => setTextColorMode('solid')}
                  style={{
                    flex: 1,
                          padding: '4px',
                    fontSize: '8px',
                          background: textColorMode === 'solid' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: textColorMode === 'solid' ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        🎨 Solid
                      </button>
                      <button
                        onClick={() => setTextColorMode('gradient')}
                        style={{
                          flex: 1,
                          padding: '4px',
                          fontSize: '8px',
                          background: textColorMode === 'gradient' ? '#BA55D3' : 'rgba(255,255,255,0.1)',
                          color: textColorMode === 'gradient' ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        🌈 Gradient
                      </button>
                </div>

                    {/* Solid Color Content */}
                    {textColorMode === 'solid' && (
                <input
                        type="color"
                        value={activeText.color}
                  onChange={(e) => {
                          updateTextElement(activeTextId, { color: e.target.value });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                      />
                    )}

                    {/* Gradient Content */}
                    {textColorMode === 'gradient' && (
                      <div style={{ padding: '6px', background: 'rgba(138,43,226,0.05)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
                        {/* Gradient Type */}
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Type</div>
                          <select
                            value={textGradient.type}
                            onChange={(e) => setTextGradient({ ...textGradient, type: e.target.value as any })}
                  style={{
                              width: '100%',
                              padding: '3px',
                              background: '#000000',
                              color: '#FFFFFF',
                              border: '1px solid rgba(138,43,226,0.3)',
                              borderRadius: '2px',
                              fontSize: '7px'
                            }}
                          >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                            <option value="angular">Angular</option>
                            <option value="diamond">Diamond</option>
                          </select>
                        </div>

                        {/* Gradient Angle */}
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Angle</span>
                            <span style={{ color: '#999' }}>{textGradient.angle}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={textGradient.angle}
                            onChange={(e) => setTextGradient({ ...textGradient, angle: parseInt(e.target.value) })}
                            style={{ width: '100%', accentColor: '#BA55D3', height: '3px' }}
                          />
                        </div>

                        {/* Color Stops */}
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '3px' }}>Color Stops</div>
                          
                          {textGradient.stops.map((stop, index) => (
                            <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '3px' }}>
                              <input
                                type="color"
                                value={stop.color}
                                onChange={(e) => {
                                  const newStops = [...textGradient.stops];
                                  newStops[index] = { ...stop, color: e.target.value };
                                  setTextGradient({ ...textGradient, stops: newStops });
                                }}
                                style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={stop.position}
                                onChange={(e) => {
                                  const newStops = [...textGradient.stops];
                                  newStops[index] = { ...stop, position: parseInt(e.target.value) };
                                  setTextGradient({ ...textGradient, stops: newStops });
                                }}
                                style={{ flex: 1, accentColor: '#BA55D3', height: '3px' }}
                              />
                              <span style={{ fontSize: '6px', color: '#999', minWidth: '20px' }}>{stop.position}%</span>
                              <button
                                onClick={() => {
                                  if (textGradient.stops.length > 2) {
                                    const newStops = textGradient.stops.filter((_, i) => i !== index);
                                    setTextGradient({ ...textGradient, stops: newStops });
                                  }
                                }}
                                disabled={textGradient.stops.length <= 2}
                                style={{
                                  padding: '1px 4px',
                                  fontSize: '6px',
                                  background: textGradient.stops.length <= 2 ? 'rgba(100,100,100,0.2)' : 'rgba(220,53,69,0.2)',
                                  color: textGradient.stops.length <= 2 ? '#666' : '#dc3545',
                                  border: '1px solid rgba(220,53,69,0.3)',
                                  borderRadius: '2px',
                                  cursor: textGradient.stops.length <= 2 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          <button
                            onClick={() => {
                              const newStop = { id: Date.now().toString(), color: '#888888', position: 50 };
                              setTextGradient({ ...textGradient, stops: [...textGradient.stops, newStop] });
                            }}
                            style={{
                              width: '100%',
                              padding: '3px',
                              fontSize: '7px',
                              background: 'rgba(138,43,226,0.2)',
                              color: '#BA55D3',
                              border: '1px solid rgba(138,43,226,0.3)',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              marginTop: '2px'
                            }}
                          >
                            + Add Color Stop
                          </button>
                        </div>

                        {/* Preview */}
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Preview</div>
                <div style={{
                            width: '100%',
                            height: '24px',
                            background: getGradientCSS(textGradient),
                  borderRadius: '2px',
                            border: '1px solid rgba(255,255,255,0.2)'
                }} />
              </div>
                      </div>
                    )}
            </div>

            {/* Text Style */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Style</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                <button
                        onClick={() => {
                          updateTextElement(activeTextId, { bold: !activeText.bold });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                  style={{
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '8px',
                          background: activeText.bold ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.bold ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          fontWeight: activeText.bold ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  Bold
                </button>
                <button
                        onClick={() => {
                          updateTextElement(activeTextId, { italic: !activeText.italic });
                          setTimeout(() => {
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture();
                            }
                          }, 50);
                        }}
                  style={{
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '8px',
                          background: activeText.italic ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.italic ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          fontStyle: activeText.italic ? 'italic' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  Italic
                </button>
                      <button
                        onClick={() => {
                          updateTextElement(activeTextId, { underline: !activeText.underline });
                          setTimeout(() => {
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture();
                            }
                          }, 50);
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '8px',
                          background: activeText.underline ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.underline ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          textDecoration: activeText.underline ? 'underline' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Underline
                </button>
              </div>
            </div>

            {/* Text Alignment */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Alignment</div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => updateTextElement(activeTextId, { align: 'left' })}
                        style={{ 
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '10px',
                          background: activeText.align === 'left' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.align === 'left' ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ⬅️
                      </button>
                      <button
                        onClick={() => updateTextElement(activeTextId, { align: 'center' })}
                        style={{ 
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '10px',
                          background: activeText.align === 'center' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.align === 'center' ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ↔️
                      </button>
                      <button
                        onClick={() => updateTextElement(activeTextId, { align: 'right' })}
                        style={{ 
                          flex: 1, 
                          padding: '4px', 
                          fontSize: '10px',
                          background: activeText.align === 'right' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                          color: activeText.align === 'right' ? '#FFFFFF' : '#CCC',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ➡️
                      </button>
                    </div>
                  </div>

                  {/* Text Case */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Text Case</div>
              <select
                      value={activeText.textCase || 'none'}
                      onChange={(e) => updateTextElement(activeTextId, { textCase: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '4px',
                  background: '#000000',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        fontSize: '8px'
                      }}
                    >
                      <option value="none">Normal Case</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                      <option value="capitalize">Capitalize</option>
              </select>
                  </div>

                  {/* Letter Spacing */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                      Letter Spacing: {activeText.letterSpacing || 0}px
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="20"
                      step="0.5"
                      value={activeText.letterSpacing || 0}
                      onChange={(e) => updateTextElement(activeTextId, { letterSpacing: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#0066CC' }}
                    />
                  </div>

                  {/* Line Height */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                      Line Height: {(activeText.lineHeight || 1.2).toFixed(1)}
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="3"
                      step="0.1"
                      value={activeText.lineHeight || 1.2}
                      onChange={(e) => updateTextElement(activeTextId, { lineHeight: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#0066CC' }}
                    />
                  </div>

                  {/* Rotation */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                      Rotation: {Math.round((activeText.rotation || 0) * 180 / Math.PI)}°
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={Math.round((activeText.rotation || 0) * 180 / Math.PI)}
                      onChange={(e) => updateTextElement(activeTextId, { rotation: parseInt(e.target.value) * Math.PI / 180 })}
                      style={{ width: '100%', accentColor: '#0066CC' }}
                    />
                    
                    {/* Rotation Quick Actions */}
                    {/* Rotation Angle Slider */}
                    <div style={{ marginTop: '6px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '8px', color: '#999', minWidth: '35px' }}>Angle:</span>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={((activeText.rotation || 0) * 180 / Math.PI) % 360}
                          onChange={(e) => {
                            const degrees = parseFloat(e.target.value);
                            const radians = (degrees * Math.PI) / 180;
                            updateTextElement(activeTextId, { rotation: radians });
                          }}
                          style={{
                            flex: '1',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#007bff'
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="360"
                          step="0.1"
                          value={parseFloat((((activeText.rotation || 0) * 180 / Math.PI) % 360).toFixed(1))}
                          onChange={(e) => {
                            let degrees = parseFloat(e.target.value) || 0;
                            // Normalize to 0-360 range
                            degrees = ((degrees % 360) + 360) % 360;
                            const radians = (degrees * Math.PI) / 180;
                            updateTextElement(activeTextId, { rotation: radians });
                          }}
                          style={{
                            width: '60px',
                            padding: '4px',
                            fontSize: '10px',
                            background: '#1a1a1a',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            color: '#fff',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '9px', color: '#999' }}>°</span>
                      </div>
                      
                      {/* Reset to 0° button */}
                      <button
                        onClick={() => {
                          updateTextElement(activeTextId, { rotation: 0 });
                        }}
                        style={{
                          width: '100%',
                          padding: '4px',
                fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                color: '#CCC',
                          cursor: 'pointer',
                          marginBottom: '6px'
                        }}
                        title="Reset rotation to 0°"
                      >
                        ↺ Reset (0°)
                      </button>
                    </div>
                    
                    {/* Quick Rotation Actions */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const currentRotation = (activeText.rotation || 0) * 180 / Math.PI;
                          updateTextElement(activeTextId, { rotation: (currentRotation + 90) * Math.PI / 180 });
                        }}
                        style={{
                          flex: '1',
                          padding: '4px 6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Rotate 90° clockwise"
                      >
                        ↻ 90°
                      </button>
                      <button
                        onClick={() => {
                          const currentRotation = (activeText.rotation || 0) * 180 / Math.PI;
                          updateTextElement(activeTextId, { rotation: (currentRotation + 180) * Math.PI / 180 });
                        }}
                        style={{
                          flex: '1',
                          padding: '4px 6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Rotate 180°"
                      >
                        ↻ 180°
                      </button>
                      <button
                        onClick={() => {
                          updateTextElement(activeTextId, { scaleX: -(activeText.scaleX || 1) });
                        }}
                        style={{
                          flex: '1',
                          padding: '4px 6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Flip horizontal"
                      >
                        ⇄ Flip H
                      </button>
                      <button
                        onClick={() => {
                          updateTextElement(activeTextId, { scaleY: -(activeText.scaleY || 1) });
                        }}
                        style={{
                          flex: '1',
                          padding: '4px 6px',
                          fontSize: '9px',
                          background: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '3px',
                          color: '#CCC',
                          cursor: 'pointer'
                        }}
                        title="Flip vertical"
                      >
                        ⇵ Flip V
                      </button>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                      Opacity: {Math.round((activeText.opacity || 1) * 100)}%
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={activeText.opacity || 1}
                      onChange={(e) => updateTextElement(activeTextId, { opacity: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#0066CC' }}
                    />
                  </div>

                  {/* Text Shadow */}
                  <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '6px', fontWeight: '600' }}>🌑 Text Shadow</div>
                    
                    {/* Shadow Color */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Color</div>
                      <input
                        type="color"
                        value={activeText.shadow?.color || '#000000'}
                        onChange={(e) => {
                          updateTextElement(activeTextId, { 
                            shadow: { 
                              blur: activeText.shadow?.blur || 0,
                              offsetX: activeText.shadow?.offsetX || 0,
                              offsetY: activeText.shadow?.offsetY || 0,
                              color: e.target.value 
                            } 
                          });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{ width: '100%', height: '24px', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                      />
                    </div>

                    {/* Shadow Blur */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Blur</span>
                        <span style={{ color: '#999' }}>{activeText.shadow?.blur || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={activeText.shadow?.blur || 0}
                        onChange={(e) => {
                          updateTextElement(activeTextId, { 
                            shadow: { 
                              blur: parseInt(e.target.value),
                              offsetX: activeText.shadow?.offsetX || 0,
                              offsetY: activeText.shadow?.offsetY || 0,
                              color: activeText.shadow?.color || '#000000'
                            } 
                          });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{ width: '100%', accentColor: '#0066CC' }}
                      />
                    </div>

                    {/* Shadow Angle */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Angle</span>
                        <span style={{ color: '#999' }}>
                          {(() => {
                            const offsetX = activeText.shadow?.offsetX || 0;
                            const offsetY = activeText.shadow?.offsetY || 0;
                            const angle = Math.round(Math.atan2(offsetY, offsetX) * 180 / Math.PI);
                            return angle >= 0 ? angle : 360 + angle;
                          })()}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={(() => {
                          const offsetX = activeText.shadow?.offsetX || 0;
                          const offsetY = activeText.shadow?.offsetY || 0;
                          const angle = Math.round(Math.atan2(offsetY, offsetX) * 180 / Math.PI);
                          return angle >= 0 ? angle : 360 + angle;
                        })()}
                        onChange={(e) => {
                          const angle = parseInt(e.target.value);
                          const distance = Math.sqrt(
                            Math.pow(activeText.shadow?.offsetX || 0, 2) + 
                            Math.pow(activeText.shadow?.offsetY || 0, 2)
                          );
                          const angleRad = (angle * Math.PI) / 180;
                          updateTextElement(activeTextId, { 
                            shadow: { 
                              blur: activeText.shadow?.blur || 0,
                              offsetX: Math.cos(angleRad) * distance,
                              offsetY: Math.sin(angleRad) * distance,
                              color: activeText.shadow?.color || '#000000'
                            } 
                          });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{ width: '100%', accentColor: '#0066CC' }}
                      />
                    </div>

                    {/* Shadow Distance */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Distance</span>
                        <span style={{ color: '#999' }}>
                          {Math.round(Math.sqrt(
                            Math.pow(activeText.shadow?.offsetX || 0, 2) + 
                            Math.pow(activeText.shadow?.offsetY || 0, 2)
                          ))}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(Math.sqrt(
                          Math.pow(activeText.shadow?.offsetX || 0, 2) + 
                          Math.pow(activeText.shadow?.offsetY || 0, 2)
                        ))}
                        onChange={(e) => {
                          const distance = parseInt(e.target.value);
                          const offsetX = activeText.shadow?.offsetX || 0;
                          const offsetY = activeText.shadow?.offsetY || 0;
                          const currentAngle = Math.atan2(offsetY, offsetX);
                          updateTextElement(activeTextId, { 
                            shadow: { 
                              blur: activeText.shadow?.blur || 0,
                              offsetX: Math.cos(currentAngle) * distance,
                              offsetY: Math.sin(currentAngle) * distance,
                              color: activeText.shadow?.color || '#000000'
                            } 
                          });
                          setTimeout(() => {
                            const { composeLayers } = useApp.getState();
                            composeLayers();
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{ width: '100%', accentColor: '#0066CC' }}
                      />
                    </div>

                    {/* Shadow Opacity */}
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Shadow Opacity</span>
                        <span style={{ color: '#999' }}>100%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        defaultValue="1"
                        style={{ width: '100%', accentColor: '#0066CC' }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this text?')) {
                          deleteTextElement(activeTextId);
                        }
                      }}
                      style={{ 
                        flex: 1, 
                        padding: '4px', 
                        background: '#dc3545',
                        color: '#ffffff',
                        fontSize: '8px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Delete
                    </button>
                    <button
                      onClick={() => {
                        addTextElement(activeText.text, { u: activeText.u + 0.05, v: activeText.v + 0.05 });
                      }}
                      style={{ 
                        flex: 1, 
                        padding: '4px', 
                        background: '#28a745',
                        color: '#ffffff',
                        fontSize: '8px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Duplicate
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Text Import Features */}
            <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '8px', color: '#CCC', fontWeight: '600', marginBottom: '4px' }}>
                🔗 Import Text
              </div>
              
              {/* Import from URL */}
              <div style={{ marginBottom: '4px' }}>
                <input
                  type="text"
                  placeholder="Enter URL to extract text"
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter') {
                      const url = e.currentTarget.value.trim();
                      if (url) {
                        try {
                          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                          const response = await fetch(proxyUrl);
                          const data = await response.json();
                          
                          if (data.contents) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(data.contents, 'text/html');
                            const text = doc.body.textContent || doc.body.innerText || '';
                            
                            if (text.trim()) {
                              console.log('Text extracted from URL:', text.substring(0, 100));
                              
                              // Update the active text element with extracted text
                              const { activeTextId, updateTextElement } = useApp.getState();
                              if (activeTextId) {
                                updateTextElement(activeTextId, { text: text.trim() });
                                
                                // Trigger live texture update
                                setTimeout(() => {
                                  const { composeLayers } = useApp.getState();
                                  composeLayers();
                                  if ((window as any).updateModelTexture) {
                                    (window as any).updateModelTexture(true, true);
                                  }
                                }, 10);
                                
                                alert(`✅ Text extracted and applied!\n\nExtracted text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);
                              } else {
                                alert(`Text extracted but no text element selected!\n\nExtracted text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\nPlease select a text element first.`);
                              }
                            } else {
                              alert('No text content found in the URL.');
                            }
                          } else {
                            alert('Failed to fetch content from URL.');
                          }
                        } catch (error) {
                          console.error('Error extracting text from URL:', error);
                          alert('Error extracting text from URL.');
                        }
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '3px 4px',
                    fontSize: '7px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    color: '#fff'
                  }}
                />
                <div style={{ fontSize: '6px', color: '#999', marginTop: '1px' }}>
                  Press Enter to extract text
                </div>
              </div>

              {/* Import from File */}
              <div style={{ marginBottom: '4px' }}>
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        if (text) {
                          console.log('Text loaded from file:', text.substring(0, 100));
                          
                          // Update the active text element with file text
                          const { activeTextId, updateTextElement } = useApp.getState();
                          if (activeTextId) {
                            updateTextElement(activeTextId, { text: text.trim() });
                            
                            // Trigger live texture update
                            setTimeout(() => {
                              const { composeLayers } = useApp.getState();
                              composeLayers();
                              if ((window as any).updateModelTexture) {
                                (window as any).updateModelTexture(true, true);
                              }
                            }, 10);
                            
                            alert(`✅ Text loaded and applied!\n\nFile text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);
                          } else {
                            alert(`Text loaded but no text element selected!\n\nFile text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\nPlease select a text element first.`);
                          }
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '3px 4px',
                    fontSize: '7px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    color: '#fff'
                  }}
                />
                <div style={{ fontSize: '6px', color: '#999', marginTop: '1px' }}>
                  TXT, MD, DOC, DOCX, PDF
                </div>
              </div>

              {/* AI Text Detection from Image */}
              <div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        alert('Processing image for text detection... This may take a few seconds.');
                        
                        const img = new Image();
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        img.onload = async () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          
                          try {
                            const { createWorker } = await import('tesseract.js');
                            const worker = await createWorker();
                            
                            const result = await worker.recognize(canvas);
                            await worker.terminate();
                            
                            const { text } = result.data;
                            
                            if (text.trim()) {
                              console.log('Text detected from image:', text.substring(0, 100));
                              
                              // Analyze font characteristics from text content
                              const fontAnalysis = analyzeFontFromText(text);
                              console.log('Font analysis:', fontAnalysis);
                              
                              // Apply detected font style to existing text (don't change text content)
                              const { activeTextId, updateTextElement } = useApp.getState();
                              if (activeTextId) {
                                updateTextElement(activeTextId, { 
                                  ...fontAnalysis // Apply ONLY detected font characteristics, keep existing text
                                });
                                
                                // Trigger live texture update
                                setTimeout(() => {
                                  const { composeLayers } = useApp.getState();
                                  composeLayers();
                                  if ((window as any).updateModelTexture) {
                                    (window as any).updateModelTexture(true, true);
                                  }
                                }, 10);
                                
                                alert(`✅ Font style detected and applied!\n\nDetected text in image: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\nApplied font style to your text: ${fontAnalysis.fontFamily || 'Default'}, ${fontAnalysis.fontSize || 'Auto'}px, ${fontAnalysis.bold ? 'Bold' : 'Normal'}`);
                              } else {
                                alert(`Font style detected but no text element selected!\n\nDetected text in image: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\nPlease select a text element first to apply the font style.`);
                              }
                            } else {
                              alert('No text detected in the image.');
                            }
                          } catch (ocrError) {
                            console.error('OCR Error:', ocrError);
                            alert('Error processing image for text detection.');
                          }
                        };
                        
                        img.onerror = () => {
                          alert('Error loading image.');
                        };
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                        
                      } catch (error) {
                        console.error('Error processing image:', error);
                        alert('Error processing image.');
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '3px 4px',
                    fontSize: '7px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    color: '#fff'
                  }}
                />
                <div style={{ fontSize: '6px', color: '#999', marginTop: '1px' }}>
                  AI/OCR text detection
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Typography Features */}
        {activeTool === 'text' && activeTextId && (() => {
          const activeText = textElements.find(t => t.id === activeTextId);
          if (!activeText) return null;

          return (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(138,43,226,0.1)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#BA55D3' }}>
                ✨ Advanced Typography
              </div>
              
              {/* Word Spacing */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                  Word Spacing: {activeText.wordSpacing || 0}px
                </div>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  step="0.5"
                  value={activeText.wordSpacing || 0}
                  onChange={(e) => {
                    updateTextElement(activeTextId, { wordSpacing: parseFloat(e.target.value) });
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, true);
                      }
                    }, 10);
                  }}
                  style={{ width: '100%', accentColor: '#BA55D3' }}
                />
              </div>

              {/* Text Transform */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Text Transform</div>
                <select
                  value={activeText.textTransform || 'none'}
                  onChange={(e) => {
                    updateTextElement(activeTextId, { textTransform: e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize' });
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, true);
                      }
                    }, 10);
                  }}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: '1px solid rgba(138,43,226,0.3)',
                    borderRadius: '3px',
                    fontSize: '8px'
                  }}
                >
                  <option value="none">None</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>

              {/* Multi-line Support */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Multi-line Support</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={activeText.lineBreak || false}
                    onChange={(e) => {
                      updateTextElement(activeTextId, { lineBreak: e.target.checked });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '8px', color: '#CCC' }}>Enable Line Break</span>
                </div>
                
                {activeText.lineBreak && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>
                      Max Width: {activeText.maxWidth || 200}px
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="800"
                      step="10"
                      value={activeText.maxWidth || 200}
                      onChange={(e) => {
                        updateTextElement(activeTextId, { maxWidth: parseInt(e.target.value) });
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                      style={{ width: '100%', accentColor: '#BA55D3' }}
                    />
                  </div>
                )}
              </div>

              {/* Text Baseline */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Text Baseline</div>
                <select
                  value={activeText.textBaseline || 'top'}
                  onChange={(e) => {
                    updateTextElement(activeTextId, { textBaseline: e.target.value as 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' });
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, true);
                      }
                    }, 10);
                  }}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: '1px solid rgba(138,43,226,0.3)',
                    borderRadius: '3px',
                    fontSize: '8px'
                  }}
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                  <option value="alphabetic">Alphabetic</option>
                  <option value="hanging">Hanging</option>
                </select>
              </div>

              {/* Text Indent */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                  Text Indent: {activeText.textIndent || 0}px
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activeText.textIndent || 0}
                  onChange={(e) => {
                    updateTextElement(activeTextId, { textIndent: parseInt(e.target.value) });
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, true);
                      }
                    }, 10);
                  }}
                  style={{ width: '100%', accentColor: '#BA55D3' }}
                />
              </div>
            </div>
          );
        })()}

        {/* Vector Tool Settings */}
        {activeTool === 'vector' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🎯 Vector Tool
            </div>

            {/* Edit Mode Selection */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Edit Mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {[
                  { mode: 'pen', icon: '✏️', label: 'Pen' },
                  { mode: 'select', icon: '👆', label: 'Select' },
                  { mode: 'move', icon: '↔️', label: 'Move' },
                  { mode: 'curve', icon: '🌊', label: 'Curve' },
                  { mode: 'addAnchor', icon: '➕', label: 'Add' },
                  { mode: 'removeAnchor', icon: '➖', label: 'Remove' },
                  { mode: 'convertAnchor', icon: '🔄', label: 'Convert' }
                ].map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setVectorEditMode(mode as any)}
                    style={{
                      padding: '6px',
                      fontSize: '8px',
                      background: vectorEditMode === mode ? '#0066CC' : 'rgba(255,255,255,0.1)',
                      color: vectorEditMode === mode ? '#FFFFFF' : '#CCC',
                      border: `1px solid ${vectorEditMode === mode ? '#0066CC' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    title={label}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stroke Settings */}
            <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(0,102,204,0.1)', borderRadius: '4px', border: '1px solid rgba(0,102,204,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#0066CC' }}>
                🎨 Stroke Settings
              </div>
              
              {/* Stroke Color */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color</div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={vectorStrokeColor}
                    onChange={(e) => setVectorStrokeColor(e.target.value)}
                    style={{ width: '40px', height: '24px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={vectorStrokeColor}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        setVectorStrokeColor(e.target.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '4px',
                      fontSize: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: '#fff',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Width</span>
                  <span style={{ color: '#999' }}>{vectorStrokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={vectorStrokeWidth}
                  onChange={(e) => setVectorStrokeWidth(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#0066CC' }}
                />
              </div>
            </div>

            {/* Fill Settings */}
            <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,0,128,0.1)', borderRadius: '4px', border: '1px solid rgba(255,0,128,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#FF0080' }}>
                🎨 Fill Settings
              </div>
              
              {/* Fill Toggle */}
              <div style={{ marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '8px', color: '#CCC' }}>
                  <input
                    type="checkbox"
                    checked={vectorFill}
                    onChange={(e) => setVectorFill(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Enable Fill</span>
                </label>
              </div>

              {/* Fill Color (only show if fill is enabled) */}
              {vectorFill && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Fill Color</div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={vectorFillColor}
                      onChange={(e) => setVectorFillColor(e.target.value)}
                      style={{ width: '40px', height: '24px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={vectorFillColor}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          setVectorFillColor(e.target.value);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '4px',
                        fontSize: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        color: '#fff',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Fill Instructions */}
              {vectorFill && (
                <div style={{ fontSize: '7px', color: '#999', marginTop: '6px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px' }}>
                  💡 Tip: Close the path (🔒 button) to see the fill effect
                </div>
              )}
            </div>

            {/* Path Operations */}
            {activePathId && (
              <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px', border: '1px solid rgba(255,165,0,0.3)' }}>
                <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#FFA500' }}>
                  📐 Path Operations
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  <button
                    onClick={() => {
                      const path = vectorPaths.find(p => p.id === activePathId);
                      if (path) {
                        if (path.closed) {
                          openPath(activePathId);
                        } else {
                          closePath(activePathId);
                        }
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    {vectorPaths.find(p => p.id === activePathId)?.closed ? '🔓 Open' : '🔒 Close'}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (activePathId) {
                        reversePath(activePathId);
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Reverse
                  </button>
                </div>

                {/* Path Optimization */}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '8px', color: '#999', marginBottom: '4px' }}>Optimization</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          simplifyPath(activePathId, 0.01);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(0,255,0,0.1)',
                        color: '#0F0',
                        border: '1px solid rgba(0,255,0,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✂️ Simplify
                    </button>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          smoothPath(activePathId, 0.5);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(0,255,255,0.1)',
                        color: '#0FF',
                        border: '1px solid rgba(0,255,255,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🌊 Smooth
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Anchor Operations */}
            {selectedAnchor && (
              <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(138,43,226,0.1)', borderRadius: '4px', border: '1px solid rgba(138,43,226,0.3)' }}>
                <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#BA55D3' }}>
                  📍 Anchor Operations
                </div>
                
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>
                  Path: {selectedAnchor.pathId.slice(0, 8)}... | Anchor: {selectedAnchor.anchorIndex}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  <button
                    onClick={() => {
                      if (selectedAnchor) {
                        convertAnchorType(selectedAnchor.pathId, selectedAnchor.anchorIndex, 'corner');
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Corner (sharp)"
                  >
                    ⬜ Corner
                  </button>
                  <button
                    onClick={() => {
                      if (selectedAnchor) {
                        convertAnchorType(selectedAnchor.pathId, selectedAnchor.anchorIndex, 'smooth');
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Smooth (bezier)"
                  >
                    🌊 Smooth
                  </button>
                  <button
                    onClick={() => {
                      if (selectedAnchor) {
                        convertAnchorType(selectedAnchor.pathId, selectedAnchor.anchorIndex, 'symmetric');
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Symmetric handles"
                  >
                    ⚖️ Symmetric
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (selectedAnchor) {
                      const path = vectorPaths.find(p => p.id === selectedAnchor.pathId);
                      if (path && path.points.length > 2) {
                        removeAnchor(selectedAnchor.pathId, selectedAnchor.anchorIndex);
                        setSelectedAnchor(null);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '4px',
                    fontSize: '7px',
                    background: 'rgba(255,0,0,0.2)',
                    color: '#FF6666',
                    border: '1px solid rgba(255,0,0,0.3)',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Remove Anchor
                </button>
              </div>
            )}

            {/* Transform Operations */}
            {activePathId && (
              <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,0,150,0.1)', borderRadius: '4px', border: '1px solid rgba(255,0,150,0.3)' }}>
                <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#FF0096' }}>
                  🔄 Transform
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  <button
                    onClick={() => {
                      if (activePathId) {
                        flipPath(activePathId, 'horizontal');
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    ↔️ Flip H
                  </button>
                  <button
                    onClick={() => {
                      if (activePathId) {
                        flipPath(activePathId, 'vertical');
                      }
                    }}
                    style={{
                      padding: '4px',
                      fontSize: '7px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    ↕️ Flip V
                  </button>
                </div>

                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '8px', color: '#999', marginBottom: '4px' }}>Scale</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          scalePath(activePathId, 1.1, 1.1);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(0,255,0,0.1)',
                        color: '#0F0',
                        border: '1px solid rgba(0,255,0,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ⬆️ Scale Up
                    </button>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          scalePath(activePathId, 0.9, 0.9);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(255,0,0,0.1)',
                        color: '#F00',
                        border: '1px solid rgba(255,0,0,0.3)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ⬇️ Scale Down
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '8px', color: '#999', marginBottom: '4px' }}>Rotate</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          rotatePath(activePathId, -Math.PI / 4);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#CCC',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ↶ -45°
                    </button>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          rotatePath(activePathId, Math.PI / 2);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#CCC',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ↻ 90°
                    </button>
                    <button
                      onClick={() => {
                        if (activePathId) {
                          rotatePath(activePathId, Math.PI / 4);
                        }
                      }}
                      style={{
                        padding: '4px',
                        fontSize: '7px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#CCC',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ↷ +45°
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Path Info */}
            <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(100,100,100,0.1)', borderRadius: '4px', border: '1px solid rgba(100,100,100,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#999' }}>
                ℹ️ Path Info
              </div>
              <div style={{ fontSize: '8px', color: '#CCC', lineHeight: '1.4' }}>
                <div>Total Paths: {vectorPaths.length}</div>
                {activePathId && (
                  <>
                    <div>Active Path: {activePathId.slice(0, 8)}...</div>
                    <div>Points: {vectorPaths.find(p => p.id === activePathId)?.points.length || 0}</div>
                    <div>Closed: {vectorPaths.find(p => p.id === activePathId)?.closed ? 'Yes' : 'No'}</div>
                  </>
                )}
                {selectedAnchor && (
                  <div>Selected: Path {selectedAnchor.pathId.slice(0, 6)}..., Anchor {selectedAnchor.anchorIndex}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Text Path Features */}
        {activeTool === 'text' && activeTextId && (() => {
          const activeText = textElements.find(t => t.id === activeTextId);
          if (!activeText) return null;

          return (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px', border: '1px solid rgba(255,165,0,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#FFA500' }}>
                📐 Text on Path
              </div>
              
              {/* Path Selection */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Text Path</div>
                <select
                  value={activeText.pathId || ''}
                  onChange={(e) => {
                    const pathId = e.target.value;
                    updateTextElement(activeTextId, { pathId: pathId || undefined });
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, true);
                      }
                    }, 10);
                  }}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,165,0,0.3)',
                    borderRadius: '3px',
                    fontSize: '8px'
                  }}
                >
                  <option value="">No Path (Regular Text)</option>
                  {/* Dynamic path options will be loaded here */}
                </select>
              </div>

              {/* Path Offset */}
              {activeText.pathId && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>
                    Path Offset: {activeText.pathOffset || 0}px
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    value={activeText.pathOffset || 0}
                    onChange={(e) => {
                      updateTextElement(activeTextId, { pathOffset: parseInt(e.target.value) });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ width: '100%', accentColor: '#FFA500' }}
                  />
                </div>
              )}

              {/* Quick Path Creation */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Quick Create Path</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      const pathId = `line-${Date.now()}`;
                      useAdvancedLayerStoreV2.getState().createLinePath(pathId, 100, 100, 300, 100, 'Line Path');
                      updateTextElement(activeTextId, { pathId });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 100);
                    }}
                    style={{
                      background: '#007bff',
                      color: '#FFF',
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '3px',
                      fontSize: '7px',
                      cursor: 'pointer'
                    }}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => {
                      const pathId = `circle-${Date.now()}`;
                      useAdvancedLayerStoreV2.getState().createCirclePath(pathId, 200, 200, 80, 'Circle Path');
                      updateTextElement(activeTextId, { pathId });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 100);
                    }}
                    style={{
                      background: '#28a745',
                      color: '#FFF',
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '3px',
                      fontSize: '7px',
                      cursor: 'pointer'
                    }}
                  >
                    Circle
                  </button>
                  <button
                    onClick={() => {
                      const pathId = `curve-${Date.now()}`;
                      useAdvancedLayerStoreV2.getState().createCurvePath(pathId, 100, 200, 200, 100, 300, 200, 'Curve Path');
                      updateTextElement(activeTextId, { pathId });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 100);
                    }}
                    style={{
                      background: '#dc3545',
                      color: '#FFF',
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '3px',
                      fontSize: '7px',
                      cursor: 'pointer'
                    }}
                  >
                    Curve
                  </button>
                </div>
              </div>

              {/* Remove Path */}
              {activeText.pathId && (
                <div style={{ marginBottom: '6px' }}>
                  <button
                    onClick={() => {
                      updateTextElement(activeTextId, { pathId: undefined, pathOffset: undefined });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{
                      background: '#6c757d',
                      color: '#FFF',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Remove from Path
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Accessibility Features */}
        {activeTool === 'text' && (() => {
          return (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,123,255,0.1)', borderRadius: '4px', border: '1px solid rgba(0,123,255,0.3)' }}>
              <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#007bff' }}>
                ♿ Accessibility Features
              </div>
              
              {/* Accessibility Settings Button */}
              <div style={{ marginBottom: '6px' }}>
                <button
                  onClick={() => {
                    // Import and show accessibility settings panel
                    import('../components/AccessibilitySettingsPanel').then(({ AccessibilitySettingsPanel }) => {
                      // Create a modal container
                      const modal = document.createElement('div');
                      modal.id = 'accessibility-modal';
                      modal.style.position = 'fixed';
                      modal.style.top = '0';
                      modal.style.left = '0';
                      modal.style.width = '100%';
                      modal.style.height = '100%';
                      modal.style.background = 'rgba(0, 0, 0, 0.5)';
                      modal.style.zIndex = '9999';
                      modal.style.display = 'flex';
                      modal.style.alignItems = 'center';
                      modal.style.justifyContent = 'center';
                      
                      // Create React root and render
                      const root = document.createElement('div');
                      modal.appendChild(root);
                      document.body.appendChild(modal);
                      
                      // Import React and render
                      import('react').then(({ createElement }) => {
                        import('react-dom/client').then(({ createRoot }) => {
                          const reactRoot = createRoot(root);
                          reactRoot.render(createElement(AccessibilitySettingsPanel, {
                            onClose: () => {
                              document.body.removeChild(modal);
                            }
                          }));
                        });
                      });
                    }).catch(() => {
                      console.error('Failed to load accessibility settings panel');
                    });
                  }}
                  style={{
                    background: '#007bff',
                    color: '#FFF',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '8px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Open Accessibility Settings
                </button>
              </div>

              {/* Quick Accessibility Info */}
              <div style={{ fontSize: '8px', color: '#CCC', lineHeight: '1.3' }}>
                <div>• Use Tab to navigate text elements</div>
                <div>• Press Enter to edit focused text</div>
                <div>• Arrow keys to move text</div>
                <div>• Delete key to remove text</div>
              </div>
            </div>
          );
        })()}

        {/* Image Settings */}
        {(activeTool === 'image' || activeTool === 'importImage') && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              📷 Image Settings
            </div>
            
            {/* Image Import Section */}
            <div style={{
              padding: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              marginBottom: '12px',
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📷 Import Images
              </div>
              
              {/* Hidden file input */}
              <input
                type="file"
                id="image-import-right-panel"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        // PHASE 2 FIX: Import directly to V2 system - no App.tsx duplication
                        const v2State = useAdvancedLayerStoreV2.getState();
                        const imageId = v2State.addImageElementFromApp({
                          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: file.name,
                          dataUrl: event.target.result as string,
                          // UV coordinates (adjusted for shirt model center)
                          u: 0.45,          // Move left
                          v: 0.65,          // Move higher up  
                          uWidth: 0.25,     // 25% of texture width
                          uHeight: 0.25,    // 25% of texture height
                          // Legacy pixel coords for migration
                          x: 512,
                          y: 512,
                          width: 512,
                          height: 512,
                          visible: true,
                          opacity: 1.0,
                          rotation: 0,
                          locked: false,
                          // Size linking and flip properties
                          sizeLinked: true,
                          horizontalFlip: false,
                          verticalFlip: true, // CRITICAL FIX: Enable vertical flip to correct image orientation
                          // Blending properties
                          blendMode: 'source-over'
                        });
                        
                        // Auto-select the newly imported image
                        useApp.getState().setSelectedImageId(imageId);
                        
                        console.log('📷 Image imported directly to V2 system:', imageId);
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = ''; // Reset input
                }}
              />
              
              {/* Import button */}
              <button 
                onClick={() => document.getElementById('image-import-right-panel')?.click()}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '10px',
                  fontWeight: '600',
                  background: '#000000',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  marginBottom: '8px'
                }}
              >
                📷 Import Images
              </button>
              
              {/* Imported Images List */}
              {(() => {
                // PHASE 2 FIX: Get images from V2 system instead of App.tsx
                const v2State = useAdvancedLayerStoreV2.getState();
                const imageElements = v2State.getAllImageElements();
                
                return imageElements.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      fontSize: '9px',
                      color: '#a0aec0',
                      fontWeight: '600',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Images ({imageElements.length})
                    </div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {imageElements.map((img: any) => (
                        <div
                          key={img.id}
                          onClick={() => useApp.getState().setSelectedImageId(img.id)}
                          style={{
                            padding: '6px 8px',
                            fontSize: '9px',
                            background: selectedImageId === img.id 
                              ? 'rgba(0, 150, 255, 0.3)' 
                              : 'rgba(255, 255, 255, 0.05)',
                            border: selectedImageId === img.id
                              ? '1px solid rgba(0, 150, 255, 0.5)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#FFFFFF'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedImageId !== img.id) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedImageId !== img.id) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                        >
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {img.visible ? '👁️' : '👁️‍🗨️'} {img.locked ? '🔒' : ''} {img.name}
                          </span>
                          <span style={{ fontSize: '8px', color: '#a0aec0', marginLeft: '8px' }}>
                            {((img.uWidth || 0.25) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {selectedImageId ? (
              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}>
                {(() => {
                  // PHASE 2 FIX: Get selected image from V2 system instead of App.tsx
                  const v2State = useAdvancedLayerStoreV2.getState();
                  const imageElements = v2State.getAllImageElements();
                  const selectedImage = imageElements.find(img => img.id === selectedImageId);
                  if (!selectedImage) return null;
                  
                  const { setActiveTool } = useApp.getState();
                  
                  return (
                    <>
                      {/* Move Tool Button */}
                      <button
                        onClick={() => {
                          setActiveTool('image' as any);
                          console.log('📷 Switched to Image Move Tool');
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: (activeTool as string) === 'image' ? 'rgba(0,150,255,0.4)' : 'rgba(102,126,234,0.2)',
                          color: (activeTool as string) === 'image' ? '#FFF' : '#667eea',
                          border: (activeTool as string) === 'image' ? '2px solid rgba(0,150,255,0.6)' : '1px solid rgba(102,126,234,0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        ✋ ENABLE MOVE TOOL
                      </button>

                      {/* Image File Name */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Image File</div>
                        <input
                          type="text"
                          value={selectedImage.name}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#FFF',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>

                      {/* Position (UV) */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Position (UV)</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>U: {Math.round((selectedImage.u || 0.5) * 100)}%</div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={(selectedImage.u || 0.5) * 100}
                              onChange={(e) => {
                                // PHASE 2 FIX: Update image via V2 system
                                const v2State = useAdvancedLayerStoreV2.getState();
                                v2State.updateImageElementFromApp(selectedImageId, { u: parseFloat(e.target.value) / 100 });
                              }}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>V: {Math.round((selectedImage.v || 0.5) * 100)}%</div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={(selectedImage.v || 0.5) * 100}
                              onChange={(e) => {
                                // PHASE 2 FIX: Update image via V2 system
                                const v2State = useAdvancedLayerStoreV2.getState();
                                v2State.updateImageElementFromApp(selectedImageId, { v: parseFloat(e.target.value) / 100 });
                              }}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Size (UV) */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Size (UV)</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>Width: {Math.round((selectedImage.uWidth || 0.25) * 100)}%</div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={(selectedImage.uWidth || 0.25) * 100}
                              onChange={(e) => {
                                const newWidth = parseFloat(e.target.value) / 100;
                                const updates: any = { uWidth: newWidth };
                                if (selectedImage.sizeLinked) {
                                  updates.uHeight = newWidth;
                                }
                                // PHASE 2 FIX: Update image via V2 system
                                const v2State = useAdvancedLayerStoreV2.getState();
                                v2State.updateImageElementFromApp(selectedImageId, updates);
                              }}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              // PHASE 2 FIX: Update image via V2 system
                              const v2State = useAdvancedLayerStoreV2.getState();
                              v2State.updateImageElementFromApp(selectedImageId, { sizeLinked: !selectedImage.sizeLinked });
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: '8px',
                              background: selectedImage.sizeLinked ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,255,0.1)',
                              color: selectedImage.sizeLinked ? '#0F0' : '#CCC',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🔗 {selectedImage.sizeLinked ? 'Linked' : 'Unlinked'}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>Height: {Math.round((selectedImage.uHeight || 0.25) * 100)}%</div>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={(selectedImage.uHeight || 0.25) * 100}
                              onChange={(e) => {
                                const newHeight = parseFloat(e.target.value) / 100;
                                const updates: any = { uHeight: newHeight };
                                if (selectedImage.sizeLinked) {
                                  updates.uWidth = newHeight;
                                }
                                // PHASE 2 FIX: Update image via V2 system
                                const v2State = useAdvancedLayerStoreV2.getState();
                                v2State.updateImageElementFromApp(selectedImageId, updates);
                              }}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rotation & Transform */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>Rotation & Transform</div>
                        <div style={{ fontSize: '8px', color: '#999', marginBottom: '4px' }}>Angle: {selectedImage.rotation || 0}°</div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={selectedImage.rotation || 0}
                          onChange={(e) => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { rotation: parseInt(e.target.value) });
                          }}
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                          <button
                            onClick={() => {
                              // PHASE 2 FIX: Update image via V2 system
                              const v2State = useAdvancedLayerStoreV2.getState();
                              v2State.updateImageElementFromApp(selectedImageId, { rotation: 90 });
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '9px',
                              background: 'rgba(255,255,255,0.1)',
                              color: '#CCC',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            90°
                          </button>
                          <button
                            onClick={() => {
                              // PHASE 2 FIX: Update image via V2 system
                              const v2State = useAdvancedLayerStoreV2.getState();
                              v2State.updateImageElementFromApp(selectedImageId, { rotation: 180 });
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '9px',
                              background: 'rgba(255,255,255,0.1)',
                              color: '#CCC',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            180°
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              // PHASE 2 FIX: Update image via V2 system
                              const v2State = useAdvancedLayerStoreV2.getState();
                              v2State.updateImageElementFromApp(selectedImageId, { horizontalFlip: !selectedImage.horizontalFlip });
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '9px',
                              background: selectedImage.horizontalFlip ? 'rgba(0,150,255,0.3)' : 'rgba(255,255,255,0.1)',
                              color: selectedImage.horizontalFlip ? '#FFF' : '#CCC',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            ↔️ H-Flip
                          </button>
                          <button
                            onClick={() => {
                              // PHASE 2 FIX: Update image via V2 system
                              const v2State = useAdvancedLayerStoreV2.getState();
                              v2State.updateImageElementFromApp(selectedImageId, { verticalFlip: !selectedImage.verticalFlip });
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '9px',
                              background: selectedImage.verticalFlip ? 'rgba(0,150,255,0.3)' : 'rgba(255,255,255,0.1)',
                              color: selectedImage.verticalFlip ? '#FFF' : '#CCC',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            ↕️ V-Flip
                          </button>
                        </div>
                      </div>

                      {/* Opacity */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Opacity: {Math.round((selectedImage.opacity || 1) * 100)}%</div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(selectedImage.opacity || 1) * 100}
                          onChange={(e) => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { opacity: parseInt(e.target.value) / 100 });
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Blend Mode */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Blend Mode</div>
                        <select
                          value={selectedImage.blendMode || 'source-over'}
                          onChange={(e) => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { blendMode: e.target.value as GlobalCompositeOperation });
                          }}
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#FFF',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px'
                          }}
                        >
                          <option value="source-over">Normal</option>
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
              </select>
            </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                        <button
                          onClick={() => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { visible: !selectedImage.visible });
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '10px',
                            background: selectedImage.visible ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)',
                            color: selectedImage.visible ? '#0F0' : '#F00',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {selectedImage.visible ? '👁️' : '🙈'} {selectedImage.visible ? 'Visible' : 'Hidden'}
                        </button>
                        <button
                          onClick={() => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { locked: !selectedImage.locked });
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '10px',
                            background: selectedImage.locked ? 'rgba(255,165,0,0.2)' : 'rgba(255,255,255,0.1)',
                            color: selectedImage.locked ? '#FFA500' : '#CCC',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {selectedImage.locked ? '🔒' : '🔓'} {selectedImage.locked ? 'Locked' : 'Unlocked'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this image?')) {
                              removeImportedImage(selectedImageId);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '10px',
                            background: 'rgba(255,0,0,0.2)',
                            color: '#F00',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      {/* Utility Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, { 
                              u: 0.5, 
                              v: 0.5 
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '10px',
                            background: 'rgba(0,150,255,0.2)',
                            color: '#0096FF',
                            border: '1px solid rgba(0,150,255,0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🎯 Center
                        </button>
                        <button
                          onClick={() => {
                            // PHASE 2 FIX: Update image via V2 system
                            const v2State = useAdvancedLayerStoreV2.getState();
                            v2State.updateImageElementFromApp(selectedImageId, {
                              uWidth: 0.25,
                              uHeight: 0.25
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '10px',
                            background: 'rgba(255,165,0,0.2)',
                            color: '#FFA500',
                            border: '1px solid rgba(255,165,0,0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🔄 Reset Size
                        </button>
                      </div>

                      {/* Keyboard Shortcuts Info */}
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px', 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '4px',
                        fontSize: '8px',
                        color: '#999',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#CCC' }}>Keyboard Shortcuts:</div>
                        <div>• Click and drag to move image</div>
                        <div>• Hold Shift while dragging for precise movement</div>
                        <div>• Use mouse wheel to resize (when move tool active)</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '11px'
              }}>
                No image selected. Import an image from the left panel to edit it here.
              </div>
            )}
          </div>
        )}

        {/* Picker Settings */}
        {activeTool === 'picker' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '10px',
              color: '#999',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Color Picker Settings
            </div>

            {/* Current Color Display */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '8px'
              }}>
                Selected Color
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  width: '40px',
                  height: '30px',
                  background: brushColor,
                  borderRadius: '4px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }} />
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}>
                    {brushColor}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    color: '#999'
                  }}>
                    Click on model to pick color
                  </div>
                </div>
              </div>
            </div>

            {/* Color Code Input */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Color Code
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="text"
                  value={brushColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
                      setBrushColor(value);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '9px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontFamily: 'monospace'
                  }}
                  placeholder="#000000"
                />
                <button
                  onClick={() => {
                    // Copy color to clipboard
                    navigator.clipboard.writeText(brushColor);
                    console.log('🎨 Color copied to clipboard:', brushColor);
                  }}
                  style={{
                    padding: '6px 8px',
                    background: '#0066CC',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              padding: '8px',
              background: 'rgba(0, 102, 204, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 102, 204, 0.3)'
            }}>
              <div style={{
                fontSize: '8px',
                color: '#66B3FF',
                lineHeight: '1.4'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>How to use:</div>
                <div>1. Click on any color in the model</div>
                <div>2. The color will be picked and displayed here</div>
                <div>3. You can manually edit the color code above</div>
                <div>4. The picked color will be applied to your brush</div>
              </div>
            </div>
          </div>
        )}

        {/* Symmetry Settings */}
        {(activeTool === 'symmetry' || activeTool === 'symmetryX' || activeTool === 'symmetryY' || activeTool === 'symmetryZ') && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '10px',
              color: '#999',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Symmetry
            </div>

            {/* X Symmetry */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '9px',
                color: '#CCC',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryX}
                  onChange={(e) => setSymmetryX(e.target.checked)}
                  style={{ accentColor: '#0066CC' }}
                />
                <span>X-Axis</span>
              </label>
            </div>

            {/* Y Symmetry */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '9px',
                color: '#CCC',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryY}
                  onChange={(e) => setSymmetryY(e.target.checked)}
                  style={{ accentColor: '#0066CC' }}
                />
                <span>Y-Axis</span>
              </label>
            </div>

            {/* Z Symmetry */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '9px',
                color: '#CCC',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryZ}
                  onChange={(e) => setSymmetryZ(e.target.checked)}
                  style={{ accentColor: '#0066CC' }}
                />
                <span>Z-Axis</span>
              </label>
            </div>
          </div>
        )}

        {/* Advanced Layer Settings */}
        {activeTab === 'layers' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🎨 Advanced Layer System
            </div>
            
            {/* Active Layer Info */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Active Layer
              </div>
              <div style={{
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#a0aec0'
              }}>
                {(() => {
                  const activeLayer = advancedActiveLayerId ? advancedLayers.find(l => l.id === advancedActiveLayerId) : null;
                  return activeLayer ? `${activeLayer.name} (${activeLayer.type})` : 'No active layer';
                })()}
              </div>
            </div>

            {/* Layer Controls */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '8px',
                color: '#999',
                marginBottom: '4px',
                fontWeight: '500',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#E8E8E8',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: '400',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}
                  onClick={() => createLayer('paint', 'New Layer')}
                  title="Create new paint layer"
                >
                  ➕ Layer
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#E8E8E8',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: '400',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}
                  onClick={() => createGroup('New Group')}
                  title="Create new layer group"
                >
                  📁 Group
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#999',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: '400',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}
                  onClick={() => console.log('Auto organize not available in V2')}
                  title="Auto organize layers (coming soon)"
                >
                  🤖 Auto
                </button>
              </div>
            </div>

            {/* Layer List */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Layers ({advancedLayerOrder.length})
              </div>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '4px'
              }}>
                {advancedLayerOrder.length === 0 ? (
                  <div style={{
                    padding: '8px',
                    color: '#888888',
                    fontSize: '9px',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    No layers yet. Create one!
                  </div>
                ) : (
                  advancedLayerOrder.map(layerId => {
                    const layer = advancedLayers.find(l => l.id === layerId);
                    if (!layer) return null;
                    const isActive = layer.id === advancedActiveLayerId;

                    return (
                      <div
                        key={layer.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px 6px',
                          marginBottom: '2px',
                          backgroundColor: isActive ? '#007acc' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '9px',
                          border: isActive ? '1px solid #005f99' : '1px solid transparent'
                        }}
                        onClick={() => setActiveLayer(layer.id)}
                      >
                        <input
                          type="checkbox"
                          checked={layer.visible}
                          onChange={(e) => {
                            e.stopPropagation();
                            setLayerVisibility(layer.id, !layer.visible);
                          }}
                          style={{ marginRight: '6px', transform: 'scale(0.8)' }}
                        />
                        <span style={{ flexGrow: 1, color: isActive ? '#ffffff' : '#cccccc' }}>
                          {layer.name}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={layer.opacity}
                          onChange={(e) => {
                            e.stopPropagation();
                            setLayerOpacity(layer.id, parseFloat(e.target.value));
                          }}
                          style={{ width: '40px', marginRight: '4px', transform: 'scale(0.8)' }}
                        />
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            duplicateLayer(layer.id); 
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#cccccc', 
                            cursor: 'pointer', 
                            marginRight: '2px',
                            fontSize: '8px'
                          }}
                          title="Duplicate Layer"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteLayer(layer.id); 
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#dc3545', 
                            cursor: 'pointer',
                            fontSize: '8px'
                          }}
                          title="Delete Layer"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Layer Actions */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const { createLayer } = useAdvancedLayerStoreV2.getState();
                    createLayer('paint', 'New Paint Layer');
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  + Paint
                </button>
                <button
                  onClick={() => {
                    const { createLayer } = useAdvancedLayerStoreV2.getState();
                    createLayer('paint', 'New Puff Layer');
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  + Puff
                </button>
                <button
                  onClick={() => {
                    const { createLayer } = useAdvancedLayerStoreV2.getState();
                    createLayer('paint', 'New Vector Layer');
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  + Vector
                </button>
                <button
                  onClick={() => {
                    const { createLayer } = useAdvancedLayerStoreV2.getState();
                    createLayer('paint', 'New Embroidery Layer');
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  + Embroidery
                </button>
              </div>
            </div>

            {/* Layer Statistics */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Layer Statistics
              </div>
              <div style={{
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#a0aec0'
              }}>
                {(() => {
                  const { layers } = useAdvancedLayerStoreV2.getState();
                  const totalLayers = advancedLayerOrder.length;
                  const visibleLayers = layers.filter(layer => layer.visible).length;
                  const lockedLayers = layers.filter(layer => layer.locked).length;
                  
                  return (
                    <div>
                      <div>Total: {totalLayers}</div>
                      <div>Visible: {visibleLayers}</div>
                      <div>Locked: {lockedLayers}</div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Layer Composition */}
            <div>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Composition
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    const { composeLayers } = useApp.getState();
                    composeLayers();
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '9px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔄 Compose
                </button>
                <button
                  onClick={() => {
                    // Force layer composition update
                    const { composeLayers } = useApp.getState();
                    composeLayers(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '9px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⚡ Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Layers V2 System */}
        {activeTab === 'advancedLayers' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🚀 Advanced Layers V2
            </div>
            
            {/* Auto-Creation Controls */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Auto-Creation
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => console.log('Auto-creation disabled in simplified system')}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: autoCreationEnabled ? '#28a745' : '#dc3545',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  {autoCreationEnabled ? '✅ Enabled' : '❌ Disabled'}
                </button>
                <span style={{ fontSize: '8px', color: '#888' }}>
                  {autoCreationEnabled ? 'Layers created automatically' : 'Manual layer creation'}
                </span>
              </div>
            </div>

            {/* Selection Information */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Selection
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '8px', color: '#888' }}>
                  {selectedElements.length > 0 
                    ? `${selectedElements.length} element${selectedElements.length > 1 ? 's' : ''} selected`
                    : 'No elements selected'
                  }
                </span>
                {selectedElements.length > 0 && (
                  <button
                    onClick={clearElementSelection}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '8px'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {activeElement && (
                <div style={{ marginTop: '4px', fontSize: '8px', color: '#aaa' }}>
                  Active: {activeElement.type} ({activeElement.id.slice(0, 8)}...)
                </div>
              )}
            </div>

            {/* Active Layer Info */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Active Layer
              </div>
              <div style={{
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#a0aec0'
              }}>
                {(() => {
                  const activeLayer = advancedActiveLayerId 
                    ? advancedLayers.find(layer => layer.id === advancedActiveLayerId)
                    : null;
                  return activeLayer ? `${activeLayer.name} (${activeLayer.type})` : 'No active layer';
                })()}
              </div>
            </div>

            {/* Layer Creation Controls */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Create Layers
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => createLayer('paint', generateAdvancedLayerName('paint'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007acc',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  🎨 Paint
                </button>
                <button
                  onClick={() => createLayer('text', generateAdvancedLayerName('text'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#6f42c1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  📝 Text
                </button>
                <button
                  onClick={() => createLayer('paint', generateAdvancedLayerName('paint'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#20c997',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  🔷 Vector
                </button>
                <button
                  onClick={() => createLayer('paint', generateAdvancedLayerName('paint'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#fd7e14',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  ☁️ Puff
                </button>
                <button
                  onClick={() => createLayer('paint', generateAdvancedLayerName('paint'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e83e8c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  🧵 Embroidery
                </button>
                <button
                  onClick={() => createLayer('image', generateAdvancedLayerName('image'))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#17a2b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  📷 Image
                </button>
              </div>
            </div>

            {/* Layer List */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Layers ({advancedLayers.length})
              </div>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                background: 'rgba(0, 0, 0, 0.2)'
              }}>
                {advancedLayers.length === 0 ? (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '10px'
                  }}>
                    No layers created yet
                  </div>
                ) : (
                  advancedLayerOrder.map(layerId => {
                    const layer = advancedLayers.find(l => l.id === layerId);
                    if (!layer) return null;
                    
                    return (
                      <div
                        key={layer.id}
                        onClick={() => selectLayer(layer.id)}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          background: layer.selected ? 'rgba(0, 123, 204, 0.2)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '10px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={layer.visible}
                          onChange={(e) => {
                            e.stopPropagation();
                            setLayerVisibility(layer.id, e.target.checked);
                          }}
                          style={{ margin: 0 }}
                        />
                        <span 
                          style={{ 
                            color: layer.visible ? '#fff' : '#666',
                            flex: 1,
                            textDecoration: layer.locked ? 'line-through' : 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '2px',
                            transition: 'background-color 0.2s'
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Rename layer:', layer.name);
                            if (newName && newName.trim() && newName !== layer.name) {
                              renameLayer(layer.id, newName.trim());
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Double-click to rename"
                        >
                          {layer.name}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={layer.opacity}
                          onChange={(e) => {
                            e.stopPropagation();
                            setLayerOpacity(layer.id, parseFloat(e.target.value));
                          }}
                          style={{
                            width: '40px',
                            height: '2px',
                            margin: '0 4px'
                          }}
                        />
                        <span style={{ fontSize: '8px', color: '#888', minWidth: '30px' }}>
                          {Math.round(layer.opacity * 100)}%
                        </span>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            duplicateLayer(layer.id); 
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#cccccc', 
                            cursor: 'pointer', 
                            marginRight: '2px',
                            fontSize: '8px'
                          }}
                          title="Duplicate Layer"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteLayer(layer.id); 
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#dc3545', 
                            cursor: 'pointer',
                            fontSize: '8px'
                          }}
                          title="Delete Layer"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Layer Order Controls */}
            {advancedActiveLayerId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '6px'
                }}>
                  Layer Order
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => moveLayerToTop(advancedActiveLayerId)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    🔝 Top
                  </button>
                  <button
                    onClick={() => moveLayerUp(advancedActiveLayerId)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    ⬆️ Up
                  </button>
                  <button
                    onClick={() => moveLayerDown(advancedActiveLayerId)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    ⬇️ Down
                  </button>
                  <button
                    onClick={() => moveLayerToBottom(advancedActiveLayerId)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    🔻 Bottom
                  </button>
                </div>
              </div>
            )}

            {/* Layer Grouping Controls */}
            {advancedActiveLayerId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '6px'
                }}>
                  Layer Grouping
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      const groupName = prompt('Enter group name:', 'New Group');
                      if (groupName && groupName.trim()) {
                        const groupId = createGroup(groupName.trim());
                        addToGroup(advancedActiveLayerId, groupId);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    📁 Create Group
                  </button>
                  <button
                    onClick={() => removeFromGroup(advancedActiveLayerId)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    ➖ Ungroup
                  </button>
                </div>
              </div>
            )}

            {/* Layer Effects Panel */}
            {advancedActiveLayerId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '6px'
                }}>
                  Layer Effects
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <button
                    onClick={() => {
                      const effect: LayerEffect = {
                        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'blur',
                        enabled: true,
                        properties: { radius: 5 }
                      };
                      addEffect(advancedActiveLayerId, effect);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6f42c1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    🌫️ Blur
                  </button>
                  <button
                    onClick={() => {
                      const effect: LayerEffect = {
                        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'brightness',
                        enabled: true,
                        properties: { value: 20 }
                      };
                      addEffect(advancedActiveLayerId, effect);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#fd7e14',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    ☀️ Brightness
                  </button>
                  <button
                    onClick={() => {
                      const effect: LayerEffect = {
                        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'contrast',
                        enabled: true,
                        properties: { value: 30 }
                      };
                      addEffect(advancedActiveLayerId, effect);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#20c997',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    🎨 Contrast
                  </button>
                  <button
                    onClick={() => {
                      const effect: LayerEffect = {
                        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'drop-shadow',
                        enabled: true,
                        properties: { x: 2, y: 2, blur: 4, color: '#000000', opacity: 0.5 }
                      };
                      addEffect(advancedActiveLayerId, effect);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px'
                    }}
                  >
                    🌑 Drop Shadow
                  </button>
                </div>
                
                {/* Active Effects List */}
                {(() => {
                  const activeLayer = advancedLayers.find(l => l.id === advancedActiveLayerId);
                  if (!activeLayer || activeLayer.effects.length === 0) return null;
                  
                  return (
                    <div style={{
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '6px',
                      fontSize: '8px'
                    }}>
                      <div style={{ color: '#CCC', marginBottom: '4px' }}>
                        Active Effects ({activeLayer.effects.length})
                      </div>
                      {activeLayer.effects.map((effect, index) => (
                        <div key={effect.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '2px 4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '2px',
                          marginBottom: '2px'
                        }}>
                          <span style={{ color: '#fff' }}>
                            {effect.type} {effect.enabled ? '✅' : '❌'}
                          </span>
                          <button
                            onClick={() => removeEffect(advancedActiveLayerId, effect.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: '8px',
                              padding: '1px 4px'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Blend Modes Panel */}
            {advancedActiveLayerId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '6px'
                }}>
                  Blend Modes
                </div>
                <div style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '6px'
                }}>
                  <select
                    value={(() => {
                      const activeLayer = advancedLayers.find(l => l.id === advancedActiveLayerId);
                      return activeLayer?.blendMode || 'normal';
                    })()}
                    onChange={(e) => {
                      const newBlendMode = e.target.value as BlendMode;
                      setLayerBlendMode(advancedActiveLayerId, newBlendMode);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '3px',
                      color: '#fff',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="normal" style={{ backgroundColor: '#000', color: '#fff' }}>Normal</option>
                    <option value="multiply" style={{ backgroundColor: '#000', color: '#fff' }}>Multiply</option>
                    <option value="screen" style={{ backgroundColor: '#000', color: '#fff' }}>Screen</option>
                    <option value="overlay" style={{ backgroundColor: '#000', color: '#fff' }}>Overlay</option>
                    <option value="soft-light" style={{ backgroundColor: '#000', color: '#fff' }}>Soft Light</option>
                    <option value="hard-light" style={{ backgroundColor: '#000', color: '#fff' }}>Hard Light</option>
                    <option value="color-dodge" style={{ backgroundColor: '#000', color: '#fff' }}>Color Dodge</option>
                    <option value="color-burn" style={{ backgroundColor: '#000', color: '#fff' }}>Color Burn</option>
                    <option value="darken" style={{ backgroundColor: '#000', color: '#fff' }}>Darken</option>
                    <option value="lighten" style={{ backgroundColor: '#000', color: '#fff' }}>Lighten</option>
                    <option value="difference" style={{ backgroundColor: '#000', color: '#fff' }}>Difference</option>
                    <option value="exclusion" style={{ backgroundColor: '#000', color: '#fff' }}>Exclusion</option>
                    <option value="hue" style={{ backgroundColor: '#000', color: '#fff' }}>Hue</option>
                    <option value="saturation" style={{ backgroundColor: '#000', color: '#fff' }}>Saturation</option>
                    <option value="color" style={{ backgroundColor: '#000', color: '#fff' }}>Color</option>
                    <option value="luminosity" style={{ backgroundColor: '#000', color: '#fff' }}>Luminosity</option>
                  </select>
                  <div style={{
                    marginTop: '4px',
                    fontSize: '8px',
                    color: '#888',
                    textAlign: 'center'
                  }}>
                    Current: {(() => {
                      const activeLayer = advancedLayers.find(l => l.id === advancedActiveLayerId);
                      return activeLayer?.blendMode || 'normal';
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Layer Masks Panel */}
            {advancedActiveLayerId && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#CCC',
                  marginBottom: '6px'
                }}>
                  Layer Masks
                </div>
                <div style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '6px'
                }}>
                  {(() => {
                    const activeLayer = advancedLayers.find(l => l.id === advancedActiveLayerId);
                    const hasMask = activeLayer?.mask;
                    
                    if (!hasMask) {
                      return (
                        <div style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              // Create a new mask with a blank canvas
                              const maskCanvas = document.createElement('canvas');
                              maskCanvas.width = 1024;
                              maskCanvas.height = 1024;
                              
                              const mask: LayerMask = {
                                id: `mask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                canvas: maskCanvas,
                                enabled: true,
                                inverted: false
                              };
                              
                              addMask(advancedActiveLayerId, mask);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '9px',
                              marginBottom: '4px'
                            }}
                          >
                            🎭 Create Mask
                          </button>
                          <div style={{ fontSize: '8px', color: '#888' }}>
                            No mask applied
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px'
                        }}>
                          <span style={{ fontSize: '8px', color: '#fff' }}>
                            Mask {hasMask.enabled ? '✅' : '❌'}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => toggleMaskEnabled(advancedActiveLayerId)}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: hasMask.enabled ? '#28a745' : '#6c757d',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '8px'
                              }}
                            >
                              {hasMask.enabled ? 'ON' : 'OFF'}
                            </button>
                            <button
                              onClick={() => toggleMaskInverted(advancedActiveLayerId)}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: hasMask.inverted ? '#ffc107' : '#6c757d',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '8px'
                              }}
                            >
                              {hasMask.inverted ? 'INV' : 'NORM'}
                            </button>
                            <button
                              onClick={() => removeMask(advancedActiveLayerId)}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: '#dc3545',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '8px'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '8px',
                          color: '#888',
                          textAlign: 'center',
                          padding: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '2px'
                        }}>
                          {hasMask.enabled 
                            ? (hasMask.inverted ? 'Inverted mask active' : 'Mask active')
                            : 'Mask disabled'
                          }
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Event History */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Event History ({eventHistory.length})
              </div>
              <div style={{
                maxHeight: '100px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '6px',
                fontSize: '8px',
                color: '#888'
              }}>
                {eventHistory.slice(-10).map((event, index) => (
                  <div key={index} style={{ marginBottom: '2px' }}>
                    {event.type} - {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                ))}
                {eventHistory.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    No events yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Universal Select Settings */}
        {activeTab === 'universalSelect' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🎯 Universal Select Tool
            </div>
            
            {/* Selection Info */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '4px'
              }}>
                Selection Status
              </div>
              <div style={{
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#a0aec0'
              }}>
                No elements selected
              </div>
            </div>

            {/* AI Selection Tools */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                AI Selection Tools
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#6f42c1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('AI Object Selection')}
                >
                  🎯 Object
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e83e8c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('AI Color Selection')}
                >
                  🎨 Color
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#20c997',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('AI Similar Selection')}
                >
                  🔍 Similar
                </button>
              </div>
            </div>

            {/* Selection Actions */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Selection Actions
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007acc',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Group Elements')}
                >
                  📦 Group
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#28a745',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Duplicate Elements')}
                >
                  📋 Duplicate
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ffc107',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Align Elements')}
                >
                  ⚖️ Align
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#dc3545',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Clear Selection')}
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            {/* Transform Controls */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Transform Controls
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Move Left')}
                >
                  ←
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Move Up')}
                >
                  ↑
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Move Down')}
                >
                  ↓
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#495057',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                  onClick={() => console.log('Move Right')}
                >
                  →
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '9px',
                color: '#CCC',
                marginBottom: '6px'
              }}>
                Keyboard Shortcuts
              </div>
              <div style={{
                fontSize: '8px',
                color: '#666666',
                lineHeight: '1.4',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '3px'
              }}>
                <div>• Ctrl/Cmd + A: Select all</div>
                <div>• Ctrl/Cmd + Click: Add to selection</div>
                <div>• Shift + Click: Subtract from selection</div>
                <div>• Delete/Backspace: Delete selected</div>
                <div>• Escape: Clear selection</div>
                <div>• Arrow keys: Nudge selected</div>
                <div>• Shift + Arrow: Nudge by 10px</div>
              </div>
            </div>
          </div>
        )}

        {/* Shapes Settings */}
        {activeTool === 'shapes' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '10px',
              color: '#999',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🔷 Shape Tools
            </div>

            {/* Shape Type Selection */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Shape Type</div>
              <select
                value={useApp.getState().shapeType || 'rectangle'}
                onChange={(e) => useApp.setState({ shapeType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '8px',
                  background: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  color: '#ffffff'
                }}
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="star">Star</option>
                <option value="heart">Heart</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>

            {/* Shape Size */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Size</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{useApp.getState().shapeSize || 50}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                value={useApp.getState().shapeSize || 50}
                onChange={(e) => useApp.setState({ shapeSize: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#0066CC' }}
              />
            </div>

            {/* Shape Opacity */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Opacity</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{Math.round((useApp.getState().shapeOpacity || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={useApp.getState().shapeOpacity || 1}
                onChange={(e) => useApp.setState({ shapeOpacity: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#0066CC' }}
              />
            </div>

            {/* Shape Color Mode Tabs */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Color Mode</div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                <button
                  onClick={() => setShapesColorMode('solid')}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '8px',
                    background: shapesColorMode === 'solid' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                    color: shapesColorMode === 'solid' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  🎨 Solid
                </button>
                <button
                  onClick={() => setShapesColorMode('gradient')}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '8px',
                    background: shapesColorMode === 'gradient' ? '#0066CC' : 'rgba(255,255,255,0.1)',
                    color: shapesColorMode === 'gradient' ? '#FFFFFF' : '#CCC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  🌈 Gradient
                </button>
              </div>

              {/* Solid Color */}
              {shapesColorMode === 'solid' && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Color</div>
                  <HexColorPicker
                    color={useApp.getState().shapeColor || '#ff69b4'}
                    onChange={(color) => {
                      useApp.setState({ shapeColor: color });
                      setTimeout(() => {
                        const { composeLayers } = useApp.getState();
                        composeLayers();
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ width: '100%', height: '60px' }}
                  />
                </div>
              )}

              {/* Gradient Controls */}
              {shapesColorMode === 'gradient' && (
                <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '6px', fontWeight: '600' }}>🌈 Gradient Settings</div>
                  
                  {/* Gradient Type */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Type</div>
                    <select
                      value={shapesGradient.type}
                      onChange={(e) => setShapesGradient({ ...shapesGradient, type: e.target.value as any })}
                      style={{ width: '100%', padding: '2px 4px', fontSize: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '2px', color: '#fff' }}
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                      <option value="angular">Angular</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  {/* Gradient Angle */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Angle</span>
                      <span style={{ color: '#999' }}>{shapesGradient.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={shapesGradient.angle}
                      onChange={(e) => setShapesGradient({ ...shapesGradient, angle: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#BA55D3' }}
                    />
                  </div>

                  {/* Gradient Preview */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Preview</div>
                    <div
                      style={{
                        width: '100%',
                        height: '20px',
                        background: getGradientCSS(shapesGradient),
                        borderRadius: '3px',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  </div>

                  {/* Color Stops */}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '4px' }}>Color Stops</div>
                    
                    {shapesGradient.stops.map((stop, index) => (
                      <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = [...shapesGradient.stops];
                            newStops[index] = { ...stop, color: e.target.value };
                            setShapesGradient({ ...shapesGradient, stops: newStops });
                          }}
                          style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stop.position}
                          onChange={(e) => {
                            const newStops = [...shapesGradient.stops];
                            newStops[index] = { ...stop, position: parseInt(e.target.value) };
                            setShapesGradient({ ...shapesGradient, stops: newStops });
                          }}
                          style={{ flex: 1, accentColor: '#BA55D3' }}
                        />
                        <span style={{ fontSize: '6px', color: '#999', minWidth: '25px' }}>{stop.position}%</span>
                        {shapesGradient.stops.length > 2 && (
                          <button
                            onClick={() => {
                              const newStops = shapesGradient.stops.filter((_, i) => i !== index);
                              setShapesGradient({ ...shapesGradient, stops: newStops });
                            }}
                            style={{ background: 'rgba(255,0,0,0.3)', border: 'none', color: '#fff', borderRadius: '2px', padding: '2px 4px', fontSize: '6px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        const newStop = {
                          id: Date.now().toString(),
                          color: '#ffffff',
                          position: 50
                        };
                        setShapesGradient({ ...shapesGradient, stops: [...shapesGradient.stops, newStop] });
                      }}
                      style={{ width: '100%', padding: '4px', fontSize: '7px', background: 'rgba(0,255,0,0.2)', border: '1px solid rgba(0,255,0,0.3)', borderRadius: '2px', color: '#fff', cursor: 'pointer' }}
                    >
                      + Add Color Stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shape Rotation */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Rotation</span>
                <span style={{ fontSize: '8px', color: '#999' }}>{useApp.getState().shapeRotation || 0}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={useApp.getState().shapeRotation || 0}
                onChange={(e) => useApp.setState({ shapeRotation: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#0066CC' }}
              />
            </div>

            {/* Shape Position */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>Position</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>X</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={useApp.getState().shapePositionX || 50}
                    onChange={(e) => useApp.setState({ shapePositionX: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#0066CC' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Y</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={useApp.getState().shapePositionY || 50}
                    onChange={(e) => useApp.setState({ shapePositionY: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#0066CC' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  // Add shape to the model
                  const { addShapeElement } = useApp.getState();
                  if (addShapeElement) {
                    addShapeElement({
                      type: useApp.getState().shapeType || 'rectangle',
                      size: useApp.getState().shapeSize || 50,
                      opacity: useApp.getState().shapeOpacity || 1,
                      color: useApp.getState().shapeColor || '#ff69b4',
                      rotation: useApp.getState().shapeRotation || 0,
                      positionX: useApp.getState().shapePositionX || 50,
                      positionY: useApp.getState().shapePositionY || 50,
                      gradient: shapesColorMode === 'gradient' ? shapesGradient : null
                    });
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '9px',
                  background: 'rgba(0, 150, 255, 0.2)',
                  color: '#66B3FF',
                  border: '1px solid rgba(0, 150, 255, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ➕ Add Shape
              </button>
              <button
                onClick={() => {
                  // Clear all shapes
                  const { clearShapes } = useApp.getState();
                  if (clearShapes) {
                    clearShapes();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '9px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  color: '#FF6666',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        )}

        {/* Shapes Panel */}
        {(activeTool === 'shapes' || activeTool === 'move') && (
          <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '8px', color: '#FFF' }}>
              🔷 Shapes
            </div>
            
            {/* Shape List */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '4px' }}>Shape List</div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                {shapeElements.map((shape) => (
                  <div
                    key={shape.id}
                    onClick={() => setActiveShapeId(shape.id)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '8px',
                      background: activeShapeId === shape.id ? 'rgba(0,150,255,0.3)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px' }}>
                        {shape.type === 'rectangle' ? '⬜' : 
                         shape.type === 'circle' ? '⭕' : 
                         shape.type === 'triangle' ? '🔺' : 
                         shape.type === 'star' ? '⭐' : 
                         shape.type === 'heart' ? '❤️' : 
                         shape.type === 'diamond' ? '💎' : '⬜'}
                      </span>
                      <span style={{ color: activeShapeId === shape.id ? '#66B3FF' : '#FFF' }}>
                        {shape.name || `Shape ${shape.id.slice(0, 4)}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newName = window.prompt('Rename shape:', shape.name || 'Shape');
                          if (newName && newName.trim()) {
                            updateShapeElement(shape.id, { name: newName.trim() });
                          }
                        }}
                        style={{
                          padding: '2px 4px',
                          fontSize: '7px',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateShapeElement(shape.id);
                          
                          // Trigger live texture update
                          setTimeout(() => {
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{
                          padding: '2px 4px',
                          fontSize: '7px',
                          background: 'rgba(0,255,0,0.1)',
                          color: '#66FF66',
                          border: '1px solid rgba(0,255,0,0.3)',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this shape?')) {
                            deleteShapeElement(shape.id);
                            
                            // Trigger live texture update
                            setTimeout(() => {
                              const { composeLayers } = useApp.getState();
                              composeLayers();
                              if ((window as any).updateModelTexture) {
                                (window as any).updateModelTexture(true, true);
                              }
                            }, 10);
                          }
                        }}
                        style={{
                          padding: '2px 4px',
                          fontSize: '7px',
                          background: 'rgba(255,0,0,0.1)',
                          color: '#FF6666',
                          border: '1px solid rgba(255,0,0,0.3)',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {shapeElements.length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '8px', color: '#666' }}>
                    No shapes created yet
                  </div>
                )}
              </div>
            </div>

            {/* Active Shape Controls */}
            {activeShapeId && activeShape && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,150,255,0.1)', borderRadius: '4px', border: '1px solid rgba(0,150,255,0.3)' }}>
                <div style={{ fontSize: '9px', fontWeight: '600', marginBottom: '6px', color: '#66B3FF' }}>
                  Editing: "{activeShape.name}"
                </div>
                
                {/* Shape Type */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Shape Type</div>
                  <select
                    value={activeShape.type}
                    onChange={(e) => {
                      updateShapeElement(activeShapeId, { type: e.target.value });
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      fontSize: '8px',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#FFF',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="triangle">Triangle</option>
                    <option value="star">Star</option>
                    <option value="heart">Heart</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>

                {/* Shape Size */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Size: {activeShape.size}px</div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={activeShape.size}
                    onChange={(e) => {
                      updateShapeElement(activeShapeId, { size: parseInt(e.target.value) });
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Shape Rotation */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Rotation: {activeShape.rotation}°</div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={activeShape.rotation}
                    onChange={(e) => {
                      updateShapeElement(activeShapeId, { rotation: parseInt(e.target.value) });
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Shape Opacity */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Opacity: {Math.round(activeShape.opacity * 100)}%</div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeShape.opacity}
                    onChange={(e) => {
                      updateShapeElement(activeShapeId, { opacity: parseFloat(e.target.value) });
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Shape Color */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '2px' }}>Color</div>
                  
                  {/* Color Mode Tabs */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    <button
                      onClick={() => {
                        // Update the active shape to use solid color mode
                        updateShapeElement(activeShapeId, { gradient: null });
                        setTimeout(() => {
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '8px',
                        background: !activeShape.gradient ? '#0066CC' : 'rgba(255,255,255,0.1)',
                        color: !activeShape.gradient ? '#FFFFFF' : '#CCC',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🎨 Solid
                    </button>
                    <button
                      onClick={() => {
                        // Update the active shape to use gradient mode
                        updateShapeElement(activeShapeId, { gradient: shapesGradient });
                        setTimeout(() => {
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '8px',
                        background: activeShape.gradient ? '#0066CC' : 'rgba(255,255,255,0.1)',
                        color: activeShape.gradient ? '#FFFFFF' : '#CCC',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🌈 Gradient
                    </button>
                  </div>

                  {/* Solid Color */}
                  {!activeShape.gradient && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={activeShape.color}
                        onChange={(e) => {
                          updateShapeElement(activeShapeId, { color: e.target.value });
                          setTimeout(() => {
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{
                          width: '24px',
                          height: '20px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={activeShape.color}
                        onChange={(e) => {
                          updateShapeElement(activeShapeId, { color: e.target.value });
                          setTimeout(() => {
                            if ((window as any).updateModelTexture) {
                              (window as any).updateModelTexture(true, true);
                            }
                          }, 10);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          fontSize: '8px',
                          background: 'rgba(0,0,0,0.5)',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  )}

                  {/* Gradient Controls */}
                  {activeShape.gradient && (
                    <div>
                      {/* Gradient Type */}
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Type</div>
                        <select
                          value={activeShape.gradient.type}
                          onChange={(e) => {
                            const newGradient = { ...activeShape.gradient, type: e.target.value };
                            updateShapeElement(activeShapeId, { gradient: newGradient });
                            setTimeout(() => {
                              if ((window as any).updateModelTexture) {
                                (window as any).updateModelTexture(true, true);
                              }
                            }, 10);
                          }}
                          style={{ width: '100%', padding: '2px 4px', fontSize: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '2px', color: '#fff' }}
                        >
                          <option value="linear">Linear</option>
                          <option value="radial">Radial</option>
                          <option value="angular">Angular</option>
                          <option value="diamond">Diamond</option>
                        </select>
                      </div>

                      {/* Gradient Angle */}
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Angle</span>
                          <span style={{ color: '#999' }}>{activeShape.gradient.angle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={activeShape.gradient.angle}
                          onChange={(e) => {
                            const newGradient = { ...activeShape.gradient, angle: parseInt(e.target.value) };
                            updateShapeElement(activeShapeId, { gradient: newGradient });
                            setTimeout(() => {
                              if ((window as any).updateModelTexture) {
                                (window as any).updateModelTexture(true, true);
                              }
                            }, 10);
                          }}
                          style={{ width: '100%', accentColor: '#BA55D3' }}
                        />
                      </div>

                      {/* Gradient Preview */}
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '2px' }}>Preview</div>
                        <div
                          style={{
                            width: '100%',
                            height: '20px',
                            background: getGradientCSS(activeShape.gradient),
                            borderRadius: '3px',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        />
                      </div>

                      {/* Color Stops */}
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '7px', color: '#CCC', marginBottom: '4px' }}>Color Stops</div>
                        
                        {activeShape.gradient.stops.map((stop: any, index: number) => (
                          <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <input
                              type="color"
                              value={stop.color}
                              onChange={(e) => {
                                const newStops = [...activeShape.gradient.stops];
                                newStops[index] = { ...stop, color: e.target.value };
                                const newGradient = { ...activeShape.gradient, stops: newStops };
                                updateShapeElement(activeShapeId, { gradient: newGradient });
                                setTimeout(() => {
                                  if ((window as any).updateModelTexture) {
                                    (window as any).updateModelTexture(true, true);
                                  }
                                }, 10);
                              }}
                              style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                            />
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={stop.position}
                              onChange={(e) => {
                                const newStops = [...activeShape.gradient.stops];
                                newStops[index] = { ...stop, position: parseInt(e.target.value) };
                                const newGradient = { ...activeShape.gradient, stops: newStops };
                                updateShapeElement(activeShapeId, { gradient: newGradient });
                                setTimeout(() => {
                                  if ((window as any).updateModelTexture) {
                                    (window as any).updateModelTexture(true, true);
                                  }
                                }, 10);
                              }}
                              style={{ flex: 1, accentColor: '#BA55D3' }}
                            />
                            <span style={{ fontSize: '6px', color: '#999', minWidth: '25px' }}>{stop.position}%</span>
                            {activeShape.gradient.stops.length > 2 && (
                              <button
                                onClick={() => {
                                  const newStops = activeShape.gradient.stops.filter((_: any, i: number) => i !== index);
                                  const newGradient = { ...activeShape.gradient, stops: newStops };
                                  updateShapeElement(activeShapeId, { gradient: newGradient });
                                  setTimeout(() => {
                                    if ((window as any).updateModelTexture) {
                                      (window as any).updateModelTexture(true, true);
                                    }
                                  }, 10);
                                }}
                                style={{ background: 'rgba(255,0,0,0.3)', border: 'none', color: '#fff', borderRadius: '2px', padding: '2px 4px', fontSize: '6px', cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          onClick={() => {
                            const newStop = {
                              id: Date.now().toString(),
                              color: '#ffffff',
                              position: 50
                            };
                            const newGradient = { ...activeShape.gradient, stops: [...activeShape.gradient.stops, newStop] };
                            updateShapeElement(activeShapeId, { gradient: newGradient });
                            setTimeout(() => {
                              if ((window as any).updateModelTexture) {
                                (window as any).updateModelTexture(true, true);
                              }
                            }, 10);
                          }}
                          style={{ width: '100%', padding: '4px', fontSize: '7px', background: 'rgba(0,255,0,0.2)', border: '1px solid rgba(0,255,0,0.3)', borderRadius: '2px', color: '#fff', cursor: 'pointer' }}
                        >
                          + Add Color Stop
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this shape?')) {
                        deleteShapeElement(activeShapeId);
                        setActiveShapeId(null);
                        
                        // Trigger live texture update
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, true);
                          }
                        }, 10);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '9px',
                      background: 'rgba(255, 0, 0, 0.2)',
                      color: '#FF6666',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => {
                      duplicateShapeElement(activeShapeId);
                      
                      // Trigger live texture update
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          (window as any).updateModelTexture(true, true);
                        }
                      }, 10);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '9px',
                      background: 'rgba(0, 255, 0, 0.2)',
                      color: '#66FF66',
                      border: '1px solid rgba(0, 255, 0, 0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📋 Duplicate
                  </button>
                </div>

                {/* Move Tool Button */}
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      // Switch to move tool
                      const { setActiveTool } = useApp.getState();
                      setActiveTool('move');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      background: 'rgba(0, 150, 255, 0.3)',
                      color: '#66B3FF',
                      border: '2px solid rgba(0, 150, 255, 0.5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    ✋ Move Tool
                    <span style={{ fontSize: '8px', opacity: 0.8 }}>
                      (Click on model to move shape)
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Clear All Shapes */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  // Clear all shapes
                  const { clearShapes } = useApp.getState();
                  if (clearShapes) {
                    clearShapes();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '9px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  color: '#FF6666',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🗑️ Clear All Shapes
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '4px',
          background: isResizing ? '#0066CC' : 'rgba(255, 255, 255, 0.1)',
          cursor: 'ns-resize',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'background 0.2s ease'
        }}
      />

      {/* Layers Panel (Bottom) - Always Visible */}
      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '200px'
      }}>
        {/* Selection Status Indicator */}
        {activeTool === 'universalSelect' && (
          <div style={{
            padding: '4px 12px',
            background: 'rgba(102, 126, 234, 0.1)',
            borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
            fontSize: '9px',
            color: '#667eea',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🎯 Universal Select Active</span>
            <span style={{ fontSize: '8px', color: '#999' }}>
              Ctrl+Click: Add to selection | Shift+Click: Remove from selection
            </span>
          </div>
        )}

        {/* Layers Panel Header */}
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '10px',
          color: '#a0aec0',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🎨 Layers</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedElements.length > 0 && (
              <span style={{ fontSize: '8px', color: '#667eea' }}>
                {selectedElements.length} selected
              </span>
            )}
            <span style={{ fontSize: '8px', color: '#666' }}>
              {advancedLayers.length} layer{advancedLayers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Layers Content */}
        <div style={{
          flex: 1,
          padding: '8px',
          overflowY: 'auto'
        }}>
          {/* Layer Search and Filter */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <input
                type="text"
                placeholder="🔍 Search layers..."
                    style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '3px',
                  outline: 'none'
                }}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  console.log('🎨 Searching layers for:', searchTerm);
                  // Note: In a real implementation, this would filter the layers
                }}
              />
              <select
                style={{
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onChange={(e) => {
                  const filterType = e.target.value;
                  console.log('🎨 Filtering layers by type:', filterType);
                  // Note: In a real implementation, this would filter the layers
                }}
              >
                <option value="all">All Types</option>
                <option value="paint">🎨 Paint</option>
                <option value="image">🖼️ Image</option>
                <option value="text">📝 Text</option>
                <option value="group">📁 Group</option>
                <option value="adjustment">🎛️ Adjustment</option>
              </select>
                    </div>
            
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  console.log('🎨 Showing only visible layers');
                  // Note: In a real implementation, this would filter visible layers
                        }}
                        style={{
                  padding: '2px 4px',
                  fontSize: '6px',
                  background: 'rgba(0, 255, 0, 0.2)',
                  color: '#00FF00',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '2px',
                          cursor: 'pointer'
                        }}
              >
                👁️ Visible Only
              </button>
                        <button
                onClick={() => {
                  console.log('🎨 Showing only locked layers');
                  // Note: In a real implementation, this would filter locked layers
                }}
                          style={{
                  padding: '2px 4px',
                            fontSize: '6px',
                  background: 'rgba(255, 165, 0, 0.2)',
                  color: '#FFA500',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                🔒 Locked Only
                        </button>
                        <button
                onClick={() => {
                  console.log('🎨 Showing layers with effects');
                  // Note: In a real implementation, this would filter layers with effects
                }}
                          style={{
                  padding: '2px 4px',
                            fontSize: '6px',
                  background: 'rgba(255, 0, 255, 0.2)',
                  color: '#FF00FF',
                  border: '1px solid rgba(255, 0, 255, 0.3)',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                ✨ With Effects
                        </button>
                      <button
                onClick={() => {
                  console.log('🎨 Showing layers with masks');
                  // Note: In a real implementation, this would filter layers with masks
                        }}
                        style={{
                          padding: '2px 4px',
                  fontSize: '6px',
                  background: 'rgba(0, 150, 255, 0.2)',
                  color: '#66B3FF',
                  border: '1px solid rgba(0, 150, 255, 0.3)',
                  borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                      >
                🎭 With Masks
                      </button>
                    </div>
                  </div>

          {/* Layer List */}
          <div style={{ marginBottom: '8px' }}>
            {advancedLayers.length === 0 ? (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: '#666',
                fontSize: '9px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: '1px dashed rgba(255, 255, 255, 0.2)'
              }}>
                No layers yet. Start drawing to create layers!
              </div>
            ) : (
              <div>
                {/* Render Groups First */}
                {advancedGroups
                  .sort((a, b) => b.order - a.order)
                  .map((group) => (
                    <div key={group.id}>
                      <EnhancedGroupItem
                        group={group}
                        isActive={false} // Groups don't have active state like layers
                        isSelected={false} // Groups don't have selection state like layers
                        layers={new Map(advancedLayers.map(layer => [layer.id, layer]))}
                        onSelect={() => {
                          console.log('🎨 Selected group:', group.name);
                        }}
                        onToggleCollapse={() => {
                          toggleGroupCollapse(group.id);
                          console.log('🎨 Toggled group collapse:', group.name);
                        }}
                        onToggleVisibility={() => {
                          // Note: Groups don't have visibility in the current system
                          console.log('🎨 Toggled group visibility:', group.name);
                        }}
                        onToggleLock={() => {
                          // Note: Groups don't have lock in the current system
                          console.log('🎨 Toggled group lock:', group.name);
                        }}
                        onRename={(newName) => {
                          renameGroup(group.id, newName);
                          console.log('🎨 Renamed group:', group.name, 'to', newName);
                        }}
                        onDelete={() => {
                          deleteGroup(group.id);
                          console.log('🎨 Deleted group:', group.name);
                        }}
                        onDuplicate={() => {
                          // Note: Groups don't have duplicate in the current system
                          console.log('🎨 Duplicated group:', group.name);
                        }}
                        onMoveUp={() => {
                          // Note: Groups don't have move up in the current system
                          console.log('🎨 Moved group up:', group.name);
                        }}
                        onMoveDown={() => {
                          // Note: Groups don't have move down in the current system
                          console.log('🎨 Moved group down:', group.name);
                        }}
                        onSetOpacity={(opacity) => {
                          // Note: Groups don't have opacity in the current system
                          console.log('🎨 Set group opacity:', group.name, opacity);
                        }}
                        onSetBlendMode={(blendMode) => {
                          // Note: Groups don't have blend mode in the current system
                          console.log('🎨 Set group blend mode:', group.name, blendMode);
                        }}
                      />
                      
                      {/* Render Layers in this Group */}
                      {!group.collapsed && (
                        <div style={{ marginLeft: '20px', borderLeft: '1px solid rgba(255, 165, 0, 0.3)' }}>
                          {advancedLayers
                            .filter(layer => layer.groupId === group.id)
                            .sort((a, b) => b.order - a.order)
                            .map((layer) => (
                              <EnhancedLayerItem
                                key={layer.id}
                                layer={layer}
                                isActive={layer.id === advancedActiveLayerId}
                                isSelected={advancedSelectedLayerIds.includes(layer.id)}
                                onSelect={() => {
                                  setActiveLayer(layer.id);
                                  console.log('🎨 Selected layer:', layer.name);
                                }}
                                onToggleVisibility={() => {
                                  setLayerVisibility(layer.id, !layer.visible);
                                }}
                                onToggleLock={() => {
                                  setLayerLocked(layer.id, !layer.locked);
                                }}
                                onRename={(newName) => {
                                  renameLayer(layer.id, newName);
                                  console.log('🎨 Renamed layer:', layer.name, 'to', newName);
                                }}
                                onDelete={() => {
                                  deleteLayer(layer.id);
                                  console.log('🎨 Deleted layer:', layer.name);
                                }}
                                onDuplicate={() => {
                                  duplicateLayer(layer.id);
                                  console.log('🎨 Duplicated layer:', layer.name);
                                }}
                                onMoveUp={() => {
                                  moveLayerUp(layer.id);
                                  console.log('🎨 Moved layer up:', layer.name);
                                }}
                                onMoveDown={() => {
                                  moveLayerDown(layer.id);
                                  console.log('🎨 Moved layer down:', layer.name);
                                }}
                                onSetOpacity={(opacity) => {
                                  setLayerOpacity(layer.id, opacity);
                                  console.log('🎨 Set layer opacity:', layer.name, opacity);
                                }}
                                onSetBlendMode={(blendMode) => {
                                  setLayerBlendMode(layer.id, blendMode);
                                  console.log('🎨 Set layer blend mode:', layer.name, blendMode);
                                }}
                                onReorderLayers={(newOrder) => {
                                  reorderLayers(newOrder);
                                  console.log('🎨 Reordered layers:', newOrder);
                                }}
                                allLayers={advancedLayers}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                
                {/* Render Ungrouped Layers */}
                {advancedLayers
                  .filter(layer => !layer.groupId)
                  .sort((a, b) => b.order - a.order)
                  .map((layer) => (
                    <EnhancedLayerItem
                      key={layer.id}
                      layer={layer}
                      isActive={layer.id === advancedActiveLayerId}
                      isSelected={advancedSelectedLayerIds.includes(layer.id)}
                      onSelect={() => {
                        setActiveLayer(layer.id);
                        console.log('🎨 Selected layer:', layer.name);
                        
                        // PHASE 2: If layer has strokeData, also select the stroke for border highlighting
                        if (layer.content?.strokeData) {
                          console.log('🎯 Layer has strokeData, attempting to select stroke:', layer.id);
                          
                          // Use setTimeout to ensure module is loaded
                          setTimeout(() => {
                            try {
                              const strokeSelectionModule = (window as any).__strokeSelectionModule;
                              console.log('🎯 Stroke selection module:', !!strokeSelectionModule);
                              
                              if (strokeSelectionModule?.useStrokeSelection) {
                                const { selectStroke } = strokeSelectionModule.useStrokeSelection.getState();
                                console.log('🎯 Calling selectStroke for:', layer.id);
                                selectStroke(layer.id);
                                console.log('✅ Stroke selected successfully');
                              } else {
                                console.warn('⚠️ useStrokeSelection not available in module');
                              }
                            } catch (e) {
                              console.warn('⚠️ Could not select stroke:', e);
                            }
                          }, 0);
                        } else {
                          console.log('🎯 Layer does not have strokeData');
                        }
                      }}
                      onToggleVisibility={() => {
                        setLayerVisibility(layer.id, !layer.visible);
                      }}
                      onToggleLock={() => {
                        setLayerLocked(layer.id, !layer.locked);
                      }}
                      onRename={(newName) => {
                        renameLayer(layer.id, newName);
                        console.log('🎨 Renamed layer:', layer.name, 'to', newName);
                      }}
                      onDelete={() => {
                        deleteLayer(layer.id);
                        console.log('🎨 Deleted layer:', layer.name);
                      }}
                      onDuplicate={() => {
                        duplicateLayer(layer.id);
                        console.log('🎨 Duplicated layer:', layer.name);
                      }}
                      onMoveUp={() => {
                        moveLayerUp(layer.id);
                        console.log('🎨 Moved layer up:', layer.name);
                      }}
                      onMoveDown={() => {
                        moveLayerDown(layer.id);
                        console.log('🎨 Moved layer down:', layer.name);
                      }}
                      onSetOpacity={(opacity) => {
                        setLayerOpacity(layer.id, opacity);
                        console.log('🎨 Set layer opacity:', layer.name, opacity);
                      }}
                      onSetBlendMode={(blendMode) => {
                        setLayerBlendMode(layer.id, blendMode);
                        console.log('🎨 Set layer blend mode:', layer.name, blendMode);
                      }}
                      onReorderLayers={(newOrder) => {
                        reorderLayers(newOrder);
                        console.log('🎨 Reordered layers:', newOrder);
                      }}
                      allLayers={advancedLayers}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Layer Actions */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const layerId = createLayer('paint', `Layer ${advancedLayers.length + 1}`);
                setActiveLayer(layerId);
                console.log('🎨 Created new layer:', layerId);
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '8px',
                background: 'rgba(0, 255, 0, 0.2)',
                color: '#00FF00',
                border: '1px solid rgba(0, 255, 0, 0.3)',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Create a new paint layer"
            >
              + New Layer
            </button>
            <button
              onClick={() => {
                const groupId = createGroup(`Group ${advancedGroups.length + 1}`);
                console.log('🎨 Created new group:', groupId);
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '8px',
                background: 'rgba(255, 165, 0, 0.2)',
                color: '#FFA500',
                border: '1px solid rgba(255, 165, 0, 0.3)',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Create a new layer group/folder"
            >
              📁 New Group
            </button>
            <button
              onClick={() => {
                if (advancedActiveLayerId) {
                  duplicateLayer(advancedActiveLayerId);
                  console.log('🎨 Duplicated layer:', advancedActiveLayerId);
                }
              }}
              disabled={!advancedActiveLayerId}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '8px',
                background: advancedActiveLayerId 
                  ? 'rgba(0, 150, 255, 0.2)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: advancedActiveLayerId ? '#66B3FF' : '#666',
                border: `1px solid ${advancedActiveLayerId 
                  ? 'rgba(0, 150, 255, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '3px',
                cursor: advancedActiveLayerId ? 'pointer' : 'not-allowed'
              }}
            >
              📋 Duplicate
            </button>
            <button
              onClick={() => {
                if (advancedActiveLayerId) {
                  deleteLayer(advancedActiveLayerId);
                  console.log('🎨 Deleted layer:', advancedActiveLayerId);
                }
              }}
              disabled={!advancedActiveLayerId}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '8px',
                background: advancedActiveLayerId 
                  ? 'rgba(255, 0, 0, 0.2)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: advancedActiveLayerId ? '#FF6666' : '#666',
                border: `1px solid ${advancedActiveLayerId 
                  ? 'rgba(255, 0, 0, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '3px',
                cursor: advancedActiveLayerId ? 'pointer' : 'not-allowed'
              }}
            >
              🗑️ Delete
            </button>
          </div>

          {/* Bulk Operations */}
          {advancedLayers.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  // Duplicate all selected layers
                  advancedSelectedLayerIds.forEach(layerId => {
                    duplicateLayer(layerId);
                  });
                  console.log('🎨 Duplicated selected layers:', advancedSelectedLayerIds.length);
                }}
                disabled={advancedSelectedLayerIds.length === 0}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: advancedSelectedLayerIds.length > 0 
                    ? 'rgba(0, 150, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: advancedSelectedLayerIds.length > 0 ? '#66B3FF' : '#666',
                  border: `1px solid ${advancedSelectedLayerIds.length > 0 
                    ? 'rgba(0, 150, 255, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '3px',
                  cursor: advancedSelectedLayerIds.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                📋 Duplicate Selected ({advancedSelectedLayerIds.length})
              </button>
              <button
                onClick={() => {
                  // Delete all selected layers
                  advancedSelectedLayerIds.forEach(layerId => {
                    deleteLayer(layerId);
                  });
                  console.log('🎨 Deleted selected layers:', advancedSelectedLayerIds.length);
                }}
                disabled={advancedSelectedLayerIds.length === 0}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 0, 0, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: advancedSelectedLayerIds.length > 0 ? '#FF6666' : '#666',
                  border: `1px solid ${advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 0, 0, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '3px',
                  cursor: advancedSelectedLayerIds.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                🗑️ Delete Selected ({advancedSelectedLayerIds.length})
              </button>
            </div>
          )}

          {/* Group Management */}
          {advancedLayers.length > 0 && advancedGroups.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  // Move selected layers to a new group
                  if (advancedSelectedLayerIds.length > 0) {
                    // Create a new group for the selected layers
                    const groupId = createGroup(`Group ${advancedGroups.length + 1}`);
                    advancedSelectedLayerIds.forEach(layerId => {
                      addToGroup(layerId, groupId);
                    });
                    console.log('🎨 Moved selected layers to new group:', groupId);
                  }
                }}
                disabled={advancedSelectedLayerIds.length === 0}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 165, 0, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: advancedSelectedLayerIds.length > 0 ? '#FFA500' : '#666',
                  border: `1px solid ${advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 165, 0, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '3px',
                  cursor: advancedSelectedLayerIds.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                📁 Move to Group ({advancedSelectedLayerIds.length})
              </button>
              <button
                onClick={() => {
                  // Remove selected layers from groups
                  if (advancedSelectedLayerIds.length > 0) {
                    advancedSelectedLayerIds.forEach(layerId => {
                      removeFromGroup(layerId);
                    });
                    console.log('🎨 Removed selected layers from groups:', advancedSelectedLayerIds.length);
                  }
                }}
                disabled={advancedSelectedLayerIds.length === 0}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 165, 0, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: advancedSelectedLayerIds.length > 0 ? '#FFA500' : '#666',
                  border: `1px solid ${advancedSelectedLayerIds.length > 0 
                    ? 'rgba(255, 165, 0, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '3px',
                  cursor: advancedSelectedLayerIds.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                📤 Remove from Group ({advancedSelectedLayerIds.length})
              </button>
            </div>
          )}

          {/* Layer Merge/Flatten Options */}
          {advancedLayers.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (advancedSelectedLayerIds.length >= 2) {
                    // Merge selected layers
                    console.log('🎨 Merging selected layers:', advancedSelectedLayerIds.length);
                    // Note: In a real implementation, this would merge the selected layers
                  }
                }}
                disabled={advancedSelectedLayerIds.length < 2}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: advancedSelectedLayerIds.length >= 2 
                    ? 'rgba(0, 255, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: advancedSelectedLayerIds.length >= 2 ? '#00FFFF' : '#666',
                  border: `1px solid ${advancedSelectedLayerIds.length >= 2 
                    ? 'rgba(0, 255, 255, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '3px',
                  cursor: advancedSelectedLayerIds.length >= 2 ? 'pointer' : 'not-allowed'
                }}
              >
                🔗 Merge Selected ({advancedSelectedLayerIds.length})
              </button>
              <button
                onClick={() => {
                  // Flatten all layers
                  console.log('🎨 Flattening all layers:', advancedLayers.length);
                  // Note: In a real implementation, this would flatten all layers
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: 'rgba(255, 100, 0, 0.2)',
                  color: '#FF6400',
                  border: '1px solid rgba(255, 100, 0, 0.3)',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                📄 Flatten All ({advancedLayers.length})
              </button>
              <button
                onClick={() => {
                  // Merge visible layers only
                  const visibleLayers = advancedLayers.filter(layer => layer.visible);
                  console.log('🎨 Merging visible layers:', visibleLayers.length);
                  // Note: In a real implementation, this would merge only visible layers
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '7px',
                  background: 'rgba(0, 255, 0, 0.2)',
                  color: '#00FF00',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                👁️ Merge Visible ({advancedLayers.filter(l => l.visible).length})
              </button>
            </div>
          )}

          {/* Layer Properties */}
          {advancedActiveLayerId && (() => {
            const activeLayer = advancedLayers.find(l => l.id === advancedActiveLayerId);
            if (!activeLayer) return null;
            
            return (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: '8px', color: '#CCC', marginBottom: '6px' }}>
                  Layer Properties
                </div>
                
                {/* Opacity */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '2px' }}>
                    Opacity: {Math.round(activeLayer.opacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeLayer.opacity}
                    onChange={(e) => setLayerOpacity(activeLayer.id, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#0066CC' }}
                  />
                </div>

                {/* Enhanced Blend Mode */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🎨</span>
                    <span>Blend Mode</span>
                    <span style={{ fontSize: '6px', color: '#666' }}>({activeLayer.blendMode})</span>
                  </div>
                  <select
                    value={activeLayer.blendMode}
                    onChange={(e) => setLayerBlendMode(activeLayer.id, e.target.value as BlendMode)}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      background: 'rgba(0, 0, 0, 0.8)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '3px',
                      fontSize: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <optgroup label="Normal">
                    <option value="normal">Normal</option>
                    </optgroup>
                    <optgroup label="Darken">
                    <option value="multiply">Multiply</option>
                      <option value="darken">Darken</option>
                      <option value="color-burn">Color Burn</option>
                      <option value="linear-burn">Linear Burn</option>
                    </optgroup>
                    <optgroup label="Lighten">
                    <option value="screen">Screen</option>
                      <option value="lighten">Lighten</option>
                      <option value="color-dodge">Color Dodge</option>
                      <option value="linear-dodge">Linear Dodge</option>
                    </optgroup>
                    <optgroup label="Contrast">
                    <option value="overlay">Overlay</option>
                    <option value="soft-light">Soft Light</option>
                    <option value="hard-light">Hard Light</option>
                      <option value="vivid-light">Vivid Light</option>
                      <option value="linear-light">Linear Light</option>
                      <option value="pin-light">Pin Light</option>
                    </optgroup>
                    <optgroup label="Inversion">
                    <option value="difference">Difference</option>
                    <option value="exclusion">Exclusion</option>
                    </optgroup>
                    <optgroup label="Component">
                      <option value="hue">Hue</option>
                      <option value="saturation">Saturation</option>
                      <option value="color">Color</option>
                      <option value="luminosity">Luminosity</option>
                    </optgroup>
                  </select>
                </div>

                {/* Layer Effects */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✨</span>
                    <span>Layer Effects</span>
                    <span style={{ fontSize: '6px', color: '#666' }}>({activeLayer.effects?.length || 0})</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        addEffect(activeLayer.id, {
                          id: `drop-shadow-${Date.now()}`,
                          type: 'drop-shadow',
                          enabled: true,
                          properties: {
                            offsetX: 2,
                            offsetY: 2,
                            blur: 4,
                            spread: 0,
                            color: 'rgba(0, 0, 0, 0.5)',
                            opacity: 0.5
                          }
                        });
                        console.log('🎨 Added drop shadow effect to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(0, 150, 255, 0.2)',
                        color: '#66B3FF',
                        border: '1px solid rgba(0, 150, 255, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      🌑 Drop Shadow
                    </button>
                    
                    <button
                      onClick={() => {
                        addEffect(activeLayer.id, {
                          id: `outer-glow-${Date.now()}`,
                          type: 'outer-glow',
                          enabled: true,
                          properties: {
                            color: '#00FF00',
                            opacity: 0.8,
                            blur: 8,
                            spread: 2
                          }
                        });
                        console.log('🎨 Added glow effect to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(0, 255, 0, 0.2)',
                        color: '#00FF00',
                        border: '1px solid rgba(0, 255, 0, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      ✨ Glow
                    </button>
                    
                    <button
                      onClick={() => {
                        addEffect(activeLayer.id, {
                          id: `brightness-${Date.now()}`,
                          type: 'brightness',
                          enabled: true,
                          properties: {
                            amount: 0.2,
                            color: '#FF0000'
                          }
                        });
                        console.log('🎨 Added stroke effect to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(255, 0, 0, 0.2)',
                        color: '#FF6666',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      🔲 Stroke
                    </button>
                  </div>
                  
                  {/* Display Active Effects */}
                  {activeLayer.effects && activeLayer.effects.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '6px' }}>
                      {activeLayer.effects.map((effect, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '2px',
                          marginBottom: '2px'
                        }}>
                          <span style={{ color: effect.enabled ? '#00FF00' : '#666' }}>
                            {effect.enabled ? '●' : '○'}
                          </span>
                          <span style={{ color: '#CCC' }}>{effect.type}</span>
                          <button
                            onClick={() => {
                              removeEffect(activeLayer.id, index.toString());
                              console.log('🎨 Removed effect from layer:', activeLayer.name);
                            }}
                            style={{
                              padding: '1px 3px',
                              fontSize: '5px',
                              background: 'rgba(255, 0, 0, 0.2)',
                              color: '#FF6666',
                              border: 'none',
                              borderRadius: '1px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layer Masks */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🎭</span>
                    <span>Layer Masks</span>
                    <span style={{ fontSize: '6px', color: '#666' }}>({activeLayer.mask ? 1 : 0})</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        addMask(activeLayer.id, {
                          id: `mask-${Date.now()}`,
                          canvas: document.createElement('canvas'),
                          enabled: true,
                          inverted: false
                        });
                        console.log('🎨 Added reveal-all mask to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(0, 150, 255, 0.2)',
                        color: '#66B3FF',
                        border: '1px solid rgba(0, 150, 255, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      🎭 Reveal All
                    </button>
                    
                    <button
                      onClick={() => {
                        addMask(activeLayer.id, {
                          id: `mask-${Date.now()}`,
                          canvas: document.createElement('canvas'),
                          enabled: true,
                          inverted: true
                        });
                        console.log('🎨 Added hide-all mask to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(255, 0, 0, 0.2)',
                        color: '#FF6666',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      🚫 Hide All
                    </button>
                    
                    <button
                      onClick={() => {
                        addMask(activeLayer.id, {
                          id: `mask-${Date.now()}`,
                          canvas: document.createElement('canvas'),
                          enabled: true,
                          inverted: false
                        });
                        console.log('🎨 Added gradient mask to layer:', activeLayer.name);
                      }}
                      style={{
                        padding: '3px 6px',
                        fontSize: '6px',
                        background: 'rgba(255, 165, 0, 0.2)',
                        color: '#FFA500',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      🌈 Gradient
                    </button>
                  </div>
                  
                  {/* Display Active Mask */}
                  {activeLayer.mask && (
                    <div style={{ marginTop: '4px', fontSize: '6px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '2px 4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '2px',
                        marginBottom: '2px'
                      }}>
                        <button
                          onClick={() => {
                            toggleMaskEnabled(activeLayer.id);
                            console.log('🎨 Toggled mask enabled:', activeLayer.id);
                          }}
                          style={{
                            padding: '1px 2px',
                            fontSize: '5px',
                            background: 'transparent',
                            border: 'none',
                            color: activeLayer.mask!.enabled ? '#00FF00' : '#666',
                            cursor: 'pointer'
                          }}
                        >
                          {activeLayer.mask!.enabled ? '●' : '○'}
                        </button>
                        
                        <button
                          onClick={() => {
                            toggleMaskInverted(activeLayer.id);
                            console.log('🎨 Toggled mask inverted:', activeLayer.id);
                          }}
                          style={{
                            padding: '1px 2px',
                            fontSize: '5px',
                            background: 'transparent',
                            border: 'none',
                            color: activeLayer.mask!.inverted ? '#FFA500' : '#CCC',
                            cursor: 'pointer'
                          }}
                        >
                          {activeLayer.mask!.inverted ? '🔄' : '↩️'}
                        </button>
                        
                        <span style={{ color: '#CCC', flex: 1 }}>Layer Mask</span>
                        
                        <button
                          onClick={() => {
                            removeMask(activeLayer.id);
                            console.log('🎨 Removed mask from layer:', activeLayer.name);
                          }}
                          style={{
                            padding: '1px 3px',
                            fontSize: '5px',
                            background: 'rgba(255, 0, 0, 0.2)',
                            color: '#FF6666',
                            border: 'none',
                            borderRadius: '1px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Layer Order Controls */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📚</span>
                    <span>Layer Order</span>
                  </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                      onClick={() => {
                        // Move layer up in stack = higher priority = lower order number
                        moveLayerUp(activeLayer.id);
                        console.log('🎨 Moved layer up in stack:', activeLayer.name);
                      }}
                    style={{
                      flex: 1,
                      padding: '3px',
                      fontSize: '7px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                      title="Move layer up in stack (higher priority)"
                  >
                      ↑ Move Up
                  </button>
                  <button
                      onClick={() => {
                        // Move layer down in stack = lower priority = higher order number
                        moveLayerDown(activeLayer.id);
                        console.log('🎨 Moved layer down in stack:', activeLayer.name);
                      }}
                    style={{
                      flex: 1,
                      padding: '3px',
                      fontSize: '7px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#CCC',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                      title="Move layer down in stack (lower priority)"
                  >
                      ↓ Move Down
                  </button>
                  </div>
                </div>

                {/* Layer Info */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '7px', color: '#999', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>ℹ️</span>
                    <span>Layer Info</span>
                  </div>
                  <div style={{ fontSize: '6px', color: '#CCC', lineHeight: '1.2' }}>
                    <div>Type: {activeLayer.type}</div>
                    <div>Size: Auto × Auto</div>
                    <div>Created: {new Date(activeLayer.createdAt).toLocaleDateString()}</div>
                    <div>Modified: {new Date(activeLayer.updatedAt).toLocaleDateString()}</div>
                    {activeLayer.groupId && <div>Group: {activeLayer.groupId}</div>}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}


