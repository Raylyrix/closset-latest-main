/**
 * 🎯 Performance Dashboard
 * 
 * Real-time performance monitoring and control panel
 * Shows FPS, memory, device info, and allows preset changes
 */

import React, { useState, useEffect } from 'react';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';

interface PerformanceDashboardProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  position = 'top-right',
  compact = false
}) => {
  const [metrics, setMetrics] = useState(unifiedPerformanceManager.getPerformanceMetrics());
  const [preset, setPreset] = useState(unifiedPerformanceManager.getPresetName());
  const [deviceInfo, setDeviceInfo] = useState(unifiedPerformanceManager.getDeviceCapabilities());
  const [showDetailed, setShowDetailed] = useState(!compact);
  const [memoryInfo, setMemoryInfo] = useState(unifiedPerformanceManager.getMemoryInfo());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(unifiedPerformanceManager.getPerformanceMetrics());
      setPreset(unifiedPerformanceManager.getPresetName());
      setMemoryInfo(unifiedPerformanceManager.getMemoryInfo());
    }, 500); // Update twice per second
    
    return () => clearInterval(interval);
  }, []);
  
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10000,
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      padding: compact ? '8px 12px' : '12px 16px',
      borderRadius: '8px',
      fontSize: compact ? '10px' : '12px',
      fontFamily: 'monospace',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      minWidth: compact ? '150px' : '250px'
    };
    
    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: '10px', left: '10px' };
      case 'top-right':
        return { ...baseStyles, top: '10px', right: '10px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '10px', left: '10px' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '10px', right: '10px' };
      default:
        return { ...baseStyles, top: '10px', right: '10px' };
    }
  };
  
  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#00ff00';
    if (fps >= 40) return '#ffff00';
    if (fps >= 25) return '#ff9900';
    return '#ff0000';
  };
  
  const getMemoryColor = (percent: number): string => {
    if (percent < 0.6) return '#00ff00';
    if (percent < 0.75) return '#ffff00';
    if (percent < 0.85) return '#ff9900';
    return '#ff0000';
  };
  
  if (compact) {
    return (
      <div style={getPositionStyles()} onClick={() => setShowDetailed(!showDetailed)}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ color: getFPSColor(metrics.currentFPS), fontWeight: 'bold' }}>
            {metrics.currentFPS.toFixed(0)} FPS
          </span>
          <span style={{ color: getMemoryColor(memoryInfo.percent) }}>
            {(memoryInfo.percent * 100).toFixed(0)}% MEM
          </span>
          <span style={{ fontSize: '8px', color: '#999' }}>
            {preset.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div style={getPositionStyles()}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>⚡ Performance</span>
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          {showDetailed ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {/* FPS Metrics */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Frame Rate</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '20px', color: getFPSColor(metrics.currentFPS), fontWeight: 'bold' }}>
              {metrics.currentFPS.toFixed(1)}
            </div>
            <div style={{ fontSize: '8px', color: '#666' }}>Current FPS</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              {metrics.averageFPS.toFixed(1)}
            </div>
            <div style={{ fontSize: '8px', color: '#666' }}>Avg FPS</div>
          </div>
        </div>
      </div>
      
      {showDetailed && (
        <>
          {/* Memory Usage */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Memory Usage</div>
            <div style={{ 
              height: '8px', 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '4px'
            }}>
              <div style={{
                height: '100%',
                width: `${memoryInfo.percent * 100}%`,
                background: getMemoryColor(memoryInfo.percent),
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: getMemoryColor(memoryInfo.percent) }}>
                {(memoryInfo.used / 1024 / 1024).toFixed(0)} MB
              </span>
              <span style={{ color: '#666' }}>
                / {(memoryInfo.limit / 1024 / 1024).toFixed(0)} MB
              </span>
            </div>
          </div>
          
          {/* Preset Selection */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Quality Preset</div>
            <select
              value={preset}
              onChange={(e) => {
                unifiedPerformanceManager.forcePreset(e.target.value as any);
                setPreset(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <option value="ultra-low">Ultra Low (Potato PC)</option>
              <option value="low">Low (Budget)</option>
              <option value="balanced">Balanced (Recommended)</option>
              <option value="high">High (Gaming PC)</option>
              <option value="ultra">Ultra (Workstation)</option>
            </select>
          </div>
          
          {/* Device Info */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Device Info</div>
            <div style={{ fontSize: '9px', color: '#aaa', lineHeight: '1.4' }}>
              <div>CPU: {deviceInfo.cpuCores} cores</div>
              <div>RAM: {deviceInfo.deviceMemory} GB</div>
              <div>GPU: {deviceInfo.gpuRenderer.substring(0, 30)}</div>
              <div>WebGL: {deviceInfo.webglVersion}</div>
              <div>Max Texture: {deviceInfo.maxTextureSize}px</div>
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                unifiedPerformanceManager.resetToAuto();
                setPreset(unifiedPerformanceManager.getPresetName());
              }}
              style={{
                flex: 1,
                padding: '6px',
                background: 'rgba(0, 150, 255, 0.2)',
                border: '1px solid rgba(0, 150, 255, 0.4)',
                color: '#66B3FF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '9px'
              }}
            >
              🔄 Auto
            </button>
            <button
              onClick={() => unifiedPerformanceManager.triggerMemoryCleanup()}
              style={{
                flex: 1,
                padding: '6px',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.4)',
                color: '#FF6666',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '9px'
              }}
            >
              🧹 Clean
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceDashboard;


