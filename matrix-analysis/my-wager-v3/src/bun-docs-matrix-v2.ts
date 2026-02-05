#!/usr/bin/env bun
// Bun Documentation Matrix v2 - Tier-1380 Traceability
// Enhanced schema with critical fields for production readiness

// Make this a module
export {};

/**
 * Bun Documentation Entry v2 - Enhanced with Tier-1380 traceability
 */
interface BunDocEntry {
  // Core identification
  term: string;
  path: string;

  // Version and stability
  bunMinVersion: `${number}.${number}.${number}`;
  stability: "experimental" | "stable" | "deprecated";
  breakingChanges?: `${number}.${number}.${number}`[];

  // Platform compatibility
  platforms: ("darwin" | "linux" | "win32")[];

  // Performance metrics
  perfProfile?: {
    opsSec: number;
    baseline: string; // e.g., "7.9x vs ioredis"
    memoryMB?: number;
  };

  // Security classification
  security: {
    classification: "high" | "medium" | "low";
    requiresRoot?: boolean;
    scope?: string[]; // e.g., ["crypto", "io"]
  };

  // CLI requirements
  cliFlags?: string[];
  requiredFlags?: string[];

  // Documentation and changelog
  changelogFeed?: URL;
  crossRefs?: string[];

  // Metadata
  lastUpdated: Date;
  tags?: string[];
}

/**
 * Matrix v2 Analyzer - Enhanced with Tier-1380 features
 */
class BunMatrixV2 {
  private entries: Map<string, BunDocEntry> = new Map();
  private currentBunVersion: `${number}.${number}.${number}`;

  constructor() {
    // Get current Bun version
    const version = Bun.version;
    this.currentBunVersion = version as `${number}.${number}.${number}`;
  }

  /**
   * Add or update a documentation entry
   */
  addEntry(entry: Omit<BunDocEntry, 'lastUpdated'>): void {
    const fullEntry: BunDocEntry = {
      ...entry,
      lastUpdated: new Date()
    };
    this.entries.set(fullEntry.term, fullEntry);
  }

  /**
   * Get entries filtered by current Bun version
   */
  getEntriesForCurrentVersion(): BunDocEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => this.isVersionCompatible(entry.bunMinVersion)
    );
  }

  /**
   * Get entries by stability level
   */
  getEntriesByStability(stability: BunDocEntry['stability']): BunDocEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.stability === stability
    );
  }

  /**
   * Get entries by platform
   */
  getEntriesByPlatform(platform: BunDocEntry['platforms'][0]): BunDocEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.platforms.includes(platform)
    );
  }

  /**
   * Get high-security entries
   */
  getHighSecurityEntries(): BunDocEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.security.classification === 'high'
    );
  }

  /**
   * Check if entry is compatible with current Bun version
   */
  private isVersionCompatible(minVersion: string): boolean {
    const [currentMajor, currentMinor, currentPatch] = this.currentBunVersion.split('.').map(Number);
    const [minMajor, minMinor, minPatch] = minVersion.split('.').map(Number);

    if (currentMajor > minMajor) return true;
    if (currentMajor < minMajor) return false;
    if (currentMinor > minMinor) return true;
    if (currentMinor < minMinor) return false;
    return currentPatch >= minPatch;
  }

  /**
   * Generate matrix report for CI/CD
   */
  generateMatrixReport(): {
    total: number;
    compatible: number;
    experimental: number;
    deprecated: number;
    highSecurity: number;
    platformBreakdown: Record<string, number>;
  } {
    const entries = Array.from(this.entries.values());
    const compatible = entries.filter(e => this.isVersionCompatible(e.bunMinVersion));

    return {
      total: entries.length,
      compatible: compatible.length,
      experimental: entries.filter(e => e.stability === 'experimental').length,
      deprecated: entries.filter(e => e.stability === 'deprecated').length,
      highSecurity: entries.filter(e => e.security.classification === 'high').length,
      platformBreakdown: {
        darwin: entries.filter(e => e.platforms.includes('darwin')).length,
        linux: entries.filter(e => e.platforms.includes('linux')).length,
        win32: entries.filter(e => e.platforms.includes('win32')).length,
      }
    };
  }
}

// Seed with critical Bun APIs (Column 93 data)
const matrixV2 = new BunMatrixV2();

