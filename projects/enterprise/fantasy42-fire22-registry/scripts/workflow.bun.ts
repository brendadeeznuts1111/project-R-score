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
      console.log(`📄 Loading environment from ${envFile}`);
      // Environment variables are automatically loaded by Bun
      break;
    }
  }
}

// Check development environment
async function checkEnvironment() {
  console.log(`🔍 Checking development environment...`);

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
      console.log(`✅ ${check.name}: ${result.stdout.toString().trim()}`);
    } catch (error) {
      const status = check.required ? '❌' : '⚠️';
      console.log(`${status} ${check.name}: Not found`);
      if (check.required) {
        console.log(`   💡 Install ${check.name} to continue`);
      }
    }
  }
}

// Setup development environment
async function setupDevelopment() {
  console.log(`🔧 Setting up development environment...`);

  // Create necessary directories
  await $`mkdir -p logs .cache .tmp backups test-results coverage`.quiet();

  // Setup Git hooks if not exists
  if (!existsSync('.git/hooks/pre-commit')) {
    await $`bun run scripts/dev-setup.bun.ts`.quiet();
  }

  // Load development configuration
  if (existsSync('.devrc')) {
    console.log(`📋 Development configuration loaded`);
  }

  console.log(`✅ Development environment ready`);
}

// Check repository status
async function checkRepository() {
  console.log(`📦 Checking repository status...`);

  try {
    const status = await $`git status --porcelain`.quiet();
    const changes = status.stdout
      .toString()
      .trim()
      .split('\n')
      .filter(line => line.length > 0);

    if (changes.length === 0) {
      console.log(`✅ Repository is clean`);
    } else {
      console.log(`📝 Repository has ${changes.length} uncommitted changes`);
      console.log(`   💡 Run 'git add .' and 'git commit -S' to commit changes`);
    }

    // Check remote status
    const remote = await $`git remote -v`.quiet();
    if (remote.stdout.toString().includes('brendadeeznuts1111')) {
      console.log(`✅ Connected to private repository`);
    } else {
      console.log(`⚠️  Repository remote may need updating`);
    }
  } catch (error) {
    console.log(`❌ Git repository check failed`);
  }
}

// Check Bun secrets
async function checkSecrets() {
  console.log(`🔐 Checking Bun secrets...`);

  if (existsSync('secrets.json')) {
    console.log(`✅ Secrets configuration file exists`);

    try {
      const secrets = JSON.parse(readFileSync('secrets.json', 'utf8'));
      const configuredSecrets = Object.keys(secrets).length - 1; // Subtract _comment
      console.log(`📋 ${configuredSecrets} secrets configured`);
    } catch (error) {
      console.log(`⚠️  Secrets file format error`);
    }
  } else {
    console.log(`⚠️  Secrets file not found`);
    console.log(`   💡 Run 'bun run secrets:setup' to create secrets`);
  }
}

// Quick development commands
async function showCommands() {
  console.log(`🚀 Available Development Commands:`);
  console.log(`══════════════════════════════════`);

  console.log(`📦 Package Management:`);
  console.log(`   bun install          # Install dependencies`);
  console.log(`   bun add <package>    # Add dependency`);
  console.log(`   bun remove <package> # Remove dependency`);
  console.log(`   bun update           # Update dependencies`);

  console.log(`\n🏗️  Development:`);
  console.log(`   bun run dev              # Start development server`);
  console.log(`   bun run test             # Run tests`);
  console.log(`   bun run lint             # Run linter`);
  console.log(`   bun run build            # Build project`);
  console.log(`   bun run workflow:dev     # Full development workflow`);
  console.log(`   bun run workflow:test    # Full testing workflow`);
  console.log(`   bun run workflow:build   # Full build workflow`);

  console.log(`\n🔧 Development Tools:`);
  console.log(`   bun run dev:setup        # Setup development environment`);
  console.log(`   bun run dev:clean        # Clean cache and logs`);
  console.log(`   bun run dev:reset        # Full reset and setup`);
  console.log(`   bun run dev:shell        # Load development shell`);
  console.log(`   bun run secrets:setup    # Setup secrets management`);

  console.log(`\n☁️  Enterprise Infrastructure:`);
  console.log(`   bun run enterprise:status # Check infrastructure status`);
  console.log(`   bun run enterprise:setup  # Deploy infrastructure`);
  console.log(`   bun run enterprise:verify # Verify infrastructure`);
  console.log(`   bun run cloudflare:status # Check Cloudflare status`);

  console.log(`\n🌐 DNS & Email:`);
  console.log(`   bun run dns:all          # Setup DNS and email`);
  console.log(`   bun run dns:check        # Verify DNS setup`);
  console.log(`   bun run dns:email        # Configure email routing`);

  console.log(`\n🐰 Bunx Commands:`);
  console.log(`   bunx <tool>             # Run tools without installation`);
  console.log(`   bunx prettier --help    # Code formatting`);
  console.log(`   bunx eslint --help      # Code linting`);
  console.log(`   bunx typescript --help  # TypeScript compiler`);

  console.log(`\n🔐 Secrets Management:`);
  console.log(`   bun secrets set KEY value    # Set secret`);
  console.log(`   bun secrets get KEY          # Get secret`);
  console.log(`   bun secrets list             # List secrets`);
}

// Main workflow function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  console.log(`🐰 Fantasy42-Fire22 Development Workflow`);
  console.log(`═════════════════════════════════════════\n`);

  switch (command) {
    case 'setup':
      await loadEnvironment();
      await setupDevelopment();
      console.log(`\n🎉 Development setup complete!`);
      console.log(`💡 Run 'bun run workflow:dev' to start developing`);
      break;

    case 'status':
      await loadEnvironment();
      await checkEnvironment();
      console.log('');
      await checkRepository();
      console.log('');
      await checkSecrets();
      console.log('');
      showCommands();
      break;

    case 'dev':
      await loadEnvironment();
      await setupDevelopment();
      console.log(`\n🚀 Starting development server...`);
      await $`bun run dev`;
      break;

    case 'test':
      await loadEnvironment();
      console.log(`🧪 Running tests...`);
      await $`bun run test`;
      break;

    case 'build':
      await loadEnvironment();
      console.log(`🏗️  Building project...`);
      await $`bun run build`;
      break;

    case 'clean':
      console.log(`🧹 Cleaning development environment...`);
      await $`bun run dev:clean`;
      console.log(`✅ Clean complete`);
      break;

    case 'help':
    default:
      console.log(`📚 Available commands:`);
      console.log(`   setup    - Setup development environment`);
      console.log(`   status   - Show development status and commands`);
      console.log(`   dev      - Start development server`);
      console.log(`   test     - Run tests`);
      console.log(`   build    - Build project`);
      console.log(`   clean    - Clean development environment`);
      console.log(`   help     - Show this help`);
      console.log(`\n💡 Example: bun run scripts/workflow.bun.ts setup`);
      break;
  }
}

// Run workflow
if (import.meta.main) {
  main().catch(console.error);
}
