/**
 * Odds Phrase Matcher — Market Label Reconciliation
 *
 * Normalizes and fuzzy-matches odds/bet labels across sportsbook feeds.
 * Handles: "Over 2.5" ↔ "Total Goals Over 2.5" ↔ "Over 2.5 Goals",
 * "+1.5" ↔ "1.5" ↔ "+1.5 (Asian)", "1X2" ↔ "1x2" ↔ "1X2 (Full Time)".
 *
 * Uses the v2 fuzzy matcher for token-aware JW/Dice scoring.
 * Zero-dependency, Bun-native.
 *
 * Integration: src/feeds/pinnacle.ts — match Pinnacle market labels
 * to canonical DB phrases before storing odds.
 */

import {
  fuzzyScore,
  normalizeTeam,
  FuzzyTeamIndex,
  clearScoreCache,
} from "./fuzzy-matcher";

// ---------------------------------------------------------------------------
// Domain-specific stop words (down-weighted in fuzzy matching)
// ---------------------------------------------------------------------------

const ODDS_STOP_WORDS = new Set([
  "total", "goals", "points", "runs", "sets", "games",
  "full", "time", "half", "1st", "2nd", "first", "second",
  "match", "regular", "season", "including", "overtime",
  "asian", "european", "alternative", "alt",
]);

// ---------------------------------------------------------------------------
// Odds-specific normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an odds market label for fuzzy comparison.
 *
 * Handles:
 *   - Parenthetical suffixes: "(Asian)", "(Full Time)"
 *   - Sign normalization: "+1.5" stays "+1.5", "1.5" → "+1.5" (if context implies spread)
 *   - Case normalization: "Over 2.5" → "over 2.5"
 *   - Punctuation stripping: "45'+1" → "45 1", "1X2" stays "1x2"
 *   - Whitespace collapse
 */
export function normalizeOddsPhrase(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]+\)/g, "")        // remove (Asian), (Full Time), etc.
    .replace(/'/g, "")                    // remove apostrophes (45' → 45)
    .replace(/:/g, " ")                   // colons → spaces (45:00 → 45 00)
    .replace(/[^a-z0-9.+\-\s]/g, " ")     // keep alphanum, dots, signs, spaces
    .replace(/\s+/g, " ")                 // collapse whitespace
    .trim();
}

/**
 * Normalize handicap/spread notation.
 * "+1.5" → "+1.5", "1.5" → "+1.5", "-1" → "-1"
 */
export function normalizeHandicap(handicap: string): string {
  const cleaned = handicap.trim();
  // If it starts with a digit, assume positive
  if (/^\d/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

/**
 * Normalize total notation.
 * "Over 2.5" → "over 2.5", "Under 2.5" → "under 2.5"
 */
export function normalizeTotal(total: string): string {
  return total
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Odds value conversion — fractional / decimal / american
// ---------------------------------------------------------------------------

export interface NormalizedOdds {
  decimal: number | null;
  original: string;
  format: "decimal" | "fractional" | "american" | "unknown";
}

/**
 * Convert any odds format to decimal.
 * Supports:
 *   - Decimal: "1.50", "2.00"
 *   - Fractional: "1/2", "5/2"
 *   - American: "+150", "-200"
 */
export function normalizeOddsValue(value: string): NormalizedOdds {
  const trimmed = value.trim();

  // Decimal: 1.50, 2.00
  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal) && trimmed.includes(".")) {
    return { decimal, original: trimmed, format: "decimal" };
  }

  // Fractional: 1/2, 5/2
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    return {
      decimal: den > 0 ? num / den + 1 : null,
      original: trimmed,
      format: "fractional",
    };
  }

  // American: +150, -200
  const americanMatch = trimmed.match(/^([+-])(\d+)$/);
  if (americanMatch) {
    const sign = americanMatch[1];
    const amt = parseInt(americanMatch[2]);
    const dec = sign === "+" ? amt / 100 + 1 : 100 / amt + 1;
    return { decimal: Math.round(dec * 100) / 100, original: trimmed, format: "american" };
  }

  return { decimal: null, original: trimmed, format: "unknown" };
}

