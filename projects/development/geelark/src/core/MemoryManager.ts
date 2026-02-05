/**
 * Memory Management Utility for Runtime Optimization
 * Uses FinalizationRegistry for automatic cleanup of resources
 */

export interface ManagedResource {
  id: string;
  type: string;
  cleanup: () => void;
  createdAt: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private resources = new Map<string, ManagedResource>();
  private finalizationRegistry: FinalizationRegistry<string>;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB

  private constructor() {
    // Setup FinalizationRegistry for automatic cleanup
    this.finalizationRegistry = new FinalizationRegistry((resourceId: string) => {
      this.cleanupResource(resourceId);
      console.debug(`🧹 Auto-cleaned resource: ${resourceId}`);
    });

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a resource for automatic cleanup
   */
  registerResource(
    resource: object,
    cleanup: () => void,
    type: string = 'generic'
  ): string {
    const resourceId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const managedResource: ManagedResource = {
      id: resourceId,
      type,
      cleanup,
      createdAt: Date.now()
    };

    this.resources.set(resourceId, managedResource);
    this.finalizationRegistry.register(resource, resourceId);

    console.debug(`📝 Registered resource: ${resourceId} (${type})`);
    return resourceId;
  }

  /**
   * Manually cleanup a resource
   */
  cleanupResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (resource) {
      try {
        resource.cleanup();
        this.resources.delete(resourceId);
        console.debug(`🧹 Manually cleaned resource: ${resourceId}`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to cleanup resource ${resourceId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Cleanup all resources of a specific type
   */
  cleanupResourcesByType(type: string): number {
    let cleaned = 0;
    for (const [id, resource] of this.resources) {
      if (resource.type === type) {
        if (this.cleanupResource(id)) {
          cleaned++;
        }
      }
    }
    console.debug(`🧹 Cleaned ${cleaned} resources of type: ${type}`);
    return cleaned;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    resourceCount: number;
    oldestResource: number | null;
  } {
    const memUsage = process.memoryUsage();
    const now = Date.now();
    const oldestResource = this.resources.size > 0
      ? Math.min(...Array.from(this.resources.values()).map(r => r.createdAt))
      : null;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      resourceCount: this.resources.size,
      oldestResource: oldestResource ? now - oldestResource : null
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      console.debug("🗑️ Forced garbage collection");
      return true;
    }
    return false;
  }

  /**
   * Cleanup old resources (older than specified age)
   */
  cleanupOldResources(maxAge: number = 30 * 60 * 1000): number { // 30 minutes default
    const now = Date.now();
    let cleaned = 0;

    for (const [id, resource] of this.resources) {
      if (now - resource.createdAt > maxAge) {
        if (this.cleanupResource(id)) {
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.debug(`🧹 Cleaned ${cleaned} old resources (older than ${maxAge}ms)`);
    }

    return cleaned;
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      const stats = this.getMemoryStats();

      // Auto-cleanup if memory threshold exceeded
      if (stats.heapUsed > this.memoryThreshold) {
        console.warn(`⚠️ Memory threshold exceeded: ${Math.round(stats.heapUsed / 1024 / 1024)}MB`);
        this.cleanupOldResources(15 * 60 * 1000); // Cleanup resources older than 15 minutes
        this.forceGC();
      }

      // Log memory usage periodically (every 5 minutes)
      if (Date.now() % (5 * 60 * 1000) < 60000) { // Rough check
        console.debug(`📊 Memory: ${Math.round(stats.heapUsed / 1024 / 1024)}MB, Resources: ${stats.resourceCount}`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
  }

  /**
   * Cleanup all resources and stop monitoring
   */
  shutdown(): void {
    console.log("🛑 Shutting down MemoryManager...");
    this.stopMemoryMonitoring();

    let cleaned = 0;
    for (const resourceId of this.resources.keys()) {
      if (this.cleanupResource(resourceId)) {
        cleaned++;
      }
    }

    console.log(`✅ MemoryManager shutdown complete. Cleaned ${cleaned} resources.`);
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();
