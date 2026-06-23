# ADR 0003 — Fuzzy Team Matching

**Status:** Accepted
**Date:** 2026-05-30

## Context

Odds event matching, partner profile team resolution, and Buckeye wager reconciliation
all rely on exact string matching after basic cleanup. Real-world data contains abbreviations
("Man City" vs "Manchester City"), parenthetical suffixes ("Portland Fire (w)"), and
locale-specific variants that break exact matching.

## Decision

Implement a **hybrid fuzzy scorer** using:

1. **Jaro-Winkler** (primary, 70% weight) — character-level matching with prefix boost.
   Excellent for short names with common prefixes.
2. **Sørensen-Dice** (secondary, 20% weight) — bigram overlap via sets.
   Order-agnostic, good for multi-word names.
3. **Double Metaphone boost** (10% weight) — sports-team abbreviation lookup table
   (Manchester→MNX, City→ST) with phonetic rule fallback for unknown tokens.

All zero-dependency, pure TypeScript. Located in `src/utils/fuzzy-matcher.ts`.

## Consequences

- **Positive:** Increases match recall without false positives (threshold 0.88 default).
  Performance stays under 1ms per comparison with normalization caching.
- **Negative:** Abbreviation expansion requires maintaining the lookup table.
  Phonetic fallback is simplified (not full Double Metaphone).
- **Neutral:** Backward-compatible — exact matches take precedence.
  Fuzzy only engages when exact fails.

## Alternatives Considered

| Algorithm | Rejected because |
|-----------|-----------------|
| Pure Levenshtein | No prefix bias, slow on long strings |
| Fuse.js | External dependency, not Bun-native |
| Full Double Metaphone | 100+ lines for marginal gain over abbreviation table |

## Integration Points

| File | Usage |
|------|-------|
| `src/feeds/pinnacle.ts` | `findBestMatch()` resolves Pinnacle event IDs to canonical DB events |
| `src/zones/partner-profile/partner-gateway.ts` | Future: `fuzzyScore()` for team whitelist checks |
| `src/services/sportsbook-service.ts` | Future: `normalizeTeam()` for best-line event grouping |
