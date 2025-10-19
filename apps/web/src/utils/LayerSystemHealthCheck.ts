/**
 * 🏥 LAYER SYSTEM HEALTH CHECK
 * 
 * Continuous monitoring and health checking for the layer system.
 * Provides auto-heal capabilities and performance monitoring.
 */

import { LayerSystemValidator, ValidationResult } from './LayerSystemValidator';
import { LayerSystemRollback } from './LayerSystemRollback';

export type HealthStatus = 'healthy' | 'degraded' | 'broken' | 'unknown';

export interface HealthReport {
  status: HealthStatus;
  timestamp: number;
  details: ValidationResult;
  performance: {
    avgLayerCreationTime: number;
    avgOpacityChangeTime: number;
    avgTextureUpdateTime: number;
    memoryUsage: number;
  };
  recommendations: string[];
  autoHealAttempted: boolean;
  autoHealSuccess: boolean;
}

export class LayerSystemHealthCheck {
  private static instance: LayerSystemHealthCheck;
  private healthStatus: HealthStatus = 'unknown';
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // 30 seconds
  private performanceHistory: Array<{
    timestamp: number;
    layerCreationTime: number;
    opacityChangeTime: number;
    textureUpdateTime: number;
  }> = [];
  private maxHistorySize: number = 100;
  private validator: LayerSystemValidator;
  private rollback: LayerSystemRollback;
  private autoHealEnabled: boolean = true;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): LayerSystemHealthCheck {
    if (!LayerSystemHealthCheck.instance) {
      LayerSystemHealthCheck.instance = new LayerSystemHealthCheck();
    }
    return LayerSystemHealthCheck.instance;
  }
  
  constructor() {
    this.validator = LayerSystemValidator.getInstance();
    this.rollback = LayerSystemRollback.getInstance();
  }
  
  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      console.warn('⚠️ Health monitoring already started');
      return;
    }
    
    console.log('🏥 Starting layer system health monitoring...');
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
    
    // Perform initial health check
    this.performHealthCheck();
  }
  
  /**
   * Stop continuous health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as any); // FIXED: Type mismatch
      this.healthCheckInterval = null;
      console.log('🛑 Stopped layer system health monitoring');
    }
  }
  
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthReport> {
    const startTime = performance.now();
    
    try {
      console.log('🔍 Performing layer system health check...');
      
      // Run validation
      const validationResult = await this.validator.validateLayerOperations();
      
      // Determine health status
      this.healthStatus = this.determineHealthStatus(validationResult);
      
      // Update performance history
      this.updatePerformanceHistory(validationResult);
      
      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics();
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(validationResult, performanceMetrics);
      
      const healthReport: HealthReport = {
        status: this.healthStatus,
        timestamp: Date.now(),
        details: validationResult,
        performance: performanceMetrics,
        recommendations,
        autoHealAttempted: false,
        autoHealSuccess: false
      };
      
      this.lastCheck = Date.now();
      
      // Log health status
      const statusEmoji = this.getStatusEmoji(this.healthStatus);
      console.log(`${statusEmoji} Layer system health: ${this.healthStatus}`);
      
      // Auto-heal if needed
      if (this.healthStatus === 'broken' && this.autoHealEnabled) {
        healthReport.autoHealAttempted = true;
        healthReport.autoHealSuccess = await this.autoHeal();
      }
      
      return healthReport;
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.healthStatus = 'broken';
      
      return {
        status: 'broken',
        timestamp: Date.now(),
        details: {
          layerCreation: false,
          layerDeletion: false,
          layerOpacity: false,
          layerVisibility: false,
          textureUpdates: false,
          layerComposition: false,
          errors: [`Health check failed: ${String(error)}`], // FIXED: Error type
          warnings: [],
          performance: { layerCreationTime: 0, opacityChangeTime: 0, textureUpdateTime: 0 }
        },
        performance: {
          avgLayerCreationTime: 0,
          avgOpacityChangeTime: 0,
          avgTextureUpdateTime: 0,
          memoryUsage: 0
        },
        recommendations: ['Immediate manual intervention required'],
        autoHealAttempted: false,
        autoHealSuccess: false
      };
    }
  }
  
  /**
   * Determine health status based on validation results
   */
  private determineHealthStatus(result: ValidationResult): HealthStatus {
    // Check for critical failures
    const criticalFailures = result.errors.length;
    const warnings = result.warnings.length;
    
    // Check core functionality
    const coreFunctions = [
      result.layerCreation,
      result.layerOpacity,
      result.layerVisibility,
      result.textureUpdates
    ];
    
    const workingFunctions = coreFunctions.filter(Boolean).length;
    const functionHealthRatio = workingFunctions / coreFunctions.length;
    
    // Determine status
    if (criticalFailures === 0 && functionHealthRatio >= 0.9) {
      return warnings > 2 ? 'degraded' : 'healthy';
    } else if (criticalFailures <= 2 && functionHealthRatio >= 0.5) {
      return 'degraded';
    } else {
      return 'broken';
    }
  }
  
  /**
   * Update performance history
   */
  private updatePerformanceHistory(result: ValidationResult): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      layerCreationTime: result.performance.layerCreationTime,
      opacityChangeTime: result.performance.opacityChangeTime,
      textureUpdateTime: result.performance.textureUpdateTime
    });
    
    // Keep only recent history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
  }
  
  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): HealthReport['performance'] {
    if (this.performanceHistory.length === 0) {
      return {
        avgLayerCreationTime: 0,
        avgOpacityChangeTime: 0,
        avgTextureUpdateTime: 0,
        memoryUsage: this.getMemoryUsage()
      };
    }
    
    const recent = this.performanceHistory.slice(-10); // Last 10 measurements
    
    return {
      avgLayerCreationTime: recent.reduce((sum, h) => sum + h.layerCreationTime, 0) / recent.length,
      avgOpacityChangeTime: recent.reduce((sum, h) => sum + h.opacityChangeTime, 0) / recent.length,
      avgTextureUpdateTime: recent.reduce((sum, h) => sum + h.textureUpdateTime, 0) / recent.length,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    try {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * Generate recommendations based on health status
   */
  private generateRecommendations(result: ValidationResult, performance: HealthReport['performance']): string[] {
    const recommendations: string[] = [];
    
    // Performance recommendations
    if (performance.avgLayerCreationTime > 100) {
      recommendations.push('Layer creation is slow - consider optimizing layer creation logic');
    }
    
    if (performance.avgOpacityChangeTime > 50) {
      recommendations.push('Opacity changes are slow - check texture update triggers');
    }
    
    if (performance.avgTextureUpdateTime > 200) {
      recommendations.push('Texture updates are slow - consider reducing texture resolution or optimizing composition');
    }
    
    if (performance.memoryUsage > 100) {
      recommendations.push('High memory usage detected - consider implementing memory cleanup');
    }
    
    // Error-based recommendations
    if (result.errors.length > 0) {
      recommendations.push('Fix critical errors before proceeding with layer operations');
    }
    
    if (result.warnings.length > 3) {
      recommendations.push('Multiple warnings detected - review layer system configuration');
    }
    
    // Function-specific recommendations
    if (!result.layerCreation) {
      recommendations.push('Layer creation is broken - check AdvancedLayerSystemV2 implementation');
    }
    
    if (!result.textureUpdates) {
      recommendations.push('Real-time texture updates not working - add missing texture update triggers');
    }
    
    if (!result.layerComposition) {
      recommendations.push('Layer composition failed - check composeLayers function');
    }
    
    return recommendations;
  }
  
  /**
   * Attempt to auto-heal the system
   */
  async autoHeal(): Promise<boolean> {
    console.warn('🚨 Layer system is broken, attempting auto-heal...');
    
    try {
      // Get available snapshots
      const snapshots = this.rollback.getSnapshots();
      
      if (snapshots.length === 0) {
        console.error('❌ No snapshots available for auto-heal');
        return false;
      }
      
      // Try rolling back to recent healthy snapshots
      const healthySnapshots = snapshots.filter(s => 
        s.metadata.validationResults?.errors?.length === 0
      );
      
      if (healthySnapshots.length === 0) {
        console.error('❌ No healthy snapshots available for auto-heal');
        return false;
      }
      
      // Try the most recent healthy snapshot
      const latestHealthy = healthySnapshots[0];
      console.log(`🔄 Attempting rollback to: ${latestHealthy.name}`);
      
      const rollbackSuccess = this.rollback.rollbackToSnapshot(latestHealthy.id);
      
      if (rollbackSuccess) {
        // Validate the rollback
        const validationResult = await this.validator.validateLayerOperations();
        
        if (validationResult.errors.length === 0) {
          console.log('✅ Auto-heal successful');
          return true;
        } else {
          console.error('❌ Auto-heal validation failed');
          return false;
        }
      } else {
        console.error('❌ Auto-heal rollback failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Auto-heal failed:', error);
      return false;
    }
  }
  
  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }
  
  /**
   * Get last check timestamp
   */
  getLastCheck(): number {
    return this.lastCheck;
  }
  
  /**
   * Get performance history
   */
  getPerformanceHistory() {
    return [...this.performanceHistory];
  }
  
  /**
   * Enable/disable auto-heal
   */
  setAutoHeal(enabled: boolean): void {
    this.autoHealEnabled = enabled;
    console.log(`🔧 Auto-heal ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set health check interval
   */
  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
    console.log(`⏱️ Health check interval set to ${interval}ms`);
  }
  
  /**
   * Get status emoji
   */
  private getStatusEmoji(status: HealthStatus): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'broken': return '❌';
      default: return '❓';
    }
  }
  
  /**
   * Get comprehensive health report
   */
  async getHealthReport(): Promise<HealthReport> {
    return this.performHealthCheck();
  }
}
