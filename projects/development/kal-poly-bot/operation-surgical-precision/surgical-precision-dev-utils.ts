#!/usr/bin/env bun
/**
 * Surgical Precision Development Utilities
 *
 * Enhanced developer workflow tools using Bun.openInEditor for rapid file access,
 * troubleshooting, and documentation integration.
 *
 * Usage: bun run surgical-precision-dev-utils.ts [command]
 *        bun run edit|docs|config|troubleshoot
 */

export interface DevelopmentResource {
  name: string;
  path: string;
  description: string;
  category: 'core' | 'config' | 'docs' | 'troubleshoot' | 'team';
}

const RESOURCES: DevelopmentResource[] = [
  // Core Platform Files
  {
    name: 'platform-main',
    path: './completely-integrated-surgical-precision-platform.ts',
    description: 'Main platform orchestration engine',
    category: 'core'
  },
  {
    name: 'coordinator',
    path: './PrecisionOperationBootstrapCoordinator.ts',
    description: 'Component coordination and SQLite management',
    category: 'core'
  },
  {
    name: 'package-main',
    path: './package.json',
    description: 'Package configuration and scripts',
    category: 'core'
  },

  // Configuration Files
  {
    name: 'bunfig-prod',
    path: '../bunfig.production.toml',
    description: 'Production Bun configuration hardening',
    category: 'config'
  },
  {
    name: 'vscode-settings',
    path: '../pr-team-vscode-settings.json',
    description: 'Team color-coded VS Code theme',
    category: 'config'
  },
  {
    name: 'tmux-colors',
    path: '../tmux-pr-team-colors.conf',
    description: 'TMUX team color configuration',
    category: 'config'
  },
  {
    name: 'git-colors',
    path: '../pr-team-git-config.sh',
    description: 'Git team color configuration script',
    category: 'config'
  },

  // Documentation
  {
    name: 'readme-main',
    path: '../README.md',
    description: 'Main project documentation and setup guide',
    category: 'docs'
  },
  {
    name: 'api-docs',
    path: './API_DOCUMENTATION.md',
    description: 'Complete API reference and integration guide',
    category: 'docs'
  },
  {
    name: 'deployment-memo',
    path: './IMPLEMENTATION_MEMORANDUM.md',
    description: 'Enterprise deployment memorandum',
    category: 'docs'
  },
  {
    name: 'ide-memo',
    path: './INTEGRATED_DEVELOPMENT_ENVIRONMENT_MEMORANDUM.md',
    description: 'IDE standards and workflow memorandum',
    category: 'docs'
  },
  {
    name: 'bun-hardening',
    path: './Bun_Configuration_Hardening_Guide.md',
    description: 'Bun runtime security hardening guide',
    category: 'docs'
  },

  // Troubleshooting
  {
    name: 'action-items',
    path: '../SCRIPT_ACTION_ITEMS.md',
    description: 'Critical action items and deployment checklist',
    category: 'troubleshoot'
  },
  {
    name: 'setup-status',
    path: '../SETUP_STATUS.md',
    description: 'Current setup and configuration status',
    category: 'troubleshoot'
  },
  {
    name: 'test-results',
    path: '../test-results-raw.json',
    description: 'Raw test execution results and benchmarks',
    category: 'troubleshoot'
  },
  {
    name: 'live-dashboard',
    path: '../surgical-precision-dashboard.html',
    description: 'Interactive live dashboard for platform metrics',
    category: 'troubleshoot'
  },
  {
    name: 'dashboard-hub-config',
    path: '../configs/dashboards-hub.json',
    description: 'Centralized dashboard and hub configuration (Cloudflare Hub)',
    category: 'troubleshoot'
  },
  {
    name: 'dashboard-hub-utils',
    path: '../utils/dashboard-hub.ts',
    description: 'Dashboard hub utility functions and configuration loader',
    category: 'troubleshoot'
  },

  // Team Resources
  {
    name: 'team-summary',
    path: '../SERO_CSS_ENHANCEMENTS.md',
    description: 'Team collaboration and CSS enhancements',
    category: 'team'
  },
  {
    name: 'final-summary',
    path: '../FINAL_SUMMARY.txt',
    description: 'Complete project implementation summary',
    category: 'team'
  }
];

