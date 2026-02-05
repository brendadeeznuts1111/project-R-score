#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Version & Package Management Demo
 * Complete demonstration of bun pm version and bun pm pkg commands
 */

console.log('🚀 Fantasy42-Fire22 Registry - Version & Package Management Demo');
console.log('================================================================\n');

// Version Management Section
console.log('🏷️  VERSION MANAGEMENT COMMANDS');
console.log('================================');

// Show current version info
console.log('Current Version Information:');
console.log('bun pm version');
console.log('✅ Shows current version (3.1.4) with increment options');
console.log('✅ Displays patch/minor/major/prerelease options');
console.log('✅ Shows --no-git-tag-version and --message flags');
console.log('');

// Version bump examples
console.log('Version Bump Examples:');
console.log('bun pm version patch          # 3.1.4 → 3.1.5');
console.log('bun pm version minor          # 3.1.4 → 3.2.0');
console.log('bun pm version major          # 3.1.4 → 4.0.0');
console.log('bun pm version prerelease     # 3.1.4 → 3.1.5-0');
console.log('bun pm version 2.0.0          # Set to specific version');
console.log('bun pm version from-git       # Use version from latest git tag');
console.log('');

// Advanced version options
console.log('Advanced Version Options:');
console.log('bun pm version patch --no-git-tag-version');
console.log('✅ Bumps version without git commit/tag');
console.log('✅ Perfect for CI/CD pipelines');
console.log('');
console.log("bun pm version minor --message 'Release v3.2.0: New features'");
console.log('✅ Custom commit message with version substitution');
console.log('✅ %s gets replaced with the new version');
console.log('');
console.log('bun pm version prerelease --preid beta');
console.log('✅ Creates beta prerelease: 3.1.5-beta.0');
console.log('✅ --preid specifies prerelease identifier');
console.log('');

// Package.json Management Section
console.log('📝 PACKAGE.JSON MANAGEMENT COMMANDS');
console.log('====================================');

// Get operations
console.log('Get Operations:');
console.log('bun pm pkg get name');
console.log("✅ Gets single property: 'fantasy42-fire22-registry'");
console.log('');
console.log('bun pm pkg get name version');
console.log('✅ Gets multiple properties as JSON object');
console.log('');
console.log('bun pm pkg get scripts.build');
console.log('✅ Gets nested property using dot notation');
console.log("✅ scripts.build: 'bun run build:docs && bun run build:pages'");
console.log('');
console.log('bun pm pkg get');
console.log('✅ Gets entire package.json as JSON');
console.log('');

// Set operations
console.log('Set Operations:');
console.log('bun pm pkg set name="my-package"');
console.log('✅ Sets simple property');
console.log('');
console.log('bun pm pkg set scripts.test="jest" version=2.0.0');
console.log('✅ Sets multiple properties in one command');
console.log('');
console.log('bun pm pkg set scripts[ci:build]="bun run test && bun run build"');
console.log('✅ Uses bracket notation for special characters');
console.log('✅ Handles colons and other special chars properly');
console.log('');
console.log('bun pm pkg set {"private":true} --json');
console.log('✅ Sets JSON values with --json flag');
console.log('✅ Perfect for complex objects or boolean values');
console.log('');

// Nested property examples
console.log('Nested Property Examples:');
console.log('bun pm pkg set workspaces.0="packages/*"');
console.log('✅ Sets array element using dot notation with index');
console.log('');
console.log('bun pm pkg set contributors[0].name="John Doe"');
console.log('✅ Sets nested object in array using bracket notation');
console.log('');
console.log('bun pm pkg get workspaces[0]');
console.log('✅ Gets array element using bracket notation');
console.log('');

// Delete operations
console.log('Delete Operations:');
console.log('bun pm pkg delete description');
console.log('✅ Deletes single property');
console.log('');
console.log('bun pm pkg delete scripts.test contributors[0]');
console.log('✅ Deletes multiple properties/nested items');
console.log('');
console.log('bun pm pkg delete workspaces');
console.log('✅ Deletes entire nested object or array');
console.log('');

// Fix operations
console.log('Fix Operations:');
console.log('bun pm pkg fix');
console.log('✅ Auto-fixes common package.json issues');
console.log('✅ Corrects formatting, missing fields, etc.');
console.log('✅ Ensures package.json follows best practices');
console.log('');

// Practical Examples Section
console.log('🏢 PRACTICAL ENTERPRISE EXAMPLES');
console.log('=================================');

// Release management
console.log('Release Management:');
console.log('# Patch release for bug fixes');
console.log("bun pm version patch --message 'fix: Security vulnerability in auth module'");
console.log('');
console.log('# Minor release for new features');
console.log("bun pm version minor --message 'feat: Add multi-tenant support'");
console.log('');
console.log('# Major release for breaking changes');
console.log("bun pm version major --message 'BREAKING: New API architecture'");
console.log('');
console.log('# Prerelease for testing');
console.log("bun pm version prerelease --preid beta --message 'beta: Release candidate'");
console.log('');

