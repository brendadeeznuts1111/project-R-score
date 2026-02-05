/**
 * Golden Matrix v1.3.3 Integration
 *
 * Bun v1.3.3 infrastructure components integration layer.
 * Extends the Golden Operational Matrix with 5 new components (#55-59).
 *
 * | Version | Components | Status |
 * |:--------|:-----------|:-------|
 * | **v1.3.3-STABLE** | **50 Total** | **INTEGRATED** |
 *
 * New Components:
 * - #55: CompressionStream Engine (Level 0: Streaming)
 * - #56: Standalone Config Controller (Level 3: Build)
 * - #57: Flaky Test Resilience Engine (Level 5: Test)
 * - #58: SQLite 3.51.0 Engine (Level 1: Storage)
 * - #59: Zig 0.15.2 Build Optimizer (Level 3: Build)
 *
 * @module infrastructure
 */

import { isFeatureEnabled, type InfrastructureFeature } from '../types/feature-flags';

// Import v1.3.3 components
import { CompressionStreamEngine } from './compression-stream-engine';
import { StandaloneConfigController } from './standalone-config-controller';
import { FlakyTestResilienceEngine } from './flaky-test-resilience-engine';
import { SQLite3510Engine } from './sqlite-3-51-0-engine';
import { Zig0152BuildOptimizer } from './zig-0-15-2-build-optimizer';

/**
 * Matrix version identifier
 */
export const MATRIX_VERSION = 'v1.3.3-STABLE-BUN-NATIVE';

/**
 * Bun runtime version requirement
 */
export const BUN_VERSION_REQUIREMENT = '>=1.3.3';

/**
 * Component status types
 */
export type ComponentStatus =
  | 'NATIVE'
  | 'DEPLOYED'
  | 'RESILIENT'
  | 'OPTIMIZED';

/**
 * Logic tier levels
 */
export type LogicTier =
  | 'Level 0: Streaming'
  | 'Level 1: Storage'
  | 'Level 3: Build'
  | 'Level 5: Test';

/**
 * Component definition
 */
export interface ComponentDefinition {
  id: string;
  name: string;
  tier: LogicTier;
  resourceTax: string;
  parityLock: string;
  status: ComponentStatus;
  featureFlag: InfrastructureFeature;
  description: string;
}

/**
 * v1.3.3 Component definitions
 */
export const V133_COMPONENTS: readonly ComponentDefinition[] = [
  {
    id: '#55',
    name: 'CompressionStream-Engine',
    tier: 'Level 0: Streaming',
    resourceTax: 'CPU: <5%',
    parityLock: 't7u8...9v0w',
    status: 'NATIVE',
    featureFlag: 'COMPRESSION_STREAM',
    description: 'Native C++ streaming compression with zero memory buffering',
  },
  {
    id: '#56',
    name: 'Standalone-Config-Controller',
    tier: 'Level 3: Build',
    resourceTax: 'Boot: -60%',
    parityLock: '1x2y...3z4a',
    status: 'DEPLOYED',
    featureFlag: 'STANDALONE_CONFIG',
    description: 'Compiles .env/bunfig into binary for deterministic builds',
  },
  {
    id: '#57',
    name: 'Flaky-Test-Resilience',
    tier: 'Level 5: Test',
    resourceTax: 'CPU: +10%',
    parityLock: 'a1b2...3c4d',
    status: 'RESILIENT',
    featureFlag: 'TEST_RESILIENCE',
    description: 'Retry/repeat modes with exponential backoff and isolation',
  },
  {
    id: '#58',
    name: 'SQLite-3.51.0-Engine',
    tier: 'Level 1: Storage',
    resourceTax: 'I/O: <1ms',
    parityLock: 'c3d4...5e6f',
    status: 'OPTIMIZED',
    featureFlag: 'SQLITE_3_51_0',
    description: 'Query optimizer with prepared statement caching',
  },
  {
    id: '#59',
    name: 'Zig-0.15.2-Build',
    tier: 'Level 3: Build',
    resourceTax: 'Disk: -15%',
    parityLock: 'd4e5...6f7g',
    status: 'OPTIMIZED',
    featureFlag: 'ZIG_BUILD_OPT',
    description: 'Binary size reduction with PGO and DCE',
  },
] as const;

/**
 * Infrastructure matrix statistics
 */
export interface MatrixStats {
  totalComponents: number;
  v133Components: number;
  enabledComponents: number;
  zeroCostComponents: number;
  streamingComponents: number;
  buildComponents: number;
  storageComponents: number;
  testComponents: number;
}

/**
 * Get matrix statistics
 */
