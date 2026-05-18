#!/usr/bin/env bun

/**
 * 📦 Package Development Workflow for Fantasy42-Fire22
 *
 * Streamlined workflow for developing enterprise packages locally
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join, relative, resolve, dirname, basename } from 'path';
import { execSync } from 'child_process';

interface PackageInfo {
  name: string;
  path: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

class PackageDevWorkflow {
  private packages: Map<string, PackageInfo> = new Map();
  private linkedPackages: Set<string> = new Set();

  constructor() {
    // Constructor will be async in main execution
  }

  async initialize(): Promise<void> {
    await this.discoverPackages();
  }

  private async discoverPackages(): Promise<void> {
    const enterpriseDir = join(process.cwd(), 'enterprise', 'packages');

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
    if (!(await Bun.file(enterpriseDir).exists())) {
      console.info('⚠️ Enterprise packages directory not found');
      return;
    }

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob for package discovery
      const packageJsonFiles = await Array.fromAsync(
        fs.glob(join(enterpriseDir, '**/*/package.json'), {
          exclude: ['**/node_modules/**', '**/dist/**', '**/build/**']
        })
      );

      for (const packageJsonPath of packageJsonFiles) {
        const pkgPath = dirname(packageJsonPath);
        await this.loadPackageInfo(pkgPath);
      }
    }

    console.info(`📦 Discovered ${this.packages.size} enterprise packages`);
  }

  private async loadPackageInfo(pkgPath: string): Promise<void> {
    try {
      const pkgJsonPath = join(pkgPath, 'package.json');
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const pkgJson = await Bun.file(pkgJsonPath).json();

      this.packages.set(pkgJson.name, {
        name: pkgJson.name,
        path: pkgPath,
        version: pkgJson.version,
        dependencies: pkgJson.dependencies || {},
        devDependencies: pkgJson.devDependencies || {},
      });
    } catch (error) {
      console.info(`⚠️ Failed to load package info from ${pkgPath}`);
    }
  }

  async linkPackage(packageName: string): Promise<boolean> {
    if (!this.packages.has(packageName)) {
      console.info(`❌ Package ${packageName} not found`);
      return false;
    }

    const pkg = this.packages.get(packageName)!;

    try {
      // Change to package directory and link
      process.chdir(pkg.path);
      execSync('bun link', { stdio: 'inherit' });

      // Change back to root
      process.chdir(join(__dirname, '..', '..'));

      // Link in main project
      execSync(`bun link ${packageName}`, { stdio: 'inherit' });

      this.linkedPackages.add(packageName);
      console.info(`✅ Package ${packageName} linked successfully`);
      return true;
    } catch (error) {
      console.info(`❌ Failed to link package ${packageName}:`, error);
      return false;
    }
  }

  async unlinkPackage(packageName: string): Promise<boolean> {
    if (!this.packages.has(packageName)) {
      console.info(`❌ Package ${packageName} not found`);
      return false;
    }

    try {
      // Unlink from main project
      execSync(`bun unlink ${packageName}`, { stdio: 'inherit' });

      // Change to package directory and unlink
      const pkg = this.packages.get(packageName)!;
      process.chdir(pkg.path);
      execSync('bun unlink', { stdio: 'inherit' });

      // Change back to root
      process.chdir(join(__dirname, '..', '..'));

      this.linkedPackages.delete(packageName);
      console.info(`✅ Package ${packageName} unlinked successfully`);
      return true;
    } catch (error) {
      console.info(`❌ Failed to unlink package ${packageName}:`, error);
      return false;
    }
  }

  async buildPackage(packageName: string): Promise<boolean> {
    if (!this.packages.has(packageName)) {
      console.info(`❌ Package ${packageName} not found`);
      return false;
    }

    const pkg = this.packages.get(packageName)!;

    try {
      process.chdir(pkg.path);

      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      if (await Bun.file('build-demo.js').exists()) {
        execSync('bun run build:demo', { stdio: 'inherit' });
      } else if (await Bun.file('package.json').exists()) {
        // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
        const pkgJson = await Bun.file('package.json').json();
        if (pkgJson.scripts && pkgJson.scripts.build) {
          execSync('bun run build', { stdio: 'inherit' });
        } else {
          execSync('bun build ./src/index.ts --outdir ./dist', { stdio: 'inherit' });
        }
      }

      process.chdir(join(__dirname, '..', '..'));
      console.info(`✅ Package ${packageName} built successfully`);
      return true;
    } catch (error) {
      console.info(`❌ Failed to build package ${packageName}:`, error);
      process.chdir(join(__dirname, '..', '..'));
      return false;
    }
  }

  async watchPackage(packageName: string): Promise<void> {
    if (!this.packages.has(packageName)) {
      console.info(`❌ Package ${packageName} not found`);
      return;
    }

    const pkg = this.packages.get(packageName)!;

    console.info(`👀 Watching package ${packageName} for changes...`);
    console.info(`📁 Path: ${relative(process.cwd(), pkg.path)}`);
    console.info(`🔗 Status: ${this.linkedPackages.has(packageName) ? 'Linked' : 'Not linked'}`);

    // This would implement file watching for rebuilds
    // For now, just show instructions
    console.info('\n💡 To watch for changes:');
    console.info(`1. Open terminal in: ${pkg.path}`);
    console.info(`2. Run: bun run build --watch`);
    console.info(`3. The package will rebuild on file changes`);
  }

  listPackages(): void {
    console.info('\n📦 Enterprise Packages:\n');

    for (const [name, pkg] of this.packages) {
      const status = this.linkedPackages.has(name) ? '🔗 Linked' : '📦 Available';
      const relativePath = relative(process.cwd(), pkg.path);

      console.info(`${status} ${name}@${pkg.version}`);
      console.info(`   📁 ${relativePath}`);

      // Show dependencies on other enterprise packages
      const enterpriseDeps = Object.keys(pkg.dependencies).filter(dep => this.packages.has(dep));

      if (enterpriseDeps.length > 0) {
        console.info(`   🔗 Depends on: ${enterpriseDeps.join(', ')}`);
      }

      console.info('');
    }
  }

  showPackageDetails(packageName: string): void {
    if (!this.packages.has(packageName)) {
      console.info(`❌ Package ${packageName} not found`);
      return;
    }

    const pkg = this.packages.get(packageName)!;

    console.info(`\n📦 Package Details: ${packageName}\n`);
    console.info(`📁 Path: ${relative(process.cwd(), pkg.path)}`);
    console.info(`🏷️ Version: ${pkg.version}`);
    console.info(`🔗 Status: ${this.linkedPackages.has(packageName) ? 'Linked' : 'Not linked'}`);

    console.info('\n📋 Dependencies:');
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (Object.keys(allDeps).length === 0) {
      console.info('   (none)');
    } else {
      for (const [dep, version] of Object.entries(allDeps)) {
        const isEnterprise = this.packages.has(dep);
        const marker = isEnterprise ? '🔗' : '📦';
        console.info(`   ${marker} ${dep}@${version}`);
      }
    }

    console.info('\n🛠️ Available Scripts:');
    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const pkgJson = await Bun.file(join(pkg.path, 'package.json')).json();
      if (pkgJson.scripts) {
        for (const [script, command] of Object.entries(pkgJson.scripts)) {
          console.info(`   ▶️ ${script}: ${command}`);
        }
      } else {
        console.info('   (none defined)');
      }
    } catch (error) {
      console.info('   ⚠️ Could not read package.json');
    }
  }

  async setupWorkspaceLinks(): Promise<void> {
    console.info('🔗 Setting up workspace package links...');

    let successCount = 0;
    let failCount = 0;

    for (const [name, pkg] of this.packages) {
      try {
        process.chdir(pkg.path);
        execSync('bun link', { stdio: 'pipe' });
        process.chdir(join(__dirname, '..', '..'));

        this.linkedPackages.add(name);
        successCount++;
        console.info(`✅ Linked ${name}`);
      } catch (error) {
        failCount++;
        console.info(`❌ Failed to link ${name}`);
      }
    }

    console.info(`\n📊 Link Summary: ${successCount} successful, ${failCount} failed`);

    if (successCount > 0) {
      console.info('\n💡 To use linked packages in the main project:');
      console.info('   bun link <package-name>');
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  const packageName = args[1];

  // Initialize workflow with async discovery
  const workflow = new PackageDevWorkflow();
  await workflow.initialize();

  switch (command) {
    case 'list':
      workflow.listPackages();
      break;

    case 'link':
      if (!packageName) {
        console.info('Usage: bun run scripts/package-dev-workflow.bun.ts link <package-name>');
        break;
      }
      await workflow.linkPackage(packageName);
      break;

    case 'unlink':
      if (!packageName) {
        console.info('Usage: bun run scripts/package-dev-workflow.bun.ts unlink <package-name>');
        break;
      }
      await workflow.unlinkPackage(packageName);
      break;

    case 'build':
      if (!packageName) {
        console.info('Usage: bun run scripts/package-dev-workflow.bun.ts build <package-name>');
        break;
      }
      await workflow.buildPackage(packageName);
      break;

    case 'watch':
      if (!packageName) {
        console.info('Usage: bun run scripts/package-dev-workflow.bun.ts watch <package-name>');
        break;
      }
      await workflow.watchPackage(packageName);
      break;

    case 'info':
      if (!packageName) {
        console.info('Usage: bun run scripts/package-dev-workflow.bun.ts info <package-name>');
        break;
      }
      workflow.showPackageDetails(packageName);
      break;

    case 'setup-links':
      await workflow.setupWorkspaceLinks();
      break;

    default:
      console.info('🔧 Package Development Workflow\n');
      console.info('Commands:');
      console.info('  list                 - List all enterprise packages');
      console.info('  link <package>       - Link package for development');
      console.info('  unlink <package>     - Unlink package');
      console.info('  build <package>      - Build specific package');
      console.info('  watch <package>      - Watch package for changes');
      console.info('  info <package>       - Show package details');
      console.info('  setup-links          - Setup all workspace links');
      console.info('');
      console.info('Examples:');
      console.info('  bun run scripts/package-dev-workflow.bun.ts list');
      console.info(
        '  bun run scripts/package-dev-workflow.bun.ts link @fire22-registry/betting-engine'
      );
      console.info(
        '  bun run scripts/package-dev-workflow.bun.ts build @fire22-registry/analytics-dashboard'
      );
      break;
  }
}

export { PackageDevWorkflow };
