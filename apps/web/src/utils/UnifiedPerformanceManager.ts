/**
 * 🚀 UNIFIED PERFORMANCE MANAGER - ULTIMATE EDITION
 * 
 * Single source of truth for all performance optimization
 * Automatically adjusts settings for ANY device configuration
 * Ensures smooth operation from potato PCs to high-end workstations
 */

interface DeviceCapabilities {
  // Hardware specs
  cpuCores: number;
  deviceMemory: number; // GB
  webglVersion: string;
  maxTextureSize: number;
  maxAnisotropy: number;
  gpuVendor: string;
  gpuRenderer: string;
  
  // Performance indicators
  isLowEnd: boolean;
  isMidRange: boolean;
  isHighEnd: boolean;
  
  // Browser capabilities
  supportsWebGL2: boolean;
  supportsHighDPI: boolean;
  supportsOffscreenCanvas: boolean;
  supportsWebWorkers: boolean;
  supportsImageBitmap: boolean;
  
  // Network
  connectionType: string;
  effectiveType: string;
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
  
  // Merged from PerformanceOptimizer
  anisotropy: number;
  generateMipmaps: boolean;
  minFilter: string;
  magFilter: string;
}

interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  memoryUsage: number;
  memoryUsagePercent: number;
  cpuUsage: number;
  gpuMemory: number;
  lastUpdateTime: number;
}

class UnifiedPerformanceManager {
  private static instance: UnifiedPerformanceManager;
  
  private deviceCapabilities!: DeviceCapabilities;
  private currentPreset: string = 'auto';
  private performanceMetrics!: PerformanceMetrics;
  private performanceHistory: PerformanceMetrics[] = [];
  private presets: Map<string, PerformancePreset> = new Map();
  
  // Throttling (merged from PerformanceOptimizer)
  private lastTextureUpdate = 0;
  private lastCanvasRedraw = 0;
  
  // Puff protection (merged from AIPerformanceManager)
  private lastPuffEventAt: number = 0;
  private puffGraceMs = 600; // Grace period after puff updates
  
  // Auto-adjustment settings
  private autoAdjustment = {
    enabled: true,
    sensitivity: 0.7,
    minFPSThreshold: 30, // Downgrade if FPS < 30
    maxFPSThreshold: 55, // Upgrade if FPS > 55
    adjustmentCooldown: 5000, // 5 seconds between adjustments
    lastAdjustment: 0,
    degradationCount: 0, // Track consecutive poor performance
    improvementCount: 0  // Track consecutive good performance
  };
  
  // Performance monitoring
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private lastRealFrameTime = 0;
  
  // Memory tracking
  private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastMemoryCleanup = 0;
  private memoryCleanupCooldown = 10000; // 10 seconds between cleanups
  
  private constructor() {
    this.initializePresets();
    this.detectDeviceCapabilities();
    this.initializeMetrics();
    this.startMonitoring();
    this.startMemoryMonitoring();
    this.applyOptimalPreset();
    this.setupPuffProtection();
    
    console.log('🚀 UnifiedPerformanceManager initialized', {
      deviceTier: this.getDeviceTier(),
      selectedPreset: this.currentPreset,
      capabilities: this.deviceCapabilities,
      memoryAvailable: this.getMemoryInfo()
    });
    
    // Expose globally for debugging
    (window as any).__performanceManager = this;
  }
  
  public static getInstance(): UnifiedPerformanceManager {
    if (!UnifiedPerformanceManager.instance) {
      UnifiedPerformanceManager.instance = new UnifiedPerformanceManager();
    }
    return UnifiedPerformanceManager.instance;
  }
  
  private setupPuffProtection(): void {
    // Listen for puff updates to establish grace period
    window.addEventListener('puff-updated', () => {
      this.lastPuffEventAt = Date.now();
      console.log('☁️ Puff update detected - grace period active for', this.puffGraceMs, 'ms');
    });
  }
  
  private withinPuffGrace(): boolean {
    if (!this.lastPuffEventAt) return false;
    const dt = Date.now() - this.lastPuffEventAt;
    return dt >= 0 && dt < this.puffGraceMs;
  }
  
