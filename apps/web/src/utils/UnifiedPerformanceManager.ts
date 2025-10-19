/**
 * 🚀 UNIFIED PERFORMANCE MANAGER
 * 
 * Intelligent performance management that automatically adjusts settings
 * based on real device capabilities and user behavior
 */

interface DeviceCapabilities {
  // Hardware specs
  cpuCores: number;
  deviceMemory: number; // GB
  webglVersion: string;
  maxTextureSize: number;
  maxAnisotropy: number;
  
  // Performance indicators
  isLowEnd: boolean;
  isMidRange: boolean;
  isHighEnd: boolean;
  
  // Browser capabilities
  supportsWebGL2: boolean;
  supportsHighDPI: boolean;
  supportsOffscreenCanvas: boolean;
  supportsWebWorkers: boolean;
}

interface PerformancePreset {
  name: string;
  description: string;
  targetFPS: number;
  canvasResolution: number;
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  enableAdvancedFeatures: boolean;
  enableShadows: boolean;
  enableReflections: boolean;
  enableDisplacementMaps: boolean;
  enableNormalMaps: boolean;
  maxLayers: number;
  maxTextElements: number;
  maxShapeElements: number;
  enableCanvasPooling: boolean;
  enableTextureCompression: boolean;
  enableLOD: boolean;
  enableRealTimeUpdates: boolean;
  enableHighQualityRendering: boolean;
  maxTextureUpdatesPerSecond: number;
  maxCanvasRedrawsPerSecond: number;
  enableAggressiveOptimizations: boolean;
}

interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  frameDrops: number;
  memoryUsage: number;
  cpuUsage: number;
  lastUpdateTime: number;
}

class UnifiedPerformanceManager {
  private static instance: UnifiedPerformanceManager;
  
  private deviceCapabilities!: DeviceCapabilities; // FIXED: Add definite assignment assertion
  private currentPreset: string = 'auto';
  private performanceMetrics!: PerformanceMetrics; // FIXED: Add definite assignment assertion
  private performanceHistory: PerformanceMetrics[] = [];
  private presets: Map<string, PerformancePreset> = new Map();
  
  // Auto-adjustment settings
  private autoAdjustment = {
    enabled: false, // DISABLED: Too aggressive, causing performance issues
    sensitivity: 0.7,
    minFPSThreshold: 25,
    maxFPSThreshold: 55,
    adjustmentCooldown: 3000, // 3 seconds
    lastAdjustment: 0
  };
  
  // Performance monitoring
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  
  private constructor() {
    this.initializePresets();
    this.detectDeviceCapabilities();
    this.initializeMetrics();
    this.startMonitoring();
    this.applyOptimalPreset();
    
    console.log('🚀 UnifiedPerformanceManager initialized', {
      deviceTier: this.getDeviceTier(),
      selectedPreset: this.currentPreset,
      capabilities: this.deviceCapabilities
    });
  }
  
  public static getInstance(): UnifiedPerformanceManager {
    if (!UnifiedPerformanceManager.instance) {
      UnifiedPerformanceManager.instance = new UnifiedPerformanceManager();
    }
    return UnifiedPerformanceManager.instance;
  }
  
