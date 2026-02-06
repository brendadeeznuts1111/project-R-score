/**
 * Enterprise System Call Constants and Risk Metrics
 *
 * Centralized, enterprise-grade system call definitions with
 * performance risk scoring, platform-specific optimizations,
 * and comprehensive metadata for intelligent syscall selection.
 *
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { PerformanceTier } from '../core/core-types';

/**
 * System call platforms enumeration
 */
export enum SyscallPlatform {
  LINUX = 'linux',
  DARWIN = 'darwin',
  WINDOWS = 'windows',
  FALLBACK = 'fallback',
}

/**
 * System call operation types
 */
export enum SyscallOperation {
  COPY_FILE_RANGE = 'copy_file_range',
  SEND_FILE = 'sendfile',
  SPLICE = 'splice',
  CLONE_FILE = 'clone_file',
  FCOPY_FILE = 'fcopyfile',
  FALLBACK_WRITE = 'fallback_write',
  FILE_SINK_STREAM = 'file_sink_stream',
}

/**
 * Performance tiers for system call evaluation
 */
export enum PerformanceTier {
  EXCELLENT = 'excellent', // Optimal performance
  GOOD = 'good', // Good performance
  AVERAGE = 'average', // Acceptable performance
  POOR = 'poor', // Suboptimal, avoid when possible
  LEGACY = 'legacy', // Deprecated, only for compatibility
}

/**
 * Comprehensive system call metadata interface
 */
export interface SyscallMetadata {
  platform: SyscallPlatform;
  riskScore: number; // 0-10, lower is better
  performanceTier: PerformanceTier;
  description: string;
  optimization: string;
  useCase: string;
  alternatives: SyscallOperation[];
  requirements: string[];
  limitations: string[];
}

/**
 * Enterprise system call constants with comprehensive metadata
 */
export const ENTERPRISE_SYSCALL_CONSTANTS: Record<SyscallOperation, SyscallMetadata> = {
  [SyscallOperation.COPY_FILE_RANGE]: {
    platform: SyscallPlatform.LINUX,
    riskScore: 1.0,
    performanceTier: PerformanceTier.EXCELLENT,
    description: 'Zero-copy kernel-level file transfer between file descriptors',
    optimization: 'Kernel-space data transfer, no user-space copying, minimal context switches',
    useCase: 'Large file transfers, backup operations, data migration',
    alternatives: [SyscallOperation.SEND_FILE, SyscallOperation.SPLICE],
    requirements: ['Linux kernel >= 4.5', 'Both FDs must be regular files'],
    limitations: ['Linux only', 'Cannot copy between non-regular files'],
  },

  [SyscallOperation.SEND_FILE]: {
    platform: SyscallPlatform.LINUX,
    riskScore: 1.5,
    performanceTier: PerformanceTier.EXCELLENT,
    description: 'Efficient file-to-socket data transfer',
    optimization: 'Zero-copy from file to network socket, uses DMA when available',
    useCase: 'Static file serving, media streaming, file downloads',
    alternatives: [SyscallOperation.COPY_FILE_RANGE, SyscallOperation.SPLICE],
    requirements: ['Linux kernel >= 2.2', 'Source must be mmap-able file'],
    limitations: ['Source must be file, destination must be socket'],
  },

  [SyscallOperation.SPLICE]: {
    platform: SyscallPlatform.LINUX,
    riskScore: 2.0,
    performanceTier: PerformanceTier.GOOD,
    description: 'Zero-copy data transfer between two file descriptors',
    optimization: 'Pipe-based transfer, avoids user-space copies',
    useCase: 'Proxy servers, data piping, in-memory transfers',
    alternatives: [SyscallOperation.COPY_FILE_RANGE, SyscallOperation.SEND_FILE],
    requirements: ['Linux kernel >= 2.6.17', 'Pipe buffer available'],
    limitations: ['Requires pipe setup', 'More complex error handling'],
  },

  [SyscallOperation.CLONE_FILE]: {
    platform: SyscallPlatform.LINUX,
    riskScore: 0.5,
    performanceTier: PerformanceTier.EXCELLENT,
    description: 'Create lightweight file copy using copy-on-write',
    optimization: 'Metadata-only copy, shared data blocks until modification',
    useCase: 'Snapshot creation, VM images, database backups',
    alternatives: [SyscallOperation.FCOPY_FILE],
    requirements: ['Linux kernel >= 4.5', 'Btrfs or XFS filesystem'],
    limitations: ['Filesystem dependent', 'Not all filesystems support CoW'],
  },

  [SyscallOperation.FCOPY_FILE]: {
    platform: SyscallPlatform.DARWIN,
    riskScore: 1.0,
    performanceTier: PerformanceTier.EXCELLENT,
    description: 'MacOS copy-on-write file cloning',
    optimization: 'APFS clonefiles, instant duplicate creation',
    useCase: 'MacOS applications, iOS development, APFS volumes',
    alternatives: [SyscallOperation.CLONE_FILE],
    requirements: ['MacOS >= 10.12', 'APFS filesystem'],
    limitations: ['MacOS only', 'APFS requirement'],
  },

  [SyscallOperation.FALLBACK_WRITE]: {
    platform: SyscallPlatform.FALLBACK,
    riskScore: 5.0,
    performanceTier: PerformanceTier.AVERAGE,
    description: 'Fallback user-space copy for unsupported platforms',
    optimization: 'Buffered I/O with configurable chunk sizes',
    useCase: 'Cross-platform compatibility, unsupported filesystems',
    alternatives: [],
    requirements: [],
    limitations: ['User-space copies', 'Higher memory usage', 'Slower performance'],
  },

  [SyscallOperation.FILE_SINK_STREAM]: {
    platform: SyscallPlatform.LINUX,
    riskScore: 1.2,
    performanceTier: PerformanceTier.GOOD,
    description: 'Optimized streaming sink for file operations',
    optimization: 'Async I/O with kernel notification, efficient buffer management',
    useCase: 'Log streaming, real-time data capture, monitoring systems',
    alternatives: [SyscallOperation.SPLICE],
    requirements: ['Linux kernel >= 3.10', 'aio support'],
    limitations: ['Complex setup', 'Requires careful buffer management'],
  },
} as const;

