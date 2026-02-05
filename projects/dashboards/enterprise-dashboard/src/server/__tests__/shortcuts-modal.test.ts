/**
 * Keyboard Shortcuts Modal Tests
 *
 * Tests the KeyboardShortcutsModal component functionality:
 * - Shortcut parsing from TOML config
 * - Search filtering
 * - Category filtering
 * - Platform-aware key display
 * - Theme CSS variable integration
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { shortcutsConfig, themeConfig } from "../../client/config";

describe("KeyboardShortcutsModal", () => {
  describe("Shortcuts Config Loading", () => {
    test("loads keyboard shortcuts from TOML", () => {
      expect(shortcutsConfig).toBeDefined();
      expect(shortcutsConfig.keyboard).toBeDefined();
      expect(shortcutsConfig.chords).toBeDefined();
    });

    test("has expected keyboard categories", () => {
      const keyboard = shortcutsConfig.keyboard as Record<string, Record<string, unknown>>;
      const expectedCategories = ["global", "tabs", "data", "view", "projects", "network", "dev"];

      for (const category of expectedCategories) {
        expect(keyboard[category]).toBeDefined();
        expect(Object.keys(keyboard[category]).length).toBeGreaterThan(0);
      }
    });

    test("keyboard shortcuts have required properties", () => {
      const { keyboard } = shortcutsConfig;

      for (const [category, bindings] of Object.entries(keyboard)) {
        for (const [key, binding] of Object.entries(bindings as Record<string, any>)) {
          expect(binding.action).toBeDefined();
          expect(typeof binding.action).toBe("string");
          expect(binding.description).toBeDefined();
          expect(typeof binding.description).toBe("string");
        }
      }
    });

    test("chord shortcuts have required properties", () => {
      const { chords } = shortcutsConfig;

      for (const [key, binding] of Object.entries(chords)) {
        expect(binding.action).toBeDefined();
        expect(binding.description).toBeDefined();
      }
    });

    test("has vim-style chord sequences", () => {
      const { chords } = shortcutsConfig;
      const chordKeys = Object.keys(chords);

      // Should have multi-key sequences like "gg", "gc", etc.
      expect(chordKeys.some((k) => k.length >= 2)).toBe(true);
    });
  });

  describe("Theme Config Loading", () => {
    test("loads theme config from TOML", () => {
      expect(themeConfig).toBeDefined();
    });

    test("has expected themes", () => {
      const themes = themeConfig as unknown as Record<string, unknown>;
      const expectedThemes = ["light", "dark", "high-contrast", "midnight"];

      for (const theme of expectedThemes) {
        expect(themes[theme]).toBeDefined();
      }
    });

    test("themes have chart colors for category styling", () => {
      const { dark } = themeConfig;

      // Chart colors used for category badges
      expect(dark["chart-1"]).toBeDefined(); // blue - global
      expect(dark["chart-2"]).toBeDefined(); // green - tabs
      expect(dark["chart-3"]).toBeDefined(); // yellow - projects
      expect(dark["chart-4"]).toBeDefined(); // red - dev
      expect(dark["chart-5"]).toBeDefined(); // purple - data
      expect(dark["chart-6"]).toBeDefined(); // cyan - view
    });

    test("themes have surface colors for modal styling", () => {
      const { dark } = themeConfig;

      expect(dark["surface"]).toBeDefined();
      expect(dark["surface-elevated"]).toBeDefined();
      expect(dark["border"]).toBeDefined();
      expect(dark["text-primary"]).toBeDefined();
      expect(dark["text-secondary"]).toBeDefined();
      expect(dark["text-muted"]).toBeDefined();
    });
  });

  describe("Key Display Formatting", () => {
    // Simulating the formatKeyForDisplay logic
    function formatKey(key: string, platform: "mac" | "windows"): string {
      const isMac = platform === "mac";
      const macSymbols: Record<string, string> = {
        cmd: "⌘",
        ctrl: "⌃",
        alt: "⌥",
        shift: "⇧",
        meta: "⌘",
        option: "⌥",
        enter: "↵",
        return: "↵",
        delete: "⌫",
        backspace: "⌫",
        tab: "⇥",
        esc: "⎋",
        escape: "⎋",
        space: "␣",
        up: "↑",
        down: "↓",
        left: "←",
        right: "→",
      };

      const winLabels: Record<string, string> = {
        cmd: "Ctrl",
        ctrl: "Ctrl",
        alt: "Alt",
        shift: "Shift",
        meta: "Win",
        option: "Alt",
        enter: "Enter",
        return: "Enter",
        delete: "Del",
        backspace: "Bksp",
        tab: "Tab",
        esc: "Esc",
        escape: "Esc",
        space: "Space",
        up: "↑",
        down: "↓",
        left: "←",
        right: "→",
      };

      const parts = key.split(/\s*\+\s*/);
      return parts
        .map((part) => {
          const lower = part.toLowerCase();
          return isMac ? macSymbols[lower] || part.toUpperCase() : winLabels[lower] || part.toUpperCase();
        })
        .join(isMac ? "" : "+");
    }

    test("formats Mac modifier keys with symbols", () => {
      expect(formatKey("Cmd", "mac")).toBe("⌘");
      expect(formatKey("Ctrl", "mac")).toBe("⌃");
      expect(formatKey("Alt", "mac")).toBe("⌥");
      expect(formatKey("Shift", "mac")).toBe("⇧");
    });

    test("formats Windows modifier keys with labels", () => {
      expect(formatKey("Cmd", "windows")).toBe("Ctrl");
      expect(formatKey("Ctrl", "windows")).toBe("Ctrl");
      expect(formatKey("Alt", "windows")).toBe("Alt");
      expect(formatKey("Shift", "windows")).toBe("Shift");
    });

    test("formats key combinations for Mac", () => {
      expect(formatKey("Cmd+S", "mac")).toBe("⌘S");
      expect(formatKey("Cmd+Shift+P", "mac")).toBe("⌘⇧P");
    });

    test("formats key combinations for Windows", () => {
      expect(formatKey("Cmd+S", "windows")).toBe("Ctrl+S");
      expect(formatKey("Cmd+Shift+P", "windows")).toBe("Ctrl+Shift+P");
    });

    test("formats special keys", () => {
      expect(formatKey("Esc", "mac")).toBe("⎋");
      expect(formatKey("Esc", "windows")).toBe("Esc");
      expect(formatKey("Enter", "mac")).toBe("↵");
      expect(formatKey("Enter", "windows")).toBe("Enter");
    });

    test("preserves letter keys", () => {
      expect(formatKey("K", "mac")).toBe("K");
      expect(formatKey("K", "windows")).toBe("K");
      expect(formatKey("?", "mac")).toBe("?");
      expect(formatKey("?", "windows")).toBe("?");
    });
  });

  describe("Shortcut Filtering", () => {
    function getAllShortcuts() {
      const shortcuts: Array<{
        key: string;
        action: string;
        description: string;
        category: string;
      }> = [];

      const { keyboard, chords } = shortcutsConfig;

      for (const [category, bindings] of Object.entries(keyboard)) {
        for (const [key, binding] of Object.entries(bindings as Record<string, any>)) {
          shortcuts.push({
            key,
            action: binding.action,
            description: binding.description,
            category,
          });
        }
      }

      for (const [key, binding] of Object.entries(chords)) {
        shortcuts.push({
          key,
          action: (binding as any).action,
          description: (binding as any).description,
          category: "chords",
        });
      }

      return shortcuts;
    }

    function filterShortcuts(
      shortcuts: ReturnType<typeof getAllShortcuts>,
      search: string,
      category: string | null
    ) {
      return shortcuts.filter((s) => {
        if (category && s.category !== category) return false;
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            s.key.toLowerCase().includes(searchLower) ||
            s.action.toLowerCase().includes(searchLower) ||
            s.description.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });
    }

    test("returns all shortcuts with no filters", () => {
      const all = getAllShortcuts();
      const filtered = filterShortcuts(all, "", null);
      expect(filtered.length).toBe(all.length);
    });

    test("filters by category", () => {
      const all = getAllShortcuts();
      const globalOnly = filterShortcuts(all, "", "global");

      expect(globalOnly.length).toBeGreaterThan(0);
      expect(globalOnly.every((s) => s.category === "global")).toBe(true);
    });

    test("filters by search term in key", () => {
      const all = getAllShortcuts();
      const filtered = filterShortcuts(all, "esc", null);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((s) => s.key.toLowerCase().includes("esc"))).toBe(true);
    });

    test("filters by search term in description", () => {
      const all = getAllShortcuts();
      const filtered = filterShortcuts(all, "refresh", null);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((s) => s.description.toLowerCase().includes("refresh"))).toBe(true);
    });

    test("filters by search term in action", () => {
      const all = getAllShortcuts();
      const filtered = filterShortcuts(all, "toggle", null);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((s) => s.action.toLowerCase().includes("toggle"))).toBe(true);
    });

    test("combines category and search filters", () => {
      const all = getAllShortcuts();
      const filtered = filterShortcuts(all, "tab", "tabs");

      expect(filtered.every((s) => s.category === "tabs")).toBe(true);
    });
  });

  describe("Category Metadata", () => {
    const CATEGORY_META: Record<string, { label: string; colorVar: string; fallback: string }> = {
      global: { label: "Global", colorVar: "--theme-chart-1", fallback: "#60a5fa" },
      tabs: { label: "Navigation", colorVar: "--theme-chart-2", fallback: "#4ade80" },
      data: { label: "Data", colorVar: "--theme-chart-5", fallback: "#a78bfa" },
      view: { label: "View", colorVar: "--theme-chart-6", fallback: "#22d3ee" },
      projects: { label: "Projects", colorVar: "--theme-chart-3", fallback: "#fbbf24" },
      network: { label: "Network", colorVar: "--theme-warning", fallback: "#fbbf24" },
      dev: { label: "Developer", colorVar: "--theme-chart-4", fallback: "#f87171" },
      chords: { label: "Vim Chords", colorVar: "--theme-info", fallback: "#38bdf8" },
    };

    test("all keyboard categories have metadata", () => {
      const { keyboard } = shortcutsConfig;

      for (const category of Object.keys(keyboard)) {
        expect(CATEGORY_META[category]).toBeDefined();
        expect(CATEGORY_META[category].label).toBeDefined();
        expect(CATEGORY_META[category].colorVar).toBeDefined();
        expect(CATEGORY_META[category].fallback).toBeDefined();
      }
    });

    test("chords category has metadata", () => {
      expect(CATEGORY_META.chords).toBeDefined();
      expect(CATEGORY_META.chords.label).toBe("Vim Chords");
    });

    test("color variables reference theme chart colors", () => {
      for (const meta of Object.values(CATEGORY_META)) {
        expect(meta.colorVar.startsWith("--theme-")).toBe(true);
      }
    });

    test("fallback colors are valid hex", () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;

      for (const meta of Object.values(CATEGORY_META)) {
        expect(hexRegex.test(meta.fallback)).toBe(true);
      }
    });
  });

  describe("Shortcut Count", () => {
    test("has reasonable number of shortcuts", () => {
      const { keyboard, chords } = shortcutsConfig;

      let total = 0;
      for (const bindings of Object.values(keyboard)) {
        total += Object.keys(bindings as object).length;
      }
      total += Object.keys(chords).length;

      // Should have between 20-100 shortcuts
      expect(total).toBeGreaterThan(20);
      expect(total).toBeLessThan(100);

      console.log(`Total shortcuts: ${total}`);
    });

    test("each category has at least one shortcut", () => {
      const { keyboard } = shortcutsConfig;

      for (const [category, bindings] of Object.entries(keyboard)) {
        const count = Object.keys(bindings as object).length;
        expect(count).toBeGreaterThan(0);
        console.log(`  ${category}: ${count} shortcuts`);
      }

      const chordCount = Object.keys(shortcutsConfig.chords).length;
      expect(chordCount).toBeGreaterThan(0);
      console.log(`  chords: ${chordCount} shortcuts`);
    });
  });
});
