import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useApp } from '../App';

interface TabletRightPanelProps {
  activeToolSidebar?: string | null;
}

export function TabletRightPanel({ activeToolSidebar }: TabletRightPanelProps) {
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
    setBrushColor,
    setBrushSize,
    setBrushOpacity,
    setBrushHardness,
    setBrushShape,
    setBrushSpacing,
    setBlendMode,
    setBrushSymmetry,
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
    // Puff print settings removed - will be rebuilt with new 3D geometry approach
  } = useApp();

  const [activeTab, setActiveTab] = useState('brush');
  const [userSelectedTab, setUserSelectedTab] = useState(false); // Track if user manually selected a tab

const tabs = [
    { id: 'brush', label: 'Brush', icon: '🖌️' },
    { id: 'puff', label: 'Puff', icon: '☁️' },
    { id: 'embroidery', label: 'Embroidery', icon: '🧵' },
    { id: 'picker', label: 'Picker', icon: '🎯' },
    { id: 'symmetry', label: 'Symmetry', icon: '🔄' },
    { id: 'layers', label: 'Layers', icon: '🎨' }
  ];

  // Auto-activate tool settings when tool changes (only if user hasn't manually selected)
  React.useEffect(() => {
    if (activeTool && !userSelectedTab) {
      // Map tools to their corresponding tab IDs
      const toolToTabMap: { [key: string]: string } = {
        'brush': 'brush',
        'eraser': 'brush',
        'fill': 'brush',
        'picker': 'picker',
        'puffPrint': 'puff',
        'embroidery': 'embroidery',
        'text': 'brush', // Fallback to brush for text in tablet version
        'symmetry': 'symmetry',
        'layers': 'layers'
      };
      
      const correspondingTab = toolToTabMap[activeTool];
      if (correspondingTab && tabs.find(tab => tab.id === correspondingTab)) {
        setActiveTab(correspondingTab);
        console.log('🎯 Auto-activated tab:', correspondingTab, 'for tool:', activeTool);
      }
    }
  }, [activeTool, tabs, userSelectedTab]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000000',
      borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '12px',
      boxShadow: '-2px 0 20px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        padding: '4px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setUserSelectedTab(true);
              console.log('🎯 User manually selected tab:', tab.id);
            }}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === tab.id ? '#FFFFFF' : '#a0aec0',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.id 
                ? '0 4px 15px rgba(102, 126, 234, 0.4)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              margin: '2px',
              minHeight: '60px',
              justifyContent: 'center'
            }}
            onTouchStart={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.transform = 'scale(0.95)';
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Brush Settings */}
        {activeTab === 'brush' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              🖌️ Brush Settings
            </div>
            
            {/* Color Picker */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Color
              </div>
              <div style={{
                width: '100%',
                height: '180px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
              }}>
                <HexColorPicker
                  color={brushColor}
                  onChange={setBrushColor}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Color Code Input */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#999',
                  minWidth: '40px',
                  fontWeight: '600'
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
                    padding: '8px 12px',
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}
                  placeholder="#000000"
                />
                <div style={{
                  width: '32px',
                  height: '24px',
                  background: brushColor,
                  borderRadius: '6px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }} />
              </div>
            </div>

            {/* Brush Size */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600'
              }}>
                <span>Size</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{brushSize}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  accentColor: '#667eea'
                }}
              />
            </div>

            {/* Brush Opacity */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600'
              }}>
                <span>Opacity</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{Math.round(brushOpacity * 100)}%</span>
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
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  accentColor: '#667eea'
                }}
              />
            </div>

            {/* Brush Hardness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600'
              }}>
                <span>Hardness</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{Math.round(brushHardness * 100)}%</span>
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
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  accentColor: '#667eea'
                }}
              />
            </div>

            {/* Brush Shape */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Shape
              </div>
              <select
                value={brushShape}
                onChange={(e) => setBrushShape(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#CCC',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="diamond">Diamond</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>

            {/* Blend Mode */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Blend Mode
              </div>
              <select
                value={blendMode}
                onChange={(e) => setBlendMode(e.target.value as GlobalCompositeOperation)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#CCC',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="soft-light">Soft Light</option>
                <option value="hard-light">Hard Light</option>
              </select>
            </div>
          </div>
        )}

        {/* Puff Settings - Removed, will be rebuilt with new 3D geometry approach */}
        {false && activeTab === 'puff' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              Puff tool settings removed - will be rebuilt with new 3D geometry approach
            </div>
          </div>
        )}

        {/* Embroidery Settings */}
        {activeTab === 'embroidery' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              🧵 Embroidery Settings
            </div>

            {/* Thread Color */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Thread Color
              </div>
              <div style={{
                width: '100%',
                height: '180px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
              }}>
                <HexColorPicker
                  color={embroideryThreadColor}
                  onChange={setEmbroideryThreadColor}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Color Code Input */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#999',
                  minWidth: '40px',
                  fontWeight: '600'
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
                    padding: '8px 12px',
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}
                  placeholder="#000000"
                />
                <div style={{
                  width: '32px',
                  height: '24px',
                  background: embroideryThreadColor,
                  borderRadius: '6px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }} />
              </div>
            </div>

            {/* Thread Thickness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600'
              }}>
                <span>Thickness</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{embroideryThreadThickness}px</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={embroideryThreadThickness}
                onChange={(e) => setEmbroideryThreadThickness(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  accentColor: '#ec4899'
                }}
              />
            </div>

            {/* Stitch Type */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Stitch Type
              </div>
              <select
                value={embroideryStitchType}
                onChange={(e) => setEmbroideryStitchType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#CCC',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  outline: 'none',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <option value="satin">Satin</option>
                <option value="fill">Fill</option>
                <option value="outline">Outline</option>
                <option value="cross-stitch">Cross Stitch</option>
                <option value="chain">Chain</option>
                <option value="backstitch">Backstitch</option>
              </select>
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600'
              }}>
                <span>Spacing</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{embroiderySpacing}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={embroiderySpacing}
                onChange={(e) => setEmbroiderySpacing(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  outline: 'none',
                  accentColor: '#ec4899'
                }}
              />
            </div>
          </div>
        )}

        {/* Picker Settings */}
        {activeTab === 'picker' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              🎯 Color Picker Settings
            </div>

            {/* Current Color Display */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                Selected Color
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{
                  width: '60px',
                  height: '45px',
                  background: brushColor,
                  borderRadius: '8px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                }} />
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: '700'
                  }}>
                    {brushColor}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    Click on model to pick color
                  </div>
                </div>
              </div>
            </div>

            {/* Color Code Input */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                color: '#CCC',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Color Code
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
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
                    padding: '12px 16px',
                    fontSize: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: '600'
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
                    padding: '12px 16px',
                    background: '#0066CC',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    boxShadow: '0 4px 15px rgba(0, 102, 204, 0.3)'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              padding: '16px',
              background: 'rgba(0, 102, 204, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(0, 102, 204, 0.3)',
              boxShadow: '0 4px 15px rgba(0, 102, 204, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#66B3FF',
                lineHeight: '1.6'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>How to use:</div>
                <div>1. Click on any color in the model</div>
                <div>2. The color will be picked and displayed here</div>
                <div>3. You can manually edit the color code above</div>
                <div>4. The picked color will be applied to your brush</div>
              </div>
            </div>
          </div>
        )}

        {/* Symmetry Settings */}
        {activeTab === 'symmetry' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              🔄 Symmetry Settings
            </div>

            {/* X Symmetry */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryX}
                  onChange={(e) => setSymmetryX(e.target.checked)}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    accentColor: '#667eea',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#CCC', fontWeight: '600' }}>X-Axis Symmetry</span>
              </label>
            </div>

            {/* Y Symmetry */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryY}
                  onChange={(e) => setSymmetryY(e.target.checked)}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    accentColor: '#667eea',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#CCC', fontWeight: '600' }}>Y-Axis Symmetry</span>
              </label>
            </div>

            {/* Z Symmetry */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="checkbox"
                  checked={symmetryZ}
                  onChange={(e) => setSymmetryZ(e.target.checked)}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    accentColor: '#667eea',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#CCC', fontWeight: '600' }}>Z-Axis Symmetry</span>
              </label>
            </div>
          </div>
        )}

        {/* Layers Settings */}
        {activeTab === 'layers' && (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontWeight: '700',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              🎨 Layer Settings
            </div>

            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                Quick Actions
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                <button style={{
                  padding: '12px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '16px' }}>🖌️</span>
                  <span>Paint</span>
                </button>
                
                <button style={{
                  padding: '12px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '16px' }}>☁️</span>
                  <span>Puff</span>
                </button>
                
                <button style={{
                  padding: '12px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '16px' }}>🧵</span>
                  <span>Embroidery</span>
                </button>
                
                <button style={{
                  padding: '12px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '16px' }}>📐</span>
                  <span>Vector</span>
                </button>
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#a0aec0',
                fontWeight: '600',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                Composition
              </div>
              
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '11px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <span>🔄</span>
                  <span>Compose</span>
                </button>
                
                <button style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: '#a0aec0',
                  fontSize: '11px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <span>⚡</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
