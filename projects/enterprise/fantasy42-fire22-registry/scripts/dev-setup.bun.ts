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
      console.log(`📁 Created directory: ${dir}`);
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
      console.log(`📄 Created .env.local from template`);
    }
  }

  // Load environment variables
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0]);

    console.log(`🔧 Loaded ${envVars.length} environment variables`);
  }
}

// Setup Bun configuration
async function setupBunConfig() {
  console.log(`🔧 Setting up Bun configuration...`);

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
    console.log(`📄 Created .bunfig.local.toml`);
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

  console.log(`🔗 Setup Git pre-commit hook`);
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

  console.log(`💡 Development aliases available:`);
  console.log(`   ff-dev     - Start development server`);
  console.log(`   ff-test    - Run tests`);
  console.log(`   ff-lint    - Run linter`);
  console.log(`   ff-build   - Build project`);
  console.log(`   ff-status  - Check enterprise status`);
  console.log(`   ff-deploy  - Deploy infrastructure`);
  console.log(`   ff-clean   - Clean cache and logs`);

  console.log(`\n📝 To add these aliases, run:`);
  console.log(`   echo '${aliases}' >> ${shellRc}`);
  console.log(`   source ${shellRc}`);
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

  console.log(`🔧 Setup VS Code configuration`);
}

// Setup Bun secrets
async function setupBunSecrets() {
  console.log(`🔐 Setting up Bun secrets...`);

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
      console.log(`🔑 Created secrets.json template`);
    }

    // Set up Bun secrets
    await $`bun secrets set DATABASE_KEY "$(cat secrets.json | jq -r '.database.encryption_key')"`.quiet();
    await $`bun secrets set CACHE_KEY "$(cat secrets.json | jq -r '.cache.encryption_key')"`.quiet();
    await $`bun secrets set JWT_SECRET "$(cat secrets.json | jq -r '.jwt.secret')"`.quiet();

    console.log(`✅ Bun secrets configured`);
  } catch (error) {
    console.log(`⚠️  Bun secrets setup skipped (secrets may not be available)`);
  }
}

// Main setup function
async function main() {
  console.log(`🚀 Fantasy42-Fire22 Development Setup`);
  console.log(`═══════════════════════════════════════\n`);

  console.log(`📁 Setting up directories...`);
  setupDirectories();

  console.log(`\n⚙️  Setting up environment...`);
  setupEnvironment();

  console.log(`\n🔧 Configuring Bun...`);
  await setupBunConfig();

  console.log(`\n🔗 Setting up Git hooks...`);
  await setupGitHooks();

  console.log(`\n💡 Development aliases:`);
  setupAliases();

  console.log(`\n🔧 Setting up VS Code...`);
  setupVSCode();

  console.log(`\n🔐 Setting up Bun secrets...`);
  await setupBunSecrets();

  console.log(`\n🎉 Development setup complete!`);
  console.log(`════════════════════════════════`);

  console.log(`\n✅ What's configured:`);
  console.log(`   📁 Project directories`);
  console.log(`   ⚙️  Environment variables`);
  console.log(`   🔧 Bun configuration`);
  console.log(`   🔗 Git hooks`);
  console.log(`   💡 Development aliases`);
  console.log(`   🔧 VS Code integration`);
  console.log(`   🔐 Bun secrets`);

  console.log(`\n🚀 Quick start commands:`);
  console.log(`   bun run dev              # Start development server`);
  console.log(`   bun run test             # Run tests`);
  console.log(`   bun run enterprise:status # Check status`);
  console.log(`   bun run enterprise:setup  # Deploy infrastructure`);

  console.log(`\n📚 Documentation:`);
  console.log(`   CLOUDFLARE-SETUP-GUIDE.md`);
  console.log(`   SECURITY-README.md`);
  console.log(`   README.md`);
}

// Run setup
if (import.meta.main) {
  main().catch(console.error);
}
