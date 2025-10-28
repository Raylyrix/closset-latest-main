/**
 * 🎯 Unified Tool System
 * 
 * Combines brush and vector tools into a single, cohesive system
 * Provides a unified interface for all drawing tools
 */

import { BrushSettings, BrushPoint } from '../types/app';
import { ProfessionalToolSet, ToolDefinition, ToolConfig } from '../vector/ProfessionalToolSet';

// Unified tool interfaces
export interface UnifiedToolSettings extends BrushSettings {
  // Vector-specific settings
  precision?: number;
  pressureSensitive?: boolean;
  smoothing?: number;
  cornerRadius?: number;
  sides?: number;
  points?: number;
  innerRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  pathOffset?: number;
  tolerance?: number;
  contiguous?: boolean;
  feather?: number;
}

export interface UnifiedToolPoint extends BrushPoint {
  // Vector-specific properties
  inHandle?: { x: number; y: number } | null;
  outHandle?: { x: number; y: number } | null;
  type?: 'corner' | 'smooth' | 'symmetric' | 'auto';
}

export interface UnifiedTool {
  id: string;
  name: string;
  category: 'brush' | 'vector' | 'selection' | 'shape' | 'text' | 'effect' | '3d' | 'fashion';
  type: 'brush' | 'vector' | 'hybrid';
  icon: string;
  shortcut: string;
  description: string;
  settings: UnifiedToolSettings;
  configurable: boolean;
  pressureSensitive: boolean;
  precision: number;
}

export interface UnifiedToolState {
  activeTool: string | null;
  toolSettings: Map<string, UnifiedToolSettings>;
  isDrawing: boolean;
  currentStroke: UnifiedToolPoint[];
  currentPath: any; // Vector path if applicable
}

/**
 * Unified Tool System Class
 * Manages both brush and vector tools through a single interface
 */
export class UnifiedToolSystem {
  private static instance: UnifiedToolSystem;
  private brushEngine: any; // Will be injected
  private vectorToolSet: ProfessionalToolSet;
  private state: UnifiedToolState;
  private tools: Map<string, UnifiedTool>;

  constructor() {
    this.vectorToolSet = ProfessionalToolSet.getInstance();
    this.state = {
      activeTool: null,
      toolSettings: new Map(),
      isDrawing: false,
      currentStroke: [],
      currentPath: null
    };
    this.tools = new Map();
    this.initializeUnifiedTools();
  }

  static getInstance(): UnifiedToolSystem {
    if (!UnifiedToolSystem.instance) {
      UnifiedToolSystem.instance = new UnifiedToolSystem();
    }
    return UnifiedToolSystem.instance;
  }

  /**
   * Inject the brush engine dependency
   */
  setBrushEngine(brushEngine: any): void {
    this.brushEngine = brushEngine;
  }

  /**
   * Initialize unified tools by combining brush and vector tools
   */
  private initializeUnifiedTools(): void {
    // Add brush tools
    this.addBrushTool('brush', 'Brush Tool', 'brush', '🖌️', 'B', 'Paint with pressure-sensitive brush strokes');
    this.addBrushTool('airbrush', 'Airbrush Tool', 'brush', '💨', 'A', 'Spray paint with soft, diffused edges');
    this.addBrushTool('pencil', 'Pencil Tool', 'brush', '✏️', 'N', 'Draw freehand with pencil texture');
    this.addBrushTool('marker', 'Marker Tool', 'brush', '🖍️', 'M', 'Draw with marker-like strokes');
    this.addBrushTool('watercolor', 'Watercolor Tool', 'brush', '🎨', 'W', 'Paint with watercolor effects');

    // Add vector tools
    this.addVectorTool('pen', 'Pen Tool', 'vector', '✏️', 'P', 'Draw precise vector paths with anchor points');
    this.addVectorTool('rectangle', 'Rectangle Tool', 'shape', '⬜', 'R', 'Draw rectangles and squares');
    this.addVectorTool('ellipse', 'Ellipse Tool', 'shape', '⭕', 'E', 'Draw ellipses and circles');
    this.addVectorTool('polygon', 'Polygon Tool', 'shape', '⬟', 'G', 'Draw polygons with configurable sides');
    this.addVectorTool('star', 'Star Tool', 'shape', '⭐', 'S', 'Draw stars with configurable points');

    // Add selection tools
    this.addVectorTool('select', 'Select Tool', 'selection', '↖️', 'V', 'Select and move objects');
    this.addVectorTool('lasso', 'Lasso Tool', 'selection', '🪃', 'L', 'Draw freehand selection areas');
    this.addVectorTool('magic_wand', 'Magic Wand', 'selection', '🪄', 'W', 'Select areas of similar color');

    // Add text tools
    this.addVectorTool('text', 'Text Tool', 'text', '📝', 'T', 'Add text to the design');
    this.addVectorTool('text_path', 'Text on Path', 'text', '📝', 'Shift+T', 'Add text along a path');
  }

