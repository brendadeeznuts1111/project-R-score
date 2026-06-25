#!/usr/bin/env bun

/**
 * 👁️ Fire22 Department Preview System
 *
 * Creates preview deployments for department pages before production
 * Integrates with Cloudflare Pages preview branches
 */

import { $ } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PreviewOptions {
  department?: string;
  branch?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
}

class Fire22DepartmentPreview {
  private readonly teamDirectory: any;
  private readonly distDir = join(process.cwd(), 'dist', 'pages');

  constructor() {
    const teamDirectoryPath = join(process.cwd(), 'src', 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 👁️ Create department preview
   */
  async createPreview(options: PreviewOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.info('👁️ Fire22 Department Preview System');
    console.info('!==!==!==!==!==!===');

    const branch = options.branch || `preview-${Date.now()}`;
    console.info(`\n🌿 Branch: ${branch}`);
    console.info(`🏢 Department: ${options.department || 'ALL'}`);

    if (options.dryRun) {
      console.info('🔍 DRY RUN MODE - No actual preview deployment');
    }

    try {
      // Verify prerequisites
      await this.verifyPrerequisites(options);

      // Build for preview
      await this.buildForPreview(options);

      // Create Git branch for preview
      await this.createPreviewBranch(branch, options);

      // Deploy preview
      await this.deployPreview(branch, options);

      // Show preview URLs
      this.showPreviewUrls(branch, options);

      const previewTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.info(`\n✅ Preview created successfully in ${previewTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Preview creation failed:', error);
      process.exit(1);
    }
  }

  /**
   * ✅ Verify preview prerequisites
   */
  private async verifyPrerequisites(options: PreviewOptions): Promise<void> {
    console.info('\n✅ Verifying prerequisites...');

    // Check Git status
    try {
      const gitStatus = await $`git status --porcelain`.text();
      if (gitStatus.trim() && !options.dryRun) {
        console.info('  ⚠️ Warning: Uncommitted changes detected');
        console.info('  💡 Consider committing changes before creating preview');
      }
      console.info('  ✅ Git repository ready');
    } catch (error) {
      throw new Error('Git not available or not in a Git repository');
    }

    // Check Wrangler
    try {
      await $`wrangler --version`.quiet();
      console.info('  ✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install: npm install -g wrangler');
    }

    // Check Cloudflare auth
    try {
      await $`wrangler whoami`.quiet();
      console.info('  ✅ Cloudflare authentication verified');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
    }
  }

  /**
   * 🏗️ Build for preview
   */
  private async buildForPreview(options: PreviewOptions): Promise<void> {
    console.info('\n🏗️ Building for preview...');

    if (!options.dryRun) {
      const buildArgs = ['--env', 'development'];

      if (options.department) {
        buildArgs.push('--dept', options.department);
      }

      await $`bun run scripts/build-pages.ts ${buildArgs}`;
    }

    console.info('  ✅ Preview build completed');
  }

  /**
   * 🌿 Create preview branch
   */
  private async createPreviewBranch(branch: string, options: PreviewOptions): Promise<void> {
    console.info(`\n🌿 Creating preview branch: ${branch}`);

    if (!options.dryRun) {
      try {
        // Create and checkout new branch
        await $`git checkout -b ${branch}`;

        // Add built files
        await $`git add dist/pages/`;

        // Commit preview build
        const commitMessage = options.department
          ? `preview: ${options.department} department preview build`
          : 'preview: all departments preview build';

        await $`git commit -m "${commitMessage}\n\n🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"`;

        console.info(`  ✅ Branch ${branch} created and committed`);
      } catch (error) {
        console.error('  ❌ Failed to create preview branch:', error);
        throw error;
      }
    }
  }

  /**
   * 🚀 Deploy preview
   */
  private async deployPreview(branch: string, options: PreviewOptions): Promise<void> {
    console.info(`\n🚀 Deploying preview from branch: ${branch}`);

    if (!options.dryRun) {
      try {
        if (options.department) {
          // Deploy specific department preview
          const deptDistPath = join(this.distDir, options.department);

          const deployArgs = [
            'pages',
            'deploy',
            deptDistPath,
            '--project-name',
            'fire22-dashboard',
            '--env',
            options.department,
            '--branch',
            branch,
            '--compatibility-date',
            '2024-01-01',
          ];

          if (options.verbose) {
            deployArgs.push('--verbose');
          }

          await $`wrangler ${deployArgs}`;
          console.info(`  ✅ ${options.department} preview deployed`);
        } else {
          // Deploy main preview
          const mainDeployArgs = [
            'pages',
            'deploy',
            this.distDir,
            '--project-name',
            'fire22-dashboard',
            '--branch',
            branch,
            '--compatibility-date',
            '2024-01-01',
          ];

          if (options.verbose) {
            mainDeployArgs.push('--verbose');
          }

          await $`wrangler ${mainDeployArgs}`;
          console.info('  ✅ Main dashboard preview deployed');
        }
      } catch (error) {
        console.error('  ❌ Preview deployment failed:', error);
        throw error;
      }
    }
  }

  /**
   * 🔗 Show preview URLs
   */
  private showPreviewUrls(branch: string, options: PreviewOptions): void {
    console.info('\n🔗 Preview URLs:');
    console.info('!==!==!==');

    const basePreviewUrl = `https://${branch}.fire22-dashboard.pages.dev`;

    if (options.department) {
      const dept = this.getDepartment(options.department);
      console.info(`👁️ ${dept?.name} Preview: ${basePreviewUrl}/${options.department}/`);
    } else {
      console.info(`👁️ Main Preview: ${basePreviewUrl}`);

      const departments = this.getDepartments();
      departments.forEach(dept => {
        console.info(`🏢 ${dept.name} Preview: ${basePreviewUrl}/${dept.id}/`);
      });
    }

    console.info(`📡 RSS Feed Preview: ${basePreviewUrl}/feeds/error-codes-rss.xml`);
    console.info(`⚛️ Atom Feed Preview: ${basePreviewUrl}/feeds/error-codes-atom.xml`);

    console.info('\n💡 Preview Management:');
    console.info('!==!==!==!===');
    console.info(`🗑️ Delete preview: bun run preview:delete ${branch}`);
    console.info(`🔄 Update preview: bun run preview:update ${branch}`);
    console.info(`✅ Promote to production: bun run preview:promote ${branch}`);
  }

  /**
   * 🗑️ Delete preview
   */
  async deletePreview(branch: string, options: PreviewOptions = {}): Promise<void> {
    console.info(`\n🗑️ Deleting preview: ${branch}`);

    if (!options.dryRun) {
      try {
        // Switch back to main branch
        await $`git checkout main`;

        // Delete local branch
        await $`git branch -D ${branch}`;

        // Note: Cloudflare Pages previews are automatically cleaned up
        console.info(`  ✅ Preview branch ${branch} deleted`);
        console.info('  💡 Cloudflare Pages preview will be automatically cleaned up');
      } catch (error) {
        console.error('  ❌ Failed to delete preview:', error);
      }
    }
  }

  /**
   * 📊 List active previews
   */
  async listPreviews(): Promise<void> {
    console.info('\n📊 Active Preview Branches:');
    console.info('!==!==!==!==!===');

    try {
      const branches = await $`git branch --list "preview-*"`.text();
      const previewBranches = branches
        .split('\n')
        .map(b => b.trim().replace('* ', ''))
        .filter(b => b.startsWith('preview-') && b.length > 8);

      if (previewBranches.length === 0) {
        console.info('  📭 No active preview branches');
      } else {
        previewBranches.forEach((branch, index) => {
          const timestamp = branch.replace('preview-', '');
          const date = new Date(parseInt(timestamp));
          console.info(`  ${index + 1}. ${branch} (Created: ${date.toLocaleString()})`);
          console.info(`     🔗 https://${branch}.fire22-dashboard.pages.dev`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to list previews:', error);
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
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const [command, ...commandArgs] = args;

  const preview = new Fire22DepartmentPreview();

  switch (command) {
    case 'create': {
      const options: PreviewOptions = { dryRun: false, verbose: false };

      for (let i = 0; i < commandArgs.length; i++) {
        const arg = commandArgs[i];

        switch (arg) {
          case '--dept':
          case '--department':
            options.department = commandArgs[++i];
            break;
          case '--branch':
            options.branch = commandArgs[++i];
            break;
          case '--verbose':
            options.verbose = true;
            break;
          case '--dry-run':
            options.dryRun = true;
            break;
        }
      }

      await preview.createPreview(options);
      break;
    }

    case 'delete': {
      const branch = commandArgs[0];
      if (!branch) {
        console.error('❌ Branch name required for delete command');
        process.exit(1);
      }

      const dryRun = commandArgs.includes('--dry-run');
      await preview.deletePreview(branch, { dryRun });
      break;
    }

    case 'list':
      await preview.listPreviews();
      break;

    default:
      console.info(`
👁️ Fire22 Department Preview System

Usage:
  bun run scripts/preview-department.ts <command> [options]

Commands:
  create                  Create new preview deployment
  delete <branch>         Delete preview deployment
  list                   List active preview branches

Create Options:
  --dept, --department    Preview specific department only
  --branch               Custom branch name (default: preview-{timestamp})
  --verbose              Verbose logging
  --dry-run              Preview without executing

Examples:
  bun run scripts/preview-department.ts create
  bun run scripts/preview-department.ts create --dept finance --verbose
  bun run scripts/preview-department.ts create --branch feature-new-ui
  bun run scripts/preview-department.ts delete preview-1640995200000
  bun run scripts/preview-department.ts list

Department Self-Service Examples:
  bun run dept:preview finance
  bun run dept:preview technology --branch feature-test
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22DepartmentPreview };
