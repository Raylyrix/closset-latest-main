/**
 * 🎈 Puff Tool Settings Panel
 * 
 * UI component for configuring puff tool settings
 */

import React from 'react';
import { useApp } from '../../App';
import { BlendMode } from '../../core/AdvancedLayerSystemV2';
import { PUFF_MATERIALS } from '../../utils/puff/puffMaterials';

export const PuffSettings: React.FC = () => {
  const {
    puffMode,
    puffHeight,
    puffSoftness,
    puffBrushSize,
    puffColor,
    puffOpacity,
    puffTextureType,
    puffBlendMode,
    puffMaterialApplyMode,
    setPuffMode,
    setPuffHeight,
    setPuffSoftness,
    setPuffBrushSize,
    setPuffColor,
    setPuffOpacity,
    setPuffTextureType,
    setPuffBlendMode,
    setPuffMaterialApplyMode
  } = useApp();
  
  return (
    <div className="puff-settings" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Mode Toggle */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>
          Drawing Mode
        </div>
        <div className="mode-toggle" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPuffMode('continuous')}
            className={puffMode === 'continuous' ? 'active' : ''}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px',
              background: puffMode === 'continuous' ? '#0066CC' : 'rgba(255,255,255,0.1)',
              color: puffMode === 'continuous' ? '#FFFFFF' : '#CCC',
              cursor: 'pointer',
              fontSize: '9px',
              fontWeight: '600'
            }}
          >
            🖌️ Continuous
          </button>
          <button
            onClick={() => setPuffMode('discrete')}
            className={puffMode === 'discrete' ? 'active' : ''}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px',
              background: puffMode === 'discrete' ? '#0066CC' : 'rgba(255,255,255,0.1)',
              color: puffMode === 'discrete' ? '#FFFFFF' : '#CCC',
              cursor: 'pointer',
              fontSize: '9px',
              fontWeight: '600'
            }}
          >
            🔘 Discrete
          </button>
        </div>
      </div>
      
      {/* Height */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Height</span>
          <span style={{ fontSize: '8px', color: '#999' }}>{puffHeight.toFixed(1)}mm</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.1"
          value={puffHeight}
          onChange={(e) => setPuffHeight(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#0066CC' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#999', marginTop: '4px' }}>
          <span>0.2mm</span>
          <span>1.0mm</span>
        </div>
      </div>
      
      {/* Softness */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Softness</span>
          <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(puffSoftness * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={puffSoftness}
          onChange={(e) => setPuffSoftness(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#0066CC' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#999', marginTop: '4px' }}>
          <span>Hard</span>
          <span>Soft</span>
        </div>
      </div>
      
      {/* Brush Size */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Size</span>
          <span style={{ fontSize: '8px', color: '#999' }}>{puffBrushSize}px</span>
        </div>
        <input
          type="range"
          min="5"
          max="200"
          step="1"
          value={puffBrushSize}
          onChange={(e) => setPuffBrushSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#0066CC' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#999', marginTop: '4px' }}>
          <span>5px</span>
          <span>200px</span>
        </div>
      </div>
      
      {/* Color */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>
          Color
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={puffColor}
            onChange={(e) => setPuffColor(e.target.value)}
            style={{ width: '40px', height: '24px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '3px' }}
          />
          <input
            type="text"
            value={puffColor}
            onChange={(e) => setPuffColor(e.target.value)}
            style={{ flex: 1, padding: '4px 6px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '3px', fontSize: '8px', color: '#fff', fontFamily: 'monospace' }}
            placeholder="#ff69b4"
          />
        </div>
      </div>
      
      {/* Opacity */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Opacity</span>
          <span style={{ fontSize: '8px', color: '#999' }}>{Math.round(puffOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={puffOpacity}
          onChange={(e) => setPuffOpacity(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#0066CC' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#999', marginTop: '4px' }}>
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
      
      {/* Blend Mode */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>
          Blend Mode
        </div>
        <select
          value={puffBlendMode}
          onChange={(e) => setPuffBlendMode(e.target.value as BlendMode)}
          style={{ width: '100%', padding: '4px 6px', background: '#000000', color: '#CCC', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '2px', fontSize: '9px', cursor: 'pointer' }}
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
        </select>
      </div>
      
      {/* Texture Type */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '4px' }}>
          Texture
        </div>
        <select
          value={puffTextureType}
          onChange={(e) => setPuffTextureType(e.target.value as 'smooth' | 'littleTextured' | 'textured')}
          style={{ width: '100%', padding: '4px 6px', background: '#000000', color: '#CCC', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '2px', fontSize: '9px', cursor: 'pointer' }}
        >
          {Object.keys(PUFF_MATERIALS).map(key => (
            <option key={key} value={key}>
              {PUFF_MATERIALS[key].name}
            </option>
          ))}
        </select>
        <div style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>
          {PUFF_MATERIALS[puffTextureType]?.description || ''}
        </div>
      </div>
      
      {/* Material Application Mode */}
      <div className="setting-group" style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#CCC', marginBottom: '6px' }}>
          Material Application
        </div>
        <div className="toggle-group" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPuffMaterialApplyMode('all')}
            className={puffMaterialApplyMode === 'all' ? 'active' : ''}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px',
              background: puffMaterialApplyMode === 'all' ? '#0066CC' : 'rgba(255,255,255,0.1)',
              color: puffMaterialApplyMode === 'all' ? '#FFFFFF' : '#CCC',
              cursor: 'pointer',
              fontSize: '9px',
              fontWeight: '600'
            }}
          >
            Apply to All
          </button>
          <button
            onClick={() => setPuffMaterialApplyMode('current')}
            className={puffMaterialApplyMode === 'current' ? 'active' : ''}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px',
              background: puffMaterialApplyMode === 'current' ? '#0066CC' : 'rgba(255,255,255,0.1)',
              color: puffMaterialApplyMode === 'current' ? '#FFFFFF' : '#CCC',
              cursor: 'pointer',
              fontSize: '9px',
              fontWeight: '600'
            }}
          >
            Apply to Stroke
          </button>
        </div>
        <div style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>
          {puffMaterialApplyMode === 'all' 
            ? 'Material properties apply to entire layer' 
            : 'Material properties apply only to current stroke'}
        </div>
      </div>
    </div>
  );
};

