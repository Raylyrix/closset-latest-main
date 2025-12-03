/**
 * Asset Management System
 * Handles storage and retrieval of project assets (images, canvases, etc.)
 */

import { Asset, AssetRegistry, AssetType, AssetStorage } from './ProjectMetadata';
import { nanoid } from '../../utils/idGenerator';

export class AssetManager {
  private assets: Map<string, Asset>;
  private assetData: Map<string, string>; // Asset ID -> Data (base64/dataURL)
  private sizeThreshold: number = 100 * 1024; // 100KB - assets larger than this are stored as files

  constructor() {
    this.assets = new Map();
    this.assetData = new Map();
  }

  /**
   * Add an asset to the manager
   */
  async addAsset(
    data: string | Blob,
    name: string,
    type: AssetType,
    mimeType: string,
    options?: {
      width?: number;
      height?: number;
      format?: string;
      layerId?: string;
    }
  ): Promise<string> {
    const id = `asset_${nanoid(12)}`;

    // Convert blob to base64 if needed
    let dataUrl: string;
    let size: number;

    if (data instanceof Blob) {
      dataUrl = await this.blobToDataUrl(data);
      size = data.size;
    } else {
      dataUrl = data;
      size = this.estimateDataUrlSize(data);
    }

    // Determine storage type based on size
    const storageType: 'inline' | 'file' = size > this.sizeThreshold ? 'file' : 'inline';

    const asset: Asset = {
      id,
      type,
      name,
      mimeType,
      size,
      storage: {
        type: storageType,
        data: storageType === 'inline' ? dataUrl : undefined,
        path: storageType === 'file' ? `assets/${id}.png` : undefined,
      },
      metadata: {
        width: options?.width,
        height: options?.height,
        format: options?.format || this.getFormatFromMimeType(mimeType),
        compression: 'png',
        createdAt: new Date().toISOString(),
      },
      usedByLayers: options?.layerId ? [options.layerId] : [],
    };

    // Generate checksum for integrity
    asset.checksum = await this.generateChecksum(dataUrl);

    this.assets.set(id, asset);
    this.assetData.set(id, dataUrl);

    console.log(`📦 Added asset: ${name} (${id}) - ${this.formatBytes(size)} - ${storageType}`);

    return id;
  }

  /**
   * Get an asset by ID
   */
  async getAsset(id: string): Promise<string | null> {
    const data = this.assetData.get(id);
    if (data) {
      // Update last accessed time
      const asset = this.assets.get(id);
      if (asset) {
        asset.metadata.lastAccessed = new Date().toISOString();
      }
      return data;
    }
    return null;
  }

  /**
   * Get asset metadata
   */
  getAssetMetadata(id: string): Asset | null {
    return this.assets.get(id) || null;
  }

  /**
   * Remove an asset
   */
  removeAsset(id: string): boolean {
    const asset = this.assets.get(id);
    if (!asset) return false;

    // Check if asset is still in use
    if (asset.usedByLayers.length > 0) {
      console.warn(`Asset ${id} is still in use by ${asset.usedByLayers.length} layer(s)`);
      return false;
    }

    this.assets.delete(id);
    this.assetData.delete(id);
    console.log(`🗑️ Removed asset: ${asset.name} (${id})`);
    return true;
  }

  /**
   * Link an asset to a layer
   */
  linkAssetToLayer(assetId: string, layerId: string): void {
    const asset = this.assets.get(assetId);
    if (asset && !asset.usedByLayers.includes(layerId)) {
      asset.usedByLayers.push(layerId);
    }
  }