// Platform detection and optimal syscall selection
export class SyscallOptimizer {
  private static currentPlatform: SyscallPlatform;

  static {
    // Detect current platform
    if (typeof process !== 'undefined') {
      switch (process.platform) {
        case 'linux':
          this.currentPlatform = SyscallPlatform.LINUX;
          break;
        case 'darwin':
          this.currentPlatform = SyscallPlatform.DARWIN;
          break;
        case 'win32':
          this.currentPlatform = SyscallPlatform.WINDOWS;
          break;
        default:
          this.currentPlatform = SyscallPlatform.FALLBACK;
      }
    } else {
      this.currentPlatform = SyscallPlatform.FALLBACK;
    }
  }

  // Get optimal syscall for current platform and use case
  public static getOptimalSyscall(
    useCase: string,
    options?: {
      sourceType?: 'file' | 'socket' | 'pipe';
      destinationType?: 'file' | 'socket' | 'pipe';
      filesystem?: string;
    }
  ): SyscallOperation {
    const availableSyscalls = Object.entries(ENTERPRISE_SYSCALL_CONSTANTS)
      .filter(([_, metadata]) => metadata.platform === this.currentPlatform)
      .map(([op]) => op as SyscallOperation);

    // Filter by use case
    let filtered = availableSyscalls.filter(op => {
      const meta = ENTERPRISE_SYSCALL_CONSTANTS[op];
      return (
        meta.useCase.toLowerCase().includes(useCase.toLowerCase()) ||
        useCase.toLowerCase().includes(meta.useCase.toLowerCase())
      );
    });

    // Apply additional filters
    if (options) {
      if (options.sourceType === 'file' && options.destinationType === 'socket') {
        filtered = filtered.filter(
          op => op === SyscallOperation.SEND_FILE || op === SyscallOperation.FALLBACK_WRITE
        );
      }

      if (options.filesystem === 'apfs') {
        filtered = filtered.filter(op => op === SyscallOperation.FCOPY_FILE);
      }
    }

    // Return the best performing syscall
    if (filtered.length > 0) {
      // Sort by risk score and performance tier
      filtered.sort((a, b) => {
        const metaA = ENTERPRISE_SYSCALL_CONSTANTS[a];
        const metaB = ENTERPRISE_SYSCALL_CONSTANTS[b];

        // First by performance tier
        const tierOrder = {
          [PerformanceTier.EXCELLENT]: 0,
          [PerformanceTier.GOOD]: 1,
          [PerformanceTier.AVERAGE]: 2,
          [PerformanceTier.POOR]: 3,
          [PerformanceTier.LEGACY]: 4,
        };

        if (tierOrder[metaA.performanceTier] !== tierOrder[metaB.performanceTier]) {
          return tierOrder[metaA.performanceTier] - tierOrder[metaB.performanceTier];
        }

        // Then by risk score
        return metaA.riskScore - metaB.riskScore;
      });

      return filtered[0];
    }

    // Fallback to generic write
    return SyscallOperation.FALLBACK_WRITE;
  }

  // Get syscalls by performance tier
  public static getSyscallsByPerformanceTier(tier: PerformanceTier): SyscallOperation[] {
    return Object.entries(ENTERPRISE_SYSCALL_CONSTANTS)
      .filter(([_, metadata]) => metadata.performanceTier === tier)
      .map(([op]) => op as SyscallOperation);
  }

