#!/usr/bin/env bun
// scripts/catalog-report.ts - Bun v1.3 Comprehensive Catalog Reporting

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface CatalogDefinition {
  [key: string]: string;
}

interface Catalogs {
  [catalogName: string]: CatalogDefinition;
}

interface WorkspaceConfig {
  packages: string[];
  catalog: CatalogDefinition;
  catalogs: Catalogs;
}

interface CatalogReport {
  summary: {
    totalPackages: number;
    totalCatalogEntries: number;
    packagesUsingCatalog: number;
    catalogCoverage: number;
    orphanedEntries: number;
  };
  catalogUsage: Map<string, Array<{ package: string; dependency: string; version: string }>>;
  versionAnalysis: Map<string, Array<{ package: string; currentVersion: string; catalogVersion: string; status: 'synced' | 'outdated' | 'mismatch' }>>;
  recommendations: string[];
}

class CatalogReporter {
  private rootPackageJson!: PackageJson & { workspaces: WorkspaceConfig };
  private workspacePackages: PackageJson[] = [];

  constructor() {
    this.loadRootPackageJson();
    this.loadWorkspacePackages();
  }

  private loadRootPackageJson(): void {
    const rootPackagePath = join(process.cwd(), 'package.json');
    
    if (!existsSync(rootPackagePath)) {
      throw new Error('Root package.json not found');
    }

    const content = readFileSync(rootPackagePath, 'utf-8');
    this.rootPackageJson = JSON.parse(content);

    if (!this.rootPackageJson.workspaces) {
      throw new Error('No workspaces configuration found in root package.json');
    }
  }

