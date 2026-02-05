/**
 * Terminal Utilities Module
 * Bun v1.3.5+ native terminal APIs for enhanced CLI output
 *
 * Features:
 * - TerminalStringWidth: Grapheme-aware width calculation
 * - HyperlinkManager: OSC 8 terminal hyperlinks
 *
 * @module terminal
 */

// String Width utilities
export {
  TerminalStringWidth,
  stringWidth,
  stripAnsi,
  padString,
  truncateString,
  wrapString,
  type StringWidthOptions,
  type CharacterWidthInfo,
} from './string-width-wrapper';

// Hyperlink utilities
export {
  HyperlinkManager,
  hyperlink,
  hyperlinkSafe,
  type HyperlinkOptions,
  type RegisteredHyperlink,
  type URLSecurityResult,
} from './hyperlink-manager';
