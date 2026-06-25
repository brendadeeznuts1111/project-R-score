/**
 * Fuzzy Matcher v2 — Team Name Aliasing & Source Reconciliation
 *
 * Token-aware hybrid: Jaro-Winkler + Sørensen-Dice + Metaphone boost.
 * Phonetic pre-indexing, score caching, stop-word filtering,
 * short-string Levenshtein fallback. Zero-dependency, Bun-native.
 *
 * Used by:
 *   - Odds event matching (Pinnacle event names → DB events)
 *   - Partner profile team resolution
 *   - Buckeye wager team → sportsbook odds reconciliation
 */

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const PARENS_RE = /\s*\([^)]+\)/g;
const PUNCT_RE = /[^a-z0-9\s]/g;

/** Strip noise from team names before comparison. */
export function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(PARENS_RE, "")
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenize a normalized team name, filtering stop-words. */
const STOP_WORDS = new Set(["fc", "sc", "ac", "cf", "afc", "club", "de", "la", "el", "il"]);
function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/** Check if a token is a stop-word. */
function isStopWord(t: string): boolean {
  return STOP_WORDS.has(t);
}

// ---------------------------------------------------------------------------
// Levenshtein — short-string fallback
// ---------------------------------------------------------------------------

/**
 * Levenshtein distance ratio. Returns [0, 1].
 * Used as fallback for strings < 4 chars where JW/Dice are unreliable.
 */
function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const dp = new Array<number>(lenB + 1);
  for (let j = 0; j <= lenB; j++) dp[j] = j;

  for (let i = 1; i <= lenA; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const temp = dp[j];
      dp[j] = Math.min(
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
        dp[j] + 1,
        dp[j - 1] + 1
      );
      prev = temp;
    }
  }

  const maxLen = Math.max(lenA, lenB);
  return 1 - dp[lenB] / maxLen;
}

