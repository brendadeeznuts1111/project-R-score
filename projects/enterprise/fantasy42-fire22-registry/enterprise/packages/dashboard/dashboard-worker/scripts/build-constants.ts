#!/usr/bin/env bun

// scripts/build-constants.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BuildConstants {
  [key: string]: string | number | boolean | object;
}

function getGitInfo() {
  try {
    // Use Bun.spawnSync for better performance and native Bun integration
    const commit = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const branch = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const tag = Bun.spawnSync(['git', 'describe', '--tags', '--always'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const status = Bun.spawnSync(['git', 'status', '--porcelain'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });

    return {
      commit: commit.success ? commit.stdout.toString().trim() : 'unknown',
      branch: branch.success ? branch.stdout.toString().trim() : 'unknown',
      tag: tag.success ? tag.stdout.toString().trim() : 'unknown',
      isDirty: status.success ? status.stdout.toString().length > 0 : false,
    };
  } catch (error) {
    console.warn('Git not available or not a git repository');
    return { commit: 'unknown', branch: 'unknown', tag: 'unknown', isDirty: false };
  }
}

function getPackageInfo() {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || '',
        dependenciesCount: Object.keys(pkg.dependencies || {}).length,
        devDependenciesCount: Object.keys(pkg.devDependencies || {}).length,
      };
    }
  } catch (error) {
    console.warn('Could not read package.json');
  }
  return {
    name: 'unknown',
    version: '0.0.0',
    description: '',
    dependenciesCount: 0,
    devDependenciesCount: 0,
  };
}

function getEnvironmentConfig(env: string = process.env.NODE_ENV || 'development') {
  const configs = {
    development: {
      apiUrl: 'http://localhost:3000',
      timeout: 10000,
      retries: 1,
      debug: true,
    },
    staging: {
      apiUrl: 'https://staging-api.fire22.com',
      timeout: 8000,
      retries: 2,
      debug: false,
    },
    production: {
      apiUrl: 'https://api.fire22.com',
      timeout: 5000,
      retries: 3,
      debug: false,
    },
  };

  return configs[env as keyof typeof configs] || configs.development;
}

function getFeatureFlags(env: string = process.env.NODE_ENV || 'development') {
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';

  return {
    newDashboard: !isProduction,
    advancedCharts: true,
    realTimeUpdates: !isDevelopment,
    betaFeatures: isDevelopment,
    analytics: isProduction,
    sentry: isProduction,
    debugLogs: isDevelopment,
    performanceMonitoring: !isDevelopment,
  };
}

export function generateBuildConstants(): BuildConstants {
  const gitInfo = getGitInfo();
  const pkgInfo = getPackageInfo();
  const now = new Date();
  const env = process.env.NODE_ENV || 'development';
  const config = getEnvironmentConfig(env);
  const features = getFeatureFlags(env);

  return {
    // Basic build metadata
    BUILD_VERSION: `"${pkgInfo.version}"`,
    BUILD_COMMIT: `"${gitInfo.commit}"`,
    BUILD_BRANCH: `"${gitInfo.branch}"`,
    BUILD_TAG: `"${gitInfo.tag}"`,
    BUILD_DIRTY: gitInfo.isDirty,
    BUILD_TIMESTAMP: now.getTime(),
    BUILD_DATE: `"${now.toISOString()}"`,
    BUILD_TIME: `"${now.toISOString()}"`,
    BUILD_NUMBER: `"${Math.floor(now.getTime() / 1000)}"`,

    // Package information
    PACKAGE_NAME: `"${pkgInfo.name}"`,
    PACKAGE_DESCRIPTION: `"${pkgInfo.description}"`,
    DEPENDENCIES_COUNT: pkgInfo.dependenciesCount,
    DEV_DEPENDENCIES_COUNT: pkgInfo.devDependenciesCount,

    // Environment variables (property access patterns)
    'process.env.NODE_ENV': `"${env}"`,
    'process.env.API_URL': `"${config.apiUrl}"`,
    'process.env.BUILD_ENV': `"${env}"`,

    // Runtime information
    ENVIRONMENT: `"${env}"`,
    DEBUG_MODE: env === 'development',
    LOG_LEVEL: `"${env === 'development' ? 'debug' : env === 'production' ? 'warn' : 'info'}"`,
    API_URL: `"${config.apiUrl}"`,
    BUN_VERSION: `"${Bun.version}"`,

    // Platform information
    BUILD_PLATFORM: `"${process.platform}"`,
    BUILD_ARCH: `"${process.arch}"`,
    COMPILER_VERSION: `"${Bun.version}"`,

    // Feature flags for dead code elimination
    ENABLE_ANALYTICS: features.analytics,
    ENABLE_DEBUG_LOGS: features.debugLogs,
    ENABLE_PERFORMANCE_MONITORING: features.performanceMonitoring,
    ENABLE_SENTRY: features.sentry,

    // Configuration objects (complex types)
    FIRE22_CONFIG: config,
    FEATURE_FLAGS: features,
    PLATFORM_CONFIG: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    },
  };
}

