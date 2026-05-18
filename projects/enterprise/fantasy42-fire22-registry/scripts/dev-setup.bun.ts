#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Development Setup
 * Smooth development workflow configuration
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Setup directories
function setupDirectories() {
  const dirs = ['./logs', './.cache', './.tmp', './backups', './test-results', './coverage'];

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.info(`📁 Created directory: ${dir}`);
    }
  });
}

// Setup environment variables
function setupEnvironment() {
  const envPath = './.env.local';

  if (!existsSync(envPath)) {
    const templatePath = './.env.example';
    if (existsSync(templatePath)) {
      const template = readFileSync(templatePath, 'utf8');
      writeFileSync(envPath, template);
      console.info(`📄 Created .env.local from template`);
    }
  }

  // Load environment variables
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0]);

    console.info(`🔧 Loaded ${envVars.length} environment variables`);
  }
}

// Setup Bun configuration
async function setupBunConfig() {
  console.info(`🔧 Setting up Bun configuration...`);

  // Create .bunfig.toml if it doesn't exist
  if (!existsSync('./.bunfig.local.toml')) {
    const localConfig = `# Local Bun Configuration
# Overrides for development environment

[run]
# Development settings
silent = false

[install]
# Development package management
frozenLockfile = false
dev = true

[test]
# Local testing configuration
timeout = 10000
parallel = true
coverage = true
`;
    writeFileSync('./.bunfig.local.toml', localConfig);
    console.info(`📄 Created .bunfig.local.toml`);
  }
}

// Setup Git hooks
async function setupGitHooks() {
  const hooksDir = './.git/hooks';
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  // Pre-commit hook for linting
  const preCommitHook = `#!/bin/sh
# Fantasy42-Fire22 Pre-commit Hook
echo "🔍 Running pre-commit checks..."

# Run linting if available
if command -v bun >/dev/null 2>&1; then
  echo "Running linter..."
  bun run lint 2>/dev/null || echo "⚠️  Linting failed, but continuing commit"
fi

echo "✅ Pre-commit checks complete"
`;

  writeFileSync('./.git/hooks/pre-commit', preCommitHook);
  await $`chmod +x ./.git/hooks/pre-commit`;

  console.info(`🔗 Setup Git pre-commit hook`);
}

// Setup development aliases
function setupAliases() {
  const shellRc = process.env.SHELL?.includes('zsh') ? '~/.zshrc' : '~/.bashrc';
  const aliases = `
# Fantasy42-Fire22 Development Aliases
alias ff-dev='cd /Users/nolarose/ff && bun run dev'
alias ff-test='cd /Users/nolarose/ff && bun run test'
alias ff-lint='cd /Users/nolarose/ff && bun run lint'
alias ff-build='cd /Users/nolarose/ff && bun run build'
alias ff-status='cd /Users/nolarose/ff && bun run enterprise:status'
alias ff-deploy='cd /Users/nolarose/ff && bun run enterprise:setup'
alias ff-clean='cd /Users/nolarose/ff && rm -rf .cache .tmp logs/*.log'
`;

  console.info(`💡 Development aliases available:`);
  console.info(`   ff-dev     - Start development server`);
  console.info(`   ff-test    - Run tests`);
  console.info(`   ff-lint    - Run linter`);
  console.info(`   ff-build   - Build project`);
  console.info(`   ff-status  - Check enterprise status`);
  console.info(`   ff-deploy  - Deploy infrastructure`);
  console.info(`   ff-clean   - Clean cache and logs`);

  console.info(`\n📝 To add these aliases, run:`);
  console.info(`   echo '${aliases}' >> ${shellRc}`);
  console.info(`   source ${shellRc}`);
}

