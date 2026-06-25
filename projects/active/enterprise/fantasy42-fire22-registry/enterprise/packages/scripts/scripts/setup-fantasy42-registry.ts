#!/usr/bin/env bun

/**
 * 🎯 Fantasy42 Registry Setup Script
 *
 * Initializes the Fire22 package registry with all necessary packages
 * and configurations for Fantasy42 operations.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

console.info('🎯 Fantasy42 Registry Setup');
console.info('==========================');

// ============================================================================
// CONFIGURATION
// ============================================================================

const REGISTRY_CONFIG = {
  name: '@fire22-registry',
  version: '1.0.0',
  description: 'Fire22 Package Registry for Fantasy42 Operations',
  packages: {
    'core-security': [
      'fantasy42-security@3.1.0',
      'fraud-prevention@2.5.0',
      'compliance-core@4.3.0',
      'emergency-protocols@1.8.0',
    ],
    'betting-engine': [
      'wager-processor@2.1.0',
      'odds-calculator@3.2.0',
      'risk-assessment@2.8.0',
      'bet-validation@1.9.0',
    ],
    'payment-processing': [
      'fantasy42-payments@4.2.0',
      'crypto-gateway@2.1.0',
      'transaction-monitor@3.5.0',
      'escrow-manager@1.7.0',
    ],
    'analytics-dashboard': [
      'fantasy42-dashboard@2.7.0',
      'real-time-metrics@1.9.0',
      'performance-monitor@3.1.0',
      'user-analytics@2.3.0',
    ],
    'cloudflare-infrastructure': [
      'cf-fire22@2.3.0',
      'worker-security@1.6.0',
      'edge-computing@2.1.0',
      'durable-objects@1.8.0',
    ],
    'user-management': [
      'fantasy42-users@3.6.0',
      'player-verification@2.8.0',
      'vip-management@3.2.0',
      'responsible-gaming@2.4.0',
    ],
    'dev-tooling': [
      'fire22-cli@1.9.0',
      'bun-optimization@1.7.0',
      'test-suite@2.4.0',
      'deployment-tools@1.8.0',
    ],
    compliance: [
      'regulatory-compliance@3.4.0',
      'audit-trails@2.7.0',
      'gdpr-manager@3.1.0',
      'licensing-manager@2.2.0',
    ],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function runCommand(command: string, description: string): Promise<boolean> {
  console.info(`🔧 ${description}...`);

  try {
    const process = Bun.spawn(command.split(' '), {
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    const exitCode = await process.exited;
    return exitCode === 0;
  } catch (error) {
    console.error(`❌ Failed: ${error}`);
    return false;
  }
}

function createDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.info(`📁 Created directory: ${path}`);
  }
}

function writeJsonFile(path: string, data: any): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.info(`📝 Created file: ${path}`);
}

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function setupRegistryStructure(): Promise<void> {
  console.info('\n🏗️ Setting up registry structure...');

  const registryPath = join(process.cwd(), 'packages');
  createDirectory(registryPath);

  // Create category directories
  for (const category of Object.keys(REGISTRY_CONFIG.packages)) {
    const categoryPath = join(registryPath, category);
    createDirectory(categoryPath);

    // Create package directories
    const packages = REGISTRY_CONFIG.packages[category as keyof typeof REGISTRY_CONFIG.packages];
    for (const packageName of packages) {
      const [name, version] = packageName.split('@');
      const packagePath = join(categoryPath, name);
      createDirectory(packagePath);

      // Create package.json
      const packageJson = {
        name: `${REGISTRY_CONFIG.name}/${name}`,
        version: version,
        description: `${name} package for Fantasy42 operations`,
        main: 'src/index.ts',
        scripts: {
          build: 'bun build ./src/index.ts',
          test: 'bun test',
          dev: 'bun run --hot ./src/index.ts',
        },
        dependencies: {},
        devDependencies: {
          'bun-types': 'latest',
        },
        keywords: ['fantasy42', 'fire22', name.replace('-', ' ')],
        author: 'Fire22 Inc',
        license: 'MIT',
      };

      writeJsonFile(join(packagePath, 'package.json'), packageJson);

      // Create basic source structure
      createDirectory(join(packagePath, 'src'));
      createDirectory(join(packagePath, 'tests'));

      // Create basic index.ts
      const indexContent = `/**
 * ${name} - Fantasy42 ${category} Package
 * Version: ${version}
 */

