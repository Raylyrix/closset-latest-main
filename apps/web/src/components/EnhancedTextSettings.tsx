/**
 * 🎨 Enhanced Text Settings Panel
 * 
 * Features:
 * - Font selection with Google Fonts integration
 * - Advanced typography controls
 * - Text effects (shadows, strokes, gradients, glow)
 * - Real-time preview
 * - Preset styles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { fontManager, FontFamily } from '../utils/FontManager';
import { TextEffects, TEXT_EFFECT_PRESETS, TextEffectsRenderer } from '../utils/TextEffects';

interface EnhancedTextSettingsProps {
  activeTextId: string | null;
  onTextUpdate: (id: string, updates: any) => void;
}

export function EnhancedTextSettings({ activeTextId, onTextUpdate }: EnhancedTextSettingsProps) {
  const { textElements, activeTextId: currentActiveTextId } = useApp();
  
  // Get the active text element
  const activeText = textElements.find(t => t.id === (activeTextId || currentActiveTextId));
  
  // Font management state
  const [availableFonts, setAvailableFonts] = useState<FontFamily[]>([]);
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>('all');
  const [loadingFonts, setLoadingFonts] = useState(false);
  
  // Text effects state
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  // Initialize fonts
  useEffect(() => {
    const loadFonts = async () => {
      setLoadingFonts(true);
      try {
        const fonts = fontManager.getAvailableFonts();
        setAvailableFonts(fonts);
        
        // Preload the current font if it's a Google Font
        if (activeText?.fontFamily) {
          await fontManager.preloadFont(activeText.fontFamily);
        }
      } catch (error) {
        console.error('Failed to load fonts:', error);
      } finally {
        setLoadingFonts(false);
      }
    };
    
    loadFonts();
  }, [activeText?.fontFamily]);

  // Filter fonts based on search and category
  const filteredFonts = availableFonts.filter(font => {
    const matchesSearch = font.name.toLowerCase().includes(fontSearchQuery.toLowerCase()) ||
                         (font.preview && font.preview.toLowerCase().includes(fontSearchQuery.toLowerCase()));
    const matchesCategory = selectedFontCategory === 'all' || font.category === selectedFontCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle font change
  const handleFontChange = useCallback(async (fontName: string) => {
    if (!activeText) return;
    
    try {
      await fontManager.preloadFont(fontName);
      onTextUpdate(activeText.id, { fontFamily: fontName });
    } catch (error) {
      console.error('Failed to load font:', error);
    }
  }, [activeText, onTextUpdate]);

  // Handle text property changes
  const handlePropertyChange = useCallback((property: string, value: any) => {
    if (!activeText) return;
    onTextUpdate(activeText.id, { [property]: value });
  }, [activeText, onTextUpdate]);

  // Handle effect preset application
  const handlePresetApply = useCallback((presetName: string) => {
    if (!activeText) return;
    
    const preset = TEXT_EFFECT_PRESETS[presetName as keyof typeof TEXT_EFFECT_PRESETS];
    if (preset) {
      onTextUpdate(activeText.id, { effects: preset });
      setSelectedPreset(presetName);
    }
  }, [activeText, onTextUpdate]);

  // Handle custom effect changes
  const handleEffectChange = useCallback((effectType: string, value: any) => {
    if (!activeText) return;
    
    const currentEffects = activeText.effects || {};
    const newEffects = {
      ...currentEffects,
      [effectType]: value
    };
    
    onTextUpdate(activeText.id, { effects: newEffects });
    setSelectedPreset(null); // Clear preset when making custom changes
  }, [activeText, onTextUpdate]);

  if (!activeText) {
    return (
      <div style={{
        padding: '16px',
        color: '#999',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        Select a text element to edit its properties
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#fff'
        }}>
          📝 Text Properties
        </h3>
        <button
          onClick={() => setShowEffectsPanel(!showEffectsPanel)}
          style={{
            background: showEffectsPanel ? '#ff3366' : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            color: '#fff',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {showEffectsPanel ? 'Hide Effects' : 'Show Effects'}
        </button>
      </div>

      {/* Basic Typography */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          fontWeight: '600',
          color: '#ccc'
        }}>
          Typography
        </h4>

        {/* Font Selection */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Font Family
          </label>
          
          {/* Font Search */}
          <input
            type="text"
            placeholder="Search fonts..."
            value={fontSearchQuery}
            onChange={(e) => setFontSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              marginBottom: '8px'
            }}
          />

          {/* Font Category Filter */}
          <select
            value={selectedFontCategory}
            onChange={(e) => setSelectedFontCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              marginBottom: '8px'
            }}
          >
            <option value="all">All Categories</option>
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="display">Display</option>
            <option value="script">Script</option>
            <option value="handwriting">Handwriting</option>
            <option value="monospace">Monospace</option>
          </select>

          {/* Font List */}
          <div style={{
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            {loadingFonts ? (
              <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '10px' }}>
                Loading fonts...
              </div>
            ) : (
              filteredFonts.slice(0, 20).map(font => (
                <div
                  key={font.name}
                  onClick={() => handleFontChange(font.name)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: activeText.fontFamily === font.name ? '#ff3366' : '#fff',
                    background: activeText.fontFamily === font.name ? 'rgba(255, 51, 102, 0.2)' : 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: `'${font.name}', ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}`
                  }}
                >
                  {font.name}
                  {font.preview && (
                    <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                      {font.preview}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Font Size */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Font Size: {activeText.fontSize}px
          </label>
          <input
            type="range"
            min="8"
            max="200"
            value={activeText.fontSize}
            onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#ff3366'
            }}
          />
        </div>

        {/* Font Weight */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Font Weight
          </label>
          <select
            value={activeText.fontWeight || (activeText.bold ? 'bold' : 'normal')}
            onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px'
            }}
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="normal">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="bold">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>

        {/* Letter Spacing */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Letter Spacing: {activeText.letterSpacing || 0}px
          </label>
          <input
            type="range"
            min="-5"
            max="20"
            step="0.5"
            value={activeText.letterSpacing || 0}
            onChange={(e) => handlePropertyChange('letterSpacing', parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#ff3366'
            }}
          />
        </div>

        {/* Text Alignment */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Alignment
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['left', 'center', 'right'].map(align => (
              <button
                key={align}
                onClick={() => handlePropertyChange('align', align)}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: activeText.align === align ? '#ff3366' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Text Decoration */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            color: '#999',
            marginBottom: '4px'
          }}>
            Decoration
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { value: 'none', label: 'None' },
              { value: 'underline', label: 'Underline' },
              { value: 'line-through', label: 'Strike' },
              { value: 'overline', label: 'Overline' }
            ].map(decoration => (
              <button
                key={decoration.value}
                onClick={() => handlePropertyChange('textDecoration', decoration.value)}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: activeText.textDecoration === decoration.value ? '#ff3366' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                {decoration.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Effects Panel */}
      {showEffectsPanel && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '12px',
            fontWeight: '600',
            color: '#ccc'
          }}>
            Text Effects
          </h4>

          {/* Effect Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#999',
              marginBottom: '6px'
            }}>
              Quick Presets
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4px'
            }}>
              {Object.keys(TEXT_EFFECT_PRESETS).slice(0, 8).map(presetName => (
                <button
                  key={presetName}
                  onClick={() => handlePresetApply(presetName)}
                  style={{
                    padding: '6px 8px',
                    background: selectedPreset === presetName ? '#ff3366' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '9px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {presetName.replace(/([A-Z])/g, ' $1').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Effects */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#999',
              marginBottom: '6px'
            }}>
              Custom Effects
            </label>
            
            {/* Shadow Controls */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  checked={!!activeText.effects?.shadows?.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleEffectChange('shadows', [{
                        offsetX: 2,
                        offsetY: 2,
                        blur: 4,
                        color: '#000000',
                        opacity: 0.3
                      }]);
                    } else {
                      handleEffectChange('shadows', undefined);
                    }
                  }}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '10px', color: '#fff' }}>Shadow</span>
              </div>
              
              {activeText.effects?.shadows?.length && (
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '9px', color: '#999' }}>Offset X: {activeText.effects.shadows[0]?.offsetX || 0}</label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={activeText.effects.shadows[0]?.offsetX || 0}
                      onChange={(e) => {
                        const shadows = [...(activeText.effects?.shadows || [])];
                        if (shadows[0]) {
                          shadows[0].offsetX = parseInt(e.target.value);
                          handleEffectChange('shadows', shadows);
                        }
                      }}
                      style={{ width: '100%', accentColor: '#ff3366' }}
                    />
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '9px', color: '#999' }}>Offset Y: {activeText.effects.shadows[0]?.offsetY || 0}</label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={activeText.effects.shadows[0]?.offsetY || 0}
                      onChange={(e) => {
                        const shadows = [...(activeText.effects?.shadows || [])];
                        if (shadows[0]) {
                          shadows[0].offsetY = parseInt(e.target.value);
                          handleEffectChange('shadows', shadows);
                        }
                      }}
                      style={{ width: '100%', accentColor: '#ff3366' }}
                    />
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '9px', color: '#999' }}>Blur: {activeText.effects.shadows[0]?.blur || 0}</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={activeText.effects.shadows[0]?.blur || 0}
                      onChange={(e) => {
                        const shadows = [...(activeText.effects?.shadows || [])];
                        if (shadows[0]) {
                          shadows[0].blur = parseInt(e.target.value);
                          handleEffectChange('shadows', shadows);
                        }
                      }}
                      style={{ width: '100%', accentColor: '#ff3366' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stroke Controls */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  checked={!!activeText.effects?.stroke}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleEffectChange('stroke', {
                        width: 2,
                        color: '#000000',
                        opacity: 1
                      });
                    } else {
                      handleEffectChange('stroke', undefined);
                    }
                  }}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '10px', color: '#fff' }}>Stroke</span>
              </div>
              
              {activeText.effects?.stroke && (
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '9px', color: '#999' }}>Width: {activeText.effects.stroke.width}</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={activeText.effects?.stroke?.width || 1}
                      onChange={(e) => {
                        handleEffectChange('stroke', {
                          ...activeText.effects?.stroke,
                          width: parseInt(e.target.value)
                        });
                      }}
                      style={{ width: '100%', accentColor: '#ff3366' }}
                    />
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '9px', color: '#999' }}>Color</label>
                    <input
                      type="color"
                      value={activeText.effects?.stroke?.color || '#000000'}
                      onChange={(e) => {
                        handleEffectChange('stroke', {
                          ...activeText.effects?.stroke,
                          color: e.target.value
                        });
                      }}
                      style={{
                        width: '100%',
                        height: '24px',
                        border: 'none',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Text Preview */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <label style={{
          display: 'block',
          fontSize: '10px',
          color: '#999',
          marginBottom: '8px'
        }}>
          Preview
        </label>
        <div style={{
          fontSize: `${Math.min(activeText.fontSize, 24)}px`,
          fontFamily: `'${activeText.fontFamily}', ${activeText.fontFamily.includes('serif') ? 'serif' : 'sans-serif'}`,
          fontWeight: activeText.fontWeight || (activeText.bold ? 'bold' : 'normal'),
          fontStyle: activeText.fontStyle || (activeText.italic ? 'italic' : 'normal'),
          color: activeText.color,
          textAlign: activeText.align || 'left',
          letterSpacing: activeText.letterSpacing ? `${activeText.letterSpacing}px` : 'normal',
          textDecoration: activeText.textDecoration || 'none',
          lineHeight: '1.2',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: activeText.align === 'center' ? 'center' : activeText.align === 'right' ? 'flex-end' : 'flex-start'
        }}>
          {activeText.text || 'Sample Text'}
        </div>
      </div>
    </div>
  );
}
