/**
 * Component #63: Config-Loading-Patch
 * Logic Tier: Level 1 (Security)
 * Resource Tax: I/O <2ms
 * Parity Lock: 3l4m...5n6o
 * Protocol: bunfig.toml
 *
 * Prevent duplicate config loading per run.
 * Ensures ~/.bunfig.toml is loaded only once per process.
 *
 * @module infrastructure/config-loading-patch
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Loaded config entry
 */
interface LoadedConfigEntry {
  path: string;
  config: Record<string, unknown>;
  loadedAt: number;
  hash: string;
}

/**
 * Config loading result
 */
export interface ConfigLoadResult {
  loaded: boolean;
  cached: boolean;
  config: Record<string, unknown> | null;
  path: string;
  loadTime?: number;
}

/**
 * Config Loading Patch for deduplicated configuration
 * Prevents duplicate ~/.bunfig.toml loading per run
 */
export class ConfigLoadingPatch {
  private static loadedConfigs = new Map<string, LoadedConfigEntry>();
  private static loadingInProgress = new Set<string>();
  private static loadCount = 0;
  private static cacheHits = 0;

  /**
   * Load config with deduplication
   */
  static loadConfig(path: string): ConfigLoadResult {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return this.legacyLoadConfig(path);
    }

    const normalizedPath = this.normalizePath(path);

    // Check for cached config
    const cached = this.loadedConfigs.get(normalizedPath);
    if (cached) {
      this.cacheHits++;
      return {
        loaded: true,
        cached: true,
        config: cached.config,
        path: normalizedPath,
      };
    }

    // Check for circular dependency
    if (this.loadingInProgress.has(normalizedPath)) {
      throw new Error(`Circular config dependency detected: ${normalizedPath}`);
    }

    // Mark as loading
    this.loadingInProgress.add(normalizedPath);
    const startTime = performance.now();

