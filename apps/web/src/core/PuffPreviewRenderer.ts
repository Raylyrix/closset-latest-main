/**
 * 👁️ PUFF PREVIEW RENDERER
 * 
 * Real-time 3D preview system for puff print effects:
 * - Live 3D model preview
 * - Multiple lighting setups
 * - Quality settings for performance
 * - Camera controls
 * - Wireframe and normal visualization
 */

import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PreviewSettings {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  lighting: 'studio' | 'natural' | 'dramatic';
  cameraAngle: 'front' | 'side' | 'top' | 'free';
  showWireframe: boolean;
  showNormals: boolean;
  backgroundColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
}

export interface PreviewStats {
  fps: number;
  renderTime: number;
  triangleCount: number;
  drawCalls: number;
  memoryUsage: number;
}

// ============================================================================
// PREVIEW RENDERER CLASS
// ============================================================================

export class PuffPreviewRenderer {
  private modelScene: THREE.Group;
  private settings: PreviewSettings;
  
  // Three.js objects
  private scene!: THREE.Scene; // FIXED: Add definite assignment assertion
  private camera!: THREE.PerspectiveCamera; // FIXED: Add definite assignment assertion
  private renderer!: THREE.WebGLRenderer; // FIXED: Add definite assignment assertion
  private controls: any; // OrbitControls
  
  // Lighting
  private ambientLight!: THREE.AmbientLight; // FIXED: Add definite assignment assertion
  private directionalLight!: THREE.DirectionalLight; // FIXED: Add definite assignment assertion
  private pointLights!: THREE.PointLight[]; // FIXED: Add definite assignment assertion
  
  // Materials
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  private previewMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  
  // Performance tracking
  private stats: PreviewStats = {
    fps: 60,
    renderTime: 0,
    triangleCount: 0,
    drawCalls: 0,
    memoryUsage: 0
  };
  
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 1000; // Update FPS every second
  private lastFpsUpdate: number = 0;
  
  // Rendering optimization
  private renderTarget!: THREE.WebGLRenderTarget; // FIXED: Add definite assignment assertion
  private needsUpdate: boolean = true;
  private updateThrottle: number = 16; // 60fps max
  
  constructor(modelScene: THREE.Group, settings: PreviewSettings) {
    this.modelScene = modelScene;
    this.settings = settings;
    
    this.initializeRenderer();
    this.setupLighting();
    this.setupCamera();
    this.setupMaterials();
    
    console.log('👁️ PuffPreviewRenderer initialized');
  }
  
