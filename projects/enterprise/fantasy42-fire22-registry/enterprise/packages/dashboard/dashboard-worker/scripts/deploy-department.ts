#!/usr/bin/env bun

/**
 * 🚀 Fire22 Department Deployment System
 *
 * Deploys department-specific pages to Cloudflare Pages
 * Integrates with existing Bun build system and Wrangler
 */

import { $ } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DeployOptions {
  department?: string;
  environment?: 'development' | 'staging' | 'production';
  preview?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  members: any[];
}

class Fire22DepartmentDeployment {
  private readonly teamDirectory: any;
  private readonly distDir = join(process.cwd(), 'dist', 'pages');

  constructor() {
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 🚀 Deploy department or all departments
   */
  async deploy(options: DeployOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.info('🚀 Fire22 Department Deployment System');
    console.info('!==!==!==!==!==!=====');

    const env = options.environment || 'development';
    console.info(`\n🎯 Environment: ${env}`);
    console.info(`🏢 Department: ${options.department || 'ALL'}`);
    console.info(`👁️ Preview Mode: ${options.preview ? 'YES' : 'NO'}`);

    if (options.dryRun) {
      console.info('🔍 DRY RUN MODE - No actual deployment');
    }

    try {
      // Verify prerequisites
      await this.verifyPrerequisites(options);

      // Build pages if not exists
      await this.ensureBuild(options);

      if (options.department) {
        // Deploy specific department
        await this.deploySingleDepartment(options.department, options);
      } else {
        // Deploy all departments
        await this.deployAllDepartments(options);
      }

      // Deploy feeds and assets
      await this.deployFeeds(options);

      // Update deployment status
      await this.updateDeploymentStatus(options);

      const deployTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.info(`\n✅ Deployment completed in ${deployTime.toFixed(2)}ms`);

      // Show deployment URLs
      this.showDeploymentUrls(options);
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  /**
   * ✅ Verify deployment prerequisites
   */
  private async verifyPrerequisites(options: DeployOptions): Promise<void> {
    console.info('\n✅ Verifying prerequisites...');

    // Check if wrangler is available
    try {
      await $`wrangler --version`;
      console.info('  ✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install: npm install -g wrangler');
    }

    // Check if authenticated with Cloudflare
    try {
      await $`wrangler whoami`;
      console.info('  ✅ Cloudflare authentication verified');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
    }

    // Check if dist directory exists
    if (!existsSync(this.distDir)) {
      throw new Error(`Build directory not found: ${this.distDir}. Run: bun run build:pages`);
    }
    console.info('  ✅ Build directory exists');

    // Verify environment configuration
    const wranglerConfigPath = join(process.cwd(), 'wrangler.toml');
    if (!existsSync(wranglerConfigPath)) {
      throw new Error('wrangler.toml not found');
    }
    console.info('  ✅ Wrangler configuration found');
  }

  /**
   * 🏗️ Ensure build is ready
   */
  private async ensureBuild(options: DeployOptions): Promise<void> {
    console.info('\n🏗️ Ensuring build is ready...');

    const manifestPath = join(this.distDir, 'manifest.json');

    if (!existsSync(manifestPath)) {
      console.info('  🔨 Build not found, building pages...');
      if (!options.dryRun) {
        const buildArgs = ['--env', options.environment || 'development'];

        if (options.department) {
          buildArgs.push('--dept', options.department);
        }

        await $`bun run scripts/build-pages.ts ${buildArgs}`;
      }
      console.info('  ✅ Build completed');
    } else {
      console.info('  ✅ Build already exists');
    }
  }

  /**
   * 🏢 Deploy single department
   */
  private async deploySingleDepartment(deptId: string, options: DeployOptions): Promise<void> {
    console.info(`\n🏢 Deploying ${deptId} department...`);

    const department = this.getDepartment(deptId);
    if (!department) {
      throw new Error(`Department not found: ${deptId}`);
    }

    const deptDistPath = join(this.distDir, deptId);
    if (!existsSync(deptDistPath)) {
      throw new Error(`Department build not found: ${deptDistPath}`);
    }

    if (!options.dryRun) {
      const deployArgs = [
        'pages',
        'deploy',
        deptDistPath,
        '--project-name',
        'fire22-dashboard',
        '--env',
        deptId,
      ];

      if (options.preview) {
        deployArgs.push('--compatibility-date', '2024-01-01');
      }

      if (options.verbose) {
        deployArgs.push('--verbose');
      }

      console.info(`  🚀 Deploying to ${deptId}.dashboard.fire22.ag...`);
      await $`wrangler ${deployArgs}`;
    }

    console.info(`  ✅ ${department.name} deployed successfully`);
  }

  /**
   * 🌐 Deploy all departments
   */
  private async deployAllDepartments(options: DeployOptions): Promise<void> {
    console.info('\n🌐 Deploying all departments...');

    const departments = this.getDepartments();
    const deploymentPromises = [];

    for (const dept of departments) {
      const deptOptions = { ...options, department: dept.id };
      deploymentPromises.push(
        this.deploySingleDepartment(dept.id, { ...deptOptions, dryRun: options.dryRun })
      );
    }

    // Deploy departments in parallel for better performance
    if (!options.dryRun) {
      await Promise.all(deploymentPromises);
    }

    // Deploy main site
    console.info('\n🏠 Deploying main dashboard...');
    if (!options.dryRun) {
      const mainDeployArgs = [
        'pages',
        'deploy',
        this.distDir,
        '--project-name',
        'fire22-dashboard',
      ];

      if (options.environment === 'production') {
        mainDeployArgs.push('--env', 'production');
      }

      await $`wrangler ${mainDeployArgs}`;
    }
    console.info('  ✅ Main dashboard deployed');
  }

  /**
   * 📡 Deploy RSS feeds
   */
  private async deployFeeds(options: DeployOptions): Promise<void> {
    console.info('\n📡 Deploying RSS feeds...');

    const feedsPath = join(this.distDir, 'feeds');
    if (existsSync(feedsPath) && !options.dryRun) {
      // Feeds are included in main deployment, but we can verify they exist
      const feedFiles = ['error-codes-rss.xml', 'error-codes-atom.xml', 'index.html'];

      for (const feedFile of feedFiles) {
        const feedPath = join(feedsPath, feedFile);
        if (existsSync(feedPath)) {
          console.info(`  ✅ ${feedFile} ready for deployment`);
        } else {
          console.info(`  ⚠️ ${feedFile} missing`);
        }
      }
    }
  }

  /**
   * 📊 Update deployment status
   */
  private async updateDeploymentStatus(options: DeployOptions): Promise<void> {
    console.info('\n📊 Updating deployment status...');

    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      environment: options.environment || 'development',
      department: options.department || 'ALL',
      preview: options.preview || false,
      deployer: process.env.USER || 'unknown',
      commit: await this.getCurrentCommit(),
      status: 'SUCCESS',
    };

    console.info(`  📅 Deployment Time: ${deploymentInfo.timestamp}`);
    console.info(`  👤 Deployed By: ${deploymentInfo.deployer}`);
    console.info(`  📝 Commit: ${deploymentInfo.commit}`);
  }

  /**
   * 🔗 Show deployment URLs
   */
  private showDeploymentUrls(options: DeployOptions): void {
    console.info('\n🔗 Deployment URLs:');
    console.info('!==!==!====');

    if (options.environment === 'production') {
      console.info('🌐 Main Dashboard: https://dashboard.fire22.ag');

      if (options.department) {
        const dept = this.getDepartment(options.department);
        console.info(`🏢 ${dept?.name}: https://${options.department}.dashboard.fire22.ag`);
      } else {
        const departments = this.getDepartments();
        departments.forEach(dept => {
          console.info(`🏢 ${dept.name}: https://${dept.id}.dashboard.fire22.ag`);
        });
      }

      console.info('📡 RSS Feed: https://dashboard.fire22.ag/feeds/error-codes-rss.xml');
      console.info('⚛️ Atom Feed: https://dashboard.fire22.ag/feeds/error-codes-atom.xml');
    } else {
      console.info('🌐 Main Dashboard: https://fire22-dashboard.pages.dev');
      console.info('📡 RSS Feed: https://fire22-dashboard.pages.dev/feeds/error-codes-rss.xml');
    }
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
   * 🔍 Get specific department
   */
  private getDepartment(deptId: string): Department | null {
    return this.getDepartments().find(d => d.id === deptId) || null;
  }

  /**
   * 📝 Get current Git commit
   */
  private async getCurrentCommit(): Promise<string> {
    try {
      const result = await $`git rev-parse --short HEAD`.text();
      return result.trim();
    } catch {
      return 'unknown';
    }
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: DeployOptions = {
    environment: 'development',
    preview: false,
    dryRun: false,
    verbose: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--env':
      case '--environment':
        options.environment = args[++i] as any;
        break;
      case '--dept':
      case '--department':
        options.department = args[++i];
        break;
      case '--preview':
        options.preview = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.info(`
Fire22 Department Deployment System

Usage:
  bun run scripts/deploy-department.ts [options] [department]

Options:
  --env, --environment    Deployment environment (development|staging|production)
  --dept, --department    Deploy specific department only
  --preview              Deploy as preview (does not affect production)
  --dry-run              Preview deployment without executing
  --verbose              Verbose logging
  --help                 Show this help

Examples:
  bun run scripts/deploy-department.ts
  bun run scripts/deploy-department.ts --dept finance --env production
  bun run scripts/deploy-department.ts --preview --verbose
  bun run scripts/deploy-department.ts --dry-run

Department Self-Service Examples:
  bun run dept:deploy finance
  bun run dept:deploy technology --env staging
  bun run dept:preview marketing
`);
        process.exit(0);
      default:
        // Treat unknown arguments as department name
        if (!arg.startsWith('--') && !options.department) {
          options.department = arg;
        }
    }
  }

  const deployment = new Fire22DepartmentDeployment();
  await deployment.deploy(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22DepartmentDeployment };
