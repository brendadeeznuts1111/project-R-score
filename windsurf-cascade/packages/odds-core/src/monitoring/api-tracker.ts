// packages/odds-core/src/monitoring/api-tracker.ts
export class APITracker {
  private static instance: APITracker;
  private metrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  static getInstance(): APITracker {
    if (!APITracker.instance) {
      APITracker.instance = new APITracker();
    }
    return APITracker.instance;
  }

  async track<T>(apiName: string, fn: () => T | Promise<T>): Promise<T> {
    const startTime = performance.now();
    const current = this.metrics.get(apiName) || { count: 0, totalTime: 0, errors: 0 };
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.metrics.set(apiName, {
        count: current.count + 1,
        totalTime: current.totalTime + duration,
        errors: current.errors
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.metrics.set(apiName, {
        count: current.count + 1,
        totalTime: current.totalTime + duration,
        errors: current.errors + 1
      });
      
      throw error;
    }
  }

  getMetrics(): Record<string, { count: number; averageTime: number; errors: number }> {
    const result: Record<string, { count: number; averageTime: number; errors: number }> = {};
    
    for (const [api, metrics] of this.metrics.entries()) {
      result[api] = {
        count: metrics.count,
        averageTime: metrics.totalTime / metrics.count,
        errors: metrics.errors
      };
    }
    
    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const apiTracker = APITracker.getInstance();
