#!/usr/bin/env bun
/**
 * Setup Verification Script
 * Verifies that the Crystal Clear Architecture environment is properly configured
 */

import { existsSync } from 'fs';
import { secrets } from 'bun';

console.info('🔍 Crystal Clear Architecture - Setup Verification');
console.info('='.repeat(60));

// ============================================================================
// 1. ENVIRONMENT CHECKS
// ============================================================================
console.info('\n🌍 Environment Checks:');
console.info('-'.repeat(30));

const checks = [
  {
    name: 'Bun Runtime',
    check: () => typeof Bun !== 'undefined',
    message: 'Bun runtime is available',
  },
  {
    name: 'Node.js Environment',
    check: () => process.env.NODE_ENV,
    message: `Environment: ${process.env.NODE_ENV || 'undefined'}`,
  },
  {
    name: 'Fire22 Environment',
    check: () => process.env.FIRE22_ENV,
    message: `Fire22 Environment: ${process.env.FIRE22_ENV || 'undefined'}`,
  },
  {
    name: 'TypeScript Support',
    check: () => true, // If this script runs, TypeScript works
    message: 'TypeScript compilation successful',
  },
];

for (const check of checks) {
  try {
    const result = check.check();
    const status = result ? '✅' : '❌';
    console.info(`${status} ${check.name}: ${check.message}`);
  } catch (error) {
    console.info(`❌ ${check.name}: Error - ${error.message}`);
  }
}

// ============================================================================
// 2. FILE SYSTEM CHECKS
// ============================================================================
console.info('\n📁 File System Checks:');
console.info('-'.repeat(30));

const files = [
  'package.json',
  'bunfig.toml',
  'tsconfig.json',
  '.env',
  '.env.local',
  'src/',
  'scripts/',
  'tests/',
];

for (const file of files) {
  const exists = existsSync(file);
  const status = exists ? '✅' : '❌';
  const type = file.endsWith('/') ? 'directory' : 'file';
  console.info(`${status} ${file}: ${type} ${exists ? 'exists' : 'missing'}`);
}

// ============================================================================
// 3. DEPENDENCY CHECKS
// ============================================================================
console.info('\n📦 Dependency Checks:');
console.info('-'.repeat(30));

const dependencies = [
  { name: '@types/bun', required: true },
  { name: 'drizzle-orm', required: true },
  { name: 'express', required: false },
  { name: 'axios', required: false },
];

let packageJson;
try {
  const packageContent = await Bun.file('package.json').text();
  packageJson = JSON.parse(packageContent);
} catch (error) {
  console.info(`❌ package.json: JSON parsing failed - ${error.message}`);
  packageJson = { dependencies: {}, devDependencies: {} };
}

const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

for (const dep of dependencies) {
  const installed = installedDeps[dep.name];
  const status = installed ? '✅' : dep.required ? '❌' : '⚠️';
  const version = installed ? `v${installed.replace('^', '')}` : 'not installed';
  console.info(
    `${status} ${dep.name}: ${version}${dep.required && !installed ? ' (required)' : ''}`
  );
}

// ============================================================================
// 4. SECURITY CHECKS
// ============================================================================
console.info('\n🔐 Security Checks:');
console.info('-'.repeat(30));

const securityChecks = [
  {
    name: 'Bun.secrets Available',
    check: async () => typeof secrets !== 'undefined',
    message: 'Bun.secrets API is available',
  },
  {
    name: 'Environment Variables',
    check: async () => {
      const env = process.env.NODE_ENV || 'development';
      const service = `fire22-${env}`;

      // Try to access a test secret (this will fail gracefully if not set)
      try {
        await secrets.get({ service, name: 'test-secret' });
        return true;
      } catch {
        return false; // This is expected for new setups
      }
    },
    message: 'Security framework initialized',
  },
];

for (const check of securityChecks) {
  try {
    const result = await check.check();
    const status = result ? '✅' : '⚠️';
    console.info(`${status} ${check.name}: ${check.message}`);
  } catch (error) {
    console.info(`❌ ${check.name}: Error - ${error.message}`);
  }
}

// ============================================================================
// 5. CONFIGURATION VALIDATION
// ============================================================================
console.info('\n⚙️  Configuration Validation:');
console.info('-'.repeat(30));

const configChecks = [
  {
    name: 'Bunfig.toml',
    check: async () => {
      const bunfig = await Bun.file('bunfig.toml').text();
      return bunfig.includes('[install]') && bunfig.includes('registry');
    },
    message: 'Bun configuration is valid',
  },
  {
    name: 'TypeScript Config',
    check: async () => {
      const tsconfig = await Bun.file('tsconfig.json').text();
      const config = JSON.parse(tsconfig);
      return config.compilerOptions?.strict === true;
    },
    message: 'TypeScript strict mode enabled',
  },
  {
    name: 'Package.json Scripts',
    check: async () => {
      try {
        const scripts = packageJson.scripts || {};
        const required = ['dev', 'build', 'test'];
        return required.every(script => scripts[script]);
      } catch {
        return false;
      }
    },
    message: 'Essential npm scripts configured',
  },
];

for (const check of configChecks) {
  try {
    const result = await check.check();
    const status = result ? '✅' : '❌';
    console.info(`${status} ${check.name}: ${check.message}`);
  } catch (error) {
    console.info(`❌ ${check.name}: Error - ${error.message}`);
  }
}

// ============================================================================
// 6. RECOMMENDATIONS
// ============================================================================
console.info('\n💡 Recommendations:');
console.info('-'.repeat(30));

const recommendations = [
  "Run 'bun run registry:setup' to configure private registries",
  'Set up your environment variables in .env file',
  "Run 'bun test' to verify test suite works",
  "Run 'bun run dev' to start development server",
  'Review SECURITY_SETUP_GUIDE.md for security best practices',
  'Read DEVELOPER_GUIDE.md for complete development workflow',
];

recommendations.forEach((rec, index) => {
  console.info(`${index + 1}. ${rec}`);
});

// ============================================================================
// SUMMARY
// ============================================================================
console.info('\n🎉 Setup Verification Complete!');
console.info('-'.repeat(60));
console.info('If you see mostly ✅ marks, your environment is properly configured!');
console.info('If you see ❌ marks, please address those issues before proceeding.');
console.info('\n📚 Next Steps:');
console.info('1. Read the README_PRIVATE_REPO.md for overview');
console.info('2. Follow the SECURITY_SETUP_GUIDE.md for secure setup');
console.info('3. Start with the DEVELOPER_GUIDE.md for development workflow');
console.info('\n🚀 Happy coding with Crystal Clear Architecture!');
