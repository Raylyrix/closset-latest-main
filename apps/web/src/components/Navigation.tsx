import React, { useState } from 'react';
import { useApp } from '../App';

interface NavigationProps {
  active: boolean;
}

interface ToolCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  tools: ToolItem[];
}

interface ToolItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

export function Navigation({ active }: NavigationProps) {
  // Console log removed

  const activeTool = useApp(s => s.activeTool);
  const setTool = useApp(s => s.setTool);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['design']));

  const toolCategories: ToolCategory[] = [
    {
      id: 'design',
      name: 'Design Tools',
      icon: '🎨',
      color: '#3B82F6',
      tools: [
        { id: 'brush', name: 'Brush', icon: '🖌️', description: 'Paint and draw freely', category: 'design' },
        { id: 'eraser', name: 'Eraser', icon: '🧽', description: 'Remove parts of your design', category: 'design' },
        { id: 'smudge', name: 'Smudge', icon: '👆', description: 'Blend and smudge colors', category: 'design' },
        { id: 'blur', name: 'Blur', icon: '🌫️', description: 'Apply blur effects', category: 'design' },
        { id: 'fill', name: 'Fill', icon: '🪣', description: 'Fill areas with color', category: 'design' },
        { id: 'gradient', name: 'Gradient', icon: '🌈', description: 'Create gradient fills', category: 'design' },
        { id: 'picker', name: 'Color Picker', icon: '🎯', description: 'Pick colors from canvas', category: 'design' }
      ]
    },
    {
      id: 'shapes',
      name: 'Shapes & Text',
      icon: '📐',
      color: '#10B981',
      tools: [
        { id: 'line', name: 'Line', icon: '📏', description: 'Draw straight lines', category: 'shapes' },
        { id: 'rect', name: 'Rectangle', icon: '⬜', description: 'Draw rectangles', category: 'shapes' },
        { id: 'ellipse', name: 'Ellipse', icon: '⭕', description: 'Draw circles and ellipses', category: 'shapes' },
        { id: 'text', name: 'Text', icon: '📝', description: 'Add text to your design', category: 'shapes' },
        { id: 'moveText', name: 'Move Text', icon: '📝', description: 'Move and edit text', category: 'shapes' }
      ]
    },
    {
      id: 'selection',
      name: 'Selection & Transform',
      icon: '🎯',
      color: '#F59E0B',
      tools: [
        { id: 'advancedSelection', name: 'Advanced Selection', icon: '🎯', description: 'Magic wand, lasso, and smart selection', category: 'selection' },
        { id: 'transform', name: 'Transform', icon: '🔄', description: 'Scale, rotate, and skew', category: 'selection' },
        { id: 'move', name: 'Move', icon: '✋', description: 'Move selected elements', category: 'selection' }
      ]
    },
    {
      id: 'vector',
      name: 'Vector & Paths',
      icon: '📐',
      color: '#8B5CF6',
      tools: [
        { id: 'vector', name: 'Vector Tools', icon: '✏️', description: 'Pen tool and path editing', category: 'vector' }
      ]
    },
    {
      id: 'effects',
      name: 'Effects & Filters',
      icon: '✨',
      color: '#EC4899',
      tools: [
        { id: 'layerEffects', name: 'Layer Effects', icon: '✨', description: 'Shadows, glows, bevels, and emboss', category: 'effects' },
        { id: 'colorGrading', name: 'Color Grading', icon: '🎨', description: 'Professional color correction', category: 'effects' }
      ]
    },
    {
      id: 'textile',
      name: 'Textile Design',
      icon: '👕',
      color: '#EF4444',
      tools: [
        { id: 'puffPrint', name: 'Puff Print', icon: '🎈', description: 'Create raised puff print effects', category: 'textile' },
        { id: 'embroidery', name: 'Embroidery', icon: '🧵', description: 'Stitches on fabric (S: Satin, R: Running)', category: 'textile' },
        { id: 'patternMaker', name: 'Pattern Maker', icon: '🔲', description: 'Create seamless repeating patterns', category: 'textile' }
      ]
    },
    {
      id: 'ai',
      name: 'AI & Automation',
      icon: '🤖',
      color: '#06B6D4',
      tools: [
        { id: 'aiAssistant', name: 'AI Assistant', icon: '🤖', description: 'Smart design suggestions and automation', category: 'ai' },
        { id: 'batch', name: 'Batch Processing', icon: '⚙️', description: 'Process multiple files automatically', category: 'ai' },
        { id: 'smartFill', name: 'Smart Fill', icon: '🧠', description: 'AI-powered content-aware fill', category: 'ai' }
      ]
    },
    {
      id: 'media',
      name: 'Media & Animation',
      icon: '🎬',
      color: '#84CC16',
      tools: [
        { id: 'animation', name: 'Animation', icon: '🎬', description: 'Create animations and motion graphics', category: 'media' }
      ]
    },
    {
      id: 'assets',
      name: 'Assets & Templates',
      icon: '📚',
      color: '#F97316',
      tools: [
        { id: 'templates', name: 'Templates', icon: '📚', description: 'Design templates and asset library', category: 'assets' }
      ]
    },
    {
      id: 'advanced',
      name: 'Advanced Tools',
      icon: '⚡',
      color: '#F59E0B',
      tools: [
        { id: 'advancedBrush', name: 'Advanced Brush', icon: '🎨', description: 'Professional brush system with dynamics', category: 'advanced' },
        { id: 'meshDeformation', name: 'Mesh Deformation', icon: '🔧', description: 'Warp and deform mesh surfaces', category: 'advanced' },
        { id: 'proceduralGenerator', name: 'Procedural Generator', icon: '🎲', description: 'Generate patterns and textures procedurally', category: 'advanced' },
        { id: '3dPainting', name: '3D Painting', icon: '🎨', description: 'Paint and sculpt in 3D space', category: 'advanced' }
      ]
    },
    {
      id: 'export',
      name: 'Export & Sync',
      icon: '📤',
      color: '#6366F1',
      tools: [
        { id: 'printExport', name: 'Export', icon: '📤', description: 'Export in multiple formats', category: 'export' },
        { id: 'cloudSync', name: 'Cloud Sync', icon: '☁️', description: 'Sync and collaborate in the cloud', category: 'export' }
      ]
    },
    {
      id: 'history',
      name: 'History & Undo',
      icon: '⏪',
      color: '#6B7280',
      tools: [
        { id: 'undo', name: 'Undo', icon: '⏪', description: 'Undo last action', category: 'history' },
        { id: 'redo', name: 'Redo', icon: '⏩', description: 'Redo last undone action', category: 'history' }
      ]
    }
  ];

  const toggleCategory = (categoryId: string) => {
    // Console log removed
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleToolSelect = (toolId: string) => {
    // Console log removed
    setTool(toolId as any);
  };

  if (!active) {
    // Console log removed
    return null;
  }

  // Performance optimization: Reduce console logging
  // console.log('🧭 Navigation: Rendering component', { 
  //   categoriesCount: toolCategories.length,
  //   expandedCategories: Array.from(expandedCategories),
  //   activeTool
  // });

  return (
    <div className="navigation" style={{
      width: '280px',
      height: '100vh',
      background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
      borderRight: '1px solid #374151',
      overflowY: 'auto',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div className="navigation-header" style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #374151'
      }}>
        <h2 style={{
          margin: 0,
          color: '#F9FAFB',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🎨 Closset Studio
        </h2>
        <p style={{
          margin: '4px 0 0 0',
          color: '#9CA3AF',
          fontSize: '14px'
        }}>
          Professional Design Tools
        </p>
      </div>

      <div className="tool-categories" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {toolCategories.map(category => (
          <div key={category.id} className="tool-category" style={{
            background: expandedCategories.has(category.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            borderRadius: '8px',
            border: expandedCategories.has(category.id) ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            overflow: 'hidden',
            transition: 'all 0.2s ease'
          }}>
            <button
              className="category-header"
              onClick={() => toggleCategory(category.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                color: '#F9FAFB',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{category.icon}</span>
                <span>{category.name}</span>
              </div>
              <span style={{
                fontSize: '12px',
                color: '#9CA3AF',
                transform: expandedCategories.has(category.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}>
                ▶
              </span>
            </button>

            {expandedCategories.has(category.id) && (
              <div className="category-tools" style={{
                padding: '0 16px 12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {category.tools.map(tool => (
                  <button
                    key={tool.id}
                    className={`tool-item ${activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => handleToolSelect(tool.id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: activeTool === tool.id ? category.color : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: activeTool === tool.id ? '#FFFFFF' : '#D1D5DB',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      opacity: activeTool === tool.id ? 1 : 0.8
                    }}
                    onMouseEnter={(e) => {
                      if (activeTool !== tool.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTool !== tool.id) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.opacity = '0.8';
                      }
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{tool.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{tool.name}</div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: activeTool === tool.id ? 'rgba(255, 255, 255, 0.8)' : '#9CA3AF',
                        marginTop: '2px'
                      }}>
                        {tool.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="navigation-footer" style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid #374151'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          textAlign: 'center'
        }}>
          Version 2.0.0 • Professional Edition
        </div>
      </div>
    </div>
  );
}

