/**
 * ENVIRONMENT DETECTOR
 * 
 * Intelligent system to detect user's PC environment and configurations
 * Adjusts performance settings automatically based on detected capabilities
 */

interface SystemInfo {
  // Hardware specs
  cpuCores: number;
  deviceMemory: number; // GB
  gpuInfo: string;
  
  // Browser capabilities
  webglVersion: string;
  webglRenderer: string;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  
  // Network info
  connectionType: string;
  effectiveType: string;
  
  // Performance metrics
  canvasPerformance: number; // ms per operation
  webglPerformance: number; // ms per operation
  
  // Device tier classification
  deviceTier: 'low' | 'medium' | 'high' | 'ultra';
  recommendedQuality: 'performance' | 'balanced' | 'quality' | 'ultra';
}

interface PerformancePreset {
  name: string;
  description: string;
  canvasResolution: number;
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  maxFPS: number;
  enableAdvancedFeatures: boolean;
  enableRealTimeUpdates: boolean;
  enableHighQualityRendering: boolean;
  enableDisplacementMaps: boolean;
  enableNormalMaps: boolean;
  enableShadows: boolean;
  enableReflections: boolean;
  maxLayers: number;
  maxTextElements: number;
  maxShapeElements: number;
  enableCanvasPooling: boolean;
  enableTextureCompression: boolean;
  enableLOD: boolean; // Level of Detail
}

class EnvironmentDetector {
  private systemInfo: SystemInfo | null = null;
  private performancePresets: Map<string, PerformancePreset> = new Map();
  private detectionComplete = false;

  constructor() {
    this.initializePresets();
    this.detectEnvironment();
  }

  private initializePresets(): void {
    // Performance preset - optimized for low-end devices
    this.performancePresets.set('performance', {
      name: 'Performance',
      description: 'Optimized for smooth performance on any device',
      canvasResolution: 512,
      textureQuality: 'low',
      maxFPS: 30,
      enableAdvancedFeatures: false,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: false,
      enableDisplacementMaps: false,
      enableNormalMaps: false,
      enableShadows: false,
      enableReflections: false,
      maxLayers: 10,
      maxTextElements: 20,
      maxShapeElements: 15,
      enableCanvasPooling: true,
      enableTextureCompression: true,
      enableLOD: true
    });

    // Balanced preset - good performance with decent quality
    this.performancePresets.set('balanced', {
      name: 'Balanced',
      description: 'Good balance between performance and quality',
      canvasResolution: 1024,
      textureQuality: 'medium',
      maxFPS: 45,
      enableAdvancedFeatures: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: false,
      enableDisplacementMaps: true,
      enableNormalMaps: false,
      enableShadows: false,
      enableReflections: false,
      maxLayers: 20,
      maxTextElements: 50,
      maxShapeElements: 30,
      enableCanvasPooling: true,
      enableTextureCompression: true,
      enableLOD: true
    });

    // Quality preset - high quality with good performance
    this.performancePresets.set('quality', {
      name: 'Quality',
      description: 'High quality rendering with optimized performance',
      canvasResolution: 2048,
      textureQuality: 'high',
      maxFPS: 60,
      enableAdvancedFeatures: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: true,
      enableDisplacementMaps: true,
      enableNormalMaps: true,
      enableShadows: true,
      enableReflections: false,
      maxLayers: 50,
      maxTextElements: 100,
      maxShapeElements: 50,
      enableCanvasPooling: true,
      enableTextureCompression: false,
      enableLOD: false
    });

    // Ultra preset - maximum quality
    this.performancePresets.set('ultra', {
      name: 'Ultra',
      description: 'Maximum quality for high-end devices',
      canvasResolution: 4096,
      textureQuality: 'ultra',
      maxFPS: 120,
      enableAdvancedFeatures: true,
      enableRealTimeUpdates: true,
      enableHighQualityRendering: true,
      enableDisplacementMaps: true,
      enableNormalMaps: true,
      enableShadows: true,
      enableReflections: true,
      maxLayers: 100,
      maxTextElements: 200,
      maxShapeElements: 100,
      enableCanvasPooling: true,
      enableTextureCompression: false,
      enableLOD: false
    });
  }

