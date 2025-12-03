import React from 'react';
import { AdvancedLayer } from '../core/AdvancedLayerSystemV2';

interface ClipMaskPanelProps {
  activeLayer: AdvancedLayer;
  advancedLayers: AdvancedLayer[];
  createClipMaskToLayerBelow: (layerId: string) => void;
  removeClipMaskRelationship: (layerId: string) => void;
  toggleClipMaskEnabled: (layerId: string) => void;
  toggleClipMaskInverted: (layerId: string) => void;
  removeClipMask: (layerId: string) => void;
  updateClipMask: (layerId: string, clipMaskData: any) => void;
}

export function ClipMaskPanel({
  activeLayer,
  advancedLayers,
  createClipMaskToLayerBelow,
  removeClipMaskRelationship,
  toggleClipMaskEnabled,
  toggleClipMaskInverted,
  removeClipMask,
  updateClipMask
}: ClipMaskPanelProps) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ fontSize: '7px', color: '#999', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>✂️</span>
        <span>Clip Masks</span>
        <span style={{ fontSize: '6px', color: '#666' }}>
          ({(() => {
            if (activeLayer.clippedByLayerId) return 'Clipped';
            if (activeLayer.clipMask && activeLayer.clipMask.clipsLayerIds) {
              return activeLayer.clipMask.clipsLayerIds.length;
            }
            return 0;
          })()})
        </span>
      </div>
      
      {!activeLayer.clippedByLayerId ? (
        <div>
          <button
            onClick={() => {
              createClipMaskToLayerBelow(activeLayer.id);
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '7px',
              background: 'rgba(0, 123, 255, 0.3)',
              color: '#fff',
              border: '1px solid rgba(0, 123, 255, 0.5)',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✂️ Create Clip Mask
          </button>
          <div style={{ fontSize: '5px', color: '#888', marginTop: '4px', textAlign: 'center' }}>
            Clips this layer to the layer below
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '2px',
          fontSize: '6px'
        }}>
          {/* Status and Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#CCC', fontSize: '6px' }}>
              ✂️ Clipped
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => removeClipMaskRelationship(activeLayer.id)}
                style={{
                  padding: '2px 4px',
                  fontSize: '6px',
                  background: 'rgba(220, 53, 69, 0.3)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <div style={{ fontSize: '5px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
            Clipped by: {(() => {
              const clippingLayer = advancedLayers.find(l => l.id === activeLayer.clippedByLayerId);
              return clippingLayer ? clippingLayer.name : 'Unknown';
            })()}
          </div>
        </div>
      )}
      
      {/* Show clip mask controls if this layer has a clipMask (it clips other layers) */}
      {activeLayer.clipMask && activeLayer.clipMask.type !== 'layer' && (
        <div style={{ 
          padding: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '2px',
          fontSize: '6px',
          marginTop: '4px'
        }}>
          {/* Status and Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#CCC', fontSize: '6px' }}>
              {activeLayer.clipMask.enabled ? '✅' : '❌'} {activeLayer.clipMask.type}
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleClipMaskEnabled(activeLayer.id)}
                style={{
                  padding: '2px 4px',
                  fontSize: '6px',
                  background: activeLayer.clipMask.enabled ? 'rgba(40, 167, 69, 0.3)' : 'rgba(108, 117, 125, 0.3)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                {activeLayer.clipMask.enabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => toggleClipMaskInverted(activeLayer.id)}
                style={{
                  padding: '2px 4px',
                  fontSize: '6px',
                  background: activeLayer.clipMask.inverted ? 'rgba(255, 193, 7, 0.3)' : 'rgba(108, 117, 125, 0.3)',
                  color: activeLayer.clipMask.inverted ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                {activeLayer.clipMask.inverted ? 'INV' : 'NORM'}
              </button>
              <button
                onClick={() => removeClipMask(activeLayer.id)}
                style={{
                  padding: '2px 4px',
                  fontSize: '6px',
                  background: 'rgba(220, 53, 69, 0.3)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Transform Controls */}
          {activeLayer.clipMask.transform && (
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '5px', color: '#999', marginBottom: '3px' }}>Transform</div>
              
              {/* Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginBottom: '2px' }}>
                <div>
                  <div style={{ fontSize: '5px', color: '#888', marginBottom: '1px' }}>X:</div>
                  <input
                    type="number"
                    value={Math.round(activeLayer.clipMask.transform.x || 0)}
                    onChange={(e) => {
                      const newX = parseFloat(e.target.value) || 0;
                      updateClipMask(activeLayer.id, {
                        transform: {
                          ...activeLayer.clipMask.transform,
                          x: newX
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '2px',
                      fontSize: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '5px', color: '#888', marginBottom: '1px' }}>Y:</div>
                  <input
                    type="number"
                    value={Math.round(activeLayer.clipMask.transform.y || 0)}
                    onChange={(e) => {
                      const newY = parseFloat(e.target.value) || 0;
                      updateClipMask(activeLayer.id, {
                        transform: {
                          ...activeLayer.clipMask.transform,
                          y: newY
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '2px',
                      fontSize: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
              </div>
              
              {/* Scale */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginBottom: '2px' }}>
                <div>
                  <div style={{ fontSize: '5px', color: '#888', marginBottom: '1px' }}>Scale X:</div>
                  <input
                    type="number"
                    step="0.1"
                    value={activeLayer.clipMask.transform.scaleX || 1}
                    onChange={(e) => {
                      const newScaleX = parseFloat(e.target.value) || 1;
                      updateClipMask(activeLayer.id, {
                        transform: {
                          ...activeLayer.clipMask.transform,
                          scaleX: newScaleX
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '2px',
                      fontSize: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '5px', color: '#888', marginBottom: '1px' }}>Scale Y:</div>
                  <input
                    type="number"
                    step="0.1"
                    value={activeLayer.clipMask.transform.scaleY || 1}
                    onChange={(e) => {
                      const newScaleY = parseFloat(e.target.value) || 1;
                      updateClipMask(activeLayer.id, {
                        transform: {
                          ...activeLayer.clipMask.transform,
                          scaleY: newScaleY
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '2px',
                      fontSize: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
              </div>
              
              {/* Rotation */}
              <div>
                <div style={{ fontSize: '5px', color: '#888', marginBottom: '1px' }}>Rotation:</div>
                <input
                  type="number"
                  value={Math.round((activeLayer.clipMask.transform.rotation || 0) * (180 / Math.PI))}
                  onChange={(e) => {
                    const degrees = parseFloat(e.target.value) || 0;
                    const radians = degrees * (Math.PI / 180);
                    updateClipMask(activeLayer.id, {
                      transform: {
                        ...activeLayer.clipMask.transform,
                        rotation: radians
                      }
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '2px',
                    fontSize: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



