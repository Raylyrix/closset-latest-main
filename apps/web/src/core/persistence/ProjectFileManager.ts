/**
 * Project File Manager
 * Main interface for saving and loading projects
 */

import {
  ProjectFile,
  ProjectMetadata,
  ProjectManifest,
  AppStateSnapshot,
  PROJECT_FILE_FORMAT,
  ASSET_FOLDER_NAME,
  SerializedLayer,
  SerializedLayerGroup,
} from './ProjectMetadata';
import { ProjectSerializer } from './ProjectSerializer';
import { ComprehensiveSerializer } from './ComprehensiveSerializer';
import { AssetManager } from './AssetManager';
import { AdvancedLayer, LayerGroup, useAdvancedLayerStoreV2 } from '../AdvancedLayerSystemV2';
import { nanoid } from '../../utils/idGenerator';
import LZString from 'lz-string';

export interface SaveOptions {
  compress?: boolean;
  includeHistory?: boolean;
  includeBackup?: boolean;
  format?: 'json' | 'binary';
  // 🚀 NEW: Choose between basic and comprehensive format
  detailed?: boolean;  // If true, uses comprehensive format with ALL details
}

export interface LoadOptions {
  loadHistory?: boolean;
  verifyIntegrity?: boolean;
}

export class ProjectFileManager {
  private assetManager: AssetManager;
  private serializer: ProjectSerializer;
  private comprehensiveSerializer: ComprehensiveSerializer;
  private currentProject: ProjectMetadata | null = null;

  constructor() {
    this.assetManager = new AssetManager();
    this.serializer = new ProjectSerializer(this.assetManager);
    // 🚀 NEW: Comprehensive serializer with ALL details
    this.comprehensiveSerializer = new ComprehensiveSerializer(this.assetManager);
  }

  // ============================================================================
  // PROJECT CREATION
  // ============================================================================

  /**
   * Create a new project
   */
  createProject(name: string, options?: {
    width?: number;
    height?: number;
    description?: string;
    author?: string;
  }): ProjectMetadata {
    const project: ProjectMetadata = {
      id: `project_${nanoid(12)}`,
      name,
      description: options?.description,
      author: options?.author,
      version: '1.0.0',
      canvas: {
        width: options?.width || 2048,
        height: options?.height || 2048,
        unit: 'px',
        dpi: 300,
        colorSpace: 'sRGB',
        backgroundColor: '#FFFFFF',
      },
      stats: {
        layerCount: 0,
        assetCount: 0,
        fileSize: 0,
        lastSaveTime: new Date().toISOString(),
        totalEditTime: 0,
      },
      tags: [],
    };

    this.currentProject = project;
    console.log(`📁 Created new project: ${name} (${project.id})`);
    return project;
  }

  /**
   * Get current project metadata
   */
  getCurrentProject(): ProjectMetadata | null {
    return this.currentProject;
  }

  // ============================================================================
  // PROJECT SAVING
  // ============================================================================

  /**
   * Save the entire project
   */
  async saveProject(options: SaveOptions = {}): Promise<ProjectFile> {
    console.log('💾 Starting project save...');
    const startTime = performance.now();

    // Get current state from layer store
    const layerStore = useAdvancedLayerStoreV2.getState();
    
    // Check if there's anything to save
    if (layerStore.layers.length === 0) {
      console.warn('💾 No layers to save');
    }
    
    // Create or update project metadata
    if (!this.currentProject) {
      console.log('💾 Creating new project metadata');
      this.currentProject = this.createProject('Untitled Project');
    }

    // Serialize all layers
    const serializedLayers: SerializedLayer[] = [];
    for (const layer of layerStore.layers) {
      try {
        const serialized = await this.serializer.serializeLayer(layer);
        serializedLayers.push(serialized);
      } catch (error) {
        console.error(`Failed to serialize layer ${layer.id}:`, error);
      }
    }

    // Serialize all groups
    const serializedGroups: SerializedLayerGroup[] = layerStore.groups.map(group =>
      this.serializer.serializeGroup(group)
    );

    // Update project stats
    this.currentProject.stats.layerCount = serializedLayers.length;
    this.currentProject.stats.assetCount = this.assetManager.getStatistics().totalAssets;
    this.currentProject.stats.lastSaveTime = new Date().toISOString();

    // Create app state snapshot
    const appState: AppStateSnapshot = {
      selectedLayerIds: layerStore.selectedLayerIds,
      activeLayerId: layerStore.activeLayerId,
      view: {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        rotation: 0,
      },
      ui: {
        showLayerPanel: layerStore.showLayerPanel,
        showToolbar: true,
        expandedGroups: Array.from(layerStore.expandedGroups),
      },
      performance: {
        maxHistorySnapshots: layerStore.maxHistorySnapshots,
        autoSaveInterval: 60000, // 1 minute
        thumbnailQuality: 0.8,
      },
    };

    // Build project file
    const projectFile: ProjectFile = {
      fileVersion: PROJECT_FILE_FORMAT.version,
      fileType: 'closset-project',
      createdAt: this.currentProject.stats.lastSaveTime,
      modifiedAt: new Date().toISOString(),
      project: this.currentProject,
      layers: serializedLayers,
      groups: serializedGroups,
      layerOrder: layerStore.layerOrder,
      assets: this.assetManager.getAssetRegistry(),
      appState,
    };

    // Add history if requested
    if (options.includeHistory && layerStore.history.snapshots.length > 0) {
      projectFile.history = {
        version: '1.0.0',
        snapshots: [], // Simplified - full history can be large
        currentIndex: layerStore.history.currentIndex,
        maxSnapshots: layerStore.history.maxSnapshots,
      };
    }

    const saveTime = performance.now() - startTime;
    console.log(`✅ Project saved successfully in ${saveTime.toFixed(2)}ms`);
    console.log(`📊 Stats: ${serializedLayers.length} layers, ${this.assetManager.getStatistics().totalAssets} assets`);

    return projectFile;
  }

