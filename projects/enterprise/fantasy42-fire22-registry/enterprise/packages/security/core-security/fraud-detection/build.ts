#!/usr/bin/env bun

/**
 * 🏗️ Fantasy42 Fraud Detection Build Configuration
 *
 * Build system for fraud detection package with embedded User-Agents,
 * security flags, and enterprise compilation options.
 */

import { Fantasy42UserAgents } from '../src/user-agents';

interface BuildConfig {
  entrypoints: string[];
  outfile: string;
  target:
    | 'bun-linux-x64'
    | 'bun-linux-arm64'
    | 'bun-windows-x64'
    | 'bun-macos-x64'
    | 'bun-macos-arm64';
  minify?: boolean;
  sourcemap?: 'linked' | 'external' | false;
  compile?: {
    execArgv?: string[];
  };
  define?: Record<string, string>;
}

interface BuildEnvironment {
  name: string;
  userAgent: string;
  outfile: string;
  env: string;
  geoRegion: string;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  minify: boolean;
  sourcemap: 'linked' | 'external' | false;
}

// Build configurations for different environments
const buildEnvironments: Record<string, BuildEnvironment> = {
  production: {
    name: 'Production',
    userAgent: Fantasy42UserAgents.generateEnterpriseAgent('FRAUD_DETECTION', {
      environment: 'production',
      buildVersion: process.env.BUILD_VERSION || '3.1.0',
      geoRegion: process.env.GEO_REGION || 'global',
      securityLevel: 'maximum',
      compliance: true,
    }),
    outfile: './dist/fraud-detection-prod',
    env: 'production',
    geoRegion: process.env.GEO_REGION || 'global',
    securityLevel: 'maximum',
    minify: true,
    sourcemap: false,
  },

  staging: {
    name: 'Staging',
    userAgent: Fantasy42UserAgents.generateEnterpriseAgent('FRAUD_DETECTION', {
      environment: 'staging',
      buildVersion: process.env.BUILD_VERSION || '3.1.0-staging',
      geoRegion: process.env.GEO_REGION || 'us',
      securityLevel: 'enhanced',
      compliance: true,
    }),
    outfile: './dist/fraud-detection-staging',
    env: 'staging',
    geoRegion: process.env.GEO_REGION || 'us',
    securityLevel: 'enhanced',
    minify: true,
    sourcemap: 'external',
  },

  development: {
    name: 'Development',
    userAgent: Fantasy42UserAgents.generateEnterpriseAgent('FRAUD_DETECTION', {
      environment: 'development',
      buildVersion: process.env.BUILD_VERSION || '3.1.0-dev',
      geoRegion: process.env.GEO_REGION || 'us',
      securityLevel: 'standard',
      compliance: false,
    }),
    outfile: './dist/fraud-detection-dev',
    env: 'development',
    geoRegion: process.env.GEO_REGION || 'us',
    securityLevel: 'standard',
    minify: false,
    sourcemap: 'linked',
  },

  enterprise: {
    name: 'Enterprise',
    userAgent: Fantasy42UserAgents.generateEnterpriseAgent('FRAUD_DETECTION', {
      environment: 'enterprise',
      buildVersion: process.env.BUILD_VERSION || '3.1.0-enterprise',
      geoRegion: process.env.GEO_REGION || 'global',
      securityLevel: 'maximum',
      compliance: true,
    }),
    outfile: './dist/fraud-detection-enterprise',
    env: 'enterprise',
    geoRegion: process.env.GEO_REGION || 'global',
    securityLevel: 'maximum',
    minify: true,
    sourcemap: false,
  },
};

// Target platforms
const targetPlatforms = [
  'bun-linux-x64',
  'bun-linux-arm64',
  'bun-windows-x64',
  'bun-macos-x64',
  'bun-macos-arm64',
] as const;

/**
 * Build all environments for all platforms
 */
