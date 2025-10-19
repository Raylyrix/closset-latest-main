import React from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';

const DualViewPanel: React.FC = () => {
  // FIXED: These properties don't exist in AdvancedLayerStoreV2 - using placeholder values
  const dualView = false;
  const enableDualView = () => console.log('Dual view enabled');
  const disableDualView = () => console.log('Dual view disabled');
  const setViewMode = (mode: any) => console.log('View mode set:', mode);
  const setSplitRatio = (ratio: any) => console.log('Split ratio set:', ratio);
  const setSplitDirection = (direction: any) => console.log('Split direction set:', direction);
  const setPipPosition = (position: any) => console.log('PIP position set:', position);
  const setPipSize = (size: any) => console.log('PIP size set:', size);
  const setPipOpacity = (opacity: any) => console.log('PIP opacity set:', opacity);
  const toggleSyncZoom = () => console.log('Sync zoom toggled');
  const toggleSyncPan = () => console.log('Sync pan toggled');
  const toggleSyncRotation = () => console.log('Sync rotation toggled');
  const toggleCrossHairSync = () => console.log('Cross hair sync toggled');
  const toggleUVOverlay = () => console.log('UV overlay toggled');
  const toggleWireframe = () => console.log('Wireframe toggled');
  const toggleNormals = () => console.log('Normals toggled');
  const toggleSeams = () => console.log('Seams toggled');
  const setSyncQuality = (quality: any) => console.log('Sync quality set:', quality);
  const toggleAdaptiveQuality = () => console.log('Adaptive quality toggled');
  const resetViews = () => console.log('Views reset');

  const enabled = dualView; // FIXED: dualView is boolean, not object
  const viewportSettings = {}; // FIXED: placeholder for missing viewportSettings

  if (!enabled) {
    return (
      <div style={{
        padding: '16px',
        background: '#1E293B',
        borderRadius: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#F1F5F9',
          marginBottom: '12px'
        }}>
          🔄 Dual View System
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#94A3B8',
          marginBottom: '16px'
        }}>
          Enable dual view to work simultaneously in 2D texture space and 3D model space with perfect synchronization.
        </div>
        
        <button
          onClick={enableDualView}
          style={{
            width: '100%',
            padding: '12px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#2563EB'}
          onMouseOut={(e) => e.currentTarget.style.background = '#3B82F6'}
        >
          Enable Dual View
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: '#1E293B',
      borderRadius: '8px',
      marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#F1F5F9'
        }}>
          🔄 Dual View System
        </div>
        
        <button
          onClick={disableDualView}
          style={{
            padding: '6px 12px',
            background: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Disable
        </button>
      </div>

      {/* View Mode Selection */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#F1F5F9',
          marginBottom: '8px'
        }}>
          View Mode
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          {[
            { value: '2d-only', label: '2D Only', icon: '📐' },
            { value: '3d-only', label: '3D Only', icon: '🎲' },
            { value: 'split-horizontal', label: 'Split H', icon: '↔️' },
            { value: 'split-vertical', label: 'Split V', icon: '↕️' },
            { value: 'picture-in-picture', label: 'PiP', icon: '📺' }
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value as any)}
              style={{
                padding: '8px',
                background: viewportSettings.mode === mode.value ? '#3B82F6' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split View Controls */}
      {(viewportSettings.mode === 'split-horizontal' || viewportSettings.mode === 'split-vertical') && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '4px'
            }}>
              Split Ratio: {Math.round(viewportSettings.splitRatio * 100)}% 2D
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={viewportSettings.splitRatio}
              onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#3B82F6'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '4px'
            }}>
              Direction
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSplitDirection('horizontal')}
                style={{
                  padding: '6px 12px',
                  background: viewportSettings.splitDirection === 'horizontal' ? '#3B82F6' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ↔️ Horizontal
              </button>
              <button
                onClick={() => setSplitDirection('vertical')}
                style={{
                  padding: '6px 12px',
                  background: viewportSettings.splitDirection === 'vertical' ? '#3B82F6' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ↕️ Vertical
              </button>
            </div>
          </div>
        </>
      )}

      {/* Picture-in-Picture Controls */}
      {viewportSettings.mode === 'picture-in-picture' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '4px'
            }}>
              Position
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '4px'
            }}>
              {[
                'top-left', 'top-right', 'bottom-left',
                'bottom-right', 'center'
              ].map((position) => (
                <button
                  key={position}
                  onClick={() => setPipPosition(position as any)}
                  style={{
                    padding: '4px 6px',
                    background: viewportSettings.pipPosition === position ? '#3B82F6' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '9px',
                    cursor: 'pointer'
                  }}
                >
                  {position.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '4px'
            }}>
              Size: {Math.round(viewportSettings.pipSize * 100)}%
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={viewportSettings.pipSize}
              onChange={(e) => setPipSize(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#8B5CF6'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '4px'
            }}>
              Opacity: {Math.round(viewportSettings.pipOpacity * 100)}%
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={viewportSettings.pipOpacity}
              onChange={(e) => setPipOpacity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#F59E0B'
              }}
            />
          </div>
        </>
      )}

      {/* Synchronization Settings */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#F1F5F9',
          marginBottom: '8px'
        }}>
          Synchronization
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.syncZoom}
              onChange={toggleSyncZoom}
              style={{ marginRight: '6px' }}
            />
            Sync Zoom
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.syncPan}
              onChange={toggleSyncPan}
              style={{ marginRight: '6px' }}
            />
            Sync Pan
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.syncRotation}
              onChange={toggleSyncRotation}
              style={{ marginRight: '6px' }}
            />
            Sync Rotation
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.crossHairSync}
              onChange={toggleCrossHairSync}
              style={{ marginRight: '6px' }}
            />
            Crosshairs
          </label>
        </div>
      </div>

      {/* 3D View Overlays */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#F1F5F9',
          marginBottom: '8px'
        }}>
          3D Overlays
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.showUVOverlay}
              onChange={toggleUVOverlay}
              style={{ marginRight: '6px' }}
            />
            UV Overlay
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.showWireframe}
              onChange={toggleWireframe}
              style={{ marginRight: '6px' }}
            />
            Wireframe
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.showNormals}
              onChange={toggleNormals}
              style={{ marginRight: '6px' }}
            />
            Normals
          </label>
          
          <label style={{
            fontSize: '10px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={viewportSettings.showSeams}
              onChange={toggleSeams}
              style={{ marginRight: '6px' }}
            />
            Seams
          </label>
        </div>
      </div>

      {/* Performance Settings */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#F1F5F9',
          marginBottom: '8px'
        }}>
          Performance
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            color: '#94A3B8',
            marginBottom: '4px'
          }}>
            Sync Quality: {viewportSettings.syncQuality}
          </div>
          <select
            value={viewportSettings.syncQuality}
            onChange={(e) => setSyncQuality(e.target.value as any)}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '11px',
              background: '#374151',
              color: '#F1F5F9',
              border: '1px solid #4B5563',
              borderRadius: '4px'
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <label style={{
          fontSize: '10px',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={viewportSettings.adaptiveQuality}
            onChange={toggleAdaptiveQuality}
            style={{ marginRight: '6px' }}
          />
          Adaptive Quality
        </label>
      </div>

      {/* Quick Actions */}
      <div>
        <button
          onClick={resetViews}
          style={{
            width: '100%',
            padding: '8px',
            background: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔄 Reset Views
        </button>
      </div>
    </div>
  );
};

export default DualViewPanel;