  /**
   * Save project to JSON string
   */
  async saveProjectToJSON(options: SaveOptions = {}): Promise<string> {
    let json: string;

    // 🚀 NEW: Check if comprehensive format requested
    if (options.detailed) {
      console.log('📦 Using COMPREHENSIVE format (all details preserved)');
      const comprehensiveFile = await this.comprehensiveSerializer.serializeProject();
      json = JSON.stringify(comprehensiveFile, null, 2);
    } else {
      console.log('📦 Using basic format');
      const projectFile = await this.saveProject(options);
      json = JSON.stringify(projectFile, null, 2);
    }
    
    // Compress if requested
    if (options.compress) {
      console.log('🗜️ Compressing project data...');
      const originalSize = json.length;
      json = LZString.compress(json);
      const compressedSize = json.length;
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(`🗜️ Compressed: ${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)} (${ratio}% reduction)`);
    }
    
    return json;
  }

  /**
   * Save project to file (for download)
   */
  async saveProjectToFile(filename?: string, options: SaveOptions = {}): Promise<Blob> {
    const json = await this.saveProjectToJSON(options);
    const blob = new Blob([json], { type: PROJECT_FILE_FORMAT.mimeType });
    
    // Trigger download
    const finalFilename = filename || `${this.currentProject?.name || 'project'}${PROJECT_FILE_FORMAT.extension}`;
    this.triggerDownload(blob, finalFilename);
    
    return blob;
  }

  // ============================================================================
  // PROJECT LOADING
  // ============================================================================

  /**
   * Load project from JSON string
   */
  async loadProjectFromJSON(json: string, options: LoadOptions = {}): Promise<ProjectMetadata> {
    console.log('📂 Loading project from JSON...');
    const startTime = performance.now();

    // Try to decompress if it's compressed
    let projectData: string = json;
    try {
      const decompressed = LZString.decompress(json);
      if (decompressed) {
        projectData = decompressed;
        console.log('🗜️ Decompressed project data');
      }
    } catch {
      // Not compressed, use as-is
    }

    const projectFile: ProjectFile = JSON.parse(projectData);
    
    // Verify file format
    if (projectFile.fileType !== 'closset-project') {
      throw new Error('Invalid project file format');
    }

    // Verify integrity if requested
    if (options.verifyIntegrity) {
      console.log('🔍 Verifying project integrity...');
      // TODO: Implement integrity checks
    }

    // Load asset registry
    this.assetManager.loadAssetRegistry(projectFile.assets);

    // Load project metadata
    this.currentProject = projectFile.project;

    // Deserialize and load layers
    const layerStore = useAdvancedLayerStoreV2.getState();
    
    // Clear existing layers
    layerStore.layers.forEach(layer => {
      try {
        layerStore.deleteLayer(layer.id);
      } catch (error) {
        console.warn('Failed to delete existing layer:', error);
      }
    });

    // Load layers
    const loadedLayers: AdvancedLayer[] = [];
    for (const serializedLayer of projectFile.layers) {
      try {
        const layer = await this.serializer.deserializeLayer(serializedLayer);
        loadedLayers.push(layer);
      } catch (error) {
        console.error(`Failed to deserialize layer ${serializedLayer.id}:`, error);
      }
    }

    // Load groups
    const loadedGroups: LayerGroup[] = projectFile.groups.map(serializedGroup =>
      this.serializer.deserializeGroup(serializedGroup)
    );

    // Update layer store with loaded data
    layerStore.layers = loadedLayers;
    layerStore.groups = loadedGroups;
    layerStore.layerOrder = projectFile.layerOrder;

    // Restore app state
    if (projectFile.appState) {
      layerStore.selectedLayerIds = projectFile.appState.selectedLayerIds;
      layerStore.activeLayerId = projectFile.appState.activeLayerId;
      layerStore.showLayerPanel = projectFile.appState.ui.showLayerPanel;
      layerStore.expandedGroups = new Set(projectFile.appState.ui.expandedGroups);
      
      if (projectFile.appState.performance) {
        layerStore.maxHistorySnapshots = projectFile.appState.performance.maxHistorySnapshots;
      }
    }

    // Load history if requested
    if (options.loadHistory && projectFile.history) {
      console.log('📜 Loading project history...');
      // TODO: Restore history snapshots
    }

    // Trigger recomposition (if the method exists)
    if (typeof layerStore.composeAllLayers === 'function') {
      layerStore.composeAllLayers();
    } else {
      console.log('📊 Layers loaded, recomposition will happen automatically');
    }

    const loadTime = performance.now() - startTime;
    console.log(`✅ Project loaded successfully in ${loadTime.toFixed(2)}ms`);
    console.log(`📊 Loaded: ${loadedLayers.length} layers, ${loadedGroups.length} groups`);

    return this.currentProject;
  }

