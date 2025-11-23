/**
 * 🎯 Shirt Renderer Component
 *
 * Handles the core rendering logic for the 3D shirt model
 * Extracted from the massive Shirt.js file for better maintainability
 * Updated to use domain-driven state management and memory leak fixes
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
// Force rebuild - GLTFLoader import verification
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useApp } from '../../App';
import { geometryManager } from '../../utils/GeometryManager';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ModelData, Vector3D, Bounds } from '../../types/app';

interface ShirtRendererProps {
  onModelLoaded?: (modelData: ModelData) => void;
  onModelError?: (error: string) => void;
  wireframe?: boolean;
  showNormals?: boolean;
  onPointerDown?: (event: any) => void;
  onPointerMove?: (event: any) => void;
  onPointerUp?: (event: any) => void;
  onPointerLeave?: (event: any) => void;
}

export const ShirtRenderer: React.FC<ShirtRendererProps> = ({
  onModelLoaded,
  onModelError,
  wireframe = false,
  showNormals = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave
}) => {
  console.log('🎯 ShirtRenderer component mounted/rendered');
  const { scene, camera, size, gl } = useThree();
  const modelRef = useRef<THREE.Group>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use main app state instead of separate model store to avoid synchronization issues
  const modelUrl = useApp(s => s.modelUrl);
  const modelScene = useApp(s => s.modelScene);
  const modelScale = useApp(s => s.modelScale);
  const modelPosition = useApp(s => s.modelPosition);
  const modelRotation = useApp(s => s.modelRotation);
  const modelType = useApp(s => s.modelType);

  // 🎯 CRITICAL FIX: UV Coordinate Calculation Functions
  const calculateUVFromPointerEvent = useCallback((event: any) => {
    if (!modelScene || !camera) {
      console.warn('🎯 UV Calculation: Missing modelScene or camera');
      return null;
    }

    try {
      // Get the canvas element and its bounds from useThree
      const canvas = gl.domElement as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      
      // Convert screen coordinates to normalized device coordinates (NDC)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      console.log('🎯 UV Calculation: Screen coords -> NDC:', { 
        clientX: event.clientX, 
        clientY: event.clientY,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        ndc: { x, y }
      });

      // Create raycaster and set from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      // CRITICAL FIX: Collect all meshes from the modelScene for raycasting
      const modelMeshes: THREE.Mesh[] = [];
      modelScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          modelMeshes.push(child);
        }
      });
      
      console.log('🎯 UV Calculation: Found', modelMeshes.length, 'meshes in modelScene');
      
      // Intersect with model meshes specifically
      const intersects = raycaster.intersectObjects(modelMeshes, true);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        const uv = intersection.uv;
        const point = intersection.point;
        const face = intersection.face;
        
        if (uv && point && face) {
          console.log('🎯 UV Calculation: SUCCESS - Found intersection:', {
            uv: { x: uv.x, y: uv.y },
            point: { x: point.x, y: point.y, z: point.z },
            faceIndex: intersection.faceIndex,
            object: intersection.object.name || 'unnamed',
            distance: intersection.distance
          });
          
          return {
            uv: new THREE.Vector2(uv.x, uv.y),
            point: point.clone(),
            face: face,
            faceIndex: intersection.faceIndex,
            object: intersection.object,
            intersections: intersects
          };
        }
      }
      
      console.warn('🎯 UV Calculation: No valid intersection found with', modelMeshes.length, 'meshes');
      return null;
      
    } catch (error) {
      console.error('🎯 UV Calculation: Error during calculation:', error);
      return null;
    }
  }, [modelScene, camera, gl.domElement]);

  // 🎯 Enhanced Pointer Event Handlers with UV Calculation
  const handlePointerDown = useCallback((event: any) => {
    console.log('🎯 ShirtRenderer: handlePointerDown triggered', {
      hasEvent: !!event,
      clientX: event?.clientX,
      clientY: event?.clientY,
      type: event?.type,
      target: event?.target
    });
    
    // CRITICAL FIX: Get activeTool to check if we should process this event
    const activeTool = useApp.getState().activeTool;
    console.log('🎯 ShirtRenderer: Current activeTool:', activeTool);
    
    const uvData = calculateUVFromPointerEvent(event);
    if (uvData) {
      // Create enhanced event with UV coordinates
      const enhancedEvent = {
        ...event,
        uv: uvData.uv,
        point: uvData.point,
        face: uvData.face,
        faceIndex: uvData.faceIndex,
        object: uvData.object,
        intersections: uvData.intersections,
        clientX: event.clientX,
        clientY: event.clientY,
        nativeEvent: event.nativeEvent
      };
      
      console.log('🎯 ShirtRenderer: Passing enhanced event to parent:', {
        hasUV: !!enhancedEvent.uv,
        uv: enhancedEvent.uv ? { x: enhancedEvent.uv.x, y: enhancedEvent.uv.y } : null,
        hasPoint: !!enhancedEvent.point,
        intersectionsCount: enhancedEvent.intersections?.length || 0,
        activeTool
      });
      
      onPointerDown?.(enhancedEvent);
    } else {
      console.warn('🎯 ShirtRenderer: No UV data available, skipping pointer down', {
        activeTool,
        hasEvent: !!event
      });
    }
  }, [calculateUVFromPointerEvent, onPointerDown]);

  const handlePointerMove = useCallback((event: any) => {
    const uvData = calculateUVFromPointerEvent(event);
    if (uvData) {
      const enhancedEvent = {
        ...event,
        uv: uvData.uv,
        point: uvData.point,
        face: uvData.face,
        faceIndex: uvData.faceIndex,
        object: uvData.object,
        intersections: uvData.intersections,
        clientX: event.clientX,
        clientY: event.clientY,
        nativeEvent: event.nativeEvent
      };
      
      onPointerMove?.(enhancedEvent);
    }
  }, [calculateUVFromPointerEvent, onPointerMove]);

  const handlePointerUp = useCallback((event: any) => {
    const uvData = calculateUVFromPointerEvent(event);
    if (uvData) {
      const enhancedEvent = {
        ...event,
        uv: uvData.uv,
        point: uvData.point,
        face: uvData.face,
        faceIndex: uvData.faceIndex,
        object: uvData.object,
        intersections: uvData.intersections,
        clientX: event.clientX,
        clientY: event.clientY,
        nativeEvent: event.nativeEvent
      };
      
      onPointerUp?.(enhancedEvent);
    }
  }, [calculateUVFromPointerEvent, onPointerUp]);

  const handlePointerLeave = useCallback((event: any) => {
    onPointerLeave?.(event);
  }, [onPointerLeave]);

  // Model loading logic with memory leak fixes
  useEffect(() => {
    console.log('🎯 ShirtRenderer useEffect triggered:', { modelUrl, modelType });
    if (!modelUrl) {
      console.log('🎯 No modelUrl provided, skipping model loading');
      return;
    }

    const loadModel = async () => {
      try {
        console.log('🔄 Loading 3D model:', modelUrl);
        setIsLoading(true);
        setError(null);

        let loader: any;
        let scene: THREE.Group;

        // Normalize model type by removing leading dot
        const normalizedModelType = modelType?.startsWith('.') ? modelType.slice(1) : modelType;
        console.log('🎯 Normalized model type:', normalizedModelType, 'from original:', modelType);

        switch (normalizedModelType) {
          case 'gltf':
          case 'glb':
            console.log('🎯 Using GLTFLoader for model type:', normalizedModelType);
            loader = new GLTFLoader();
            const gltfResult = await new Promise((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            }) as any;
            scene = gltfResult.scene.clone();
            break;

          case 'obj':
            loader = new OBJLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            });
            break;

          case 'fbx':
            loader = new FBXLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            });
            break;

          case 'dae':
          case 'collada':
            loader = new ColladaLoader();
            const colladaResult = await new Promise((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            }) as any;
            scene = colladaResult.scene.clone();
            break;

          case 'ply':
            loader = new PLYLoader();
            scene = await new Promise((resolve, reject) => {
              loader.load(modelUrl, resolve, undefined, reject);
            });
            break;

          default:
            throw new Error(`Unsupported model type: ${modelType}`);
        }

        // Process and optimize the loaded model
        const modelData = processModelData(scene, modelUrl, modelType || 'gltf');
        
        // Apply transformations (scale is handled by React Three Fiber group)
        scene.position.set(...modelPosition);
        scene.rotation.set(...modelRotation);
        // CRITICAL FIX: Don't scale the scene directly - let React Three Fiber handle it
        // scene.scale.setScalar(modelScale); // REMOVED: Causes double scaling

        // Set up the model in the main app state
        useApp.setState({ modelScene: scene });
        console.log('🎯 ModelScene set in main store:', !!scene);
        
        // SOLUTION 3: Capture base texture IMMEDIATELY on model load (no delay)
        // This prevents race condition where composition happens before base texture is captured
        console.log('🎨 Generating base layer from loaded model immediately...');
        useApp.getState().generateBaseLayer();
        
        onModelLoaded?.(modelData);
        setIsLoading(false);

        console.log('✅ Model loaded successfully');

      } catch (error) {
        console.error('❌ Load failed for:', modelUrl, 'error:', error);
        // Fallback to a simple cube model using GeometryManager (memory leak fix)
        console.log('🔄 Using fallback pink cube due to error');
        const fallbackScene = geometryManager.getMesh(
          { type: 'box', width: 1, height: 1, depth: 1 },
          'standard',
          0xff3366
        );
        useApp.setState({ modelScene: fallbackScene as any });
        onModelError?.(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    loadModel();
  }, [modelUrl, modelType, onModelLoaded, onModelError]);

  // Process loaded model data with memory optimization
  const processModelData = useCallback((scene: THREE.Object3D, url: string, type: string): ModelData => {
    const meshes: THREE.Mesh[] = [];
    const bounds = {
      min: new THREE.Vector3(Infinity, Infinity, Infinity),
      max: new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    };

    // Traverse and collect meshes
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
        
        // Calculate bounds
        const geometry = child.geometry;
        if (geometry.boundingBox === null) {
          geometry.computeBoundingBox();
        }
        
        const box = geometry.boundingBox!;
        bounds.min.min(box.min);
        bounds.max.max(box.max);
      }
    });

    const size = bounds.max.clone().sub(bounds.min);
    const center = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);

    return {
      url,
      scene,
      type: type as 'gltf' | 'obj' | 'fbx' | 'dae' | 'ply',
      meshes,
      geometry: {
        vertices: [],
        normals: [],
        uvs: [],
        indices: [],
        bounds: {
          min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
        }
      },
      uvMap: [],
      bounds: {
        min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
        max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
      },
      scale: 1,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      loaded: true
    };
  }, []);

  // CRITICAL FIX: Manual event handler for when React Three Fiber events are blocked
  // This happens when controls are disabled for drawing tools
  // Always set up handlers - they check the current tool dynamically
  useEffect(() => {
    const canvas = gl.domElement as HTMLCanvasElement;
    if (!canvas || !modelScene || !camera) {
      return;
    }
    
    console.log('🎯 ShirtRenderer: Setting up manual event handlers (always active, checks tool dynamically)');
    
    const handleManualPointerDown = (event: PointerEvent) => {
      // CRITICAL FIX: Allow rotation (right-click/middle-click) even when puff tool is active
      // Only block left-click events for drawing
      const isLeftClick = event.button === 0;
      const isRightClick = event.button === 2;
      const isMiddleClick = event.button === 1;
      
      // Allow rotation controls for right-click and middle-click
      if (isRightClick || isMiddleClick) {
        return; // Let OrbitControls handle rotation
      }
      
      // Only handle left-click for drawing tools
      if (!isLeftClick) {
        return;
      }
      
      // Only handle for drawing tools, picker tool, and vector tool
      const currentActiveTool = useApp.getState().activeTool;
      if (!['brush', 'eraser', 'embroidery', 'fill', 'puffPrint', 'picker', 'vector'].includes(currentActiveTool)) {
        return;
      }
      
      console.log('🎯 ShirtRenderer: Manual pointer down event received', {
        clientX: event.clientX,
        clientY: event.clientY,
        activeTool: currentActiveTool,
        button: event.button
      });
      
      // Calculate UV using raycaster (same as calculateUVFromPointerEvent)
      try {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        
        const modelMeshes: THREE.Mesh[] = [];
        modelScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            modelMeshes.push(child);
          }
        });
        
        const intersects = raycaster.intersectObjects(modelMeshes, true);
        
        if (intersects.length > 0) {
          const intersection = intersects[0];
          const uv = intersection.uv;
          const point = intersection.point;
          const face = intersection.face;
          
          if (uv && point && face) {
            console.log('🎯 ShirtRenderer: Manual event - UV found, calling onPointerDown');
            
            // CRITICAL: Only stop event propagation for left-click drawing
            // Right-click and middle-click are allowed through for rotation
            event.stopPropagation();
            event.preventDefault();
            
            // Create enhanced event matching React Three Fiber event format
            const enhancedEvent = {
              clientX: event.clientX,
              clientY: event.clientY,
              uv: new THREE.Vector2(uv.x, uv.y),
              point: point.clone(),
              face: face,
              faceIndex: intersection.faceIndex,
              object: intersection.object,
              intersections: intersects,
              nativeEvent: event,
              stopPropagation: () => event.stopPropagation(),
              preventDefault: () => event.preventDefault()
            };
            
            // Call the parent's onPointerDown handler
            onPointerDown?.(enhancedEvent);
          }
        }
      } catch (error) {
        console.error('🎯 ShirtRenderer: Error in manual pointer down handler:', error);
      }
    };
    
    // Also handle pointer move for continuous drawing
    const handleManualPointerMove = (event: PointerEvent) => {
      // CRITICAL FIX: Allow rotation (right-click/middle-click drag) even when puff tool is active
      // Only block left-click drag for drawing
      const isLeftButton = (event.buttons & 1) === 1; // Left button
      const isRightButton = (event.buttons & 2) === 2; // Right button
      const isMiddleButton = (event.buttons & 4) === 4; // Middle button
      
      // Allow rotation controls for right-click and middle-click drag
      if (isRightButton || isMiddleButton) {
        return; // Let OrbitControls handle rotation
      }
      
      // Only process left-click drag for drawing tools (picker is one-click, no move needed)
      if (!isLeftButton) {
        return;
      }
      
      const currentActiveTool = useApp.getState().activeTool;
      // Picker tool doesn't need move handling - it's a one-click action
      if (!['brush', 'eraser', 'embroidery', 'fill', 'puffPrint'].includes(currentActiveTool)) {
        return;
      }
      
      // Only process if we're actively drawing (left button was down)
      // This prevents move events from firing when just hovering
      if (event.buttons === 0) {
        return; // No buttons pressed, just hovering
      }
      
      try {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        
        const modelMeshes: THREE.Mesh[] = [];
        modelScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            modelMeshes.push(child);
          }
        });
        
        const intersects = raycaster.intersectObjects(modelMeshes, true);
        
        if (intersects.length > 0) {
          const intersection = intersects[0];
          const uv = intersection.uv;
          const point = intersection.point;
          const face = intersection.face;
          
          if (uv && point && face) {
            // CRITICAL: Only stop event propagation for left-click drawing
            // Right-click and middle-click are allowed through for rotation
            if (isLeftButton) {
              event.stopPropagation();
              event.preventDefault();
            }
            
            const enhancedEvent = {
              clientX: event.clientX,
              clientY: event.clientY,
              uv: new THREE.Vector2(uv.x, uv.y),
              point: point.clone(),
              face: face,
              faceIndex: intersection.faceIndex,
              object: intersection.object,
              intersections: intersects,
              nativeEvent: event,
              stopPropagation: () => event.stopPropagation(),
              preventDefault: () => event.preventDefault()
            };
            
            // Only call onPointerMove for left-click drawing
            if (isLeftButton) {
              onPointerMove?.(enhancedEvent);
            }
          }
        }
      } catch (error) {
        console.error('🎯 ShirtRenderer: Error in manual pointer move handler:', error);
      }
    };
    
    const handleManualPointerUp = (event: PointerEvent) => {
      // CRITICAL FIX: Allow rotation (right-click/middle-click) even when puff tool is active
      // Only handle left-click up events for drawing
      const isLeftClick = event.button === 0;
      const isRightClick = event.button === 2;
      const isMiddleClick = event.button === 1;
      
      // Allow rotation controls for right-click and middle-click
      if (isRightClick || isMiddleClick) {
        return; // Let OrbitControls handle rotation
      }
      
      // Only handle left-click for drawing tools
      if (!isLeftClick) {
        return;
      }
      
      const currentActiveTool = useApp.getState().activeTool;
      if (!['brush', 'eraser', 'embroidery', 'fill', 'puffPrint'].includes(currentActiveTool)) {
        return;
      }
      
      try {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        
        const modelMeshes: THREE.Mesh[] = [];
        modelScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            modelMeshes.push(child);
          }
        });
        
        const intersects = raycaster.intersectObjects(modelMeshes, true);
        
        if (intersects.length > 0) {
          const intersection = intersects[0];
          const uv = intersection.uv;
          const point = intersection.point;
          const face = intersection.face;
          
          if (uv && point && face) {
            // CRITICAL: Stop event propagation to prevent OrbitControls from handling it
            event.stopPropagation();
            event.preventDefault();
            
            const enhancedEvent = {
              clientX: event.clientX,
              clientY: event.clientY,
              uv: new THREE.Vector2(uv.x, uv.y),
              point: point.clone(),
              face: face,
              faceIndex: intersection.faceIndex,
              object: intersection.object,
              intersections: intersects,
              nativeEvent: event,
              stopPropagation: () => event.stopPropagation(),
              preventDefault: () => event.preventDefault()
            };
            
            onPointerUp?.(enhancedEvent);
          }
        }
      } catch (error) {
        console.error('🎯 ShirtRenderer: Error in manual pointer up handler:', error);
      }
    };
    
    // Attach to canvas element directly (bypasses React Three Fiber)
    canvas.addEventListener('pointerdown', handleManualPointerDown);
    canvas.addEventListener('pointermove', handleManualPointerMove);
    canvas.addEventListener('pointerup', handleManualPointerUp);
    
    console.log('🎯 ShirtRenderer: Manual event handlers attached to canvas');
    
    return () => {
      canvas.removeEventListener('pointerdown', handleManualPointerDown);
      canvas.removeEventListener('pointermove', handleManualPointerMove);
      canvas.removeEventListener('pointerup', handleManualPointerUp);
      console.log('🎯 ShirtRenderer: Manual event handlers removed');
    };
  }, [gl, modelScene, camera, onPointerDown]);
  
  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      console.log('🧠 ShirtRenderer: Cleaning up on unmount');
      // Cleanup will be handled by the managers
    };
  }, []);

  // Render the model with proper event handling
  const renderModel = useMemo(() => {
    if (!modelScene) return null;

    return (
      <group
        ref={modelRef}
        position={modelPosition}
        rotation={modelRotation}
        scale={modelScale}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <primitive 
          object={modelScene} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
        {wireframe && (
          <primitive 
            object={modelScene.clone()} 
            material={new THREE.MeshBasicMaterial({ 
              wireframe: true, 
              color: 0x00ff00,
              transparent: true,
              opacity: 0.3
            })} 
          />
        )}
        {showNormals && (
          <primitive 
            object={modelScene.clone()} 
            material={new THREE.MeshNormalMaterial()} 
          />
        )}
      </group>
    );
  }, [modelScene, modelPosition, modelRotation, modelScale, wireframe, showNormals, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave]);

  return (
    <>
      {renderModel}
      
      {/* Loading indicator */}
      {isLoading && (
        <Html center>
          <div style={{
            color: '#fff',
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #fff',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }} />
            Loading 3D model...
          </div>
        </Html>
      )}

      {/* Error display */}
      {error && (
        <Html center>
          <div style={{
            color: '#fff',
            background: 'rgba(255,0,0,0.9)',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Model Loading Error</div>
            <div style={{ fontSize: '0.9em', marginBottom: '15px' }}>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </Html>
      )}
    </>
  );
};

// Removed default export to avoid import conflicts - using named export only