  private initializePresets(): void {
    // Ultra Low - For very old devices
    this.presets.set('ultra-low', {
      name: 'Ultra Low',
      description: 'Maximum compatibility, minimum quality',
      targetFPS: 30,
      canvasResolution: 512,
      textureQuality: 'low',
      enableAdvancedFeatures: false,
      enableShadows: false,
      enableReflections: false,
      enableDisplacementMaps: false,
      enableNormalMaps: false,
      maxLayers: 5,
      maxTextElements: 10,
      maxShapeElements: 8,
      enableCanvasPooling: true,
      enableTextureCompression: true,
      enableLOD: true,
      enableRealTimeUpdates: false,
      enableHighQualityRendering: false,
      maxTextureUpdatesPerSecond: 8,
      maxCanvasRedrawsPerSecond: 8,
      enableAggressiveOptimizations: true
    });
    
    // Low - For low-end devices
    this.presets.set('low', {
      name: 'Low',
      description: 'Smooth performance on budget devices',
      targetFPS: 45,
      canvasResolution: 768,
      textureQuality: 'low',
      enableAdvancedFeatures: false,
      enableShadows: false,
      enableReflections: false,
      enableDisplacementMaps: false,
      enableNormalMaps: false,
      maxLayers: 10,
      maxTextElements: 20,
      maxShapeElements: 15,
      enableCanvasPooling: true,
      enableTextureCompression: true,
      enableLOD: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: false,
      maxTextureUpdatesPerSecond: 12,
      maxCanvasRedrawsPerSecond: 12,
      enableAggressiveOptimizations: true
    });
    
    // Balanced - For mid-range devices
    this.presets.set('balanced', {
      name: 'Balanced',
      description: 'Good balance of performance and quality',
      targetFPS: 60,
      canvasResolution: 1024,
      textureQuality: 'medium',
      enableAdvancedFeatures: true,
      enableShadows: false,
      enableReflections: false,
      enableDisplacementMaps: true,
      enableNormalMaps: false,
      maxLayers: 20,
      maxTextElements: 50,
      maxShapeElements: 30,
      enableCanvasPooling: true,
      enableTextureCompression: true,
      enableLOD: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: false,
      maxTextureUpdatesPerSecond: 12, // Increased from 8 for better responsiveness
      maxCanvasRedrawsPerSecond: 12, // Increased from 8 for better responsiveness
      enableAggressiveOptimizations: false
    });
    
    // High - For high-end devices
    this.presets.set('high', {
      name: 'High',
      description: 'High quality with good performance',
      targetFPS: 60,
      canvasResolution: 1536, // Reduced from 2048 for better performance
      textureQuality: 'high',
      enableAdvancedFeatures: true,
      enableShadows: true,
      enableReflections: false,
      enableDisplacementMaps: true,
      enableNormalMaps: true,
      maxLayers: 50,
      maxTextElements: 100,
      maxShapeElements: 75,
      enableCanvasPooling: true,
      enableTextureCompression: false,
      enableLOD: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: true,
      maxTextureUpdatesPerSecond: 8, // Increased from 4 for better responsiveness
      maxCanvasRedrawsPerSecond: 8, // Increased from 4 for better responsiveness
      enableAggressiveOptimizations: false
    });
    
    // Ultra - For top-tier devices only
    this.presets.set('ultra', {
      name: 'Ultra',
      description: 'Maximum quality for high-end devices',
      targetFPS: 45,
      canvasResolution: 4096,
      textureQuality: 'ultra',
      enableAdvancedFeatures: true,
      enableShadows: true,
      enableReflections: true,
      enableDisplacementMaps: true,
      enableNormalMaps: true,
      maxLayers: 100,
      maxTextElements: 200,
      maxShapeElements: 150,
      enableCanvasPooling: false,
      enableTextureCompression: false,
      enableLOD: false,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: true,
      maxTextureUpdatesPerSecond: 2,
      maxCanvasRedrawsPerSecond: 2,
      enableAggressiveOptimizations: false
    });
  }
  
