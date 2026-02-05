/**
 * Tests for color-mapping module
 */

import { describe, test, expect } from "bun:test";
import {
  computeFD,
  fdToColor,
  getRGBAArray,
  getANSIColor,
  normalizeColor,
  generateFDGradient,
  calculateIntensity,
  FD_THRESHOLDS,
  glyphColors
} from "../src/color-mapping";

describe("Color Mapping Module", () => {
  describe("computeFD", () => {
    test("should return valid FD for time series data", () => {
      const data = Array.from({ length: 100 }, () => Math.random() * 2 + 1);
      const fd = computeFD(data);
      expect(fd).toBeGreaterThan(0.3);
      expect(fd).toBeLessThan(3.0);
    });

    test("should handle small datasets", () => {
      const data = [1, 2, 3, 4, 5];
      const fd = computeFD(data);
      expect(fd).toBeNumber();
      expect(fd).toBeGreaterThan(0);
    });

    test("should return 1.0 for insufficient data", () => {
      const fd = computeFD([1]);
      expect(fd).toBe(1.0);
    });
  });

  describe("fdToColor", () => {
    test("should map FD to valid hex color", () => {
      const color = fdToColor(2.5);
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test("should handle black swan regime", () => {
      const color = fdToColor(2.8);
      expect(color).toBe("#FF0000"); // Intense red
    });

    test("should handle ultra-stable regime", () => {
      const color = fdToColor(0.3);
      expect(color).toBe("#FFFF00"); // Bright yellow
    });

    test("should use custom base color", () => {
      const color = fdToColor(1.5, "#00FF00");
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test("should handle invalid base color", () => {
      const color = fdToColor(1.5, "invalid");
      expect(color).toBe("#808080"); // Fallback gray
    });
  });

  describe("getRGBAArray", () => {
    test("should extract RGBA from hex color", () => {
      const rgba = getRGBAArray("#FF5733");
      expect(rgba).toHaveLength(4);
      expect(rgba[0]).toBe(255); // R
      expect(rgba[1]).toBe(87);  // G
      expect(rgba[2]).toBe(51);  // B
    });

    test("should handle invalid color", () => {
      const rgba = getRGBAArray("invalid");
      expect(rgba).toEqual([128, 128, 128, 255]); // Fallback gray
    });
  });

  describe("getANSIColor", () => {
    test("should return ANSI code for valid color", () => {
      const ansi = getANSIColor("#FF0000");
      expect(typeof ansi).toBe("string");
    });

    test("should handle invalid color", () => {
      const ansi = getANSIColor("invalid");
      expect(ansi).toBe("");
    });
  });

  describe("normalizeColor", () => {
    test("should normalize color to uppercase hex", () => {
      const normalized = normalizeColor("#ff5733");
      expect(normalized).toBe("#FF5733");
    });

    test("should handle invalid input", () => {
      const normalized = normalizeColor("not a color");
      expect(normalized).toBe("#808080");
    });
  });

  describe("generateFDGradient", () => {
    test("should generate gradient array", () => {
      const gradient = generateFDGradient(0.5, 2.5, 5);
      expect(gradient).toHaveLength(6); // steps + 1
      expect(gradient.every(c => c.match(/^#[0-9A-F]{6}$/i))).toBe(true);
    });

    test("should include expected colors in gradient", () => {
      const gradient = generateFDGradient(0.3, 2.8, 10);
      expect(gradient.length).toBeGreaterThan(5);
      // Check that extremes are included
      expect(gradient[0]).toBe(fdToColor(0.3));
      expect(gradient[gradient.length - 1]).toBe(fdToColor(2.8));
    });
  });

  describe("calculateIntensity", () => {
    test("should return correct intensity for FD regimes", () => {
      expect(calculateIntensity(0.3)).toBe(0.2); // Ultra-stable
      expect(calculateIntensity(1.0)).toBe(0.4); // Smooth trend
      expect(calculateIntensity(1.3)).toBe(0.6); // Brownian
      expect(calculateIntensity(1.7)).toBe(0.75); // Persistent
      expect(calculateIntensity(2.1)).toBe(0.9); // High chaos
      expect(calculateIntensity(2.8)).toBe(1.0); // Black swan
    });
  });

  describe("Constants", () => {
    test("FD_THRESHOLDS should have correct values", () => {
      expect(FD_THRESHOLDS.ULTRA_STABLE).toBe(0.5);
      expect(FD_THRESHOLDS.BLACK_SWAN).toBe(2.7);
    });

    test("glyphColors should have all required keys", () => {
      const requiredKeys = ["structuralDrift", "dependencyGuard", "phaseLocked", "couplingGuard", "rollbackTrigger"];
      requiredKeys.forEach(key => {
        expect(glyphColors).toHaveProperty(key);
        expect(glyphColors[key as keyof typeof glyphColors]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });
});
