import { TextElement } from '../core/AdvancedLayerSystemV2';

export interface TextPath {
  id: string;
  name: string;
  type: 'line' | 'curve' | 'circle' | 'arc' | 'bezier' | 'polygon';
  points: { x: number; y: number }[];
  closed?: boolean;
  // For curves and arcs
  controlPoints?: { x: number; y: number }[];
  radius?: number; // For circles and arcs
  startAngle?: number; // For arcs
  endAngle?: number; // For arcs
  // Path properties
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  visible?: boolean;
  // Text alignment along path
  textAlign?: 'start' | 'center' | 'end';
  textSpacing?: number; // Spacing between characters along path
  textOffset?: number; // Offset along the path
}

export interface PathPoint {
  x: number;
  y: number;
  angle: number; // Tangent angle at this point
  distance: number; // Distance from start of path
}

/**
 * TextPathManager - Manages text paths and text-on-path functionality
 */
export class TextPathManager {
  private static paths: Map<string, TextPath> = new Map();
  private static pathPointsCache: Map<string, PathPoint[]> = new Map();

  /**
   * Creates a new text path
   */
  static createPath(path: TextPath): string {
    this.paths.set(path.id, path);
    this.calculatePathPoints(path.id);
    return path.id;
  }

  /**
   * Gets a text path by ID
   */
  static getPath(pathId: string): TextPath | undefined {
    return this.paths.get(pathId);
  }

  /**
   * Gets all available text paths
   */
  static getAllPaths(): TextPath[] {
    return Array.from(this.paths.values());
  }

  /**
   * Updates a text path
   */
  static updatePath(pathId: string, updates: Partial<TextPath>): boolean {
    const path = this.paths.get(pathId);
    if (!path) return false;

    const updatedPath = { ...path, ...updates };
    this.paths.set(pathId, updatedPath);
    this.calculatePathPoints(pathId);
    return true;
  }

  /**
   * Deletes a text path
   */
  static deletePath(pathId: string): boolean {
    const deleted = this.paths.delete(pathId);
    this.pathPointsCache.delete(pathId);
    return deleted;
  }

  /**
   * Creates a simple line path
   */
  static createLinePath(id: string, startX: number, startY: number, endX: number, endY: number, name?: string): string {
    const path: TextPath = {
      id,
      name: name || `Line ${id}`,
      type: 'line',
      points: [{ x: startX, y: startY }, { x: endX, y: endY }],
      closed: false,
      visible: true
    };
    return this.createPath(path);
  }

  /**
   * Creates a circle path
   */
  static createCirclePath(id: string, centerX: number, centerY: number, radius: number, name?: string): string {
    const path: TextPath = {
      id,
      name: name || `Circle ${id}`,
      type: 'circle',
      points: [{ x: centerX, y: centerY }],
      closed: true,
      radius,
      visible: true
    };
    return this.createPath(path);
  }

  /**
   * Creates a curved path (quadratic bezier)
   */
  static createCurvePath(id: string, startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number, name?: string): string {
    const path: TextPath = {
      id,
      name: name || `Curve ${id}`,
      type: 'curve',
      points: [{ x: startX, y: startY }, { x: endX, y: endY }],
      controlPoints: [{ x: controlX, y: controlY }],
      closed: false,
      visible: true
    };
    return this.createPath(path);
  }

  /**
   * Creates an arc path
   */
  static createArcPath(id: string, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, name?: string): string {
    const path: TextPath = {
      id,
      name: name || `Arc ${id}`,
      type: 'arc',
      points: [{ x: centerX, y: centerY }],
      closed: false,
      radius,
      startAngle,
      endAngle,
      visible: true
    };
    return this.createPath(path);
  }

  /**
   * Calculates points along a path for text positioning
   */
  private static calculatePathPoints(pathId: string): void {
    const path = this.paths.get(pathId);
    if (!path) return;

    const points: PathPoint[] = [];
    const segments = 100; // Number of segments to divide the path into

    switch (path.type) {
      case 'line':
        this.calculateLinePoints(path, points, segments);
        break;
      case 'circle':
        this.calculateCirclePoints(path, points, segments);
        break;
      case 'curve':
        this.calculateCurvePoints(path, points, segments);
        break;
      case 'arc':
        this.calculateArcPoints(path, points, segments);
        break;
      case 'polygon':
        this.calculatePolygonPoints(path, points, segments);
        break;
    }

    this.pathPointsCache.set(pathId, points);
  }

  /**
   * Calculates points for a line path
   */
  private static calculateLinePoints(path: TextPath, points: PathPoint[], segments: number): void {
    const start = path.points[0];
    const end = path.points[1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start.x + dx * t;
      const y = start.y + dy * t;
      const distance = length * t;

      points.push({ x, y, angle, distance });
    }
  }

