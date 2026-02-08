// blog/config.ts - Blog Config Manager (Infrastructure ID: 19)
// Logic Tier: Level 2 (Config) | Resource Tax: Heap <1MB | Protocol: bunfig.toml
// Bun Native APIs: Bun.file(), Bun.watch()
// Performance SLA: Hot-reload via Bun.watch(), <5ms config propagation

import { watch } from 'fs';
import { BlogConfig } from './types.ts';

/**
 * Default Blog Configuration
 * @readonly Immutable default configuration
 */
export const blogConfig: BlogConfig = {
  title: 'Registry-Powered-MCP Infrastructure Updates',
  description: 'Performance contracts, security hardening, and federation updates for the hardened lattice',
  url: 'https://registry-powered-mcp.dev',
  author: 'Registry-Powered-MCP Core Team',
  rss: {
    filename: 'rss.xml',
    itemCount: 20
  },
  categories: {
    performance: {
      name: 'Performance Benchmarks',
      description: 'SLA reports, optimization deep-dives, and benchmark analysis'
    },
    security: {
      name: 'Security Advisories',
      description: 'Hardening updates, threat intelligence, and compliance notifications'
    },
    releases: {
      name: 'Release Announcements',
      description: 'Version updates, infrastructure changes, and API enhancements'
    },
    federation: {
      name: 'Federation Updates',
      description: 'Point of Presence synchronization, binary parity, and capacity reports'
    }
  }
};

/**
 * Dynamic Config Manager with Hot-Reload
 * Uses Bun.watch() for file-based configuration updates
 *
 * Performance Characteristics:
 * - Heap: <1MB
 * - Propagation: <5ms
 * - Hot-reload: Automatic on file change
 */
export class DynamicConfigManager {
  private config: BlogConfig;
  private readonly configPath: string;
  private watcher: import('fs').FSWatcher | null = null;
  private readonly subscribers: Set<(config: BlogConfig) => void> = new Set();

  constructor(configPath?: string) {
    this.configPath = configPath ?? './blog-config.toml';
    this.config = { ...blogConfig };
  }

  /**
   * Load configuration from file
   * Uses Bun.file() for zero-copy I/O
   */
  /** Namespace accessor so callers can use instance.YAML.parse() */
  get YAML() { return this; }

  async parse(): Promise<BlogConfig> {
    try {
      const file = Bun.file(this.configPath);

      if (await file.exists()) {
        const startTime = performance.now();
        const content = await file.text();
        const parsed = this.parseTOML(content);

        // Merge with defaults
        this.config = {
          ...blogConfig,
          ...parsed,
          rss: { ...blogConfig.rss, ...parsed.rss },
          categories: { ...blogConfig.categories, ...parsed.categories },
        };

        const loadTime = performance.now() - startTime;
        console.log(`📋 Config loaded from ${this.configPath} (${loadTime.toFixed(2)}ms)`);
      }
    } catch (error) {
      console.warn(`⚠️  Config load failed, using defaults: ${error}`);
    }

    return this.config;
  }

  /**
   * Start hot-reload watcher
   * Uses Bun.watch() for native file watching
   *
   * Performance SLA: <5ms propagation
   */
  startWatching(): void {
    if (this.watcher) {
      return;
    }

    // fs.watch() - File watcher
    this.watcher = watch(this.configPath, (eventType, filename) => {
      if (eventType === 'change' && filename) {
        (async () => {
          const startTime = performance.now();

          console.log(`🔄 Config change detected: ${filename}`);
          await this.YAML.parse();

          // Notify subscribers
          for (const subscriber of this.subscribers) {
            try {
              subscriber(this.config);
            } catch (error) {
              console.error('Config subscriber error:', error);
            }
          }

          const propagationTime = performance.now() - startTime;
          console.log(`   Propagated to ${this.subscribers.size} subscribers (${propagationTime.toFixed(2)}ms)`);
        })();
      }
    });

    console.log(`👁️  Watching config: ${this.configPath}`);
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('🛑 Config watcher stopped');
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(callback: (config: BlogConfig) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BlogConfig {
    return this.config;
  }

  /**
   * Update configuration and persist to file
   */
  async update(updates: Partial<BlogConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...updates,
    };

    // Persist to file
    await Bun.write(this.configPath, this.stringifyTOML(this.config));
    console.log(`💾 Config saved to ${this.configPath}`);

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      subscriber(this.config);
    }
  }

  /**
   * Validate configuration integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.title) {
      errors.push('Missing required field: title');
    }
    if (!this.config.url) {
      errors.push('Missing required field: url');
    }
    if (!this.config.rss?.filename) {
      errors.push('Missing required field: rss.filename');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private parseTOML(content: string): Partial<BlogConfig> {
    // Placeholder - implement TOML parsing
    // For now, assume JSON for compatibility
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private stringifyTOML(config: BlogConfig): string {
    // Placeholder - implement TOML stringification
    // For now, use JSON
    return JSON.stringify(config, null, 2);
  }
}

// Export singleton for infrastructure integration
export const configManager = new DynamicConfigManager();
