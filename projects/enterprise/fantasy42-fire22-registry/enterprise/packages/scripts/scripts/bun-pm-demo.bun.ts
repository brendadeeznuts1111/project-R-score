#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Bun Package Manager Commands Demo
 * Comprehensive demonstration of all bun pm utilities
 */

console.log('🚀 Fantasy42-Fire22 Registry - Bun PM Commands Demo');
console.log('==================================================\n');

// Package Packing Commands
console.log('📦 Package Packing Commands:');
console.log('bun pm pack                    # Create tarball from current workspace');
console.log('bun pm pack --dry-run          # Preview what would be included');
console.log('bun pm pack --quiet           # Only output filename');
console.log('bun pm pack --destination ./dist # Save to specific directory');
console.log('bun pm pack --filename my-pkg.tgz # Custom filename');
console.log('bun pm pack --ignore-scripts   # Skip lifecycle scripts');
console.log('bun pm pack --gzip-level 6     # Custom compression level');
console.log('');

// Dependency Listing Commands
console.log('📋 Dependency Listing Commands:');
console.log('bun pm ls                      # Show direct dependencies');
console.log('bun pm ls --all               # Show all dependencies (including transitive)');
console.log('');

// Cache Management Commands
console.log('💾 Cache Management Commands:');
console.log('bun pm cache                   # Show cache directory path');
console.log('bun pm cache rm               # Clear global module cache');
console.log('');

// Hash Commands
console.log('🔐 Hash Commands:');
console.log('bun pm hash                    # Generate current lockfile hash');
console.log('bun pm hash-string            # Show string used for hashing');
console.log('bun pm hash-print             # Show stored lockfile hash');
console.log('');

// Trust & Security Commands
console.log('🛡️  Trust & Security Commands:');
console.log('bun pm untrusted              # List untrusted dependencies');
console.log('bun pm trust <package>        # Trust specific package scripts');
console.log('bun pm trust --all           # Trust all untrusted packages');
console.log('bun pm default-trusted       # Show default trusted packages');
console.log('');

// Package.json Management Commands
console.log('📝 Package.json Management Commands:');
console.log('bun pm pkg get name           # Get single property');
console.log('bun pm pkg get name version   # Get multiple properties');
console.log('bun pm pkg get                # Get entire package.json');
console.log('bun pm pkg set name="new-name"  # Set property');
console.log('bun pm pkg set version=2.0.0  # Set version');
console.log('bun pm pkg delete description # Delete property');
console.log('bun pm pkg fix                # Auto-fix common issues');
console.log('');

// Version Management Commands
console.log('🏷️  Version Management Commands:');
console.log('bun pm version                # Show version help and current version');
console.log('bun pm version patch          # Increment patch version (1.0.0 → 1.0.1)');
console.log('bun pm version minor          # Increment minor version (1.0.0 → 1.1.0)');
console.log('bun pm version major          # Increment major version (1.0.0 → 2.0.0)');
console.log('bun pm version prerelease     # Create prerelease version');
console.log('bun pm version 2.1.0          # Set specific version');
console.log('bun pm version --no-git-tag-version # Skip git operations');
console.log('');

// Utility Commands
console.log('🔧 Utility Commands:');
console.log('bun pm bin                    # Show local bin directory');
console.log('bun pm bin -g                # Show global bin directory');
console.log('bun pm whoami                # Show npm username (requires login)');
console.log('bun pm migrate               # Migrate from other package managers');
console.log('');

// Enterprise Examples
console.log('🏢 Enterprise Examples:');
console.log('# Create production tarball');
console.log('bun pm pack --destination ./dist --filename fantasy42-registry-v1.0.0.tgz');
console.log('');
console.log('# Check all dependencies for security audit');
console.log('bun pm ls --all | grep -i security');
console.log('');
console.log('# Update package metadata for enterprise deployment');
console.log('bun pm pkg set description="Enterprise Fantasy42-Fire22 Registry"');
console.log('bun pm pkg set author="Fire22 Enterprise"');
console.log('');
console.log('# Prepare for production release');
console.log('bun pm version minor --message "Release v1.1.0: Enterprise networking features"');
console.log('');
console.log('# Trust enterprise security packages');
console.log('bun pm trust @fire22/security-scanner @fire22/compliance-core');
console.log('');
console.log('# Cache management for CI/CD');
console.log('bun pm cache  # Check cache location');
console.log('# In CI: bun pm cache rm && bun install  # Fresh install');
console.log('');

// Performance Tips
console.log('⚡ Performance Tips:');
console.log('• Use --quiet for scripting and automation');
console.log('• Use --dry-run to preview operations');
console.log('• Use --ignore-scripts for faster packing');
console.log('• Use --no-git-tag-version for CI/CD pipelines');
console.log('• Use --all with ls for complete dependency analysis');
console.log('• Use --destination for organized artifact storage');
console.log('');

// Security Best Practices
console.log('🔒 Security Best Practices:');
console.log('• Always review untrusted dependencies: bun pm untrusted');
console.log('• Only trust packages from verified sources');
console.log('• Use --dry-run to audit what gets packaged');
console.log('• Regularly update and audit dependencies');
console.log('• Use specific versions for production stability');
console.log('');

console.log('🎉 Fantasy42-Fire22 Registry - Bun PM Commands Demo Complete!');
console.log('Your enterprise package registry now has complete PM command mastery! 🚀');