/**
 * Surgical Precision Tools & Utilities
 * Comprehensive toolkit leveraging all Bun runtime utilities for zero-collateral operations
 */
export class SurgicalPrecisionTools {
  /**
   * Dynamic tool detection with PATH configuration
   */
  static findExecutable(name: string, customPath?: string): string | null {
    return Bun.which(name, customPath ? { PATH: customPath } : {});
  }

  /**
   * Surgical precision editor cascade with Bun editor name mapping
   */
  static findPreferredEditor(): { command: string; bunName?: 'vscode' | 'subl' } | null {
    const editors = [
      { command: 'code', bunName: 'vscode' as const },
      { command: 'cursor', bunName: undefined },
      { command: 'vim', bunName: undefined },
      { command: 'nano', bunName: undefined }
    ];

    // First try configured editors
    for (const editor of editors) {
      const path = this.findExecutable(editor.command, process.env.PATH);
      if (path) return editor;
    }

    // Fall back to system defaults
    const sysEditor = process.env.EDITOR || process.env.VISUAL;
    if (sysEditor) {
      return { command: sysEditor, bunName: undefined };
    }

    return null;
  }

  /**
   * Enhanced editor opening with surgical precision
   */
  static async openWithEditor(file: string, options?: { line?: number, column?: number }): Promise<boolean> {
    const editorInfo = this.findPreferredEditor();

    if (!editorInfo) {
      console.warn('⚠️ No editor detected. Install VS Code, Cursor, Vim, or Nano for surgical precision workflow.');
      return false;
    }

    const editorConfig: any = { line: options?.line || 1, column: options?.column || 1 };
    if (editorInfo.bunName) {
      editorConfig.editor = editorInfo.bunName;
    }

    try {
      await Bun.openInEditor(file, editorConfig);
      console.log(`📝 Opened: ${file} in ${editorInfo.command}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to open ${file} in ${editorInfo.command}:`, error);
      return false;
    }
  }

  /**
   * Surgical environment diagnostic with comprehensive Bun utilities
   */
  static async diagnoseEnvironment(): Promise<{
    tools: Record<string, boolean>;
    editor: string | null;
    timing: { precision: number; human: string };
    compression: { gzip: boolean; zstd: boolean };
    bun: { version: string; revision: string; env: string; features: Record<string, boolean> };
  }> {
    const start = Bun.nanoseconds();
    await Bun.sleep(0.001); // Microsecond precision test
    const timing_ns = Bun.nanoseconds() - start;
    const timing_ms = timing_ns / 1_000_000;

    // Test compression capabilities
    let gzipWorks = false, zstdWorks = false;
    try {
      const testData = new Uint8Array(Buffer.from('surgical precision test data'));
      Bun.gzipSync(testData);
      gzipWorks = true;
    } catch { /* ignore */ }

    try {
      const testData = new Uint8Array(Buffer.from('surgical precision test data'));
      Bun.zstdCompressSync(testData);
      zstdWorks = true;
    } catch { /* ignore */ }

    return {
      tools: {
        bun: !!this.findExecutable('bun'),
        git: !!this.findExecutable('git'),
        docker: !!this.findExecutable('docker'),
        kubectl: !!this.findExecutable('kubectl'),
        rg: !!this.findExecutable('rg'),
        make: !!this.findExecutable('make'),
        curl: !!this.findExecutable('curl'),
        jq: !!this.findExecutable('jq')
      },
      editor: this.findPreferredEditor()?.command || null,
      timing: {
        precision: timing_ms,
        human: timing_ms < 0.001 ? 'nanosecond' : timing_ms < 1 ? 'microsecond' : 'millisecond'
      },
      compression: { gzip: gzipWorks, zstd: zstdWorks },
      bun: {
        version: Bun.version,
        revision: Bun.revision,
        env: Bun.env === process.env ? 'alias-validated' : 'alias-mismatch',
        features: {
          openInEditor: typeof Bun.openInEditor === 'function',
          which: typeof Bun.which === 'function',
          inspect: typeof Bun.inspect === 'function',
          escapeHTML: typeof Bun.escapeHTML === 'function',
          deepEquals: typeof Bun.deepEquals === 'function',
          gzipSync: typeof Bun.gzipSync === 'function',
          zstdCompressSync: typeof Bun.zstdCompressSync === 'function',
          nanoseconds: typeof Bun.nanoseconds === 'function',
          sleep: typeof Bun.sleep === 'function',
          env: Bun.env === process.env
        }
      }
    };
  }
}

