/**
 * Unified CLI Framework
 *
 * Provides:
 * - Standardized argument parsing
 * - Progress indicators
 * - Colored output
 * - Config file support
 * - Command routing
 * - Plugin system
 */

// ==================== Types ====================

export interface CLIConfig {
  name: string;
  version: string;
  description: string;
  commands: CommandDefinition[];
  globalOptions?: OptionDefinition[];
  theme?: 'light' | 'dark' | 'auto';
}

export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  options?: OptionDefinition[];
  arguments?: ArgumentDefinition[];
  subcommands?: CommandDefinition[];
  handler: (ctx: CommandContext) => Promise<void> | void;
}

export interface OptionDefinition {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  short?: string;
  default?: any;
  required?: boolean;
}

export interface ArgumentDefinition {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
}

export interface CommandContext {
  command: string;
  args: Record<string, any>;
  options: Record<string, any>;
  cli: UnifiedCLI;
}

export interface CLIMiddleware {
  (ctx: CommandContext, next: () => Promise<void>): Promise<void>;
}

// ==================== Colors ====================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export type ColorName = keyof typeof COLORS;

// ==================== Progress Bar ====================

export class ProgressBar {
  private total: number;
  private current = 0;
  private width: number;
  private label: string;
  private startTime: number;

  constructor(total: number, label = 'Progress', width = 40) {
    this.total = total;
    this.width = width;
    this.label = label;
    this.startTime = Date.now();
  }

  update(current: number, message?: string): void {
    this.current = current;
    const percent = Math.round((current / this.total) * 100);
    const filled = Math.round((this.width * current) / this.total);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    process.stdout.write(
      `\r${COLORS.cyan}${this.label}:${COLORS.reset} [${bar}] ${percent}% | ${current}/${this.total} | ${elapsed}s${message ? ` | ${message}` : ''}`
    );

    if (current >= this.total) {
      process.stdout.write('\n');
    }
  }

  increment(message?: string): void {
    this.update(this.current + 1, message);
  }

  finish(message?: string): void {
    this.update(this.total, message);
  }
}

// ==================== Spinner ====================

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private index = 0;
  private timer: Timer | null = null;
  private label: string;

  constructor(label = 'Loading') {
    this.label = label;
  }

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      process.stdout.write(
        `\r${COLORS.cyan}${this.frames[this.index]}${COLORS.reset} ${this.label}...`
      );
      this.index = (this.index + 1) % this.frames.length;
    }, 80);
  }

  stop(message?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write(`\r${COLORS.green}✓${COLORS.reset} ${message || this.label}\n`);
    }
  }

  fail(message?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write(`\r${COLORS.red}✗${COLORS.reset} ${message || this.label}\n`);
    }
  }
}

// ==================== Table Output ====================

export function renderTable(
  headers: string[],
  rows: (string | number)[][],
  options: { padding?: number; align?: ('left' | 'right' | 'center')[] } = {}
): string {
  const padding = options.padding || 2;
  const align = options.align || headers.map(() => 'left');

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const cellWidths = rows.map(r => String(r[i]).length);
    return Math.max(h.length, ...cellWidths) + padding;
  });

  // Build separator
  const separator = '+' + widths.map(w => '-'.repeat(w)).join('+') + '+';

  // Build header
  const headerRow =
    '|' +
    headers
      .map((h, i) => {
        const aligned =
          align[i] === 'right'
            ? h.padStart(widths[i] - padding).padEnd(widths[i])
            : h.padEnd(widths[i]);
        return ' '.repeat(Math.floor(padding / 2)) + aligned + ' '.repeat(Math.floor(padding / 2));
      })
      .join('|') +
    '|';

  // Build rows
  const dataRows = rows.map(
    row =>
      '|' +
      row
        .map((cell, i) => {
          const str = String(cell);
          const aligned =
            align[i] === 'right'
              ? str.padStart(widths[i] - padding).padEnd(widths[i])
              : str.padEnd(widths[i]);
          return (
            ' '.repeat(Math.floor(padding / 2)) + aligned + ' '.repeat(Math.floor(padding / 2))
          );
        })
        .join('|') +
      '|'
  );

  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}

// ==================== Unified CLI ====================

export class UnifiedCLI {
  private config: CLIConfig;
  private middlewares: CLIMiddleware[] = [];
  private plugins: Map<string, any> = new Map();

  constructor(config: CLIConfig) {
    this.config = config;
  }

  // ==================== Middleware ====================

  use(middleware: CLIMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  // ==================== Plugin System ====================

  plugin(name: string, plugin: any): this {
    this.plugins.set(name, plugin);
    return this;
  }

  getPlugin<T>(name: string): T | undefined {
    return this.plugins.get(name) as T;
  }

  // ==================== Execution ====================

  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    try {
      // Parse arguments
      const { command, args, options } = this.parse(argv);

      // Find command
      const cmdDef = this.findCommand(command);
      if (!cmdDef) {
        this.showHelp();
        process.exit(1);
      }

      // Build context
      const ctx: CommandContext = {
        command,
        args,
        options,
        cli: this,
      };

      // Execute middleware chain
      await this.executeMiddleware(ctx, async () => {
        await cmdDef.handler(ctx);
      });
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private async executeMiddleware(
    ctx: CommandContext,
    handler: () => Promise<void>
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(ctx, next);
      } else {
        await handler();
      }
    };

    await next();
  }