  /**
   * Unlink an asset from a layer
   */
  unlinkAssetFromLayer(assetId: string, layerId: string): void {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.usedByLayers = asset.usedByLayers.filter(id => id !== layerId);
    }
  }

  /**
   * Get all assets used by a layer
   */
  getLayerAssets(layerId: string): Asset[] {
    return Array.from(this.assets.values()).filter(asset =>
      asset.usedByLayers.includes(layerId)
    );
  }

  /**
   * Clean up unused assets
   */
  cleanupUnusedAssets(): number {
    let removed = 0;
    for (const [id, asset] of this.assets.entries()) {
      if (asset.usedByLayers.length === 0) {
        this.assets.delete(id);
        this.assetData.delete(id);
        removed++;
      }
    }
    console.log(`🧹 Cleaned up ${removed} unused assets`);
    return removed;
  }

  /**
   * Get total size of all assets
   */
  getTotalSize(): number {
    return Array.from(this.assets.values()).reduce((sum, asset) => sum + asset.size, 0);
  }

  /**
   * Get asset registry for serialization
   */
  getAssetRegistry(): AssetRegistry {
    const assetsObj: Record<string, Asset> = {};
    for (const [id, asset] of this.assets.entries()) {
      // Include inline data in the asset
      if (asset.storage.type === 'inline') {
        assetsObj[id] = {
          ...asset,
          storage: {
            ...asset.storage,
            data: this.assetData.get(id),
          },
        };
      } else {
        assetsObj[id] = asset;
      }
    }

    return {
      version: '1.0.0',
      assets: assetsObj,
    };
  }

  /**
   * Load asset registry from serialized data
   */
  loadAssetRegistry(registry: AssetRegistry): void {
    console.log(`📦 Loading asset registry with ${Object.keys(registry.assets).length} assets`);

    this.assets.clear();
    this.assetData.clear();

    for (const [id, asset] of Object.entries(registry.assets)) {
      this.assets.set(id, asset);

      // Load inline data
      if (asset.storage.type === 'inline' && asset.storage.data) {
        this.assetData.set(id, asset.storage.data);
      }
    }

    console.log(`📦 Loaded ${this.assets.size} assets (${this.formatBytes(this.getTotalSize())})`);
  }

  /**
   * Export assets for file storage
   * Returns a map of file paths to data URLs
   */
  async exportAssets(): Promise<Map<string, string>> {
    const exports = new Map<string, string>();

    for (const [id, asset] of this.assets.entries()) {
      if (asset.storage.type === 'file' && asset.storage.path) {
        const data = this.assetData.get(id);
        if (data) {
          exports.set(asset.storage.path, data);
        }
      }
    }

    return exports;
  }

  /**
   * Import asset files
   */
  async importAssetFile(path: string, data: string): Promise<void> {
    // Find asset by path
    for (const [id, asset] of this.assets.entries()) {
      if (asset.storage.path === path) {
        this.assetData.set(id, data);
        break;
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const stats = {
      totalAssets: this.assets.size,
      totalSize: this.getTotalSize(),
      byType: {} as Record<AssetType, number>,
      inlineCount: 0,
      fileCount: 0,
      unusedCount: 0,
    };

    for (const asset of this.assets.values()) {
      // Count by type
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;

      // Count by storage
      if (asset.storage.type === 'inline') stats.inlineCount++;
      else if (asset.storage.type === 'file') stats.fileCount++;

      // Count unused
      if (asset.usedByLayers.length === 0) stats.unusedCount++;
    }

    return stats;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private estimateDataUrlSize(dataUrl: string): number {
    // Remove data URL prefix and calculate base64 size
    const base64 = dataUrl.split(',')[1] || dataUrl;
    return Math.ceil((base64.length * 3) / 4);
  }

  private getFormatFromMimeType(mimeType: string): string {
    const parts = mimeType.split('/');
    return parts[1] || 'unknown';
  }

  private async generateChecksum(data: string): Promise<string> {
    // Simple checksum using crypto API
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback to simple hash
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Optimize assets (compress, deduplicate, etc.)
   */
  async optimizeAssets(): Promise<number> {
    console.log('🔧 Optimizing assets...');
    let savedBytes = 0;

    // TODO: Implement asset optimization
    // - Deduplicate identical assets
    // - Compress large images
    // - Convert to optimal formats
    // - Remove unused assets

    return savedBytes;
  }

  /**
   * Clear all assets (for testing/reset)
   */
  clear(): void {
    this.assets.clear();
    this.assetData.clear();
    console.log('🧹 Cleared all assets');
  }
}

