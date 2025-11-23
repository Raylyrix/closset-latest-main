import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from './Navigation';
import { Toolbar } from './Toolbar';
import { RightPanelCompact } from './RightPanelCompact';
import { LeftPanelCompact } from './LeftPanelCompact';
import { GridOverlay } from './GridOverlay';
import { VectorOverlay } from './VectorOverlay';
import VectorToolbar from './VectorToolbar';
import { useApp } from '../App';
import { vectorStore } from '../vector/vectorState';
import { PerformanceSettingsPopup } from './PerformanceSettingsPopup';
import { performanceOptimizer } from '../utils/PerformanceOptimizer';
import { renderStitchType, StitchPoint, StitchConfig } from '../utils/stitchRendering';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Grid & Scale Controls for Main Toolbar
const GridToolbarControls = () => {
  const { 
    showGrid, setShowGrid,
    showRulers, setShowRulers,
    snapToGrid, setSnapToGrid,
    scale, setScale,
    gridSize, setGridSize,
    gridColor, setGridColor,
    gridOpacity, setGridOpacity,
    rulerUnits, setRulerUnits,
    snapDistance, setSnapDistance
  } = useApp();
  
  const [showScaleMenu, setShowScaleMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const scaleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scaleRef.current && !scaleRef.current.contains(event.target as Node)) {
        setShowScaleMenu(false);
      }
      if (gridRef.current && !gridRef.current.contains(event.target as Node)) {
        setShowGridMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Grid Toggle */}
      <button
        onClick={() => setShowGrid(!showGrid)}
        style={{
          padding: '8px 12px',
          background: showGrid ? '#FFFFFF' : '#000000',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease'
        }}
        title="Toggle Grid"
      >
        <span>📐</span>
        <span>Grid</span>
      </button>

      {/* Rulers Toggle */}
      <button
        onClick={() => setShowRulers(!showRulers)}
        style={{
          padding: '8px 12px',
          background: showRulers ? '#FFFFFF' : '#000000',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease'
        }}
        title="Toggle Rulers"
      >
        <span>📏</span>
        <span>Rulers</span>
      </button>

      {/* Snap Toggle */}
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        style={{
          padding: '8px 12px',
          background: snapToGrid ? '#FFFFFF' : '#000000',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease'
        }}
        title="Toggle Snap to Grid"
      >
        <span>🧲</span>
        <span>Snap</span>
      </button>

      {/* Scale Controls */}
      <div ref={scaleRef} style={{ position: 'relative', zIndex: 10003 }}>
        <button
          onClick={() => setShowScaleMenu(!showScaleMenu)}
          style={{
            padding: '8px 12px',
            background: '#000000',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease'
          }}
          title="Scale Controls"
        >
          <span>🔍</span>
          <span>{Math.round(scale * 100)}%</span>
        </button>
        
        {showScaleMenu && (
          <>
            {/* Modal Backdrop */}
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 99999999998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={() => setShowScaleMenu(false)}>
              {/* Modal Content */}
              <div style={{
                background: '#000000',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                minWidth: '350px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflowY: 'auto',
                zIndex: 99999999999,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                position: 'relative'
              }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#10B981'
              }}>
                Scale Settings
              </h4>
              <button
                onClick={() => setShowScaleMenu(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕ Close
              </button>
            </div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#E2E8F0',
              fontSize: '12px'
            }}>
              Scale: {Math.round(scale * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#10B981'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '4px',
              marginTop: '8px'
            }}>
              <button
                onClick={() => setScale(0.5)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: '#000000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                50%
              </button>
              <button
                onClick={() => setScale(1.0)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: '#FFFFFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                100%
              </button>
              <button
                onClick={() => setScale(2.0)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: '#000000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                200%
              </button>
            </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Grid Settings */}
      <div ref={gridRef} style={{ position: 'relative', zIndex: 10003 }}>
        <button
          onClick={() => setShowGridMenu(!showGridMenu)}
          style={{
            padding: '8px 12px',
            background: '#000000',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease'
          }}
          title="Grid Settings"
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
        
        {showGridMenu && (
          <>
            {/* Modal Backdrop */}
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 99999999998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={() => setShowGridMenu(false)}>
              {/* Modal Content */}
              <div style={{
                background: '#000000',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                minWidth: '400px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflowY: 'auto',
                zIndex: 99999999999,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                position: 'relative'
              }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#10B981'
              }}>
                Grid Settings
              </h4>
              <button
                onClick={() => setShowGridMenu(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕ Close
              </button>
            </div>
            
            {/* Grid Size */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#E2E8F0',
                fontSize: '12px'
              }}>Grid Size: {gridSize}px</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#10B981'
                }}
              />
            </div>
            
            {/* Grid Color */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#E2E8F0',
                fontSize: '12px'
              }}>Grid Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={gridColor}
                  onChange={(e) => setGridColor(e.target.value)}
                  style={{
                    width: '30px',
                    height: '30px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={gridOpacity}
                  onChange={(e) => setGridOpacity(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#10B981'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#9CA3AF', minWidth: '30px' }}>
                  {Math.round(gridOpacity * 100)}%
                </span>
              </div>
            </div>
            
            {/* Units */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#E2E8F0',
                fontSize: '12px'
              }}>Units</label>
              <select
                value={rulerUnits}
                onChange={(e) => setRulerUnits(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#E2E8F0',
                  fontSize: '12px'
                }}
              >
                <option value="px">Pixels (px)</option>
                <option value="mm">Millimeters (mm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
            
            {/* Snap Distance */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#E2E8F0',
                fontSize: '12px'
              }}>Snap Distance: {snapDistance}px</label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={snapDistance}
                onChange={(e) => setSnapDistance(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#10B981'
                }}
              />
            </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export function MainLayout({ children }: MainLayoutProps) {
  // Console log removed

  const [showNavigation, setShowNavigation] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(400);
  const [activeToolSidebar, setActiveToolSidebar] = useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Resizing state
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const activeTool = useApp(s => s.activeTool);
  const setActiveTool = useApp(s => s.setActiveTool);
  const vectorMode = useApp(s => s.vectorMode);
  const setVectorMode = useApp(s => s.setVectorMode);
  const showAnchorPoints = useApp(s => s.showAnchorPoints);
  const setShowAnchorPoints = useApp(s => s.setShowAnchorPoints);
  const vectorPaths = useApp(s => s.vectorPaths || []);
  
  // Vector toolbar state
  const [showVectorToolbar, setShowVectorToolbar] = useState(false);
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false);
  const [showSymmetryDropdown, setShowSymmetryDropdown] = useState(false);
  const [currentPerformancePreset, setCurrentPerformancePreset] = useState(performanceOptimizer.getCurrentPreset());
  const showGrid = useApp(s => s.showGrid);
  const setShowGrid = useApp(s => s.setShowGrid);
  const showRulers = useApp(s => s.showRulers);
  const setShowRulers = useApp(s => s.setShowRulers);
  
  // Listen for performance preset changes
  useEffect(() => {
    const handlePresetChange = () => {
      setCurrentPerformancePreset(performanceOptimizer.getCurrentPreset());
    };
    
    window.addEventListener('performancePresetChanged', handlePresetChange);
    return () => window.removeEventListener('performancePresetChanged', handlePresetChange);
  }, []);
  
  // Symmetry settings
  const symmetryX = useApp(s => s.symmetryX);
  const symmetryY = useApp(s => s.symmetryY);
  const symmetryZ = useApp(s => s.symmetryZ);
  const setSymmetryX = useApp(s => s.setSymmetryX);
  const setSymmetryY = useApp(s => s.setSymmetryY);
  const setSymmetryZ = useApp(s => s.setSymmetryZ);

  // Handle tool changes and sidebar switching
  useEffect(() => {
    console.log('🔍 MainLayout Tool Change:', { activeTool, showRightPanel, activeToolSidebar });
    
    // When a tool is selected, show its sidebar and hide others
    // Exclude basic tools and embroidery tool (handled separately)
    if (activeTool && 
        activeTool !== 'brush' && 
        activeTool !== 'eraser' && 
        activeTool !== 'fill' && 
        activeTool !== 'picker' &&
        activeTool !== 'embroidery') {
      console.log('🔍 Setting activeToolSidebar to:', activeTool);
      setActiveToolSidebar(activeTool);
      setShowRightPanel(true);
    } else {
      console.log('🔍 Clearing activeToolSidebar');
      setActiveToolSidebar(null);
    }
  }, [activeTool]);

  // Close symmetry dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSymmetryDropdown && !target.closest('.symmetry-dropdown-container')) {
        setShowSymmetryDropdown(false);
      }
    };

    if (showSymmetryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSymmetryDropdown]);

  // Resize handlers
  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setLeftWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  const toggleNavigation = () => {
    // Console log removed
    setShowNavigation(prev => !prev);
  };

  const toggleLeftPanel = () => {
    // Console log removed
    setShowLeftPanel(prev => !prev);
  };

  const toggleRightPanel = () => {
    // Console log removed
    setShowRightPanel(prev => !prev);
  };

  const toggleSidebars = () => {
    const next = !(showLeftPanel || showRightPanel);
    setShowLeftPanel(next);
    setShowRightPanel(next);
  };

  // Performance optimization: Reduce console logging
  // console.log('🏗️ MainLayout: Rendering layout', {
  //   showNavigation,
  //   showLeftPanel,
  //   showRightPanel,
  //   activeTool
  // });

  return (
    <div className="main-layout" style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#000000',
      boxShadow: '0 0 100px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'auto'
    }}>
      {/* Vector Toolbar - Shows when vector tools are active */}
      <VectorToolbar 
        isVisible={showVectorToolbar} 
        onClose={() => {
          setShowVectorToolbar(false);
          setVectorMode(false);
        }} 
      />
      
      {/* Navigation Sidebar */}
      {showNavigation && (
        <div className="navigation-container" style={{
          position: 'relative',
          zIndex: 1000
        }}>
          <Navigation active={true} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        marginTop: showVectorToolbar ? '36px' : '0px',
        transition: 'margin-top 0.3s ease'
      }}>
        {/* Sexy Top Navigation Bar */}
        <div className="top-nav" style={{
          height: '40px',
          background: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
          justifyContent: 'space-between',
            padding: '0 16px',
          position: 'relative',
          zIndex: 99999999998,
          fontSize: '11px',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto'
        }}>
          {/* Left Section - Logo & Project */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              fontSize: '10px',
              color: '#a0aec0',
              fontWeight: '500',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              Untitled Design
            </div>
          </div>

          {/* Center Section - Main Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              style={{
                padding: '8px 16px',
                background: showLeftPanel 
                  ? '#FFFFFF' 
                  : 'transparent',
                borderRadius: '6px',
                color: showLeftPanel ? '#000000' : '#FFFFFF',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🛠️ Tools
            </button>
            
            <button 
              onClick={() => {
                // FIXED: Toggle layers tab - switch to layers or clear it to show tool settings
                if (activeToolSidebar === 'advancedLayers') {
                  // If layers is active, deactivate it (will show tool settings instead)
                  setActiveToolSidebar(null);
                } else {
                  // If layers is not active, activate it
                  setShowRightPanel(true);
                  setActiveToolSidebar('advancedLayers');
                }
              }}
              style={{
                padding: '8px 16px',
                background: activeToolSidebar === 'advancedLayers' && showRightPanel
                  ? '#FFFFFF'
                  : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: activeToolSidebar === 'advancedLayers' && showRightPanel ? '#000000' : '#FFFFFF',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Layers
            </button>
            
            <button style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              Export
            </button>
          </div>

          {/* Right Section - View Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
            {/* Performance Settings Button */}
            <button
              onClick={() => setShowPerformanceSettings(true)}
              style={{
                padding: '6px 12px',
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '6px',
                color: '#667eea',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '12px' }}>⚙️</span>
              <span>Performance</span>
              <span style={{ 
                fontSize: '9px', 
                opacity: 0.8,
                fontWeight: '500',
                textTransform: 'capitalize',
                padding: '2px 6px',
                background: 'rgba(102, 126, 234, 0.2)',
                borderRadius: '4px'
              }}>
                ({currentPerformancePreset})
              </span>
            </button>

            {/* Symmetry Dropdown Button */}
            <div className="symmetry-dropdown-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSymmetryDropdown(!showSymmetryDropdown)}
                style={{
                  padding: '6px 12px',
                  background: showSymmetryDropdown 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: showSymmetryDropdown ? '#ffffff' : '#a0aec0',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.3s ease',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!showSymmetryDropdown) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showSymmetryDropdown) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <span style={{ fontSize: '12px' }}>🔄</span>
                <span>Symmetry</span>
                <span style={{ fontSize: '8px', marginLeft: '2px' }}>
                  {showSymmetryDropdown ? '▲' : '▼'}
                </span>
              </button>

              {/* Symmetry Dropdown */}
              {showSymmetryDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '4px',
                  background: '#1a1a2e',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  minWidth: '180px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 99999999999
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    Symmetry Settings
                  </div>

                  {/* X-Axis Symmetry */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '10px',
                      color: '#a0aec0',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={symmetryX}
                        onChange={(e) => setSymmetryX(e.target.checked)}
                        style={{ 
                          accentColor: '#667eea',
                          width: '14px',
                          height: '14px'
                        }}
                      />
                      <span>X-Axis Symmetry</span>
                    </label>
                  </div>

                  {/* Y-Axis Symmetry */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '10px',
                      color: '#a0aec0',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={symmetryY}
                        onChange={(e) => setSymmetryY(e.target.checked)}
                        style={{ 
                          accentColor: '#667eea',
                          width: '14px',
                          height: '14px'
                        }}
                      />
                      <span>Y-Axis Symmetry</span>
                    </label>
                  </div>

                  {/* Z-Axis Symmetry */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '10px',
                      color: '#a0aec0',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={symmetryZ}
                        onChange={(e) => setSymmetryZ(e.target.checked)}
                        style={{ 
                          accentColor: '#667eea',
                          width: '14px',
                          height: '14px'
                        }}
                      />
                      <span>Z-Axis Symmetry</span>
                    </label>
                  </div>

                  {/* Quick Actions */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '8px',
                    marginTop: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          setSymmetryX(true);
                          setSymmetryY(true);
                          setSymmetryZ(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: 'rgba(102, 126, 234, 0.2)',
                          border: '1px solid rgba(102, 126, 234, 0.3)',
                          borderRadius: '4px',
                          color: '#667eea',
                          fontSize: '9px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                        }}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setSymmetryX(false);
                          setSymmetryY(false);
                          setSymmetryZ(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: '#a0aec0',
                          fontSize: '9px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        None
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* View Controls Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowGrid(!showGrid);
                }}
              style={{
                  padding: '4px 8px',
                  background: showGrid ? '#FFFFFF' : 'transparent',
                border: 'none',
                  borderRadius: '4px',
                  color: showGrid ? '#000000' : '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Grid
            </button>
              
            <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRulers(!showRulers);
                }}
              style={{
                  padding: '4px 8px',
                  background: showRulers ? '#FFFFFF' : 'transparent',
                border: 'none',
                  borderRadius: '4px',
                  color: showRulers ? '#000000' : '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Rulers
            </button>
          </div>

            {/* Vector Tools Group - Only show when vector mode is active */}
            {vectorMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
                  onClick={() => {
                    const { undo } = useApp.getState();
                    if (undo) undo();
                  }}
              style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: '500',
                cursor: 'pointer',
                    border: 'none'
              }}
            >
                  ↶ Undo
            </button>
                
            <button
                  onClick={() => {
                    const { redo } = useApp.getState();
                    if (redo) redo();
                  }}
              style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: '500',
                cursor: 'pointer',
                    border: 'none'
              }}
            >
                  ↷ Redo
            </button>
                
            <button
                  onClick={() => setShowAnchorPoints(!showAnchorPoints)}
              style={{
                    padding: '4px 8px',
                    background: showAnchorPoints ? '#FFFFFF' : 'transparent',
                    borderRadius: '4px',
                    color: showAnchorPoints ? '#000000' : '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: '500',
                cursor: 'pointer',
                    border: 'none'
              }}
            >
                  ⚓ Anchor
            </button>

          <button
            data-apply-tool-button
            disabled={vectorPaths.length === 0}
            title={vectorPaths.length === 0 
              ? 'No vector paths to apply. Create paths first.' 
              : `Apply ${activeTool || 'tool'} to ${vectorPaths.length} path${vectorPaths.length !== 1 ? 's' : ''}`}
            onClick={() => {
                    console.log('🎨 Apply Tool button clicked - applying tools to vector paths');
                    try {
                      const appState = useApp.getState();
                      const vectorPaths = appState.vectorPaths || [];
                      const activeLayerId = appState.activeLayerId; // Get active layer ID for stroke saving
                      
                      if (vectorPaths.length === 0) {
                        console.log('⚠️ No vector paths to apply tools to');
                        // Show user-friendly message
                        alert('No vector paths to apply. Please create vector paths first using the vector tool.');
                        return;
                      }
                      
                      console.log('🎨 Vector paths found:', vectorPaths.length);
                      console.log('🎨 Vector paths:', vectorPaths);
                      
                      // Get current tool settings
                      const currentTool = appState.activeTool;
                      
                      // CRITICAL FIX: Check if tool supports vector path application
                      const supportedTools = ['brush', 'embroidery', 'fill', 'eraser', 'puffPrint'];
                      if (!supportedTools.includes(currentTool)) {
                        console.warn(`⚠️ Tool "${currentTool}" does not support vector path application`);
                        alert(`The "${currentTool}" tool cannot be applied to vector paths. Please select Brush, Embroidery, Fill, Eraser, or Puff Print tool.`);
                        return;
                      }
                      
                      console.log(`🎨 Applying ${currentTool} to ${vectorPaths.length} vector paths`);
                      
                      // CRITICAL FIX: Validate paths before applying
                      const validPaths = vectorPaths.filter((path: any) => {
                        // Must have points
                        const points = path.points || path.anchors || path.vertices || (Array.isArray(path) ? path : []);
                        if (!points || points.length < 2) {
                          console.warn('⚠️ Skipping path (needs 2+ points):', path.id, 'points:', points?.length || 0);
                          return false;
                        }
                        if (!path.id) {
                          console.warn('⚠️ Skipping path with no ID');
                          return false;
                        }
                        return true;
                      });
                      
                      if (validPaths.length === 0) {
                        console.log('⚠️ No valid paths to apply tools to');
                        return;
                      }
                      
                      console.log(`🎨 Applying ${currentTool} to ${validPaths.length} valid paths out of ${vectorPaths.length} total`);
                      
                      // REMOVED: allNewBrushStrokes array - no longer needed
                      // We render directly to layer.canvas, not to brushStrokes array
                      
                      // CRITICAL FIX: Get layer ONCE before the loop to avoid stale references
                      // Get the layer and V2 layer once to ensure we're working with the same layer
                      const layer = appState.getActiveLayer();
                      const v2Store = (window as any).__layerStore;
                      const v2State = v2Store?.getState();
                      const v2ActiveLayerId = v2State?.activeLayerId;
                      const v2Layer = v2ActiveLayerId ? v2State.layers.find((l: any) => l.id === v2ActiveLayerId) : null;
                      
                      if (!layer || !layer.canvas) {
                        console.warn('⚠️ No active layer or canvas found');
                        return;
                      }
                      
                      console.log('🎨 Using layer:', layer.id, 'Canvas dimensions:', layer.canvas.width, 'x', layer.canvas.height);
                      
                      // CRITICAL FIX: Get canvas context for rendering
                      // DO NOT clear the canvas - let strokes accumulate across multiple Applies
                      // Each Apply adds to the layer, it doesn't replace previous strokes
                      const ctx = layer.canvas.getContext('2d');
                      if (!ctx) {
                        console.warn('⚠️ Could not get canvas context from layer');
                        return;
                      }
                      
                      // Apply tool to each valid vector path
                      validPaths.forEach((path: any) => {
                        console.log(`🎨 Applying ${currentTool} to path:`, path.id);
                        console.log('🎨 Path structure:', path);
                        
                        // Handle different vector path structures
                        let points = [];
                        if (path.points) {
                          points = path.points;
                        } else if (path.anchors) {
                          points = path.anchors;
                        } else if (path.vertices) {
                          points = path.vertices;
                        } else if (Array.isArray(path)) {
                          points = path;
                        }
                        
                        console.log('🎨 Points found:', points.length);
                        
                        // Should never be empty after validation, but double-check
                        if (points.length < 2) {
                          console.warn('⚠️ Path has insufficient points after validation');
                          return;
                        }
                        
                        // Create sampled points for smooth tool application
                        const sampledPoints = [];
                        for (let i = 0; i < points.length - 1; i++) {
                          const p1 = points[i];
                          const p2 = points[i + 1];
                          
                          // Handle different point structures
                          const p1U = p1.u || p1.x || p1[0];
                          const p1V = p1.v || p1.y || p1[1];
                          const p2U = p2.u || p2.x || p2[0];
                          const p2V = p2.v || p2.y || p2[1];
                          
                          const steps = Math.max(5, Math.floor(Math.sqrt(
                            Math.pow(p2U - p1U, 2) + Math.pow(p2V - p1V, 2)
                          )));
                          
                          for (let j = 0; j <= steps; j++) {
                            const t = j / steps;
                            sampledPoints.push({
                              u: p1U + t * (p2U - p1U),
                              v: p1V + t * (p2V - p1V)
                            });
                          }
                        }
                        
                        console.log(`🎨 Sampled ${sampledPoints.length} points for smooth application`);
                        
                        // Apply tool based on current active tool
                        switch (currentTool) {
                          case 'fill':
                            console.log('🎨 Applying fill tool to closed paths');
                            if (path.closed && points.length >= 3) {
                              // Fill closed paths
                              const composedCanvas = appState.composedCanvas;
                              const canvasWidth = composedCanvas?.width || layer.canvas.width || 2048;
                              const canvasHeight = composedCanvas?.height || layer.canvas.height || 2048;
                              
                              ctx.save();
                              ctx.globalCompositeOperation = appState.blendMode || 'source-over';
                              ctx.globalAlpha = appState.brushOpacity || 1.0;
                              ctx.fillStyle = appState.brushColor || '#000000';
                              
                              // Create path from points
                              ctx.beginPath();
                              points.forEach((point: any, index: number) => {
                                const x = Math.floor((point.u || point.x || 0) * canvasWidth);
                                const y = Math.floor((point.v || point.y || 0) * canvasHeight);
                                
                                if (index === 0) {
                                  ctx.moveTo(x, y);
                                } else {
                                  // Check for bezier handles
                                  const prevPoint = points[index - 1];
                                  if (prevPoint.outHandle || point.inHandle) {
                                    const cp1X = prevPoint.outHandle ? Math.floor(prevPoint.outHandle.u * canvasWidth) : x;
                                    const cp1Y = prevPoint.outHandle ? Math.floor(prevPoint.outHandle.v * canvasHeight) : y;
                                    const cp2X = point.inHandle ? Math.floor(point.inHandle.u * canvasWidth) : x;
                                    const cp2Y = point.inHandle ? Math.floor(point.inHandle.v * canvasHeight) : y;
                                    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y);
                                  } else {
                                    ctx.lineTo(x, y);
                                  }
                                }
                              });
                              ctx.closePath();
                              ctx.fill();
                              ctx.restore();
                              
                              console.log('✅ Fill applied to closed path:', path.id);
                            } else {
                              console.warn('⚠️ Path must be closed and have 3+ points for fill');
                            }
                            break;
                            
                          case 'eraser':
                            console.log('🎨 Applying eraser tool to', sampledPoints.length, 'points');
                            // Erase along the path
                            ctx.save();
                            ctx.globalCompositeOperation = 'destination-out';
                            ctx.globalAlpha = appState.brushOpacity || 1.0;
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = appState.brushSize || 10;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            
                            // Erase along path
                            ctx.beginPath();
                            sampledPoints.forEach((point: any, index: number) => {
                              const x = Math.round(point.u * layer.canvas.width);
                              const y = Math.round(point.v * layer.canvas.height);
                              
                              if (index === 0) {
                                ctx.moveTo(x, y);
                              } else {
                                ctx.lineTo(x, y);
                              }
                            });
                            ctx.stroke();
                            ctx.restore();
                            
                            console.log('✅ Eraser applied to path:', path.id);
                            break;
                            
                          case 'puffPrint':
                            console.log('🎨 Applying puff print tool to', sampledPoints.length, 'points');
                            // Apply puff print along path
                            const puffBridge = typeof ((window as any).__applyPuffFromVector) === 'function'
                              ? (window as any).__applyPuffFromVector as (pts: Array<{ x: number; y: number }>, opts: { width?: number; opacity?: number; color?: string }) => void
                              : undefined;
                            
                            if (puffBridge) {
                              // Convert UV points to canvas coordinates
                              const composedCanvas = appState.composedCanvas;
                              const canvasWidth = composedCanvas?.width || layer.canvas.width || 2048;
                              const canvasHeight = composedCanvas?.height || layer.canvas.height || 2048;
                              
                              const canvasPoints = sampledPoints.map((point: any) => ({
                                x: Math.floor(point.u * canvasWidth),
                                y: Math.floor(point.v * canvasHeight)
                              }));
                              
                              // Apply puff with current settings
                              puffBridge(canvasPoints, {
                                width: appState.puffHeight || 5,
                                opacity: appState.brushOpacity || 1.0,
                                color: appState.brushColor || '#000000'
                              });
                              
                              console.log('✅ Puff print applied to path:', path.id);
                            } else {
                              console.warn('⚠️ Puff print bridge not available');
                              // Fallback: draw on canvas as brush stroke
                              ctx.save();
                              ctx.globalCompositeOperation = 'source-over';
                              ctx.globalAlpha = appState.brushOpacity || 1.0;
                              ctx.strokeStyle = appState.brushColor || '#000000';
                              ctx.lineWidth = appState.brushSize || 5;
                              ctx.lineCap = 'round';
                              ctx.lineJoin = 'round';
                              
                              ctx.beginPath();
                              sampledPoints.forEach((point: any, index: number) => {
                                const x = Math.round(point.u * layer.canvas.width);
                                const y = Math.round(point.v * layer.canvas.height);
                                if (index === 0) ctx.moveTo(x, y);
                                else ctx.lineTo(x, y);
                              });
                              ctx.stroke();
                              ctx.restore();
                              
                              console.log('✅ Fallback: Puff print rendered as brush stroke');
                            }
                            break;
                            
                          case 'brush':
                            console.log('🎨 Applying brush tool to', sampledPoints.length, 'points');
                            const brushEngine = (window as any).__brushEngine;
                            
                            if (brushEngine && brushEngine.renderVectorPath && layer && layer.canvas) {
                              console.log('🎨 Using brush engine for gradient-aware rendering');
                              
                              // CRITICAL FIX: Get composed canvas dimensions instead of layer canvas
                              const composedCanvas = appState.composedCanvas;
                              const canvasWidth = composedCanvas?.width || layer.canvas.width || 2048;
                              const canvasHeight = composedCanvas?.height || layer.canvas.height || 2048;
                              
                              // Create canvas coordinates for brush engine
                              const canvasPoints = path.points.map((p: any) => ({
                                x: Math.floor(p.u * canvasWidth),
                                y: Math.floor(p.v * canvasHeight),
                                u: p.u,
                                v: p.v,
                                pressure: 1,
                                timestamp: Date.now(),
                                distance: 0
                              }));
                              
                              // CRITICAL FIX: Use path's own settings from creation time, not current settings
                              // This ensures each path keeps its own color/gradient from when it was created
                              const canvasPath = {
                                ...path,
                                points: canvasPoints,
                                settings: {
                                  ...path.settings, // Use path's own settings from creation time
                                  // Only use current settings as fallback if path has no settings
                                  color: path.settings?.color || appState.brushColor || '#000000',
                                  size: path.settings?.size || appState.brushSize || 10,
                                  opacity: path.settings?.opacity || appState.brushOpacity || 1.0,
                                  // CRITICAL: Use path's gradient setting, NOT current gradient
                                  gradient: path.settings?.gradient || undefined
                                }
                              };
                              
                              // CRITICAL FIX: Use the ctx we already got (don't get new one inside loop)
                              // Canvas is already cleared before loop, so just render to it
                              if (ctx) {
                                // CRITICAL FIX: Render to layer canvas using brush engine
                                brushEngine.renderVectorPath(canvasPath, ctx);
                                console.log('🎨 Brush engine rendering completed');
                                
                                // CRITICAL FIX: Strokes rendered to layer.canvas - no brushStrokes array needed
                                console.log('🎨 Rendered path to layer canvas:', path.id);
                              } else {
                                console.warn('⚠️ Could not get canvas context from layer');
                              }
                            } else if (layer && layer.canvas && ctx) {
                              // CRITICAL FIX: Use the SAME ctx we already have (don't get new one)
                              // Fallback to manual rendering without gradient
                              console.log('🎨 Drawing continuous brush stroke (fallback mode)');
                              
                              ctx.save();
                              ctx.globalCompositeOperation = 'source-over';
                              ctx.globalAlpha = appState.brushOpacity || 1.0;
                              ctx.strokeStyle = appState.brushColor || '#000000';
                              ctx.lineWidth = appState.brushSize || 5;
                              ctx.lineCap = 'round';
                              ctx.lineJoin = 'round';
                              ctx.shadowColor = 'rgba(0,0,0,0.3)';
                              ctx.shadowBlur = 4;
                              ctx.shadowOffsetX = 2;
                              ctx.shadowOffsetY = 2;
                              
                              // Draw continuous stroke
                              ctx.beginPath();
                              sampledPoints.forEach((point: any, index: number) => {
                                const x = Math.round(point.u * layer.canvas.width);
                                const y = Math.round(point.v * layer.canvas.height);
                                
                                if (index === 0) {
                                  ctx.moveTo(x, y);
            } else {
                                  ctx.lineTo(x, y);
                                }
                                
                                console.log(`🎨 Drawing brush point ${index}:`, { x, y, u: point.u, v: point.v });
                              });
                              ctx.stroke();
                              ctx.restore();
                              
                              console.log('🎨 Continuous brush stroke completed');
                            } else {
                              console.log('⚠️ No active layer or canvas found or ctx not available');
                            }
                            break;
                            
                          // case 'puffPrint': // Removed - will be rebuilt with new 3D geometry approach
                          case 'embroidery':
                            console.log('🎨 Applying embroidery tool to', sampledPoints.length, 'points');
                            // Get stitch type from app state (default to satin)
                            const stitchType = appState.embroideryStitchType || 'satin';
                            const embroideryCanvas = appState.embroideryCanvas || layer.canvas;
                            
                            if (embroideryCanvas) {
                              const embCtx = embroideryCanvas.getContext('2d');
                              if (embCtx) {
                                console.log(`🎨 Drawing ${stitchType} embroidery stitch`);
                                
                                // Convert sampled points to canvas coordinates
                                const composedCanvas = appState.composedCanvas;
                                const canvasWidth = composedCanvas?.width || embroideryCanvas.width || 2048;
                                const canvasHeight = composedCanvas?.height || embroideryCanvas.height || 2048;
                                
                                const stitchPoints: StitchPoint[] = sampledPoints.map((point: any) => ({
                                  x: Math.floor((point.u || 0) * canvasWidth),
                                  y: Math.floor((point.v || 0) * canvasHeight),
                                  u: point.u,
                                  v: point.v
                                }));
                                
                                // Create stitch config from current settings
                                const stitchConfig: StitchConfig = {
                                  type: stitchType,
                                  color: appState.embroideryThreadColor || appState.embroideryColor || appState.brushColor || '#000000',
                                  thickness: appState.embroideryThreadThickness || appState.embroideryThickness || appState.brushSize || 5,
                                  opacity: appState.embroideryOpacity || appState.brushOpacity || 1.0
                                };
                                
                                // Render using proper stitch rendering function
                                try {
                                  renderStitchType(embCtx, stitchPoints, stitchConfig);
                                  console.log(`✅ ${stitchType} stitch applied to path:`, path.id);
                                } catch (error) {
                                  console.error('❌ Error rendering stitch:', error);
                                  // Fallback to simple stroke
                                  embCtx.save();
                                  embCtx.globalCompositeOperation = 'source-over';
                                  embCtx.globalAlpha = stitchConfig.opacity;
                                  embCtx.strokeStyle = stitchConfig.color;
                                  embCtx.lineWidth = stitchConfig.thickness;
                                  embCtx.lineCap = 'round';
                                  embCtx.lineJoin = 'round';
                                  embCtx.beginPath();
                                  stitchPoints.forEach((point, index) => {
                                    if (index === 0) embCtx.moveTo(point.x, point.y);
                                    else embCtx.lineTo(point.x, point.y);
                                  });
                                  embCtx.stroke();
                                  embCtx.restore();
                                }
                              } else {
                                console.log('⚠️ No embroidery canvas context found');
                              }
                            } else {
                              console.log('⚠️ No embroidery canvas found');
                            }
                            break;
                        }
                      });
                      
                      // CRITICAL FIX: layer.canvas is the single source of truth - no brushStrokes array needed
                      // Strokes have already been rendered to layer.canvas, so we're done
                      console.log('🎨 All strokes rendered to layer.canvas - ready to compose');
                      
                      // CRITICAL FIX: Save to history BEFORE clearing vector paths
                      // This ensures undo/redo works properly
                      if (appState.commit) {
                        appState.commit();
                        console.log('✅ Changes committed to layer history');
                      }
                      
                      // CRITICAL FIX: Optionally clear vector paths AFTER committing to history
                      // By default, keep paths for applying another tool or further editing
                      // User can explicitly clear paths using the Clear button if needed
                      // Only clear activePathId to stop editing, but keep paths in vectorPaths
                      useApp.setState({ 
                        activePathId: null,     // Clear active path (stop editing)
                        selectedAnchor: null    // Clear selection
                        // CRITICAL: Keep vectorPaths array - don't clear paths
                        // This allows applying another tool or further editing
                      });
                      console.log('✅ Paths applied to layer - paths kept for further editing or applying another tool');
                      
                      // Now recompose layers
                      if (appState.composeLayers) {
                        appState.composeLayers();
                        console.log('✅ All layers recomposed');
                      }
                      
                      // Force texture update
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          console.log('🎨 Updating model texture');
                          (window as any).updateModelTexture();
                        }
                        
                        if ((window as any).updateModelWithPuffDisplacement) {
                          console.log('🎨 Updating model displacement maps');
                          (window as any).updateModelWithPuffDisplacement();
                        }
                      }, 100);
                      
                      console.log('✅ Apply Tool: All tools applied to vector paths successfully');
                      
                    } catch (error) {
                      console.error('❌ Error applying tools to vector paths:', error);
                    }
            }}
            style={{
                    padding: '4px 8px',
                    background: vectorPaths.length === 0 ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF',
                    borderRadius: '4px',
                    color: vectorPaths.length === 0 ? 'rgba(255, 255, 255, 0.5)' : '#000000',
                    fontSize: '9px',
                    fontWeight: '500',
                    cursor: vectorPaths.length === 0 ? 'not-allowed' : 'pointer',
                    border: 'none',
                    opacity: vectorPaths.length === 0 ? 0.5 : 1.0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
              }}
            >
                  ✅ Apply {vectorPaths.length > 0 && `(${vectorPaths.length})`}
            </button>

          <button
            onClick={() => {
                    console.log('🗑️ Clear Applied Effects button clicked');
                    const appState = useApp.getState();
                    
                    try {
                      // CRITICAL FIX: V2 layer system stores strokes in layer.content.brushStrokes[]
                      // DO NOT clear layer canvases - they are managed by the V2 system
                      // Instead, clear the vector paths and let the user re-apply if needed
                      
                      console.log('🗑️ Clearing vector paths only - not clearing layer canvases (V2 system manages those)');
                      
                      // CRITICAL FIX: Just clear vector paths, don't touch layer canvases
                      // The V2 layer system will handle canvas management
                      appState.vectorPaths = [];
                      appState.activePathId = null;
                      
                      console.log('✅ Vector paths cleared');
                      
                      // Update model texture to clear preview
                      setTimeout(() => {
                        if ((window as any).updateModelTexture) {
                          console.log('🎨 Updating model texture after clearing vector paths');
                          (window as any).updateModelTexture();
                        }
                      }, 100);
                      
                      console.log('✅ All applied effects cleared successfully');
                      
                    } catch (error) {
                      console.error('❌ Error clearing applied effects:', error);
                    }
            }}
            style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: '500',
              cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  🗑️ Clear
          </button>
              </div>
            )}

            {/* Vector Tools Toggle Button */}
          <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎨 Vector Tools button clicked');
                
                // Toggle behavior: if vector mode is already active, deactivate it
                if (vectorMode) {
                  console.log('🔄 Deactivating vector mode');
                  setVectorMode(false);
                  setActiveTool('brush'); // Switch back to brush
                } else {
                  console.log('✅ Activating vector mode');
                  setActiveTool('vector');
                  setVectorMode(true);
                }
                console.log('🎨 Vector mode set to:', !vectorMode);
            }}
            style={{
                padding: '6px 12px',
                background: vectorMode 
                  ? '#FFFFFF' 
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: vectorMode ? '#000000' : '#FFFFFF',
                fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
                gap: '4px',
              transition: 'all 0.3s ease',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
                if (!vectorMode) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
            }}
            onMouseLeave={(e) => {
                if (!vectorMode) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
          >
              <span style={{ fontSize: '12px' }}>🎨</span>
              <span>Vector Tools</span>
          </button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="workspace" style={{
          flex: 1,
          display: 'flex',
          minHeight: 0
        }}>
          {/* Left Panel */}
          {showLeftPanel && (
            <>
            <div className="left-panel-container" style={{
              width: `${leftWidth}px`,
                background: '#000000',
                borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                overflowY: 'auto',
                boxShadow: '2px 0 20px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                zIndex: 10001,
                pointerEvents: 'auto',
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none' /* IE and Edge */
              }}>
                <LeftPanelCompact />
            </div>
              
              {/* Left Resizer */}
              <div
                className="resizer resizer-left"
                onMouseDown={handleLeftResizeStart}
                style={{
                  width: '4px',
                  background: isResizingLeft ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'col-resize',
                  zIndex: 10002,
                  transition: 'background 0.2s ease'
                }}
              />
            </>
          )}

          {/* Canvas Area */}
          <div className="canvas-area" style={{
            flex: 1,
            position: 'relative',
          background: '#000000',
            overflow: 'hidden',
          zIndex: 0,
          boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.3)'
          }}>
            {children}
            <GridOverlay canvasRef={canvasRef} />
            {/* Ensure VectorOverlay is mounted on top of the canvas area when vector mode is active */}
            {vectorMode && <VectorOverlay />}
          </div>

          {/* Right Panel */}
          {showRightPanel && (
            <>
              {/* Right Resizer */}
              <div
                className="resizer resizer-right"
                onMouseDown={handleRightResizeStart}
                style={{
                  width: '4px',
                  background: isResizingRight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'col-resize',
                  zIndex: 10002,
                  transition: 'background 0.2s ease'
                }}
              />
              
            <div className="right-panel-container" style={{
              width: `${rightWidth}px`,
              background: '#000000',
              borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
              overflowY: 'auto',
              boxShadow: '-2px 0 20px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              zIndex: 10001,
              pointerEvents: 'auto',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* IE and Edge */
            }}>
              <RightPanelCompact activeToolSidebar={activeToolSidebar} />
            </div>
          </>
          )}
        </div>
      </div>

      {/* Performance Settings Popup */}
      <PerformanceSettingsPopup 
        isOpen={showPerformanceSettings}
        onClose={() => setShowPerformanceSettings(false)}
      />

    </div>
  );
}

