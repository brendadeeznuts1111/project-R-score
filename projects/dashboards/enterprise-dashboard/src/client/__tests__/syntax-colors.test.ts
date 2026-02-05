/**
 * Syntax Colors Test Suite
 * Tests for TOML-based syntax color system with Bun.color() integration
 */
import { describe, it, expect, beforeAll } from "bun:test";
import {
  getSyntaxColorInfo,
  getSyntaxColor,
  getSyntaxAnsi,
  getSyntaxColorCSS,
  hasLanguageColor,
  getAvailableLanguages,
  colors,
  names,
  text_colors,
  settings,
} from "../utils/syntax-colors";

// ============================================
// TOML Structure Validation
// ============================================
describe("TOML Structure Integrity", () => {
  it("has colors section with entries", () => {
    expect(colors).toBeDefined();
    expect(Object.keys(colors).length).toBeGreaterThan(0);
  });

  it("has names section with entries", () => {
    expect(names).toBeDefined();
    expect(Object.keys(names).length).toBeGreaterThan(0);
  });

  it("has text_colors section with entries", () => {
    expect(text_colors).toBeDefined();
    expect(Object.keys(text_colors).length).toBeGreaterThan(0);
  });

  it("has settings with required fallbacks", () => {
    expect(settings).toBeDefined();
    expect(settings.fallback_bg).toBeDefined();
    expect(settings.fallback_text).toBeDefined();
    expect(settings.fallback_name).toBeDefined();
  });

  it("all colors are valid hex format", () => {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    for (const [lang, color] of Object.entries(colors)) {
      expect(hexRegex.test(color)).toBe(true);
    }
  });

  it("every color has a corresponding name", () => {
    const colorKeys = Object.keys(colors);
    const nameKeys = Object.keys(names);

    for (const key of colorKeys) {
      expect(nameKeys).toContain(key);
    }
  });
});

// ============================================
// Language Color Tests - Major Languages
// ============================================
describe("Major Language Colors", () => {
  const majorLanguages = [
    { lang: "typescript", expectedBg: "#3178C6", expectedName: "TypeScript" },
    { lang: "ts", expectedBg: "#3178C6", expectedName: "TypeScript" },
    { lang: "javascript", expectedBg: "#F7DF1E", expectedName: "JavaScript" },
    { lang: "js", expectedBg: "#F7DF1E", expectedName: "JavaScript" },
    { lang: "python", expectedBg: "#3776AB", expectedName: "Python" },
    { lang: "py", expectedBg: "#3776AB", expectedName: "Python" },
    { lang: "rust", expectedBg: "#DEA584", expectedName: "Rust" },
    { lang: "go", expectedBg: "#00ADD8", expectedName: "Go" },
    { lang: "bash", expectedBg: "#4EAA25", expectedName: "Bash" },
    { lang: "toml", expectedBg: "#9C4121", expectedName: "TOML" },
  ];

  for (const { lang, expectedBg, expectedName } of majorLanguages) {
    it(`${lang} has correct color (${expectedBg})`, () => {
      const info = getSyntaxColorInfo(lang);
      expect(info.bg).toBe(expectedBg);
      expect(info.name).toBe(expectedName);
    });
  }
});

// ============================================
// Alias Tests
// ============================================
describe("Language Aliases", () => {
  const aliases = [
    ["typescript", "ts"],
    ["javascript", "js"],
    ["python", "py"],
    ["rust", "rs"],
    ["ruby", "rb"],
    ["bash", "sh"],
    ["yaml", "yml"],
    ["markdown", "md"],
    ["dockerfile", "docker"],
    ["terraform", "tf"],
  ];

  for (const [primary, alias] of aliases) {
    it(`${alias} is alias for ${primary}`, () => {
      const primaryInfo = getSyntaxColorInfo(primary);
      const aliasInfo = getSyntaxColorInfo(alias);
      expect(aliasInfo.bg).toBe(primaryInfo.bg);
    });
  }
});

// ============================================
// getSyntaxColorInfo Tests
// ============================================
describe("getSyntaxColorInfo", () => {
  it("returns correct info for known language", () => {
    const info = getSyntaxColorInfo("typescript");
    expect(info.bg).toBe("#3178C6");
    expect(info.text).toBe("#FFFFFF");
    expect(info.name).toBe("TypeScript");
  });

  it("is case-insensitive", () => {
    const lower = getSyntaxColorInfo("typescript");
    const upper = getSyntaxColorInfo("TYPESCRIPT");
    const mixed = getSyntaxColorInfo("TypeScript");

    expect(lower.bg).toBe(upper.bg);
    expect(lower.bg).toBe(mixed.bg);
  });

  it("returns fallback for unknown language", () => {
    const info = getSyntaxColorInfo("unknown-language-xyz");
    expect(info.bg).toBe(settings.fallback_bg);
    expect(info.text).toBe(settings.fallback_text);
    expect(info.name).toBe(settings.fallback_name);
  });
});

