/**
 * README Config Loader tests
 *
 * Validates:
 *   - TOML extraction from odds-selectors README
 *   - Specific key extraction
 *   - Missing package error
 *   - Missing TOML block error
 *   - Sync variant
 */

import { describe, it, expect } from "bun:test";
import {
  readConfigFromPackage,
  readConfigFromPackageSync,
} from "../../src/utils/readme-config-loader";

// ---------------------------------------------------------------------------
// Define expected selector shape
// ---------------------------------------------------------------------------

interface TeamSelector {
  rowSelector: string;
  teamSelector: string;
  oddsSelector: string;
  confSelector?: string;
  type?: string;
}

interface OddsSelectorsConfig {
  [team: string]: TeamSelector;
  fallback: TeamSelector;
}

describe("readConfigFromPackage", () => {
  it("loads odds-selectors config (async)", async () => {
    const config = await readConfigFromPackage<OddsSelectorsConfig>(
      "odds-selectors"
    );

    expect(config.arsenal).toBeDefined();
    expect(config.arsenal.rowSelector).toBe("#odds-table tr");
    expect(config.arsenal.teamSelector).toBe(".team");
    expect(config.arsenal.oddsSelector).toBe(".price");
    expect(config.arsenal.confSelector).toBe(".conf");

    expect(config.liverpool.type).toBe("data-attributes");
    expect(config.barcelona.type).toBe("shadow-dom");

    expect(config.fallback).toBeDefined();
    expect(config.fallback.rowSelector).toBe("table.odds tr");
  });

  it("extracts a specific key", async () => {
    const arsenal = await readConfigFromPackage<TeamSelector>(
      "odds-selectors",
      { key: "arsenal" }
    );

    expect(arsenal.rowSelector).toBe("#odds-table tr");
    expect(arsenal.oddsSelector).toBe(".price");
    expect((arsenal as any).liverpool).toBeUndefined(); // only arsenal subtree
  });

  it("throws on missing package", async () => {
    await expect(
      readConfigFromPackage("nonexistent-package-xyz")
    ).rejects.toThrow(/not found/);
  });

  it("throws on missing key", async () => {
    await expect(
      readConfigFromPackage("odds-selectors", { key: "nonexistent-team" })
    ).rejects.toThrow(/not found/);
  });
});

describe("readConfigFromPackageSync", () => {
  it("loads odds-selectors config (sync)", () => {
    const config = readConfigFromPackageSync<OddsSelectorsConfig>(
      "odds-selectors"
    );

    expect(config.arsenal.rowSelector).toBe("#odds-table tr");
    expect(config.liverpool.type).toBe("data-attributes");
    expect(config.fallback.rowSelector).toBe("table.odds tr");
  });

  it("extracts a specific key (sync)", () => {
    const manUtd = readConfigFromPackageSync<TeamSelector>(
      "odds-selectors",
      { key: "manchester-united" }
    );

    expect(manUtd.rowSelector).toBe("#odds-table tr");
    expect(manUtd.teamSelector).toBe(".team");
  });

  it("throws on missing package (sync)", () => {
    expect(() =>
      readConfigFromPackageSync("nonexistent-package-xyz")
    ).toThrow(/not found/);
  });
});
