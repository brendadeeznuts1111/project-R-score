// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/color — Bun.color
// lib/utils/output-helpers.ts — Colored console output helpers

/**
 * Write colored text to stdout
 */
export function writeColored(
  text: string,
  color: 'blue' | 'green' | 'yellow' | 'red' | 'cyan' | 'magenta' | 'white' = 'white'
): void {
  const colored = Bun.color(color, 'ansi');
  const reset = '\x1b[0m';
  Bun.write(Bun.stdout, colored + text + reset);
}

/**
 * Write colored line to stdout
 */
export function writeLine(
  text: string,
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'cyan' | 'magenta' | 'white'
): void {
  writeColored(text + '\n', color);
}

/**
 * Status symbols with colors
 */
export const StatusOutput = {
  success: (text: string) => writeColored(`✅ ${text}\n`, 'green'),
  error: (text: string) => writeColored(`❌ ${text}\n`, 'red'),
  warning: (text: string) => writeColored(`⚠️  ${text}\n`, 'yellow'),
  info: (text: string) => writeColored(`ℹ️  ${text}\n`, 'blue'),
  rocket: (text: string) => writeColored(`🚀 ${text}\n`, 'cyan'),
  metrics: (text: string) => writeColored(`📊 ${text}\n`, 'magenta'),
  memory: (text: string) => writeColored(`💾 ${text}\n`, 'cyan'),
  network: (text: string) => writeColored(`🌐 ${text}\n`, 'blue'),
};

/**
 * Format R-Score with color coding
 */
export function formatRScore(score: number): string {
  const color = score >= 0.95 ? 'green' : score >= 0.85 ? 'yellow' : 'red';
  const symbol = score >= 0.95 ? '🎯' : score >= 0.85 ? '⚠️' : '🚨';
  return `${symbol} R-Score: ${score.toFixed(3)}`;
}

/**
 * Write R-Score with appropriate color
 */
export function writeRScore(score: number): void {
  const formatted = formatRScore(score);
  const color: 'green' | 'yellow' | 'red' =
    score >= 0.95 ? 'green' : score >= 0.85 ? 'yellow' : 'red';
  writeLine(formatted, color);
}
