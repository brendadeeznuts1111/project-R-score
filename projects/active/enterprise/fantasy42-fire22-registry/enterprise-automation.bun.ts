#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Enterprise Automation Script
 * Practical examples of version management and package.json automation
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Utility functions for package management
function runCommand(command: string, description: string) {
  console.info(`🔧 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf-8' });
    console.info(`✅ ${description} completed`);
    return result.trim();
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    return null;
  }
}

function getPackageInfo() {
  try {
    const name = runCommand('bun pm pkg get name', 'Getting package name');
    const version = runCommand('bun pm pkg get version', 'Getting package version');
    return { name, version };
  } catch (error) {
    console.error('Failed to get package info:', error);
    return { name: null, version: null };
  }
}

// Main automation functions
function setupEnterprisePackage() {
  console.info('🏢 Setting up Enterprise Package Configuration');
  console.info('=============================================');

  // Set enterprise metadata
  runCommand('bun pm pkg set author="Fire22 Enterprise"', 'Setting author');
  runCommand('bun pm pkg set license="MIT"', 'Setting license');
  runCommand('bun pm pkg set homepage="https://fire22.com"', 'Setting homepage');
  runCommand(
    'bun pm pkg set repository.url="https://github.com/fire22/registry"',
    'Setting repository'
  );
  runCommand(
    'bun pm pkg set description="Enterprise-grade Fantasy42-Fire22 package registry"',
    'Setting description'
  );

  console.info('✅ Enterprise package configuration complete');
}

function configureScripts() {
  console.info('\n📝 Configuring Automation Scripts');
  console.info('==================================');

  // Add enterprise scripts
  runCommand(
    'bun pm pkg set scripts.release:prepare="bun pm version patch --no-git-tag-version"',
    'Adding release prepare script'
  );
  runCommand(
    'bun pm pkg set scripts.release:minor="bun pm version minor --message \'feat: Release v$(bun pm pkg get version)\'"',
    'Adding minor release script'
  );
  runCommand(
    'bun pm pkg set scripts.release:major="bun pm version major --message \'BREAKING: Release v$(bun pm pkg get version)\'"',
    'Adding major release script'
  );
  runCommand(
    'bun pm pkg set scripts.validate="bun pm pkg fix && bun pm pkg get name version author"',
    'Adding validation script'
  );

  console.info('✅ Automation scripts configured');
}

function demonstrateVersionWorkflow() {
  console.info('\n🏷️  Version Management Workflow');
  console.info('================================');

  const { name, version } = getPackageInfo();
  console.info(`📦 Current: ${name} v${version}`);

  // Demonstrate different version bumps
  console.info('\n1. Patch Version (Bug fixes):');
  runCommand('bun pm version patch --no-git-tag-version', 'Patch version bump');
  console.info(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.info('\n2. Minor Version (New features):');
  runCommand('bun pm version minor --no-git-tag-version', 'Minor version bump');
  console.info(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.info('\n3. Major Version (Breaking changes):');
  runCommand('bun pm version major --no-git-tag-version', 'Major version bump');
  console.info(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.info('\n4. Prerelease Version (Beta/RC):');
  runCommand('bun pm version prerelease --preid beta --no-git-tag-version', 'Prerelease version');
  console.info(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.info('\n5. Specific Version:');
  runCommand('bun pm version 5.0.0 --no-git-tag-version', 'Setting specific version');
  console.info(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);
}

function demonstratePropertyManagement() {
  console.info('\n⚙️  Property Management Examples');
  console.info('================================');

  // Demonstrate nested property access
  console.info('1. Dot Notation for Nested Properties:');
  runCommand(
    'bun pm pkg set scripts.build="bun run build:docs && bun run build:pages"',
    'Setting nested script'
  );
  const buildScript = runCommand('bun pm pkg get scripts.build', 'Getting nested script');
  console.info(`   scripts.build: ${buildScript}`);

  console.info('\n2. Setting Multiple Properties:');
  runCommand(
    'bun pm pkg set keywords="fantasy42,fire22,registry,enterprise" private=false',
    'Setting multiple properties'
  );
  const keywords = runCommand('bun pm pkg get keywords', 'Getting keywords');
  const isPrivate = runCommand('bun pm pkg get private', 'Getting private flag');
  console.info(`   keywords: ${keywords}`);
  console.info(`   private: ${isPrivate}`);

  console.info('\n3. JSON Object Setting:');
  runCommand(
    'bun pm pkg set repository="{\\"type\\":\\"git\\",\\"url\\":\\"https://github.com/fire22/registry\\"}" --json',
    'Setting JSON object'
  );
  const repo = runCommand('bun pm pkg get repository', 'Getting repository object');
  console.info(`   repository: ${repo}`);

  console.info('\n4. Array Management:');
  runCommand('bun pm pkg set workspaces="packages/*"', 'Setting workspaces array');
  const workspaces = runCommand('bun pm pkg get workspaces', 'Getting workspaces');
  console.info(`   workspaces: ${workspaces}`);

  console.info('\n5. Property Deletion:');
  runCommand('bun pm pkg delete private', 'Deleting private property');
  const privateCheck = runCommand('bun pm pkg get private', 'Checking private property');
  console.info(`   private (after deletion): ${privateCheck || 'undefined'}`);
}

function demonstrateAutomationWorkflow() {
  console.info('\n🔄 Enterprise Automation Workflow');
  console.info('===================================');

  console.info('1. Pre-release Validation:');
  runCommand('bun pm pkg fix', 'Auto-fixing package.json');
  runCommand('bun pm pkg get name version author license', 'Validating package metadata');

  console.info('\n2. Version Preparation:');
  const currentVersion = runCommand('bun pm pkg get version', 'Getting current version');
  console.info(`   Current version: ${currentVersion}`);

  console.info('\n3. Release Simulation:');
  runCommand('bun pm version minor --no-git-tag-version', 'Simulating release version bump');
  const newVersion = runCommand('bun pm pkg get version', 'Getting new version');
  console.info(`   Release version: ${newVersion}`);

  console.info('\n4. Post-release Metadata Update:');
  runCommand('bun pm pkg set version="' + newVersion + '"', 'Updating version metadata');
  runCommand(
    'bun pm pkg set scripts.release:last="' + new Date().toISOString() + '"',
    'Recording release timestamp'
  );

  console.info('\n5. Cleanup and Validation:');
  runCommand('bun pm pkg fix', 'Final package.json validation');
  console.info(`   ✅ Release ${newVersion} automation complete`);
}

function showAdvancedExamples() {
  console.info('\n🚀 Advanced Enterprise Examples');
  console.info('================================');

  console.info('1. Conditional Version Bumping:');
  console.info('# In CI/CD pipeline:');
  console.info('if [ "$BRANCH" = "main" ]; then');
  console.info("  bun pm version minor --message 'Production release from main'");
  console.info('elif [ "$BRANCH" = "develop" ]; then');
  console.info('  bun pm version patch --no-git-tag-version');
  console.info('else');
  console.info('  bun pm version prerelease --preid dev --no-git-tag-version');
  console.info('fi');

  console.info('\n2. Dynamic Script Generation:');
  console.info('# Generate environment-specific scripts:');
  console.info('ENVIRONMENTS=(development staging production)');
  console.info('for env in "${ENVIRONMENTS[@]}"; do');
  console.info('  bun pm pkg set scripts.deploy:$env="bun run deploy:$env"');
  console.info('done');

  console.info('\n3. Version-based Configuration:');
  console.info('# Set configuration based on version:');
  console.info('VERSION=$(bun pm pkg get version)');
  console.info('if [[ $VERSION == *"-beta"* ]]; then');
  console.info('  bun pm pkg set private=true');
  console.info('  echo "Beta version: marked as private"');
  console.info('fi');

  console.info('\n4. Multi-package Workspace Management:');
  console.info('# Configure workspace scripts:');
  console.info('bun pm pkg set workspaces="[\\"packages/*\\", \\"apps/*\\"]" --json');
  console.info('bun pm pkg set scripts.build:all="bun run build --filter \'./packages/*\'"');
  console.info('bun pm pkg set scripts.test:all="bun run test --filter \'./packages/*\'"');

  console.info('\n5. Release Notes Automation:');
  console.info('# Generate release notes:');
  console.info('VERSION=$(bun pm pkg get version)');
  console.info('echo "# Release $VERSION" > RELEASE_NOTES.md');
  console.info('echo "- Enterprise features implemented" >> RELEASE_NOTES.md');
  console.info('echo "- Performance optimizations" >> RELEASE_NOTES.md');
}

// Main execution
console.info('🚀 Fantasy42-Fire22 Enterprise Automation');
console.info('=========================================\n');

// Run all demonstrations
setupEnterprisePackage();
configureScripts();
demonstrateVersionWorkflow();
demonstratePropertyManagement();
demonstrateAutomationWorkflow();
showAdvancedExamples();

console.info('\n🎉 Enterprise Automation Complete!');
console.info('===================================');
console.info('Your Fantasy42-Fire22 registry now has:');
console.info('✅ Enterprise package configuration');
console.info('✅ Automated version management');
console.info('✅ Advanced property manipulation');
console.info('✅ CI/CD-ready automation scripts');
console.info('✅ Production deployment workflows');
console.info('');
console.info('🚀 Ready for enterprise-scale development and deployment!');

// Final package info
const finalInfo = getPackageInfo();
console.info(`\n📦 Final Package: ${finalInfo.name} v${finalInfo.version}`);