export class ${name.replace('-', '').replace(/\b\w/g, l => l.toUpperCase())} {
  constructor() {
    console.info('${name} v${version} initialized');
  }

  getVersion(): string {
    return '${version}';
  }
}

export default ${name.replace('-', '').replace(/\b\w/g, l => l.toUpperCase())};
`;

      writeFileSync(join(packagePath, 'src', 'index.ts'), indexContent);
      console.info(`📦 Created package: ${name}@${version}`);
    }
  }
}

async function setupRegistryConfiguration(): Promise<void> {
  console.info('\n⚙️ Setting up registry configuration...');

  // Create registry configuration
  const registryConfig = {
    name: REGISTRY_CONFIG.name,
    version: REGISTRY_CONFIG.version,
    description: REGISTRY_CONFIG.description,
    private: true,
    workspaces: ['packages/*', 'packages/*/packages/*'],
    scripts: {
      build: 'bun run build:all',
      'build:all': 'bun run scripts/build-registry.ts',
      test: 'bun test',
      'test:all': 'bun run scripts/test-registry.ts',
      publish: 'bun run scripts/publish-registry.ts',
      'security:audit': 'bun run scripts/security-audit.ts',
      'compliance:check': 'bun run scripts/compliance-check.ts',
    },
    bun: {
      registry: 'https://registry.npmjs.org/',
      install: {
        production: false,
        dev: true,
        optional: true,
      },
    },
  };

  writeJsonFile('package.json', registryConfig);

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: ['bun-types'],
    },
  };

  writeJsonFile('tsconfig.json', tsconfig);

  // Create bunfig.toml
  const bunfigContent = `# Fire22 Fantasy42 Registry Configuration
# Generated by setup-fantasy42-registry.ts

[install]
registry = "https://registry.npmjs.org"
exact = false
frozenLockfile = false
production = false

[install.scopes]
"@fire22" = { url = "https://registry.npmjs.org" }

[test]
root = "./packages"
coverage = true
timeout = 30000

[build]
target = "bun"
minify = false
sourcemap = true

[dashboard]
serve_dashboard = false
`;
  writeFileSync('bunfig.toml', bunfigContent);
  console.info('📝 Created configuration files');
}

async function setupScripts(): Promise<void> {
  console.info('\n📜 Setting up utility scripts...');

  const scriptsDir = join(process.cwd(), 'scripts');
  createDirectory(scriptsDir);

  // Build registry script
  const buildScript = `#!/usr/bin/env bun

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