  private detectDeviceCapabilities(): void {
    // Get device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory || 4;
    
    // Get CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4;
    
    // Get WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    let webglVersion = '1.0';
    let maxTextureSize = 1024;
    let maxAnisotropy = 0;
    
    if (gl) {
      try {
        webglVersion = gl.getParameter(gl.VERSION).includes('WebGL 2.0') ? '2.0' : '1.0';
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        // Safely get anisotropy - this extension might not be available
        const anisotropyExt = gl.getExtension('EXT_texture_filter_anisotropic') || 
                             gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
                             gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
        
        if (anisotropyExt) {
          maxAnisotropy = gl.getParameter(anisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 0;
        }
      } catch (error) {
        console.warn('WebGL parameter detection failed:', error);
        // Fallback values
        webglVersion = '1.0';
        maxTextureSize = 1024;
        maxAnisotropy = 0;
      }
    }
    
    // Determine device tier based on multiple factors
    const isLowEnd = deviceMemory <= 2 || cpuCores <= 2 || maxTextureSize <= 1024;
    const isMidRange = deviceMemory <= 4 || cpuCores <= 4 || maxTextureSize <= 2048;
    const isHighEnd = deviceMemory >= 8 && cpuCores >= 6 && maxTextureSize >= 4096;
    
    this.deviceCapabilities = {
      cpuCores,
      deviceMemory,
      webglVersion,
      maxTextureSize,
      maxAnisotropy,
      isLowEnd,
      isMidRange,
      isHighEnd,
      supportsWebGL2: webglVersion === '2.0',
      supportsHighDPI: window.devicePixelRatio > 1,
      supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      supportsWebWorkers: typeof Worker !== 'undefined'
    };
  }
  
  private initializeMetrics(): void {
    this.performanceMetrics = {
      currentFPS: 60,
      averageFPS: 60,
      frameDrops: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastUpdateTime: Date.now()
    };
  }
  
  private getDeviceTier(): 'ultra-low' | 'low' | 'balanced' | 'high' | 'ultra' {
    const { isLowEnd, isMidRange, isHighEnd, deviceMemory, cpuCores, maxTextureSize } = this.deviceCapabilities;
    
    // Ultra low for very constrained devices
    if (deviceMemory <= 1 || cpuCores <= 1 || maxTextureSize <= 512) {
      return 'ultra-low';
    }
    
    // Low for budget devices
    if (isLowEnd) {
      return 'low';
    }
    
    // Balanced for mid-range devices
    if (isMidRange) {
      return 'balanced';
    }
    
    // High for good devices
    if (deviceMemory >= 6 && cpuCores >= 4 && maxTextureSize >= 2048) {
      return 'high';
    }
    
    // Ultra only for top-tier devices
    if (isHighEnd && deviceMemory >= 12 && cpuCores >= 8 && maxTextureSize >= 8192) {
      return 'ultra';
    }
    
    // Default to balanced for unknown devices
    return 'balanced';
  }
  
  private applyOptimalPreset(): void {
    const deviceTier = this.getDeviceTier();
    this.setPreset(deviceTier);
  }
  
  public setPreset(presetName: string): void {
    const preset = this.presets.get(presetName);
    if (!preset) {
      console.warn('⚠️ Unknown preset:', presetName);
      return;
    }
    
    this.currentPreset = presetName;
    
    // Apply preset settings
    this.applyPresetSettings(preset);
    
    console.log('🎯 Performance preset applied:', {
      preset: presetName,
      settings: preset
    });
    
    // Notify other systems
    this.notifyPresetChange(preset);
  }
  
  private applyPresetSettings(preset: PerformancePreset): void {
    // Update canvas resolution
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performancePresetChanged', {
        detail: { preset: this.currentPreset, settings: preset }
      });
      window.dispatchEvent(event);
    }
  }
  
  private notifyPresetChange(preset: PerformancePreset): void {
    // This will be handled by other systems listening to the event
  }
  
  private startMonitoring(): void {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(() => {
      this.updatePerformanceMetrics();
      this.checkForAutoAdjustment();
    }, 1000); // Update every second
  }
  
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    
    if (deltaTime > 0) {
      this.performanceMetrics.currentFPS = 1000 / deltaTime;
      this.performanceMetrics.averageFPS = this.calculateAverageFPS();
      this.performanceMetrics.lastUpdateTime = now;
    }
    
    this.lastFrameTime = now;
    
    // Update performance history
    this.performanceHistory.push({ ...this.performanceMetrics });
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }
  }
  
  private calculateAverageFPS(): number {
    if (this.performanceHistory.length === 0) return 60;
    
    const recentFPS = this.performanceHistory.slice(-10).map(m => m.currentFPS);
    return recentFPS.reduce((sum, fps) => sum + fps, 0) / recentFPS.length;
  }
  
  private checkForAutoAdjustment(): void {
    if (!this.autoAdjustment.enabled) return;
    
    const now = Date.now();
    if (now - this.autoAdjustment.lastAdjustment < this.autoAdjustment.adjustmentCooldown) {
      return;
    }
    
    const { averageFPS } = this.performanceMetrics;
    const { minFPSThreshold, maxFPSThreshold } = this.autoAdjustment;
    
    // Performance is too low - downgrade preset
    if (averageFPS < minFPSThreshold) {
      this.downgradePreset();
      this.autoAdjustment.lastAdjustment = now;
    }
    // Performance is good - consider upgrading preset
    else if (averageFPS > maxFPSThreshold) {
      this.upgradePreset();
      this.autoAdjustment.lastAdjustment = now;
    }
  }
  
  private downgradePreset(): void {
    const presetOrder = ['ultra', 'high', 'balanced', 'low', 'ultra-low'];
    const currentIndex = presetOrder.indexOf(this.currentPreset);
    
    if (currentIndex < presetOrder.length - 1) {
      const newPreset = presetOrder[currentIndex + 1];
      console.log('📉 Auto-downgrading performance preset:', this.currentPreset, '->', newPreset);
      this.setPreset(newPreset);
    }
  }
  
  private upgradePreset(): void {
    const presetOrder = ['ultra-low', 'low', 'balanced', 'high', 'ultra'];
    const currentIndex = presetOrder.indexOf(this.currentPreset);
    
    if (currentIndex > 0) {
      const newPreset = presetOrder[currentIndex - 1];
      console.log('📈 Auto-upgrading performance preset:', this.currentPreset, '->', newPreset);
      this.setPreset(newPreset);
    }
  }
  
  public getCurrentPreset(): PerformancePreset {
    return this.presets.get(this.currentPreset) || this.presets.get('balanced')!;
  }
  
  public getPresetName(): string {
    return this.currentPreset;
  }
  
  public getDeviceCapabilities(): DeviceCapabilities {
    return this.deviceCapabilities;
  }
  
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMetrics;
  }
  
  public getOptimalCanvasSize(): { width: number; height: number } {
    const preset = this.getCurrentPreset();
    return {
      width: preset.canvasResolution,
      height: preset.canvasResolution
    };
  }
  
  public getMaxElements(type: 'text' | 'shape' | 'layer'): number {
    const preset = this.getCurrentPreset();
    
    switch (type) {
      case 'text':
        return preset.maxTextElements;
      case 'shape':
        return preset.maxShapeElements;
      case 'layer':
        return preset.maxLayers;
      default:
        return 50;
    }
  }
  
  public getEffectiveSettings(): PerformancePreset {
    return this.getCurrentPreset();
  }
  
  public getOptimalCanvasContextOptions(): CanvasRenderingContext2DSettings {
    const preset = this.getCurrentPreset();
    
    return {
      alpha: false,
      desynchronized: preset.enableAggressiveOptimizations,
      colorSpace: 'srgb'
    };
  }
  
  public enableAutoAdjustment(enabled: boolean): void {
    this.autoAdjustment.enabled = enabled;
    console.log('🔄 Auto-adjustment', enabled ? 'enabled' : 'disabled');
  }
  
  public setAutoAdjustmentSensitivity(sensitivity: number): void {
    this.autoAdjustment.sensitivity = Math.max(0, Math.min(1, sensitivity));
    console.log('🎛️ Auto-adjustment sensitivity set to:', this.autoAdjustment.sensitivity);
  }
  
  // Memory monitoring and cleanup
  public getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }
  
  public getMemoryInfo(): { used: number; total: number; limit: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }
  
  public triggerMemoryCleanup(): void {
    console.log('🧹 Triggering memory cleanup...');
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Clear performance history if it's getting large
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-25);
    }
    
    console.log('🧹 Memory cleanup completed');
  }
  
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Export singleton instance
export const unifiedPerformanceManager = UnifiedPerformanceManager.getInstance(); // FIXED: Private constructor
export default unifiedPerformanceManager;