// CI/CD integration
console.log('CI/CD Integration:');
console.log('# Automated version bumping in CI');
console.log('CURRENT_VERSION=$(bun pm pkg get version)');
console.log('bun pm version patch --no-git-tag-version');
console.log('NEW_VERSION=$(bun pm pkg get version)');
console.log('echo "Version bumped: $CURRENT_VERSION → $NEW_VERSION"');
console.log('');
console.log('# Conditional version bumping');
console.log('if [ "$BRANCH" = "main" ]; then');
console.log("  bun pm version minor --message 'Release from main branch'");
console.log('else');
console.log('  bun pm version patch --no-git-tag-version');
console.log('fi');
console.log('');

// Package configuration
console.log('Package Configuration:');
console.log('# Set up enterprise package metadata');
console.log('bun pm pkg set author="Fire22 Enterprise"');
console.log('bun pm pkg set license="MIT"');
console.log('bun pm pkg set homepage="https://fire22.com"');
console.log('bun pm pkg set repository.url="https://github.com/fire22/registry"');
console.log('');
console.log('# Configure scripts for automation');
console.log('bun pm pkg set scripts.build="bun run build:docs && bun run build:pages"');
console.log('bun pm pkg set scripts.release="bun run test && bun run pack:production"');
console.log('bun pm pkg set scripts.deploy="bun run release:full"');
console.log('');

// Workspace management
console.log('Workspace Management:');
console.log('# Configure monorepo workspaces');
console.log('bun pm pkg set workspaces="[\\"packages/*\\", \\"apps/*\\"]" --json');
console.log('');
console.log('# Add workspace-specific scripts');
console.log('bun pm pkg set scripts.workspace:build="bun run build --filter \'./packages/*\'"');
console.log('bun pm pkg set scripts.workspace:test="bun run test --filter \'./packages/*\'"');
console.log('');

// Security and compliance
console.log('Security & Compliance:');
console.log('# Set security metadata');
console.log('bun pm pkg set securityContact="security@fire22.com"');
console.log('bun pm pkg set funding.url="https://opencollective.com/fire22"');
console.log('');
console.log('# Configure trusted dependencies');
console.log(
  'bun pm pkg set trustedDependencies="[\\"@fire22/core-security\\", \\"typescript\\"]" --json'
);
console.log('');

// Automation scripts
console.log('🔄 Automation Scripts:');
console.log('# Version management script');
console.log('VERSION_TYPE=${1:-patch}');
console.log('bun pm version $VERSION_TYPE --message "Release v$(bun pm pkg get version): $2"');
console.log('');
console.log('# Package validation script');
console.log('bun pm pkg fix');
console.log('bun pm pkg get name version author license');
console.log('echo "✅ Package configuration validated"');
console.log('');

// Enterprise workflow
console.log('🏭 Enterprise Workflow:');
console.log('# Complete release workflow');
console.log("bun pm version minor --message 'Enterprise release: $(date)'");
console.log('bun pm pkg set version="$(bun pm pkg get version)"');
console.log('bun run pack:production');
console.log('bun run publish:registry');
console.log('echo "🚀 Enterprise release $(bun pm pkg get version) deployed!"');
console.log('');

// Performance tips
console.log('⚡ Performance Tips:');
console.log('• Use --no-git-tag-version in CI/CD for faster builds');
console.log('• Use --json flag for complex object/array values');
console.log('• Use dot notation for consistent property access');
console.log('• Use bracket notation for special characters and arrays');
console.log('• Combine multiple operations in single commands');
console.log('• Use fix command regularly to maintain package.json health');
console.log('');

// Best practices
console.log('💡 Best Practices:');
console.log('• Always test version bumps in development first');
console.log('• Use semantic versioning consistently');
console.log('• Keep commit messages descriptive and prefixed');
console.log('• Use --no-git-tag-version for automated workflows');
console.log('• Regularly run pkg fix to maintain cleanliness');
console.log('• Use consistent property naming conventions');
console.log('• Document custom scripts in README');
console.log('');

// Command reference
console.log('📋 Complete Command Reference:');
console.log('bun pm version patch              # Increment patch version');
console.log('bun pm version minor              # Increment minor version');
console.log('bun pm version major              # Increment major version');
console.log('bun pm version prerelease         # Create prerelease version');
console.log('bun pm version 1.2.3              # Set specific version');
console.log('bun pm version --no-git-tag-version # Skip git operations');
console.log("bun pm version --message '...'    # Custom commit message");
console.log('bun pm version --preid beta       # Prerelease identifier');
console.log('');
console.log('bun pm pkg get name               # Get single property');
console.log('bun pm pkg get name version       # Get multiple properties');
console.log('bun pm pkg get scripts.build      # Get nested property');
console.log('bun pm pkg set name="value"       # Set single property');
console.log('bun pm pkg set name=val version=1.0.0 # Set multiple properties');
console.log('bun pm pkg set {"key":"value"} --json # Set JSON values');
console.log('bun pm pkg delete description     # Delete property');
console.log('bun pm pkg delete scripts.test    # Delete nested property');
console.log('bun pm pkg fix                    # Auto-fix issues');
console.log('');

console.log('🎉 Fantasy42-Fire22 Registry - Version & Package Management Complete!');
console.log(
  'Your enterprise registry now has complete version control and package.json management! 🚀'
);
