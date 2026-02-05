#!/usr/bin/env bun
// Bun MCP Matrix View v2.0 — Tier-1380 Enhanced Schema
// Enhanced with Versioning, Platform Matrix, and Security Scopes

// Make this a module
export {};

export const BUN_VERSION_CONSTRAINTS = {
  current: "1.3.7",
  matrixSchema: "2.0.0",
  lastAudit: "2026-01-31"
} as const;

export interface BunDocMatrixEntry {
  term: string;
  path: string;
  fullUrl: string;
  bunMinVersion: string;
  stability: "experimental" | "stable" | "deprecated" | "unstable";
  platforms: ("darwin" | "linux" | "win32")[];
  perfBaseline?: { metric: string; comparison: string };
  securityScope: {
    classification: "critical" | "high" | "medium" | "low";
    requiresRoot?: boolean;
    zeroTrustEnforced: boolean;
  };
  changelogFeed?: string;
  requiredFlags?: string[];
  breakingSince?: string[];
  crossRefs?: string[];
  category: "runtime" | "bundler" | "pm" | "security" | "storage" | "network";
}

export const BUN_DOC_MAP: BunDocMatrixEntry[] = [
  // Core Runtime
  {
    term: "fetch",
    path: "guides/http/fetch",
    fullUrl: "https://bun.com/docs/guides/http/fetch",
    bunMinVersion: "1.0.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "req/sec", comparison: "1.8x node-fetch" },
    securityScope: { classification: "high", zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=fetch",
    crossRefs: ["Bun.serve", "Headers", "Request"],
    category: "network"
  },
  {
    term: "Bun.serve",
    path: "api/http",
    fullUrl: "https://bun.com/docs/api/http",
    bunMinVersion: "0.1.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "throughput", comparison: "4x Node.js http" },
    securityScope: { classification: "critical", requiresRoot: false, zeroTrustEnforced: true },
    breakingSince: ["1.0.20"],
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=http",
    crossRefs: ["fetch", "Bun.file", "WebSocket"],
    category: "network"
  },
  {
    term: "Bun.file",
    path: "api/file-io",
    fullUrl: "https://bun.com/docs/api/file-io",
    bunMinVersion: "0.5.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "read latency", comparison: "2.5x fs.readFile" },
    securityScope: { classification: "medium", zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=file",
    crossRefs: ["Bun.write", "Bun.gzip", "Blob"],
    category: "storage"
  },
  {
    term: "sqlite",
    path: "api/sqlite",
    fullUrl: "https://bun.com/docs/api/sqlite",
    bunMinVersion: "0.6.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "queries/sec", comparison: "3.2x better-sqlite3" },
    securityScope: { classification: "high", requiresRoot: false, zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=sqlite",
    crossRefs: ["bun:sqlite", "Database", "Statement"],
    category: "storage"
  },
  {
    term: "postgres",
    path: "api/sql",
    fullUrl: "https://bun.com/docs/api/sql",
    bunMinVersion: "1.2.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "queries/sec", comparison: "17x node-postgres" },
    securityScope: { classification: "high", zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=postgres",
    crossRefs: ["sql", "SQL", "Bun.sql"],
    category: "storage"
  },
  {
    term: "bun:test",
    path: "test",
    fullUrl: "https://bun.com/docs/test",
    bunMinVersion: "0.5.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "test runner speed", comparison: "20x Jest" },
    securityScope: { classification: "low", zeroTrustEnforced: false },
    requiredFlags: ["--preload"],
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=test",
    crossRefs: ["expect", "describe", "it"],
    category: "runtime"
  },
  {
    term: "password",
    path: "api/password",
    fullUrl: "https://bun.com/docs/api/password",
    bunMinVersion: "1.0.14",
    stability: "stable",
    platforms: ["darwin", "linux"], // Windows: pbkdf2 only, no argon2
    perfBaseline: { metric: "hash ops/sec", comparison: "Native Zig impl" },
    securityScope: { classification: "critical", requiresRoot: false, zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=password",
    crossRefs: ["Bun.hash", "Bun.CryptoHasher"],
    category: "security"
  },
  {
    term: "secrets",
    path: "api/secrets",
    fullUrl: "https://bun.com/docs/api/secrets",
    bunMinVersion: "1.2.0",
    stability: "experimental",
    platforms: ["darwin", "linux"],
    securityScope: { classification: "critical", requiresRoot: true, zeroTrustEnforced: true },
    requiredFlags: ["--experimental-secrets"],
    breakingSince: ["1.2.2"],
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=secrets",
    crossRefs: ["Bun.password", "Bun.env"],
    category: "security"
  },
  {
    term: "s3",
    path: "api/s3",
    fullUrl: "https://bun.com/docs/api/s3",
    bunMinVersion: "1.1.8",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "upload throughput", comparison: "3.5x AWS SDK" },
    securityScope: { classification: "high", zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=s3",
    crossRefs: ["Bun.file", "crypto", "fetch"],
    category: "storage"
  },
  {
    term: "shell",
    path: "api/shell",
    fullUrl: "https://bun.com/docs/api/shell",
    bunMinVersion: "1.0.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "spawn latency", comparison: "45x zx" },
    securityScope: { classification: "critical", requiresRoot: true, zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=shell",
    crossRefs: ["Bun.spawn", "Bun.$"],
    category: "runtime"
  },
  {
    term: "hash",
    path: "api/hash",
    fullUrl: "https://bun.com/docs/api/hash",
    bunMinVersion: "0.7.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "hash throughput", comparison: "wyhash native" },
    securityScope: { classification: "high", zeroTrustEnforced: true },
    crossRefs: ["Bun.CryptoHasher", "Bun.password"],
    category: "security"
  },
  {
    term: "Redis",
    path: "api/redis",
    fullUrl: "https://bun.com/docs/api/redis",
    bunMinVersion: "1.3.0",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    perfBaseline: { metric: "ops/sec", comparison: "7.9x ioredis" },
    securityScope: { classification: "high", zeroTrustEnforced: true },
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=redis",
    crossRefs: ["Bun.sql", "WebSocket"],
    category: "storage"
  },
  {
    term: "mcp",
    path: "mcp",
    fullUrl: "https://bun.com/docs/mcp",
    bunMinVersion: "1.3.5",
    stability: "experimental",
    platforms: ["darwin", "linux", "win32"],
    securityScope: { classification: "medium", zeroTrustEnforced: true },
    requiredFlags: ["--experimental-mcp"],
    changelogFeed: "https://bun.sh/blog/rss.xml#tag=mcp",
    crossRefs: ["Bun.serve", "stdio", "sse"],
    category: "runtime"
  }
];

// Tier-1380 Filter Presets for ACP
export const MATRIX_FILTERS = {
  productionSafe: (entry: BunDocMatrixEntry) =>
    entry.stability === "stable" &&
    !entry.requiredFlags?.length &&
    entry.securityScope.zeroTrustEnforced,

  requiresRootPrivs: (entry: BunDocMatrixEntry) =>
    entry.securityScope.requiresRoot === true,

  platformCompatible: (platform: string) => (entry: BunDocMatrixEntry) =>
    entry.platforms.includes(platform as any),

  minVersion: (v: string) => (entry: BunDocMatrixEntry) => {
    // Simple semver comparison for min version
    const [minMajor, minMinor, minPatch] = entry.bunMinVersion.split('.').map(Number);
    const [reqMajor, reqMinor, reqPatch] = v.split('.').map(Number);

    if (reqMajor > minMajor) return false;
    if (reqMajor < minMajor) return true;
    if (reqMinor > minMinor) return false;
    if (reqMinor < minMinor) return true;
    return reqPatch >= minPatch;
  }
};

// RSS Feed Aggregator
export const CHANGELOG_FEEDS = [
  "https://bun.sh/blog/rss.xml",
  "https://github.com/oven-sh/bun/releases.atom"
];

// Matrix Analyzer Class
export class BunMatrixAnalyzer {
  public entries: BunDocMatrixEntry[];

  constructor() {
    this.entries = BUN_DOC_MAP;
  }

  // Apply multiple filters
  filter(filters: ((e: BunDocMatrixEntry) => boolean)[]): BunDocMatrixEntry[] {
    return this.entries.filter(entry =>
      filters.every(filter => filter(entry))
    );
  }

  // Get entries by category
  getByCategory(category: BunDocMatrixEntry['category']): BunDocMatrixEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  // Get entries by stability
  getByStability(stability: BunDocMatrixEntry['stability']): BunDocMatrixEntry[] {
    return this.entries.filter(e => e.stability === stability);
  }

  // Get platform-specific entries
  getForPlatform(platform: BunDocMatrixEntry['platforms'][0]): BunDocMatrixEntry[] {
    return this.entries.filter(e => e.platforms.includes(platform));
  }

  // Get security-critical entries
  getSecurityCritical(): BunDocMatrixEntry[] {
    return this.entries.filter(e =>
      e.securityScope.classification === 'critical' ||
      e.securityScope.requiresRoot
    );
  }

  // Generate matrix report
  generateReport(): {
    total: number;
    byCategory: Record<string, number>;
    byStability: Record<string, number>;
    platformSupport: Record<string, number>;
    securityBreakdown: Record<string, number>;
  } {
    return {
      total: this.entries.length,
      byCategory: this.entries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStability: this.entries.reduce((acc, e) => {
        acc[e.stability] = (acc[e.stability] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      platformSupport: {
        darwin: this.entries.filter(e => e.platforms.includes('darwin')).length,
        linux: this.entries.filter(e => e.platforms.includes('linux')).length,
        win32: this.entries.filter(e => e.platforms.includes('win32')).length,
      },
      securityBreakdown: this.entries.reduce((acc, e) => {
        acc[e.securityScope.classification] = (acc[e.securityScope.classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // ACP Query Simulation
  queryACP(filters: string[]): BunDocMatrixEntry[] {
    const filterFns: ((e: BunDocMatrixEntry) => boolean)[] = [];

    filters.forEach(filter => {
      if (filter === 'productionSafe') {
        filterFns.push(MATRIX_FILTERS.productionSafe);
      } else if (filter.startsWith('minVersion:')) {
        const version = filter.split(':')[1];
        filterFns.push(MATRIX_FILTERS.minVersion(version));
      } else if (filter.startsWith('platform:')) {
        const platform = filter.split(':')[1];
        filterFns.push(MATRIX_FILTERS.platformCompatible(platform));
      } else if (filter === 'requiresRoot') {
        filterFns.push(MATRIX_FILTERS.requiresRootPrivs);
      }
    });

    return this.filter(filterFns);
  }
}

// Initialize and demonstrate
const analyzer = new BunMatrixAnalyzer();

console.log('\n🔒 Bun MCP Matrix View v2.0 — Tier-1380 Enhanced');
console.log('='.repeat(60));
console.log(`📊 Schema: ${BUN_VERSION_CONSTRAINTS.matrixSchema} | 🦾 Bun: v${BUN_VERSION_CONSTRAINTS.current} | 📅 Last Audit: ${BUN_VERSION_CONSTRAINTS.lastAudit}`);
console.log('');

// Enhanced matrix overview with visual indicators
const report = analyzer.generateReport();

console.log('� Matrix Overview:');
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│ 📦 Total APIs:'.padEnd(25) + report.total.toString().padStart(5) + ' │');
console.log('├─────────────────────────────────────────────────────┤');

// Category breakdown with icons
const categoryIcons = {
  network: '🌐',
  storage: '💾',
  runtime: '⚡',
  security: '🔒',
  bundler: '📦',
  pm: '📋'
};

console.log('│ By Category:');
Object.entries(report.byCategory).forEach(([cat, count]) => {
  const icon = categoryIcons[cat as keyof typeof categoryIcons] || '📄';
  console.log('│   ' + `${icon} ${cat}`.padEnd(20) + count.toString().padStart(5) + ' │');
});

// Stability breakdown with colored indicators
console.log('├─────────────────────────────────────────────────────┤');
console.log('│ By Stability:');
Object.entries(report.byStability).forEach(([stab, count]) => {
  const indicator = stab === 'stable' ? '✅' :
                    stab === 'experimental' ? '🔬' :
                    stab === 'deprecated' ? '⚠️' : '❓';
  console.log('│   ' + `${indicator} ${stab}`.padEnd(20) + count.toString().padStart(5) + ' │');
});

// Platform support with progress bars
console.log('├─────────────────────────────────────────────────────┤');
console.log('│ Platform Support:');
Object.entries(report.platformSupport).forEach(([plat, count]) => {
  const icon = plat === 'darwin' ? '🍎' : plat === 'linux' ? '🐧' : '🪟';
  const percentage = Math.round((count / report.total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 5)).padEnd(20);
  console.log('│   ' + `${icon} ${plat}`.padEnd(15) + bar + ` ${percentage}% │`);
});

// Security classification with severity indicators
console.log('├─────────────────────────────────────────────────────┤');
console.log('│ Security Classification:');
Object.entries(report.securityBreakdown).forEach(([sec, count]) => {
  const indicator = sec === 'critical' ? '🚨' :
                    sec === 'high' ? '⚡' :
                    sec === 'medium' ? '⚠️' : '💚';
  console.log('│   ' + `${indicator} ${sec}`.padEnd(20) + count.toString().padStart(5) + ' │');
});

console.log('└─────────────────────────────────────────────────────┘');

// Enhanced ACP queries with better formatting
console.log('\n🚀 ACP Query Examples:');
console.log('═'.repeat(60));

// Production-safe APIs with performance highlights
const productionSafe = analyzer.queryACP(['productionSafe']);
console.log('\n✅ Production-Safe APIs (' + productionSafe.length + '/' + report.total + '):');
console.log('┌─────────────┬────────────┬─────────────────────────────────┐');
console.log('│ API         │ Category   │ Performance Baseline            │');
console.log('├─────────────┼────────────┼─────────────────────────────────┤');

productionSafe.forEach(api => {
  const apiName = api.term.padEnd(11);
  const category = api.category.padEnd(10);
  const baseline = api.perfBaseline ? api.perfBaseline.comparison.padEnd(31) : 'N/A'.padEnd(31);
  console.log(`│ ${apiName} │ ${category} │ ${baseline} │`);
});
console.log('└─────────────┴────────────┴─────────────────────────────────┘');

// High-security APIs with requirements
const highSecurity = analyzer.getSecurityCritical();
console.log('\n🔒 Security-Critical APIs (' + highSecurity.length + '):');
console.log('┌─────────────┬─────────────┬──────────────┬─────────────────┐');
console.log('│ API         │ Classification │ Root Required │ Zero-Trust      │');
console.log('├─────────────┼─────────────┼──────────────┼─────────────────┤');

highSecurity.forEach(api => {
  const apiName = api.term.padEnd(11);
  const classification = api.securityScope.classification.padEnd(13);
  const rootReq = api.securityScope.requiresRoot ? 'Yes'.padEnd(12) : 'No'.padEnd(12);
  const zeroTrust = api.securityScope.zeroTrustEnforced ? '✅ Enforced'.padEnd(15) : '❌ Not Enforced'.padEnd(15);
  console.log(`│ ${apiName} │ ${classification} │ ${rootReq} │ ${zeroTrust} │`);
});
console.log('└─────────────┴─────────────┴──────────────┴─────────────────┘');

// Platform limitations with visual matrix
console.log('\n🌐 Platform Compatibility Matrix:');
console.log('┌─────────────┬─────────┬─────────┬─────────┬─────────────────┐');
console.log('│ API         │ Darwin  │ Linux   │ Windows │ Notes           │');
console.log('├─────────────┼─────────┼─────────┼─────────┼─────────────────┤');

const allAPIs = analyzer.entries;
allAPIs.forEach(api => {
  const apiName = api.term.padEnd(11);
  const darwin = api.platforms.includes('darwin') ? '✅'.padEnd(7) : '❌'.padEnd(7);
  const linux = api.platforms.includes('linux') ? '✅'.padEnd(7) : '❌'.padEnd(7);
  const windows = api.platforms.includes('win32') ? '✅'.padEnd(7) : '❌'.padEnd(7);
  const notes = (!api.platforms.includes('win32')) ? 'No Windows support' :
                api.requiredFlags ? `Flags: ${api.requiredFlags.join(', ')}` : '';
  console.log(`│ ${apiName} │ ${darwin} │ ${linux} │ ${windows} │ ${notes.padEnd(15)} │`);
});
console.log('└─────────────┴─────────┴─────────┴─────────┴─────────────────┘');

// Performance leaderboard
console.log('\n🏆 Performance Leaderboard:');
console.log('┌─────────────┬─────────────────┬─────────────────────────────────┐');
console.log('│ API         │ Metric           │ Comparison                     │');
console.log('├─────────────┼─────────────────┼─────────────────────────────────┤');

const withPerf = analyzer.entries
  .filter(e => e.perfBaseline)
  .sort((a, b) => {
    const aNum = parseFloat(a.perfBaseline!.comparison) || 0;
    const bNum = parseFloat(b.perfBaseline!.comparison) || 0;
    return bNum - aNum;
  });

withPerf.forEach((api, index) => {
  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
  const apiName = `${medal} ${api.term}`.padEnd(11);
  const metric = api.perfBaseline!.metric.padEnd(15);
  const comparison = api.perfBaseline!.comparison.padEnd(31);
  console.log(`│ ${apiName} │ ${metric} │ ${comparison} │`);
});
console.log('└─────────────┴─────────────────┴─────────────────────────────────┘');

// Breaking changes warning
const withBreaking = analyzer.entries.filter(e => e.breakingSince && e.breakingSince.length > 0);
if (withBreaking.length > 0) {
  console.log('\n⚠️  Breaking Changes Alert:');
  console.log('┌─────────────┬─────────────────┬─────────────────────────────────┐');
  console.log('│ API         │ Breaking Since  │ Affected Versions               │');
  console.log('├─────────────┼─────────────────┼─────────────────────────────────┤');

  withBreaking.forEach(api => {
    const apiName = api.term.padEnd(11);
    const breaking = api.breakingSince!.join(', ').padEnd(15);
    const affected = `>= ${api.breakingSince![0]}`.padEnd(31);
    console.log(`│ ${apiName} │ ${breaking} │ ${affected} │`);
  });
  console.log('└─────────────┴─────────────────┴─────────────────────────────────┘');
}

// Experimental features
const experimental = analyzer.getByStability('experimental');
if (experimental.length > 0) {
  console.log('\n🔬 Experimental Features:');
  console.log('┌─────────────┬─────────────────┬─────────────────────────────────┐');
  console.log('│ API         │ Required Flags   │ Platform Support                │');
  console.log('├─────────────┼─────────────────┼─────────────────────────────────┤');

  experimental.forEach(api => {
    const apiName = api.term.padEnd(11);
    const flags = api.requiredFlags ? api.requiredFlags.join(', ') : 'None'.padEnd(15);
    const platforms = api.platforms.join(', ').padEnd(31);
    console.log(`│ ${apiName} │ ${flags} │ ${platforms} │`);
  });
  console.log('└─────────────┴─────────────────┴─────────────────────────────────┘');
}

console.log('\n' + '═'.repeat(60));
console.log('✅ Column 93 sealed with Tier-1380 traceability! 🔒');
console.log('🚀 Ready for ACP integration with intelligent routing');
console.log('═'.repeat(60));
