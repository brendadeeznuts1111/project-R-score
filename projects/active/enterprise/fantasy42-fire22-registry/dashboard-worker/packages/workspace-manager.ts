#!/usr/bin/env bun

/**
 * 🏗️ Fire22 Workspace Manager
 *
 * Unified management for all workspace packages
 */

import { $ } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';

interface WorkspacePackage {
  name: string;
  path: string;
  version: string;
  description: string;
  hasTests: boolean;
  hasDist: boolean;
}

export class WorkspaceManager {
  private packages: WorkspacePackage[] = [
    {
      name: '@fire22/env-manager',
      path: 'packages/env-manager',
      version: '1.0.0',
      description: 'Environment configuration and validation',
      hasTests: true,
      hasDist: true,
    },
    {
      name: '@fire22/middleware',
      path: 'packages/middleware',
      version: '1.0.0',
      description: 'Request handling and error formatting',
      hasTests: true,
      hasDist: true,
    },
    {
      name: '@fire22/testing-framework',
      path: 'packages/testing-framework',
      version: '1.0.0',
      description: 'Comprehensive testing utilities',
      hasTests: true,
      hasDist: true,
    },
    {
      name: '@fire22/wager-system',
      path: 'packages/wager-system',
      version: '1.0.0',
      description: 'Financial calculations and risk management',
      hasTests: true,
      hasDist: true,
    },
    {
      name: '@fire22/benchmark-suite',
      path: 'packages/benchmark-suite',
      version: '1.0.0',
      description: 'High-precision performance benchmarking',
      hasTests: false,
      hasDist: false,
    },
    {
      name: '@fire22/memory-profiler',
      path: 'packages/memory-profiler',
      version: '1.0.0',
      description: 'Memory profiling with bun:jsc',
      hasTests: false,
      hasDist: false,
    },
    {
      name: '@fire22/micro-benchmarks',
      path: 'packages/micro-benchmarks',
      version: '1.0.0',
      description: 'Precision microbenchmarking',
      hasTests: false,
      hasDist: false,
    },
    {
      name: '@fire22/load-testing',
      path: 'packages/load-testing',
      version: '1.0.0',
      description: 'HTTP endpoint load testing',
      hasTests: false,
      hasDist: false,
    },
    {
      name: '@fire22/benchmark-formatter',
      path: 'packages/benchmark-formatter',
      version: '1.0.0',
      description: 'Beautiful benchmark output formatting',
      hasTests: false,
      hasDist: false,
    },
  ];

  /**
   * List all workspace packages
   */
  async listPackages(): Promise<void> {
    console.info('📦 Dashboard Worker Packages');
    console.info('='.repeat(60));
    console.info();

    for (const pkg of this.packages) {
      const exists = existsSync(join(process.cwd(), pkg.path));
      const status = exists ? '✅' : '❌';

      console.info(`${status} ${pkg.name} v${pkg.version}`);
      console.info(`   📁 ${pkg.path}`);
      console.info(`   📝 ${pkg.description}`);

      if (exists) {
        const features = [];
        if (pkg.hasTests) features.push('tests');
        if (pkg.hasDist) features.push('dist');
        if (features.length > 0) {
          console.info(`   🔧 Features: ${features.join(', ')}`);
        }
      }
      console.info();
    }
  }

  /**
   * Build all packages
   */
  async buildAll(): Promise<void> {
    console.info('🏗️  Building All Packages');
    console.info('='.repeat(60));

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) {
        console.info(`⏭️  Skipping ${pkg.name} (not found)`);
        continue;
      }

