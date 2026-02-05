/**
 * time.ts
 * Unified Time and Date utility for T3-Lattice Analytics
 * Handles TZ synchronization and standardized formatting
 */

// v1.3.4: Programmatically set default time zone for the lifetime of the bun process
process.env.TZ = "UTC";

export const LATTICE_TZ = "UTC";

export interface LatticeDateTime {
  iso: string;
  timestamp: number;
  tz: string;
}

/**
 * Generates a standardized LatticeDateTime object
 */
export function now(): LatticeDateTime {
  const date = new Date();
  return {
    iso: date.toISOString(),
    timestamp: date.getTime(),
    tz: LATTICE_TZ
  };
}

/**
 * Formats a timestamp or date into the unified Lattice format
 */
export function formatLatticeDate(input: number | string | Date): LatticeDateTime {
  const date = new Date(input);
  return {
    iso: date.toISOString(),
    timestamp: date.getTime(),
    tz: LATTICE_TZ
  };
}

/**
 * Unifies a date object with the system timezone
 */
export function unifyDate(date: Date = new Date()): Date {
  // Ensure we are working with a clean date object in the preferred TZ
  return new Date(date.getTime());
}
