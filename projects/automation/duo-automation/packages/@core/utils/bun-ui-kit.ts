// utils/bun-ui-kit.ts
/**
 * 🎨 EMPIRE PRO UNIFIED UI KIT
 * Native Bun v1.3.6 high-performance console utilities.
 * Combines: Colors (Chalk-like), Spinner (Ora-like), ASCII Art (Figlet-like), and Tables.
 */

import { stringWidth } from 'bun';

// --- COLORS (Native replacement for chalk) ---
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  empireBlue: '\x1b[38;5;27m',
  empireGold: '\x1b[38;5;220m',
  success: '\x1b[38;5;46m',
  warning: '\x1b[38;5;226m',
  error: '\x1b[38;5;196m',
  info: '\x1b[38;5;39m'
};

export const ui = {
  bold: (text: string) => `${colors.bold}${text}${colors.reset}`,
  dim: (text: string) => `${colors.dim}${text}${colors.reset}`,
  red: (text: string) => `${colors.red}${text}${colors.reset}`,
  green: (text: string) => `${colors.green}${text}${colors.reset}`,
  success: (text: string) => `${colors.success}${text}${colors.reset}`,
  error: (text: string) => `${colors.error}${text}${colors.reset}`,
  info: (text: string) => `${colors.info}${text}${colors.reset}`,
  warning: (text: string) => `${colors.warning}${text}${colors.reset}`,
  blue: (text: string) => `${colors.blue}${text}${colors.reset}`,
  empire: (text: string) => `${colors.empireBlue}${text}${colors.reset}`
};

// --- SPINNER (Native replacement for ora) ---
export const spinnerFrames = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  empire: ['🎯', '🚀', '⚡', '🔥', '💎', '👑']
};

export class BunSpinner {
  private interval: Timer | null = null;
  private frameIndex = 0;
  private startTime = 0;
  private lastText = '';

  constructor(private text: string = '', private spinnerType: keyof typeof spinnerFrames = 'dots') {}

  start(text?: string): this {
    if (text) this.text = text;
    this.startTime = Date.now();
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.render();
    this.interval = setInterval(() => this.render(), 80);
    return this;
  }

  updateText(text: string): void {
    this.text = text;
  }

  private render(): void {
    const frame = spinnerFrames[this.spinnerType][this.frameIndex % spinnerFrames[this.spinnerType].length];
    const output = `\r${colors.info}${frame} ${this.text}${colors.reset}`;
    if (output !== this.lastText) {
      process.stdout.write(output);
      this.lastText = output;
    }
    this.frameIndex++;
  }

  stop(symbol: string = '✅', finalText?: string): void {
    if (this.interval) clearInterval(this.interval);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r\x1B[K${symbol} ${finalText || this.text} (${elapsed}s)\n`);
    process.stdout.write('\x1B[?25h'); // Show cursor
  }

  succeed(text?: string) { this.stop('✅', text); }
  fail(text?: string) { this.stop('❌', text); }
}

// --- ASCII ART (Native figlet) ---
export const ASCII = {
  LOGO: `
  ___            _           ___            ___ _    ___ 
 | __|_ __  _ __(_)_ _ ___  | _ \\_ _ ___   / __| |  |_ _|
 | _|| '  \\| '_ \\ | '_/ -_) |  _/ '_/ _ \\ | (__| |__ | | 
 |___|_|_|_| .__/_|_| \\___| |_| |_| \\___/  \\___|____|___|
           |_|                                            `,
  BANNER: `
███████╗███████╗ ██████╗██████╗ ███████╗████████╗
██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝╚══██╔══╝
███████╗█████╗  ██║     ██████╔╝█████╗     ██║   
╚════██║██╔══╝  ██║     ██╔══██╗██╔══╝     ██║   
███████║███████╗╚██████╗██║  ██║███████╗   ██║   
╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   `
};

export const renderLogo = () => console.log(`${colors.empireBlue}${ASCII.LOGO}${colors.reset}\n`);

// --- TABLES ---
export function alignedTable(data: any[], cols: string[]) {
  // Pre-calculate widths efficiently
  const widths = new Array(cols.length).fill(0);
  for (let i = 0; i < cols.length; i++) {
    widths[i] = stringWidth(cols[i]);
    for (let j = 0; j < data.length; j++) {
      const val = String(data[j][cols[i]] ?? '');
      const width = stringWidth(val);
      if (width > widths[i]) widths[i] = width;
    }
  }

  const header = cols.map((col, i) => ui.bold(col.padEnd(widths[i]))).join(' │ ');
  const separator = '─'.repeat(widths.reduce((a, b) => a + b, 0) + (cols.length - 1) * 3);
  
  let output = header + '\n' + separator + '\n';

  for (let j = 0; j < data.length; j++) {
    const row = data[j];
    let line = '';
    for (let i = 0; i < cols.length; i++) {
      const val = String(row[cols[i]] ?? '');
      const width = stringWidth(val);
      const padding = ' '.repeat(Math.max(0, widths[i] - width));
      line += val + padding + (i === cols.length - 1 ? '' : ' │ ');
    }
    output += line + '\n';
  }
  
  process.stdout.write(output);
}

export default { ui, colors, BunSpinner, ASCII, renderLogo, alignedTable };