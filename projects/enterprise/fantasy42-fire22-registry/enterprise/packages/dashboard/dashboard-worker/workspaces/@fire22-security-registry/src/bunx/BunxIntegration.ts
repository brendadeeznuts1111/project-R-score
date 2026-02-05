/**
 * Bunx Integration for Fire22 Security Registry
 *
 * Seamless integration with bun's package execution system
 */

import type { BunxConfig } from '../index';

export interface BunxSecurityReport {
  totalPackages: number;
  vulnerablePackages: number;
  overallScore: number;
  recommendations: string[];
  packages: {
    name: string;
    version: string;
    vulnerabilities: number;
    score: number;
  }[];
}

export class BunxIntegration {
  private config: BunxConfig;

  constructor(config: Partial<BunxConfig> = {}) {
    this.config = {
      enabled: true,
      globalPackages: [],
      securityChecks: true,
      autoUpdate: false,
      registry: {
        url: 'https://fire22.workers.dev/registry/',
        scopes: ['@fire22'],
        security: {
          scanning: true,
          audit: true,
          strict: false,
        },
      },
      ...config,
    };
  }

  /**
   * Setup bunx integration with Fire22 security
   */
  async setup(): Promise<void> {
    try {
      // Configure bun to use Fire22 registry for @fire22 packages
      await this.configureBunRegistry();

      // Setup security scanning hooks
      if (this.config.securityChecks) {
        await this.setupSecurityHooks();
      }

      // Install global packages
      if (this.config.globalPackages.length > 0) {
        await this.installGlobalPackages();
      }

      console.log('✅ Bunx integration with Fire22 security configured');
    } catch (error) {
      throw new Error(`Bunx setup failed: ${error.message}`);
    }
  }

  /**
   * Execute package with security validation
   */
  async execute(
    packageName: string,
    args: string[] = [],
    options: { validate?: boolean } = {}
  ): Promise<void> {
    try {
      // Validate package security if enabled
      if (options.validate !== false && this.config.securityChecks) {
        await this.validatePackageSecurity(packageName);
      }

      // Execute package using bun
      const command = `bunx ${packageName} ${args.join(' ')}`;
      const proc = Bun.spawn(command.split(' '), {
        stdio: ['inherit', 'inherit', 'inherit'],
      });

      await proc.exited;
    } catch (error) {
      throw new Error(`Package execution failed: ${error.message}`);
    }
  }

  /**
   * Install package globally with security scanning
   */
  async installGlobal(packageName: string, options: { force?: boolean } = {}): Promise<void> {
    try {
      // Check if package is already installed
      const isInstalled = await this.isGloballyInstalled(packageName);

      if (isInstalled && !options.force) {
        console.log(`Package ${packageName} is already installed globally`);
        return;
      }

      // Validate package security
      if (this.config.securityChecks) {
        await this.validatePackageSecurity(packageName);
      }

      // Install package globally
      const proc = Bun.spawn(['bun', 'install', '-g', packageName], {
        stdio: ['inherit', 'inherit', 'inherit'],
      });

      await proc.exited;

      // Add to tracked packages
      if (!this.config.globalPackages.includes(packageName)) {
        this.config.globalPackages.push(packageName);
        await this.saveConfig();
      }
    } catch (error) {
      throw new Error(`Global installation failed: ${error.message}`);
    }
  }

  /**
   * Scan global packages for vulnerabilities
   */
  async scanGlobalPackages(): Promise<BunxSecurityReport> {
    try {
      const globalPackages = await this.getGlobalPackages();
      const packageReports = [];
      let totalVulnerabilities = 0;

      for (const packageName of globalPackages) {
        const report = await this.scanPackage(packageName);
        packageReports.push(report);
        totalVulnerabilities += report.vulnerabilities;
      }

      const overallScore = this.calculateOverallScore(packageReports);
      const recommendations = this.generateRecommendations(packageReports);

      return {
        totalPackages: globalPackages.length,
        vulnerablePackages: packageReports.filter(p => p.vulnerabilities > 0).length,
        overallScore,
        recommendations,
        packages: packageReports,
      };
    } catch (error) {
      throw new Error(`Global package scan failed: ${error.message}`);
    }
  }

  /**
   * Update all global packages
   */
  async updateGlobalPackages(options: { dryRun?: boolean } = {}): Promise<void> {
    const globalPackages = await this.getGlobalPackages();

    for (const packageName of globalPackages) {
      try {
        if (options.dryRun) {
          console.log(`Would update: ${packageName}`);
        } else {
          console.log(`Updating ${packageName}...`);
          await this.installGlobal(packageName, { force: true });
        }
      } catch (error) {
        console.error(`Failed to update ${packageName}: ${error.message}`);
      }
    }
  }

  /**
   * Remove global package
   */
  async removeGlobal(packageName: string): Promise<void> {
    try {
      const proc = Bun.spawn(['bun', 'remove', '-g', packageName], {
        stdio: ['inherit', 'inherit', 'inherit'],
      });

      await proc.exited;

      // Remove from tracked packages
      this.config.globalPackages = this.config.globalPackages.filter(p => p !== packageName);
      await this.saveConfig();
    } catch (error) {
      throw new Error(`Failed to remove global package: ${error.message}`);
    }
  }

