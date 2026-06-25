#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Development Workflow
 * Smooth development experience with Bun, secrets, and enterprise features
 */

import { $ } from 'bun';
import { existsSync, readFileSync } from 'fs';

// Load environment variables
function loadEnvironment() {
  const envFiles = ['.env.local', '.env', '.env.example'];

  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      console.info(`📄 Loading environment from ${envFile}`);
      // Environment variables are automatically loaded by Bun
      break;
    }
  }
}

// Check development environment
async function checkEnvironment() {
  console.info(`🔍 Checking development environment...`);

  const checks = [
    { name: 'Bun', command: 'bun --version', required: true },
    { name: 'Node.js', command: 'node --version', required: false },
    { name: 'Git', command: 'git --version', required: true },
    { name: 'GitHub CLI', command: 'gh --version', required: true },
  ];

  for (const check of checks) {
    try {
      const result =
        await $`${check.command.split(' ')[0]} ${check.command.split(' ').slice(1)}`.quiet();
      console.info(`✅ ${check.name}: ${result.stdout.toString().trim()}`);
    } catch (error) {
      const status = check.required ? '❌' : '⚠️';
      console.info(`${status} ${check.name}: Not found`);
      if (check.required) {
        console.info(`   💡 Install ${check.name} to continue`);
      }
    }
  }
}

// Setup development environment
async function setupDevelopment() {
  console.info(`🔧 Setting up development environment...`);

  // Create necessary directories
  await $`mkdir -p logs .cache .tmp backups test-results coverage`.quiet();

  // Setup Git hooks if not exists
  if (!existsSync('.git/hooks/pre-commit')) {
    await $`bun run scripts/dev-setup.bun.ts`.quiet();
  }

  // Load development configuration
  if (existsSync('.devrc')) {
    console.info(`📋 Development configuration loaded`);
  }

  console.info(`✅ Development environment ready`);
}

// Check repository status
async function checkRepository() {
  console.info(`📦 Checking repository status...`);

  try {
    const status = await $`git status --porcelain`.quiet();
    const changes = status.stdout
      .toString()
      .trim()
      .split('\n')
      .filter(line => line.length > 0);

    if (changes.length === 0) {
      console.info(`✅ Repository is clean`);
    } else {
      console.info(`📝 Repository has ${changes.length} uncommitted changes`);
      console.info(`   💡 Run 'git add .' and 'git commit -S' to commit changes`);
    }

    // Check remote status
    const remote = await $`git remote -v`.quiet();
    if (remote.stdout.toString().includes('brendadeeznuts1111')) {
      console.info(`✅ Connected to private repository`);
    } else {
      console.info(`⚠️  Repository remote may need updating`);
    }
  } catch (error) {
    console.info(`❌ Git repository check failed`);
  }
}

// Check Bun secrets
async function checkSecrets() {
  console.info(`🔐 Checking Bun secrets...`);

  if (existsSync('secrets.json')) {
    console.info(`✅ Secrets configuration file exists`);

    try {
      const secrets = JSON.parse(readFileSync('secrets.json', 'utf8'));
      const configuredSecrets = Object.keys(secrets).length - 1; // Subtract _comment
      console.info(`📋 ${configuredSecrets} secrets configured`);
    } catch (error) {
      console.info(`⚠️  Secrets file format error`);
    }
  } else {
    console.info(`⚠️  Secrets file not found`);
    console.info(`   💡 Run 'bun run secrets:setup' to create secrets`);
  }
}

// Quick development commands
async function showCommands() {
  console.info(`🚀 Available Development Commands:`);
  console.info(`══════════════════════════════════`);

  console.info(`📦 Package Management:`);
  console.info(`   bun install          # Install dependencies`);
  console.info(`   bun add <package>    # Add dependency`);
  console.info(`   bun remove <package> # Remove dependency`);
  console.info(`   bun update           # Update dependencies`);

  console.info(`\n🏗️  Development:`);
  console.info(`   bun run dev              # Start development server`);
  console.info(`   bun run test             # Run tests`);
  console.info(`   bun run lint             # Run linter`);
  console.info(`   bun run build            # Build project`);
  console.info(`   bun run workflow:dev     # Full development workflow`);
  console.info(`   bun run workflow:test    # Full testing workflow`);
  console.info(`   bun run workflow:build   # Full build workflow`);

  console.info(`\n🔧 Development Tools:`);
  console.info(`   bun run dev:setup        # Setup development environment`);
  console.info(`   bun run dev:clean        # Clean cache and logs`);
  console.info(`   bun run dev:reset        # Full reset and setup`);
  console.info(`   bun run dev:shell        # Load development shell`);
  console.info(`   bun run secrets:setup    # Setup secrets management`);

  console.info(`\n☁️  Enterprise Infrastructure:`);
  console.info(`   bun run enterprise:status # Check infrastructure status`);
  console.info(`   bun run enterprise:setup  # Deploy infrastructure`);
  console.info(`   bun run enterprise:verify # Verify infrastructure`);
  console.info(`   bun run cloudflare:status # Check Cloudflare status`);

  console.info(`\n🌐 DNS & Email:`);
  console.info(`   bun run dns:all          # Setup DNS and email`);
  console.info(`   bun run dns:check        # Verify DNS setup`);
  console.info(`   bun run dns:email        # Configure email routing`);

  console.info(`\n🐰 Bunx Commands:`);
  console.info(`   bunx <tool>             # Run tools without installation`);
  console.info(`   bunx prettier --help    # Code formatting`);
  console.info(`   bunx eslint --help      # Code linting`);
  console.info(`   bunx typescript --help  # TypeScript compiler`);

  console.info(`\n🔐 Secrets Management:`);
  console.info(`   bun secrets set KEY value    # Set secret`);
  console.info(`   bun secrets get KEY          # Get secret`);
  console.info(`   bun secrets list             # List secrets`);
}

// Main workflow function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  console.info(`🐰 Fantasy42-Fire22 Development Workflow`);
  console.info(`═════════════════════════════════════════\n`);

  switch (command) {
    case 'setup':
      await loadEnvironment();
      await setupDevelopment();
      console.info(`\n🎉 Development setup complete!`);
      console.info(`💡 Run 'bun run workflow:dev' to start developing`);
      break;

    case 'status':
      await loadEnvironment();
      await checkEnvironment();
      console.info('');
      await checkRepository();
      console.info('');
      await checkSecrets();
      console.info('');
      showCommands();
      break;

    case 'dev':
      await loadEnvironment();
      await setupDevelopment();
      console.info(`\n🚀 Starting development server...`);
      await $`bun run dev`;
      break;

    case 'test':
      await loadEnvironment();
      console.info(`🧪 Running tests...`);
      await $`bun run test`;
      break;

    case 'build':
      await loadEnvironment();
      console.info(`🏗️  Building project...`);
      await $`bun run build`;
      break;

    case 'clean':
      console.info(`🧹 Cleaning development environment...`);
      await $`bun run dev:clean`;
      console.info(`✅ Clean complete`);
      break;

    case 'help':
    default:
      console.info(`📚 Available commands:`);
      console.info(`   setup    - Setup development environment`);
      console.info(`   status   - Show development status and commands`);
      console.info(`   dev      - Start development server`);
      console.info(`   test     - Run tests`);
      console.info(`   build    - Build project`);
      console.info(`   clean    - Clean development environment`);
      console.info(`   help     - Show this help`);
      console.info(`\n💡 Example: bun run scripts/workflow.bun.ts setup`);
      break;
  }
}

// Run workflow
if (import.meta.main) {
  main().catch(console.error);
}
