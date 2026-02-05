#!/usr/bin/env bun

/**
 * Fire22 Dashboard Integration Script
 *
 * This script demonstrates how to integrate the build automation dashboard
 * with the actual build system for real-time monitoring and control.
 */

import { $ } from 'bun';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { STATUS, SYSTEM_CONFIG } from '../src/globals';
import { dataUtils, asyncUtils } from '../src/utils';

interface PackageInfo {
  name: string;
  version: string;
  status: 'built' | 'building' | 'pending' | 'error';
  size: string;
  lastBuilt: string;
  dependencies: number;
  path: string;
}

interface BuildStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  startTime: Date | null;
  steps: BuildStep[];
}

interface BuildStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  error?: string;
  output?: string;
}

class DashboardIntegration {
  private packages: PackageInfo[] = [];
  private buildStatus: BuildStatus = {
    isRunning: false,
    progress: 0,
    currentStep: '',
    startTime: null,
    steps: [],
  };

  constructor() {
    this.initializeBuildSteps();
  }

  private initializeBuildSteps() {
    this.buildStatus.steps = [
      { name: 'Pre-build Validation', status: 'pending' },
      { name: 'Version Management', status: 'pending' },
      { name: 'Dependency Analysis', status: 'pending' },
      { name: 'Package Building', status: 'pending' },
      { name: 'Documentation Generation', status: 'pending' },
      { name: 'Quality Checks', status: 'pending' },
      { name: 'Final Assembly', status: 'pending' },
      { name: 'Build Complete', status: 'pending' },
    ];
  }

