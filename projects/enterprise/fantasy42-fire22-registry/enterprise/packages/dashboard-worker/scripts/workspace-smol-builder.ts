#!/usr/bin/env bun

/**
 * 🏗️ Fire22 Workspace SMOL Builder
 *
 * Builds each of the 6 dashboard-worker sub-workspaces with SMOL optimization,
 * targeting 95% size reduction from the original 57MB monolith to individual
 * optimized Cloudflare Workers packages of 350KB-800KB each.
 *
 * Features:
 * - Individual workspace builds based on workspace-config.json
 * - Size targeting per workspace with compression
 * - Dependency resolution and external handling
 * - Build manifest generation for each workspace
 * - Performance metrics and optimization reporting
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SmolBuildOptimizer, SmolBuildConfig } from './smol-build-optimizer.ts';
import { Logger, PerformanceTimer } from './shared-utilities.ts';

interface WorkspaceConfig {
  name: string;
  description: string;
  version: string;
  main: string;
  target: string;
  maxSize: string;
  dependencies: Record<string, string>;
  include: string[];
  exclude?: string[];
  cloudflare?: {
    compatibility_date: string;
    compatibility_flags: string[];
    limits: {
      cpu_time: number;
      memory: string;
    };
    bindings?: Record<string, any>;
  };
}

interface WorkspaceOrchestrationConfig {
  name: string;
  version: string;
  description: string;
  workspaces: Record<string, WorkspaceConfig>;
  orchestration: any;
  benchmarking: any;
  publishing: any;
  optimization: any;
}

export class WorkspaceSmolBuilder {
  private rootPath: string;
  private config: WorkspaceOrchestrationConfig;
  private totalSizeBefore: number = 57 * 1024 * 1024; // 57MB current monolith

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.config = this.loadWorkspaceConfig();
  }

  /**
   * 🚀 Build all workspaces with SMOL optimization
   */
  async buildAllWorkspaces(): Promise<void> {
    const timer = new PerformanceTimer('workspace-build-all');
    Logger.info('🏗️  Fire22 Workspace SMOL Builder v1.0.0');
    Logger.info('='.repeat(60));
    Logger.info(
      `📦 Building ${Object.keys(this.config.workspaces).length} workspaces with SMOL optimization...`
    );
    Logger.info('='.repeat(60));

    const results: Array<{
      name: string;
      success: boolean;
      size: number;
      compressionRatio: number;
      outputPath: string;
    }> = [];

    // Build workspaces in dependency order
    const buildOrder = this.config.orchestration?.buildOrder || Object.keys(this.config.workspaces);

    for (const workspaceName of buildOrder) {
      const workspace = this.config.workspaces[workspaceName];
      if (!workspace) {
        Logger.warn(`⚠️  Workspace '${workspaceName}' not found in configuration`);
        continue;
      }

      Logger.info(`\n🔨 Building workspace: ${workspace.name}...`);
      Logger.info(`📝 Description: ${workspace.description}`);
      Logger.info(`🎯 Target Size: ${workspace.maxSize}`);

      const result = await this.buildWorkspace(workspaceName, workspace);
      results.push(result);

      if (result.success) {
        Logger.info(
          `✅ ${workspace.name}: ${this.formatBytes(result.size)} (${result.compressionRatio.toFixed(1)}% compressed)`
        );
      } else {
        Logger.error(`❌ ${workspace.name}: Build failed`);
      }
    }

    // Generate summary report
    this.generateBuildSummary(results, timer.finish());
  }

  /**
   * 🔨 Build individual workspace with SMOL optimization
   */
  private async buildWorkspace(
    workspaceName: string,
    workspace: WorkspaceConfig
  ): Promise<{
    name: string;
    success: boolean;
    size: number;
    compressionRatio: number;
    outputPath: string;
  }> {
    const timer = new PerformanceTimer(`build-${workspaceName}`);

    try {
      // Create workspace-specific SMOL config
      const smolConfig = this.createWorkspaceSmolConfig(workspaceName, workspace);
      const optimizer = new SmolBuildOptimizer(smolConfig, this.rootPath);

      // Execute build
      const result = await optimizer.build();

      if (!result.success) {
        throw new Error('Build failed');
      }

      const performanceResult = timer.finish();
      Logger.debug(`Build completed in ${performanceResult.totalTime}ms`);

      return {
        name: workspace.name,
        success: true,
        size: result.analysis.totalSize,
        compressionRatio: result.analysis.compressionRatio,
        outputPath: smolConfig.outputDir,
      };
    } catch (error) {
      Logger.error(`Build failed for ${workspace.name}:`, error);
      return {
        name: workspace.name,
        success: false,
        size: 0,
        compressionRatio: 0,
        outputPath: '',
      };
    }
  }

  /**
   * ⚙️ Create workspace-specific SMOL build configuration
   */
  private createWorkspaceSmolConfig(
    workspaceName: string,
    workspace: WorkspaceConfig
  ): SmolBuildConfig {
    // Determine entry points based on workspace includes
    const entryPoints = this.resolveWorkspaceEntryPoints(workspace);

    // Parse target size (convert "500KB" to bytes)
    const targetSizeBytes = this.parseSize(workspace.maxSize);

    // Create output directory
    const outputDir = join(this.rootPath, 'dist/workspaces', workspaceName);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    return {
      entryPoints,
      outputDir,
      target: workspace.target === 'cloudflare-workers' ? 'bun' : (workspace.target as any),
      format: 'esm',
      minify: true,
      sourcemap: false,
      splitting: true,
      treeshaking: {
        enabled: true,
        presets: ['smallest'],
        manualMarks: [],
      },
      compression: {
        gzip: true,
        brotli: true,
        level: 9,
      },
      optimization: {
        deadCodeElimination: true,
        constFolding: true,
        inlining: true,
        mangling: true,
      },
      advanced: {
        chunkSplitting: targetSizeBytes > 500 * 1024, // Enable chunking for >500KB targets
        dynamicImports: true,
        bundleAnalysis: true,
        performanceHints: true,
      },
      externals: this.resolveWorkspaceExternals(workspace),
      alias: {},
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.SMOL_BUILD': 'true',
        'process.env.WORKSPACE_NAME': `\"${workspace.name}\"`,
        'process.env.TARGET_SIZE': `\"${workspace.maxSize}\"`,
      },
      performance: {
        maxWorkers: 4,
        memoryLimit: this.parseMemoryLimit(workspace.cloudflare?.limits?.memory || '128MB'),
        cacheEnabled: true,
      },
      analysis: {
        bundleAnalyzer: true,
        duplicateDetection: true,
        dependencyGraph: true,
        sizeReporting: true,
      },
    };
  }

  /**
   * 📁 Resolve workspace entry points from include patterns
   */
  private resolveWorkspaceEntryPoints(workspace: WorkspaceConfig): string[] {
    // Start with main file
    const entryPoints = [workspace.main];

    // Add additional includes that are TypeScript/JavaScript files
    workspace.include?.forEach(pattern => {
      if (pattern.endsWith('.ts') || pattern.endsWith('.js')) {
        entryPoints.push(pattern);
      }
    });

    return [...new Set(entryPoints)]; // Remove duplicates
  }

  /**
   * 📦 Resolve workspace external dependencies
   */
  private resolveWorkspaceExternals(workspace: WorkspaceConfig): string[] {
    const externals = ['sqlite3', 'better-sqlite3', 'pg', 'mysql2']; // Standard externals

    // Add workspace dependencies as externals for now
    // In real implementation, we'd resolve these to actual modules
    Object.keys(workspace.dependencies || {}).forEach(dep => {
      if (dep.startsWith('@fire22/')) {
        externals.push(dep);
      }
    });

    return externals;
  }

  /**
   * 🧮 Parse size strings like "500KB", "1MB" to bytes
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(\.\d+)?)([KMGT]?B?)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[3] || 'B').toUpperCase();

    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  /**
   * 🧠 Parse memory limit strings like "128MB" to MB number
   */
  private parseMemoryLimit(memoryStr: string): number {
    const value = parseInt(memoryStr);
    if (memoryStr.includes('GB')) return value * 1024;
    return value; // Assume MB
  }

  /**
   * 📊 Generate comprehensive build summary
   */
  private generateBuildSummary(results: Array<any>, performance: any): void {
    Logger.info('\n' + '='.repeat(60));
    Logger.info('🎉 WORKSPACE BUILD SUMMARY');
    Logger.info('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalSizeAfter = successful.reduce((sum, r) => sum + r.size, 0);
    const sizeReduction = ((this.totalSizeBefore - totalSizeAfter) / this.totalSizeBefore) * 100;

    Logger.info(`📊 Build Results:`);
    Logger.info(`  ✅ Successful: ${successful.length}/${results.length} workspaces`);
    Logger.info(`  ❌ Failed: ${failed.length}/${results.length} workspaces`);
    Logger.info(`  ⏱️  Total Time: ${performance.totalTime}ms`);
    Logger.info(`  🧠 Peak Memory: ${this.formatBytes(performance.memoryUsage.heapUsed)}`);

    Logger.info(`\n📦 Size Analysis:`);
    Logger.info(`  📏 Before (Monolith): ${this.formatBytes(this.totalSizeBefore)}`);
    Logger.info(`  📏 After (Workspaces): ${this.formatBytes(totalSizeAfter)}`);
    Logger.info(
      `  📉 Size Reduction: ${sizeReduction.toFixed(1)}% (${this.formatBytes(this.totalSizeBefore - totalSizeAfter)} saved)`
    );

    if (successful.length > 0) {
      Logger.info(`\n📋 Workspace Details:`);
      successful.forEach(result => {
        const compressionInfo = ` (${result.compressionRatio.toFixed(1)}% compressed)`;
        Logger.info(`  • ${result.name}: ${this.formatBytes(result.size)}${compressionInfo}`);
      });
    }

    if (failed.length > 0) {
      Logger.warn(`\n⚠️  Failed Workspaces:`);
      failed.forEach(result => {
        Logger.warn(`  • ${result.name}: Build failed`);
      });
    }

    Logger.info('\n💡 Next Steps:');
    Logger.info('  1. Review individual workspace outputs in dist/workspaces/');
    Logger.info('  2. Test Cloudflare Workers deployment for each workspace');
    Logger.info('  3. Set up cross-workspace dependency resolution');
    Logger.info('  4. Configure multi-registry publishing pipeline');

    Logger.info('='.repeat(60));
  }

  /**
   * 📁 Load workspace configuration
   */
  private loadWorkspaceConfig(): WorkspaceOrchestrationConfig {
    const configPath = join(this.rootPath, 'workspace-config.json');
    if (!existsSync(configPath)) {
      throw new Error('workspace-config.json not found');
    }

    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  /**
   * 🔧 Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// === CLI INTERFACE ===

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'build-all';

  const builder = new WorkspaceSmolBuilder();

  switch (command) {
    case 'build-all':
      await builder.buildAllWorkspaces();
      break;

    default:
      console.log('Usage: bun workspace-smol-builder.ts [build-all]');
      console.log('  build-all - Build all workspaces with SMOL optimization');
      process.exit(1);
  }
}

export default WorkspaceSmolBuilder;
