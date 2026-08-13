import {
  AUTO_TERMINAL_COLOR_FORMAT,
  colors,
  formatTerminal,
  terminalColorFormat,
  type TerminalColorDepth,
  type TerminalColorFormat,
} from '../src/index';

const depth: TerminalColorDepth = 'truecolor';
const format: TerminalColorFormat = terminalColorFormat(depth);
const auto: 'ansi' = AUTO_TERMINAL_COLOR_FORMAT;
const branded: string = colors.brand('ready');

formatTerminal('ready', '#e06c75', depth);
void format;
void auto;
void branded;

// @ts-expect-error — depth is caller intent, not a raw Bun.color format
formatTerminal('ready', '#e06c75', 'ansi-16m');

// @ts-expect-error — unsupported depth cannot silently fall back
terminalColorFormat('24-bit');
