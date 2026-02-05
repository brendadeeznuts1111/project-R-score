/**
 * TIME.MS.MACRO - Bun.ms() compile-time duration macros
 * Zero-runtime cost duration parsing with inlined literal milliseconds
 * BUN_MS_LITERAL - Compile-time duration conversion
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
export macro function ms(duration: string): number {
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

  let totalMs = 0;
  let currentNumber = '';
  let currentUnit = '';

  for (let i = 0; i < duration.length; i++) {
    const char = duration[i];

    if (char >= '0' && char <= '9' || char === '.') {
      // Accumulate number
      if (currentUnit) {
        throw new Error(`Unexpected number after unit in "${duration}"`);
      }
      currentNumber += char;
    } else {
      // Found a unit character
      if (!currentNumber) {
        throw new Error(`Missing number before unit "${char}" in "${duration}"`);
      }

      currentUnit = char;
      const value = parseFloat(currentNumber);

      if (!(currentUnit in UNITS)) {
        throw new Error(`Unknown unit "${currentUnit}" in "${duration}". Supported: y/M/w/d/h/m/s/ms`);
      }

      totalMs += value * UNITS[currentUnit as keyof typeof UNITS];

      // Reset for next number-unit pair
      currentNumber = '';
      currentUnit = '';
    }
  }

  // Handle case where string ends with a number (assume milliseconds)
  if (currentNumber) {
    if (currentUnit) {
      throw new Error(`Incomplete unit specification in "${duration}"`);
    }
    totalMs += parseFloat(currentNumber); // bare number = milliseconds
  }

  return Math.round(totalMs);
}

// Export the macro function
export { ms };

// Example usage:
// const TTL = ms('1.23y');     // → 38815848000 (compile-time)
// const CACHE_TIMEOUT = ms('5d'); // → 432000000
// const SESSION_TTL = ms('2h30m'); // → 9000000
