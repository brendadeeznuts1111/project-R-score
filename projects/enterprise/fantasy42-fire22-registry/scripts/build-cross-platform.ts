#!/usr/bin/env bun

/**
 * 🌍 Fantasy42-Fire22 Cross-Platform Build Script
 *
 * Builds for all supported platforms with proper metadata:
 * - Windows (x64, ARM64) with Windows metadata
 * - macOS (x64, ARM64) with bundle info
 * - Linux (x64, ARM64, musl) with optimizations
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

interface CrossPlatformConfig {
  mode: 'development' | 'production' | 'enterprise';
  platforms: string[];
  sign: boolean;
  verbose: boolean;
  clean: boolean;
  outputDir: string;
}

const PLATFORM_TARGETS = {
  windows: ['bun-windows-x64', 'bun-windows-arm64'],
  macos: ['bun-macos-x64', 'bun-macos-arm64'],
  linux: ['bun-linux-x64', 'bun-linux-arm64', 'bun-linux-x64-musl'],
};

const ALL_TARGETS = Object.values(PLATFORM_TARGETS).flat();

class CrossPlatformBuilder {
  private config: CrossPlatformConfig;
  private packageJson: any;
  private buildStats: {
    startTime: number;
    endTime?: number;
    built: number;
    failed: number;
    signed: number;
    platforms: Record<string, { built: number; failed: number }>;
  };

  constructor(config: CrossPlatformConfig) {
    this.config = config;
    this.buildStats = {
      startTime: Date.now(),
      built: 0,
      failed: 0,
      signed: 0,
      platforms: {},
    };

    // Load package.json
    const packagePath = join(process.cwd(), 'package.json');
    if (existsSync(packagePath)) {
      this.packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    } else {
      throw new Error('package.json not found');
    }
  }

  async build(): Promise<void> {
    console.log('🌍 Fantasy42-Fire22 Cross-Platform Builder');
    console.log('==========================================');
    console.log(`📋 Mode: ${this.config.mode.toUpperCase()}`);
    console.log(`🎯 Platforms: ${this.config.platforms.join(', ')}`);
    console.log(`🔐 Signing: ${this.config.sign ? 'Enabled' : 'Disabled'}`);
    console.log('');

    try {
      // Prepare build environment
      await this.prepareBuildEnvironment();

      // Get targets to build
      const targets = this.getTargetsForPlatforms();
      console.log(`🏗️ Building ${targets.length} targets...`);

      // Build for each target
      for (const target of targets) {
        await this.buildForTarget(target);
      }

      // Generate comprehensive build report
      await this.generateBuildReport();

      this.buildStats.endTime = Date.now();
      this.showBuildSummary();
    } catch (error) {
      console.error('❌ Cross-platform build failed:', error);
      process.exit(1);
    }
  }

  private async prepareBuildEnvironment(): Promise<void> {
    console.log('🔧 Preparing cross-platform build environment...');

    // Create output directory structure
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Create platform-specific directories
    for (const platform of this.config.platforms) {
      const platformDir = join(this.config.outputDir, platform);
      if (!existsSync(platformDir)) {
        mkdirSync(platformDir, { recursive: true });
      }
    }

    // Clean if requested
    if (this.config.clean) {
      console.log('🧹 Cleaning previous builds...');
      try {
        execSync(`rm -rf "${this.config.outputDir}"`, { stdio: 'ignore' });
        mkdirSync(this.config.outputDir, { recursive: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    console.log('✅ Cross-platform build environment ready');
  }

  private getTargetsForPlatforms(): string[] {
    const targets: string[] = [];

    for (const platform of this.config.platforms) {
      if (platform === 'all') {
        targets.push(...ALL_TARGETS);
      } else if (PLATFORM_TARGETS[platform as keyof typeof PLATFORM_TARGETS]) {
        targets.push(...PLATFORM_TARGETS[platform as keyof typeof PLATFORM_TARGETS]);
      } else {
        console.warn(`⚠️ Unknown platform: ${platform}`);
      }
    }

    return [...new Set(targets)]; // Remove duplicates
  }

  private async buildForTarget(target: string): Promise<void> {
    const platformName = this.getPlatformName(target);

    if (!this.buildStats.platforms[platformName]) {
      this.buildStats.platforms[platformName] = { built: 0, failed: 0 };
    }

    console.log(`\n🏗️ Building for ${target}...`);

    try {
      const buildConfig = this.getBuildConfigForTarget(target);
      const outputPath = this.getOutputPath(target);

      // Execute build
      await Bun.build(buildConfig);

      console.log(`✅ Built: ${basename(outputPath)}`);
      this.buildStats.built++;
      this.buildStats.platforms[platformName].built++;

      // Sign executable if requested and supported
      if (this.config.sign) {
        await this.signExecutableForPlatform(outputPath, target);
      }

      // Generate platform-specific manifest
      await this.generatePlatformManifest(outputPath, target);
    } catch (error) {
      console.error(`❌ Build failed for ${target}:`, error);
      this.buildStats.failed++;
      this.buildStats.platforms[platformName].failed++;
    }
  }

  private getBuildConfigForTarget(target: string): any {
    const mode = this.config.mode;
    const outputPath = this.getOutputPath(target);
    const entryPoint = this.getEntryPoint();

    const baseConfig = {
      entrypoints: [entryPoint],
      outfile: outputPath,
      target: target as any,
      minify: mode !== 'development',
      sourcemap: mode === 'development' ? 'linked' : false,
    };

    // Platform-specific configurations
    if (target.includes('windows')) {
      return {
        ...baseConfig,
        compile: {
          execArgv: this.getExecArgv(mode),
          windows: this.getWindowsMetadata(target),
        },
      };
    } else if (target.includes('macos')) {
      return {
        ...baseConfig,
        compile: {
          execArgv: this.getExecArgv(mode),
          macos: this.getMacOSMetadata(),
        },
      };
    } else if (target.includes('linux')) {
      return {
        ...baseConfig,
        compile: {
          execArgv: this.getExecArgv(mode),
          linux: this.getLinuxMetadata(target),
        },
      };
    }

    return baseConfig;
  }

  private getExecArgv(mode: string): string[] {
    const baseArgs = [`--user-agent=Fantasy42CrossPlatform/5.1.0`];

    switch (mode) {
      case 'development':
        return [...baseArgs, '--inspect', '--hot', '--environment=development'];
      case 'production':
        return [...baseArgs, '--smol', '--no-macros', '--environment=production'];
      case 'enterprise':
        return [
          ...baseArgs,
          '--smol',
          '--no-macros',
          '--environment=enterprise',
          '--security-level=maximum',
          '--strict-validation',
          '--fraud-detection',
          '--audit-trails',
          '--compliance-mode',
        ];
      default:
        return baseArgs;
    }
  }

  private getWindowsMetadata(target: string): any {
    const version = this.packageJson.version;
    const [major, minor, patch] = version.split('.').map(Number);

    return {
      title: `Fantasy42-Fire22 Registry (${this.config.mode})`,
      publisher: 'Fire22 Enterprise LLC',
      version: `${major}.${minor}.${patch}.0`,
      description: `Fantasy42-Fire22 package registry for ${target}`,
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: 'Fantasy42-Fire22 Registry',
      productVersion: version,
      fileVersion: `${major}.${minor}.${patch}.0`,
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: 'Fantasy42Fire22Registry',
      originalFilename: basename(this.getOutputPath(target)),
      comments: `Cross-platform build for ${target} in ${this.config.mode} mode`,
    };
  }

  private getMacOSMetadata(): any {
    return {
      bundleId: 'com.fire22.fantasy42.registry',
      category: 'public.app-category.business',
      minimumVersion: '12.0',
      codesignEnabled: this.config.sign,
      codesignIdentity: 'Developer ID Application: Fire22 Inc',
    };
  }

  private getLinuxMetadata(target: string): any {
    return {
      useMusl: target.includes('musl'),
      staticLinking: true,
      debugSymbols: this.config.mode === 'development',
    };
  }

  private getOutputPath(target: string): string {
    const platformName = this.getPlatformName(target);
    const arch = this.getArchFromTarget(target);
    const mode =
      this.config.mode === 'development'
        ? '-dev'
        : this.config.mode === 'enterprise'
          ? '-enterprise'
          : '';

    let filename: string;
    if (target.includes('windows')) {
      filename = `fantasy42-fire22-registry${mode}-${arch}.exe`;
    } else {
      filename = `fantasy42-fire22-registry${mode}-${arch}`;
    }

    return join(this.config.outputDir, platformName, filename);
  }

  private getPlatformName(target: string): string {
    if (target.includes('windows')) return 'windows';
    if (target.includes('macos')) return 'macos';
    if (target.includes('linux')) return 'linux';
    return 'unknown';
  }

  private getArchFromTarget(target: string): string {
    if (target.includes('arm64')) return 'arm64';
    if (target.includes('x64')) return 'x64';
    return 'unknown';
  }

  private getEntryPoint(): string {
    const possibleEntries = ['src/index.ts', 'src/main.ts', 'index.ts', 'main.ts'];

    for (const entry of possibleEntries) {
      const fullPath = join(process.cwd(), entry);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error('No entry point found');
  }

  private async signExecutableForPlatform(executablePath: string, target: string): Promise<void> {
    const platformName = this.getPlatformName(target);

    try {
      if (platformName === 'windows') {
        await this.signWindowsExecutable(executablePath);
      } else if (platformName === 'macos') {
        await this.signMacOSExecutable(executablePath);
      } else {
        console.log(`ℹ️ Signing not supported for ${platformName}`);
      }
    } catch (error) {
      console.error(`❌ Signing failed for ${basename(executablePath)}:`, error);
    }
  }

  private async signWindowsExecutable(executablePath: string): Promise<void> {
    const certPath = process.env.FIRE22_WINDOWS_CERT_PATH;
    const certPassword = process.env.FIRE22_WINDOWS_CERT_PASSWORD;

    if (!certPath || !certPassword) {
      console.log('⚠️ Windows signing certificate not configured');
      return;
    }

    const signCommand =
      process.platform === 'win32'
        ? `signtool sign /f "${certPath}" /p "${certPassword}" /t "http://timestamp.digicert.com" "${executablePath}"`
        : `osslsigncode sign -pkcs12 "${certPath}" -pass "${certPassword}" -t "http://timestamp.digicert.com" -in "${executablePath}" -out "${executablePath}.signed" && mv "${executablePath}.signed" "${executablePath}"`;

    execSync(signCommand, { stdio: this.config.verbose ? 'inherit' : 'pipe' });
    console.log(`🔐 Signed Windows executable: ${basename(executablePath)}`);
    this.buildStats.signed++;
  }

  private async signMacOSExecutable(executablePath: string): Promise<void> {
    const identity = process.env.MACOS_CODESIGN_IDENTITY || 'Developer ID Application: Fire22 Inc';

    try {
      execSync(`codesign --sign "${identity}" --timestamp "${executablePath}"`, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });
      console.log(`🔐 Signed macOS executable: ${basename(executablePath)}`);
      this.buildStats.signed++;
    } catch (error) {
      console.log('⚠️ macOS code signing failed - ensure valid certificate is installed');
    }
  }

  private async generatePlatformManifest(executablePath: string, target: string): Promise<void> {
    const manifestPath = executablePath + '.manifest.json';
    const platformName = this.getPlatformName(target);

    const manifest = {
      executable: {
        name: basename(executablePath),
        path: executablePath,
        target: target,
        platform: platformName,
        mode: this.config.mode,
        signed: this.config.sign,
      },
      build: {
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        buildPlatform: process.platform,
        buildArch: process.arch,
      },
      fantasy42: {
        registry: true,
        version: this.packageJson.version,
        crossPlatform: true,
        capabilities: [
          'package-management',
          'security-scanning',
          'compliance-checking',
          'performance-monitoring',
        ],
      },
    };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  private async generateBuildReport(): Promise<void> {
    const reportPath = join(this.config.outputDir, 'cross-platform-build-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      stats: this.buildStats,
      package: {
        name: this.packageJson.name,
        version: this.packageJson.version,
        description: this.packageJson.description,
      },
      environment: {
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      platforms: this.buildStats.platforms,
      outputs: this.getOutputSummary(),
      recommendations: this.generateRecommendations(),
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Cross-platform build report: ${basename(reportPath)}`);
  }

  private getOutputSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};

    for (const platform of this.config.platforms) {
      const platformDir = join(this.config.outputDir, platform);
      if (existsSync(platformDir)) {
        try {
          summary[platform] = require('fs').readdirSync(platformDir);
        } catch (error) {
          summary[platform] = [];
        }
      }
    }

    return summary;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.buildStats.failed > 0) {
      recommendations.push(`🚨 ${this.buildStats.failed} builds failed - check error logs`);
    }

    if (this.config.sign && this.buildStats.signed === 0) {
      recommendations.push('🔐 No executables were signed - configure signing certificates');
    }

    recommendations.push('🧪 Test executables on all target platforms');
    recommendations.push('📦 Consider creating platform-specific installers');
    recommendations.push('🔄 Set up CI/CD for automated cross-platform builds');
    recommendations.push('📊 Monitor executable sizes across platforms');

    return recommendations;
  }

  private showBuildSummary(): void {
    console.log('\n🏆 Cross-Platform Build Summary');
    console.log('===============================');
    console.log(`✅ Total Built: ${this.buildStats.built}`);
    console.log(`❌ Total Failed: ${this.buildStats.failed}`);
    console.log(`🔐 Total Signed: ${this.buildStats.signed}`);

    if (this.buildStats.endTime) {
      const duration = (this.buildStats.endTime - this.buildStats.startTime) / 1000;
      console.log(`⏱️ Total Duration: ${duration.toFixed(2)}s`);
    }

    console.log('\n📊 Platform Breakdown:');
    for (const [platform, stats] of Object.entries(this.buildStats.platforms)) {
      console.log(`  ${platform}: ✅ ${stats.built} ❌ ${stats.failed}`);
    }

    console.log(`\n📁 Output Directory: ${this.config.outputDir}`);

    if (this.buildStats.built > 0) {
      console.log('\n🚀 Next Steps:');
      console.log('1. Test executables on target platforms');
      console.log('2. Verify platform-specific metadata');
      console.log('3. Check digital signatures (if enabled)');
      console.log('4. Create platform-specific distribution packages');
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  const config: CrossPlatformConfig = {
    mode: 'development',
    platforms: ['all'],
    sign: false,
    verbose: false,
    clean: false,
    outputDir: join(process.cwd(), 'dist', 'cross-platform'),
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as any;
      if (['development', 'production', 'enterprise'].includes(mode)) {
        config.mode = mode;
      }
    } else if (arg.startsWith('--platforms=')) {
      config.platforms = arg.split('=')[1].split(',');
    } else if (arg === '--sign') {
      config.sign = true;
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--clean') {
      config.clean = true;
    } else if (arg.startsWith('--output=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  const builder = new CrossPlatformBuilder(config);
  await builder.build();
}

function showHelp() {
  console.log(`
🌍 Fantasy42-Fire22 Cross-Platform Builder

Usage: bun run scripts/build-cross-platform.ts [options]

Options:
  --mode=<mode>              Build mode (development, production, enterprise)
  --platforms=<platforms>    Comma-separated platforms (windows,macos,linux,all)
  --sign                     Sign executables (requires certificates)
  --verbose                  Verbose output
  --clean                    Clean output directory before building
  --output=<dir>             Output directory (default: dist/cross-platform)
  --help, -h                 Show this help

Available Platforms:
  windows    - Windows x64 and ARM64
  macos      - macOS x64 and ARM64
  linux      - Linux x64, ARM64, and musl
  all        - All supported platforms

Environment Variables:
  FIRE22_WINDOWS_CERT_PATH      Windows code signing certificate
  FIRE22_WINDOWS_CERT_PASSWORD  Windows certificate password
  MACOS_CODESIGN_IDENTITY       macOS code signing identity

Examples:
  bun run scripts/build-cross-platform.ts --mode=production
  bun run scripts/build-cross-platform.ts --platforms=windows,macos --sign
  bun run scripts/build-cross-platform.ts --mode=enterprise --verbose --clean
  `);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Cross-platform build failed:', error);
    process.exit(1);
  });
}

export { CrossPlatformBuilder };
