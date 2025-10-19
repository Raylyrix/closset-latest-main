/**
 * 🎈 PUFF DISPLACEMENT ENGINE
 * 
 * High-performance displacement mapping engine for puff print effects:
 * - Optimized displacement calculations
 * - Real-time Three.js integration
 * - Memory-efficient canvas operations
 * - Proper geometry subdivision
 * - Advanced displacement algorithms
 */

import * as THREE from 'three';
import { PuffMemoryManager } from './PuffMemoryManager';
import { PuffPattern } from './PuffPatternLibrary';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DisplacementResult {
  displacementMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  heightMap: THREE.CanvasTexture;
  needsUpdate: boolean;
}

export interface PuffPaintData {
  uv: THREE.Vector2;
  size: number;
  height: number;
  softness: number;
  color: string;
  opacity: number;
  pattern: PuffPattern;
  patternScale: number;
  patternRotation: number;
}

// ============================================================================
// DISPLACEMENT ENGINE CLASS
// ============================================================================

export class PuffDisplacementEngine {
  private modelScene: THREE.Group;
  private baseCanvas: HTMLCanvasElement;
  private memoryManager: PuffMemoryManager;
  
  // Canvas contexts
  private displacementCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private normalCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private heightCanvas!: HTMLCanvasElement; // FIXED: Add definite assignment assertion
  private displacementCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  private normalCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  private heightCtx!: CanvasRenderingContext2D; // FIXED: Add definite assignment assertion
  
  // Three.js textures
  private displacementTexture!: THREE.CanvasTexture; // FIXED: Add definite assignment assertion
  private normalTexture!: THREE.CanvasTexture; // FIXED: Add definite assignment assertion
  private heightTexture!: THREE.CanvasTexture; // FIXED: Add definite assignment assertion
  
  // Performance tracking
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 16; // 60fps max
  private pendingUpdates: Set<string> = new Set();
  
  // Displacement settings
  private displacementScale: number = 1.0;
  private displacementBias: number = 0.0;
  private normalScale: THREE.Vector2 = new THREE.Vector2(1, 1);
  
  constructor(
    modelScene: THREE.Group,
    baseCanvas: HTMLCanvasElement,
    memoryManager: PuffMemoryManager
  ) {
    this.modelScene = modelScene;
    this.baseCanvas = baseCanvas;
    this.memoryManager = memoryManager;
    
    this.initializeCanvases();
    this.initializeTextures();
    this.setupModelMaterials();
    
    console.log('🎈 PuffDisplacementEngine initialized');
  }
  
