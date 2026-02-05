#!/usr/bin/env bun
// scripts/sync-catalogs.ts - Bun v1.3 Catalog Synchronization

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
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

interface SyncResult {
  updated: string[];
  added: string[];
  removed: string[];
  errors: string[];
}

class CatalogSynchronizer {
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

  private extractVersionFromCatalog(packageName: string, catalogRef: string): string | null {
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    if (catalogRef === 'catalog:') {
      return catalog?.[packageName] || null;
    }
    
    const match = catalogRef.match(/^catalog:(.+)$/);
    if (match) {
      const catalogName = match[1];
      return catalogs?.[catalogName]?.[packageName] || null;
    }
    
    return null;
  }

  private findDirectVersions(packageName: string): { version: string; source: string }[] {
    const versions: { version: string; source: string }[] = [];
    
    for (const pkg of this.workspacePackages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      if (allDeps[packageName] && !allDeps[packageName].startsWith('catalog:')) {
        versions.push({
          version: allDeps[packageName],
          source: pkg.name || 'unknown'
        });
      }
    }
    
    return versions;
  }

  private synchronizePackage(packageJson: PackageJson, packagePath: string): SyncResult {
    const result: SyncResult = { updated: [], added: [], removed: [], errors: [] };
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };

    // Find packages that should use catalog but don't
    for (const [depName, version] of Object.entries(allDeps)) {
      if (!version.startsWith('catalog:')) {
        // Check if this dependency exists in any catalog
        const { catalog, catalogs } = this.rootPackageJson.workspaces;
        
        let catalogVersion: string | null = null;
        let catalogName = 'default';
        
        if (catalog?.[depName]) {
          catalogVersion = catalog[depName];
        } else {
          // Search in named catalogs
          for (const [name, catalogDef] of Object.entries(catalogs || {})) {
            if (catalogDef[depName]) {
              catalogVersion = catalogDef[depName];
              catalogName = name;
              break;
            }
          }
        }
        
        if (catalogVersion) {
          // Suggest migration to catalog
          console.log(`📦 ${packageJson.name || 'unknown'}: ${depName}@${version} → catalog:${catalogName}`);
          result.updated.push(`${packageJson.name || 'unknown'}:${depName}`);
        }
      }
    }

