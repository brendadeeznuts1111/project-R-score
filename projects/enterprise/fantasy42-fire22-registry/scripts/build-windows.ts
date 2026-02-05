#!/usr/bin/env bun

/**
 * 🪟 Fantasy42-Fire22 Windows Build Script
 *
 * Comprehensive Windows executable builder with:
 * - Professional Windows metadata
 * - Digital signing support
 * - Multiple build modes (dev, prod, enterprise)
 * - Cross-platform compilation
 * - Security hardening
 * - Performance optimization
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import { execSync, spawn } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface WindowsBuildConfig {
  mode: 'development' | 'production' | 'enterprise';
  target: string;
  sign: boolean;
  allTargets: boolean;
  verbose: boolean;
  clean: boolean;
  outputDir: string;
}

interface WindowsMetadata {
  title: string;
  publisher: string;
  version: string;
  description: string;
  copyright: string;
  company: string;
  productName: string;
  productVersion: string;
  fileVersion: string;
  trademarks: string;
  internalName: string;
  originalFilename: string;
  comments: string;
  iconPath?: string;
  securityLevel: string;
  complianceFrameworks: string;
  auditEnabled: boolean;
}

const WINDOWS_TARGETS = ['bun-windows-x64', 'bun-windows-arm64'];

const BUILD_MODES = {
  development: {
    minify: false,
    sourcemap: 'linked',
    optimize: false,
    securityLevel: 'standard',
    execArgv: [
      '--inspect',
      '--hot',
      '--user-agent=Fantasy42Dev/5.1.0',
      '--environment=development',
      '--security-level=standard',
    ],
  },
  production: {
    minify: true,
    sourcemap: false,
    optimize: true,
    securityLevel: 'high',
    execArgv: [
      '--smol',
      '--no-macros',
      '--user-agent=Fantasy42Prod/5.1.0',
      '--environment=production',
      '--security-level=high',
    ],
  },
  enterprise: {
    minify: true,
    sourcemap: false,
    optimize: true,
    securityLevel: 'maximum',
    execArgv: [
      '--smol',
      '--no-macros',
      '--user-agent=Fantasy42Enterprise/5.1.0',
      '--environment=enterprise',
      '--security-level=maximum',
      '--strict-validation',
      '--fraud-detection',
      '--audit-trails',
      '--compliance-mode',
      '--real-time-monitoring',
    ],
  },
} as const;

// ============================================================================
// WINDOWS BUILD CLASS
// ============================================================================

class Fantasy42WindowsBuilder {
  private config: WindowsBuildConfig;
  private packageJson: any;
  private buildStats: {
    startTime: number;
    endTime?: number;
    built: number;
    failed: number;
    signed: number;
  };

  constructor(config: WindowsBuildConfig) {
    this.config = config;
    this.buildStats = {
      startTime: Date.now(),
      built: 0,
      failed: 0,
      signed: 0,
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
    console.log('🪟 Fantasy42-Fire22 Windows Builder');
    console.log('===================================');
    console.log(`📋 Mode: ${this.config.mode.toUpperCase()}`);
    console.log(
      `🎯 Target: ${this.config.allTargets ? 'All Windows targets' : this.config.target}`
    );
    console.log(`🔐 Signing: ${this.config.sign ? 'Enabled' : 'Disabled'}`);
    console.log('');

    try {
      // Prepare build environment
      await this.prepareBuildEnvironment();

      // Get targets to build
      const targets = this.config.allTargets ? WINDOWS_TARGETS : [this.config.target];

      // Build for each target
      for (const target of targets) {
        await this.buildForTarget(target);
      }

      // Generate build report
      await this.generateBuildReport();

      this.buildStats.endTime = Date.now();
      this.showBuildSummary();
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  private async prepareBuildEnvironment(): Promise<void> {
    console.log('🔧 Preparing build environment...');

    // Create output directory
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Clean if requested
    if (this.config.clean) {
      console.log('🧹 Cleaning previous builds...');
      try {
        execSync(
          `rmdir /s /q "${this.config.outputDir}" 2>nul || rm -rf "${this.config.outputDir}"`,
          { stdio: 'ignore' }
        );
        mkdirSync(this.config.outputDir, { recursive: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Verify Bun installation
    try {
      const bunVersion = execSync('bun --version', { encoding: 'utf-8' }).trim();
      console.log(`✅ Bun version: ${bunVersion}`);
    } catch (error) {
      throw new Error('Bun not found. Please install Bun first.');
    }

    console.log('✅ Build environment ready');
  }

  private async buildForTarget(target: string): Promise<void> {
    console.log(`\n🏗️ Building for ${target}...`);

    try {
      const buildMode = BUILD_MODES[this.config.mode];
      const metadata = this.getWindowsMetadata(target);
      const outputFilename = this.getOutputFilename(target);
      const outputPath = join(this.config.outputDir, outputFilename);

      // Build configuration
      const buildConfig = {
        entrypoints: [this.getEntryPoint()],
        outfile: outputPath,
        target: target as any,
        minify: buildMode.minify,
        sourcemap: buildMode.sourcemap as any,
        compile: {
          execArgv: buildMode.execArgv,
          windows: {
            title: metadata.title,
            publisher: metadata.publisher,
            version: metadata.version,
            description: metadata.description,
            copyright: metadata.copyright,
            company: metadata.company,
            productName: metadata.productName,
            productVersion: metadata.productVersion,
            fileVersion: metadata.fileVersion,
            trademarks: metadata.trademarks,
            internalName: metadata.internalName,
            originalFilename: metadata.originalFilename,
            comments: metadata.comments,
            ...(metadata.iconPath &&
              existsSync(metadata.iconPath) && {
                iconPath: metadata.iconPath,
              }),
          },
        },
      };

      if (this.config.verbose) {
        console.log('📋 Build configuration:');
        console.log(JSON.stringify(buildConfig, null, 2));
      }

      // Execute build
      await Bun.build(buildConfig);

      console.log(`✅ Built: ${outputFilename}`);
      this.buildStats.built++;

      // Sign executable if requested
      if (this.config.sign) {
        await this.signExecutable(outputPath);
      }

      // Generate manifest for this build
      await this.generateExecutableManifest(outputPath, target, metadata);
    } catch (error) {
      console.error(`❌ Build failed for ${target}:`, error);
      this.buildStats.failed++;
    }
  }

  private getWindowsMetadata(target: string): WindowsMetadata {
    const mode = this.config.mode;
    const version = this.packageJson.version;
    const [major, minor, patch] = version.split('.').map(Number);
    const fileVersion = `${major}.${minor}.${patch}.0`;

    const baseMetadata = {
      publisher: 'Fire22 Enterprise LLC',
      company: 'Fire22 Enterprise LLC',
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      productVersion: version,
      fileVersion: fileVersion,
      iconPath: join(process.cwd(), 'assets', 'fantasy42-fire22-registry-icon.ico'),
      complianceFrameworks: 'GDPR,PCI-DSS,SOC2',
      auditEnabled: true,
    };

    switch (mode) {
      case 'development':
        return {
          ...baseMetadata,
          title: 'Fantasy42-Fire22 Registry (Development)',
          description:
            'Fantasy42-Fire22 package registry - Development build with debugging enabled',
          productName: 'Fantasy42-Fire22 Registry Development',
          internalName: 'Fantasy42Fire22RegistryDev',
          originalFilename: `fantasy42-fire22-registry-dev-${target.replace('bun-', '')}.exe`,
          comments:
            'Development build for Fantasy42-Fire22 package registry with hot reload and debugging',
          securityLevel: 'standard',
        };

      case 'production':
        return {
          ...baseMetadata,
          title: 'Fantasy42-Fire22 Registry',
          description:
            'Enterprise-grade Fantasy42-Fire22 package registry with advanced security and performance optimization',
          productName: 'Fantasy42-Fire22 Registry',
          internalName: 'Fantasy42Fire22Registry',
          originalFilename: `fantasy42-fire22-registry-${target.replace('bun-', '')}.exe`,
          comments:
            'Production build for Fantasy42-Fire22 package registry with enterprise security',
          securityLevel: 'high',
        };

      case 'enterprise':
        return {
          ...baseMetadata,
          title: 'Fantasy42-Fire22 Registry Enterprise',
          description:
            'Maximum security Fantasy42-Fire22 package registry for enterprise sports betting operations',
          productName: 'Fantasy42-Fire22 Registry Enterprise',
          internalName: 'Fantasy42Fire22RegistryEnterprise',
          originalFilename: `fantasy42-fire22-registry-enterprise-${target.replace('bun-', '')}.exe`,
          comments:
            'Enterprise build with maximum security, compliance monitoring, and fraud detection',
          securityLevel: 'maximum',
        };

      default:
        throw new Error(`Unknown build mode: ${mode}`);
    }
  }

  private getEntryPoint(): string {
    // Check for common entry points
    const possibleEntries = ['src/index.ts', 'src/main.ts', 'index.ts', 'main.ts'];

    for (const entry of possibleEntries) {
      const fullPath = join(process.cwd(), entry);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error('No entry point found. Please create src/index.ts or src/main.ts');
  }

  private getOutputFilename(target: string): string {
    const mode = this.config.mode;
    const arch = target.replace('bun-windows-', '');
    const baseName = 'fantasy42-fire22-registry';

    if (mode === 'development') {
      return `${baseName}-dev-${arch}.exe`;
    } else if (mode === 'enterprise') {
      return `${baseName}-enterprise-${arch}.exe`;
    } else {
      return `${baseName}-${arch}.exe`;
    }
  }

  private async signExecutable(executablePath: string): Promise<void> {
    console.log(`🔐 Signing executable: ${basename(executablePath)}`);

    try {
      // Check if certificate exists
      const certPath =
        process.env.FIRE22_WINDOWS_CERT_PATH ||
        join(
          process.env.HOME || process.env.USERPROFILE || '',
          '.bun',
          'certificates',
          'fire22-enterprise-code-signing.pfx'
        );

      if (!existsSync(certPath)) {
        console.log('⚠️ Certificate not found, skipping signing');
        console.log(`   Expected: ${certPath}`);
        console.log('   Set FIRE22_WINDOWS_CERT_PATH environment variable');
        return;
      }

      const certPassword = process.env.FIRE22_WINDOWS_CERT_PASSWORD;
      if (!certPassword) {
        console.log('⚠️ Certificate password not set, skipping signing');
        console.log('   Set FIRE22_WINDOWS_CERT_PASSWORD environment variable');
        return;
      }

      // Sign with signtool (Windows) or osslsigncode (cross-platform)
      const signCommand =
        process.platform === 'win32'
          ? `signtool sign /f "${certPath}" /p "${certPassword}" /t "http://timestamp.digicert.com" /v "${executablePath}"`
          : `osslsigncode sign -pkcs12 "${certPath}" -pass "${certPassword}" -t "http://timestamp.digicert.com" -in "${executablePath}" -out "${executablePath}.signed" && mv "${executablePath}.signed" "${executablePath}"`;

      execSync(signCommand, { stdio: this.config.verbose ? 'inherit' : 'pipe' });

      console.log(`✅ Signed: ${basename(executablePath)}`);
      this.buildStats.signed++;
    } catch (error) {
      console.error(`❌ Signing failed for ${basename(executablePath)}:`, error);
      console.log('💡 Install signtool (Windows SDK) or osslsigncode for signing support');
    }
  }

  private async generateExecutableManifest(
    executablePath: string,
    target: string,
    metadata: WindowsMetadata
  ): Promise<void> {
    const manifestPath = executablePath.replace('.exe', '.manifest.json');

    const manifest = {
      executable: {
        name: basename(executablePath),
        path: executablePath,
        target: target,
        mode: this.config.mode,
        signed: this.config.sign && this.buildStats.signed > 0,
      },
      metadata: metadata,
      build: {
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch,
        buildMode: BUILD_MODES[this.config.mode],
      },
      fantasy42: {
        registry: true,
        version: this.packageJson.version,
        capabilities: [
          'package-management',
          'security-scanning',
          'compliance-checking',
          'performance-monitoring',
        ],
        compliance: {
          gdpr: true,
          pciDss: true,
          soc2: true,
          auditTrails: metadata.auditEnabled,
        },
      },
    };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    if (this.config.verbose) {
      console.log(`📋 Generated manifest: ${basename(manifestPath)}`);
    }
  }

  private async generateBuildReport(): Promise<void> {
    const reportPath = join(this.config.outputDir, 'windows-build-report.json');

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
      outputs: this.getOutputFiles(),
      recommendations: this.generateRecommendations(),
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Build report: ${basename(reportPath)}`);
  }

  private getOutputFiles(): string[] {
    const files: string[] = [];

    try {
      const outputFiles = require('fs').readdirSync(this.config.outputDir);
      for (const file of outputFiles) {
        if (file.endsWith('.exe') || file.endsWith('.manifest.json')) {
          files.push(file);
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return files;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.buildStats.failed > 0) {
      recommendations.push(`🚨 ${this.buildStats.failed} builds failed - check error logs`);
    }

    if (this.config.sign && this.buildStats.signed === 0) {
      recommendations.push('🔐 No executables were signed - set up code signing certificates');
    }

    if (this.config.mode === 'development') {
      recommendations.push('🔄 Development build - use production mode for deployment');
    }

    if (!existsSync(join(process.cwd(), 'assets', 'fantasy42-fire22-registry-icon.ico'))) {
      recommendations.push('🎨 Add application icon at assets/fantasy42-fire22-registry-icon.ico');
    }

    recommendations.push('🧪 Test executables on target Windows systems');
    recommendations.push('📦 Consider creating Windows installer with NSIS or WiX');
    recommendations.push('🔄 Set up CI/CD pipeline for automated Windows builds');

    return recommendations;
  }

  private showBuildSummary(): void {
    console.log('\n🏆 Build Summary');
    console.log('================');
    console.log(`✅ Built: ${this.buildStats.built}`);
    console.log(`❌ Failed: ${this.buildStats.failed}`);
    console.log(`🔐 Signed: ${this.buildStats.signed}`);

    if (this.buildStats.endTime) {
      const duration = (this.buildStats.endTime - this.buildStats.startTime) / 1000;
      console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
    }

    console.log(`📁 Output: ${this.config.outputDir}`);

    if (this.buildStats.built > 0) {
      console.log('\n🚀 Next Steps:');
      console.log('1. Test executables on Windows systems');
      console.log('2. Verify Windows metadata in file properties');
      console.log('3. Check digital signatures (if enabled)');
      console.log('4. Deploy to target environments');
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config: WindowsBuildConfig = {
    mode: 'development',
    target: 'bun-windows-x64',
    sign: false,
    allTargets: false,
    verbose: false,
    clean: false,
    outputDir: join(process.cwd(), 'dist', 'windows'),
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as any;
      if (['development', 'production', 'enterprise'].includes(mode)) {
        config.mode = mode;
      } else {
        console.error(`❌ Invalid mode: ${mode}`);
        process.exit(1);
      }
    } else if (arg.startsWith('--target=')) {
      const target = arg.split('=')[1];
      if (WINDOWS_TARGETS.includes(target)) {
        config.target = target;
      } else {
        console.error(`❌ Invalid target: ${target}`);
        console.error(`Available targets: ${WINDOWS_TARGETS.join(', ')}`);
        process.exit(1);
      }
    } else if (arg === '--sign') {
      config.sign = true;
    } else if (arg === '--all-targets') {
      config.allTargets = true;
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--clean') {
      config.clean = true;
    } else if (arg.startsWith('--output=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else {
      console.error(`❌ Unknown argument: ${arg}`);
      showHelp();
      process.exit(1);
    }
  }

  // Build
  const builder = new Fantasy42WindowsBuilder(config);
  await builder.build();
}

function showHelp() {
  console.log(`
🪟 Fantasy42-Fire22 Windows Builder

Usage: bun run scripts/build-windows.ts [options]

Options:
  --mode=<mode>           Build mode (development, production, enterprise)
  --target=<target>       Target platform (${WINDOWS_TARGETS.join(', ')})
  --all-targets          Build for all Windows targets
  --sign                 Sign executables with code signing certificate
  --verbose              Verbose output
  --clean                Clean output directory before building
  --output=<dir>         Output directory (default: dist/windows)
  --help, -h             Show this help

Environment Variables:
  FIRE22_WINDOWS_CERT_PATH      Path to code signing certificate (.pfx)
  FIRE22_WINDOWS_CERT_PASSWORD  Certificate password

Examples:
  bun run scripts/build-windows.ts --mode=development
  bun run scripts/build-windows.ts --mode=production --sign
  bun run scripts/build-windows.ts --mode=enterprise --all-targets --verbose
  bun run scripts/build-windows.ts --clean --output=./build/windows

Build Modes:
  development    - Debug build with hot reload and inspection
  production     - Optimized build with minification
  enterprise     - Maximum security with compliance monitoring
  `);
}

// ============================================================================
// EXECUTION
// ============================================================================

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Build script failed:', error);
    process.exit(1);
  });
}

export { Fantasy42WindowsBuilder };
export default Fantasy42WindowsBuilder;
