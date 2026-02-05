#!/usr/bin/env bun

/**
 * 📦 Package Metadata Manager for Fantasy42-Fire22 Registry
 *
 * Enterprise package metadata validation, generation, and management
 * Pure Bun Ecosystem - Zero external dependencies
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join, resolve, dirname } from 'path';
import { Database } from 'bun:sqlite';

// ============================================================================
// METADATA CONFIGURATION
// ============================================================================

interface PackageMetadata {
  name: string;
  version: string;
  license: string;
  owners: string[];
  description: string;
  domain: string;
  dependencies: string[];
  files: number;
  lastUpdated: string;
  status: 'active' | 'deprecated' | 'experimental';
}

interface MetadataConfig {
  registryName: string;
  registryVersion: string;
  totalPackages: number;
  lastAudit: string;
  compliance: {
    license: boolean;
    owners: boolean;
    documentation: boolean;
  };
}

// ============================================================================
// METADATA MANAGER CLASS
// ============================================================================

class PackageMetadataManager {
  private db: Database;
  private registryPath: string;

  constructor() {
    this.registryPath = resolve(process.cwd());
    this.db = new Database(join(this.registryPath, 'package-metadata.db'));

    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create metadata tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        version TEXT NOT NULL,
        license TEXT NOT NULL,
        owners TEXT NOT NULL,
        description TEXT,
        domain TEXT,
        dependencies TEXT,
        files INTEGER DEFAULT 0,
        last_updated TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default configuration
    this.setConfig('registryName', 'Fantasy42-Fire22 Registry');
    this.setConfig('registryVersion', '5.1.0');
    this.setConfig('lastAudit', new Date().toISOString());
  }

  // ============================================================================
  // PACKAGE DISCOVERY & SCANNING
  // ============================================================================

  async scanPackages(): Promise<PackageMetadata[]> {
    const packages: PackageMetadata[] = [];
    const packagesDir = join(this.registryPath, 'packages');
    const enterpriseDir = join(this.registryPath, 'enterprise', 'packages');

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence checks
    // Scan main packages directory
    if (await Bun.file(packagesDir).exists()) {
      const mainPackages = await this.scanDirectory(packagesDir);
      packages.push(...mainPackages);
    }

    // Scan enterprise packages directory
    if (await Bun.file(enterpriseDir).exists()) {
      const enterprisePackages = await this.scanDirectory(enterpriseDir);
      packages.push(...enterprisePackages);
    }

    return packages;
  }

  private async scanDirectory(basePath: string): Promise<PackageMetadata[]> {
    const packages: PackageMetadata[] = [];

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob for package discovery
      const packageJsonFiles = await Array.fromAsync(
        fs.glob(join(basePath, '**/package.json'), {
          exclude: ['**/node_modules/**', '**/dist/**', '**/build/**']
        })
      );

      for (const packageJsonPath of packageJsonFiles) {
        try {
          const packagePath = dirname(packageJsonPath);
          const packageName = basename(packagePath);
          const metadata = await this.extractPackageMetadata(packagePath, packageName);
          if (metadata) {
            packages.push(metadata);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to process package at ${packageJsonPath}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to scan directory ${basePath}:`, error.message);
    }

    return packages;
  }

  private async extractPackageMetadata(packagePath: string, packageName: string): Promise<PackageMetadata | null> {
    try {
      const packageJsonPath = join(packagePath, 'package.json');
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const packageJson = await Bun.file(packageJsonPath).json();

      // Count files in package
      const fileCount = await this.countFiles(packagePath);

      // Extract owners from CODEOWNERS if available
      const owners = await this.extractOwners(packageName);

      // Determine domain from path
      const domain = this.determineDomain(packagePath);

      return {
        name: packageJson.name || packageName,
        version: packageJson.version || '1.0.0',
        license: packageJson.license || 'MIT',
        owners: owners,
        description: packageJson.description || `Package ${packageName}`,
        domain: domain,
        dependencies: Object.keys(packageJson.dependencies || {}),
        files: fileCount,
        lastUpdated: new Date().toISOString(),
        status: 'active',
      };
    } catch (error) {
      console.error(`Error extracting metadata for ${packageName}:`, error);
      return null;
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob for file counting
      const files = await Array.fromAsync(
        fs.glob(join(dirPath, '**/*'), {
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/*.log'
          ]
        })
      );

      return files.length;
    } catch (error) {
      console.warn(`⚠️  Failed to count files in ${dirPath}:`, error.message);
      return 0;
    }
  }

  private async extractOwners(packageName: string): Promise<string[]> {
    try {
      const codeownersPath = join(this.registryPath, '.github', 'CODEOWNERS');
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
      if (!(await Bun.file(codeownersPath).exists())) {
        return ['@fire22/devops-team'];
      }

      const codeowners = await Bun.file(codeownersPath).text();
      const lines = codeowners.split('\n');

      for (const line of lines) {
        if (line.includes(packageName)) {
          const parts = line.split('@').slice(1);
          return parts.map(part => `@${part.trim()}`);
        }
      }
    } catch (error) {
      console.error('❌ Error reading CODEOWNERS:', error);
    }

    return ['@fire22/devops-team'];
  }

  private determineDomain(packagePath: string): string {
    const pathParts = packagePath.split('/');

    // Map common package names to domains
    const domainMap: Record<string, string> = {
      security: 'Security & Compliance',
      compliance: 'Compliance & Legal',
      benchmark: 'DevOps & Performance',
      audit: 'Security & Compliance',
      payment: 'Finance & Payments',
      financial: 'Finance & Payments',
      betting: 'Betting & Gaming',
      gaming: 'Betting & Gaming',
      user: 'User Management',
      auth: 'Security & Compliance',
      analytics: 'Analytics & BI',
      dashboard: 'Frontend & UI',
      frontend: 'Frontend & UI',
      api: 'API & Backend',
      database: 'Infrastructure',
      cloudflare: 'Cloud & Infrastructure',
      monitoring: 'DevOps & Operations',
    };

    for (const [key, domain] of Object.entries(domainMap)) {
      if (packagePath.toLowerCase().includes(key)) {
        return domain;
      }
    }

    return 'General';
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  async savePackageMetadata(metadata: PackageMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO packages
      (name, version, license, owners, description, domain, dependencies, files, last_updated, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metadata.name,
      metadata.version,
      metadata.license,
      JSON.stringify(metadata.owners),
      metadata.description,
      metadata.domain,
      JSON.stringify(metadata.dependencies),
      metadata.files,
      metadata.lastUpdated,
      metadata.status
    );
  }

  async getAllPackages(): Promise<PackageMetadata[]> {
    const stmt = this.db.prepare('SELECT * FROM packages ORDER BY name');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      name: row.name,
      version: row.version,
      license: row.license,
      owners: JSON.parse(row.owners),
      description: row.description,
      domain: row.domain,
      dependencies: JSON.parse(row.dependencies),
      files: row.files,
      lastUpdated: row.last_updated,
      status: row.status,
    }));
  }

  setConfig(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata_config (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
  }

  getConfig(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM metadata_config WHERE key = ?');
    const row = stmt.get(key) as any;
    return row ? row.value : null;
  }

  // ============================================================================
  // VALIDATION & REPORTING
  // ============================================================================

  async validateMetadata(): Promise<{
    valid: boolean;
    issues: string[];
    summary: Record<string, number>;
  }> {
    const packages = await this.getAllPackages();
    const issues: string[] = [];
    const summary = {
      total: packages.length,
      withLicense: 0,
      withOwners: 0,
      withDescription: 0,
      active: 0,
      deprecated: 0,
      experimental: 0,
    };

    for (const pkg of packages) {
      // License validation
      if (!pkg.license || pkg.license === 'UNLICENSED') {
        issues.push(`Package ${pkg.name} missing valid license`);
      } else {
        summary.withLicense++;
      }

      // Owners validation
      if (!pkg.owners || pkg.owners.length === 0) {
        issues.push(`Package ${pkg.name} missing owners`);
      } else {
        summary.withOwners++;
      }

      // Description validation
      if (!pkg.description || pkg.description.startsWith('Package ')) {
        issues.push(`Package ${pkg.name} missing proper description`);
      } else {
        summary.withDescription++;
      }

      // Status tracking
      summary[pkg.status as keyof typeof summary]++;
    }

    return {
      valid: issues.length === 0,
      issues,
      summary,
    };
  }

  async generateReport(): Promise<string> {
    const packages = await this.getAllPackages();
    const validation = await this.validateMetadata();

    let report = `# 📦 Package Metadata Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `**Registry:** ${this.getConfig('registryName')}\n`;
    report += `**Version:** ${this.getConfig('registryVersion')}\n\n`;

    // Summary
    report += `## 📊 Summary\n\n`;
    report += `| Metric | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Packages | ${validation.summary.total} |\n`;
    report += `| With License | ${validation.summary.withLicense} |\n`;
    report += `| With Owners | ${validation.summary.withOwners} |\n`;
    report += `| With Description | ${validation.summary.withDescription} |\n`;
    report += `| Active | ${validation.summary.active} |\n`;
    report += `| Deprecated | ${validation.summary.deprecated} |\n`;
    report += `| Experimental | ${validation.summary.experimental} |\n\n`;

    // Issues
    if (validation.issues.length > 0) {
      report += `## ⚠️ Issues Found\n\n`;
      for (const issue of validation.issues) {
        report += `- ${issue}\n`;
      }
      report += `\n`;
    }

    // Package Details
    report += `## 📦 Package Details\n\n`;
    for (const pkg of packages) {
      report += `### ${pkg.name} (${pkg.version})\n\n`;
      report += `- **License:** ${pkg.license}\n`;
      report += `- **Owners:** ${pkg.owners.join(', ')}\n`;
      report += `- **Domain:** ${pkg.domain}\n`;
      report += `- **Files:** ${pkg.files}\n`;
      report += `- **Status:** ${pkg.status}\n`;
      report += `- **Dependencies:** ${pkg.dependencies.length}\n`;
      if (pkg.description) {
        report += `- **Description:** ${pkg.description}\n`;
      }
      report += `\n`;
    }

    return report;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async close(): Promise<void> {
    this.db.close();
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new PackageMetadataManager();

  try {
    switch (command) {
      case 'scan':
        console.log('🔍 Scanning packages...');
        const packages = await manager.scanPackages();
        console.log(`Found ${packages.length} packages`);

        for (const pkg of packages) {
          await manager.savePackageMetadata(pkg);
          console.log(`✅ Saved metadata for ${pkg.name}`);
        }
        break;

      case 'validate':
        console.log('🔍 Validating metadata...');
        const validation = await manager.validateMetadata();
        console.log(`Validation ${validation.valid ? 'PASSED' : 'FAILED'}`);

        if (validation.issues.length > 0) {
          console.log('\n⚠️ Issues:');
          for (const issue of validation.issues) {
            console.log(`  - ${issue}`);
          }
        }

        console.log('\n📊 Summary:');
        console.table(validation.summary);
        break;

      case 'report':
        console.log('📊 Generating report...');
        const report = await manager.generateReport();
        const reportPath = join(process.cwd(), 'PACKAGE-METADATA-REPORT.md');
        // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
        await Bun.write(reportPath, report);
        console.log(`📄 Report saved to ${reportPath}`);
        break;

      case 'list':
        const allPackages = await manager.getAllPackages();
        console.log('📦 Registry Packages:');
        for (const pkg of allPackages) {
          console.log(`  - ${pkg.name} (${pkg.version}) - ${pkg.domain}`);
        }
        break;

      default:
        console.log('Usage: bun run package-metadata-manager.bun.ts <command>');
        console.log('Commands:');
        console.log('  scan     - Scan and save package metadata');
        console.log('  validate - Validate existing metadata');
        console.log('  report   - Generate metadata report');
        console.log('  list     - List all packages');
    }
  } finally {
    await manager.close();
  }
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { PackageMetadataManager, type PackageMetadata, type MetadataConfig };