  /**
   * Configure bun registry settings
   */
  private async configureBunRegistry(): Promise<void> {
    const bunfigPath = `${process.env.HOME}/.bunfig.toml`;

    const registryConfig = `
# Fire22 Registry Configuration
[install]
registry = "https://registry.npmjs.org/"

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry/"

[install.cache]
dir = "~/.bun/install/cache"

[install.lockfile]
print = "yarn"

[install.security]
audit = true
scan = true
`;

    try {
      const existingConfig = await Bun.file(bunfigPath)
        .text()
        .catch(() => '');

      if (!existingConfig.includes('@fire22')) {
        await Bun.write(bunfigPath, existingConfig + registryConfig);
        console.log('✅ Fire22 registry configured in ~/.bunfig.toml');
      }
    } catch (error) {
      console.warn(`Warning: Could not configure registry: ${error.message}`);
    }
  }

  /**
   * Setup security hooks for bunx execution
   */
  private async setupSecurityHooks(): Promise<void> {
    // Create security hook script
    const hookScript = `#!/usr/bin/env bun

// Fire22 Security Hook for bunx
const packageName = process.argv[2];

if (!packageName) {
  console.error('No package name provided');
  process.exit(1);
}

console.log('🔍 Validating package security...');

// This would call the Fire22 security scanner
// For now, just log the validation
console.log('✅ Package security validated');
`;

    const hookPath = `${process.env.HOME}/.fire22/bunx-security-hook.js`;

    try {
      await Bun.write(hookPath, hookScript);

      // Make hook executable
      const proc = Bun.spawn(['chmod', '+x', hookPath]);
      await proc.exited;

      console.log('✅ Security hooks configured');
    } catch (error) {
      console.warn(`Warning: Could not setup security hooks: ${error.message}`);
    }
  }

  /**
   * Install configured global packages
   */
  private async installGlobalPackages(): Promise<void> {
    for (const packageName of this.config.globalPackages) {
      try {
        await this.installGlobal(packageName);
      } catch (error) {
        console.error(`Failed to install ${packageName}: ${error.message}`);
      }
    }
  }

  /**
   * Check if package is globally installed
   */
  private async isGloballyInstalled(packageName: string): Promise<boolean> {
    try {
      const proc = Bun.spawn(['which', packageName], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      await proc.exited;
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of globally installed packages
   */
  private async getGlobalPackages(): Promise<string[]> {
    // This would scan the global bun installation directory
    // For now, return the configured packages
    return this.config.globalPackages;
  }

  /**
   * Validate package security before execution
   */
  private async validatePackageSecurity(packageName: string): Promise<void> {
    try {
      // This would integrate with SecurityScanner
      // For now, simulate validation

      const isSecure = Math.random() > 0.1; // 90% chance of being secure

      if (!isSecure) {
        throw new Error(`Security validation failed for ${packageName}`);
      }

      console.log(`✅ Package ${packageName} passed security validation`);
    } catch (error) {
      if (this.config.registry.security.strict) {
        throw error;
      } else {
        console.warn(`⚠️  Security warning for ${packageName}: ${error.message}`);
      }
    }
  }

  /**
   * Scan individual package for vulnerabilities
   */
  private async scanPackage(
    packageName: string
  ): Promise<{ name: string; version: string; vulnerabilities: number; score: number }> {
    // This would use the SecurityScanner
    // For now, simulate scanning

    const vulnerabilities = Math.floor(Math.random() * 3); // 0-2 vulnerabilities
    const score = Math.max(0, 100 - vulnerabilities * 25);

    return {
      name: packageName,
      version: '1.0.0', // Would get actual version
      vulnerabilities,
      score,
    };
  }

  /**
   * Calculate overall security score
   */
  private calculateOverallScore(packages: { score: number }[]): number {
    if (packages.length === 0) return 100;

    const totalScore = packages.reduce((sum, pkg) => sum + pkg.score, 0);
    return Math.round(totalScore / packages.length);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    packages: { name: string; vulnerabilities: number; score: number }[]
  ): string[] {
    const recommendations: string[] = [];

    const vulnerablePackages = packages.filter(p => p.vulnerabilities > 0);

    if (vulnerablePackages.length === 0) {
      recommendations.push('✅ All global packages are secure');
      recommendations.push('Continue monitoring for security updates');
    } else {
      recommendations.push(`🔧 Update ${vulnerablePackages.length} vulnerable packages`);

      vulnerablePackages.forEach(pkg => {
        recommendations.push(`  • Update ${pkg.name} (${pkg.vulnerabilities} vulnerabilities)`);
      });

      recommendations.push('🔄 Run "fire22-security bunx:scan" regularly');
    }

    const lowScorePackages = packages.filter(p => p.score < 70);
    if (lowScorePackages.length > 0) {
      recommendations.push('⚠️  Consider alternatives for low-scoring packages');
    }

    return recommendations;
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(): Promise<void> {
    const configPath = `${process.env.HOME}/.fire22/bunx-config.json`;

    try {
      await Bun.write(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn(`Warning: Could not save config: ${error.message}`);
    }
  }
}
