import React from 'react';
import { useApp } from '../App';
import { UnifiedToolSystem } from '../core/UnifiedToolSystem';
import { useBrushEngine } from '../hooks/useBrushEngine';

// Import all tool components
import { PatternMaker } from './PatternMaker';
import { AdvancedSelection } from './AdvancedSelection';
// Removed AI Assistant and Export features
import { CloudSync } from './CloudSync';
import { LayerEffects } from './LayerEffects';
import { ColorGrading } from './ColorGrading';
// Removed Animation tools
import { DesignTemplates } from './DesignTemplates';
import { BatchProcessing } from './BatchProcessing';
// Removed AdvancedBrushSystem - now using unified useBrushEngine system
import { ProceduralGenerator } from './ProceduralGenerator';
// Removed 3D Painting tool
import { SmartFillTool } from './SmartFillTool';
// Embroidery settings now in RightPanelNew.tsx - no separate component needed
import { ProfessionalVectorTool } from './ProfessionalVectorTool';
import UniversalSelectTool from './UniversalSelectTool';
// Removed PuffSettings import - now rendered in RightPanelCompact.tsx

interface ToolRouterProps {
  active: boolean;
}

export function ToolRouter({ active }: ToolRouterProps) {
  // Console log removed

  const activeTool = useApp(s => s.activeTool);
  
  // Initialize unified tool system and brush engine
  const brushEngine = useBrushEngine();
  const unifiedToolSystem = React.useMemo(() => {
    const system = UnifiedToolSystem.getInstance();
    system.setBrushEngine(brushEngine);
    return system;
  }, [brushEngine]);

  // Tool routing configuration
  const toolRoutes = {
    // Design Tools - Now handled by unified system
    'brush': 'unified', // Handled by unified brush engine
    'airbrush': 'unified', // Handled by unified brush engine
    'pencil': 'unified', // Handled by unified brush engine
    'marker': 'unified', // Handled by unified brush engine
    'watercolor': 'unified', // Handled by unified brush engine
    'vector': 'unified', // Handled by unified vector engine
    'select': 'unified', // Handled by unified selection engine
    'text': 'unified', // Handled by unified text engine
    'shape': 'unified', // Handled by unified shape engine
    'shapes': 'unified', // Handled by unified shape engine
    'eraser': null, // Handled by main canvas
    'smudge': null, // Handled by main canvas
    'blur': null, // Handled by main canvas
    'fill': null, // Handled by main canvas
    'gradient': null, // Handled by main canvas
    'picker': null, // Handled by main canvas

    // Shapes & Text - Now handled by unified system
    'line': null, // Handled by main canvas
    'rect': null, // Handled by unified vector system
    'ellipse': null, // Handled by unified vector system
    'polygon': null, // Handled by unified vector system
    'star': null, // Handled by unified vector system
    'moveText': null, // Handled by main canvas

    // Selection & Transform
    'universalSelect': UniversalSelectTool,
    'advancedSelection': AdvancedSelection,
    'transform': null, // Handled by main canvas
    'move': null, // Handled by main canvas

    // Vector & Paths - Now handled by unified system
    'vectorTools': ProfessionalVectorTool,
    'pen': null, // Handled by unified vector system
    'lasso': null, // Handled by unified vector system
    'magic_wand': null, // Handled by unified vector system

    // Effects & Filters
    'layerEffects': LayerEffects,
    'colorGrading': ColorGrading,

    // Textile Design
    // 'puffPrint' removed - will be rebuilt with new 3D geometry approach
    'patternMaker': PatternMaker,
    'embroidery': null, // Settings in RightPanelNew.tsx, drawing on 3D model

    // AI & Automation
    'aiAssistant': null,
    'batch': BatchProcessing,

    // Media & Animation
    'animation': null,

    // Assets & Templates
    'templates': DesignTemplates,

    // Export & Sync
    'printExport': null,
    'cloudSync': CloudSync,

    // Advanced Tools
    // 'advancedBrush': AdvancedBrushSystem, // Removed - using unified useBrushEngine system
    'meshDeformation': null,
    'proceduralGenerator': ProceduralGenerator,
    'smartFill': SmartFillTool,

    // History & Undo
    'undo': null, // Handled by main app
    'redo': null, // Handled by main app
  };

  if (!active) {
    // Console log removed
    return null;
  }

  // Unified tool component that handles both brush and vector tools
  const UnifiedToolComponent = React.useMemo(() => {
    return function UnifiedToolHandler({ active }: { active: boolean }) {
      if (!active) return null;
      
      const currentTool = unifiedToolSystem.getActiveTool();
      if (!currentTool) return null;
      
      // For brush tools, the brush engine handles everything
      if (currentTool.type === 'brush') {
        return (
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '20px', 
            background: 'rgba(15, 23, 42, 0.95)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            color: '#e2e8f0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{currentTool.icon}</span>
              <span>{currentTool.name}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {currentTool.description}
            </div>
          </div>
        );
      }
      
      // For vector tools, show vector-specific UI
      if (currentTool.type === 'vector') {
        return (
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '20px', 
            background: 'rgba(15, 23, 42, 0.95)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            color: '#e2e8f0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{currentTool.icon}</span>
              <span>{currentTool.name}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {currentTool.description}
            </div>
            <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>
              Vector Mode Active
            </div>
          </div>
        );
      }
      
      return null;
    };
  }, [unifiedToolSystem]);

  const ToolComponent = toolRoutes[activeTool as keyof typeof toolRoutes];

  // Handle unified tools
  if (ToolComponent === 'unified') {
    return <UnifiedToolComponent active={active} />;
  }

  if (!ToolComponent) {
    // Console log removed
    return null;
  }

  console.log('🔀 ToolRouter: Rendering tool component', { 
    activeTool,
    componentName: ToolComponent.name
  });


  // Right sidebar tools (embroidery, advanced brush)
  if (activeTool === 'embroidery' || activeTool === 'advancedBrush') {
    const width = activeTool === 'advancedBrush' ? '360px' : '350px';
    const className = `${activeTool}-right-sidebar`;
    return (
      <div
        className={className}
        style={{
          position: 'fixed',
          top: '60px',
          right: 0,
          width,
          height: 'calc(100vh - 60px)',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderLeft: '1px solid #334155',
          zIndex: 1001,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 30px rgba(2, 6, 23, 0.35)'
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: activeTool === 'advancedBrush' ? '0' : '0',
            scrollbarWidth: 'thin',
            scrollbarColor: '#475569 #1E293B'
          }}
        >
          <ToolComponent active={true} />
        </div>
      </div>
    );
  }

  // Default overlay behavior for other tools
  return (
    <div className="tool-router" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute', top: '20px', left: '20px', width: '420px', maxWidth: '90vw', pointerEvents: 'auto',
        background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)',
        backdropFilter: 'blur(10px)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
      }}>
        <ToolComponent active={true} />
      </div>
    </div>
  );
}

