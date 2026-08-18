#!/usr/bin/env bun

/**
 * 🔗 Fire22 Workspace Dependency Resolver
 *
 * Implements cross-workspace dependency resolution with workspace:* support.
 * Enables workspaces to reference each other during development and resolves
 * to actual packages during publishing, maintaining dependency integrity
 * across the 5 Cloudflare Workers workspaces.
 *
 * Features:
 * - workspace:* dependency resolution
 * - Symlink management for development
 * - Version synchronization across workspaces
 * - Dependency graph analysis and validation
 * - Build-time dependency injection
 * - Cross-workspace compatibility checking
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  lstatSync,
} from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { Logger, PerformanceTimer } from './shared-utilities.ts';

interface WorkspacePackage {
  name: string;
  version: string;
  main: string;
  dependencies: Record<string, string>;
  workspacePath: string;
  buildOutput: string;
}

interface DependencyGraph {
  nodes: Map<string, WorkspacePackage>;
  edges: Map<string, Set<string>>;
  resolved: Map<string, string>;
}

interface ResolutionStrategy {
  development: 'symlink' | 'copy' | 'reference';
  build: 'bundle' | 'external' | 'inline';
  publishing: 'version' | 'latest' | 'workspace';
}

export class WorkspaceDependencyResolver {
  private rootPath: string;
  private config: any;
  private dependencyGraph: DependencyGraph;
  private strategy: ResolutionStrategy;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.config = this.loadWorkspaceConfig();
    this.dependencyGraph = { nodes: new Map(), edges: new Map(), resolved: new Map() };
    this.strategy = {
      development: 'symlink',
      build: 'external',
      publishing: 'version',
    };
  }

  /**
   * 🚀 Resolve all workspace dependencies
   */
  async resolveAllDependencies(): Promise<void> {
    const timer = new PerformanceTimer('dependency-resolution');
    Logger.info('🔗 Fire22 Workspace Dependency Resolver v1.0.0');
    Logger.info('='.repeat(60));
    Logger.info('🔍 Analyzing workspace dependencies...');

    // Step 1: Build dependency graph
    await this.buildDependencyGraph();

    // Step 2: Validate dependency graph
    const validation = await this.validateDependencyGraph();
    if (!validation.valid) {
      throw new Error(`Dependency validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 3: Resolve workspace dependencies
    await this.resolveWorkspaceDependencies();

    // Step 4: Create development symlinks
    await this.createDevelopmentSymlinks();

    // Step 5: Generate resolution manifest
    await this.generateResolutionManifest();

    const performance = timer.finish();
    Logger.info(`✅ Dependency resolution completed in ${performance.totalTime}ms`);

    this.logResolutionSummary();
  }

  /**
   * 📊 Build workspace dependency graph
   */
  private async buildDependencyGraph(): Promise<void> {
    Logger.info('📊 Building dependency graph...');

    // Analyze each workspace
    for (const [workspaceName, workspace] of Object.entries(this.config.workspaces)) {
      const workspaceConfig = workspace as any;

      // Create workspace package info
      const pkg: WorkspacePackage = {
        name: workspaceConfig.name,
        version: workspaceConfig.version,
        main: workspaceConfig.main,
        dependencies: workspaceConfig.dependencies || {},
        workspacePath: join(this.rootPath, 'dist/workspaces', workspaceName),
        buildOutput: join(this.rootPath, 'dist/workspaces', workspaceName),
      };

      this.dependencyGraph.nodes.set(workspaceConfig.name, pkg);
      this.dependencyGraph.edges.set(workspaceConfig.name, new Set());

      // Build edges (dependencies)
      Object.keys(pkg.dependencies).forEach(depName => {
        if (depName.startsWith('@fire22/')) {
          this.dependencyGraph.edges.get(pkg.name)?.add(depName);
        }
      });
    }

    Logger.info(`📦 Discovered ${this.dependencyGraph.nodes.size} workspace packages`);
    Logger.info(`🔗 Found ${this.getTotalEdges()} cross-workspace dependencies`);
  }

  /**
   * ✅ Validate dependency graph
   */
  private async validateDependencyGraph(): Promise<{ valid: boolean; errors: string[] }> {
    Logger.info('✅ Validating dependency graph...');
    const errors: string[] = [];

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }

    // Check for missing dependencies
    for (const [pkgName, dependencies] of this.dependencyGraph.edges) {
      for (const depName of dependencies) {
        if (!this.dependencyGraph.nodes.has(depName)) {
          errors.push(`Missing workspace dependency: ${pkgName} depends on ${depName}`);
        }
      }
    }

    // Check dependency versions
    const versionErrors = await this.validateVersionCompatibility();
    errors.push(...versionErrors);

    if (errors.length === 0) {
      Logger.info('✅ Dependency graph validation passed');
    } else {
      Logger.error('❌ Dependency graph validation failed:');
      errors.forEach(error => Logger.error(`  • ${error}`));
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 🔄 Detect circular dependencies using DFS
   */
  private detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycles: string[] = [];

    const dfs = (node: string, path: string[] = []): boolean => {
      if (visiting.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node].join(' -> '));
        return true;
      }

      if (visited.has(node)) return false;

      visiting.add(node);
      const newPath = [...path, node];

      const dependencies = this.dependencyGraph.edges.get(node) || new Set();
      for (const dep of dependencies) {
        if (dfs(dep, newPath)) return true;
      }

      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * 📦 Resolve workspace:* dependencies
   */
  private async resolveWorkspaceDependencies(): Promise<void> {
    Logger.info('📦 Resolving workspace:* dependencies...');

    for (const [pkgName, pkg] of this.dependencyGraph.nodes) {
      const resolvedDeps: Record<string, string> = {};

      for (const [depName, version] of Object.entries(pkg.dependencies)) {
        if (version === 'workspace:*') {
          // Resolve to workspace version
          const depPkg = this.dependencyGraph.nodes.get(depName);
          if (depPkg) {
            resolvedDeps[depName] = depPkg.version;
            this.dependencyGraph.resolved.set(`${pkgName}->${depName}`, depPkg.version);
            Logger.debug(`Resolved ${pkgName} -> ${depName}@${depPkg.version}`);
          }
        } else {
          // Keep existing version
          resolvedDeps[depName] = version;
        }
      }

      // Update package dependencies
      pkg.dependencies = resolvedDeps;
    }

    Logger.info(`🔗 Resolved ${this.dependencyGraph.resolved.size} workspace dependencies`);
  }

  /**
   * 🔗 Create development symlinks
   */
  private async createDevelopmentSymlinks(): Promise<void> {
    Logger.info('🔗 Creating development symlinks...');

    const nodeModulesDir = join(this.rootPath, 'node_modules');
    const fire22Dir = join(nodeModulesDir, '@fire22');

    // Ensure @fire22 directory exists
    if (!existsSync(fire22Dir)) {
      mkdirSync(fire22Dir, { recursive: true });
    }

    let symlinkCount = 0;

    for (const [pkgName, pkg] of this.dependencyGraph.nodes) {
      const packageBaseName = pkgName.replace('@fire22/', '');
      const symlinkPath = join(fire22Dir, packageBaseName);
      const targetPath = resolve(pkg.buildOutput);

      // Remove existing symlink if it exists
      if (existsSync(symlinkPath)) {
        try {
          if (lstatSync(symlinkPath).isSymbolicLink()) {
            unlinkSync(symlinkPath);
          }
        } catch (error) {
          Logger.warn(`Failed to remove existing symlink: ${symlinkPath}`);
        }
      }

      // Create symlink if target exists
      if (existsSync(targetPath)) {
        try {
          symlinkSync(targetPath, symlinkPath, 'dir');
          symlinkCount++;
          Logger.debug(`Created symlink: ${symlinkPath} -> ${targetPath}`);
        } catch (error) {
          Logger.warn(`Failed to create symlink for ${pkgName}: ${error}`);
        }
      }
    }

    Logger.info(`🔗 Created ${symlinkCount} development symlinks`);
  }

  /**
   * 📄 Generate resolution manifest
   */
  private async generateResolutionManifest(): Promise<void> {
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      strategy: this.strategy,
      workspaces: Array.from(this.dependencyGraph.nodes.values()).map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        main: pkg.main,
        dependencies: pkg.dependencies,
        buildOutput: pkg.buildOutput,
      })),
      resolutions: Object.fromEntries(this.dependencyGraph.resolved),
      dependencyGraph: {
        nodes: Array.from(this.dependencyGraph.nodes.keys()),
        edges: Object.fromEntries(
          Array.from(this.dependencyGraph.edges.entries()).map(([key, value]) => [
            key,
            Array.from(value),
          ])
        ),
      },
      buildOrder: this.calculateBuildOrder(),
    };

    const manifestPath = join(this.rootPath, 'workspace-resolution-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    Logger.info('📄 Generated workspace resolution manifest');
  }

  /**
   * 📐 Calculate optimal build order using topological sort
   */
  private calculateBuildOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (node: string): void => {
      if (temp.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      if (visited.has(node)) return;

      temp.add(node);

      const dependencies = this.dependencyGraph.edges.get(node) || new Set();
      for (const dep of dependencies) {
        visit(dep);
      }

      temp.delete(node);
      visited.add(node);
      order.unshift(node); // Add to beginning for reverse topological order
    };

    for (const node of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return order;
  }

  /**
   * ✅ Validate version compatibility
   */
  private async validateVersionCompatibility(): Promise<string[]> {
    const errors: string[] = [];

    // Check that all workspace packages have the same version
    const versions = new Set(
      Array.from(this.dependencyGraph.nodes.values()).map(pkg => pkg.version)
    );

    if (versions.size > 1) {
      errors.push(`Version mismatch across workspaces: ${Array.from(versions).join(', ')}`);
    }

    return errors;
  }

  /**
   * 📊 Log resolution summary
   */
  private logResolutionSummary(): void {
    Logger.info('\\n' + '='.repeat(60));
    Logger.info('📊 DEPENDENCY RESOLUTION SUMMARY');
    Logger.info('='.repeat(60));

    Logger.info(`📦 Workspaces: ${this.dependencyGraph.nodes.size}`);
    Logger.info(`🔗 Dependencies: ${this.getTotalEdges()}`);
    Logger.info(`✅ Resolutions: ${this.dependencyGraph.resolved.size}`);

    Logger.info('\\n📋 Build Order:');
    const buildOrder = this.calculateBuildOrder();
    buildOrder.forEach((pkg, index) => {
      Logger.info(`  ${index + 1}. ${pkg}`);
    });

    Logger.info('\\n🔗 Dependency Relationships:');
    for (const [pkgName, dependencies] of this.dependencyGraph.edges) {
      if (dependencies.size > 0) {
        Logger.info(`  ${pkgName} depends on: ${Array.from(dependencies).join(', ')}`);
      }
    }

    Logger.info('\\n💡 Next Steps:');
    Logger.info('  1. Test cross-workspace imports in development');
    Logger.info('  2. Verify symlinks in node_modules/@fire22/');
    Logger.info('  3. Run workspace builds in calculated order');
    Logger.info('  4. Validate runtime dependency resolution');

    Logger.info('='.repeat(60));
  }

  // === UTILITY METHODS ===

  private getTotalEdges(): number {
    return Array.from(this.dependencyGraph.edges.values()).reduce(
      (total, deps) => total + deps.size,
      0
    );
  }

  private loadWorkspaceConfig(): any {
    const configPath = join(this.rootPath, 'workspace-config.json');
    if (!existsSync(configPath)) {
      throw new Error('workspace-config.json not found');
    }
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }
}

// === CLI INTERFACE ===

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'resolve';

  const resolver = new WorkspaceDependencyResolver();

  try {
    switch (command) {
      case 'resolve':
        await resolver.resolveAllDependencies();
        break;

      default:
        console.info('Usage: bun workspace-dependency-resolver.ts [resolve]');
        console.info('  resolve - Resolve all workspace dependencies');
        process.exit(1);
    }
  } catch (error) {
    Logger.error('❌ Dependency resolution failed:', error);
    process.exit(1);
  }
}

export default WorkspaceDependencyResolver;
