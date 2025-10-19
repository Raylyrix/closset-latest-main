import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';

interface SmartFillToolProps {
  active: boolean;
}

interface FillMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  algorithm: 'content_aware' | 'seamless' | 'pattern' | 'gradient' | 'ai_generated';
}

interface FillSettings {
  tolerance: number;
  feather: number;
  blendMode: GlobalCompositeOperation;
  opacity: number;
  patternScale: number;
  patternRotation: number;
  gradientType: 'linear' | 'radial' | 'conic';
  colorStops: Array<{ color: string; position: number }>;
}

  const fillModes: FillMode[] = [
    {
      id: 'content_aware',
    name: 'Content-Aware Fill',
    description: 'AI-powered intelligent filling that matches surrounding content',
      icon: '🧠',
      algorithm: 'content_aware'
    },
    {
      id: 'seamless',
    name: 'Seamless Fill',
    description: 'Creates seamless patterns that blend naturally',
      icon: '🔄',
      algorithm: 'seamless'
    },
    {
      id: 'pattern',
      name: 'Pattern Fill',
    description: 'Fills with repeating patterns and textures',
    icon: '🔷',
      algorithm: 'pattern'
    },
    {
      id: 'gradient',
      name: 'Gradient Fill',
    description: 'Smooth color transitions and gradients',
      icon: '🌈',
      algorithm: 'gradient'
    },
    {
      id: 'ai_generated',
      name: 'AI Generated',
    description: 'AI-generated content based on context',
    icon: '✨',
      algorithm: 'ai_generated'
    }
  ];

