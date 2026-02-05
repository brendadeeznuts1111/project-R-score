#!/usr/bin/env bun

/**
 * Meta Information Synchronization Script
 * Ensures all package.json files have consistent meta information
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface MetaInfo {
  author: {
    name: string;
    email: string;
    url: string;
  };
  license: string;
  homepage: string;
  repository: {
    type: string;
    url: string;
    directory?: string;
  };
  bugs: {
    url: string;
    email: string;
  };
  funding: {
    type: string;
    url: string;
  };
  keywords: string[];
  engines: {
    bun: string;
    node: string;
  };
}

class MetaSyncManager {
  private mainPackagePath = join(process.cwd(), 'package.json');
  private dashboardWorkerPath = join(process.cwd(), 'dashboard-worker/package.json');
  private standardMeta: MetaInfo;

  constructor() {
    this.standardMeta = {
      author: {
        name: 'Fire22 Development Team',
        email: 'enterprise@fire22.com',
        url: 'https://fire22.com',
      },
      license: 'MIT',
      homepage: 'https://fire22.com',
      repository: {
        type: 'git',
        url: 'https://github.com/fantasy42-fire22/registry.git',
      },
      bugs: {
        url: 'https://github.com/fantasy42-fire22/registry/issues',
        email: 'support@fire22.com',
      },
      funding: {
        type: 'opencollective',
        url: 'https://opencollective.com/fire22',
      },
      keywords: ['fantasy42', 'fire22', 'enterprise', 'bun', 'typescript', 'registry', 'dashboard'],
      engines: {
        bun: '>=1.1.0',
        node: '>=18.0.0',
      },
    };
  }

  async auditMetaInfo(): Promise<{ [key: string]: any }> {
    const report: { [key: string]: any } = {};

    try {
      // Check main package.json
      const mainPkg = JSON.parse(readFileSync(this.mainPackagePath, 'utf-8'));
      report['main'] = this.checkMetaFields(mainPkg, 'main');

      // Check dashboard-worker package.json
      const dashboardPkg = JSON.parse(readFileSync(this.dashboardWorkerPath, 'utf-8'));
      report['dashboard-worker'] = this.checkMetaFields(dashboardPkg, 'dashboard-worker');

      // Check other package.json files
      const otherPackages = this.findAllPackageJson();
      for (const pkgPath of otherPackages) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const relativePath = pkgPath.replace(process.cwd() + '/', '');
        report[relativePath] = this.checkMetaFields(pkg, relativePath);
      }

      return report;
    } catch (error) {
      console.error('Error auditing meta information:', error);
      throw error;
    }
  }

  private checkMetaFields(pkg: any, name: string): any {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check author
    if (!pkg.author) {
      issues.push('Missing author field');
      recommendations.push('Add author information');
    } else if (typeof pkg.author === 'string') {
      recommendations.push('Convert author to object format');
    }

    // Check license
    if (!pkg.license) {
      issues.push('Missing license field');
      recommendations.push('Add license field (MIT recommended)');
    } else if (pkg.license !== this.standardMeta.license) {
      issues.push(`License mismatch: ${pkg.license} vs ${this.standardMeta.license}`);
    }

    // Check homepage
    if (!pkg.homepage) {
      issues.push('Missing homepage field');
      recommendations.push('Add homepage URL');
    }

    // Check repository
    if (!pkg.repository) {
      issues.push('Missing repository field');
      recommendations.push('Add repository information');
    }

    // Check engines
    if (!pkg.engines) {
      issues.push('Missing engines field');
      recommendations.push('Add engine requirements');
    } else {
      if (!pkg.engines.bun) {
        issues.push('Missing Bun engine requirement');
      }
      if (!pkg.engines.node) {
        recommendations.push('Add Node.js engine requirement for compatibility');
      }
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      recommendations,
      current: {
        author: pkg.author,
        license: pkg.license,
        homepage: pkg.homepage,
        repository: pkg.repository,
        engines: pkg.engines,
      },
    };
  }

  private findAllPackageJson(): string[] {
    const packages: string[] = [];

    function scanDir(dir: string) {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            // Check for package.json in this directory
            const pkgPath = join(fullPath, 'package.json');
            try {
              statSync(pkgPath);
              packages.push(pkgPath);
            } catch {
              // No package.json, continue scanning
            }
            scanDir(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    scanDir(process.cwd());
    return packages.filter(pkg => !pkg.includes('node_modules'));
  }

  async syncMetaInfo(): Promise<void> {
    console.log('🔄 Synchronizing meta information...');

    // Sync main package.json
    await this.syncPackageJson(this.mainPackagePath, 'main');

    // Sync dashboard-worker package.json
    await this.syncPackageJson(this.dashboardWorkerPath, 'dashboard-worker');

    console.log('✅ Meta information synchronization complete!');
  }

  private async syncPackageJson(pkgPath: string, name: string): Promise<void> {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      // Update meta fields
      pkg.author = this.standardMeta.author;
      pkg.license = this.standardMeta.license;
      pkg.homepage =
        name === 'main' ? this.standardMeta.homepage : `${this.standardMeta.homepage}/${name}`;
      pkg.bugs = this.standardMeta.bugs;
      pkg.funding = this.standardMeta.funding;

      // Update repository
      if (name === 'main') {
        pkg.repository = {
          type: this.standardMeta.repository.type,
          url: this.standardMeta.repository.url,
        };
      } else {
        pkg.repository = {
          type: this.standardMeta.repository.type,
          url: this.standardMeta.repository.url,
          directory: name,
        };
      }

      // Update engines
      pkg.engines = {
        ...pkg.engines,
        ...this.standardMeta.engines,
      };

      // Update keywords (merge with existing)
      if (!pkg.keywords) {
        pkg.keywords = [...this.standardMeta.keywords];
      } else {
        const existingKeywords = new Set(pkg.keywords);
        this.standardMeta.keywords.forEach(keyword => existingKeywords.add(keyword));
        pkg.keywords = Array.from(existingKeywords);
      }

      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log(`✅ Updated ${name} package.json`);
    } catch (error) {
      console.error(`❌ Failed to update ${name} package.json:`, error);
    }
  }

  async generateReport(): Promise<void> {
    const report = await this.auditMetaInfo();

    console.log('\n📊 Meta Information Audit Report');
    console.log('==================================');

    for (const [name, data] of Object.entries(report)) {
      console.log(`\n📦 ${name}:`);
      console.log(`   Status: ${data.hasIssues ? '❌ Issues Found' : '✅ OK'}`);

      if (data.issues.length > 0) {
        console.log('   Issues:');
        data.issues.forEach((issue: string) => console.log(`     • ${issue}`));
      }

      if (data.recommendations.length > 0) {
        console.log('   Recommendations:');
        data.recommendations.forEach((rec: string) => console.log(`     • ${rec}`));
      }
    }

    const totalIssues = Object.values(report).reduce(
      (sum, data) => sum + (data.hasIssues ? 1 : 0),
      0
    );
    console.log(
      `\n📈 Summary: ${totalIssues} packages with issues out of ${Object.keys(report).length} total`
    );
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'report';

  const manager = new MetaSyncManager();

  switch (command) {
    case 'audit':
    case 'report':
      await manager.generateReport();
      break;

    case 'sync':
      await manager.syncMetaInfo();
      break;

    default:
      console.log('Usage:');
      console.log('  bun run scripts/meta-sync.ts report  # Show meta info report');
      console.log('  bun run scripts/meta-sync.ts sync    # Sync meta info across packages');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { MetaSyncManager };
