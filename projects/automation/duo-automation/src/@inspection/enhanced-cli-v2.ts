/**
 * Enhanced CLI Commands for Inspection System
 * 
 * Production-ready CLI with interactive mode, advanced filtering,
 * multiple output formats, and comprehensive help system.
 */

import { EnhancedInspectionSystem, EnhancedInspectionOptions } from './enhanced-inspection-system.js';
// Bun color alternatives
const colors = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  black: (text: string) => `\x1b[30m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  reset: (text: string) => `\x1b[0m${text}\x1b[0m`
};

const makeColor = (fn: (text: string) => string) =>
  Object.assign((text: string) => fn(text), { bold: (text: string) => fn(text) });

// Enhanced color functions
const chalk = {
  blue: makeColor(colors.blue),
  green: makeColor(colors.green),
  yellow: makeColor(colors.yellow),
  red: makeColor(colors.red),
  gray: colors.gray,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  blueBright: (text: string) => colors.blue(text),
  greenBright: (text: string) => colors.green(text),
  yellowBright: (text: string) => colors.yellow(text),
  redBright: (text: string) => colors.red(text),
  grayBright: (text: string) => colors.gray(text),
  cyan: colors.cyan,
  magenta: colors.magenta,
  white: colors.white,
  black: colors.black,
  dim: colors.dim,
  reset: colors.reset
};

// Mock readline for testing
const readline = {
  createInterface: (options: any) => ({
    question: (prompt: string, callback: (answer: string) => void) => {
      // Simulate user input
      setTimeout(() => callback('test'), 0);
    },
    close: () => {},
    completer: (line: string) => [[], line]
  })
};

export class EnhancedInspectCLI {
  private inspectSystem: EnhancedInspectionSystem;
  private rl?: readline.Interface;
  
  constructor() {
    this.inspectSystem = new EnhancedInspectionSystem();
  }
  
  /**
   * 🚀 Handle inspect command
   */
  async handleInspectCommand(args: string[]): Promise<void> {
    try {
      // Parse arguments
      const options = this.parseInspectArgs(args);
      
      // Interactive mode
      if (options.interactive && process.stdin.isTTY) {
        await this.interactiveMode(options);
        return;
      }
      
      // Run inspection
      const result = await this.inspectSystem.inspect(options);
      
      // Format and display output
      const output = this.formatOutput(result.data, result.stats, options);
      console.log(output);
      
      // Save to file if requested
      if (options.outputFile) {
        await this.saveOutput(options.outputFile, output, options.format);
        console.log(chalk.green(`📁 Output saved to ${options.outputFile}`));
      }
      
      // Show statistics if requested
      if (options.stats) {
        console.log(this.formatStats(result.stats));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Inspection failed:'), error);
      process.exit(1);
    }
  }
  
  /**
   * 🔍 Parse inspection arguments
   */
  private parseInspectArgs(args: string[]): EnhancedInspectionOptions {
    const options: EnhancedInspectionOptions = {
      format: 'human',
      redactSensitive: true,
      auditLog: true,
      trackUsage: true,
      maxDepth: 10
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Filter parsing
      if (arg.startsWith('--filter=')) {
        const value = arg.split('=')[1];
        if (value.startsWith('/')) {
          // Regex: /pattern/flags
          const match = value.match(/^\/(.+)\/([a-z]*)$/);
          if (match) {
            options.filter = new RegExp(match[1], match[2]);
          } else {
            options.filter = value;
          }
        } else if (value.startsWith('field:')) {
          // Field-specific: field:name
          options.field = value.split(':')[1];
        } else if (value.startsWith('type:')) {
          // Type-specific: type:string|number|boolean
          options.type = value.split(':')[1] as any;
        } else {
          options.filter = value;
        }
      }
      
      // Exclude patterns
      if (arg.startsWith('--exclude=')) {
        const value = arg.split('=')[1];
        if (value.includes(',')) {
          options.exclude = value.split(',');
        } else {
          options.exclude = value;
        }
      }
      
      // Max depth
      if (arg.startsWith('--max-depth=')) {
        options.maxDepth = parseInt(arg.split('=')[1], 10);
      }
      
      // Format
      if (arg.startsWith('--format=')) {
        options.format = arg.split('=')[1] as any;
      }
      
      // Output file
      if (arg.startsWith('--output=')) {
        options.outputFile = arg.split('=')[1];
      }
      
      // Plugin filters
      if (arg.startsWith('--plugin=')) {
        options.pluginFilters = arg.split('=')[1].split(',');
      }
      
      // Boolean flags
      const booleanFlags: Record<string, Partial<EnhancedInspectionOptions>> = {
        '--no-redact': { redactSensitive: false },
        '--no-audit': { auditLog: false },
        '--no-telemetry': { trackUsage: false },
        '--highlight': { highlight: true },
        '--stats': { stats: true },
        '--interactive': { interactive: true },
        '--watch': { watchMode: true },
        '--diff': { diffMode: true },
        '--async': { asyncProcessing: true },
      };
      
      if (booleanFlags[arg]) {
        Object.assign(options, booleanFlags[arg]);
      }
    }
    
    return options;
  }
  
  /**
   * 🎯 Interactive mode
   */
  private async interactiveMode(baseOptions: EnhancedInspectionOptions): Promise<void> {
    console.log(chalk.blue.bold('\n🎯 Interactive Inspection Mode'));
    console.log(chalk.gray('Type your filters interactively'));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.createCompleter(),
    });
    
    let options = { ...baseOptions };
    
    // Interactive prompts
    await this.promptForFilter(options);
    await this.promptForExclude(options);
    await this.promptForField(options);
    await this.promptForMaxDepth(options);
    await this.promptForPlugins(options);
    await this.promptForFormat(options);
    
    console.log('\n' + chalk.green('Running inspection...\n'));
    
    // Run inspection
    const result = await this.inspectSystem.inspect(options);
    
    // Display results
    const output = this.formatOutput(result.data, result.stats, options);
    console.log(output);
    
    if (options.stats) {
      console.log(this.formatStats(result.stats));
    }
    
    this.rl.close();
  }
  
  /**
   * 📝 Prompt for filter
   */
  private async promptForFilter(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('🔍 Enter filter keyword (or leave blank): ', (filter) => {
        if (filter) {
          if (filter.startsWith('/') && filter.endsWith('/')) {
            const match = filter.match(/^\/(.*)\/([a-z]*)$/);
            if (match) {
              options.filter = new RegExp(match[1], match[2]);
            }
          } else {
            options.filter = filter;
          }
        }
        resolve();
      });
    });
  }
  
  /**
   * 🚫 Prompt for exclude patterns
   */
  private async promptForExclude(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('🚫 Exclude patterns (comma-separated, or blank): ', (exclude) => {
        if (exclude) {
          options.exclude = exclude.split(',');
        }
        resolve();
      });
    });
  }
  
  /**
   * 📂 Prompt for field filter
   */
  private async promptForField(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('📂 Field filter (or blank): ', (field) => {
        if (field) {
          options.field = field;
        }
        resolve();
      });
    });
  }
  
  /**
   * 📊 Prompt for max depth
   */
  private async promptForMaxDepth(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('📊 Max depth (default 10): ', (depth) => {
        if (depth && !isNaN(parseInt(depth))) {
          options.maxDepth = parseInt(depth);
        }
        resolve();
      });
    });
  }
  
  /**
   * 🔌 Prompt for plugins
   */
  private async promptForPlugins(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('🔌 Plugins (payment,security,performance - comma-separated): ', (plugins) => {
        if (plugins) {
          options.pluginFilters = plugins.split(',').map(p => p.trim());
        }
        resolve();
      });
    });
  }
  
  /**
   * 📄 Prompt for format
   */
  private async promptForFormat(options: EnhancedInspectionOptions): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rl!.question('📄 Format (human,json,shell,compact,diff - default human): ', (format) => {
        if (format && ['human', 'json', 'shell', 'compact', 'diff'].includes(format)) {
          options.format = format as any;
        }
        resolve();
      });
    });
  }
  
  /**
   * 🎯 Create auto-completer
   */
  private createCompleter(): readline.Completer {
    const completions = [
      'venmo', 'cashapp', 'crypto', 'email', 'phone', 'keychain',
      'payment', 'security', 'performance', 'error', 'warning',
      'token', 'secret', 'password', 'duration', 'latency',
      'metadata', 'system', 'network', 'user', 'memory'
    ];
    
    return (line: string) => {
      const hits = completions.filter(c => c.startsWith(line));
      return [hits.length ? hits : completions, line];
    };
  }
  
  /**
   * 📄 Format output
   */
  private formatOutput(data: any, stats: any, options: EnhancedInspectionOptions): string {
    switch (options.format) {
      case 'json':
        return JSON.stringify(data, null, 2);
        
      case 'shell':
        return this.formatForShell(data);
        
      case 'compact':
        return JSON.stringify(data);
        
      case 'diff':
        return this.formatDiff(data);
        
      case 'human':
      default:
        return this.formatForHuman(data, stats, options);
    }
  }
  
  /**
   * 👤 Format for human display
   */
  private formatForHuman(data: any, stats: any, options: EnhancedInspectionOptions): string {
    const json = JSON.stringify(data, null, 2);
    
    // Highlight matches
    let output = json;
    if (options.highlight && options.filter) {
      const pattern = typeof options.filter === 'string' 
        ? new RegExp(options.filter, 'gi')
        : options.filter;
      output = output.replace(pattern, chalk.bgYellow('$&'));
    }
    
    return output;
  }
  
  /**
   * 🐚 Format for shell
   */
  private formatForShell(data: any): string {
    const lines: string[] = [];
    
    const formatValue = (key: string, value: any, indent = 0): void => {
      const prefix = ' '.repeat(indent * 2);
      const safeValue = String(value ?? '').replace(/'/g, "'\"'\"'");
      
      if (typeof value === 'object' && value !== null) {
        lines.push(`${prefix}# ${key}:`);
        if (Array.isArray(value)) {
          value.forEach((item, i) => {
            if (typeof item === 'object') {
              lines.push(`${prefix}${key}_${i}='${JSON.stringify(item)}'`);
            } else {
              lines.push(`${prefix}${key}_${i}='${item}'`);
            }
          });
        } else {
          Object.entries(value).forEach(([subKey, subValue]) => {
            formatValue(`${key}_${subKey}`, subValue, indent + 1);
          });
        }
      } else {
        lines.push(`${prefix}${key.toUpperCase()}='${safeValue}'`);
      }
    };
    
    Object.entries(data).forEach(([key, value]) => {
      formatValue(key, value);
    });
    
    return lines.join('\n');
  }
  
  /**
   * 🔄 Format diff
   */
  private formatDiff(data: any): string {
    const diffFile = './logs/last-inspection.json';
    
    try {
      if (Bun.file(diffFile).exists()) {
        const previous = JSON.parse(Bun.file(diffFile).text());
        const diff = this.calculateDiff(previous, data);
        
        // Save current for next comparison
        Bun.write(diffFile, JSON.stringify(data, null, 2));
        
        return this.formatDiffOutput(diff);
      } else {
        // First run, save baseline
        Bun.write(diffFile, JSON.stringify(data, null, 2));
        return chalk.blue('📝 First inspection - baseline saved');
      }
    } catch (error) {
      return chalk.red(`❌ Diff mode failed: ${error}`);
    }
  }
  
  /**
   * 📊 Calculate diff
   */
  private calculateDiff(previous: any, current: any): any {
    const diff: any = {};
    
    for (const key in current) {
      if (!(key in previous)) {
        diff[key] = { added: current[key] };
      } else if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        diff[key] = { 
          previous: previous[key],
          current: current[key]
        };
      }
    }
    
    // Check for removed keys
    for (const key in previous) {
      if (!(key in current)) {
        diff[key] = { removed: previous[key] };
      }
    }
    
    return diff;
  }
  
  /**
   * 📄 Format diff output
   */
  private formatDiffOutput(diff: any): string {
    let output = chalk.blue.bold('🔄 Inspection Diff\n');
    
    Object.entries(diff).forEach(([key, changes]: [string, any]) => {
      if (changes.added) {
        output += chalk.green(`➕ ${key}: ${JSON.stringify(changes.added, null, 2)}\n`);
      } else if (changes.removed) {
        output += chalk.red(`➖ ${key}: ${JSON.stringify(changes.removed, null, 2)}\n`);
      } else {
        output += chalk.yellow(`✏️  ${key} changed:\n`);
        output += chalk.gray(`   From: ${JSON.stringify(changes.previous, null, 2)}\n`);
        output += chalk.gray(`   To:   ${JSON.stringify(changes.current, null, 2)}\n`);
      }
    });
    
    return output;
  }
  
  /**
   * 📊 Format statistics
   */
  private formatStats(stats: any): string {
    return chalk.blue.bold('\n📊 Inspection Statistics\n') +
      chalk.gray('─'.repeat(40)) + '\n' +
      `⏱️  Processing time: ${stats.processingTime.toFixed(2)}ms\n` +
      `📏 Original size: ${this.formatBytes(stats.originalSize)}\n` +
      `📐 Filtered size: ${this.formatBytes(stats.filteredSize)}\n` +
      `🎯 Matches: ${stats.filterStats.matchedCount}/${stats.filterStats.totalCount}\n` +
      `🚫 Excluded: ${stats.filterStats.excludedCount}\n` +
      `🛡️  Redactions: ${stats.redactionCount}\n` +
      `🧩 Plugins used: ${stats.pluginCount}\n` +
      `💾 Memory used: ${this.formatBytes(stats.memoryUsage.heapUsed)}`;
  }
  
  /**
   * 💾 Format bytes
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  /**
   * 💾 Save output to file
   */
  private async saveOutput(filename: string, content: string, format: string): Promise<void> {
    try {
      await Bun.write(filename, content);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save to ${filename}:`), error);
    }
  }
  
  /**
   * 📖 Show help
   */
  static showHelp(): void {
    console.log(chalk.blue.bold('\n🔍 Enhanced Inspection System Help\n'));
    
    console.log(chalk.yellow('Basic Usage:'));
    console.log('  factory-wager inspect                    # Basic inspection');
    console.log('  factory-wager inspect --filter=keyword   # Filter by keyword');
    console.log('  factory-wager inspect --filter=/regex/   # Filter by regex');
    
    console.log(chalk.yellow('\nFiltering Options:'));
    console.log('  --filter=<pattern>              Filter by keyword, regex, or field:type');
    console.log('  --exclude=<patterns>             Exclude patterns (comma-separated)');
    console.log('  --field=<name>                   Filter by field name');
    console.log('  --type=<string|number|boolean>   Filter by data type');
    console.log('  --max-depth=<number>             Maximum recursion depth (default: 10)');
    
    console.log(chalk.yellow('\nOutput Options:'));
    console.log('  --format=<human|json|shell|compact|diff>  Output format');
    console.log('  --output=<filename>              Save to file');
    console.log('  --highlight                      Highlight matches');
    console.log('  --stats                          Show statistics');
    
    console.log(chalk.yellow('\nSecurity Options:'));
    console.log('  --no-redact                      Disable sensitive data redaction');
    console.log('  --no-audit                       Disable audit logging');
    console.log('  --no-telemetry                   Disable usage tracking');
    
    console.log(chalk.yellow('\nAdvanced Options:'));
    console.log('  --interactive                    Interactive mode');
    console.log('  --diff                           Compare with previous inspection');
    console.log('  --async                          Use async processing');
    console.log('  --plugin=<names>                 Apply plugins (payment,security,performance)');
    
    console.log(chalk.yellow('\nExamples:'));
    console.log('  factory-wager inspect --filter=payment --stats');
    console.log('  factory-wager inspect --filter=/venmo|cashapp/i --exclude=token');
    console.log('  factory-wager inspect --field=metadata --max-depth=3');
    console.log('  factory-wager inspect --plugin=payment,security --format=json');
    console.log('  factory-wager inspect --interactive');
    
    console.log(chalk.yellow('\nRegex Examples:'));
    console.log('  --filter=/error|warning/i        # Case-insensitive regex');
    console.log('  --filter=/\\d{4}-\\d{4}-\\d{4}-\\d{4}/  # Credit card pattern');
    console.log('  --filter=/^[A-Z]/                # Starts with uppercase');
    
    console.log(chalk.yellow('\nField/Type Examples:'));
    console.log('  --filter=field:metadata         # Filter by field name');
    console.log('  --filter=type:string            # Filter by string type');
    console.log('  --field=user --type=object      # Combined filters');
    
    console.log(chalk.gray('\nFor more information, see the documentation.'));
  }
}

export default EnhancedInspectCLI;
