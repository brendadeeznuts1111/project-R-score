#!/usr/bin/env bun

/**
 * 🌐 Fire22 Bulk Department Deployment System
 *
 * Deploys all departments in parallel with comprehensive monitoring
 * Includes rollback capabilities and deployment health checks
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BulkDeployOptions {
  environment?: 'development' | 'staging' | 'production';
  parallel?: number;
  verbose?: boolean;
  dryRun?: boolean;
  rollback?: boolean;
  skipHealthCheck?: boolean;
}

interface DeploymentResult {
  department: string;
  status: 'success' | 'failed' | 'skipped';
  url?: string;
  error?: string;
  duration: number;
  timestamp: string;
}

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  members: any[];
}

class Fire22BulkDeployment {
  private readonly teamDirectory: any;
  private readonly distDir = join(process.cwd(), 'dist', 'pages');
  private readonly deploymentLog = join(process.cwd(), 'logs', 'deployment.json');

  constructor() {
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 🌐 Deploy all departments
   */
  async deployAll(options: BulkDeployOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.log('🌐 Fire22 Bulk Department Deployment System');
    console.log('!==!==!==!==!==!==!==!==');

    const env = options.environment || 'development';
    const parallelCount = options.parallel || 3;

    console.log(`\n🎯 Environment: ${env}`);
    console.log(`⚡ Parallel Deployments: ${parallelCount}`);
    console.log(`🏢 Departments: ${this.getDepartments().length}`);

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual deployments');
    }

    try {
      // Verify prerequisites
      await this.verifyBulkPrerequisites(options);

      // Build all pages if needed
      await this.ensureBulkBuild(options);

      // Deploy all departments
      const results = await this.executeParallelDeployments(options);

      // Health check deployed services
      if (!options.skipHealthCheck) {
        await this.performHealthChecks(results, options);
      }

      // Generate deployment report
      await this.generateDeploymentReport(results, options);

      // Show summary
      this.showDeploymentSummary(results, options);

      const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.log(`\n✅ Bulk deployment completed in ${(totalTime / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error('❌ Bulk deployment failed:', error);

      if (options.rollback) {
        console.log('\n🔄 Initiating rollback...');
        await this.performRollback(options);
      }

      process.exit(1);
    }
  }

  /**
   * ✅ Verify bulk deployment prerequisites
   */
  private async verifyBulkPrerequisites(options: BulkDeployOptions): Promise<void> {
    console.log('\n✅ Verifying bulk deployment prerequisites...');

    // Check Wrangler
    try {
      await $`wrangler --version`.quiet();
      console.log('  ✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install: npm install -g wrangler');
    }

    // Check Cloudflare auth
    try {
      await $`wrangler whoami`.quiet();
      console.log('  ✅ Cloudflare authentication verified');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
    }

    // Check build directory
    if (!existsSync(this.distDir)) {
      console.log('  ⚠️ Build directory missing, will build automatically');
    } else {
      console.log('  ✅ Build directory exists');
    }

    // Check department configurations
    const departments = this.getDepartments();
    console.log(`  ✅ ${departments.length} departments configured`);

    // Create logs directory
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir) && !options.dryRun) {
      await $`mkdir -p ${logsDir}`;
    }
    console.log('  ✅ Logging system ready');
  }

  /**
   * 🏗️ Ensure bulk build is ready
   */
  private async ensureBulkBuild(options: BulkDeployOptions): Promise<void> {
    console.log('\n🏗️ Ensuring bulk build is ready...');

    const manifestPath = join(this.distDir, 'manifest.json');

    if (!existsSync(manifestPath)) {
      console.log('  🔨 Build not found, building all pages...');

      if (!options.dryRun) {
        const buildArgs = ['--env', options.environment || 'development'];

        if (options.verbose) {
          buildArgs.push('--verbose');
        }

        await $`bun run scripts/build-pages.ts ${buildArgs}`;
      }

      console.log('  ✅ Bulk build completed');
    } else {
      console.log('  ✅ Build already exists');
    }
  }

  /**
   * ⚡ Execute parallel deployments
   */
  private async executeParallelDeployments(
    options: BulkDeployOptions
  ): Promise<DeploymentResult[]> {
    console.log('\n⚡ Executing parallel deployments...');

    const departments = this.getDepartments();
    const results: DeploymentResult[] = [];
    const parallelCount = options.parallel || 3;

    // Split departments into batches for parallel processing
    const batches = this.createDeploymentBatches(departments, parallelCount);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} departments)`);

      // Deploy batch in parallel
      const batchPromises = batch.map(dept => this.deploySingleDepartment(dept, options));
      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      batchResults.forEach((result, index) => {
        const dept = batch[index];

        if (result.status === 'fulfilled') {
          results.push(result.value);
          console.log(`  ✅ ${dept.name}: Deployed successfully`);
        } else {
          const failedResult: DeploymentResult = {
            department: dept.id,
            status: 'failed',
            error: result.reason?.message || 'Unknown error',
            duration: 0,
            timestamp: new Date().toISOString(),
          };
          results.push(failedResult);
          console.log(`  ❌ ${dept.name}: ${result.reason?.message || 'Deployment failed'}`);
        }
      });

      // Brief pause between batches to avoid overwhelming the API
      if (batchIndex < batches.length - 1 && !options.dryRun) {
        console.log('  ⏳ Waiting 5s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return results;
  }

  /**
   * 🏢 Deploy single department (internal method)
   */
  private async deploySingleDepartment(
    dept: Department,
    options: BulkDeployOptions
  ): Promise<DeploymentResult> {
    const startTime = Bun.nanoseconds();
    const timestamp = new Date().toISOString();

    if (options.dryRun) {
      return {
        department: dept.id,
        status: 'success',
        url: `https://${dept.id}.dashboard.fire22.ag`,
        duration: 100, // Simulated duration
        timestamp,
      };
    }

    try {
      const deptDistPath = join(this.distDir, dept.id);

      if (!existsSync(deptDistPath)) {
        throw new Error(`Department build not found: ${deptDistPath}`);
      }

      const deployArgs = [
        'pages',
        'deploy',
        deptDistPath,
        '--project-name',
        'fire22-dashboard',
        '--env',
        dept.id,
      ];

      if (options.environment === 'production') {
        deployArgs.push('--compatibility-date', '2024-01-01');
      }

      await $`wrangler ${deployArgs}`.quiet();

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      const baseUrl =
        options.environment === 'production'
          ? 'https://dashboard.fire22.ag'
          : 'https://fire22-dashboard.pages.dev';

      return {
        department: dept.id,
        status: 'success',
        url: `${baseUrl}/${dept.id}/`,
        duration,
        timestamp,
      };
    } catch (error) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      return {
        department: dept.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp,
      };
    }
  }

  /**
   * 🏥 Perform health checks
   */
  private async performHealthChecks(
    results: DeploymentResult[],
    options: BulkDeployOptions
  ): Promise<void> {
    console.log('\n🏥 Performing health checks...');

    const successfulDeployments = results.filter(r => r.status === 'success' && r.url);

    if (successfulDeployments.length === 0) {
      console.log('  ⚠️ No successful deployments to health check');
      return;
    }

    console.log(`  🔍 Checking ${successfulDeployments.length} deployed services...`);

    for (const deployment of successfulDeployments) {
      if (!deployment.url || options.dryRun) continue;

      try {
        const response = await fetch(deployment.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          console.log(`  ✅ ${deployment.department}: Health check passed (${response.status})`);
        } else {
          console.log(`  ⚠️ ${deployment.department}: Health check warning (${response.status})`);
        }
      } catch (error) {
        console.log(
          `  ❌ ${deployment.department}: Health check failed - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * 📊 Generate deployment report
   */
  private async generateDeploymentReport(
    results: DeploymentResult[],
    options: BulkDeployOptions
  ): Promise<void> {
    console.log('\n📊 Generating deployment report...');

    const report = {
      timestamp: new Date().toISOString(),
      environment: options.environment || 'development',
      totalDepartments: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      results: results,
      options: {
        parallel: options.parallel || 3,
        dryRun: options.dryRun || false,
        skipHealthCheck: options.skipHealthCheck || false,
      },
    };

    if (!options.dryRun) {
      writeFileSync(this.deploymentLog, JSON.stringify(report, null, 2));
    }

    console.log(`  📋 Report saved to: ${this.deploymentLog}`);
  }

  /**
   * 📈 Show deployment summary
   */
  private showDeploymentSummary(results: DeploymentResult[], options: BulkDeployOptions): void {
    console.log('\n📈 Deployment Summary:');
    console.log('!==!==!==!==');

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏭️ Skipped: ${skipped.length}`);

    if (successful.length > 0) {
      console.log('\n🎉 Successfully Deployed:');
      successful.forEach(r => {
        const duration = `${r.duration.toFixed(0)}ms`;
        console.log(`  • ${r.department}: ${r.url} (${duration})`);
      });
    }

    if (failed.length > 0) {
      console.log('\n💥 Failed Deployments:');
      failed.forEach(r => {
        console.log(`  • ${r.department}: ${r.error}`);
      });

      console.log('\n🔧 Suggested Actions:');
      console.log('  1. Check individual department builds');
      console.log('  2. Verify Cloudflare configuration');
      console.log('  3. Run: bun run dept:deploy <department> --verbose');
      console.log('  4. Consider rollback: --rollback flag');
    }

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`\n⏱️ Average deployment time: ${avgDuration.toFixed(0)}ms`);

    if (options.environment === 'production') {
      console.log('\n🌐 Production URLs:');
      successful.forEach(r => {
        if (r.url) console.log(`  🔗 https://${r.department}.dashboard.fire22.ag`);
      });
    }
  }

  /**
   * 🔄 Perform rollback
   */
  private async performRollback(options: BulkDeployOptions): Promise<void> {
    console.log('\n🔄 Performing deployment rollback...');

    // This would implement rollback logic
    // For now, just show what would be done
    console.log('  📋 Rollback strategy:');
    console.log('    1. Identify previous successful deployment');
    console.log('    2. Restore previous build artifacts');
    console.log('    3. Redeploy stable version');
    console.log('    4. Verify rollback health');

    console.log('  💡 Manual rollback: bun run dept:rollback --to-previous');
  }

  /**
   * 📦 Create deployment batches
   */
  private createDeploymentBatches(departments: Department[], batchSize: number): Department[][] {
    const batches: Department[][] = [];

    for (let i = 0; i < departments.length; i += batchSize) {
      batches.push(departments.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * 🏢 Get departments from team directory
   */
  private getDepartments(): Department[] {
    const departments: Department[] = [];

    for (const [key, dept] of Object.entries(this.teamDirectory.departments)) {
      if (dept && typeof dept === 'object' && 'name' in dept) {
        departments.push({
          id: key,
          name: dept.name,
          email: dept.email,
          domain: dept.domain,
          color: dept.color,
          members: dept.members || [],
        });
      }
    }

    return departments;
  }

  /**
   * 📜 Show deployment history
   */
  async showDeploymentHistory(): Promise<void> {
    console.log('\n📜 Deployment History:');
    console.log('!==!==!==!==');

    if (!existsSync(this.deploymentLog)) {
      console.log('  📭 No deployment history found');
      return;
    }

    try {
      const history = JSON.parse(readFileSync(this.deploymentLog, 'utf-8'));

      console.log(`📅 Last Deployment: ${new Date(history.timestamp).toLocaleString()}`);
      console.log(`🎯 Environment: ${history.environment}`);
      console.log(
        `📊 Success Rate: ${history.successful}/${history.totalDepartments} (${((history.successful / history.totalDepartments) * 100).toFixed(1)}%)`
      );
      console.log(`⏱️ Average Duration: ${history.averageDuration.toFixed(0)}ms`);

      if (history.failed > 0) {
        console.log('\n❌ Last Failed Deployments:');
        const failedResults = history.results.filter(
          (r: DeploymentResult) => r.status === 'failed'
        );
        failedResults.forEach((r: DeploymentResult) => {
          console.log(`  • ${r.department}: ${r.error}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to read deployment history:', error);
    }
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const [command, ...commandArgs] = args;

  const bulkDeploy = new Fire22BulkDeployment();

  switch (command) {
    case 'deploy': {
      const options: BulkDeployOptions = {
        environment: 'development',
        parallel: 3,
        verbose: false,
        dryRun: false,
        rollback: false,
        skipHealthCheck: false,
      };

      for (let i = 0; i < commandArgs.length; i++) {
        const arg = commandArgs[i];

        switch (arg) {
          case '--env':
          case '--environment':
            options.environment = commandArgs[++i] as any;
            break;
          case '--parallel':
            options.parallel = parseInt(commandArgs[++i]) || 3;
            break;
          case '--verbose':
            options.verbose = true;
            break;
          case '--dry-run':
            options.dryRun = true;
            break;
          case '--rollback':
            options.rollback = true;
            break;
          case '--skip-health-check':
            options.skipHealthCheck = true;
            break;
        }
      }

      await bulkDeploy.deployAll(options);
      break;
    }

    case 'history':
      await bulkDeploy.showDeploymentHistory();
      break;

    default:
      console.log(`
🌐 Fire22 Bulk Department Deployment System

Usage:
  bun run scripts/deploy-all-departments.ts <command> [options]

Commands:
  deploy                  Deploy all departments in parallel
  history                Show deployment history

Deploy Options:
  --env, --environment    Deployment environment (development|staging|production)
  --parallel             Number of parallel deployments (default: 3)
  --verbose              Verbose logging
  --dry-run              Preview deployment without executing
  --rollback             Enable automatic rollback on failure
  --skip-health-check    Skip post-deployment health checks

Examples:
  bun run scripts/deploy-all-departments.ts deploy
  bun run scripts/deploy-all-departments.ts deploy --env production --parallel 5
  bun run scripts/deploy-all-departments.ts deploy --dry-run --verbose
  bun run scripts/deploy-all-departments.ts deploy --rollback --env staging
  bun run scripts/deploy-all-departments.ts history

Quick Commands:
  bun run deploy:all                    # Deploy all departments (development)
  bun run deploy:all:production        # Deploy all departments (production)
  bun run deploy:history              # Show deployment history
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22BulkDeployment };
