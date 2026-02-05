#!/usr/bin/env bun

/**
 * 🏢 Fire22 Department Status Monitor
 *
 * Monitors deployment status and health for department-specific pages
 * Provides real-time status information for department administrators
 */

import { $ } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface StatusOptions {
  department?: string;
  verbose?: boolean;
  json?: boolean;
  watch?: boolean;
  environment?: string;
}

interface DepartmentStatus {
  id: string;
  name: string;
  deployment: {
    status: 'deployed' | 'pending' | 'failed' | 'not-deployed';
    url: string;
    lastDeployed?: string;
    environment: string;
  };
  build: {
    status: 'built' | 'building' | 'failed' | 'not-built';
    lastBuilt?: string;
    size?: string;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number;
    uptime?: string;
  };
  team: {
    admin: string;
    members: number;
    online: number;
  };
}

class Fire22DepartmentStatusMonitor {
  private readonly teamDirectory: any;
  private readonly distDir = join(process.cwd(), 'dist', 'pages');

  constructor() {
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 📊 Get department status
   */
  async getStatus(options: StatusOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    if (!options.json) {
      console.log('📊 Fire22 Department Status Monitor');
      console.log('!==!==!==!==!==!=====');

      const env = options.environment || 'development';
      console.log(`\n🎯 Environment: ${env}`);
      console.log(`🏢 Department: ${options.department || 'ALL'}`);
    }

    try {
      let statuses: DepartmentStatus[] = [];

      if (options.department) {
        // Get single department status
        const status = await this.getDepartmentStatus(options.department, options);
        if (status) {
          statuses = [status];
        }
      } else {
        // Get all departments status
        statuses = await this.getAllDepartmentStatuses(options);
      }

      if (options.json) {
        console.log(JSON.stringify(statuses, null, 2));
      } else {
        await this.displayStatuses(statuses, options);
      }

      if (options.watch) {
        await this.watchStatuses(options);
      }

      const statusTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (!options.json && options.verbose) {
        console.log(`\n⏱️ Status check completed in ${statusTime.toFixed(2)}ms`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.error('❌ Status check failed:', error);
      }
      process.exit(1);
    }
  }

  /**
   * 🏢 Get single department status
   */
  private async getDepartmentStatus(
    deptId: string,
    options: StatusOptions
  ): Promise<DepartmentStatus | null> {
    const department = this.getDepartment(deptId);
    if (!department) {
      throw new Error(`Department not found: ${deptId}`);
    }

    // Check deployment status
    const deploymentStatus = await this.checkDeploymentStatus(deptId, options);

    // Check build status
    const buildStatus = await this.checkBuildStatus(deptId);

    // Check health status
    const healthStatus = await this.checkHealthStatus(deptId, options);

    // Get team status
    const teamStatus = this.getTeamStatus(department);

    return {
      id: deptId,
      name: department.name,
      deployment: deploymentStatus,
      build: buildStatus,
      health: healthStatus,
      team: teamStatus,
    };
  }

  /**
   * 🌐 Get all departments status
   */
  private async getAllDepartmentStatuses(options: StatusOptions): Promise<DepartmentStatus[]> {
    const departments = this.getDepartments();
    const statuses: DepartmentStatus[] = [];

    // Process departments in parallel for better performance
    const statusPromises = departments.map(dept => this.getDepartmentStatus(dept.id, options));

    const results = await Promise.allSettled(statusPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        statuses.push(result.value);
      } else if (options.verbose) {
        console.error(`Failed to get status for ${departments[index].name}:`, result.reason);
      }
    });

    return statuses;
  }

