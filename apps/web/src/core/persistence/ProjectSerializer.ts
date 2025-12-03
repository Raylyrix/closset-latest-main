/**
 * Project Serialization System
 * Converts between runtime objects and serializable formats
 */

import {
  ProjectFile,
  SerializedLayer,
  SerializedLayerContent,
  SerializedMask,
  SerializedClipMask,
  SerializedBrushStroke,
  SerializedLayerGroup,
  AssetRegistry,
  Asset,
  AssetType,
  PROJECT_FILE_FORMAT,
} from './ProjectMetadata';
import { AdvancedLayer, LayerGroup } from '../AdvancedLayerSystemV2';
import { AssetManager } from './AssetManager';

// ============================================================================
// LAYER SERIALIZATION
// ============================================================================

export class ProjectSerializer {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Serialize a layer to a format suitable for storage
   */
  async serializeLayer(layer: AdvancedLayer): Promise<SerializedLayer> {
    console.log(`📦 Serializing layer: ${layer.name} (${layer.id})`);

    const serialized: SerializedLayer = {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      locking: { ...layer.locking },
      transform: { ...layer.transform },
      effects: layer.effects.map(effect => ({
        id: effect.id,
        type: effect.type,
        enabled: effect.enabled,
        properties: { ...effect.properties },
      })),
      content: await this.serializeLayerContent(layer.content, layer.id),
      createdAt: layer.createdAt.toISOString(),
      updatedAt: layer.updatedAt.toISOString(),
      order: layer.order,
      selected: layer.selected,
    };

    // Optional properties
    if (layer.groupId) serialized.groupId = layer.groupId;
    if (layer.bounds) serialized.bounds = { ...layer.bounds };
    if (layer.clippedByLayerId) serialized.clippedByLayerId = layer.clippedByLayerId;

    // Serialize mask
    if (layer.mask) {
      serialized.mask = await this.serializeMask(layer.mask, layer.id);
    }

    // Serialize clip mask
    if (layer.clipMask) {
      serialized.clipMask = await this.serializeClipMask(layer.clipMask, layer.id);
    }

    // Serialize thumbnail
    if (layer.thumbnail) {
      const thumbnailAssetId = await this.assetManager.addAsset(
        layer.thumbnail,
        `thumbnail_${layer.id}`,
        'thumbnail',
        'image/png'
      );
      serialized.thumbnailAssetId = thumbnailAssetId;
    }

    return serialized;
  }

  /**
   * Deserialize a layer from storage format to runtime format
   */
  async deserializeLayer(serialized: SerializedLayer): Promise<AdvancedLayer> {
    console.log(`📦 Deserializing layer: ${serialized.name} (${serialized.id})`);

    const layer: AdvancedLayer = {
      id: serialized.id,
      name: serialized.name,
      type: serialized.type,
      visible: serialized.visible,
      opacity: serialized.opacity,
      blendMode: serialized.blendMode,
      locking: { ...serialized.locking },
      transform: { ...serialized.transform },
      effects: serialized.effects.map(effect => ({
        id: effect.id,
        type: effect.type,
        enabled: effect.enabled,
        properties: { ...effect.properties },
      })),
      content: await this.deserializeLayerContent(serialized.content),
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
      order: serialized.order,
      selected: serialized.selected,
    };

    // Optional properties
    if (serialized.groupId) layer.groupId = serialized.groupId;
    if (serialized.bounds) layer.bounds = { ...serialized.bounds };
    if (serialized.clippedByLayerId) layer.clippedByLayerId = serialized.clippedByLayerId;

    // Deserialize mask
    if (serialized.mask) {
      layer.mask = await this.deserializeMask(serialized.mask);
    }

    // Deserialize clip mask
    if (serialized.clipMask) {
      layer.clipMask = await this.deserializeClipMask(serialized.clipMask);
    }

    // Deserialize thumbnail
    if (serialized.thumbnailAssetId) {
      const thumbnailData = await this.assetManager.getAsset(serialized.thumbnailAssetId);
      if (thumbnailData) {
        layer.thumbnail = thumbnailData;
      }
    }

    return layer;
  }

  // ============================================================================
  // LAYER CONTENT SERIALIZATION
  // ============================================================================