// ---------------------------------------------------------------------------
// Event time normalization — in-play clock parsing
// ---------------------------------------------------------------------------

export interface NormalizedTime {
  minutes: number | null;
  extraTime: number;
  display: string;
}

/**
 * Parse in-play event time strings.
 * "45'+1" → { minutes: 45, extraTime: 1, display: "45+1" }
 * "45:00+1" → { minutes: 45, extraTime: 1, display: "45+1" }
 * "90" → { minutes: 90, extraTime: 0, display: "90" }
 */
export function normalizeEventTime(timeStr: string): NormalizedTime {
  const cleaned = timeStr
    .replace(/['′\"]/g, "")
    .replace(/\s+/g, "")
    .trim();

  // Split on : or + to extract numeric parts. "45:00+1" → ["45","00","1"]
  const parts = cleaned.split(/[:+]/).map(Number).filter((n) => !isNaN(n));

  if (parts.length === 0) {
    return { minutes: null, extraTime: 0, display: cleaned };
  }

  const minutes = parts[0];
  // If there are 3 parts ("45", "00", "1"), the last is extra time
  // If there are 2 parts ("45", "1"), the last is extra time
  const extraTime = parts.length >= 2 ? parts[parts.length - 1] : 0;

  return {
    minutes,
    extraTime: extraTime !== minutes ? extraTime : 0,
    display: extraTime > 0 && extraTime !== minutes ? `${minutes}+${extraTime}` : `${minutes}`,
  };
}

// ---------------------------------------------------------------------------
// Canonical phrase mapping
// ---------------------------------------------------------------------------

/** Known canonical odds phrases with their aliases. */
const CANONICAL_PHRASES: Record<string, string[]> = {
  "over 2.5": ["over 2.5", "total goals over 2.5", "over 2.5 goals", "o 2.5", "o2.5"],
  "under 2.5": ["under 2.5", "total goals under 2.5", "under 2.5 goals", "u 2.5", "u2.5"],
  "over 1.5": ["over 1.5", "total goals over 1.5", "over 1.5 goals", "o 1.5", "o1.5"],
  "under 1.5": ["under 1.5", "total goals under 1.5", "under 1.5 goals", "u 1.5", "u1.5"],
  "over 3.5": ["over 3.5", "total goals over 3.5", "over 3.5 goals", "o 3.5", "o3.5"],
  "under 3.5": ["under 3.5", "total goals under 3.5", "under 3.5 goals", "u 3.5", "u3.5"],
  "1x2": ["1x2", "1x2 full time", "1x2 (full time)", "full time result", "match result", "3-way"],
  "moneyline": ["moneyline", "ml", "money line", "to win", "to win match", "match winner", "outright winner"],
  "both teams to score": ["both teams to score", "btts", "both to score", "gg/ng"],
  "double chance": ["double chance", "dc", "1x", "x2", "12"],
  "correct score": ["correct score", "cs", "exact score"],
  "draw no bet": ["draw no bet", "dnb", "draw no bet (dnb)"],
  "asian handicap": ["asian handicap", "ah", "asian handicap (ah)", "handicap"],
};

/** Build alias map from canonical phrases. */
let _aliasMap: Map<string, string> | null = null;

function getAliasMap(): Map<string, string> {
  if (_aliasMap) return _aliasMap;
  _aliasMap = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(CANONICAL_PHRASES)) {
    for (const alias of aliases) {
      _aliasMap.set(normalizeOddsPhrase(alias), canonical);
    }
  }
  return _aliasMap;
}

// ---------------------------------------------------------------------------
// Match odds phrase to canonical
// ---------------------------------------------------------------------------

export interface OddsPhraseMatch {
  phrase: string;
  canonical: string;
  score: number;
  method: "alias" | "fuzzy" | "none";
}

/**
 * Match an odds market label to its canonical form.
 * Uses alias map first (exact), then fuzzy matching.
 *
 * @returns Match result with canonical phrase and confidence score.
 */
export function matchOddsPhrase(
  label: string,
  threshold = 0.85
): OddsPhraseMatch {
  const normalized = normalizeOddsPhrase(label);
  if (!normalized) return { phrase: label, canonical: "", score: 0, method: "none" };

  const aliasMap = getAliasMap();
  const canonical = aliasMap.get(normalized);
  if (canonical) {
    return { phrase: label, canonical, score: 1.0, method: "alias" };
  }

  // Fuzzy match against all canonical keys
  const candidates = Array.from(aliasMap.keys());
  let bestScore = 0;
  let bestCanonical = "";

  for (const cand of candidates) {
    const score = fuzzyScore(normalized, cand, threshold);
    if (score > bestScore) {
      bestScore = score;
      bestCanonical = aliasMap.get(cand) ?? cand;
    }
  }

  if (bestScore >= threshold) {
    return { phrase: label, canonical: bestCanonical, score: bestScore, method: "fuzzy" };
  }

  return { phrase: label, canonical: "", score: 0, method: "none" };
}

// ---------------------------------------------------------------------------
// Batch matching
// ---------------------------------------------------------------------------

/**
 * Match a batch of odds phrases. Returns map of raw → canonical.
 */
export function matchOddsPhrases(
  labels: string[],
  threshold = 0.85
): Map<string, OddsPhraseMatch> {
  const results = new Map<string, OddsPhraseMatch>();
  for (const label of labels) {
    if (!results.has(label)) {
      results.set(label, matchOddsPhrase(label, threshold));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Sportsbook source name reconciliation
// ---------------------------------------------------------------------------

const SOURCE_ALIASES: Record<string, string[]> = {
  "pinnacle": ["pinnacle", "pinnacle sports", "pin", "pinn"],
  "bet365": ["bet365", "bet 365", "b365", "bet365 sports"],
  "draftkings": ["draftkings", "draft kings", "dk", "dkings"],
  "fanduel": ["fanduel", "fan duel", "fd"],
  "betmgm": ["betmgm", "bet mgm", "mgm", "bet-mgm"],
  "william hill": ["william hill", "will hill", "wh", "whill"],
  "bovada": ["bovada", "bovada lv", "bov"],
  "bookmaker": ["bookmaker", "bookmaker eu", "bm", "bmeu"],
};

let _sourceAliasMap: Map<string, string> | null = null;

function getSourceAliasMap(): Map<string, string> {
  if (_sourceAliasMap) return _sourceAliasMap;
  _sourceAliasMap = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(SOURCE_ALIASES)) {
    for (const alias of aliases) {
      _sourceAliasMap.set(normalizeOddsPhrase(alias), canonical);
    }
  }
  return _sourceAliasMap;
}

/**
 * Match a sportsbook source label to its canonical name.
 */
export function matchSourceName(
  label: string,
  threshold = 0.85
): OddsPhraseMatch {
  const normalized = normalizeOddsPhrase(label);
  if (!normalized) return { phrase: label, canonical: "", score: 0, method: "none" };

  const aliasMap = getSourceAliasMap();
  const canonical = aliasMap.get(normalized);
  if (canonical) {
    return { phrase: label, canonical, score: 1.0, method: "alias" };
  }

  // Fuzzy match
  const candidates = Array.from(aliasMap.keys());
  let bestScore = 0;
  let bestCanonical = "";

  for (const cand of candidates) {
    const score = fuzzyScore(normalized, cand, threshold);
    if (score > bestScore) {
      bestScore = score;
      bestCanonical = aliasMap.get(cand) ?? cand;
    }
  }

  if (bestScore >= threshold) {
    return { phrase: label, canonical: bestCanonical, score: bestScore, method: "fuzzy" };
  }

  return { phrase: label, canonical: "", score: 0, method: "none" };
}
