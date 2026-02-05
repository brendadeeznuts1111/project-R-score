/**
 * Config Module Test Suite
 * Themes, integrity, shortcuts validation
 */
import { describe, it, expect } from "bun:test";
import { getTheme, getConfigIntegrity, type ThemeName } from "../config";
import { validateShortcuts } from "../config/validate";

describe("Config Module", () => {
  describe("Theme Configuration", () => {
    it("should load all themes without errors", () => {
      const themes: ThemeName[] = ["light", "dark", "midnight", "high-contrast"];
      themes.forEach((themeName) => {
        const theme = getTheme(themeName);
        expect(theme).toBeDefined();
        expect(theme.primary).toBeDefined();
        expect(theme.background).toBeDefined();
      });
    });

    it("should have consistent color formats", () => {
      const theme = getTheme("light");
      expect(theme.primary).toMatch(/^#([0-9A-F]{6}|[0-9A-F]{8})$/i);
      expect(theme.secondary).toMatch(/^#([0-9A-F]{6}|[0-9A-F]{8})$/i);
    });
  });

  describe("Integrity Checks", () => {
    it("should calculate consistent CRC32 hashes", () => {
      const integrity = getConfigIntegrity();
      expect(integrity.combined).toMatch(/^[a-f0-9]{8}$/);
      expect(integrity.themes).toMatch(/^[a-f0-9]{8}$/);
      expect(integrity.shortcuts).toMatch(/^[a-f0-9]{8}$/);
      expect(integrity.syntax).toMatch(/^[a-f0-9]{8}$/);
      expect(Object.keys(integrity).length).toBeGreaterThan(0);
    });
  });

  describe("Shortcuts", () => {
    it("should have unique keybindings", () => {
      const errors = validateShortcuts();
      expect(errors).toHaveLength(0);
    });
  });
});
