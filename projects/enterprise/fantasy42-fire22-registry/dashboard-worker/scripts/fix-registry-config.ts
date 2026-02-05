#!/usr/bin/env bun
/**
 * Registry Configuration Fixer for Fire22 Dashboard
 * Fixes all registry issues and ensures proper npm registry connectivity
 */

import { $ } from 'bun';
import { writeFile, readFile, exists } from 'node:fs/promises';
import { join } from 'node:path';

interface RegistryError {
  code: string;
  description: string;
  solution: string;
  url?: string;
}

const REGISTRY_ERRORS: RegistryError[] = [
  {
    code: '404_PACKAGE_NOT_FOUND',
    description: 'Package not found in registry',
    solution: 'Ensure package name is correct and registry URL is valid',
    url: 'https://packages.apexodds.net',
  },
  {
    code: 'INVALID_REGISTRY',
    description: 'Registry URL is not accessible or returns errors',
    solution: 'Use official npm registry: https://registry.npmjs.org/',
  },
  {
    code: 'SCOPED_REGISTRY_FAIL',
    description: 'Scoped package registry is not accessible',
    solution: 'Fallback to main registry for scoped packages',
  },
  {
    code: 'VERSION_MISMATCH',
    description: 'Requested version not available in registry',
    solution: 'Use latest compatible version or check package.json constraints',
  },
];

class RegistryFixer {
  private readonly NPM_REGISTRY = 'https://registry.npmjs.org/';
  private readonly CONFIG_FILES = ['.npmrc', 'bunfig.toml', '.yarnrc'];

  async diagnose(): Promise<void> {
    console.log('🔍 Diagnosing registry configuration issues...\n');

    // Check current registry settings
    await this.checkRegistryConfig();

    // Test registry connectivity
    await this.testRegistryConnectivity();

    // Document errors
    await this.documentErrors();
  }

  async checkRegistryConfig(): Promise<void> {
    console.log('📋 Checking configuration files:');

    for (const file of this.CONFIG_FILES) {
      if (await exists(file)) {
        console.log(`  ✓ Found ${file}`);
        const content = await readFile(file, 'utf-8');

        // Check for problematic registries
        if (content.includes('packages.apexodds.net')) {
          console.log(`    ⚠️  Found problematic registry: packages.apexodds.net`);
        }
        if (content.includes('fire22.workers.dev/registry')) {
          console.log(`    ⚠️  Found custom registry: fire22.workers.dev/registry`);
        }
      }
    }
    console.log();
  }

