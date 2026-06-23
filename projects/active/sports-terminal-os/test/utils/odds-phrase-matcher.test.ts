import { describe, it, expect } from "bun:test";
import {
  normalizeOddsPhrase,
  normalizeHandicap,
  normalizeTotal,
  matchOddsPhrase,
  matchSourceName,
  matchOddsPhrases,
} from "../../src/utils/odds-phrase-matcher";

describe("normalizeOddsPhrase", () => {
  it("strips parenthetical suffixes", () => {
    expect(normalizeOddsPhrase("Over 2.5 (Asian)")).toBe("over 2.5");
  });
  it("handles apostrophes", () => {
    expect(normalizeOddsPhrase("45'+1")).toBe("45+1");
  });
  it("handles colons", () => {
    expect(normalizeOddsPhrase("45:00+1")).toBe("45 00+1");
  });
  it("collapses whitespace", () => {
    expect(normalizeOddsPhrase("  Over   2.5  ")).toBe("over 2.5");
  });
});

describe("normalizeHandicap", () => {
  it("adds + for bare positive number", () => {
    expect(normalizeHandicap("1.5")).toBe("+1.5");
  });
  it("preserves negative", () => {
    expect(normalizeHandicap("-1")).toBe("-1");
  });
  it("preserves explicit positive", () => {
    expect(normalizeHandicap("+1.5")).toBe("+1.5");
  });
});

describe("normalizeTotal", () => {
  it("lowercases", () => {
    expect(normalizeTotal("Over 2.5")).toBe("over 2.5");
  });
});

describe("matchOddsPhrase", () => {
  it("matches 'over 2.5' to canonical via alias", () => {
    const result = matchOddsPhrase("Over 2.5");
    expect(result.canonical).toBe("over 2.5");
    expect(result.score).toBe(1);
  });

  it("matches 'total goals over 2.5' to canonical", () => {
    const result = matchOddsPhrase("Total Goals Over 2.5");
    expect(result.canonical).toBe("over 2.5");
    expect(result.score).toBeGreaterThan(0.7);
  });

  it("matches 'o2.5' to canonical via alias", () => {
    const result = matchOddsPhrase("o2.5");
    expect(result.canonical).toBe("over 2.5");
    expect(result.score).toBe(1);
  });

  it("matches '1x2' to canonical", () => {
    const result = matchOddsPhrase("1X2 (Full Time)");
    expect(result.canonical).toBe("1x2");
  });

  it("matches 'btts' to canonical", () => {
    const result = matchOddsPhrase("BTTS");
    expect(result.canonical).toBe("both teams to score");
  });

  it("returns none for unknown phrase", () => {
    const result = matchOddsPhrase("xyz unknown market");
    expect(result.method).toBe("none");
    expect(result.score).toBe(0);
  });
});

describe("matchSourceName", () => {
  it("matches 'Bet365' to canonical", () => {
    const result = matchSourceName("Bet365");
    expect(result.canonical).toBe("bet365");
    expect(result.score).toBe(1);
  });

  it("matches 'B365' to canonical via alias", () => {
    const result = matchSourceName("B365");
    expect(result.canonical).toBe("bet365");
    expect(result.score).toBe(1);
  });

  it("matches 'Fan Duel' to canonical", () => {
    const result = matchSourceName("Fan Duel");
    expect(result.canonical).toBe("fanduel");
    expect(result.score).toBe(1);
  });

  it("matches 'Pinn' to canonical via fuzzy", () => {
    const result = matchSourceName("Pinn", 0.7);
    expect(result.canonical).toBe("pinnacle");
    expect(result.score).toBeGreaterThan(0.7);
  });

  it("returns none for unknown source", () => {
    const result = matchSourceName("UnknownBook");
    expect(result.method).toBe("none");
  });
});

describe("matchOddsPhrases (batch)", () => {
  it("matches batch of labels", () => {
    const result = matchOddsPhrases(["Over 2.5", "BTTS", "1X2 (Full Time)", "unknown"]);
    expect(result.get("Over 2.5")!.canonical).toBe("over 2.5");
    expect(result.get("BTTS")!.canonical).toBe("both teams to score");
    expect(result.get("1X2 (Full Time)")!.canonical).toBe("1x2");
    expect(result.get("unknown")!.method).toBe("none");
  });
});