  /**
   * 🚀 Check deployment status
   */
  private async checkDeploymentStatus(
    deptId: string,
    options: StatusOptions
  ): Promise<DepartmentStatus['deployment']> {
    const environment = options.environment || 'development';
    const baseUrl = this.getBaseUrl(environment);
    const deptUrl = `${baseUrl}/${deptId}/`;

    try {
      // Check if deployed via HTTP request
      const response = await fetch(deptUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const status = response.ok ? 'deployed' : 'failed';

      return {
        status,
        url: deptUrl,
        environment,
        lastDeployed: response.headers.get('last-modified') || undefined,
      };
    } catch (error) {
      return {
        status: 'not-deployed',
        url: deptUrl,
        environment,
      };
    }
  }

  /**
   * 🔨 Check build status
   */
  private async checkBuildStatus(deptId: string): Promise<DepartmentStatus['build']> {
    const deptDistPath = join(this.distDir, deptId);
    const indexPath = join(deptDistPath, 'index.html');

    if (!existsSync(deptDistPath)) {
      return { status: 'not-built' };
    }

    if (!existsSync(indexPath)) {
      return { status: 'failed' };
    }

    try {
      const stats = await Bun.file(indexPath).size;
      const lastBuilt = await this.getFileModificationTime(indexPath);

      return {
        status: 'built',
        size: this.formatBytes(stats),
        lastBuilt,
      };
    } catch (error) {
      return { status: 'failed' };
    }
  }

  /**
   * 🔍 Check health status
   */
  private async checkHealthStatus(
    deptId: string,
    options: StatusOptions
  ): Promise<DepartmentStatus['health']> {
    const environment = options.environment || 'development';
    const baseUrl = this.getBaseUrl(environment);
    const deptUrl = `${baseUrl}/${deptId}/`;

    try {
      const startTime = Bun.nanoseconds();

      const response = await fetch(deptUrl, {
        signal: AbortSignal.timeout(10000),
      });

      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to ms

      let status: 'healthy' | 'degraded' | 'unhealthy';

      if (response.ok && responseTime < 1000) {
        status = 'healthy';
      } else if (response.ok && responseTime < 3000) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        responseTime: Math.round(responseTime),
        uptime: this.calculateUptime(response),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: undefined,
        uptime: undefined,
      };
    }
  }

  /**
   * 👥 Get team status
   */
  private getTeamStatus(department: any): DepartmentStatus['team'] {
    const members = department.members || [];

    // Simulate online status (in real implementation, this would check actual status)
    const onlineMembers = members.filter(() => Math.random() > 0.3).length;

    return {
      admin: department.email,
      members: members.length,
      online: onlineMembers,
    };
  }

  /**
   * 📋 Display statuses in formatted output
   */
  private async displayStatuses(
    statuses: DepartmentStatus[],
    options: StatusOptions
  ): Promise<void> {
    console.log('\n📋 Department Status Overview:');
    console.log('!==!==!==!==!===');

    // Summary header
    const deployed = statuses.filter(s => s.deployment.status === 'deployed').length;
    const healthy = statuses.filter(s => s.health.status === 'healthy').length;
    const totalMembers = statuses.reduce((sum, s) => sum + s.team.members, 0);

    console.log(
      `\n📊 Summary: ${deployed}/${statuses.length} deployed, ${healthy}/${statuses.length} healthy, ${totalMembers} team members\n`
    );

    // Department details
    for (const status of statuses) {
      const deploymentIcon = this.getStatusIcon(status.deployment.status);
      const healthIcon = this.getHealthIcon(status.health.status);
      const buildIcon = this.getStatusIcon(status.build.status);

      console.log(`🏢 ${status.name} (${status.id})`);
      console.log(
        `   ${deploymentIcon} Deployment: ${status.deployment.status.toUpperCase()} - ${status.deployment.url}`
      );
      console.log(
        `   ${buildIcon} Build: ${status.build.status.toUpperCase()}${status.build.size ? ` (${status.build.size})` : ''}`
      );
      console.log(
        `   ${healthIcon} Health: ${status.health.status.toUpperCase()}${status.health.responseTime ? ` (${status.health.responseTime}ms)` : ''}`
      );
      console.log(
        `   👥 Team: ${status.team.online}/${status.team.members} online - ${status.team.admin}`
      );

      if (options.verbose) {
        if (status.deployment.lastDeployed) {
          console.log(`      Last Deployed: ${status.deployment.lastDeployed}`);
        }
        if (status.build.lastBuilt) {
          console.log(`      Last Built: ${status.build.lastBuilt}`);
        }
      }

      console.log('');
    }

    // Show actions if issues found
    const issues = statuses.filter(
      s =>
        s.deployment.status !== 'deployed' ||
        s.health.status !== 'healthy' ||
        s.build.status !== 'built'
    );

    if (issues.length > 0) {
      console.log('🔧 Suggested Actions:');
      console.log('!==!==!==!==');

      issues.forEach(status => {
        if (status.build.status !== 'built') {
          console.log(`• ${status.name}: Run 'bun run dept:build ${status.id}'`);
        }
        if (status.deployment.status !== 'deployed') {
          console.log(`• ${status.name}: Run 'bun run dept:deploy ${status.id}'`);
        }
        if (status.health.status !== 'healthy' && status.deployment.status === 'deployed') {
          console.log(`• ${status.name}: Check logs and monitoring for performance issues`);
        }
      });
      console.log('');
    }
  }

