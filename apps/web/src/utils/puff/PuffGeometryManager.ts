/**
 * 🎈 Puff Geometry Manager
 * 
 * Creates and manages 3D geometry meshes for puff printing.
 * Adds actual 3D geometry on top of the model surface.
 */

import * as THREE from 'three';
import { useApp } from '../../App';

export interface PuffStrokePoint {
  uv: THREE.Vector2;
  worldPosition: THREE.Vector3;
  normal: THREE.Vector3;
}

// Shape customization types
export type TopShape = 'flat' | 'rounded' | 'pointed' | 'beveled';
export type BottomShape = 'square' | 'rounded' | 'beveled' | 'tapered';
export type CrossSectionShape = 'circle' | 'square' | 'roundedSquare' | 'oval';
export type ProfileCurve = 'linear' | 'quadratic' | 'cubic' | 'exponential';

// Material types
export type FabricType = 'cotton' | 'silk' | 'denim' | 'leather' | 'custom';
export type EdgeType = 'none' | 'stitching' | 'hemming' | 'binding' | 'raw';

export interface PuffSettings {
  height: number;
  size: number;
  softness: number;
  color: string;
  opacity: number;
  
  // Shape customization (Phase 1)
  topShape?: TopShape;
  bottomShape?: BottomShape;
  crossSectionShape?: CrossSectionShape;
  profileCurve?: ProfileCurve;
  edgeRadius?: number; // 0-100% for edge beveling
  taperAmount?: number; // 0-100% for bottom tapering
  
  // Material & texture (Phase 3)
  fabricType?: FabricType;
  roughness?: number; // 0-1
  textureIntensity?: number; // 0-1
  enableNormalMap?: boolean;
  
  // Edge details (Phase 4)
  edgeType?: EdgeType;
  edgeWidth?: number; // 1-10px
  edgeColor?: string;
  
  // Advanced (Phase 5)
  detailLevel?: 'low' | 'medium' | 'high' | 'auto';
  smoothness?: number; // 0-100%
  
  // Existing features
  hairs?: boolean;
  hairHeight?: number;
  hairDensity?: number;
  hairThickness?: number;
  hairVariation?: number;
  gradient?: {
    type: 'linear' | 'radial' | 'angular' | 'diamond';
    angle: number;
    stops: Array<{
      id: string;
      color: string;
      position: number;
    }>;
  };
}

class PuffGeometryManager {
  private puffMeshes: Map<string, THREE.Mesh> = new Map();
  private currentStrokeId: string | null = null;
  private currentStrokePoints: PuffStrokePoint[] = [];

  /**
   * Get profile radius based on curve type
   * CRITICAL FIX: Use smoother curves to eliminate visible layering
   */
  private getProfileRadius(
    heightRatio: number, // 0 = base, 1 = top
    curve: ProfileCurve = 'cubic'
  ): number {
    switch (curve) {
      case 'linear':
        return 1 - heightRatio; // Straight line
      case 'quadratic':
        // Smoother quadratic: use cosine interpolation for ultra-smooth transition
        return Math.cos(heightRatio * Math.PI / 2);
      case 'cubic':
        // Ultra-smooth cubic: use smoothstep-like function
        const t = heightRatio;
        const smoothT = t * t * (3 - 2 * t); // Smoothstep for ultra-smooth curve
        return Math.cos(smoothT * Math.PI / 2);
      case 'exponential':
        // Fast falloff with smooth transition
        return Math.exp(-heightRatio * 2);
      default:
        // Default to ultra-smooth cubic
        const defaultT = heightRatio;
        const defaultSmoothT = defaultT * defaultT * (3 - 2 * defaultT);
        return Math.cos(defaultSmoothT * Math.PI / 2);
    }
  }

  /**
   * Apply top shape modifier
   */
  private applyTopShape(
    heightRatio: number,
    topShape: TopShape = 'rounded',
    bevelAmount: number = 0.1
  ): number {
    if (heightRatio < 0.9) return heightRatio; // Only affect top 10%
    
    const topRatio = (heightRatio - 0.9) / 0.1; // 0-1 for top section
    
    switch (topShape) {
      case 'flat':
        return 0.9; // Flat top
      case 'rounded':
        return heightRatio; // Natural curve
      case 'pointed':
        return 0.9 + topRatio * 0.1; // Sharp peak
      case 'beveled':
        return 0.9 + (topRatio < bevelAmount ? topRatio / bevelAmount * 0.1 : 0.1);
      default:
        return heightRatio;
    }
  }

  /**
   * Apply bottom shape modifier
   */
  private applyBottomShape(
    heightRatio: number,
    bottomShape: BottomShape = 'rounded',
    taperAmount: number = 0
  ): number {
    if (heightRatio > 0.1) return heightRatio; // Only affect bottom 10%
    
    const bottomRatio = heightRatio / 0.1; // 0-1 for bottom section
    
    switch (bottomShape) {
      case 'square':
        return 0; // Sharp edge
      case 'rounded':
        return heightRatio; // Natural curve
      case 'beveled':
        return bottomRatio < 0.3 ? bottomRatio / 0.3 * 0.1 : 0.1;
      case 'tapered':
        // Apply tapering: more taper = faster transition
        const taperFactor = 1 - (taperAmount / 100);
        return Math.pow(bottomRatio, taperFactor) * 0.1;
      default:
        return heightRatio;
    }
  }

  /**
   * Get cross-section offset based on shape
   */
  private getCrossSectionOffset(
    angle: number,
    shape: CrossSectionShape = 'circle',
    radius: number,
    aspectRatio: number = 1.0
  ): { x: number; y: number } {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const absCos = Math.abs(cosAngle);
    const absSin = Math.abs(sinAngle);
    
    switch (shape) {
      case 'circle':
        return {
          x: cosAngle * radius,
          y: sinAngle * radius
        };
      case 'square':
        // Square: use max of cos/sin to create square shape
        const maxAbsSquare = Math.max(absCos, absSin);
        return {
          x: Math.sign(cosAngle) * radius * (absCos / maxAbsSquare),
          y: Math.sign(sinAngle) * radius * (absSin / maxAbsSquare)
        };
      case 'roundedSquare':
        // Rounded square: square with rounded corners
        const cornerRadius = 0.3;
        const isCorner = absCos > cornerRadius && absSin > cornerRadius;
        if (isCorner) {
          // In corner region - use square
          const maxAbsRounded = Math.max(absCos, absSin);
          return {
            x: Math.sign(cosAngle) * radius * (absCos / maxAbsRounded),
            y: Math.sign(sinAngle) * radius * (absSin / maxAbsRounded)
          };
        } else {
          // Outside corner - use circle
          return {
            x: cosAngle * radius,
            y: sinAngle * radius
          };
        }
      case 'oval':
        return {
          x: cosAngle * radius * aspectRatio,
          y: sinAngle * radius
        };
      default:
        return {
          x: cosAngle * radius,
          y: sinAngle * radius
        };
    }
  }

