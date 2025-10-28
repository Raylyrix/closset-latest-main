// Advanced Vector Tool Manager
// Handles all vector tool operations, rendering, and state management
import { renderStitchType } from './stitchRendering';
export class VectorToolManager {
    constructor() {
        this.toolConfigs = new Map();
        this.renderCache = new Map();
        this.performanceMetrics = new Map();
        this.initializeToolConfigs();
    }
    static getInstance() {
        if (!VectorToolManager.instance) {
            VectorToolManager.instance = new VectorToolManager();
        }
        return VectorToolManager.instance;
    }
    initializeToolConfigs() {
        const configs = [
            // Drawing Tools
            {
                id: 'pen',
                name: 'Pen Tool',
                category: 'drawing',
                icon: '✏️',
                description: 'Draw vector paths with precision',
                hotkey: 'P',
                requiresPath: true
            },
            {
                id: 'curvature',
                name: 'Curvature Tool',
                category: 'drawing',
                icon: '🌊',
                description: 'Create smooth curves by dragging',
                hotkey: 'C',
                requiresPath: true
            },
            // Selection Tools
            {
                id: 'pathSelection',
                name: 'Select Tool',
                category: 'selection',
                icon: '↖️',
                description: 'Select and move paths',
                hotkey: 'V',
                requiresSelection: true
            },
            {
                id: 'marqueeRect',
                name: 'Rectangular Marquee',
                category: 'selection',
                icon: '⬜',
                description: 'Rectangular selection',
                hotkey: 'M'
            },
            {
                id: 'marqueeEllipse',
                name: 'Elliptical Marquee',
                category: 'selection',
                icon: '⭕',
                description: 'Elliptical selection',
                hotkey: 'E'
            },
            {
                id: 'lasso',
                name: 'Lasso Tool',
                category: 'selection',
                icon: '🪃',
                description: 'Freehand selection',
                hotkey: 'L'
            },
            // Editing Tools
            {
                id: 'addAnchor',
                name: 'Add Anchor',
                category: 'editing',
                icon: '➕',
                description: 'Add anchor points',
                hotkey: 'A'
            },
            {
                id: 'removeAnchor',
                name: 'Remove Anchor',
                category: 'editing',
                icon: '➖',
                description: 'Remove anchor points',
                hotkey: 'R'
            },
            {
                id: 'convertAnchor',
                name: 'Convert Anchor',
                category: 'editing',
                icon: '🔄',
                description: 'Convert anchor point types',
                hotkey: 'T'
            },
            // Transform Tools
            {
                id: 'transform',
                name: 'Transform',
                category: 'transform',
                icon: '🔄',
                description: 'Transform objects',
                hotkey: 'Ctrl+T'
            },
            {
                id: 'scale',
                name: 'Scale',
                category: 'transform',
                icon: '📏',
                description: 'Scale objects',
                hotkey: 'S'
            },
            {
                id: 'rotate',
                name: 'Rotate',
                category: 'transform',
                icon: '🔄',
                description: 'Rotate objects',
                hotkey: 'O'
            }
        ];
        configs.forEach(config => {
            this.toolConfigs.set(config.id, config);
        });
    }
    getToolConfig(toolId) {
        return this.toolConfigs.get(toolId);
    }
    getAllToolConfigs() {
        return Array.from(this.toolConfigs.values());
    }
    getToolsByCategory(category) {
        return Array.from(this.toolConfigs.values()).filter(tool => tool.category === category);
    }
    // Advanced rendering with caching and performance optimization
    renderVectorPath(context, path, tool, options = {}) {
        const startTime = performance.now();
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(path, tool, options);
            if (this.renderCache.has(cacheKey)) {
                const cached = this.renderCache.get(cacheKey);
                this.applyCachedRender(context, cached);
                return;
            }
            // Render based on tool type
            switch (tool) {
                case 'embroidery':
                    this.renderEmbroideryPath(context, path, options);
                    break;
                case 'brush':
                    this.renderBrushPath(context, path, options);
                    break;
                case 'puffPrint':
                    this.renderPuffPath(context, path, options);
                    break;
                case 'print':
                    this.renderPrintPath(context, path, options);
                    break;
                default:
                    this.renderDefaultPath(context, path, options);
            }
            // Cache the result
            this.cacheRender(cacheKey, path, tool, options);
        }
        catch (error) {
            console.error('Error rendering vector path:', error);
            this.renderFallbackPath(context, path, options);
        }
        finally {
            // Track performance
            const endTime = performance.now();
            this.trackPerformance(tool, endTime - startTime);
        }
    }
    renderEmbroideryPath(context, path, options) {
        const { ctx, appState } = context;
        // Get embroidery settings
        const stitchType = appState.embroideryStitchType || 'satin';
        const stitchColor = appState.embroideryColor || '#ff69b4';
        const stitchThickness = appState.embroideryThickness || 3;
        const stitchOpacity = appState.embroideryOpacity || 1.0;
        // Create stitch configuration
        const stitchConfig = {
            type: stitchType,
            color: stitchColor,
            thickness: stitchThickness,
            opacity: stitchOpacity
        };
        // Convert path points to stitch points
        const stitchPoints = path.points.map(point => ({
            x: point.x,
            y: point.y,
            u: point.x / context.canvas.width,
            v: point.y / context.canvas.height
        }));
        // Render the stitch
        renderStitchType(ctx, stitchPoints, stitchConfig);
    }
    renderBrushPath(context, path, options) {
        const { ctx, appState } = context;
        ctx.lineWidth = appState.brushSize || 5;
        ctx.strokeStyle = appState.brushColor || '#000';
        ctx.globalAlpha = appState.brushOpacity || 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        this.drawPath(ctx, path);
    }
    renderPuffPath(context, path, options) {
        // Puff tool - delegated to UnifiedPuffPrintSystem
        console.log('🎈 Vector puff tool delegated to UnifiedPuffPrintSystem');
    }
    renderPrintPath(context, path, options) {
        const { ctx, appState } = context;
        ctx.lineWidth = Math.max(1, (appState.brushSize || 5) * 0.8);
        ctx.strokeStyle = appState.brushColor || '#000';
        ctx.globalAlpha = appState.brushOpacity || 1.0;
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'square';
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        this.drawPath(ctx, path);
    }
    renderDefaultPath(context, path, options) {
        const { ctx, appState } = context;
        ctx.lineWidth = appState.brushSize || 5;
        ctx.strokeStyle = appState.brushColor || '#000';
        ctx.globalAlpha = appState.brushOpacity || 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        this.drawPath(ctx, path);
    }
    drawPath(ctx, path) {
        ctx.beginPath();
        if (path.points.length === 0)
            return;
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
            const point = path.points[i];
            if (point.type === 'smooth' && point.controlOut) {
                const nextPoint = path.points[i + 1];
                if (nextPoint && nextPoint.controlIn) {
                    ctx.bezierCurveTo(point.x + point.controlOut.x, point.y + point.controlOut.y, nextPoint.x + nextPoint.controlIn.x, nextPoint.y + nextPoint.controlIn.y, nextPoint.x, nextPoint.y);
                    i++; // Skip next point as it's handled by bezier curve
                }
                else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            else {
                ctx.lineTo(point.x, point.y);
            }
        }
        if (path.closed) {
            ctx.closePath();
        }
        ctx.stroke();
    }
    renderFallbackPath(context, path, options) {
        const { ctx } = context;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        this.drawPath(ctx, path);
    }
    generateCacheKey(path, tool, options) {
        return `${path.id}_${tool}_${JSON.stringify(options)}`;
    }
    applyCachedRender(context, cached) {
        // Apply cached rendering data
        // This would be implemented based on the specific caching strategy
    }
    cacheRender(key, path, tool, options) {
        // Cache the rendering result for future use
        this.renderCache.set(key, { path, tool, options });
        // Limit cache size
        if (this.renderCache.size > 100) {
            const firstKey = this.renderCache.keys().next().value;
            if (typeof firstKey === 'string') {
                this.renderCache.delete(firstKey);
            }
        }
    }
    trackPerformance(tool, duration) {
        if (!this.performanceMetrics.has(tool)) {
            this.performanceMetrics.set(tool, []);
        }
        const metrics = this.performanceMetrics.get(tool);
        metrics.push(duration);
        // Keep only last 100 measurements
        if (metrics.length > 100) {
            metrics.shift();
        }
    }
    getPerformanceMetrics(tool) {
        if (tool) {
            return this.performanceMetrics.get(tool) || [];
        }
        return this.performanceMetrics;
    }
    clearCache() {
        this.renderCache.clear();
    }
    clearPerformanceMetrics() {
        this.performanceMetrics.clear();
    }
    // AI/ML features for vector tools
    analyzePathComplexity(path) {
        let complexity = 0;
        // Count different point types
        const pointTypes = new Set(path.points.map(p => p.type));
        complexity += pointTypes.size * 10;
        // Count control points
        const controlPoints = path.points.filter(p => p.controlIn || p.controlOut).length;
        complexity += controlPoints * 5;
        // Path length factor
        const pathLength = this.calculatePathLength(path);
        complexity += pathLength * 0.1;
        return Math.round(complexity);
    }
    calculatePathLength(path) {
        let length = 0;
        for (let i = 0; i < path.points.length - 1; i++) {
            const p1 = path.points[i];
            const p2 = path.points[i + 1];
            length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        }
        return length;
    }
    suggestPathOptimization(path) {
        const suggestions = [];
        // Check for too many points
        if (path.points.length > 50) {
            suggestions.push('Consider simplifying this path - it has many points');
        }
        // Check for very short segments
        for (let i = 0; i < path.points.length - 1; i++) {
            const p1 = path.points[i];
            const p2 = path.points[i + 1];
            const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            if (distance < 1) {
                suggestions.push('Very short path segments detected - consider removing redundant points');
                break;
            }
        }
        // Check for sharp angles
        for (let i = 1; i < path.points.length - 1; i++) {
            const p1 = path.points[i - 1];
            const p2 = path.points[i];
            const p3 = path.points[i + 1];
            const angle = this.calculateAngle(p1, p2, p3);
            if (angle < 30) {
                suggestions.push('Sharp angles detected - consider smoothing the path');
                break;
            }
        }
        return suggestions;
    }
    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        return (angle * 180) / Math.PI;
    }
}
export const vectorToolManager = VectorToolManager.getInstance();