  /**
   * ⏱️ Watch statuses (continuous monitoring)
   */
  private async watchStatuses(options: StatusOptions): Promise<void> {
    console.log('\n👁️ Watching department statuses (Ctrl+C to exit)...\n');

    let iteration = 0;

    const watchInterval = setInterval(async () => {
      iteration++;

      console.log(`\n📊 Status Update #${iteration} - ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(50));

      try {
        let statuses: DepartmentStatus[] = [];

        if (options.department) {
          const status = await this.getDepartmentStatus(options.department, options);
          if (status) {
            statuses = [status];
          }
        } else {
          statuses = await this.getAllDepartmentStatuses(options);
        }

        // Quick status line
        statuses.forEach(status => {
          const deploymentIcon = this.getStatusIcon(status.deployment.status);
          const healthIcon = this.getHealthIcon(status.health.status);

          console.log(
            `${deploymentIcon} ${healthIcon} ${status.name}: ${status.deployment.status} | ${status.health.status}${status.health.responseTime ? ` (${status.health.responseTime}ms)` : ''}`
          );
        });
      } catch (error) {
        console.error('❌ Watch update failed:', error.message);
      }
    }, 30000); // Update every 30 seconds

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(watchInterval);
      console.log('\n👋 Status monitoring stopped.');
      process.exit(0);
    });
  }

  /**
   * 🎨 Get status icon
   */
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      deployed: '✅',
      built: '✅',
      healthy: '✅',
      pending: '⏳',
      building: '⏳',
      degraded: '⚠️',
      failed: '❌',
      unhealthy: '❌',
      'not-deployed': '⭕',
      'not-built': '⭕',
      unknown: '❓',
    };

    return icons[status] || '❓';
  }

  /**
   * 🟢 Get health icon
   */
  private getHealthIcon(status: string): string {
    const icons: Record<string, string> = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🔴',
      unknown: '⚫',
    };

    return icons[status] || '⚫';
  }

  /**
   * 🔗 Get base URL for environment
   */
  private getBaseUrl(environment: string): string {
    switch (environment) {
      case 'production':
        return 'https://dashboard.fire22.ag';
      case 'staging':
        return 'https://staging.fire22-dashboard.pages.dev';
      default:
        return 'https://fire22-dashboard.pages.dev';
    }
  }

  /**
   * 📂 Get departments from team directory
   */
  private getDepartments(): Array<{ id: string; name: string; email: string }> {
    const departments: Array<{ id: string; name: string; email: string }> = [];

    for (const [key, dept] of Object.entries(this.teamDirectory.departments)) {
      if (dept && typeof dept === 'object' && 'name' in dept) {
        departments.push({
          id: key,
          name: dept.name,
          email: dept.email,
        });
      }
    }

    return departments;
  }

  /**
   * 🔍 Get specific department
   */
  private getDepartment(deptId: string): any {
    const dept = this.teamDirectory.departments[deptId];
    return dept && typeof dept === 'object' ? dept : null;
  }

  /**
   * 📁 Get file modification time
   */
  private async getFileModificationTime(filePath: string): Promise<string> {
    try {
      const stat = await Bun.file(filePath).stat();
      return stat.mtime?.toISOString() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 📏 Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * ⏰ Calculate uptime from response headers
   */
  private calculateUptime(response: Response): string {
    // This is a simplified implementation
    // In reality, you'd track deployment time and calculate uptime
    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      const deployTime = new Date(lastModified);
      const now = new Date();
      const uptimeMs = now.getTime() - deployTime.getTime();
      const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));

      if (uptimeHours < 24) {
        return `${uptimeHours}h`;
      } else {
        const uptimeDays = Math.floor(uptimeHours / 24);
        return `${uptimeDays}d`;
      }
    }

    return 'unknown';
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: StatusOptions = {
    verbose: false,
    json: false,
    watch: false,
    environment: 'development',
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dept':
      case '--department':
        options.department = args[++i];
        break;
      case '--env':
      case '--environment':
        options.environment = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--help':
        console.log(`
Fire22 Department Status Monitor

Usage:
  bun run scripts/department-status.ts [options] [department]

Options:
  --dept, --department    Check specific department only
  --env, --environment    Environment to check (development|staging|production)
  --verbose, -v           Verbose output with additional details
  --json                  Output in JSON format
  --watch, -w             Continuous monitoring (updates every 30s)
  --help                  Show this help

Examples:
  bun run scripts/department-status.ts
  bun run scripts/department-status.ts --dept finance --verbose
  bun run scripts/department-status.ts --env production --json
  bun run scripts/department-status.ts --watch
  
Department Self-Service Examples:
  bun run dept:status finance
  bun run dept:status technology --env staging
`);
        process.exit(0);
      default:
        // Treat unknown arguments as department name
        if (!arg.startsWith('--') && !options.department) {
          options.department = arg;
        }
    }
  }

  const monitor = new Fire22DepartmentStatusMonitor();
  await monitor.getStatus(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22DepartmentStatusMonitor };
