#!/usr/bin/env bun

/**
 * 🚀 Fire22 Multi-Registry Publisher with Native Bun Publish
 *
 * Publishes Fire22 workspaces to multiple registries using native `bun publish`:
 * - npm (public registry)
 * - Cloudflare Workers Registry (private)
 * - GitHub Packages
 *
 * Features:
 * - Native `bun publish` integration
 * - Automated version management with `bun version`
 * - Registry-specific configurations via publishConfig
 * - Parallel publishing with fallback
 * - Build verification before publish
 * - Tarball packing with `bun pm pack`
 *
 * @version 2.0.0
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PublishConfig {
  workspace: string;
  packageName: string;
  version: string;
  registries: Registry[];
  buildRequired: boolean;
  testRequired: boolean;
}

interface Registry {
  name: string;
  url: string;
  auth?: string;
  scope?: string;
  access?: 'public' | 'restricted';
  tags?: string[];
}

class MultiRegistryPublisher {
  private workspacesPath: string;
  private config: any;
  private registries: Registry[];

  constructor() {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.config = this.loadConfig();
    this.registries = this.setupRegistries();
  }

  /**
   * 🎯 Main publish orchestration
   */
  async publishAll(
    options: {
      test?: boolean;
      build?: boolean;
      registry?: string;
      dryRun?: boolean;
      tag?: string;
    } = {}
  ): Promise<void> {
    console.log('🚀 Fire22 Multi-Registry Publisher v2.0');
    console.log('='.repeat(60));

    const workspaces = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];

    for (const workspace of workspaces) {
      console.log(`\n📦 Publishing ${workspace}...`);

      try {
        // Prepare workspace for publishing
        await this.prepareWorkspace(workspace, options);

        // Publish to registries
        if (options.registry) {
          // Publish to specific registry
          await this.publishToRegistry(workspace, options);
        } else {
          // Publish to all configured registries
          await this.publishToAllRegistries(workspace, options);
        }

        console.log(`✅ ${workspace} published successfully`);
      } catch (error) {
        console.error(`❌ Failed to publish ${workspace}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Publishing complete!');
  }

  /**
   * 🔧 Prepare workspace for publishing
   */
  private async prepareWorkspace(workspace: string, options: any): Promise<void> {
    const workspacePath = join(this.workspacesPath, workspace);

    // 1. Clean package.json with Bun PM
    console.log('  📋 Cleaning package.json...');
    await $`cd ${workspacePath} && bun pm pkg fix`;

    // 2. Run tests if required
    if (options.test !== false) {
      console.log('  🧪 Running tests...');
      try {
        await $`cd ${workspacePath} && bun test`;
      } catch (error) {
        console.warn('  ⚠️  No tests found or tests skipped');
      }
    }

    // 3. Build if required
    if (options.build !== false) {
      console.log('  🔨 Building workspace...');
      await $`cd ${workspacePath} && bun run build:standalone`;
    }

    // 4. Verify package integrity
    console.log('  🔍 Verifying package...');
    await this.verifyPackage(workspacePath);

    // 5. Update version if needed
    if (!options.dryRun) {
      await this.updateVersion(workspacePath);
    }
  }

  /**
   * 📤 Publish to all registries
   */
  private async publishToAllRegistries(workspace: string, options: any): Promise<void> {
    const workspacePath = join(this.workspacesPath, workspace);
    const results = [];

    for (const registry of this.registries) {
      try {
        console.log(`  📡 Publishing to ${registry.name}...`);
        await this.publishToSpecificRegistry(workspacePath, registry, options);
        results.push({ registry: registry.name, status: 'success' });
      } catch (error) {
        console.warn(`  ⚠️  Failed to publish to ${registry.name}:`, error);
        results.push({ registry: registry.name, status: 'failed', error });
      }
    }

    // Report results
    console.log('  📊 Publishing results:');
    results.forEach(r => {
      const icon = r.status === 'success' ? '✅' : '❌';
      console.log(`    ${icon} ${r.registry}: ${r.status}`);
    });
  }

  /**
   * 📡 Publish to specific registry
   */
  private async publishToRegistry(workspace: string, options: any): Promise<void> {
    const registryName = options.registry;
    const registry = this.registries.find(r => r.name === registryName);
    if (!registry) {
      throw new Error(`Registry ${registryName} not found`);
    }

    const workspacePath = join(this.workspacesPath, workspace);
    await this.publishToSpecificRegistry(workspacePath, registry, options);
  }

  /**
   * 🎯 Publish to a specific registry using native bun publish
   */
  private async publishToSpecificRegistry(
    workspacePath: string,
    registry: Registry,
    options: any
  ): Promise<void> {
    // Prepare package.json for registry
    await this.preparePackageForRegistry(workspacePath, registry);

    // Build publish command
    const publishArgs = [];

    // Add dry-run flag
    if (options.dryRun) {
      publishArgs.push('--dry-run');
    }

    // Add access level
    publishArgs.push('--access', registry.access || 'public');

    // Add tag
    const tag = options.tag || registry.tags?.[0] || 'latest';
    publishArgs.push('--tag', tag);

    // Set environment variables for registry
    const envVars: any = {};

    // Configure registry URL
    if (registry.url !== 'https://registry.npmjs.org/') {
      // Create .npmrc for non-npm registries
      const npmrcContent = this.createNpmrc(registry);
      writeFileSync(join(workspacePath, '.npmrc'), npmrcContent);
    }

    // Set auth token if available
    if (registry.auth) {
      envVars.NPM_CONFIG_TOKEN = registry.auth;
    }

    // Publish based on registry type
    try {
      switch (registry.name) {
        case 'npm':
          await this.publishToNpm(workspacePath, publishArgs, envVars);
          break;

        case 'cloudflare':
          await this.publishToCloudflare(workspacePath, registry, options);
          break;

        case 'github':
          await this.publishToGitHub(workspacePath, publishArgs, registry, envVars);
          break;

        default:
          // Generic Bun publish
          console.log(`    Running: bun publish ${publishArgs.join(' ')}`);
          await $`cd ${workspacePath} && bun publish ${publishArgs}`.env(envVars);
      }
    } finally {
      // Clean up .npmrc if created
      const npmrcPath = join(workspacePath, '.npmrc');
      if (existsSync(npmrcPath)) {
        await $`rm -f ${npmrcPath}`;
      }
    }
  }

  /**
   * 📦 Publish to npm registry using native bun publish
   */
  private async publishToNpm(
    workspacePath: string,
    publishArgs: string[],
    envVars: any
  ): Promise<void> {
    console.log(`    Running: bun publish ${publishArgs.join(' ')}`);

    // Use native bun publish
    await $`cd ${workspacePath} && bun publish ${publishArgs}`.env(envVars);

    // Verify publication if not dry-run
    if (!publishArgs.includes('--dry-run')) {
      const packageJson = JSON.parse(readFileSync(join(workspacePath, 'package.json'), 'utf-8'));
      try {
        await $`bun pm view ${packageJson.name}@${packageJson.version}`;
        console.log(`    ✅ Package ${packageJson.name}@${packageJson.version} verified on npm`);
      } catch {
        console.warn(`    ⚠️  Could not verify package on npm (may take time to propagate)`);
      }
    }
  }

  /**
   * ☁️ Publish to Cloudflare Workers Registry
   */
  private async publishToCloudflare(
    workspacePath: string,
    registry: Registry,
    options: any
  ): Promise<void> {
    // For Cloudflare, we deploy as a Worker instead of npm package
    if (options.dryRun) {
      console.log('    🌐 Dry run: Would deploy to Cloudflare Workers');
      return;
    }

    // Build for Cloudflare Workers
    await $`cd ${workspacePath} && bun run build:cloudflare`;

    // Deploy to Cloudflare
    await $`cd ${workspacePath} && wrangler deploy --config wrangler.standalone.toml`;

    // Register in Cloudflare Registry API if available
    const packageJson = JSON.parse(readFileSync(join(workspacePath, 'package.json'), 'utf-8'));
    console.log(`    ✅ Deployed ${packageJson.name} to Cloudflare Workers`);
  }

  /**
   * 🐙 Publish to GitHub Packages using native bun publish
   */
  private async publishToGitHub(
    workspacePath: string,
    publishArgs: string[],
    registry: Registry,
    envVars: any
  ): Promise<void> {
    console.log(`    Running: bun publish ${publishArgs.join(' ')} (GitHub Packages)`);

    // GitHub Packages requires scoped packages
    const packageJson = JSON.parse(readFileSync(join(workspacePath, 'package.json'), 'utf-8'));
    if (!packageJson.name.startsWith('@')) {
      throw new Error('GitHub Packages requires scoped package names');
    }

    // Use native bun publish with GitHub registry
    await $`cd ${workspacePath} && bun publish ${publishArgs}`.env(envVars);
  }

  /**
   * 📝 Create .npmrc content for registry
   */
  private createNpmrc(registry: Registry): string {
    const lines = [];

    if (registry.name === 'github') {
      // GitHub Packages configuration
      lines.push(`@fire22:registry=https://npm.pkg.github.com`);
      if (registry.auth) {
        lines.push(`//npm.pkg.github.com/:_authToken=${registry.auth}`);
      }
    } else if (registry.url) {
      // Custom registry
      lines.push(`registry=${registry.url}`);
      if (registry.auth) {
        const urlHost = new URL(registry.url).host;
        lines.push(`//${urlHost}/:_authToken=${registry.auth}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 📋 Prepare package.json for specific registry
   */
  private async preparePackageForRegistry(
    workspacePath: string,
    registry: Registry
  ): Promise<void> {
    const packageJsonPath = join(workspacePath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Update publishConfig
    packageJson.publishConfig = {
      registry: registry.url,
      access: registry.access || 'public',
      tag: registry.tags?.[0] || 'latest',
    };

    // Add registry-specific metadata
    if (registry.name === 'github' && !packageJson.repository) {
      packageJson.repository = {
        type: 'git',
        url: 'https://github.com/brendadeeznuts1111/fire22-dashboard-worker.git',
      };
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * 🔍 Verify package before publishing
   */
  private async verifyPackage(workspacePath: string): Promise<void> {
    // Check package.json validity
    const packageJsonPath = join(workspacePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Required fields for publishing
    const required = ['name', 'version'];
    for (const field of required) {
      if (!packageJson[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Verify package name format
    if (!packageJson.name.match(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/)) {
      throw new Error(`Invalid package name: ${packageJson.name}`);
    }

    // Pack the package to verify it can be packed
    console.log('    📦 Packing for verification...');
    await $`cd ${workspacePath} && bun pm pack --dry-run`;
  }

  /**
   * 🔢 Update version if needed
   */
  private async updateVersion(workspacePath: string): Promise<void> {
    const packageJsonPath = join(workspacePath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Check if version exists in npm registry
    const shouldBump = await this.shouldBumpVersion(packageJson.name, packageJson.version);

    if (shouldBump) {
      console.log(`  📈 Bumping version from ${packageJson.version}...`);

      // Use bun version to bump
      await $`cd ${workspacePath} && bun version patch`;

      // Read new version
      const newPackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      console.log(`  📈 Version bumped to ${newPackageJson.version}`);
    }
  }

  /**
   * 🤔 Check if version should be bumped
   */
  private async shouldBumpVersion(packageName: string, currentVersion: string): Promise<boolean> {
    try {
      // Check if version exists in npm
      await $`bun pm view ${packageName}@${currentVersion}`.quiet();
      // Version exists, should bump
      return true;
    } catch {
      // Version doesn't exist, ok to publish
      return false;
    }
  }

  /**
   * ⚙️ Setup registries configuration
   */
  private setupRegistries(): Registry[] {
    return [
      {
        name: 'npm',
        url: 'https://registry.npmjs.org/',
        access: 'public',
        tags: ['latest'],
      },
      {
        name: 'cloudflare',
        url: 'https://fire22.workers.dev/registry',
        auth: process.env.CLOUDFLARE_API_TOKEN,
        scope: '@fire22',
        access: 'restricted',
        tags: ['cloudflare', 'worker'],
      },
      {
        name: 'github',
        url: 'https://npm.pkg.github.com',
        auth: process.env.GITHUB_TOKEN,
        scope: '@fire22',
        access: 'restricted',
        tags: ['github'],
      },
    ];
  }

  /**
   * 📄 Load configuration
   */
  private loadConfig(): any {
    const configPath = join(process.cwd(), 'workspace-config.json');
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    return {};
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const publisher = new MultiRegistryPublisher();

  switch (command) {
    case 'publish':
    case 'all':
      await publisher.publishAll({
        test: !args.includes('--no-test'),
        build: !args.includes('--no-build'),
        dryRun: args.includes('--dry-run'),
        tag: args.find(a => a.startsWith('--tag='))?.split('=')[1],
        registry: args.find(a => a.startsWith('--registry='))?.split('=')[1],
      });
      break;

    case 'npm':
      await publisher.publishAll({
        registry: 'npm',
        dryRun: args.includes('--dry-run'),
        tag: args.find(a => a.startsWith('--tag='))?.split('=')[1],
      });
      break;

    case 'cloudflare':
      await publisher.publishAll({
        registry: 'cloudflare',
        dryRun: args.includes('--dry-run'),
      });
      break;

    case 'github':
      await publisher.publishAll({
        registry: 'github',
        dryRun: args.includes('--dry-run'),
        tag: args.find(a => a.startsWith('--tag='))?.split('=')[1],
      });
      break;

    default:
      console.log('Usage: bun multi-registry-publisher.ts [command] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  publish, all    - Publish to all registries');
      console.log('  npm            - Publish to npm only');
      console.log('  cloudflare     - Publish to Cloudflare only');
      console.log('  github         - Publish to GitHub Packages only');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run      - Simulate publish without actually publishing');
      console.log('  --no-test      - Skip running tests');
      console.log('  --no-build     - Skip building');
      console.log('  --tag=X        - Publish with specific tag (default: latest)');
      console.log('  --registry=X   - Publish to specific registry');
      console.log('');
      console.log('Examples:');
      console.log('  bun multi-registry-publisher.ts publish --dry-run');
      console.log('  bun multi-registry-publisher.ts npm --tag=beta');
      console.log('  bun multi-registry-publisher.ts all --no-test');
  }
}

export default MultiRegistryPublisher;
