#!/usr/bin/env bun
/**
 * Bun SemVer Version Manager
 * Uses native Bun.semver for version management
 */

import { semver } from 'bun';
import { join } from 'path';

// !==!==!===== CONSTANTS !==!==!=====
export const VERSION_CONSTANTS = {
  // **CORE VERSIONS**
  WATER_DASHBOARD_VERSION: '2.0.0',
  BUN_RUNTIME_VERSION: '1.2.21',
  API_VERSION: 'v2',
  SCHEMA_VERSION: '1.0.0',

  // **PACKAGE VERSIONS**
  FIRE22_CORE: '1.5.0',
  PATTERN_WEAVER: '2.1.0',
  SECURITY_SCANNER: '1.3.2',
  TELEGRAM_BOT: '3.0.0-beta.1',

  // **BUILD VERSIONS**
  BUILD_SYSTEM: '1.0.0-rc.2',
  CLOUDFLARE_WORKER: '2.0.0-alpha.5',

  // **VERSION PREFIXES**
  PREFIX_STABLE: 'stable',
  PREFIX_BETA: 'beta',
  PREFIX_ALPHA: 'alpha',
  PREFIX_RC: 'rc',
  PREFIX_DEV: 'dev',
  PREFIX_CANARY: 'canary',
} as const;

// !==!==!===== ENVIRONMENT VARIABLES !==!==!=====
export const ENV_VARIABLES = {
  // **RUNTIME ENVIRONMENT**
  BUN_ENV: process.env.BUN_ENV || 'development',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // **VERSION CONTROL**
  VERSION_STRATEGY: process.env.VERSION_STRATEGY || 'stable',
  AUTO_VERSION_BUMP: process.env.AUTO_VERSION_BUMP === 'true',
  VERSION_TAG_PREFIX: process.env.VERSION_TAG_PREFIX || 'v',

  // **BUILD CONFIGURATION**
  BUILD_PROFILE: process.env.BUILD_PROFILE || 'standard',
  ENABLE_HOT_RELOAD: process.env.ENABLE_HOT_RELOAD !== 'false',

  // **PERFORMANCE SETTINGS**
  BUN_CONFIG_MAX_HTTP_HEADER_SIZE: process.env.BUN_CONFIG_MAX_HTTP_HEADER_SIZE || '16384',
  BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS: process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || '30',
  BUN_CONFIG_VERBOSE_FETCH: process.env.BUN_CONFIG_VERBOSE_FETCH || 'false',

  // **DATABASE CONFIGURATION**
  DATABASE_VERSION: process.env.DATABASE_VERSION || '1.0.0',
  MIGRATION_VERSION: process.env.MIGRATION_VERSION || 'latest',

  // **API SETTINGS**
  API_BASE_URL: process.env.API_BASE_URL || 'https://api.fire22.ag',
  API_VERSION_HEADER: process.env.API_VERSION_HEADER || 'X-API-Version',

  // **MONITORING**
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',
  TELEMETRY_VERSION: process.env.TELEMETRY_VERSION || '1.0.0',
} as const;

// !==!==!===== VERSION PATTERNS !==!==!=====
export const VERSION_PATTERNS = {
  // Pattern matching for version strings
  SEMVER: /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev|canary)(?:\.\d+)?)?$/,
  MAJOR: /^(\d+)\.\d+\.\d+/,
  MINOR: /^\d+\.(\d+)\.\d+/,
  PATCH: /^\d+\.\d+\.(\d+)/,
  PRERELEASE: /^\d+\.\d+\.\d+-(.+)$/,

  // Log pattern matching
  LOG_VERSION: /\[v(\d+\.\d+\.\d+[^\]]*)\]/,
  LOG_TIMESTAMP: /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/,
  LOG_LEVEL: /\[(INFO|WARN|ERROR|DEBUG|TRACE)\]/,
  LOG_MODULE: /\[([A-Z][A-Z0-9_]+)\]/,

  // Package patterns [pk]
  PACKAGE_TAG: /\[pk:([^\]]+)\]/,
  PACKAGE_VERSION: /\[pk:([^@]+)@([^\]]+)\]/,
  PACKAGE_RANGE: /\[pk:([^@]+)@(\^|~|>=?)([^\]]+)\]/,
} as const;

// !==!==!===== VERSION MANAGER CLASS !==!==!=====
export class BunVersionManager {
  private versions: Map<string, string> = new Map();

  constructor() {
    this.initializeVersions();
  }

  private initializeVersions(): void {
    // Initialize with core versions
    Object.entries(VERSION_CONSTANTS).forEach(([key, value]) => {
      if (typeof value === 'string' && VERSION_PATTERNS.SEMVER.test(value)) {
        this.versions.set(key, value);
      }
    });
  }

  /**
   * Compare two versions using Bun.semver
   */
  compareVersions(versionA: string, versionB: string): -1 | 0 | 1 {
    return semver.order(versionA, versionB);
  }

  /**
   * Sort versions using Bun.semver
   */
  sortVersions(versions: string[]): string[] {
    return [...versions].sort((a, b) => semver.order(a, b));
  }

  /**
   * Get latest version from a list
   */
  getLatestVersion(versions: string[]): string {
    const sorted = this.sortVersions(versions);
    return sorted[sorted.length - 1];
  }

  /**
   * Check if version satisfies a range
   */
  satisfiesRange(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  /**
   * Bump version (major, minor, patch)
   */
  bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
    if (!parts) throw new Error(`Invalid version: ${version}`);

    let [, major, minor, patch, prerelease] = parts;

    switch (type) {
      case 'major':
        return `${parseInt(major) + 1}.0.0`;
      case 'minor':
        return `${major}.${parseInt(minor) + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${parseInt(patch) + 1}`;
    }
  }