  private async detectEnvironment(): Promise<void> {
    try {
      console.log('🔍 EnvironmentDetector: Starting environment detection...');
      
      const systemInfo: SystemInfo = {
        // Hardware detection
        cpuCores: navigator.hardwareConcurrency || 4,
        deviceMemory: (navigator as any).deviceMemory || 4,
        gpuInfo: await this.detectGPUInfo(),
        
        // WebGL capabilities
        webglVersion: this.detectWebGLVersion(),
        webglRenderer: this.detectWebGLRenderer(),
        maxTextureSize: this.detectMaxTextureSize(),
        maxRenderbufferSize: this.detectMaxRenderbufferSize(),
        
        // Network info
        connectionType: this.detectConnectionType(),
        effectiveType: this.detectEffectiveType(),
        
        // Performance metrics (will be calculated)
        canvasPerformance: 0,
        webglPerformance: 0,
        
        // Device tier (will be calculated)
        deviceTier: 'medium',
        recommendedQuality: 'balanced'
      };

      // Calculate performance metrics
      systemInfo.canvasPerformance = await this.benchmarkCanvasPerformance();
      systemInfo.webglPerformance = await this.benchmarkWebGLPerformance();

      // Determine device tier
      systemInfo.deviceTier = this.calculateDeviceTier(systemInfo);
      systemInfo.recommendedQuality = this.calculateRecommendedQuality(systemInfo);

      this.systemInfo = systemInfo;
      this.detectionComplete = true;

      console.log('✅ EnvironmentDetector: Detection complete', {
        deviceTier: systemInfo.deviceTier,
        recommendedQuality: systemInfo.recommendedQuality,
        cpuCores: systemInfo.cpuCores,
        deviceMemory: systemInfo.deviceMemory,
        webglVersion: systemInfo.webglVersion
      });

    } catch (error) {
      console.error('❌ EnvironmentDetector: Detection failed', error);
      // Fallback to medium tier
      this.systemInfo = {
        cpuCores: 4,
        deviceMemory: 4,
        gpuInfo: 'Unknown',
        webglVersion: '1.0',
        webglRenderer: 'Unknown',
        maxTextureSize: 1024,
        maxRenderbufferSize: 1024,
        connectionType: 'unknown',
        effectiveType: '4g',
        canvasPerformance: 16,
        webglPerformance: 16,
        deviceTier: 'medium',
        recommendedQuality: 'balanced'
      };
      this.detectionComplete = true;
    }
  }

