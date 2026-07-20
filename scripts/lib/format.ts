// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Shared formatting helpers for scripts.
 */

type FormatBytesOptions = {
  /** Number of decimal places (default 2). */
  decimals?: number;
  /** Use compact unit labels without the second letter (B/K/M/G/T). Default false. */
  compact?: boolean;
  /** Insert a space between value and unit. Default true unless compact. */
  space?: boolean;
};

/** Format bytes to a human-readable string (B/KB/MB/GB/TB). */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const { decimals = 2, compact = false, space = !compact } = options;
  const units = compact ? ['B', 'K', 'M', 'G', 'T'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return space ? `0 ${units[0]}` : `0${units[0]}`;
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return `${value}${space ? ' ' : ''}${units[i]}`;
}
