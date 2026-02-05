#!/usr/bin/env bun

/**
 * 🏥 Fire22 Workspace Health Monitor
 *
 * Monitors health and status of all Fire22 workspaces:
 * - Dependency resolution
 * - Build status
 * - Test coverage
 * - Size metrics
 * - Cross-workspace links
 *
 * @version 1.0.0
 */

import { $ } from 'bun';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

interface WorkspaceHealth {
  name: string;
  path: string;
  status: 'healthy' | 'warning' | 'error' | 'not-found';
  checks: {
    packageJson: boolean;
    nodeModules: boolean;
    sourceFiles: boolean;
    buildOutput: boolean;
    tests: boolean;
    dependencies: boolean;
    size: number;
    lastModified: Date;
  };
  dependencies: {
    production: string[];
    development: string[];
    workspace: string[];
    missing: string[];
    outdated: string[];
  };
  metrics: {
    files: number;
    size: string;
    loc: number;
    coverage: number | null;
  };
  issues: string[];
}

class WorkspaceHealthMonitor {
  private workspacesPath: string;
  private workspaces: string[];

  constructor() {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.workspaces = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];
  }

  /**
   * 🔍 Run complete health check
   */
  async runHealthCheck(): Promise<void> {
    console.log('🏥 Fire22 Workspace Health Monitor');
    console.log('='.repeat(60));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('');

    const healthResults: WorkspaceHealth[] = [];

    for (const workspace of this.workspaces) {
      const health = await this.checkWorkspaceHealth(workspace);
      healthResults.push(health);
      this.printWorkspaceHealth(health);
    }

    // Print summary
    this.printSummary(healthResults);

    // Check cross-workspace dependencies
    await this.checkCrossWorkspaceDependencies(healthResults);

    // Generate health report
    await this.generateHealthReport(healthResults);
  }

  /**
   * 🔍 Check individual workspace health
   */
  private async checkWorkspaceHealth(workspace: string): Promise<WorkspaceHealth> {
    const workspacePath = join(this.workspacesPath, workspace);
    const health: WorkspaceHealth = {
      name: workspace,
      path: workspacePath,
      status: 'healthy',
      checks: {
        packageJson: false,
        nodeModules: false,
        sourceFiles: false,
        buildOutput: false,
        tests: false,
        dependencies: false,
        size: 0,
        lastModified: new Date(),
      },
      dependencies: {
        production: [],
        development: [],
        workspace: [],
        missing: [],
        outdated: [],
      },
      metrics: {
        files: 0,
        size: '0KB',
        loc: 0,
        coverage: null,
      },
      issues: [],
    };

    // Check if workspace exists
    if (!existsSync(workspacePath)) {
      health.status = 'not-found';
      health.issues.push('Workspace directory not found');
      return health;
    }

    // Check package.json
    const packageJsonPath = join(workspacePath, 'package.json');
    if (existsSync(packageJsonPath)) {
      health.checks.packageJson = true;
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Extract dependencies
      if (packageJson.dependencies) {
        for (const [dep, version] of Object.entries(packageJson.dependencies)) {
          if (version === 'workspace:*') {
            health.dependencies.workspace.push(dep);
          } else {
            health.dependencies.production.push(`${dep}@${version}`);
          }
        }
      }

      if (packageJson.devDependencies) {
        for (const [dep, version] of Object.entries(packageJson.devDependencies)) {
          health.dependencies.development.push(`${dep}@${version}`);
        }
      }
    } else {
      health.issues.push('package.json not found');
      health.status = 'error';
    }

    // Check node_modules
    if (existsSync(join(workspacePath, 'node_modules'))) {
      health.checks.nodeModules = true;
    } else {
      health.issues.push('node_modules not found - run install');
      if (health.status === 'healthy') health.status = 'warning';
    }

    // Check source files
    if (existsSync(join(workspacePath, 'src'))) {
      health.checks.sourceFiles = true;

      // Count files and LOC
      try {
        const result =
          await $`find ${join(workspacePath, 'src')} -name "*.ts" -o -name "*.tsx" | wc -l`.quiet();
        health.metrics.files = parseInt(result.stdout.toString().trim());
      } catch {}
    } else {
      health.issues.push('src directory not found');
      if (health.status === 'healthy') health.status = 'warning';
    }

    // Check build output
    if (existsSync(join(workspacePath, 'dist'))) {
      health.checks.buildOutput = true;
    }

    // Check tests
    if (
      existsSync(join(workspacePath, 'tests')) ||
      existsSync(join(workspacePath, 'test')) ||
      existsSync(join(workspacePath, '__tests__'))
    ) {
      health.checks.tests = true;
    }

    // Check workspace size
    try {
      const result = await $`du -sh ${workspacePath}`.quiet();
      const sizeStr = result.stdout.toString().split('\t')[0];
      health.metrics.size = sizeStr;

      // Parse size for health check
      const sizeMatch = sizeStr.match(/(\d+(\.\d+)?)(K|M|G)/);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[3];
        let sizeInKB = value;
        if (unit === 'M') sizeInKB = value * 1024;
        if (unit === 'G') sizeInKB = value * 1024 * 1024;
        health.checks.size = sizeInKB;

        // Warn if workspace is too large
        if (sizeInKB > 10240) {
          // 10MB
          health.issues.push(`Workspace is large (${sizeStr})`);
          if (health.status === 'healthy') health.status = 'warning';
        }
      }
    } catch {}

    // Get last modified time
    try {
      const stats = statSync(workspacePath);
      health.checks.lastModified = stats.mtime;
    } catch {}

    // Check for missing workspace dependencies
    for (const dep of health.dependencies.workspace) {
      const depName = dep.replace('@fire22/', '@fire22-');
      const depPath = join(this.workspacesPath, depName);
      if (!existsSync(depPath)) {
        health.dependencies.missing.push(dep);
        health.issues.push(`Missing workspace dependency: ${dep}`);
        health.status = 'error';
      }
    }

    // All checks passed?
    health.checks.dependencies = health.dependencies.missing.length === 0;

    return health;
  }

  /**
   * 📊 Print workspace health status
   */
  private printWorkspaceHealth(health: WorkspaceHealth): void {
    const statusIcon = {
      healthy: '✅',
      warning: '⚠️ ',
      error: '❌',
      'not-found': '❓',
    }[health.status];

    console.log(`\n${statusIcon} ${health.name}`);
    console.log('  ' + '-'.repeat(40));

    // Print checks
    console.log('  📋 Checks:');
    console.log(`    package.json:  ${health.checks.packageJson ? '✅' : '❌'}`);
    console.log(`    node_modules:  ${health.checks.nodeModules ? '✅' : '❌'}`);
    console.log(`    source files:  ${health.checks.sourceFiles ? '✅' : '❌'}`);
    console.log(`    build output:  ${health.checks.buildOutput ? '✅' : '⚪'}`);
    console.log(`    tests:         ${health.checks.tests ? '✅' : '⚪'}`);
    console.log(`    dependencies:  ${health.checks.dependencies ? '✅' : '❌'}`);

    // Print metrics
    console.log('  📊 Metrics:');
    console.log(`    Size: ${health.metrics.size}`);
    console.log(`    Files: ${health.metrics.files}`);

    // Print dependencies
    if (health.dependencies.workspace.length > 0) {
      console.log('  🔗 Workspace Dependencies:');
      health.dependencies.workspace.forEach(dep => {
        const isMissing = health.dependencies.missing.includes(dep);
        console.log(`    ${isMissing ? '❌' : '✅'} ${dep}`);
      });
    }

    // Print issues
    if (health.issues.length > 0) {
      console.log('  ⚠️  Issues:');
      health.issues.forEach(issue => {
        console.log(`    • ${issue}`);
      });
    }
  }

  /**
   * 📊 Print summary
   */
  private printSummary(healthResults: WorkspaceHealth[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH SUMMARY');
    console.log('='.repeat(60));

    const healthy = healthResults.filter(h => h.status === 'healthy').length;
    const warning = healthResults.filter(h => h.status === 'warning').length;
    const error = healthResults.filter(h => h.status === 'error').length;
    const notFound = healthResults.filter(h => h.status === 'not-found').length;

    console.log(`✅ Healthy:   ${healthy}/${this.workspaces.length}`);
    console.log(`⚠️  Warning:   ${warning}/${this.workspaces.length}`);
    console.log(`❌ Error:     ${error}/${this.workspaces.length}`);
    console.log(`❓ Not Found: ${notFound}/${this.workspaces.length}`);

    // Overall status
    let overallStatus = 'healthy';
    if (error > 0 || notFound > 0) overallStatus = 'critical';
    else if (warning > 0) overallStatus = 'degraded';

    console.log(`\n🏥 Overall Status: ${overallStatus.toUpperCase()}`);
  }

  /**
   * 🔗 Check cross-workspace dependencies
   */
  private async checkCrossWorkspaceDependencies(healthResults: WorkspaceHealth[]): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🔗 CROSS-WORKSPACE DEPENDENCIES');
    console.log('='.repeat(60));

    const dependencyMap = new Map<string, string[]>();

    // Build dependency map
    for (const health of healthResults) {
      for (const dep of health.dependencies.workspace) {
        if (!dependencyMap.has(dep)) {
          dependencyMap.set(dep, []);
        }
        dependencyMap.get(dep)!.push(health.name);
      }
    }

    // Print dependency graph
    console.log('\n📊 Dependency Graph:');
    for (const [dep, dependents] of dependencyMap) {
      console.log(`  ${dep}:`);
      dependents.forEach(d => console.log(`    ← ${d}`));
    }

    // Check for circular dependencies
    console.log('\n🔄 Circular Dependency Check:');
    const circular = this.findCircularDependencies(healthResults);
    if (circular.length > 0) {
      console.log('  ❌ Circular dependencies detected:');
      circular.forEach(cycle => console.log(`    ${cycle.join(' → ')}`));
    } else {
      console.log('  ✅ No circular dependencies found');
    }
  }

  /**
   * 🔄 Find circular dependencies
   */
  private findCircularDependencies(healthResults: WorkspaceHealth[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (workspace: string, path: string[]): void => {
      if (stack.has(workspace)) {
        // Found a cycle
        const cycleStart = path.indexOf(workspace);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(workspace)) return;

      visited.add(workspace);
      stack.add(workspace);
      path.push(workspace);

      const health = healthResults.find(h => h.name === workspace);
      if (health) {
        for (const dep of health.dependencies.workspace) {
          const depName = dep.replace('@fire22/', '@fire22-');
          dfs(depName, [...path]);
        }
      }

      stack.delete(workspace);
    };

    for (const health of healthResults) {
      if (!visited.has(health.name)) {
        dfs(health.name, []);
      }
    }

    return cycles;
  }

  /**
   * 📄 Generate health report
   */
  private async generateHealthReport(healthResults: WorkspaceHealth[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      workspaces: this.workspaces.length,
      health: healthResults.map(h => ({
        name: h.name,
        status: h.status,
        checks: h.checks,
        metrics: h.metrics,
        issues: h.issues,
      })),
      summary: {
        healthy: healthResults.filter(h => h.status === 'healthy').length,
        warning: healthResults.filter(h => h.status === 'warning').length,
        error: healthResults.filter(h => h.status === 'error').length,
        notFound: healthResults.filter(h => h.status === 'not-found').length,
      },
    };

    // Write report to file
    const reportPath = join(process.cwd(), 'workspace-health-report.json');
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Health report saved to: ${reportPath}`);
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const monitor = new WorkspaceHealthMonitor();
  await monitor.runHealthCheck();
}

export default WorkspaceHealthMonitor;