  // Initialize canvas contexts
  private initializeCanvases(): void {
    const size = this.baseCanvas.width;
    
    // Create displacement canvas
    this.displacementCanvas = this.memoryManager.createCanvas(size, size);
    this.displacementCtx = this.displacementCanvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false 
    })!;
    
    // Create normal canvas
    this.normalCanvas = this.memoryManager.createCanvas(size, size);
    this.normalCtx = this.normalCanvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false 
    })!;
    
    // Create height canvas
    this.heightCanvas = this.memoryManager.createCanvas(size, size);
    this.heightCtx = this.heightCanvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false 
    })!;
    
    // Initialize with neutral values
    this.clearCanvases();
  }
  
  // Initialize Three.js textures
  private initializeTextures(): void {
    this.displacementTexture = new THREE.CanvasTexture(this.displacementCanvas);
    this.displacementTexture.generateMipmaps = true;
    this.displacementTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.displacementTexture.magFilter = THREE.LinearFilter;
    this.displacementTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.displacementTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    this.normalTexture = new THREE.CanvasTexture(this.normalCanvas);
    this.normalTexture.generateMipmaps = true;
    this.normalTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.normalTexture.magFilter = THREE.LinearFilter;
    this.normalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.normalTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    this.heightTexture = new THREE.CanvasTexture(this.heightCanvas);
    this.heightTexture.generateMipmaps = true;
    this.heightTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.heightTexture.magFilter = THREE.LinearFilter;
    this.heightTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.heightTexture.wrapT = THREE.ClampToEdgeWrapping;
  }
  
  // Setup model materials for displacement
  private setupModelMaterials(): void {
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            // Enable displacement mapping
            mat.displacementMap = this.displacementTexture;
            mat.displacementScale = this.displacementScale;
            mat.displacementBias = this.displacementBias;
            
            // Enable normal mapping
            mat.normalMap = this.normalTexture;
            mat.normalScale = this.normalScale;
            
            // Ensure proper material settings
            mat.needsUpdate = true;
            
            // Subdivide geometry for better displacement
            this.subdivideGeometry(child);
          }
        });
      }
    });
  }
  
  // Subdivide geometry for better displacement quality
  private subdivideGeometry(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry;
    
    // Only subdivide if geometry has few vertices
    if (geometry.attributes.position.count < 2000) {
      const subdividedGeometry = this.performSubdivision(geometry, 2);
      mesh.geometry.dispose();
      mesh.geometry = subdividedGeometry;
      
      console.log(`🎈 Subdivided geometry: ${geometry.attributes.position.count} → ${subdividedGeometry.attributes.position.count} vertices`);
    }
  }
  
  // Perform geometry subdivision
  private performSubdivision(geometry: THREE.BufferGeometry, levels: number): THREE.BufferGeometry {
    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    const uvs = geometry.attributes.uv?.array;
    
    let currentPositions = new Float32Array(positions);
    let currentNormals = normals ? new Float32Array(normals) : undefined;
    let currentUvs = uvs ? new Float32Array(uvs) : undefined;
    
    for (let level = 0; level < levels; level++) {
      const newPositions: number[] = [];
      const newNormals: number[] = [];
      const newUvs: number[] = [];
      
      // Simple subdivision: add midpoint for each edge
      for (let i = 0; i < currentPositions.length; i += 9) { // 3 vertices per triangle
        const v1 = { x: currentPositions[i], y: currentPositions[i + 1], z: currentPositions[i + 2] };
        const v2 = { x: currentPositions[i + 3], y: currentPositions[i + 4], z: currentPositions[i + 5] };
        const v3 = { x: currentPositions[i + 6], y: currentPositions[i + 7], z: currentPositions[i + 8] };
        
        // Calculate midpoints
        const m12 = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2, z: (v1.z + v2.z) / 2 };
        const m23 = { x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2, z: (v2.z + v3.z) / 2 };
        const m31 = { x: (v3.x + v1.x) / 2, y: (v3.y + v1.y) / 2, z: (v3.z + v1.z) / 2 };
        
        // Create 4 new triangles
        const triangles = [
          [v1, m12, m31],
          [v2, m23, m12],
          [v3, m31, m23],
          [m12, m23, m31]
        ];
        
        triangles.forEach(triangle => {
          triangle.forEach(vertex => {
            newPositions.push(vertex.x, vertex.y, vertex.z);
          });
        });
      }
      
      currentPositions = new Float32Array(newPositions);
      
      // Update normals and UVs if they exist
      if (currentNormals) {
        // Recalculate normals
        const newNormalsArray = new Float32Array(newPositions.length);
        for (let i = 0; i < newPositions.length; i += 9) {
          const v1 = new THREE.Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
          const v2 = new THREE.Vector3(newPositions[i + 3], newPositions[i + 4], newPositions[i + 5]);
          const v3 = new THREE.Vector3(newPositions[i + 6], newPositions[i + 7], newPositions[i + 8]);
          
          const normal = new THREE.Vector3().crossVectors(
            new THREE.Vector3().subVectors(v2, v1),
            new THREE.Vector3().subVectors(v3, v1)
          ).normalize();
          
          for (let j = 0; j < 3; j++) {
            const idx = i + j * 3;
            newNormalsArray[idx] = normal.x;
            newNormalsArray[idx + 1] = normal.y;
            newNormalsArray[idx + 2] = normal.z;
          }
        }
        currentNormals = newNormalsArray;
      }
    }
    
    // Create new geometry
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    
    if (currentNormals) {
      newGeometry.setAttribute('normal', new THREE.BufferAttribute(currentNormals, 3));
    }
    
    if (currentUvs) {
      // Generate UVs for subdivided geometry
      const newUvsArray = new Float32Array(currentPositions.length / 3 * 2);
      for (let i = 0; i < newUvsArray.length; i += 2) {
        newUvsArray[i] = Math.random(); // Simple UV generation
        newUvsArray[i + 1] = Math.random();
      }
      newGeometry.setAttribute('uv', new THREE.BufferAttribute(newUvsArray, 2));
    }
    
    return newGeometry;
  }
  
  // Clear all canvases with neutral values
  private clearCanvases(): void {
    // CRITICAL FIX: Clear displacement canvas with black (0 = no displacement)
    this.displacementCtx.fillStyle = 'rgb(0, 0, 0)';
    this.displacementCtx.fillRect(0, 0, this.displacementCanvas.width, this.displacementCanvas.height);
    
    // Clear normal canvas (neutral normal pointing up)
    this.normalCtx.fillStyle = 'rgb(128, 128, 255)';
    this.normalCtx.fillRect(0, 0, this.normalCanvas.width, this.normalCanvas.height);
    
    // Clear height canvas (black = no height)
    this.heightCtx.fillStyle = 'rgb(0, 0, 0)';
    this.heightCtx.fillRect(0, 0, this.heightCanvas.width, this.heightCanvas.height);
  }
  
  // Paint a puff at the specified UV coordinates
  public paintPuff(
    uv: THREE.Vector2,
    size: number,
    height: number,
    softness: number,
    color: string,
    opacity: number,
    pattern: PuffPattern,
    patternScale: number,
    patternRotation: number,
    layer: any
  ): void {
    const now = performance.now();
    
    // Throttle updates for performance
    if (now - this.lastUpdateTime < this.updateThrottle) {
      this.pendingUpdates.add(`${uv.x},${uv.y}`);
      return;
    }
    
    this.lastUpdateTime = now;
    
    // Convert UV to canvas coordinates
    const x = Math.floor(uv.x * this.displacementCanvas.width);
    const y = Math.floor(uv.y * this.displacementCanvas.height);
    
    // Validate coordinates
    if (x < 0 || x >= this.displacementCanvas.width || y < 0 || y >= this.displacementCanvas.height) {
      return;
    }
    
    // Paint displacement map
    this.paintDisplacementMap(x, y, size, height, softness, opacity, pattern, patternScale, patternRotation);
    
    // Paint normal map
    this.paintNormalMap(x, y, size, height, softness, opacity, pattern, patternScale, patternRotation);
    
    // Paint height map
    this.paintHeightMap(x, y, size, height, softness, opacity, pattern, patternScale, patternRotation);
    
    // Update textures
    this.updateTextures();
    
    // Apply to model
    this.applyToModel();
    
    // Process pending updates
    this.processPendingUpdates();
  }
  
  // Paint displacement map
  private paintDisplacementMap(
    x: number,
    y: number,
    size: number,
    height: number,
    softness: number,
    opacity: number,
    pattern: PuffPattern,
    patternScale: number,
    patternRotation: number
  ): void {
    this.displacementCtx.save();
    
    // Set composite operation for blending
    this.displacementCtx.globalCompositeOperation = 'source-over';
    this.displacementCtx.globalAlpha = opacity;
    
    // Calculate displacement value
    // Displacement maps: 0-255, where 128 is neutral (no displacement)
    // Values > 128 push vertices outward, values < 128 pull vertices inward
    const baseDisplacement = 128; // Neutral gray
    const displacementRange = height * 100; // Scale height to displacement range
    const maxDisplacement = Math.min(255, baseDisplacement + displacementRange);
    const minDisplacement = Math.max(0, baseDisplacement - displacementRange * 0.1);
    
    // Create gradient for soft edges
    const gradient = this.displacementCtx.createRadialGradient(
      x, y, 0,
      x, y, size / 2
    );
    
    // Apply softness to gradient stops
    const centerStop = 0;
    const edgeStop = softness;
    
    gradient.addColorStop(centerStop, `rgb(${maxDisplacement}, ${maxDisplacement}, ${maxDisplacement})`);
    gradient.addColorStop(edgeStop, `rgb(${minDisplacement}, ${minDisplacement}, ${minDisplacement})`);
    gradient.addColorStop(1, `rgb(${baseDisplacement}, ${baseDisplacement}, ${baseDisplacement})`);
    
    this.displacementCtx.fillStyle = gradient;
    
    // Apply pattern if available
    if (pattern && pattern.drawFunction) {
      this.displacementCtx.translate(x, y);
      this.displacementCtx.scale(patternScale, patternScale);
      this.displacementCtx.rotate((patternRotation * Math.PI) / 180);
      
      pattern.drawFunction(this.displacementCtx, 0, 0, size);
    } else {
      // Default circular puff
      this.displacementCtx.beginPath();
      this.displacementCtx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.displacementCtx.fill();
    }
    
    this.displacementCtx.restore();
  }
  
  // Paint normal map
  private paintNormalMap(
    x: number,
    y: number,
    size: number,
    height: number,
    softness: number,
    opacity: number,
    pattern: PuffPattern,
    patternScale: number,
    patternRotation: number
  ): void {
    this.normalCtx.save();
    
    this.normalCtx.globalCompositeOperation = 'source-over';
    this.normalCtx.globalAlpha = opacity;
    
    // Normal maps: RGB values represent XYZ normal vectors
    // (128, 128, 255) = neutral normal pointing up (0, 0, 1)
    const baseNormal = { r: 128, g: 128, b: 255 };
    const normalIntensity = Math.min(255, 128 + height * 50);
    
    // Create gradient for normal variation
    const gradient = this.normalCtx.createRadialGradient(
      x, y, 0,
      x, y, size / 2
    );
    
    gradient.addColorStop(0, `rgb(${normalIntensity}, ${normalIntensity}, 255)`);
    gradient.addColorStop(softness, `rgb(${baseNormal.r}, ${baseNormal.g}, ${baseNormal.b})`);
    gradient.addColorStop(1, `rgb(${baseNormal.r}, ${baseNormal.g}, ${baseNormal.b})`);
    
    this.normalCtx.fillStyle = gradient;
    
    // Apply pattern
    if (pattern && pattern.drawFunction) {
      this.normalCtx.translate(x, y);
      this.normalCtx.scale(patternScale, patternScale);
      this.normalCtx.rotate((patternRotation * Math.PI) / 180);
      
      pattern.drawFunction(this.normalCtx, 0, 0, size);
    } else {
      this.normalCtx.beginPath();
      this.normalCtx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.normalCtx.fill();
    }
    
    this.normalCtx.restore();
  }
  
  // Paint height map
  private paintHeightMap(
    x: number,
    y: number,
    size: number,
    height: number,
    softness: number,
    opacity: number,
    pattern: PuffPattern,
    patternScale: number,
    patternRotation: number
  ): void {
    this.heightCtx.save();
    
    this.heightCtx.globalCompositeOperation = 'source-over';
    this.heightCtx.globalAlpha = opacity;
    
    // Height maps: grayscale values represent height
    // Black (0) = lowest, White (255) = highest
    const heightValue = Math.min(255, height * 100);
    
    const gradient = this.heightCtx.createRadialGradient(
      x, y, 0,
      x, y, size / 2
    );
    
    gradient.addColorStop(0, `rgb(${heightValue}, ${heightValue}, ${heightValue})`);
    gradient.addColorStop(softness, `rgb(${heightValue * 0.5}, ${heightValue * 0.5}, ${heightValue * 0.5})`);
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
    
    this.heightCtx.fillStyle = gradient;
    
    // Apply pattern
    if (pattern && pattern.drawFunction) {
      this.heightCtx.translate(x, y);
      this.heightCtx.scale(patternScale, patternScale);
      this.heightCtx.rotate((patternRotation * Math.PI) / 180);
      
      pattern.drawFunction(this.heightCtx, 0, 0, size);
    } else {
      this.heightCtx.beginPath();
      this.heightCtx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.heightCtx.fill();
    }
    
    this.heightCtx.restore();
  }
  
  // Update Three.js textures
  private updateTextures(): void {
    this.displacementTexture.needsUpdate = true;
    this.normalTexture.needsUpdate = true;
    this.heightTexture.needsUpdate = true;
  }
  
  // Apply textures to model
  private applyToModel(): void {
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            mat.displacementMap = this.displacementTexture;
            mat.normalMap = this.normalTexture;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }
  
  // Process pending updates
  private processPendingUpdates(): void {
    if (this.pendingUpdates.size === 0) return;
    
    // Process a few pending updates per frame to avoid blocking
    const updatesToProcess = Math.min(3, this.pendingUpdates.size);
    const updates = Array.from(this.pendingUpdates).slice(0, updatesToProcess);
    
    updates.forEach(update => {
      this.pendingUpdates.delete(update);
      // Process the update (simplified for now)
    });
  }
  
  // Get displacement result
  public getDisplacementResult(): DisplacementResult {
    return {
      displacementMap: this.displacementTexture,
      normalMap: this.normalTexture,
      heightMap: this.heightTexture,
      needsUpdate: true
    };
  }
  
  // Update displacement settings
  public updateSettings(scale: number, bias: number, normalScale: THREE.Vector2): void {
    this.displacementScale = scale;
    this.displacementBias = bias;
    this.normalScale = normalScale;
    
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            mat.displacementScale = this.displacementScale;
            mat.displacementBias = this.displacementBias;
            mat.normalScale = this.normalScale;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }
  
  // Clear all displacement data
  public clearAll(): void {
    this.clearCanvases();
    this.updateTextures();
    this.applyToModel();
  }
  
  // Cleanup resources
  public cleanup(): void {
    console.log('🧹 PuffDisplacementEngine cleanup started');
    
    // Dispose Three.js textures
    if (this.displacementTexture) {
      this.displacementTexture.dispose();
      this.displacementTexture = null as any;
    }
    if (this.normalTexture) {
      this.normalTexture.dispose();
      this.normalTexture = null as any;
    }
    if (this.heightTexture) {
      this.heightTexture.dispose();
      this.heightTexture = null as any;
    }
    
    // Clear canvas contexts
    if (this.displacementCtx) {
      this.displacementCtx.clearRect(0, 0, this.displacementCanvas.width, this.displacementCanvas.height);
    }
    if (this.normalCtx) {
      this.normalCtx.clearRect(0, 0, this.normalCanvas.width, this.normalCanvas.height);
    }
    if (this.heightCtx) {
      this.heightCtx.clearRect(0, 0, this.heightCanvas.width, this.heightCanvas.height);
    }
    
    // Release canvases to memory manager
    if (this.memoryManager) {
      this.memoryManager.releaseCanvas(this.displacementCanvas);
      this.memoryManager.releaseCanvas(this.normalCanvas);
      this.memoryManager.releaseCanvas(this.heightCanvas);
    }
    
    // Clear references
    this.displacementCanvas = null as any;
    this.normalCanvas = null as any;
    this.heightCanvas = null as any;
    this.displacementCtx = null as any;
    this.normalCtx = null as any;
    this.heightCtx = null as any;
    
    console.log('🧹 PuffDisplacementEngine cleanup completed');
  }
}

export default PuffDisplacementEngine;

