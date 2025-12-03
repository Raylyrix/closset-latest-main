import React from 'react';
import { AdvancedLayer, LayerEffect } from '../core/AdvancedLayerSystemV2';

interface LayerEffectsPanelProps {
  activeLayer: AdvancedLayer;
  addEffect: (layerId: string, effect: LayerEffect) => void;
  removeEffect: (layerId: string, effectId: string) => void;
}

export function LayerEffectsPanel({ activeLayer, addEffect, removeEffect }: LayerEffectsPanelProps) {
  return (
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
            background: 'rgba(0, 0, 0, 0.3)',
            color: '#fff',
            border: '1px solid rgba(0, 0, 0, 0.5)',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          🌑 Shadow
        </button>
        
        <button
          onClick={() => {
            addEffect(activeLayer.id, {
              id: `outer-glow-${Date.now()}`,
              type: 'outer-glow',
              enabled: true,
              properties: {
                radius: 10,
                color: 'rgba(255, 255, 0, 0.8)',
                opacity: 0.8
              }
            });
            console.log('🎨 Added outer glow effect to layer:', activeLayer.name);
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
            console.log('🎨 Added brightness effect to layer:', activeLayer.name);
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
          🔲 Brightness
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
  );
}



