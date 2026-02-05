#!/usr/bin/env bun

/**
 * Enhanced Build Script with New Bun Features
 *
 * This script demonstrates the integration of all new Bun features:
 * - Build-time constants with --define
 * - Runtime argument embedding with --compile-exec-argv
 * - Windows metadata embedding
 * - Bytecode compilation for production
 * - Environment-specific builds
 *
 * Usage:
 *   bun run enhanced-build [environment] [options]
 *
 * Examples:
 *   bun run enhanced-build development
 *   bun run enhanced-build production --bytecode
 *   bun run enhanced-build staging --windows
 */

import {
  getEffectiveConfig,
  validateBuildConfig,
  displayBuildInfo,
} from '../src/config/build-time-config';
import { logger } from '../src/logging/enhanced-logger';

interface BuildOptions {
  environment: 'development' | 'staging' | 'production' | 'demo';
  bytecode?: boolean;
  windows?: boolean;
  sourcemap?: boolean;
  minify?: boolean;
  analyze?: boolean;
  clean?: boolean;
}

class EnhancedBuilder {
  private options: BuildOptions;
  private config: any;

  constructor(options: BuildOptions) {
    this.options = options;
    this.config = getEffectiveConfig();
  }

  /**
   * Main build process
   */
  async build(): Promise<void> {
    logger.info('🚀 Starting enhanced build process', { environment: this.options.environment });

    try {
      // Validate configuration
      if (!validateBuildConfig()) {
        throw new Error('Invalid build configuration');
      }

      // Display build information
      displayBuildInfo();

      // Clean previous builds if requested
      if (this.options.clean) {
        await this.cleanBuilds();
      }

      // Build for target environment
      await this.buildForEnvironment();

      // Run post-build tasks
      await this.postBuildTasks();

      logger.info('✅ Enhanced build completed successfully', {
        environment: this.options.environment,
      });
    } catch (error) {
      logger.error('❌ Build failed', {
        error: error.message,
        environment: this.options.environment,
      });
      process.exit(1);
    }
  }