  /**
   * Add a brush tool to the unified system
   */
  private addBrushTool(
    id: string,
    name: string,
    category: UnifiedTool['category'],
    icon: string,
    shortcut: string,
    description: string
  ): void {
    const tool: UnifiedTool = {
      id,
      name,
      category,
      type: 'brush',
      icon,
      shortcut,
      description,
      settings: {
        size: 10,
        opacity: 1.0,
        hardness: 0.5,
        flow: 0.8,
        spacing: 0.3,
        angle: 0,
        roundness: 1.0,
        color: '#000000',
        blendMode: ('source-over' as any) as GlobalCompositeOperation,
        shape: 'round',
        pressureSensitive: true,
        precision: 1.0,
        dynamics: {
          sizePressure: true,
          opacityPressure: true,
          anglePressure: false,
          spacingPressure: false,
          velocitySize: false,
          velocityOpacity: false
        },
        texture: {
          enabled: false,
          pattern: null,
          scale: 1,
          rotation: 0,
          opacity: 1,
          blendMode: 'source-over'
        }
      },
      configurable: true,
      pressureSensitive: true,
      precision: 1.0
    };

    this.tools.set(id, tool);
    this.state.toolSettings.set(id, { ...tool.settings });
  }

  /**
   * Add a vector tool to the unified system
   */
  private addVectorTool(
    id: string,
    name: string,
    category: UnifiedTool['category'],
    icon: string,
    shortcut: string,
    description: string
  ): void {
    const vectorTool = this.vectorToolSet.getTool(id);
    if (!vectorTool) return;

    const tool: UnifiedTool = {
      id,
      name,
      category,
      type: 'vector',
      icon,
      shortcut,
      description,
      settings: (() => {
        const blendMode: GlobalCompositeOperation = 'source-over' as GlobalCompositeOperation;
        const textureBlendMode: GlobalCompositeOperation = 'source-over' as GlobalCompositeOperation;
        const { size, opacity, hardness, flow, spacing, angle, roundness, color, blendMode: configBlendMode, ...otherConfig } = vectorTool.config;
        return {
          size: size || 2,
          opacity: opacity || 1.0,
          hardness: hardness || 1.0,
          flow: flow || 1.0,
          spacing: spacing || 1.0,
          angle: angle || 0,
          roundness: roundness || 1.0,
          color: color || '#000000',
          blendMode: configBlendMode || blendMode,
          shape: 'round',
          precision: vectorTool.precision,
          pressureSensitive: vectorTool.pressureSensitive,
          dynamics: {
            sizePressure: false,
            opacityPressure: false,
            anglePressure: false,
            spacingPressure: false,
            velocitySize: false,
            velocityOpacity: false
          },
          texture: {
            enabled: false,
            pattern: null,
            scale: 1.0,
            rotation: 0,
            opacity: 1.0,
            blendMode: textureBlendMode
          },
          ...otherConfig // Include other vector-specific settings
        } as UnifiedToolSettings;
      })(),
      configurable: vectorTool.configurable,
      pressureSensitive: vectorTool.pressureSensitive,
      precision: vectorTool.precision
    };

    this.tools.set(id, tool);
    this.state.toolSettings.set(id, { ...tool.settings });
  }

