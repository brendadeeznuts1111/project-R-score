#!/usr/bin/env bun

/**
 * Fire22 Dashboard Worker - Build Launcher
 *
 * Simple interface for different build profiles
 */

import { getBuildProfile, listBuildProfiles } from './build.config.ts';
import { BuildAutomation } from './scripts/build-automation.ts';
import CloudflareBuildSystem from './scripts/build-cloudflare.ts';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'help':
      showHelp();
      break;

    case 'list':
      listProfiles();
      break;

    case 'quick':
      await runBuild('quick');
      break;

    case 'standard':
      await runBuild('standard');
      break;

    case 'production':
      await runBuild('production');
      break;

    case 'full':
      await runBuild('full');
      break;

    case 'packages':
      await runBuild('packages-only');
      break;

    case 'docs':
      await runBuild('docs-only');
      break;

    case 'version':
      await runBuild('version-only');
      break;

    case 'cloudflare':
      await runCloudflare(args.slice(1));
      break;

    default:
      if (command.startsWith('--')) {
        // Handle flags like --production, --quick, etc.
        const profileName = command.slice(2);
        await runBuild(profileName);
      } else {
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
      }
  }
}

function showHelp() {
  console.log(`
🔥 Fire22 Build System

Usage: bun run build [command]

Commands:
  quick       - Fast build with packages only
  standard    - Standard build with docs and metadata
  production  - Production build with full optimization
  full        - Complete build with all features
  packages    - Build only modular packages
  docs        - Generate documentation only
  version     - Update version only
  cloudflare  - Build and deploy to Cloudflare Workers
  list        - List all available profiles
  help        - Show this help message

Examples:
  bun run build quick           # Quick build
  bun run build production      # Production build
  bun run build --production    # Alternative syntax
  bun run build --quick         # Quick build

Profiles:
  ${listBuildProfiles()
    .map(p => `  ${p}`)
    .join('\n  ')}

For more information, see docs/BUILD-SYSTEM.md
`);
}

function listProfiles() {
  console.log('\n📋 Available Build Profiles:\n');

  const profiles = listBuildProfiles();
  for (const profileName of profiles) {
    const profile = getBuildProfile(profileName);
    console.log(`🔧 ${profileName.toUpperCase()}`);
    console.log(`   ${profile.description}`);
    console.log(`   Version: ${profile.version.autoIncrement ? 'Auto-increment' : 'Manual'}`);
    console.log(`   Docs: ${profile.documentation.generate ? 'Generate' : 'Skip'}`);
    console.log(`   Quality: ${profile.quality.test ? 'Full' : 'Minimal'}`);
    console.log(`   Optimization: ${profile.optimization.minify ? 'Full' : 'Basic'}`);
    console.log('');
  }
}

async function runBuild(profileName: string) {
  try {
    const profile = getBuildProfile(profileName);

    console.log(`🚀 Starting ${profile.name} build...`);
    console.log(`📝 ${profile.description}\n`);

    // Convert profile to build config
    const buildConfig = {
      version: profile.version,
      documentation: profile.documentation,
      dependencies: profile.dependencies,
      metadata: profile.metadata,
      packaging: profile.packaging,
      quality: profile.quality,
    };

    const automation = new BuildAutomation(buildConfig);
    const result = await automation.run();

    if (result.success) {
      console.log(`\n🎉 ${profile.name} build completed successfully!`);
      console.log(`📊 Version: ${result.version}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
    } else {
      console.error(`\n❌ ${profile.name} build failed!`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n💥 Build failed:`, error);
    process.exit(1);
  }
}

async function runCloudflare(args: string[]) {
  const cloudflare = new CloudflareBuildSystem();
  const subcommand = args[0] || 'pipeline';

  console.log('☁️  Cloudflare Build & Deploy');
  console.log('='.repeat(50));

  try {
    switch (subcommand) {
      case 'build':
        await cloudflare.buildWorker({
          minify: args.includes('--minify'),
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
        });
        break;

      case 'deploy':
        await cloudflare.deploy({
          dryRun: args.includes('--dry-run'),
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
        });
        break;

      case 'local':
        const port = args.find(a => a.startsWith('--port='))?.split('=')[1];
        await cloudflare.runLocal(port ? parseInt(port) : 8787);
        break;

      case 'verify':
        await cloudflare.verifyDeployment();
        break;

      case 'info':
        await cloudflare.showInfo();
        break;

      case 'pipeline':
      default:
        // Run the standard build first
        await runBuild('cloudflare');

        // Then deploy to Cloudflare
        await cloudflare.pipeline({
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
          minify: args.includes('--minify'),
        });
        break;
    }

    console.log('\n✅ Cloudflare operation completed!');
  } catch (error) {
    console.error('\n❌ Cloudflare operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Build launcher failed:', error);
    process.exit(1);
  });
}

export { main, showHelp, listProfiles, runBuild, runCloudflare };