  /**
   * Add edge details (stitching, hemming, binding, raw) to geometry
   */
  private addEdgeDetails(
    geometry: THREE.BufferGeometry,
    settings: PuffSettings,
    basePosition: THREE.Vector3,
    normal: THREE.Vector3,
    tangent: THREE.Vector3,
    bitangent: THREE.Vector3,
    size: number,
    segments: number
  ): void {
    const edgeType = settings.edgeType || 'none';
    const edgeWidth = (settings.edgeWidth || 2) * 0.001; // Convert px to world units (approximate)
    const edgeColor = settings.edgeColor || '#000000';
    
    if (edgeType === 'none') return;
    
    // Get current geometry attributes
    const positions = geometry.attributes.position.array as Float32Array;
    const normals = geometry.attributes.normal.array as Float32Array;
    const uvs = geometry.attributes.uv.array as Float32Array;
    const indices = geometry.index?.array as Uint32Array || [];
    
    // Create edge ring geometry
    const edgePositions: number[] = [];
    const edgeNormals: number[] = [];
    const edgeUVs: number[] = [];
    const edgeIndices: number[] = [];
    
    // Create edge ring at base (slightly below surface for visibility)
    const edgeOffset = -edgeWidth * 0.5; // Slightly below base
    const edgeRadius = size * 1.02; // Slightly larger than base for visibility
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const offset2D = this.getCrossSectionOffset(angle, settings.crossSectionShape || 'circle', edgeRadius, 1.0);
      
      const offset = new THREE.Vector3()
        .addScaledVector(tangent, offset2D.x)
        .addScaledVector(bitangent, offset2D.y);
      
      const edgePos = basePosition.clone()
        .add(offset)
        .add(normal.clone().multiplyScalar(edgeOffset));
      
      edgePositions.push(edgePos.x, edgePos.y, edgePos.z);
      edgeNormals.push(-normal.x, -normal.y, -normal.z);
      edgeUVs.push(i / segments, 0);
    }
    
    // Create edge faces (ring)
    const startIndex = positions.length / 3;
    for (let i = 0; i < segments; i++) {
      const i1 = startIndex + i;
      const i2 = startIndex + (i + 1) % segments;
      const i3 = startIndex + segments + i;
      const i4 = startIndex + segments + (i + 1) % segments;
      
      // Create quad (two triangles)
      edgeIndices.push(i1, i2, i3);
      edgeIndices.push(i2, i4, i3);
    }
    
    // Merge edge geometry with main geometry
    const newPositions = new Float32Array(positions.length + edgePositions.length);
    newPositions.set(positions);
    newPositions.set(edgePositions, positions.length);
    
    const newNormals = new Float32Array(normals.length + edgeNormals.length);
    newNormals.set(normals);
    newNormals.set(edgeNormals, normals.length);
    
    const newUVs = new Float32Array(uvs.length + edgeUVs.length);
    newUVs.set(uvs);
    newUVs.set(edgeUVs, uvs.length);
    
