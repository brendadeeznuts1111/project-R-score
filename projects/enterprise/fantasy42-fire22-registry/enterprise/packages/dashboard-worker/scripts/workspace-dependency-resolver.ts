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

import { readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, unlinkSync, lstatSync } from 'fs';
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
      publishing: 'version'
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
        buildOutput: join(this.rootPath, 'dist/workspaces', workspaceName)
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
  private detectCircularDependencies(): string[] {\n    const visited = new Set<string>();\n    const visiting = new Set<string>();\n    const cycles: string[] = [];\n    \n    const dfs = (node: string, path: string[] = []): boolean => {\n      if (visiting.has(node)) {\n        const cycleStart = path.indexOf(node);\n        cycles.push([...path.slice(cycleStart), node].join(' -> '));\n        return true;\n      }\n      \n      if (visited.has(node)) return false;\n      \n      visiting.add(node);\n      const newPath = [...path, node];\n      \n      const dependencies = this.dependencyGraph.edges.get(node) || new Set();\n      for (const dep of dependencies) {\n        if (dfs(dep, newPath)) return true;\n      }\n      \n      visiting.delete(node);\n      visited.add(node);\n      return false;\n    };\n    \n    for (const node of this.dependencyGraph.nodes.keys()) {\n      if (!visited.has(node)) {\n        dfs(node);\n      }\n    }\n    \n    return cycles;\n  }\n  \n  /**\n   * 📦 Resolve workspace:* dependencies\n   */\n  private async resolveWorkspaceDependencies(): Promise<void> {\n    Logger.info('📦 Resolving workspace:* dependencies...');\n    \n    for (const [pkgName, pkg] of this.dependencyGraph.nodes) {\n      const resolvedDeps: Record<string, string> = {};\n      \n      for (const [depName, version] of Object.entries(pkg.dependencies)) {\n        if (version === 'workspace:*') {\n          // Resolve to workspace version\n          const depPkg = this.dependencyGraph.nodes.get(depName);\n          if (depPkg) {\n            resolvedDeps[depName] = depPkg.version;\n            this.dependencyGraph.resolved.set(`${pkgName}->${depName}`, depPkg.version);\n            Logger.debug(`Resolved ${pkgName} -> ${depName}@${depPkg.version}`);\n          }\n        } else {\n          // Keep existing version\n          resolvedDeps[depName] = version;\n        }\n      }\n      \n      // Update package dependencies\n      pkg.dependencies = resolvedDeps;\n    }\n    \n    Logger.info(`🔗 Resolved ${this.dependencyGraph.resolved.size} workspace dependencies`);\n  }\n  \n  /**\n   * 🔗 Create development symlinks\n   */\n  private async createDevelopmentSymlinks(): Promise<void> {\n    Logger.info('🔗 Creating development symlinks...');\n    \n    const nodeModulesDir = join(this.rootPath, 'node_modules');\n    const fire22Dir = join(nodeModulesDir, '@fire22');\n    \n    // Ensure @fire22 directory exists\n    if (!existsSync(fire22Dir)) {\n      mkdirSync(fire22Dir, { recursive: true });\n    }\n    \n    let symlinkCount = 0;\n    \n    for (const [pkgName, pkg] of this.dependencyGraph.nodes) {\n      const packageBaseName = pkgName.replace('@fire22/', '');\n      const symlinkPath = join(fire22Dir, packageBaseName);\n      const targetPath = resolve(pkg.buildOutput);\n      \n      // Remove existing symlink if it exists\n      if (existsSync(symlinkPath)) {\n        try {\n          if (lstatSync(symlinkPath).isSymbolicLink()) {\n            unlinkSync(symlinkPath);\n          }\n        } catch (error) {\n          Logger.warn(`Failed to remove existing symlink: ${symlinkPath}`);\n        }\n      }\n      \n      // Create symlink if target exists\n      if (existsSync(targetPath)) {\n        try {\n          symlinkSync(targetPath, symlinkPath, 'dir');\n          symlinkCount++;\n          Logger.debug(`Created symlink: ${symlinkPath} -> ${targetPath}`);\n        } catch (error) {\n          Logger.warn(`Failed to create symlink for ${pkgName}: ${error}`);\n        }\n      }\n    }\n    \n    Logger.info(`🔗 Created ${symlinkCount} development symlinks`);\n  }\n  \n  /**\n   * 📄 Generate resolution manifest\n   */\n  private async generateResolutionManifest(): Promise<void> {\n    const manifest = {\n      version: '1.0.0',\n      generated: new Date().toISOString(),\n      strategy: this.strategy,\n      workspaces: Array.from(this.dependencyGraph.nodes.values()).map(pkg => ({\n        name: pkg.name,\n        version: pkg.version,\n        main: pkg.main,\n        dependencies: pkg.dependencies,\n        buildOutput: pkg.buildOutput\n      })),\n      resolutions: Object.fromEntries(this.dependencyGraph.resolved),\n      dependencyGraph: {\n        nodes: Array.from(this.dependencyGraph.nodes.keys()),\n        edges: Object.fromEntries(\n          Array.from(this.dependencyGraph.edges.entries()).map(([key, value]) => [\n            key, \n            Array.from(value)\n          ])\n        )\n      },\n      buildOrder: this.calculateBuildOrder()\n    };\n    \n    const manifestPath = join(this.rootPath, 'workspace-resolution-manifest.json');\n    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));\n    Logger.info('📄 Generated workspace resolution manifest');\n  }\n  \n  /**\n   * 📐 Calculate optimal build order using topological sort\n   */\n  private calculateBuildOrder(): string[] {\n    const order: string[] = [];\n    const visited = new Set<string>();\n    const temp = new Set<string>();\n    \n    const visit = (node: string): void => {\n      if (temp.has(node)) {\n        throw new Error(`Circular dependency detected involving ${node}`);\n      }\n      if (visited.has(node)) return;\n      \n      temp.add(node);\n      \n      const dependencies = this.dependencyGraph.edges.get(node) || new Set();\n      for (const dep of dependencies) {\n        visit(dep);\n      }\n      \n      temp.delete(node);\n      visited.add(node);\n      order.unshift(node); // Add to beginning for reverse topological order\n    };\n    \n    for (const node of this.dependencyGraph.nodes.keys()) {\n      if (!visited.has(node)) {\n        visit(node);\n      }\n    }\n    \n    return order;\n  }\n  \n  /**\n   * ✅ Validate version compatibility\n   */\n  private async validateVersionCompatibility(): Promise<string[]> {\n    const errors: string[] = [];\n    \n    // Check that all workspace packages have the same version\n    const versions = new Set(\n      Array.from(this.dependencyGraph.nodes.values()).map(pkg => pkg.version)\n    );\n    \n    if (versions.size > 1) {\n      errors.push(`Version mismatch across workspaces: ${Array.from(versions).join(', ')}`);\n    }\n    \n    return errors;\n  }\n  \n  /**\n   * 📊 Log resolution summary\n   */\n  private logResolutionSummary(): void {\n    Logger.info('\\n' + '='.repeat(60));\n    Logger.info('📊 DEPENDENCY RESOLUTION SUMMARY');\n    Logger.info('='.repeat(60));\n    \n    Logger.info(`📦 Workspaces: ${this.dependencyGraph.nodes.size}`);\n    Logger.info(`🔗 Dependencies: ${this.getTotalEdges()}`);\n    Logger.info(`✅ Resolutions: ${this.dependencyGraph.resolved.size}`);\n    \n    Logger.info('\\n📋 Build Order:');\n    const buildOrder = this.calculateBuildOrder();\n    buildOrder.forEach((pkg, index) => {\n      Logger.info(`  ${index + 1}. ${pkg}`);\n    });\n    \n    Logger.info('\\n🔗 Dependency Relationships:');\n    for (const [pkgName, dependencies] of this.dependencyGraph.edges) {\n      if (dependencies.size > 0) {\n        Logger.info(`  ${pkgName} depends on: ${Array.from(dependencies).join(', ')}`);\n      }\n    }\n    \n    Logger.info('\\n💡 Next Steps:');\n    Logger.info('  1. Test cross-workspace imports in development');\n    Logger.info('  2. Verify symlinks in node_modules/@fire22/');\n    Logger.info('  3. Run workspace builds in calculated order');\n    Logger.info('  4. Validate runtime dependency resolution');\n    \n    Logger.info('='.repeat(60));\n  }\n  \n  // === UTILITY METHODS ===\n  \n  private getTotalEdges(): number {\n    return Array.from(this.dependencyGraph.edges.values())\n      .reduce((total, deps) => total + deps.size, 0);\n  }\n  \n  private loadWorkspaceConfig(): any {\n    const configPath = join(this.rootPath, 'workspace-config.json');\n    if (!existsSync(configPath)) {\n      throw new Error('workspace-config.json not found');\n    }\n    return JSON.parse(readFileSync(configPath, 'utf-8'));\n  }\n}\n\n// === CLI INTERFACE ===\n\nif (import.meta.main) {\n  const args = process.argv.slice(2);\n  const command = args[0] || 'resolve';\n  \n  const resolver = new WorkspaceDependencyResolver();\n  \n  try {\n    switch (command) {\n      case 'resolve':\n        await resolver.resolveAllDependencies();\n        break;\n        \n      default:\n        console.log('Usage: bun workspace-dependency-resolver.ts [resolve]');\n        console.log('  resolve - Resolve all workspace dependencies');\n        process.exit(1);\n    }\n  } catch (error) {\n    Logger.error('❌ Dependency resolution failed:', error);\n    process.exit(1);\n  }\n}\n\nexport default WorkspaceDependencyResolver;