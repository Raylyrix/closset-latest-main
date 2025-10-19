/**
 * 🎨 TEXTURE LAYER BRIDGE
 * 
 * Connects the texture layer system with the drawing tools:
 * - Routes tool drawing to appropriate texture layers
 * - Manages layer composition and blending
 * - Handles real-time texture updates
 * - Provides layer management API
 */

import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useApp } from '../App';
// import { TextureLayer } from './TextureLayerManager'; // REMOVED: File doesn't exist

// ============================================================================
// TEXTURE LAYER BRIDGE CLASS
// ============================================================================

export class TextureLayerBridge {
  private static instance: TextureLayerBridge;
  private layers: Map<string, any> = new Map(); // FIXED: TextureLayer type not available
  private layerOrder: string[] = [];
  private modelScene: THREE.Group | null = null;
  private composedCanvas: HTMLCanvasElement | null = null;
  private displacementCanvas: HTMLCanvasElement | null = null;
  private normalCanvas: HTMLCanvasElement | null = null;

  static getInstance(): TextureLayerBridge {
    if (!TextureLayerBridge.instance) {
      TextureLayerBridge.instance = new TextureLayerBridge();
    }
    return TextureLayerBridge.instance;
  }

  // Initialize the bridge
  initialize(modelScene: THREE.Group, composedCanvas: HTMLCanvasElement) {
    console.log('🔧 TextureLayerBridge: Initializing with modelScene and composedCanvas');
    this.modelScene = modelScene;
    this.composedCanvas = composedCanvas;
    this.initializeDefaultLayers();
    console.log('🔧 TextureLayerBridge: Initialization complete, layers created:', this.layers.size);
  }

