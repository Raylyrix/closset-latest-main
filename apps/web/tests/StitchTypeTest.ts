/**
 * Stitch Type Test Suite
 * 
 * This file tests all stitch types to ensure they work correctly with vector tools.
 * Run this test to verify that all stitches render properly.
 */

import { universalVectorRenderer } from './UniversalVectorRenderer';

export interface TestResult {
  stitchType: string;
  success: boolean;
  error?: string;
  renderTime: number;
}

export class StitchTypeTester {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    // Create test canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 300;
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  /**
   * Test all available stitch types
   */
  async testAllStitchTypes(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const renderers = universalVectorRenderer.getAvailableRenderers();
    
    console.log(`🧪 Testing ${renderers.length} stitch types...`);
    
    for (const renderer of renderers) {
      const result = await this.testStitchType(renderer.id);
      results.push(result);
      
      // Log result
      if (result.success) {
        console.log(`✅ ${renderer.name}: ${result.renderTime}ms`);
      } else {
        console.error(`❌ ${renderer.name}: ${result.error}`);
      }
    }
    
    return results;
  }
  
  /**
   * Test a specific stitch type
   */
  async testStitchType(stitchType: string): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Create test points (simple line)
      const testPoints = [
        { x: 50, y: 150 },
        { x: 100, y: 100 },
        { x: 150, y: 150 },
        { x: 200, y: 100 },
        { x: 250, y: 150 },
        { x: 300, y: 100 },
        { x: 350, y: 150 }
      ];
      
      // Create test config
      const config = {
        type: stitchType,
        color: '#ff69b4',
        thickness: 3,
        opacity: 1.0
      };
      
      // Test rendering
      const success = universalVectorRenderer.render(
        this.ctx,
        testPoints,
        stitchType,
        config,
        { realTime: false, quality: 'high' }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (success) {
        return {
          stitchType,
          success: true,
          renderTime: Math.round(renderTime * 100) / 100
        };
      } else {
        return {
          stitchType,
          success: false,
          error: 'Renderer failed to render',
          renderTime: Math.round(renderTime * 100) / 100
        };
      }
      
    } catch (error) {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      return {
        stitchType,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        renderTime: Math.round(renderTime * 100) / 100
      };
    }
  }
  
  /**
   * Test stitch type with different configurations
   */
  async testStitchConfigurations(stitchType: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    const configurations = [
      { color: '#ff69b4', thickness: 2, opacity: 1.0 },
      { color: '#00ff00', thickness: 5, opacity: 0.8 },
      { color: '#0000ff', thickness: 1, opacity: 0.5 },
      { color: '#ff0000', thickness: 10, opacity: 1.0 }
    ];
    
    for (const config of configurations) {
      const startTime = performance.now();
      
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const testPoints = [
          { x: 50, y: 50 },
          { x: 100, y: 100 },
          { x: 150, y: 50 },
          { x: 200, y: 100 }
        ];
        
        const success = universalVectorRenderer.render(
          this.ctx,
          testPoints,
          stitchType,
          { type: stitchType, ...config },
          { realTime: false, quality: 'high' }
        );
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        results.push({
          stitchType: `${stitchType} (${config.color})`,
          success,
          renderTime: Math.round(renderTime * 100) / 100
        });
        
      } catch (error) {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        results.push({
          stitchType: `${stitchType} (${config.color})`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          renderTime: Math.round(renderTime * 100) / 100
        });
      }
    }
    
    return results;
  }
  
  /**
   * Test performance with different point counts
   */
  async testPerformance(stitchType: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    const pointCounts = [10, 50, 100, 200, 500];
    
    for (const count of pointCounts) {
      const startTime = performance.now();
      
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Generate test points
        const testPoints = [];
        for (let i = 0; i < count; i++) {
          testPoints.push({
            x: 50 + (i * 300 / count),
            y: 100 + Math.sin(i * 0.1) * 50
          });
        }
        
        const config = {
          type: stitchType,
          color: '#ff69b4',
          thickness: 3,
          opacity: 1.0
        };
        
        const success = universalVectorRenderer.render(
          this.ctx,
          testPoints,
          stitchType,
          config,
          { realTime: false, quality: 'high' }
        );
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        results.push({
          stitchType: `${stitchType} (${count} points)`,
          success,
          renderTime: Math.round(renderTime * 100) / 100
        });
        
      } catch (error) {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        results.push({
          stitchType: `${stitchType} (${count} points)`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          renderTime: Math.round(renderTime * 100) / 100
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate test report
   */
  generateReport(results: TestResult[]): string {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgRenderTime = results.reduce((sum, r) => sum + r.renderTime, 0) / total;
    
    let report = `🧪 Stitch Type Test Report\n`;
    report += `========================\n\n`;
    report += `Total Tests: ${total}\n`;
    report += `Successful: ${successful} (${Math.round(successful/total*100)}%)\n`;
    report += `Failed: ${failed} (${Math.round(failed/total*100)}%)\n`;
    report += `Average Render Time: ${Math.round(avgRenderTime * 100) / 100}ms\n\n`;
    
    if (failed > 0) {
      report += `❌ Failed Tests:\n`;
      results.filter(r => !r.success).forEach(result => {
        report += `  - ${result.stitchType}: ${result.error}\n`;
      });
      report += `\n`;
    }
    
    report += `✅ Successful Tests:\n`;
    results.filter(r => r.success).forEach(result => {
      report += `  - ${result.stitchType}: ${result.renderTime}ms\n`;
    });
    
    return report;
  }
  
  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTest(): Promise<string> {
    console.log('🚀 Starting comprehensive stitch type test...');
    
    // Test all stitch types
    const basicResults = await this.testAllStitchTypes();
    
    // Test configurations for cross-stitch
    const configResults = await this.testStitchConfigurations('cross-stitch');
    
    // Test performance for satin stitch
    const performanceResults = await this.testPerformance('satin');
    
    // Combine all results
    const allResults = [...basicResults, ...configResults, ...performanceResults];
    
    // Generate report
    const report = this.generateReport(allResults);
    
    console.log(report);
    return report;
  }
}

// Export test functions for easy use
export async function testAllStitchTypes(): Promise<TestResult[]> {
  const tester = new StitchTypeTester();
  return await tester.testAllStitchTypes();
}

export async function testStitchType(stitchType: string): Promise<TestResult> {
  const tester = new StitchTypeTester();
  return await tester.testStitchType(stitchType);
}

export async function runComprehensiveTest(): Promise<string> {
  const tester = new StitchTypeTester();
  return await tester.runComprehensiveTest();
}

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  console.log('🧪 Stitch Type Test Suite loaded. Run testAllStitchTypes() to test all stitches.');
}

