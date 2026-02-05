// src/core/preconnect-manager.ts
/**
 * 🚀 Preconnect Manager - Performance Optimization
 * 
 * Manages preconnect connections to critical resources for faster loading
 * and improved user experience across the Factory-Wager ecosystem.
 */

export interface PreconnectConfig {
  domains: string[];
  origins: string[];
  resources: {
    fonts: string[];
    stylesheets: string[];
    scripts: string[];
    images: string[];
  };
  crossOrigin: string[];
  dnsPrefetch: string[];
}

export interface PreconnectStrategy {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  connections: PreconnectConfig;
  timeout: number;
  retryAttempts: number;
}

export class PreconnectManager {
  private static instance: PreconnectManager;
  private activeConnections: Map<string, boolean> = new Map();
  private connectionPool: Map<string, Promise<void>> = new Map();
  private strategies: Map<string, PreconnectStrategy> = new Map();

  private constructor() {
    this.initializeStrategies();
  }

  public static getInstance(): PreconnectManager {
    if (!PreconnectManager.instance) {
      PreconnectManager.instance = new PreconnectManager();
    }
    return PreconnectManager.instance;
  }

  private initializeStrategies(): void {
    // Critical domain preconnects
    this.strategies.set('critical-domains', {
      name: 'Critical Domains',
      priority: 'critical',
      timeout: 5000,
      retryAttempts: 3,
      connections: {
        domains: [
          'admin.factory-wager.com',
          'api.factory-wager.com',
          'registry.factory-wager.com',
          'cdn.factory-wager.com'
        ],
        origins: [
          'https://admin.factory-wager.com',
          'https://api.factory-wager.com',
          'https://registry.factory-wager.com'
        ],
        resources: {
          fonts: [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
          ],
          stylesheets: [
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com'
          ],
          scripts: [
            'https://cdn.jsdelivr.net',
            'https://unpkg.com'
          ],
          images: [
            'https://images.factory-wager.com',
            'https://assets.factory-wager.com'
          ]
        },
        crossOrigin: [
          'https://fonts.googleapis.com',
          'https://cdn.tailwindcss.com',
          'https://api.factory-wager.com'
        ],
        dnsPrefetch: [
          'fonts.googleapis.com',
          'cdn.tailwindcss.com',
          'cdnjs.cloudflare.com'
        ]
      }
    });

    // Performance optimization strategy
    this.strategies.set('performance', {
      name: 'Performance Optimization',
      priority: 'high',
      timeout: 3000,
      retryAttempts: 2,
      connections: {
        domains: [
          'fonts.googleapis.com',
          'fonts.gstatic.com',
          'cdn.tailwindcss.com',
          'cdnjs.cloudflare.com',
          'cdn.jsdelivr.net'
        ],
        origins: [
          'https://fonts.googleapis.com',
          'https://cdn.tailwindcss.com'
        ],
        resources: {
          fonts: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
          ],
          stylesheets: [
            'https://cdn.tailwindcss.com/tailwind.min.css'
          ],
          scripts: [
            'https://cdn.jsdelivr.net/npm/chart.js'
          ],
          images: []
        },
        crossOrigin: [
          'https://fonts.googleapis.com',
          'https://cdn.tailwindcss.com'
        ],
        dnsPrefetch: [
          'fonts.googleapis.com',
          'cdn.tailwindcss.com',
          'cdnjs.cloudflare.com'
        ]
      }
    });

