import { describe, it, expect } from "bun:test";
import {
  noColor,
  colorize,
  bold,
  dim,
  PALETTE,
  success,
  error,
  warning,
  info,
  muted,
  convert,
  toHex,
  toRgb,
  toHsl,
  toHex8,
  OK,
  FAIL,
  WARN,
  INFO,
  ANSI,
} from "../src/color/";

describe("color", () => {
  describe("BN-060: NO_COLOR Detection", () => {
    it("should return a boolean", () => {
      expect(typeof noColor()).toBe("boolean");
    });
  });

  describe("BN-061: Colorize", () => {
    it("should return string containing the text", () => {
      const result = colorize("hello", "#ff0000");
      expect(result).toContain("hello");
    });

    it("should return string for bold", () => {
      const result = bold("strong");
      expect(result).toContain("strong");
    });

    it("should return string for dim", () => {
      const result = dim("faded");
      expect(result).toContain("faded");
    });
  });

  describe("BN-062: Semantic Presets", () => {
    it("should have correct palette values", () => {
      expect(PALETTE.success).toBe("#22c55e");
      expect(PALETTE.error).toBe("#ef4444");
      expect(PALETTE.warning).toBe("#eab308");
      expect(PALETTE.info).toBe("#3b82f6");
      expect(PALETTE.muted).toBe("#6b7280");
    });

    it("should wrap text with semantic colors", () => {
      expect(success("ok")).toContain("ok");
      expect(error("fail")).toContain("fail");
      expect(warning("warn")).toContain("warn");
      expect(info("note")).toContain("note");
      expect(muted("quiet")).toContain("quiet");
    });
  });

  describe("BN-063: Hex Conversion", () => {
    it("should convert named color to hex", () => {
      expect(toHex("red")).toBe("#ff0000");
    });

    it("should convert number to hex", () => {
      expect(toHex(0xff0000)).toBe("#ff0000");
    });

    it("should convert array to hex", () => {
      expect(toHex([255, 0, 0])).toBe("#ff0000");
    });

    it("should convert hex to rgb", () => {
      const rgb = toRgb("#ff0000");
      expect(rgb).toBeString();
      expect(rgb).toContain("255");
    });

    it("should convert hex to hsl", () => {
      const hsl = toHsl("#ff0000");
      expect(hsl).toBeString();
    });

    it("should return null for invalid input", () => {
      expect(toHex("notacolor")).toBeNull();
    });

    it("should return null for convert with invalid input", () => {
      expect(convert("not-a-valid-color-at-all-xyz", "hex")).toBeNull();
    });

    it("should return null for convert that throws", () => {
      // Bun.color throws for undefined/object inputs
      expect(convert(undefined as any, "hex")).toBeNull();
    });

    it("should colorize with an invalid hex gracefully", () => {
      // When Bun.color returns null, colorize should return plain text
      const result = colorize("hello", "not-a-hex");
      expect(result).toContain("hello");
    });

    it("should support explicit format", () => {
      const result = convert("red", "HEX");
      expect(result).toBe("#FF0000");
    });

    it("should convert to hex8 with full alpha", () => {
      const result = toHex8("red");
      expect(result).toBeString();
      expect(result!.startsWith("#")).toBe(true);
      expect(result!.length).toBe(9);
      expect(result!.slice(0, 7)).toBe("#ff0000");
    });

    it("should return null for invalid hex8 input", () => {
      expect(toHex8("notacolor")).toBeNull();
    });
  });

  describe("BN-064b: ANSI Constants", () => {
    it("should export ANSI reset code", () => {
      expect(ANSI.reset).toBe("\x1b[0m");
    });

    it("should export ANSI bold code", () => {
      expect(ANSI.bold).toBe("\x1b[1m");
    });

    it("should export ANSI dim code", () => {
      expect(ANSI.dim).toBe("\x1b[2m");
    });

    it("should export foreground colors", () => {
      expect(ANSI.red).toContain("\x1b[");
      expect(ANSI.green).toContain("\x1b[");
      expect(ANSI.blue).toContain("\x1b[");
      expect(ANSI.yellow).toContain("\x1b[");
      expect(ANSI.cyan).toContain("\x1b[");
      expect(ANSI.magenta).toContain("\x1b[");
      expect(ANSI.white).toContain("\x1b[");
      expect(ANSI.gray).toContain("\x1b[");
      expect(ANSI.black).toContain("\x1b[");
    });

    it("should export background colors", () => {
      expect(ANSI.bgRed).toContain("\x1b[");
      expect(ANSI.bgGreen).toContain("\x1b[");
      expect(ANSI.bgBlue).toContain("\x1b[");
      expect(ANSI.bgYellow).toContain("\x1b[");
    });
  });

  describe("BN-064: Status Symbols", () => {
    it("should prefix with check mark", () => {
      expect(OK("done")).toContain("\u2713");
      expect(OK("done")).toContain("done");
    });

    it("should prefix with X mark", () => {
      expect(FAIL("broken")).toContain("\u2717");
      expect(FAIL("broken")).toContain("broken");
    });

    it("should prefix with warning symbol", () => {
      expect(WARN("caution")).toContain("\u26A0");
      expect(WARN("caution")).toContain("caution");
    });

    it("should prefix with info symbol", () => {
      expect(INFO("fyi")).toContain("\u2139");
      expect(INFO("fyi")).toContain("fyi");
    });
  });

  describe("BN-063b: convert format correctness", () => {
    it("should convert to rgb format (not hex)", () => {
      const rgb = convert("#ff0000", "rgb");
      expect(rgb).not.toBeNull();
      expect(rgb!).toContain("rgb");
      expect(rgb!).not.toBe("#ff0000");
    });

    it("should convert to hsl format (not hex)", () => {
      const hsl = convert("#ff0000", "hsl");
      expect(hsl).not.toBeNull();
      expect(hsl!).toContain("hsl");
    });

    it("should return null for invalid input", () => {
      expect(convert("not-a-color")).toBeNull();
    });

    it("toHex8 should produce 9-char hex with alpha", () => {
      const hex8 = toHex8([255, 0, 0, 128]);
      expect(hex8).not.toBeNull();
      expect(hex8!).toMatch(/^#[0-9a-f]{8}$/);
      expect(hex8!.startsWith("#ff0000")).toBe(true);
    });
  });
});
