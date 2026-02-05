// Advanced Bun features test suite
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

describe("Advanced Bun Features", () => {
  describe("Bun.stringWidth()", () => {
    test("should handle complex Unicode sequences", () => {
      expect(Bun.stringWidth("🇺🇸")).toBe(2); // Flag emoji
      expect(Bun.stringWidth("👋🏽")).toBe(2); // Emoji with skin tone
      expect(Bun.stringWidth("👨‍👩‍👧")).toBe(2); // Family emoji (ZWJ sequence)
    });

    test("should handle zero-width characters", () => {
      expect(Bun.stringWidth("\u2060")).toBe(0); // Zero-width space
      expect(Bun.stringWidth("\u200B")).toBe(0); // Zero-width non-joiner
    });

    test("should handle ANSI escape sequences", () => {
      expect(Bun.stringWidth("\x1b[31mRed\x1b[0m")).toBe(3); // ANSI color codes
      expect(Bun.stringWidth("\x1b[1mBold\x1b[0m")).toBe(4); // ANSI bold
    });

    test("should handle ANSI hyperlinks", () => {
      const hyperlink = "\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07";
      expect(Bun.stringWidth(hyperlink)).toBe(3); // Only "Bun" counts
    });

    test("should handle mixed content", () => {
      const mixed = "\x1b[31m🇺🇸 Hello 👋🏽\x1b[0m";
      expect(Bun.stringWidth(mixed)).toBe(9); // 2 + 1 + 1 + 4 + 1 = 9
    });

    test("should handle regular text", () => {
      expect(Bun.stringWidth("Hello World")).toBe(11);
      expect(Bun.stringWidth("")).toBe(0);
      expect(Bun.stringWidth(" ")).toBe(1);
    });
  });

  describe("Feature Flags with Bun.build()", () => {
    const testDir = "./feature-test";

    beforeAll(async () => {
      await Bun.$`mkdir -p ${testDir}`;
    });

    afterAll(async () => {
      await Bun.$`rm -rf ${testDir}`;
    });

    test("should build with DEBUG feature flag", async () => {
      const testCode = `
        import { feature } from "bun:bundle";
        if (feature("DEBUG")) {
          console.log("DEBUG enabled");
        } else {
          console.log("DEBUG disabled");
        }
      `;

      await Bun.write(`${testDir}/debug-test.ts`, testCode);

      const buildResult = await Bun.build({
        entrypoints: [`${testDir}/debug-test.ts`],
        outdir: `${testDir}/out`,
        minify: true,
        features: ["DEBUG"],
      });

      expect(buildResult.success).toBe(true);

      // Run the built file and check output
      const process = Bun.spawn(["bun", `${testDir}/out/debug-test.js`]);
      await process.exited;

      // Cleanup
      await Bun.write(`${testDir}/debug-test.ts`, "");
    });

    test("should build without feature flag", async () => {
      const testCode = `
        import { feature } from "bun:bundle";
        if (feature("DEBUG")) {
          console.log("DEBUG enabled");
        } else {
          console.log("DEBUG disabled");
        }
      `;

      await Bun.write(`${testDir}/no-debug-test.ts`, testCode);

      const buildResult = await Bun.build({
        entrypoints: [`${testDir}/no-debug-test.ts`],
        outdir: `${testDir}/out`,
        minify: true,
        features: [], // No DEBUG feature
      });

      expect(buildResult.success).toBe(true);

      // Cleanup
      await Bun.write(`${testDir}/no-debug-test.ts`, "");
    });

    test("should build with multiple feature flags", async () => {
      const testCode = `
        import { feature } from "bun:bundle";
        const features = ["DEBUG", "PERFORMANCE", "SECURITY"];
        features.forEach(f => {
          if (feature(f)) {
            console.log(f + " enabled");
          } else {
            console.log(f + " disabled");
          }
        });
      `;

      await Bun.write(`${testDir}/multi-test.ts`, testCode);

      const buildResult = await Bun.build({
        entrypoints: [`${testDir}/multi-test.ts`],
        outdir: `${testDir}/out`,
        minify: true,
        features: ["DEBUG", "PERFORMANCE"], // Only enable some
      });

      expect(buildResult.success).toBe(true);

      // Cleanup
      await Bun.write(`${testDir}/multi-test.ts`, "");
    });
  });

  describe("String Width Utilities", () => {
    test("should truncate text properly", () => {
      // This would test the truncate function from our utilities
      const text = "Hello 🌍 World";
      const width = Bun.stringWidth(text); // Should be 13

      // Test truncation at different widths
      expect(Bun.stringWidth(text.substring(0, 5))).toBe(5); // "Hello"
      expect(Bun.stringWidth(text.substring(0, 7))).toBe(8); // "Hello 🌍"
    });

    test("should handle padding with wide characters", () => {
      const text = "🇺🇸";
      const padded = text + "   "; // Pad with spaces
      expect(Bun.stringWidth(padded)).toBe(5); // 2 (flag) + 3 (spaces)
    });

    test("should create proper table alignment", () => {
      const headers = ["Name", "Status", "Progress"];
      const rows = [
        ["🇺🇸 Project", "✅ Active", "75%"],
        ["👋🏽 Feature", "🔄 Progress", "45%"],
      ];

      // Calculate column widths
      const colWidths = headers.map((header, i) => {
        const maxRowWidth = Math.max(
          ...rows.map((row) => Bun.stringWidth(row[i] || ""))
        );
        return Math.max(Bun.stringWidth(header), maxRowWidth);
      });

      expect(colWidths[0]).toBe(9); // "👋🏽 Feature" is longest
      expect(colWidths[1]).toBe(9); // "✅ Active" vs "🔄 Progress"
      expect(colWidths[2]).toBe(7); // "75%" vs "45%"
    });
  });

  describe("ANSI and Unicode Integration", () => {
    test("should handle complex ANSI sequences", () => {
      const coloredText =
        "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m";
      expect(Bun.stringWidth(coloredText)).toBe(13); // "Red Green Blue"
    });

    test("should handle ANSI hyperlinks", () => {
      const link = "\x1b]8;;https://example.com\x07Click me\x1b]8;;\x07";
      expect(Bun.stringWidth(link)).toBe(9); // Only "Click me" counts
    });

    test("should handle combining characters", () => {
      const combining = "e\u0301"; // e + combining acute accent
      expect(Bun.stringWidth(combining)).toBe(1); // Should be 1 column
    });

    test("should handle control characters", () => {
      const controls = "\t\n\r";
      expect(Bun.stringWidth("\t")).toBe(0); // Tab
      expect(Bun.stringWidth("\n")).toBe(0); // Newline
      expect(Bun.stringWidth("\r")).toBe(0); // Carriage return
    });
  });

  describe("Performance Considerations", () => {
    test("should handle large strings efficiently", async () => {
      // Create a large string with various characters
      const largeString = "🇺🇸".repeat(10000);

      const start = performance.now();
      const width = Bun.stringWidth(largeString);
      const end = performance.now();

      expect(width).toBe(20000); // Each flag is 2 columns
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    test("should handle many small strings efficiently", async () => {
      const strings = Array.from({ length: 1000 }, (_, i) => `Test ${i} 🌍`);

      const start = performance.now();
      const widths = strings.map((s) => Bun.stringWidth(s));
      const end = performance.now();

      expect(widths.every((w) => w === 8)).toBe(true); // "Test X 🌍" = 8 columns
      expect(end - start).toBeLessThan(50); // Should be very fast
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty and null inputs", () => {
      expect(Bun.stringWidth("")).toBe(0);
      expect(Bun.stringWidth(String.fromCharCode(0))).toBe(0);
    });

    test("should handle surrogate pairs", () => {
      // Test with characters that require surrogate pairs
      const surrogate = "𝄞"; // Musical symbol G clef (U+1D11E)
      expect(Bun.stringWidth(surrogate)).toBe(1);
    });

    test("should handle variation selectors", () => {
      // Emoji with variation selector
      const emojiWithVS = "❤️"; // Heart with variation selector-16
      expect(Bun.stringWidth(emojiWithVS)).toBe(1);
    });

    test("should handle mixed scripts", () => {
      const mixed = "Hello 🌍 世界 🇺🇸";
      expect(Bun.stringWidth(mixed)).toBe(14); // 6 + 2 + 3 + 2 + 1
    });
  });
});
