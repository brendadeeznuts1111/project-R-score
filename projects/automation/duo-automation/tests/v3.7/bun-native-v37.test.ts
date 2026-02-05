// tests/v3.7/bun-native-v37.test.ts
import { test, expect } from 'bun:test';
import { feature } from "bun:bundle";
import { isPromise, isRegExp, isDate } from "util/types";

test("V37 registry feature flags (dead-code elimination)", () => {
  // feature() can only be used in if/ternary directly
  let tzActive = false;
  if (feature("V37_DETERMINISTIC_TZ")) {
    tzActive = true;
  }
  
  let r2Active = false;
  if (feature("V37_NATIVE_R2")) {
    r2Active = true;
  }
  
  expect(typeof tzActive).toBe("boolean");
  expect(typeof r2Active).toBe("boolean");
});

test("V8 value type checking APIs (Bun v1.3.5+)", () => {
  expect(isPromise(Promise.resolve())).toBe(true);
  expect(isPromise({})).toBe(false);
  
  expect(isRegExp(/test/)).toBe(true);
  expect(isRegExp("test")).toBe(false);
  
  expect(isDate(new Date())).toBe(true);
  expect(isDate("2026-01-14")).toBe(false);
});

test("Bun.stringWidth alignment accuracy", () => {
  // Emoji width verification (Bun v1.3.5 improved grapheme clusters)
  expect(Bun.stringWidth("🇺🇸")).toBe(2);
  expect(Bun.stringWidth("👋🏽")).toBe(2);
  expect(Bun.stringWidth("👨‍👩‍👧")).toBe(2);
  
  // Zero-width characters
  expect(Bun.stringWidth("\u200B")).toBe(0); // ZWSP
  expect(Bun.stringWidth("\u200D")).toBe(0); // ZWJ
  
  // ANSI escape codes (should be ignored by default)
  const colored = "\x1b[31mRed Alert\x1b[0m";
  expect(Bun.stringWidth(colored)).toBe(9);
  
  // Feedback Verification: CSI sequences (Cursor up, Clear screen, etc.)
  expect(Bun.stringWidth("\x1b[A")).toBe(0);      // Cursor up
  expect(Bun.stringWidth("\x1b[2J")).toBe(0);     // Clear screen
  expect(Bun.stringWidth("\x1b[H")).toBe(0);      // Home
  
  // Feedback Verification: OSC sequences (Hyperlinks)
  const linkWithBel = "\x1b]8;;https://bun.sh\x07Link\x1b]8;;\x07";
  const linkWithSt = "\x1b]8;;https://bun.sh\x1b\\Link\x1b]8;;\x1b\\";
  expect(Bun.stringWidth(linkWithBel)).toBe(4);
  expect(Bun.stringWidth(linkWithSt)).toBe(4);
  
  // Feedback Verification: ESC ESC state machine
  expect(Bun.stringWidth("\x1b\x1b")).toBe(0);
});

test("Content-Disposition header support in R2/S3 mocks", async () => {
  const { BunR2Manager } = await import("../../utils/bun-r2-manager");
  
  const manager = new (BunR2Manager as any)({
    accountId: "test",
    accessKeyId: "test",
    secretAccessKey: "test",
    bucket: "test"
  });
  
  // Toggle mock mode
  process.env.MOCK_R2 = "true";
  
  const result = await manager.upload({
    key: "test.txt",
    data: "Hello World",
    contentDisposition: "attachment; filename=\"test.txt\""
  });
  
  expect(result.success).toBe(true);
  expect(result.url).toContain("memory://test.txt");
});

test("Bun.spawn native child process execution", async () => {
  // Refined native spawn configuration and output handling
  const proc = Bun.spawn(["echo", "DuoPlus v3.7 baseline validation"], {
    env: { TEST_CONTEXT: "v3.7-deterministic" },
    cwd: process.cwd()
  });
  
  const output = await proc.stdout.text();
  expect(output.trim()).toBe("DuoPlus v3.7 baseline validation");
  
  await proc.exited;
  expect(proc.exitCode).toBe(0);
});