  // ==================== Parsing ====================

  private parse(argv: string[]): {
    command: string;
    args: Record<string, any>;
    options: Record<string, any>;
  } {
    // Find command (first non-option argument)
    let commandIndex = 0;
    for (let i = 0; i < argv.length; i++) {
      if (!argv[i].startsWith('-')) {
        commandIndex = i;
        break;
      }
    }

    const command = argv[commandIndex] || 'help';
    const remainingArgs = [...argv.slice(0, commandIndex), ...argv.slice(commandIndex + 1)];

    // Parse options
    const cmdDef = this.findCommand(command);
    const options: Record<string, any> = {};

    // Parse global options
    this.config.globalOptions?.forEach(opt => {
      const value = this.getOptionValue(remainingArgs, opt);
      if (value !== undefined) options[opt.name] = value;
      else if (opt.default !== undefined) options[opt.name] = opt.default;
    });

    // Parse command options
    cmdDef?.options?.forEach(opt => {
      const value = this.getOptionValue(remainingArgs, opt);
      if (value !== undefined) options[opt.name] = value;
      else if (opt.default !== undefined) options[opt.name] = opt.default;
    });

    // Parse positional arguments
    const args: Record<string, any> = {};
    const positionalArgs = remainingArgs.filter(arg => !arg.startsWith('-'));

    cmdDef?.arguments?.forEach((arg, index) => {
      if (arg.variadic) {
        args[arg.name] = positionalArgs.slice(index);
      } else {
        args[arg.name] = positionalArgs[index];
      }
    });

    return { command, args, options };
  }

  private getOptionValue(args: string[], opt: OptionDefinition): any {
    const longFlag = `--${opt.name}`;
    const shortFlag = opt.short ? `-${opt.short}` : null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === longFlag || arg === shortFlag) {
        if (opt.type === 'boolean') {
          return true;
        }
        const value = args[i + 1];
        if (value && !value.startsWith('-')) {
          return opt.type === 'number' ? Number(value) : value;
        }
      }

      if (arg.startsWith(`${longFlag}=`)) {
        const value = arg.slice(longFlag.length + 1);
        return opt.type === 'number' ? Number(value) : value;
      }
    }

    return undefined;
  }

  private findCommand(name: string): CommandDefinition | undefined {
    for (const cmd of this.config.commands) {
      if (cmd.name === name || cmd.aliases?.includes(name)) {
        return cmd;
      }
      // Check subcommands
      if (cmd.subcommands) {
        for (const sub of cmd.subcommands) {
          if (sub.name === name || sub.aliases?.includes(name)) {
            return sub;
          }
        }
      }
    }
    return undefined;
  }

  // ==================== Output Helpers ====================

  log(message: string): void {
    console.log(message);
  }

  styled(text: string, color: ColorName): string {
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  success(message: string): void {
    console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
  }

  error(message: string): void {
    console.error(`${COLORS.red}✗${COLORS.reset} ${message}`);
  }

  warning(message: string): void {
    console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
  }

  info(message: string): void {
    console.log(`${COLORS.blue}ℹ${COLORS.reset} ${message}`);
  }

  header(title: string): void {
    console.log();
    console.log(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
    console.log(COLORS.dim + '─'.repeat(title.length) + COLORS.reset);
  }

  // ==================== Help ====================

  showHelp(): void {
    console.log();
    console.log(`${COLORS.bright}${this.config.name}${COLORS.reset} v${this.config.version}`);
    console.log(`${COLORS.dim}${this.config.description}${COLORS.reset}`);
    console.log();

    console.log(`${COLORS.cyan}Usage:${COLORS.reset}`);
    console.log(`  ${this.config.name} <command> [options]`);
    console.log();

    console.log(`${COLORS.cyan}Commands:${COLORS.reset}`);
    for (const cmd of this.config.commands) {
      const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
      console.log(`  ${cmd.name.padEnd(15)}${aliases.padEnd(15)} ${cmd.description}`);
    }
    console.log();

    if (this.config.globalOptions?.length) {
      console.log(`${COLORS.cyan}Global Options:${COLORS.reset}`);
      for (const opt of this.config.globalOptions) {
        const short = opt.short ? `-${opt.short}, ` : '    ';
        console.log(`  ${short}--${opt.name.padEnd(15)} ${opt.description}`);
      }
      console.log();
    }
  }

  showCommandHelp(command: string): void {
    const cmd = this.findCommand(command);
    if (!cmd) return;

    console.log();
    console.log(`${COLORS.bright}${command}${COLORS.reset} - ${cmd.description}`);
    console.log();

    if (cmd.options?.length) {
      console.log(`${COLORS.cyan}Options:${COLORS.reset}`);
      for (const opt of cmd.options) {
        const short = opt.short ? `-${opt.short}, ` : '    ';
        const defaultStr = opt.default !== undefined ? ` [default: ${opt.default}]` : '';
        console.log(`  ${short}--${opt.name.padEnd(15)} ${opt.description}${defaultStr}`);
      }
      console.log();
    }
  }
}

// ==================== Factory ====================

export function createCLI(config: CLIConfig): UnifiedCLI {
  return new UnifiedCLI(config);
}

export default UnifiedCLI;
