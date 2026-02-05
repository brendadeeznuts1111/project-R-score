/**
 * Terminal String Width Wrapper
 * Grapheme-aware string width calculation with ANSI/OSC 8 support
 *
 * Uses Bun v1.3.5+ native Bun.stringWidth() API
 * Handles ANSI escape sequences, OSC 8 hyperlinks, and emoji
 *
 * @module terminal/string-width-wrapper
 */

/**
 * Configuration for string width calculation
 */
export interface StringWidthOptions {
  /** Count ANSI escape sequences (default: false) */
  readonly countAnsi?: boolean;
  /** Ambiguous character width (default: 1) */
  readonly ambiguousWidth?: 1 | 2;
}

/**
 * Character width classification result
 */
export interface CharacterWidthInfo {
  /** The character or grapheme cluster */
  readonly char: string;
  /** Visual width in terminal cells */
  readonly width: number;
  /** Whether this is an ANSI escape sequence */
  readonly isAnsi: boolean;
  /** Whether this is part of an OSC 8 hyperlink */
  readonly isHyperlink: boolean;
}

/**
 * ANSI escape sequence patterns
 */
const ANSI_PATTERNS = {
  /** Standard CSI sequences (colors, cursor, etc.) */
  CSI: /\x1b\[[0-9;]*[A-Za-z]/g,
  /** OSC sequences (hyperlinks, window title, etc.) */
  OSC: /\x1b\].*?(?:\x07|\x1b\\)/g,
  /** OSC 8 hyperlink specifically */
  OSC8: /\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g,
  /** All ANSI sequences combined */
  ALL: /\x1b(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g,
} as const;

/**
 * TerminalStringWidth
 * Provides grapheme-aware string width calculation for terminal output
 *
 * Features:
 * - Uses Bun.stringWidth() native API for accurate width calculation
 * - Properly handles ANSI escape sequences (CSI, OSC)
 * - Supports OSC 8 hyperlinks (zero visual width for escape codes)
 * - Handles emoji and CJK characters correctly
 * - Security validation for malicious sequences
 */
export class TerminalStringWidth {
  private static instance: TerminalStringWidth | null = null;
  private readonly options: Required<StringWidthOptions>;

  constructor(options: StringWidthOptions = {}) {
    this.options = {
      countAnsi: options.countAnsi ?? false,
      ambiguousWidth: options.ambiguousWidth ?? 1,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: StringWidthOptions): TerminalStringWidth {
    if (!TerminalStringWidth.instance) {
      TerminalStringWidth.instance = new TerminalStringWidth(options);
    }
    return TerminalStringWidth.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    TerminalStringWidth.instance = null;
  }

  /**
   * Calculate the visual width of a string in terminal cells
   * Uses Bun.stringWidth() native API
   */
  width(str: string): number {
    if (!str) return 0;

    // Use Bun's native stringWidth with options
    return Bun.stringWidth(str, {
      countAnsiEscapeCodes: this.options.countAnsi,
      ambiguousIsNarrow: this.options.ambiguousWidth === 1,
    });
  }

  /**
   * Calculate width excluding ANSI escape sequences
   * Useful for strings that contain colors/formatting
   */
  widthWithoutAnsi(str: string): number {
    if (!str) return 0;

    // Strip ANSI sequences first
    const stripped = this.stripAnsi(str);
    return Bun.stringWidth(stripped, {
      countAnsiEscapeCodes: false,
      ambiguousIsNarrow: this.options.ambiguousWidth === 1,
    });
  }

  /**
   * Strip all ANSI escape sequences from a string
   */
  stripAnsi(str: string): string {
    if (!str) return '';
    return str.replace(ANSI_PATTERNS.ALL, '');
  }

  /**
   * Strip OSC 8 hyperlinks while preserving link text
   * Converts "\x1b]8;;url\x07text\x1b]8;;\x07" to just "text"
   */
  stripHyperlinks(str: string): string {
    if (!str) return '';

    // Match complete OSC 8 hyperlink sequences with text content
    // Pattern: \x1b]8;;url\x07 or \x1b]8;;url\x1b\\
    const hyperlinkPattern = /\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g;
    return str.replace(hyperlinkPattern, '');
  }

  /**
   * Analyze a string and return character-by-character width info
   */
  analyze(str: string): CharacterWidthInfo[] {
    if (!str) return [];

    const result: CharacterWidthInfo[] = [];
    let i = 0;

    while (i < str.length) {
      // Check for ANSI escape sequence
      if (str[i] === '\x1b') {
        const remaining = str.slice(i);

        // Try to match OSC 8 hyperlink
        const osc8Match = remaining.match(/^\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/);
        if (osc8Match) {
          result.push({
            char: osc8Match[0],
            width: 0,
            isAnsi: true,
            isHyperlink: true,
          });
          i += osc8Match[0].length;
          continue;
        }

        // Try to match other OSC sequences
        const oscMatch = remaining.match(/^\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/);
        if (oscMatch) {
          result.push({
            char: oscMatch[0],
            width: 0,
            isAnsi: true,
            isHyperlink: false,
          });
          i += oscMatch[0].length;
          continue;
        }

        // Try to match CSI sequences
        const csiMatch = remaining.match(/^\x1b\[[0-9;]*[A-Za-z]/);
        if (csiMatch) {
          result.push({
            char: csiMatch[0],
            width: 0,
            isAnsi: true,
            isHyperlink: false,
          });
          i += csiMatch[0].length;
          continue;
        }
      }

      // Regular character - use Bun.stringWidth for grapheme support
      const char = str[i];
      const charWidth = Bun.stringWidth(char, {
        countAnsiEscapeCodes: false,
        ambiguousIsNarrow: this.options.ambiguousWidth === 1,
      });

      result.push({
        char,
        width: charWidth,
        isAnsi: false,
        isHyperlink: false,
      });

      i++;
    }

    return result;
  }

  /**
   * Pad a string to a specified visual width
   * Accounts for ANSI sequences and wide characters
   */
  pad(str: string, targetWidth: number, align: 'left' | 'right' | 'center' = 'left'): string {
    const currentWidth = this.widthWithoutAnsi(str);
    const padding = targetWidth - currentWidth;

    if (padding <= 0) return str;

    const spaces = ' '.repeat(padding);

    switch (align) {
      case 'right':
        return spaces + str;
      case 'center': {
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      }
      case 'left':
      default:
        return str + spaces;
    }
  }

  /**
   * Truncate a string to a maximum visual width
   * Preserves ANSI formatting and adds ellipsis if needed
   */
  truncate(str: string, maxWidth: number, ellipsis: string = '...'): string {
    const currentWidth = this.widthWithoutAnsi(str);
    if (currentWidth <= maxWidth) return str;

    const ellipsisWidth = this.width(ellipsis);
    const targetWidth = maxWidth - ellipsisWidth;

    if (targetWidth <= 0) {
      return ellipsis.slice(0, maxWidth);
    }

    // Build truncated string character by character
    const analysis = this.analyze(str);
    let result = '';
    let width = 0;
    let lastAnsiSequence = '';

    for (const info of analysis) {
      if (info.isAnsi) {
        // Track ANSI sequences but don't count width
        result += info.char;
        if (!info.char.includes('m')) {
          // Not a color reset
          lastAnsiSequence = info.char;
        }
        continue;
      }

      if (width + info.width > targetWidth) {
        break;
      }

      result += info.char;
      width += info.width;
    }

    // Reset formatting if we were in a styled section
    const resetCode = lastAnsiSequence ? '\x1b[0m' : '';
    return result + resetCode + ellipsis;
  }

  /**
   * Wrap text to a maximum visual width
   * Returns array of lines
   */
  wrap(str: string, maxWidth: number): string[] {
    if (!str) return [''];

    const words = str.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = this.widthWithoutAnsi(word);

      if (currentWidth === 0) {
        // Start of a new line
        currentLine = word;
        currentWidth = wordWidth;
      } else if (currentWidth + 1 + wordWidth <= maxWidth) {
        // Word fits on current line
        currentLine += ' ' + word;
        currentWidth += 1 + wordWidth;
      } else {
        // Start new line
        lines.push(currentLine);
        currentLine = word;
        currentWidth = wordWidth;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Check if a string contains potentially malicious ANSI sequences
   */
  validateSecurity(str: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for excessive escape sequences (potential DoS)
    const escapeCount = (str.match(/\x1b/g) || []).length;
    if (escapeCount > 1000) {
      issues.push(`Excessive escape sequences: ${escapeCount} (max 1000)`);
    }

    // Check for terminal control sequences that could be dangerous
    const dangerousPatterns = [
      { pattern: /\x1b\[2J/, name: 'Screen clear' },
      { pattern: /\x1b\[H/, name: 'Cursor home' },
      { pattern: /\x1b\[\?1049[hl]/, name: 'Alternate screen buffer' },
      { pattern: /\x1b\[!p/, name: 'Soft terminal reset' },
      { pattern: /\x1bc/, name: 'Full terminal reset' },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(str)) {
        issues.push(`Potentially dangerous sequence: ${name}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get configuration options
   */
  getOptions(): Readonly<Required<StringWidthOptions>> {
    return { ...this.options };
  }
}

/**
 * Convenience functions for quick access
 */
export function stringWidth(str: string, options?: StringWidthOptions): number {
  return new TerminalStringWidth(options).width(str);
}

export function stripAnsi(str: string): string {
  return TerminalStringWidth.getInstance().stripAnsi(str);
}

export function padString(
  str: string,
  width: number,
  align?: 'left' | 'right' | 'center'
): string {
  return TerminalStringWidth.getInstance().pad(str, width, align);
}

export function truncateString(str: string, maxWidth: number, ellipsis?: string): string {
  return TerminalStringWidth.getInstance().truncate(str, maxWidth, ellipsis);
}

export function wrapString(str: string, maxWidth: number): string[] {
  return TerminalStringWidth.getInstance().wrap(str, maxWidth);
}
