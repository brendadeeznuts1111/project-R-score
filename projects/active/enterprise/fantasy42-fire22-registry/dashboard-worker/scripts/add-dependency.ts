#!/usr/bin/env bun
/**
 * Safe Dependency Addition Script for Fire22 Dashboard
 * Ensures proper registry usage and Cloudflare Workers compatibility
 */

import { $ } from 'bun';
import { existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';

interface DependencyInfo {
  name: string;
  version?: string;
  isDev: boolean;
  description?: string;
  license?: string;
  homepage?: string;
  dependencies?: Record<string, string>;
}

class DependencyManager {
  private readonly NPM_REGISTRY = 'https://registry.npmjs.org/';
  private readonly INCOMPATIBLE_PACKAGES = [
    'fs-extra',
    'node-fetch', // Use native fetch instead
    'axios', // Use native fetch instead
    'request',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'net',
    'tls',
    'readline',
    'repl',
    'vm',
  ];

  private readonly CLOUDFLARE_REPLACEMENTS: Record<string, string> = {
    'node-fetch': 'native fetch API',
    axios: 'native fetch API or ky',
    'fs-extra': '@cloudflare/workers-types',
    crypto: 'Web Crypto API',
    buffer: 'ArrayBuffer and Uint8Array',
    stream: 'Web Streams API',
    path: 'URL API',
    uuid: 'crypto.randomUUID()',
  };

  async add(packageSpec: string, options: { dev?: boolean } = {}): Promise<void> {
    // Parse package spec (name@version)
    const [name, version] = packageSpec.split('@').filter(Boolean);
    const packageName = packageSpec.startsWith('@') ? `@${name}` : name;

    console.info(`\n📦 Adding package: ${packageName}${version ? `@${version}` : ''}`);
    console.info(`   Type: ${options.dev ? 'Dev Dependency' : 'Production Dependency'}\n`);

    // Step 1: Check compatibility
    const compatible = await this.checkCompatibility(packageName);
    if (!compatible) {
      return;
    }

    // Step 2: Fetch package info
    const info = await this.fetchPackageInfo(packageName, version);
    if (!info) {
      console.error('❌ Failed to fetch package information');
      return;
    }

    // Step 3: Check for Node.js dependencies
    await this.checkNodeDependencies(info);

    // Step 4: Install the package
    const installed = await this.installPackage(packageSpec, options.dev || false);
    if (!installed) {
      return;
    }

    // Step 5: Test the import
    const importWorks = await this.testImport(packageName);
    if (!importWorks) {
      console.warn('⚠️  Package installed but import test failed');
    }

    // Step 6: Document the dependency
    await this.documentDependency(info);

    console.info(`\n✅ Successfully added ${packageName}!`);
    console.info(`   Remember to test in Cloudflare Workers environment: wrangler dev\n`);
  }

  private async checkCompatibility(packageName: string): Promise<boolean> {
    console.info('🔍 Checking Cloudflare Workers compatibility...');

    // Check if it's a known incompatible package
    if (this.INCOMPATIBLE_PACKAGES.includes(packageName)) {
      console.error(`\n❌ Package "${packageName}" is not compatible with Cloudflare Workers!`);

      const replacement = this.CLOUDFLARE_REPLACEMENTS[packageName];
      if (replacement) {
        console.info(`   💡 Use ${replacement} instead\n`);
      }

      return false;
    }

    // Check if it's a Node.js built-in module
    if (packageName.startsWith('node:')) {
      console.error(`\n❌ Node.js built-in modules are not supported in Cloudflare Workers!`);
      return false;
    }

    console.info('   ✓ Package name check passed');
    return true;
  }

  private async fetchPackageInfo(name: string, version?: string): Promise<DependencyInfo | null> {
    console.info('📊 Fetching package information from npm...');

    try {
      const url = `${this.NPM_REGISTRY}${name}${version ? `/${version}` : '/latest'}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`   ✗ Package not found in npm registry`);
        return null;
      }

      const data = await response.json();

      console.info(`   ✓ Found: ${data.name}@${data.version}`);
      console.info(`   📝 License: ${data.license || 'Unknown'}`);

      return {
        name: data.name,
        version: data.version,
        isDev: false,
        description: data.description,
        license: data.license,
        homepage: data.homepage,
        dependencies: data.dependencies,
      };
    } catch (error) {
      console.error(`   ✗ Failed to fetch package info: ${error}`);
      return null;
    }
  }

  private async checkNodeDependencies(info: DependencyInfo): Promise<void> {
    if (!info.dependencies) return;

    console.info('🔍 Checking dependencies for Node.js modules...');

    const nodeModules = Object.keys(info.dependencies).filter(
      dep => this.INCOMPATIBLE_PACKAGES.includes(dep) || dep.startsWith('node:')
    );

    if (nodeModules.length > 0) {
      console.warn('   ⚠️  Package has Node.js dependencies:');
      nodeModules.forEach(mod => {
        console.warn(`      - ${mod}`);
        const replacement = this.CLOUDFLARE_REPLACEMENTS[mod];
        if (replacement) {
          console.info(`        💡 Consider: ${replacement}`);
        }
      });
    } else {
      console.info('   ✓ No problematic Node.js dependencies found');
    }
  }

  private async installPackage(packageSpec: string, isDev: boolean): Promise<boolean> {
    console.info('\n📥 Installing package...');

    try {
      const env = {
        BUN_CONFIG_REGISTRY: this.NPM_REGISTRY,
        NPM_CONFIG_REGISTRY: this.NPM_REGISTRY,
      };

      const flags = isDev ? '-d' : '';
      const result = await $`bun add ${flags} ${packageSpec}`.env(env).quiet();

      if (result.exitCode === 0) {
        console.info('   ✓ Package installed successfully');
        return true;
      } else {
        console.error('   ✗ Installation failed');
        console.error(result.stderr.toString());
        return false;
      }
    } catch (error) {
      console.error(`   ✗ Installation error: ${error}`);
      return false;
    }
  }

  private async testImport(packageName: string): Promise<boolean> {
    console.info('🧪 Testing import...');

    try {
      const testCode = `
        try {
          const mod = await import('${packageName}');
          console.info('✓ Import successful');
          process.exit(0);
        } catch (e) {
          console.error('✗ Import failed:', e.message);
          process.exit(1);
        }
      `;

      const result = await $`bun eval ${testCode}`.quiet();

      if (result.exitCode === 0) {
        console.info('   ✓ Import test passed');
        return true;
      } else {
        console.info('   ✗ Import test failed');
        return false;
      }
    } catch (error) {
      console.info('   ✗ Import test error');
      return false;
    }
  }

  private async documentDependency(info: DependencyInfo): Promise<void> {
    console.info('📝 Documenting dependency...');

    const depsFile = 'docs/DEPENDENCIES.md';

    // Create file if it doesn't exist
    if (!existsSync(depsFile)) {
      await appendFile(depsFile, '# Project Dependencies\n\n');
    }

    const entry = `
## ${info.name}@${info.version}
- **Purpose**: ${info.description || 'No description'}
- **License**: ${info.license || 'Unknown'}
- **Homepage**: ${info.homepage || 'N/A'}
- **Type**: ${info.isDev ? 'Development' : 'Production'}
- **Added**: ${new Date().toISOString().split('T')[0]}
- **Cloudflare Compatible**: ✅ Yes

`;

    await appendFile(depsFile, entry);
    console.info(`   ✓ Documented in ${depsFile}`);
  }

  async remove(packageName: string): Promise<void> {
    console.info(`\n🗑️  Removing package: ${packageName}`);

    try {
      const result = await $`bun remove ${packageName}`.quiet();

      if (result.exitCode === 0) {
        console.info('✅ Package removed successfully');
      } else {
        console.error('❌ Failed to remove package');
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }

  async list(): Promise<void> {
    console.info('\n📋 Installed packages:\n');

    try {
      await $`bun pm ls`;
    } catch (error) {
      console.error(`❌ Error listing packages: ${error}`);
    }
  }
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.info(`
Fire22 Dependency Manager - Cloudflare Workers Compatible

Usage:
  bun run scripts/add-dependency.ts <package-name>[@version] [options]
  
Options:
  --dev, -D        Add as dev dependency
  --remove, -r     Remove a package
  --list, -l       List installed packages
  --help, -h       Show this help
  
Examples:
  bun run scripts/add-dependency.ts wrangler --dev
  bun run scripts/add-dependency.ts itty-router@4.0.0
  bun run scripts/add-dependency.ts --remove axios
  bun run scripts/add-dependency.ts --list
  
Cloudflare Workers Notes:
  - Node.js built-in modules are not supported
  - Use Web APIs (fetch, crypto, streams) instead
  - Check compatibility before installing
`);
    return;
  }

  const manager = new DependencyManager();

  if (args.includes('--help') || args.includes('-h')) {
    // Help already shown above
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    await manager.list();
    return;
  }

  if (args.includes('--remove') || args.includes('-r')) {
    const pkgIndex = args.findIndex(a => !a.startsWith('-'));
    if (pkgIndex >= 0) {
      await manager.remove(args[pkgIndex]);
    } else {
      console.error('❌ Please specify a package to remove');
    }
    return;
  }

  // Default: add package
  const packageSpec = args.find(a => !a.startsWith('-'));
  if (!packageSpec) {
    console.error('❌ Please specify a package name');
    return;
  }

  const isDev = args.includes('--dev') || args.includes('-D');
  await manager.add(packageSpec, { dev: isDev });
}

main().catch(console.error);
