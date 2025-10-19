/**
 * 🎨 TEXTURE LAYER MANAGER
 * 
 * A comprehensive texture layer system for Three.js models:
 * - Multiple texture maps (diffuse, normal, displacement, roughness, etc.)
 * - Layer blending and compositing
 * - Real-time texture updates
 * - Layer effects and filters
 * - Performance optimization
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useApp } from '../App';
import { useTextureLayerBridge } from '../core/TextureLayerBridge';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TextureLayer {
  id: string;
  name: string;
  type: 'diffuse' | 'normal' | 'displacement' | 'roughness' | 'metalness' | 'ao' | 'emissive';
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  visible: boolean;
  opacity: number;
  blendMode: THREE.BlendingEquation; // FIXED: BlendEquation doesn't exist, use BlendingEquation
  order: number;
  needsUpdate: boolean;
}

export interface LayerGroup {
  id: string;
  name: string;
  layers: string[];
  visible: boolean;
  opacity: number;
  collapsed: boolean;
}

interface TextureLayerManagerProps {
  modelScene: THREE.Group;
  width?: number;
  height?: number;
}

// ============================================================================
// TEXTURE LAYER MANAGER COMPONENT
// ============================================================================

export function TextureLayerManager({ 
  modelScene, 
  width = 300, 
  height = 600 
}: TextureLayerManagerProps) {
  console.log('🎨 TextureLayerManager: Component rendered');
  const { composedCanvas } = useApp();
  const textureBridge = useTextureLayerBridge();
  
  const [layers, setLayers] = useState<Map<string, TextureLayer>>(new Map());
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Map<string, LayerGroup>>(new Map());
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  // Initialize layers from bridge
  useEffect(() => {
    console.log('🎨 TextureLayerManager: Initializing layers from bridge');
    const bridgeLayers = textureBridge.getAllLayers();
    const bridgeOrder = textureBridge.getLayerOrder();
    
    console.log('🎨 TextureLayerManager: Bridge layers:', bridgeLayers?.size, 'Bridge order:', bridgeOrder?.length);
    
    if (bridgeLayers && bridgeOrder) {
      setLayers(bridgeLayers);
      setLayerOrder(bridgeOrder);
      setActiveLayerId(bridgeOrder[0] || null);
      console.log('🎨 TextureLayerManager: Layers initialized from bridge');
    } else {
      console.log('🎨 TextureLayerManager: No bridge layers found');
    }
  }, [textureBridge]);

  // Create default texture layers
  const createDefaultLayers = useCallback((baseCanvas: HTMLCanvasElement): TextureLayer[] => {
    const layers: TextureLayer[] = [];
    
    // Base/Diffuse Layer
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = baseCanvas.width;
    diffuseCanvas.height = baseCanvas.height;
    const diffuseCtx = diffuseCanvas.getContext('2d')!;
    diffuseCtx.drawImage(baseCanvas, 0, 0);
    
    layers.push({
      id: 'base-diffuse',
      name: 'Base Texture',
      type: 'diffuse',
      canvas: diffuseCanvas,
      texture: new THREE.CanvasTexture(diffuseCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 0,
      needsUpdate: true
    });

    // Normal Map Layer
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = baseCanvas.width;
    normalCanvas.height = baseCanvas.height;
    const normalCtx = normalCanvas.getContext('2d')!;
    normalCtx.fillStyle = '#8080ff'; // Neutral normal (pointing up)
    normalCtx.fillRect(0, 0, normalCanvas.width, normalCanvas.height);
    
    layers.push({
      id: 'normal-map',
      name: 'Normal Map',
      type: 'normal',
      canvas: normalCanvas,
      texture: new THREE.CanvasTexture(normalCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 1,
      needsUpdate: true
    });

    // Displacement Map Layer
    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = baseCanvas.width;
    displacementCanvas.height = baseCanvas.height;
    const displacementCtx = displacementCanvas.getContext('2d')!;
    displacementCtx.fillStyle = '#000000'; // CRITICAL FIX: Black (0) for no displacement
    displacementCtx.fillRect(0, 0, displacementCanvas.width, displacementCanvas.height);
    
    layers.push({
      id: 'displacement-map',
      name: 'Displacement Map',
      type: 'displacement',
      canvas: displacementCanvas,
      texture: new THREE.CanvasTexture(displacementCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 2,
      needsUpdate: true
    });

    // Roughness Map Layer
    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = baseCanvas.width;
    roughnessCanvas.height = baseCanvas.height;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;
    roughnessCtx.fillStyle = '#808080'; // Medium roughness
    roughnessCtx.fillRect(0, 0, roughnessCanvas.width, roughnessCanvas.height);
    
    layers.push({
      id: 'roughness-map',
      name: 'Roughness Map',
      type: 'roughness',
      canvas: roughnessCanvas,
      texture: new THREE.CanvasTexture(roughnessCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 3,
      needsUpdate: true
    });

    return layers;
  }, []);

  // Create a new layer
  const createLayer = useCallback((type: TextureLayer['type'], name?: string) => {
    const newLayer = textureBridge.createLayer(type, name);
    if (newLayer) {
      // Refresh local state
      const bridgeLayers = textureBridge.getAllLayers();
      const bridgeOrder = textureBridge.getLayerOrder();
      
      if (bridgeLayers && bridgeOrder) {
        setLayers(bridgeLayers);
        setLayerOrder(bridgeOrder);
        setActiveLayerId(newLayer.id);
      }
    }
  }, [textureBridge]);

  // Delete a layer
  const deleteLayer = useCallback((layerId: string) => {
    textureBridge.deleteLayer(layerId);
    
    // Refresh local state
    const bridgeLayers = textureBridge.getAllLayers();
    const bridgeOrder = textureBridge.getLayerOrder();
    
    if (bridgeLayers && bridgeOrder) {
      setLayers(bridgeLayers);
      setLayerOrder(bridgeOrder);
      
      if (activeLayerId === layerId) {
        setActiveLayerId(bridgeOrder[0] || null);
      }
    }
  }, [textureBridge, activeLayerId]);

  // Duplicate a layer
  const duplicateLayer = useCallback((layerId: string) => {
    const layer = layers.get(layerId);
    if (!layer) return;

    const newLayer = textureBridge.createLayer(layer.type, `${layer.name} Copy`);
    if (newLayer) {
      // Copy canvas content
      const ctx = newLayer.canvas.getContext('2d')!;
      ctx.drawImage(layer.canvas, 0, 0);
      
      // Refresh local state
      const bridgeLayers = textureBridge.getAllLayers();
      const bridgeOrder = textureBridge.getLayerOrder();
      
      if (bridgeLayers && bridgeOrder) {
        setLayers(bridgeLayers);
        setLayerOrder(bridgeOrder);
        setActiveLayerId(newLayer.id);
      }
    }
  }, [layers, textureBridge]);

  // Update layer properties
  const updateLayer = useCallback((layerId: string, updates: Partial<TextureLayer>) => {
    console.log('🔄 Updating layer:', layerId, 'with updates:', updates);
    textureBridge.updateLayer(layerId, updates);
    
    // Refresh local state
    const bridgeLayers = textureBridge.getAllLayers();
    if (bridgeLayers) {
      console.log('🔄 Refreshing local state with bridge layers:', bridgeLayers.size);
      setLayers(bridgeLayers);
    }
  }, [textureBridge]);

  // Apply all layers to the model
  const applyLayersToModel = useCallback(() => {
    textureBridge.applyLayersToModel();
  }, [textureBridge]);

  // Apply layers when they change
  useEffect(() => {
    applyLayersToModel();
  }, [applyLayersToModel]);

  // Layer Item Component
  const LayerItem = ({ layerId }: { layerId: string }) => {
    const layer = layers.get(layerId);
    if (!layer) return null;

    const handleVisibilityToggle = () => {
      console.log('👁️ Toggling visibility for layer:', layerId, 'Current visible:', layer.visible);
      updateLayer(layerId, { visible: !layer.visible });
      console.log('👁️ Visibility toggled, new visible:', !layer.visible);
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateLayer(layerId, { opacity: parseFloat(e.target.value) });
    };

    const handleRename = (e: React.FocusEvent<HTMLInputElement>) => {
      const newName = e.target.value.trim();
      if (newName && newName !== layer.name) {
        updateLayer(layerId, { name: newName });
      }
    };

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px',
          backgroundColor: activeLayerId === layerId ? '#4a90e2' : 'transparent',
          border: '1px solid #404040',
          borderRadius: '4px',
          marginBottom: '4px',
          cursor: 'pointer'
        }}
        onClick={() => setActiveLayerId(layerId)}
      >
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
            fontSize: '12px',
            marginRight: '8px'
          }}
        >
          {layer.visible ? '👁️' : '👁️‍🗨️'}
        </button>

        {/* Layer Thumbnail */}
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#333333',
            border: '1px solid #555555',
            borderRadius: '4px',
            marginRight: '8px',
            backgroundImage: `url(${layer.canvas.toDataURL()})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Layer Name */}
        <input
          type="text"
          defaultValue={layer.name}
          onBlur={handleRename}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '11px',
            flex: 1,
            outline: 'none'
          }}
        />

        {/* Opacity Slider */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
          <span style={{ fontSize: '9px', color: '#888888', marginRight: '4px' }}>
            Opacity:
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layer.opacity}
            onChange={handleOpacityChange}
            style={{
              width: '60px',
              height: '4px',
              background: '#333333',
              outline: 'none',
              borderRadius: '2px'
            }}
          />
        </div>

        {/* Layer Type Badge */}
        <div
          style={{
            fontSize: '8px',
            color: '#888888',
            backgroundColor: '#333333',
            padding: '2px 4px',
            borderRadius: '2px',
            marginLeft: '4px'
          }}
        >
          {layer.type}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: width,
        height: height,
        backgroundColor: '#2a2a2a',
        border: '1px solid #404040',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #404040',
          backgroundColor: '#333333',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '8px'
        }}>
          🎨 Texture Layers
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <button
            onClick={() => createLayer('diffuse')}
            style={{
              background: '#4a90e2',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            + Diffuse
          </button>
          <button
            onClick={() => createLayer('normal')}
            style={{
              background: '#4a90e2',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            + Normal
          </button>
          <button
            onClick={() => createLayer('displacement')}
            style={{
              background: '#4a90e2',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            + Displacement
          </button>
        </div>
      </div>

      {/* Layer List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}
      >
        {layerOrder.map(layerId => (
          <LayerItem key={layerId} layerId={layerId} />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #404040',
          backgroundColor: '#333333',
          borderRadius: '0 0 8px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => {
              if (activeLayerId) {
                duplicateLayer(activeLayerId);
              }
            }}
            style={{
              background: 'none',
              border: '1px solid #666666',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            Duplicate
          </button>
          <button
            onClick={() => {
              if (activeLayerId) {
                deleteLayer(activeLayerId);
              }
            }}
            style={{
              background: 'none',
              border: '1px solid #666666',
              color: '#ff4444',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            Delete
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#888888' }}>
          {layers.size} {layers.size === 1 ? 'layer' : 'layers'}
        </div>
      </div>
    </div>
  );
}

export default TextureLayerManager;
