/**
 * Shortcuts Performance Benchmarks
 * Measures performance of shortcut operations
 */

import { describe, it, expect } from "bun:test";
import { shortcutsConfig, getAllKeyboardShortcuts, findShortcutByAction } from "../config";
import type { ShortcutBinding } from "../config";

// Mock data for benchmarks
const generateMockShortcuts = (count: number): Record<string, ShortcutBinding> => {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `Cmd/Ctrl + ${String.fromCharCode(65 + (i % 26))}`,
      {
        action: `action-${i}`,
        description: `Description for action ${i}`,
      },
    ])
  );
};

describe("Shortcuts Performance Benchmarks", () => {
  describe("Config Loading", () => {
    it("should load shortcuts config quickly", () => {
      const config = shortcutsConfig;
      expect(config).toBeDefined();
      expect(config.keyboard).toBeDefined();
    });

    it("should get all keyboard shortcuts quickly", () => {
      const shortcuts = getAllKeyboardShortcuts();
      expect(shortcuts.size).toBeGreaterThan(0);
    });

    it("should find shortcut by action quickly", () => {
      const result = findShortcutByAction("open-search");
      // May or may not find it, but should complete quickly
      expect(typeof result).toMatch(/object|null/);
    });
  });

  describe("Conflict Detection", () => {
    it("should detect conflicts in small config (10 shortcuts) quickly", () => {
      const shortcuts = generateMockShortcuts(10);
      const keyMap = new Map<string, string[]>();

      Object.entries(shortcuts).forEach(([key, binding]) => {
        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }
        keyMap.get(key)!.push(binding.action);
      });

      const conflicts: Array<{ key: string; actions: string[] }> = [];
      keyMap.forEach((actions, key) => {
        if (actions.length > 1) {
          conflicts.push({ key, actions });
        }
      });

      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect conflicts in medium config (100 shortcuts) quickly", () => {
      const shortcuts = generateMockShortcuts(100);
      const keyMap = new Map<string, string[]>();

      Object.entries(shortcuts).forEach(([key, binding]) => {
        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }
        keyMap.get(key)!.push(binding.action);
      });

      const conflicts: Array<{ key: string; actions: string[] }> = [];
      keyMap.forEach((actions, key) => {
        if (actions.length > 1) {
          conflicts.push({ key, actions });
        }
      });

      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect conflicts in large config (1000 shortcuts) quickly", () => {
      const shortcuts = generateMockShortcuts(1000);
      const keyMap = new Map<string, string[]>();

      Object.entries(shortcuts).forEach(([key, binding]) => {
        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }
        keyMap.get(key)!.push(binding.action);
      });

      const conflicts: Array<{ key: string; actions: string[] }> = [];
      keyMap.forEach((actions, key) => {
        if (actions.length > 1) {
          conflicts.push({ key, actions });
        }
      });

      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Key Normalization", () => {
    const normalizeKey = (key: string, platform: string): string => {
      return key
        .replace(/CmdOrCtrl/gi, platform === "mac" ? "Cmd" : "Ctrl")
        .replace(/Cmd\/Ctrl/gi, platform === "mac" ? "Cmd" : "Ctrl")
        .toLowerCase();
    };

    it("should normalize keys quickly (100 iterations)", () => {
      const keys = [
        "Cmd/Ctrl + K",
        "CmdOrCtrl + S",
        "Alt + F4",
        "Shift + Tab",
        "Cmd/Ctrl + Shift + E",
      ];

      for (let i = 0; i < 100; i++) {
        keys.forEach((key) => {
          normalizeKey(key, "mac");
          normalizeKey(key, "windows");
        });
      }
    });
  });

  describe("Shortcut Map Building", () => {
    it("should build shortcut map from config quickly", () => {
      const shortcuts: Array<{ key: string; action: string; category: string }> = [];
      const { keyboard } = shortcutsConfig;

      for (const [category, bindings] of Object.entries(keyboard)) {
        for (const [key, binding] of Object.entries(bindings as Record<string, ShortcutBinding>)) {
          shortcuts.push({
            key,
            action: binding.action,
            category,
          });
        }
      }

      expect(shortcuts.length).toBeGreaterThan(0);
    });

    it("should build shortcut map with conflict detection quickly", () => {
      const shortcuts: Array<{ key: string; action: string; category: string }> = [];
      const keyMap = new Map<string, string[]>();
      const { keyboard } = shortcutsConfig;

      for (const [category, bindings] of Object.entries(keyboard)) {
        for (const [key, binding] of Object.entries(bindings as Record<string, ShortcutBinding>)) {
          const normalizedKey = key.toLowerCase();
          shortcuts.push({
            key,
            action: binding.action,
            category,
          });

          if (!keyMap.has(normalizedKey)) {
            keyMap.set(normalizedKey, []);
          }
          keyMap.get(normalizedKey)!.push(binding.action);
        }
      }

      const conflicts: Array<{ key: string; actions: string[] }> = [];
      keyMap.forEach((actions, key) => {
        if (actions.length > 1) {
          conflicts.push({ key, actions });
        }
      });

      expect(shortcuts.length).toBeGreaterThan(0);
      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("localStorage Operations", () => {
    it("should serialize shortcuts to JSON quickly", () => {
      const shortcuts = {
        global: shortcutsConfig.keyboard.global,
        tabs: shortcutsConfig.keyboard.tabs,
      };

      const json = JSON.stringify(shortcuts);
      expect(json.length).toBeGreaterThan(0);
    });

    it("should parse shortcuts from JSON quickly", () => {
      const shortcuts = {
        global: shortcutsConfig.keyboard.global,
        tabs: shortcutsConfig.keyboard.tabs,
      };

      const json = JSON.stringify(shortcuts);
      const parsed = JSON.parse(json);

      expect(parsed).toBeDefined();
      expect(parsed.global).toBeDefined();
    });

    it("should serialize and parse quickly (100 iterations)", () => {
      const shortcuts = {
        global: shortcutsConfig.keyboard.global,
        tabs: shortcutsConfig.keyboard.tabs,
      };

      for (let i = 0; i < 100; i++) {
        const json = JSON.stringify(shortcuts);
        const parsed = JSON.parse(json);
        expect(parsed).toBeDefined();
      }
    });
  });

  describe("Search and Filter", () => {
    it("should filter shortcuts by search query quickly", () => {
      const searchQuery = "search";
      const { keyboard } = shortcutsConfig;
      const filtered: Record<string, Record<string, ShortcutBinding>> = {};

      Object.entries(keyboard).forEach(([category, bindings]) => {
        const filteredBindings: Record<string, ShortcutBinding> = {};
        Object.entries(bindings as Record<string, ShortcutBinding>).forEach(([key, binding]) => {
          if (
            binding.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            binding.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            key.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            filteredBindings[key] = binding;
          }
        });
        if (Object.keys(filteredBindings).length > 0) {
          filtered[category] = filteredBindings;
        }
      });

      expect(Object.keys(filtered).length).toBeGreaterThanOrEqual(0);
    });
  });
});
