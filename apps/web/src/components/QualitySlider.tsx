/**
 * QUALITY SLIDER COMPONENT
 * 
 * Interactive quality control component with performance presets
 * Shows system info and allows manual quality adjustment
 */

import React, { useState, useEffect } from 'react';
import { adaptivePerformanceManager } from '../utils/AdaptivePerformanceManager'; // FIXED: PerformancePreset doesn't exist
import { environmentDetector, SystemInfo } from '../utils/EnvironmentDetector';

interface QualitySliderProps {
  className?: string;
}

export const QualitySlider: React.FC<QualitySliderProps> = ({ className = '' }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [currentPreset, setCurrentPreset] = useState<any | null>(null); // FIXED: PerformancePreset doesn't exist
  const [availablePresets, setAvailablePresets] = useState<any[]>([]); // FIXED: PerformancePreset doesn't exist
  const [performanceMetrics, setPerformanceMetrics] = useState({
    currentFPS: 60,
    averageFPS: 60,
    frameDrops: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoAdjustment, setAutoAdjustment] = useState(true);

  useEffect(() => {
    // Initialize component
    const initializeComponent = async () => {
      try {
        // Wait for environment detection
        const info = await environmentDetector.waitForDetection();
        setSystemInfo(info);

        // Get current settings
        const preset = adaptivePerformanceManager.getCurrentPreset();
        setCurrentPreset(preset);

        // Get available presets
        const presets = adaptivePerformanceManager.getAvailablePresets();
        setAvailablePresets(presets);

        // Get current performance metrics
        const metrics = adaptivePerformanceManager.getPerformanceMetrics();
        setPerformanceMetrics(metrics);

        // Listen for performance updates
        const handlePerformanceUpdate = () => {
          const newMetrics = adaptivePerformanceManager.getPerformanceMetrics();
          setPerformanceMetrics(newMetrics);
        };

        // Listen for settings changes
        const handleSettingsChange = (event: CustomEvent) => {
          const { preset } = event.detail;
          setCurrentPreset(preset);
        };

        window.addEventListener('performanceSettingsChanged', handleSettingsChange as EventListener);
        
        // Update performance metrics periodically
        const interval = setInterval(handlePerformanceUpdate, 1000);
        
        return () => {
          window.removeEventListener('performanceSettingsChanged', handleSettingsChange as EventListener);
          clearInterval(interval);
        };

      } catch (error) {
        console.error('❌ QualitySlider: Failed to initialize', error);
      }
    };

    initializeComponent();
  }, []);

  const handlePresetChange = (presetName: string) => {
    adaptivePerformanceManager.applyPreset(presetName);
    const preset = adaptivePerformanceManager.getCurrentPreset();
    setCurrentPreset(preset);
  };

  const handleAutoAdjustmentToggle = (enabled: boolean) => {
    setAutoAdjustment(enabled);
    adaptivePerformanceManager.setAutoAdjustment(enabled);
  };

  const handleCustomOverride = (key: string, value: any) => { // FIXED: PerformancePreset doesn't exist
    adaptivePerformanceManager.setUserOverride({ [key]: value });
    const preset = adaptivePerformanceManager.getCurrentPreset();
    setCurrentPreset(preset);
  };

  const getPerformanceColor = (fps: number): string => {
    if (fps >= 55) return '#4ade80'; // Green
    if (fps >= 30) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  const getDeviceTierColor = (tier: string): string => {
    switch (tier) {
      case 'ultra': return '#8b5cf6'; // Purple
      case 'high': return '#06b6d4'; // Cyan
      case 'medium': return '#10b981'; // Emerald
      case 'low': return '#f59e0b'; // Amber
      default: return '#6b7280'; // Gray
    }
  };

  if (!systemInfo || !currentPreset) {
    return (
      <div className={`quality-slider-loading ${className}`}>
        <div className="loading-spinner"></div>
        <span>Detecting system capabilities...</span>
      </div>
    );
  }

  return (
    <div className={`quality-slider ${className}`}>
      {/* Header */}
      <div className="quality-header">
        <h3>🎯 Performance Settings</h3>
        <div className="system-info">
          <span className="device-tier" style={{ color: getDeviceTierColor(systemInfo.deviceTier) }}>
            {systemInfo.deviceTier.toUpperCase()} Device
          </span>
          <span className="performance-score">
            Score: {environmentDetector.getPerformanceScore()}/100
          </span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <div className="metric">
          <span className="metric-label">FPS:</span>
          <span className="metric-value" style={{ color: getPerformanceColor(performanceMetrics.currentFPS) }}>
            {Math.round(performanceMetrics.currentFPS)}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Avg:</span>
          <span className="metric-value" style={{ color: getPerformanceColor(performanceMetrics.averageFPS) }}>
            {Math.round(performanceMetrics.averageFPS)}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Drops:</span>
          <span className="metric-value" style={{ color: performanceMetrics.frameDrops > 5 ? '#ef4444' : '#4ade80' }}>
            {performanceMetrics.frameDrops}
          </span>
        </div>
      </div>

      {/* Preset Selection */}
      <div className="preset-selection">
        <label>Quality Preset:</label>
        <div className="preset-buttons">
          {availablePresets.map((preset) => (
            <button
              key={preset.name.toLowerCase()}
              className={`preset-button ${currentPreset?.name.toLowerCase() === preset.name.toLowerCase() ? 'active' : ''}`}
              onClick={() => handlePresetChange(preset.name.toLowerCase())}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Preset Info */}
      <div className="preset-info">
        <h4>{currentPreset.name}</h4>
        <p>{currentPreset.description}</p>
        <div className="preset-details">
          <div className="detail">
            <span>Resolution:</span>
            <span>{currentPreset.canvasResolution}px</span>
          </div>
          <div className="detail">
            <span>Max FPS:</span>
            <span>{currentPreset.maxFPS}</span>
          </div>
          <div className="detail">
            <span>Texture Quality:</span>
            <span>{currentPreset.textureQuality}</span>
          </div>
          <div className="detail">
            <span>Advanced Features:</span>
            <span>{currentPreset.enableAdvancedFeatures ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* Auto-Adjustment Toggle */}
      <div className="auto-adjustment">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={autoAdjustment}
            onChange={(e) => handleAutoAdjustmentToggle(e.target.checked)}
          />
          <span className="toggle-text">Auto-adjust quality based on performance</span>
        </label>
      </div>

      {/* Advanced Settings */}
      <div className="advanced-settings">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="advanced-content">
            {/* System Information */}
            <div className="system-details">
              <h4>System Information</h4>
              <div className="detail-grid">
                <div className="detail">
                  <span>CPU Cores:</span>
                  <span>{systemInfo.cpuCores}</span>
                </div>
                <div className="detail">
                  <span>Memory:</span>
                  <span>{systemInfo.deviceMemory}GB</span>
                </div>
                <div className="detail">
                  <span>WebGL:</span>
                  <span>{systemInfo.webglVersion}</span>
                </div>
                <div className="detail">
                  <span>Max Texture:</span>
                  <span>{systemInfo.maxTextureSize}px</span>
                </div>
                <div className="detail">
                  <span>GPU:</span>
                  <span>{systemInfo.gpuInfo}</span>
                </div>
                <div className="detail">
                  <span>Connection:</span>
                  <span>{systemInfo.effectiveType}</span>
                </div>
              </div>
            </div>

            {/* Custom Overrides */}
            <div className="custom-overrides">
              <h4>Custom Overrides</h4>
              <div className="override-controls">
                <div className="override-control">
                  <label>Canvas Resolution:</label>
                  <select
                    value={currentPreset.canvasResolution}
                    onChange={(e) => handleCustomOverride('canvasResolution', parseInt(e.target.value))}
                  >
                    <option value={512}>512px (Performance)</option>
                    <option value={1024}>1024px (Balanced)</option>
                    <option value={2048}>2048px (Quality)</option>
                    <option value={4096}>4096px (Ultra)</option>
                  </select>
                </div>
                
                <div className="override-control">
                  <label>Max FPS:</label>
                  <select
                    value={currentPreset.maxFPS}
                    onChange={(e) => handleCustomOverride('maxFPS', parseInt(e.target.value))}
                  >
                    <option value={30}>30 FPS</option>
                    <option value={45}>45 FPS</option>
                    <option value={60}>60 FPS</option>
                    <option value={120}>120 FPS</option>
                  </select>
                </div>

                <div className="override-control">
                  <label>Texture Quality:</label>
                  <select
                    value={currentPreset.textureQuality}
                    onChange={(e) => handleCustomOverride('textureQuality', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
              </div>
              
              <button
                className="reset-overrides"
                onClick={() => {
                  adaptivePerformanceManager.clearUserOverrides();
                  const preset = adaptivePerformanceManager.getCurrentPreset();
                  setCurrentPreset(preset);
                }}
              >
                Reset to Preset Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualitySlider;



