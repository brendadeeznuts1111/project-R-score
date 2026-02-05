/**
 * @dynamic-spy/kit - ANSI Terminal Renderer
 *
 * Low-level terminal rendering with cursor control,
 * screen management, and animation support
 */

import {
  type ArbColor,
  type ColorStyle,
  ESC,
  RESET,
  STYLE,
  CURSOR,
  SCREEN,
  fg256,
  bg256,
  fgRGB,
  bgRGB,
  applyStyle,
  pad,
  width,
  strip,
  truncate,
  GRAYS,
  BRIGHT,
} from '../colors/bright-ansi';

// ============================================================================
// 1. TERMINAL DIMENSIONS
// ============================================================================

export interface TerminalSize {
  rows: number;
  cols: number;
}

/**
 * Get current terminal size
 */
export function getTerminalSize(): TerminalSize {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  };
}

/**
 * Check if stdout is a TTY
 */
export function isTTY(): boolean {
  return process.stdout.isTTY ?? false;
}

// ============================================================================
// 2. RAW OUTPUT
// ============================================================================

/**
 * Write directly to stdout without newline
 */
export function write(text: string): void {
  process.stdout.write(text);
}

/**
 * Write line to stdout
 */
export function writeLine(text: string): void {
  process.stdout.write(text + '\n');
}

/**
 * Flush stdout
 */
export function flush(): void {
  // Bun automatically flushes, but this is here for API completeness
}

// ============================================================================
// 3. CURSOR CONTROL
// ============================================================================

export const cursor = {
  /** Move cursor up N rows */
  up: (n = 1) => write(CURSOR.UP(n)),

  /** Move cursor down N rows */
  down: (n = 1) => write(CURSOR.DOWN(n)),

  /** Move cursor right N columns */
  right: (n = 1) => write(CURSOR.RIGHT(n)),

  /** Move cursor left N columns */
  left: (n = 1) => write(CURSOR.LEFT(n)),

  /** Move cursor to absolute position */
  to: (row: number, col: number) => write(CURSOR.POS(row, col)),

  /** Move cursor to start of line */
  toStart: () => write('\r'),

  /** Save cursor position */
  save: () => write(CURSOR.SAVE),

  /** Restore cursor position */
  restore: () => write(CURSOR.RESTORE),

  /** Hide cursor */
  hide: () => write(CURSOR.HIDE),

  /** Show cursor */
  show: () => write(CURSOR.SHOW),

  /** Move to home position (1,1) */
  home: () => write(CURSOR.POS(1, 1)),
};

// ============================================================================
// 4. SCREEN CONTROL
// ============================================================================

export const screen = {
  /** Clear entire screen */
  clear: () => write(SCREEN.CLEAR + CURSOR.POS(1, 1)),

  /** Clear current line */
  clearLine: () => write('\r' + SCREEN.CLEAR_LINE),

  /** Clear from cursor to end of screen */
  clearToEnd: () => write(SCREEN.CLEAR_TO_END),

  /** Clear from cursor to start of screen */
  clearToStart: () => write(SCREEN.CLEAR_TO_START),

  /** Enter alternate screen buffer */
  alternate: () => write('\x1b[?1049h'),

  /** Exit alternate screen buffer */
  main: () => write('\x1b[?1049l'),

  /** Enable line wrapping */
  enableWrap: () => write('\x1b[?7h'),

  /** Disable line wrapping */
  disableWrap: () => write('\x1b[?7l'),
};

// ============================================================================
// 5. STYLED TEXT
// ============================================================================

/**
 * Apply color to text
 */
export function colorize(text: string, color: ArbColor): string {
  return color.ansi + text + RESET;
}

/**
 * Apply background color to text
 */
export function bgColorize(text: string, color: ArbColor): string {
  return color.ansiBg + text + RESET;
}

/**
 * Apply bold style
 */
export function bold(text: string): string {
  return STYLE.BOLD + text + RESET;
}

/**
 * Apply dim style
 */
export function dim(text: string): string {
  return STYLE.DIM + text + RESET;
}

/**
 * Apply italic style
 */
export function italic(text: string): string {
  return STYLE.ITALIC + text + RESET;
}

/**
 * Apply underline style
 */
export function underline(text: string): string {
  return STYLE.UNDERLINE + text + RESET;
}

/**
 * Apply blink style
 */
export function blink(text: string): string {
  return STYLE.BLINK + text + RESET;
}

/**
 * Apply reverse video style
 */
export function reverse(text: string): string {
  return STYLE.REVERSE + text + RESET;
}

/**
 * Apply strikethrough style
 */
export function strike(text: string): string {
  return STYLE.STRIKE + text + RESET;
}

/**
 * Chain multiple styles
 */
export function styled(text: string, ...styles: string[]): string {
  return styles.join('') + text + RESET;
}

// ============================================================================
// 6. TABLE RENDERING
// ============================================================================

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  headerColor?: ArbColor;
  cellColor?: ArbColor | ((value: unknown, row: unknown) => ArbColor);
}