  private initializePresets(): void {
    // Ultra Low - For very old/weak devices (< 2GB RAM, 1-2 cores)
    this.presets.set('ultra-low', {
      name: 'Ultra Low',
      description: 'Maximum compatibility for very old devices',
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
      maxTextureUpdatesPerSecond: 4,
      maxCanvasRedrawsPerSecond: 4,
      enableAggressiveOptimizations: true,
      anisotropy: 1,
      generateMipmaps: false,
      minFilter: 'LinearFilter',
      magFilter: 'NearestFilter'
    });
    
    // Low - For budget devices (2-4GB RAM, 2-4 cores)
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
      maxTextureUpdatesPerSecond: 8,
      maxCanvasRedrawsPerSecond: 8,
      enableAggressiveOptimizations: true,
      anisotropy: 1,
      generateMipmaps: false,
      minFilter: 'LinearFilter',
      magFilter: 'LinearFilter'
    });
    
    // Balanced - For mid-range devices (4-8GB RAM, 4-6 cores)
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
      maxTextureUpdatesPerSecond: 12,
      maxCanvasRedrawsPerSecond: 12,
      enableAggressiveOptimizations: false,
      anisotropy: 4,
      generateMipmaps: true,
      minFilter: 'LinearMipmapLinearFilter',
      magFilter: 'LinearFilter'
    });
    
    // High - For high-end devices (8-16GB RAM, 6-8 cores)
    this.presets.set('high', {
      name: 'High',
      description: 'High quality with good performance',
      targetFPS: 60,
      canvasResolution: 1536,
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
      maxTextureUpdatesPerSecond: 16,
      maxCanvasRedrawsPerSecond: 16,
      enableAggressiveOptimizations: false,
      anisotropy: 8,
      generateMipmaps: true,
      minFilter: 'LinearMipmapLinearFilter',
      magFilter: 'LinearFilter'
    });
    
    // Ultra - For top-tier devices (16GB+ RAM, 8+ cores)
    this.presets.set('ultra', {
      name: 'Ultra',
      description: 'Maximum quality for high-end devices',
      targetFPS: 60,
      canvasResolution: 2048,
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
      maxTextureUpdatesPerSecond: 30,
      maxCanvasRedrawsPerSecond: 30,
      enableAggressiveOptimizations: false,
      anisotropy: 16,
      generateMipmaps: true,
      minFilter: 'LinearMipmapLinearFilter',
      magFilter: 'LinearFilter'
    });
  }
  
  private detectDeviceCapabilities(): void {
    // Get device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory || 4;
    
    // Get CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4;
    
    // Get network info
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = connection?.type || 'unknown';
    const effectiveType = connection?.effectiveType || '4g';
    
    // Get WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    let webglVersion = '1.0';
    let maxTextureSize = 1024;
    let maxAnisotropy = 0;
    let gpuVendor = 'unknown';
    let gpuRenderer = 'unknown';
    
    if (gl) {
      try {
        webglVersion = gl.getParameter(gl.VERSION).includes('WebGL 2.0') ? '2.0' : '1.0';
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        gpuVendor = gl.getParameter(gl.VENDOR) || 'unknown';
        gpuRenderer = gl.getParameter(gl.RENDERER) || 'unknown';
        
        // Get anisotropic filtering support
        const anisotropyExt = gl.getExtension('EXT_texture_filter_anisotropic') || 
                             gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
                             gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
        
        if (anisotropyExt) {
          maxAnisotropy = gl.getParameter(anisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 0;
        }
      } catch (error) {
        console.warn('WebGL parameter detection failed:', error);
        webglVersion = '1.0';
        maxTextureSize = 1024;
        maxAnisotropy = 0;
      }
    }
    
    // Determine device tier based on multiple factors
    const isLowEnd = deviceMemory <= 2 || cpuCores <= 2 || maxTextureSize <= 1024;
    const isMidRange = (deviceMemory > 2 && deviceMemory <= 6) || (cpuCores > 2 && cpuCores <= 4) || (maxTextureSize > 1024 && maxTextureSize <= 2048);
    const isHighEnd = deviceMemory >= 8 && cpuCores >= 6 && maxTextureSize >= 4096;
    
    this.deviceCapabilities = {
      cpuCores,
      deviceMemory,
      webglVersion,
      maxTextureSize,
      maxAnisotropy,
      gpuVendor,
      gpuRenderer,
      isLowEnd,
      isMidRange,
      isHighEnd,
      supportsWebGL2: webglVersion === '2.0',
      supportsHighDPI: window.devicePixelRatio > 1,
      supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      supportsWebWorkers: typeof Worker !== 'undefined',
      supportsImageBitmap: typeof createImageBitmap !== 'undefined',
      connectionType,
      effectiveType
    };
    
    console.log('🔍 Device capabilities detected:', this.deviceCapabilities);
  }
  
  private initializeMetrics(): void {
    this.performanceMetrics = {
      currentFPS: 60,
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      frameDrops: 0,
      memoryUsage: 0,
      memoryUsagePercent: 0,
      cpuUsage: 0,
      gpuMemory: 0,
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
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performancePresetChanged', {
        detail: { 
          preset: this.currentPreset, 
          settings: preset,
          deviceCapabilities: this.deviceCapabilities
        }
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
  
  private startMemoryMonitoring(): void {
    if (this.memoryCheckInterval) return;
    
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Record actual frame time from useFrame hook
   * This should be called every frame for accurate FPS tracking
   */
  public recordFrameTime(deltaMs: number): void {
    this.frameTimes.push(deltaMs);
    
    // Keep only last 120 frame times (2 seconds at 60fps)
    if (this.frameTimes.length > 120) {
      this.frameTimes.shift();
    }
    
    this.lastRealFrameTime = deltaMs;
    this.frameCount++;
  }
  
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    
    // Calculate FPS from actual frame times if available
    if (this.frameTimes.length > 0) {
      const recentFrameTimes = this.frameTimes.slice(-60); // Last 60 frames (1 second)
      const avgFrameTime = recentFrameTimes.reduce((sum, time) => sum + time, 0) / recentFrameTimes.length;
      this.performanceMetrics.currentFPS = Math.min(120, 1000 / avgFrameTime);
      
      // Track min/max FPS
      const fps = recentFrameTimes.map(t => 1000 / t);
      this.performanceMetrics.minFPS = Math.min(...fps);
      this.performanceMetrics.maxFPS = Math.max(...fps);
      
      // Count frame drops (frames taking >33ms = <30fps)
      this.performanceMetrics.frameDrops = recentFrameTimes.filter(t => t > 33).length;
    }
    
    this.performanceMetrics.averageFPS = this.calculateAverageFPS();
    this.performanceMetrics.memoryUsage = this.getMemoryUsage();
    this.performanceMetrics.memoryUsagePercent = this.getMemoryUsagePercent();
    this.performanceMetrics.lastUpdateTime = now;
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
    
    const { currentFPS, averageFPS } = this.performanceMetrics;
    const { minFPSThreshold, maxFPSThreshold } = this.autoAdjustment;
    
    // Use currentFPS if available (more accurate), fallback to averageFPS
    const fpsToCheck = currentFPS > 0 ? currentFPS : averageFPS;
    
    // Performance is too low - downgrade preset
    if (fpsToCheck < minFPSThreshold && fpsToCheck > 0) {
      this.autoAdjustment.degradationCount++;
      this.autoAdjustment.improvementCount = 0;
      
      // Only downgrade after 2 consecutive poor performance checks
      if (this.autoAdjustment.degradationCount >= 2) {
        console.log(`📉 Performance low (${fpsToCheck.toFixed(1)} FPS < ${minFPSThreshold}), downgrading preset`);
        this.downgradePreset();
        this.autoAdjustment.lastAdjustment = now;
        this.autoAdjustment.degradationCount = 0;
      }
    }
    // Performance is good - consider upgrading preset
    else if (averageFPS > maxFPSThreshold && averageFPS > 0) {
      this.autoAdjustment.improvementCount++;
      this.autoAdjustment.degradationCount = 0;
      
      // Only upgrade after 3 consecutive good performance checks (conservative)
      if (this.autoAdjustment.improvementCount >= 3) {
        console.log(`📈 Performance good (${averageFPS.toFixed(1)} FPS > ${maxFPSThreshold}), upgrading preset`);
        this.upgradePreset();
        this.autoAdjustment.lastAdjustment = now;
        this.autoAdjustment.improvementCount = 0;
      }
    }
    // Performance is stable
    else {
      this.autoAdjustment.degradationCount = 0;
      this.autoAdjustment.improvementCount = 0;
    }
  }
  
  private checkMemoryPressure(): void {
    const memoryPercent = this.getMemoryUsagePercent();
    
    // Critical memory pressure (>95%)
    if (memoryPercent > 0.95) {
      console.warn('🚨 CRITICAL memory pressure:', (memoryPercent * 100).toFixed(1), '%');
      this.emergencyMemoryCleanup();
    }
    // High memory pressure (>85%)
    else if (memoryPercent > 0.85) {
      console.warn('⚠️ High memory pressure:', (memoryPercent * 100).toFixed(1), '%');
      this.triggerMemoryCleanup();
    }
    // Moderate memory pressure (>75%)
    else if (memoryPercent > 0.75) {
      console.log('📊 Moderate memory usage:', (memoryPercent * 100).toFixed(1), '%');
      this.lightMemoryCleanup();
    }
  }
  
  private downgradePreset(): void {
    const presetOrder = ['ultra', 'high', 'balanced', 'low', 'ultra-low'];
    const currentIndex = presetOrder.indexOf(this.currentPreset);
    
    if (currentIndex < presetOrder.length - 1) {
      const newPreset = presetOrder[currentIndex + 1];
      console.log('📉 Auto-downgrading performance preset:', this.currentPreset, '->', newPreset);
      this.setPreset(newPreset);
    } else {
      console.warn('⚠️ Already at lowest preset, cannot downgrade further');
    }
  }
  
  private upgradePreset(): void {
    const presetOrder = ['ultra-low', 'low', 'balanced', 'high', 'ultra'];
    const currentIndex = presetOrder.indexOf(this.currentPreset);
    
    if (currentIndex > 0) {
      const newPreset = presetOrder[currentIndex - 1];
      console.log('📈 Auto-upgrading performance preset:', this.currentPreset, '->', newPreset);
      this.setPreset(newPreset);
    } else {
      console.log('✅ Already at highest preset');
    }
  }
  
  // ===== THROTTLING METHODS (Merged from PerformanceOptimizer) =====
  
  /**
   * Throttle texture updates based on current preset
   */
  public canUpdateTexture(): boolean {
    const now = Date.now();
    const preset = this.getCurrentPreset();
    const minInterval = 1000 / preset.maxTextureUpdatesPerSecond;
    
    if (now - this.lastTextureUpdate >= minInterval) {
      this.lastTextureUpdate = now;
      return true;
    }
    return false;
  }
  
  /**
   * Throttle canvas redraws based on current preset
   */
  public canRedrawCanvas(): boolean {
    const now = Date.now();
    const preset = this.getCurrentPreset();
    const minInterval = 1000 / preset.maxCanvasRedrawsPerSecond;
    
    if (now - this.lastCanvasRedraw >= minInterval) {
      this.lastCanvasRedraw = now;
      return true;
    }
    return false;
  }
  
  /**
   * Check if aggressive optimizations should be enabled
   */
  public shouldUseAggressiveOptimizations(): boolean {
    const preset = this.getCurrentPreset();
    return preset.enableAggressiveOptimizations || 
           this.performanceMetrics.currentFPS < preset.targetFPS * 0.9;
  }
  
  // ===== MEMORY MANAGEMENT =====
  
  public getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }
  
  public getMemoryUsagePercent(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.jsHeapSizeLimit > 0) {
        return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }
    }
    return 0;
  }
  
  public getMemoryInfo(): { used: number; total: number; limit: number; percent: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;
      const percent = limit > 0 ? used / limit : 0;
      
      return { used, total, limit, percent };
    }
    return { used: 0, total: 0, limit: 0, percent: 0 };
  }
  
  private lightMemoryCleanup(): void {
    console.log('🧹 Light memory cleanup');
    
    // Clear old performance history
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-25);
    }
    
    // Clear old frame times
    if (this.frameTimes.length > 60) {
      this.frameTimes = this.frameTimes.slice(-30);
    }
  }
  
  public triggerMemoryCleanup(): void {
    const now = Date.now();
    if (now - this.lastMemoryCleanup < this.memoryCleanupCooldown) {
      console.log('⏳ Memory cleanup on cooldown');
      return;
    }
    
    console.log('🧹 Triggering memory cleanup...');
    this.lastMemoryCleanup = now;
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
    }
    
    // Clear performance history
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-25);
    }
    
    // Clear frame time history
    if (this.frameTimes.length > 60) {
      this.frameTimes = this.frameTimes.slice(-30);
    }
    
    // Dispatch cleanup event (respecting puff grace period)
    if (!this.withinPuffGrace()) {
      window.dispatchEvent(new CustomEvent('clearTextureCache', { 
        detail: { preservePuff: false } 
      }));
      console.log('🧹 Texture cache cleared');
    } else {
      console.log('☁️ Puff grace period active - preserving puff textures');
    }
    
    console.log('✅ Memory cleanup completed');
  }
  
  private emergencyMemoryCleanup(): void {
    console.warn('🚨 EMERGENCY memory cleanup triggered!');
    
    // Force garbage collection
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Clear all history
    this.performanceHistory = [];
    this.frameTimes = [];
    
    // Downgrade preset immediately
    this.downgradePreset();
    
    // Dispatch emergency cleanup event (even during puff grace, but preserve puff)
    window.dispatchEvent(new CustomEvent('emergencyMemoryCleanup', {
      detail: { preservePuff: this.withinPuffGrace() }
    }));
    
    console.warn('🚨 Emergency cleanup completed');
  }
  
  // ===== PUBLIC API =====
  
  public getCurrentPreset(): PerformancePreset {
    return this.presets.get(this.currentPreset) || this.presets.get('balanced')!;
  }
  
  public getPresetName(): string {
    return this.currentPreset;
  }
  
  public getAllPresets(): { name: string; preset: PerformancePreset }[] {
    return Array.from(this.presets.entries()).map(([name, preset]) => ({ name, preset }));
  }
  
  public getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }
  
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
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
      colorSpace: 'srgb',
      willReadFrequently: false
    };
  }
  
  public getTextureQualitySettings() {
    const preset = this.getCurrentPreset();
    return {
      generateMipmaps: preset.generateMipmaps,
      anisotropy: Math.min(preset.anisotropy, this.deviceCapabilities.maxAnisotropy || 1),
      minFilter: preset.minFilter,
      magFilter: preset.magFilter
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
  
  public setAutoAdjustmentThresholds(minFPS: number, maxFPS: number): void {
    this.autoAdjustment.minFPSThreshold = minFPS;
    this.autoAdjustment.maxFPSThreshold = maxFPS;
    console.log('🎛️ Auto-adjustment thresholds set:', { minFPS, maxFPS });
  }
  
  /**
   * Get performance report for debugging/display
   */
  public getPerformanceReport(): {
    preset: string;
    deviceTier: string;
    fps: { current: number; average: number; min: number; max: number };
    memory: { used: number; total: number; limit: number; percent: number };
    capabilities: DeviceCapabilities;
    recommendations: string[];
  } {
    const memoryInfo = this.getMemoryInfo();
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (this.performanceMetrics.currentFPS < 30) {
      recommendations.push('Consider switching to a lower quality preset');
    }
    if (memoryInfo.percent > 0.8) {
      recommendations.push('High memory usage - consider reducing layer count');
    }
    if (this.performanceMetrics.frameDrops > 10) {
      recommendations.push('Frequent frame drops detected - enable aggressive optimizations');
    }
    if (!this.autoAdjustment.enabled) {
      recommendations.push('Enable auto-adjustment for optimal performance');
    }
    
    return {
      preset: this.currentPreset,
      deviceTier: this.getDeviceTier(),
      fps: {
        current: this.performanceMetrics.currentFPS,
        average: this.performanceMetrics.averageFPS,
        min: this.performanceMetrics.minFPS,
        max: this.performanceMetrics.maxFPS
      },
      memory: memoryInfo,
      capabilities: this.deviceCapabilities,
      recommendations
    };
  }
  
  /**
   * Force a specific preset (user override)
   */
  public forcePreset(presetName: 'ultra-low' | 'low' | 'balanced' | 'high' | 'ultra'): void {
    // Disable auto-adjustment when user forces a preset
    this.autoAdjustment.enabled = false;
    this.setPreset(presetName);
    console.log('👤 User forced preset:', presetName, '- Auto-adjustment disabled');
  }
  
  /**
   * Reset to automatic preset selection
   */
  public resetToAuto(): void {
    this.autoAdjustment.enabled = true;
    this.autoAdjustment.degradationCount = 0;
    this.autoAdjustment.improvementCount = 0;
    this.applyOptimalPreset();
    console.log('🔄 Reset to automatic preset selection');
  }
  
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

// Export singleton instance
export const unifiedPerformanceManager = UnifiedPerformanceManager.getInstance();
export default unifiedPerformanceManager;

// Export types for external use
export type { DeviceCapabilities, PerformancePreset, PerformanceMetrics };
