#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Advanced Benchmark Orchestrator
 *
 * Enhanced version with sophisticated scoring algorithms and comprehensive metrics
 */

import { $ } from 'bun';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';

interface AdvancedBenchmarkResult {
  package: string;
  timestamp: string;
  metrics: {
    buildTime: number;
    bundleSize: number;
    testCoverage: number;
    securityScore: number;
    performanceScore: number;
    maintainabilityScore: number;
    reliabilityScore: number;
    overallScore: number;
  };
  dependencies: {
    total: number;
    withExactVersions: number;
    securityVulnerabilities: number;
    outdatedDependencies: number;
    matrix: Record<string, string>;
  };
  codeQuality: {
    linesOfCode: number;
    complexity: number;
    testToCodeRatio: number;
    documentationCoverage: number;
  };
  security: {
    auditScore: number;
    dependencyScan: boolean;
    licenseCompliance: boolean;
    knownVulnerabilities: number;
  };
}

// Advanced Scoring Algorithm
class AdvancedScorer {
  static calculateSecurityScore(deps: any, vulnerabilities: number = 0): number {
    const exactDeps = Object.values(deps).filter(
      (v: string) => !v.startsWith('^') && !v.startsWith('~') && !v.includes('*')
    ).length;

    const totalDeps = Object.keys(deps).length;
    const exactRatio = exactDeps / totalDeps;

    // Base score from exact versions (0-40 points)
    const exactScore = exactRatio * 40;

    // Vulnerability penalty (0-30 points deduction)
    const vulnPenalty = Math.min(vulnerabilities * 10, 30);

    // Dependency diversity bonus (0-20 points)
    const diversityBonus = Math.min(totalDeps * 2, 20);

    // License compliance bonus (0-10 points)
    const licenseBonus = 5; // Assume compliant for now

    const rawScore = exactScore + diversityBonus + licenseBonus - vulnPenalty;
    return Math.max(0, Math.min(100, rawScore));
  }

  static calculatePerformanceScore(
    buildTime: number,
    bundleSize: number,
    testTime: number
  ): number {
    // Build time score (0-30 points)
    const buildScore = buildTime < 1000 ? 30 : buildTime < 5000 ? 20 : buildTime < 10000 ? 10 : 0;

    // Bundle size score (0-30 points) - smaller is better
    const bundleScore =
      bundleSize < 1024
        ? 30 // < 1KB
        : bundleSize < 10240
          ? 25 // < 10KB
          : bundleSize < 102400
            ? 20 // < 100KB
            : bundleSize < 1048576
              ? 15 // < 1MB
              : bundleSize < 5242880
                ? 10
                : 0; // < 5MB

    // Test execution time score (0-20 points)
    const testScore = testTime < 500 ? 20 : testTime < 2000 ? 15 : testTime < 5000 ? 10 : 5;

    // Startup time estimation (0-20 points) - based on bundle size
    const startupScore =
      bundleSize < 51200
        ? 20 // < 50KB
        : bundleSize < 102400
          ? 15 // < 100KB
          : bundleSize < 512000
            ? 10
            : 5; // < 500KB

    return Math.min(100, buildScore + bundleScore + testScore + startupScore);
  }

  static calculateMaintainabilityScore(
    loc: number,
    complexity: number,
    testRatio: number,
    docsCoverage: number
  ): number {
    // Lines of code score (0-20 points) - moderate size preferred
    const locScore = loc < 100 ? 20 : loc < 500 ? 18 : loc < 1000 ? 15 : loc < 2000 ? 10 : 5;

    // Complexity score (0-25 points) - lower complexity better
    const complexityScore =
      complexity < 5 ? 25 : complexity < 10 ? 20 : complexity < 20 ? 15 : complexity < 50 ? 10 : 0;

    // Test coverage score (0-30 points)
    const testScore =
      testRatio > 0.8
        ? 30
        : testRatio > 0.6
          ? 25
          : testRatio > 0.4
            ? 20
            : testRatio > 0.2
              ? 15
              : testRatio > 0.1
                ? 10
                : 0;

    // Documentation score (0-25 points)
    const docsScore =
      docsCoverage > 0.8
        ? 25
        : docsCoverage > 0.6
          ? 20
          : docsCoverage > 0.4
            ? 15
            : docsCoverage > 0.2
              ? 10
              : 0;

    return locScore + complexityScore + testScore + docsScore;
  }

