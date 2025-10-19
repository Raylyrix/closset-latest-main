/**
 * 🎯 Shirt State Hook
 * 
 * Manages all state for the shirt component
 * Extracted from Shirt.js for better separation of concerns
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../../App';
import { useAdvancedLayerStoreV2 } from '../../../core/AdvancedLayerSystemV2';
import { vectorStore } from '../../../vector/vectorState';

export const useShirtState = () => {
  // App state
  const modelUrl = useApp(s => s.modelUrl);
  const modelChoice = useApp(s => s.modelChoice);
  const modelType = useApp(s => s.modelType);
  const modelScene = useApp(s => s.modelScene);
  const modelScale = useApp(s => s.modelScale);
  const modelPosition = useApp(s => s.modelPosition);
  const modelRotation = useApp(s => s.modelRotation);
  // Use V2 system for composed canvas
  const { composedCanvas } = useAdvancedLayerStoreV2();
  const activeTool = useApp(s => s.activeTool);
  const vectorMode = useApp(s => s.vectorMode);
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecal, setSelectedDecal] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showAnchorPoints, setShowAnchorPoints] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToPoints, setSnapToPoints] = useState(true);
  
  // Vector state
  const [vectorShapes, setVectorShapes] = useState<any[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [anchorPoints, setAnchorPoints] = useState<any[]>([]);
  
  // Tool state
  const [toolSettings, setToolSettings] = useState({
    precision: 0.1,
    snapTolerance: 5,
    gridSize: 20,
    showRulers: true
  });
  
  // Performance state
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    frameRate: 0,
    memoryUsage: 0,
    lastUpdate: Date.now()
  });
  
  // Initialize vector state from store
  useEffect(() => {
    const unsubscribe = vectorStore.subscribe((state) => {
      setVectorShapes(state.shapes || []);
      setSelectedShapes(state.selected || []);
      setCurrentPath(state.currentPath);
    });
    
    return unsubscribe;
  }, []);
  
  // Update vector shapes
  const updateVectorShapes = useCallback((shapes: any[]) => {
    setVectorShapes(shapes);
    vectorStore.setState({ shapes });
  }, []);
  
  // Add vector shape
  const addVectorShape = useCallback((shape: any) => {
    const newShapes = [...vectorShapes, shape];
    updateVectorShapes(newShapes);
  }, [vectorShapes, updateVectorShapes]);
  
  // Remove vector shape
  const removeVectorShape = useCallback((shapeId: string) => {
    const newShapes = vectorShapes.filter(shape => shape.id !== shapeId);
    updateVectorShapes(newShapes);
  }, [vectorShapes, updateVectorShapes]);
  
  // Update vector shape
  const updateVectorShape = useCallback((shapeId: string, updates: any) => {
    const newShapes = vectorShapes.map(shape => 
      shape.id === shapeId ? { ...shape, ...updates } : shape
    );
    updateVectorShapes(newShapes);
  }, [vectorShapes, updateVectorShapes]);
  
  // Select shapes
  const selectShapes = useCallback((shapeIds: string[]) => {
    setSelectedShapes(shapeIds);
    vectorStore.setState({ selected: shapeIds });
  }, []);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedShapes([]);
    vectorStore.setState({ selected: [] });
  }, []);
  
  // Update tool settings
  const updateToolSettings = useCallback((settings: Partial<typeof toolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...settings }));
  }, []);
  
  // Update performance metrics
  const updatePerformanceMetrics = useCallback((metrics: Partial<typeof performanceMetrics>) => {
    setPerformanceMetrics(prev => ({ 
      ...prev, 
      ...metrics, 
      lastUpdate: Date.now() 
    }));
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Set error
  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('Shirt State Error:', errorMessage);
  }, []);
  
  // Reset state
  const resetState = useCallback(() => {
    setVectorShapes([]);
    setSelectedShapes([]);
    setCurrentPath(null);
    setAnchorPoints([]);
    setError(null);
    setIsLoading(false);
  }, []);
  
  // Convert vector paths to embroidery stitches
  const convertVectorPathsToEmbroideryStitches = useCallback(() => {
    if (vectorShapes.length === 0) return;
    
    console.log(`🔄 Converting ${vectorShapes.length} vector shapes to embroidery stitches`);
    
    const appState = useApp.getState();
    const existingStitches = appState.embroideryStitches || [];
    
    const newStitches = vectorShapes.map(shape => ({
      id: `stitch_${shape.id}`,
      type: (shape.tool || appState.embroideryStitchType || 'satin') as any,
      points: (((shape.points ?? (shape.path?.points)) || []) as any[]).map((p: any) => ({ x: p.x, y: p.y })),
      color: appState.embroideryColor || '#ff69b4',
      threadType: (appState.embroideryThreadType || 'cotton') as any,
      thickness: appState.embroideryThickness || 2,
      opacity: appState.embroideryOpacity ?? 1.0
    }));
    
    useApp.setState({
      embroideryStitches: [...existingStitches, ...newStitches]
    });
    
    console.log(`✅ Converted ${newStitches.length} shapes to embroidery stitches`);
  }, [vectorShapes]);
  
  // Get selected shapes
  const getSelectedShapes = useCallback(() => {
    return vectorShapes.filter(shape => selectedShapes.includes(shape.id));
  }, [vectorShapes, selectedShapes]);
  
  // Get shape by ID
  const getShapeById = useCallback((shapeId: string) => {
    return vectorShapes.find(shape => shape.id === shapeId);
  }, [vectorShapes]);
  
  // Check if shape is selected
  const isShapeSelected = useCallback((shapeId: string) => {
    return selectedShapes.includes(shapeId);
  }, [selectedShapes]);
  
  // Get state summary
  const getStateSummary = useCallback(() => {
    return {
      vectorShapes: vectorShapes.length,
      selectedShapes: selectedShapes.length,
      currentPath: currentPath ? 'active' : 'none',
      anchorPoints: anchorPoints.length,
      isLoading,
      error,
      performanceMetrics
    };
  }, [vectorShapes, selectedShapes, currentPath, anchorPoints, isLoading, error, performanceMetrics]);
  
  return {
    // State
    isLoading,
    error,
    selectedDecal,
    activeLayerId,
    showAnchorPoints,
    showGrid,
    showGuides,
    snapToGrid,
    snapToPoints,
    vectorShapes,
    selectedShapes,
    currentPath,
    anchorPoints,
    toolSettings,
    performanceMetrics,
    
    // Actions
    setIsLoading,
    setError: setErrorState,
    clearError,
    setSelectedDecal,
    setActiveLayerId,
    setShowAnchorPoints,
    setShowGrid,
    setShowGuides,
    setSnapToGrid,
    setSnapToPoints,
    updateVectorShapes,
    addVectorShape,
    removeVectorShape,
    updateVectorShape,
    selectShapes,
    clearSelection,
    updateToolSettings,
    updatePerformanceMetrics,
    resetState,
    convertVectorPathsToEmbroideryStitches,
    
    // Getters
    getSelectedShapes,
    getShapeById,
    isShapeSelected,
    getStateSummary
  };
};

export default useShirtState;