async function buildAll(): Promise<void> {
  console.log('🚀 Building Fantasy42 Fraud Detection for all environments and platforms...');
  console.log('='.repeat(80));

  const results = {
    total: 0,
    successful: 0,
    failed: 0,
  };

  for (const [envName, envConfig] of Object.entries(buildEnvironments)) {
    console.log(`\n🏗️ Building ${envConfig.name} Environment`);
    console.log('-'.repeat(50));

    for (const platform of targetPlatforms) {
      results.total++;

      try {
        await buildForPlatform(envName, envConfig, platform);
        results.successful++;
        console.log(`  ✅ ${platform}: Success`);
      } catch (error) {
        results.failed++;
        console.log(`  ❌ ${platform}: Failed - ${error}`);
      }
    }

    console.log(`  📦 ${envConfig.name} builds completed`);
  }

  // Print summary
  console.log('\n📊 Build Summary');
  console.log('='.repeat(50));
  console.log(`Total builds: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Some builds failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All builds completed successfully!');
  }
}

/**
 * Build for a specific platform
 */
async function buildForPlatform(
  envName: string,
  envConfig: BuildEnvironment,
  platform: (typeof targetPlatforms)[number]
): Promise<void> {
  const outputFile = `${envConfig.outfile}-${platform.replace('bun-', '')}`;

  // Generate platform-specific User-Agent
  const platformUserAgent = `${envConfig.userAgent} (${platform.toUpperCase()})`;

  // Build configuration
  const buildConfig: BuildConfig = {
    entrypoints: ['./src/main.ts'],
    outfile: outputFile,
    target: platform,
    minify: envConfig.minify,
    sourcemap: envConfig.sourcemap,
    compile: {
      execArgv: [
        '--smol',
        '--no-macros',
        `--user-agent=${platformUserAgent}`,
        `--strict-validation`,
        `--fraud-detection-enabled`,
        `--audit-trails-enabled`,
        `--environment=${envConfig.env}`,
        `--geo-region=${envConfig.geoRegion}`,
        `--security-level=${envConfig.securityLevel}`,
        `--compliance=${envConfig.env === 'production' || envConfig.env === 'enterprise'}`,
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(envConfig.env),
      'process.env.USER_AGENT': JSON.stringify(platformUserAgent),
      'process.env.GEO_REGION': JSON.stringify(envConfig.geoRegion),
      'process.env.SECURITY_LEVEL': JSON.stringify(envConfig.securityLevel),
      'process.env.BUILD_VERSION': JSON.stringify(process.env.BUILD_VERSION || '3.1.0'),
      'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
    },
  };

  // Perform the build
  await Bun.build(buildConfig);

  // Generate build manifest
  await generateBuildManifest(outputFile, buildConfig, envConfig, platform);

  console.log(`    📦 ${outputFile} (${platformUserAgent})`);
}

/**
 * Generate build manifest for compliance and tracking
 */
async function generateBuildManifest(
  outputFile: string,
  buildConfig: BuildConfig,
  envConfig: BuildEnvironment,
  platform: string
): Promise<void> {
  const manifest = {
    package: 'fantasy42-fraud-detection',
    version: process.env.BUILD_VERSION || '3.1.0',
    environment: envConfig.env,
    platform,
    userAgent: envConfig.userAgent,
    build: {
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
      platform: process.platform,
      arch: process.arch,
      config: {
        minify: buildConfig.minify,
        sourcemap: buildConfig.sourcemap,
        target: buildConfig.target,
      },
      embeddedFlags: buildConfig.compile?.execArgv || [],
    },
    security: {
      level: envConfig.securityLevel,
      compliance: envConfig.env === 'production' || envConfig.env === 'enterprise',
      geoRegion: envConfig.geoRegion,
      auditTrails: true,
      fraudDetection: true,
    },
    compliance: {
      gdpr: true,
      pci: false, // Fraud detection doesn't handle payments directly
      aml: true,
      kyc: false,
      responsibleGaming: false,
    },
  };

  const manifestPath = `${outputFile}.manifest.json`;
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Build single environment
 */
async function buildEnvironment(environment: string): Promise<void> {
  const envConfig = buildEnvironments[environment];
  if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  console.log(`🏗️ Building Fantasy42 Fraud Detection (${envConfig.name})`);
  console.log('='.repeat(60));

  for (const platform of targetPlatforms) {
    try {
      await buildForPlatform(environment, envConfig, platform);
      console.log(`✅ ${platform}: Built successfully`);
    } catch (error) {
      console.error(`❌ ${platform}: Build failed - ${error}`);
      throw error;
    }
  }

  console.log(`\n🎉 ${envConfig.name} builds completed!`);
}

/**
 * Clean build artifacts
 */
async function cleanBuilds(): Promise<void> {
  console.log('🧹 Cleaning build artifacts...');

  const { readdirSync, statSync, rmSync } = await import('fs');
  const { join } = await import('path');

  const distDir = join(process.cwd(), 'dist');

  try {
    if (readdirSync(distDir).length > 0) {
      rmSync(distDir, { recursive: true, force: true });
      console.log('✅ Build artifacts cleaned');
    } else {
      console.log('ℹ️ No build artifacts to clean');
    }
  } catch (error) {
    console.log('ℹ️ No dist directory found');
  }
}

/**
 * Show build information
 */
function showBuildInfo(): void {
  console.log('📋 Fantasy42 Fraud Detection Build Information');
  console.log('='.repeat(50));
  console.log(`Bun Version: ${Bun.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Build Version: ${process.env.BUILD_VERSION || '3.1.0'}`);
  console.log(`Geo Region: ${process.env.GEO_REGION || 'global'}`);
  console.log('');

  console.log('🏗️ Available Environments:');
  for (const [name, config] of Object.entries(buildEnvironments)) {
    console.log(`  ${name}: ${config.userAgent}`);
  }

  console.log('');
  console.log('🎯 Available Platforms:');
  targetPlatforms.forEach(platform => {
    console.log(`  • ${platform}`);
  });
}

// Main execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  try {
    switch (command) {
      case 'build':
        await buildAll();
        break;

      case 'build:prod':
        await buildEnvironment('production');
        break;

      case 'build:staging':
        await buildEnvironment('staging');
        break;

      case 'build:dev':
        await buildEnvironment('development');
        break;

      case 'build:enterprise':
        await buildEnvironment('enterprise');
        break;

      case 'clean':
        await cleanBuilds();
        break;

      case 'info':
        showBuildInfo();
        break;

      default:
        console.log(`
🏗️ Fantasy42 Fraud Detection Build System

Usage:
  bun run build.ts <command> [options]

Commands:
  build              Build all environments and platforms
  build:prod         Build production only
  build:staging      Build staging only
  build:dev          Build development only
  build:enterprise   Build enterprise only
  clean              Clean build artifacts
  info               Show build information

Environment Variables:
  BUILD_VERSION      Version to embed in builds (default: 3.1.0)
  GEO_REGION         Geographic region for compliance (default: global)

Examples:
  bun run build.ts build
  bun run build.ts build:prod
  BUILD_VERSION=3.1.1 GEO_REGION=us bun run build.ts build:enterprise
  bun run build.ts clean
  bun run build.ts info
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

export { buildAll, buildEnvironment, cleanBuilds, showBuildInfo };
