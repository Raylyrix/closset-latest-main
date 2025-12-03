/**
 * Auto-Save and Recovery Manager
 * Handles automatic project saving and crash recovery
 */

import { ProjectFileManager } from './ProjectFileManager';
import { useAdvancedLayerStoreV2 } from '../AdvancedLayerSystemV2';

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxBackups: number;
  saveToStorage: boolean;
  saveToFile: boolean;
  compressionEnabled: boolean;
}

export interface RecoveryPoint {
  id: string;
  timestamp: string;
  projectName: string;
  layerCount: number;
  size: number;
  isAutoSave: boolean;
}

export class AutoSaveManager {
  private projectManager: ProjectFileManager;
  private config: AutoSaveConfig;
  private autoSaveTimer: number | null = null;
  private lastSaveTime: number = 0;
  private saveInProgress: boolean = false;
  private changesSinceLastSave: boolean = false;

  constructor(projectManager: ProjectFileManager, config?: Partial<AutoSaveConfig>) {
    this.projectManager = projectManager;
    this.config = {
      enabled: true,
      interval: 60000, // 1 minute
      maxBackups: 10,
      saveToStorage: true,
      saveToFile: false,
      compressionEnabled: true,
      ...config,
    };

    this.setupChangeDetection();
    console.log('💾 AutoSaveManager initialized', this.config);
  }

  // ============================================================================
  // AUTO-SAVE CONTROL
  // ============================================================================

  /**
   * Start auto-save
   */
  start(): void {
    if (!this.config.enabled) {
      console.warn('Auto-save is disabled');
      return;
    }

    if (this.autoSaveTimer !== null) {
      console.warn('Auto-save already running');
      return;
    }

    console.log(`💾 Starting auto-save (interval: ${this.config.interval}ms)`);
    
    this.autoSaveTimer = window.setInterval(() => {
      this.autoSave();
    }, this.config.interval);

    // Initial save
    setTimeout(() => this.autoSave(), 5000); // Save after 5 seconds
  }

  /**
   * Stop auto-save
   */
  stop(): void {
    if (this.autoSaveTimer !== null) {
      window.clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('💾 Auto-save stopped');
    }
  }

  /**
   * Pause auto-save temporarily
   */
  pause(): void {
    this.stop();
  }

  /**
   * Resume auto-save
   */
  resume(): void {
    this.start();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoSaveConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };
    
    console.log('💾 Auto-save config updated', this.config);

