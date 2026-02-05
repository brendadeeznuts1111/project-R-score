#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Enterprise Automation Script
 * Practical examples of version management and package.json automation
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Utility functions for package management
function runCommand(command: string, description: string) {
  console.log(`🔧 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf-8' });
    console.log(`✅ ${description} completed`);
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
  console.log('🏢 Setting up Enterprise Package Configuration');
  console.log('=============================================');

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

  console.log('✅ Enterprise package configuration complete');
}

function configureScripts() {
  console.log('\n📝 Configuring Automation Scripts');
  console.log('==================================');

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

  console.log('✅ Automation scripts configured');
}

function demonstrateVersionWorkflow() {
  console.log('\n🏷️  Version Management Workflow');
  console.log('================================');

  const { name, version } = getPackageInfo();
  console.log(`📦 Current: ${name} v${version}`);

  // Demonstrate different version bumps
  console.log('\n1. Patch Version (Bug fixes):');
  runCommand('bun pm version patch --no-git-tag-version', 'Patch version bump');
  console.log(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.log('\n2. Minor Version (New features):');
  runCommand('bun pm version minor --no-git-tag-version', 'Minor version bump');
  console.log(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.log('\n3. Major Version (Breaking changes):');
  runCommand('bun pm version major --no-git-tag-version', 'Major version bump');
  console.log(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.log('\n4. Prerelease Version (Beta/RC):');
  runCommand('bun pm version prerelease --preid beta --no-git-tag-version', 'Prerelease version');
  console.log(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);

  console.log('\n5. Specific Version:');
  runCommand('bun pm version 5.0.0 --no-git-tag-version', 'Setting specific version');
  console.log(`   ${name} v${runCommand('bun pm pkg get version', 'Getting new version')}`);
}

function demonstratePropertyManagement() {
  console.log('\n⚙️  Property Management Examples');
  console.log('================================');

  // Demonstrate nested property access
  console.log('1. Dot Notation for Nested Properties:');
  runCommand(
    'bun pm pkg set scripts.build="bun run build:docs && bun run build:pages"',
    'Setting nested script'
  );
  const buildScript = runCommand('bun pm pkg get scripts.build', 'Getting nested script');
  console.log(`   scripts.build: ${buildScript}`);

  console.log('\n2. Setting Multiple Properties:');
  runCommand(
    'bun pm pkg set keywords="fantasy42,fire22,registry,enterprise" private=false',
    'Setting multiple properties'
  );
  const keywords = runCommand('bun pm pkg get keywords', 'Getting keywords');
  const isPrivate = runCommand('bun pm pkg get private', 'Getting private flag');
  console.log(`   keywords: ${keywords}`);
  console.log(`   private: ${isPrivate}`);

  console.log('\n3. JSON Object Setting:');
  runCommand(
    'bun pm pkg set repository="{\\"type\\":\\"git\\",\\"url\\":\\"https://github.com/fire22/registry\\"}" --json',
    'Setting JSON object'
  );
  const repo = runCommand('bun pm pkg get repository', 'Getting repository object');
  console.log(`   repository: ${repo}`);

  console.log('\n4. Array Management:');
  runCommand('bun pm pkg set workspaces="packages/*"', 'Setting workspaces array');
  const workspaces = runCommand('bun pm pkg get workspaces', 'Getting workspaces');
  console.log(`   workspaces: ${workspaces}`);

  console.log('\n5. Property Deletion:');
  runCommand('bun pm pkg delete private', 'Deleting private property');
  const privateCheck = runCommand('bun pm pkg get private', 'Checking private property');
  console.log(`   private (after deletion): ${privateCheck || 'undefined'}`);
}

function demonstrateAutomationWorkflow() {
  console.log('\n🔄 Enterprise Automation Workflow');
  console.log('===================================');

  console.log('1. Pre-release Validation:');
  runCommand('bun pm pkg fix', 'Auto-fixing package.json');
  runCommand('bun pm pkg get name version author license', 'Validating package metadata');

  console.log('\n2. Version Preparation:');
  const currentVersion = runCommand('bun pm pkg get version', 'Getting current version');
  console.log(`   Current version: ${currentVersion}`);

  console.log('\n3. Release Simulation:');
  runCommand('bun pm version minor --no-git-tag-version', 'Simulating release version bump');
  const newVersion = runCommand('bun pm pkg get version', 'Getting new version');
  console.log(`   Release version: ${newVersion}`);

  console.log('\n4. Post-release Metadata Update:');
  runCommand('bun pm pkg set version="' + newVersion + '"', 'Updating version metadata');
  runCommand(
    'bun pm pkg set scripts.release:last="' + new Date().toISOString() + '"',
    'Recording release timestamp'
  );

  console.log('\n5. Cleanup and Validation:');
  runCommand('bun pm pkg fix', 'Final package.json validation');
  console.log(`   ✅ Release ${newVersion} automation complete`);
}

function showAdvancedExamples() {
  console.log('\n🚀 Advanced Enterprise Examples');
  console.log('================================');

  console.log('1. Conditional Version Bumping:');
  console.log('# In CI/CD pipeline:');
  console.log('if [ "$BRANCH" = "main" ]; then');
  console.log("  bun pm version minor --message 'Production release from main'");
  console.log('elif [ "$BRANCH" = "develop" ]; then');
  console.log('  bun pm version patch --no-git-tag-version');
  console.log('else');
  console.log('  bun pm version prerelease --preid dev --no-git-tag-version');
  console.log('fi');

  console.log('\n2. Dynamic Script Generation:');
  console.log('# Generate environment-specific scripts:');
  console.log('ENVIRONMENTS=(development staging production)');
  console.log('for env in "${ENVIRONMENTS[@]}"; do');
  console.log('  bun pm pkg set scripts.deploy:$env="bun run deploy:$env"');
  console.log('done');

  console.log('\n3. Version-based Configuration:');
  console.log('# Set configuration based on version:');
  console.log('VERSION=$(bun pm pkg get version)');
  console.log('if [[ $VERSION == *"-beta"* ]]; then');
  console.log('  bun pm pkg set private=true');
  console.log('  echo "Beta version: marked as private"');
  console.log('fi');

  console.log('\n4. Multi-package Workspace Management:');
  console.log('# Configure workspace scripts:');
  console.log('bun pm pkg set workspaces="[\\"packages/*\\", \\"apps/*\\"]" --json');
  console.log('bun pm pkg set scripts.build:all="bun run build --filter \'./packages/*\'"');
  console.log('bun pm pkg set scripts.test:all="bun run test --filter \'./packages/*\'"');

  console.log('\n5. Release Notes Automation:');
  console.log('# Generate release notes:');
  console.log('VERSION=$(bun pm pkg get version)');
  console.log('echo "# Release $VERSION" > RELEASE_NOTES.md');
  console.log('echo "- Enterprise features implemented" >> RELEASE_NOTES.md');
  console.log('echo "- Performance optimizations" >> RELEASE_NOTES.md');
}

// Main execution
console.log('🚀 Fantasy42-Fire22 Enterprise Automation');
console.log('=========================================\n');

// Run all demonstrations
setupEnterprisePackage();
configureScripts();
demonstrateVersionWorkflow();
demonstratePropertyManagement();
demonstrateAutomationWorkflow();
showAdvancedExamples();

console.log('\n🎉 Enterprise Automation Complete!');
console.log('===================================');
console.log('Your Fantasy42-Fire22 registry now has:');
console.log('✅ Enterprise package configuration');
console.log('✅ Automated version management');
console.log('✅ Advanced property manipulation');
console.log('✅ CI/CD-ready automation scripts');
console.log('✅ Production deployment workflows');
console.log('');
console.log('🚀 Ready for enterprise-scale development and deployment!');

// Final package info
const finalInfo = getPackageInfo();
console.log(`\n📦 Final Package: ${finalInfo.name} v${finalInfo.version}`);
