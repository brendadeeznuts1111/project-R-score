#!/usr/bin/env bun

/**
 * 🎯 Fire22 Dashboard Package Information Display
 * Uses Bun's table functionality for clean, organized output
 */

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  main: string;
  type: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  contributors: Array<{
    name: string;
    email?: string;
    url?: string;
    role?: string;
  }>;
  repository: {
    type: string;
    url: string;
    directory?: string;
  };
  keywords: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines: Record<string, string>;
  license: string;
  homepage?: string;
  bugs?: {
    url: string;
    email?: string;
  };
}

class PackageInfoDisplay {
  private packageInfo: PackageInfo;

  constructor() {
    // Initialize with empty package info, will be loaded when needed
    this.packageInfo = {} as PackageInfo;
  }

  private async ensurePackageInfo(): Promise<void> {
    if (!this.packageInfo.name) {
      this.packageInfo = await this.loadPackageInfo();
    }
  }

  private async loadPackageInfo(): Promise<PackageInfo> {
    if (this.packageInfo) return this.packageInfo;

    try {
      // Use Bun.file() for cleaner JSON reading
      this.packageInfo = await Bun.file('package.json').json();
      return this.packageInfo;
    } catch (error) {
      throw new Error(`Failed to load package.json: ${error}`);
    }
  }

  async displayCoreInfo() {
    await this.ensurePackageInfo();

    console.info('🔥 Fire22 Dashboard - Core Package Information');
    console.info('!==!==!==!==!==!==!==!=====\n');

    const coreInfo = [
      ['Package Name', this.packageInfo.name],
      ['Version', this.packageInfo.version],
      ['Description', this.packageInfo.description],
      ['Main Entry', this.packageInfo.main],
      ['Module Type', this.packageInfo.type],
      ['License', this.packageInfo.license],
    ];

    console.table(coreInfo);
  }

  displayAuthorInfo() {
    console.info('\n👥 Author & Contributors');
    console.info('!==!==!==!====\n');

    const authorInfo = [
      ['Author Name', this.packageInfo.author.name],
      ['Author Email', this.packageInfo.author.email || 'N/A'],
      ['Author URL', this.packageInfo.author.url || 'N/A'],
    ];

    console.table(authorInfo);

    if (this.packageInfo.contributors && this.packageInfo.contributors.length > 0) {
      console.info('\n📋 Contributors:');
      const contributorsTable = this.packageInfo.contributors.map(contributor => [
        contributor.name,
        contributor.email || 'N/A',
        contributor.url || 'N/A',
        contributor.role || 'Contributor',
      ]);

      console.table(contributorsTable);
    }
  }

  displayRepositoryInfo() {
    console.info('\n📁 Repository Information');
    console.info('!==!==!==!==!==\n');

    const repoInfo = [
      ['Repository Type', this.packageInfo.repository.type],
      ['Repository URL', this.packageInfo.repository.url],
      ['Directory', this.packageInfo.repository.directory || 'Root'],
      ['Homepage', this.packageInfo.homepage || 'N/A'],
    ];

    console.table(repoInfo);
  }

  displayKeywords() {
    console.info('\n🏷️ Keywords');
    console.info('!==!==\n');

    if (this.packageInfo.keywords && this.packageInfo.keywords.length > 0) {
      const keywordsTable = this.packageInfo.keywords.map(keyword => [keyword]);
      console.table(keywordsTable);
    } else {
      console.info('No keywords defined');
    }
  }

  displayDependencies() {
    console.info('\n📦 Dependencies');
    console.info('!==!==!==\n');

    if (this.packageInfo.dependencies && Object.keys(this.packageInfo.dependencies).length > 0) {
      const depsTable = Object.entries(this.packageInfo.dependencies).map(([name, version]) => [
        name,
        version,
      ]);
      console.table(depsTable);
    } else {
      console.info('No dependencies defined');
    }
  }

  displayScripts() {
    console.info('\n⚡ Available Scripts');
    console.info('!==!==!=====\n');

    if (this.packageInfo.scripts && Object.keys(this.packageInfo.scripts).length > 0) {
      const scriptsTable = Object.entries(this.packageInfo.scripts).map(([name, command]) => [
        name,
        command,
      ]);
      console.table(scriptsTable);
    } else {
      console.info('No scripts defined');
    }
  }

  displayEngines() {
    console.info('\n🔧 Engine Requirements');
    console.info('!==!==!==!===\n');

    if (this.packageInfo.engines && Object.keys(this.packageInfo.engines).length > 0) {
      const enginesTable = Object.entries(this.packageInfo.engines).map(([engine, version]) => [
        engine,
        version,
      ]);
      console.table(enginesTable);
    } else {
      console.info('No engine requirements specified');
    }
  }