  static calculateReliabilityScore(
    testPassRate: number,
    errorRate: number,
    buildStability: number
  ): number {
    // Test pass rate (0-40 points)
    const testScore = testPassRate * 40;

    // Error rate penalty (0-30 points)
    const errorPenalty = Math.min(errorRate * 100, 30);

    // Build stability (0-30 points)
    const stabilityScore = buildStability * 30;

    return Math.max(0, testScore + stabilityScore - errorPenalty);
  }

  static calculateOverallScore(
    security: number,
    performance: number,
    maintainability: number,
    reliability: number
  ): number {
    // Weighted average with emphasis on security and reliability
    return Math.round(
      security * 0.35 + performance * 0.25 + maintainability * 0.2 + reliability * 0.2
    );
  }
}

// Improved Bundle Size Calculator for macOS
async function getBundleSizeMacOS(path: string): Promise<number> {
  try {
    // Use find to get all files and sum their sizes
    const result =
      await $`find ${path} -type f -exec stat -f%z {} + 2>/dev/null || echo 0`.nothrow();
    const size = parseInt(result.stdout.toString().trim()) || 0;
    return size;
  } catch {
    return 0;
  }
}

// Code Analysis Functions
function analyzeCodebase(path: string): { loc: number; complexity: number; docsCoverage: number } {
  let totalLines = 0;
  let docLines = 0;
  let complexity = 0;

  function analyzeFile(filePath: string) {
    if (!existsSync(filePath)) return;

    const content = require('fs').readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    totalLines += lines.length;

    // Count documentation lines (comments)
    docLines += lines.filter(
      line =>
        line.trim().startsWith('//') ||
        line.trim().startsWith('/*') ||
        line.trim().startsWith('*') ||
        line.trim().startsWith('/**')
    ).length;

    // Simple complexity calculation
    complexity += lines.filter(
      line =>
        line.includes('if ') ||
        line.includes('for ') ||
        line.includes('while ') ||
        line.includes('switch ') ||
        line.includes('catch ') ||
        line.includes('&&') ||
        line.includes('||')
    ).length;
  }

  function walkDir(dirPath: string) {
    if (!existsSync(dirPath)) return;

    const items = readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && ['.ts', '.js', '.tsx', '.jsx'].includes(extname(item))) {
        analyzeFile(fullPath);
      }
    }
  }

  walkDir(join(path, 'src'));
  walkDir(join(path, 'lib'));

  return {
    loc: totalLines,
    complexity: Math.max(1, complexity),
    docsCoverage: totalLines > 0 ? docLines / totalLines : 0,
  };
}

export class AdvancedRegistryBenchmarkOrchestrator {
  private packages: any[] = [];
  private results: AdvancedBenchmarkResult[] = [];

  async runAnalysis(): Promise<void> {
    console.log('🔬 Advanced Registry Analysis Starting...\n');

    // Analyze packages
    await this.analyzePackages();

    // Run advanced benchmarks
    await this.runAdvancedBenchmarks();

    // Generate comprehensive report
    await this.generateAdvancedReport();
  }

  private async analyzePackages(): Promise<void> {
    console.log('🔍 Deep Package Analysis...\n');

    const packagesDir = join(dirname(__dirname), 'packages');
    const packageDirs = readdirSync(packagesDir).filter(
      dir => !dir.startsWith('.') && statSync(join(packagesDir, dir)).isDirectory()
    );

    for (const dir of packageDirs) {
      const packagePath = join(packagesDir, dir);
      const packageJsonPath = join(packagePath, 'package.json');

      if (!existsSync(packageJsonPath)) continue;

      const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));

