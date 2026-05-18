#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Bun Package Manager Commands Demo
 * Comprehensive demonstration of all bun pm utilities
 */

console.info('🚀 Fantasy42-Fire22 Registry - Bun PM Commands Demo');
console.info('==================================================\n');

// Package Packing Commands
console.info('📦 Package Packing Commands:');
console.info('bun pm pack                    # Create tarball from current workspace');
console.info('bun pm pack --dry-run          # Preview what would be included');
console.info('bun pm pack --quiet           # Only output filename');
console.info('bun pm pack --destination ./dist # Save to specific directory');
console.info('bun pm pack --filename my-pkg.tgz # Custom filename');
console.info('bun pm pack --ignore-scripts   # Skip lifecycle scripts');
console.info('bun pm pack --gzip-level 6     # Custom compression level');
console.info('');

// Dependency Listing Commands
console.info('📋 Dependency Listing Commands:');
console.info('bun pm ls                      # Show direct dependencies');
console.info('bun pm ls --all               # Show all dependencies (including transitive)');
console.info('');

// Cache Management Commands
console.info('💾 Cache Management Commands:');
console.info('bun pm cache                   # Show cache directory path');
console.info('bun pm cache rm               # Clear global module cache');
console.info('');

// Hash Commands
console.info('🔐 Hash Commands:');
console.info('bun pm hash                    # Generate current lockfile hash');
console.info('bun pm hash-string            # Show string used for hashing');
console.info('bun pm hash-print             # Show stored lockfile hash');
console.info('');

// Trust & Security Commands
console.info('🛡️  Trust & Security Commands:');
console.info('bun pm untrusted              # List untrusted dependencies');
console.info('bun pm trust <package>        # Trust specific package scripts');
console.info('bun pm trust --all           # Trust all untrusted packages');
console.info('bun pm default-trusted       # Show default trusted packages');
console.info('');

// Package.json Management Commands
console.info('📝 Package.json Management Commands:');
console.info('bun pm pkg get name           # Get single property');
console.info('bun pm pkg get name version   # Get multiple properties');
console.info('bun pm pkg get                # Get entire package.json');
console.info('bun pm pkg set name="new-name"  # Set property');
console.info('bun pm pkg set version=2.0.0  # Set version');
console.info('bun pm pkg delete description # Delete property');
console.info('bun pm pkg fix                # Auto-fix common issues');
console.info('');

// Version Management Commands
console.info('🏷️  Version Management Commands:');
console.info('bun pm version                # Show version help and current version');
console.info('bun pm version patch          # Increment patch version (1.0.0 → 1.0.1)');
console.info('bun pm version minor          # Increment minor version (1.0.0 → 1.1.0)');
console.info('bun pm version major          # Increment major version (1.0.0 → 2.0.0)');
console.info('bun pm version prerelease     # Create prerelease version');
console.info('bun pm version 2.1.0          # Set specific version');
console.info('bun pm version --no-git-tag-version # Skip git operations');
console.info('');

// Utility Commands
console.info('🔧 Utility Commands:');
console.info('bun pm bin                    # Show local bin directory');
console.info('bun pm bin -g                # Show global bin directory');
console.info('bun pm whoami                # Show npm username (requires login)');
console.info('bun pm migrate               # Migrate from other package managers');
console.info('');

// Enterprise Examples
console.info('🏢 Enterprise Examples:');
console.info('# Create production tarball');
console.info('bun pm pack --destination ./dist --filename fantasy42-registry-v1.0.0.tgz');
console.info('');
console.info('# Check all dependencies for security audit');
console.info('bun pm ls --all | grep -i security');
console.info('');
console.info('# Update package metadata for enterprise deployment');
console.info('bun pm pkg set description="Enterprise Fantasy42-Fire22 Registry"');
console.info('bun pm pkg set author="Fire22 Enterprise"');
console.info('');
console.info('# Prepare for production release');
console.info('bun pm version minor --message "Release v1.1.0: Enterprise networking features"');
console.info('');
console.info('# Trust enterprise security packages');
console.info('bun pm trust @fire22/security-scanner @fire22/compliance-core');
console.info('');
console.info('# Cache management for CI/CD');
console.info('bun pm cache  # Check cache location');
console.info('# In CI: bun pm cache rm && bun install  # Fresh install');
console.info('');

// Performance Tips
console.info('⚡ Performance Tips:');
console.info('• Use --quiet for scripting and automation');
console.info('• Use --dry-run to preview operations');
console.info('• Use --ignore-scripts for faster packing');
console.info('• Use --no-git-tag-version for CI/CD pipelines');
console.info('• Use --all with ls for complete dependency analysis');
console.info('• Use --destination for organized artifact storage');
console.info('');

// Security Best Practices
console.info('🔒 Security Best Practices:');
console.info('• Always review untrusted dependencies: bun pm untrusted');
console.info('• Only trust packages from verified sources');
console.info('• Use --dry-run to audit what gets packaged');
console.info('• Regularly update and audit dependencies');
console.info('• Use specific versions for production stability');
console.info('');

console.info('🎉 Fantasy42-Fire22 Registry - Bun PM Commands Demo Complete!');
console.info('Your enterprise package registry now has complete PM command mastery! 🚀');
