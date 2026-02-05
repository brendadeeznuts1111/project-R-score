#!/usr/bin/env bun

/**
 * 🔧 Fire22 Build Utilities - Shared Build Components
 *
 * Reusable utilities and common patterns for the Fire22 build system.
 * Provides performance monitoring, validation, artifact tracking, and reporting.
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import type { BuildProfile } from '../build.config.ts';

// 📊 Build Statistics Interface
export interface BuildStats {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  success: boolean;
  errors: string[];
  warnings: string[];
  artifacts: BuildArtifact[];
}

// 📦 Build Artifact Interface
export interface BuildArtifact {
  name: string;
  path: string;
  size: number;
  type: 'executable' | 'bundle' | 'package' | 'documentation' | 'metadata';
  checksum?: string;
}

// 🎯 Build Context Interface
export interface BuildContext {
  profile: BuildProfile;
  rootDir: string;
  outputDir: string;
  tempDir: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  startTime: number;
}

// 🏗️ Enhanced Build Constants Interface
export interface BuildConstants {
  // Basic build metadata
  BUILD_VERSION: string;
  BUILD_TIME: string;
  BUILD_NUMBER: string;
  BUILD_TIMESTAMP: number;
  ENVIRONMENT: string;
  DEBUG_MODE: boolean;
  LOG_LEVEL: string;
  API_URL: string;
  BUN_VERSION: string;

  // Git information (dynamic)
  GIT_COMMIT?: string;
  GIT_BRANCH?: string;
  GIT_TAG?: string;
  GIT_DIRTY?: boolean;

  // Process environment replacements (property access patterns)
  'process.env.NODE_ENV': string;
  'process.env.API_URL': string;
  'process.env.BUILD_ENV': string;

  // Feature flags for dead code elimination
  ENABLE_ANALYTICS: boolean;
  ENABLE_DEBUG_LOGS: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  ENABLE_SENTRY: boolean;

  // Configuration objects (complex types)
  FIRE22_CONFIG: object;
  PLATFORM_CONFIG: object;
  FEATURE_FLAGS: object;

  // Package metadata
  PACKAGE_NAME: string;
  PACKAGE_DESCRIPTION: string;
  DEPENDENCIES_COUNT: number;

  // Build system metadata
  BUILD_PLATFORM: string;
  BUILD_ARCH: string;
  COMPILER_VERSION: string;
}

/**
 * 🏗️ Core Build Utilities Class
 */
export class BuildUtilities {
  private context: BuildContext;
  private stats: BuildStats;