  async testRegistryConnectivity(): Promise<void> {
    console.log('🌐 Testing registry connectivity:');

    const registries = [
      { name: 'NPM Official', url: 'https://registry.npmjs.org/' },
      { name: 'Packages ApexOdds', url: 'https://packages.apexodds.net/' },
      { name: 'Fire22 Workers', url: 'https://fire22.workers.dev/registry/' },
    ];

    for (const registry of registries) {
      try {
        const response = await fetch(registry.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok || response.status === 404) {
          console.log(
            `  ✓ ${registry.name}: ${response.status === 404 ? 'Accessible but returns 404' : 'OK'}`
          );
        } else {
          console.log(`  ✗ ${registry.name}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`  ✗ ${registry.name}: Connection failed`);
      }
    }
    console.log();
  }

  async fix(): Promise<void> {
    console.log('🔧 Fixing registry configuration...\n');

    // 1. Fix .npmrc
    await this.fixNpmrc();

    // 2. Fix bunfig.toml
    await this.fixBunfig();

    // 3. Create .env for registry overrides
    await this.createEnvOverrides();

    // 4. Clean cache
    await this.cleanCache();

    console.log('✅ Registry configuration fixed!\n');
  }

  async fixNpmrc(): Promise<void> {
    console.log('📝 Fixing .npmrc...');

    const npmrcContent = `# NPM Configuration for Fire22 Dashboard Worker
# Fixed by fix-registry-config.ts

# Main Registry (Official NPM)
registry=https://registry.npmjs.org/

# Disable problematic registries
# @fire22:registry=https://fire22.workers.dev/registry/
# packages.apexodds.net is disabled

# Package Management
save-exact=true
engine-strict=true
fund=false

# Security
audit=true
audit-level=moderate
audit-signatures=false

# Performance
prefer-offline=false
cache-min=86400

# Logging
loglevel=warn
progress=true

# Workspace Settings
workspaces-update=false
`;

    await writeFile('.npmrc', npmrcContent);
    console.log('  ✓ .npmrc updated');
  }

  async fixBunfig(): Promise<void> {
    console.log('📝 Fixing bunfig.toml...');

    const bunfigContent = `# Fire22 Dashboard - Bun Configuration
# Fixed by fix-registry-config.ts

[install]
# Use official NPM registry only
registry = "https://registry.npmjs.org/"
linker = "hoisted"
cache = true
exact = true
dev = true
optional = true
auto = false

# No custom scopes - all use main registry
[install.scopes]

[build]
target = "bun"
format = "esm"
splitting = true
minify = false

[test]
coverage = true

[run]
bun = true
hot = true

# CSS Build Scripts
[scripts]
"css:extract" = "bun run scripts/extract-css.ts"
"css:build" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]'"
"css:watch" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]' --watch"
"css:consolidate" = "bun run css:extract && bun run css:build"
"build:css" = "bun run css:consolidate"

# Serve configuration
[serve]
port = 3001
host = "0.0.0.0"

[serve.static]
directory = "public"
plugins = []

[serve.static.paths]
"/css" = "./public/css"
"/styles" = "./src/styles"
"/js" = "./src/js"
`;

    await writeFile('bunfig.toml', bunfigContent);
    console.log('  ✓ bunfig.toml updated');
  }

  async createEnvOverrides(): Promise<void> {
    console.log('📝 Creating registry overrides...');

    const envContent = `# Registry Overrides for Bun
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/
NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
YARN_REGISTRY=https://registry.npmjs.org/

# Disable custom registries
BUN_CONFIG_NO_CUSTOM_REGISTRIES=true

# Cache settings
BUN_CONFIG_CACHE_DIR=.bun/cache
BUN_CONFIG_INSTALL_CACHE_DIR=.bun/install-cache
`;

    await writeFile('.env.registry', envContent);
    console.log('  ✓ .env.registry created');
  }

  async cleanCache(): Promise<void> {
    console.log('🗑️  Cleaning cache...');

    try {
      await $`rm -rf node_modules .bun bun.lockb package-lock.json yarn.lock`.quiet();
      console.log('  ✓ Cache cleaned');
    } catch (error) {
      console.log('  ⚠️  Some cache files not found (this is OK)');
    }
  }

  async documentErrors(): Promise<void> {
    console.log('📚 Creating error documentation...');

    const errorDocs = `# Registry Error Documentation

## Common Registry Errors and Solutions

${REGISTRY_ERRORS.map(
  error => `
### ${error.code}
**Description:** ${error.description}
**Solution:** ${error.solution}
${error.url ? `**Related URL:** ${error.url}` : ''}
`
).join('\n')}

## Quick Fixes

### 1. Complete Reset
\`\`\`bash
bun run scripts/fix-registry-config.ts --fix
\`\`\`

### 2. Manual Registry Override
\`\`\`bash
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun install
\`\`\`

### 3. Clear All Caches
\`\`\`bash
rm -rf node_modules .bun bun.lockb
bun install --force
\`\`\`

## Dependency Installation Process

### For New Dependencies
\`\`\`bash
# 1. Always use the helper script
bun run scripts/add-dependency.ts <package-name>

# 2. Or manually with registry override
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun add <package-name>
\`\`\`

### For Dev Dependencies
\`\`\`bash
bun run scripts/add-dependency.ts --dev <package-name>
\`\`\`

## Verified Working Registries
- ✅ https://registry.npmjs.org/ (Official NPM)
- ❌ https://packages.apexodds.net/ (Returns 404)
- ❌ https://fire22.workers.dev/registry/ (Not accessible)

## Environment Variables
Set these in your shell or .env file:
- \`BUN_CONFIG_REGISTRY\`: Override default registry
- \`NPM_CONFIG_REGISTRY\`: NPM registry override
- \`BUN_CONFIG_NO_CUSTOM_REGISTRIES\`: Disable all custom registries
`;

    await writeFile('docs/REGISTRY-ERRORS.md', errorDocs);
    console.log('  ✓ Error documentation created at docs/REGISTRY-ERRORS.md');
  }

  async createDependencyProcess(): Promise<void> {
    console.log('🔧 Creating dependency management process...');

    const processDoc = `# Dependency Management Process

## Adding New Dependencies

### Step 1: Pre-Installation Check
\`\`\`bash
# Check if dependency exists in npm registry
npm view <package-name> versions --json
\`\`\`

### Step 2: Add Dependency
\`\`\`bash
# Use our helper script (recommended)
bun run scripts/add-dependency.ts <package-name>

# Or manually with safeguards
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun add <package-name>
\`\`\`

### Step 3: Verify Installation
\`\`\`bash
# Check that dependency was added
bun pm ls | grep <package-name>

# Test import
bun run -e "import '<package-name>'; console.log('✓ Import works')"
\`\`\`

### Step 4: Update Documentation
Add the dependency to \`docs/DEPENDENCIES.md\` with:
- Package name and version
- Purpose/usage
- License information
- Security considerations

## Cloudflare Workers Compatibility

### Compatible Package Types
✅ Pure JavaScript/TypeScript packages
✅ Packages with WebAssembly
✅ Packages using Web APIs (fetch, crypto, etc.)
✅ ESM modules

### Incompatible Package Types
❌ Node.js built-in modules (fs, path, etc.)
❌ Native addons (.node files)
❌ Packages requiring Node.js runtime

### Checking Compatibility
\`\`\`bash
# Check if package uses Node.js APIs
npm view <package-name> dependencies

# Test in Workers environment
wrangler dev --test <package-name>
\`\`\`

## Dependency Update Process

### Weekly Updates
\`\`\`bash
# Check for updates
bun outdated

# Update patch versions
bun update

# Update minor versions
bun update --latest
\`\`\`

### Security Updates
\`\`\`bash
# Run security audit
bun audit

# Fix vulnerabilities
bun audit fix
\`\`\`
`;

    await writeFile('docs/DEPENDENCY-PROCESS.md', processDoc);
    console.log('  ✓ Dependency process documentation created');
  }
}

// Main execution
async function main() {
  const fixer = new RegistryFixer();

  const args = process.argv.slice(2);

  if (args.includes('--fix')) {
    await fixer.fix();
    await fixer.createDependencyProcess();
  } else if (args.includes('--diagnose')) {
    await fixer.diagnose();
  } else {
    // Default: diagnose, then fix
    await fixer.diagnose();
    console.log('🔄 Applying fixes...\n');
    await fixer.fix();
    await fixer.createDependencyProcess();

    console.log(`
✅ Registry configuration has been fixed!

Next steps:
1. Run: bun install
2. If issues persist, run: BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun install
3. Check docs/REGISTRY-ERRORS.md for error documentation
4. Use scripts/add-dependency.ts to add new packages

Need help? Check:
- docs/REGISTRY-ERRORS.md
- docs/DEPENDENCY-PROCESS.md
`);
  }
}

main().catch(console.error);
