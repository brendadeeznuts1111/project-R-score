#!/usr/bin/env bun
// CI/CD Matrix Filter - Production Build Validation
// Filters APIs based on Tier-1380 traceability fields

// Make this a module
export {};

import { BunMatrixV2, BunDocEntry, matrixV2 } from '../src/bun-docs-matrix-v2.ts';

interface CIFilterOptions {
  targetEnv: 'production' | 'development' | 'testing';
  targetPlatform: 'darwin' | 'linux' | 'win32' | 'all';
  bunVersion?: string;
  allowExperimental?: boolean;
  allowDeprecated?: boolean;
  securityLevel?: 'all' | 'low' | 'medium' | 'high';
}

class CIMatrixFilter {
  private matrix: BunMatrixV2;

  constructor() {
    this.matrix = matrixV2;
  }

  /**
   * Filter entries for CI/CD pipeline
   */
  filterForBuild(options: CIFilterOptions): {
    entries: BunDocEntry[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    let entries = Array.from(this.matrix['entries'].values());

    // Filter by environment
    if (options.targetEnv === 'production' && !options.allowExperimental) {
      const experimental = entries.filter(e => e.stability === 'experimental');
      if (experimental.length > 0) {
        warnings.push(`Found ${experimental.length} experimental APIs hidden in production`);
        entries = entries.filter(e => e.stability !== 'experimental');
      }
    }

    // Filter deprecated APIs
    if (!options.allowDeprecated) {
      const deprecated = entries.filter(e => e.stability === 'deprecated');
      if (deprecated.length > 0) {
        warnings.push(`Found ${deprecated.length} deprecated APIs`);
        entries = entries.filter(e => e.stability !== 'deprecated');
      }
    }

    // Filter by platform
    if (options.targetPlatform !== 'all') {
      const platformEntries = entries.filter(e => e.platforms.includes(options.targetPlatform as 'darwin' | 'linux' | 'win32'));
      const excluded = entries.filter(e => !e.platforms.includes(options.targetPlatform as 'darwin' | 'linux' | 'win32'));
      if (excluded.length > 0) {
        warnings.push(`Excluded ${excluded.length} APIs not supported on ${options.targetPlatform}`);
      }
      entries = platformEntries;
    }

    // Filter by security level
    if (options.securityLevel && options.securityLevel !== 'all') {
      const securityMap = { low: 0, medium: 1, high: 2 };
      const targetLevel = securityMap[options.securityLevel];

      const highSecurity = entries.filter(e =>
        securityMap[e.security.classification] > targetLevel
      );

      if (highSecurity.length > 0) {
        warnings.push(`Found ${highSecurity.length} high-security APIs requiring special handling`);
        entries = entries.filter(e =>
          securityMap[e.security.classification] <= targetLevel
        );
      }
    }

    // Check breaking changes
    if (options.bunVersion) {
      const breaking = entries.filter(e =>
        e.breakingChanges?.some(version => this.isVersionGreater(version, options.bunVersion!))
      );

      if (breaking.length > 0) {
        errors.push(`Found ${breaking.length} APIs with breaking changes for target version ${options.bunVersion}`);
      }
    }

    return { entries, warnings, errors };
  }

  /**
   * Generate build report
   */
  generateBuildReport(filterOptions: CIFilterOptions): void {
    console.log(`🔍 Build Report for ${filterOptions.targetEnv} (${filterOptions.targetPlatform})`);
    console.log('='.repeat(60));

    const result = this.filterForBuild(filterOptions);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log(`\n✅ Included APIs (${result.entries.length}):`);
    result.entries.forEach(entry => {
      const status = entry.stability === 'experimental' ? '🔬' :
                     entry.stability === 'deprecated' ? '⚠️' : '✅';
      const security = entry.security.classification === 'high' ? '🔒' :
                       entry.security.classification === 'medium' ? '🔐' : '🔓';

      console.log(`  ${status} ${security} ${entry.term} (v${entry.bunMinVersion}+)`);

      if (entry.requiredFlags?.length) {
        console.log(`      Flags: ${entry.requiredFlags.join(', ')}`);
      }
    });

    // Performance summary
    const perfEntries = result.entries.filter(e => e.perfProfile);
    if (perfEntries.length > 0) {
      console.log('\n📊 Performance Summary:');
      perfEntries.forEach(entry => {
        const perf = entry.perfProfile!;
        console.log(`  ${entry.term}: ${perf.opsSec.toLocaleString()} ops/sec (${perf.baseline})`);
      });
    }
  }

  /**
   * Check if version1 is greater than version2
   */
  private isVersionGreater(v1: string, v2: string): boolean {
    const [major1, minor1, patch1] = v1.split('.').map(Number);
    const [major2, minor2, patch2] = v2.split('.').map(Number);

    if (major1 !== major2) return major1 > major2;
    if (minor1 !== minor2) return minor1 > minor2;
    return patch1 > patch2;
  }
}

// Demo: Production build for Linux
console.log('🏭 Production Build Filter Demo');
console.log('===============================\n');

const filter = new CIMatrixFilter();

// Production build for Linux
filter.generateBuildReport({
  targetEnv: 'production',
  targetPlatform: 'linux',
  allowExperimental: false,
  allowDeprecated: false,
  securityLevel: 'medium'
});

console.log('\n' + '='.repeat(60) + '\n');

// Development build with experimental features
console.log('🔬 Development Build Filter Demo');
console.log('=================================\n');

filter.generateBuildReport({
  targetEnv: 'development',
  targetPlatform: 'darwin',
  allowExperimental: true,
  allowDeprecated: false,
  securityLevel: 'all'
});

console.log('\n' + '='.repeat(60) + '\n');

// Windows build (showing platform limitations)
console.log('🪟 Windows Build Filter Demo');
console.log('==============================\n');

filter.generateBuildReport({
  targetEnv: 'production',
  targetPlatform: 'win32',
  allowExperimental: false,
  allowDeprecated: false,
  securityLevel: 'all'
});

export { CIMatrixFilter, CIFilterOptions };
