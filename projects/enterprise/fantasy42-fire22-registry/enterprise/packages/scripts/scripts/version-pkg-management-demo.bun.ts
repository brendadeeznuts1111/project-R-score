#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Version & Package Management Demo
 * Complete demonstration of bun pm version and bun pm pkg commands
 */

console.info('🚀 Fantasy42-Fire22 Registry - Version & Package Management Demo');
console.info('================================================================\n');

// Version Management Section
console.info('🏷️  VERSION MANAGEMENT COMMANDS');
console.info('================================');

// Show current version info
console.info('Current Version Information:');
console.info('bun pm version');
console.info('✅ Shows current version (3.1.4) with increment options');
console.info('✅ Displays patch/minor/major/prerelease options');
console.info('✅ Shows --no-git-tag-version and --message flags');
console.info('');

// Version bump examples
console.info('Version Bump Examples:');
console.info('bun pm version patch          # 3.1.4 → 3.1.5');
console.info('bun pm version minor          # 3.1.4 → 3.2.0');
console.info('bun pm version major          # 3.1.4 → 4.0.0');
console.info('bun pm version prerelease     # 3.1.4 → 3.1.5-0');
console.info('bun pm version 2.0.0          # Set to specific version');
console.info('bun pm version from-git       # Use version from latest git tag');
console.info('');

// Advanced version options
console.info('Advanced Version Options:');
console.info('bun pm version patch --no-git-tag-version');
console.info('✅ Bumps version without git commit/tag');
console.info('✅ Perfect for CI/CD pipelines');
console.info('');
console.info("bun pm version minor --message 'Release v3.2.0: New features'");
console.info('✅ Custom commit message with version substitution');
console.info('✅ %s gets replaced with the new version');
console.info('');
console.info('bun pm version prerelease --preid beta');
console.info('✅ Creates beta prerelease: 3.1.5-beta.0');
console.info('✅ --preid specifies prerelease identifier');
console.info('');

// Package.json Management Section
console.info('📝 PACKAGE.JSON MANAGEMENT COMMANDS');
console.info('====================================');

// Get operations
console.info('Get Operations:');
console.info('bun pm pkg get name');
console.info("✅ Gets single property: 'fantasy42-fire22-registry'");
console.info('');
console.info('bun pm pkg get name version');
console.info('✅ Gets multiple properties as JSON object');
console.info('');
console.info('bun pm pkg get scripts.build');
console.info('✅ Gets nested property using dot notation');
console.info("✅ scripts.build: 'bun run build:docs && bun run build:pages'");
console.info('');
console.info('bun pm pkg get');
console.info('✅ Gets entire package.json as JSON');
console.info('');

// Set operations
console.info('Set Operations:');
console.info('bun pm pkg set name="my-package"');
console.info('✅ Sets simple property');
console.info('');
console.info('bun pm pkg set scripts.test="jest" version=2.0.0');
console.info('✅ Sets multiple properties in one command');
console.info('');
console.info('bun pm pkg set scripts[ci:build]="bun run test && bun run build"');
console.info('✅ Uses bracket notation for special characters');
console.info('✅ Handles colons and other special chars properly');
console.info('');
console.info('bun pm pkg set {"private":true} --json');
console.info('✅ Sets JSON values with --json flag');
console.info('✅ Perfect for complex objects or boolean values');
console.info('');

// Nested property examples
console.info('Nested Property Examples:');
console.info('bun pm pkg set workspaces.0="packages/*"');
console.info('✅ Sets array element using dot notation with index');
console.info('');
console.info('bun pm pkg set contributors[0].name="John Doe"');
console.info('✅ Sets nested object in array using bracket notation');
console.info('');
console.info('bun pm pkg get workspaces[0]');
console.info('✅ Gets array element using bracket notation');
console.info('');

// Delete operations
console.info('Delete Operations:');
console.info('bun pm pkg delete description');
console.info('✅ Deletes single property');
console.info('');
console.info('bun pm pkg delete scripts.test contributors[0]');
console.info('✅ Deletes multiple properties/nested items');
console.info('');
console.info('bun pm pkg delete workspaces');
console.info('✅ Deletes entire nested object or array');
console.info('');

// Fix operations
console.info('Fix Operations:');
console.info('bun pm pkg fix');
console.info('✅ Auto-fixes common package.json issues');
console.info('✅ Corrects formatting, missing fields, etc.');
console.info('✅ Ensures package.json follows best practices');
console.info('');

// Practical Examples Section
console.info('🏢 PRACTICAL ENTERPRISE EXAMPLES');
console.info('=================================');

// Release management
console.info('Release Management:');
console.info('# Patch release for bug fixes');
console.info("bun pm version patch --message 'fix: Security vulnerability in auth module'");
console.info('');
console.info('# Minor release for new features');
console.info("bun pm version minor --message 'feat: Add multi-tenant support'");
console.info('');
console.info('# Major release for breaking changes');
console.info("bun pm version major --message 'BREAKING: New API architecture'");
console.info('');
console.info('# Prerelease for testing');
console.info("bun pm version prerelease --preid beta --message 'beta: Release candidate'");
console.info('');

