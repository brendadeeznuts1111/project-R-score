#!/usr/bin/env bun

/**
 * 🏗️ Fire22 Workspace Isolator
 *
 * Creates isolated workspace environments with both linked and non-linked versions.
 * Each workspace gets its own complete environment with proper isolation while
 * maintaining the ability to link for development or run standalone for production.
 *
 * Features:
 * - Individual workspace isolation
 * - Linked versions (development with workspace:* dependencies)
 * - Standalone versions (production with resolved dependencies)
 * - Independent package.json and configs for each workspace
 * - Separate build outputs and deployment targets
 * - Cross-workspace dependency management
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { Logger, PerformanceTimer } from './shared-utilities.ts';

interface WorkspaceIsolationConfig {
  name: string;
  packageName: string;
  version: string;
  description: string;
  main: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
  include: string[];
  exclude?: string[];
  cloudflare?: any;
  isolation: {
    standalone: boolean;
    linked: boolean;
    separateTests: boolean;
    independentDeploy: boolean;
  };
}

export class WorkspaceIsolator {
  private rootPath: string;
  private workspacesPath: string;
  private config: any;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.workspacesPath = join(rootPath, 'workspaces');
    this.config = this.loadWorkspaceConfig();
  }

  /**
   * 🚀 Create all isolated workspaces
   */
  async createAllIsolatedWorkspaces(): Promise<void> {
    const timer = new PerformanceTimer('workspace-isolation');
    Logger.info('🏗️  Fire22 Workspace Isolator v1.0.0');
    Logger.info('='.repeat(60));
    Logger.info('🔨 Creating isolated workspace environments...');

    const workspaces = Object.entries(this.config.workspaces);
    Logger.info(`📦 Processing ${workspaces.length} workspaces`);

    for (const [workspaceKey, workspace] of workspaces) {
      const workspaceConfig = workspace as any;
      Logger.info(`
🔧 Isolating workspace: ${workspaceConfig.name}`);

      // Create workspace isolation config
      const isolationConfig = this.createIsolationConfig(workspaceKey, workspaceConfig);

      // Create isolated workspace environment
      await this.createIsolatedWorkspace(workspaceKey, isolationConfig);

      // Create linked version (development)
      await this.createLinkedVersion(workspaceKey, isolationConfig);

      // Create standalone version (production)
      await this.createStandaloneVersion(workspaceKey, isolationConfig);

      Logger.info(`✅ ${workspaceConfig.name} isolation complete`);
    }

    // Create workspace orchestration files
    await this.createWorkspaceOrchestration();

    const performance = timer.finish();
    Logger.info(`
🎉 Workspace isolation completed in ${performance.totalTime}ms`);
    this.logIsolationSummary();
  }
  /**
   * 🔧 Create isolation configuration
   */
  private createIsolationConfig(workspaceKey: string, workspace: any): WorkspaceIsolationConfig {
    return {
      name: workspaceKey,
      packageName: workspace.name,
      version: workspace.version,
      description: workspace.description,
      main: workspace.main,
      dependencies: workspace.dependencies || {},
      devDependencies: {
        '@types/bun': '^1.2.21',
        typescript: '^5.9.2',
      },
      scripts: {
        dev: 'bun run src/index.ts',
        build: 'bun build src/index.ts --outdir dist --target bun --format esm',
        'build:standalone':
          'bun build src/index.ts --outdir dist/standalone --target bun --format esm --minify',
        'build:cloudflare':
          'bun build src/index.ts --outdir dist/cloudflare --target bun --format esm --minify',
        test: 'bun test',
        'test:watch': 'bun test --watch',
        lint: 'bunx eslint src/',
        typecheck: 'bunx tsc --noEmit',
        'deploy:linked': 'wrangler deploy --config wrangler.linked.toml',
        'deploy:standalone': 'wrangler deploy --config wrangler.standalone.toml',
      },
      include: workspace.include || [],
      exclude: workspace.exclude || [],
      cloudflare: workspace.cloudflare,
      isolation: {
        standalone: true,
        linked: true,
        separateTests: true,
        independentDeploy: true,
      },
    };
  }

  /**
   * 🏗️ Create isolated workspace environment
   */
  private async createIsolatedWorkspace(
    workspaceKey: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const workspacePath = join(this.workspacesPath, workspaceKey);

    // Ensure workspace directory structure
    const dirs = [
      'src',
      'dist',
      'dist/linked',
      'dist/standalone',
      'dist/cloudflare',
      'tests',
      'docs',
      '.wrangler',
      'node_modules',
    ];

    dirs.forEach(dir => {
      const dirPath = join(workspacePath, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    });

    // Create base package.json
    await this.createPackageJson(workspacePath, config);

    // Create TypeScript config
    await this.createTypeScriptConfig(workspacePath, config);

    // Create workspace README
    await this.createWorkspaceReadme(workspacePath, config);

    // Copy source files
    await this.copySourceFiles(workspaceKey, config, workspacePath);

    Logger.debug(`Created isolated environment: ${config.packageName}`);
  }

  /**
   * 🔗 Create linked version (development)
   */
  private async createLinkedVersion(
    workspaceKey: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const workspacePath = join(this.workspacesPath, workspaceKey);

    // Create linked package.json with workspace:* dependencies
    const linkedPackageJson = {
      name: config.packageName,
      version: config.version,
      description: `${config.description} (Linked Development Version)`,
      type: 'module',
      main: config.main,
      scripts: {
        ...config.scripts,
        build:
          'bun build src/index.ts --outdir dist/linked --target bun --format esm --external @fire22/*',
        dev: 'bun run --watch src/index.ts',
      },
      dependencies: config.dependencies, // Keep workspace:* dependencies
      devDependencies: config.devDependencies,
      workspaces: {
        linked: true,
        development: true,
      },
      fire22: {
        workspace: workspaceKey,
        isolation: 'linked',
        buildTarget: 'development',
      },
    };

    writeFileSync(
      join(workspacePath, 'package.linked.json'),
      JSON.stringify(linkedPackageJson, null, 2)
    );

    // Create linked Wrangler config
    if (config.cloudflare) {
      const linkedWranglerConfig = {
        name: `${workspaceKey}-linked`,
        compatibility_date: config.cloudflare.compatibility_date,
        compatibility_flags: config.cloudflare.compatibility_flags,
        main: 'dist/linked/index.js',
        ...config.cloudflare,
        vars: {
          WORKSPACE_MODE: 'linked',
          WORKSPACE_NAME: config.packageName,
          BUILD_TARGET: 'development',
        },
      };

      writeFileSync(
        join(workspacePath, 'wrangler.linked.toml'),
        this.tomlStringify(linkedWranglerConfig)
      );
    }

    Logger.debug(`Created linked version: ${config.packageName}`);
  }

  /**
   * 📦 Create standalone version (production)
   */
  private async createStandaloneVersion(
    workspaceKey: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const workspacePath = join(this.workspacesPath, workspaceKey);

    // Resolve workspace:* dependencies to actual versions
    const resolvedDependencies = this.resolveDependencies(config.dependencies);

    // Create standalone package.json with resolved dependencies
    const standalonePackageJson = {
      name: `${config.packageName}-standalone`,
      version: config.version,
      description: `${config.description} (Standalone Production Version)`,
      type: 'module',
      main: config.main,
      scripts: {
        ...config.scripts,
        build:
          'bun build src/index.ts --outdir dist/standalone --target bun --format esm --minify --splitting',
        start: 'bun run dist/standalone/index.js',
      },
      dependencies: resolvedDependencies, // Resolved actual dependencies
      devDependencies: config.devDependencies,
      workspaces: {
        linked: false,
        standalone: true,
      },
      fire22: {
        workspace: workspaceKey,
        isolation: 'standalone',
        buildTarget: 'production',
      },
    };

    writeFileSync(
      join(workspacePath, 'package.standalone.json'),
      JSON.stringify(standalonePackageJson, null, 2)
    );

    // Create standalone Wrangler config
    if (config.cloudflare) {
      const standaloneWranglerConfig = {
        name: `${workspaceKey}-standalone`,
        compatibility_date: config.cloudflare.compatibility_date,
        compatibility_flags: config.cloudflare.compatibility_flags,
        main: 'dist/standalone/index.js',
        ...config.cloudflare,
        vars: {
          WORKSPACE_MODE: 'standalone',
          WORKSPACE_NAME: config.packageName,
          BUILD_TARGET: 'production',
        },
      };

      writeFileSync(
        join(workspacePath, 'wrangler.standalone.toml'),
        this.tomlStringify(standaloneWranglerConfig)
      );
    }

    Logger.debug(`Created standalone version: ${config.packageName}`);
  }

  /**
   * 📄 Create package.json for workspace
   */
  private async createPackageJson(
    workspacePath: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const packageJson = {
      name: config.packageName,
      version: config.version,
      description: config.description,
      type: 'module',
      main: config.main,
      scripts: config.scripts,
      dependencies: config.dependencies,
      devDependencies: config.devDependencies,
      fire22: {
        workspace: config.name,
        isolation: {
          standalone: config.isolation.standalone,
          linked: config.isolation.linked,
          separateTests: config.isolation.separateTests,
          independentDeploy: config.isolation.independentDeploy,
        },
        include: config.include,
        exclude: config.exclude,
      },
    };

    writeFileSync(join(workspacePath, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  /**
   * 📝 Create TypeScript configuration
   */
  private async createTypeScriptConfig(
    workspacePath: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        types: ['bun-types'],
      },
      include: ['src/**/*', 'tests/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    writeFileSync(join(workspacePath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
  }

  /**
   * 📚 Create workspace README
   */
  private async createWorkspaceReadme(
    workspacePath: string,
    config: WorkspaceIsolationConfig
  ): Promise<void> {
    const readme = `# ${config.packageName}

${config.description}

## Workspace Isolation

This workspace exists in both **linked** and **standalone** modes:

### 🔗 Linked Mode (Development)
- Uses \`workspace:*\` dependencies
- Hot reloading and fast development
- Cross-workspace dependency resolution
- Run: \`bun run dev\`
- Deploy: \`bun run deploy:linked\`

### 📦 Standalone Mode (Production)
- Resolved dependencies (no workspace references)
- Optimized and minified builds
- Independent deployment
- Run: \`bun run build && bun run start\`
- Deploy: \`bun run deploy:standalone\`

## Scripts

\`\`\`bash
# Development (Linked)
bun run dev                 # Start development server
bun run build               # Build linked version
bun run deploy:linked       # Deploy linked version

# Production (Standalone)
bun run build:standalone    # Build standalone version
bun run deploy:standalone   # Deploy standalone version

# Testing
bun test                    # Run tests
bun run typecheck          # TypeScript checking
bun run lint               # Lint code
\`\`\`

## Dependencies

${Object.entries(config.dependencies)
  .map(([dep, ver]) => `- \`${dep}\`: ${ver}`)
  .join('\\n')}

## Architecture

- **Isolation**: Each workspace is completely independent
- **Linking**: Development mode uses workspace references
- **Deployment**: Production uses resolved dependencies
- **Testing**: Isolated test environment
- **Building**: Separate build outputs for each mode
`;

    writeFileSync(join(workspacePath, 'README.md'), readme);
  }

  /**
   * 📁 Copy source files to workspace
   */
  private async copySourceFiles(
    workspaceKey: string,
    config: WorkspaceIsolationConfig,
    workspacePath: string
  ): Promise<void> {
    const srcPath = join(workspacePath, 'src');

    // Create index.ts based on workspace main file
    let mainContent = '';
    const mainFile = join(this.rootPath, config.main);

    if (existsSync(mainFile)) {
      mainContent = readFileSync(mainFile, 'utf-8');
    } else {
      // Create default index.ts
      mainContent = `/**
 * ${config.packageName}
 * ${config.description}
 *
 * Workspace: ${workspaceKey}
 * Isolation: Both linked and standalone modes supported
 */

export default {
  name: '${config.packageName}',
  version: '${config.version}',
  workspace: '${workspaceKey}',
  mode: process.env.WORKSPACE_MODE || 'development'
};

console.log('🚀 ${config.packageName} initialized');
`;
    }

    writeFileSync(join(srcPath, 'index.ts'), mainContent);

    // Copy included files
    config.include.forEach(pattern => {
      const sourcePath = join(this.rootPath, pattern);
      if (existsSync(sourcePath)) {
        const destPath = join(srcPath, pattern.split('/').pop() || 'file.ts');
        try {
          copyFileSync(sourcePath, destPath);
          Logger.debug(`Copied: ${pattern} → ${destPath}`);
        } catch (error) {
          Logger.warn(`Failed to copy ${pattern}:`, error);
        }
      }
    });
  }

  /**
   * 🎛️ Create workspace orchestration files
   */
  private async createWorkspaceOrchestration(): Promise<void> {
    const orchestrationPath = join(this.workspacesPath, 'orchestration.json');
    const workspaceList = Object.keys(this.config.workspaces);

    const orchestration = {
      version: '1.0.0',
      created: new Date().toISOString(),
      workspaces: workspaceList.length,
      isolation: {
        type: 'complete',
        modes: ['linked', 'standalone'],
        deployments: ['development', 'production'],
      },
      workspaceList,
      buildOrder: this.calculateBuildOrder(),
      scripts: {
        'build:all:linked': workspaceList.map(w => `cd ${w} && bun run build`).join(' && '),
        'build:all:standalone': workspaceList
          .map(w => `cd ${w} && bun run build:standalone`)
          .join(' && '),
        'test:all': workspaceList.map(w => `cd ${w} && bun test`).join(' && '),
        'deploy:all:linked': workspaceList
          .map(w => `cd ${w} && bun run deploy:linked`)
          .join(' && '),
        'deploy:all:standalone': workspaceList
          .map(w => `cd ${w} && bun run deploy:standalone`)
          .join(' && '),
      },
    };

    writeFileSync(orchestrationPath, JSON.stringify(orchestration, null, 2));

    // Create orchestration script
    const orchestrationScript = `#!/usr/bin/env bun

/**
 * 🎼 Fire22 Workspace Orchestration
 * Manage all isolated workspaces
 */

const args = process.argv.slice(2);
const command = args[0] || 'help';

const workspaces = ${JSON.stringify(workspaceList)};

switch (command) {
  case 'build:linked':
    console.info('🔗 Building all linked workspaces...');
    for (const ws of workspaces) {
      await Bun.$\`cd \${ws} && bun run build\`;
    }
    break;

  case 'build:standalone':
    console.info('📦 Building all standalone workspaces...');
    for (const ws of workspaces) {
      await Bun.$\`cd \${ws} && bun run build:standalone\`;
    }
    break;

  case 'test:all':
    console.info('🧪 Testing all workspaces...');
    for (const ws of workspaces) {
      await Bun.$\`cd \${ws} && bun test\`;
    }
    break;

  default:
    console.info('Usage: bun orchestration.ts [build:linked|build:standalone|test:all]');
}
`;

    writeFileSync(join(this.workspacesPath, 'orchestration.ts'), orchestrationScript);
  }

  /**
   * 🔄 Resolve workspace:* dependencies to actual versions
   */
  private resolveDependencies(dependencies: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};

    Object.entries(dependencies).forEach(([dep, version]) => {
      if (version === 'workspace:*') {
        // Find the actual workspace version
        const workspaceName = dep.replace('@fire22/', '');
        const workspace = Object.values(this.config.workspaces).find(
          (ws: any) => ws.name === dep
        ) as any;

        if (workspace) {
          resolved[dep] = workspace.version;
        } else {
          // Default to main workspace version
          resolved[dep] = this.config.version;
        }
      } else {
        resolved[dep] = version;
      }
    });

    return resolved;
  }

  /**
   * 📐 Calculate build order
   */
  private calculateBuildOrder(): string[] {
    // Use the orchestration build order from config
    return this.config.orchestration?.buildOrder || Object.keys(this.config.workspaces);
  }

  /**
   * 📊 Log isolation summary
   */
  private logIsolationSummary(): void {
    const workspaceCount = Object.keys(this.config.workspaces).length;

    Logger.info('\n' + '='.repeat(60));
    Logger.info('🎉 WORKSPACE ISOLATION SUMMARY');
    Logger.info('='.repeat(60));

    Logger.info(`📦 Workspaces Created: ${workspaceCount}`);
    Logger.info(`🔗 Linked Versions: ${workspaceCount} (development)`);
    Logger.info(`📦 Standalone Versions: ${workspaceCount} (production)`);
    Logger.info(`🏗️  Total Environments: ${workspaceCount * 2}`);

    Logger.info('\\n📋 Workspace Structure:');
    Object.entries(this.config.workspaces).forEach(([key, workspace]: [string, any]) => {
      Logger.info(`  📁 ${key}/`);
      Logger.info(`    └── ${workspace.name}`);
      Logger.info(`        ├── 🔗 Linked (dev): package.linked.json`);
      Logger.info(`        ├── 📦 Standalone (prod): package.standalone.json`);
      Logger.info(`        ├── ☁️  Cloudflare configs: wrangler.{linked|standalone}.toml`);
      Logger.info(`        └── 🎯 Independent deployment ready`);
    });

    Logger.info('\\n💡 Next Steps:');
    Logger.info('  1. Navigate to any workspace: cd workspaces/pattern-system');
    Logger.info('  2. Development mode: bun run dev (uses linked dependencies)');
    Logger.info('  3. Production build: bun run build:standalone');
    Logger.info('  4. Deploy linked: bun run deploy:linked');
    Logger.info('  5. Deploy standalone: bun run deploy:standalone');
    Logger.info('  6. Orchestrate all: bun workspaces/orchestration.ts build:all');

    Logger.info('='.repeat(60));
  }

  // === UTILITY METHODS ===

  private loadWorkspaceConfig(): any {
    const configPath = join(this.rootPath, 'workspace-config.json');
    if (!existsSync(configPath)) {
      throw new Error('workspace-config.json not found');
    }
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  private tomlStringify(obj: any): string {
    // Simple TOML stringifier - in production, use a proper TOML library
    let result = '';

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result += `[${key}]\\n`;
        Object.entries(value).forEach(([subKey, subValue]) => {
          result += `${subKey} = ${JSON.stringify(subValue)}\\n`;
        });
        result += '\\n';
      } else {
        result += `${key} = ${JSON.stringify(value)}\\n`;
      }
    });

    return result;
  }
}

// === CLI INTERFACE ===

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'isolate';

  const isolator = new WorkspaceIsolator();

  try {
    switch (command) {
      case 'isolate':
      case 'create':
        await isolator.createAllIsolatedWorkspaces();
        break;

      default:
        console.info('Usage: bun workspace-isolator.ts [isolate|create]');
        console.info('  isolate - Create isolated workspace environments');
        console.info('  create  - Alias for isolate');
        process.exit(1);
    }
  } catch (error) {
    Logger.error('❌ Workspace isolation failed:', error);
    process.exit(1);
  }
}

export default WorkspaceIsolator;
