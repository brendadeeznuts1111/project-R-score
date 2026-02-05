#!/usr/bin/env bun
// scripts/validate-catalogs.ts - Bun v1.3 Catalog Validation

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

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

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalPackages: number;
    packagesUsingCatalog: number;
    catalogReferences: number;
    orphanedDependencies: number;
  };
}

class CatalogValidator {
  private rootPackageJson!: PackageJson & { workspaces: WorkspaceConfig };
  private workspacePackages: PackageJson[] = [];
  private catalogReferences = new Map<string, string[]>();

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

  private isCatalogReference(version: string): boolean {
    return version.startsWith('catalog:');
  }

  private extractCatalogName(version: string): string {
    const match = version.match(/^catalog:(.+)$/);
    return match ? match[1] : 'default';
  }

  private validateCatalogReference(
    packageName: string, 
    version: string, 
    sourcePackage: string
  ): string[] {
    const errors: string[] = [];
    
    if (!this.isCatalogReference(version)) {
      return errors;
    }

    const catalogName = this.extractCatalogName(version);
    const { catalog, catalogs } = this.rootPackageJson.workspaces;

    // Check if catalog exists
    if (catalogName === 'default') {
      if (!catalog || !catalog[packageName]) {
        errors.push(
          `Package "${packageName}" referenced from catalog:default in "${sourcePackage}" not found in root catalog`
        );
      }
    } else {
      if (!catalogs || !catalogs[catalogName] || !catalogs[catalogName][packageName]) {
        errors.push(
          `Package "${packageName}" referenced from catalog:${catalogName} in "${sourcePackage}" not found in ${catalogName} catalog`
        );
      }
    }

    // Track catalog usage
    if (!this.catalogReferences.has(catalogName)) {
      this.catalogReferences.set(catalogName, []);
    }
    this.catalogReferences.get(catalogName)!.push(`${sourcePackage}:${packageName}`);

    return errors;
  }

  private validatePackage(packageJson: PackageJson): string[] {
    const errors: string[] = [];
    const packageName = packageJson.name || 'unknown';

    // Validate dependencies
    if (packageJson.dependencies) {
      for (const [depName, version] of Object.entries(packageJson.dependencies)) {
        errors.push(...this.validateCatalogReference(depName, version, packageName));
      }
    }

    // Validate devDependencies
    if (packageJson.devDependencies) {
      for (const [depName, version] of Object.entries(packageJson.devDependencies)) {
        errors.push(...this.validateCatalogReference(depName, version, packageName));
      }
    }

    // Validate peerDependencies
    if (packageJson.peerDependencies) {
      for (const [depName, version] of Object.entries(packageJson.peerDependencies)) {
        errors.push(...this.validateCatalogReference(depName, version, packageName));
      }
    }

    return errors;
  }

  private findOrphanedDependencies(): string[] {
    const orphaned: string[] = [];
    const { catalog, catalogs } = this.rootPackageJson.workspaces;

    // Check default catalog
    if (catalog) {
      for (const [depName] of Object.entries(catalog)) {
        const isUsed = Array.from(this.catalogReferences.values())
          .some(refs => refs.some(ref => ref.endsWith(`:${depName}`)));
        
        if (!isUsed) {
          orphaned.push(`${depName} (catalog:default)`);
        }
      }
    }

    // Check named catalogs
    if (catalogs) {
      for (const [catalogName, catalogDef] of Object.entries(catalogs)) {
        for (const [depName] of Object.entries(catalogDef)) {
          const isUsed = this.catalogReferences.get(catalogName)
            ?.some(ref => ref.endsWith(`:${depName}`)) || false;
          
          if (!isUsed) {
            orphaned.push(`${depName} (catalog:${catalogName})`);
          }
        }
      }
    }

    return orphaned;
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let catalogReferenceCount = 0;

    // Validate all workspace packages
    for (const packageJson of this.workspacePackages) {
      const packageErrors = this.validatePackage(packageJson);
      errors.push(...packageErrors);

      // Count catalog references
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      catalogReferenceCount += Object.values(allDeps)
        .filter(version => this.isCatalogReference(version)).length;
    }

    // Find orphaned dependencies
    const orphaned = this.findOrphanedDependencies();
    if (orphaned.length > 0) {
      warnings.push(`Found ${orphaned.length} unused catalog dependencies: ${orphaned.join(', ')}`);
    }

    const packagesUsingCatalog = this.workspacePackages.filter(pkg => {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      return Object.values(allDeps).some(version => this.isCatalogReference(version));
    }).length;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalPackages: this.workspacePackages.length,
        packagesUsingCatalog,
        catalogReferences: catalogReferenceCount,
        orphanedDependencies: orphaned.length
      }
    };
  }

  public generateReport(): string {
    const result = this.validate();
    
    let report = '# 📋 Bun v1.3 Catalog Validation Report\n\n';
    
    // Summary
    report += '## 📊 Summary\n\n';
    report += `- **Status**: ${result.valid ? '✅ Valid' : '❌ Invalid'}\n`;
    report += `- **Total Packages**: ${result.summary.totalPackages}\n`;
    report += `- **Packages Using Catalog**: ${result.summary.packagesUsingCatalog}\n`;
    report += `- **Catalog References**: ${result.summary.catalogReferences}\n`;
    report += `- **Orphaned Dependencies**: ${result.summary.orphanedDependencies}\n\n`;

    // Catalog Usage
    report += '## 📚 Catalog Usage\n\n';
    for (const [catalogName, refs] of this.catalogReferences.entries()) {
      report += `### ${catalogName === 'default' ? 'Default Catalog' : catalogName}\n`;
      report += `Used by ${refs.length} packages:\n`;
      refs.forEach(ref => report += `- ${ref}\n`);
      report += '\n';
    }

    // Errors
    if (result.errors.length > 0) {
      report += '## ❌ Errors\n\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    // Warnings
    if (result.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      result.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += '## 💡 Recommendations\n\n';
    if (result.summary.packagesUsingCatalog < result.summary.totalPackages) {
      report += '- Consider migrating remaining packages to use catalog dependencies\n';
    }
    if (result.summary.orphanedDependencies > 0) {
      report += '- Remove unused catalog dependencies to reduce maintenance overhead\n';
    }
    if (result.valid) {
      report += '- ✅ Catalog configuration is optimal!\n';
    }

    return report;
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Validating Bun v1.3 Catalog Configuration...\n');
    
    const validator = new CatalogValidator();
    const result = validator.validate();
    
    if (result.valid) {
      console.log('✅ Catalog validation passed!\n');
    } else {
      console.log('❌ Catalog validation failed!\n');
    }

    // Print summary
    console.log('📊 Summary:');
    console.log(`   Total packages: ${result.summary.totalPackages}`);
    console.log(`   Using catalog: ${result.summary.packagesUsingCatalog}`);
    console.log(`   Catalog references: ${result.summary.catalogReferences}`);
    console.log(`   Orphaned dependencies: ${result.summary.orphanedDependencies}`);

    // Print errors
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`   ${error}`));
    }

    // Print warnings
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    // Generate detailed report
    const report = validator.generateReport();
    console.log('\n📄 Detailed report generated');
    
    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