  // Initialize WebGL renderer
  private initializeRenderer(): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.backgroundColor);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.settings.quality !== 'low',
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(512, 512);
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create render target for off-screen rendering
    this.renderTarget = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    
    // Add model to scene
    this.scene.add(this.modelScene);
  }
  
  // Setup lighting based on settings
  private setupLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, this.settings.ambientIntensity);
    this.scene.add(this.ambientLight);
    
    // Directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.settings.directionalIntensity);
    this.directionalLight.position.set(5, 5, 5);
    this.directionalLight.castShadow = this.settings.quality !== 'low';
    
    if (this.directionalLight.castShadow) {
      this.directionalLight.shadow.mapSize.width = this.getShadowMapSize();
      this.directionalLight.shadow.mapSize.height = this.getShadowMapSize();
      this.directionalLight.shadow.camera.near = 0.1;
      this.directionalLight.shadow.camera.far = 50;
      this.directionalLight.shadow.camera.left = -10;
      this.directionalLight.shadow.camera.right = 10;
      this.directionalLight.shadow.camera.top = 10;
      this.directionalLight.shadow.camera.bottom = -10;
    }
    
    this.scene.add(this.directionalLight);
    
    // Point lights for dramatic lighting
    if (this.settings.lighting === 'dramatic') {
      this.pointLights = [
        new THREE.PointLight(0xff6b6b, 0.5, 10),
        new THREE.PointLight(0x4ecdc4, 0.5, 10),
        new THREE.PointLight(0x45b7d1, 0.5, 10)
      ];
      
      this.pointLights.forEach((light, index) => {
        const angle = (index * Math.PI * 2) / this.pointLights.length;
        light.position.set(
          Math.cos(angle) * 3,
          2,
          Math.sin(angle) * 3
        );
        this.scene.add(light);
      });
    }
    
    this.updateLighting();
  }
  
  // Setup camera
  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      50,
      1, // Aspect ratio will be set by renderer
      0.1,
      1000
    );
    
    this.updateCameraPosition();
  }
  
  // Setup materials for preview
  private setupMaterials(): void {
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        // Store original materials
        this.originalMaterials.set(child.uuid, child.material);
        
        // Create preview materials
        const previewMaterials = materials.map((mat: any) => { // FIXED: Parameter type
          if (mat.isMeshStandardMaterial) {
            const previewMat = mat.clone();
            previewMat.wireframe = this.settings.showWireframe;
            
            // Add normal visualization if enabled
            if (this.settings.showNormals) {
              previewMat.normalScale = new THREE.Vector2(2, 2);
            }
            
            return previewMat;
          }
          return mat;
        });
        
        this.previewMaterials.set(child.uuid, previewMaterials.length === 1 ? previewMaterials[0] : previewMaterials);
        child.material = previewMaterials.length === 1 ? previewMaterials[0] : previewMaterials;
      }
    });
  }
  
  // Update preview with new layer data
  public updatePreview(layer: any): void {
    if (!this.settings.enabled) return;
    
    const now = performance.now();
    if (now - this.lastFrameTime < this.updateThrottle) {
      return;
    }
    
    this.lastFrameTime = now;
    this.needsUpdate = true;
    
    // Update materials with new displacement data
    this.updateMaterials(layer);
  }
  
  // Update materials with layer data
  private updateMaterials(layer: any): void {
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            // Update displacement map
            if (layer.displacementCanvas) {
              const displacementTexture = new THREE.CanvasTexture(layer.displacementCanvas);
              displacementTexture.generateMipmaps = true;
              displacementTexture.minFilter = THREE.LinearMipmapLinearFilter;
              displacementTexture.magFilter = THREE.LinearFilter;
              displacementTexture.needsUpdate = true;
              
              mat.displacementMap = displacementTexture;
              mat.displacementScale = 1.0;
              mat.displacementBias = 0;
            }
            
            // Update normal map
            if (layer.normalCanvas) {
              const normalTexture = new THREE.CanvasTexture(layer.normalCanvas);
              normalTexture.generateMipmaps = true;
              normalTexture.minFilter = THREE.LinearMipmapLinearFilter;
              normalTexture.magFilter = THREE.LinearFilter;
              normalTexture.needsUpdate = true;
              
              mat.normalMap = normalTexture;
              mat.normalScale = new THREE.Vector2(1, 1);
            }
            
            mat.needsUpdate = true;
          }
        });
      }
    });
  }
  
  // Render preview
  public render(): HTMLCanvasElement | null {
    if (!this.settings.enabled || !this.needsUpdate) {
      return null;
    }
    
    const startTime = performance.now();
    
    // Update camera if needed
    this.updateCameraPosition();
    
    // Render to render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    
    // Update stats
    const renderTime = performance.now() - startTime;
    this.updateStats(renderTime);
    
    this.needsUpdate = false;
    
    return this.renderer.domElement;
  }
  
  // Update camera position based on settings
  private updateCameraPosition(): void {
    const distance = 5;
    
    switch (this.settings.cameraAngle) {
      case 'front':
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'side':
        this.camera.position.set(distance, 0, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'top':
        this.camera.position.set(0, distance, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'free':
        // For free camera, position will be controlled by OrbitControls
        this.camera.position.set(distance, distance, distance);
        this.camera.lookAt(0, 0, 0);
        break;
    }
  }
  
  // Update lighting based on settings
  private updateLighting(): void {
    switch (this.settings.lighting) {
      case 'studio':
        this.ambientLight.intensity = 0.3;
        this.directionalLight.intensity = 0.8;
        this.directionalLight.position.set(5, 5, 5);
        break;
      case 'natural':
        this.ambientLight.intensity = 0.5;
        this.directionalLight.intensity = 0.6;
        this.directionalLight.position.set(3, 8, 3);
        break;
      case 'dramatic':
        this.ambientLight.intensity = 0.2;
        this.directionalLight.intensity = 1.0;
        this.directionalLight.position.set(8, 3, 8);
        break;
    }
    
    // Update point lights for dramatic lighting
    if (this.settings.lighting === 'dramatic' && this.pointLights) {
      this.pointLights.forEach((light, index) => {
        const angle = (index * Math.PI * 2) / this.pointLights.length;
        light.position.set(
          Math.cos(angle) * 3,
          2,
          Math.sin(angle) * 3
        );
        light.intensity = 0.5;
      });
    }
  }
  
  // Update settings
  public updateSettings(newSettings: Partial<PreviewSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Update renderer settings
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    
    // Update scene background
    this.scene.background = new THREE.Color(this.settings.backgroundColor);
    
    // Update lighting
    this.updateLighting();
    
    // Update materials
    this.updateMaterialSettings();
    
    this.needsUpdate = true;
  }
  
  // Update material settings
  private updateMaterialSettings(): void {
    this.modelScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((mat: any) => {
          if (mat.isMeshStandardMaterial) {
            mat.wireframe = this.settings.showWireframe;
            
            if (this.settings.showNormals) {
              mat.normalScale = new THREE.Vector2(2, 2);
            } else {
              mat.normalScale = new THREE.Vector2(1, 1);
            }
            
            mat.needsUpdate = true;
          }
        });
      }
    });
  }
  
  // Get pixel ratio based on quality
  private getPixelRatio(): number {
    switch (this.settings.quality) {
      case 'low':
        return 1;
      case 'medium':
        return 1.5;
      case 'high':
        return 2;
      case 'ultra':
        return Math.min(window.devicePixelRatio, 3);
      default:
        return 1;
    }
  }
  
  // Get shadow map size based on quality
  private getShadowMapSize(): number {
    switch (this.settings.quality) {
      case 'low':
        return 512;
      case 'medium':
        return 1024;
      case 'high':
        return 2048;
      case 'ultra':
        return 4096;
      default:
        return 1024;
    }
  }
  
  // Update performance stats
  private updateStats(renderTime: number): void {
    this.stats.renderTime = renderTime;
    
    // Calculate FPS
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    // Get renderer info
    const info = this.renderer.info;
    this.stats.triangleCount = info.render.triangles;
    this.stats.drawCalls = info.render.calls;
    this.stats.memoryUsage = info.memory.geometries + info.memory.textures;
  }
  
  // Get current stats
  public getStats(): PreviewStats {
    return { ...this.stats };
  }
  
  // Resize preview
  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderTarget.setSize(width, height);
    
    this.needsUpdate = true;
  }
  
  // Set camera controls (OrbitControls)
  public setControls(controls: any): void {
    this.controls = controls;
  }
  
  // Take screenshot
  public takeScreenshot(): string {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }
  
  // Export preview as image
  public exportPreview(width: number = 1024, height: number = 1024): string {
    const originalSize = this.renderer.getSize(new THREE.Vector2());
    
    // Resize for export
    this.resize(width, height);
    
    // Render
    this.render();
    
    // Get data URL
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    
    // Restore original size
    this.resize(originalSize.x, originalSize.y);
    
    return dataURL;
  }
  
  // Cleanup resources
  public cleanup(): void {
    // Dispose renderer
    this.renderer.dispose();
    
    // Dispose render target
    this.renderTarget.dispose();
    
    // Dispose materials
    this.previewMaterials.forEach(material => {
      if (Array.isArray(material)) {
        material.forEach(mat => mat.dispose());
      } else {
        material.dispose();
      }
    });
    
    // Dispose geometries
    this.modelScene.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.dispose();
      }
    });
    
    console.log('👁️ PuffPreviewRenderer cleaned up');
  }
}

export default PuffPreviewRenderer;