// Core runtime APIs
matrixV2.addEntry({
  term: "Bun.color",
  path: "/runtime/color",
  bunMinVersion: "1.0.0",
  stability: "stable",
  platforms: ["darwin", "linux", "win32"],
  perfProfile: {
    opsSec: 3660964,
    baseline: "Fastest color conversion",
    memoryMB: 0.1
  },
  security: {
    classification: "low",
    scope: ["utility"]
  },
  crossRefs: ["Bun.write", "console.log"],
  tags: ["color", "ansi", "formatting"]
});

matrixV2.addEntry({
  term: "Bun.write",
  path: "/runtime/write-file",
  bunMinVersion: "1.0.0",
  stability: "stable",
  platforms: ["darwin", "linux", "win32"],
  perfProfile: {
    opsSec: 4099901,
    baseline: "4.62x vs console.log",
    memoryMB: 0.2
  },
  security: {
    classification: "medium",
    scope: ["io"]
  },
  crossRefs: ["Bun.file", "Bun.serve"],
  tags: ["io", "file", "write"]
});

matrixV2.addEntry({
  term: "Bun.password",
  path: "/runtime/password",
  bunMinVersion: "1.1.0",
  stability: "stable",
  platforms: ["darwin", "linux"],
  perfProfile: {
    opsSec: 1000,
    baseline: "Argon2id native",
    memoryMB: 2
  },
  security: {
    classification: "high",
    requiresRoot: false,
    scope: ["crypto"]
  },
  tags: ["crypto", "password", "security"]
});

matrixV2.addEntry({
  term: "Bun.inspect.table",
  path: "/utils/inspect",
  bunMinVersion: "1.0.0",
  stability: "experimental",
  platforms: ["darwin", "linux", "win32"],
  security: {
    classification: "low",
    scope: ["utility"]
  },
  tags: ["debug", "table", "experimental"]
});

matrixV2.addEntry({
  term: "Bun.serve",
  path: "/runtime/http/server",
  bunMinVersion: "1.0.0",
  stability: "stable",
  platforms: ["darwin", "linux", "win32"],
  perfProfile: {
    opsSec: 50000,
    baseline: "2x vs Node.js",
    memoryMB: 5
  },
  security: {
    classification: "medium",
    scope: ["network", "http"]
  },
  crossRefs: ["Bun.write", "Bun.file"],
  tags: ["server", "http", "websocket"]
});

matrixV2.addEntry({
  term: "Bun.sqlite",
  path: "/runtime/sqlite",
  bunMinVersion: "1.0.0",
  stability: "stable",
  platforms: ["darwin", "linux", "win32"],
  perfProfile: {
    opsSec: 100000,
    baseline: "3x vs better-sqlite3",
    memoryMB: 10
  },
  security: {
    classification: "medium",
    scope: ["database", "io"]
  },
  tags: ["database", "sqlite", "query"]
});

// Experimental features
matrixV2.addEntry({
  term: "Bun.jsc",
  path: "/runtime/jsc",
  bunMinVersion: "1.2.0",
  stability: "experimental",
  platforms: ["darwin", "linux"],
  requiredFlags: ["--experimental-jsc"],
  security: {
    classification: "high",
    scope: ["vm", "runtime"]
  },
  tags: ["experimental", "javascript-core"]
});

// Export for use in other modules
export { BunDocEntry, BunMatrixV2, matrixV2 };

// Generate and display report
console.log('📊 Bun Documentation Matrix v2 - Tier-1380 Traceability');
console.log('=====================================================\n');

const report = matrixV2.generateMatrixReport();
console.log(`Total Entries: ${report.total}`);
console.log(`Compatible with v${matrixV2['currentBunVersion']}: ${report.compatible}`);
console.log(`Experimental: ${report.experimental}`);
console.log(`Deprecated: ${report.deprecated}`);
console.log(`High Security: ${report.highSecurity}`);
console.log('\nPlatform Support:');
Object.entries(report.platformBreakdown).forEach(([platform, count]) => {
  console.log(`  ${platform}: ${count} APIs`);
});

// Show experimental APIs that would be hidden in production
console.log('\n🔬 Experimental APIs (hidden in production):');
const experimental = matrixV2.getEntriesByStability('experimental');
experimental.forEach(entry => {
  console.log(`  ⚠️  ${entry.term} (v${entry.bunMinVersion}+)`);
});

// Show high-security APIs requiring special handling
console.log('\n🔒 High Security APIs:');
const highSecurity = matrixV2.getHighSecurityEntries();
highSecurity.forEach(entry => {
  const rootReq = entry.security.requiresRoot ? ' (requires root)' : '';
  console.log(`  🔐 ${entry.term}${rootReq}`);
});

console.log('\n✅ Matrix v2 initialized with Tier-1380 traceability!');