export function SmartFillTool({ active }: SmartFillToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedMode, setSelectedMode] = useState<FillMode>(fillModes[0]);
  const [fillSettings, setFillSettings] = useState<FillSettings>({
    tolerance: 30,
    feather: 2,
    blendMode: 'source-over',
    opacity: 1.0,
    patternScale: 1.0,
    patternRotation: 0,
    gradientType: 'linear',
    colorStops: [
      { color: '#ff0000', position: 0 },
      { color: '#0000ff', position: 1 }
    ]
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Get canvas and layer data from V2 system
  const { composedCanvas, layers, activeLayerId } = useAdvancedLayerStoreV2();

  // Handle fill mode selection
  const handleModeSelect = useCallback((mode: FillMode) => {
    setSelectedMode(mode);
    console.log('Selected fill mode:', mode.name);
  }, []);

  // Update fill settings
  const updateFillSetting = useCallback((key: keyof FillSettings, value: any) => {
    setFillSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Add color stop for gradient
  const addColorStop = useCallback(() => {
    const newStop = {
      color: '#ffffff',
      position: 0.5
    };
    setFillSettings(prev => ({
      ...prev,
      colorStops: [...prev.colorStops, newStop].sort((a, b) => a.position - b.position)
    }));
  }, []);

  // Remove color stop
  const removeColorStop = useCallback((index: number) => {
    setFillSettings(prev => ({
      ...prev,
      colorStops: prev.colorStops.filter((_, i) => i !== index)
    }));
  }, []);

  // Update color stop
  const updateColorStop = useCallback((index: number, key: 'color' | 'position', value: string | number) => {
    setFillSettings(prev => ({
      ...prev,
      colorStops: prev.colorStops.map((stop, i) => 
        i === index ? { ...stop, [key]: value } : stop
      )
    }));
  }, []);

  // Process smart fill
  const processSmartFill = useCallback(async () => {
    if (!canvasRef.current || !maskCanvasRef.current || !composedCanvas) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!ctx || !maskCtx) return;

      // Set canvas size
      canvas.width = composedCanvas.width;
      canvas.height = composedCanvas.height;
      maskCanvas.width = composedCanvas.width;
      maskCanvas.height = composedCanvas.height;

      // Draw current composed canvas
      ctx.drawImage(composedCanvas, 0, 0);

      // Create selection mask (simplified - in real implementation, this would come from user selection)
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(100, 100, 200, 200); // Example selection area
      
      // Apply smart fill based on selected mode
      switch (selectedMode.algorithm) {
        case 'content_aware':
          await processContentAwareFill(ctx, maskCtx);
          break;
        case 'seamless':
          await processSeamlessFill(ctx, maskCtx);
          break;
        case 'pattern':
          await processPatternFill(ctx, maskCtx);
          break;
        case 'gradient':
          await processGradientFill(ctx, maskCtx);
          break;
        case 'ai_generated':
          await processAIGeneratedFill(ctx, maskCtx);
          break;
      }
      
      // Apply the result back to the composed canvas
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = composedCanvas.width;
      resultCanvas.height = composedCanvas.height;
      const resultCtx = resultCanvas.getContext('2d');
      
      if (resultCtx) {
        resultCtx.drawImage(composedCanvas, 0, 0);
        resultCtx.globalCompositeOperation = fillSettings.blendMode;
        resultCtx.globalAlpha = fillSettings.opacity;
        resultCtx.drawImage(canvas, 0, 0);
        
        // Update the composed canvas in store
        useApp.setState({ composedCanvas: resultCanvas });
      }
      
    } catch (error) {
      console.error('Smart fill processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMode, fillSettings, composedCanvas]);

  // Content-aware fill processing
  const processContentAwareFill = async (ctx: CanvasRenderingContext2D, maskCtx: CanvasRenderingContext2D) => {
    // Simplified content-aware fill
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(100, 100, 200, 200);
  };

  // Seamless fill processing
  const processSeamlessFill = async (ctx: CanvasRenderingContext2D, maskCtx: CanvasRenderingContext2D) => {
    // Create seamless pattern
    const pattern = ctx.createPattern(
      createSeamlessPattern(),
      'repeat'
    );
    
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(100, 100, 200, 200);
    }
  };

  // Pattern fill processing
  const processPatternFill = async (ctx: CanvasRenderingContext2D, maskCtx: CanvasRenderingContext2D) => {
    // Create repeating pattern
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 50;
    patternCanvas.height = 50;
    const patternCtx = patternCanvas.getContext('2d');
    
    if (patternCtx) {
      // Draw simple pattern
      patternCtx.fillStyle = '#ff0000';
      patternCtx.fillRect(0, 0, 25, 25);
      patternCtx.fillStyle = '#00ff00';
      patternCtx.fillRect(25, 25, 25, 25);
      
      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(100, 100, 200, 200);
      }
    }
  };

  // Gradient fill processing
  const processGradientFill = async (ctx: CanvasRenderingContext2D, maskCtx: CanvasRenderingContext2D) => {
    let gradient: CanvasGradient;
    
    if (fillSettings.gradientType === 'linear') {
      gradient = ctx.createLinearGradient(100, 100, 300, 300);
    } else if (fillSettings.gradientType === 'radial') {
      gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 100);
    } else {
      // Conic gradient (simplified)
      gradient = ctx.createLinearGradient(100, 100, 300, 300);
    }
    
    // Add color stops
    fillSettings.colorStops.forEach(stop => {
      gradient.addColorStop(stop.position, stop.color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(100, 100, 200, 200);
  };

  // AI-generated fill processing
  const processAIGeneratedFill = async (ctx: CanvasRenderingContext2D, maskCtx: CanvasRenderingContext2D) => {
    // Simulate AI processing
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(100, 100, 200, 200);
    
    // Add some random "AI-generated" content
    ctx.fillStyle = '#333333';
    for (let i = 0; i < 20; i++) {
      const x = 100 + Math.random() * 200;
      const y = 100 + Math.random() * 200;
      ctx.fillRect(x, y, 2, 2);
    }
  };

  // Create seamless pattern
  const createSeamlessPattern = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a simple seamless pattern
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.arc(32, 32, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  };

  if (!active) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#1a1a1a',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '2px solid #4a5568'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
          gap: '8px'
        }}>
          🧠 Smart Fill Tool
        </h2>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '12px',
          opacity: 0.8
        }}>
          AI-powered intelligent filling and content generation
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Fill Mode Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e2e8f0' }}>
            Fill Mode
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {fillModes.map((mode) => (
            <button
              key={mode.id}
                onClick={() => handleModeSelect(mode)}
              style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: selectedMode.id === mode.id ? '#667eea' : '#4a5568',
                  border: '1px solid #718096',
                  borderRadius: '8px',
                  color: 'white',
                cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '20px' }}>{mode.icon}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{mode.name}</div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>{mode.description}</div>
                </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fill Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e2e8f0' }}>
          Fill Settings
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>
              Tolerance: {fillSettings.tolerance}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={fillSettings.tolerance}
              onChange={(e) => updateFillSetting('tolerance', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>
              Feather: {fillSettings.feather}px
            </label>
            <input
              type="range"
              min={0}
              max={20}
              value={fillSettings.feather}
              onChange={(e) => updateFillSetting('feather', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>
              Opacity: {Math.round(fillSettings.opacity * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={fillSettings.opacity}
              onChange={(e) => updateFillSetting('opacity', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>
              Blend Mode
            </label>
            <select
              value={fillSettings.blendMode}
              onChange={(e) => updateFillSetting('blendMode', e.target.value as GlobalCompositeOperation)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#4a5568',
                border: '1px solid #718096',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px'
              }}
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft Light</option>
              <option value="hard-light">Hard Light</option>
            </select>
          </div>
        </div>

        {/* Gradient Settings (for gradient mode) */}
        {selectedMode.algorithm === 'gradient' && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e2e8f0' }}>
              Gradient Settings
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>
                Gradient Type
              </label>
              <select
                value={fillSettings.gradientType}
                onChange={(e) => updateFillSetting('gradientType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#4a5568',
                  border: '1px solid #718096',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
                <option value="conic">Conic</option>
              </select>
      </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#a0aec0' }}>
                Color Stops
          </label>
              {fillSettings.colorStops.map((stop, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => updateColorStop(index, 'color', e.target.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
            <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={stop.position}
                    onChange={(e) => updateColorStop(index, 'position', Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '11px', minWidth: '35px' }}>
                    {Math.round(stop.position * 100)}%
                  </span>
                  {fillSettings.colorStops.length > 2 && (
                    <button
                      onClick={() => removeColorStop(index)}
                      style={{
                        background: '#e53e3e',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      ×
                    </button>
                  )}
        </div>
              ))}
              <button
                onClick={addColorStop}
          style={{
                  background: '#667eea',
                  border: 'none',
            borderRadius: '4px',
                  color: 'white',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                + Add Color Stop
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e2e8f0' }}>
            Actions
          </h3>

          <button
            onClick={processSmartFill}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px',
              background: isProcessing ? '#4a5568' : '#667eea',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}
          >
            {isProcessing ? '🔄 Processing...' : '🎨 Apply Smart Fill'}
          </button>

          <button
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              width: '100%',
              padding: '10px',
              background: previewMode ? '#667eea' : '#4a5568',
              border: '1px solid #718096',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {previewMode ? '👁️ Hide Preview' : '👁️ Show Preview'}
          </button>
        </div>

        {/* Info */}
        <div style={{
          background: '#1a202c',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '11px'
        }}>
          <div style={{ color: '#a0aec0', marginBottom: '4px' }}>How to use</div>
          <div>1. Select a fill mode from above</div>
          <div>2. Adjust settings as needed</div>
          <div>3. Click "Apply Smart Fill" to process</div>
          <div>4. Use preview to see results</div>
        </div>
      </div>

      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} width={512} height={512} style={{ display: 'none' }} />
      <canvas ref={maskCanvasRef} width={512} height={512} style={{ display: 'none' }} />
    </div>
  );
}

export default SmartFillTool;
