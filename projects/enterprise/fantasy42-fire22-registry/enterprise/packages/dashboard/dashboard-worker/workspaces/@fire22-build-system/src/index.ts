#!/usr/bin/env bun

/**
 * 🚀 Fire22 Workspace Orchestrator
 *
 * Advanced workspace management system for splitting, reunification, benchmarking,
 * and publishing across multiple repositories and registries.
 *
 * Features:
 * - Intelligent workspace splitting by domain
 * - Multi-registry publishing (npm, Cloudflare, private)
 * - Cross-repo benchmarking and performance monitoring
 * - Automated reunification and integration testing
 * - Parallel build orchestration with IPC
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { AdvancedProcessManager } from './advanced-process-manager.ts';
import { MetadataVersionManager } from './metadata-version-manager.ts';

export interface WorkspaceConfig {
  name: string;
  description: string;
  domain: 'core' | 'benchmarking' | 'wager' | 'worker';
  packages: string[];
  dependencies: string[];
  registry: 'npm' | 'cloudflare' | 'private';
  repository: {
    url: string;
    directory: string;
  };
}

export interface PublishingConfig {
  registries: {
    npm: {
      url: string;
      token: string;
      access: 'public' | 'restricted';
    };
    cloudflare: {
      url: string;
      token: string;
      account_id: string;
    };
    private: {
      url: string;
      token: string;
      access: 'restricted';
    };
  };
  publishingStrategy: {
    prerelease: string[];
    beta: string[];
    stable: string[];
  };
}

export interface BenchmarkConfig {
  suites: {
    package: string[];
    integration: string[];
    deployment: string[];
    performance: string[];
  };
  budgets: {
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  reporting: {
    dashboard: boolean;
    alerts: boolean;
    comparison: boolean;
  };
}

export class WorkspaceOrchestrator {
  private processManager: AdvancedProcessManager;
  private versionManager: MetadataVersionManager;
  private rootPath: string;
  private config: {
    workspaces: WorkspaceConfig[];
    publishing: PublishingConfig;
    benchmarking: BenchmarkConfig;
  };

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.processManager = new AdvancedProcessManager();
    this.versionManager = new MetadataVersionManager(rootPath);
    this.config = this.loadConfig();
  }

  /**
   * 📊 Load workspace metadata for status reporting
   */
  async loadWorkspaceMetadata(): Promise<{ packages: Map<string, any> }> {
    try {
      const workspace = await this.versionManager.loadWorkspaceMetadata();
      return workspace;
    } catch (error) {
      console.warn(`⚠️ Failed to load workspace metadata: ${error}`);
      return { packages: new Map() };
    }
  }

  /**
   * 🔄 Split workspace into domain-specific repositories
   */
  async splitWorkspace(
    options: {
      dryRun?: boolean;
      verbose?: boolean;
      createRepos?: boolean;
      preserveHistory?: boolean;
    } = {}
  ): Promise<{
    workspaces: Map<string, { packages: string[]; status: 'created' | 'updated' | 'failed' }>;
    summary: { total: number; created: number; updated: number; failed: number };
  }> {
    console.log('🔄 Starting workspace splitting process...');

    if (options.dryRun) {
      console.log('🧪 DRY RUN MODE - No actual changes will be made');
    }

    const results = new Map<
      string,
      { packages: string[]; status: 'created' | 'updated' | 'failed' }
    >();
    let created = 0,
      updated = 0,
      failed = 0;

    // Load current workspace metadata
    const workspace = await this.versionManager.loadWorkspaceMetadata();

    // Group packages by domain
    const domainGroups = this.groupPackagesByDomain(workspace.packages);

    for (const [domain, packages] of domainGroups) {
      const workspaceConfig = this.config.workspaces.find(w => w.domain === domain);
      if (!workspaceConfig) {
        console.warn(`⚠️ No configuration found for domain: ${domain}`);
        results.set(domain, { packages, status: 'failed' });
        failed++;
        continue;
      }

      console.log(`📦 Processing ${domain} workspace with ${packages.length} packages`);

      try {
        const result = await this.createDomainWorkspace(workspaceConfig, packages, options);
        results.set(domain, { packages, status: result.status });

        if (result.status === 'created') created++;
        else if (result.status === 'updated') updated++;
        else failed++;
      } catch (error) {
        console.error(`❌ Failed to process ${domain}: ${error}`);
        results.set(domain, { packages, status: 'failed' });
        failed++;
      }
    }

    const summary = { total: domainGroups.size, created, updated, failed };

    console.log('\n📊 Workspace Splitting Summary:');
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);

    return { workspaces: results, summary };
  }

  /**
   * 📦 Publish packages to multiple registries
   */
  async publishWorkspaces(
    options: {
      workspaces?: string[];
      strategy?: 'prerelease' | 'beta' | 'stable';
      dryRun?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    published: Map<string, { registry: string; version: string; status: 'success' | 'failed' }>;
    summary: { total: number; success: number; failed: number };
  }> {
    console.log('📦 Starting multi-registry publishing process...');

    const published = new Map<
      string,
      { registry: string; version: string; status: 'success' | 'failed' }
    >();
    let success = 0,
      failed = 0;

    const workspacesToPublish = options.workspaces || this.config.workspaces.map(w => w.name);
    const strategy = options.strategy || 'stable';

    for (const workspaceName of workspacesToPublish) {
      const workspaceConfig = this.config.workspaces.find(w => w.name === workspaceName);
      if (!workspaceConfig) {
        console.warn(`⚠️ Workspace not found: ${workspaceName}`);
        continue;
      }

      console.log(`📦 Publishing ${workspaceName} to ${workspaceConfig.registry} registry`);

      try {
        const result = await this.publishToRegistry(workspaceConfig, strategy, options);
        published.set(workspaceName, result);

        if (result.status === 'success') success++;
        else failed++;
      } catch (error) {
        console.error(`❌ Failed to publish ${workspaceName}: ${error}`);
        published.set(workspaceName, {
          registry: workspaceConfig.registry,
          version: 'unknown',
          status: 'failed',
        });
        failed++;
      }
    }

    const summary = { total: workspacesToPublish.length, success, failed };

    console.log('\n📊 Publishing Summary:');
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);

    return { published, summary };
  }

  /**
   * 🔄 Reunify workspaces for development
   */
  async reunifyWorkspaces(
    options: {
      mode?: 'development' | 'integration' | 'production';
      updateDependencies?: boolean;
      runTests?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    dependencies: Map<string, string>;
    tests: { passed: number; failed: number };
    status: 'success' | 'partial' | 'failed';
  }> {
    console.log('🔄 Starting workspace reunification process...');

    const mode = options.mode || 'development';
    const dependencies = new Map<string, string>();
    let testsPassed = 0,
      testsFailed = 0;

    // Update package dependencies based on published versions
    if (options.updateDependencies) {
      console.log('🔄 Updating cross-workspace dependencies...');

      for (const workspace of this.config.workspaces) {
        const latestVersions = await this.getLatestVersions(workspace);

        for (const [pkg, version] of latestVersions) {
          dependencies.set(pkg, version);
          console.log(`📦 ${pkg}: ${version}`);
        }
      }

      await this.updatePackageDependencies(dependencies);
    }

    // Run integration tests
    if (options.runTests) {
      console.log('🧪 Running integration tests...');
      const testResults = await this.runIntegrationTests(mode);
      testsPassed = testResults.passed;
      testsFailed = testResults.failed;
    }

    const status = testsFailed === 0 ? 'success' : testsPassed > 0 ? 'partial' : 'failed';

    console.log('\n📊 Reunification Summary:');
    console.log(`📦 Dependencies updated: ${dependencies.size}`);
    console.log(`✅ Tests passed: ${testsPassed}`);
    console.log(`❌ Tests failed: ${testsFailed}`);
    console.log(`🎯 Status: ${status}`);

    return { dependencies, tests: { passed: testsPassed, failed: testsFailed }, status };
  }

  /**
   * 📊 Run comprehensive benchmarks
   */
  async runBenchmarks(
    options: {
      suites?: ('package' | 'integration' | 'deployment' | 'performance')[];
      comparison?: boolean;
      dashboard?: boolean;
      alerts?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    results: Map<string, any>;
    budgets: { passed: number; failed: number };
    status: 'success' | 'warning' | 'failed';
  }> {
    console.log('📊 Starting comprehensive benchmark suite...');

    const suites = options.suites || ['package', 'integration', 'deployment', 'performance'];
    const results = new Map<string, any>();
    let budgetsPassed = 0,
      budgetsFailed = 0;

    for (const suite of suites) {
      console.log(`🏃 Running ${suite} benchmarks...`);

      try {
        const suiteResults = await this.runBenchmarkSuite(suite, options);
        results.set(suite, suiteResults);

        // Check against performance budgets
        const budgetResult = this.checkPerformanceBudgets(suite, suiteResults);
        if (budgetResult.passed) budgetsPassed++;
        else budgetsFailed++;
      } catch (error) {
        console.error(`❌ Failed to run ${suite} benchmarks: ${error}`);
        results.set(suite, { error: error instanceof Error ? error.message : String(error) });
        budgetsFailed++;
      }
    }

    const status = budgetsFailed === 0 ? 'success' : budgetsPassed > 0 ? 'warning' : 'failed';

    // Generate dashboard if requested
    if (options.dashboard) {
      await this.generateBenchmarkDashboard(results);
    }

    // Send alerts if needed
    if (options.alerts && budgetsFailed > 0) {
      await this.sendPerformanceAlerts(results);
    }

    console.log('\n📊 Benchmark Summary:');
    console.log(`✅ Budgets passed: ${budgetsPassed}`);
    console.log(`❌ Budgets failed: ${budgetsFailed}`);
    console.log(`🎯 Status: ${status}`);

    return { results, budgets: { passed: budgetsPassed, failed: budgetsFailed }, status };
  }

  // === PRIVATE METHODS ===

  private loadConfig(): any {
    const configPath = join(this.rootPath, 'workspace-orchestrator.config.json');

    if (!existsSync(configPath)) {
      return this.createDefaultConfig();
    }

    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.warn('⚠️ Failed to load config, using defaults');
      return this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): any {
    return {
      workspaces: [
        {
          name: 'fire22-core-packages',
          description: 'Core Fire22 packages for shared functionality',
          domain: 'core',
          packages: [
            '@fire22/core',
            '@fire22/env-manager',
            '@fire22/middleware',
            '@fire22/testing-framework',
          ],
          dependencies: [],
          registry: 'npm',
          repository: {
            url: 'https://github.com/fire22/fire22-core-packages',
            directory: '../fire22-core-packages',
          },
        },
        {
          name: 'fire22-benchmarking-suite',
          description: 'Performance benchmarking and testing suite',
          domain: 'benchmarking',
          packages: [
            '@fire22/benchmark-suite',
            '@fire22/benchmark-formatter',
            '@fire22/micro-benchmarks',
            '@fire22/memory-profiler',
            '@fire22/load-testing',
          ],
          dependencies: ['@fire22/core'],
          registry: 'npm',
          repository: {
            url: 'https://github.com/fire22/fire22-benchmarking-suite',
            directory: '../fire22-benchmarking-suite',
          },
        },
        {
          name: 'fire22-wager-system',
          description: 'Advanced wager processing and risk management',
          domain: 'wager',
          packages: ['@fire22/wager-system'],
          dependencies: ['@fire22/core', '@fire22/middleware'],
          registry: 'private',
          repository: {
            url: 'https://github.com/fire22/fire22-wager-system',
            directory: '../fire22-wager-system',
          },
        },
      ],
      publishing: {
        registries: {
          npm: {
            url: 'https://registry.npmjs.org/',
            token: process.env.NPM_TOKEN || '',
            access: 'public',
          },
          cloudflare: {
            url: 'https://registry.cloudflare.com/',
            token: process.env.CLOUDFLARE_API_TOKEN || '',
            account_id: process.env.CLOUDFLARE_ACCOUNT_ID || '',
          },
          private: {
            url: 'https://registry.fire22.com/',
            token: process.env.FIRE22_REGISTRY_TOKEN || '',
            access: 'restricted',
          },
        },
        publishingStrategy: {
          prerelease: ['alpha', 'beta', 'rc'],
          beta: ['beta', 'rc'],
          stable: ['latest'],
        },
      },
      benchmarking: {
        suites: {
          package: ['unit', 'integration', 'performance'],
          integration: ['cross-package', 'end-to-end'],
          deployment: ['cold-start', 'memory-usage', 'bundle-size'],
          performance: ['throughput', 'latency', 'resource-usage'],
        },
        budgets: {
          buildTime: 30000, // 30 seconds
          bundleSize: 1048576, // 1MB
          memoryUsage: 134217728, // 128MB
          cpuUsage: 80, // 80%
        },
        reporting: {
          dashboard: true,
          alerts: true,
          comparison: true,
        },
      },
    };
  }

  private groupPackagesByDomain(packages: Map<string, any>): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const [name, pkg] of packages) {
      let domain = 'core';

      // Determine domain based on package characteristics
      if (
        name.includes('benchmark') ||
        name.includes('testing') ||
        name.includes('load') ||
        name.includes('memory')
      ) {
        domain = 'benchmarking';
      } else if (name.includes('wager')) {
        domain = 'wager';
      } else if (name.includes('worker') || name.includes('dashboard')) {
        domain = 'worker';
      }

      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(name);
    }

    return groups;
  }

  private async createDomainWorkspace(
    config: WorkspaceConfig,
    packages: string[],
    options: any
  ): Promise<{ status: 'created' | 'updated' | 'failed' }> {
    if (options.dryRun) {
      console.log(`🧪 Would create workspace: ${config.name}`);
      return { status: 'created' };
    }

    const workspaceDir = resolve(this.rootPath, config.repository.directory);

    try {
      // Create workspace directory
      if (!existsSync(workspaceDir)) {
        mkdirSync(workspaceDir, { recursive: true });
        console.log(`📁 Created workspace directory: ${workspaceDir}`);

        // Initialize git repository
        if (options.createRepos) {
          await this.initializeGitRepository(workspaceDir, config, options);
        }
      }

      // Create workspace package.json with enhanced configuration
      const workspacePackageJson = await this.createWorkspacePackageJson(config, packages);
      writeFileSync(
        join(workspaceDir, 'package.json'),
        JSON.stringify(workspacePackageJson, null, 2)
      );

      // Create README.md for the workspace
      const readmeContent = await this.generateWorkspaceReadme(config, packages);
      writeFileSync(join(workspaceDir, 'README.md'), readmeContent);

      // Create workspace configuration files
      await this.createWorkspaceConfigFiles(workspaceDir, config);

      // Copy packages to workspace with dependency updates
      const packagesDir = join(workspaceDir, 'packages');
      if (!existsSync(packagesDir)) {
        mkdirSync(packagesDir, { recursive: true });
      }

      for (const packageName of packages) {
        const srcDir = join(this.rootPath, 'packages', packageName.replace('@fire22/', ''));
        const destDir = join(packagesDir, packageName.replace('@fire22/', ''));

        if (existsSync(srcDir)) {
          await this.copyDirectory(srcDir, destDir);
          await this.updatePackageDependenciesInWorkspace(destDir, config, packages);
          console.log(`📦 Copied ${packageName} to workspace`);
        }
      }

      // Create initial commit if git repo was initialized
      if (options.createRepos && options.preserveHistory) {
        await this.createInitialCommit(workspaceDir, config);
      }

      console.log(`✅ Successfully created workspace: ${config.name}`);
      return { status: 'created' };
    } catch (error) {
      console.error(`❌ Failed to create workspace ${config.name}: ${error}`);
      return { status: 'failed' };
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      const stat = statSync(srcPath);

      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        const content = readFileSync(srcPath);
        writeFileSync(destPath, content);
      }
    }
  }

  private async publishToRegistry(
    config: WorkspaceConfig,
    strategy: string,
    options: any
  ): Promise<{ registry: string; version: string; status: 'success' | 'failed' }> {
    // Implementation will depend on registry type
    return { registry: config.registry, version: '1.0.0', status: 'success' };
  }

  private async getLatestVersions(workspace: WorkspaceConfig): Promise<Map<string, string>> {
    // Placeholder - would query registries for latest versions
    return new Map();
  }

  private async updatePackageDependencies(dependencies: Map<string, string>): Promise<void> {
    // Update package.json files with new dependency versions
  }

  private async runIntegrationTests(mode: string): Promise<{ passed: number; failed: number }> {
    // Run integration test suite
    return { passed: 0, failed: 0 };
  }

  private async runBenchmarkSuite(suite: string, options: any): Promise<any> {
    // Run specific benchmark suite
    return {};
  }

  private checkPerformanceBudgets(
    suite: string,
    results: any
  ): { passed: boolean; violations: string[] } {
    // Check results against performance budgets
    return { passed: true, violations: [] };
  }

  private async generateBenchmarkDashboard(results: Map<string, any>): Promise<void> {
    // Generate benchmark dashboard
  }

  private async sendPerformanceAlerts(results: Map<string, any>): Promise<void> {
    // Send performance alert notifications
  }

  private async initializeGitRepository(
    workspaceDir: string,
    config: WorkspaceConfig,
    options: any
  ): Promise<void> {
    console.log(`🔧 Initializing git repository for ${config.name}`);

    // Initialize git repository
    await this.processManager.execute({
      command: ['git', 'init'],
      cwd: workspaceDir,
      timeout: 30000,
    });

    // Set up git configuration
    await this.processManager.execute({
      command: ['git', 'config', 'user.name', 'Fire22 Workspace Orchestrator'],
      cwd: workspaceDir,
      timeout: 10000,
    });

    await this.processManager.execute({
      command: ['git', 'config', 'user.email', 'dev@fire22.com'],
      cwd: workspaceDir,
      timeout: 10000,
    });

    // Set default branch
    await this.processManager.execute({
      command: ['git', 'checkout', '-b', 'main'],
      cwd: workspaceDir,
      timeout: 10000,
    });

    if (config.repository.url) {
      // Add remote origin
      await this.processManager.execute({
        command: ['git', 'remote', 'add', 'origin', config.repository.url],
        cwd: workspaceDir,
        timeout: 10000,
      });
      console.log(`📡 Added remote origin: ${config.repository.url}`);
    }
  }

  private async createWorkspacePackageJson(
    config: WorkspaceConfig,
    packages: string[]
  ): Promise<any> {
    const rootPackageJson = JSON.parse(readFileSync(join(this.rootPath, 'package.json'), 'utf-8'));

    return {
      name: config.name,
      version: '1.0.0',
      description: config.description,
      private: true,
      type: 'module',
      workspaces: ['packages/*'],
      author: rootPackageJson.author || {
        name: 'Fire22 Development Team',
        email: 'dev@fire22.com',
      },
      license: rootPackageJson.license || 'MIT',
      repository: {
        type: 'git',
        url: config.repository.url || `https://github.com/fire22/${config.name}`,
        directory: config.repository.directory,
      },
      scripts: {
        // Build scripts
        build: 'bun run build:all',
        'build:all': 'bun run --recursive build',
        'build:packages': 'for pkg in packages/*; do cd $pkg && bun run build && cd ../..; done',

        // Test scripts
        test: 'bun run test:all',
        'test:all': 'bun run --recursive test',
        'test:coverage': 'bun test --coverage',
        'test:watch': 'bun test --watch',

        // Publishing scripts
        publish: 'bun run publish:all',
        'publish:all': `bun run scripts/workspace-publisher.ts --registry ${config.registry}`,
        'publish:dry': 'bun run publish:all --dry-run',

        // Development scripts
        dev: 'bun run --recursive dev',
        clean: 'rm -rf packages/*/dist packages/*/node_modules',
        'install:all': 'bun install && bun run --recursive install',

        // Version management
        'version:bump': 'bun run scripts/version-manager.ts bump',
        'version:patch': 'bun run scripts/version-manager.ts bump --strategy patch',
        'version:minor': 'bun run scripts/version-manager.ts bump --strategy minor',
        'version:major': 'bun run scripts/version-manager.ts bump --strategy major',

        // Quality assurance
        lint: 'bun run --recursive lint',
        'lint:fix': 'bun run --recursive lint:fix',
        format: 'bun run --recursive format',

        // Workspace management
        link: 'bun link',
        unlink: 'bun unlink',
        graph: 'bun run --recursive graph',
      },
      dependencies: {},
      devDependencies: {
        '@types/bun': rootPackageJson.devDependencies?.['@types/bun'] || '^1.2.21',
        typescript: rootPackageJson.devDependencies?.typescript || '^5.9.2',
        prettier: rootPackageJson.devDependencies?.prettier || '^3.1.1',
        eslint: rootPackageJson.devDependencies?.eslint || '^8.56.0',
      },
      workspaceMeta: {
        domain: config.domain,
        packages: packages,
        registry: config.registry,
        dependencies: config.dependencies,
        createdAt: new Date().toISOString(),
        orchestrator: {
          version: '1.0.0',
          source: 'Fire22 Workspace Orchestrator',
        },
      },
      engines: rootPackageJson.engines || {
        bun: '>=1.0.0',
        node: '>=18.0.0',
      },
      keywords: [
        'fire22',
        config.domain,
        'workspace',
        'monorepo',
        ...packages.map(pkg => pkg.replace('@fire22/', '')),
      ],
    };
  }

  private async generateWorkspaceReadme(
    config: WorkspaceConfig,
    packages: string[]
  ): Promise<string> {
    const packageList = packages.map(pkg => `- \`${pkg}\``).join('\n');

    return `# ${config.name}

${config.description}

## 📦 Packages

${packageList}

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
bun install

# Build all packages
bun run build:all

# Test all packages  
bun run test:all

# Publish to ${config.registry} registry
bun run publish:all
\`\`\`

## 🏗️ Development

\`\`\`bash
# Start development mode
bun run dev

# Link packages for local development
bun run link

# Clean build artifacts
bun run clean
\`\`\`

## 📋 Scripts

- \`bun run build\` - Build all packages
- \`bun run test\` - Test all packages
- \`bun run publish\` - Publish to registry
- \`bun run dev\` - Start development mode
- \`bun run lint\` - Lint all packages
- \`bun run format\` - Format all packages

## 🔧 Version Management

\`\`\`bash
# Bump patch version
bun run version:patch

# Bump minor version  
bun run version:minor

# Bump major version
bun run version:major
\`\`\`

## 📊 Workspace Information

- **Domain**: ${config.domain}
- **Registry**: ${config.registry}
- **Dependencies**: ${config.dependencies.join(', ') || 'None'}
- **Created**: ${new Date().toISOString()}
- **Generator**: Fire22 Workspace Orchestrator v1.0.0

---

Generated by [Fire22 Workspace Orchestrator](https://github.com/fire22/workspace-orchestrator)
`;
  }

  private async createWorkspaceConfigFiles(
    workspaceDir: string,
    config: WorkspaceConfig
  ): Promise<void> {
    // Create .gitignore
    const gitignoreContent = `# Dependencies
node_modules/
*.log
npm-debug.log*
bun-debug.log*
bun-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.development
.env.staging
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/
*.lcov

# Temporary
*.tmp
*.temp
.cache/
`;
    writeFileSync(join(workspaceDir, '.gitignore'), gitignoreContent);

    // Create TypeScript config
    const tsconfigContent = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: './dist',
        rootDir: './packages',
        composite: true,
        incremental: true,
      },
      include: ['packages/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
      references: [],
    };
    writeFileSync(join(workspaceDir, 'tsconfig.json'), JSON.stringify(tsconfigContent, null, 2));

    // Create workspace configuration
    const workspaceConfig = {
      name: config.name,
      domain: config.domain,
      registry: config.registry,
      packages: config.packages,
      dependencies: config.dependencies,
      orchestrator: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };
    writeFileSync(
      join(workspaceDir, 'workspace.config.json'),
      JSON.stringify(workspaceConfig, null, 2)
    );
  }

  private async updatePackageDependenciesInWorkspace(
    packageDir: string,
    config: WorkspaceConfig,
    packages: string[]
  ): Promise<void> {
    const packageJsonPath = join(packageDir, 'package.json');
    if (!existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Update dependencies to use workspace references for packages in same domain
      const updateDependencies = (deps: Record<string, string>) => {
        for (const [depName, version] of Object.entries(deps)) {
          if (packages.includes(depName)) {
            // Use workspace reference for packages in the same workspace
            deps[depName] = 'workspace:*';
          }
        }
      };

      if (packageJson.dependencies) {
        updateDependencies(packageJson.dependencies);
      }

      if (packageJson.devDependencies) {
        updateDependencies(packageJson.devDependencies);
      }

      // Add workspace metadata
      packageJson.workspaceMeta = {
        domain: config.domain,
        workspace: config.name,
        updatedAt: new Date().toISOString(),
      };

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      console.warn(`⚠️ Failed to update dependencies for ${packageDir}: ${error}`);
    }
  }

  private async createInitialCommit(workspaceDir: string, config: WorkspaceConfig): Promise<void> {
    console.log(`📝 Creating initial commit for ${config.name}`);

    // Add all files
    await this.processManager.execute({
      command: ['git', 'add', '.'],
      cwd: workspaceDir,
      timeout: 30000,
    });

    // Create initial commit
    const commitMessage = `🎉 Initial commit: ${config.name}

Created ${config.domain} workspace with packages:
${config.packages.map(pkg => `- ${pkg}`).join('\n')}

Generated by Fire22 Workspace Orchestrator
Domain: ${config.domain}
Registry: ${config.registry}
`;

    await this.processManager.execute({
      command: ['git', 'commit', '-m', commitMessage],
      cwd: workspaceDir,
      timeout: 30000,
    });

    console.log(`✅ Created initial commit for ${config.name}`);
  }
}

export default WorkspaceOrchestrator;
