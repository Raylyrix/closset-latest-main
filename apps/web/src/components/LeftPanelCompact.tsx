import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { SERVER_URL, upscalePng } from '../api';
import { exportMeshAsGLB } from '../exporters';
import { useModelStore } from '../stores/domainStores';
import { performanceOptimizer } from '../utils/PerformanceOptimizer';

export function LeftPanelCompact() {
  // Use V2 system directly instead of legacy App.tsx properties
  const { layers, activeLayerId, composedCanvas } = useAdvancedLayerStoreV2();
  const modelChoice = useApp(s => s.modelChoice);
  const activeTool = useApp(s => s.activeTool);
  const setActiveTool = useApp(s => s.setActiveTool);
  // REMOVED: importedImages and addImportedImage - no longer used in left panel
  const addShapeElement = useApp(s => s.addShapeElement);
  const [downloading, setDownloading] = useState(false);

  // REMOVED: Left panel image import functionality - conflicts with right panel
  // Images must be imported via right panel when image tool is active

  useEffect(() => {
    // PERFORMANCE FIX: Only initialize canvas, don't trigger composition
    if (layers.length > 0 && !composedCanvas) {
      // Initialize composed canvas if missing
      console.log('LeftPanelCompact: Initializing device-optimized composed canvas');
      const optimalSize = performanceOptimizer.getOptimalCanvasSize();
      useApp.getState().initCanvases(optimalSize.width, optimalSize.height);
      
      // CRITICAL: Generate base layer after canvas initialization to capture original model texture
      setTimeout(() => {
        console.log('LeftPanelCompact: Generating base layer after canvas init');
        useApp.getState().generateBaseLayer();
      }, 200);
    }
    // PERFORMANCE: Removed automatic composition trigger - let painting system handle it
  }, [layers.length, composedCanvas]);

  const onDownload = async () => {
    if (!composedCanvas) return;
    setDownloading(true);
    try {
      const blob = await new Promise<Blob>((resolve) => composedCanvas.toBlob(b => resolve(b!), 'image/png'));
      const up = await upscalePng(blob, 2).catch(() => blob);
      const url = URL.createObjectURL(up);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'closset-texture-upscaled.png';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const addLayer = (useApp.getState() as any).addLayer;
  const toggleLayerVisibility = (useApp.getState() as any).toggleLayerVisibility;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000000',
      borderRight: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '11px',
      boxShadow: '2px 0 20px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Compact Tool Palette */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#a0aec0',
          fontWeight: '700',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          ✨ Tools
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '4px'
        }}>
          {[
            { id: 'select', icon: '👆', name: 'Select' },
            { id: 'brush', icon: '🖌️', name: 'Brush' },
            { id: 'eraser', icon: '🧽', name: 'Eraser' },
            { id: 'fill', icon: '🪣', name: 'Fill' },
            { id: 'picker', icon: '🎨', name: 'Picker' },
            { id: 'puffPrint', icon: '☁️', name: 'Puff' },
            { id: 'embroidery', icon: '🧵', name: 'Embroidery' },
            { id: 'text', icon: '📝', name: 'Text' },
            { id: 'shapes', icon: '🔷', name: 'Shapes' },
            { id: 'image', icon: '📷', name: 'Image' }
          ].map(tool => (
            <button
              key={tool.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔘 ${tool.name} button clicked! Current activeTool:`, activeTool);
                
                // Toggle behavior: if clicking the same tool, deactivate it
                if (activeTool === tool.id) {
                  console.log(`🔄 Deactivating ${tool.name} tool`);
                  setActiveTool('brush'); // Default to brush when deactivating
                } else {
                  console.log(`✅ Activating ${tool.name} tool (${tool.id})`);
                  setActiveTool(tool.id as any);
                  console.log(`🔍 After setActiveTool, activeTool should be:`, tool.id);
                }
              }}
              style={{
                padding: '8px',
                background: activeTool === tool.id 
                  ? '#000000' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                color: activeTool === tool.id ? '#FFFFFF' : '#a0aec0',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                boxShadow: activeTool === tool.id 
                  ? '0 4px 15px rgba(255, 255, 255, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)',
                fontWeight: '600',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                if (activeTool !== tool.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTool !== tool.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                }
              }}
              title={tool.name}
            >
              <span style={{ fontSize: '14px' }}>{tool.icon}</span>
              <span style={{ fontSize: '8px', fontWeight: '500' }}>{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* REMOVED: Image Import Section - conflicts with right panel image tool */}

      {/* Shapes Section */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#a0aec0',
          fontWeight: '700',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          🔷 Shapes
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px'
        }}>
          {[
            { shape: 'rectangle', icon: '▭', name: 'Rect' },
            { shape: 'circle', icon: '●', name: 'Circle' },
            { shape: 'triangle', icon: '▲', name: 'Triangle' },
            { shape: 'star', icon: '★', name: 'Star' },
            { shape: 'polygon', icon: '⬡', name: 'Polygon' },
            { shape: 'heart', icon: '♥', name: 'Heart' }
          ].map(s => (
            <button
              key={s.shape}
              onClick={() => {
                // Add shape to canvas at center
                addShapeElement({
                  type: s.shape,
                  x: 512,
                  y: 512,
                  width: 200,
                  height: 200,
                  color: '#FFFFFF',
                  opacity: 1,
                  rotation: 0
                });
                setActiveTool('shapes');
              }}
              style={{
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '6px',
                color: '#a0aec0',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={`Add ${s.name}`}
            >
              <span style={{ fontSize: '14px' }}>{s.icon}</span>
              <span style={{ fontSize: '7px', fontWeight: '500' }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Model Controls */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#a0aec0',
          fontWeight: '700',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          🎯 Model
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <button 
            className={`btn ${modelChoice === 'tshirt' ? 'active' : ''}`} 
            onClick={() => useApp.getState().setModelChoice('tshirt')}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: '600',
              background: modelChoice === 'tshirt' 
                ? '#000000' 
                : 'rgba(255, 255, 255, 0.05)',
              color: modelChoice === 'tshirt' ? '#FFFFFF' : '#a0aec0',
              border: modelChoice === 'tshirt' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: modelChoice === 'tshirt' 
                ? '0 4px 15px rgba(255, 255, 255, 0.2)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            T-Shirt
          </button>
          <button 
            className={`btn ${modelChoice === 'sphere' ? 'active' : ''}`} 
            onClick={() => useApp.getState().setModelChoice('sphere')}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: '600',
              background: modelChoice === 'sphere' 
                ? '#000000' 
                : 'rgba(255, 255, 255, 0.05)',
              color: modelChoice === 'sphere' ? '#FFFFFF' : '#a0aec0',
              border: modelChoice === 'sphere' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: modelChoice === 'sphere' 
                ? '0 4px 15px rgba(255, 255, 255, 0.2)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            Sphere
          </button>
        </div>
        <button 
          className="btn" 
          onClick={() => useApp.getState().openModelManager()}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#a0aec0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        >
          Manage Models
        </button>
      </div>

      {/* Model Scale Controls */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#a0aec0',
          fontWeight: '700',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          📏 Scale
        </div>
        
        {/* Scale Display */}
        <div style={{
          fontSize: '10px',
          color: '#FFFFFF',
          fontWeight: '600',
          marginBottom: '6px',
          textAlign: 'center'
        }}>
          {useApp(s => s.modelScale).toFixed(2)}×
        </div>
        
        {/* Scale Slider */}
        <input 
          type="range" 
          min={0.25} 
          max={10} 
          step={0.1} 
          value={useApp(s => s.modelScale)} 
          onChange={(e) => {
            const newScale = Number(e.target.value);
            useApp.setState({ modelScale: newScale });
          }}
          style={{ 
            width: '100%', 
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            outline: 'none',
            borderRadius: '2px',
            appearance: 'none',
            cursor: 'pointer'
          }}
        />
        
        {/* Scale Markers */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '4px',
          fontSize: '8px',
          color: '#a0aec0'
        }}>
          <span>25%</span>
          <span>500%</span>
          <span>1000%</span>
        </div>
        
        {/* Quick Scale Buttons - Row 1 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 0.5 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            50%
          </button>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 1.0 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            100%
          </button>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 2.0 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            200%
          </button>
        </div>
        
        {/* Quick Scale Buttons - Row 2 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 5.0 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            500%
          </button>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 7.5 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            750%
          </button>
          <button 
            onClick={() => {
              useApp.setState({ modelScale: 10.0 });
            }}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#a0aec0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            1000%
          </button>
        </div>
      </div>


      {/* Compact Export */}
      <div style={{
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#a0aec0',
          fontWeight: '700',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          🚀 Export
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn"
            onClick={onDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: '600',
              background: '#000000',
              color: '#FFFFFF',
              border: downloading ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              boxShadow: downloading 
                ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
                : '0 4px 15px rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {downloading ? '...' : 'PNG'}
          </button>
          <button
            className="btn"
            onClick={() => {
              const canvas = useApp.getState().composedCanvas;
              if (canvas) {
                exportMeshAsGLB(canvas);
              } else {
                console.warn('No composed canvas available for GLB export');
              }
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: '600',
              background: '#000000',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255, 255, 255, 0.2)'
            }}
          >
            GLB
          </button>
        </div>
      </div>
    </div>
  );
}
