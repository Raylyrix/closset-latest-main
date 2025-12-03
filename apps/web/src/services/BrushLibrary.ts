import localforage from 'localforage';

export type BrushCategory = 'textures' | 'patterns' | 'shapes' | 'decorative' | 'natural' | 'abstract' | 'other';

export interface SavedBrush {
  id: string;
  name: string;
  thumbnail: string; // Data URL of thumbnail
  image: string; // Data URL of brush image
  category?: BrushCategory; // Category for organization
  tags?: string[]; // Tags for flexible organization and search
  settings: {
    rotation: number;
    scale: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
    colorizationMode: 'tint' | 'multiply' | 'overlay' | 'colorize' | 'preserve';
    alphaThreshold: number;
  };
  createdAt: number;
  updatedAt: number;
  isPreset?: boolean; // Mark as preset/favorite for quick access
  lastUsed?: number; // Timestamp of last use for recently used sorting
}

const BRUSH_LIBRARY_KEY = 'closset:brushLibrary';
const BRUSH_KEY = (id: string) => `closset:brush:${id}`;

class BrushLibrary {
  private brushes: Map<string, SavedBrush> = new Map();

  /**
   * Initialize brush library from storage
   */
  async initialize(): Promise<void> {
    try {
      const brushIds = await localforage.getItem<string[]>(BRUSH_LIBRARY_KEY) || [];
      for (const id of brushIds) {
        const brush = await localforage.getItem<SavedBrush>(BRUSH_KEY(id));
        if (brush) {
          this.brushes.set(id, brush);
        }
      }
      console.log(`📚 Brush Library initialized with ${this.brushes.size} brushes`);
    } catch (error) {
      console.error('❌ Failed to initialize brush library:', error);
    }
  }

  /**
   * Generate thumbnail from brush image
   */
  private async generateThumbnail(imageDataUrl: string, size: number = 64): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw image centered and scaled to fit
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  /**
   * Save a brush to the library
   */
  async saveBrush(
    name: string,
    image: string,
    settings: SavedBrush['settings'],
    category?: BrushCategory,
    tags?: string[]
  ): Promise<SavedBrush> {
    try {
      const id = `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const thumbnail = await this.generateThumbnail(image, 64);
      
      const brush: SavedBrush = {
        id,
        name,
        thumbnail,
        image,
        category,
        tags: tags ? tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : undefined,
        settings,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.brushes.set(id, brush);
      await localforage.setItem(BRUSH_KEY(id), brush);
      
      // Update library index
      const brushIds = Array.from(this.brushes.keys());
      await localforage.setItem(BRUSH_LIBRARY_KEY, brushIds);

      console.log(`💾 Saved brush: ${name} (${id})`);
      return brush;
    } catch (error) {
      console.error('❌ Failed to save brush:', error);
      throw error;
    }
  }

  /**
   * Get all saved brushes
   */
  getAllBrushes(): SavedBrush[] {
    return Array.from(this.brushes.values()).sort((a, b) => {
      // Sort by: presets first, then by last used, then by updated date
      if (a.isPreset && !b.isPreset) return -1;
      if (!a.isPreset && b.isPreset) return 1;
      const aTime = a.lastUsed || a.updatedAt;
      const bTime = b.lastUsed || b.updatedAt;
      return bTime - aTime;
    });
  }

  /**
   * Get preset brushes (favorites)
   */
  getPresetBrushes(): SavedBrush[] {
    return Array.from(this.brushes.values())
      .filter(brush => brush.isPreset)
      .sort((a, b) => (b.lastUsed || b.updatedAt) - (a.lastUsed || a.updatedAt));
  }

  /**
   * Get recently used brushes
   */
  getRecentlyUsedBrushes(limit: number = 5): SavedBrush[] {
    return Array.from(this.brushes.values())
      .filter(brush => brush.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, limit);
  }

  /**
   * Get a brush by ID
   */
  getBrush(id: string): SavedBrush | null {
    return this.brushes.get(id) || null;
  }

  /**
   * Delete a brush
   */
  async deleteBrush(id: string): Promise<boolean> {
    try {
      if (!this.brushes.has(id)) {
        return false;
      }

      this.brushes.delete(id);
      await localforage.removeItem(BRUSH_KEY(id));
      
      // Update library index
      const brushIds = Array.from(this.brushes.keys());
      await localforage.setItem(BRUSH_LIBRARY_KEY, brushIds);

      console.log(`🗑️ Deleted brush: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete brush:', error);
      return false;
    }
  }

  /**
   * Update brush name
   */
  async updateBrushName(id: string, newName: string): Promise<boolean> {
    try {
      const brush = this.brushes.get(id);
      if (!brush) {
        return false;
      }

      brush.name = newName;
      brush.updatedAt = Date.now();
      this.brushes.set(id, brush);
      await localforage.setItem(BRUSH_KEY(id), brush);

      return true;
    } catch (error) {
      console.error('❌ Failed to update brush name:', error);
      return false;
    }
  }

  /**
   * Toggle preset status (favorite)
   */
  async togglePreset(id: string): Promise<boolean> {
    try {
      const brush = this.brushes.get(id);
      if (!brush) {
        return false;
      }

      brush.isPreset = !brush.isPreset;
      brush.updatedAt = Date.now();
      this.brushes.set(id, brush);
      await localforage.setItem(BRUSH_KEY(id), brush);

      return true;
    } catch (error) {
      console.error('❌ Failed to toggle preset:', error);
      return false;
    }
  }

  /**
   * Mark brush as used (update lastUsed timestamp)
   */
  async markAsUsed(id: string): Promise<boolean> {
    try {
      const brush = this.brushes.get(id);
      if (!brush) {
        return false;
      }

      brush.lastUsed = Date.now();
      this.brushes.set(id, brush);
      await localforage.setItem(BRUSH_KEY(id), brush);

      return true;
    } catch (error) {
      console.error('❌ Failed to mark brush as used:', error);
      return false;
    }
  }

  /**
   * Import brush from JSON file
   */
  async importBrushFromFile(file: File): Promise<SavedBrush> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonText = event.target?.result as string;
          const brushData = JSON.parse(jsonText) as SavedBrush;

          // Validate brush data
          if (!brushData.image || !brushData.name || !brushData.settings) {
            reject(new Error('Invalid brush file format'));
            return;
          }

          // Generate new ID to avoid conflicts
          const newId = `brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          brushData.id = newId;
          brushData.createdAt = Date.now();
          brushData.updatedAt = Date.now();

          // Generate thumbnail if not present or regenerate it
          if (!brushData.thumbnail) {
            brushData.thumbnail = await this.generateThumbnail(brushData.image, 64);
          }

          // Save the imported brush
          this.brushes.set(newId, brushData);
          await localforage.setItem(BRUSH_KEY(newId), brushData);

          // Update library index
          const brushIds = Array.from(this.brushes.keys());
          await localforage.setItem(BRUSH_LIBRARY_KEY, brushIds);

          console.log(`📥 Imported brush: ${brushData.name} (${newId})`);
          resolve(brushData);
        } catch (error) {
          console.error('❌ Failed to import brush:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Export brush to JSON (for internal use, not exposed in UI per user request)
   */
  exportBrushToJSON(brush: SavedBrush): string {
    // Create a clean copy without internal metadata if needed
    const exportData = {
      ...brush
    };
    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton instance
export const brushLibrary = new BrushLibrary();

// Initialize on module load
brushLibrary.initialize();

