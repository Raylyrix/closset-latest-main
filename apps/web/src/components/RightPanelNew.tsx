import React from 'react';
import { HexColorPicker } from 'react-colorful';
import * as THREE from 'three';
import { useProjectStore } from '../stores/domainStores';
import { useApp } from '../App';
import { Section } from './Section';
import { CustomSelect } from './CustomSelect';

interface RightPanelProps {
  activeToolSidebar?: string | null;
}

/**
 * RightPanel - Uses useApp store for brush settings integration
 * Fixed to properly sync with the actual brush functionality
 */
export function RightPanel({ activeToolSidebar }: RightPanelProps) {
  // Use useApp store for all settings (same as ShirtRefactored.tsx)
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
    activeTextId,
    customBrushImage,
    setBrushColor,
    setBrushSize,
    setBrushOpacity,
    setBrushHardness,
    setBrushShape,
    setBrushSpacing,
    setBlendMode,
    setBrushSymmetry,
    setCustomBrushImage,
    textElements,
    addTextElement,
    selectTextElement,
    updateTextElement,
    // Embroidery settings
    embroideryStitchType,
    embroideryThreadColor,
    embroideryThreadThickness,
    embroiderySpacing,
    embroideryDensity,
    embroideryAngle,
    embroideryScale,
    setEmbroideryStitchType,
    setEmbroideryThreadColor,
    setEmbroideryThreadThickness,
    setEmbroiderySpacing,
    setEmbroideryDensity,
    setEmbroideryAngle,
    setEmbroideryScale
  } = useApp(state => ({
    brushColor: state.brushColor,
    brushSize: state.brushSize,
    brushOpacity: state.brushOpacity,
    brushHardness: state.brushHardness,
    brushFlow: state.brushFlow,
    brushShape: state.brushShape,
    brushSpacing: state.brushSpacing,
    blendMode: state.blendMode,
    symmetryX: state.symmetryX,
    symmetryY: state.symmetryY,
    symmetryZ: state.symmetryZ,
    activeTool: state.activeTool,
    activeTextId: state.activeTextId,
    setBrushColor: state.setBrushColor,
    setBrushSize: state.setBrushSize,
    setBrushOpacity: state.setBrushOpacity,
    setBrushHardness: state.setBrushHardness,
    setBrushShape: state.setBrushShape,
    setBrushSpacing: state.setBrushSpacing,
    setBlendMode: state.setBlendMode,
    setBrushSymmetry: state.setBrushSymmetry,
    customBrushImage: state.customBrushImage,
    setCustomBrushImage: state.setCustomBrushImage,
    textElements: state.textElements,
    addTextElement: state.addTextElement,
    selectTextElement: state.selectTextElement,
    updateTextElement: state.updateTextElement,
    // Embroidery settings
    embroideryStitchType: state.embroideryStitchType,
    embroideryThreadColor: state.embroideryThreadColor,
    embroideryThreadThickness: state.embroideryThreadThickness,
    embroiderySpacing: state.embroiderySpacing,
    embroideryDensity: state.embroideryDensity,
    embroideryAngle: state.embroideryAngle,
    embroideryScale: state.embroideryScale,
    setEmbroideryStitchType: state.setEmbroideryStitchType,
    setEmbroideryThreadColor: state.setEmbroideryThreadColor,
    setEmbroideryThreadThickness: state.setEmbroideryThreadThickness,
    setEmbroiderySpacing: state.setEmbroiderySpacing,
    setEmbroideryDensity: state.setEmbroideryDensity,
    setEmbroideryAngle: state.setEmbroideryAngle,
    setEmbroideryScale: state.setEmbroideryScale
  }));

  // Project store for fabric presets
  const fabric = useProjectStore(state => state.exportFormat); // TODO: Add fabricPreset to project store

  // Puff Print settings from main App store
  // Puff Print settings removed - will be rebuilt with new 3D geometry approach

  return (
    <div>
      <Section title="🎨 Brush Settings">
        <div className="label">Color</div>
        <HexColorPicker
          color={brushColor}
          onChange={setBrushColor}
        />

        <div className="label" style={{ marginTop: 10 }}>Brush Size: {brushSize}px</div>
        <input
          type="range"
          min={1}
          max={256}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />

        <div className="label">Opacity: {Math.round(brushOpacity * 100)}%</div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={brushOpacity}
          onChange={(e) => setBrushOpacity(Number(e.target.value))}
        />

        <div className="label">Hardness: {Math.round(brushHardness * 100)}%</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={brushHardness}
          onChange={(e) => setBrushHardness(Number(e.target.value))}
        />

        <div className="label">Spacing: {Math.round(brushSpacing * 100)}%</div>
        <input
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={brushSpacing}
          onChange={(e) => setBrushSpacing(Number(e.target.value))}
        />

        <div className="label">Shape</div>
        <CustomSelect
          value={brushShape}
          onChange={(value) => setBrushShape(value as any)}
          options={[
            { value: 'round', label: 'Round' },
            { value: 'square', label: 'Square' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'triangle', label: 'Triangle' },
            { value: 'airbrush', label: 'Airbrush' },
            { value: 'calligraphy', label: 'Calligraphy' },
          ]}
        />

        <div className="label" style={{ marginTop: 20 }}>Custom Brush Image (Stencil)</div>
        <div style={{ 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.6)', 
          marginBottom: 10,
          marginTop: 4
        }}>
          Upload an image to use as a stencil brush. Only opaque areas will be painted.
        </div>
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: '2px dashed rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
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
        </div>
        {customBrushImage && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ 
              position: 'relative',
              width: '100%',
              paddingBottom: '100%',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)'
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
                marginTop: 8,
                padding: '6px',
                background: '#dc3545',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove Custom Brush
            </button>
          </div>
        )}
      </Section>

      {/* Puff Print Settings - Removed, will be rebuilt with new 3D geometry approach */}
      {false && (
      <Section title="🎈 Puff Print Settings" defaultOpen={activeTool === 'puffPrint' as any}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          Puff tool settings removed - will be rebuilt with new 3D geometry approach
        </div>
      </Section>
      )}

      <Section title="🧵 Embroidery Settings" defaultOpen={activeTool === 'embroidery'}>
        <div className="label">Stitch Type</div>
        <CustomSelect
          value={embroideryStitchType}
          onChange={(value) => setEmbroideryStitchType(value as any)}
          options={[
            { value: 'running', label: 'Running Stitch' },
            { value: 'satin', label: 'Satin Stitch' },
            { value: 'fill', label: 'Fill Stitch' },
            { value: 'cross', label: 'Cross Stitch' },
            { value: 'back', label: 'Back Stitch' },
          ]}
        />

        <div className="label">Thread Color</div>
        <input
          type="color"
          value={embroideryThreadColor}
          onChange={(e) => setEmbroideryThreadColor(e.target.value)}
          style={{ width: '100%', height: '36px', border: 'none', cursor: 'pointer' }}
        />

        <div className="label" style={{ marginTop: 10 }}>Thread Thickness: {embroideryThreadThickness}</div>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={embroideryThreadThickness}
          onChange={(e) => setEmbroideryThreadThickness(Number(e.target.value))}
        />

        <div className="label">Stitch Spacing: {embroiderySpacing}px</div>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.1}
          value={embroiderySpacing}
          onChange={(e) => setEmbroiderySpacing(Number(e.target.value))}
        />

        <div className="label">Density: {Math.round(embroideryDensity * 100)}%</div>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={embroideryDensity}
          onChange={(e) => setEmbroideryDensity(Number(e.target.value))}
        />

        <div className="label">Angle: {embroideryAngle}°</div>
        <input
          type="range"
          min={-180}
          max={180}
          step={5}
          value={embroideryAngle}
          onChange={(e) => setEmbroideryAngle(Number(e.target.value))}
        />

        <div className="label">Scale: {embroideryScale}x</div>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={embroideryScale}
          onChange={(e) => setEmbroideryScale(Number(e.target.value))}
        />
      </Section>

      <Section title="🔄 Symmetry & Blend" defaultOpen={false}>
        <label>
          <input
            type="checkbox"
            checked={symmetryX}
            onChange={(e) => setBrushSymmetry(e.target.checked)}
          /> Symmetry X
        </label>
        <label>
          <input
            type="checkbox"
            checked={symmetryY}
            onChange={(e) => setBrushSymmetry(e.target.checked)}
          /> Symmetry Y
        </label>
        <label>
          <input
            type="checkbox"
            checked={symmetryZ}
            onChange={(e) => setBrushSymmetry(e.target.checked)}
          /> Symmetry Z (UV wrap)
        </label>
        <div className="label">Blend Mode</div>
        <CustomSelect
          value={blendMode}
          onChange={(value) => setBlendMode(value as GlobalCompositeOperation)}
          options={[
            { value: 'source-over', label: 'Normal' },
            { value: 'multiply', label: 'Multiply' },
            { value: 'screen', label: 'Screen' },
            { value: 'overlay', label: 'Overlay' },
            { value: 'darken', label: 'Darken' },
            { value: 'lighten', label: 'Lighten' },
            { value: 'color-dodge', label: 'Color Dodge' },
            { value: 'color-burn', label: 'Color Burn' },
            { value: 'hard-light', label: 'Hard Light' },
            { value: 'soft-light', label: 'Soft Light' },
            { value: 'difference', label: 'Difference' },
            { value: 'exclusion', label: 'Exclusion' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'color', label: 'Color' },
            { value: 'luminosity', label: 'Luminosity' },
          ]}
        />
      </Section>

      <Section title="🧵 Fabric" defaultOpen={false}>
        <CustomSelect
          value={fabric}
          onChange={(value) => {
            // TODO: Add fabricPreset to project store
            console.log('Fabric changed to:', value);
          }}
          options={[
            { value: 'cotton', label: 'Cotton' },
            { value: 'polyester', label: 'Polyester' },
            { value: 'silk', label: 'Silk' },
            { value: 'denim', label: 'Denim' },
            { value: 'wool', label: 'Wool' },
          ]}
        />
      </Section>

      <Section title="📝 Text Tools" defaultOpen={true}>
        {/* Text Selection */}
        <div className="label">Text Elements: {textElements.length}</div>
        {textElements.length > 0 && (
          <div>
            <div className="label">Select Text to Edit</div>
          <select
            value={activeTextId || ''}
            onChange={(e) => selectTextElement(e.target.value || null)}
            style={{ width: '100%', padding: '4px', marginTop: '8px' }}
          >
            <option value="">-- Select text to edit --</option>
            {textElements.map((text, index) => (
              <option key={text.id} value={text.id}>
                {index + 1}. "{text.text}" ({text.fontSize}px)
              </option>
            ))}
          </select>
          </div>
        )}

        {activeTextId && (() => {
          const activeText = textElements.find(t => t.id === activeTextId);
          if (!activeText) return null;

          return (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,150,255,0.1)', borderRadius: '6px', border: '1px solid rgba(0,150,255,0.3)' }}>
              <div className="label" style={{ fontWeight: '600', marginBottom: '8px' }}>Editing: "{activeText.text}"</div>
              
              {/* Text Content */}
              <div className="label">Text Content</div>
              <textarea
                value={activeText.text}
                onChange={(e) => updateTextElement(activeTextId, { text: e.target.value })}
                style={{ 
                  width: '100%', 
                  marginTop: '4px', 
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  resize: 'vertical',
                  minHeight: '60px'
                }}
                placeholder="Enter your text here..."
              />

              {/* Font Family */}
              <div className="label" style={{ marginTop: '12px' }}>Font Family</div>
              <select
                value={activeText.fontFamily}
                onChange={(e) => {
                updateTextElement(activeTextId, { fontFamily: e.target.value });
                // Force immediate texture update
                setTimeout(() => {
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture();
                  }
                }, 50);
              }}
                style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '4px' }}
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
              </select>

              {/* Font Size */}
              <div className="label" style={{ marginTop: '12px' }}>Font Size: {activeText.fontSize}px</div>
              <input
                type="range"
                min="8"
                max="1000"
                value={activeText.fontSize}
                onChange={(e) => {
                console.log('🎨 Font size changed to:', e.target.value);
                updateTextElement(activeTextId, { fontSize: parseInt(e.target.value) });
                
                // Direct texture update without delays
                setTimeout(() => {
                  console.log('🎨 Direct texture update for font size');
                  // Force recomposition first
                  const { composeLayers } = useApp.getState();
                  composeLayers();
                  
                  // Then update texture directly
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture(true, false);
                  }
                }, 10);
              }}
                style={{ width: '100%', marginTop: '4px' }}
              />

              {/* Text Color */}
              <div className="label" style={{ marginTop: '12px' }}>Text Color</div>
              <input
                type="color"
                value={activeText.color}
                onChange={(e) => {
                console.log('🎨 Color changed to:', e.target.value);
                updateTextElement(activeTextId, { color: e.target.value });
                
                // Direct texture update without delays
                setTimeout(() => {
                  console.log('🎨 Direct texture update for color');
                  // Force recomposition first
                  const { composeLayers } = useApp.getState();
                  composeLayers();
                  
                  // Then update texture directly
                  if ((window as any).updateModelTexture) {
                    (window as any).updateModelTexture(true, false);
                  }
                }, 10);
              }}
                style={{ width: '100%', marginTop: '4px', height: '40px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />

              {/* Text Style */}
              <div className="label" style={{ marginTop: '12px' }}>Text Style</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  className={`btn ${activeText.bold ? 'active' : ''}`}
                  onClick={() => {
                    updateTextElement(activeTextId, { bold: !activeText.bold });
                    // Direct texture update
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, false);
                      }
                    }, 10);
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    fontSize: '12px',
                    background: activeText.bold ? '#007bff' : 'rgba(255,255,255,0.1)',
                    fontWeight: 'bold'
                  }}
                >
                  Bold
                </button>
                <button
                  className={`btn ${activeText.italic ? 'active' : ''}`}
                  onClick={() => {
                    updateTextElement(activeTextId, { italic: !activeText.italic });
                    // Force immediate texture update
                    setTimeout(() => {
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture();
                      }
                    }, 50);
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    fontSize: '12px',
                    background: activeText.italic ? '#007bff' : 'rgba(255,255,255,0.1)',
                    fontStyle: 'italic'
                  }}
                >
                  Italic
                </button>
                <button
                  className={`btn ${activeText.underline ? 'active' : ''}`}
                  onClick={() => {
                    updateTextElement(activeTextId, { underline: !activeText.underline });
                    // Force immediate texture update
                    setTimeout(() => {
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture();
                      }
                    }, 50);
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    fontSize: '12px',
                    background: activeText.underline ? '#007bff' : 'rgba(255,255,255,0.1)',
                    textDecoration: 'underline'
                  }}
                >
                  Underline
                </button>
              </div>

              {/* Text Alignment */}
              <div className="label" style={{ marginTop: '12px' }}>Text Alignment</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button
                  className={`btn ${activeText.align === 'left' ? 'active' : ''}`}
                  onClick={() => updateTextElement(activeTextId, { align: 'left' })}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontSize: '14px',
                    background: activeText.align === 'left' ? '#007bff' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  ⬅️
                </button>
                <button
                  className={`btn ${activeText.align === 'center' ? 'active' : ''}`}
                  onClick={() => updateTextElement(activeTextId, { align: 'center' })}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontSize: '14px',
                    background: activeText.align === 'center' ? '#007bff' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  ↔️
                </button>
                <button
                  className={`btn ${activeText.align === 'right' ? 'active' : ''}`}
                  onClick={() => updateTextElement(activeTextId, { align: 'right' })}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontSize: '14px',
                    background: activeText.align === 'right' ? '#007bff' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  ➡️
                </button>
              </div>

              {/* Text Case */}
              <div className="label" style={{ marginTop: '12px' }}>Text Case</div>
              <select
                value={activeText.textCase || 'none'}
                onChange={(e) => updateTextElement(activeTextId, { textCase: e.target.value as any })}
                style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '4px' }}
              >
                <option value="none">Normal Case</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>

              {/* Letter Spacing */}
              <div className="label" style={{ marginTop: '12px' }}>Letter Spacing: {activeText.letterSpacing || 0}px</div>
              <input
                type="range"
                min="-5"
                max="20"
                step="0.5"
                value={activeText.letterSpacing || 0}
                onChange={(e) => updateTextElement(activeTextId, { letterSpacing: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />

              {/* Line Height */}
              <div className="label" style={{ marginTop: '12px' }}>Line Height: {(activeText.lineHeight || 1.2).toFixed(1)}</div>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.1"
                value={activeText.lineHeight || 1.2}
                onChange={(e) => updateTextElement(activeTextId, { lineHeight: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />

              {/* Rotation */}
              <div className="label" style={{ marginTop: '12px' }}>Rotation: {Math.round((activeText.rotation || 0) * 180 / Math.PI)}°</div>
              <input
                type="range"
                min="-180"
                max="180"
                value={Math.round((activeText.rotation || 0) * 180 / Math.PI)}
                onChange={(e) => updateTextElement(activeTextId, { rotation: parseInt(e.target.value) * Math.PI / 180 })}
                style={{ width: '100%', marginTop: '4px' }}
              />

              {/* Opacity */}
              <div className="label" style={{ marginTop: '12px' }}>Opacity: {Math.round((activeText.opacity || 1) * 100)}%</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeText.opacity || 1}
                onChange={(e) => updateTextElement(activeTextId, { opacity: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />

              {/* Text Shadow */}
              <div className="label" style={{ marginTop: '12px' }}>Text Shadow</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <input
                  type="color"
                  value={activeText.shadow?.color || '#000000'}
                  onChange={(e) => updateTextElement(activeTextId, { 
                    shadow: { 
                      blur: activeText.shadow?.blur || 0,
                      offsetX: activeText.shadow?.offsetX || 0,
                      offsetY: activeText.shadow?.offsetY || 0,
                      color: e.target.value 
                    } 
                  })}
                  style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                />
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={activeText.shadow?.blur || 0}
                  onChange={(e) => updateTextElement(activeTextId, { 
                    shadow: { 
                      blur: parseInt(e.target.value),
                      offsetX: activeText.shadow?.offsetX || 0,
                      offsetY: activeText.shadow?.offsetY || 0,
                      color: activeText.shadow?.color || '#000000'
                    } 
                  })}
                  style={{ flex: 1 }}
                  placeholder="Blur"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this text?')) {
                      // Delete text element
                      const { deleteTextElement } = useApp.getState();
                      deleteTextElement(activeTextId);
                    }
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    background: '#dc3545',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  🗑️ Delete
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    // Duplicate text element
                    const { addTextElement } = useApp.getState();
                    addTextElement(activeText.text, { u: activeText.u + 0.05, v: activeText.v + 0.05 });
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    background: '#28a745',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  📋 Duplicate
                </button>
              </div>
            </div>
          );
        })()}

        {/* Add new text button */}
        <button
          className="btn"
          onClick={() => {
            const newTextId = `text-${Date.now()}`;
            const textElement = {
              id: newTextId,
              text: 'New Text',
              position: new THREE.Vector3(0, 0, 0),
              uv: new THREE.Vector2(0.5, 0.5),
              fontFamily: 'Arial',
              fontSize: 32,
              color: '#000000',
              bold: false,
              italic: false,
              align: 'center',
              rotation: 0,
              scale: 1
            };
            // Add text element using the correct signature
            addTextElement(textElement.text, { u: textElement.uv.x, v: textElement.uv.y });
            selectTextElement(newTextId);
          }}
          style={{ 
            width: '100%', 
            marginTop: '12px',
            padding: '12px',
            background: 'linear-gradient(135deg, #007bff, #0056b3)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          ➕ Add New Text Element
        </button>

        {/* Google Fonts Integration */}
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="label" style={{ fontWeight: '600', marginBottom: '8px' }}>🌐 Google Fonts</div>
          <input
            type="text"
            placeholder="Enter Google Font name (e.g., Roboto, Open Sans)"
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const fontName = e.currentTarget.value.trim();
                if (fontName && activeTextId) {
                  // Load Google Font
                  const link = document.createElement('link');
                  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
                  link.rel = 'stylesheet';
                  document.head.appendChild(link);
                  
                  // Update text element with new font
                  updateTextElement(activeTextId, { fontFamily: fontName });
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
            Press Enter to load font. Popular fonts: Roboto, Open Sans, Lato, Montserrat, Poppins
          </div>
        </div>

        {/* Text Import from URL/Link */}
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="label" style={{ fontWeight: '600', marginBottom: '8px' }}>🔗 Import Text from URL</div>
          <input
            type="text"
            placeholder="Enter URL to extract text from (e.g., https://example.com/article)"
            onKeyPress={async (e) => {
              if (e.key === 'Enter') {
                const url = e.currentTarget.value.trim();
                if (url && activeTextId) {
                  console.log('🌐 Extracting text from URL:', url);
                  try {
                    // Use a CORS proxy to fetch the URL content
                    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl);
                    const data = await response.json();
                    
                    if (data.contents) {
                      // Extract text from HTML content
                      const parser = new DOMParser();
                      const doc = parser.parseFromString(data.contents, 'text/html');
                      const text = doc.body.textContent || doc.body.innerText || '';
                      
                      if (text.trim()) {
                        updateTextElement(activeTextId, { text: text.substring(0, 1000) }); // Limit to 1000 chars
                        // Force texture update
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, false);
                          }
                        }, 10);
                        alert('Text extracted successfully from URL!');
                      } else {
                        alert('No text content found in the URL.');
                      }
                    } else {
                      alert('Failed to fetch content from URL. Please try a different URL.');
                    }
                  } catch (error) {
                    console.error('Error extracting text from URL:', error);
                    alert('Error extracting text from URL. Please check the URL and try again.');
                  }
                }
              }
            }}
            style={{ 
              width: '100%', 
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
            Press Enter to extract text from webpage
          </div>
        </div>

        {/* Text Import from File */}
        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="label" style={{ fontWeight: '600', marginBottom: '8px' }}>📄 Import Text from File</div>
          <input
            type="file"
            accept=".txt,.md,.doc,.docx,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && activeTextId) {
                console.log('📄 Processing text file:', file.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result as string;
                  if (text) {
                    updateTextElement(activeTextId, { text: text.substring(0, 1000) }); // Limit to 1000 chars
                    // Force texture update
                    setTimeout(() => {
                      const { composeLayers } = useApp.getState();
                      composeLayers();
                      if ((window as any).updateModelTexture) {
                        (window as any).updateModelTexture(true, false);
                      }
                    }, 10);
                  }
                };
                reader.readAsText(file);
              }
            }}
            style={{ 
              width: '100%', 
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
            Supported formats: TXT, MD, DOC, DOCX, PDF
          </div>
        </div>

        {/* AI Text Detection from Image */}
        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="label" style={{ fontWeight: '600', marginBottom: '8px' }}>🤖 AI Text Detection from Image</div>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && activeTextId) {
                console.log('🤖 Processing image for text detection:', file.name);
                try {
                  // Show loading message
                  const loadingDiv = document.createElement('div');
                  loadingDiv.innerHTML = `
                    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                 background: rgba(0,0,0,0.8); color: white; padding: 20px; 
                                 border-radius: 8px; z-index: 10000; text-align: center;">
                      <div style="margin-bottom: 10px;">🤖 Processing image for text detection...</div>
                      <div style="font-size: 12px; color: #ccc;">This may take a few seconds</div>
                      <div style="margin-top: 10px; font-size: 12px;">Please wait...</div>
                    </div>
                  `;
                  document.body.appendChild(loadingDiv);
                  
                  // Create image element to load the file
                  const img = new Image();
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  img.onload = async () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    
                    try {
                      // Use Tesseract.js for OCR
                      const { createWorker } = await import('tesseract.js');
                      const worker = await createWorker();
                      
                      const { data: { text } } = await worker.recognize(canvas);
                      await worker.terminate();
                      
                      // Remove loading indicator
                      document.body.removeChild(loadingDiv);
                      
                      if (text.trim()) {
                        updateTextElement(activeTextId, { text: text.substring(0, 1000) }); // Limit to 1000 chars
                        // Force texture update
                        setTimeout(() => {
                          const { composeLayers } = useApp.getState();
                          composeLayers();
                          if ((window as any).updateModelTexture) {
                            (window as any).updateModelTexture(true, false);
                          }
                        }, 10);
                        alert(`Text detected successfully!\n\nDetected text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);
                      } else {
                        alert('No text detected in the image. Please try a different image with clearer text.');
                      }
                    } catch (ocrError) {
                      console.error('OCR Error:', ocrError);
                      // Remove loading indicator
                      if (document.body.contains(loadingDiv)) {
                        document.body.removeChild(loadingDiv);
                      }
                      alert('Error processing image for text detection. Please try a different image.');
                    }
                  };
                  
                  img.onerror = () => {
                    // Remove loading indicator
                    if (document.body.contains(loadingDiv)) {
                      document.body.removeChild(loadingDiv);
                    }
                    alert('Error loading image. Please try a different file.');
                  };
                  
                  // Load the image
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    img.src = event.target?.result as string;
                  };
                  reader.readAsDataURL(file);
                  
                } catch (error) {
                  console.error('Error processing image:', error);
                  // Remove loading indicator if it exists
                  const existingLoading = document.querySelector('[style*="position: fixed"]');
                  if (existingLoading) {
                    document.body.removeChild(existingLoading);
                  }
                  alert('Error processing image. Please try again.');
                }
              }
            }}
            style={{ 
              width: '100%', 
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
            Upload image to detect and extract text using AI/OCR
          </div>
        </div>

        {/* Test Element to Verify Changes */}
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: '#00ff00', 
          color: '#000000', 
          fontSize: '12px', 
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ✅ NEW FEATURES ADDED - Text Import Available!
        </div>

        {/* Manual Texture Update Button for Testing */}
        <button
          className="btn"
          onClick={() => {
            console.log('🎨 Manual texture update triggered');
            if ((window as any).updateModelTexture) {
              (window as any).updateModelTexture();
            }
            const textureEvent = new CustomEvent('forceTextureUpdate', {
              detail: { source: 'manual-update', textId: activeTextId }
            });
            window.dispatchEvent(textureEvent);
          }}
          style={{ 
            width: '100%', 
            marginTop: '8px',
            padding: '8px',
            background: '#ff6b35',
            color: '#ffffff',
            fontSize: '12px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔄 Force Texture Update
        </button>
      </Section>

      <Section title="📊 Debug Info" defaultOpen={false}>
        <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
          <div>Active Tool: <strong>{activeTool}</strong></div>
          <div>Text Elements: <strong>{textElements.length}</strong></div>
          <div>Symmetry: <strong>{[symmetryX && 'X', symmetryY && 'Y', symmetryZ && 'Z'].filter(Boolean).join(', ') || 'None'}</strong></div>
          <div>Brush Size: <strong>{brushSize}px</strong></div>
          <div>Brush Opacity: <strong>{Math.round(brushOpacity * 100)}%</strong></div>
          <div>Brush Shape: <strong>{brushShape}</strong></div>
          <div>Blend Mode: <strong>{blendMode}</strong></div>
        </div>
      </Section>
    </div>
  );
}