  displayMatrixHealthInfo() {
    console.info('\n🔍 Matrix Health System Status');
    console.info('!==!==!==!==!==!==\n');

    const matrixCommands = [
      ['matrix:health', 'Check matrix health'],
      ['matrix:validate', 'Validate permissions matrix'],
      ['matrix:repair', 'Repair matrix issues'],
      ['matrix:status', 'Show current status'],
      ['matrix:history', 'Show health history'],
      ['matrix:summary', 'Show health summary'],
      ['matrix:configs', 'Test matrix configs endpoint'],
      ['matrix:score', 'Test enhanced scoring'],
      ['matrix:test', 'Test all API endpoints'],
      ['matrix:enhanced', 'Comprehensive enhanced testing'],
    ];

    console.table(matrixCommands);
  }

  displayQuickStart() {
    console.info('\n🚀 Quick Start Commands');
    console.info('!==!==!==!====\n');

    const quickStartCommands = [
      ['bun run matrix:health', 'Check system health'],
      ['bun run matrix:enhanced', 'Run comprehensive tests'],
      ['bun run matrix:status', 'View current status'],
      ['bun run matrix:validate', 'Validate system integrity'],
      ['bun run matrix:repair', 'Fix any issues found'],
    ];

    console.table(quickStartCommands);
  }

  displayBunxExamples() {
    console.info('\n⚡ Bunx Examples with --package Flag');
    console.info('!==!==!==!==!==!==!==\n');

    const bunxExamples = [
      ['bunx --package renovate renovate-config-validator', 'Run renovate config validator'],
      ['bunx -p @angular/cli ng new my-app', 'Create new Angular app'],
      ['bunx -p @fire22/dashboard matrix:health', 'Run matrix health check'],
      ['bunx -p fire22-dashboard matrix:enhanced', 'Run enhanced matrix tests'],
      ['bunx --package fire22-dashboard matrix:status', 'Check matrix status'],
    ];

    console.table(bunxExamples);
  }

  async displayAllInfo() {
    await this.displayCoreInfo();
    await this.displayAuthorInfo();
    await this.displayRepositoryInfo();
    await this.displayKeywords();
    await this.displayDependencies();
    await this.displayScripts();
    await this.displayEngines();
    await this.displayMatrixHealthInfo();
    await this.displayQuickStart();
    await this.displayBunxExamples();
  }

  async displaySummary() {
    await this.ensurePackageInfo();

    console.info('\n📊 Package Summary');
    console.info('!==!==!====\n');

    const summary = [
      ['Total Dependencies', Object.keys(this.packageInfo.dependencies || {}).length],
      ['Total Dev Dependencies', Object.keys(this.packageInfo.devDependencies || {}).length],
      ['Total Scripts', Object.keys(this.packageInfo.scripts || {}).length],
      ['Total Keywords', this.packageInfo.keywords?.length || 0],
      ['Contributors', this.packageInfo.contributors?.length || 0],
      ['Matrix Health Commands', 10],
    ];

    console.table(summary);
  }
}

// CLI interface
if (import.meta.main) {
  const display = new PackageInfoDisplay();
  const args = process.argv.slice(2);

  const runCommand = async () => {
    if (args.length === 0) {
      await display.displayAllInfo();
    } else {
      const command = args[0];

      switch (command) {
        case 'core':
          await display.displayCoreInfo();
          break;
        case 'author':
          await display.displayAuthorInfo();
          break;
        case 'repo':
          await display.displayRepositoryInfo();
          break;
        case 'keywords':
          await display.displayKeywords();
          break;
        case 'deps':
          await display.displayDependencies();
          break;
        case 'scripts':
          await display.displayScripts();
          break;
        case 'engines':
          await display.displayEngines();
          break;
        case 'matrix':
          await display.displayMatrixHealthInfo();
          break;
        case 'quickstart':
          await display.displayQuickStart();
          break;
        case 'bunx':
          await display.displayBunxExamples();
          break;
        case 'summary':
          await display.displaySummary();
          break;
        default:
          console.info('Available commands:');
          console.info('  core       - Core package information');
          console.info('  author     - Author and contributors');
          console.info('  repo       - Repository information');
          console.info('  keywords   - Package keywords');
          console.info('  deps       - Dependencies');
          console.info('  scripts    - Available scripts');
          console.info('  engines    - Engine requirements');
          console.info('  matrix     - Matrix health commands');
          console.info('  quickstart - Quick start commands');
          console.info('  bunx       - Bunx examples');
          console.info('  summary    - Package summary');
          console.info('  (no args)  - Display all information');
          break;
      }
    }
  };

  runCommand().catch(console.error);
}

export { PackageInfoDisplay };