  // Compare two syscalls
  public static compareSyscalls(
    a: SyscallOperation,
    b: SyscallOperation
  ): {
    better: SyscallOperation | 'equal';
    metrics: {
      performance: number; // -1 = worse, 0 = equal, 1 = better
      risk: number;
      platformSupport: number;
    };
  } {
    const metaA = ENTERPRISE_SYSCALL_CONSTANTS[a];
    const metaB = ENTERPRISE_SYSCALL_CONSTANTS[b];

    const tierOrder = {
      [PerformanceTier.EXCELLENT]: 0,
      [PerformanceTier.GOOD]: 1,
      [PerformanceTier.AVERAGE]: 2,
      [PerformanceTier.POOR]: 3,
      [PerformanceTier.LEGACY]: 4,
    };

    const performance = tierOrder[metaB.performanceTier] - tierOrder[metaA.performanceTier];
    const risk = metaA.riskScore - metaB.riskScore;

    // Platform support score (1 if current platform, 0 otherwise)
    const platformSupport =
      (metaA.platform === this.currentPlatform ? 1 : 0) -
      (metaB.platform === this.currentPlatform ? 1 : 0);

    let better: SyscallOperation | 'equal' = 'equal';
    if (performance > 0 || (performance === 0 && risk < 0)) {
      better = a;
    } else if (performance < 0 || (performance === 0 && risk > 0)) {
      better = b;
    }

    return {
      better,
      metrics: {
        performance,
        risk,
        platformSupport,
      },
    };
  }
}

/**
 * Legacy syscall risk constants for backward compatibility
 * @deprecated Use ENTERPRISE_SYSCALL_CONSTANTS instead
 */
export const SYSCALL_RISKS = {
  LINUX_COPY_FILE_RANGE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.COPY_FILE_RANGE].riskScore,
  LINUX_SENDFILE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.SEND_FILE].riskScore,
  LINUX_SPLICE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.SPLICE].riskScore,
  DARWIN_CLONEFILE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.CLONE_FILE].riskScore,
  DARWIN_FCOPYFILE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.FCOPY_FILE].riskScore,
  FALLBACK_WRITE: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.FALLBACK_WRITE].riskScore,
  FILESINK_STREAM: ENTERPRISE_SYSCALL_CONSTANTS[SyscallOperation.FILE_SINK_STREAM].riskScore,
} as const;

/**
 * Legacy syscall risk constants for backward compatibility
 * @deprecated Use ENTERPRISE_SYSCALL_CONSTANTS instead
 */
export const ENTERPRISE_SYSCALL_RISKS = ENTERPRISE_SYSCALL_CONSTANTS;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Enterprise system call name type
 */
export type EnterpriseSyscallName = keyof typeof ENTERPRISE_SYSCALL_RISKS;

/**
 * Enterprise system call risk type
 */
export type EnterpriseSyscallRisk = (typeof ENTERPRISE_SYSCALL_RISKS)[EnterpriseSyscallName];

/**
 * Legacy syscall name type for backward compatibility
 * @deprecated Use EnterpriseSyscallName instead
 */
export type SyscallName = keyof typeof SYSCALL_RISKS;

/**
 * Legacy syscall risk type for backward compatibility
 * @deprecated Use EnterpriseSyscallRisk instead
 */
export type SyscallRisk = (typeof SYSCALL_RISKS)[SyscallName];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get optimal syscall for current platform
 */
export function getOptimalSyscall(platform: string = process.platform): SyscallOperation {
  return SyscallOptimizer.getOptimalSyscall('general');
}

/**
 * Get syscall metadata
 */
export function getSyscallMetadata(syscall: SyscallOperation): SyscallMetadata {
  return ENTERPRISE_SYSCALL_CONSTANTS[syscall];
}

/**
 * Get syscalls by platform
 */
export function getSyscallsByPlatform(platform: SyscallPlatform): SyscallOperation[] {
  return Object.entries(ENTERPRISE_SYSCALL_CONSTANTS)
    .filter(
      ([_, metadata]) =>
        metadata.platform === platform || metadata.platform === SyscallPlatform.FALLBACK
    )
    .map(([name]) => name as SyscallOperation);
}

/**
 * Get syscalls by performance tier
 */
export function getSyscallsByPerformanceTier(tier: PerformanceTier): SyscallOperation[] {
  return SyscallOptimizer.getSyscallsByPerformanceTier(tier);
}

/**
 * Compare syscall performance (lower risk score is better)
 */
export function compareSyscallPerformance(a: SyscallOperation, b: SyscallOperation): number {
  const comparison = SyscallOptimizer.compareSyscalls(a, b);
  return comparison.metrics.risk;
}

/**
 * Get best performing syscall for operation
 */
export function getBestPerformingSyscall(syscalls: SyscallOperation[]): SyscallOperation {
  return syscalls.reduce((best, current) =>
    compareSyscallPerformance(current, best) < 0 ? current : best
  );
}
