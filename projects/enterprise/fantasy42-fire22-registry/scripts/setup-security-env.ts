#!/usr/bin/env bun

// Fantasy42-Fire22 Security Environment Setup
// Sets up secure environment variables for development (NOT for production secrets)

import * as fs from 'fs';
import * as path from 'path';

// Security configuration
const SECURITY_CONFIG = {
  // GitHub configuration
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || 'your_github_token_here',
  GITHUB_USERNAME: process.env.GITHUB_USERNAME || 'your_github_username',

  // Registry tokens (use environment variables in production)
  NPM_TOKEN: process.env.NPM_TOKEN || 'your_npm_token_here',
  REGISTRY_TOKEN: process.env.REGISTRY_TOKEN || 'your_private_registry_token',

  // Snyk configuration
  SNYK_TOKEN: process.env.SNYK_TOKEN || 'your_snyk_token_here',

  // Environment settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  BUN_ENV: process.env.BUN_ENV || 'development',

  // Security settings
  AUDIT_LEVEL: process.env.AUDIT_LEVEL || 'moderate',
  FAIL_ON_VULNERABILITIES: process.env.FAIL_ON_VULNERABILITIES || 'false',
};

async function setupEnvironmentFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
  try {
    await Bun.file(envPath).exists();
    console.info('✅ .env.local already exists. Skipping creation.');
    console.info('⚠️  IMPORTANT: Never commit .env.local to version control!');
    return;
  } catch (error) {
    // File doesn't exist, continue with creation
  }

  // Create .env.local content
  const envContent = `# Fantasy42-Fire22 Development Environment
# ⚠️  WARNING: This file contains sensitive information!
# 🚫 NEVER commit this file to version control!
# 🔒 Use proper secret management in production!

# GitHub Configuration
GITHUB_TOKEN=${SECURITY_CONFIG.GITHUB_TOKEN}
GITHUB_USERNAME=${SECURITY_CONFIG.GITHUB_USERNAME}

# Registry Configuration
NPM_TOKEN=${SECURITY_CONFIG.NPM_TOKEN}
REGISTRY_TOKEN=${SECURITY_CONFIG.REGISTRY_TOKEN}

# Security Tools
SNYK_TOKEN=${SECURITY_CONFIG.SNYK_TOKEN}

# Environment Settings
NODE_ENV=${SECURITY_CONFIG.NODE_ENV}
BUN_ENV=${SECURITY_CONFIG.BUN_ENV}

# Security Configuration
AUDIT_LEVEL=${SECURITY_CONFIG.AUDIT_LEVEL}
FAIL_ON_VULNERABILITIES=${SECURITY_CONFIG.FAIL_ON_VULNERABILITIES}

# Additional security settings
BUN_AUDIT_LEVEL=moderate
BUN_AUDIT_PRODUCTION=true
`.trim();

  try {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    await Bun.write(envPath, envContent);
    console.info('✅ Created .env.local for development environment setup');
    console.info('🔐 Environment variables configured for security tools');
    console.info('');
    console.info('🚨 SECURITY REMINDERS:');
    console.info('   • Add .env.local to .gitignore');
    console.info('   • Use environment variables in CI/CD pipelines');
    console.info('   • Never commit sensitive tokens to version control');
    console.info('   • Rotate tokens regularly');
    console.info('');
    console.info('🔧 Next steps:');
    console.info('   • Run: bun run security:setup');
    console.info('   • Run: bun run security:audit');
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error);
    process.exit(1);
  }
}

async function validateGitIgnore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
  try {
    await Bun.file(gitignorePath).exists();
  } catch (error) {
    console.info('⚠️  No .gitignore file found. Creating one...');
    const gitignoreContent = `# Dependencies
node_modules/
bun.lockb

# Environment files
.env
.env.local
.env.*.local

# Security reports
security-reports/
audit-reports/
license-reports/

# Build outputs
dist/
build/
.next/

# Logs
*.log
logs/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Security and audit files
.snyk
.auditrc.json
.licenserc.json
security-reports/
audit-reports/
license-reports/
`.trim();

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    await Bun.write(gitignorePath, gitignoreContent);
    console.info('✅ Created .gitignore with security exclusions');
  }

  // Check if .env.local is in .gitignore
  // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
  const gitignoreContent = await Bun.file(gitignorePath).text();
  if (!gitignoreContent.includes('.env.local') && !gitignoreContent.includes('.env')) {
    console.info('⚠️  Adding environment files to .gitignore...');
    const updatedGitignore =
      gitignoreContent + '\n\n# Environment files\n.env\n.env.local\n.env.*.local\n';
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    await Bun.write(gitignorePath, updatedGitignore);
    console.info('✅ Added environment files to .gitignore');
  } else {
    console.info('✅ Environment files already excluded in .gitignore');
  }
}

async function main() {
  console.info('🔐 Fantasy42-Fire22 Security Environment Setup');
  console.info('==============================================');

  await validateGitIgnore();
  await setupEnvironmentFile();

  console.info('');
  console.info('🎉 Security environment setup complete!');
  console.info('');
  console.info('📋 Next steps:');
  console.info('   1. Review and update tokens in .env.local');
  console.info('   2. Run: bun run security:install-tools');
  console.info('   3. Run: bun run security:audit');
  console.info('   4. Run: bun run security:check-licenses');
}

// Run the setup
if (import.meta.main) {
  main().catch(console.error);
}
