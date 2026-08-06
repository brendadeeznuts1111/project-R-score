/**
 * Odds format conversion — American ↔ Decimal + Asian handicap parse.
 */

export type OddsFormat = 'american' | 'decimal' | 'asian';

export type NormalizedOdds = {
  oddsDecimal: number;
  oddsAmerican: number;
  oddsFormat: OddsFormat;
  handicap?: number;
};

export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new RangeError(`invalid american odds: ${american}`);
  }
  if (american > 0) return 1 + american / 100;
  return 1 - 100 / american;
}

export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new RangeError(`invalid decimal odds: ${decimal}`);
  }
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Parse strings like "-0.5 @ 1.90" or "+1.25@1.85". */
export function parseAsianOdds(oddsString: string): { handicap: number; oddsDecimal: number } {
  const parts = oddsString.split('@');
  if (parts.length < 2) {
    throw new Error(`asian odds must look like "handicap @ decimal": ${oddsString}`);
  }
  const handicap = Number.parseFloat(parts[0]!.trim());
  const oddsDecimal = Number.parseFloat(parts[1]!.trim());
  if (!Number.isFinite(handicap) || !Number.isFinite(oddsDecimal)) {
    throw new Error(`could not parse asian odds: ${oddsString}`);
  }
  return { handicap, oddsDecimal };
}

/**
 * Normalize a raw price (number or string) into decimal + american.
 * When `format` is omitted, infer: integers with |n|>=100 → american; else decimal.
 */
export function normalizeOdds(
  raw: string | number,
  format?: OddsFormat | string
): NormalizedOdds | null {
  try {
    if (format === 'asian' || (typeof raw === 'string' && raw.includes('@'))) {
      const parsed = parseAsianOdds(String(raw));
      return {
        oddsDecimal: parsed.oddsDecimal,
        oddsAmerican: decimalToAmerican(parsed.oddsDecimal),
        oddsFormat: 'asian',
        handicap: parsed.handicap,
      };
    }

    const inferred =
      format ??
      (typeof raw === 'number' && Number.isInteger(raw) && Math.abs(raw) >= 100
        ? 'american'
        : typeof raw === 'string' && /^[+-]?\d+$/.test(raw.trim()) && Math.abs(Number(raw)) >= 100
          ? 'american'
          : 'decimal');

    if (inferred === 'american') {
      const american = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
      const decimal = americanToDecimal(american);
      return {
        oddsDecimal: Number(decimal.toFixed(6)),
        oddsAmerican: american,
        oddsFormat: 'american',
      };
    }

    const decimal = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
    if (!Number.isFinite(decimal) || decimal <= 1) return null;
    return {
      oddsDecimal: Number(decimal.toFixed(6)),
      oddsAmerican: decimalToAmerican(decimal),
      oddsFormat: 'decimal',
    };
  } catch {
    return null;
  }
}

/** Extract handicap from selection labels like "Over 8.5", "NYY -1.5". */
export function extractHandicapFromSelection(selection: string): number | undefined {
  const m = selection.match(/([+-]?\d+(?:\.\d+)?)\s*$/);
  if (!m) return undefined;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) ? n : undefined;
}
