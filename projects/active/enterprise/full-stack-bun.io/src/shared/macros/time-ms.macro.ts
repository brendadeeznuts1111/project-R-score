/**
 * TIME.MS.MACRO - Bun.ms() compile-time duration macros
 * Zero-runtime cost duration parsing with inlined literal milliseconds
 * BUN_MS_LITERAL - Compile-time duration conversion
 *
 * @see https://bun.com/docs/bundler/macros — macro imports
 */

// Unit multipliers in milliseconds
const UNITS = {
  y: 365.25 * 24 * 60 * 60 * 1000,  // years (accounting for leap years)
  M: 30.44 * 24 * 60 * 60 * 1000,   // months (average)
  w: 7 * 24 * 60 * 60 * 1000,       // weeks
  d: 24 * 60 * 60 * 1000,           // days
  h: 60 * 60 * 1000,                // hours
  m: 60 * 1000,                     // minutes
  s: 1000,                          // seconds
  ms: 1                             // milliseconds
} as const;

/**
 * TIME.MS.MACRO - Compile-time duration parser
 * Converts duration strings like '1.23y', '5d', '2h30m' to milliseconds
 * @param duration - Duration string with units (y/M/w/d/h/m/s/ms)
 * @returns Inlined millisecond value
 */
export function ms(duration: string): number {
  // Parse the duration string at compile time
  const result = parseDuration(duration);

  // Return the computed value as a literal (zero runtime cost)
  return result;
}

/**
 * Parse duration string into milliseconds
 * TIME.MS.MACRO - Internal parser for ms() macro
 */
function parseDuration(duration: string): number {
  // Handle empty or invalid input
  if (!duration || typeof duration !== 'string') {
    throw new Error('Invalid duration string');
  }

  if (/^\d+(?:\.\d+)?$/.test(duration)) return Math.round(Number(duration));

  let totalMs = 0;
  let offset = 0;
  const parts = /(\d+(?:\.\d+)?)(ms|[yMwdhms])/gy;
  for (const match of duration.matchAll(parts)) {
    const index = match.index ?? -1;
    if (index !== offset) throw new Error(`Invalid duration string: "${duration}"`);
    const unit = match[2] as keyof typeof UNITS;
    totalMs += Number(match[1]) * UNITS[unit];
    offset = index + match[0].length;
  }

  if (offset !== duration.length) throw new Error(`Invalid duration string: "${duration}"`);

  return Math.round(totalMs);
}

// Example usage:
// const TTL = ms('1.23y');     // → 38815848000 (compile-time)
// const CACHE_TIMEOUT = ms('5d'); // → 432000000
// const SESSION_TTL = ms('2h30m'); // → 9000000