export function formatDefineFlags(constants: BuildConstants): string[] {
  const flags: string[] = [];

  for (const [key, value] of Object.entries(constants)) {
    if (value !== undefined) {
      let formattedValue: string;

      if (typeof value === 'string') {
        // String values are already quoted from generateBuildConstants
        formattedValue = value.startsWith('"') ? `'${value}'` : `'\"${value}\"'`;
      } else if (typeof value === 'object' && value !== null) {
        // Complex objects need to be JSON stringified
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

export function generateBuildCommand(options: {
  entrypoint: string;
  outputPath: string;
  environment?: string;
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
}): string {
  // Set environment for constants generation
  if (options.environment) {
    process.env.NODE_ENV = options.environment;
  }

  const constants = generateBuildConstants();
  const defineFlags = formatDefineFlags(constants);

  const cmd = [
    'bun build',
    options.entrypoint,
    '--compile',
    `--outfile=${options.outputPath}`,
    ...defineFlags,
  ];

  // Add execution arguments
  if (options.execArgs && options.execArgs.length > 0) {
    cmd.push(`--compile-exec-argv="${options.execArgs.join(' ')}"`);
  }

  // Add optimization flags
  if (options.minify) cmd.push('--minify');
  if (options.sourcemap) cmd.push('--sourcemap');
  if (options.bytecode) cmd.push('--bytecode');

  // Add Windows-specific options
  if (options.windowsOptions) {
    const win = options.windowsOptions;
    if (win.title) cmd.push(`--windows-title="${win.title}"`);
    if (win.publisher) cmd.push(`--windows-publisher="${win.publisher}"`);
    if (win.version) cmd.push(`--windows-version="${win.version}"`);
    if (win.description) cmd.push(`--windows-description="${win.description}"`);
    if (win.copyright) cmd.push(`--windows-copyright="${win.copyright}"`);
  }

  return cmd.join(' \\\\\n  ');
}

// Export for use in other scripts
if (import.meta.main) {
  const constants = generateBuildConstants();
  console.log('🏗️ Fire22 Build Constants');
  console.log('='.repeat(50));
  console.log(JSON.stringify(constants, null, 2));

  console.log('\n📋 Generated Define Flags:');
  console.log('='.repeat(50));
  const flags = formatDefineFlags(constants);
  for (let i = 0; i < flags.length; i += 2) {
    console.log(`${flags[i]} ${flags[i + 1]}`);
  }

  console.log('\n🚀 Sample Build Command:');
  console.log('='.repeat(50));
  const sampleCommand = generateBuildCommand({
    entrypoint: './src/index.ts',
    outputPath: './dist/fire22-dashboard',
    environment: 'production',
    minify: true,
    sourcemap: true,
    bytecode: true,
    execArgs: ['--env=production', '--port=8080'],
  });
  console.log(sampleCommand);
}