async function buildAllPackages() {
  console.info('🏗️ Building all registry packages...');

  const packagesDir = join(process.cwd(), 'packages');

  async function buildPackage(packagePath: string) {
    const packageJson = join(packagePath, 'package.json');

    if (existsSync(packageJson)) {
      console.info(\`📦 Building \${packagePath}...\`);
      const success = await runCommand(\`cd \${packagePath} && bun run build\`, \`Building \${packagePath}\`);
      if (!success) {
        console.error(\`❌ Failed to build \${packagePath}\`);
      }
    }
  }

  async function walkDirectory(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        await walkDirectory(fullPath);
        await buildPackage(fullPath);
      }
    }
  }

  await walkDirectory(packagesDir);
  console.info('✅ Registry build completed');
}

buildAllPackages();
`;

  writeFileSync(join(scriptsDir, 'build-registry.ts'), buildScript);

  // Test registry script
  const testScript = `#!/usr/bin/env bun

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

async function testAllPackages() {
  console.info('🧪 Testing all registry packages...');

  const packagesDir = join(process.cwd(), 'packages');

  async function testPackage(packagePath: string) {
    const packageJson = join(packagePath, 'package.json');

    if (existsSync(packageJson)) {
      console.info(\`🧪 Testing \${packagePath}...\`);
      const success = await runCommand(\`cd \${packagePath} && bun test\`, \`Testing \${packagePath}\`);
      if (!success) {
        console.error(\`❌ Tests failed for \${packagePath}\`);
      }
    }
  }

  async function walkDirectory(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        await walkDirectory(fullPath);
        await testPackage(fullPath);
      }
    }
  }

  await walkDirectory(packagesDir);
  console.info('✅ Registry tests completed');
}

testAllPackages();
`;

  writeFileSync(join(scriptsDir, 'test-registry.ts'), testScript);

  // Security audit script
  const securityScript = `#!/usr/bin/env bun

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

async function auditAllPackages() {
  console.info('🔒 Auditing all registry packages...');

  const packagesDir = join(process.cwd(), 'packages');
  let totalPackages = 0;
  let vulnerabilities = 0;

  async function auditPackage(packagePath: string) {
    const packageJson = join(packagePath, 'package.json');

    if (existsSync(packageJson)) {
      totalPackages++;
      console.info(\`🔍 Auditing \${packagePath}...\`);

      // Run security audit
      const success = await runCommand(
        \`cd \${packagePath} && bunx audit\`,
        \`Security audit for \${packagePath}\`
      );

      if (!success) {
        vulnerabilities++;
        console.error(\`⚠️ Security issues found in \${packagePath}\`);
      }
    }
  }

  async function walkDirectory(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        await walkDirectory(fullPath);
        await auditPackage(fullPath);
      }
    }
  }

  await walkDirectory(packagesDir);

  console.info(\`\\n📊 Security Audit Summary:\`);
  console.info(\`Total packages: \${totalPackages}\`);
  console.info(\`Packages with vulnerabilities: \${vulnerabilities}\`);

  if (vulnerabilities === 0) {
    console.info('✅ All packages passed security audit');
  } else {
    console.info('⚠️ Security issues found - review and fix');
    process.exit(1);
  }
}

auditAllPackages();
`;

  writeFileSync(join(scriptsDir, 'security-audit.ts'), securityScript);

  console.info('📜 Created utility scripts');
}

async function installDependencies(): Promise<void> {
  console.info('\n📦 Installing dependencies...');

  const success = await runCommand('bun install', 'Installing all dependencies');
  if (!success) {
    console.error('❌ Failed to install dependencies');
    return;
  }

  console.info('✅ Dependencies installed successfully');
}

async function runInitialBuild(): Promise<void> {
  console.info('\n🏗️ Running initial build...');

  const success = await runCommand('bun run build:all', 'Building all packages');
  if (!success) {
    console.error('❌ Initial build failed');
    return;
  }

  console.info('✅ Initial build completed successfully');
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

async function main() {
  console.info('🚀 Starting Fantasy42 Registry Setup...\n');

  try {
    // Step 1: Setup registry structure
    await setupRegistryStructure();

    // Step 2: Setup configuration files
    await setupRegistryConfiguration();

    // Step 3: Setup utility scripts
    await setupScripts();

    // Step 4: Install dependencies
    await installDependencies();

    // Step 5: Run initial build
    await runInitialBuild();

    console.info('\n🎉 Fantasy42 Registry Setup Complete!');
    console.info('=====================================');
    console.info('');
    console.info('📦 Registry packages created:');
    console.info(`   Core Security: ${REGISTRY_CONFIG.packages['core-security'].length} packages`);
    console.info(`   Betting Engine: ${REGISTRY_CONFIG.packages['betting-engine'].length} packages`);
    console.info(
      `   Payment Processing: ${REGISTRY_CONFIG.packages['payment-processing'].length} packages`
    );
    console.info(
      `   Analytics Dashboard: ${REGISTRY_CONFIG.packages['analytics-dashboard'].length} packages`
    );
    console.info(
      `   Cloudflare Infrastructure: ${REGISTRY_CONFIG.packages['cloudflare-infrastructure'].length} packages`
    );
    console.info(
      `   User Management: ${REGISTRY_CONFIG.packages['user-management'].length} packages`
    );
    console.info(`   Dev Tooling: ${REGISTRY_CONFIG.packages['dev-tooling'].length} packages`);
    console.info(`   Compliance: ${REGISTRY_CONFIG.packages['compliance'].length} packages`);
    console.info('');
    console.info('🛠️ Available commands:');
    console.info('   bun run build          # Build all packages');
    console.info('   bun run test           # Run all tests');
    console.info('   bun run security:audit # Run security audit');
    console.info('   bun run compliance:check # Run compliance checks');
    console.info('');
    console.info('📚 Next steps:');
    console.info('   1. Review generated packages in ./packages/');
    console.info('   2. Customize package implementations');
    console.info('   3. Run tests: bun run test');
    console.info('   4. Build packages: bun run build');
    console.info('   5. Publish to registry when ready');
    console.info('');
    console.info('🔗 Useful commands:');
    console.info('   bun run version:manager load    # Load workspace metadata');
    console.info('   bun run version:manager bump patch --commit --tag --push');
    console.info('   bunx wrangler deploy            # Deploy to Cloudflare');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.main) {
  main();
}

export { REGISTRY_CONFIG };
export default main;