  /**
   * Parse package tag [pk:name@version]
   */
  parsePackageTag(tag: string): { name: string; version: string } | null {
    const match = tag.match(VERSION_PATTERNS.PACKAGE_VERSION);
    if (!match) return null;
    return { name: match[1], version: match[2] };
  }

  /**
   * Format log with version info
   */
  formatLog(level: string, module: string, message: string, version?: string): string {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const versionTag = version
      ? `[v${version}]`
      : `[v${VERSION_CONSTANTS.WATER_DASHBOARD_VERSION}]`;
    return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${versionTag} ${message}`;
  }

  /**
   * Extract version from log line
   */
  extractVersionFromLog(logLine: string): string | null {
    const match = logLine.match(VERSION_PATTERNS.LOG_VERSION);
    return match ? match[1] : null;
  }

  /**
   * Get all versions as sorted array
   */
  getAllVersions(): Array<{ name: string; version: string; comparison: string }> {
    const dashboardVersion = VERSION_CONSTANTS.WATER_DASHBOARD_VERSION;

    return Array.from(this.versions.entries())
      .map(([name, version]) => ({
        name,
        version,
        comparison: this.getVersionComparison(version, dashboardVersion),
      }))
      .sort((a, b) => semver.order(a.version, b.version));
  }

  private getVersionComparison(version: string, baseVersion: string): string {
    const comparison = semver.order(version, baseVersion);
    switch (comparison) {
      case -1:
        return 'older';
      case 0:
        return 'same';
      case 1:
        return 'newer';
      default:
        return 'unknown';
    }
  }

  /**
   * Validate all versions
   */
  validateVersions(): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    this.versions.forEach((version, name) => {
      if (VERSION_PATTERNS.SEMVER.test(version)) {
        valid.push(`${name}: ${version}`);
      } else {
        invalid.push(`${name}: ${version}`);
      }
    });

    return { valid, invalid };
  }
}

// !==!==!===== EXPORTS !==!==!=====
export const versionManager = new BunVersionManager();

// !==!==!===== CLI INTERFACE !==!==!=====
if (import.meta.main) {
  console.log('\n🔷 BUN SEMVER VERSION MANAGER 🔷\n');
  console.log('='.repeat(50));

  // Display all constants
  console.log('\n📦 **VERSION CONSTANTS**');
  console.log('-'.repeat(50));
  Object.entries(VERSION_CONSTANTS).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(30)} = ${value}`);
  });

  // Display environment variables
  console.log('\n🌍 **ENVIRONMENT VARIABLES**');
  console.log('-'.repeat(50));
  Object.entries(ENV_VARIABLES).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(30)} = ${value}`);
  });

  // Test version sorting
  console.log('\n🔄 **VERSION SORTING TEST**');
  console.log('-'.repeat(50));
  const testVersions = [
    '2.0.0',
    '1.0.0',
    '2.1.0',
    '1.0.0-alpha',
    '1.0.0-beta',
    '1.0.0-rc.1',
    '2.0.0-beta.1',
    '3.0.0-canary',
  ];

  console.log('  Unsorted:', testVersions);
  console.log('  Sorted:  ', versionManager.sortVersions(testVersions));
  console.log('  Latest:  ', versionManager.getLatestVersion(testVersions));

  // Test version comparison
  console.log('\n⚖️  **VERSION COMPARISONS**');
  console.log('-'.repeat(50));
  const comparisons = [
    ['2.0.0', '1.0.0'],
    ['1.0.0', '1.0.0'],
    ['1.0.0-alpha', '1.0.0'],
    ['2.0.0-beta.1', '2.0.0'],
  ];

  comparisons.forEach(([a, b]) => {
    const result = versionManager.compareVersions(a, b);
    const symbol = result === 1 ? '>' : result === -1 ? '<' : '=';
    console.log(`  ${a.padEnd(15)} ${symbol} ${b}`);
  });

  // Test log formatting
  console.log('\n📝 **LOG FORMATTING**');
  console.log('-'.repeat(50));
  console.log(versionManager.formatLog('INFO', 'DASHBOARD', 'System initialized'));
  console.log(versionManager.formatLog('ERROR', 'API', 'Connection failed', '2.0.1'));

  // Test pattern matching
  console.log('\n🔍 **PATTERN MATCHING**');
  console.log('-'.repeat(50));
  const testLogs = [
    '[2024-03-15 10:30:45] [INFO] [DASHBOARD] [v2.0.0] Starting system',
    '[pk:@fire22/core@1.5.0] Package loaded',
    '[pk:bun@^1.2.0] Dependency installed',
  ];

  testLogs.forEach(log => {
    const version = versionManager.extractVersionFromLog(log);
    const pkTag = log.match(VERSION_PATTERNS.PACKAGE_TAG)?.[0];
    if (version) {
      console.log(`  Log version found: ${version}`);
    }
    if (pkTag) {
      const parsed = versionManager.parsePackageTag(pkTag);
      if (parsed) {
        console.log(`  Package found: ${parsed.name}@${parsed.version}`);
      }
    }
  });

  // Validate all versions
  console.log('\n✅ **VERSION VALIDATION**');
  console.log('-'.repeat(50));
  const validation = versionManager.validateVersions();
  console.log(`  Valid versions: ${validation.valid.length}`);
  console.log(`  Invalid versions: ${validation.invalid.length}`);

  console.log('\n' + '='.repeat(50));
  console.log('Version manager initialized successfully!');
}
