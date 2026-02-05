/**
 * Hot Reload Manager for Dashboard with callback support
 */

export interface HotReloadCallback {
  (newModule?: any): void;
}

export interface HotReloadOptions {
  acceptSelf?: boolean;
  acceptDependencies?: string[];
  onDispose?: () => void;
  onData?: (data: any) => void;
}

export class HotReloadManager {
  private callbacks = new Map<string, HotReloadCallback>();
  private disposalCallbacks = new Set<() => void>();
  private data: any = {};

  constructor(private options: HotReloadOptions = {}) {
    this.setupHotReload();
  }

  /**
   * Setup hot reloading for the current module
   */
  private setupHotReload() {
    if (typeof import.meta.hot === 'undefined') {
      return; // Hot reload not available
    }

    // Accept self-updates
    if (this.options.acceptSelf !== false) {
      import.meta.hot.accept((newModule) => {
        this.handleSelfAccept(newModule);
      });
    }

    // Accept dependency updates
    if (this.options.acceptDependencies) {
      for (const dep of this.options.acceptDependencies) {
        import.meta.hot.accept(dep, (newModule) => {
          this.handleDependencyAccept(dep, newModule);
        });
      }
    }

    // Setup disposal callback
    if (this.options.onDispose) {
      import.meta.hot.dispose(() => {
        this.options.onDispose?.();
        this.disposalCallbacks.forEach(cb => cb());
      });
    }

    // Setup data persistence
    if (this.options.onData) {
      import.meta.hot.data = this.data;
      this.options.onData(this.data);
    }
  }

  /**
   * Handle self-module updates
   */
  private handleSelfAccept(newModule: any) {
    if (newModule) {
      console.log('🔥 Module hot reloaded');
      this.callbacks.forEach((callback, key) => {
        try {
          callback(newModule);
        } catch (error) {
          console.error(`Hot reload callback failed for ${key}:`, error);
        }
      });
    } else {
      console.warn('🔥 Hot reload failed - syntax error in module');
    }
  }

  /**
   * Handle dependency updates
   */
  private handleDependencyAccept(dependency: string, newModule: any) {
    if (newModule) {
      console.log(`🔥 Dependency hot reloaded: ${dependency}`);
      const callback = this.callbacks.get(dependency);
      if (callback) {
        try {
          callback(newModule);
        } catch (error) {
          console.error(`Hot reload callback failed for ${dependency}:`, error);
        }
      }
    }
  }

  /**
   * Register a callback for hot reload events
   */
  onCallback(key: string, callback: HotReloadCallback) {
    this.callbacks.set(key, callback);
  }

  /**
   * Register a disposal callback
   */
  onDispose(callback: () => void) {
    this.disposalCallbacks.add(callback);
  }

  /**
   * Remove a callback
   */
  removeCallback(key: string) {
    this.callbacks.delete(key);
  }

  /**
   * Get hot reload data (persists across reloads)
   */
  getData(): any {
    return import.meta.hot?.data || this.data;
  }

  /**
   * Set hot reload data
   */
  setData(data: any) {
    this.data = data;
    if (import.meta.hot) {
      import.meta.hot.data = data;
    }
  }

  /**
   * Check if hot reload is available
   */
  isHotReloadAvailable(): boolean {
    return typeof import.meta.hot !== 'undefined';
  }

  /**
   * Listen for specific hot reload events
   */
  onEvent(event: string, callback: (data?: any) => void) {
    if (import.meta.hot) {
      import.meta.hot.on(event, callback);
    }
  }

  /**
   * Stop listening for hot reload events
   */
  offEvent(event: string, callback?: (data?: any) => void) {
    if (import.meta.hot && callback) {
      import.meta.hot.off(event, callback);
    }
  }
}

/**
 * Utility function to create a hot reload manager with sensible defaults
 */
export function createHotReloadManager(options?: HotReloadOptions): HotReloadManager {
  return new HotReloadManager(options);
}
