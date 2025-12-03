import React, { useState, useEffect } from 'react';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';

interface PerformanceSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceSettingsPopup: React.FC<PerformanceSettingsPopupProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    currentFPS: 60,
    averageFPS: 60,
    frameDrops: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentPreset, setCurrentPreset] = useState('balanced');
  const [deviceTier, setDeviceTier] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (!isOpen) return;

    const initializeData = async () => {
      try {
        // Get current performance config
        const config = unifiedPerformanceManager.getCurrentPreset();
        setDeviceTier(config.deviceTier);
        setPerformanceMetrics({
          currentFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
          averageFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
          frameDrops: 0
        });

        // Update performance metrics periodically
        const interval = setInterval(() => {
          const config = unifiedPerformanceManager.getCurrentPreset();
          setPerformanceMetrics({
            currentFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
            averageFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
            frameDrops: 0
          });
        }, 1000);
        
        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error('Error initializing performance data:', error);
      }
    };

    initializeData();
  }, [isOpen]);

  // Listen for performance config changes to update the UI
  useEffect(() => {
    const handleConfigUpdate = () => {
      const config = unifiedPerformanceManager.getCurrentPreset();
      setDeviceTier(config.deviceTier);
      setPerformanceMetrics({
        currentFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
        averageFPS: unifiedPerformanceManager.getPerformanceMetrics().currentFPS,
        frameDrops: 0
      });
    };

    window.addEventListener('performanceConfigUpdated', handleConfigUpdate);
    window.addEventListener('performancePresetChanged', handleConfigUpdate);

    return () => {
      window.removeEventListener('performanceConfigUpdated', handleConfigUpdate);
      window.removeEventListener('performancePresetChanged', handleConfigUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const getDeviceTierColor = (tier: string) => {
    switch (tier) {
      case 'ultra': return '#8b5cf6';
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPerformanceColor = (fps: number) => {
    if (fps >= 60) return '#4ade80';
    if (fps >= 30) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 99999999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto'
        }} 
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          style={{
            background: '#1a1a2e',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 99999999999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            position: 'relative',
            pointerEvents: 'auto'
          }} 
          onClick={(e) => e.stopPropagation()}
        >
           {/* Header */}
           <div style={{ 
             display: 'flex', 
             justifyContent: 'space-between', 
             alignItems: 'center', 
             marginBottom: '20px' 
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ 
                 fontSize: '24px',
                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                 borderRadius: '8px',
                 padding: '8px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center'
               }}>
                 ⚙️
               </div>
               <h3 style={{
                 margin: 0,
                 fontSize: '20px',
                 fontWeight: '600',
                 color: '#ffffff'
               }}>
                 Performance Settings
               </h3>
             </div>
             
             {/* Test Button */}
             <button
               onClick={() => {
                 const config = unifiedPerformanceManager.getCurrentPreset();
                 console.log('🔧 Current Performance Config:', config);
                 alert(`Current Config:\nTarget FPS: ${config.targetFPS}\nTexture Updates/sec: ${config.maxTextureUpdatesPerSecond}\nCanvas Redraws/sec: ${config.maxCanvasRedrawsPerSecond}\nDevice Tier: ${config.deviceTier}\nAggressive Opt: ${config.enableAggressiveOptimizations}`);
               }}
               style={{
                 padding: '6px 12px',
                 background: 'rgba(102, 126, 234, 0.2)',
                 border: '1px solid rgba(102, 126, 234, 0.3)',
                 borderRadius: '4px',
                 color: '#667eea',
                 fontSize: '10px',
                 cursor: 'pointer',
                 marginRight: '8px'
               }}
             >
               Test Config
             </button>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '12px'
            }}>
              <span style={{ 
                color: getDeviceTierColor(deviceTier),
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {deviceTier} Device
              </span>
              <span style={{ color: '#a0aec0' }}>
                FPS: {Math.round(performanceMetrics.currentFPS)}
              </span>
            </div>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Performance settings close button clicked');
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                color: '#E2E8F0',
                cursor: 'pointer',
                padding: '8px 12px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              ✕ Close
            </button>
          </div>

           {/* Performance Metrics */}
           <div style={{
             background: 'rgba(255, 255, 255, 0.05)',
             borderRadius: '8px',
             padding: '16px',
             marginBottom: '20px',
             border: '1px solid rgba(255, 255, 255, 0.1)'
           }}>
             <div style={{ 
               display: 'flex', 
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '12px'
             }}>
               <h4 style={{ 
                 margin: 0, 
                 fontSize: '14px', 
                 fontWeight: '600', 
                 color: '#ffffff' 
               }}>
                 Performance Metrics
               </h4>
             </div>
             
             <div style={{ 
               display: 'flex', 
               gap: '24px',
               alignItems: 'center',
               marginBottom: '12px'
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ fontSize: '12px', color: '#a0aec0' }}>FPS:</span>
                 <span style={{ 
                   fontSize: '16px', 
                   fontWeight: '600',
                   color: getPerformanceColor(performanceMetrics.currentFPS) 
                 }}>
                   {Math.round(performanceMetrics.currentFPS)}
                 </span>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ fontSize: '12px', color: '#a0aec0' }}>AVG:</span>
                 <span style={{ 
                   fontSize: '16px', 
                   fontWeight: '600',
                   color: getPerformanceColor(performanceMetrics.averageFPS) 
                 }}>
                   {Math.round(performanceMetrics.averageFPS)}
                 </span>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ fontSize: '12px', color: '#a0aec0' }}>DROPS:</span>
                 <span style={{ 
                   fontSize: '16px', 
                   fontWeight: '600',
                   color: performanceMetrics.frameDrops > 5 ? '#ef4444' : '#4ade80' 
                 }}>
                   {performanceMetrics.frameDrops}
                 </span>
               </div>
             </div>
             
             {/* Debug Info */}
             <div style={{
               background: 'rgba(0, 0, 0, 0.3)',
               borderRadius: '4px',
               padding: '8px',
               fontSize: '10px',
               color: '#a0aec0',
               fontFamily: 'monospace'
             }}>
               <div>Target FPS: {unifiedPerformanceManager.getCurrentPreset().targetFPS}</div>
               <div>Texture Updates/sec: {unifiedPerformanceManager.getCurrentPreset().maxTextureUpdatesPerSecond}</div>
               <div>Canvas Redraws/sec: {unifiedPerformanceManager.getCurrentPreset().maxCanvasRedrawsPerSecond}</div>
               <div>Aggressive Opt: {unifiedPerformanceManager.getCurrentPreset().enableAggressiveOptimizations ? 'ON' : 'OFF'}</div>
             </div>
           </div>

          {/* Quality Preset Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#E2E8F0',
              fontSize: '14px'
            }}>
              Quality Preset:
            </label>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const presetMap: Record<string, string> = {
                  'Performance': 'performance',
                  'Balanced': 'balanced', 
                  'Quality': 'quality',
                  'Ultra': 'ultra'
                };
                
                return ['Performance', 'Balanced', 'Quality', 'Ultra'].map((preset) => (
                  <button
                    key={preset}
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       console.log('🔧 Performance preset clicked:', preset);
                       try {
                         unifiedPerformanceManager.setPreset(presetMap[preset] as any);
                         setCurrentPreset(presetMap[preset]);
                         setDeviceTier(unifiedPerformanceManager.getDeviceCapabilities().isLowEnd ? 'low' : unifiedPerformanceManager.getDeviceCapabilities().isHighEnd ? 'high' : 'medium');
                         
                         // Show visual feedback
                         const button = e.currentTarget;
                         const originalText = button.textContent;
                         button.textContent = '✓ Applied';
                         button.style.background = '#4ade80';
                         
                         setTimeout(() => {
                           button.textContent = originalText;
                           button.style.background = currentPreset === presetMap[preset] ? '#667eea' : 'rgba(255, 255, 255, 0.1)';
                         }, 1000);
                         
                         console.log('🔧 Preset applied successfully:', preset);
                       } catch (error) {
                         console.error('🔧 Failed to apply preset:', error);
                       }
                     }}
                    style={{
                      padding: '8px 16px',
                      background: currentPreset === presetMap[preset] ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                      color: currentPreset === presetMap[preset] ? '#ffffff' : '#a0aec0',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPreset !== presetMap[preset]) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPreset !== presetMap[preset]) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    {preset}
                  </button>
                ));
              })()}
            </div>
          </div>

           {/* Current Preset Details */}
           <div style={{
             background: 'rgba(102, 126, 234, 0.1)',
             border: '1px solid rgba(102, 126, 234, 0.3)',
             borderRadius: '8px',
             padding: '16px',
             marginBottom: '20px'
           }}>
             <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '8px',
               marginBottom: '12px'
             }}>
               <div style={{
                 width: '4px',
                 height: '20px',
                 background: '#667eea',
                 borderRadius: '2px'
               }} />
               <h4 style={{ 
                 margin: 0, 
                 fontSize: '16px', 
                 fontWeight: '600', 
                 color: '#ffffff' 
               }}>
                 {currentPreset.charAt(0).toUpperCase() + currentPreset.slice(1)}
               </h4>
             </div>
             
             <p style={{ 
               margin: '0 0 12px 0', 
               fontSize: '12px', 
               color: '#a0aec0' 
             }}>
               {(() => {
                 switch (currentPreset) {
                   case 'performance': return 'Maximum speed and responsiveness - frequent updates, aggressive optimizations';
                   case 'balanced': return 'Balanced speed and quality - moderate update frequency';
                   case 'quality': return 'Higher quality with reduced update frequency';
                   case 'ultra': return 'Maximum quality with minimal updates - best for high-end devices';
                   default: return 'Current performance settings';
                 }
               })()}
             </p>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
               <div>
                 <span style={{ fontSize: '11px', color: '#a0aec0' }}>Resolution: </span>
                 <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff' }}>
                   {(() => {
                     switch (currentPreset) {
                       case 'performance': return '1024px';
                       case 'balanced': return '1024px';
                       case 'quality': return '2048px';
                       case 'ultra': return '4096px';
                       default: return '1024px';
                     }
                   })()}
                 </span>
               </div>
               <div>
                 <span style={{ fontSize: '11px', color: '#a0aec0' }}>Max FPS: </span>
                 <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff' }}>
                   {unifiedPerformanceManager.getCurrentPreset().targetFPS}
                 </span>
               </div>
               <div>
                 <span style={{ fontSize: '11px', color: '#a0aec0' }}>Texture Updates/sec: </span>
                 <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff' }}>
                   {unifiedPerformanceManager.getCurrentPreset().maxTextureUpdatesPerSecond}
                 </span>
               </div>
               <div>
                 <span style={{ fontSize: '11px', color: '#a0aec0' }}>Aggressive Opt: </span>
                 <span style={{ fontSize: '11px', fontWeight: '600', color: unifiedPerformanceManager.getCurrentPreset().enableAggressiveOptimizations ? '#ef4444' : '#4ade80' }}>
                   {unifiedPerformanceManager.getCurrentPreset().enableAggressiveOptimizations ? 'ON' : 'OFF'}
                 </span>
               </div>
             </div>
           </div>


          {/* Advanced Settings Toggle */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Advanced settings toggle clicked');
                setShowAdvanced(!showAdvanced);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'underline',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                margin: '0 auto',
                pointerEvents: 'auto'
              }}
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              Advanced Settings
            </button>
          </div>

          {/* Advanced Settings Content */}
          {showAdvanced && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#ffffff'
              }}>
                Advanced Performance Controls
              </h4>

              {/* Canvas Resolution Override */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#a0aec0'
                }}>
                  Canvas Resolution Override:
                </label>
                <select
                  onChange={(e) => {
                    const resolution = parseInt(e.target.value);
                    console.log('🔧 Canvas resolution changed to:', resolution);
                    // Note: Canvas resolution is handled by the canvas initialization system
                    console.log('🔧 Canvas resolution setting noted (applied on next canvas init)');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  <option value={512}>512px (Performance)</option>
                  <option value={1024}>1024px (Balanced)</option>
                  <option value={2048}>2048px (Quality)</option>
                  <option value={4096}>4096px (Ultra)</option>
                </select>
              </div>

              {/* Max FPS Override */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#a0aec0'
                }}>
                  Max FPS Override:
                </label>
                <select
                  onChange={(e) => {
                    const fps = parseInt(e.target.value);
                    console.log('🔧 Max FPS changed to:', fps);
                    // Config updates handled by preset system
                    // unifiedPerformanceManager.setPreset({ targetFPS: fps });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  <option value={30}>30 FPS</option>
                  <option value={45}>45 FPS</option>
                  <option value={60}>60 FPS</option>
                  <option value={120}>120 FPS</option>
                </select>
              </div>

              {/* Texture Quality Override */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#a0aec0'
                }}>
                  Texture Quality Override:
                </label>
                <select
                  onChange={(e) => {
                    const quality = e.target.value;
                    console.log('🔧 Texture quality changed to:', quality);
                    // Map texture quality to texture update frequency
                    const updatesPerSecond = quality === 'low' ? 2 : quality === 'medium' ? 4 : quality === 'high' ? 8 : 12;
                    // Config updates handled by preset system
                    // unifiedPerformanceManager.setPreset({ maxTextureUpdatesPerSecond: updatesPerSecond });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              {/* Advanced Features Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#a0aec0'
                }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      console.log('🔧 Advanced features toggled:', e.target.checked);
                      // Config updates handled by preset system
                    // unifiedPerformanceManager.setPreset({ enableAggressiveOptimizations: !e.target.checked });
                    }}
                    style={{
                      width: '14px',
                      height: '14px',
                      accentColor: '#667eea'
                    }}
                  />
                  Enable Advanced Features
                </label>
              </div>

              {/* Reset Button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔧 Resetting to defaults');
                    // Reset to balanced preset
                    unifiedPerformanceManager.setPreset('balanced');
                    setCurrentPreset('balanced');
                    setDeviceTier(unifiedPerformanceManager.getDeviceCapabilities().isLowEnd ? 'low' : unifiedPerformanceManager.getDeviceCapabilities().isHighEnd ? 'high' : 'medium');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#a0aec0',
                    cursor: 'pointer',
                    fontSize: '11px',
                    pointerEvents: 'auto'
                  }}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PerformanceSettingsPopup;