      this.packages.push({
        name: packageJson.name,
        version: packageJson.version,
        path: packagePath,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {},
        optionalDependencies: packageJson.optionalDependencies || {},
      });

      console.log(`📦 Analyzed: ${packageJson.name}@${packageJson.version}`);
    }
  }

  private async runAdvancedBenchmarks(): Promise<void> {
    console.log('\n⚡ Running Advanced Benchmarks...\n');

    for (const pkg of this.packages) {
      console.log(`🔬 Benchmarking ${pkg.name}...`);

      const result: AdvancedBenchmarkResult = {
        package: pkg.name,
        timestamp: new Date().toISOString(),
        metrics: {
          buildTime: 0,
          bundleSize: 0,
          testCoverage: 0,
          securityScore: 0,
          performanceScore: 0,
          maintainabilityScore: 0,
          reliabilityScore: 0,
          overallScore: 0,
        },
        dependencies: {
          total: 0,
          withExactVersions: 0,
          securityVulnerabilities: 0,
          outdatedDependencies: 0,
          matrix: {},
        },
        codeQuality: {
          linesOfCode: 0,
          complexity: 0,
          testToCodeRatio: 0,
          documentationCoverage: 0,
        },
        security: {
          auditScore: 0,
          dependencyScan: false,
          licenseCompliance: true,
          knownVulnerabilities: 0,
        },
      };

      // Code Analysis
      const codeAnalysis = analyzeCodebase(pkg.path);
      result.codeQuality = {
        linesOfCode: codeAnalysis.loc,
        complexity: codeAnalysis.complexity,
        testToCodeRatio: 0.1, // Placeholder
        documentationCoverage: codeAnalysis.docsCoverage,
      };

      // Dependency Analysis
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      result.dependencies.total = Object.keys(allDeps).length;
      result.dependencies.withExactVersions = Object.values(allDeps).filter(
        (v: string) => !v.startsWith('^') && !v.startsWith('~') && !v.includes('*')
      ).length;
      result.dependencies.matrix = allDeps;

      // Build Performance
      const buildStart = Date.now();
      const buildResult = await $`cd ${pkg.path} && bun run build 2>/dev/null`.nothrow();
      result.metrics.buildTime = Date.now() - buildStart;

      // Bundle Size (improved for macOS)
      result.metrics.bundleSize = await getBundleSizeMacOS(join(pkg.path, 'dist'));

      // Test Performance
      const testStart = Date.now();
      const testResult = await $`cd ${pkg.path} && bun test 2>/dev/null`.nothrow();
      const testTime = Date.now() - testStart;
      const testPassRate = testResult.exitCode === 0 ? 0.85 : 0.3;

      // Calculate Advanced Scores
      result.metrics.securityScore = AdvancedScorer.calculateSecurityScore(allDeps);
      result.metrics.performanceScore = AdvancedScorer.calculatePerformanceScore(
        result.metrics.buildTime,
        result.metrics.bundleSize,
        testTime
      );
      result.metrics.maintainabilityScore = AdvancedScorer.calculateMaintainabilityScore(
        result.codeQuality.linesOfCode,
        result.codeQuality.complexity,
        result.codeQuality.testToCodeRatio,
        result.codeQuality.documentationCoverage
      );
      result.metrics.reliabilityScore = AdvancedScorer.calculateReliabilityScore(
        testPassRate,
        0.05, // 5% error rate placeholder
        buildResult.exitCode === 0 ? 0.95 : 0.7
      );
      result.metrics.overallScore = AdvancedScorer.calculateOverallScore(
        result.metrics.securityScore,
        result.metrics.performanceScore,
        result.metrics.maintainabilityScore,
        result.metrics.reliabilityScore
      );

      this.results.push(result);

      console.log(`   📊 Overall Score: ${result.metrics.overallScore}/100`);
      console.log(`      🔒 Security: ${result.metrics.securityScore.toFixed(1)}/100`);
      console.log(`      ⚡ Performance: ${result.metrics.performanceScore.toFixed(1)}/100`);
      console.log(
        `      🛠️  Maintainability: ${result.metrics.maintainabilityScore.toFixed(1)}/100`
      );
      console.log(`      🎯 Reliability: ${result.metrics.reliabilityScore.toFixed(1)}/100`);
      console.log(
        `   📦 Bundle: ${(result.metrics.bundleSize / 1024).toFixed(2)} KB, Build: ${result.metrics.buildTime}ms`
      );
      console.log(
        `   📋 Deps: ${result.dependencies.total} total, ${result.dependencies.withExactVersions} exact\n`
      );
    }
  }

  private async generateAdvancedReport(): Promise<void> {
    const timestamp = Date.now();
    const reportPath = join(__dirname, 'reports', `advanced-report-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      registry: 'fantasy42-fire22-registry',
      analysis: {
        totalPackages: this.packages.length,
        averageOverallScore:
          this.results.reduce((sum, r) => sum + r.metrics.overallScore, 0) / this.results.length,
        averageSecurityScore:
          this.results.reduce((sum, r) => sum + r.metrics.securityScore, 0) / this.results.length,
        averagePerformanceScore:
          this.results.reduce((sum, r) => sum + r.metrics.performanceScore, 0) /
          this.results.length,
        averageMaintainabilityScore:
          this.results.reduce((sum, r) => sum + r.metrics.maintainabilityScore, 0) /
          this.results.length,
        averageReliabilityScore:
          this.results.reduce((sum, r) => sum + r.metrics.reliabilityScore, 0) /
          this.results.length,
        totalDependencies: this.results.reduce((sum, r) => sum + r.dependencies.total, 0),
        totalExactVersions: this.results.reduce(
          (sum, r) => sum + r.dependencies.withExactVersions,
          0
        ),
        exactVersionRatio: 0,
      },
      recommendations: [],
      results: this.results,
    };

    report.analysis.exactVersionRatio =
      report.analysis.totalExactVersions / report.analysis.totalDependencies;

    // Generate recommendations
    if (report.analysis.averageSecurityScore < 70) {
      report.recommendations.push({
        category: 'security',
        priority: 'high',
        message: 'Increase exact dependency versions for better security and reproducibility',
      });
    }

    if (report.analysis.averagePerformanceScore < 75) {
      report.recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'Optimize build times and bundle sizes for better performance',
      });
    }

    if (report.analysis.averageMaintainabilityScore < 60) {
      report.recommendations.push({
        category: 'maintainability',
        priority: 'medium',
        message: 'Improve code documentation and reduce complexity',
      });
    }

    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Advanced report saved: ${reportPath}`);

    // Print summary
    console.log('\n🎯 Advanced Benchmark Summary:');
    console.log(`   📦 Packages: ${report.analysis.totalPackages}`);
    console.log(
      `   🏆 Average Overall Score: ${report.analysis.averageOverallScore.toFixed(1)}/100`
    );
    console.log(
      `   🔒 Average Security Score: ${report.analysis.averageSecurityScore.toFixed(1)}/100`
    );
    console.log(
      `   ⚡ Average Performance Score: ${report.analysis.averagePerformanceScore.toFixed(1)}/100`
    );
    console.log(
      `   🛠️  Average Maintainability Score: ${report.analysis.averageMaintainabilityScore.toFixed(1)}/100`
    );
    console.log(
      `   🎯 Average Reliability Score: ${report.analysis.averageReliabilityScore.toFixed(1)}/100`
    );
    console.log(`   📋 Dependencies: ${report.analysis.totalDependencies} total`);
    console.log(
      `   ✅ Exact Versions: ${report.analysis.totalExactVersions} (${(report.analysis.exactVersionRatio * 100).toFixed(1)}%)`
    );

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        console.log(`   ${rec.priority === 'high' ? '🔴' : '🟡'} ${rec.category}: ${rec.message}`);
      });
    }
  }
}

// CLI runner
async function main() {
  const orchestrator = new AdvancedRegistryBenchmarkOrchestrator();
  await orchestrator.runAnalysis();
}

if (import.meta.main) {
  main().catch(console.error);
}

// Export only the main class
export { AdvancedScorer };