    return result;
  }

  private updatePackage(packageJson: PackageJson, packagePath: string, migrations: Array<{ dep: string; catalog: string }>): void {
    let modified = false;
    
    // Update dependencies
    if (packageJson.dependencies) {
      for (const migration of migrations) {
        if (packageJson.dependencies[migration.dep] && !packageJson.dependencies[migration.dep].startsWith('catalog:')) {
          packageJson.dependencies[migration.dep] = `catalog:${migration.catalog}`;
          modified = true;
        }
      }
    }
    
    // Update devDependencies
    if (packageJson.devDependencies) {
      for (const migration of migrations) {
        if (packageJson.devDependencies[migration.dep] && !packageJson.devDependencies[migration.dep].startsWith('catalog:')) {
          packageJson.devDependencies[migration.dep] = `catalog:${migration.catalog}`;
          modified = true;
        }
      }
    }
    
    // Update peerDependencies
    if (packageJson.peerDependencies) {
      for (const migration of migrations) {
        if (packageJson.peerDependencies[migration.dep] && !packageJson.peerDependencies[migration.dep].startsWith('catalog:')) {
          packageJson.peerDependencies[migration.dep] = `catalog:${migration.catalog}`;
          modified = true;
        }
      }
    }
    
    if (modified) {
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    }
  }

  public analyzeSync(): { migrations: Array<{ pkg: string; dep: string; catalog: string; version: string }> } {
    const migrations: Array<{ pkg: string; dep: string; catalog: string; version: string }> = [];
    
    for (const pkg of this.workspacePackages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      for (const [depName, version] of Object.entries(allDeps)) {
        if (!version.startsWith('catalog:')) {
          // Find if this dependency exists in a catalog
          const { catalog, catalogs } = this.rootPackageJson.workspaces;
          
          if (catalog?.[depName]) {
            migrations.push({
              pkg: pkg.name,
              dep: depName,
              catalog: 'default',
              version
            });
          } else {
            // Search in named catalogs
            for (const [catalogName, catalogDef] of Object.entries(catalogs || {})) {
              if (catalogDef[depName]) {
                migrations.push({
                  pkg: pkg.name,
                  dep: depName,
                  catalog: catalogName,
                  version
                });
                break;
              }
            }
          }
        }
      }
    }
    
    return { migrations };
  }

  public sync(applyChanges: boolean = false): SyncResult {
    const result: SyncResult = { updated: [], added: [], removed: [], errors: [] };
    const analysis = this.analyzeSync();
    
    console.log(`🔄 Found ${analysis.migrations.length} potential catalog migrations:\n`);
    
    for (const migration of analysis.migrations) {
      console.log(`   ${migration.pkg}: ${migration.dep}@${migration.version} → catalog:${migration.catalog}`);
    }
    
    if (applyChanges && analysis.migrations.length > 0) {
      console.log('\n🔧 Applying migrations...');
      
      // Group migrations by package
      const migrationsByPackage = new Map<string, Array<{ dep: string; catalog: string }>>();
      
      for (const migration of analysis.migrations) {
        if (!migrationsByPackage.has(migration.pkg)) {
          migrationsByPackage.set(migration.pkg, []);
        }
        migrationsByPackage.get(migration.pkg)!.push({
          dep: migration.dep,
          catalog: migration.catalog
        });
      }
      
      // Apply migrations
      for (const pkg of this.workspacePackages) {
        const migrations = migrationsByPackage.get(pkg.name);
        if (migrations) {
          const packagePath = join(process.cwd(), 'packages', pkg.name, 'package.json');
          
          if (existsSync(packagePath)) {
            try {
              this.updatePackage(pkg, packagePath, migrations);
              result.updated.push(pkg.name);
              console.log(`   ✅ Updated ${pkg.name}`);
            } catch (error) {
              result.errors.push(`Failed to update ${pkg.name}: ${error}`);
              console.log(`   ❌ Failed to update ${pkg.name}`);
            }
          }
        }
      }
    }
    
    return result;
  }

  public generateSyncReport(): string {
    const analysis = this.analyzeSync();
    
    let report = '# 🔄 Bun v1.3 Catalog Synchronization Report\n\n';
    
    report += '## 📊 Analysis Summary\n\n';
    report += `- **Total Packages**: ${this.workspacePackages.length}\n`;
    report += `- **Potential Migrations**: ${analysis.migrations.length}\n`;
    report += `- **Migration Status**: ${analysis.migrations.length === 0 ? '✅ All synchronized' : '⚠️ Migrations available'}\n\n`;

    if (analysis.migrations.length > 0) {
      report += '## 🔄 Recommended Migrations\n\n';
      
      // Group by catalog
      const migrationsByCatalog = new Map<string, Array<{ pkg: string; dep: string; version: string }>>();
      
      for (const migration of analysis.migrations) {
        if (!migrationsByCatalog.has(migration.catalog)) {
          migrationsByCatalog.set(migration.catalog, []);
        }
        migrationsByCatalog.get(migration.catalog)!.push({
          pkg: migration.pkg,
          dep: migration.dep,
          version: migration.version
        });
      }
      
      for (const [catalogName, migrations] of migrationsByCatalog.entries()) {
        report += `### catalog:${catalogName}\n\n`;
        report += '| Package | Dependency | Current Version |\n';
        report += '|---------|------------|----------------|\n';
        
        migrations.forEach(migration => {
          report += `| ${migration.pkg} | ${migration.dep} | ${migration.version} |\n`;
        });
        
        report += '\n';
      }
      
      report += '## 🚀 Apply Migrations\n\n';
      report += 'To apply these migrations, run:\n';
      report += '```bash\n';
      report += 'bun run catalog:sync --apply\n';
      report += '```\n\n';
    }

    // Benefits
    report += '## 💡 Benefits of Catalog Synchronization\n\n';
    report += '- **Version Consistency**: All packages use the same dependency versions\n';
    report += '- **Easy Updates**: Update versions once in the root catalog\n';
    report += '- **Reduced Conflicts**: Eliminates version mismatches across packages\n';
    report += '- **Simplified Maintenance**: Centralized dependency management\n';
    report += '- **Better Security**: Easier to audit and update vulnerable dependencies\n\n';

    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply') || args.includes('-a');
  const generateReport = args.includes('--report') || args.includes('-r');
  
  try {
    console.log('🔄 Analyzing Bun v1.3 Catalog Synchronization...\n');
    
    const synchronizer = new CatalogSynchronizer();
    const result = synchronizer.sync(applyChanges);
    
    if (generateReport) {
      const report = synchronizer.generateSyncReport();
      const reportPath = join(process.cwd(), 'catalog-sync-report.md');
      writeFileSync(reportPath, report);
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    }
    
    if (applyChanges) {
      console.log(`\n✅ Synchronization complete!`);
      console.log(`   Updated packages: ${result.updated.length}`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }
    } else {
      console.log('\n💡 To apply these migrations, run:');
      console.log('   bun run catalog:sync --apply');
      console.log('\n📄 To generate a detailed report, run:');
      console.log('   bun run catalog:sync --report');
    }
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
