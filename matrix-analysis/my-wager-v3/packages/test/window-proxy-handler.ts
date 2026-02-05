// WindowProxy Handler for Cross-Document Messaging
// Handles WindowProxy objects in MessageEvent.source for secure communication

export interface WindowProxyInfo {
  id: string;
  windowProxy: WindowProxy;
  origin: string;
  lastActivity: number;
  status: 'active' | 'inactive' | 'closed';
  metadata?: Record<string, any>;
}

export class WindowProxyHandler {
  private proxies: Map<string, WindowProxyInfo> = new Map();
  private originWhitelist: Set<string>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(trustedOrigins: string[] = []) {
    this.originWhitelist = new Set(trustedOrigins);

    // Cleanup inactive proxies every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveProxiesPrivate();
    }, 30000);
  }

  /**
   * Register a WindowProxy for tracking
   */
  registerWindowProxy(windowProxy: WindowProxy, origin: string, metadata?: Record<string, any>): string {
    // Verify origin is whitelisted
    if (!this.originWhitelist.has(origin)) {
      throw new Error(`Origin ${origin} is not whitelisted`);
    }

    const id = this.generateProxyId();
    const info: WindowProxyInfo = {
      id,
      windowProxy,
      origin,
      lastActivity: Date.now(),
      status: 'active',
      metadata
    };

    this.proxies.set(id, info);
    console.log(`🔗 Registered WindowProxy ${id} from ${origin}`);

    // Set up unload listener to detect when window closes
    try {
      const window = info.windowProxy as any;
      if (window.addEventListener) {
        window.addEventListener('unload', () => {
          this.markProxyInactive(id);
        });
      }
    } catch {
      // Might not be able to add listener to cross-origin window
    }

    return id;
  }

  /**
   * Handle incoming message from WindowProxy
   */
  handleWindowProxyMessage(event: MessageEvent): WindowProxyInfo | null {
    // Verify source is a WindowProxy
    if (!event.source) {
      return null;
    }

    // Check if it's a WindowProxy (browser environment)
    const isWindowProxy = typeof window !== 'undefined' &&
                         event.source instanceof WindowProxy;

    if (!isWindowProxy && !(event.source instanceof MessagePort)) {
      return null;
    }

    // Verify origin
    if (!this.originWhitelist.has(event.origin)) {
      console.warn(`⚠️ Untrusted origin: ${event.origin}`);
      return null;
    }

    // Find or register the proxy
    let proxyInfo = this.findProxyByWindowProxy(event.source);

    if (!proxyInfo) {
      // Auto-register if message is from trusted origin
      try {
        const id = this.registerWindowProxy(event.source, event.origin, {
          autoRegistered: true,
          firstMessage: event.data
        });
        proxyInfo = this.proxies.get(id)!;
      } catch (error) {
        console.error('Failed to register WindowProxy:', error);
        return null;
      }
    }

    // Update activity
    proxyInfo.lastActivity = Date.now();
    proxyInfo.status = 'active';

    console.log(`📨 Message from WindowProxy ${proxyInfo.id}:`, event.data);
    return proxyInfo;
  }

  /**
   * Send message to a specific WindowProxy
   */
  sendToWindowProxy(id: string, message: any, origin?: string): boolean {
    const proxyInfo = this.proxies.get(id);
    if (!proxyInfo) {
      console.warn(`WindowProxy ${id} not found`);
      return false;
    }

    try {
      const targetOrigin = origin || proxyInfo.origin;
      proxyInfo.windowProxy.postMessage(message, targetOrigin);
      console.log(`📤 Sent message to WindowProxy ${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to send to WindowProxy ${id}:`, error);
      this.markProxyInactive(id);
      return false;
    }
  }

  /**
   * Broadcast message to all active WindowProxies
   */
  broadcast(message: any, excludeId?: string): number {
    let sent = 0;
    for (const [id, proxyInfo] of this.proxies) {
      if (proxyInfo.status === 'active' && id !== excludeId) {
        if (this.sendToWindowProxy(id, message)) {
          sent++;
        }
      }
    }
    console.log(`📡 Broadcast to ${sent} WindowProxies`);
    return sent;
  }

  /**
   * Get all tracked WindowProxies
   */
  getAllProxies(): WindowProxyInfo[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Get proxy by ID
   */
  getProxy(id: string): WindowProxyInfo | undefined {
    return this.proxies.get(id);
  }

  /**
   * Find proxy by WindowProxy reference
   */
  private findProxyByWindowProxy(windowProxy: WindowProxy): WindowProxyInfo | undefined {
    for (const proxyInfo of this.proxies.values()) {
      if (proxyInfo.windowProxy === windowProxy) {
        return proxyInfo;
      }
    }
    return undefined;
  }

  /**
   * Mark proxy as inactive
   */
  private markProxyInactive(id: string): void {
    const proxyInfo = this.proxies.get(id);
    if (proxyInfo) {
      proxyInfo.status = 'inactive';
      console.log(`🔌 WindowProxy ${id} marked inactive`);
    }
  }

  /**
   * Clean up inactive proxies (public method)
   */
  public cleanupInactiveProxies(): void {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute

    for (const [id, proxyInfo] of this.proxies) {
      if (proxyInfo.status === 'inactive' ||
          (now - proxyInfo.lastActivity > inactiveThreshold)) {
        this.proxies.delete(id);
        console.log(`🧹 Cleaned up WindowProxy ${id}`);
      }
    }
  }

  /**
   * Clean up inactive proxies (private method)
   */
  private cleanupInactiveProxiesPrivate(): void {
    this.cleanupInactiveProxies();
  }

  /**
   * Generate unique proxy ID
   */
  private generateProxyId(): string {
    return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add trusted origin
   */
  addTrustedOrigin(origin: string): void {
    this.originWhitelist.add(origin);
  }

  /**
   * Remove trusted origin
   */
  removeTrustedOrigin(origin: string): void {
    this.originWhitelist.delete(origin);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    origins: string[];
  } {
    const proxies = this.getAllProxies();
    return {
      total: proxies.length,
      active: proxies.filter(p => p.status === 'active').length,
      inactive: proxies.filter(p => p.status === 'inactive').length,
      origins: Array.from(new Set(proxies.map(p => p.origin)))
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.proxies.clear();
  }
}

// Export singleton instance
export const windowProxyHandler = new WindowProxyHandler([
  'http://localhost:3002',
  'https://localhost:3002',
  'http://localhost:3000',
  'https://localhost:3000'
]);