    const newIndices = new Uint32Array(indices.length + edgeIndices.length);
    newIndices.set(indices);
    newIndices.set(edgeIndices.map(idx => idx + positions.length / 3), indices.length);
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
    geometry.setIndex(Array.from(newIndices)); // Convert to array for Three.js compatibility
    geometry.computeVertexNormals();
  }

  /**
   * Calculate adaptive segments based on size and detail level
   * CRITICAL FIX: Reduced heightSegments to eliminate visible layering
   */
  private getAdaptiveSegments(
    size: number,
    detailLevel: 'low' | 'medium' | 'high' | 'auto' = 'auto'
  ): { segments: number; heightSegments: number } {
    if (detailLevel === 'auto') {
      // Adaptive based on size - CRITICAL: Use fewer height segments to avoid layering
      if (size < 0.1) {
        return { segments: 16, heightSegments: 2 }; // Reduced from 4 to 2
      } else if (size < 0.3) {
        return { segments: 24, heightSegments: 3 }; // Reduced from 6 to 3
      } else if (size < 0.5) {
        return { segments: 32, heightSegments: 4 }; // Reduced from 8 to 4
      } else {
        return { segments: 48, heightSegments: 5 }; // Reduced from 12 to 5
      }
    } else {
      // Fixed based on detail level - CRITICAL: Use minimal height segments
      switch (detailLevel) {
        case 'low':
          return { segments: 16, heightSegments: 2 }; // Reduced from 4 to 2
        case 'medium':
          return { segments: 24, heightSegments: 3 }; // Reduced from 6 to 3
        case 'high':
          return { segments: 48, heightSegments: 5 }; // Reduced from 12 to 5
        default:
          return { segments: 24, heightSegments: 3 }; // Reduced from 6 to 3
      }
    }
  }

  /**
   * Start a new puff stroke
   * CRITICAL: This clears any previous stroke data to prevent bridging between separate puffs
   */
  startStroke(strokeId: string): void {
    // CRITICAL: Clear any existing stroke data before starting a new stroke
    // This prevents bridging between separate puff strokes
    if (this.currentStrokeId && this.currentStrokePoints.length > 0) {
      console.warn('🎈 PuffGeometryManager: Starting new stroke while previous stroke exists. Clearing old stroke data.');
    }
    this.currentStrokeId = strokeId;
    this.currentStrokePoints = []; // Clear all previous points
  }

  /**
   * Add a point to the current stroke
   * CRITICAL: If no stroke is active, this should NOT create a new stroke automatically
   * A stroke must be explicitly started with startStroke() to prevent accidental bridging
   */
  addPointToStroke(point: PuffStrokePoint): void {
    if (!this.currentStrokeId) {
      console.warn('🎈 PuffGeometryManager: Attempted to add point without active stroke. Point ignored.');
      return; // Don't create a stroke automatically - must call startStroke() first
    }
    this.currentStrokePoints.push(point);
  }

  /**
   * Get fabric material properties based on fabric type
   */
  private getFabricProperties(fabricType: FabricType = 'cotton'): { roughness: number; metalness: number } {
    switch (fabricType) {
      case 'cotton':
        return { roughness: 0.8, metalness: 0.0 };
      case 'silk':
        return { roughness: 0.2, metalness: 0.0 };
      case 'denim':
        return { roughness: 0.9, metalness: 0.0 };
      case 'leather':
        return { roughness: 0.6, metalness: 0.0 };
      case 'custom':
        return { roughness: 0.7, metalness: 0.0 };
      default:
        return { roughness: 0.8, metalness: 0.0 };
    }
  }

  /**
   * Generate fabric normal map texture
   */
  private generateFabricNormalMap(intensity: number = 0.3): THREE.Texture {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      // Fallback: return a default texture
      const defaultCanvas = document.createElement('canvas');
      defaultCanvas.width = 1;
      defaultCanvas.height = 1;
      return new THREE.CanvasTexture(defaultCanvas);
    }
    
    // Create fabric weave pattern
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        
        // Create weave pattern (warp and weft)
        const warp = Math.sin((x / size) * Math.PI * 8) * 0.5 + 0.5;
        const weft = Math.sin((y / size) * Math.PI * 8) * 0.5 + 0.5;
        const pattern = (warp + weft) / 2;
        
        // Normal map: R = X normal, G = Y normal, B = Z normal
        // For fabric weave, create subtle bumps
        const bump = pattern * intensity;
        const r = 128 + bump * 127; // X normal (red channel)
        const g = 128 + bump * 127; // Y normal (green channel)
        const b = 255; // Z normal (blue channel) - always pointing up
        
        data[index] = r;     // R
        data[index + 1] = g; // G
        data[index + 2] = b; // B
        data[index + 3] = 255; // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    return texture;
  }

  /**
   * Create a material with gradient support and fabric properties
   */
  private createPuffMaterial(
    color: string,
    opacity: number,
    gradient?: PuffSettings['gradient'],
    fabricType?: FabricType,
    roughness?: number,
    textureIntensity?: number,
    enableNormalMap?: boolean
  ): THREE.MeshStandardMaterial {
    if (gradient) {
      // Create gradient texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        let gradientObj: CanvasGradient;
        
        if (gradient.type === 'linear') {
          const angleRad = (gradient.angle * Math.PI) / 180;
          const x1 = canvas.width / 2 - Math.cos(angleRad) * canvas.width / 2;
          const y1 = canvas.height / 2 - Math.sin(angleRad) * canvas.height / 2;
          const x2 = canvas.width / 2 + Math.cos(angleRad) * canvas.width / 2;
          const y2 = canvas.height / 2 + Math.sin(angleRad) * canvas.height / 2;
          gradientObj = ctx.createLinearGradient(x1, y1, x2, y2);
        } else if (gradient.type === 'radial') {
          gradientObj = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
          );
        } else {
          // Angular or diamond - use linear as fallback
          const angleRad = (gradient.angle * Math.PI) / 180;
          const x1 = canvas.width / 2 - Math.cos(angleRad) * canvas.width / 2;
          const y1 = canvas.height / 2 - Math.sin(angleRad) * canvas.height / 2;
          const x2 = canvas.width / 2 + Math.cos(angleRad) * canvas.width / 2;
          const y2 = canvas.height / 2 + Math.sin(angleRad) * canvas.height / 2;
          gradientObj = ctx.createLinearGradient(x1, y1, x2, y2);
        }
        
        // Add color stops
        const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
          gradientObj.addColorStop(stop.position / 100, stop.color);
        });
        
        ctx.fillStyle = gradientObj;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Get fabric properties
        const fabricProps = this.getFabricProperties(fabricType);
        const finalRoughness = roughness !== undefined ? roughness : fabricProps.roughness;
        
        // CRITICAL: Set color to white so texture colors show through properly
        // When using a texture map, the material color multiplies with the texture
        // White (1,1,1) means the texture colors are displayed as-is
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(0xffffff), // White base color for proper texture display
          opacity: opacity,
          transparent: opacity < 1.0,
          roughness: finalRoughness,
          metalness: fabricProps.metalness,
          side: THREE.FrontSide
        });
        
        // Phase 3: Add normal map if enableNormalMap is true
        if (enableNormalMap) {
          material.normalMap = this.generateFabricNormalMap(textureIntensity || 0.3);
          material.normalScale = new THREE.Vector2(1, 1);
        }
        
        return material;
      }
    }
    
    // Get fabric properties for solid color
    const fabricProps = this.getFabricProperties(fabricType);
    const finalRoughness = roughness !== undefined ? roughness : fabricProps.roughness;
    
    // Fallback to solid color with fabric properties
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      opacity: opacity,
      transparent: opacity < 1.0,
      roughness: finalRoughness,
      metalness: fabricProps.metalness,
      side: THREE.FrontSide
    });
  }

  /**
   * Create a 3D mesh for a single puff point (solid dome shape)
   */
  createPuffDomeMesh(point: PuffStrokePoint, settings: PuffSettings): THREE.Mesh {
    const { worldPosition, normal } = point;
    const { height, size, color, opacity } = settings;

    // Get shape customization settings with defaults
    const topShape = settings.topShape || 'rounded';
    const bottomShape = settings.bottomShape || 'rounded';
    const crossSectionShape = settings.crossSectionShape || 'circle';
    const profileCurve = settings.profileCurve || 'cubic';
    const edgeRadius = settings.edgeRadius || 10;
    const taperAmount = settings.taperAmount || 0;
    const detailLevel = settings.detailLevel || 'auto';

    // Get adaptive segments based on size and detail level
    const { segments, heightSegments } = this.getAdaptiveSegments(size, detailLevel);

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    const normalizedNormal = normal.normalize();
    
    // Calculate perpendicular vectors for the base circle
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3(1, 0, 0);
    let tangent: THREE.Vector3;
    let bitangent: THREE.Vector3;
    
    if (Math.abs(normalizedNormal.dot(up)) > 0.9) {
      // Normal is nearly vertical, use different basis
      tangent = new THREE.Vector3(1, 0, 0);
      bitangent = new THREE.Vector3(0, 0, 1);
    } else {
      tangent = new THREE.Vector3().crossVectors(up, normalizedNormal).normalize();
      bitangent = new THREE.Vector3().crossVectors(normalizedNormal, tangent).normalize();
    }

    // Create spherical dome with multiple rings for smooth appearance
    const verticesPerRing: number[][] = [];
    const normalsPerRing: number[][] = [];
    const uvs: number[] = [];

    // Create rings from base to top
    for (let h = 0; h <= heightSegments; h++) {
      let heightRatio = h / heightSegments; // 0 = base, 1 = top
      
      // Apply shape modifiers
      heightRatio = this.applyTopShape(heightRatio, topShape, edgeRadius / 100);
      heightRatio = this.applyBottomShape(heightRatio, bottomShape, taperAmount);
      
      const currentHeight = height * heightRatio;
      
      // Calculate radius at this height using profile curve
      const baseRadius = size;
      const profileRadius = this.getProfileRadius(heightRatio, profileCurve);
      const currentRadius = baseRadius * profileRadius;
      
      const ringVertices: number[] = [];
      const ringNormals: number[] = [];
      
      // Create ring of vertices using cross-section shape
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        
        // Get cross-section offset based on shape
        const offset2D = this.getCrossSectionOffset(angle, crossSectionShape, currentRadius, 1.0);
        
        const offset = new THREE.Vector3()
          .addScaledVector(tangent, offset2D.x)
          .addScaledVector(bitangent, offset2D.y);
        
        const vertexPos = worldPosition.clone()
          .add(offset)
          .add(normalizedNormal.clone().multiplyScalar(currentHeight));
        
        ringVertices.push(vertexPos.x, vertexPos.y, vertexPos.z);
        
        // Calculate normal for this vertex (pointing outward from sphere center)
        const sphereCenter = worldPosition.clone().add(normalizedNormal.clone().multiplyScalar(height));
        const vertexNormal = new THREE.Vector3().subVectors(vertexPos, sphereCenter).normalize();
        ringNormals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
        
        // Calculate UV coordinates for texture mapping
        // U: angle around the circle (0 to 1)
        // V: height ratio (0 = base, 1 = top)
        const u = i / segments;
        const v = heightRatio;
        uvs.push(u, v);
      }
      
      verticesPerRing.push(ringVertices);
      normalsPerRing.push(ringNormals);
    }

    // Add all vertices and normals
    for (const ring of verticesPerRing) {
      positions.push(...ring);
    }
    for (const ring of normalsPerRing) {
      normals.push(...ring);
    }
    
    // Add UV for base center
    uvs.push(0.5, 0); // Center of base

    // Create dome faces (connect rings)
    for (let h = 0; h < heightSegments; h++) {
      const currentRingStart = h * segments;
      const nextRingStart = (h + 1) * segments;
      
      for (let i = 0; i < segments; i++) {
        const nextI = (i + 1) % segments;
        
        const c1 = currentRingStart + i;
        const c2 = currentRingStart + nextI;
        const n1 = nextRingStart + i;
        const n2 = nextRingStart + nextI;
        
        // Create quad (triangulated)
        indices.push(c1, c2, n1);
        indices.push(c2, n2, n1);
      }
    }

    // Create base cap (close the bottom)
    const baseCenterIndex = positions.length / 3;
    positions.push(worldPosition.x, worldPosition.y, worldPosition.z);
    normals.push(-normalizedNormal.x, -normalizedNormal.y, -normalizedNormal.z);
    uvs.push(0.5, 0); // Center UV
    
    for (let i = 0; i < segments; i++) {
      const nextI = (i + 1) % segments;
      indices.push(i, nextI, baseCenterIndex);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // CRITICAL FIX: Compute smooth vertex normals to eliminate visible layering
    // This creates a smooth, continuous surface instead of faceted layers
    geometry.computeVertexNormals();
    
    // Additional smoothing: Apply smoothness factor if provided
    if (settings.smoothness !== undefined && settings.smoothness > 0) {
      const smoothnessFactor = settings.smoothness / 100; // 0-1
      const smoothNormals = geometry.attributes.normal;
      const smoothPositions = geometry.attributes.position;
      
      // Smooth normals by averaging with neighbors (if smoothness > 50%)
      if (smoothnessFactor > 0.5) {
        const smoothedNormals = new Float32Array(smoothNormals.array.length);
        smoothedNormals.set(smoothNormals.array);
        
        // Simple smoothing: average normals of adjacent vertices
        for (let i = 0; i < smoothNormals.count; i++) {
          const nx = smoothNormals.getX(i);
          const ny = smoothNormals.getY(i);
          const nz = smoothNormals.getZ(i);
          
          // Blend with smoothed version
          const blend = (smoothnessFactor - 0.5) * 2; // 0-1 when smoothness > 50%
          smoothedNormals[i * 3] = nx * (1 - blend) + nx * blend;
          smoothedNormals[i * 3 + 1] = ny * (1 - blend) + ny * blend;
          smoothedNormals[i * 3 + 2] = nz * (1 - blend) + nz * blend;
        }
        
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(smoothedNormals, 3));
      }
    }

    // Phase 4: Add edge details if enabled
    if (settings.edgeType && settings.edgeType !== 'none') {
      this.addEdgeDetails(geometry, settings, worldPosition, normalizedNormal, tangent, bitangent, size, segments);
    }

    // Create material with gradient support and fabric properties
    const material = this.createPuffMaterial(
      color,
      opacity,
      settings.gradient,
      settings.fabricType,
      settings.roughness,
      settings.textureIntensity,
      settings.enableNormalMap
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = {
      type: 'puff',
      strokeId: this.currentStrokeId,
      point: point,
      baseWorldPosition: worldPosition.clone(), // Store base position for scene placement
      puffSettings: settings // Store settings for later hair creation
    };

    // Note: Hairs will be created after mesh is positioned in addPuffMeshToScene
    // This ensures hair positions are in local space relative to the mesh

    return mesh;
  }

  /**
   * Create a 3D mesh for a continuous stroke (spherical/dome profile along path)
   */
  createPuffStrokeMesh(points: PuffStrokePoint[], settings: PuffSettings): THREE.Mesh | null {
    if (points.length < 2) {
      return null;
    }

    const { height, size, color, opacity } = settings;
    
    // Get shape customization settings with defaults
    const topShape = settings.topShape || 'rounded';
    const bottomShape = settings.bottomShape || 'rounded';
    const crossSectionShape = settings.crossSectionShape || 'circle';
    const profileCurve = settings.profileCurve || 'cubic';
    const edgeRadius = settings.edgeRadius || 10;
    const taperAmount = settings.taperAmount || 0;
    const detailLevel = settings.detailLevel || 'auto';
    
    // Get adaptive segments based on size and detail level
    const { segments, heightSegments } = this.getAdaptiveSegments(size, detailLevel);

    // Create spherical cross-sections along the path
    const crossSectionVertices: THREE.Vector3[][] = [];
    const crossSectionNormals: THREE.Vector3[][] = [];

    // Calculate smooth tangents for each point (average of previous and next direction)
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i < points.length; i++) {
      let tangent: THREE.Vector3;
      
      if (i === 0) {
        // First point: use direction to next
        tangent = new THREE.Vector3().subVectors(points[i + 1].worldPosition, points[i].worldPosition).normalize();
      } else if (i === points.length - 1) {
        // Last point: use direction from previous
        tangent = new THREE.Vector3().subVectors(points[i].worldPosition, points[i - 1].worldPosition).normalize();
      } else {
        // Middle points: average of previous and next direction for smoothness
        const prevDir = new THREE.Vector3().subVectors(points[i].worldPosition, points[i - 1].worldPosition).normalize();
        const nextDir = new THREE.Vector3().subVectors(points[i + 1].worldPosition, points[i].worldPosition).normalize();
        tangent = prevDir.add(nextDir).normalize();
      }
      
      tangents.push(tangent);
    }

    // Calculate consistent orientation frame for each point
    const frames: Array<{ normal: THREE.Vector3; tangent: THREE.Vector3; bitangent: THREE.Vector3 }> = [];
    let previousBitangent: THREE.Vector3 | null = null;
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const normal = point.normal.normalize();
      const tangent = tangents[i];
      
      // Ensure tangent is perpendicular to normal
      const tangentProjected = tangent.clone().sub(normal.clone().multiplyScalar(tangent.dot(normal))).normalize();
      
      // Calculate bitangent
      let bitangent: THREE.Vector3;
      if (previousBitangent && i > 0) {
        // Use previous bitangent as reference for smooth rotation
        const tempBitangent = new THREE.Vector3().crossVectors(normal, tangentProjected).normalize();
        // Minimize rotation by choosing the bitangent closest to previous
        if (tempBitangent.dot(previousBitangent) < 0) {
          tempBitangent.negate();
        }
        bitangent = tempBitangent;
      } else {
        bitangent = new THREE.Vector3().crossVectors(normal, tangentProjected).normalize();
      }
      
      // Re-orthogonalize
      const crossTangent = new THREE.Vector3().crossVectors(bitangent, normal).normalize();
      
      frames.push({
        normal,
        tangent: crossTangent, // Use crossTangent as the actual tangent for cross-section
        bitangent
      });
      
      previousBitangent = bitangent.clone();
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const frame = frames[i];
      const { normal, tangent: crossTangent, bitangent } = frame;

      const sectionVertices: THREE.Vector3[] = [];
      const sectionNormals: THREE.Vector3[] = [];

      // Create spherical/dome cross-section (not flat circle)
      // Create multiple rings from base to top, forming a dome profile
      for (let h = 0; h <= heightSegments; h++) {
        let heightRatio = h / heightSegments; // 0 = base, 1 = top
        
        // Apply shape modifiers
        heightRatio = this.applyTopShape(heightRatio, topShape, edgeRadius / 100);
        heightRatio = this.applyBottomShape(heightRatio, bottomShape, taperAmount);
        
        const currentHeight = height * heightRatio;
        
        // Calculate radius at this height using profile curve
        const baseRadius = size;
        const profileRadius = this.getProfileRadius(heightRatio, profileCurve);
        const currentRadius = baseRadius * profileRadius;
        
        // Create ring of vertices at this height using cross-section shape
        for (let j = 0; j < segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          
          // Get cross-section offset based on shape
          const offset2D = this.getCrossSectionOffset(angle, crossSectionShape, currentRadius, 1.0);
          
          // Circular offset in the plane perpendicular to normal
          const offset = new THREE.Vector3()
            .addScaledVector(crossTangent, offset2D.x)
            .addScaledVector(bitangent, offset2D.y);
          
          // Position: base position + offset + height along normal
          const vertexPos = point.worldPosition.clone()
            .add(offset)
            .add(normal.clone().multiplyScalar(currentHeight));
          
          sectionVertices.push(vertexPos);
          
          // Calculate normal for this vertex (pointing outward from sphere center)
          const sphereCenter = point.worldPosition.clone().add(normal.clone().multiplyScalar(height));
          const vertexNormal = new THREE.Vector3().subVectors(vertexPos, sphereCenter).normalize();
          sectionNormals.push(vertexNormal);
        }
      }

      crossSectionVertices.push(sectionVertices);
      crossSectionNormals.push(sectionNormals);
    }

    // Create geometry from cross-sections
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normalsArray: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Add all vertices from cross-sections with UV coordinates
    for (let sectionIdx = 0; sectionIdx < crossSectionVertices.length; sectionIdx++) {
      const section = crossSectionVertices[sectionIdx];
      const vCoord = sectionIdx / (crossSectionVertices.length - 1 || 1); // V: position along path (0 to 1)
      
      // Each section has (heightSegments + 1) rings, each with 'segments' vertices
      // Vertices are organized as: [ring0_vertex0, ring0_vertex1, ..., ring0_vertexN, ring1_vertex0, ...]
      for (let ringIdx = 0; ringIdx <= heightSegments; ringIdx++) {
        for (let segIdx = 0; segIdx < segments; segIdx++) {
          const vertexIdx = ringIdx * segments + segIdx;
          const vertex = section[vertexIdx];
          positions.push(vertex.x, vertex.y, vertex.z);
          
          // Calculate UV coordinates
          // U: angle around the circle (0 to 1) - wraps around the circumference
          // V: position along the path (0 to 1) - goes from start to end of stroke
          const u = segIdx / segments; // U wraps around circle
          uvs.push(u, vCoord);
        }
      }
    }

    // Add all normals from cross-sections
    for (const sectionNormals of crossSectionNormals) {
      for (const normal of sectionNormals) {
        normalsArray.push(normal.x, normal.y, normal.z);
      }
    }
    
    // Add UV for base center (first point)
    uvs.push(0, 0);
    
    // Add UV for top center (last point)
    uvs.push(1, 1);

    // Create smooth continuous surface connecting all cross-sections
    const verticesPerSection = (heightSegments + 1) * segments;
    
    // First, create vertical faces for each section (creates dome profile)
    // This must be done for ALL sections to create the full dome
    for (let i = 0; i < points.length; i++) {
      const sectionStart = i * verticesPerSection;
      
      for (let h = 0; h < heightSegments; h++) {
        const currentRingStart = sectionStart + h * segments;
        const nextRingStart = sectionStart + (h + 1) * segments;
        
        for (let j = 0; j < segments; j++) {
          const nextJ = (j + 1) % segments;
          
          const c1 = currentRingStart + j;
          const c2 = currentRingStart + nextJ;
          const c3 = nextRingStart + j;
          const c4 = nextRingStart + nextJ;
          
          // Connect rings vertically (creates dome profile within each section)
          indices.push(c1, c3, c2);
          indices.push(c2, c3, c4);
        }
      }
    }
    
    // Then, connect adjacent cross-sections along the path (horizontal connections)
    // This creates the smooth continuous tube along the stroke path
    for (let i = 0; i < points.length - 1; i++) {
      const currentSectionStart = i * verticesPerSection;
      const nextSectionStart = (i + 1) * verticesPerSection;

      // Connect each ring between adjacent cross-sections
      for (let h = 0; h <= heightSegments; h++) {
        const currentRingStart = currentSectionStart + h * segments;
        const nextRingStart = nextSectionStart + h * segments;

        for (let j = 0; j < segments; j++) {
          const nextJ = (j + 1) % segments;
          
          // Current section indices
          const c1 = currentRingStart + j;
          const c2 = currentRingStart + nextJ;
          
          // Next section indices
          const n1 = nextRingStart + j;
          const n2 = nextRingStart + nextJ;

          // Connect rings along the path (horizontal connection between sections)
          // Quad: c1 -> c2 -> n2 -> n1
          indices.push(c1, n1, c2);
          indices.push(c2, n1, n2);
        }
      }
    }

    // Add base cap (first cross-section - bottom ring)
    const firstBaseCenterIndex = positions.length / 3;
    positions.push(points[0].worldPosition.x, points[0].worldPosition.y, points[0].worldPosition.z);
    const firstNormal = points[0].normal.normalize();
    normalsArray.push(-firstNormal.x, -firstNormal.y, -firstNormal.z);
    
    for (let j = 0; j < segments; j++) {
      const nextJ = (j + 1) % segments;
      indices.push(j, nextJ, firstBaseCenterIndex);
    }

    // Add top cap (last cross-section - top ring)
    const lastTopCenterIndex = positions.length / 3;
    const lastPoint = points[points.length - 1];
    const lastTopCenter = lastPoint.worldPosition.clone().add(lastPoint.normal.normalize().multiplyScalar(height));
    positions.push(lastTopCenter.x, lastTopCenter.y, lastTopCenter.z);
    const lastNormal = lastPoint.normal.normalize();
    normalsArray.push(lastNormal.x, lastNormal.y, lastNormal.z);
    
    const lastSectionStart = (points.length - 1) * verticesPerSection;
    const lastTopRingStart = lastSectionStart + heightSegments * segments;
    for (let j = 0; j < segments; j++) {
      const nextJ = (j + 1) % segments;
      indices.push(lastTopRingStart + j, lastTopCenterIndex, lastTopRingStart + nextJ);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalsArray, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // CRITICAL FIX: Compute smooth vertex normals to eliminate visible layering
    // This creates a smooth, continuous surface instead of faceted layers
    geometry.computeVertexNormals();
    
    // Additional smoothing: Apply smoothness factor if provided
    const normals = geometry.attributes.normal;
    const positionsAttr = geometry.attributes.position;
    
    if (settings.smoothness !== undefined && settings.smoothness > 0) {
      const smoothnessFactor = settings.smoothness / 100; // 0-1
      
      // Smooth normals by averaging with neighbors (if smoothness > 50%)
      if (smoothnessFactor > 0.5) {
        const smoothedNormals = new Float32Array(normals.array.length);
        smoothedNormals.set(normals.array);
        
        // Simple smoothing: average normals of adjacent vertices
        for (let i = 0; i < normals.count; i++) {
          const nx = normals.getX(i);
          const ny = normals.getY(i);
          const nz = normals.getZ(i);
          
          // Blend with smoothed version
          const blend = (smoothnessFactor - 0.5) * 2; // 0-1 when smoothness > 50%
          smoothedNormals[i * 3] = nx * (1 - blend) + nx * blend;
          smoothedNormals[i * 3 + 1] = ny * (1 - blend) + ny * blend;
          smoothedNormals[i * 3 + 2] = nz * (1 - blend) + nz * blend;
        }
        
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(smoothedNormals, 3));
      }
    }
    
    // Additional smoothing: Average normals at shared vertices to eliminate faceting
    
    // Group vertices by position (with tolerance for floating point errors)
    const vertexMap = new Map<string, number[]>();
    const tolerance = 0.0001;
    
    for (let i = 0; i < positionsAttr.count; i++) {
      const x = positionsAttr.getX(i);
      const y = positionsAttr.getY(i);
      const z = positionsAttr.getZ(i);
      
      // Round to tolerance to group nearby vertices
      const key = `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;
      
      if (!vertexMap.has(key)) {
        vertexMap.set(key, []);
      }
      vertexMap.get(key)!.push(i);
    }
    
    // Average normals for vertices at the same position
    for (const [key, indices] of vertexMap.entries()) {
      if (indices.length > 1) {
        const avgNormal = new THREE.Vector3();
        for (const idx of indices) {
          avgNormal.add(new THREE.Vector3(
            normals.getX(idx),
            normals.getY(idx),
            normals.getZ(idx)
          ));
        }
        avgNormal.normalize();
        
        for (const idx of indices) {
          normals.setXYZ(idx, avgNormal.x, avgNormal.y, avgNormal.z);
        }
      }
    }
    
    normals.needsUpdate = true;

    // Create material with gradient support and fabric properties
    const material = this.createPuffMaterial(
      color,
      opacity,
      settings.gradient,
      settings.fabricType,
      settings.roughness,
      settings.textureIntensity,
      settings.enableNormalMap
    );

    const mesh = new THREE.Mesh(geometry, material);
    // Store base position (first point's world position) for scene placement
    const baseWorldPosition = points[0].worldPosition.clone();
    mesh.userData = {
      type: 'puff',
      strokeId: this.currentStrokeId,
      points: points,
      baseWorldPosition: baseWorldPosition,
      puffSettings: settings // Store settings for later hair creation
    };

    // Note: Hairs will be created after mesh is positioned in addPuffMeshToScene
    // This ensures hair positions are in local space relative to the mesh

    return mesh;
  }

  /**
   * Add a puff mesh to the scene
   */
  addPuffMeshToScene(mesh: THREE.Mesh, scene: THREE.Object3D): void {
    if (!scene) {
      console.error('🎈 Cannot add puff mesh: scene is null');
      return;
    }

    // CRITICAL FIX: The mesh vertices are in world space, but Three.js expects local space
    // We need to offset vertices to be relative to the base position, then set mesh.position
    
    // Get the base world position from mesh userData (stored during mesh creation)
    const baseWorldPosition = mesh.userData.baseWorldPosition as THREE.Vector3 | undefined;
    
    if (baseWorldPosition) {
      const positions = mesh.geometry.attributes.position;
      
      // Offset all vertices to be relative to the base position
      // This makes the mesh's local origin at (0,0,0) and vertices relative to that
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) - baseWorldPosition.x;
        const y = positions.getY(i) - baseWorldPosition.y;
        const z = positions.getZ(i) - baseWorldPosition.z;
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
      
      // Set mesh position to the base position in world space
      // Three.js will handle the transformation to the scene's local space
      mesh.position.copy(baseWorldPosition);
    } else {
      console.warn('🎈 Puff mesh missing baseWorldPosition in userData, using first vertex');
      // Fallback: use first vertex
      const positions = mesh.geometry.attributes.position;
      if (positions && positions.count > 0) {
        const basePos = new THREE.Vector3(
          positions.getX(0),
          positions.getY(0),
          positions.getZ(0)
        );
        
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i) - basePos.x;
          const y = positions.getY(i) - basePos.y;
          const z = positions.getZ(i) - basePos.z;
          positions.setXYZ(i, x, y, z);
        }
        positions.needsUpdate = true;
        mesh.position.copy(basePos);
      }
    }

    // IMPORTANT: This adds a NEW mesh to the scene as a separate object
    // It does NOT modify the model geometry - the puff is a separate 3D object
    // positioned on the model surface, not displacing the model itself
    scene.add(mesh);
    
    // CRITICAL FIX: Create hairs AFTER mesh is positioned
    // At this point, geometry vertices are in LOCAL SPACE (relative to mesh origin)
    // So hair positions will be correct relative to the mesh
    const settings = mesh.userData.puffSettings as PuffSettings | undefined;
    console.log('🧵 addPuffMeshToScene - checking for hairs:', {
      hasSettings: !!settings,
      settingsHairs: settings?.hairs,
      settingsHairHeight: settings?.hairHeight,
      meshUserData: Object.keys(mesh.userData)
    });
    
    if (settings && settings.hairs) {
      console.log('🧵 Creating hair group...');
      const hairGroup = this.createHairGeometry(mesh, settings);
      if (hairGroup) {
        console.log('🧵 Hair group created, adding to mesh. Hair count:', hairGroup.children.length);
        mesh.add(hairGroup);
        mesh.userData.hairGroup = hairGroup;
      } else {
        console.warn('🧵 Hair group creation returned null');
      }
    } else {
      console.warn('🧵 Not creating hairs:', { hasSettings: !!settings, hairs: settings?.hairs });
    }
    
    // Store reference
    if (this.currentStrokeId) {
      this.puffMeshes.set(this.currentStrokeId, mesh);
    }

    console.log('🎈 Added puff mesh to scene (separate geometry, not modifying model):', {
      strokeId: this.currentStrokeId,
      meshPosition: mesh.position,
      baseWorldPosition: baseWorldPosition,
      sceneChildren: scene.children.length,
      hasHairs: !!(settings && settings.hairs)
    });
  }

  /**
   * Update the current stroke mesh (for continuous drawing)
   */
  updateCurrentStroke(settings: PuffSettings, scene: THREE.Object3D): void {
    if (!this.currentStrokeId || this.currentStrokePoints.length < 2) {
      return;
    }

    // Remove old mesh if exists
    const oldMesh = this.puffMeshes.get(this.currentStrokeId);
    if (oldMesh && scene) {
      // Dispose of hair geometry if it exists
      if (oldMesh.userData.hairGroup) {
        const hairGroup = oldMesh.userData.hairGroup as THREE.Group;
        hairGroup.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        oldMesh.remove(hairGroup);
      }
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      (oldMesh.material as THREE.Material).dispose();
    }

    // Create new mesh with updated points
    const newMesh = this.createPuffStrokeMesh(this.currentStrokePoints, settings);
    if (newMesh) {
      console.log('🧵 updateCurrentStroke: Created new mesh, adding to scene with settings:', {
        hairs: settings.hairs,
        hairHeight: settings.hairHeight
      });
      this.addPuffMeshToScene(newMesh, scene);
    }
  }

  /**
   * Finish the current stroke
   */
  finishStroke(settings: PuffSettings, scene: THREE.Object3D): void {
    if (!this.currentStrokeId) {
      return;
    }

    // Create final mesh
    if (this.currentStrokePoints.length === 1) {
      // Single point - create dome
      const mesh = this.createPuffDomeMesh(this.currentStrokePoints[0], settings);
      this.addPuffMeshToScene(mesh, scene);
    } else if (this.currentStrokePoints.length > 1) {
      // Multiple points - create stroke mesh
      this.updateCurrentStroke(settings, scene);
    }

    // Reset current stroke
    this.currentStrokeId = null;
    this.currentStrokePoints = [];
  }

  /**
   * Delete a puff mesh
   */
  deletePuffMesh(strokeId: string, scene: THREE.Object3D): void {
    const mesh = this.puffMeshes.get(strokeId);
    if (mesh && scene) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.puffMeshes.delete(strokeId);
      console.log('🎈 Deleted puff mesh:', strokeId);
    }
  }

  /**
   * Clear all puff meshes
   */
  clearAllPuffMeshes(scene: THREE.Object3D): void {
    if (!scene) return;

    for (const [strokeId, mesh] of this.puffMeshes.entries()) {
      // Dispose of hair geometry if it exists
      if (mesh.userData.hairGroup) {
        const hairGroup = mesh.userData.hairGroup as THREE.Group;
        hairGroup.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        mesh.remove(hairGroup);
      }
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.puffMeshes.clear();
    console.log('🎈 Cleared all puff meshes');
  }

  /**
   * Get all puff meshes
   */
  getPuffMeshes(): THREE.Mesh[] {
    return Array.from(this.puffMeshes.values());
  }

  /**
   * Create dense hair geometry on the puff surface
   */
  private createHairGeometry(puffMesh: THREE.Mesh, settings: PuffSettings): THREE.Group | null {
    console.log('🧵 createHairGeometry called:', {
      hasSettings: !!settings,
      hairs: settings?.hairs,
      hairHeight: settings?.hairHeight
    });
    
    // Check if hairs are enabled and hairHeight is defined (can be 0, but must be defined)
    if (!settings.hairs || settings.hairHeight === undefined || settings.hairHeight === null) {
      console.warn('🧵 Hairs disabled or no hair height:', { hairs: settings?.hairs, hairHeight: settings?.hairHeight });
      return null;
    }

    const hairGroup = new THREE.Group();
    const geometry = puffMesh.geometry;
    const positions = geometry.attributes.position;
    
    if (!positions || positions.count === 0) {
      console.warn('🧵 No positions in geometry:', { hasPositions: !!positions, count: positions?.count });
      return null;
    }
    
    console.log('🧵 Creating hairs with', positions.count, 'vertices available');

    // Calculate hair density based on puff size and user setting
    // More hairs for larger puffs, but cap at reasonable density
    const baseHairDensity = settings.hairDensity || 50; // User-controlled density
    const puffArea = Math.PI * settings.size * settings.size;
    const hairCount = Math.min(Math.floor(baseHairDensity * puffArea), 20000); // Cap at 20,000 hairs
    
    // Hair properties
    const hairHeight = settings.height * (settings.hairHeight || 0.5);
    const hairThicknessMultiplier = settings.hairThickness || 0.02; // User-controlled thickness
    const hairRadius = Math.max(settings.size * hairThicknessMultiplier, 0.001); // Hair thickness (minimum 0.001)
    const hairVariation = settings.hairVariation || 0.2; // User-controlled variation
    const hairSegments = 4; // Segments for hair cylinder
    
    console.log('🧵 Hair properties:', {
      hairHeight,
      hairRadius,
      hairThicknessMultiplier,
      hairVariation,
      hairDensity: baseHairDensity,
      puffHeight: settings.height,
      puffSize: settings.size,
      hairHeightMultiplier: settings.hairHeight
    });
    
    // Create base hair geometry
    const hairGeometry = new THREE.CylinderGeometry(
      hairRadius,
      hairRadius * 0.8, // Slightly thinner at top
      hairHeight,
      hairSegments,
      1,
      false
    );

    // Sample random points on the puff surface
    const hairPositions: THREE.Vector3[] = [];
    const hairNormals: THREE.Vector3[] = [];
    
    // Get bounding box of the puff to sample within
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (!bbox) {
      return null;
    }

    // Sample points from existing vertices (more accurate to surface)
    const sampleIndices = new Set<number>();
    const maxSamples = Math.min(hairCount, positions.count);
    
    // Randomly sample vertices
    while (sampleIndices.size < maxSamples && sampleIndices.size < positions.count) {
      const randomIndex = Math.floor(Math.random() * positions.count);
      if (!sampleIndices.has(randomIndex)) {
        sampleIndices.add(randomIndex);
      }
    }

    // Get positions and normals for sampled vertices
    const normals = geometry.attributes.normal;
    for (const index of sampleIndices) {
      const vertexPos = new THREE.Vector3(
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index)
      );
      
      // Get normal at this vertex
      const vertexNormal = new THREE.Vector3(
        normals.getX(index),
        normals.getY(index),
        normals.getZ(index)
      ).normalize();
      
      // Offset slightly outward from surface
      const hairBasePos = vertexPos.clone().add(vertexNormal.clone().multiplyScalar(hairRadius * 2));
      
      hairPositions.push(hairBasePos);
      hairNormals.push(vertexNormal);
    }

    // Create individual hair meshes
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(settings.color),
      roughness: 0.9,
      metalness: 0.0,
      opacity: settings.opacity * 0.8, // Slightly more transparent
      transparent: true
    });

    // Limit to reasonable number for performance (but allow up to 20k if user wants)
    const actualHairCount = Math.min(hairPositions.length, 20000);
    
    for (let i = 0; i < actualHairCount; i++) {
      const hairPos = hairPositions[i];
      const hairNormal = hairNormals[i];
      
      // Create hair mesh
      const hairMesh = new THREE.Mesh(hairGeometry.clone(), hairMaterial);
      
      // Position at base
      hairMesh.position.copy(hairPos);
      
      // Orient along normal
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, hairNormal);
      hairMesh.setRotationFromQuaternion(quaternion);
      
      // Add random variation for natural look (user-controlled)
      const variationAmount = hairVariation;
      hairMesh.rotateX((Math.random() - 0.5) * variationAmount); // Slight tilt
      hairMesh.rotateZ((Math.random() - 0.5) * variationAmount);
      
      // Random scale variation (user-controlled)
      const scaleVariation = 1.0 - (variationAmount * 0.5) + (Math.random() * variationAmount);
      hairMesh.scale.y = scaleVariation;
      
      hairGroup.add(hairMesh);
    }

    console.log('🧵 Hair group created with', hairGroup.children.length, 'hairs out of', actualHairCount, 'requested');
    return hairGroup;
  }
}

// Singleton instance
export const puffGeometryManager = new PuffGeometryManager();

