/**
 * 🧪 Performance Tester
 * 
 * Simulates different device configurations to test performance optimization
 * Useful for testing auto-adjustment and preset selection
 */

import { unifiedPerformanceManager } from './UnifiedPerformanceManager';

export class PerformanceTester {
  /**
   * Simulate low-end device performance
   */
  public static simulateLowEndDevice(): void {
    console.log('🐌 Simulating low-end device (2GB RAM, 2 cores)');
    
    // Override device detection (in a real scenario, this would be automatic)
    const metrics = unifiedPerformanceManager.getPerformanceMetrics();
    
    // Simulate poor performance
    for (let i = 0; i < 10; i++) {
      unifiedPerformanceManager.recordFrameTime(50); // 20 FPS
    }
    
    console.log('📉 Low-end simulation active - should auto-downgrade to "low" preset');
  }
  
  /**
   * Simulate high-end device performance
   */
  public static simulateHighEndDevice(): void {
    console.log('🚀 Simulating high-end device (16GB RAM, 8 cores)');
    
    // Simulate excellent performance
    for (let i = 0; i < 10; i++) {
      unifiedPerformanceManager.recordFrameTime(14); // 70+ FPS
    }
    
    console.log('📈 High-end simulation active - should auto-upgrade to "high" or "ultra" preset');
  }
  
  /**
   * Simulate varying performance
   */
  public static simulateVariablePerformance(): void {
    console.log('📊 Simulating variable performance');
    
    let frameIndex = 0;
    const interval = setInterval(() => {
      // Alternate between good and poor performance
      const frameTime = frameIndex % 2 === 0 ? 16 : 40; // 60 FPS vs 25 FPS
      unifiedPerformanceManager.recordFrameTime(frameTime);
      
      frameIndex++;
      if (frameIndex > 20) {
        clearInterval(interval);
        console.log('📊 Variable performance simulation complete');
      }
    }, 100);
  }
  
  /**
   * Test all presets and measure performance
   */
  public static async testAllPresets(): Promise<void> {
    const presets = ['ultra-low', 'low', 'balanced', 'high', 'ultra'];
    const results: any[] = [];
    
    for (const preset of presets) {
      console.log(`🧪 Testing preset: ${preset}`);
      unifiedPerformanceManager.setPreset(preset);
      
      // Wait for settings to apply
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const metrics = unifiedPerformanceManager.getPerformanceMetrics();
      const settings = unifiedPerformanceManager.getCurrentPreset();
      
      results.push({
        preset,
        settings: {
          canvasResolution: settings.canvasResolution,
          maxTextureUpdatesPerSecond: settings.maxTextureUpdatesPerSecond,
          targetFPS: settings.targetFPS
        },
        metrics: {
          currentFPS: metrics.currentFPS,
          memoryUsage: metrics.memoryUsagePercent
        }
      });
      
      console.log(`✅ ${preset}:`, results[results.length - 1]);
    }
    
    console.table(results);
    return;
  }
  
  /**
   * Stress test memory cleanup
   */
  public static stressTestMemory(): void {
    console.log('🧪 Starting memory stress test');
    
    // Trigger multiple memory cleanups
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        console.log(`🧹 Memory cleanup ${i + 1}/5`);
        unifiedPerformanceManager.triggerMemoryCleanup();
        
        const memoryInfo = unifiedPerformanceManager.getMemoryInfo();
        console.log('📊 Memory after cleanup:', {
          used: (memoryInfo.used / 1024 / 1024).toFixed(1) + ' MB',
          percent: (memoryInfo.percent * 100).toFixed(1) + '%'
        });
      }, i * 3000);
    }
  }
  
  /**
   * Get comprehensive performance report
   */
  public static getReport(): void {
    const report = unifiedPerformanceManager.getPerformanceReport();
    
    console.log('📊 ===== PERFORMANCE REPORT =====');
    console.log('🎯 Current Preset:', report.preset);
    console.log('💻 Device Tier:', report.deviceTier);
    console.log('📈 FPS:', report.fps);
    console.log('🧠 Memory:', report.memory);
    console.log('⚙️ Capabilities:', report.capabilities);
    console.log('💡 Recommendations:', report.recommendations);
    console.log('================================');
    
    return report;
  }
  
  /**
   * Test auto-adjustment system
   */
  public static testAutoAdjustment(): void {
    console.log('🧪 Testing auto-adjustment system');
    
    // Enable auto-adjustment
    unifiedPerformanceManager.enableAutoAdjustment(true);
    
    let phase = 0;
    const interval = setInterval(() => {
      if (phase === 0) {
        // Phase 1: Simulate poor performance
        console.log('Phase 1: Simulating poor performance (15 FPS)');
        for (let i = 0; i < 5; i++) {
          unifiedPerformanceManager.recordFrameTime(66); // ~15 FPS
        }
        phase++;
      } else if (phase === 1) {
        // Phase 2: Wait for adjustment
        console.log('Phase 2: Waiting for auto-downgrade...');
        const currentPreset = unifiedPerformanceManager.getPresetName();
        console.log('Current preset:', currentPreset);
        phase++;
      } else if (phase === 2) {
        // Phase 3: Simulate good performance
        console.log('Phase 3: Simulating good performance (65 FPS)');
        for (let i = 0; i < 5; i++) {
          unifiedPerformanceManager.recordFrameTime(15); // ~65 FPS
        }
        phase++;
      } else if (phase === 3) {
        // Phase 4: Wait for adjustment
        console.log('Phase 4: Waiting for auto-upgrade...');
        const currentPreset = unifiedPerformanceManager.getPresetName();
        console.log('Current preset:', currentPreset);
        phase++;
      } else {
        // Complete
        clearInterval(interval);
        console.log('✅ Auto-adjustment test complete');
        PerformanceTester.getReport();
      }
    }, 6000); // 6 seconds per phase
  }
}

// Expose globally for console testing
if (typeof window !== 'undefined') {
  (window as any).performanceTester = PerformanceTester;
  console.log('🧪 Performance Tester available: window.performanceTester');
  console.log('Commands:');
  console.log('  - performanceTester.simulateLowEndDevice()');
  console.log('  - performanceTester.simulateHighEndDevice()');
  console.log('  - performanceTester.testAllPresets()');
  console.log('  - performanceTester.testAutoAdjustment()');
  console.log('  - performanceTester.getReport()');
}

export default PerformanceTester;


