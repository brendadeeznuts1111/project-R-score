/**
 * [TEST][THEME][SYSTEM]{BUN-NATIVE}
 * Tests for the theme system
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ThemeEngine,
  createThemeEngine,
  generateCSSVariables,
  generateStyleObject,
  DARK_PRO_THEME,
  LIGHT_COMPLIANCE_THEME,
  TERMINAL_RETRO_THEME,
  MIDNIGHT_DEV_THEME,
  HIGH_CONTRAST_THEME,
  PREDEFINED_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  getDefaultTheme,
  getAvailableThemeIds,
  getThemesByCategory,
  hexToRgb,
  rgbToHex,
  getContrastRatio,
  meetsWCAGContrast,
  validateThemeAccessibility,
  mergeThemes,
  cloneTheme,
  exportThemeToJSON,
  importThemeFromJSON,
} from "./index";

describe("[THEME][SYSTEM]", () => {
  describe("Predefined Themes", () => {
    it("should have 5 predefined themes", () => {
      expect(Object.keys(PREDEFINED_THEMES)).toHaveLength(5);
    });

    it("should have all required theme IDs", () => {
      const ids = getAvailableThemeIds();
      expect(ids).toContain("dark-pro");
      expect(ids).toContain("light-compliance");
      expect(ids).toContain("terminal-retro");
      expect(ids).toContain("midnight-dev");
      expect(ids).toContain("high-contrast");
    });

    it("should return default theme as dark-pro", () => {
      expect(DEFAULT_THEME_ID).toBe("dark-pro");
      expect(getDefaultTheme().id).toBe("dark-pro");
    });

    it("should get theme by ID", () => {
      expect(getThemeById("dark-pro")).toBe(DARK_PRO_THEME);
      expect(getThemeById("nonexistent")).toBeUndefined();
    });

    it("should filter themes by category", () => {
      const devThemes = getThemesByCategory("developer");
      expect(devThemes).toHaveLength(1);
      expect(devThemes[0].id).toBe("midnight-dev");
    });
  });

  describe("ThemeEngine", () => {
    let engine: ThemeEngine;

    beforeEach(() => {
      engine = createThemeEngine();
    });

    it("should initialize with default theme", () => {
      expect(engine.isInitialized()).toBe(true);
      expect(engine.getCurrentTheme().id).toBe("dark-pro");
    });

    it("should change themes by ID", () => {
      engine.setTheme("midnight-dev");
      expect(engine.getCurrentTheme().id).toBe("midnight-dev");
      expect(engine.getPreviousTheme()?.id).toBe("dark-pro");
    });

    it("should change themes by object", () => {
      engine.setTheme(TERMINAL_RETRO_THEME);
      expect(engine.getCurrentTheme().id).toBe("terminal-retro");
    });

    it("should throw on invalid theme ID", () => {
      expect(() => engine.setTheme("nonexistent")).toThrow();
    });

    it("should register custom themes", () => {
      const customTheme = { ...DARK_PRO_THEME, id: "custom-1", name: "Custom" };
      engine.registerCustomTheme(customTheme);
      engine.setTheme("custom-1");
      expect(engine.getCurrentTheme().id).toBe("custom-1");
    });

    it("should not override predefined themes", () => {
      const fake = { ...DARK_PRO_THEME, id: "dark-pro" };
      expect(() => engine.registerCustomTheme(fake)).toThrow();
    });

    it("should subscribe to theme changes", () => {
      let eventReceived = false;
      const unsub = engine.subscribe((event) => {
        eventReceived = true;
        expect(event.newTheme.id).toBe("light-compliance");
      });
      engine.setTheme("light-compliance");
      expect(eventReceived).toBe(true);
      unsub();
    });

    it("should reset to default theme", () => {
      engine.setTheme("terminal-retro");
      engine.reset();
      expect(engine.getCurrentTheme().id).toBe("dark-pro");
    });

    it("should generate CSS variables", () => {
      const css = engine.getCSSVariables();
      expect(css).toContain(":root {");
      expect(css).toContain("--color-primary:");
      expect(css).toContain("--font-family:");
    });

    it("should generate style object", () => {
      const styles = engine.getStyleObject();
      expect(styles["--color-primary"]).toBe(DARK_PRO_THEME.colors.primary);
    });

    it("should dispose properly", () => {
      engine.dispose();
      expect(engine.isInitialized()).toBe(false);
    });
  });

  describe("CSS Generation", () => {
    it("should generate CSS variables from theme", () => {
      const css = generateCSSVariables(DARK_PRO_THEME);
      expect(css).toContain("--color-primary: #8B5CF6");
      expect(css).toContain("--color-background: #0F172A");
    });

    it("should generate style object from theme", () => {
      const styles = generateStyleObject(MIDNIGHT_DEV_THEME);
      expect(styles["--color-primary"]).toBe("#60A5FA");
    });
  });
});