  private async detectGPUInfo(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info'); // FIXED: WebGL context type
        if (debugInfo) {
          return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU'; // FIXED: WebGL context type
        }
      }
      return 'Unknown GPU';
    } catch {
      return 'Unknown GPU';
    }
  }

  private detectWebGLVersion(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') ? '2.0' : 
                 canvas.getContext('webgl') ? '1.0' : 'Not supported';
      return gl;
    } catch {
      return 'Not supported';
    }
  }

  private detectWebGLRenderer(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info'); // FIXED: WebGL context type
        if (debugInfo) {
          return (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown'; // FIXED: WebGL context type
        }
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private detectMaxTextureSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        return (gl as any).getParameter((gl as any).MAX_TEXTURE_SIZE) || 1024; // FIXED: WebGL context type
      }
      return 1024;
    } catch {
      return 1024;
    }
  }

  private detectMaxRenderbufferSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        return (gl as any).getParameter((gl as any).MAX_RENDERBUFFER_SIZE) || 1024; // FIXED: WebGL context type
      }
      return 1024;
    } catch {
      return 1024;
    }
  }

  private detectConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.type || 'unknown';
  }

  private detectEffectiveType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || '4g';
  }

  private async benchmarkCanvasPerformance(): Promise<number> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      const startTime = performance.now();
      
      // Perform a series of canvas operations
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `hsl(${i * 3.6}, 50%, 50%)`;
        ctx.fillRect(i * 5, i * 5, 10, 10);
        ctx.strokeStyle = `hsl(${i * 3.6}, 70%, 30%)`;
        ctx.strokeRect(i * 5, i * 5, 10, 10);
      }

      const endTime = performance.now();
      return endTime - startTime;
    } catch {
      return 16; // Default fallback
    }
  }

  private async benchmarkWebGLPerformance(): Promise<number> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 16;

      const startTime = performance.now();
      
      // Perform a series of WebGL operations
      for (let i = 0; i < 50; i++) {
        (gl as any).clearColor(i / 50, 0.5, 0.5, 1.0); // FIXED: WebGL context type
        (gl as any).clear((gl as any).COLOR_BUFFER_BIT); // FIXED: WebGL context type
      }

      const endTime = performance.now();
      return endTime - startTime;
    } catch {
      return 16; // Default fallback
    }
  }

  private calculateDeviceTier(systemInfo: SystemInfo): 'low' | 'medium' | 'high' | 'ultra' {
    let score = 0;

    // CPU cores scoring
    if (systemInfo.cpuCores >= 8) score += 3;
    else if (systemInfo.cpuCores >= 4) score += 2;
    else if (systemInfo.cpuCores >= 2) score += 1;

    // Memory scoring
    if (systemInfo.deviceMemory >= 16) score += 3;
    else if (systemInfo.deviceMemory >= 8) score += 2;
    else if (systemInfo.deviceMemory >= 4) score += 1;

    // WebGL version scoring
    if (systemInfo.webglVersion === '2.0') score += 2;
    else if (systemInfo.webglVersion === '1.0') score += 1;

    // Texture size scoring
    if (systemInfo.maxTextureSize >= 4096) score += 3;
    else if (systemInfo.maxTextureSize >= 2048) score += 2;
    else if (systemInfo.maxTextureSize >= 1024) score += 1;

    // Performance scoring (lower is better)
    if (systemInfo.canvasPerformance < 8) score += 2;
    else if (systemInfo.canvasPerformance < 16) score += 1;

    if (systemInfo.webglPerformance < 8) score += 2;
    else if (systemInfo.webglPerformance < 16) score += 1;

    // Network scoring
    if (systemInfo.effectiveType === '4g') score += 1;

    // Determine tier based on score
    if (score >= 12) return 'ultra';
    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private calculateRecommendedQuality(systemInfo: SystemInfo): 'performance' | 'balanced' | 'quality' | 'ultra' {
    switch (systemInfo.deviceTier) {
      case 'ultra':
        return 'ultra';
      case 'high':
        return 'quality';
      case 'medium':
        return 'balanced';
      case 'low':
        return 'performance';
      default:
        return 'balanced';
    }
  }

  // Public API methods
  public getSystemInfo(): SystemInfo | null {
    return this.systemInfo;
  }

  public isDetectionComplete(): boolean {
    return this.detectionComplete;
  }

  public getRecommendedPreset(): PerformancePreset | null {
    if (!this.systemInfo) return null;
    return this.performancePresets.get(this.systemInfo.recommendedQuality) || null;
  }

  public getPreset(name: string): PerformancePreset | null {
    return this.performancePresets.get(name) || null;
  }

  public getAllPresets(): PerformancePreset[] {
    return Array.from(this.performancePresets.values());
  }

  public getPresetNames(): string[] {
    return Array.from(this.performancePresets.keys());
  }

  public async waitForDetection(): Promise<SystemInfo> {
    return new Promise((resolve) => {
      const checkDetection = () => {
        if (this.detectionComplete && this.systemInfo) {
          resolve(this.systemInfo);
        } else {
          setTimeout(checkDetection, 100);
        }
      };
      checkDetection();
    });
  }

  public getPerformanceScore(): number {
    if (!this.systemInfo) return 50; // Default score

    let score = 0;
    const maxScore = 100;

    // CPU score (25 points max)
    score += Math.min(25, (this.systemInfo.cpuCores / 8) * 25);

    // Memory score (25 points max)
    score += Math.min(25, (this.systemInfo.deviceMemory / 16) * 25);

    // WebGL score (25 points max)
    if (this.systemInfo.webglVersion === '2.0') score += 25;
    else if (this.systemInfo.webglVersion === '1.0') score += 15;

    // Performance score (25 points max)
    const avgPerformance = (this.systemInfo.canvasPerformance + this.systemInfo.webglPerformance) / 2;
    score += Math.min(25, Math.max(0, 25 - avgPerformance));

    return Math.round(Math.min(maxScore, score));
  }
}

// Export singleton instance
export const environmentDetector = new EnvironmentDetector();

// Export types
export type { SystemInfo, PerformancePreset };
export default environmentDetector;



