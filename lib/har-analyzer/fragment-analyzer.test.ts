import { test, expect, describe } from "bun:test";
import { analyzeFragment } from "./fragment-analyzer";

describe("analyzeFragment", () => {
  // ─── empty ─────────────────────────────────────────────────────────
  test("empty: undefined input", () => {
    const result = analyzeFragment(undefined);
    expect(result.type).toBe("empty");
    expect(result.raw).toBe("");
    expect(result.behavior.triggersScroll).toBe(false);
    expect(result.behavior.requiresJS).toBe(false);
  });

  test("empty: empty string", () => {
    const result = analyzeFragment("");
    expect(result.type).toBe("empty");
  });

  // ─── anchor ────────────────────────────────────────────────────────
  test("anchor: simple identifier", () => {
    const result = analyzeFragment("section-1");
    expect(result.type).toBe("anchor");
    expect(result.content.anchor).toBe("section-1");
    expect(result.behavior.triggersScroll).toBe(true);
    expect(result.behavior.seoFriendly).toBe(true);
    expect(result.behavior.shareable).toBe(true);
    expect(result.behavior.requiresJS).toBe(false);
  });

  test("anchor: single word", () => {
    const result = analyzeFragment("top");
    expect(result.type).toBe("anchor");
    expect(result.content.anchor).toBe("top");
  });

  // ─── hashbang ──────────────────────────────────────────────────────
  test("hashbang: #!/path", () => {
    const result = analyzeFragment("!/path/to/page");
    expect(result.type).toBe("hashbang");
    expect(result.content.route?.path).toBe("/path/to/page");
    expect(result.behavior.requiresJS).toBe(true);
    expect(result.behavior.seoFriendly).toBe(false);
  });

  test("hashbang: !/ root", () => {
    const result = analyzeFragment("!/");
    expect(result.type).toBe("hashbang");
    expect(result.content.route?.path).toBe("/");
  });

  // ─── route ─────────────────────────────────────────────────────────
  test("route: /dashboard/settings", () => {
    const result = analyzeFragment("/dashboard/settings");
    expect(result.type).toBe("route");
    expect(result.content.route?.path).toBe("/dashboard/settings");
    expect(result.content.route?.query).toEqual({});
    expect(result.behavior.requiresJS).toBe(true);
    expect(result.behavior.shareable).toBe(true);
  });

  test("route: with query params", () => {
    const result = analyzeFragment("/search?q=hello&page=2");
    expect(result.type).toBe("route");
    expect(result.content.route?.path).toBe("/search");
    expect(result.content.route?.query).toEqual({ q: "hello", page: "2" });
  });

  // ─── state ─────────────────────────────────────────────────────────
  test("state: key=value pairs", () => {
    const result = analyzeFragment("color=red&size=lg");
    expect(result.type).toBe("state");
    expect(result.content.state).toEqual({ color: "red", size: "lg" });
    expect(result.behavior.requiresJS).toBe(true);
    expect(result.behavior.shareable).toBe(false);
  });

  test("state: single pair", () => {
    const result = analyzeFragment("tab=settings");
    expect(result.type).toBe("state");
    expect(result.content.state).toEqual({ tab: "settings" });
  });

  // ─── media ─────────────────────────────────────────────────────────
  test("media: t=30 (seconds)", () => {
    const result = analyzeFragment("t=30");
    expect(result.type).toBe("media");
    expect(result.content.media?.type).toBe("t");
    expect(result.content.media?.value).toBe(30);
    expect(result.content.media?.formatted).toBe("30");
    expect(result.behavior.shareable).toBe(true);
  });

  test("media: t=1:30 (mm:ss)", () => {
    const result = analyzeFragment("t=1:30");
    expect(result.type).toBe("media");
    expect(result.content.media?.value).toBe(90);
    expect(result.content.media?.formatted).toBe("1:30");
  });

  test("media: t=1:05:30 (hh:mm:ss)", () => {
    const result = analyzeFragment("t=1:05:30");
    expect(result.type).toBe("media");
    expect(result.content.media?.value).toBe(3930);
    expect(result.content.media?.formatted).toBe("65:30");
  });

  // ─── query ─────────────────────────────────────────────────────────
  test("query: ?search=foo", () => {
    const result = analyzeFragment("?search=foo");
    expect(result.type).toBe("query");
    expect(result.content.state).toEqual({ search: "foo" });
    expect(result.behavior.requiresJS).toBe(true);
  });

  test("query: ?a=1&b=2", () => {
    const result = analyzeFragment("?a=1&b=2");
    expect(result.type).toBe("query");
    expect(result.content.state).toEqual({ a: "1", b: "2" });
  });

  // ─── unknown ───────────────────────────────────────────────────────
  test("unknown: special characters", () => {
    const result = analyzeFragment("@!$%^");
    expect(result.type).toBe("unknown");
    expect(result.behavior.triggersScroll).toBe(false);
    expect(result.behavior.requiresJS).toBe(false);
    expect(result.behavior.shareable).toBe(false);
  });
});