      console.info(`\n📦 Building ${pkg.name}...`);
      try {
        await $`bun run build`.cwd(pkgPath);
        console.info(`   ✅ Built successfully`);
      } catch (error) {
        console.info(`   ⚠️  Build failed or no build script`);
      }
    }
  }

  /**
   * Test all packages
   */
  async testAll(): Promise<void> {
    console.info('🧪 Testing All Packages');
    console.info('='.repeat(60));

    for (const pkg of this.packages.filter(p => p.hasTests)) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) {
        console.info(`⏭️  Skipping ${pkg.name} (not found)`);
        continue;
      }

      console.info(`\n🧪 Testing ${pkg.name}...`);
      try {
        await $`bun test`.cwd(pkgPath);
        console.info(`   ✅ Tests passed`);
      } catch (error) {
        console.info(`   ❌ Tests failed`);
      }
    }
  }

  /**
   * Link all packages
   */
  async linkAll(): Promise<void> {
    console.info('🔗 Linking All Packages');
    console.info('='.repeat(60));

    // First, register each package
    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) {
        console.info(`⏭️  Skipping ${pkg.name} (not found)`);
        continue;
      }

      console.info(`\n📦 Registering ${pkg.name}...`);
      try {
        await $`bun link`.cwd(pkgPath);
        console.info(`   ✅ Registered`);
      } catch (error) {
        console.info(`   ❌ Registration failed`);
      }
    }

    console.info('\n✅ All packages linked!');
  }

  /**
   * Update all packages to use workspace protocol
   */
  async updateWorkspaceProtocol(): Promise<void> {
    console.info('🔄 Updating Workspace Protocol');
    console.info('='.repeat(60));

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path, 'package.json');
      if (!existsSync(pkgPath)) continue;

      console.info(`\n📦 Updating ${pkg.name}...`);

      // Read package.json
      const packageJson = await Bun.file(pkgPath).json();

      // Update dependencies to use workspace protocol
      if (packageJson.dependencies) {
        for (const dep of Object.keys(packageJson.dependencies)) {
          if (dep.startsWith('@fire22/')) {
            packageJson.dependencies[dep] = 'workspace:*';
            console.info(`   Updated ${dep} to workspace:*`);
          }
        }
      }

      // Write back
      await Bun.write(pkgPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    console.info('\n✅ All packages updated!');
  }

  /**
   * Clean all packages
   */
  async cleanAll(): Promise<void> {
    console.info('🧹 Cleaning All Packages');
    console.info('='.repeat(60));

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) continue;

      console.info(`\n🧹 Cleaning ${pkg.name}...`);

      // Remove dist directory
      const distPath = join(pkgPath, 'dist');
      if (existsSync(distPath)) {
        await $`rm -rf ${distPath}`;
        console.info(`   ✅ Removed dist/`);
      }

      // Remove node_modules
      const nodeModulesPath = join(pkgPath, 'node_modules');
      if (existsSync(nodeModulesPath)) {
        await $`rm -rf ${nodeModulesPath}`;
        console.info(`   ✅ Removed node_modules/`);
      }
    }

    console.info('\n✅ All packages cleaned!');
  }

  /**
   * Install dependencies for all packages
   */
  async installAll(options: { production?: boolean; frozen?: boolean } = {}): Promise<void> {
    console.info('📦 Installing Dependencies');
    console.info('='.repeat(60));

    const args = ['install'];
    if (options.production) args.push('--production');
    if (options.frozen) args.push('--frozen-lockfile');

    // Install root dependencies
    console.info('\n📦 Installing root dependencies...');
    await $`bun ${args}`;

    // Install package dependencies
    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) continue;

      console.info(`\n📦 Installing ${pkg.name} dependencies...`);
      await $`bun ${args}`.cwd(pkgPath);
    }

    console.info('\n✅ All dependencies installed!');
  }

  /**
   * Create a dependency graph
   */
  async createDependencyGraph(): Promise<void> {
    console.info('📊 Dependency Graph');
    console.info('='.repeat(60));
    console.info();

    const graph: Record<string, string[]> = {};

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path, 'package.json');
      if (!existsSync(pkgPath)) continue;

      const packageJson = await Bun.file(pkgPath).json();
      const deps: string[] = [];

      // Check dependencies
      if (packageJson.dependencies) {
        for (const dep of Object.keys(packageJson.dependencies)) {
          if (dep.startsWith('@fire22/')) {
            deps.push(dep);
          }
        }
      }

      graph[pkg.name] = deps;
    }

    // Display graph
    for (const [pkg, deps] of Object.entries(graph)) {
      console.info(`📦 ${pkg}`);
      if (deps.length > 0) {
        deps.forEach((dep, i) => {
          const prefix = i === deps.length - 1 ? '└──' : '├──';
          console.info(`   ${prefix} ${dep}`);
        });
      } else {
        console.info('   └── (no internal dependencies)');
      }
      console.info();
    }
  }

  /**
   * Run a script in all packages
   */
  async runScript(script: string): Promise<void> {
    console.info(`🚀 Running Script: ${script}`);
    console.info('='.repeat(60));

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) continue;

      console.info(`\n📦 ${pkg.name}...`);
      try {
        await $`bun run ${script}`.cwd(pkgPath);
        console.info(`   ✅ Success`);
      } catch (error) {
        console.info(`   ⏭️  Script not found or failed`);
      }
    }
  }

  /**
   * Version bump all packages
   */
  async versionBump(type: 'patch' | 'minor' | 'major' = 'patch'): Promise<void> {
    console.info(`📝 Version Bump: ${type}`);
    console.info('='.repeat(60));

    for (const pkg of this.packages) {
      const pkgPath = join(process.cwd(), pkg.path);
      if (!existsSync(pkgPath)) continue;

      console.info(`\n📦 Bumping ${pkg.name}...`);
      try {
        await $`bun pm version ${type} --no-git-tag-version`.cwd(pkgPath);
        console.info(`   ✅ Bumped to new version`);
      } catch (error) {
        console.info(`   ❌ Version bump failed`);
      }
    }
  }
}

// CLI Interface
if (import.meta.main) {
  const manager = new WorkspaceManager();
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'list':
      await manager.listPackages();
      break;

    case 'build':
      await manager.buildAll();
      break;

    case 'test':
      await manager.testAll();
      break;

    case 'link':
      await manager.linkAll();
      break;

    case 'clean':
      await manager.cleanAll();
      break;

    case 'install':
      await manager.installAll({
        production: args.includes('--production'),
        frozen: args.includes('--frozen-lockfile'),
      });
      break;

    case 'update-protocol':
      await manager.updateWorkspaceProtocol();
      break;

    case 'graph':
      await manager.createDependencyGraph();
      break;

    case 'run':
      if (args[0]) {
        await manager.runScript(args[0]);
      }
      break;

    case 'version':
      await manager.versionBump((args[0] as any) || 'patch');
      break;

    default:
      console.info(`
🏗️  Fire22 Workspace Manager
!==!==!==!==!===

COMMANDS:
  list              List all workspace packages
  build             Build all packages
  test              Test all packages with tests
  link              Link all packages
  clean             Clean all packages
  install           Install all dependencies
  update-protocol   Update to workspace protocol
  graph             Show dependency graph
  run <script>      Run script in all packages
  version <type>    Bump version (patch/minor/major)

OPTIONS:
  --production      Production install
  --frozen-lockfile Frozen lockfile install

EXAMPLES:
  bun run packages/workspace-manager.ts list
  bun run packages/workspace-manager.ts build
  bun run packages/workspace-manager.ts install --production
  bun run packages/workspace-manager.ts graph
      `);
  }
}

export default WorkspaceManager;
