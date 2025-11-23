/**
 * Advanced Brush Features Module
 * Provides professional-grade drawing capabilities including:
 * - Enhanced pressure sensitivity
 * - Velocity-based dynamics
 * - Pressure curve mapping
 * - Stroke stabilization
 * - Advanced brush dynamics
 */

import { BrushPoint, BrushSettings } from '../types/app';

export interface PressureCurve {
  type: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'sigmoid' | 'custom';
  customCurve?: (pressure: number) => number;
}

export interface VelocityTracker {
  points: Array<{ x: number; y: number; timestamp: number }>;
  maxHistory: number;
  currentVelocity: number;
}

/**
 * Apply pressure curve to raw pressure value
 */
export function applyPressureCurve(
  rawPressure: number,
  curve: PressureCurve['type'] = 'linear',
  customCurve?: (pressure: number) => number
): number {
  if (customCurve) {
    return customCurve(rawPressure);
  }

  switch (curve) {
    case 'linear':
      return rawPressure;
    
    case 'ease-in':
      return rawPressure * rawPressure;
    
    case 'ease-out':
      return 1 - (1 - rawPressure) * (1 - rawPressure);
    
    case 'ease-in-out':
      return rawPressure < 0.5
        ? 2 * rawPressure * rawPressure
        : 1 - Math.pow(-2 * rawPressure + 2, 2) / 2;
    
    case 'sigmoid':
      // Smooth S-curve for natural pressure response
      return 1 / (1 + Math.exp(-10 * (rawPressure - 0.5)));
    
    default:
      return rawPressure;
  }
}

/**
 * Calculate velocity from recent points
 */
export function calculateVelocity(
  tracker: VelocityTracker,
  currentX: number,
  currentY: number
): number {
  const now = Date.now();
  
  // Add current point
  tracker.points.push({ x: currentX, y: currentY, timestamp: now });
  
  // Keep only recent points
  if (tracker.points.length > tracker.maxHistory) {
    tracker.points.shift();
  }
  
  // Need at least 2 points to calculate velocity
  if (tracker.points.length < 2) {
    tracker.currentVelocity = 0;
    return 0;
  }
  
  // Calculate average velocity over recent points
  let totalDistance = 0;
  let totalTime = 0;
  
  for (let i = 1; i < tracker.points.length; i++) {
    const prev = tracker.points[i - 1];
    const curr = tracker.points[i];
    
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const time = curr.timestamp - prev.timestamp;
    
    if (time > 0) {
      totalDistance += distance;
      totalTime += time;
    }
  }
  
  // Velocity in pixels per millisecond, normalized
  const velocity = totalTime > 0 ? totalDistance / totalTime : 0;
  
  // Normalize to 0-1 range (assuming max velocity of 10 px/ms)
  tracker.currentVelocity = Math.min(1, velocity / 10);
  
  return tracker.currentVelocity;
}

/**
 * Simulate pressure from velocity (for mouse input)
 */
export function simulatePressureFromVelocity(
  velocity: number,
  minPressure: number = 0.3,
  maxPressure: number = 1.0
): number {
  // Inverse relationship: slower = more pressure
  // Fast strokes = light pressure, slow strokes = heavy pressure
  const pressure = minPressure + (1 - velocity) * (maxPressure - minPressure);
  return Math.max(minPressure, Math.min(maxPressure, pressure));
}

/**
 * Extract pressure from pointer event
 */
export function extractPressureFromEvent(event: any): number {
  // Try to get pressure from pointer event
  if (event?.pressure !== undefined && event.pressure > 0) {
    return Math.max(0, Math.min(1, event.pressure));
  }
  
  // Try native event
  if (event?.nativeEvent?.pressure !== undefined && event.nativeEvent.pressure > 0) {
    return Math.max(0, Math.min(1, event.nativeEvent.pressure));
  }
  
  // Check if it's a pen/stylus (pointerType === 'pen')
  if (event?.pointerType === 'pen' || event?.nativeEvent?.pointerType === 'pen') {
    // Pen devices should have pressure, but if not, default to 0.7
    return 0.7;
  }
  
  // For mouse/touch, return undefined (will use velocity simulation)
  return undefined as any;
}

/**
 * Extract tilt from pointer event
 */
export function extractTiltFromEvent(event: any): { tiltX: number; tiltY: number } {
  let tiltX = 0;
  let tiltY = 0;
  
  if (event?.tiltX !== undefined) {
    tiltX = event.tiltX;
  } else if (event?.nativeEvent?.tiltX !== undefined) {
    tiltX = event.nativeEvent.tiltX;
  }
  
  if (event?.tiltY !== undefined) {
    tiltY = event.tiltY;
  } else if (event?.nativeEvent?.tiltY !== undefined) {
    tiltY = event.nativeEvent.tiltY;
  }
  
  return { tiltX, tiltY };
}