  constructor(context: BuildContext) {
    this.context = context;
    this.stats = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryUsage: process.memoryUsage(),
      success: false,
      errors: [],
      warnings: [],
      artifacts: [],
    };
  }

  /**
   * 📁 Directory Management
   */
  async setupDirectories(): Promise<void> {
    const dirs = [
      this.context.outputDir,
      this.context.tempDir,
      join(this.context.outputDir, 'packages'),
      join(this.context.outputDir, 'docs'),
      join(this.context.outputDir, 'executables'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  async cleanDirectories(force = false): Promise<void> {
    const dirs = force ? [this.context.outputDir, this.context.tempDir] : [this.context.tempDir];

    for (const dir of dirs) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }

  /**
   * ⚡ Performance Monitoring
   */
  startTimer(): number {
    return Bun.nanoseconds();
  }

  endTimer(startTime: number): number {
    return (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to milliseconds
  }

  recordMemoryUsage(): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    this.stats.memoryUsage = usage;
    return usage;
  }

  /**
   * 📊 Build Statistics
   */
  addArtifact(artifact: BuildArtifact): void {
    this.stats.artifacts.push(artifact);
  }

  addError(error: string): void {
    this.stats.errors.push(error);
  }

  addWarning(warning: string): void {
    this.stats.warnings.push(warning);
  }

  getStats(): BuildStats {
    this.stats.endTime = Date.now();
    this.stats.duration = this.stats.endTime - this.stats.startTime;
    this.stats.success = this.stats.errors.length === 0;
    return { ...this.stats };
  }

  /**
   * 📝 Logging Utilities
   */
  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📝',
      warn: '⚠️',
      error: '❌',
    }[level];

    console.log(`${prefix} [${timestamp}] ${message}`);

    if (level === 'error') {
      this.addError(message);
    } else if (level === 'warn') {
      this.addWarning(message);
    }
  }

  /**
   * 🚀 Enhanced Spawn Utilities
   */
  private async spawnCommand(
    command: string[],
    options: {
      timeout?: number;
      maxBuffer?: number;
      cwd?: string;
    } = {}
  ): Promise<string | null> {
    try {
      const proc = Bun.spawnSync({
        cmd: command,
        cwd: options.cwd || this.context.rootDir,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: options.timeout || 5000, // 5 second timeout
        maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB max buffer
      });

      if (proc.success && proc.stdout) {
        return proc.stdout.toString('utf-8');
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async spawnCommandAsync(
    command: string[],
    options: {
      timeout?: number;
      cwd?: string;
      onOutput?: (data: string) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<{ success: boolean; output: string; error?: string; exitCode?: number }> {
    return new Promise(resolve => {
      const proc = Bun.spawn({
        cmd: command,
        cwd: options.cwd || this.context.rootDir,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: options.timeout || 30000, // 30 second timeout
        signal: options.signal,
        onExit: (subprocess, exitCode, signalCode, error) => {
          const success = exitCode === 0 && !error;
          resolve({
            success,
            output: '',
            error: error?.message,
            exitCode: exitCode || undefined,
          });
        },
      });

      // Stream output if handler provided
      if (options.onOutput && proc.stdout) {
        proc.stdout.pipeTo(
          new WritableStream({
            write(chunk) {
              const text = new TextDecoder().decode(chunk);
              options.onOutput!(text);
            },
          })
        );
      }
    });
  }

  /**
   * 🔍 Validation Utilities
   */
  async validateEnvironment(): Promise<boolean> {
    try {
      // Check Bun version using spawn
      const bunVersion = await this.spawnCommand(['bun', '--version']);
      if (bunVersion) {
        this.log(`Bun version: ${bunVersion.trim()}`);
      } else {
        this.addError('Bun not found or not working');
        return false;
      }

      // Check TypeScript using spawn
      const tsVersion = await this.spawnCommand([
        'bunx',
        '--package=typescript',
        'tsc',
        '--version',
      ]);
      if (tsVersion) {
        this.log(`TypeScript version: ${tsVersion.trim()}`);
      } else {
        this.addWarning('TypeScript not available via bunx');
      }

      // Validate environment variables access
      this.log(`Environment access: Bun.env=${typeof Bun.env}, process.env=${typeof process.env}`);
      this.log(`NODE_ENV: ${Bun.env.NODE_ENV || 'not set'}`);
      this.log(`TZ: ${Bun.env.TZ || 'system default'}`);

      // Check required directories
      const requiredDirs = ['src', 'scripts'];
      for (const dir of requiredDirs) {
        if (!existsSync(join(this.context.rootDir, dir))) {
          this.addError(`Required directory missing: ${dir}`);
          return false;
        }
      }

      // Check environment files (following Bun's precedence order)
      const envFiles = ['.env', `.env.${this.context.environment}`, '.env.local'];
      for (const envFile of envFiles) {
        const envPath = join(this.context.rootDir, envFile);
        if (existsSync(envPath)) {
          this.log(`Environment file found: ${envFile}`);
        }
      }

      return true;
    } catch (error) {
      this.addError(`Environment validation failed: ${error}`);
      return false;
    }
  }

  async validateDependencies(): Promise<boolean> {
    try {
      // Check package.json
      const packageJsonPath = join(this.context.rootDir, 'package.json');
      if (!existsSync(packageJsonPath)) {
        this.addError('package.json not found');
        return false;
      }

      // Check node_modules
      const nodeModulesPath = join(this.context.rootDir, 'node_modules');
      if (!existsSync(nodeModulesPath)) {
        this.addWarning('node_modules not found - running bun install');

        const installResult = await this.spawnCommandAsync(['bun', 'install'], {
          timeout: 120000, // 2 minutes for install
          onOutput: data => this.log(`Install: ${data.trim()}`),
        });

        if (!installResult.success) {
          this.addError(`Failed to install dependencies: ${installResult.error}`);
          return false;
        }
      }

      // Audit dependencies
      if (this.context.profile.dependencies.audit) {
        const auditResult = await this.spawnCommandAsync(['bun', 'pm', 'audit'], {
          timeout: 60000, // 1 minute for audit
        });

        if (auditResult.success) {
          this.log('Dependency audit passed');
        } else {
          this.addWarning(`Dependency audit found issues: ${auditResult.error}`);
        }
      }

      return true;
    } catch (error) {
      this.addError(`Dependency validation failed: ${error}`);
      return false;
    }
  }

  /**
   * 📊 Build Constants Generation
   */
  async generateBuildConstants(): Promise<BuildConstants> {
    const now = new Date();
    // Set timezone to UTC for consistent build timestamps
    const originalTZ = process.env.TZ;
    process.env.TZ = 'UTC';
    const buildTime = now.toISOString();
    const buildTimestamp = Math.floor(now.getTime() / 1000);
    process.env.TZ = originalTZ;

    // Get Git information dynamically
    const gitInfo = await this.getGitInfo();

    // Get package information
    const packageInfo = await this.getPackageInfo();

    // Generate feature flags based on environment
    const featureFlags = this.generateFeatureFlags();

    // Generate configuration objects
    const configs = await this.generateConfigs();

    const constants: BuildConstants = {
      // Basic build metadata
      BUILD_VERSION: this.context.version,
      BUILD_TIME: buildTime,
      BUILD_NUMBER: buildTimestamp.toString(),
      BUILD_TIMESTAMP: buildTimestamp,
      ENVIRONMENT: this.context.environment,
      DEBUG_MODE: this.context.environment === 'development',
      LOG_LEVEL: this.getLogLevel(),
      API_URL: this.getApiUrl(),
      BUN_VERSION: Bun.version,

      // Git information
      ...gitInfo,

      // Process environment replacements
      'process.env.NODE_ENV': this.context.environment,
      'process.env.API_URL': this.getApiUrl(),
      'process.env.BUILD_ENV': this.context.environment,

      // Feature flags
      ...featureFlags,

      // Configuration objects
      ...configs,

      // Package metadata
      PACKAGE_NAME: packageInfo.name,
      PACKAGE_DESCRIPTION: packageInfo.description,
      DEPENDENCIES_COUNT: packageInfo.dependenciesCount,

      // Build system metadata
      BUILD_PLATFORM: process.platform,
      BUILD_ARCH: process.arch,
      COMPILER_VERSION: Bun.version,
    };

    return constants;
  }

  private async getGitInfo(): Promise<Partial<BuildConstants>> {
    try {
      // Use Bun.spawnSync for better performance and error handling
      const gitCommit = (await this.spawnCommand(['git', 'rev-parse', 'HEAD'])) || 'unknown';
      const gitBranch =
        (await this.spawnCommand(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])) || 'unknown';
      const gitTag = await this.spawnCommand(['git', 'describe', '--tags', '--exact-match']);
      const gitStatus = (await this.spawnCommand(['git', 'status', '--porcelain'])) || '';

      return {
        GIT_COMMIT: gitCommit.trim(),
        GIT_BRANCH: gitBranch.trim(),
        GIT_TAG: gitTag?.trim(),
        GIT_DIRTY: gitStatus.trim().length > 0,
      };
    } catch (error) {
      // Fallback to environment variables
      return {
        GIT_COMMIT: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'unknown',
        GIT_BRANCH: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'unknown',
        GIT_TAG: process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined,
        GIT_DIRTY: false,
      };
    }
  }

  private async getPackageInfo(): Promise<{
    name: string;
    description: string;
    dependenciesCount: number;
  }> {
    try {
      const packageJsonPath = join(this.context.rootDir, 'package.json');
      const packageJson = await Bun.file(packageJsonPath).json();

      const dependenciesCount =
        Object.keys(packageJson.dependencies || {}).length +
        Object.keys(packageJson.devDependencies || {}).length;

      return {
        name: packageJson.name || 'unknown',
        description: packageJson.description || '',
        dependenciesCount,
      };
    } catch (error) {
      return {
        name: 'unknown',
        description: '',
        dependenciesCount: 0,
      };
    }
  }

  private generateFeatureFlags(): Partial<BuildConstants> {
    const isProduction = this.context.environment === 'production';
    const isDevelopment = this.context.environment === 'development';

    return {
      ENABLE_ANALYTICS: isProduction,
      ENABLE_DEBUG_LOGS: isDevelopment,
      ENABLE_PERFORMANCE_MONITORING: !isDevelopment,
      ENABLE_SENTRY: isProduction,
    };
  }

  private async generateConfigs(): Promise<Partial<BuildConstants>> {
    const fire22Config = {
      apiUrl: this.getApiUrl(),
      timeout: this.context.environment === 'production' ? 5000 : 10000,
      retries: this.context.environment === 'production' ? 3 : 1,
      debug: this.context.environment === 'development',
    };

    const platformConfig = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    };

    const featureFlags = {
      newDashboard: this.context.environment !== 'production',
      advancedCharts: true,
      realTimeUpdates: this.context.environment !== 'development',
      betaFeatures: this.context.environment === 'development',
    };

    return {
      FIRE22_CONFIG: fire22Config,
      PLATFORM_CONFIG: platformConfig,
      FEATURE_FLAGS: featureFlags,
    };
  }

  private getLogLevel(): string {
    switch (this.context.environment) {
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

  private getApiUrl(): string {
    switch (this.context.environment) {
      case 'development':
        return 'http://localhost:3000';
      case 'staging':
        return 'https://staging-api.fire22.com';
      case 'production':
        return 'https://api.fire22.com';
      default:
        return 'http://localhost:3000';
    }
  }

  formatDefineFlags(constants: BuildConstants): string[] {
    const flags: string[] = [];

    for (const [key, value] of Object.entries(constants)) {
      if (value !== undefined) {
        let formattedValue: string;

        if (typeof value === 'string') {
          // String values need to be JSON stringified and wrapped
          formattedValue = `'${JSON.stringify(value)}'`;
        } else if (typeof value === 'object' && value !== null) {
          // Complex objects need to be JSON stringified as valid JavaScript expressions
          formattedValue = `'${JSON.stringify(value)}'`;
        } else {
          // Primitives (boolean, number) can be used directly
          formattedValue = `'${value}'`;
        }

        flags.push(`--define`, `${key}=${formattedValue}`);
      }
    }

    return flags;
  }

  /**
   * 🔨 Build Operations
   */
  /**
   * 🔄 Bun.build Bundle Generation (without --compile)
   */
  async buildBundle(options: {
    entrypoint: string;
    outputDir: string;
    minify?: boolean;
    sourcemap?: boolean;
    format?: 'esm' | 'cjs';
    target?: 'browser' | 'bun' | 'node';
  }): Promise<string[]> {
    const constants = await this.generateBuildConstants();

    try {
      this.log(`Building bundle with Bun.build API: ${options.outputDir}`);

      // Prepare define object
      const define: Record<string, string> = {};
      for (const [key, value] of Object.entries(constants)) {
        if (value !== undefined) {
          if (typeof value === 'string') {
            define[key] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            define[key] = JSON.stringify(value);
          } else {
            define[key] = String(value);
          }
        }
      }

      const buildResult = await Bun.build({
        entrypoints: [options.entrypoint],
        outdir: options.outputDir,
        minify: options.minify || false,
        sourcemap: options.sourcemap ? 'external' : 'none',
        define,
        target: options.target || 'bun',
        format: options.format || 'esm',
        splitting: true,
        naming: {
          entry: '[dir]/[name].[ext]',
          chunk: '[name]-[hash].[ext]',
          asset: '[name]-[hash].[ext]',
        },
      });

      if (!buildResult.success) {
        const errors = buildResult.logs.map(log => log.message).join(', ');
        throw new Error(`Bundle build failed: ${errors}`);
      }

      // Record artifacts
      const outputPaths: string[] = [];
      for (const output of buildResult.outputs) {
        const size = await output.size;
        const path = output.path;
        outputPaths.push(path);

        this.addArtifact({
          name: `Bundle (${options.format || 'esm'})`,
          path,
          size,
          type: 'bundle',
        });
      }

      this.log(`✅ Bundle built successfully: ${outputPaths.length} files`);
      return outputPaths;
    } catch (error) {
      this.addError(`Bundle build failed: ${error}`);
      throw error;
    }
  }

  async runTypeCheck(): Promise<boolean> {
    if (!this.context.profile.quality.lint) return true;

    const result = await this.spawnCommandAsync(
      ['bunx', '--package=typescript', 'tsc', '--noEmit'],
      {
        timeout: 60000, // 1 minute timeout for type checking
        onOutput: data => this.log(`TypeCheck: ${data.trim()}`),
      }
    );

    if (result.success) {
      this.log('TypeScript type checking passed');
      return true;
    } else {
      this.addError(`TypeScript type checking failed: ${result.error}`);
      return false;
    }
  }

  async runLinting(): Promise<boolean> {
    if (!this.context.profile.quality.lint) return true;

    const result = await this.spawnCommandAsync(
      ['bunx', '--package=eslint', 'eslint', 'src', '--ext', '.ts'],
      {
        timeout: 30000, // 30 seconds for linting
        onOutput: data => this.log(`Lint: ${data.trim()}`),
      }
    );

    if (result.success) {
      this.log('Linting passed');
      return true;
    } else {
      this.addError(`Linting failed: ${result.error}`);
      return false;
    }
  }

  async runTests(): Promise<boolean> {
    if (!this.context.profile.quality.test) return true;

    const command = this.context.profile.quality.coverage
      ? ['bun', 'test', '--coverage']
      : ['bun', 'test'];

    const result = await this.spawnCommandAsync(command, {
      timeout: 300000, // 5 minutes for tests
      onOutput: data => this.log(`Test: ${data.trim()}`),
    });

    if (result.success) {
      this.log('Tests passed');
      return true;
    } else {
      this.addError(`Tests failed: ${result.error}`);
      return false;
    }
  }

  /**
   * 📄 TypeScript Declaration Generation
   */
  async generateBuildConstantsDeclaration(): Promise<string> {
    const constants = await this.generateBuildConstants();

    const declarations: string[] = [
      '// Auto-generated build constants declarations',
      '// This file is generated automatically during the build process',
      '',
      'declare global {',
    ];

    for (const [key, value] of Object.entries(constants)) {
      if (value !== undefined) {
        let type: string;
        if (typeof value === 'string') {
          type = 'string';
        } else if (typeof value === 'boolean') {
          type = 'boolean';
        } else if (typeof value === 'number') {
          type = 'number';
        } else if (typeof value === 'object') {
          type = 'object';
        } else {
          type = 'any';
        }

        declarations.push(`  const ${key}: ${type};`);
      }
    }

    declarations.push('}', '', 'export {};');

    return declarations.join('\n');
  }

  async saveBuildConstantsDeclaration(): Promise<void> {
    const declaration = await this.generateBuildConstantsDeclaration();
    const declarationPath = join(this.context.rootDir, 'src/types/build-constants.d.ts');

    // Ensure the types directory exists
    const typesDir = join(this.context.rootDir, 'src/types');
    if (!existsSync(typesDir)) {
      mkdirSync(typesDir, { recursive: true });
    }

    await Bun.write(declarationPath, declaration);
    this.addArtifact({
      name: 'Build Constants Declaration',
      path: declarationPath,
      size: declaration.length,
      type: 'metadata',
    });

    this.log(`TypeScript declarations generated: ${declarationPath}`);
  }

  /**
   * 🚀 Bun.build JavaScript API Integration
   */
  async buildExecutableWithAPI(options: {
    entrypoint: string;
    outputPath: string;
    minify?: boolean;
    sourcemap?: boolean;
    bytecode?: boolean;
    execArgs?: string[];
    windowsOptions?: {
      title?: string;
      publisher?: string;
      version?: string;
      description?: string;
      copyright?: string;
    };
  }): Promise<void> {
    const constants = await this.generateBuildConstants();

    try {
      this.log(`Building executable with Bun.build API: ${options.outputPath}`);

      // Prepare define object for Bun.build
      const define: Record<string, string> = {};
      for (const [key, value] of Object.entries(constants)) {
        if (value !== undefined) {
          if (typeof value === 'string') {
            define[key] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            define[key] = JSON.stringify(value);
          } else {
            define[key] = String(value);
          }
        }
      }

      // Build with Bun.build API
      const buildResult = await Bun.build({
        entrypoints: [options.entrypoint],
        outdir: dirname(options.outputPath),
        naming: {
          entry: '[dir]/[name][ext]',
        },
        minify: options.minify || false,
        sourcemap: options.sourcemap ? 'external' : 'none',
        define,
        target: 'bun',
        format: 'esm',
      });

      if (!buildResult.success) {
        const errors = buildResult.logs.map(log => log.message).join(', ');
        throw new Error(`Bun.build failed: ${errors}`);
      }

      this.log(`✅ Bun.build completed successfully`);

      // For now, we still need the command-line approach for --compile
      // since Bun.build doesn't support --compile flag yet
      this.log('Note: Using command-line fallback for --compile functionality');
      await this.buildExecutable(options);
    } catch (error) {
      this.addError(`Bun.build API failed: ${error}`);
      this.log('Falling back to command-line build method');
      await this.buildExecutable(options);
    }
  }

  /**
   * 🏗️ Executable Building
   */
  async buildExecutable(options: {
    entrypoint: string;
    outputPath: string;
    minify?: boolean;
    sourcemap?: boolean;
    bytecode?: boolean;
    execArgs?: string[];
    windowsOptions?: {
      title?: string;
      publisher?: string;
      version?: string;
      description?: string;
      copyright?: string;
    };
  }): Promise<void> {
    const constants = await this.generateBuildConstants();
    const defineFlags = this.formatDefineFlags(constants);

    // Build the command
    const cmd = [
      'bun',
      'build',
      options.entrypoint,
      '--compile',
      '--outfile',
      options.outputPath,
      ...defineFlags,
    ];

    // Add compile execution arguments
    if (options.execArgs && options.execArgs.length > 0) {
      cmd.push('--compile-exec-argv', `"${options.execArgs.join(' ')}"`);
    }

    // Add optimization flags
    if (options.minify) cmd.push('--minify');
    if (options.sourcemap) cmd.push('--sourcemap');
    if (options.bytecode) cmd.push('--bytecode');

    // Add Windows-specific options
    if (options.windowsOptions) {
      const win = options.windowsOptions;
      if (win.title) cmd.push('--windows-title', `"${win.title}"`);
      if (win.publisher) cmd.push('--windows-publisher', `"${win.publisher}"`);
      if (win.version) cmd.push('--windows-version', `"${win.version}"`);
      if (win.description) cmd.push('--windows-description', `"${win.description}"`);
      if (win.copyright) cmd.push('--windows-copyright', `"${win.copyright}"`);
    }

    this.log(`Building executable: ${options.outputPath}`);
    this.log(`Build constants: ${JSON.stringify(constants, null, 2)}`);

    try {
      // Use enhanced executeCommand with Bun.spawn
      const result = await executeCommand(cmd, {
        timeout: 300000, // 5 minutes for executable compilation
        cwd: this.context.rootDir,
        onOutput: data => this.log(`Build: ${data.trim()}`),
        streaming: true,
      });

      if (!result.success) {
        throw new Error(result.error || `Build failed with exit code ${result.exitCode}`);
      }

      // Log resource usage if available
      if (result.resourceUsage) {
        const usage = result.resourceUsage;
        this.log(
          `Build completed - CPU: ${usage.cpuTime.user}µs user, ${usage.cpuTime.system}µs system, Max Memory: ${Math.round(usage.maxRSS / 1024)}KB`
        );
      }

      // Record artifact
      const size = await this.calculateFileSize(options.outputPath);
      const checksum = await this.generateChecksum(options.outputPath);

      this.addArtifact({
        name: `Executable (${this.context.environment})`,
        path: options.outputPath,
        size,
        type: 'executable',
        checksum,
      });

      this.log(`✅ Executable built: ${formatFileSize(size)}`);

      // Generate TypeScript declarations if enabled
      if (this.context.profile.quality.typescript) {
        await this.saveBuildConstantsDeclaration();
      }
    } catch (error) {
      this.addError(`Executable build failed: ${error}`);
      throw error;
    }
  }

  /**
   * 📦 Package Operations
   */
  async calculateFileSize(filePath: string): Promise<number> {
    try {
      const file = Bun.file(filePath);
      return await file.size;
    } catch (error) {
      return 0;
    }
  }

  async generateChecksum(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      return '';
    }
  }

  /**
   * 📋 Report Generation
   */
  async generateBuildReport(): Promise<string> {
    const stats = this.getStats();
    const memoryMB = Math.round(stats.memoryUsage.heapUsed / 1024 / 1024);

    // Set timezone for consistent reporting
    const originalTZ = process.env.TZ;
    process.env.TZ = 'UTC';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    process.env.TZ = originalTZ;

    const report = `
🏗️ **Fire22 Build Report**
!==!==!==!=====

📊 **Summary**
- Profile: ${this.context.profile.name}
- Environment: ${this.context.environment}
- Version: ${this.context.version}
- Duration: ${formatDuration(stats.duration)}
- Memory Usage: ${memoryMB}MB
- Bun Version: ${Bun.version}
- Status: ${stats.success ? '✅ Success' : '❌ Failed'}

📦 **Artifacts (${stats.artifacts.length})**
${stats.artifacts.map(a => `- ${a.name} (${a.type}): ${formatFileSize(a.size)}`).join('\n')}

${
  stats.errors.length > 0
    ? `
❌ **Errors (${stats.errors.length})**
${stats.errors.map(e => `- ${e}`).join('\n')}
`
    : ''
}

${
  stats.warnings.length > 0
    ? `
⚠️ **Warnings (${stats.warnings.length})**
${stats.warnings.map(w => `- ${w}`).join('\n')}
`
    : ''
}

🕐 **Generated**: ${timestamp}
📚 **Documentation**: docs/BUILD-INDEX.md
`;

    return report.trim();
  }

  async saveBuildReport(report: string): Promise<void> {
    const reportPath = join(this.context.outputDir, 'build-report.md');
    await Bun.write(reportPath, report);
    this.addArtifact({
      name: 'Build Report',
      path: reportPath,
      size: report.length,
      type: 'metadata',
    });
  }
}

/**
 * 🛠️ Utility Functions
 */

/**
 * Create a build context with defaults
 */
export function createBuildContext(
  profile: BuildProfile,
  options: Partial<BuildContext> = {}
): BuildContext {
  const rootDir = options.rootDir || process.cwd();

  return {
    profile,
    rootDir,
    outputDir: options.outputDir || join(rootDir, 'dist'),
    tempDir: options.tempDir || join(rootDir, '.build-temp'),
    version: options.version || '0.0.0',
    environment: options.environment || 'development',
    startTime: options.startTime || Date.now(),
    ...options,
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${Math.round(seconds * 100) / 100}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Enhanced process execution with Bun.spawn
 */
export async function executeCommand(
  command: string | string[],
  options: {
    cwd?: string;
    timeout?: number;
    maxBuffer?: number;
    onError?: (error: Error) => void;
    onOutput?: (data: string) => void;
    signal?: AbortSignal;
    env?: Record<string, string>;
    streaming?: boolean;
  } = {}
): Promise<{
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  resourceUsage?: any;
}> {
  try {
    const cmd = Array.isArray(command) ? command : command.split(' ');

    if (options.streaming) {
      // Use async spawn for streaming output
      return new Promise(resolve => {
        let output = '';
        let error = '';

        const proc = Bun.spawn({
          cmd,
          cwd: options.cwd || process.cwd(),
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: options.timeout || 120000,
          signal: options.signal,
          env: options.env ? { ...process.env, ...options.env } : undefined,
          onExit: (subprocess, exitCode, signalCode, exitError) => {
            const success = exitCode === 0 && !exitError;
            const resourceUsage = subprocess.resourceUsage();

            if (!success && options.onError) {
              const err = new Error(
                exitError?.message || `Command failed with exit code ${exitCode}`
              );
              options.onError(err);
            }

            resolve({
              success,
              output,
              error: exitError?.message || error,
              exitCode: exitCode || undefined,
              resourceUsage,
            });
          },
        });

        // Handle stdout streaming
        if (proc.stdout) {
          proc.stdout.pipeTo(
            new WritableStream({
              write(chunk) {
                const text = new TextDecoder().decode(chunk);
                output += text;
                if (options.onOutput) {
                  options.onOutput(text);
                }
              },
            })
          );
        }

        // Handle stderr streaming
        if (proc.stderr) {
          proc.stderr.pipeTo(
            new WritableStream({
              write(chunk) {
                const text = new TextDecoder().decode(chunk);
                error += text;
              },
            })
          );
        }
      });
    } else {
      // Use sync spawn for simple execution
      const result = Bun.spawnSync({
        cmd,
        cwd: options.cwd || process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: options.timeout || 120000,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 10, // 10MB default
        env: options.env ? { ...process.env, ...options.env } : undefined,
      });

      const output = result.stdout ? result.stdout.toString('utf-8') : '';
      const errorOutput = result.stderr ? result.stderr.toString('utf-8') : '';

      if (!result.success && options.onError) {
        const err = new Error(errorOutput || `Command failed with exit code ${result.exitCode}`);
        options.onError(err);
      }

      return {
        success: result.success,
        output,
        error: errorOutput || undefined,
        exitCode: result.exitCode,
        resourceUsage: result.resourceUsage,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (options.onError) {
      options.onError(error instanceof Error ? error : new Error(errorMessage));
    }

    return {
      success: false,
      output: '',
      error: errorMessage,
    };
  }
}

/**
 * 🛠️ Enhanced Build Command Generator
 */
export class BuildCommandGenerator {
  constructor(private context: BuildContext) {}

  async generateExecutableCommand(options: {
    entrypoint: string;
    outputPath: string;
    environment: string;
    minify?: boolean;
    sourcemap?: boolean;
    bytecode?: boolean;
    execArgs?: string[];
  }): Promise<string> {
    const utilities = new BuildUtilities(this.context);
    const constants = await utilities.generateBuildConstants();
    const defineFlags = utilities.formatDefineFlags(constants);

    const cmd = [
      'bun build',
      options.entrypoint,
      '--compile',
      `--outfile=${options.outputPath}`,
      ...defineFlags,
    ];

    if (options.execArgs?.length) {
      cmd.push(`--compile-exec-argv="${options.execArgs.join(' ')}"`);
    }

    if (options.minify) cmd.push('--minify');
    if (options.sourcemap) cmd.push('--sourcemap');
    if (options.bytecode) cmd.push('--bytecode');

    return cmd.join(' \\\\\n  ');
  }

  async generateBuildScript(profiles: string[]): Promise<string> {
    const scripts: string[] = [];

    for (const profile of profiles) {
      const cmd = await this.generateExecutableCommand({
        entrypoint: './src/index.ts',
        outputPath: `./dist/fire22-${profile}`,
        environment: profile,
        minify: profile === 'production',
        sourcemap: true,
        bytecode: profile === 'production',
        execArgs: [`--env=${profile}`, `--port=${this.getPortForProfile(profile)}`],
      });

      scripts.push(`# ${profile.charAt(0).toUpperCase() + profile.slice(1)} build\n${cmd}`);
    }

    return scripts.join('\n\n');
  }

  private getPortForProfile(profile: string): string {
    switch (profile) {
      case 'development':
        return '3000';
      case 'staging':
        return '3001';
      case 'production':
        return '8080';
      case 'demo':
        return '3002';
      default:
        return '3000';
    }
  }
}

export default BuildUtilities;
