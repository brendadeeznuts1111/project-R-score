#!/usr/bin/env bun

/**
 * 🚀 Fire22 Distribution Builder
 *
 * Creates optimized distributions for different deployment scenarios
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DistributionOptions {
  type: 'executable' | 'package' | 'docker' | 'workspace';
  platform?: 'darwin' | 'linux' | 'windows';
  minify?: boolean;
}

export class DistributionBuilder {
  private readonly distDir = join(process.cwd(), 'dist');

  /**
   * Build executable distribution
   */
  async buildExecutable(platform?: string): Promise<void> {
    console.info('🔨 Building Executable Distribution');
    console.info('='.repeat(50));

    const platforms = platform ? [platform] : ['darwin', 'linux', 'windows'];

    for (const plt of platforms) {
      const outfile =
        plt === 'windows'
          ? `${this.distDir}/fire22-dashboard.exe`
          : `${this.distDir}/fire22-dashboard-${plt}`;

      console.info(`\n📦 Building for ${plt}...`);

      try {
        await $`bun build ./src/index.ts --compile --target=bun-${plt} --outfile=${outfile}`;

        const stats = await Bun.file(outfile).size();
        const sizeMB = (stats / 1024 / 1024).toFixed(2);
        console.info(`   ✅ Success: ${sizeMB}MB`);
      } catch (error) {
        console.info(`   ❌ Failed: ${error}`);
      }
    }
  }

  /**
   * Build workspace packages
   */
  async buildWorkspacePackages(): Promise<void> {
    console.info('📦 Building Workspace Packages');
    console.info('='.repeat(50));

    const packages = [
      { name: '@fire22/core', path: 'packages/core' },
      { name: '@fire22/api-client', path: 'packages/api-client' },
      { name: '@fire22/cli', path: 'packages/cli' },
    ];

    for (const pkg of packages) {
      if (!existsSync(pkg.path)) {
        console.info(`\n⏭️  Skipping ${pkg.name} (not found)`);
        continue;
      }

      console.info(`\n🏗️  Building ${pkg.name}...`);
      process.chdir(pkg.path);

      try {
        // Build the package
        await $`bun run build`;

        // Pack it
        const tarball = await $`bun pm pack --quiet`.text();
        console.info(`   ✅ Created: ${tarball.trim()}`);
      } catch (error) {
        console.info(`   ❌ Failed to build`);
      }
    }

    process.chdir(join(this.distDir, '..'));
  }

  /**
   * Create minimal npm package
   */
  async createMinimalPackage(): Promise<void> {
    console.info('📦 Creating Minimal NPM Package');
    console.info('='.repeat(50));

    // Build optimized bundle
    console.info('\n🏗️  Building optimized bundle...');
    await $`bun build ./src/index.ts --target=node --outdir=${this.distDir}/npm --minify --splitting --format=esm`;

    // Create minimal package.json
    const minimalPackage = {
      name: 'fire22-dashboard',
      version: '3.0.8',
      description: 'Fire22 Dashboard Worker',
      main: 'index.js',
      type: 'module',
      bin: {
        fire22: './cli.js',
      },
      dependencies: {
        // Only production dependencies
      },
      engines: {
        node: '>=18.0.0',
        bun: '>=1.0.0',
      },
    };

    await Bun.write(
      join(this.distDir, 'npm', 'package.json'),
      JSON.stringify(minimalPackage, null, 2)
    );

    // Pack it
    process.chdir(join(this.distDir, 'npm'));
    const tarball = await $`bun pm pack --quiet`.text();
    console.info(`\n✅ Minimal package: ${tarball.trim()}`);

    // Get size
    const stats = await Bun.file(tarball.trim()).size;
    const sizeKB = (stats / 1024).toFixed(2);
    console.info(`   Size: ${sizeKB}KB`);
  }

  /**
   * Create Docker distribution
   */
  async createDockerImage(): Promise<void> {
    console.info('🐳 Creating Docker Distribution');
    console.info('='.repeat(50));

    const dockerfile = `FROM oven/bun:1-alpine

WORKDIR /app

# Copy only necessary files
COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY dist ./dist

# Use compiled executable for production
CMD ["./dist/fire22-dashboard"]

# Alternative: Use Bun runtime
# CMD ["bun", "run", "start"]`;

    await Bun.write(join(this.distDir, 'Dockerfile'), dockerfile);

    console.info('📝 Dockerfile created');
    console.info('\nTo build: docker build -t fire22/dashboard .');
    console.info('To run: docker run -p 3000:3000 fire22/dashboard');
  }

  /**
   * Show distribution summary
   */
  async showSummary(): Promise<void> {
    console.info('\n📊 Distribution Summary');
    console.info('='.repeat(50));

    const distributions = [
      { type: 'Executable', path: 'dist/fire22-dashboard', desc: 'Standalone binary' },
      { type: 'NPM Package', path: 'dist/npm/*.tgz', desc: 'Minimal npm package' },
      { type: 'Workspace', path: 'packages/*/dist', desc: 'Modular packages' },
      { type: 'Docker', path: 'dist/Dockerfile', desc: 'Container image' },
    ];

    for (const dist of distributions) {
      console.info(`\n${dist.type}:`);
      console.info(`   Path: ${dist.path}`);
      console.info(`   Description: ${dist.desc}`);
    }

    console.info('\n📦 Usage Examples:');
    console.info('   Executable: ./dist/fire22-dashboard');
    console.info('   Package: npm install fire22-dashboard-3.0.8.tgz');
    console.info('   Workspace: npm install @fire22/core');
    console.info('   Docker: docker run fire22/dashboard');
  }
}

// CLI Interface
if (import.meta.main) {
  const builder = new DistributionBuilder();
  const [command] = process.argv.slice(2);

  try {
    switch (command) {
      case 'executable':
        await builder.buildExecutable();
        break;

      case 'workspace':
        await builder.buildWorkspacePackages();
        break;

      case 'minimal':
        await builder.createMinimalPackage();
        break;

      case 'docker':
        await builder.createDockerImage();
        break;

      case 'all':
        await builder.buildExecutable();
        await builder.buildWorkspacePackages();
        await builder.createMinimalPackage();
        await builder.createDockerImage();
        await builder.showSummary();
        break;

      default:
        console.info(`
🚀 Fire22 Distribution Builder
!==!==!==!==!=====

Commands:
  executable    Build standalone executables
  workspace     Build workspace packages
  minimal       Create minimal npm package
  docker        Create Docker distribution
  all           Build all distributions

Examples:
  bun run scripts/distribute.ts executable
  bun run scripts/distribute.ts minimal
  bun run scripts/distribute.ts all
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default DistributionBuilder;
