/**
 * 🔄 LAYER SYSTEM ROLLBACK
 * 
 * Comprehensive rollback system for layer system consolidation.
 * Allows safe rollback to any previous state if issues occur.
 */

import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';
import { useApp } from '../App';

export interface SystemSnapshot {
  id: string;
  name: string;
  timestamp: number;
  appState: any;
  layerState: any;
  metadata: {
    description: string;
    changes: string[];
    validationResults?: any;
  };
}

export class LayerSystemRollback {
  private static instance: LayerSystemRollback;
  private snapshots: Map<string, SystemSnapshot> = new Map();
  private maxSnapshots: number = 20;
  
  static getInstance(): LayerSystemRollback {
    if (!LayerSystemRollback.instance) {
      LayerSystemRollback.instance = new LayerSystemRollback();
    }
    return LayerSystemRollback.instance;
  }
  
  /**
   * Create a snapshot of the current system state
   */
  createSnapshot(name: string, description: string = '', changes: string[] = []): string {
    try {
      const snapshotId = `${name}_${Date.now()}`;
      
      // Capture current states
      const appState = this.deepCloneState(useApp.getState());
      const layerState = this.deepCloneState(useAdvancedLayerStoreV2.getState());
      
      const snapshot: SystemSnapshot = {
        id: snapshotId,
        name,
        timestamp: Date.now(),
        appState,
        layerState,
        metadata: {
          description,
          changes,
          validationResults: null
        }
      };
      
      this.snapshots.set(snapshotId, snapshot);
      
      // Clean up old snapshots if we exceed the limit
      this.cleanupOldSnapshots();
      
      console.log(`📸 Created snapshot: ${name} (${snapshotId})`);
      return snapshotId;
      
    } catch (error) {
      console.error(`❌ Failed to create snapshot: ${name}`, error);
      throw error;
    }
  }
  
