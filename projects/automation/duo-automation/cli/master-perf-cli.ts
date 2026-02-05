// cli/master-perf-cli.ts - Master Performance CLI Tool

import { DeepPerfFormatter } from '../src/inspection/deep-perf-formatter';
import { getMasterPerfMetrics } from '../src/storage/r2-apple-manager';
import { writeFile } from 'fs/promises';

interface PerfCLIOptions {
  format?: 'table' | 'plain' | 'json' | 'csv';
  output?: string;
  depth?: number;
  maxRows?: number;
  colorBlindMode?: 'protanopia' | 'deuteranopia' | 'tritanopia';
  verbose?: boolean;
  help?: boolean;
}

class MasterPerfCLI {
  private options: PerfCLIOptions = {};
  
  constructor(args: string[] = []) {
    this.parseOptions(args);
  }

  /**
   * Parse command line options
   */
  private parseOptions(args: string[]): void {
    for (const arg of args) {
      if (arg.startsWith('--format=')) {
        this.options.format = arg.split('=')[1] as any;
      } else if (arg.startsWith('--output=')) {
        this.options.output = arg.split('=')[1];
      } else if (arg.startsWith('--depth=')) {
        this.options.depth = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--max-rows=')) {
        this.options.maxRows = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--color-blind=')) {
        this.options.colorBlindMode = arg.split('=')[1] as any;
      } else if (arg === '--verbose') {
        this.options.verbose = true;
      } else if (arg === '--help' || arg === '-h') {
        this.options.help = true;
      }
    }
  }

  /**
   * Run the performance CLI
   */
  async run(): Promise<void> {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    try {
      // Get performance metrics
      const metrics = getMasterPerfMetrics();
      
      // Auto-detect depth based on terminal size if not specified
      const terminalWidth = process.stdout.columns || 120;
      const autoDepth = this.options.depth || (terminalWidth > 100 ? 3 : terminalWidth > 80 ? 2 : 1);
      
      // Detect color blind mode from environment if not specified
      const colorBlindMode = this.options.colorBlindMode || process.env.PERF_COLOR_BLIND_MODE as any;
      
      // Create formatter
      const formatter = new DeepPerfFormatter(metrics, {
        maxDepth: autoDepth,
        colorBlindMode,
        maxRows: this.options.maxRows || 25
      });

      // Generate output based on format
      const format = this.options.format || (process.stdout.isTTY ? 'table' : 'plain');
      let output: string;

      switch (format) {
        case 'json':
          output = formatter.generateJsonExport();
          break;
        case 'csv':
          output = formatter.generateCsvExport();
          break;
        case 'plain':
          output = formatter.generatePlainText();
          break;
        case 'table':
        default:
          output = formatter.generateTable();
          break;
      }

      // Output to console or file
      if (this.options.output) {
        await writeFile(this.options.output, output);
        console.log(`✅ Performance report saved to: ${this.options.output}`);
      } else {
        console.log(output);
      }

      // Always save full data to JSON file for archival
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFile = `master-perf-${timestamp}.json`;
      await writeFile(jsonFile, formatter.generateJsonExport());
      
      if (this.options.verbose) {
        console.log(`📊 Full data archived to: ${jsonFile}`);
      }

      // Show summary if verbose
      if (this.options.verbose) {
        this.showSummary(metrics);
      }

    } catch (error) {
      console.error('❌ Error generating performance report:', error);
      process.exit(1);
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
🚀 Master Performance CLI Tool

Usage: bun run cli/master-perf-cli.ts [options]

Options:
  --format=<format>        Output format: table, plain, json, csv (default: table)
  --output=<file>          Save output to file instead of console
  --depth=<number>         Maximum depth for nested data (default: auto-detect)
  --max-rows=<number>      Maximum rows to display (default: 25)
  --color-blind=<mode>     Color blind mode: protanopia, deuteranopia, tritanopia
  --verbose                Show detailed information and summary
  --help, -h               Show this help message

Environment Variables:
  PERF_COLOR_BLIND_MODE    Set color blind mode (protanopia, deuteranopia, tritanopia)

Examples:
  # Generate table output (default)
  bun run cli/master-perf-cli.ts

  # Generate JSON output
  bun run cli/master-perf-cli.ts --format=json

  # Save report to file
  bun run cli/master-perf-cli.ts --output=perf-report.md

  # Generate CSV for spreadsheet analysis
  bun run cli/master-perf-cli.ts --format=csv --output=perf-data.csv

  # Color blind friendly output
  bun run cli/master-perf-cli.ts --color-blind=protanopia

  # Verbose output with summary
  bun run cli/master-perf-cli.ts --verbose

  # Custom depth and row limits
  bun run cli/master-perf-cli.ts --depth=4 --max-rows=50

Output Formats:
  table     - Rich table format with colors (TTY only)
  plain     - Plain text format suitable for logs
  json      - Complete JSON data for programmatic use
  csv       - CSV format for spreadsheet analysis

Files Generated:
  - Console output or specified file
  - master-perf-<timestamp>.json (full data archive)
    `);
  }

  /**
   * Show performance summary
   */
  private showSummary(metrics: any): void {
    console.log('\n📊 Performance Summary');
    console.log('====================');
    
    // Extract key metrics (this would depend on your actual metrics structure)
    if (metrics.system) {
      console.log(`System: ${metrics.system.os || 'Unknown'} (${metrics.system.arch || 'Unknown'})`);
    }
    
    if (metrics.performance) {
      console.log(`Memory Usage: ${metrics.performance.memoryUsed || 'N/A'} MB`);
      console.log(`CPU Usage: ${metrics.performance.cpuUsage || 'N/A'}%`);
    }
    
    if (metrics.bundles) {
      console.log(`Bundle Count: ${Object.keys(metrics.bundles).length}`);
      console.log(`Total Size: ${metrics.totalSize || 'N/A'} KB`);
    }
    
    console.log(`Generated: ${new Date().toISOString()}`);
  }
}

// CLI execution
if (import.meta.main) {
  const cli = new MasterPerfCLI(process.argv.slice(2));
  await cli.run();
}

export { MasterPerfCLI };
