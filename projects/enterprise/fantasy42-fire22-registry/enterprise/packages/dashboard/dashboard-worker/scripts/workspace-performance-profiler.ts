#!/usr/bin/env bun

/**
 * ⚡ Fire22 Workspace Performance Profiler
 *
 * Profiles performance metrics for all Fire22 workspaces:
 * - Build times
 * - Bundle sizes
 * - Memory usage
 * - Install times
 * - Test execution times
 * - Startup performance
 *
 * @version 1.0.0
 */

import { $ } from 'bun';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
  workspace: string;
  buildTime: number;
  bundleSize: number;
  installTime: number;
  testTime: number;
  startupTime: number;
  memoryUsage: {
    heap: number;
    external: number;
    total: number;
  };
  dependencies: {
    count: number;
    size: number;
  };
  performance: {
    score: number;
    grade: string;
  };
}

class WorkspacePerformanceProfiler {
  private workspacesPath: string;
  private workspaces: string[];
  private results: PerformanceMetrics[];

  constructor() {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.workspaces = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];
    this.results = [];
  }

  /**
   * 🚀 Run performance profiling
   */
  async profile(): Promise<void> {
    console.log('⚡ Fire22 Workspace Performance Profiler');
    console.log('='.repeat(60));
    console.log('🔍 Profiling', this.workspaces.length, 'workspaces...\n');

    for (const workspace of this.workspaces) {
      console.log(`\n📊 Profiling ${workspace}...`);
      const metrics = await this.profileWorkspace(workspace);
      this.results.push(metrics);
      this.printMetrics(metrics);
    }

    // Generate report
    this.generateReport();
    await this.saveReport();
  }

  /**
   * 📊 Profile individual workspace
   */
  private async profileWorkspace(workspace: string): Promise<PerformanceMetrics> {
    const workspacePath = join(this.workspacesPath, workspace);

    const metrics: PerformanceMetrics = {
      workspace,
      buildTime: 0,
      bundleSize: 0,
      installTime: 0,
      testTime: 0,
      startupTime: 0,
      memoryUsage: {
        heap: 0,
        external: 0,
        total: 0,
      },
      dependencies: {
        count: 0,
        size: 0,
      },
      performance: {
        score: 0,
        grade: 'F',
      },
    };

    // Measure install time
    console.log('  📦 Measuring install time...');
    const installStart = performance.now();
    try {
      await $`cd ${workspacePath} && rm -rf node_modules bun.lockb && bun install --production`.quiet();
      metrics.installTime = performance.now() - installStart;
    } catch {
      metrics.installTime = 0;
    }

    // Measure build time
    console.log('  🔨 Measuring build time...');
    const buildStart = performance.now();
    try {
      await $`cd ${workspacePath} && bun run build:standalone`.quiet();
      metrics.buildTime = performance.now() - buildStart;
    } catch {
      metrics.buildTime = 0;
    }

    // Measure bundle size
    console.log('  📏 Measuring bundle size...');
    const distPath = join(workspacePath, 'dist', 'standalone');
    if (existsSync(distPath)) {
      metrics.bundleSize = await this.getDirectorySize(distPath);
    }

    // Measure test time
    console.log('  🧪 Measuring test time...');
    const testStart = performance.now();
    try {
      await $`cd ${workspacePath} && bun test`.quiet();
      metrics.testTime = performance.now() - testStart;
    } catch {
      metrics.testTime = 0;
    }

    // Measure startup time
    console.log('  🚀 Measuring startup time...');
    const startupStart = performance.now();
    try {
      const mainFile = join(workspacePath, 'src', 'index.ts');
      if (existsSync(mainFile)) {
        await $`cd ${workspacePath} && timeout 1s bun run src/index.ts`.quiet();
      }
      metrics.startupTime = performance.now() - startupStart;
    } catch {
      metrics.startupTime = performance.now() - startupStart;
    }

    // Measure memory usage
    console.log('  💾 Measuring memory usage...');
    const memUsage = process.memoryUsage();
    metrics.memoryUsage = {
      heap: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      total: Math.round(memUsage.rss / 1024 / 1024),
    };

    // Count dependencies
    console.log('  📊 Analyzing dependencies...');
    const nodeModulesPath = join(workspacePath, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      try {
        const result = await $`find ${nodeModulesPath} -type d -maxdepth 1 | wc -l`.quiet();
        metrics.dependencies.count = parseInt(result.stdout.toString().trim()) - 1;
        metrics.dependencies.size = await this.getDirectorySize(nodeModulesPath);
      } catch {}
    }

    // Calculate performance score
    metrics.performance = this.calculatePerformanceScore(metrics);

    return metrics;
  }

  /**
   * 📏 Get directory size in KB
   */
  private async getDirectorySize(path: string): Promise<number> {
    try {
      const result = await $`du -sk ${path}`.quiet();
      return parseInt(result.stdout.toString().split('\t')[0]);
    } catch {
      return 0;
    }
  }

  /**
   * 🎯 Calculate performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): { score: number; grade: string } {
    let score = 100;

    // Deduct points for slow operations
    if (metrics.buildTime > 5000) score -= 20;
    else if (metrics.buildTime > 2000) score -= 10;
    else if (metrics.buildTime > 1000) score -= 5;

    if (metrics.installTime > 10000) score -= 20;
    else if (metrics.installTime > 5000) score -= 10;
    else if (metrics.installTime > 2000) score -= 5;

    if (metrics.testTime > 5000) score -= 15;
    else if (metrics.testTime > 2000) score -= 7;

    if (metrics.startupTime > 1000) score -= 10;
    else if (metrics.startupTime > 500) score -= 5;

    // Deduct points for large sizes
    if (metrics.bundleSize > 1000)
      score -= 15; // > 1MB
    else if (metrics.bundleSize > 500)
      score -= 7; // > 500KB
    else if (metrics.bundleSize > 200) score -= 3; // > 200KB

    if (metrics.dependencies.size > 50000)
      score -= 20; // > 50MB
    else if (metrics.dependencies.size > 20000)
      score -= 10; // > 20MB
    else if (metrics.dependencies.size > 10000) score -= 5; // > 10MB

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    return { score, grade };
  }

  /**
   * 📊 Print metrics for a workspace
   */
  private printMetrics(metrics: PerformanceMetrics): void {
    console.log(`  ⏱️  Build Time: ${this.formatTime(metrics.buildTime)}`);
    console.log(`  📦 Bundle Size: ${this.formatSize(metrics.bundleSize)}`);
    console.log(`  📥 Install Time: ${this.formatTime(metrics.installTime)}`);
    console.log(`  🧪 Test Time: ${this.formatTime(metrics.testTime)}`);
    console.log(`  🚀 Startup Time: ${this.formatTime(metrics.startupTime)}`);
    console.log(
      `  💾 Memory: ${metrics.memoryUsage.total}MB (heap: ${metrics.memoryUsage.heap}MB)`
    );
    console.log(
      `  📚 Dependencies: ${metrics.dependencies.count} (${this.formatSize(metrics.dependencies.size)})`
    );
    console.log(
      `  🎯 Performance Score: ${metrics.performance.score}/100 (${metrics.performance.grade})`
    );
  }

  /**
   * ⏱️ Format time in human-readable format
   */
  private formatTime(ms: number): string {
    if (ms === 0) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * 📏 Format size in human-readable format
   */
  private formatSize(kb: number): string {
    if (kb === 0) return '0KB';
    if (kb < 1024) return `${kb}KB`;
    return `${(kb / 1024).toFixed(2)}MB`;
  }

  /**
   * 📊 Generate performance report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE REPORT');
    console.log('='.repeat(60));

    // Sort by performance score
    const sorted = [...this.results].sort((a, b) => b.performance.score - a.performance.score);

    console.log('\n🏆 Performance Rankings:');
    sorted.forEach((metrics, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(
        `${medal} ${metrics.workspace}: ${metrics.performance.score}/100 (${metrics.performance.grade})`
      );
    });

    // Aggregate metrics
    const totals = {
      buildTime: this.results.reduce((sum, m) => sum + m.buildTime, 0),
      bundleSize: this.results.reduce((sum, m) => sum + m.bundleSize, 0),
      installTime: this.results.reduce((sum, m) => sum + m.installTime, 0),
      testTime: this.results.reduce((sum, m) => sum + m.testTime, 0),
      dependencies: this.results.reduce((sum, m) => sum + m.dependencies.count, 0),
      dependenciesSize: this.results.reduce((sum, m) => sum + m.dependencies.size, 0),
      avgScore: Math.round(
        this.results.reduce((sum, m) => sum + m.performance.score, 0) / this.results.length
      ),
    };

    console.log('\n📈 Aggregate Metrics:');
    console.log(`  Total Build Time: ${this.formatTime(totals.buildTime)}`);
    console.log(`  Total Bundle Size: ${this.formatSize(totals.bundleSize)}`);
    console.log(`  Total Install Time: ${this.formatTime(totals.installTime)}`);
    console.log(`  Total Test Time: ${this.formatTime(totals.testTime)}`);
    console.log(
      `  Total Dependencies: ${totals.dependencies} (${this.formatSize(totals.dependenciesSize)})`
    );
    console.log(`  Average Score: ${totals.avgScore}/100`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    for (const metrics of this.results) {
      const recommendations = [];

      if (metrics.buildTime > 5000) {
        recommendations.push('Optimize build process');
      }
      if (metrics.bundleSize > 500) {
        recommendations.push('Reduce bundle size');
      }
      if (metrics.dependencies.count > 50) {
        recommendations.push('Review dependencies');
      }
      if (metrics.performance.score < 70) {
        recommendations.push('Needs performance optimization');
      }

      if (recommendations.length > 0) {
        console.log(`\n  ${metrics.workspace}:`);
        recommendations.forEach(r => console.log(`    • ${r}`));
      }
    }
  }

  /**
   * 💾 Save report to file
   */
  private async saveReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      workspaces: this.results.length,
      results: this.results,
      summary: {
        avgBuildTime: this.results.reduce((sum, m) => sum + m.buildTime, 0) / this.results.length,
        totalBundleSize: this.results.reduce((sum, m) => sum + m.bundleSize, 0),
        avgScore:
          this.results.reduce((sum, m) => sum + m.performance.score, 0) / this.results.length,
        grades: {
          A: this.results.filter(m => m.performance.grade === 'A').length,
          B: this.results.filter(m => m.performance.grade === 'B').length,
          C: this.results.filter(m => m.performance.grade === 'C').length,
          D: this.results.filter(m => m.performance.grade === 'D').length,
          F: this.results.filter(m => m.performance.grade === 'F').length,
        },
      },
    };

    const reportPath = join(process.cwd(), 'workspace-performance-report.json');
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Performance report saved to: ${reportPath}`);
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const profiler = new WorkspacePerformanceProfiler();
  await profiler.profile();
}

export default WorkspacePerformanceProfiler;
