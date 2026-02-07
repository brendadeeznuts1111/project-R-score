// src/build/bundle-guard.ts
// Threshold-based assertion engine for bundle health checks
import type { BuildMetafile, BundleGuardConfig, GuardViolation, GuardResult, BundleSnapshot } from './types';
import { MetafileAnalyzer } from './metafile-analyzer';
import { createBundleSnapshot } from './metafile-snapshot';

export class BundleGuard {
  private config: BundleGuardConfig;

  constructor(config: BundleGuardConfig) {
    this.config = config;
  }

  check(metafile: BuildMetafile): GuardResult {
    const analyzer = new MetafileAnalyzer(metafile);
    const inputAnalysis = analyzer.getInputAnalysis();
    const outputAnalysis = analyzer.getOutputAnalysis();
    const sizeAnalysis = analyzer.getSizeAnalysis();
    const circularDeps = analyzer.getCircularDependencies();
    const unusedExports = analyzer.getUnusedExports();

    const violations: GuardViolation[] = [];

    if (this.config.maxBundleSize !== undefined && outputAnalysis.totalBytes > this.config.maxBundleSize) {
      violations.push({
        rule: 'maxBundleSize',
        message: `Total bundle size ${outputAnalysis.totalBytes} bytes exceeds limit of ${this.config.maxBundleSize} bytes`,
        actual: outputAnalysis.totalBytes,
        threshold: this.config.maxBundleSize,
        severity: 'error',
      });
    }

    if (this.config.maxFileCount !== undefined && outputAnalysis.totalFiles > this.config.maxFileCount) {
      violations.push({
        rule: 'maxFileCount',
        message: `Output file count ${outputAnalysis.totalFiles} exceeds limit of ${this.config.maxFileCount}`,
        actual: outputAnalysis.totalFiles,
        threshold: this.config.maxFileCount,
        severity: 'error',
      });
    }

    if (this.config.maxInputCount !== undefined && inputAnalysis.totalFiles > this.config.maxInputCount) {
      violations.push({
        rule: 'maxInputCount',
        message: `Input file count ${inputAnalysis.totalFiles} exceeds limit of ${this.config.maxInputCount}`,
        actual: inputAnalysis.totalFiles,
        threshold: this.config.maxInputCount,
        severity: 'error',
      });
    }

    if (this.config.maxCircularDeps !== undefined && circularDeps.length > this.config.maxCircularDeps) {
      violations.push({
        rule: 'maxCircularDeps',
        message: `Circular dependency count ${circularDeps.length} exceeds limit of ${this.config.maxCircularDeps}`,
        actual: circularDeps.length,
        threshold: this.config.maxCircularDeps,
        severity: 'error',
      });
    }

    if (this.config.maxUnusedExports !== undefined && unusedExports.length > this.config.maxUnusedExports) {
      violations.push({
        rule: 'maxUnusedExports',
        message: `Unused export count ${unusedExports.length} exceeds limit of ${this.config.maxUnusedExports}`,
        actual: unusedExports.length,
        threshold: this.config.maxUnusedExports,
        severity: 'warning',
      });
    }

    if (this.config.maxSingleFileSize !== undefined) {
      for (const [path, meta] of Object.entries(metafile.outputs)) {
        if (meta.bytes > this.config.maxSingleFileSize) {
          violations.push({
            rule: 'maxSingleFileSize',
            message: `File ${path} is ${meta.bytes} bytes, exceeds limit of ${this.config.maxSingleFileSize} bytes`,
            actual: meta.bytes,
            threshold: this.config.maxSingleFileSize,
            severity: 'error',
          });
        }
      }
    }

    if (this.config.maxCompressionRatio !== undefined && sizeAnalysis.compressionRatio > this.config.maxCompressionRatio) {
      violations.push({
        rule: 'maxCompressionRatio',
        message: `Compression ratio ${sizeAnalysis.compressionRatio.toFixed(3)} exceeds limit of ${this.config.maxCompressionRatio}`,
        actual: sizeAnalysis.compressionRatio,
        threshold: this.config.maxCompressionRatio,
        severity: 'warning',
      });
    }

    const passed = violations.length === 0;
    const summary = passed
      ? `Bundle guard passed (${violations.length} warnings)`
      : `Bundle guard failed: ${violations.filter((v) => v.severity === 'error').length} errors, ${violations.filter((v) => v.severity === 'warning').length} warnings`;

    return { passed, violations, summary };
  }

  assert(metafile: BuildMetafile): void {
    const result = this.check(metafile);
    if (!result.passed) {
      const details = result.violations
        .filter((v) => v.severity === 'error')
        .map((v) => `  - ${v.message}`)
        .join('\n');
      throw new Error(`Bundle guard assertion failed:\n${details}`);
    }
  }

  snapshot(metafile: BuildMetafile): BundleSnapshot {
    return createBundleSnapshot(metafile);
  }
}

export const GUARD_PRESETS = {
  strict: { maxCircularDeps: 0, maxUnusedExports: 0, maxBundleSize: 500_000 } satisfies BundleGuardConfig,
  moderate: { maxCircularDeps: 0, maxUnusedExports: 10, maxBundleSize: 1_048_576 } satisfies BundleGuardConfig,
  lenient: { maxCircularDeps: 2 } satisfies BundleGuardConfig,
};