// ============================================
// getSyntaxColor with Bun.color() Tests
// ============================================
describe("getSyntaxColor (Bun.color integration)", () => {
  it("returns hex format by default", () => {
    const hex = getSyntaxColor("typescript");
    expect(hex).toBe("#3178c6"); // Bun.color returns lowercase
  });

  it("returns uppercase HEX format", () => {
    const hex = getSyntaxColor("typescript", "HEX");
    expect(hex).toBe("#3178C6");
  });

  it("returns rgb string format", () => {
    const rgb = getSyntaxColor("typescript", "rgb");
    expect(rgb).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("returns rgba string format", () => {
    const rgba = getSyntaxColor("typescript", "rgba");
    expect(rgba).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
  });

  it("returns {rgb} object format", () => {
    const rgb = getSyntaxColor("typescript", "{rgb}");
    expect(rgb).toHaveProperty("r");
    expect(rgb).toHaveProperty("g");
    expect(rgb).toHaveProperty("b");
    expect((rgb as any).r).toBe(49);  // #31 = 49
    expect((rgb as any).g).toBe(120); // #78 = 120
    expect((rgb as any).b).toBe(198); // #C6 = 198
  });

  it("returns [rgba] array format", () => {
    const rgba = getSyntaxColor("typescript", "[rgba]");
    expect(Array.isArray(rgba)).toBe(true);
    expect((rgba as number[]).length).toBe(4);
    expect((rgba as number[])[0]).toBe(49);  // r
    expect((rgba as number[])[1]).toBe(120); // g
    expect((rgba as number[])[2]).toBe(198); // b
    expect((rgba as number[])[3]).toBe(255); // a (0-255 scale)
  });

  it("returns number format", () => {
    const num = getSyntaxColor("typescript", "number");
    expect(typeof num).toBe("number");
  });

  it("returns CSS format", () => {
    const css = getSyntaxColor("typescript", "css");
    expect(typeof css).toBe("string");
  });

  it("returns ANSI escape code", () => {
    const ansi = getSyntaxColor("typescript", "ansi");
    expect(typeof ansi).toBe("string");
    expect(ansi).toContain("\x1b["); // ANSI escape sequence
  });
});

// ============================================
// getSyntaxAnsi Tests
// ============================================
describe("getSyntaxAnsi", () => {
  it("returns ANSI escape code for known language", () => {
    const ansi = getSyntaxAnsi("typescript");
    expect(ansi).toContain("\x1b[");
  });

  it("returns fallback ANSI for unknown language", () => {
    const ansi = getSyntaxAnsi("unknown-xyz");
    expect(ansi).toContain("\x1b[");
  });
});

// ============================================
// getSyntaxColorCSS Tests
// ============================================
describe("getSyntaxColorCSS", () => {
  it("returns CSS color string", () => {
    const css = getSyntaxColorCSS("typescript");
    expect(typeof css).toBe("string");
  });

  it("returns fallback for unknown language", () => {
    const css = getSyntaxColorCSS("unknown-xyz");
    expect(css).toBeDefined();
  });
});

// ============================================
// hasLanguageColor Tests
// ============================================
describe("hasLanguageColor", () => {
  it("returns true for known language", () => {
    expect(hasLanguageColor("typescript")).toBe(true);
    expect(hasLanguageColor("javascript")).toBe(true);
    expect(hasLanguageColor("python")).toBe(true);
  });

  it("returns false for unknown language", () => {
    expect(hasLanguageColor("unknown-xyz")).toBe(false);
    expect(hasLanguageColor("notarealang")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasLanguageColor("TYPESCRIPT")).toBe(true);
    expect(hasLanguageColor("TypeScript")).toBe(true);
  });
});

// ============================================
// getAvailableLanguages Tests
// ============================================
describe("getAvailableLanguages", () => {
  it("returns array of language keys", () => {
    const langs = getAvailableLanguages();
    expect(Array.isArray(langs)).toBe(true);
    expect(langs.length).toBeGreaterThan(40); // We have 40+ languages
  });

  it("includes major languages", () => {
    const langs = getAvailableLanguages();
    expect(langs).toContain("typescript");
    expect(langs).toContain("javascript");
    expect(langs).toContain("python");
    expect(langs).toContain("rust");
    expect(langs).toContain("go");
  });
});

// ============================================
// Text Color Contrast Tests
// ============================================
describe("Text Color Contrast", () => {
  it("light backgrounds have dark text", () => {
    // JavaScript has yellow background (#F7DF1E) - should have dark text
    const jsInfo = getSyntaxColorInfo("javascript");
    expect(jsInfo.text).toBe("#000000");

    // Rust has light background (#DEA584) - should have dark text
    const rustInfo = getSyntaxColorInfo("rust");
    expect(rustInfo.text).toBe("#000000");
  });

  it("dark backgrounds have light text", () => {
    // TypeScript has blue background (#3178C6) - should have light text
    const tsInfo = getSyntaxColorInfo("typescript");
    expect(tsInfo.text).toBe("#FFFFFF");

    // Python has dark blue (#3776AB) - should have light/yellow text
    const pyInfo = getSyntaxColorInfo("python");
    expect(pyInfo.text).toBe("#FFD43B");
  });
});

// ============================================
// Edge Cases
// ============================================
describe("Edge Cases", () => {
  it("handles empty string", () => {
    const info = getSyntaxColorInfo("");
    expect(info.bg).toBe(settings.fallback_bg);
  });

  it("handles whitespace", () => {
    const info = getSyntaxColorInfo("  ");
    expect(info.bg).toBe(settings.fallback_bg);
  });

  it("handles special characters", () => {
    const info = getSyntaxColorInfo("c++");
    // Note: c++ isn't a valid key, but cpp is
    expect(info.bg).toBe(settings.fallback_bg);
  });

  it("handles numbers in language name", () => {
    const info = getSyntaxColorInfo("python3");
    expect(info.bg).toBe(settings.fallback_bg);
  });
});

// ============================================
// Coverage: All 45+ Languages
// ============================================
describe("All Languages Coverage", () => {
  const allLanguages = getAvailableLanguages();

  for (const lang of allLanguages) {
    it(`${lang} has valid color info`, () => {
      const info = getSyntaxColorInfo(lang);
      expect(info.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(info.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(info.name.length).toBeGreaterThan(0);
    });
  }
});
