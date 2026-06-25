import { describe, it, expect, beforeEach } from "bun:test";
import {
  normalizeTeam,
  jaroWinkler,
  sorensenDice,
  fuzzyScore,
  findBestMatch,
  findAllMatches,
  FuzzyTeamIndex,
  clearScoreCache,
  getCacheStats,
} from "../../src/utils/fuzzy-matcher";

// Reset cache between tests
beforeEach(() => clearScoreCache());

describe("normalizeTeam", () => {
  it("removes parenthetical suffixes", () => {
    expect(normalizeTeam("Portland Fire (w)")).toBe("portland fire");
    expect(normalizeTeam("Manchester City (U23)")).toBe("manchester city");
  });
  it("collapses whitespace and lowercases", () => {
    expect(normalizeTeam("  MAN   CITY  ")).toBe("man city");
  });
  it("removes punctuation", () => {
    expect(normalizeTeam("St. Pauli")).toBe("st pauli");
  });
});

describe("jaroWinkler", () => {
  it("returns 1 for identical", () => {
    expect(jaroWinkler("man city", "man city")).toBe(1);
  });
  it("prefix match", () => {
    expect(jaroWinkler("manchester city", "man city")).toBeGreaterThan(0.7);
  });
});

describe("sorensenDice", () => {
  it("returns 1 for identical", () => {
    expect(sorensenDice("man city", "man city")).toBe(1);
  });
  it("returns 0 for no overlap", () => {
    expect(sorensenDice("abc", "xyz")).toBe(0);
  });
});

// ── v2: Token-aware scoring ──

describe("fuzzyScore v2 (token-aware)", () => {
  it("matches Portland Fire with suffix (exact after norm)", () => {
    expect(fuzzyScore("Portland Fire", "Portland Fire (w)")).toBe(1);
  });

  it("matches Man City to Manchester City (token-aware JW)", () => {
    const score = fuzzyScore("Man City", "Manchester City", 0.55);
    expect(score).toBeGreaterThan(0.55);
  });

  it("matches Manchester City FC to Manchester City (stop-word 'fc' filtered)", () => {
    const score = fuzzyScore("Manchester City FC", "Manchester City", 0.7);
    expect(score).toBeGreaterThan(0.7);
  });

  it("returns 0 for completely different teams", () => {
    expect(fuzzyScore("Liverpool", "Real Madrid")).toBe(0);
  });

  it("respects threshold", () => {
    expect(fuzzyScore("Golden State", "Golden State Warriors", 0.9)).toBe(0);
    expect(fuzzyScore("Golden State", "Golden State Warriors", 0.5)).toBeGreaterThan(0);
  });
});

// ── v2: Short-string Levenshtein fallback ──

describe("fuzzyScore short-string fallback", () => {
  it("matches 'LA' to 'LA' (exact)", () => {
    expect(fuzzyScore("LA", "LA")).toBe(1);
  });

  it("matches 'NY' to 'NY' (exact)", () => {
    expect(fuzzyScore("NY", "NY")).toBe(1);
  });

  it("uses Levenshtein ratio for short strings", () => {
    const score = fuzzyScore("LA", "L A", 0.5);
    expect(score).toBeGreaterThan(0);
  });
});

// ── v2: Alias map ──

describe("fuzzyScore with alias map", () => {
  const aliases = new Map<string, string>();
  aliases.set("portland fire", "Portland Trail Blazers");

  it("resolves alias exact match", () => {
    const score = fuzzyScore("Portland Fire", "Portland Trail Blazers", 0.88, { aliasMap: aliases });
    expect(score).toBe(1);
  });
});

// ── v2: Phonetic index ──

describe("FuzzyTeamIndex", () => {
  const candidates = [
    "Portland Fire (w)", "Manchester City", "Real Madrid",
    "LA Sparks", "Golden State Warriors", "Man Utd",
  ];

  it("builds index and looks up candidates by phonetic key", () => {
    const idx = new FuzzyTeamIndex(candidates);
    const results = idx.lookup("Portland Fire");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for unknown query", () => {
    const idx = new FuzzyTeamIndex(candidates);
    const results = idx.lookup("xyzzy unknown team");
    expect(results).toEqual([]);
  });

  it("has size > 0", () => {
    const idx = new FuzzyTeamIndex(candidates);
    expect(idx.size).toBeGreaterThan(0);
  });
});

// ── v2: findBestMatch ──

describe("findBestMatch v2", () => {
  const candidates = ["Portland Fire (w)", "Manchester City", "Real Madrid"];

  it("picks correct match", () => {
    const res = findBestMatch("Portland Fire", candidates);
    expect(res).not.toBeNull();
    expect(res!.match).toBe("Portland Fire (w)");
  });

  it("returns null when no candidate matches", () => {
    const res = findBestMatch("Unknown FC", candidates, 0.85);
    expect(res).toBeNull();
  });

  it("uses phonetic index for large candidate sets", () => {
    const large = Array.from({ length: 200 }, (_, i) => `Team ${i}`);
    large.push("Portland Fire (w)");
    const res = findBestMatch("Portland Fire", large, 0.85, { useIndex: true });
    expect(res).not.toBeNull();
    expect(res!.match).toBe("Portland Fire (w)");
  });

  it("resolves alias map", () => {
    const aliases = new Map([["portland fire", "Portland Trail Blazers"]]);
    const res = findBestMatch("Portland Fire", candidates, 0.88, { aliasMap: aliases });
    expect(res).not.toBeNull();
    expect(res!.match).toBe("Portland Trail Blazers");
    expect(res!.method).toBe("alias");
  });
});

// ── v2: findAllMatches ──

describe("findAllMatches v2", () => {
  const candidates = ["Portland Fire (w)", "Portland Trail Blazers"];

  it("returns multiple matches", () => {
    const res = findAllMatches("Portland", candidates, 0.3);
    expect(res.length).toBeGreaterThanOrEqual(1);
  });

  it("sorts by score descending", () => {
    const res = findAllMatches("Portland", candidates, 0.3);
    for (let i = 0; i < res.length - 1; i++) {
      expect(res[i].score).toBeGreaterThanOrEqual(res[i + 1].score);
    }
  });
});

// ── v2: Score cache ──

describe("score cache", () => {
  it("returns cached score on second call", () => {
    clearScoreCache();
    const s1 = fuzzyScore("Portland Fire", "Portland Fire (w)", 0.7);
    const s2 = fuzzyScore("Portland Fire", "Portland Fire (w)", 0.7);
    expect(s1).toBe(s2);
    const stats = getCacheStats();
    expect(stats.hitRatio).toBeGreaterThan(0);
  });
});
