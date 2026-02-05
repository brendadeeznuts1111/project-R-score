#!/usr/bin/env bun
// scripts/update-catalogs.ts - Bun v1.3 Catalog Update Management

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

interface UpdateOptions {
  dryRun?: boolean;
  catalog?: string;
  package?: string;
  version?: string;
  latest?: boolean;
  checkOutdated?: boolean;
}

interface UpdateResult {
  updated: Array<{ catalog: string; package: string; oldVersion: string; newVersion: string }>;
  errors: string[];
  warnings: string[];
}

class CatalogUpdater {
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

  private async getLatestVersion(packageName: string): Promise<string> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
      if (response.ok) {
        const data = await response.json();
        return data.version;
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch latest version for ${packageName}`);
    }
    return '';
  }

  private async getPackageVersions(packageName: string): Promise<string[]> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${packageName}`);
      if (response.ok) {
        const data = await response.json();
        return Object.keys(data.versions).sort((a, b) => {
          // Simple semver comparison
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart !== bPart) return bPart - aPart; // Descending
          }
          return 0;
        });
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch versions for ${packageName}`);
    }
    return [];
  }

  private findCatalogEntry(packageName: string): { catalog: string; version: string } | null {
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    // Check default catalog
    if (catalog?.[packageName]) {
      return { catalog: 'default', version: catalog[packageName] };
    }
    
    // Check named catalogs
    if (catalogs) {
      for (const [catalogName, catalogDef] of Object.entries(catalogs)) {
        if (catalogDef[packageName]) {
          return { catalog: catalogName, version: catalogDef[packageName] };
        }
      }
    }
    
    return null;
  }

  private updateCatalogEntry(
    catalogName: string, 
    packageName: string, 
    newVersion: string,
    dryRun: boolean = false
  ): { oldVersion: string; updated: boolean } {
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    let oldVersion = '';
    let updated = false;
    
    if (catalogName === 'default') {
      oldVersion = catalog?.[packageName] || '';
      if (oldVersion !== newVersion) {
        if (!dryRun) {
          if (!this.rootPackageJson.workspaces.catalog) {
            this.rootPackageJson.workspaces.catalog = {};
          }
          this.rootPackageJson.workspaces.catalog[packageName] = newVersion;
        }
        updated = true;
      }
    } else {
      if (!catalogs?.[catalogName]) {
        if (!dryRun) {
          if (!this.rootPackageJson.workspaces.catalogs) {
            this.rootPackageJson.workspaces.catalogs = {};
          }
          this.rootPackageJson.workspaces.catalogs[catalogName] = {};
        }
      }
      oldVersion = catalogs?.[catalogName]?.[packageName] || '';
      if (oldVersion !== newVersion) {
        if (!dryRun) {
          this.rootPackageJson.workspaces.catalogs[catalogName][packageName] = newVersion;
        }
        updated = true;
      }
    }
    
    return { oldVersion, updated };
  }

  public async checkOutdatedPackages(): Promise<Array<{ package: string; catalog: string; current: string; latest: string }>> {
    const outdated: Array<{ package: string; catalog: string; current: string; latest: string }> = [];
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    // Check default catalog
    if (catalog) {
      for (const [packageName, currentVersion] of Object.entries(catalog)) {
        const latestVersion = await this.getLatestVersion(packageName);
        if (latestVersion && currentVersion !== latestVersion) {
          outdated.push({
            package: packageName,
            catalog: 'default',
            current: currentVersion,
            latest: latestVersion
          });
        }
      }
    }
    
    // Check named catalogs
    if (catalogs) {
      for (const [catalogName, catalogDef] of Object.entries(catalogs)) {
        for (const [packageName, currentVersion] of Object.entries(catalogDef)) {
          const latestVersion = await this.getLatestVersion(packageName);
          if (latestVersion && currentVersion !== latestVersion) {
            outdated.push({
              package: packageName,
              catalog: catalogName,
              current: currentVersion,
              latest: latestVersion
            });
          }
        }
      }
    }
    
    return outdated;
  }

  public async updateCatalog(options: UpdateOptions): Promise<UpdateResult> {
    const result: UpdateResult = { updated: [], errors: [], warnings: [] };
    
    if (options.checkOutdated) {
      console.log('🔍 Checking for outdated packages...\n');
      const outdated = await this.checkOutdatedPackages();
      
      if (outdated.length === 0) {
        console.log('✅ All catalog packages are up to date!\n');
      } else {
        console.log(`📦 Found ${outdated.length} outdated packages:\n`);
        
        // Group by catalog
        const outdatedByCatalog = new Map<string, Array<{ package: string; current: string; latest: string }>>();
        
        for (const pkg of outdated) {
          if (!outdatedByCatalog.has(pkg.catalog)) {
            outdatedByCatalog.set(pkg.catalog, []);
          }
          outdatedByCatalog.get(pkg.catalog)!.push({
            package: pkg.package,
            current: pkg.current,
            latest: pkg.latest
          });
        }
        
        for (const [catalogName, packages] of outdatedByCatalog.entries()) {
          console.log(`\n📚 catalog:${catalogName}`);
          console.log('| Package | Current | Latest |');
          console.log('|---------|---------|--------|');
          
          packages.forEach(pkg => {
            console.log(`| ${pkg.package} | ${pkg.current} | ${pkg.latest} |`);
          });
        }
        
        console.log('\n💡 To update all outdated packages, run:');
        console.log('   bun run catalog:update --latest');
      }
      
      return result;
    }
    
    if (options.package) {
      if (!options.catalog) {
        result.errors.push('Catalog name is required when updating a specific package');
        return result;
      }
      
      let newVersion = options.version || '';
      
      if (options.latest || !newVersion) {
        console.log(`📡 Fetching latest version for ${options.package}...`);
        newVersion = await this.getLatestVersion(options.package);
        
        if (!newVersion) {
          result.errors.push(`Could not determine latest version for ${options.package}`);
          return result;
        }
      }
      
      console.log(`🔄 Updating ${options.package} in catalog:${options.catalog} to ${newVersion}`);
      
      const updateResult = this.updateCatalogEntry(
        options.catalog,
        options.package,
        newVersion,
        options.dryRun
      );
      
      if (updateResult.updated) {
        result.updated.push({
          catalog: options.catalog,
          package: options.package,
          oldVersion: updateResult.oldVersion,
          newVersion
        });
        
        console.log(`   ✅ Updated: ${updateResult.oldVersion} → ${newVersion}`);
      } else {
        console.log(`   ℹ️ Already at version ${newVersion}`);
      }
    }
    
    if (options.latest) {
      console.log('🔄 Updating all catalog packages to latest versions...\n');
      
      const outdated = await this.checkOutdatedPackages();
      
      for (const pkg of outdated) {
        const updateResult = this.updateCatalogEntry(
          pkg.catalog,
          pkg.package,
          pkg.latest,
          options.dryRun
        );
        
        if (updateResult.updated) {
          result.updated.push({
            catalog: pkg.catalog,
            package: pkg.package,
            oldVersion: updateResult.oldVersion,
            newVersion: pkg.latest
          });
          
          console.log(`✅ ${pkg.package} (catalog:${pkg.catalog}): ${updateResult.oldVersion} → ${pkg.latest}`);
        }
      }
    }
    
    // Save changes if not dry run
    if (!options.dryRun && result.updated.length > 0) {
      const rootPackagePath = join(process.cwd(), 'package.json');
      writeFileSync(rootPackagePath, JSON.stringify(this.rootPackageJson, null, 2) + '\n');
      console.log(`\n💾 Updated package.json with ${result.updated.length} changes`);
    }
    
    if (options.dryRun && result.updated.length > 0) {
      console.log(`\n🔍 Dry run complete. ${result.updated.length} updates would be applied.`);
      console.log('   Use --apply to apply these changes.');
    }
    
    return result;
  }

  public generateUpdateReport(): string {
    let report = '# 📦 Bun v1.3 Catalog Management Report\n\n';
    
    report += '## 📊 Catalog Overview\n\n';
    
    const { catalog, catalogs } = this.rootPackageJson.workspaces;
    
    // Default catalog
    if (catalog) {
      report += '### Default Catalog\n\n';
      report += '| Package | Version |\n';
      report += '|---------|---------|\n';
      
      for (const [packageName, version] of Object.entries(catalog)) {
        report += `| ${packageName} | ${version} |\n`;
      }
      report += '\n';
    }
    
    // Named catalogs
    if (catalogs) {
      for (const [catalogName, catalogDef] of Object.entries(catalogs)) {
        report += `### catalog:${catalogName}\n\n`;
        report += '| Package | Version |\n';
        report += '|---------|---------|\n';
        
        for (const [packageName, version] of Object.entries(catalogDef)) {
          report += `| ${packageName} | ${version} |\n`;
        }
        report += '\n';
      }
    }
    
    // Usage examples
    report += '## 🚀 Usage Examples\n\n';
    report += '### Check for outdated packages\n';
    report += '```bash\n';
    report += 'bun run catalog:update --check-outdated\n';
    report += '```\n\n';
    
    report += '### Update specific package\n';
    report += '```bash\n';
    report += 'bun run catalog:update --package typescript --catalog default --latest\n';
    report += '```\n\n';
    
    report += '### Update all packages to latest\n';
    report += '```bash\n';
    report += 'bun run catalog:update --latest\n';
    report += '```\n\n';
    
    report += '### Dry run updates\n';
    report += '```bash\n';
    report += 'bun run catalog:update --latest --dry-run\n';
    report += '```\n\n';
    
    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  const options: UpdateOptions = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    checkOutdated: args.includes('--check-outdated') || args.includes('-c'),
    latest: args.includes('--latest') || args.includes('-l')
  };
  
  // Parse specific options
  const packageIndex = args.indexOf('--package') || args.indexOf('-p');
  if (packageIndex !== -1 && args[packageIndex + 1]) {
    options.package = args[packageIndex + 1];
  }
  
  const catalogIndex = args.indexOf('--catalog') || args.indexOf('-n');
  if (catalogIndex !== -1 && args[catalogIndex + 1]) {
    options.catalog = args[catalogIndex + 1];
  }
  
  const versionIndex = args.indexOf('--version') || args.indexOf('-v');
  if (versionIndex !== -1 && args[versionIndex + 1]) {
    options.version = args[versionIndex + 1];
  }
  
  try {
    console.log('📦 Bun v1.3 Catalog Update Manager\n');
    
    const updater = new CatalogUpdater();
    const result = await updater.updateCatalog(options);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (result.updated.length > 0) {
      console.log(`\n✅ Updated ${result.updated.length} packages:`);
      result.updated.forEach(update => {
        console.log(`   ${update.package} (catalog:${update.catalog}): ${update.oldVersion} → ${update.newVersion}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