  /**
   * Get all available tools
   */
  getAllTools(): UnifiedTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: UnifiedTool['category']): UnifiedTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Get a specific tool
   */
  getTool(toolId: string): UnifiedTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Set the active tool
   */
  setActiveTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    this.state.activeTool = toolId;
    
    // Update brush engine if it's a brush tool
    if (tool.type === 'brush' && this.brushEngine) {
      // Convert unified settings to brush settings
      const brushSettings: BrushSettings = {
        size: tool.settings.size,
        opacity: tool.settings.opacity,
        hardness: tool.settings.hardness,
        flow: tool.settings.flow,
        spacing: tool.settings.spacing,
        angle: tool.settings.angle,
        roundness: tool.settings.roundness,
        color: tool.settings.color,
        blendMode: tool.settings.blendMode,
        shape: tool.settings.shape,
        dynamics: {
          sizePressure: tool.settings.pressureSensitive || false,
          opacityPressure: tool.settings.pressureSensitive || false,
          anglePressure: false,
          spacingPressure: false,
          velocitySize: false,
          velocityOpacity: false
        },
        texture: {
          enabled: false,
          pattern: null,
          scale: 1,
          rotation: 0,
          opacity: 1,
          blendMode: 'source-over'
        }
      };
      
      // Apply brush settings (this would need to be implemented in brush engine)
      // this.brushEngine.updateBrushSettings(brushSettings);
    }

    // Update vector tool set if it's a vector tool
    if (tool.type === 'vector') {
      this.vectorToolSet.setActiveTool(toolId);
    }

    return true;
  }

  /**
   * Get the active tool
   */
  getActiveTool(): UnifiedTool | undefined {
    if (!this.state.activeTool) return undefined;
    return this.tools.get(this.state.activeTool);
  }

  /**
   * Update tool settings
   */
  updateToolSettings(toolId: string, settings: Partial<UnifiedToolSettings>): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    const currentSettings = this.state.toolSettings.get(toolId) || tool.settings;
    const updatedSettings = { ...currentSettings, ...settings };
    
    this.state.toolSettings.set(toolId, updatedSettings);
    
    // Update the tool definition
    tool.settings = updatedSettings;

    return true;
  }

  /**
   * Get tool settings
   */
  getToolSettings(toolId: string): UnifiedToolSettings | undefined {
    return this.state.toolSettings.get(toolId);
  }

  /**
   * Start drawing with the active tool
   */
  startDrawing(point: UnifiedToolPoint): boolean {
    const activeTool = this.getActiveTool();
    if (!activeTool) return false;

    this.state.isDrawing = true;
    this.state.currentStroke = [point];

    if (activeTool.type === 'brush' && this.brushEngine) {
      // Start brush stroke
      // this.brushEngine.startStroke(point);
    } else if (activeTool.type === 'vector') {
      // Start vector path
      // this.state.currentPath = this.brushEngine.createVectorPath(activeTool.id, point);
    }

    return true;
  }

  /**
   * Add point to current drawing
   */
  addPoint(point: UnifiedToolPoint): boolean {
    if (!this.state.isDrawing) return false;

    this.state.currentStroke.push(point);

    const activeTool = this.getActiveTool();
    if (!activeTool) return false;

    if (activeTool.type === 'brush' && this.brushEngine) {
      // Add to brush stroke
      // this.brushEngine.addToStroke(point);
    } else if (activeTool.type === 'vector' && this.state.currentPath) {
      // Add to vector path
      // this.brushEngine.addPointToVectorPath(this.state.currentPath.id, point);
    }

    return true;
  }

  /**
   * End current drawing
   */
  endDrawing(): boolean {
    if (!this.state.isDrawing) return false;

    const activeTool = this.getActiveTool();
    if (!activeTool) return false;

    if (activeTool.type === 'brush' && this.brushEngine) {
      // End brush stroke
      // this.brushEngine.endStroke();
    } else if (activeTool.type === 'vector' && this.state.currentPath) {
      // Close vector path
      // this.brushEngine.closeVectorPath(this.state.currentPath.id);
    }

    this.state.isDrawing = false;
    this.state.currentStroke = [];
    this.state.currentPath = null;

    return true;
  }

  /**
   * Get current tool state
   */
  getToolState(): UnifiedToolState {
    return { ...this.state };
  }

  /**
   * Reset tool system
   */
  reset(): void {
    this.state = {
      activeTool: null,
      toolSettings: new Map(),
      isDrawing: false,
      currentStroke: [],
      currentPath: null
    };
  }
}

export default UnifiedToolSystem;