// Setup VS Code configuration
function setupVSCode() {
  const vscodeDir = './.vscode';
  if (!existsSync(vscodeDir)) {
    mkdirSync(vscodeDir, { recursive: true });
  }

  // Settings
  const settings = {
    'bun.runtime': 'bun',
    'bun.packageManager': 'bun',
    'typescript.preferences.importModuleSpecifier': 'relative',
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'oven.bun-vscode',
    'files.associations': {
      '*.bun.ts': 'typescript',
      '*.bun.tsx': 'typescriptreact',
      '*.bun.js': 'javascript',
      '*.fire22': 'typescript',
    },
    'emmet.includeLanguages': {
      typescript: 'html',
      javascript: 'html',
    },
    'git.autofetch': true,
    'git.enableSmartCommit': true,
    'terminal.integrated.shell.osx': '/bin/zsh',
  };

  writeFileSync('./.vscode/settings.json', JSON.stringify(settings, null, 2));

  // Launch configuration
  const launch = {
    version: '0.2.0',
    configurations: [
      {
        name: 'Bun: Debug',
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'bun',
        program: '${workspaceFolder}/src/index.ts',
        console: 'integratedTerminal',
        internalConsoleOptions: 'openOnSessionStart',
      },
      {
        name: 'Bun: Test Current File',
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'bun',
        program: '${workspaceFolder}/node_modules/.bin/bun-test',
        args: ['${file}'],
        console: 'integratedTerminal',
      },
    ],
  };

  writeFileSync('./.vscode/launch.json', JSON.stringify(launch, null, 2));

  console.info(`🔧 Setup VS Code configuration`);
}

// Setup Bun secrets
async function setupBunSecrets() {
  console.info(`🔐 Setting up Bun secrets...`);

  try {
    // Check if secrets file exists
    if (!existsSync('./secrets.json')) {
      const secrets = {
        _comment: 'Fantasy42-Fire22 Secrets Configuration',
        database: {
          encryption_key: process.env.DB_ENCRYPTION_KEY || 'dev-key-change-in-production',
        },
        cache: {
          encryption_key: process.env.CACHE_ENCRYPTION_KEY || 'dev-cache-key-change-in-production',
        },
        jwt: {
          secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
        },
        github: {
          token: process.env.GITHUB_TOKEN || '',
        },
        npm: {
          token: process.env.NPM_TOKEN || '',
        },
      };

      writeFileSync('./secrets.json', JSON.stringify(secrets, null, 2));
      console.info(`🔑 Created secrets.json template`);
    }

    // Set up Bun secrets
    await $`bun secrets set DATABASE_KEY "$(cat secrets.json | jq -r '.database.encryption_key')"`.quiet();
    await $`bun secrets set CACHE_KEY "$(cat secrets.json | jq -r '.cache.encryption_key')"`.quiet();
    await $`bun secrets set JWT_SECRET "$(cat secrets.json | jq -r '.jwt.secret')"`.quiet();

    console.info(`✅ Bun secrets configured`);
  } catch (error) {
    console.info(`⚠️  Bun secrets setup skipped (secrets may not be available)`);
  }
}

// Main setup function
async function main() {
  console.info(`🚀 Fantasy42-Fire22 Development Setup`);
  console.info(`═══════════════════════════════════════\n`);

  console.info(`📁 Setting up directories...`);
  setupDirectories();

  console.info(`\n⚙️  Setting up environment...`);
  setupEnvironment();

  console.info(`\n🔧 Configuring Bun...`);
  await setupBunConfig();

  console.info(`\n🔗 Setting up Git hooks...`);
  await setupGitHooks();

  console.info(`\n💡 Development aliases:`);
  setupAliases();

  console.info(`\n🔧 Setting up VS Code...`);
  setupVSCode();

  console.info(`\n🔐 Setting up Bun secrets...`);
  await setupBunSecrets();

  console.info(`\n🎉 Development setup complete!`);
  console.info(`════════════════════════════════`);

  console.info(`\n✅ What's configured:`);
  console.info(`   📁 Project directories`);
  console.info(`   ⚙️  Environment variables`);
  console.info(`   🔧 Bun configuration`);
  console.info(`   🔗 Git hooks`);
  console.info(`   💡 Development aliases`);
  console.info(`   🔧 VS Code integration`);
  console.info(`   🔐 Bun secrets`);

  console.info(`\n🚀 Quick start commands:`);
  console.info(`   bun run dev              # Start development server`);
  console.info(`   bun run test             # Run tests`);
  console.info(`   bun run enterprise:status # Check status`);
  console.info(`   bun run enterprise:setup  # Deploy infrastructure`);

  console.info(`\n📚 Documentation:`);
  console.info(`   CLOUDFLARE-SETUP-GUIDE.md`);
  console.info(`   SECURITY-README.md`);
  console.info(`   README.md`);
}

// Run setup
if (import.meta.main) {
  main().catch(console.error);
}