  private async serializeLayerContent(
    content: any,
    layerId: string
  ): Promise<SerializedLayerContent> {
    const serialized: SerializedLayerContent = {};

    // Canvas data
    if (content.canvas) {
      const canvasAssetId = await this.canvasToAsset(content.canvas, `canvas_${layerId}`);
      serialized.canvasAssetId = canvasAssetId;
    }

    // Displacement canvas
    if (content.displacementCanvas) {
      const displacementAssetId = await this.canvasToAsset(
        content.displacementCanvas,
        `displacement_${layerId}`
      );
      serialized.displacementCanvasAssetId = displacementAssetId;
    }

    // Text
    if (content.text) {
      serialized.text = content.text;
    }

    // Image elements
    if (content.imageElements && content.imageElements.length > 0) {
      serialized.imageElements = await Promise.all(
        content.imageElements.map(async (img: any) => ({
          id: img.id,
          assetId: img.src ? await this.imageToAsset(img.src, `image_${img.id}`) : '',
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height,
          rotation: img.rotation,
          opacity: img.opacity,
          filters: img.filters,
        }))
      );
    }

    // Brush strokes
    if (content.brushStrokes && content.brushStrokes.length > 0) {
      serialized.brushStrokes = content.brushStrokes.map((stroke: any) => ({
        id: stroke.id,
        layerId: stroke.layerId,
        points: stroke.points.map((p: any) => ({
          x: p.x,
          y: p.y,
          pressure: p.pressure,
        })),
        color: stroke.color,
        size: stroke.size,
        opacity: stroke.opacity,
        tool: stroke.tool,
        timestamp: stroke.timestamp?.toISOString() || new Date().toISOString(),
        blendMode: stroke.blendMode,
      }));
    }

    // Text elements
    if (content.textElements && content.textElements.length > 0) {
      serialized.textElements = content.textElements.map((text: any) => ({
        id: text.id,
        text: text.text,
        x: text.x,
        y: text.y,
        fontSize: text.fontSize,
        fontFamily: text.fontFamily,
        color: text.color,
        align: text.align,
        bold: text.bold,
        italic: text.italic,
        underline: text.underline,
        rotation: text.rotation,
        effects: text.effects,
      }));
    }

    // Puff elements
    if (content.puffElements && content.puffElements.length > 0) {
      serialized.puffElements = await Promise.all(
        content.puffElements.map(async (puff: any) => {
          const puffData: any = {
            id: puff.id,
            x: puff.x,
            y: puff.y,
            width: puff.width,
            height: puff.height,
            height3D: puff.height3D,
            color: puff.color,
            type: puff.type,
          };

          // If puff has canvas data, store it as asset
          if (puff.canvas) {
            puffData.assetId = await this.canvasToAsset(puff.canvas, `puff_${puff.id}`);
          }

          return puffData;
        })
      );
    }

    // Adjustment data
    if (content.adjustmentData) {
      serialized.adjustmentData = JSON.parse(JSON.stringify(content.adjustmentData));
    }

    // Children (for groups)
    if (content.children) {
      serialized.children = [...content.children];
    }

    // Stroke data
    if (content.strokeData) {
      serialized.strokeData = {
        id: content.strokeData.id,
        points: content.strokeData.points.map((p: any) => ({ x: p.x, y: p.y })),
        bounds: { ...content.strokeData.bounds },
        settings: {
          size: content.strokeData.settings.size,
          color: content.strokeData.settings.color,
          opacity: content.strokeData.settings.opacity,
          gradient: content.strokeData.settings.gradient,
        },
        tool: content.strokeData.tool,
        createdAt: content.strokeData.createdAt?.toISOString() || new Date().toISOString(),
        isSelected: content.strokeData.isSelected,
      };
    }

    return serialized;
  }

  private async deserializeLayerContent(
    serialized: SerializedLayerContent
  ): Promise<any> {
    const content: any = {};

    // Canvas data
    if (serialized.canvasAssetId) {
      content.canvas = await this.assetToCanvas(serialized.canvasAssetId);
    }

    // Displacement canvas
    if (serialized.displacementCanvasAssetId) {
      content.displacementCanvas = await this.assetToCanvas(serialized.displacementCanvasAssetId);
    }

    // Text
    if (serialized.text) {
      content.text = serialized.text;
    }

    // Image elements
    if (serialized.imageElements) {
      content.imageElements = await Promise.all(
        serialized.imageElements.map(async (img) => ({
          id: img.id,
          src: await this.assetManager.getAsset(img.assetId),
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height,
          rotation: img.rotation,
          opacity: img.opacity,
          filters: img.filters,
        }))
      );
    }

    // Brush strokes
    if (serialized.brushStrokes) {
      content.brushStrokes = serialized.brushStrokes.map((stroke) => ({
        id: stroke.id,
        layerId: stroke.layerId,
        points: stroke.points,
        color: stroke.color,
        size: stroke.size,
        opacity: stroke.opacity,
        tool: stroke.tool,
        timestamp: new Date(stroke.timestamp),
        blendMode: stroke.blendMode,
      }));
    }

    // Text elements
    if (serialized.textElements) {
      content.textElements = serialized.textElements.map((text) => ({ ...text }));
    }

    // Puff elements
    if (serialized.puffElements) {
      content.puffElements = await Promise.all(
        serialized.puffElements.map(async (puff) => {
          const puffData: any = {
            id: puff.id,
            x: puff.x,
            y: puff.y,
            width: puff.width,
            height: puff.height,
            height3D: puff.height3D,
            color: puff.color,
            type: puff.type,
          };

          if (puff.assetId) {
            puffData.canvas = await this.assetToCanvas(puff.assetId);
          }

          return puffData;
        })
      );
    }

    // Adjustment data
    if (serialized.adjustmentData) {
      content.adjustmentData = JSON.parse(JSON.stringify(serialized.adjustmentData));
    }

    // Children
    if (serialized.children) {
      content.children = [...serialized.children];
    }

    // Stroke data
    if (serialized.strokeData) {
      content.strokeData = {
        id: serialized.strokeData.id,
        points: serialized.strokeData.points,
        bounds: { ...serialized.strokeData.bounds },
        settings: { ...serialized.strokeData.settings },
        tool: serialized.strokeData.tool,
        createdAt: new Date(serialized.strokeData.createdAt),
        isSelected: serialized.strokeData.isSelected,
      };
    }

    return content;
  }

