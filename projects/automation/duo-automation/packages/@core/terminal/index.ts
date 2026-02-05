/**
 * @duoplus/terminal
 * Terminal utilities for Duo Automation CLI
 */

export { default as ansiParser } from '../../terminal/ansi-parser.ts';
export { default as progressIndicators } from '../../terminal/progress-indicators.ts';
export { default as unicodeFormatter } from '../../terminal/unicode-formatter.ts';

export function createTerminalConfig() {
  return {
    ansi: true,
    unicode: true,
    progress: true,
    colors: true
  };
}

export default {
  ansi: ansiParser,
  progress: progressIndicators,
  unicode: unicodeFormatter,
  config: createTerminalConfig
};
