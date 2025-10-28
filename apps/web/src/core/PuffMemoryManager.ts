/**
 * 🧠 PUFF MEMORY MANAGER
 * 
 * Advanced memory management system for puff print operations:
 * - Canvas context pooling
 * - Automatic cleanup scheduling
 * - Memory usage monitoring
 * - Resource optimization
 * - Leak prevention
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CanvasPool {
  canvases: HTMLCanvasElement[];
  contexts: CanvasRenderingContext2D[];
  inUse: Set<HTMLCanvasElement>;
  maxSize: number;
}

export interface MemoryStats {
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  canvasCount: number;
  contextCount: number;
  poolUtilization: number;
}

export interface CleanupTask {
  id: string;
  resource: any;
  cleanupFunction: () => void;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledTime: number;
}

// ============================================================================
// MEMORY MANAGER CLASS
// ============================================================================

export class PuffMemoryManager {
  private canvasPools: Map<string, CanvasPool> = new Map();
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private memoryThreshold: number = 0.8; // 80% memory usage threshold
  private maxCanvasSize: number = 2048;
  private cleanupInterval: number = 5000; // 5 seconds
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private memoryHistory: number[] = [];
  private maxHistoryLength: number = 100;
  private lastCleanupTime: number = 0;
  
  constructor() {
    this.initializeCanvasPools();
    this.startCleanupScheduler();
    
    console.log('🧠 PuffMemoryManager initialized');
  }
  
  // Initialize canvas pools for different sizes
  private initializeCanvasPools(): void {
    const sizes = [256, 512, 1024, 2048];
    
    sizes.forEach(size => {
      this.canvasPools.set(size.toString(), {
        canvases: [],
        contexts: [],
        inUse: new Set(),
        maxSize: 10 // Maximum canvases per pool
      });
    });
  }
  
  // Start cleanup scheduler
  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(() => {
      this.performScheduledCleanup();
    }, this.cleanupInterval);
  }
  
  // Create a canvas with optimal settings
  public createCanvas(width: number, height: number, options?: CanvasRenderingContext2DSettings): HTMLCanvasElement {
    const size = Math.max(width, height);
    const poolKey = this.getPoolKey(size);
    const pool = this.canvasPools.get(poolKey);
    
    if (!pool) {
      throw new Error(`No canvas pool available for size ${size}`);
    }
    
    // Try to reuse existing canvas
    if (pool.canvases.length > 0) {
      const canvas = pool.canvases.pop()!;
      const context = pool.contexts.pop()!;
      
      canvas.width = width;
      canvas.height = height;
      
      pool.inUse.add(canvas);
      
      // Clear canvas
      context.clearRect(0, 0, width, height);
      
      return canvas;
    }
    
    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true,
      ...options
    });
    
    if (!context) {
      throw new Error('Failed to create canvas context');
    }
    
    pool.inUse.add(canvas);
    
    return canvas;
  }
  
  // Release a canvas back to the pool
  public releaseCanvas(canvas: HTMLCanvasElement): void {
    if (!canvas) {
      console.warn('Cannot release null canvas');
      return;
    }
    
    const size = Math.max(canvas.width, canvas.height);
    const poolKey = this.getPoolKey(size);
    const pool = this.canvasPools.get(poolKey);
    
    if (!pool) {
      console.warn(`No pool found for canvas size ${size}`);
      return;
    }
    
    if (!pool.inUse.has(canvas)) {
      console.warn('Canvas not found in use set');
      return;
    }
    
    pool.inUse.delete(canvas);
    
    // Return to pool if not at capacity
    if (pool.canvases.length < pool.maxSize) {
      pool.canvases.push(canvas);
      
      const context = canvas.getContext('2d')!;
      pool.contexts.push(context);
    } else {
      // Dispose of excess canvas
      this.disposeCanvas(canvas);
    }
  }
  
  // Get pool key for given size
  private getPoolKey(size: number): string {
    if (size <= 256) return '256';
    if (size <= 512) return '512';
    if (size <= 1024) return '1024';
    return '2048';
  }
  
  // Dispose of a canvas completely
  private disposeCanvas(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    canvas.width = 0;
    canvas.height = 0;
  }
  
  // Schedule cleanup task
  public scheduleCleanup(
    id: string,
    resource: any,
    cleanupFunction: () => void,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    delay: number = 0
  ): void {
    const task: CleanupTask = {
      id,
      resource,
      cleanupFunction,
      priority,
      scheduledTime: Date.now() + delay
    };
    
    this.cleanupTasks.set(id, task);
  }
  
  // Cancel cleanup task
  public cancelCleanup(id: string): void {
    this.cleanupTasks.delete(id);
  }
  
  // Perform scheduled cleanup
  private performScheduledCleanup(): void {
    const now = Date.now();
    const tasksToExecute: CleanupTask[] = [];
    
    // Collect tasks ready for execution
    this.cleanupTasks.forEach(task => {
      if (now >= task.scheduledTime) {
        tasksToExecute.push(task);
      }
    });
    
    // Sort by priority
    tasksToExecute.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Execute cleanup tasks
    tasksToExecute.forEach(task => {
      try {
        task.cleanupFunction();
        this.cleanupTasks.delete(task.id);
      } catch (error) {
        console.error(`Cleanup task ${task.id} failed:`, error);
      }
    });
    
    // Perform memory optimization if needed
    if (this.getMemoryUsage() > this.memoryThreshold) {
      this.performMemoryOptimization();
    }
    
    this.lastCleanupTime = now;
  }
  
  // Perform memory optimization
  private performMemoryOptimization(): void {
    console.log('🧠 Performing memory optimization...');
    
    // Clear unused canvases from pools
    this.canvasPools.forEach(pool => {
      while (pool.canvases.length > pool.maxSize / 2) {
        const canvas = pool.canvases.pop()!;
        const context = pool.contexts.pop()!;
        this.disposeCanvas(canvas);
      }
    });
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log('🧠 Memory optimization completed');
  }
  
  // Get current memory usage
  public getMemoryUsage(): number {
    const stats = this.getMemoryStats();
    return stats.usedMemory / stats.totalMemory;
  }
  
  // Get detailed memory statistics
  public getMemoryStats(): MemoryStats {
    let totalMemory = 0;
    let usedMemory = 0;
    let canvasCount = 0;
    let contextCount = 0;
    
    this.canvasPools.forEach(pool => {
      canvasCount += pool.canvases.length + pool.inUse.size;
      contextCount += pool.contexts.length + pool.inUse.size;
      
      pool.canvases.forEach(canvas => {
        totalMemory += canvas.width * canvas.height * 4; // RGBA
      });
      
      pool.inUse.forEach(canvas => {
        usedMemory += canvas.width * canvas.height * 4; // RGBA
      });
    });
    
    // Estimate total available memory (rough approximation)
    const estimatedTotalMemory = 100 * 1024 * 1024; // 100MB estimate
    
    return {
      totalMemory: estimatedTotalMemory,
      usedMemory,
      availableMemory: estimatedTotalMemory - usedMemory,
      canvasCount,
      contextCount,
      poolUtilization: canvasCount > 0 ? usedMemory / (usedMemory + totalMemory) : 0
    };
  }
  
  // Get memory usage history
  public getMemoryHistory(): number[] {
    return [...this.memoryHistory];
  }
  
  // Update memory history
  private updateMemoryHistory(): void {
    const usage = this.getMemoryUsage();
    this.memoryHistory.push(usage);
    
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }
  }
  
  // Check if memory is available
  public hasAvailableMemory(): boolean {
    return this.getMemoryUsage() < this.memoryThreshold;
  }
  
  // Get pool statistics
  public getPoolStats(): Record<string, { available: number; inUse: number; utilization: number }> {
    const stats: Record<string, { available: number; inUse: number; utilization: number }> = {};
    
    this.canvasPools.forEach((pool, key) => {
      const total = pool.canvases.length + pool.inUse.size;
      const utilization = total > 0 ? pool.inUse.size / total : 0;
      
      stats[key] = {
        available: pool.canvases.length,
        inUse: pool.inUse.size,
        utilization
      };
    });
    
    return stats;
  }
  
  // Optimize canvas for specific use case
  public optimizeCanvas(canvas: HTMLCanvasElement, useCase: 'displacement' | 'normal' | 'height' | 'preview'): void {
    const context = canvas.getContext('2d')!;
    
    switch (useCase) {
      case 'displacement':
        // Optimize for displacement mapping
        context.imageSmoothingEnabled = false;
        break;
        
      case 'normal':
        // Optimize for normal mapping
        context.imageSmoothingEnabled = true;
        break;
        
      case 'height':
        // Optimize for height mapping
        context.imageSmoothingEnabled = false;
        break;
        
      case 'preview':
        // Optimize for preview rendering
        context.imageSmoothingEnabled = true;
        break;
    }
  }
  
  // Create optimized canvas for specific use case
  public createOptimizedCanvas(
    width: number,
    height: number,
    useCase: 'displacement' | 'normal' | 'height' | 'preview'
  ): HTMLCanvasElement {
    const canvas = this.createCanvas(width, height);
    this.optimizeCanvas(canvas, useCase);
    return canvas;
  }
  
  // Batch create canvases
  public createCanvasBatch(
    count: number,
    width: number,
    height: number,
    useCase?: 'displacement' | 'normal' | 'height' | 'preview'
  ): HTMLCanvasElement[] {
    const canvases: HTMLCanvasElement[] = [];
    
    for (let i = 0; i < count; i++) {
      const canvas = useCase 
        ? this.createOptimizedCanvas(width, height, useCase)
        : this.createCanvas(width, height);
      
      canvases.push(canvas);
    }
    
    return canvases;
  }
  
  // Batch release canvases
  public releaseCanvasBatch(canvases: HTMLCanvasElement[]): void {
    canvases.forEach(canvas => this.releaseCanvas(canvas));
  }
  
  // Emergency cleanup
  public emergencyCleanup(): void {
    console.warn('🧠 Performing emergency memory cleanup...');
    
    // Clear all pools
    this.canvasPools.forEach(pool => {
      pool.canvases.forEach(canvas => this.disposeCanvas(canvas));
      pool.contexts.forEach(context => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      });
      
      pool.canvases.length = 0;
      pool.contexts.length = 0;
    });
    
    // Execute all pending cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task.cleanupFunction();
      } catch (error) {
        console.error(`Emergency cleanup task ${task.id} failed:`, error);
      }
    });
    
    this.cleanupTasks.clear();
    
    // Force garbage collection
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.warn('🧠 Emergency cleanup completed');
  }
  
  // Cleanup all resources
  public cleanup(): void {
    console.log('🧹 PuffMemoryManager cleanup started');
    
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer as any);
      this.cleanupTimer = null;
    }
    
    // Execute all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task.cleanupFunction();
      } catch (error) {
        console.error(`Cleanup task ${task.id} failed:`, error);
      }
    });
    
    this.cleanupTasks.clear();
    
    // Dispose all canvases
    this.canvasPools.forEach(pool => {
      pool.canvases.forEach(canvas => this.disposeCanvas(canvas));
      pool.canvases.length = 0;
      pool.contexts.length = 0;
      pool.inUse.clear();
    });
    
    // Clear pools
    this.canvasPools.clear();
    
    // Clear memory history
    this.memoryHistory.length = 0;
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log('🧹 PuffMemoryManager cleanup completed');
  }
}

export default PuffMemoryManager;