  // Initialize default texture layers
  private initializeDefaultLayers() {
    console.log('🔧 TextureLayerBridge: Initializing default layers');
    if (!this.composedCanvas) {
      console.log('🔧 TextureLayerBridge: No composedCanvas, skipping layer creation');
      return;
    }

    // Create displacement canvas
    this.displacementCanvas = document.createElement('canvas');
    this.displacementCanvas.width = this.composedCanvas.width;
    this.displacementCanvas.height = this.composedCanvas.height;
    const displacementCtx = this.displacementCanvas.getContext('2d')!;
    displacementCtx.fillStyle = '#000000'; // CRITICAL FIX: Black (0) for no displacement
    displacementCtx.fillRect(0, 0, this.displacementCanvas.width, this.displacementCanvas.height);

    // Create normal canvas
    this.normalCanvas = document.createElement('canvas');
    this.normalCanvas.width = this.composedCanvas.width;
    this.normalCanvas.height = this.composedCanvas.height;
    const normalCtx = this.normalCanvas.getContext('2d')!;
    normalCtx.fillStyle = '#8080ff'; // Neutral normal
    normalCtx.fillRect(0, 0, this.normalCanvas.width, this.normalCanvas.height);

    // Create base diffuse layer
    const diffuseLayer: any = { // FIXED: TextureLayer interface doesn't exist
      id: 'base-diffuse',
      name: 'Base Texture',
      type: 'diffuse',
      canvas: this.composedCanvas,
      texture: new THREE.CanvasTexture(this.composedCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 0,
      needsUpdate: true
    };

    // Create displacement layer
    const displacementLayer: any = { // FIXED: TextureLayer interface doesn't exist
      id: 'displacement-map',
      name: 'Displacement Map',
      type: 'displacement',
      canvas: this.displacementCanvas,
      texture: new THREE.CanvasTexture(this.displacementCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 1,
      needsUpdate: true
    };

    // Create normal layer
    const normalLayer: any = { // FIXED: TextureLayer interface doesn't exist
      id: 'normal-map',
      name: 'Normal Map',
      type: 'normal',
      canvas: this.normalCanvas,
      texture: new THREE.CanvasTexture(this.normalCanvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: 2,
      needsUpdate: true
    };

    this.layers.set(diffuseLayer.id, diffuseLayer);
    this.layers.set(displacementLayer.id, displacementLayer);
    this.layers.set(normalLayer.id, normalLayer);
    
    this.layerOrder = [diffuseLayer.id, displacementLayer.id, normalLayer.id];
    
    console.log('🔧 TextureLayerBridge: Default layers created:', this.layers.size, 'layers');
  }

  // Get a layer by ID
  getLayer(layerId: string): any | undefined { // FIXED: TextureLayer interface doesn't exist
    return this.layers.get(layerId);
  }

  // Get all layers
  getAllLayers(): Map<string, any> { // FIXED: TextureLayer interface doesn't exist
    return this.layers;
  }

  // Get layer order
  getLayerOrder(): string[] {
    return this.layerOrder;
  }

  // Create a new layer
  createLayer(type: string, name?: string): any { // FIXED: TextureLayer interface doesn't exist
    if (!this.composedCanvas) {
      throw new Error('Bridge not initialized');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.composedCanvas.width;
    canvas.height = this.composedCanvas.height;
    const ctx = canvas.getContext('2d')!;
    
    // Initialize based on layer type
    switch (type) {
      case 'diffuse':
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent
        break;
      case 'normal':
        ctx.fillStyle = '#8080ff'; // Neutral normal
        break;
      case 'displacement':
        ctx.fillStyle = '#000000'; // CRITICAL FIX: Black (0) for no displacement
        break;
      case 'roughness':
        ctx.fillStyle = '#808080'; // Medium roughness
        break;
      case 'metalness':
        ctx.fillStyle = '#000000'; // No metalness
        break;
      case 'ao':
        ctx.fillStyle = '#ffffff'; // No occlusion
        break;
      case 'emissive':
        ctx.fillStyle = '#000000'; // No emission
        break;
    }
    
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const layer: any = { // FIXED: TextureLayer interface doesn't exist
      id: `${type}-${Date.now()}`,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
      type,
      canvas,
      texture: new THREE.CanvasTexture(canvas),
      visible: true,
      opacity: 1.0,
      blendMode: THREE.AddEquation,
      order: this.layers.size,
      needsUpdate: true
    };

    this.layers.set(layer.id, layer);
    this.layerOrder.push(layer.id);
    
    return layer;
  }

  // Update a layer
  updateLayer(layerId: string, updates: Partial<any>) { // FIXED: TextureLayer interface doesn't exist
    console.log('🔧 TextureLayerBridge: Updating layer', layerId, 'with', updates);
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.log('🔧 TextureLayerBridge: Layer not found:', layerId);
      return;
    }

    const updatedLayer = { ...layer, ...updates };
    if (updates.canvas) {
      updatedLayer.texture = new THREE.CanvasTexture(updates.canvas);
      updatedLayer.needsUpdate = true;
    }
    
    this.layers.set(layerId, updatedLayer);
    console.log('🔧 TextureLayerBridge: Layer updated successfully:', updatedLayer);
  }

  // Delete a layer
  deleteLayer(layerId: string) {
    if (this.layers.size <= 1) return; // Don't delete the last layer
    
    this.layers.delete(layerId);
    this.layerOrder = this.layerOrder.filter(id => id !== layerId);
  }

  // Draw to a specific layer
  drawToLayer(layerId: string, drawFunction: (ctx: CanvasRenderingContext2D) => void) {
    const layer = this.layers.get(layerId);
    if (!layer || !layer.visible) return;

    const ctx = layer.canvas.getContext('2d')!;
    ctx.save();
    
    // Apply layer properties
    ctx.globalAlpha = layer.opacity;
    
    // Execute the drawing function
    drawFunction(ctx);
    
    ctx.restore();
    
    // Mark for update
    layer.needsUpdate = true;
    layer.texture.needsUpdate = true;
  }

  // Draw brush stroke to diffuse layer
  drawBrushStroke(uv: THREE.Vector2, brushSize: number, brushColor: string, brushOpacity: number) {
    this.drawToLayer('base-diffuse', (ctx) => {
      const x = Math.floor(uv.x * this.composedCanvas!.width);
      const y = Math.floor(uv.y * this.composedCanvas!.height);
      
      ctx.globalAlpha = brushOpacity;
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw puff print to displacement layer
  drawPuffPrint(uv: THREE.Vector2, puffSize: number, puffHeight: number, puffColor: string) {
    this.drawToLayer('displacement-map', (ctx) => {
      const x = Math.floor(uv.x * this.composedCanvas!.width);
      const y = Math.floor(uv.y * this.composedCanvas!.height);
      
      // Create displacement value (grayscale)
      const displacementValue = Math.min(255, 128 + puffHeight * 50); // Neutral gray + height
      const grayColor = `rgb(${displacementValue}, ${displacementValue}, ${displacementValue})`;
      
      ctx.fillStyle = grayColor;
      ctx.beginPath();
      ctx.arc(x, y, puffSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Also update normal map for surface detail
    this.drawToLayer('normal-map', (ctx) => {
      const x = Math.floor(uv.x * this.composedCanvas!.width);
      const y = Math.floor(uv.y * this.composedCanvas!.height);
      
      // Create normal map (blue-ish for raised areas)
      const normalColor = `rgb(128, 128, ${Math.min(255, 128 + puffHeight * 30)})`;
      
      ctx.fillStyle = normalColor;
      ctx.beginPath();
      ctx.arc(x, y, puffSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Apply all layers to the model
  applyLayersToModel() {
    if (!this.modelScene) return;

    const sortedLayers = this.layerOrder
      .map(id => this.layers.get(id))
      .filter((layer): layer is any => layer !== undefined && layer.visible) // FIXED: TextureLayer interface doesn't exist
      .sort((a, b) => a.order - b.order);

    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            // Apply each layer type
            sortedLayers.forEach(layer => {
              switch (layer.type) {
                case 'diffuse':
                  mat.map = layer.texture;
                  break;
                case 'normal':
                  mat.normalMap = layer.texture;
                  mat.normalScale = new THREE.Vector2(1, 1);
                  break;
                case 'displacement':
                  mat.displacementMap = layer.texture;
                  mat.displacementScale = 1.0;
                  mat.displacementBias = 0;
                  break;
                case 'roughness':
                  mat.roughnessMap = layer.texture;
                  break;
                case 'metalness':
                  mat.metalnessMap = layer.texture;
                  break;
                case 'ao':
                  mat.aoMap = layer.texture;
                  break;
                case 'emissive':
                  mat.emissiveMap = layer.texture;
                  break;
              }
              
              if (layer.needsUpdate) {
                layer.texture.needsUpdate = true;
                layer.needsUpdate = false;
              }
            });
            
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  // Get the composed canvas (for tools that need it)
  getComposedCanvas(): HTMLCanvasElement | null {
    return this.composedCanvas;
  }

  // Get the displacement canvas
  getDisplacementCanvas(): HTMLCanvasElement | null {
    return this.displacementCanvas;
  }

  // Get the normal canvas
  getNormalCanvas(): HTMLCanvasElement | null {
    return this.normalCanvas;
  }
}

// ============================================================================
// REACT HOOK FOR TEXTURE LAYER BRIDGE
// ============================================================================

export function useTextureLayerBridge() {
  const { modelScene, composedCanvas } = useApp();
  const bridgeRef = useRef<TextureLayerBridge | null>(null);

  // Initialize bridge
  useEffect(() => {
    console.log('🔧 useTextureLayerBridge: useEffect triggered, modelScene:', !!modelScene, 'composedCanvas:', !!composedCanvas);
    if (modelScene && composedCanvas) {
      console.log('🔧 useTextureLayerBridge: Initializing bridge');
      bridgeRef.current = TextureLayerBridge.getInstance();
      bridgeRef.current.initialize(modelScene, composedCanvas);
      console.log('🔧 useTextureLayerBridge: Bridge initialized');
    } else {
      console.log('🔧 useTextureLayerBridge: Missing dependencies, skipping initialization');
    }
  }, [modelScene, composedCanvas]);

  // Bridge methods
  const getLayer = useCallback((layerId: string) => {
    return bridgeRef.current?.getLayer(layerId);
  }, []);

  const getAllLayers = useCallback(() => {
    return bridgeRef.current?.getAllLayers();
  }, []);

  const getLayerOrder = useCallback(() => {
    return bridgeRef.current?.getLayerOrder();
  }, []);

  const createLayer = useCallback((type: string, name?: string) => { // FIXED: TextureLayer interface doesn't exist
    return bridgeRef.current?.createLayer(type, name);
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<any>) => { // FIXED: TextureLayer interface doesn't exist
    bridgeRef.current?.updateLayer(layerId, updates);
  }, []);

  const deleteLayer = useCallback((layerId: string) => {
    bridgeRef.current?.deleteLayer(layerId);
  }, []);

  const drawBrushStroke = useCallback((uv: THREE.Vector2, brushSize: number, brushColor: string, brushOpacity: number) => {
    bridgeRef.current?.drawBrushStroke(uv, brushSize, brushColor, brushOpacity);
  }, []);

  const drawPuffPrint = useCallback((uv: THREE.Vector2, puffSize: number, puffHeight: number, puffColor: string) => {
    bridgeRef.current?.drawPuffPrint(uv, puffSize, puffHeight, puffColor);
  }, []);

  const applyLayersToModel = useCallback(() => {
    bridgeRef.current?.applyLayersToModel();
  }, []);

  const getComposedCanvas = useCallback(() => {
    return bridgeRef.current?.getComposedCanvas();
  }, []);

  const getDisplacementCanvas = useCallback(() => {
    return bridgeRef.current?.getDisplacementCanvas();
  }, []);

  const getNormalCanvas = useCallback(() => {
    return bridgeRef.current?.getNormalCanvas();
  }, []);

  return {
    getLayer,
    getAllLayers,
    getLayerOrder,
    createLayer,
    updateLayer,
    deleteLayer,
    drawBrushStroke,
    drawPuffPrint,
    applyLayersToModel,
    getComposedCanvas,
    getDisplacementCanvas,
    getNormalCanvas
  };
}

export default TextureLayerBridge;