  // ============================================================================
  // MASK SERIALIZATION
  // ============================================================================

  private async serializeMask(mask: any, layerId: string): Promise<SerializedMask> {
    const canvasAssetId = await this.canvasToAsset(mask.canvas, `mask_${layerId}`);
    return {
      id: mask.id,
      canvasAssetId,
      enabled: mask.enabled,
      inverted: mask.inverted,
    };
  }

  private async deserializeMask(serialized: SerializedMask): Promise<any> {
    const canvas = await this.assetToCanvas(serialized.canvasAssetId);
    return {
      id: serialized.id,
      canvas,
      enabled: serialized.enabled,
      inverted: serialized.inverted,
    };
  }

  private async serializeClipMask(clipMask: any, layerId: string): Promise<SerializedClipMask> {
    const canvasAssetId = await this.canvasToAsset(clipMask.canvas, `clipmask_${layerId}`);
    return {
      id: clipMask.id,
      type: clipMask.type,
      data: JSON.parse(JSON.stringify(clipMask.data)),
      enabled: clipMask.enabled,
      inverted: clipMask.inverted,
      canvasAssetId,
      bounds: { ...clipMask.bounds },
      transform: { ...clipMask.transform },
      feather: clipMask.feather,
      clipsLayerIds: clipMask.clipsLayerIds ? [...clipMask.clipsLayerIds] : undefined,
    };
  }

  private async deserializeClipMask(serialized: SerializedClipMask): Promise<any> {
    const canvas = await this.assetToCanvas(serialized.canvasAssetId);
    return {
      id: serialized.id,
      type: serialized.type,
      data: JSON.parse(JSON.stringify(serialized.data)),
      enabled: serialized.enabled,
      inverted: serialized.inverted,
      canvas,
      bounds: { ...serialized.bounds },
      transform: { ...serialized.transform },
      feather: serialized.feather,
      clipsLayerIds: serialized.clipsLayerIds ? [...serialized.clipsLayerIds] : undefined,
    };
  }

  // ============================================================================
  // ASSET CONVERSION HELPERS
  // ============================================================================

  private async canvasToAsset(canvas: HTMLCanvasElement, name: string): Promise<string> {
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });

      // Convert blob to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Add to asset manager
      const assetId = await this.assetManager.addAsset(base64, name, 'canvas', 'image/png');
      return assetId;
    } catch (error) {
      console.error('Failed to convert canvas to asset:', error);
      throw error;
    }
  }

  private async assetToCanvas(assetId: string): Promise<HTMLCanvasElement> {
    try {
      const dataUrl = await this.assetManager.getAsset(assetId);
      if (!dataUrl) {
        throw new Error(`Asset not found: ${assetId}`);
      }

      // Create canvas and load image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      return canvas;
    } catch (error) {
      console.error('Failed to convert asset to canvas:', error);
      throw error;
    }
  }

  private async imageToAsset(src: string, name: string): Promise<string> {
    return await this.assetManager.addAsset(src, name, 'image', 'image/png');
  }

  // ============================================================================
  // GROUP SERIALIZATION
  // ============================================================================

  serializeGroup(group: LayerGroup): SerializedLayerGroup {
    return {
      id: group.id,
      name: group.name,
      visible: group.visible,
      opacity: group.opacity,
      blendMode: group.blendMode,
      locked: group.locked,
      expanded: group.expanded,
      layerIds: [...group.layerIds],
      order: group.order,
      parentId: group.parentId,
    };
  }

  deserializeGroup(serialized: SerializedLayerGroup): LayerGroup {
    return {
      id: serialized.id,
      name: serialized.name,
      visible: serialized.visible,
      opacity: serialized.opacity,
      blendMode: serialized.blendMode,
      locked: serialized.locked,
      expanded: serialized.expanded,
      layerIds: [...serialized.layerIds],
      order: serialized.order,
      parentId: serialized.parentId,
    };
  }
}


