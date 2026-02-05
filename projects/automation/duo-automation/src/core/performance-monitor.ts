// src/utils/performance-monitor.ts
/**
 * Performance monitoring for Dependency Injection usage
 * Tracks DI resolution time and mock usage across environments
 */

interface PerformanceMetrics {
  diResolution: number;
  mockUsage: number;
  timestamp: string;
  environment: string;
  function: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  
  /**
   * Track DI resolution performance for a function
   */
  trackDIResolution(functionName: string, startTime: number): void {
    const perf: PerformanceMetrics = {
      diResolution: Date.now() - startTime,
      mockUsage: process.env.NODE_ENV === 'test' ? 1 : 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      function: functionName,
    };
    
    this.metrics.push(perf);
    
    // Log in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.log('[DI_PERF]', JSON.stringify(perf));
    }
  }
  
  /**
   * Get performance summary
   */
  getSummary(): {
    totalCalls: number;
    avgResolutionTime: number;
    mockUsagePercentage: number;
    slowestFunction: string;
  } {
    if (this.metrics.length === 0) {
      return {
        totalCalls: 0,
        avgResolutionTime: 0,
        mockUsagePercentage: 0,
        slowestFunction: 'none',
      };
    }
    
    const totalCalls = this.metrics.length;
    const avgResolutionTime = this.metrics.reduce((sum, m) => sum + m.diResolution, 0) / totalCalls;
    const mockUsagePercentage = (this.metrics.filter(m => m.mockUsage === 1).length / totalCalls) * 100;
    const slowestFunction = this.metrics.reduce((slowest, current) => 
      current.diResolution > slowest.diResolution ? current : slowest
    ).function;
    
    return {
      totalCalls,
      avgResolutionTime,
      mockUsagePercentage,
      slowestFunction,
    };
  }
  
  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
  }
}

// Singleton instance for application-wide monitoring
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator to automatically track DI resolution performance
 */
export function trackPerformance(functionName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const start = Date.now();
      const result = originalMethod.apply(this, args);
      
      // Track async functions
      if (result && typeof result.then === 'function') {
        return result.then((res: any) => {
          performanceMonitor.trackDIResolution(functionName, start);
          return res;
        });
      }
      
      // Track sync functions
      performanceMonitor.trackDIResolution(functionName, start);
      return result;
    };
    
    return descriptor;
  };
}