  /**
   * Rollback to a specific snapshot
   */
  rollbackToSnapshot(snapshotId: string): boolean {
    try {
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) {
        console.error(`❌ Snapshot not found: ${snapshotId}`);
        return false;
      }
      
      console.log(`🔄 Rolling back to snapshot: ${snapshot.name} (${snapshotId})`);
      
      // Restore App state
      useApp.setState(snapshot.appState);
      
      // Restore Layer state
      useAdvancedLayerStoreV2.setState(snapshot.layerState);
      
      console.log(`✅ Successfully rolled back to: ${snapshot.name}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Rollback failed for snapshot: ${snapshotId}`, error);
      return false;
    }
  }
  
  /**
   * Rollback to the most recent snapshot with a specific name
   */
  rollbackToNamedSnapshot(name: string): boolean {
    const snapshots = Array.from(this.snapshots.values())
      .filter(s => s.name === name)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (snapshots.length === 0) {
      console.error(`❌ No snapshots found with name: ${name}`);
      return false;
    }
    
    const latestSnapshot = snapshots[0];
    return this.rollbackToSnapshot(latestSnapshot.id);
  }
  
  /**
   * Get all available snapshots
   */
  getSnapshots(): SystemSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Get snapshots by name
   */
  getSnapshotsByName(name: string): SystemSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.name === name)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Delete a specific snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    try {
      const deleted = this.snapshots.delete(snapshotId);
      if (deleted) {
        console.log(`🗑️ Deleted snapshot: ${snapshotId}`);
      } else {
        console.warn(`⚠️ Snapshot not found for deletion: ${snapshotId}`);
      }
      return deleted;
    } catch (error) {
      console.error(`❌ Failed to delete snapshot: ${snapshotId}`, error);
      return false;
    }
  }
  
  /**
   * Delete all snapshots with a specific name
   */
  deleteSnapshotsByName(name: string): number {
    let deletedCount = 0;
    const snapshotsToDelete = Array.from(this.snapshots.keys())
      .filter(id => {
        const snapshot = this.snapshots.get(id);
        return snapshot?.name === name;
      });
    
    snapshotsToDelete.forEach(id => {
      if (this.deleteSnapshot(id)) {
        deletedCount++;
      }
    });
    
    console.log(`🗑️ Deleted ${deletedCount} snapshots with name: ${name}`);
    return deletedCount;
  }
  
  /**
   * Create a backup of all snapshots to localStorage
   */
  backupSnapshots(): boolean {
    try {
      const snapshotsData = Array.from(this.snapshots.entries());
      localStorage.setItem('layerSystemSnapshots', JSON.stringify(snapshotsData));
      console.log(`💾 Backed up ${snapshotsData.length} snapshots to localStorage`);
      return true;
    } catch (error) {
      console.error('❌ Failed to backup snapshots:', error);
      return false;
    }
  }
  
  /**
   * Restore snapshots from localStorage
   */
  restoreSnapshots(): boolean {
    try {
      const snapshotsData = localStorage.getItem('layerSystemSnapshots');
      if (!snapshotsData) {
        console.warn('⚠️ No snapshots found in localStorage');
        return false;
      }
      
      const snapshots = JSON.parse(snapshotsData);
      this.snapshots.clear();
      
      snapshots.forEach(([id, snapshot]: [string, SystemSnapshot]) => {
        this.snapshots.set(id, snapshot);
      });
      
      console.log(`📥 Restored ${snapshots.length} snapshots from localStorage`);
      return true;
    } catch (error) {
      console.error('❌ Failed to restore snapshots:', error);
      return false;
    }
  }
  
  /**
   * Deep clone state to avoid reference issues
   */
  private deepCloneState(state: any): any {
    try {
      // Handle special cases for Zustand stores
      if (state && typeof state === 'object') {
        const cloned: any = {};
        
        // Clone all enumerable properties
        for (const key in state) {
          if (state.hasOwnProperty(key)) {
            const value = state[key];
            
            // Skip functions and complex objects that shouldn't be cloned
            if (typeof value === 'function') {
              continue; // Skip functions
            } else if (value instanceof HTMLCanvasElement) {
              // Handle canvas elements specially
              cloned[key] = this.cloneCanvas(value);
            } else if (value instanceof Date) {
              cloned[key] = new Date(value.getTime());
            } else if (Array.isArray(value)) {
              cloned[key] = value.map(item => 
                typeof item === 'object' && item !== null ? this.deepCloneState(item) : item
              );
            } else if (value && typeof value === 'object') {
              cloned[key] = this.deepCloneState(value);
            } else {
              cloned[key] = value;
            }
          }
        }
        
        return cloned;
      }
      
      return state;
    } catch (error) {
      console.error('❌ Deep clone failed:', error);
      return state;
    }
  }
  
  /**
   * Clone canvas element
   */
  private cloneCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
    try {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = canvas.width;
      clonedCanvas.height = canvas.height;
      
      const ctx = clonedCanvas.getContext('2d');
      const originalCtx = canvas.getContext('2d');
      
      if (ctx && originalCtx) {
        ctx.drawImage(canvas, 0, 0);
      }
      
      return clonedCanvas;
    } catch (error) {
      console.error('❌ Canvas clone failed:', error);
      return null;
    }
  }
  
  /**
   * Clean up old snapshots to prevent memory issues
   */
  private cleanupOldSnapshots(): void {
    if (this.snapshots.size <= this.maxSnapshots) {
      return;
    }
    
    const snapshots = Array.from(this.snapshots.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = snapshots.slice(0, snapshots.length - this.maxSnapshots);
    
    toDelete.forEach(([id]) => {
      this.snapshots.delete(id);
    });
    
    console.log(`🧹 Cleaned up ${toDelete.length} old snapshots`);
  }
  
  /**
   * Get snapshot statistics
   */
  getStatistics(): {
    totalSnapshots: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
    snapshotNames: string[];
    totalSize: number;
  } {
    const snapshots = Array.from(this.snapshots.values());
    
    return {
      totalSnapshots: snapshots.length,
      oldestSnapshot: snapshots.length > 0 ? Math.min(...snapshots.map(s => s.timestamp)) : null,
      newestSnapshot: snapshots.length > 0 ? Math.max(...snapshots.map(s => s.timestamp)) : null,
      snapshotNames: [...new Set(snapshots.map(s => s.name))],
      totalSize: JSON.stringify(Array.from(this.snapshots.entries())).length
    };
  }
}