    // Restart if interval changed and was running
    if (wasEnabled && this.config.enabled && this.autoSaveTimer !== null) {
      this.stop();
      this.start();
    }
  }

  // ============================================================================
  // SAVING
  // ============================================================================

  /**
   * Perform auto-save
   */
  private async autoSave(): Promise<boolean> {
    // Skip if save in progress
    if (this.saveInProgress) {
      console.log('💾 Auto-save skipped: save already in progress');
      return false;
    }

    // Skip if no changes since last save
    if (!this.changesSinceLastSave) {
      console.log('💾 Auto-save skipped: no changes');
      return false;
    }

    // Check if enough time has passed since last save
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    if (timeSinceLastSave < this.config.interval / 2) {
      console.log('💾 Auto-save skipped: too soon since last save');
      return false;
    }

    try {
      this.saveInProgress = true;
      console.log('💾 Auto-save starting...');

      const success = await this.save(true);
      
      if (success) {
        this.lastSaveTime = Date.now();
        this.changesSinceLastSave = false;
        console.log('✅ Auto-save completed successfully');
      } else {
        console.error('❌ Auto-save failed');
      }

      return success;
    } catch (error) {
      console.error('❌ Auto-save error:', error);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Manual save
   */
  async saveNow(): Promise<boolean> {
    console.log('💾 Manual save triggered');
    return await this.save(false);
  }

  /**
   * Internal save method
   */
  private async save(isAutoSave: boolean): Promise<boolean> {
    try {
      const startTime = performance.now();

      // Check if there's a project to save
      const currentProject = this.projectManager.getCurrentProject();
      if (!currentProject) {
        console.log('💾 No project initialized yet, skipping save');
        return false;
      }

      // Save to storage
      if (this.config.saveToStorage) {
        const success = await this.projectManager.saveProjectToStorage();
        if (!success) {
          console.warn('Failed to save to storage');
          return false;
        }
      }

      // Create recovery point
      await this.createRecoveryPoint(isAutoSave);

      // Clean up old backups
      await this.cleanupOldBackups();

      const duration = performance.now() - startTime;
      console.log(`💾 Save completed in ${duration.toFixed(2)}ms`);

      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  }

  // ============================================================================
  // RECOVERY SYSTEM
  // ============================================================================

  /**
   * Create a recovery point
   */
  private async createRecoveryPoint(isAutoSave: boolean): Promise<void> {
    try {
      // Check if there's actually something to save
      const currentProject = this.projectManager.getCurrentProject();
      if (!currentProject) {
        console.log('💾 No project to create recovery point for, skipping');
        return;
      }

      const projectJson = await this.projectManager.saveProjectToJSON({
        compress: this.config.compressionEnabled,
        includeHistory: false,
      });

      const manifest = await this.projectManager.getProjectManifest();
      
      const recoveryPoint: RecoveryPoint = {
        id: `recovery_${Date.now()}`,
        timestamp: new Date().toISOString(),
        projectName: manifest?.name || 'Untitled',
        layerCount: manifest?.layerCount || 0,
        size: new Blob([projectJson]).size,
        isAutoSave,
      };

      // Store recovery point
      const key = `closset_recovery_${recoveryPoint.id}`;
      localStorage.setItem(key, projectJson);
      
      // Store recovery point metadata
      const metadataKey = `closset_recovery_metadata`;
      const metadata = this.getRecoveryMetadata();
      metadata.push(recoveryPoint);
      localStorage.setItem(metadataKey, JSON.stringify(metadata));

      console.log(`💾 Recovery point created: ${recoveryPoint.id}`);
    } catch (error) {
      console.error('Failed to create recovery point:', error);
    }
  }

  /**
   * Get all recovery points
   */
  getRecoveryPoints(): RecoveryPoint[] {
    return this.getRecoveryMetadata();
  }

  /**
   * Load from recovery point
   */
  async recoverFromPoint(recoveryId: string): Promise<boolean> {
    try {
      console.log(`🔄 Recovering from: ${recoveryId}`);
      
      const key = `closset_recovery_${recoveryId}`;
      const projectJson = localStorage.getItem(key);
      
      if (!projectJson) {
        console.error('Recovery point not found');
        throw new Error('Recovery point not found');
      }

      if (!projectJson || projectJson.trim() === '') {
        console.error('Recovery point is empty');
        throw new Error('Recovery point is empty');
      }

      await this.projectManager.loadProjectFromJSON(projectJson);
      console.log('✅ Recovery successful');
      return true;
    } catch (error) {
      console.error('Recovery failed:', error);
      throw error; // Re-throw so the caller knows it failed
    }
  }

  /**
   * Check for crash recovery
   */
  async checkForCrashRecovery(): Promise<RecoveryPoint | null> {
    // Check if app crashed (unsaved changes exist)
    const lastSession = localStorage.getItem('closset_session_active');
    
    if (lastSession === 'true') {
      console.log('⚠️ Detected potential crash - checking recovery points...');
      
      const recoveryPoints = this.getRecoveryPoints();
      
      if (recoveryPoints.length > 0) {
        // Validate that the most recent recovery point has data
        const mostRecent = recoveryPoints[recoveryPoints.length - 1];
        const key = `closset_recovery_${mostRecent.id}`;
        const data = localStorage.getItem(key);
        
        if (data && data.trim() !== '') {
          console.log('✅ Valid recovery point found:', mostRecent);
          // Mark session as active BEFORE returning
          localStorage.setItem('closset_session_active', 'true');
          return mostRecent;
        } else {
          console.warn('⚠️ Recovery point exists but has no data');
        }
      } else {
        console.log('ℹ️ No recovery points found');
      }
    }

    // Mark session as active
    localStorage.setItem('closset_session_active', 'true');
    
    return null;
  }

  /**
   * Clear crash recovery flag (call on clean exit)
   */
  markCleanExit(): void {
    localStorage.setItem('closset_session_active', 'false');
    console.log('✅ Session marked as clean exit');
  }

  /**
   * Clean up old recovery points
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const metadata = this.getRecoveryMetadata();
      
      // Keep only the most recent backups
      if (metadata.length > this.config.maxBackups) {
        const toRemove = metadata.slice(0, metadata.length - this.config.maxBackups);
        
        for (const point of toRemove) {
          const key = `closset_recovery_${point.id}`;
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old recovery point: ${point.id}`);
        }

        // Update metadata
        const remaining = metadata.slice(-this.config.maxBackups);
        localStorage.setItem('closset_recovery_metadata', JSON.stringify(remaining));
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get recovery metadata
   */
  private getRecoveryMetadata(): RecoveryPoint[] {
    try {
      const metadata = localStorage.getItem('closset_recovery_metadata');
      return metadata ? JSON.parse(metadata) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all recovery points
   */
  clearAllRecoveryPoints(): void {
    const metadata = this.getRecoveryMetadata();
    
    for (const point of metadata) {
      const key = `closset_recovery_${point.id}`;
      localStorage.removeItem(key);
    }
    
    localStorage.removeItem('closset_recovery_metadata');
    console.log('🗑️ All recovery points cleared');
  }

  // ============================================================================
  // CHANGE DETECTION
  // ============================================================================

  /**
   * Setup change detection in layer store
   */
  private setupChangeDetection(): void {
    // Subscribe to layer store changes
    const unsubscribe = useAdvancedLayerStoreV2.subscribe(
      (state) => state.layers,
      () => {
        this.markChanges();
      }
    );

    // Store unsubscribe function for cleanup
    (this as any).unsubscribeChangeDetection = unsubscribe;
  }

  /**
   * Mark that changes have been made
   */
  private markChanges(): void {
    if (!this.changesSinceLastSave) {
      this.changesSinceLastSave = true;
      console.log('📝 Changes detected');
    }
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.changesSinceLastSave;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get auto-save status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      running: this.autoSaveTimer !== null,
      lastSaveTime: this.lastSaveTime,
      timeSinceLastSave: Date.now() - this.lastSaveTime,
      hasUnsavedChanges: this.changesSinceLastSave,
      saveInProgress: this.saveInProgress,
      config: this.config,
    };
  }

  /**
   * Get storage usage
   */
  getStorageUsage(): { used: number; total: number; percentage: number } {
    try {
      let used = 0;
      
      // Calculate localStorage usage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('closset_')) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Most browsers allow 5-10MB for localStorage
      const total = 10 * 1024 * 1024; // 10MB estimate
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    
    // Unsubscribe from change detection
    if ((this as any).unsubscribeChangeDetection) {
      (this as any).unsubscribeChangeDetection();
    }

    console.log('💾 AutoSaveManager destroyed');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Will be initialized when project manager is ready
let autoSaveManagerInstance: AutoSaveManager | null = null;

export function getAutoSaveManager(projectManager?: ProjectFileManager): AutoSaveManager {
  if (!autoSaveManagerInstance && projectManager) {
    autoSaveManagerInstance = new AutoSaveManager(projectManager);
  }
  
  if (!autoSaveManagerInstance) {
    throw new Error('AutoSaveManager not initialized');
  }
  
  return autoSaveManagerInstance;
}

export function initAutoSaveManager(projectManager: ProjectFileManager): AutoSaveManager {
  if (autoSaveManagerInstance) {
    autoSaveManagerInstance.destroy();
  }
  
  autoSaveManagerInstance = new AutoSaveManager(projectManager);
  return autoSaveManagerInstance;
}