  /**
   * Scan packages directory and get real package information
   */
  async scanPackages(): Promise<PackageInfo[]> {
    const packagesDir = join(process.cwd(), 'packages');
    const packages: PackageInfo[] = [];

    try {
      const entries = await readdir(packagesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = join(packagesDir, entry.name);
          const packageJsonPath = join(packagePath, 'package.json');

          try {
            // Use Bun.file() for cleaner JSON reading
            const packageJson = await Bun.file(packageJsonPath).json();
            const stats = await stat(packagePath);

            // Check if package has been built (look for dist directory)
            const distPath = join(packagePath, 'dist');
            let status: 'built' | 'building' | 'pending' | 'error' = 'pending';
            let lastBuilt = 'Never';

            try {
              const distStats = await stat(distPath);
              if (distStats.isDirectory()) {
                status = 'built';
                lastBuilt = this.formatTimeAgo(distStats.mtime);
              }
            } catch {
              // dist directory doesn't exist
            }

            packages.push({
              name: packageJson.name || entry.name,
              version: packageJson.version || '1.0.0',
              status,
              size: this.formatBytes(stats.size),
              lastBuilt,
              dependencies: Object.keys(packageJson.dependencies || {}).length,
              path: packagePath,
            });
          } catch (error) {
            console.error(`Error reading package ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning packages directory:', error);
    }

    this.packages = packages;
    return packages;
  }

  /**
   * Get current build status
   */
  getBuildStatus(): BuildStatus {
    return { ...this.buildStatus };
  }

  /**
   * Start a build process
   */
  async startBuild(buildType: 'full' | 'quick' | 'packages' | 'docs' = 'full'): Promise<void> {
    if (this.buildStatus.isRunning) {
      throw new Error('Build already in progress');
    }

    this.buildStatus.isRunning = true;
    this.buildStatus.progress = 0;
    this.buildStatus.startTime = new Date();
    this.buildStatus.currentStep = 'Starting build...';

    // Reset step statuses
    this.buildStatus.steps.forEach(step => {
      step.status = 'pending';
      step.duration = undefined;
      step.error = undefined;
      step.output = undefined;
    });

    try {
      switch (buildType) {
        case 'full':
          await this.runFullBuild();
          break;
        case 'quick':
          await this.runQuickBuild();
          break;
        case 'packages':
          await this.runPackageBuild();
          break;
        case 'docs':
          await this.runDocsBuild();
          break;
      }
    } catch (error) {
      console.error('Build failed:', error);
      this.buildStatus.steps.find(step => step.status === 'running')!.status = 'failed';
      this.buildStatus.steps.find(step => step.status === 'running')!.error = error.message;
    } finally {
      this.buildStatus.isRunning = false;
      this.buildStatus.progress = 100;
    }
  }

  /**
   * Run a full build process
   */
  private async runFullBuild(): Promise<void> {
    for (let i = 0; i < this.buildStatus.steps.length; i++) {
      const step = this.buildStatus.steps[i];
      step.status = 'running';
      this.buildStatus.currentStep = step.name;

      const startTime = Date.now();

      try {
        await this.executeBuildStep(step.name);

        step.status = 'completed';
        step.duration = Date.now() - startTime;
        step.output = `${step.name} completed successfully`;

        this.buildStatus.progress = ((i + 1) / this.buildStatus.steps.length) * 100;

        // Add delay to simulate real build time
        await this.delay(1000);
      } catch (error) {
        step.status = 'failed';
        step.duration = Date.now() - startTime;
        step.error = error.message;
        throw error;
      }
    }
  }

  /**
   * Run a quick build
   */
  private async runQuickBuild(): Promise<void> {
    const quickSteps = ['Pre-build Validation', 'Package Building', 'Final Assembly'];

    for (const stepName of quickSteps) {
      const step = this.buildStatus.steps.find(s => s.name === stepName)!;
      step.status = 'running';
      this.buildStatus.currentStep = step.name;

      const startTime = Date.now();

      try {
        await this.executeBuildStep(step.name);

        step.status = 'completed';
        step.duration = Date.now() - startTime;
        step.output = `${step.name} completed successfully`;

        this.buildStatus.progress += 33.33;
        await this.delay(500);
      } catch (error) {
        step.status = 'failed';
        step.duration = Date.now() - startTime;
        step.error = error.message;
        throw error;
      }
    }
  }

  /**
   * Run package build only
   */
  private async runPackageBuild(): Promise<void> {
    const step = this.buildStatus.steps.find(s => s.name === 'Package Building')!;
    step.status = 'running';
    this.buildStatus.currentStep = step.name;

    const startTime = Date.now();

    try {
      await this.executeBuildStep('Package Building');

      step.status = 'completed';
      step.duration = Date.now() - startTime;
      step.output = 'Package building completed successfully';

      this.buildStatus.progress = 100;
    } catch (error) {
      step.status = 'failed';
      step.duration = Date.now() - startTime;
      step.error = error.message;
      throw error;
    }
  }

  /**
   * Run documentation build only
   */
  private async runDocsBuild(): Promise<void> {
    const step = this.buildStatus.steps.find(s => s.name === 'Documentation Generation')!;
    step.status = 'running';
    this.buildStatus.currentStep = step.name;

    const startTime = Date.now();

    try {
      await this.executeBuildStep('Documentation Generation');

      step.status = 'completed';
      step.duration = Date.now() - startTime;
      step.output = 'Documentation generation completed successfully';

      this.buildStatus.progress = 100;
    } catch (error) {
      step.status = 'failed';
      step.duration = Date.now() - startTime;
      step.error = error.message;
      throw error;
    }
  }

  /**
   * Execute a specific build step
   */
  private async executeBuildStep(stepName: string): Promise<void> {
    switch (stepName) {
      case 'Pre-build Validation':
        await this.validateEnvironment();
        break;
      case 'Version Management':
        await this.manageVersion();
        break;
      case 'Dependency Analysis':
        await this.analyzeDependencies();
        break;
      case 'Package Building':
        await this.buildPackages();
        break;
      case 'Documentation Generation':
        await this.generateDocumentation();
        break;
      case 'Quality Checks':
        await this.runQualityChecks();
        break;
      case 'Final Assembly':
        await this.assembleBuild();
        break;
      case 'Build Complete':
        await this.finalizeBuild();
        break;
      default:
        throw new Error(`Unknown build step: ${stepName}`);
    }
  }

  /**
   * Validate build environment
   */
  private async validateEnvironment(): Promise<void> {
    // Check if required tools are available
    try {
      await $`bun --version`;
      await $`node --version`;
    } catch (error) {
      throw new Error('Required build tools not found');
    }
  }

  /**
   * Manage version information
   */
  private async manageVersion(): Promise<void> {
    // Read current version from package.json
    try {
      const packageJson = await Bun.file('package.json').json();
      console.log(`Current version: ${packageJson.version}`);
    } catch (error) {
      throw new Error('Failed to read package.json');
    }
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(): Promise<void> {
    try {
      await $`bun install`;
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  /**
   * Build packages
   */
  private async buildPackages(): Promise<void> {
    try {
      // Build each package
      for (const pkg of this.packages) {
        const packagePath = pkg.path;
        console.log(`Building package: ${pkg.name}`);

        // Change to package directory and build
        process.chdir(packagePath);
        await $`bun run build`;
        process.chdir(process.cwd()); // Return to original directory
      }
    } catch (error) {
      throw new Error(`Failed to build packages: ${error.message}`);
    }
  }

  /**
   * Generate documentation
   */
  private async generateDocumentation(): Promise<void> {
    try {
      // Generate documentation using the build system
      await $`bun run build:docs`;
    } catch (error) {
      throw new Error(`Failed to generate documentation: ${error.message}`);
    }
  }

  /**
   * Run quality checks
   */
  private async runQualityChecks(): Promise<void> {
    try {
      await $`bun run lint`;
      await $`bun run test:quick`;
    } catch (error) {
      throw new Error(`Quality checks failed: ${error.message}`);
    }
  }

  /**
   * Assemble final build
   */
  private async assembleBuild(): Promise<void> {
    try {
      await $`bun run build`;
    } catch (error) {
      throw new Error(`Final assembly failed: ${error.message}`);
    }
  }

  /**
   * Finalize build process
   */
  private async finalizeBuild(): Promise<void> {
    try {
      // Update build statistics
      await this.updateBuildStatistics();
      console.log('Build finalized successfully');
    } catch (error) {
      throw new Error(`Build finalization failed: ${error.message}`);
    }
  }

  /**
   * Stop current build
   */
  stopBuild(): void {
    if (this.buildStatus.isRunning) {
      this.buildStatus.isRunning = false;
      this.buildStatus.currentStep = 'Build stopped by user';

      const runningStep = this.buildStatus.steps.find(step => step.status === 'running');
      if (runningStep) {
        runningStep.status = 'failed';
        runningStep.error = 'Build stopped by user';
      }
    }
  }

  /**
   * Get package statistics
   */
  getPackageStatistics() {
    const totalPackages = this.packages.length;
    const builtPackages = this.packages.filter(p => p.status === 'built').length;
    const buildingPackages = this.packages.filter(p => p.status === 'building').length;
    const pendingPackages = this.packages.filter(p => p.status === 'pending').length;
    const errorPackages = this.packages.filter(p => p.status === 'error').length;

    return {
      total: totalPackages,
      built: builtPackages,
      building: buildingPackages,
      pending: pendingPackages,
      error: errorPackages,
      successRate: totalPackages > 0 ? (builtPackages / totalPackages) * 100 : 0,
    };
  }

  /**
   * Update build statistics
   */
  private async updateBuildStatistics(): Promise<void> {
    // This would typically update a database or file with build statistics
    console.log('Build statistics updated');
  }

  /**
   * Utility: Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Format time ago
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }

  /**
   * Utility: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
export { DashboardIntegration, PackageInfo, BuildStatus, BuildStep };

// CLI interface for testing
if (import.meta.main) {
  const integration = new DashboardIntegration();

  console.log('🔥 Fire22 Dashboard Integration Script');
  console.log('!==!==!==!==!==!==!==\n');

  // Scan packages
  console.log('Scanning packages...');
  const packages = await integration.scanPackages();
  console.log(`Found ${packages.length} packages:\n`);

  packages.forEach(pkg => {
    console.log(`  ${pkg.name}@${pkg.version} - ${pkg.status} (${pkg.size})`);
  });

  console.log('\nPackage Statistics:');
  const stats = integration.getPackageStatistics();
  console.log(`  Total: ${stats.total}`);
  console.log(`  Built: ${stats.built}`);
  console.log(`  Building: ${stats.building}`);
  console.log(`  Pending: ${stats.pending}`);
  console.log(`  Error: ${stats.error}`);
  console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);

  console.log('\nTo integrate with the dashboard:');
  console.log('1. Import this class in your dashboard JavaScript');
  console.log('2. Replace simulation calls with real integration methods');
  console.log('3. Use WebSockets or polling for real-time updates');
  console.log('4. Connect build buttons to startBuild() method');
}