// CI/CD integration
console.info('CI/CD Integration:');
console.info('# Automated version bumping in CI');
console.info('CURRENT_VERSION=$(bun pm pkg get version)');
console.info('bun pm version patch --no-git-tag-version');
console.info('NEW_VERSION=$(bun pm pkg get version)');
console.info('echo "Version bumped: $CURRENT_VERSION → $NEW_VERSION"');
console.info('');
console.info('# Conditional version bumping');
console.info('if [ "$BRANCH" = "main" ]; then');
console.info("  bun pm version minor --message 'Release from main branch'");
console.info('else');
console.info('  bun pm version patch --no-git-tag-version');
console.info('fi');
console.info('');

// Package configuration
console.info('Package Configuration:');
console.info('# Set up enterprise package metadata');
console.info('bun pm pkg set author="Fire22 Enterprise"');
console.info('bun pm pkg set license="MIT"');
console.info('bun pm pkg set homepage="https://fire22.com"');
console.info('bun pm pkg set repository.url="https://github.com/fire22/registry"');
console.info('');
console.info('# Configure scripts for automation');
console.info('bun pm pkg set scripts.build="bun run build:docs && bun run build:pages"');
console.info('bun pm pkg set scripts.release="bun run test && bun run pack:production"');
console.info('bun pm pkg set scripts.deploy="bun run release:full"');
console.info('');

// Workspace management
console.info('Workspace Management:');
console.info('# Configure monorepo workspaces');
console.info('bun pm pkg set workspaces="[\\"packages/*\\", \\"apps/*\\"]" --json');
console.info('');
console.info('# Add workspace-specific scripts');
console.info('bun pm pkg set scripts.workspace:build="bun run build --filter \'./packages/*\'"');
console.info('bun pm pkg set scripts.workspace:test="bun run test --filter \'./packages/*\'"');
console.info('');

// Security and compliance
console.info('Security & Compliance:');
console.info('# Set security metadata');
console.info('bun pm pkg set securityContact="security@fire22.com"');
console.info('bun pm pkg set funding.url="https://opencollective.com/fire22"');
console.info('');
console.info('# Configure trusted dependencies');
console.info(
  'bun pm pkg set trustedDependencies="[\\"@fire22/core-security\\", \\"typescript\\"]" --json'
);
console.info('');

// Automation scripts
console.info('🔄 Automation Scripts:');
console.info('# Version management script');
console.info('VERSION_TYPE=${1:-patch}');
console.info('bun pm version $VERSION_TYPE --message "Release v$(bun pm pkg get version): $2"');
console.info('');
console.info('# Package validation script');
console.info('bun pm pkg fix');
console.info('bun pm pkg get name version author license');
console.info('echo "✅ Package configuration validated"');
console.info('');

// Enterprise workflow
console.info('🏭 Enterprise Workflow:');
console.info('# Complete release workflow');
console.info("bun pm version minor --message 'Enterprise release: $(date)'");
console.info('bun pm pkg set version="$(bun pm pkg get version)"');
console.info('bun run pack:production');
console.info('bun run publish:registry');
console.info('echo "🚀 Enterprise release $(bun pm pkg get version) deployed!"');
console.info('');

// Performance tips
console.info('⚡ Performance Tips:');
console.info('• Use --no-git-tag-version in CI/CD for faster builds');
console.info('• Use --json flag for complex object/array values');
console.info('• Use dot notation for consistent property access');
console.info('• Use bracket notation for special characters and arrays');
console.info('• Combine multiple operations in single commands');
console.info('• Use fix command regularly to maintain package.json health');
console.info('');

// Best practices
console.info('💡 Best Practices:');
console.info('• Always test version bumps in development first');
console.info('• Use semantic versioning consistently');
console.info('• Keep commit messages descriptive and prefixed');
console.info('• Use --no-git-tag-version for automated workflows');
console.info('• Regularly run pkg fix to maintain cleanliness');
console.info('• Use consistent property naming conventions');
console.info('• Document custom scripts in README');
console.info('');

// Command reference
console.info('📋 Complete Command Reference:');
console.info('bun pm version patch              # Increment patch version');
console.info('bun pm version minor              # Increment minor version');
console.info('bun pm version major              # Increment major version');
console.info('bun pm version prerelease         # Create prerelease version');
console.info('bun pm version 1.2.3              # Set specific version');
console.info('bun pm version --no-git-tag-version # Skip git operations');
console.info("bun pm version --message '...'    # Custom commit message");
console.info('bun pm version --preid beta       # Prerelease identifier');
console.info('');
console.info('bun pm pkg get name               # Get single property');
console.info('bun pm pkg get name version       # Get multiple properties');
console.info('bun pm pkg get scripts.build      # Get nested property');
console.info('bun pm pkg set name="value"       # Set single property');
console.info('bun pm pkg set name=val version=1.0.0 # Set multiple properties');
console.info('bun pm pkg set {"key":"value"} --json # Set JSON values');
console.info('bun pm pkg delete description     # Delete property');
console.info('bun pm pkg delete scripts.test    # Delete nested property');
console.info('bun pm pkg fix                    # Auto-fix issues');
console.info('');

console.info('🎉 Fantasy42-Fire22 Registry - Version & Package Management Complete!');
console.info(
  'Your enterprise registry now has complete version control and package.json management! 🚀'
);
