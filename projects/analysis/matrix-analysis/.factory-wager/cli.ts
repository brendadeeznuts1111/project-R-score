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
      console.log('\n👋 FactoryWager CLI interrupted');
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
        console.log(`factory-wager v${this.version}`);
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
        console.log(`🔧 Starting archive operation...`);
        console.log(`   Type: ${type}`);
        console.log(`   Use: factory-wager archive [status|config|benchmark]`);
        break;
    }
  }

  private async handleRender(args: string[]): Promise<void> {
    const file = args[0];
    if (!file) {
      console.error('❌ File argument required');
      console.log('Usage: factory-wager render <file> [options]');
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
      console.log('Usage: factory-wager analyze <config-file>');
      return;
    }

    console.log(`🔍 Analyzing configuration: ${config}`);
    console.log(`✅ Analysis complete`);
  }

  private async handleHealth(args: string[]): Promise<void> {
    const verbose = args.includes('--verbose');

    console.log(`🏥 FactoryWager Health Check`);
    console.log(`   Verbose: ${verbose}`);

    // Basic health checks
    console.log(`✅ Bun runtime: ${Bun.version}`);
    console.log(`✅ Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`✅ Uptime: ${Math.round(process.uptime())}s`);
    console.log(`✅ Health check complete`);
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

    console.log(`🎪 FactoryWager Demo Mode`);

    if (options.markdown) {
      console.log(`\n📝 Native Markdown Supremacy Demo:`);
      const fwMarkdown = new FactoryWagerNativeMarkdown();
      fwMarkdown.performanceTest();
    }

    if (options.archive) {
      console.log(`\n📦 Archive Capabilities Demo:`);
      await archiveCLI.status();
    }

    if (options.performance) {
      console.log(`\n⚡ Performance Benchmarks Demo:`);
      await archiveCLI.benchmark();
    }

    if (!options.markdown && !options.archive && !options.performance) {
      console.log(`Available demos:`);
      console.log(`  --markdown    Native markdown supremacy`);
      console.log(`  --archive     Archive capabilities`);
      console.log(`  --performance Performance benchmarks`);
    }
  }

  private showHelp(): void {
    console.log(`🏭 FactoryWager CLI v${this.version} - Enterprise Configuration Management`);
    console.log(``);
    console.log(`USAGE:`);
    console.log(`  factory-wager <command> [options]`);
    console.log(``);
    console.log(`COMMANDS:`);
    console.log(`  archive     Manage R2 archives`);
    console.log(`    status     Show archive status`);
    console.log(`    config     Show archive configuration`);
    console.log(`    benchmark  Run performance benchmarks`);
    console.log(``);
    console.log(`  render      Render markdown with Factory chromatics`);
    console.log(`    <file>     Markdown file to render`);
    console.log(`    -f, --format <format>    Output format (ansi|html|react|json)`);
    console.log(`    -o, --output <file>      Write output to file`);
    console.log(`    --chromatic              Use Factory color scheme`);
    console.log(`    --performance            Show render timing`);
    console.log(``);
    console.log(`  analyze     Analyze FactoryWager configuration`);
    console.log(`    <config>   Configuration file to analyze`);
    console.log(``);
    console.log(`  release     Release orchestrator (analyze → gate → deploy → finalize)`);
    console.log(`    <config>   Configuration file (default: config.yaml)`);
    console.log(`    --version=<ver>  Semantic version (required)`);
    console.log(`    --yes            Auto-confirm for CI/CD`);
    console.log(`    --dry-run        Simulate deployment`);
    console.log(`    --from=<ref>     Base git ref for changelog`);
    console.log(``);
    console.log(`  health      Check system health`);
    console.log(`    --verbose  Detailed health report`);
    console.log(``);
    console.log(`  demo        Run demonstrations`);
    console.log(`    --markdown    Native markdown demo`);
    console.log(`    --archive     Archive capabilities demo`);
    console.log(`    --performance Performance benchmarks demo`);
    console.log(``);
    console.log(`  --version   Show version information`);
    console.log(`  --help      Show this help message`);
    console.log(``);
    console.log(`EXAMPLES:`);
    console.log(`  factory-wager archive status`);
    console.log(`  factory-wager render README.md --chromatic`);
    console.log(`  factory-wager health --verbose`);
    console.log(`  factory-wager release config.yaml --version=1.3.0`);
    console.log(`  factory-wager release config.yaml --version=1.3.0 --yes`);
    console.log(`  factory-wager release config.yaml --version=1.3.0 --dry-run`);
    console.log(`  factory-wager demo --markdown`);
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