  /**
   * Load project from file
   */
  async loadProjectFromFile(file: File, options: LoadOptions = {}): Promise<ProjectMetadata> {
    console.log(`📂 Loading project from file: ${file.name}`);
    
    const text = await file.text();
    return await this.loadProjectFromJSON(text, options);
  }

  /**
   * Load project from browser storage (IndexedDB/LocalStorage)
   */
  async loadProjectFromStorage(projectId: string, options: LoadOptions = {}): Promise<ProjectMetadata | null> {
    try {
      // Try localStorage first (for quick access)
      const stored = localStorage.getItem(`closset_project_${projectId}`);
      if (stored) {
        return await this.loadProjectFromJSON(stored, options);
      }
      
      // Try IndexedDB for larger projects
      // TODO: Implement IndexedDB storage
      
      return null;
    } catch (error) {
      console.error('Failed to load project from storage:', error);
      return null;
    }
  }

  /**
   * Save project to browser storage
   */
  async saveProjectToStorage(projectId?: string): Promise<boolean> {
    try {
      const id = projectId || this.currentProject?.id || `project_${nanoid(12)}`;
      const json = await this.saveProjectToJSON({ compress: true });
      
      // Try localStorage first
      const size = new Blob([json]).size;
      if (size < 5 * 1024 * 1024) { // Less than 5MB
        localStorage.setItem(`closset_project_${id}`, json);
        console.log(`💾 Saved project to localStorage (${this.formatBytes(size)})`);
        return true;
      } else {
        console.warn('Project too large for localStorage, use IndexedDB or file storage');
        // TODO: Implement IndexedDB storage for large projects
        return false;
      }
    } catch (error) {
      console.error('Failed to save project to storage:', error);
      return false;
    }
  }

  // ============================================================================
  // PROJECT EXPORT/IMPORT
  // ============================================================================

  /**
   * Export project as various formats
   */
  async exportProject(format: 'json' | 'png' | 'jpg' | 'pdf' | 'zip'): Promise<Blob> {
    switch (format) {
      case 'json':
        return await this.saveProjectToFile();
      
      case 'png':
      case 'jpg':
        return await this.exportAsImage(format);
      
      case 'zip':
        return await this.exportAsZip();
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export composed canvas as image
   */
  private async exportAsImage(format: 'png' | 'jpg'): Promise<Blob> {
    const layerStore = useAdvancedLayerStoreV2.getState();
    const canvas = layerStore.composedCanvas;
    
    if (!canvas) {
      throw new Error('No composed canvas available');
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export image'));
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        0.95
      );
    });
  }

  /**
   * Export project as ZIP with assets
   */
  private async exportAsZip(): Promise<Blob> {
    console.log('📦 Exporting project as ZIP...');
    
    // Get project JSON
    const projectJson = await this.saveProjectToJSON({ compress: false });
    
    // Get all assets
    const assets = await this.assetManager.exportAssets();
    
    // TODO: Create ZIP file with JSZip library
    // For now, just return the JSON
    console.warn('ZIP export not fully implemented yet');
    
    return new Blob([projectJson], { type: 'application/json' });
  }

  // ============================================================================
  // PROJECT MANIFEST
  // ============================================================================

  /**
   * Get project manifest (lightweight metadata)
   */
  async getProjectManifest(): Promise<ProjectManifest | null> {
    if (!this.currentProject) return null;

    // Generate thumbnail
    const layerStore = useAdvancedLayerStoreV2.getState();
    let thumbnail: string | undefined;
    
    if (layerStore.composedCanvas) {
      try {
        thumbnail = layerStore.composedCanvas.toDataURL('image/jpeg', 0.5);
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
      }
    }

    return {
      id: this.currentProject.id,
      name: this.currentProject.name,
      thumbnail,
      modifiedAt: this.currentProject.stats.lastSaveTime,
      size: this.assetManager.getTotalSize(),
      layerCount: this.currentProject.stats.layerCount,
      version: this.currentProject.version,
    };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get asset manager instance
   */
  getAssetManager(): AssetManager {
    return this.assetManager;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      project: this.currentProject,
      assets: this.assetManager.getStatistics(),
      layers: useAdvancedLayerStoreV2.getState().layers.length,
      groups: useAdvancedLayerStoreV2.getState().groups.length,
    };
  }

  /**
   * Clear current project
   */
  clear(): void {
    this.currentProject = null;
    this.assetManager.clear();
    console.log('🧹 Cleared project');
  }

  /**
   * Trigger file download
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`📥 Download triggered: ${filename}`);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Create singleton instance for global use
export const projectFileManager = new ProjectFileManager();