/**
 * Surgical Precision Validation Utilities
 * Enhanced data validation and comparison using Bun utilities
 */
export class SurgicalPrecisionValidator {
  /**
   * Deep equality comparison with surgical precision
   */
  static deepEquals(a: unknown, b: unknown, strict = false): boolean {
    return Bun.deepEquals(a, b, strict);
  }

  /**
   * Structured object inspection for debugging
   */
  static inspect<T>(value: T, label?: string, options?: { depth?: number; colors?: boolean }): T {
    if (label) {
      console.log(`🔬 ${label}:`, Bun.inspect(value, options));
    } else {
      console.log(Bun.inspect(value, options));
    }
    return value;
  }

  /**
   * Tabular data presentation
   */
  static table<T extends Record<string, unknown>>(data: T[], properties?: (keyof T)[]): string {
    const tableOpts = properties ? { colors: true, properties: properties as string[] } : { colors: true };
    return Bun.inspect.table(data, tableOpts);
  }

  /**
   * Validate configuration object structure
   */
  static validateConfiguration(config: Record<string, unknown>, schema: Record<string, string>): boolean {
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in config)) return false;
      if (typeof config[key] !== type) return false;
    }
    return true;
  }

  /**
   * Secure HTML escaping with null handling
   */
  static escapeHTML(input: string | number | boolean | object | null): string {
    return input === null ? '' : Bun.escapeHTML(input);
  }

  /**
   * Path conversion utilities
   */
  static fileURLToPath(url: URL): string {
    return Bun.fileURLToPath(url);
  }

  static pathToFileURL(path: string): URL {
    return Bun.pathToFileURL(path);
  }

  /**
   * Generate safe HTML for team status indicators
   */
  static createTeamStatusHTML(team: string, status: 'active' | 'idle' | 'error', details?: string): string {
    const colors = {
      alice: '#00CED1',    // Cyan
      bob: '#FFFF00',      // Yellow
      carol: '#FF1493',    // Magenta
      dave: '#32CD32'      // Green
    };

    const teamColor = colors[team.toLowerCase() as keyof typeof colors] || '#666666';
    const statusEmoji = { active: '🔵', idle: '⚪', error: '🔴' }[status];

    const safeTeam = this.escapeHTML(team);
    const safeDetails = details ? ` - ${this.escapeHTML(details)}` : '';

    return `<div style="color: ${teamColor}; font-weight: bold;">${statusEmoji} ${safeTeam}${safeDetails}</div>`;
  }

  /**
   * Compare platform configurations for surgical precision accuracy
   */
  static compareConfigurations(existing: Record<string, unknown>, incoming: Record<string, unknown>): {
    identical: boolean;
    differences: Array<{ key: string; existing?: unknown; incoming?: unknown }>;
  } {
    const differences: Array<{ key: string; existing?: unknown; incoming?: unknown }> = [];

    const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);

    for (const key of allKeys) {
      const existingVal = existing[key];
      const incomingVal = incoming[key];

      if (!this.deepEquals(existingVal, incomingVal, true)) {
        differences.push({ key, existing: existingVal, incoming: incomingVal });
      }
    }

    return {
      identical: differences.length === 0,
      differences
    };
  }
}