export interface TableOptions {
  columns: TableColumn[];
  headerStyle?: ColorStyle;
  rowStyle?: ColorStyle;
  alternateRowStyle?: ColorStyle;
  borderColor?: ArbColor;
  showBorder?: boolean;
  showHeader?: boolean;
}

/**
 * Render a table row
 */
function renderTableRow(
  values: unknown[],
  columns: TableColumn[],
  style?: ColorStyle,
  rowData?: unknown
): string {
  const cells = values.map((value, i) => {
    const col = columns[i];
    const text = String(value);
    const truncated = truncate(text, col.width);
    const padded = pad(truncated, col.width, col.align);

    let cellColor: ArbColor | undefined;
    if (typeof col.cellColor === 'function') {
      cellColor = col.cellColor(value, rowData);
    } else {
      cellColor = col.cellColor;
    }

    if (cellColor) {
      return cellColor.ansi + padded + RESET;
    }
    return padded;
  });

  const row = cells.join(' │ ');

  if (style) {
    return applyStyle(row, style);
  }
  return row;
}

/**
 * Render a complete table
 */
export function renderTable<T>(
  data: T[],
  getValue: (row: T, colIndex: number) => unknown,
  options: TableOptions
): string {
  const { columns, showBorder = true, showHeader = true } = options;
  const borderColor = options.borderColor ?? GRAYS.GRAY_10;
  const lines: string[] = [];

  // Calculate total width
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + (columns.length - 1) * 3;

  // Top border
  if (showBorder) {
    lines.push(borderColor.ansi + '┌' + '─'.repeat(totalWidth + 2) + '┐' + RESET);
  }

  // Header
  if (showHeader) {
    const headerValues = columns.map(col => {
      const header = col.header;
      const padded = pad(header, col.width, col.align);
      if (col.headerColor) {
        return col.headerColor.ansi + STYLE.BOLD + padded + RESET;
      }
      return STYLE.BOLD + padded + RESET;
    });

    const headerRow = headerValues.join(' │ ');
    if (showBorder) {
      lines.push(borderColor.ansi + '│ ' + RESET + headerRow + borderColor.ansi + ' │' + RESET);
      lines.push(borderColor.ansi + '├' + '─'.repeat(totalWidth + 2) + '┤' + RESET);
    } else {
      lines.push(headerRow);
      lines.push('─'.repeat(totalWidth));
    }
  }

  // Data rows
  data.forEach((row, rowIndex) => {
    const values = columns.map((_, colIndex) => getValue(row, colIndex));
    const style = rowIndex % 2 === 1 ? options.alternateRowStyle : options.rowStyle;
    const renderedRow = renderTableRow(values, columns, style, row);

    if (showBorder) {
      lines.push(borderColor.ansi + '│ ' + RESET + renderedRow + borderColor.ansi + ' │' + RESET);
    } else {
      lines.push(renderedRow);
    }
  });

  // Bottom border
  if (showBorder) {
    lines.push(borderColor.ansi + '└' + '─'.repeat(totalWidth + 2) + '┘' + RESET);
  }

  return lines.join('\n');
}

// ============================================================================
// 7. PROGRESS INDICATORS
// ============================================================================

/**
 * Render a progress bar
 */
export function progressBar(
  progress: number,
  width: number,
  options: {
    filledChar?: string;
    emptyChar?: string;
    filledColor?: ArbColor;
    emptyColor?: ArbColor;
    showPercent?: boolean;
  } = {}
): string {
  const {
    filledChar = '█',
    emptyChar = '░',
    filledColor = BRIGHT.GREEN,
    emptyColor = GRAYS.GRAY_4,
    showPercent = true,
  } = options;

  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * width);
  const empty = width - filled;

  let bar = filledColor.ansi + filledChar.repeat(filled) +
            emptyColor.ansi + emptyChar.repeat(empty) + RESET;

  if (showPercent) {
    const pct = (clamped * 100).toFixed(0).padStart(3) + '%';
    bar += ' ' + pct;
  }

  return bar;
}

/**
 * Spinner characters for animation
 */
export const SPINNERS = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  circle: ['◐', '◓', '◑', '◒'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  pulse: ['█', '▓', '▒', '░', '▒', '▓'],
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
} as const;

/**
 * Create a spinner renderer
 */
export function createSpinner(
  type: keyof typeof SPINNERS = 'dots',
  color: ArbColor = BRIGHT.CYAN
): { frame: (index: number) => string; length: number } {
  const frames = SPINNERS[type];
  return {
    frame: (index: number) => color.ansi + frames[index % frames.length] + RESET,
    length: frames.length,
  };
}

// ============================================================================
// 8. ANIMATION HELPERS
// ============================================================================

export interface AnimationFrame {
  content: string;
  row: number;
  col: number;
}

/**
 * Render animation frame at position
 */