  private loadWorkspacePackages(): void {
    const patterns = this.rootPackageJson.workspaces.packages;
    
    for (const pattern of patterns) {
      // Simple glob implementation for package.json files
      const packageJsonPaths = this.findPackageJsonFiles(pattern);
      
      for (const packageJsonPath of packageJsonPaths) {
        const fullPath = join(process.cwd(), packageJsonPath);
        
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf-8');
          const packageJson = JSON.parse(content);
          this.workspacePackages.push(packageJson);
        }
      }
    }
  }

  private findPackageJsonFiles(pattern: string): string[] {
    const results: string[] = [];
    
    // Handle simple glob patterns like "packages/*"
    if (pattern.includes('/*')) {
      const baseDir = pattern.replace('/*', '');
      const fullPath = join(process.cwd(), baseDir);
      
      if (existsSync(fullPath)) {
        try {
          const entries = readdirSync(fullPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const packageJsonPath = join(baseDir, entry.name, 'package.json');
              if (existsSync(join(process.cwd(), packageJsonPath))) {
                results.push(packageJsonPath);
              }
            }
          }
        } catch (error) {
          // Directory might not exist or be readable
        }
      }
    }
    
    return results;
  }

  private extractCatalogName(version: string): string {
    const match = version.match(/^catalog:(.+)$/);
    return match ? match[1] : 'default';
  }

  private getCatalogVersion(packageName: string, catalogName: string): string | null {
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    if (catalogName === 'default') {
      return catalog?.[packageName] || null;
    }
    
    return catalogs?.[catalogName]?.[packageName] || null;
  }

  private analyzeVersionConsistency(): Map<string, Array<{ package: string; currentVersion: string; catalogVersion: string; status: 'synced' | 'outdated' | 'mismatch' }>> {
    const analysis = new Map<string, Array<{ package: string; currentVersion: string; catalogVersion: string; status: 'synced' | 'outdated' | 'mismatch' }>>();
    
    for (const pkg of this.workspacePackages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      for (const [depName, version] of Object.entries(allDeps)) {
        if (version.startsWith('catalog:')) {
          const catalogName = this.extractCatalogName(version);
          const catalogVersion = this.getCatalogVersion(depName, catalogName);
          
          if (catalogVersion) {
            // Check if there are any direct versions in other packages
            const directVersions = this.findDirectVersions(depName);
            
            let status: 'synced' | 'outdated' | 'mismatch' = 'synced';
            
            if (directVersions.length > 0) {
              // Check for mismatches
              const hasMismatch = directVersions.some(dv => dv.version !== catalogVersion);
              if (hasMismatch) {
                status = 'mismatch';
              }
            }
            
            if (!analysis.has(depName)) {
              analysis.set(depName, []);
            }
            
            analysis.get(depName)!.push({
              package: pkg.name,
              currentVersion: catalogVersion,
              catalogVersion,
              status
            });
          }
        }
      }
    }
    
    return analysis;
  }

  private findDirectVersions(packageName: string): Array<{ package: string; version: string }> {
    const versions: Array<{ package: string; version: string }> = [];
    
    for (const pkg of this.workspacePackages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      if (allDeps[packageName] && !allDeps[packageName].startsWith('catalog:')) {
        versions.push({
          package: pkg.name,
          version: allDeps[packageName]
        });
      }
    }
    
    return versions;
  }

  private analyzeCatalogUsage(): Map<string, Array<{ package: string; dependency: string; version: string }>> {
    const usage = new Map<string, Array<{ package: string; dependency: string; version: string }>>();
    
    for (const pkg of this.workspacePackages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      for (const [depName, version] of Object.entries(allDeps)) {
        if (version.startsWith('catalog:')) {
          const catalogName = this.extractCatalogName(version);
          const catalogVersion = this.getCatalogVersion(depName, catalogName);
          
          if (!usage.has(catalogName)) {
            usage.set(catalogName, []);
          }
          
          usage.get(catalogName)!.push({
            package: pkg.name,
            dependency: depName,
            version: catalogVersion || 'unknown'
          });
        }
      }
    }
    
    return usage;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const usage = this.analyzeCatalogUsage();
    const versionAnalysis = this.analyzeVersionConsistency();
    
    // Check catalog coverage
    const packagesUsingCatalog = this.workspacePackages.filter(pkg => {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      return Object.values(allDeps).some(version => version.startsWith('catalog:'));
    }).length;
    
    const coverage = (packagesUsingCatalog / this.workspacePackages.length) * 100;
    
    if (coverage < 100) {
      recommendations.push(`${Math.round(100 - coverage)}% of packages are not using catalogs. Consider migrating remaining packages.`);
    }
    
    // Check for version mismatches
    let mismatches = 0;
    for (const [depName, analyses] of versionAnalysis.entries()) {
      mismatches += analyses.filter(a => a.status === 'mismatch').length;
    }
    
    if (mismatches > 0) {
      recommendations.push(`Found ${mismatches} version mismatches. Run catalog synchronization to resolve.`);
    }
    
    // Check for unused catalog entries
    const usedDependencies = new Set<string>();
    for (const [catalogName, usages] of usage.entries()) {
      usages.forEach(usage => usedDependencies.add(usage.dependency));
    }
    
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    let totalCatalogEntries = Object.keys(catalog || {}).length;
    
    for (const catalogDef of Object.values(catalogs || {})) {
      totalCatalogEntries += Object.keys(catalogDef).length;
    }
    
    const orphaned = totalCatalogEntries - usedDependencies.size;
    if (orphaned > 0) {
      recommendations.push(`Found ${orphaned} unused catalog entries. Consider removing them to reduce maintenance overhead.`);
    }
    
    // Performance recommendations
    if (this.workspacePackages.length > 10) {
      recommendations.push('Consider using isolated installs for better performance in large monorepos.');
    }
    
    // Security recommendations
    recommendations.push('Set up automated dependency updates to keep catalog entries secure.');
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Catalog configuration is optimal!');
    }
    
    return recommendations;
  }

  public generateReport(): CatalogReport {
    const usage = this.analyzeCatalogUsage();
    const versionAnalysis = this.analyzeVersionConsistency();
    const recommendations = this.generateRecommendations();
    
    // Calculate summary
    const packagesUsingCatalog = this.workspacePackages.filter(pkg => {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      return Object.values(allDeps).some(version => version.startsWith('catalog:'));
    }).length;
    
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    let totalCatalogEntries = Object.keys(catalog || {}).length;
    for (const catalogDef of Object.values(catalogs || {})) {
      totalCatalogEntries += Object.keys(catalogDef).length;
    }
    
    const usedDependencies = new Set<string>();
    for (const usages of usage.values()) {
      usages.forEach(usage => usedDependencies.add(usage.dependency));
    }
    
    return {
      summary: {
        totalPackages: this.workspacePackages.length,
        totalCatalogEntries,
        packagesUsingCatalog,
        catalogCoverage: Math.round((packagesUsingCatalog / this.workspacePackages.length) * 100),
        orphanedEntries: totalCatalogEntries - usedDependencies.size
      },
      catalogUsage: usage,
      versionAnalysis,
      recommendations
    };
  }

  public generateMarkdownReport(): string {
    const report = this.generateReport();
    
    let markdown = '# 📊 Bun v1.3 Catalog Comprehensive Report\n\n';
    markdown += `*Generated on ${new Date().toISOString()}*\n\n`;
    
    // Executive Summary
    markdown += '## 📋 Executive Summary\n\n';
    markdown += '| Metric | Value |\n';
    markdown += '|--------|-------|\n';
    markdown += `| Total Packages | ${report.summary.totalPackages} |\n`;
    markdown += `| Catalog Coverage | ${report.summary.catalogCoverage}% |\n`;
    markdown += `| Catalog Entries | ${report.summary.totalCatalogEntries} |\n`;
    markdown += `| Packages Using Catalog | ${report.summary.packagesUsingCatalog} |\n`;
    markdown += `| Orphaned Entries | ${report.summary.orphanedEntries} |\n\n`;
    
    // Coverage Status
    const coverageEmoji = report.summary.catalogCoverage === 100 ? '🟢' : 
                         report.summary.catalogCoverage >= 80 ? '🟡' : '🔴';
    markdown += `${coverageEmoji} **Catalog Coverage**: ${report.summary.catalogCoverage}%\n\n`;
    
    // Catalog Usage Analysis
    markdown += '## 📚 Catalog Usage Analysis\n\n';
    
    for (const [catalogName, usages] of report.catalogUsage.entries()) {
      markdown += `### catalog:${catalogName}\n\n`;
      markdown += `**Usage Count**: ${usages.length} packages\n\n`;
      
      if (usages.length > 0) {
        markdown += '| Package | Dependency | Version |\n';
        markdown += '|---------|------------|---------|\n';
        
        usages.sort((a, b) => a.package.localeCompare(b.package));
        usages.forEach(usage => {
          markdown += `| ${usage.package} | ${usage.dependency} | ${usage.version} |\n`;
        });
        markdown += '\n';
      }
    }
    
    // Version Consistency Analysis
    markdown += '## 🔍 Version Consistency Analysis\n\n';
    
    if (report.versionAnalysis.size > 0) {
      let totalMismatches = 0;
      let totalSynced = 0;
      
      for (const [depName, analyses] of report.versionAnalysis.entries()) {
        const mismatches = analyses.filter(a => a.status === 'mismatch').length;
        const synced = analyses.filter(a => a.status === 'synced').length;
        
        totalMismatches += mismatches;
        totalSynced += synced;
        
        if (mismatches > 0) {
          markdown += `### ⚠️ ${depName} - ${mismatches} mismatches\n\n`;
          markdown += '| Package | Status |\n';
          markdown += '|---------|--------|\n';
          
          analyses.forEach(analysis => {
            const statusEmoji = analysis.status === 'synced' ? '✅' : 
                               analysis.status === 'mismatch' ? '❌' : '⚠️';
            markdown += `| ${analysis.package} | ${statusEmoji} ${analysis.status} |\n`;
          });
          markdown += '\n';
        }
      }
      
      // Summary
      markdown += '### 📈 Consistency Summary\n\n';
      markdown += `- ✅ Synced dependencies: ${totalSynced}\n`;
      markdown += `- ❌ Version mismatches: ${totalMismatches}\n`;
      markdown += `- 📊 Consistency rate: ${Math.round((totalSynced / (totalSynced + totalMismatches)) * 100)}%\n\n`;
    } else {
      markdown += '✅ No catalog dependencies found or all are perfectly synchronized.\n\n';
    }
    
    // Package Details
    markdown += '## 📦 Package Details\n\n';
    markdown += '| Package | Dependencies | Catalog Usage | Status |\n';
    markdown += '|---------|--------------|---------------|--------|\n';
    
    this.workspacePackages
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(pkg => {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
        const totalDeps = Object.keys(allDeps).length;
        const catalogDeps = Object.values(allDeps).filter(v => v.startsWith('catalog:')).length;
        const usage = catalogDeps > 0 ? `${catalogDeps}/${totalDeps}` : '0/0';
        const status = catalogDeps === totalDeps ? '✅ Full' : 
                      catalogDeps > 0 ? '🟡 Partial' : '🔴 None';
        
        markdown += `| ${pkg.name} | ${totalDeps} | ${usage} | ${status} |\n`;
      });
    markdown += '\n';
    
    // Recommendations
    markdown += '## 💡 Recommendations\n\n';
    report.recommendations.forEach((rec, index) => {
      markdown += `${index + 1}. ${rec}\n`;
    });
    markdown += '\n';
    
    // Next Steps
    markdown += '## 🚀 Next Steps\n\n';
    markdown += '### Immediate Actions\n';
    markdown += '1. **Run catalog validation**: `bun run catalog:validate`\n';
    markdown += '2. **Check for updates**: `bun run catalog:update --check-outdated`\n';
    markdown += '3. **Synchronize versions**: `bun run catalog:sync --report`\n\n';
    
    markdown += '### Maintenance Tasks\n';
    markdown += '1. **Set up automated updates**: Configure GitHub Actions or similar\n';
    markdown += '2. **Regular audits**: Schedule monthly catalog reviews\n';
    markdown += '3. **Security monitoring**: Implement vulnerability scanning\n\n';
    
    // Performance Tips
    markdown += '### ⚡ Performance Tips\n';
    markdown += '- Use isolated installs for better performance: `bun install --linker=isolated`\n';
    markdown += '- Enable Bun\'s fast install: `bun install --backend=iouring`\n';
    markdown += '- Cache node_modules in CI/CD pipelines\n\n';
    
    return markdown;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                    join(process.cwd(), 'catalog-report.md');
  
  try {
    console.log('📊 Generating comprehensive catalog report...\n');
    
    const reporter = new CatalogReporter();
    const markdown = reporter.generateMarkdownReport();
    
    writeFileSync(outputPath, markdown);
    
    console.log(`✅ Report generated successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    console.log('\n📊 Report Summary:');
    
    const report = reporter.generateReport();
    console.log(`   Total packages: ${report.summary.totalPackages}`);
    console.log(`   Catalog coverage: ${report.summary.catalogCoverage}%`);
    console.log(`   Catalog entries: ${report.summary.totalCatalogEntries}`);
    console.log(`   Orphaned entries: ${report.summary.orphanedEntries}`);
    console.log(`   Recommendations: ${report.recommendations.length}`);
    
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