export class SurgicalPrecisionDevUtils {
  private static async openInEditor(resource: DevelopmentResource): Promise<void> {
    try {
      const fullPath = resource.path.startsWith('./') ? resource.path : `./${resource.path}`;
      await Bun.openInEditor(fullPath, { line: 1, column: 1 });
      console.log(`📝 Opened: ${resource.name} - ${resource.description}`);
    } catch (error) {
      console.error(`❌ Failed to open ${resource.name}:`, error);
      console.log(`   Try manually: ${resource.path}`);
    }
  }

  static async openCategory(category: DevelopmentResource['category']): Promise<void> {
    console.log(`🔍 Opening ${category.toUpperCase()} files...\n`);

    const categoryResources = RESOURCES.filter(r => r.category === category);
    if (categoryResources.length === 0) {
      console.log(`❌ No resources found in category: ${category}`);
      return;
    }

    for (const resource of categoryResources) {
      await this.openInEditor(resource);
      // Small delay to prevent overwhelming the editor
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  static async openMultiple(names: string[]): Promise<void> {
    console.log(`🔍 Opening ${names.length} specific files...\n`);

    for (const name of names) {
      const resource = RESOURCES.find(r => r.name === name);
      if (resource) {
        await this.openInEditor(resource);
      } else {
        console.log(`❌ Resource not found: ${name}`);
        console.log(`   Available: ${RESOURCES.map(r => r.name).join(', ')}`);
      }
    }
  }

  static listResources(category?: DevelopmentResource['category']): void {
    console.log('📋 SURGICAL PRECISION DEVELOPMENT RESOURCES');
    console.log('═'.repeat(50));

    const toList = category ?
      RESOURCES.filter(r => r.category === category) :
      RESOURCES;

    const categories = ['core', 'config', 'docs', 'troubleshoot', 'team'] as const;

    categories.forEach(cat => {
      const catResources = toList.filter(r => r.category === cat);
      if (catResources.length > 0) {
        console.log(`\n📁 ${cat.toUpperCase()}:`);
        catResources.forEach(r => {
          console.log(`   ${r.name.padEnd(15)} - ${r.description}`);
        });
      }
    });

    console.log('\n🎯 Usage:');
    console.log('   bun run edit [resource...]    - Open specific resources');
    console.log('   bun run docs                 - Open documentation files');
    console.log('   bun run config               - Open configuration files');
    console.log('   bun run troubleshoot         - Open troubleshooting files');
    console.log('   bun run surgical-precision-dev-utils.ts [command|resource...]');
  }

  static async handleCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.listResources();
      return;
    }

    const command = args[0].toLowerCase();

    switch (command) {
      case 'list':
      case 'help':
        this.listResources();
        break;

      case 'docs':
        await this.openCategory('docs');
        break;

      case 'config':
        await this.openCategory('config');
        break;

      case 'troubleshoot':
        await this.openCategory('troubleshoot');
        break;

      case 'core':
        await this.openCategory('core');
        break;

      case 'team':
        await this.openCategory('team');
        break;

      case 'all':
        for (const category of ['core', 'config', 'docs', 'troubleshoot', 'team'] as const) {
          await this.openCategory(category);
        }
        break;

      default:
        // Treat as resource names
        await this.openMultiple(args);
        break;
    }
  }
}

// CLI entry point
async function main(): Promise<void> {
  const args = process.argv.slice(4); // Skip 'bun run surgical-precision-dev-utils.ts'
  await SurgicalPrecisionDevUtils.handleCommand(args);
}

// Handle both direct execution and module import
if (import.meta.path === Bun.main) {
  // this script is being directly executed
  main().catch(error => {
    console.error('❌ Development utils error:', error);
    process.exit(1);
  });
}