    // Analytics and monitoring strategy
    this.strategies.set('analytics', {
      name: 'Analytics & Monitoring',
      priority: 'medium',
      timeout: 2000,
      retryAttempts: 1,
      connections: {
        domains: [
          'analytics.factory-wager.com',
          'monitoring.factory-wager.com',
          'logs.factory-wager.com'
        ],
        origins: [
          'https://analytics.factory-wager.com',
          'https://monitoring.factory-wager.com'
        ],
        resources: {
          fonts: [],
          stylesheets: [],
          scripts: [
            'https://analytics.factory-wager.com/tracking.js'
          ],
          images: [
            'https://analytics.factory-wager.com/pixels'
          ]
        },
        crossOrigin: [
          'https://analytics.factory-wager.com'
        ],
        dnsPrefetch: [
          'analytics.factory-wager.com',
          'monitoring.factory-wager.com'
        ]
      }
    });
  }

  public async executeStrategy(strategyName: string): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    console.log(`🚀 Executing preconnect strategy: ${strategy.name}`);
    
    try {
      await this.executePreconnects(strategy);
      console.log(`✅ Preconnect strategy '${strategy.name}' completed successfully`);
    } catch (error) {
      console.error(`❌ Preconnect strategy '${strategy.name}' failed:`, error);
      throw error;
    }
  }

  private async executePreconnects(strategy: PreconnectStrategy): Promise<void> {
    const { connections } = strategy;
    
    // Execute DNS prefetches first (fastest)
    await this.executeDNSPrefetches(connections.dnsPrefetch);
    
    // Execute domain preconnects
    await this.executeDomainPreconnects(connections.domains);
    
    // Execute origin preconnects
    await this.executeOriginPreconnects(connections.origins);
    
    // Execute resource preconnects
    await this.executeResourcePreconnects(connections.resources);
    
    // Execute cross-origin preconnects
    await this.executeCrossOriginPreconnects(connections.crossOrigin);
  }

  private async executeDNSPrefetches(domains: string[]): Promise<void> {
    const promises = domains.map(domain => this.dnsPrefetch(domain));
    await Promise.allSettled(promises);
  }

  private async executeDomainPreconnects(domains: string[]): Promise<void> {
    const promises = domains.map(domain => this.preconnectDomain(domain));
    await Promise.allSettled(promises);
  }

  private async executeOriginPreconnects(origins: string[]): Promise<void> {
    const promises = origins.map(origin => this.preconnectOrigin(origin));
    await Promise.allSettled(promises);
  }

  private async executeResourcePreconnects(resources: any): Promise<void> {
    const allResources = [
      ...resources.fonts,
      ...resources.stylesheets,
      ...resources.scripts,
      ...resources.images
    ];
    
    const promises = allResources.map(resource => this.preconnectResource(resource));
    await Promise.allSettled(promises);
  }

  private async executeCrossOriginPreconnects(origins: string[]): Promise<void> {
    const promises = origins.map(origin => this.preconnectCrossOrigin(origin));
    await Promise.allSettled(promises);
  }

  private async dnsPrefetch(domain: string): Promise<void> {
    if (this.activeConnections.has(`dns:${domain}`)) {
      return;
    }

    const key = `dns:${domain}`;
    this.activeConnections.set(key, true);

    try {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
      
      console.log(`🔍 DNS prefetch initiated for: ${domain}`);
    } catch (error) {
      console.warn(`⚠️ DNS prefetch failed for ${domain}:`, error);
    } finally {
      // Don't mark as inactive to prevent duplicate prefetches
    }
  }

  private async preconnectDomain(domain: string): Promise<void> {
    if (this.activeConnections.has(`domain:${domain}`)) {
      return;
    }

    const key = `domain:${domain}`;
    this.activeConnections.set(key, true);

    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = `https://${domain}`;
      document.head.appendChild(link);
      
      console.log(`🔗 Preconnect initiated for domain: ${domain}`);
    } catch (error) {
      console.warn(`⚠️ Preconnect failed for domain ${domain}:`, error);
      this.activeConnections.delete(key);
    }
  }

  private async preconnectOrigin(origin: string): Promise<void> {
    if (this.activeConnections.has(`origin:${origin}`)) {
      return;
    }

    const key = `origin:${origin}`;
    this.activeConnections.set(key, true);

    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      document.head.appendChild(link);
      
      console.log(`🔗 Preconnect initiated for origin: ${origin}`);
    } catch (error) {
      console.warn(`⚠️ Preconnect failed for origin ${origin}:`, error);
      this.activeConnections.delete(key);
    }
  }

  private async preconnectResource(url: string): Promise<void> {
    if (this.activeConnections.has(`resource:${url}`)) {
      return;
    }

    const key = `resource:${url}`;
    this.activeConnections.set(key, true);

    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      document.head.appendChild(link);
      
      console.log(`🔗 Preconnect initiated for resource: ${url}`);
    } catch (error) {
      console.warn(`⚠️ Preconnect failed for resource ${url}:`, error);
      this.activeConnections.delete(key);
    }
  }

  private async preconnectCrossOrigin(origin: string): Promise<void> {
    if (this.activeConnections.has(`cross:${origin}`)) {
      return;
    }

    const key = `cross:${origin}`;
    this.activeConnections.set(key, true);

    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      
      console.log(`🔗 Cross-origin preconnect initiated for: ${origin}`);
    } catch (error) {
      console.warn(`⚠️ Cross-origin preconnect failed for ${origin}:`, error);
      this.activeConnections.delete(key);
    }
  }

  public generatePreconnectHTML(strategyName: string): string {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return '';
    }

    const { connections } = strategy;
    let html = '';

    // DNS prefetch links
    connections.dnsPrefetch.forEach(domain => {
      html += `<link rel="dns-prefetch" href="//${domain}">\n`;
    });

    // Domain preconnects
    connections.domains.forEach(domain => {
      html += `<link rel="preconnect" href="https://${domain}">\n`;
    });

    // Origin preconnects
    connections.origins.forEach(origin => {
      html += `<link rel="preconnect" href="${origin}">\n`;
    });

    // Resource preconnects
    [...connections.resources.fonts, ...connections.resources.stylesheets, ...connections.resources.scripts, ...connections.resources.images].forEach(resource => {
      html += `<link rel="preconnect" href="${resource}">\n`;
    });

    // Cross-origin preconnects
    connections.crossOrigin.forEach(origin => {
      html += `<link rel="preconnect" href="${origin}" crossorigin="anonymous">\n`;
    });

    return html;
  }

  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  public getStrategyInfo(strategyName: string): PreconnectStrategy | undefined {
    return this.strategies.get(strategyName);
  }

  public clearConnections(): void {
    this.activeConnections.clear();
    this.connectionPool.clear();
    
    // Remove all preconnect links from DOM
    const links = document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]');
    links.forEach(link => link.remove());
    
    console.log('🧹 All preconnect connections cleared');
  }

  public getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    strategies: string[];
    domains: string[];
  } {
    const strategies = Array.from(this.strategies.keys());
    const allDomains = new Set<string>();
    
    this.strategies.forEach(strategy => {
      strategy.connections.domains.forEach(domain => allDomains.add(domain));
      strategy.connections.origins.forEach(origin => {
        try {
          allDomains.add(new URL(origin).hostname);
        } catch {
          // Invalid URL, skip
        }
      });
    });

    return {
      totalConnections: allDomains.size,
      activeConnections: this.activeConnections.size,
      strategies,
      domains: Array.from(allDomains)
    };
  }

  public async optimizeForNetwork(networkType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi'): Promise<void> {
    console.log(`📶 Optimizing preconnects for network type: ${networkType}`);
    
    switch (networkType) {
      case 'slow-2g':
      case '2g':
        // Minimal preconnects for slow networks
        await this.executeMinimalStrategy();
        break;
      case '3g':
        // Balanced approach for 3G
        await this.executeStrategy('performance');
        break;
      case '4g':
      case '5g':
      case 'wifi':
        // Full optimization for fast networks
        await this.executeStrategy('critical-domains');
        break;
    }
  }

  private async executeMinimalStrategy(): Promise<void> {
    console.log('📶 Executing minimal preconnect strategy for slow networks');
    
    // Only preconnect to critical domains
    const criticalDomains = ['admin.factory-wager.com', 'api.factory-wager.com'];
    
    for (const domain of criticalDomains) {
      await this.preconnectDomain(domain);
    }
  }
}

// Export singleton instance
export const preconnectManager = PreconnectManager.getInstance();

// Auto-execute critical strategy when available
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await preconnectManager.executeStrategy('critical-domains');
    } catch (error) {
      console.warn('⚠️ Auto preconnect failed:', error);
    }
  });
}

export { PreconnectManager };
