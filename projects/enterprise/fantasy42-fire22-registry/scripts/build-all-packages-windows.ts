#!/usr/bin/env bun

/**
 * 🪟 Fantasy42-Fire22 All Packages Windows Builder
 *
 * Builds all Fantasy42 packages for Windows with proper metadata
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

interface PackageBuildConfig {
  name: string;
  path: string;
  entryPoint: string;
  metadata: WindowsPackageMetadata;
  execArgv: string[];
}

interface WindowsPackageMetadata {
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
}

class AllPackagesWindowsBuilder {
  private packages: PackageBuildConfig[] = [];
  private buildStats = {
    total: 0,
    built: 0,
    failed: 0,
    startTime: Date.now(),
  };

  async buildAllPackages(): Promise<void> {
    console.log('🪟 Fantasy42-Fire22 All Packages Windows Builder');
    console.log('================================================');

    try {
      // Discover and configure packages
      await this.discoverPackages();

      console.log(`📦 Found ${this.packages.length} packages to build for Windows`);
      console.log('');

      // Build each package
      for (const pkg of this.packages) {
        await this.buildPackage(pkg);
      }

      // Generate comprehensive report
      await this.generateBuildReport();
      this.showBuildSummary();
    } catch (error) {
      console.error('❌ All packages Windows build failed:', error);
      process.exit(1);
    }
  }

  private async discoverPackages(): Promise<void> {
    // Core Registry Package
    this.packages.push({
      name: 'fantasy42-fire22-registry',
      path: process.cwd(),
      entryPoint: 'src/index.ts',
      metadata: this.createRegistryMetadata(),
      execArgv: [
        '--smol',
        '--no-macros',
        '--user-agent=Fantasy42Registry/5.1.0',
        '--environment=production',
        '--security-level=enterprise',
        '--strict-validation',
        '--audit-trails',
        '--compliance-mode',
      ],
    });

    // Benchmark Orchestrator
    const benchmarkPath = 'enterprise/packages/scripts/scripts';
    if (existsSync(join(process.cwd(), benchmarkPath, 'package-benchmark-orchestrator.ts'))) {
      this.packages.push({
        name: 'fantasy42-benchmark-orchestrator',
        path: join(process.cwd(), benchmarkPath),
        entryPoint: 'package-benchmark-orchestrator.ts',
        metadata: this.createBenchmarkMetadata(),
        execArgv: [
          '--smol',
          '--no-macros',
          '--user-agent=Fantasy42BenchmarkOrchestrator/1.0.0',
          '--environment=production',
          '--security-level=enterprise',
          '--strict-validation',
          '--audit-trails',
          '--compliance-mode',
        ],
      });
    }

    // Build Optimizer
    const optimizerPath = 'scripts';
    if (existsSync(join(process.cwd(), optimizerPath, 'build-optimizer.bun.ts'))) {
      this.packages.push({
        name: 'fantasy42-build-optimizer',
        path: join(process.cwd(), optimizerPath),
        entryPoint: 'build-optimizer.bun.ts',
        metadata: this.createOptimizerMetadata(),
        execArgv: [
          '--smol',
          '--no-macros',
          '--user-agent=Fantasy42BuildOptimizer/1.0.0',
          '--environment=production',
          '--security-level=high',
        ],
      });
    }

    // Add enterprise packages if they exist
    await this.discoverEnterprisePackages();

    this.buildStats.total = this.packages.length;
  }

  private async discoverEnterprisePackages(): Promise<void> {
    const enterpriseDir = join(process.cwd(), 'enterprise', 'packages');

    if (!existsSync(enterpriseDir)) return;

    // Security packages
    const securityPackages = [
      { dir: 'security/core-security', name: 'fantasy42-security' },
      { dir: 'security/fraud-detection', name: 'fantasy42-fraud-detection' },
      { dir: 'compliance/compliance-core', name: 'fantasy42-compliance' },
    ];

    for (const pkg of securityPackages) {
      const pkgPath = join(enterpriseDir, pkg.dir);
      if (existsSync(pkgPath) && existsSync(join(pkgPath, 'src', 'index.ts'))) {
        this.packages.push({
          name: pkg.name,
          path: pkgPath,
          entryPoint: 'src/index.ts',
          metadata: this.createSecurityMetadata(pkg.name),
          execArgv: [
            '--smol',
            '--no-macros',
            `--user-agent=${pkg.name}/1.0.0`,
            '--environment=production',
            '--security-level=maximum',
            '--strict-validation',
            '--fraud-detection',
            '--audit-trails',
            '--compliance-mode',
            '--real-time-monitoring',
          ],
        });
      }
    }
  }

  private async buildPackage(pkg: PackageBuildConfig): Promise<void> {
    console.log(`🏗️ Building ${pkg.name} for Windows...`);

    try {
      const outputDir = join(pkg.path, 'dist', 'windows');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputFile = join(outputDir, `${pkg.name}-windows-x64.exe`);
      const entryPointPath = join(pkg.path, pkg.entryPoint);

      if (!existsSync(entryPointPath)) {
        console.log(`   ⚠️ Entry point not found: ${pkg.entryPoint}`);
        this.buildStats.failed++;
        return;
      }

      const buildConfig = {
        entrypoints: [entryPointPath],
        outfile: outputFile,
        target: 'bun-windows-x64' as const,
        minify: true,
        sourcemap: false,
        compile: {
          execArgv: pkg.execArgv,
          windows: pkg.metadata,
        },
      };

      await Bun.build(buildConfig);

      // Generate package manifest
      await this.generatePackageManifest(pkg, outputFile);

      console.log(`   ✅ Built: ${basename(outputFile)}`);
      this.buildStats.built++;
    } catch (error) {
      console.error(`   ❌ Build failed for ${pkg.name}:`, error);
      this.buildStats.failed++;
    }
  }

  private async generatePackageManifest(
    pkg: PackageBuildConfig,
    outputFile: string
  ): Promise<void> {
    const manifestPath = outputFile.replace('.exe', '.manifest.json');

    const manifest = {
      package: {
        name: pkg.name,
        version: pkg.metadata.productVersion,
        description: pkg.metadata.description,
        type: 'windows-executable',
      },
      build: {
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        target: 'bun-windows-x64',
        execArgv: pkg.execArgv,
      },
      windows: {
        metadata: pkg.metadata,
        executable: basename(outputFile),
        signed: false, // Will be updated if signed
      },
      fantasy42: {
        registry: true,
        enterprise: true,
        securityLevel: pkg.execArgv.includes('--security-level=maximum')
          ? 'maximum'
          : pkg.execArgv.includes('--security-level=enterprise')
            ? 'enterprise'
            : 'high',
        compliance: {
          gdpr: true,
          pciDss: true,
          soc2: true,
          auditTrails: pkg.execArgv.includes('--audit-trails'),
        },
      },
    };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  private createRegistryMetadata(): WindowsPackageMetadata {
    return {
      title: 'Fantasy42-Fire22 Registry',
      publisher: 'Fire22 Enterprise LLC',
      version: '5.1.0.0',
      description:
        'Enterprise-grade Fantasy42-Fire22 package registry with advanced security, performance optimization, and real-time sports betting operations',
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: 'Fantasy42-Fire22 Registry',
      productVersion: '5.1.0',
      fileVersion: '5.1.0.0',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: 'Fantasy42Fire22Registry',
      originalFilename: 'fantasy42-fire22-registry-windows-x64.exe',
      comments:
        'Enterprise package registry for sports betting operations with Bun optimizations and maximum security',
    };
  }

  private createBenchmarkMetadata(): WindowsPackageMetadata {
    return {
      title: 'Fantasy42 Package Benchmark Orchestrator',
      publisher: 'Fire22 Enterprise LLC',
      version: '1.0.0.0',
      description:
        'Enterprise-grade benchmarking system ensuring EVERY package meets security and performance standards BEFORE deployment',
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: 'Fantasy42 Package Benchmark Orchestrator',
      productVersion: '1.0.0',
      fileVersion: '1.0.0.0',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: 'Fantasy42BenchmarkOrchestrator',
      originalFilename: 'fantasy42-benchmark-orchestrator-windows-x64.exe',
      comments:
        'NEVER COMPROMISE: Security + Performance = Enterprise Excellence. Every package benchmarked and validated for production readiness.',
    };
  }

  private createOptimizerMetadata(): WindowsPackageMetadata {
    return {
      title: 'Fantasy42 Build Performance Optimizer',
      publisher: 'Fire22 Enterprise LLC',
      version: '1.0.0.0',
      description:
        'Advanced build optimization with caching, parallelization, and incremental builds for Fantasy42 operations',
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: 'Fantasy42 Build Performance Optimizer',
      productVersion: '1.0.0',
      fileVersion: '1.0.0.0',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: 'Fantasy42BuildOptimizer',
      originalFilename: 'fantasy42-build-optimizer-windows-x64.exe',
      comments:
        'High-performance build optimization for Fantasy42 enterprise applications with caching and parallelization',
    };
  }

  private createSecurityMetadata(packageName: string): WindowsPackageMetadata {
    const nameMap: Record<string, { title: string; description: string; internal: string }> = {
      'fantasy42-security': {
        title: 'Fantasy42 Security Suite',
        description:
          'Advanced security suite for Fantasy42 operations with fraud detection and compliance monitoring',
        internal: 'Fantasy42Security',
      },
      'fantasy42-fraud-detection': {
        title: 'Fantasy42 Fraud Detection System',
        description:
          'Real-time fraud detection and prevention system for Fantasy42 sports betting operations',
        internal: 'Fantasy42FraudDetection',
      },
      'fantasy42-compliance': {
        title: 'Fantasy42 Compliance Manager',
        description:
          'Comprehensive compliance management for regulatory requirements in sports betting operations',
        internal: 'Fantasy42Compliance',
      },
    };

    const info = nameMap[packageName] || {
      title: 'Fantasy42 Security Package',
      description: 'Security package for Fantasy42 operations',
      internal: 'Fantasy42SecurityPackage',
    };

    return {
      title: info.title,
      publisher: 'Fire22 Enterprise LLC',
      version: '1.0.0.0',
      description: info.description,
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: info.title,
      productVersion: '1.0.0',
      fileVersion: '1.0.0.0',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: info.internal,
      originalFilename: `${packageName}-windows-x64.exe`,
      comments: `Maximum security ${info.description.toLowerCase()} with enterprise-grade compliance and monitoring`,
    };
  }

  private async generateBuildReport(): Promise<void> {
    const reportPath = join(process.cwd(), 'dist', 'all-packages-windows-build-report.json');

    // Ensure dist directory exists
    const distDir = join(process.cwd(), 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.buildStats.total,
        built: this.buildStats.built,
        failed: this.buildStats.failed,
        successRate: `${((this.buildStats.built / this.buildStats.total) * 100).toFixed(1)}%`,
        duration: `${((Date.now() - this.buildStats.startTime) / 1000).toFixed(2)}s`,
      },
      packages: this.packages.map(pkg => ({
        name: pkg.name,
        path: pkg.path,
        entryPoint: pkg.entryPoint,
        metadata: pkg.metadata,
        execArgv: pkg.execArgv,
      })),
      environment: {
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      fantasy42: {
        registry: 'Fantasy42-Fire22 Enterprise Registry',
        version: '5.1.0',
        buildSystem: 'Bun with Windows metadata',
        securityLevel: 'Enterprise Maximum',
        compliance: ['GDPR', 'PCI-DSS', 'SOC2'],
      },
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Comprehensive build report: ${basename(reportPath)}`);
  }

  private showBuildSummary(): void {
    console.log('\n🏆 All Packages Windows Build Summary');
    console.log('====================================');
    console.log(`📦 Total Packages: ${this.buildStats.total}`);
    console.log(`✅ Successfully Built: ${this.buildStats.built}`);
    console.log(`❌ Failed: ${this.buildStats.failed}`);
    console.log(
      `📊 Success Rate: ${((this.buildStats.built / this.buildStats.total) * 100).toFixed(1)}%`
    );
    console.log(
      `⏱️ Total Duration: ${((Date.now() - this.buildStats.startTime) / 1000).toFixed(2)}s`
    );

    if (this.buildStats.built > 0) {
      console.log('\n🚀 Next Steps:');
      console.log('1. Test all Windows executables on target systems');
      console.log('2. Verify Windows metadata in file properties');
      console.log('3. Sign executables with: bun run sign:windows');
      console.log('4. Create Windows installers with: bun run package:windows');
      console.log('5. Deploy to enterprise environments');
    }

    if (this.buildStats.failed > 0) {
      console.log('\n⚠️ Some packages failed to build. Check the logs above for details.');
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const builder = new AllPackagesWindowsBuilder();
  await builder.buildAllPackages();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ All packages Windows build failed:', error);
    process.exit(1);
  });
}

export { AllPackagesWindowsBuilder };
