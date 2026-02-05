#!/usr/bin/env bun

/**
 * 🚀 Enhanced Build System with Bun --define Integration
 *
 * Advanced build system that leverages Bun's --define flag for build-time
 * constant injection. This provides zero runtime overhead, immutable values,
 * dead code elimination, and optimized builds.
 *
 * Features:
 * - Build-time constant injection with --define
 * - Environment-specific builds (dev, staging, prod)
 * - Git metadata integration
 * - Feature flag optimization
 * - Cross-platform executable generation
 * - TypeScript declaration generation
 * - Performance optimization through inlining
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
import * as fs from 'fs';
import { join } from 'path';
import { AdvancedProcessManager } from './advanced-process-manager.ts';
import { Logger, PerformanceTimer } from './shared-utilities.ts';

export interface BuildDefines {
  // Version Information
  BUILD_VERSION: string;
  BUILD_TIME: string;
  BUILD_TIMESTAMP: number;
  GIT_COMMIT: string;
  GIT_BRANCH: string;
  GIT_DIRTY: boolean;

  // Environment Configuration
  NODE_ENV: 'development' | 'staging' | 'production';
  ENVIRONMENT: string;
  DEBUG_MODE: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // API Configuration
  API_URL: string;
  API_TIMEOUT: number;
  API_RETRY_ATTEMPTS: number;
  MAX_CONCURRENT_REQUESTS: number;

  // Feature Flags
  ENABLE_ANALYTICS: boolean;
  ENABLE_DEBUG_LOGS: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  ENABLE_SENTRY: boolean;
  ENABLE_P2P_QUEUE: boolean;
  ENABLE_LIVE_CASINO: boolean;
  ENABLE_SPORTS_BETTING: boolean;
  ENABLE_TELEGRAM_BOT: boolean;

  // Fire22 Configuration
  FIRE22_API_URL: string;
  FIRE22_WEBHOOK_SECRET: string;
  FIRE22_TIMEOUT: number;

  // Platform Information
  BUILD_PLATFORM: string;
  BUILD_ARCH: string;
  TARGET_PLATFORM: string;

  // Package Information
  PACKAGE_NAME: string;
  PACKAGE_VERSION: string;
  PACKAGE_DESCRIPTION: string;
  DEPENDENCIES_COUNT: number;

  // Performance Configuration
  CACHE_TTL: number;
  MAX_MEMORY_USAGE: number;
  WORKER_THREADS: number;

  // Security Configuration
  JWT_EXPIRY: string;
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_DURATION: number;
}

export interface BuildConfig {
  target: 'development' | 'staging' | 'production' | 'demo';
  entryPoint: string;
  outputFile: string;
  compile: boolean;
  minify: boolean;
  sourcemap: boolean;
  splitting: boolean;
  platform: 'bun' | 'node' | 'browser';
  format: 'esm' | 'cjs' | 'iife';
  external?: string[];
  customDefines?: Record<string, string | number | boolean>;
  features: {
    analytics: boolean;
    debugging: boolean;
    monitoring: boolean;
    experimental: boolean;
  };
}

export class EnhancedBuildSystem {
  private processManager: AdvancedProcessManager;
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.processManager = new AdvancedProcessManager();
  }

  /**
   * 🚀 Build application with comprehensive --define injection
   */
  async build(
    config: BuildConfig
  ): Promise<{ success: boolean; defines: BuildDefines; outputPath: string }> {
    const timer = new PerformanceTimer(`build-${config.target}`);
    Logger.info(`🚀 Starting enhanced build for ${config.target} environment...`);

    try {
      // Generate build-time constants
      timer.checkpoint('generate-defines');
      const defines = await this.generateBuildDefines(config);
      Logger.info(`Generated ${Object.keys(defines).length} build-time constants`);

      // Generate TypeScript declarations
      timer.checkpoint('generate-declarations');
      await this.generateTypeScriptDeclarations(defines);
      Logger.info('Generated TypeScript declarations for build constants');

      // Create build command with --define flags
      timer.checkpoint('create-command');
      const buildCommand = await this.createBuildCommand(config, defines);
      Logger.info(
        `Build command: ${buildCommand.slice(0, 2).join(' ')} [${buildCommand.length - 2} defines]`
      );

      // Execute build
      timer.checkpoint('execute-build');
      const result = await this.processManager.execute({
        command: buildCommand,
        cwd: this.rootPath,
        timeout: 300000, // 5 minutes
        onProgress: data => {
          if (data.type === 'stdout') {
            Logger.debug('Build output:', data.content.trim());
          }
        },
      });

      if (!result.success) {
        throw new Error(`Build failed: ${result.stderr}`);
      }

      // Post-build optimization
      timer.checkpoint('post-build');
      await this.performPostBuildOptimizations(config, result);

      const perfResult = timer.finish();
      Logger.performance(
        `Build completed`,
        perfResult.totalTime,
        perfResult.memoryUsage.heapUsed / 1024 / 1024
      );

      return {
        success: true,
        defines,
        outputPath: config.outputFile,
      };
    } catch (error) {
      Logger.error('Build failed', error);
      return {
        success: false,
        defines: {} as BuildDefines,
        outputPath: '',
      };
    }
  }

  /**
   * 🔨 Generate comprehensive build-time constants
   */
  private async generateBuildDefines(config: BuildConfig): Promise<BuildDefines> {
    const packageJson = await this.loadPackageJson();
    const gitInfo = await this.getGitInformation();
    const buildTime = new Date();

    const defines: BuildDefines = {
      // Version Information
      BUILD_VERSION: packageJson.version || '1.0.0',
      BUILD_TIME: buildTime.toISOString(),
      BUILD_TIMESTAMP: buildTime.getTime(),
      GIT_COMMIT: gitInfo.commit,
      GIT_BRANCH: gitInfo.branch,
      GIT_DIRTY: gitInfo.dirty,

      // Environment Configuration
      NODE_ENV: config.target as any,
      ENVIRONMENT: config.target,
      DEBUG_MODE: config.target === 'development' || config.features.debugging,
      LOG_LEVEL: this.getLogLevel(config.target),

      // API Configuration
      API_URL: this.getApiUrl(config.target),
      API_TIMEOUT: this.getApiTimeout(config.target),
      API_RETRY_ATTEMPTS: 3,
      MAX_CONCURRENT_REQUESTS: config.target === 'production' ? 20 : 10,

      // Feature Flags
      ENABLE_ANALYTICS: config.features.analytics && config.target !== 'development',
      ENABLE_DEBUG_LOGS: config.features.debugging || config.target === 'development',
      ENABLE_PERFORMANCE_MONITORING: config.features.monitoring,
      ENABLE_SENTRY: config.target === 'production',
      ENABLE_P2P_QUEUE: true,
      ENABLE_LIVE_CASINO: true,
      ENABLE_SPORTS_BETTING: true,
      ENABLE_TELEGRAM_BOT: true,

      // Fire22 Configuration
      FIRE22_API_URL: this.getFire22ApiUrl(config.target),
      FIRE22_WEBHOOK_SECRET: process.env.FIRE22_WEBHOOK_SECRET || 'dev-secret',
      FIRE22_TIMEOUT: 30000,

      // Platform Information
      BUILD_PLATFORM: process.platform,
      BUILD_ARCH: process.arch,
      TARGET_PLATFORM: config.platform,

      // Package Information
      PACKAGE_NAME: packageJson.name || 'fire22-dashboard-worker',
      PACKAGE_VERSION: packageJson.version || '1.0.0',
      PACKAGE_DESCRIPTION: packageJson.description || '',
      DEPENDENCIES_COUNT: Object.keys(packageJson.dependencies || {}).length,

      // Performance Configuration
      CACHE_TTL: config.target === 'production' ? 3600 : 300, // 1 hour prod, 5 min dev
      MAX_MEMORY_USAGE: config.target === 'production' ? 512 : 256, // MB
      WORKER_THREADS: config.target === 'production' ? 4 : 2,

      // Security Configuration
      JWT_EXPIRY: config.target === 'production' ? '1h' : '24h',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION: 900000, // 15 minutes

      // Custom defines from config
      ...config.customDefines,
    } as BuildDefines;

    return defines;
  }

  /**
   * 📝 Generate TypeScript declarations for build constants
   */
  private async generateTypeScriptDeclarations(defines: BuildDefines): Promise<void> {
    const declarationContent = `// Auto-generated build constants declarations
// This file is generated automatically during the build process
// DO NOT EDIT MANUALLY - Changes will be overwritten

declare global {
${Object.entries(defines)
  .map(([key, value]) => {
    const type =
      typeof value === 'string'
        ? 'string'
        : typeof value === 'number'
          ? 'number'
          : typeof value === 'boolean'
            ? 'boolean'
            : 'any';
    return `  const ${key}: ${type};`;
  })
  .join('\n')}
}

export {};`;

    const declarationPath = join(this.rootPath, 'src/types/build-constants.d.ts');
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    await Bun.write(declarationPath, declarationContent);
    Logger.debug('Generated TypeScript declarations for build constants');
  }

  /**
   * ⚙️ Create build command with --define flags
   */
  private async createBuildCommand(config: BuildConfig, defines: BuildDefines): Promise<string[]> {
    const command = ['bun', 'build'];

    // Entry point
    command.push(config.entryPoint);

    // Output configuration
    if (config.compile) {
      command.push('--compile');
      command.push('--outfile', config.outputFile);
    } else {
      command.push('--outdir', join(this.rootPath, 'dist'));
    }

    // Build options
    command.push('--target', config.platform);
    command.push('--format', config.format);

    if (config.minify) {
      command.push('--minify');
    }

    if (config.sourcemap) {
      command.push('--sourcemap');
    }

    if (config.splitting) {
      command.push('--splitting');
    }

    // External dependencies
    if (config.external && config.external.length > 0) {
      config.external.forEach(ext => {
        command.push('--external', ext);
      });
    }

    // Add all --define flags
    Object.entries(defines).forEach(([key, value]) => {
      const definedValue =
        typeof value === 'string'
          ? `"${value.replace(/"/g, '\\"')}"` // Escape quotes and wrap strings
          : String(value); // Numbers and booleans as-is

      command.push('--define', `${key}=${definedValue}`);
    });

    // Environment-specific process.env defines
    const envDefines = this.getEnvironmentDefines(config.target);
    Object.entries(envDefines).forEach(([key, value]) => {
      const definedValue =
        typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : String(value);

      command.push('--define', `${key}=${definedValue}`);
    });

    return command;
  }

  /**
   * 🌍 Get environment-specific process.env defines
   */
  private getEnvironmentDefines(target: string): Record<string, string | number | boolean> {
    return {
      'process.env.NODE_ENV': target,
      'process.env.API_URL': this.getApiUrl(target),
      'process.env.BUILD_ENV': target,
      'process.env.DEBUG': target === 'development' ? 'true' : 'false',
    };
  }

  /**
   * 📊 Perform post-build optimizations
   */
  private async performPostBuildOptimizations(config: BuildConfig, result: any): Promise<void> {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
    if (config.compile && await Bun.file(config.outputFile).exists()) {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file stat operations
      const stats = await Bun.file(config.outputFile).stat();
      Logger.info(`📦 Executable size: ${this.formatBytes(stats.size)}`);

      // Set executable permissions on Unix systems
      if (process.platform !== 'win32') {
        await this.processManager.execute({
          command: ['chmod', '+x', config.outputFile],
          timeout: 5000,
        });
        Logger.debug('Set executable permissions');
      }
    }
  }

  /**
   * 📊 Build all target environments
   */
  async buildAllTargets(entryPoint: string = 'src/index.ts'): Promise<void> {
    const targets: Array<{ name: string; config: BuildConfig }> = [
      {
        name: 'Development',
        config: {
          target: 'development',
          entryPoint,
          outputFile: join(this.rootPath, 'dist/fire22-dev'),
          compile: true,
          minify: false,
          sourcemap: true,
          splitting: false,
          platform: 'bun',
          format: 'esm',
          features: {
            analytics: false,
            debugging: true,
            monitoring: true,
            experimental: true,
          },
        },
      },
      {
        name: 'Staging',
        config: {
          target: 'staging',
          entryPoint,
          outputFile: join(this.rootPath, 'dist/fire22-staging'),
          compile: true,
          minify: true,
          sourcemap: true,
          splitting: false,
          platform: 'bun',
          format: 'esm',
          features: {
            analytics: true,
            debugging: false,
            monitoring: true,
            experimental: false,
          },
        },
      },
      {
        name: 'Production',
        config: {
          target: 'production',
          entryPoint,
          outputFile: join(this.rootPath, 'dist/fire22-production'),
          compile: true,
          minify: true,
          sourcemap: false,
          splitting: false,
          platform: 'bun',
          format: 'esm',
          external: ['sqlite3', 'better-sqlite3'],
          features: {
            analytics: true,
            debugging: false,
            monitoring: true,
            experimental: false,
          },
          customDefines: {
            ENABLE_ANALYTICS: true,
            ENABLE_SENTRY: true,
            LOG_LEVEL: '"warn"',
          },
        },
      },
    ];

    Logger.info('='.repeat(60));
    Logger.info('🚀 Building all target environments...');
    Logger.info('='.repeat(60));

    const results = [];

    for (const { name, config } of targets) {
      Logger.info(`🔨 Building ${name}...`);
      const result = await this.build(config);
      results.push({ name, success: result.success, outputPath: result.outputPath });

      if (result.success) {
        Logger.info(`✅ ${name} build completed: ${result.outputPath}`);
      } else {
        Logger.error(`❌ ${name} build failed`);
      }
    }

    // Summary
    Logger.info('='.repeat(60));
    Logger.info('📊 Build Summary:');
    results.forEach(({ name, success, outputPath }) => {
      const status = success ? '✅ SUCCESS' : '❌ FAILED';
      Logger.info(`  ${status} ${name}: ${outputPath}`);
    });
    Logger.info('='.repeat(60));
  }

  // === UTILITY METHODS ===

  private async loadPackageJson(): Promise<any> {
    const packageJsonPath = join(this.rootPath, 'package.json');
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    try {
      if (await Bun.file(packageJsonPath).exists()) {
        const content = await Bun.file(packageJsonPath).text();
        return JSON.parse(content);
      }
    } catch (error) {
      Logger.warn(`Failed to load package.json: ${error.message}`);
    }
    return {};
  }

  private async getGitInformation(): Promise<{ commit: string; branch: string; dirty: boolean }> {
    try {
      const commitResult = await this.processManager.execute({
        command: ['git', 'rev-parse', 'HEAD'],
        timeout: 5000,
      });

      const branchResult = await this.processManager.execute({
        command: ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
        timeout: 5000,
      });

      const statusResult = await this.processManager.execute({
        command: ['git', 'status', '--porcelain'],
        timeout: 5000,
      });

      return {
        commit: commitResult.success ? commitResult.stdout.trim().substring(0, 8) : 'unknown',
        branch: branchResult.success ? branchResult.stdout.trim() : 'unknown',
        dirty: statusResult.success ? statusResult.stdout.trim().length > 0 : false,
      };
    } catch {
      return { commit: 'unknown', branch: 'unknown', dirty: false };
    }
  }

  private getLogLevel(target: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (target) {
      case 'development':
        return 'debug';
      case 'staging':
        return 'info';
      case 'production':
        return 'warn';
      default:
        return 'info';
    }
  }

  private getApiUrl(target: string): string {
    switch (target) {
      case 'development':
        return 'http://localhost:3000';
      case 'staging':
        return 'https://staging-api.fire22.com';
      case 'production':
        return 'https://api.fire22.com';
      case 'demo':
        return 'https://demo-api.fire22.com';
      default:
        return 'http://localhost:3000';
    }
  }

  private getApiTimeout(target: string): number {
    switch (target) {
      case 'development':
        return 10000; // 10 seconds
      case 'staging':
        return 20000; // 20 seconds
      case 'production':
        return 30000; // 30 seconds
      default:
        return 15000;
    }
  }

  private getFire22ApiUrl(target: string): string {
    switch (target) {
      case 'development':
        return 'https://dev-fire22-api.example.com';
      case 'staging':
        return 'https://staging-fire22-api.example.com';
      case 'production':
        return 'https://fire22-api.example.com';
      default:
        return 'https://dev-fire22-api.example.com';
    }
  }

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
  const buildSystem = new EnhancedBuildSystem();

  if (args.includes('--all')) {
    // Build all targets
    await buildSystem.buildAllTargets();
  } else {
    // Build single target
    const target = args[0] || 'development';
    const entryPoint = args[1] || 'src/index.ts';

    const config: BuildConfig = {
      target: target as any,
      entryPoint,
      outputFile: join(
        process.cwd(),
        `dist/fire22-${target}${process.platform === 'win32' ? '.exe' : ''}`
      ),
      compile: true,
      minify: target === 'production',
      sourcemap: target !== 'production',
      splitting: false,
      platform: 'bun',
      format: 'esm',
      features: {
        analytics: target !== 'development',
        debugging: target === 'development',
        monitoring: true,
        experimental: target === 'development',
      },
    };

    const result = await buildSystem.build(config);
    process.exit(result.success ? 0 : 1);
  }
}

export default EnhancedBuildSystem;