// ---------------------------------------------------------------------------
// Jaro-Winkler — string-level
// ---------------------------------------------------------------------------

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matchDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = Math.floor(transpositions / 2);

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(a.length, b.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Token-aware Jaro-Winkler — primary scorer (v2)
// ---------------------------------------------------------------------------

/**
 * Token-aware JW: tokenize both strings, compute best pairwise JW
 * per token, average the scores. Handles reordered tokens.
 * Stop-words are excluded unless they're the only token.
 */
function tokenAwareJW(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // For each token in A, find best match in B
  let totalScore = 0;
  const usedB = new Set<number>();

  for (const ta of tokensA) {
    let best = 0;
    let bestIdx = -1;
    for (let j = 0; j < tokensB.length; j++) {
      if (usedB.has(j)) continue;
      const score = jaroWinkler(ta, tokensB[j]);
      if (score > best) {
        best = score;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      usedB.add(bestIdx);
      totalScore += best;
    }
  }

  // Weight: non-stop tokens get full weight, stop-words get half
  let weightSum = 0;
  let weightedScore = 0;
  let idx = 0;

  for (const ta of tokensA) {
    const w = isStopWord(ta) && tokensA.length > 1 ? 0.5 : 1.0;
    weightSum += w;

    // Find if this token was matched
    const wasMatched = [...usedB].some((j) => {
      const score = jaroWinkler(ta, tokensB[j]);
      return score > 0.7;
    });

    if (wasMatched) {
      let best = 0;
      for (const j of usedB) {
        const score = jaroWinkler(ta, tokensB[j]);
        if (score > best) best = score;
      }
      weightedScore += best * w;
    }
    idx++;
  }

  return weightSum > 0 ? Math.min(1, weightedScore / weightSum) : 0;
}

// ---------------------------------------------------------------------------
// Sørensen-Dice — string-level
// ---------------------------------------------------------------------------

export function sorensenDice(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return a === b ? 1.0 : 0.0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  const bigramsB = new Set<string>();
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// ---------------------------------------------------------------------------
// Token-aware Dice — secondary scorer (v2)
// ---------------------------------------------------------------------------

/** Per-token Dice: tokenize, compute best pairwise Dice, average. */
function tokenAwareDice(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  let totalScore = 0;
  const usedB = new Set<number>();

  for (const ta of tokensA) {
    let best = 0;
    let bestIdx = -1;
    for (let j = 0; j < tokensB.length; j++) {
      if (usedB.has(j)) continue;
      const score = sorensenDice(ta, tokensB[j]);
      if (score > best) { best = score; bestIdx = j; }
    }
    if (bestIdx >= 0) {
      usedB.add(bestIdx);
      totalScore += best;
    }
  }

  const n = Math.max(tokensA.length, tokensB.length);
  return n > 0 ? totalScore / n : 0;
}

// ---------------------------------------------------------------------------
// Metaphone — phonetic encoding
// ---------------------------------------------------------------------------

const ABBREV: Record<string, string> = {
  manchester: "MNX", man: "MN", city: "ST", united: "ANTD", utd: "ATD",
  town: "TN", athletic: "A0LK", sporting: "SPRTK", real: "RL",
  fc: "", sc: "", ac: "AK", cf: "KF", afc: "AFK", county: "KNT",
  wanderers: "WNTR", rovers: "RFR", rangers: "RNJR", albion: "ALBN",
  olympic: "ALMP", dynamo: "DNM", lokomotiv: "LKMT", spartak: "SPRT",
  cska: "CSK", zenit: "ZNT", portland: "PRTL", seattle: "STL",
  golden: "GLDN", state: "STT", angeles: "ANJL", york: "YRK",
  warriors: "WRR", lakers: "LKR", knicks: "NKS", celtics: "SLTK",
  bulls: "BLS", spurs: "SPRS", rockets: "RKT", mavericks: "MFRK",
  heat: "HT", thunder: "0NDR", trail: "TRL", blazers: "BLSR",
};

function metaphoneEncode(word: string): string {
  if (word.length === 0) return "";
  const s = word.toLowerCase();

  const tokens = s.split(/\s+/);
  let code = "";
  for (const token of tokens) {
    if (ABBREV[token] !== undefined) { code += ABBREV[token]; }
    else { code += token; }
  }
  if (code) return code.slice(0, 8);

  // Phonetic fallback (simplified)
  const rules: Array<[RegExp, string]> = [
    [/^kn/, "n"], [/^gn/, "n"], [/^pn/, "n"], [/^wr/, "r"], [/^wh/, "w"],
    [/^x/, "s"], [/gh$/, ""], [/ght/, "t"], [/ph/, "f"], [/sh/, "x"],
    [/sch/, "s"], [/th/, "0"], [/ch/, "c"], [/ck/, "k"], [/dg/, "j"],
    [/tion/, "xn"], [/[aeiou]/g, "a"],
  ];

  const result: string[] = [];
  let i = 0;
  while (i < s.length) {
    let matched = false;
    for (const [p, r] of rules) {
      const m = s.slice(i).match(p);
      if (m && m.index === 0) { result.push(r); i += m[0].length; matched = true; break; }
    }
    if (!matched) { result.push(s[i]); i++; }
  }

  const deduped: string[] = [];
  for (const ch of result.join("").split("")) {
    if (deduped[deduped.length - 1] !== ch) deduped.push(ch);
  }
  return deduped.join("").slice(0, 8);
}

function doubleMetaphoneBoost(a: string, b: string): number {
  const ma = metaphoneEncode(a);
  const mb = metaphoneEncode(b);
  if (ma === "" || mb === "") return 0;
  if (ma === mb) return 1.0;

  const minLen = Math.min(ma.length, mb.length);
  if (minLen === 0) return 0;
  let prefixMatch = 0;
  for (let i = 0; i < minLen; i++) {
    if (ma[i] === mb[i]) prefixMatch++;
    else break;
  }
  return (prefixMatch / minLen) * 0.5;
}

// ---------------------------------------------------------------------------
// Phonetic Index — O(1) candidate filtering
// ---------------------------------------------------------------------------

export class FuzzyTeamIndex {
  private index = new Map<string, string[]>();

  /** Build the index from a candidate list. */
  constructor(candidates: string[]) {
    for (const c of candidates) {
      const key = metaphoneEncode(normalizeTeam(c));
      if (!key) continue;
      const bucket = this.index.get(key);
      if (bucket) bucket.push(c);
      else this.index.set(key, [c]);
    }
  }

  /** Get candidates that share a phonetic key with the query. */
  lookup(query: string): string[] {
    const key = metaphoneEncode(normalizeTeam(query));
    return this.index.get(key) ?? [];
  }

  /** Number of unique phonetic keys. */
  get size(): number { return this.index.size; }
}

// ---------------------------------------------------------------------------
// Score cache — per-audit-run dedup
// ---------------------------------------------------------------------------

class ScoreCache {
  private cache = new Map<string, number>();
  private hits = 0;
  private misses = 0;

  key(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  get(a: string, b: string): number | undefined {
    const v = this.cache.get(this.key(a, b));
    if (v !== undefined) this.hits++;
    else this.misses++;
    return v;
  }

  set(a: string, b: string, score: number): void {
    this.cache.set(this.key(a, b), score);
  }

  clear(): void { this.cache.clear(); this.hits = 0; this.misses = 0; }

  get hitRatio(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
}

// ---------------------------------------------------------------------------
// Hybrid scorer (v2)
// ---------------------------------------------------------------------------

export interface MatchResult {
  match: string;
  score: number;
  method: "exact" | "jaro-winkler" | "dice" | "metaphone" | "levenshtein" | "alias" | "hybrid";
}

/** Shared score cache for the current audit run. */
let scoreCache = new ScoreCache();

/** Clear the score cache between audit runs. */
export function clearScoreCache(): void { scoreCache.clear(); }

/** Get cache stats for hygiene monitoring. */
export function getCacheStats(): { size: number; hitRatio: number } {
  return { size: scoreCache.hitRatio * 100, hitRatio: scoreCache.hitRatio };
}

/**
 * Compute fuzzy similarity score between two team names (v2).
 *
 * Enhancements over v1:
 *   - Token-aware JW + Dice for reordered tokens
 *   - Stop-word filtering (fc, sc, ac down-weighted)
 *   - Short-string Levenshtein fallback (< 4 chars)
 *   - Score caching per run
 */
export function fuzzyScore(
  a: string,
  b: string,
  threshold = 0.88,
  options?: { aliasMap?: Map<string, string> }
): number {
  const cached = scoreCache.get(a, b);
  if (cached !== undefined) return cached >= threshold ? cached : 0;

  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);

  if (na === nb) { scoreCache.set(a, b, 1.0); return 1.0; }
  if (na.length === 0 || nb.length === 0) return 0.0;

  // Alias map check
  if (options?.aliasMap) {
    const aliasA = options.aliasMap.get(na);
    const aliasB = options.aliasMap.get(nb);
    if (aliasA && normalizeTeam(aliasA) === nb) { scoreCache.set(a, b, 1.0); return 1.0; }
    if (aliasB && normalizeTeam(aliasB) === na) { scoreCache.set(a, b, 1.0); return 1.0; }
  }

  // Short-string fallback
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 4) {
    const lvRatio = levenshteinRatio(na, nb);
    scoreCache.set(a, b, lvRatio);
    return lvRatio >= threshold * 0.8 ? lvRatio : 0;
  }

  // Token-aware scoring
  const tokensA = tokenize(na);
  const tokensB = tokenize(nb);
  const jw = tokenAwareJW(tokensA, tokensB);
  const dice = tokenAwareDice(tokensA, tokensB);
  const metaBoost = doubleMetaphoneBoost(na, nb);

  const hybrid = jw * 0.7 + dice * 0.2 + metaBoost * 0.1;
  scoreCache.set(a, b, hybrid);
  return hybrid >= threshold ? Math.round(hybrid * 10000) / 10000 : 0;
}

// ---------------------------------------------------------------------------
// Best match
// ---------------------------------------------------------------------------

export function findBestMatch(
  query: string,
  candidates: string[],
  threshold = 0.88,
  options?: { aliasMap?: Map<string, string>; useIndex?: boolean }
): MatchResult | null {
  let best: MatchResult = { match: "", score: 0, method: "exact" };
  const queryNorm = normalizeTeam(query);

  // Alias map fast path
  if (options?.aliasMap) {
    const alias = options.aliasMap.get(queryNorm);
    if (alias) return { match: alias, score: 1.0, method: "alias" };
  }

  // Phonetic index fast path — only compare against same-phonetic-key candidates
  let pool = candidates;
  if (options?.useIndex && candidates.length > 100) {
    const index = new FuzzyTeamIndex(candidates);
    pool = index.lookup(query);
    if (pool.length === 0) pool = candidates; // fall back to full scan
  }

  const normCache = new Map<string, string>();

  for (const c of pool) {
    let candNorm = normCache.get(c);
    if (!candNorm) { candNorm = normalizeTeam(c); normCache.set(c, candNorm); }

    if (queryNorm === candNorm) return { match: c, score: 1.0, method: "exact" };

    const score = fuzzyScore(queryNorm, candNorm, threshold, options);
    if (score > best.score) {
      best = { match: c, score, method: score >= 0.9 ? "hybrid" : "hybrid" };
    }
  }

  return best.score >= threshold ? best : null;
}

// ---------------------------------------------------------------------------
// All matches
// ---------------------------------------------------------------------------

export function findAllMatches(
  query: string,
  candidates: string[],
  threshold = 0.88,
  options?: { aliasMap?: Map<string, string> }
): MatchResult[] {
  const results: MatchResult[] = [];
  for (const c of candidates) {
    const score = fuzzyScore(query, c, threshold, options);
    if (score > 0) results.push({ match: c, score, method: "hybrid" });
  }
  return results.sort((a, b) => b.score - a.score);
}
