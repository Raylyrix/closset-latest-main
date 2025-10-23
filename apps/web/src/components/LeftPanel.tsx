import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { EnhancedLayerPanel } from './EnhancedLayerPanel';
import { LAYER_SYSTEM_CONFIG } from '../config/LayerConfig';
import { layerPersistenceManager } from '../core/LayerPersistenceManager';
import { Section } from './Section';
import { CustomSelect } from './CustomSelect';
import { SERVER_URL, upscalePng } from '../api';
import { exportMeshAsGLB } from '../exporters';
import { performanceOptimizer } from '../utils/PerformanceOptimizer';

export function LeftPanel() {
  // Use V2 system directly instead of legacy App.tsx properties
  const { layers, activeLayerId, composedCanvas } = useAdvancedLayerStoreV2();
  const modelChoice = useApp(s => s.modelChoice);
  const activeTool = useApp(s => s.activeTool);
  const setActiveTool = useApp(s => s.setActiveTool);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // PERFORMANCE FIX: Only initialize canvas, don't trigger composition
    if (layers.length > 0 && !composedCanvas) {
      // Initialize composed canvas if missing
      console.log('LeftPanel: Initializing device-optimized composed canvas');
      const optimalSize = performanceOptimizer.getOptimalCanvasSize();
      useApp.getState().initCanvases(optimalSize.width, optimalSize.height);
    }
    // PERFORMANCE: Removed automatic composition trigger - let painting system handle it
  }, [layers.length, composedCanvas]);

  // Check for layer persistence on mount
  useEffect(() => {
    const checkLayerPersistence = async () => {
      console.log('🎨 LeftPanel: Checking layer persistence...');
      
      // Use the layer persistence manager
      const persistence = await layerPersistenceManager.checkPersistence();
      console.log('🎨 LeftPanel: Layer persistence status:', persistence);
      
      if (!persistence.hasLayers) {
        console.log('🎨 LeftPanel: No layers found, attempting to load from storage...');
        const loadSuccess = await layerPersistenceManager.ensureLayersLoaded();
        if (loadSuccess) {
          console.log('🎨 LeftPanel: Layers loaded successfully from storage');
        } else {
          console.log('🎨 LeftPanel: No saved layers found in storage');
        }
      }
    };
    
    checkLayerPersistence();
  }, []);

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

  const decals = useApp((s:any) => s.decals || []);
  const activeDecalId = useApp((s:any) => s.activeDecalId || null);
  const addDecalFromFile = (useApp.getState() as any).addDecalFromFile;
  const selectDecal = (useApp.getState() as any).selectDecal;
  const addLayer = (useApp.getState() as any).addLayer;
  const toggleLayerVisibility = (useApp.getState() as any).toggleLayerVisibility;
  const setActiveLayerId = (useApp.getState() as any).setActiveLayerId;
  const setActiveLayerLock = (useApp.getState() as any).setActiveLayerLock;
  
  // Model navigation functions
  const nudgeModel = (useApp.getState() as any).nudgeModel;
  const rotateModel = (useApp.getState() as any).rotateModel;
  const resetModelTransform = (useApp.getState() as any).resetModelTransform;
  const setModelScale = (useApp.getState() as any).setModelScale;
  const modelScale = useApp(s => (s as any).modelScale || 1);
  const modelBoundsHeight = useApp(s => (s as any).modelBoundsHeight || null);
  const snapModelToOrigin = (useApp.getState() as any).snapModelToOrigin;
  const snapModelRotation90 = (useApp.getState() as any).snapModelRotation90;
  const setCameraView = (useApp.getState() as any).setCameraView;
  
  // selection UI removed

  return (
    <div>
      <Section title="Model Choice">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className={`btn ${modelChoice === 'tshirt' ? 'active' : ''}`} onClick={() => useApp.getState().setModelChoice('tshirt')}>T‑Shirt</button>
          <button className={`btn ${modelChoice === 'sphere' ? 'active' : ''}`} onClick={() => useApp.getState().setModelChoice('sphere')}>Sphere</button>
        </div>
        <button className="btn" onClick={() => useApp.getState().openModelManager()}>
          Choose Custom Model
        </button>
        
        {useApp(s => s.modelUrl) && (
          <div style={{ marginTop: 8 }}>
            <div className="label">Current Model:</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>
              {useApp(s => s.modelUrl)}
            </div>
            <button className="btn" onClick={() => {
              const state = useApp.getState();
              if (state.generateBaseLayer) {
                state.generateBaseLayer();
              }
            }}>
              Generate Base Layer
            </button>
          </div>
        )}
      </Section>

      <Section title="Model Scale" defaultOpen={true}>
        <div style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>
            Scale: {modelScale.toFixed(2)}×
          </div>
          <input 
            type="range" 
            min={0.25} 
            max={2} 
            step={0.05} 
            value={modelScale} 
            onChange={(e) => setModelScale && setModelScale(Number(e.target.value))}
            style={{ 
              width: '100%', 
              height: '6px',
              background: 'var(--bg-secondary)',
              outline: 'none',
              borderRadius: '3px',
              appearance: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>25%</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>100%</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>200%</span>
          </div>
        </div>
        
        {modelBoundsHeight && (
          <div style={{ 
            padding: '8px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '6px',
            marginTop: 8
          }}>
            <div className="label" style={{ fontSize: 12, marginBottom: 4 }}>
              Model Dimensions
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Height: {(modelBoundsHeight * modelScale).toFixed(2)} m
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button 
            className="btn" 
            onClick={() => setModelScale && setModelScale(0.5)}
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            50%
          </button>
          <button 
            className="btn" 
            onClick={() => setModelScale && setModelScale(1)}
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            100%
          </button>
          <button 
            className="btn" 
            onClick={() => setModelScale && setModelScale(1.5)}
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            150%
          </button>
        </div>
      </Section>

              <Section title="Background Scene" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
              Current: {useApp(s => s.backgroundScene)}
            </div>
            <button className="btn" onClick={() => useApp.getState().openBackgroundManager()}>
              Open Background Manager
            </button>
            <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
              Choose from professional HDR environment maps for realistic lighting and reflections.
              <br />
              <br />
              Default scenes use industry-standard HDR environment maps.
            </div>
          </div>
        </Section>

      {/* PHASE 2 FIX: Removed legacy image import section - images now handled by RightPanelCompact.tsx -> V2 system */}

      {/* Layer Panel - Conditional based on config */}
      {LAYER_SYSTEM_CONFIG.USE_ADVANCED_LAYERS ? (
        <EnhancedLayerPanel />
      ) : (
        <Section title="Layers">
          {/* Debug buttons for layer persistence */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            <button 
              className="btn" 
              onClick={async () => {
                const persistence = await layerPersistenceManager.checkPersistence();
                console.log('🎨 Layer persistence debug:', persistence);
                alert(`Layers: ${persistence.layerCount}\nNames: ${persistence.layerNames.join(', ')}`);
              }}
              style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--accent)', color: 'white' }}
            >
              Debug Layers
            </button>
            <button 
              className="btn" 
              onClick={async () => {
                const success = await layerPersistenceManager.forceReload();
                alert(success ? 'Layers reloaded successfully' : 'Failed to reload layers');
              }}
              style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--warning)', color: 'white' }}
            >
              Force Reload
            </button>
            <button 
              className="btn" 
              onClick={async () => {
                const success = await layerPersistenceManager.saveLayers();
                alert(success ? 'Layers saved successfully' : 'Failed to save layers');
              }}
              style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--success)', color: 'white' }}
            >
              Save Layers
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => addLayer && addLayer()}>+ Add Layer</button>
            <button className="btn" onClick={() => {
              const state = useApp.getState();
              if (state.createToolLayer) {
                state.createToolLayer('brush');
              }
            }}>🖌️ Brush</button>
            <button className="btn" onClick={() => {
              const state = useApp.getState();
              if (state.createToolLayer) {
                state.createToolLayer('puffPrint');
              }
            }}>☁️ Puff</button>
            <button className="btn" onClick={() => {
              const state = useApp.getState();
              if (state.createToolLayer) {
                state.createToolLayer('embroidery');
              }
            }}>🧵 Embroidery</button>
          </div>
          <div>
            {layers.map(l => {
              const layerToolType = (l as any).toolType || 'general';
              const layerOpacity = (l as any).opacity || 1.0;
              const layerBlendMode = (l as any).blendMode || 'normal';
              
              return (
                <div key={l.id} style={{ 
                  marginBottom: 8, 
                  padding: 8, 
                  background: activeLayerId === l.id ? 'var(--accent)' : 'var(--bg-secondary)', 
                  borderRadius: 6,
                  border: activeLayerId === l.id ? '2px solid var(--accent-bright)' : '2px solid transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <button
                      className="btn"
                      aria-label={l.visible ? 'Hide layer' : 'Show layer'}
                      title={l.visible ? 'Hide layer' : 'Show layer'}
                      onClick={() => {
                        const state = useApp.getState();
                        if (state.toggleLayerVisibility) {
                          state.toggleLayerVisibility(l.id);
                        }
                      }}
                      style={{ padding: 4, width: 28, height: 28 }}
                    >
                      {l.visible ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        </svg>
                      )}
                    </button>
                    
                    <div style={{ flex: 1, cursor: 'pointer' }}
                      onClick={() => {
                        if (setActiveLayerId) setActiveLayerId(l.id);
                      }}
                    >
                      <div style={{ 
                        fontWeight: activeLayerId === l.id ? 'bold' : 'normal', 
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {layerToolType === 'brush' && '🖌️'}
                        {layerToolType === 'puffPrint' && '☁️'}
                        {layerToolType === 'embroidery' && '🧵'}
                        {layerToolType === 'general' && '📄'}
                        {l.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        {l.visible ? 'Visible' : 'Hidden'} • Opacity: {Math.round(layerOpacity * 100)}% • {layerBlendMode}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        className="btn"
                        title="Move up"
                        onClick={() => {
                          const state = useApp.getState();
                          if (state.moveLayerUp) {
                            state.moveLayerUp(l.id);
                          }
                        }}
                        style={{ padding: 4, width: 24, height: 24 }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 14l5-5 5 5z"/>
                        </svg>
                      </button>
                      <button
                        className="btn"
                        title="Move down"
                        onClick={() => {
                          const state = useApp.getState();
                          if (state.moveLayerDown) {
                            state.moveLayerDown(l.id);
                          }
                        }}
                        style={{ padding: 4, width: 24, height: 24 }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 10l5 5 5-5z"/>
                        </svg>
                      </button>
                      <button
                        className="btn"
                        title="Duplicate"
                        onClick={() => {
                          const state = useApp.getState();
                          if (state.duplicateLayer) {
                            state.duplicateLayer(l.id);
                          }
                        }}
                        style={{ padding: 4, width: 24, height: 24 }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                      </button>
                      <button
                        className="btn"
                        title="Delete layer (removes all content)"
                        onClick={() => {
                          if (window.confirm(`Delete ${l.name} layer? This will remove all ${layerToolType} content on this layer.`)) {
                            const state = useApp.getState();
                            if (state.deleteLayer) {
                              state.deleteLayer(l.id);
                            }
                          }
                        }}
                        style={{ 
                          padding: 4, 
                          width: 24, 
                          height: 24, 
                          background: 'var(--danger)',
                          color: 'white'
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Layer Controls */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: 'var(--muted)' }}>Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layerOpacity}
                        onChange={(e) => {
                          const state = useApp.getState();
                          if (state.setLayerOpacity) {
                            state.setLayerOpacity(l.id, parseFloat(e.target.value));
                          }
                        }}
                        style={{ width: '100%', marginTop: 2 }}
                      />
                    </div>
                    <select
                      value={layerBlendMode}
                      onChange={(e) => {
                        const state = useApp.getState();
                        if (state.setLayerBlendMode) {
                          state.setLayerBlendMode(l.id, e.target.value);
                        }
                      }}
                      style={{ 
                        padding: 4, 
                        fontSize: 10, 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text)'
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
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Export">
        <button className="btn" onClick={onDownload} disabled={downloading}>{downloading ? 'Exporting…' : 'Export Texture PNG'}</button>
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={async () => {
            const textureCanvas = useApp.getState().composedCanvas;
            if (!textureCanvas) return;
            const blob = await new Promise<Blob>((resolve) => textureCanvas.toBlob(b => resolve(b!), 'image/png'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'closset-texture.png';
            a.click();
            URL.revokeObjectURL(url);
          }}>Export Texture (Original Size)</button>
        </div>
      </Section>



      <Section title="Decals (Images)">
        <input type="file" accept="image/*" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f || !addDecalFromFile) return;
          await addDecalFromFile(f, undefined, activeLayerId);
        }} />
        <div style={{ marginTop: 8 }}>
          {decals.map((d: any) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{d.name}</span>
              <button className="btn" onClick={() => selectDecal && selectDecal(d.id)} style={{ padding: 4, fontSize: 10 }}>
                {d.id === activeDecalId ? 'SELECTED' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Navigate Model" defaultOpen={true}>
        <div style={{ display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <button className="btn" onClick={()=> nudgeModel('x', -0.05)}>X-</button>
          <button className="btn" onClick={()=> nudgeModel('x', +0.05)}>X+</button>
          <button className="btn" onClick={()=> rotateModel('x', 15)}>Rot X</button>
          <button className="btn" onClick={()=> nudgeModel('y', -0.05)}>Y-</button>
          <button className="btn" onClick={()=> nudgeModel('y', +0.05)}>Y+</button>
          <button className="btn" onClick={()=> rotateModel('y', 15)}>Rot Y</button>
          <button className="btn" onClick={()=> nudgeModel('z', -0.05)}>Z-</button>
          <button className="btn" onClick={()=> nudgeModel('z', +0.05)}>Z+</button>
          <button className="btn" onClick={()=> rotateModel('z', 15)}>Rot Z</button>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={()=> resetModelTransform()}>Reset</button>
          <button className="btn" onClick={()=> snapModelToOrigin()}>Snap Origin</button>
          <button className="btn" onClick={()=> snapModelRotation90()}>Snap Rot 90°</button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <CustomSelect
            value=""
            placeholder="Camera View…"
            onChange={(v)=> setCameraView(v)}
            options={[
              { value: 'front', label: 'Front' },
              { value: 'back', label: 'Back' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
            ]}
          />
        </div>
      </Section>

      {/* Selection section removed */}
    </div>
  );
}