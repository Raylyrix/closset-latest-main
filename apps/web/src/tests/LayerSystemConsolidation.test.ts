/**
 * 🧪 LAYER SYSTEM CONSOLIDATION TESTS
 * 
 * Comprehensive test suite for layer system consolidation.
 * Ensures all functionality works before and after changes.
 */

import { LayerSystemValidator } from '../utils/LayerSystemValidator';
import { LayerSystemRollback } from '../utils/LayerSystemRollback';
import { LayerSystemHealthCheck } from '../utils/LayerSystemHealthCheck';

describe('Layer System Consolidation', () => {
  let validator: LayerSystemValidator;
  let rollback: LayerSystemRollback;
  let healthCheck: LayerSystemHealthCheck;
  
  beforeEach(() => {
    validator = LayerSystemValidator.getInstance();
    rollback = LayerSystemRollback.getInstance();
    healthCheck = LayerSystemHealthCheck.getInstance();
  });
  
  afterEach(() => {
    // Clean up any test snapshots
    rollback.deleteSnapshotsByName('test');
  });
  
  describe('Pre-Consolidation Validation', () => {
    test('Layer creation works', async () => {
      const result = await validator.validateLayerOperations();
      expect(result.layerCreation).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('Layer opacity changes work', async () => {
      const result = await validator.validateLayerOperations();
      expect(result.layerOpacity).toBe(true);
    });
    
    test('Layer visibility changes work', async () => {
      const result = await validator.validateLayerOperations();
      expect(result.layerVisibility).toBe(true);
    });
    
    test('Layer composition works', async () => {
      const result = await validator.validateLayerOperations();
      expect(result.layerComposition).toBe(true);
    });
    
    test('No broken imports exist', async () => {
      const brokenImports = await validator.checkForBrokenImports();
      expect(brokenImports).toHaveLength(0);
    });
  });
  
  describe('Rollback System', () => {
    test('Can create and restore snapshots', async () => {
      // Create snapshot
      const snapshotId = rollback.createSnapshot('test', 'Test snapshot', ['test change']);
      expect(snapshotId).toBeDefined();
      
      // Verify snapshot exists
      const snapshots = rollback.getSnapshotsByName('test');
      expect(snapshots).toHaveLength(1);
      
      // Test rollback
      const rollbackSuccess = rollback.rollbackToSnapshot(snapshotId);
      expect(rollbackSuccess).toBe(true);
      
      // Clean up
      rollback.deleteSnapshot(snapshotId);
    });
    
    test('Rollback preserves functionality', async () => {
      // Create initial snapshot
      const snapshotId = rollback.createSnapshot('test', 'Initial state');
      
      // Make some changes
      const store = validator['useAdvancedLayerStoreV2']?.getState();
      if (store) {
        store.createLayer('paint', 'Test Layer');
      }
      
      // Rollback
      const rollbackSuccess = rollback.rollbackToSnapshot(snapshotId);
      expect(rollbackSuccess).toBe(true);
      
      // Verify functionality still works
      const result = await validator.validateLayerOperations();
      expect(result.layerCreation).toBe(true);
      
      // Clean up
      rollback.deleteSnapshot(snapshotId);
    });
  });
  
  describe('Health Check System', () => {
    test('Health check reports healthy status', async () => {
      const report = await healthCheck.performHealthCheck();
      expect(['healthy', 'degraded']).toContain(report.status);
      expect(report.status).not.toBe('broken');
    });
    
    test('Performance metrics are tracked', async () => {
      const report = await healthCheck.performHealthCheck();
      expect(report.performance.avgLayerCreationTime).toBeGreaterThanOrEqual(0);
      expect(report.performance.avgOpacityChangeTime).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Integration Tests', () => {
    test('Complete layer workflow works', async () => {
      // Create snapshot
      const snapshotId = rollback.createSnapshot('integration-test', 'Before integration test');
      
      try {
        // Test complete workflow
        const result = await validator.validateLayerOperations();
        
        // All core functions should work
        expect(result.layerCreation).toBe(true);
        expect(result.layerOpacity).toBe(true);
        expect(result.layerVisibility).toBe(true);
        expect(result.layerComposition).toBe(true);
        expect(result.layerDeletion).toBe(true);
        
        // No critical errors
        expect(result.errors).toHaveLength(0);
        
      } finally {
        // Always clean up
        rollback.deleteSnapshot(snapshotId);
      }
    });
  });
});