export function renderFrame(frame: AnimationFrame): void {
  cursor.save();
  cursor.to(frame.row, frame.col);
  write(frame.content);
  cursor.restore();
}

/**
 * Create a pulsing effect (brightness oscillation)
 */
export function pulse(text: string, color: ArbColor, intensity: number): string {
  // Intensity 0-1, adjusts brightness
  const r = Math.round(color.rgb[0] * intensity);
  const g = Math.round(color.rgb[1] * intensity);
  const b = Math.round(color.rgb[2] * intensity);
  return fgRGB(r, g, b) + text + RESET;
}

/**
 * Create a flash effect (momentary highlight)
 */
export function flash(text: string, highlightColor: ArbColor = BRIGHT.WHITE): string {
  return STYLE.BOLD + highlightColor.ansiBg + text + RESET;
}

// ============================================================================
// 9. LAYOUT HELPERS
// ============================================================================

/**
 * Create a horizontal divider
 */
export function divider(width?: number, color: ArbColor = GRAYS.GRAY_10): string {
  const w = width ?? getTerminalSize().cols;
  return color.ansi + '─'.repeat(w) + RESET;
}

/**
 * Create a header with dividers
 */
export function header(text: string, color: ArbColor = BRIGHT.WHITE): string {
  const { cols } = getTerminalSize();
  const textWidth = Bun.stringWidth(text);
  const padding = Math.max(0, cols - textWidth - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return (
    GRAYS.GRAY_10.ansi + '─'.repeat(leftPad) + RESET +
    ' ' + STYLE.BOLD + color.ansi + text + RESET + ' ' +
    GRAYS.GRAY_10.ansi + '─'.repeat(rightPad) + RESET
  );
}

/**
 * Create a section box
 */
export function sectionBox(
  title: string,
  content: string[],
  options: {
    width?: number;
    borderColor?: ArbColor;
    titleColor?: ArbColor;
  } = {}
): string {
  const { borderColor = GRAYS.GRAY_12, titleColor = BRIGHT.WHITE } = options;
  const w = options.width ?? Math.max(...content.map(c => Bun.stringWidth(strip(c))), Bun.stringWidth(title)) + 4;
  const lines: string[] = [];

  // Title line
  const titlePadded = ` ${title} `;
  const titleWidth = Bun.stringWidth(titlePadded);
  const remainingWidth = w - titleWidth - 2;
  const leftBorder = Math.floor(remainingWidth / 2);
  const rightBorder = remainingWidth - leftBorder;

  lines.push(
    borderColor.ansi + '┌' + '─'.repeat(leftBorder) + RESET +
    STYLE.BOLD + titleColor.ansi + titlePadded + RESET +
    borderColor.ansi + '─'.repeat(rightBorder) + '┐' + RESET
  );

  // Content lines
  for (const line of content) {
    const lineWidth = Bun.stringWidth(strip(line));
    const padding = w - lineWidth - 4;
    lines.push(
      borderColor.ansi + '│ ' + RESET +
      line + ' '.repeat(padding) +
      borderColor.ansi + ' │' + RESET
    );
  }

  // Bottom border
  lines.push(borderColor.ansi + '└' + '─'.repeat(w - 2) + '┘' + RESET);

  return lines.join('\n');
}

// ============================================================================
// 10. IN-PLACE UPDATE RENDERER
// ============================================================================

export class LiveRenderer {
  private lines: string[] = [];
  private lastLineCount = 0;

  /**
   * Update display content
   */
  update(newLines: string[]): void {
    // Move up to clear previous output
    if (this.lastLineCount > 0) {
      write(CURSOR.UP(this.lastLineCount));
    }

    // Clear and write new lines
    for (let i = 0; i < newLines.length; i++) {
      write('\r' + SCREEN.CLEAR_LINE + newLines[i] + '\n');
    }

    // Clear any remaining old lines
    for (let i = newLines.length; i < this.lastLineCount; i++) {
      write(SCREEN.CLEAR_LINE + '\n');
    }

    // Move back up if we cleared extra lines
    if (newLines.length < this.lastLineCount) {
      write(CURSOR.UP(this.lastLineCount - newLines.length));
    }

    this.lines = newLines;
    this.lastLineCount = newLines.length;
  }

  /**
   * Clear all rendered content
   */
  clear(): void {
    if (this.lastLineCount > 0) {
      write(CURSOR.UP(this.lastLineCount));
      for (let i = 0; i < this.lastLineCount; i++) {
        write(SCREEN.CLEAR_LINE + '\n');
      }
      write(CURSOR.UP(this.lastLineCount));
    }
    this.lines = [];
    this.lastLineCount = 0;
  }
}

// ============================================================================
// 11. EXPORTS
// ============================================================================

export {
  cursor,
  screen,
  colorize,
  bgColorize,
  bold,
  dim,
  italic,
  underline,
  blink,
  reverse,
  strike,
  styled,
  write,
  writeLine,
  flush,
};