    try {
      const config = this.parseConfigFile(normalizedPath);
      const loadTime = performance.now() - startTime;

      if (config) {
        // Cache the config
        const hash = this.hashConfig(config);
        this.loadedConfigs.set(normalizedPath, {
          path: normalizedPath,
          config,
          loadedAt: Date.now(),
          hash,
        });

        this.loadCount++;
        this.logConfigLoad(normalizedPath, loadTime, false);

        return {
          loaded: true,
          cached: false,
          config,
          path: normalizedPath,
          loadTime,
        };
      }

      return {
        loaded: false,
        cached: false,
        config: null,
        path: normalizedPath,
      };
    } finally {
      this.loadingInProgress.delete(normalizedPath);
    }
  }

  /**
   * Check if config is already loaded
   */
  static isLoaded(path: string): boolean {
    return this.loadedConfigs.has(this.normalizePath(path));
  }

  /**
   * Get cached config
   */
  static getCached(path: string): Record<string, unknown> | null {
    const entry = this.loadedConfigs.get(this.normalizePath(path));
    return entry?.config ?? null;
  }

  /**
   * Invalidate cached config
   */
  static invalidate(path: string): boolean {
    return this.loadedConfigs.delete(this.normalizePath(path));
  }

  /**
   * Clear all cached configs
   */
  static clearConfigCache(): void {
    this.loadedConfigs.clear();
    this.loadingInProgress.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    loadCount: number;
    cacheHits: number;
    cachedConfigs: number;
    hitRate: number;
  } {
    const total = this.loadCount + this.cacheHits;
    return {
      loadCount: this.loadCount,
      cacheHits: this.cacheHits,
      cachedConfigs: this.loadedConfigs.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Normalize config path
   */
  private static normalizePath(path: string): string {
    // Expand ~ to home directory
    if (path.startsWith('~/')) {
      const home = Bun.env.HOME || Bun.env.USERPROFILE || '';
      path = home + path.slice(1);
    }

    // Use absolute path
    if (!path.startsWith('/') && !path.match(/^[A-Za-z]:\\/)) {
      path = `${process.cwd()}/${path}`;
    }

    return path;
  }

  /**
   * Parse config file
   */
  private static parseConfigFile(path: string): Record<string, unknown> | null {
    try {
      const file = Bun.file(path);

      if (file.size === 0) {
        return null;
      }

      // Use synchronous read via Bun.readFileSync or textSync pattern
      const content = require('fs').readFileSync(path, 'utf-8') as string;

      // Determine format from extension
      if (path.endsWith('.toml')) {
        return this.parseTOML(content);
      } else if (path.endsWith('.json')) {
        return JSON.parse(content);
      } else {
        // Try TOML first, then JSON
        try {
          return this.parseTOML(content);
        } catch {
          return JSON.parse(content);
        }
      }
    } catch {
      return null;
    }
  }

  /**
   * Simple TOML parser for bunfig.toml
   */
  private static parseTOML(content: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    let currentSection = '';

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Section header
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch && sectionMatch[1]) {
        currentSection = sectionMatch[1];
        if (!config[currentSection]) {
          config[currentSection] = {};
        }
        continue;
      }

      // Key-value pair
      const kvMatch = trimmed.match(/^([^=]+)=(.+)$/);
      if (kvMatch && kvMatch[1] && kvMatch[2]) {
        const key = kvMatch[1].trim();
        let value: unknown = kvMatch[2].trim();

        // Parse value type
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (/^-?\d+$/.test(value as string)) {
          value = parseInt(value as string, 10);
        } else if (/^-?\d+\.\d+$/.test(value as string)) {
          value = parseFloat(value as string);
        } else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
          value = (value as string).slice(1, -1);
        } else if ((value as string).startsWith("'") && (value as string).endsWith("'")) {
          value = (value as string).slice(1, -1);
        }

        if (currentSection) {
          (config[currentSection] as Record<string, unknown>)[key] = value;
        } else {
          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Hash config for change detection
   */
  private static hashConfig(config: Record<string, unknown>): string {
    const content = JSON.stringify(config);
    return Bun.hash(content).toString(16);
  }

  /**
   * Legacy config loading (no deduplication)
   */
  private static legacyLoadConfig(path: string): ConfigLoadResult {
    try {
      const config = this.parseConfigFile(this.normalizePath(path));
      return {
        loaded: !!config,
        cached: false,
        config,
        path,
      };
    } catch {
      return {
        loaded: false,
        cached: false,
        config: null,
        path,
      };
    }
  }

  /**
   * Log config loading for audit
   */
  private static logConfigLoad(path: string, loadTime: number, cached: boolean): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    console.debug('[ConfigLoadingPatch]', {
      component: 63,
      path: path.replace(Bun.env.HOME || '', '~'),
      loadTime: `${loadTime.toFixed(2)}ms`,
      cached,
      totalLoaded: this.loadedConfigs.size,
      timestamp: Date.now(),
    });
  }

  /**
   * Reset statistics (for testing)
   */
  static resetStats(): void {
    this.loadCount = 0;
    this.cacheHits = 0;
  }
}

/**
 * Zero-cost exports
 */
export const loadConfig = isFeatureEnabled('CATALOG_RESOLUTION')
  ? ConfigLoadingPatch.loadConfig.bind(ConfigLoadingPatch)
  : (path: string) => ({ loaded: false, cached: false, config: null, path });

export const isConfigLoaded = ConfigLoadingPatch.isLoaded.bind(ConfigLoadingPatch);
export const getCachedConfig = ConfigLoadingPatch.getCached.bind(ConfigLoadingPatch);
export const invalidateConfig = ConfigLoadingPatch.invalidate.bind(ConfigLoadingPatch);
export const clearConfigCache = ConfigLoadingPatch.clearConfigCache.bind(ConfigLoadingPatch);
export const getConfigStats = ConfigLoadingPatch.getStats.bind(ConfigLoadingPatch);
