/**
 * Persistence System - Main Export
 * 
 * This module provides a comprehensive file-based persistence system for the Closset design application.
 * It replaces the old unreliable browser-based caching with a robust file storage mechanism.
 * 
 * Key Features:
 * - File-based project storage (.closset format)
 * - Asset management with automatic optimization
 * - Auto-save and crash recovery
 * - Project import/export (JSON, PNG, JPG)
 * - Efficient serialization/deserialization
 * - Metadata and manifest generation
 * 
 * Architecture:
 * - ProjectMetadata: Type definitions for project file structure
 * - AssetManager: Handles storage and retrieval of assets (images, canvases)
 * - ProjectSerializer: Converts between runtime and serializable formats
 * - ProjectFileManager: Main interface for save/load operations
 * - AutoSaveManager: Automatic saving and recovery system
 * 
 * Usage:
 * ```typescript
 * import { projectFileManager, initAutoSaveManager } from '@/core/persistence';
 * 
 * // Create a new project
 * const project = projectFileManager.createProject('My Design');
 * 
 * // Save to file
 * await projectFileManager.saveProjectToFile();
 * 
 * // Load from file
 * await projectFileManager.loadProjectFromFile(file);
 * 
 * // Initialize auto-save
 * const autoSave = initAutoSaveManager(projectFileManager);
 * autoSave.start();
 * ```
 */

// Main exports
export { ProjectFileManager, projectFileManager } from './ProjectFileManager';
export { AssetManager } from './AssetManager';
export { ProjectSerializer } from './ProjectSerializer';
export { AutoSaveManager, getAutoSaveManager, initAutoSaveManager } from './AutoSaveManager';

// 🚀 NEW: Comprehensive system exports
export { ComprehensiveSerializer } from './ComprehensiveSerializer';
export type { 
  ComprehensiveProjectFile,
  ComprehensiveLayer,
  ComprehensiveBrushStroke,
  ComprehensiveTextElement,
  ComprehensiveImageElement,
  ComprehensivePuffElement,
} from './ComprehensiveMetadata';

// Type exports
export type {
  ProjectFile,
  ProjectMetadata,
  ProjectManifest,
  SerializedLayer,
  SerializedLayerContent,
  SerializedLayerGroup,
  SerializedEffect,
  SerializedMask,
  SerializedClipMask,
  SerializedBrushStroke,
  SerializedTextElement,
  SerializedImageElement,
  SerializedPuffElement,
  AssetRegistry,
  Asset,
  AssetType,
  AssetStorage,
  ProjectHistory,
  HistorySnapshot,
  AppStateSnapshot,
} from './ProjectMetadata';

export type {
  SaveOptions,
  LoadOptions,
} from './ProjectFileManager';

export type {
  AutoSaveConfig,
  RecoveryPoint,
} from './AutoSaveManager';

export { PROJECT_FILE_FORMAT } from './ProjectMetadata';

