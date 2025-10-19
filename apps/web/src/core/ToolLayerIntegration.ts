/**
 * Tool Layer Integration
 * 
 * Handles the integration between tools and the unified layer system.
 * Provides a clean interface for tools to interact with layers.
 */

import { UnifiedLayer, ToolType, BrushStroke, EmbroideryStitch, PuffData, VectorPath } from './types/UnifiedLayerTypes';
// import { UnifiedLayerManager } from './UnifiedLayerManager'; // REMOVED: File doesn't exist
import { CanvasManager } from './CanvasManager';

export class ToolLayerIntegration {
  constructor(
    private layerManager: any, // FIXED: UnifiedLayerManager doesn't exist
    private canvasManager: CanvasManager
  ) {}
  
  /**
   * Get target layer for a tool type
   */
  getTargetLayer(toolType: ToolType): UnifiedLayer {
    return this.layerManager.getOrCreateToolLayer(toolType);
  }
  
  /**
   * Create a new layer for a specific tool
   */
  createToolLayer(toolType: ToolType, name?: string): UnifiedLayer {
    const layerType = toolType === 'vector' ? 'vector' : 'raster';
    const layerName = name || `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} Layer`;
    
    return this.layerManager.createLayer(layerType, layerName, toolType);
  }
  
  /**
   * Draw brush stroke to layer
   */
  drawBrushStroke(toolType: ToolType, stroke: Omit<BrushStroke, 'id' | 'layerId' | 'timestamp'>): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for brush stroke');
      return;
    }
    
    // Setup brush context
    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = stroke.opacity * layer.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Apply brush settings
    if (stroke.hardness !== undefined) {
      ctx.lineWidth = stroke.size;
    }
    
    // Draw stroke
    if (stroke.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      ctx.stroke();
    } else if (stroke.points.length === 1) {
      // Single point - draw as circle
      const point = stroke.points[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Create stroke record
    const strokeRecord: BrushStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: layer.id,
      timestamp: Date.now(),
      ...stroke
    };
    
    // Add to layer tool data
    if (!layer.toolData.brushStrokes) {
      layer.toolData.brushStrokes = [];
    }
    layer.toolData.brushStrokes.push(strokeRecord);
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Drew brush stroke on layer ${layer.id}`);
  }
  
  /**
   * Draw embroidery stitch to layer
   */
  drawEmbroideryStitch(toolType: ToolType, stitch: Omit<EmbroideryStitch, 'id' | 'layerId' | 'timestamp'>): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for embroidery stitch');
      return;
    }
    
    // Setup embroidery context
    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = stitch.opacity * layer.opacity;
    ctx.strokeStyle = stitch.color;
    ctx.fillStyle = stitch.color;
    ctx.lineWidth = stitch.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add shadow for 3D effect
    ctx.shadowColor = stitch.color;
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw stitch based on type
    switch (stitch.type) {
      case 'satin':
        this.drawSatinStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'cross-stitch':
      case 'cross':
        this.drawCrossStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'chain':
        this.drawChainStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'backstitch':
        this.drawBackStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'seed':
        this.drawSeedStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'feather':
        this.drawFeatherStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      case 'bullion':
        this.drawBullionStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
        break;
      default:
        this.drawBasicStitch(ctx, { ...stitch, id: `stitch-${Date.now()}`, layerId: 'embroidery', timestamp: Date.now() });
    }
    
    ctx.restore();
    
    // Create stitch record
    const stitchRecord: EmbroideryStitch = {
      id: `stitch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: layer.id,
      timestamp: Date.now(),
      ...stitch
    };
    
    // Add to layer tool data
    if (!layer.toolData.embroideryStitches) {
      layer.toolData.embroideryStitches = [];
    }
    layer.toolData.embroideryStitches.push(stitchRecord);
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Drew embroidery stitch on layer ${layer.id}`);
  }
  
  /**
   * Draw puff print to layer
   */
  drawPuffPrint(toolType: ToolType, puff: Omit<PuffData, 'id' | 'layerId' | 'timestamp'>): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for puff print');
      return;
    }
    
    // Setup puff context
    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = puff.opacity * layer.opacity;
    
    // Create gradient for puff effect
    const gradient = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.size);
    gradient.addColorStop(0, puff.color);
    gradient.addColorStop(0.7, puff.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, puff.color.replace(')', ', 0)').replace('rgb', 'rgba'));
    
    ctx.fillStyle = gradient;
    
    // Add shadow for depth
    ctx.shadowColor = puff.color;
    ctx.shadowBlur = puff.size / 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw puff
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Create puff record
    const puffRecord: PuffData = {
      id: `puff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: layer.id,
      timestamp: Date.now(),
      ...puff
    };
    
    // Add to layer tool data
    if (!layer.toolData.puffData) {
      layer.toolData.puffData = [];
    }
    layer.toolData.puffData.push(puffRecord);
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Drew puff print on layer ${layer.id}`);
  }
  
  /**
   * Draw vector path to layer
   */
  drawVectorPath(toolType: ToolType, path: Omit<VectorPath, 'id' | 'layerId' | 'timestamp'>): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for vector path');
      return;
    }
    
    // Setup vector context
    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = layer.opacity;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw path
    if (path.points.length > 0) {
      ctx.beginPath();
      
      const firstPoint = path.points[0];
      ctx.moveTo(firstPoint.u * canvas.width, firstPoint.v * canvas.height);
      
      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i];
        
        if (point.inHandle && point.outHandle) {
          // Bezier curve
          const cp1x = point.inHandle.u * canvas.width;
          const cp1y = point.inHandle.v * canvas.height;
          const cp2x = point.outHandle.u * canvas.width;
          const cp2y = point.outHandle.v * canvas.height;
          const endX = point.u * canvas.width;
          const endY = point.v * canvas.height;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        } else {
          // Straight line
          ctx.lineTo(point.u * canvas.width, point.v * canvas.height);
        }
      }
      
      if (path.closed) {
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    
    ctx.restore();
    
    // Create path record
    const pathRecord: VectorPath = {
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: layer.id,
      timestamp: Date.now(),
      ...path
    };
    
    // Add to layer tool data
    if (!layer.toolData.vectorPaths) {
      layer.toolData.vectorPaths = [];
    }
    layer.toolData.vectorPaths.push(pathRecord);
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Drew vector path on layer ${layer.id}`);
  }
  
  /**
   * Erase from layer
   */
  eraseFromLayer(toolType: ToolType, x: number, y: number, size: number): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for erase operation');
      return;
    }
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Erased from layer ${layer.id}`);
  }
  
  /**
   * Fill layer area
   */
  fillLayerArea(toolType: ToolType, x: number, y: number, color: string): void {
    const layer = this.getTargetLayer(toolType);
    const canvas = layer.canvas;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get 2D context for fill operation');
      return;
    }
    
    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = layer.opacity;
    ctx.fillStyle = color;
    
    // Simple flood fill (can be enhanced later)
    ctx.fillRect(x - 50, y - 50, 100, 100);
    
    ctx.restore();
    
    // Mark layer as dirty
    layer.isDirty = true;
    layer.modifiedAt = new Date();
    
    console.log(`🎨 ToolLayerIntegration: Filled layer ${layer.id}`);
  }
  
  /**
   * Get layer for tool type
   */
  getLayerForTool(toolType: ToolType): UnifiedLayer | null {
    const layers = this.layerManager.getAllLayers();
    return layers.find((layer: any) => layer.toolType === toolType && layer.visible) || null; // FIXED: Parameter type
  }
  
  /**
   * Get all layers for tool type
   */
  getAllLayersForTool(toolType: ToolType): UnifiedLayer[] {
    return this.layerManager.getLayersByToolType(toolType);
  }
  
  /**
   * Clean up tool data for layer
   */
  cleanupToolData(layerId: string): void {
    this.layerManager.cleanupToolData(layerId);
  }
  
  /**
   * Update layer composition
   */
  updateComposition(): void {
    this.layerManager.composeLayers();
  }
  
  /**
   * Update displacement maps
   */
  updateDisplacementMaps(): void {
    this.layerManager.updateDisplacementMaps();
  }
  
  // Private helper methods for embroidery stitches
  
  private drawSatinStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    if (stitch.points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(stitch.points[0].x, stitch.points[0].y);
    
    for (let i = 1; i < stitch.points.length; i++) {
      ctx.lineTo(stitch.points[i].x, stitch.points[i].y);
    }
    
    ctx.stroke();
  }
  
  private drawCrossStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    const size = stitch.thickness * 2;
    
    for (const point of stitch.points) {
      const x = point.x;
      const y = point.y;
      const halfSize = size / 2;
      
      // Draw X pattern
      ctx.beginPath();
      ctx.moveTo(x - halfSize, y - halfSize);
      ctx.lineTo(x + halfSize, y + halfSize);
      ctx.moveTo(x + halfSize, y - halfSize);
      ctx.lineTo(x - halfSize, y + halfSize);
      ctx.stroke();
    }
  }
  
  private drawChainStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    if (stitch.points.length < 2) return;
    
    for (let i = 0; i < stitch.points.length - 1; i++) {
      const current = stitch.points[i];
      const next = stitch.points[i + 1];
      
      // Draw chain link
      ctx.beginPath();
      ctx.arc(current.x, current.y, stitch.thickness / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  }
  
  private drawBackStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    if (stitch.points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(stitch.points[0].x, stitch.points[0].y);
    
    for (let i = 1; i < stitch.points.length; i++) {
      ctx.lineTo(stitch.points[i].x, stitch.points[i].y);
    }
    
    ctx.stroke();
  }
  
  private drawSeedStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    for (const point of stitch.points) {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      ctx.moveTo(-stitch.thickness / 2, 0);
      ctx.lineTo(stitch.thickness / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  
  private drawFeatherStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    if (stitch.points.length < 2) return;
    
    // Draw main line
    ctx.beginPath();
    ctx.moveTo(stitch.points[0].x, stitch.points[0].y);
    ctx.lineTo(stitch.points[stitch.points.length - 1].x, stitch.points[stitch.points.length - 1].y);
    ctx.stroke();
    
    // Draw feather branches
    for (let i = 1; i < stitch.points.length - 1; i++) {
      const point = stitch.points[i];
      const branchLength = stitch.thickness * 1.5;
      const side = i % 2 === 0 ? 1 : -1;
      
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + branchLength * side, point.y - branchLength);
      ctx.stroke();
    }
  }
  
  private drawBullionStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    for (const point of stitch.points) {
      // Draw wrapped coil
      const radius = stitch.thickness / 2;
      const coils = 3;
      
      ctx.beginPath();
      for (let i = 0; i < coils; i++) {
        const angle = (i / coils) * Math.PI * 2;
        const x = point.x + Math.cos(angle) * radius;
        const y = point.y + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }
  
  private drawBasicStitch(ctx: CanvasRenderingContext2D, stitch: EmbroideryStitch): void {
    if (stitch.points.length === 1) {
      // Single point - draw as dot
      const point = stitch.points[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, stitch.thickness / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (stitch.points.length > 1) {
      // Multiple points - draw as line
      ctx.beginPath();
      ctx.moveTo(stitch.points[0].x, stitch.points[0].y);
      
      for (let i = 1; i < stitch.points.length; i++) {
        ctx.lineTo(stitch.points[i].x, stitch.points[i].y);
      }
      
      ctx.stroke();
    }
  }
}

