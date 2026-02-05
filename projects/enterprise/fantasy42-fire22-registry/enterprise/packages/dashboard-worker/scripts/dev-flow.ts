#!/usr/bin/env bun

/**
 * 🚀 Fire22 Developer Flow Script
 *
 * Quick access to codebase patterns, files, and development workflows
 * Uses Bun's native APIs for maximum performance and zero external dependencies
 */

import { join, extname } from 'path';

interface FlowOptions {
  command: string;
  pattern?: string;
  tag?: string;
  type?: string;
  context?: number;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context?: string[];
}

class DevFlow {
  private baseDir = process.cwd();
  private readonly typeExtensions = new Map([
    ['ts', ['.ts', '.tsx']],
    ['js', ['.js', '.jsx', '.mjs']],
    ['json', ['.json']],
    ['md', ['.md', '.markdown']],
    ['css', ['.css', '.scss', '.sass']],
    ['html', ['.html', '.htm']],
    ['sql', ['.sql']],
    ['toml', ['.toml']],
    ['yaml', ['.yaml', '.yml']],
  ]);

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    switch (options.command) {
      case 'find':
        await this.findPattern(options);
        break;
      case 'tags':
        await this.searchTags(options);
        break;
      case 'api':
        await this.findApiEndpoints();
        break;
      case 'tests':
        await this.findTests(options);
        break;
      case 'config':
        await this.findConfig();
        break;
      case 'patterns':
        await this.showPatterns();
        break;
      case 'workspace':
        await this.workspaceInfo();
        break;
      case 'health':
        await this.quickHealth();
        break;
      case 'setup':
        await this.devSetup();
        break;
      default:
        this.showHelp();
    }
  }

  private async findPattern(options: FlowOptions): Promise<void> {
    if (!options.pattern) {
      console.log('❌ Pattern required. Usage: dev-flow find "pattern"');
      return;
    }

    console.log(`🔍 Searching for: ${options.pattern}\n`);

    try {
      const pattern = new RegExp(options.pattern, 'i'); // Smart case by default
      const searchDirs = ['src/', 'scripts/', 'bench/'];

      for (const dir of searchDirs) {
        const results = await this.searchInDirectory(dir, pattern, options);
        if (results.length > 0) {
          console.log(`\n📁 ${dir}:`);
          this.displaySearchResults(results, options.context);
        }
      }
    } catch (error) {
      console.log(`❌ Invalid regex pattern: ${options.pattern}`);
    }
  }

  private async searchInDirectory(
    dir: string,
    pattern: RegExp,
    options: FlowOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Use Bun.glob for efficient file matching
      const globPattern = options.type
        ? `${dir}**/*.{${this.getExtensionsForType(options.type)
            .map(ext => ext.slice(1))
            .join(',')}}`
        : `${dir}**/*.{ts,tsx,js,jsx,json,md,css,html,sql,toml,yaml,yml}`;

      const files = await Array.fromAsync(Bun.glob(globPattern).scan());

      for (const filePath of files) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              results.push({
                file: filePath,
                line: index + 1,
                content: line.trim(),
                context: this.getContext(lines, index, options.context || 0),
              });
            }
          });
        }
      }
    } catch (error) {
      // Directory might not exist, continue silently
    }

    return results;
  }

  private getExtensionsForType(type: string): string[] {
    return this.typeExtensions.get(type) || [];
  }

  private getContext(lines: string[], lineIndex: number, contextLines: number): string[] {
    if (contextLines === 0) return [];

    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end);
  }

  private displaySearchResults(results: SearchResult[], contextLines?: number): void {
    const grouped = new Map<string, SearchResult[]>();

    // Group by file
    for (const result of results) {
      if (!grouped.has(result.file)) {
        grouped.set(result.file, []);
      }
      grouped.get(result.file)!.push(result);
    }

    for (const [file, fileResults] of grouped) {
      console.log(`\n🔸 ${file}:`);
      for (const result of fileResults) {
        console.log(`  ${result.line}:  ${result.content}`);
        if (contextLines && result.context) {
          result.context.forEach((contextLine, i) => {
            const lineNum = result.line - contextLines + i;
            if (lineNum !== result.line) {
              console.log(`  ${lineNum}:  ${contextLine}`);
            }
          });
        }
      }
    }
  }

  private async searchTags(options: FlowOptions): Promise<void> {
    const tag = options.tag || options.pattern;
    if (!tag) {
      console.log('Available tags:');
      await this.showAvailableTags();
      return;
    }

    console.log(`🏷️  Searching for tag: ${tag}\n`);

    // Search for common tag patterns using native search
    const patterns = [
      `@${tag}`, // JSDoc tags
      `TODO.*${tag}`, // TODO tags
      `FIXME.*${tag}`, // FIXME tags
      `NOTE.*${tag}`, // NOTE tags
      `\\[${tag}\\]`, // [tag] format
      `#${tag}`, // Hash tags
    ];

    for (const patternStr of patterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        const searchDirs = ['src/', 'scripts/', 'bench/'];

        for (const dir of searchDirs) {
          const results = await this.searchInDirectory(dir, pattern, options);
          if (results.length > 0) {
            console.log(`\n📋 Pattern "${patternStr}" in ${dir}:`);
            this.displaySearchResults(results);
          }
        }
      } catch (error) {
        console.log(`❌ Invalid pattern: ${patternStr}`);
      }
    }
  }

  private async findApiEndpoints(): Promise<void> {
    console.log('🌐 Finding API endpoints...\n');

    const patterns = [
      'app\\.(get|post|put|delete|patch)',
      'router\\.(get|post|put|delete|patch)',
      'fetch\\(',
      'Request\\(',
      '\\.route\\(',
      '/api/',
    ];

    for (const patternStr of patterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        const results = await this.searchInDirectory('src/', pattern, {
          command: 'api',
          context: 2,
        });

        if (results.length > 0) {
          console.log(`\n🔍 Pattern "${patternStr}":`);
          this.displaySearchResults(results, 2);
        }
      } catch (error) {
        console.log(`❌ Invalid pattern: ${patternStr}`);
      }
    }
  }

  private async findTests(options: FlowOptions): Promise<void> {
    console.log('🧪 Finding tests...\n');

    if (options.pattern) {
      // Search for pattern in test files
      const pattern = new RegExp(options.pattern, 'i');
      const testGlob = '**/*.{test.ts,spec.ts,test.js,spec.js}';
      const files = await Array.fromAsync(Bun.glob(testGlob).scan());

      let foundResults = false;
      for (const filePath of files) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          if (pattern.test(content)) {
            console.log(`🔸 ${filePath}`);
            foundResults = true;
          }
        }
      }

      if (!foundResults) {
        console.log(`No test files found matching pattern: ${options.pattern}`);
      }
    } else {
      // List all test files using Bun.glob
      const testGlob = '**/*.{test.ts,spec.ts,test.js,spec.js}';
      const files = await Array.fromAsync(Bun.glob(testGlob).scan());

      if (files.length > 0) {
        console.log('Test files found:');
        for (const file of files.sort()) {
          console.log(`🔸 ${file}`);
        }
      } else {
        console.log('No test files found.');
      }
    }
  }

  private async findConfig(): Promise<void> {
    console.log('⚙️  Configuration files...\n');

    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'bunfig.toml',
      'wrangler.toml',
      'workspace-config.json',
      'build.config.ts',
      '.env*',
    ];

    for (const pattern of configPatterns) {
      const files = await Array.fromAsync(Bun.glob(pattern).scan());
      for (const file of files) {
        if (await Bun.file(file).exists()) {
          console.log(`⚙️  ${file}`);
        }
      }
    }
  }

  private async showPatterns(): Promise<void> {
    console.log('🕸️  Pattern Weaver System...\n');

    // Search pattern-weaver.ts for pattern definitions
    const patternFiles = await Array.fromAsync(Bun.glob('src/patterns/*.ts').scan());

    for (const filePath of patternFiles) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const content = await file.text();
        const lines = content.split('\n');

        console.log(`\n🔸 ${filePath}:`);
        lines.forEach((line, index) => {
          if (line.match(/readonly patternTypes|PATTERN_|pattern.*:/)) {
            console.log(`  ${index + 1}: ${line.trim()}`);
            // Show next few lines for context
            for (let i = 1; i <= 3; i++) {
              if (index + i < lines.length) {
                console.log(`  ${index + i + 1}: ${lines[index + i].trim()}`);
              }
            }
          }
        });
      }
    }
  }

  private async workspaceInfo(): Promise<void> {
    console.log('🏗️  Workspace Information...\n');

    // Check if workspace-config.json exists using Bun.file
    const workspaceConfigFile = Bun.file('workspace-config.json');
    if (await workspaceConfigFile.exists()) {
      try {
        const config = await workspaceConfigFile.json();
        console.log('📋 Workspace Configuration:');
        if (config.workspaces) {
          const workspaceNames = Object.keys(config.workspaces);
          console.log(`   Workspaces (${workspaceNames.length}):`);
          workspaceNames.forEach(name => console.log(`   • ${name}`));
        }
      } catch (error) {
        console.log('❌ Invalid workspace-config.json format');
      }
    }

    // Show workspace orchestrator commands by searching scripts
    console.log('\n🚀 Workspace Commands:');
    const pattern = new RegExp('case.*workspace|workspace.*command', 'i');
    const results = await this.searchInDirectory('scripts/', pattern, {
      command: 'workspace',
      context: 2,
    });

    if (results.length > 0) {
      this.displaySearchResults(results, 2);
    } else {
      console.log('  No workspace commands found in scripts/');
    }
  }

  private async quickHealth(): Promise<void> {
    console.log('🏥 Quick Health Check...\n');

    // Check Bun version using Bun.spawn
    console.log('📊 Bun Version:');
    try {
      const versionProc = Bun.spawn(['bun', '--version'], { stdout: 'pipe' });
      const version = await versionProc.text();
      console.log(`   ✅ Bun ${version.trim()}`);
    } catch {
      console.log('   ❌ Bun not available');
    }

    // Check dependencies using package.json
    console.log('\n📊 Dependencies:');
    try {
      const packageFile = Bun.file('package.json');
      if (await packageFile.exists()) {
        const pkg = await packageFile.json();
        const depCount = Object.keys(pkg.dependencies || {}).length;
        const devDepCount = Object.keys(pkg.devDependencies || {}).length;
        console.log(`   ✅ ${depCount} production, ${devDepCount} dev dependencies`);
      }
    } catch {
      console.log('   ❌ Cannot read package.json');
    }

    // Check build status
    console.log('\n📊 Build Status:');
    const distFiles = await Array.fromAsync(Bun.glob('dist/*').scan());
    if (distFiles.length > 0) {
      console.log(`   ✅ ${distFiles.length} files in dist/`);
      distFiles.slice(0, 3).forEach(file => console.log(`      • ${file}`));
    } else {
      console.log('   ⚠️  No build output found in dist/');
    }

    // Check database files
    console.log('\n📊 Database Connection:');
    const dbFiles = await Array.fromAsync(Bun.glob('*.db').scan());
    if (dbFiles.length > 0) {
      console.log(`   ✅ ${dbFiles.length} database files found`);
      dbFiles.forEach(file => console.log(`      • ${file}`));
    } else {
      console.log('   ⚠️  No .db files found');
    }
  }

  private async devSetup(): Promise<void> {
    console.log('🛠️  Development Setup...\n');

    const setupSteps = [
      { name: 'Install Dependencies', cmd: ['bun', 'install', '--frozen-lockfile'] },
      { name: 'Setup Database', cmd: ['bun', 'run', 'setup-db'] },
      { name: 'Run Quick Test', cmd: ['bun', 'run', 'test:quick'] },
      { name: 'Validate Environment', cmd: ['bun', 'run', 'env:validate'] },
    ];

    for (const step of setupSteps) {
      console.log(`\n⚡ ${step.name}...`);
      try {
        // Use Bun.spawn for better performance
        const proc = Bun.spawn(step.cmd, {
          stdout: 'pipe',
          stderr: 'pipe',
        });

        const output = await proc.text();
        const success = proc.exitCode === 0;

        if (success) {
          console.log(`✅ ${step.name} completed`);
          if (output.trim()) {
            console.log(`   ${output.trim().split('\n')[0]}`); // Show first line of output
          }
        } else {
          console.log(`❌ ${step.name} failed`);
          console.log(`   Try manually: ${step.cmd.join(' ')}`);
        }
      } catch (error) {
        console.log(`❌ ${step.name} failed`);
        console.log(`   Command: ${step.cmd.join(' ')}`);
      }
    }
  }

  private async showAvailableTags(): Promise<void> {
    const commonTags = [
      'TODO',
      'FIXME',
      'NOTE',
      'HACK',
      'BUG',
      'PERF',
      'SECURITY',
      'API',
      'CONFIG',
      'TEST',
      'PATTERN',
      'WORKSPACE',
      'BUILD',
      'DEPLOY',
    ];

    console.log('Common tags to search:');
    for (const tag of commonTags) {
      console.log(`  ${tag.toLowerCase()}`);
    }

    console.log('\nUsage: dev-flow tags <tag-name>');
  }

  private parseArgs(args: string[]): FlowOptions {
    const [command = 'help', pattern, ...rest] = args;

    return {
      command,
      pattern,
      tag: rest.find(arg => arg.startsWith('--tag='))?.split('=')[1],
      type: rest.find(arg => arg.startsWith('--type='))?.split('=')[1],
      context: rest.find(arg => arg.startsWith('-C'))?.split('=')[1]
        ? parseInt(rest.find(arg => arg.startsWith('-C'))?.split('=')[1]!)
        : 3,
    };
  }

  private showHelp(): void {
    console.log(`
🚀 Fire22 Developer Flow Script - Bun Native

USAGE:
  bun run scripts/dev-flow.ts <command> [options]

COMMANDS:
  find <pattern>      Search codebase for pattern using native regex
  tags [tag]          Search for tagged code (TODO, FIXME, etc.)
  api                 Find API endpoints and routes
  tests [pattern]     Find test files, optionally filter by pattern
  config              Show configuration files using Bun.glob
  patterns            Show Pattern Weaver patterns
  workspace           Show workspace information
  health              Quick health check using Bun APIs
  setup               Run development setup with Bun.spawn
  help                Show this help

OPTIONS:
  --type=<type>       File type filter (ts, js, json, etc.)
  --tag=<tag>         Specific tag to search for
  -C=<num>           Context lines (default: 3)

EXAMPLES:
  # Find all API routes
  bun run scripts/dev-flow.ts api
  
  # Search for TODO items
  bun run scripts/dev-flow.ts tags todo
  
  # Find pattern in TypeScript files with context
  bun run scripts/dev-flow.ts find "PatternWeaver" --type=ts -C=5
  
  # Find tests related to workspace
  bun run scripts/dev-flow.ts tests workspace
  
  # Quick development setup
  bun run scripts/dev-flow.ts setup

🔥 Fire22 Development Team - Bun-Native Developer Productivity
   Features: Bun.glob, Bun.file(), Bun.spawn(), zero external dependencies
`);
  }
}

// Run if called directly
if (import.meta.main) {
  const flow = new DevFlow();
  await flow.run(process.argv.slice(2));
}