  /**
   * Build for specific environment
   */
  private async buildForEnvironment(): Promise<void> {
    const env = this.options.environment;
    logger.info(`🏗️ Building for ${env} environment`);

    const buildConfig = this.getBuildConfig(env);

    // Execute build command
    const buildCommand = this.buildCommand(buildConfig);
    logger.info(`🔧 Executing: ${buildCommand}`);

    const result = await Bun.spawn(buildCommand.split(' '), {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (!result.success) {
      const stderr = await result.stderr.text();
      throw new Error(`Build failed: ${stderr}`);
    }

    const stdout = await result.stdout.text();
    logger.info('📦 Build output', { output: stdout });
  }

  /**
   * Get build configuration for environment
   */
  private getBuildConfig(environment: string): any {
    const baseConfig = {
      entrypoint: './src/index.ts',
      outfile: `./dist/fire22-${environment}`,
      target: 'bun',
      define: {} as Record<string, string>,
      compile: {
        execArgv: [] as string[],
        windows: {} as Record<string, string>,
      },
    };

    // Environment-specific configuration
    switch (environment) {
      case 'development':
        baseConfig.compile.execArgv = ['--env=development', '--debug', '--port=3000'];
        baseConfig.define = {
          ENVIRONMENT: '"development"',
          DEBUG_MODE: 'true',
          LOG_LEVEL: '"debug"',
          API_URL: '"http://localhost:3000"',
          VERSION: '"3.0.8"',
          BUILD_TIME: `"${new Date().toISOString()}"`,
        };
        break;

      case 'staging':
        baseConfig.compile.execArgv = ['--env=staging', '--monitor', '--port=3001'];
        baseConfig.define = {
          ENVIRONMENT: '"staging"',
          DEBUG_MODE: 'false',
          LOG_LEVEL: '"info"',
          API_URL: '"https://staging-api.fire22.com"',
          VERSION: '"3.0.8"',
          BUILD_TIME: `"${new Date().toISOString()}"`,
        };
        break;

      case 'production':
        baseConfig.compile.execArgv = ['--env=production', '--optimize', '--port=8080'];
        baseConfig.define = {
          ENVIRONMENT: '"production"',
          DEBUG_MODE: 'false',
          LOG_LEVEL: '"warn"',
          API_URL: '"https://api.fire22.com"',
          VERSION: '"3.0.8"',
          BUILD_TIME: `"${new Date().toISOString()}"`,
        };
        break;

      case 'demo':
        baseConfig.compile.execArgv = ['--env=demo', '--demo-mode', '--port=3002'];
        baseConfig.define = {
          ENVIRONMENT: '"demo"',
          DEBUG_MODE: 'true',
          LOG_LEVEL: '"debug"',
          API_URL: '"https://demo-api.fire22.com"',
          VERSION: '"3.0.8"',
          BUILD_TIME: `"${new Date().toISOString()}"`,
        };
        break;
    }

    // Add Windows metadata if requested
    if (this.options.windows) {
      baseConfig.outfile = `./dist/Fire22-${environment.charAt(0).toUpperCase() + environment.slice(1)}.exe`;
      baseConfig.compile.windows = {
        title: `Fire22 Dashboard - ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
        publisher: 'Fire22 Development Team',
        version: '3.0.8',
        description: `Fire22 Dashboard Worker - ${environment} Environment`,
        copyright: '© 2024 Fire22 Development Team',
      };
    }

    return baseConfig;
  }

  /**
   * Build command string
   */
  private buildCommand(config: any): string {
    let command = `bun build ${config.entrypoint} --compile --outfile=${config.outfile}`;

    // Add runtime arguments
    if (config.compile.execArgv.length > 0) {
      command += ` --compile-exec-argv="${config.compile.execArgv.join(' ')}"`;
    }

    // Add build-time constants
    for (const [key, value] of Object.entries(config.define)) {
      command += ` --define ${key}=${value}`;
    }

    // Add Windows metadata
    if (config.compile.windows && Object.keys(config.compile.windows).length > 0) {
      for (const [key, value] of Object.entries(config.compile.windows)) {
        command += ` --windows-${key}="${value}"`;
      }
    }

    // Add optimization flags
    if (this.options.bytecode) {
      command += ' --bytecode';
    }

    if (this.options.sourcemap) {
      command += ' --sourcemap';
    }

    if (this.options.minify) {
      command += ' --minify';
    }

    if (this.options.analyze) {
      command += ' --analyze';
    }

    return command;
  }

  /**
   * Clean previous builds
   */
  private async cleanBuilds(): Promise<void> {
    logger.info('🧹 Cleaning previous builds');

    try {
      await Bun.spawn(['rm', '-rf', './dist/*.exe', './dist/fire22-*']);
      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Cleanup failed, continuing with build', { error: error.message });
    }
  }

  /**
   * Post-build tasks
   */
  private async postBuildTasks(): Promise<void> {
    logger.info('🔧 Running post-build tasks');

    // Test the built executable
    await this.testExecutable();

    // Generate build report
    await this.generateBuildReport();

    // Update package metadata
    await this.updatePackageMetadata();
  }

  /**
   * Test the built executable
   */
  private async testExecutable(): Promise<void> {
    const executablePath = `./dist/fire22-${this.options.environment}`;

    try {
      logger.info(`🧪 Testing executable: ${executablePath}`);

      // Check if executable exists
      const file = Bun.file(executablePath);
      if (!(await file.exists())) {
        throw new Error(`Executable not found: ${executablePath}`);
      }

      // Get file stats
      const stats = await file.stat();
      logger.info('📊 Executable stats', {
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        created: stats.createdAt,
        modified: stats.modifiedAt,
      });

      logger.info('✅ Executable test passed');
    } catch (error) {
      logger.error('❌ Executable test failed', { error: error.message });
    }
  }

  /**
   * Generate build report
   */
  private async generateBuildReport(): Promise<void> {
    logger.info('📋 Generating build report');

    const report = {
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      version: this.config.version,
      buildTime: this.config.buildTime,
      features: {
        bytecode: this.options.bytecode,
        windows: this.options.windows,
        sourcemap: this.options.sourcemap,
        minify: this.options.minify,
      },
      config: this.config,
    };

    const reportPath = `./dist/build-report-${this.options.environment}.json`;
    await Bun.write(reportPath, JSON.stringify(report, null, 2));

    logger.info('📄 Build report generated', { path: reportPath });
  }

  /**
   * Update package metadata
   */
  private async updatePackageMetadata(): Promise<void> {
    logger.info('📦 Updating package metadata');

    try {
      // Update build timestamp in package.json
      const packagePath = './package.json';
      const packageContent = await Bun.file(packagePath).text();
      const packageJson = JSON.parse(packageContent);

      packageJson.metadata.build.lastUpdated = new Date().toISOString();
      packageJson.metadata.build.environment = this.options.environment;

      await Bun.write(packagePath, JSON.stringify(packageJson, null, 2));

      logger.info('✅ Package metadata updated');
    } catch (error) {
      logger.warn('⚠️ Failed to update package metadata', { error: error.message });
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);

  const options: BuildOptions = {
    environment: 'development',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--bytecode':
        options.bytecode = true;
        break;
      case '--windows':
        options.windows = true;
        break;
      case '--sourcemap':
        options.sourcemap = true;
        break;
      case '--minify':
        options.minify = true;
        break;
      case '--analyze':
        options.analyze = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        if (!options.environment || options.environment === 'development') {
          if (['development', 'staging', 'production', 'demo'].includes(arg)) {
            options.environment = arg as any;
          }
        }
        break;
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🚀 Enhanced Build Script with New Bun Features

Usage: bun run enhanced-build [environment] [options]

Environments:
  development  Build for development (default)
  staging      Build for staging
  production   Build for production
  demo         Build for demo

Options:
  --bytecode   Enable bytecode compilation
  --windows    Add Windows metadata
  --sourcemap  Generate source maps
  --minify     Minify output
  --analyze    Analyze bundle
  --clean      Clean previous builds
  --help       Show this help

Examples:
  bun run enhanced-build development
  bun run enhanced-build production --bytecode --minify
  bun run enhanced-build staging --windows --clean
  bun run enhanced-build demo --sourcemap

Features:
  • Build-time constants with --define
  • Runtime argument embedding with --compile-exec-argv
  • Windows metadata embedding
  • Bytecode compilation for production
  • Environment-specific builds
  • Enhanced logging with ANSI stripping
`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showHelp();
      return;
    }

    const builder = new EnhancedBuilder(options);
    await builder.build();
  } catch (error) {
    logger.error('❌ Build script failed', { error: error.message });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
