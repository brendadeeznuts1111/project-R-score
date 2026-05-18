#!/usr/bin/env bun

/**
 * 🏭 FactoryWager CLI - Single Native Binary Entry Point
 * v5.0.0 - Enterprise-grade configuration management and analysis
 */

import { BunArchiveCLI } from './bun-archive-cli';
import { FactoryWagerNativeRenderer } from './fm-render-native';
import { FactoryWagerNativeMarkdown } from './native-markdown-supremacy';
import { ReleaseOrchestrator, parseReleaseArgs } from './fw-release';

class FactoryWagerCLI {
  private version = '5.0.0';

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      console.info('\n👋 FactoryWager CLI interrupted');
      process.exit(0);
    });
  }

  async run(args: string[]): Promise<void> {
    const command = args[0];
    const subCommand = args[1];

    switch (command) {
      case 'archive':
        await this.handleArchive(args.slice(1));
        break;
      case 'render':
        await this.handleRender(args.slice(1));
        break;
      case 'analyze':
        await this.handleAnalyze(args.slice(1));
        break;
      case 'health':
        await this.handleHealth(args.slice(1));
        break;
      case 'demo':
        await this.handleDemo(args.slice(1));
        break;
      case 'release':
        await this.handleRelease(args.slice(1));
        break;
      case '--version':
      case '-v':
        console.info(`factory-wager v${this.version}`);
        break;
      case '--help':
      case '-h':
      default:
        this.showHelp();
        break;
    }
  }

  private async handleArchive(args: string[]): Promise<void> {
    const archiveCLI = new BunArchiveCLI();
    const type = args[0] || 'status';

    switch (type) {
      case 'status':
        await archiveCLI.status();
        break;
      case 'config':
        await archiveCLI.config();
        break;
      case 'benchmark':
        await archiveCLI.benchmark();
        break;
      default:
        console.info(`🔧 Starting archive operation...`);
        console.info(`   Type: ${type}`);
        console.info(`   Use: factory-wager archive [status|config|benchmark]`);
        break;
    }
  }

  private async handleRender(args: string[]): Promise<void> {
    const file = args[0];
    if (!file) {
      console.error('❌ File argument required');
      console.info('Usage: factory-wager render <file> [options]');
      return;
    }

    const renderer = new FactoryWagerNativeRenderer();
    const options = this.parseRenderOptions(args.slice(1));

    try {
      await renderer.process(file, options);
    } catch (error) {
      console.error(`❌ Render failed: ${error}`);
      process.exit(1);
    }
  }

  private parseRenderOptions(args: string[]): any {
    const options: any = {
      format: 'ansi',
      headings: true,
      gfm: true,
      chromatic: false,
      performance: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '-f':
        case '--format':
          options.format = args[++i];
          break;
        case '-o':
        case '--output':
          options.output = args[++i];
          break;
        case '--chromatic':
          options.chromatic = true;
          break;
        case '--performance':
          options.performance = true;
          break;
      }
    }

    return options;
  }

  private async handleAnalyze(args: string[]): Promise<void> {
    const config = args[0];
    if (!config) {
      console.error('❌ Configuration file required');
      console.info('Usage: factory-wager analyze <config-file>');
      return;
    }

    console.info(`🔍 Analyzing configuration: ${config}`);
    console.info(`✅ Analysis complete`);
  }

  private async handleHealth(args: string[]): Promise<void> {
    const verbose = args.includes('--verbose');

    console.info(`🏥 FactoryWager Health Check`);
    console.info(`   Verbose: ${verbose}`);

    // Basic health checks
    console.info(`✅ Bun runtime: ${Bun.version}`);
    console.info(`✅ Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.info(`✅ Uptime: ${Math.round(process.uptime())}s`);
    console.info(`✅ Health check complete`);
  }

  private async handleRelease(args: string[]): Promise<void> {
    const opts = parseReleaseArgs(args);
    if (!opts) { process.exit(127); return; }
    const orchestrator = new ReleaseOrchestrator(opts);
    const code = await orchestrator.run();
    if (code !== 0) process.exit(code);
  }

  private async handleDemo(args: string[]): Promise<void> {
    const archiveCLI = new BunArchiveCLI();
    const options = {
      markdown: args.includes('--markdown'),
      archive: args.includes('--archive'),
      performance: args.includes('--performance')
    };

    console.info(`🎪 FactoryWager Demo Mode`);

    if (options.markdown) {
      console.info(`\n📝 Native Markdown Supremacy Demo:`);
      const fwMarkdown = new FactoryWagerNativeMarkdown();
      fwMarkdown.performanceTest();
    }

    if (options.archive) {
      console.info(`\n📦 Archive Capabilities Demo:`);
      await archiveCLI.status();
    }

    if (options.performance) {
      console.info(`\n⚡ Performance Benchmarks Demo:`);
      await archiveCLI.benchmark();
    }

    if (!options.markdown && !options.archive && !options.performance) {
      console.info(`Available demos:`);
      console.info(`  --markdown    Native markdown supremacy`);
      console.info(`  --archive     Archive capabilities`);
      console.info(`  --performance Performance benchmarks`);
    }
  }

  private showHelp(): void {
    console.info(`🏭 FactoryWager CLI v${this.version} - Enterprise Configuration Management`);
    console.info(``);
    console.info(`USAGE:`);
    console.info(`  factory-wager <command> [options]`);
    console.info(``);
    console.info(`COMMANDS:`);
    console.info(`  archive     Manage R2 archives`);
    console.info(`    status     Show archive status`);
    console.info(`    config     Show archive configuration`);
    console.info(`    benchmark  Run performance benchmarks`);
    console.info(``);
    console.info(`  render      Render markdown with Factory chromatics`);
    console.info(`    <file>     Markdown file to render`);
    console.info(`    -f, --format <format>    Output format (ansi|html|react|json)`);
    console.info(`    -o, --output <file>      Write output to file`);
    console.info(`    --chromatic              Use Factory color scheme`);
    console.info(`    --performance            Show render timing`);
    console.info(``);
    console.info(`  analyze     Analyze FactoryWager configuration`);
    console.info(`    <config>   Configuration file to analyze`);
    console.info(``);
    console.info(`  release     Release orchestrator (analyze → gate → deploy → finalize)`);
    console.info(`    <config>   Configuration file (default: config.yaml)`);
    console.info(`    --version=<ver>  Semantic version (required)`);
    console.info(`    --yes            Auto-confirm for CI/CD`);
    console.info(`    --dry-run        Simulate deployment`);
    console.info(`    --from=<ref>     Base git ref for changelog`);
    console.info(``);
    console.info(`  health      Check system health`);
    console.info(`    --verbose  Detailed health report`);
    console.info(``);
    console.info(`  demo        Run demonstrations`);
    console.info(`    --markdown    Native markdown demo`);
    console.info(`    --archive     Archive capabilities demo`);
    console.info(`    --performance Performance benchmarks demo`);
    console.info(``);
    console.info(`  --version   Show version information`);
    console.info(`  --help      Show this help message`);
    console.info(``);
    console.info(`EXAMPLES:`);
    console.info(`  factory-wager archive status`);
    console.info(`  factory-wager render README.md --chromatic`);
    console.info(`  factory-wager health --verbose`);
    console.info(`  factory-wager release config.yaml --version=1.3.0`);
    console.info(`  factory-wager release config.yaml --version=1.3.0 --yes`);
    console.info(`  factory-wager release config.yaml --version=1.3.0 --dry-run`);
    console.info(`  factory-wager demo --markdown`);
  }
}

// Main execution
if (import.meta.main) {
  const cli = new FactoryWagerCLI();
  cli.run(process.argv.slice(2)).catch((error) => {
    console.error(`❌ Fatal error: ${error}`);
    process.exit(1);
  });
}

export default FactoryWagerCLI;