  /**
   * Calculates points for a circle path
   */
  private static calculateCirclePoints(path: TextPath, points: PathPoint[], segments: number): void {
    const center = path.points[0];
    const radius = path.radius || 50;
    const circumference = 2 * Math.PI * radius;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      const distance = circumference * (i / segments);

      points.push({ x, y, angle: angle + Math.PI / 2, distance });
    }
  }

  /**
   * Calculates points for a curve path (quadratic bezier)
   */
  private static calculateCurvePoints(path: TextPath, points: PathPoint[], segments: number): void {
    const start = path.points[0];
    const end = path.points[1];
    const control = path.controlPoints?.[0];
    if (!control) return;

    let totalDistance = 0;
    const prevPoint = { x: start.x, y: start.y };

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x;
      const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y;

      // Calculate distance
      const dx = x - prevPoint.x;
      const dy = y - prevPoint.y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);

      // Calculate tangent angle
      const tangentX = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
      const tangentY = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
      const angle = Math.atan2(tangentY, tangentX);

      points.push({ x, y, angle, distance: totalDistance });
      prevPoint.x = x;
      prevPoint.y = y;
    }
  }

  /**
   * Calculates points for an arc path
   */
  private static calculateArcPoints(path: TextPath, points: PathPoint[], segments: number): void {
    const center = path.points[0];
    const radius = path.radius || 50;
    const startAngle = path.startAngle || 0;
    const endAngle = path.endAngle || Math.PI;
    const angleRange = endAngle - startAngle;
    const arcLength = radius * Math.abs(angleRange);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + angleRange * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      const distance = arcLength * t;

      points.push({ x, y, angle: angle + Math.PI / 2, distance });
    }
  }

  /**
   * Calculates points for a polygon path
   */
  private static calculatePolygonPoints(path: TextPath, points: PathPoint[], segments: number): void {
    if (path.points.length < 2) return;

    let totalDistance = 0;
    const prevPoint = { x: path.points[0].x, y: path.points[0].y };

    for (let i = 0; i < path.points.length; i++) {
      const current = path.points[i];
      const next = path.points[(i + 1) % path.points.length];

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const segmentPoints = Math.ceil((segmentLength / 10) * segments); // More points for longer segments
      for (let j = 0; j <= segmentPoints; j++) {
        const t = j / segmentPoints;
        const x = current.x + dx * t;
        const y = current.y + dy * t;
        const distance = totalDistance + segmentLength * t;

        points.push({ x, y, angle, distance });
      }

      totalDistance += segmentLength;
    }
  }

  /**
   * Gets the position and angle for text at a specific offset along a path
   */
  static getTextPositionOnPath(pathId: string, offset: number): { x: number; y: number; angle: number } | null {
    const pathPoints = this.pathPointsCache.get(pathId);
    if (!pathPoints || pathPoints.length === 0) return null;

    const path = this.paths.get(pathId);
    if (!path) return null;

    // Find the closest point to the offset
    let closestPoint = pathPoints[0];
    let minDistance = Math.abs(pathPoints[0].distance - offset);

    for (const point of pathPoints) {
      const distance = Math.abs(point.distance - offset);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    return {
      x: closestPoint.x,
      y: closestPoint.y,
      angle: closestPoint.angle
    };
  }

  /**
   * Renders a path on a canvas context
   */
  static renderPath(ctx: CanvasRenderingContext2D, pathId: string, options?: {
    strokeWidth?: number;
    strokeColor?: string;
    fillColor?: string;
    showPoints?: boolean;
  }): void {
    const path = this.paths.get(pathId);
    if (!path || !path.visible) return;

    const pathPoints = this.pathPointsCache.get(pathId);
    if (!pathPoints || pathPoints.length === 0) return;

    ctx.save();

    // Set path styling
    if (options?.strokeColor) {
      ctx.strokeStyle = options.strokeColor;
    } else if (path.strokeColor) {
      ctx.strokeStyle = path.strokeColor;
    } else {
      ctx.strokeStyle = '#00ff00'; // Default green for visibility
    }

    if (options?.strokeWidth) {
      ctx.lineWidth = options.strokeWidth;
    } else if (path.strokeWidth) {
      ctx.lineWidth = path.strokeWidth;
    } else {
      ctx.lineWidth = 2;
    }

    // Draw the path
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);

    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }

    if (path.closed) {
      ctx.closePath();
    }

    ctx.stroke();

    // Fill if specified
    if (options?.fillColor || path.fillColor) {
      ctx.fillStyle = options?.fillColor || path.fillColor || 'rgba(0, 255, 0, 0.1)';
      ctx.fill();
    }

    // Show control points if requested
    if (options?.showPoints && path.controlPoints) {
      ctx.fillStyle = '#ff0000';
      for (const point of path.controlPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Calculates the total length of a path
   */
  static getPathLength(pathId: string): number {
    const pathPoints = this.pathPointsCache.get(pathId);
    if (!pathPoints || pathPoints.length === 0) return 0;

    return pathPoints[pathPoints.length - 1].distance;
  }

  /**
   * Gets all path points for a given path
   */
  static getPathPoints(pathId: string): PathPoint[] {
    return this.pathPointsCache.get(pathId) || [];
  }
}