export function getMatrixStats(): MatrixStats {
  const enabledCount = V133_COMPONENTS.filter(
    (c) => isFeatureEnabled(c.featureFlag)
  ).length;

  return {
    totalComponents: 50, // 45 base + 5 new
    v133Components: V133_COMPONENTS.length,
    enabledComponents: enabledCount,
    zeroCostComponents: 5, // All v1.3.3 components are zero-cost
    streamingComponents: V133_COMPONENTS.filter(
      (c) => c.tier === 'Level 0: Streaming'
    ).length,
    buildComponents: V133_COMPONENTS.filter(
      (c) => c.tier === 'Level 3: Build'
    ).length,
    storageComponents: V133_COMPONENTS.filter(
      (c) => c.tier === 'Level 1: Storage'
    ).length,
    testComponents: V133_COMPONENTS.filter(
      (c) => c.tier === 'Level 5: Test'
    ).length,
  };
}

/**
 * Get enabled v1.3.3 features
 */
export function getEnabledV133Features(): string[] {
  return V133_COMPONENTS
    .filter((c) => isFeatureEnabled(c.featureFlag))
    .map((c) => c.name);
}

/**
 * Performance targets for v1.3.3
 */
export const PERFORMANCE_TARGETS = {
  // CompressionStream Engine
  compressionCpuOverhead: 5, // <5% CPU
  zstdReduction: 40, // 40% smaller packages

  // Standalone Config Controller
  bootTimeReduction: 60, // -60% boot time
  deterministicBuilds: true,

  // Flaky Test Resilience
  retryOverhead: 5, // <5ms per retry
  maxRetries: 3,

  // SQLite 3.51.0
  queryLatency: 1, // <1ms
  preparedStatementSpeedup: 50, // 50% faster

  // Zig Build Optimizer
  binarySizeReduction: 15, // -15% binary size
  pgoSpeedup: 20, // 10-20% faster hot paths
} as const;

/**
 * Validate component availability
 */
export function validateComponents(): {
  valid: boolean;
  available: string[];
  unavailable: string[];
  warnings: string[];
} {
  const available: string[] = [];
  const unavailable: string[] = [];
  const warnings: string[] = [];

  for (const component of V133_COMPONENTS) {
    if (isFeatureEnabled(component.featureFlag)) {
      available.push(component.name);
    } else {
      unavailable.push(component.name);
      warnings.push(
        `${component.name} is disabled (feature flag: ${component.featureFlag})`
      );
    }
  }

  return {
    valid: unavailable.length === 0,
    available,
    unavailable,
    warnings,
  };
}

/**
 * Get component by ID
 */
export function getComponentById(id: string): ComponentDefinition | undefined {
  return V133_COMPONENTS.find((c) => c.id === id);
}

/**
 * Get components by tier
 */
export function getComponentsByTier(tier: LogicTier): ComponentDefinition[] {
  return V133_COMPONENTS.filter((c) => c.tier === tier);
}

/**
 * Check if compression features are available
 */
export function isCompressionAvailable(): boolean {
  return (
    isFeatureEnabled('COMPRESSION_STREAM') &&
    CompressionStreamEngine.isFormatSupported('gzip')
  );
}

/**
 * Check if standalone build features are available
 */
export function isStandaloneBuildAvailable(): boolean {
  return isFeatureEnabled('STANDALONE_CONFIG');
}

/**
 * Check if test resilience features are available
 */
export function isTestResilienceAvailable(): boolean {
  return isFeatureEnabled('TEST_RESILIENCE');
}

/**
 * Check if SQLite optimizations are available
 */
export function isSQLiteOptimized(): boolean {
  return isFeatureEnabled('SQLITE_3_51_0');
}

/**
 * Check if build optimizations are available
 */
export function isBuildOptimized(): boolean {
  return isFeatureEnabled('ZIG_BUILD_OPT');
}

/**
 * Infrastructure health check
 */
export function performHealthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, boolean>;
  message: string;
} {
  const components: Record<string, boolean> = {};
  let enabledCount = 0;

  for (const component of V133_COMPONENTS) {
    const enabled = isFeatureEnabled(component.featureFlag);
    components[component.name] = enabled;
    if (enabled) enabledCount++;
  }

  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;

  if (enabledCount === V133_COMPONENTS.length) {
    status = 'healthy';
    message = 'All v1.3.3 components are operational';
  } else if (enabledCount >= 3) {
    status = 'degraded';
    message = `${enabledCount}/${V133_COMPONENTS.length} components enabled`;
  } else {
    status = 'unhealthy';
    message = 'Most v1.3.3 components are disabled';
  }

  return { status, components, message };
}

/**
 * Export component classes for direct access
 */
export {
  CompressionStreamEngine,
  StandaloneConfigController,
  FlakyTestResilienceEngine,
  SQLite3510Engine,
  Zig0152BuildOptimizer,
};

/**
 * Infrastructure matrix metadata
 */
export const INFRASTRUCTURE_MATRIX = {
  version: MATRIX_VERSION,
  bunVersion: BUN_VERSION_REQUIREMENT,
  components: V133_COMPONENTS,
  stats: getMatrixStats,
  validate: validateComponents,
  healthCheck: performHealthCheck,
} as const;