/**
 * Enhanced brush dynamics calculation with advanced features
 */
export function calculateAdvancedBrushDynamics(
  point: BrushPoint,
  settings: BrushSettings,
  velocityTracker: VelocityTracker,
  index: number
): {
  size: number;
  opacity: number;
  angle: number;
  spacing: number;
  flow: number;
} {
  let size = settings.size;
  let opacity = settings.opacity;
  let angle = settings.angle;
  let spacing = settings.spacing;
  let flow = settings.flow || 1.0;
  
  // Get processed pressure
  let processedPressure = point.pressure;
  
  // Apply pressure curve if specified
  if (settings.pressureCurve) {
    processedPressure = applyPressureCurve(
      processedPressure,
      settings.pressureCurve,
      undefined // Custom curve would be passed separately
    );
  }
  
  // Apply pressure dynamics
  if (settings.dynamics.sizePressure && processedPressure !== undefined) {
    const pressureMap = settings.pressureMapSize || 1.0;
    size *= processedPressure * pressureMap;
  }
  
  if (settings.dynamics.opacityPressure && processedPressure !== undefined) {
    const pressureMap = settings.pressureMapOpacity || 1.0;
    opacity *= processedPressure * pressureMap;
  }
  
  if (settings.dynamics.anglePressure && processedPressure !== undefined) {
    // Pressure affects brush angle (for calligraphy/ink effects)
    angle += (processedPressure - 0.5) * 45;
  }
  
  // Apply velocity dynamics
  if (settings.dynamics.velocitySize && point.velocity > 0) {
    // Faster strokes = thinner lines
    const velocityFactor = Math.max(0.1, 1 - point.velocity * 0.5);
    size *= velocityFactor;
  }
  
  if (settings.dynamics.velocityOpacity && point.velocity > 0) {
    // Faster strokes = lighter opacity
    const velocityFactor = Math.max(0.2, 1 - point.velocity * 0.3);
    opacity *= velocityFactor;
  }
  
  // Apply tilt dynamics (for stylus)
  if (point.tiltX !== 0 || point.tiltY !== 0) {
    // Tilt affects brush shape (oval becomes more elongated)
    const tiltAngle = Math.atan2(point.tiltY, point.tiltX);
    const tiltAmount = Math.sqrt(point.tiltX * point.tiltX + point.tiltY * point.tiltY) / 90; // Normalize to 0-1
    
    // Adjust angle based on tilt
    angle = tiltAngle * (180 / Math.PI);
    
    // Adjust roundness based on tilt (more tilt = more oval)
    // This would affect the brush stamp shape
  }
  
  // Apply spacing dynamics
  if (settings.dynamics.spacingPressure && processedPressure !== undefined) {
    // Higher pressure = tighter spacing
    spacing *= (0.5 + processedPressure * 0.5);
  }
  
  // Ensure reasonable bounds
  size = Math.max(0.5, Math.min(size, 500));
  opacity = Math.max(0, Math.min(opacity, 1));
  spacing = Math.max(0.01, Math.min(spacing, 1));
  flow = Math.max(0, Math.min(flow, 1));
  angle = angle % 360;
  
  return { size, opacity, angle, spacing, flow };
}

/**
 * Create velocity tracker instance
 */
export function createVelocityTracker(maxHistory: number = 10): VelocityTracker {
  return {
    points: [],
    maxHistory,
    currentVelocity: 0
  };
}

/**
 * Enhanced brush point creation with all advanced features
 */
export function createEnhancedBrushPoint(
  event: any,
  canvasX: number,
  canvasY: number,
  velocityTracker: VelocityTracker,
  previousPoint?: BrushPoint
): BrushPoint {
  // Extract pressure
  let pressure = extractPressureFromEvent(event);
  
  // If no pressure and velocity simulation is enabled, use velocity
  if (pressure === undefined) {
    const velocity = calculateVelocity(velocityTracker, canvasX, canvasY);
    pressure = simulatePressureFromVelocity(velocity);
  }
  
  // Extract tilt
  const { tiltX, tiltY } = extractTiltFromEvent(event);
  
  // Calculate velocity
  const velocity = calculateVelocity(velocityTracker, canvasX, canvasY);
  
  // Calculate distance from previous point
  let distance = 0;
  if (previousPoint) {
    const dx = canvasX - previousPoint.x;
    const dy = canvasY - previousPoint.y;
    distance = Math.sqrt(dx * dx + dy * dy);
  }
  
  return {
    x: canvasX,
    y: canvasY,
    pressure: pressure || 1.0,
    tiltX,
    tiltY,
    velocity,
    timestamp: Date.now(),
    distance,
    uv: event.uv,
    worldPosition: event.point
  };
}

