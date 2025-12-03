/**
 * 🎯 Performance Tracking Hook
 * 
 * Automatically tracks FPS and integrates with UnifiedPerformanceManager
 * Use this hook in any React Three Fiber component with useFrame
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { unifiedPerformanceManager } from '../utils/UnifiedPerformanceManager';

export function usePerformanceTracking() {
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  
  // Track frame times automatically
  useFrame(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    // Record frame time in performance manager
    unifiedPerformanceManager.recordFrameTime(delta);
    
    lastFrameTimeRef.current = now;
    frameCountRef.current++;
  });
  
  // Log performance stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = unifiedPerformanceManager.getPerformanceMetrics();
      console.log('📊 Performance Stats:', {
        FPS: metrics.currentFPS.toFixed(1),
        avgFPS: metrics.averageFPS.toFixed(1),
        preset: unifiedPerformanceManager.getPresetName(),
        memory: (metrics.memoryUsagePercent * 100).toFixed(1) + '%'
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    getMetrics: () => unifiedPerformanceManager.getPerformanceMetrics(),
    getPreset: () => unifiedPerformanceManager.getPresetName()
  };
}

/**
 * Performance tracking component for React Three Fiber Canvas
 * Add this as a child of <Canvas> to enable automatic FPS tracking
 */
export function PerformanceTracker() {
  usePerformanceTracking();
  return null; // Invisible component
}


