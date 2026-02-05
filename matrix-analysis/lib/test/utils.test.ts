import { describe, it, expect } from "bun:test";

import {
  fib,
  fibCache,
  GRAPHEME_SEGMENTER,
  countGraphemes,
  isPrime,
  hash,
  getTypeTag,
  getProtoChain,
  countSpecialChars,
  countSegments,
  calcNestingDepth,
  calcEntropy,
  SEC_PATTERNS,
  factorial,
  digitSum,
  digitProduct,
  reverseNumber,
  generateUUIDv7WithTimestamp,
} from "../src/core/utils.ts";

describe("utils", () => {
  describe("BN-001: Memoized Fibonacci", () => {
    it("should return 0 for fib(0)", () => {
      expect(fib(0)).toBe(0);
    });

    it("should return 1 for fib(1)", () => {
      expect(fib(1)).toBe(1);
    });

    it("should compute known values", () => {
      expect(fib(10)).toBe(55);
      expect(fib(20)).toBe(6765);
    });

    it("should return 0 for negative input", () => {
      expect(fib(-1)).toBe(0);
      expect(fib(-100)).toBe(0);
    });

    it("should populate cache", () => {
      fib(15);
      expect(fibCache.has(15)).toBe(true);
      expect(fibCache.get(15)).toBe(610);
    });

    it("should return 0 for NaN", () => {
      expect(fib(NaN)).toBe(0);
    });

    it("should return 0 for Infinity", () => {
      expect(fib(Infinity)).toBe(0);
      expect(fib(-Infinity)).toBe(0);
    });

    it("should return Infinity for n > 1476", () => {
      expect(fib(1477)).toBe(Infinity);
      expect(fib(2000)).toBe(Infinity);
    });

    it("should floor non-integer inputs", () => {
      expect(fib(10.9)).toBe(55);
      expect(fib(1.5)).toBe(1);
    });
  });

  describe("BN-003: Grapheme Segmenter", () => {
    it("should be an Intl.Segmenter instance", () => {
      expect(GRAPHEME_SEGMENTER).toBeInstanceOf(Intl.Segmenter);
    });

    it("should count ASCII characters", () => {
      expect(countGraphemes("hello")).toBe(5);
    });

    it("should count emoji as single graphemes", () => {
      expect(countGraphemes("\u{1F600}")).toBe(1);
    });

    it("should count ZWJ sequences as single grapheme", () => {
      expect(countGraphemes("\u{1F468}\u200D\u{1F469}\u200D\u{1F467}")).toBe(1);
    });

    it("should return 0 for empty string", () => {
      expect(countGraphemes("")).toBe(0);
    });
  });

  describe("BN-004: isPrime", () => {
    it("should return false for numbers less than 2", () => {
      expect(isPrime(0)).toBe(false);
      expect(isPrime(1)).toBe(false);
      expect(isPrime(-5)).toBe(false);
    });

    it("should return true for known primes", () => {
      for (const p of [2, 3, 5, 7, 11, 13, 97]) {
        expect(isPrime(p)).toBe(true);
      }
    });

    it("should return false for composites", () => {
      for (const n of [4, 6, 8, 9, 15, 100]) {
        expect(isPrime(n)).toBe(false);
      }
    });
  });

  describe("BN-004: hash (CRC32)", () => {
    it("should return 8-char hex string", () => {
      const h = hash("hello");
      expect(h).toMatch(/^[0-9a-f]{8}$/);
    });

    it("should be deterministic", () => {
      expect(hash("test")).toBe(hash("test"));
    });

    it("should differ for different inputs", () => {
      expect(hash("a")).not.toBe(hash("b"));
    });
  });

  describe("BN-004: getTypeTag", () => {
    it("should return correct tags", () => {
      expect(getTypeTag({})).toBe("Object");
      expect(getTypeTag([])).toBe("Array");
      expect(getTypeTag("")).toBe("String");
      expect(getTypeTag(42)).toBe("Number");
      expect(getTypeTag(null)).toBe("Null");
      expect(getTypeTag(undefined)).toBe("Undefined");
      expect(getTypeTag(new Date())).toBe("Date");
      expect(getTypeTag(/x/)).toBe("RegExp");
    });
  });

  describe("BN-004: getProtoChain", () => {
    it("should return chain for plain object", () => {
      const chain = getProtoChain({});
      expect(chain).toContain("Object");
    });

    it("should return chain for array", () => {
      const chain = getProtoChain([]);
      expect(chain).toContain("Array");
    });

    it("should limit to 3 entries", () => {
      const chain = getProtoChain({});
      expect(chain.split("\u2192").length).toBeLessThanOrEqual(3);
    });
  });

  describe("BN-004: countSpecialChars", () => {
    it("should count special characters", () => {
      expect(countSpecialChars("a:b/c*d")).toBe(3);
    });

    it("should return 0 for plain text", () => {
      expect(countSpecialChars("hello")).toBe(0);
    });

    it("should count brackets and parens", () => {
      expect(countSpecialChars("(a)[b]{c}")).toBe(6);
    });
  });

  describe("BN-004: countSegments", () => {
    it("should count path segments", () => {
      expect(countSegments("a/b/c")).toBe(3);
    });

    it("should ignore leading/trailing slashes", () => {
      expect(countSegments("/a/b/c/")).toBe(3);
    });

    it("should return 0 for empty string", () => {
      expect(countSegments("")).toBe(0);
    });
  });

  describe("BN-004: calcNestingDepth", () => {
    it("should calculate nesting depth", () => {
      expect(calcNestingDepth("((()))")).toBe(3);
      expect(calcNestingDepth("([{x}])")).toBe(3);
    });

    it("should return 0 for no nesting", () => {
      expect(calcNestingDepth("hello")).toBe(0);
    });

    it("should handle mixed brackets", () => {
      expect(calcNestingDepth("(a)(b)")).toBe(1);
    });
  });

  describe("BN-004: calcEntropy", () => {
    it("should return 0 for empty string", () => {
      expect(calcEntropy("")).toBe(0);
    });

    it("should return 0 for single-char string", () => {
      expect(calcEntropy("aaaa")).toBe(0);
    });

    it("should be higher for diverse strings", () => {
      const low = calcEntropy("aaab");
      const high = calcEntropy("abcd");
      expect(high).toBeGreaterThan(low);
    });

    it("should return log2(n) for n unique chars", () => {
      expect(calcEntropy("ab")).toBeCloseTo(1.0, 5);
      expect(calcEntropy("abcd")).toBeCloseTo(2.0, 5);
    });
  });

  describe("BN-005: SEC_PATTERNS", () => {
    it("should detect path traversal", () => {
      expect(SEC_PATTERNS.pathTraversal.test("../../etc/passwd")).toBe(true);
      expect(SEC_PATTERNS.pathTraversal.test("safe/path")).toBe(false);
    });

    it("should detect SSRF patterns", () => {
      expect(SEC_PATTERNS.ssrf.test("http://localhost:8080")).toBe(true);
      expect(SEC_PATTERNS.ssrf.test("http://127.0.0.1")).toBe(true);
      expect(SEC_PATTERNS.ssrf.test("http://example.com")).toBe(false);
    });

    it("should detect XSS patterns", () => {
      expect(SEC_PATTERNS.xss.test("<script>")).toBe(true);
      expect(SEC_PATTERNS.xss.test("javascript:alert(1)")).toBe(true);
      expect(SEC_PATTERNS.xss.test("normal text")).toBe(false);
    });

    it("should detect SQL injection patterns", () => {
      expect(SEC_PATTERNS.sql.test("' OR 1=1--")).toBe(true);
      expect(SEC_PATTERNS.sql.test("UNION SELECT")).toBe(true);
      expect(SEC_PATTERNS.sql.test("normal query")).toBe(false);
    });

    it("should detect command injection", () => {
      expect(SEC_PATTERNS.cmdInjection.test("cmd; rm -rf")).toBe(true);
      expect(SEC_PATTERNS.cmdInjection.test("$(whoami)")).toBe(true);
      expect(SEC_PATTERNS.cmdInjection.test("safe input")).toBe(false);
    });

    it("should detect credential patterns", () => {
      expect(SEC_PATTERNS.credential.test(":password")).toBe(true);
      expect(SEC_PATTERNS.credential.test(":api_key")).toBe(true);
      expect(SEC_PATTERNS.credential.test(":username")).toBe(false);
    });

    it("should detect basic auth in URLs", () => {
      expect(SEC_PATTERNS.basicAuth.test("http://user:pass@host")).toBe(true);
      expect(SEC_PATTERNS.basicAuth.test("http://host/path")).toBe(false);
    });

    it("should have all 11 patterns", () => {
      expect(Object.keys(SEC_PATTERNS).length).toBe(11);
    });
  });

  describe("Additional: factorial", () => {
    it("should compute known factorials", () => {
      expect(factorial(0)).toBe(1);
      expect(factorial(1)).toBe(1);
      expect(factorial(5)).toBe(120);
      expect(factorial(10)).toBe(3628800);
    });

    it("should return 0 for negative input", () => {
      expect(factorial(-1)).toBe(0);
    });
  });

  describe("Additional: digitSum", () => {
    it("should sum digits", () => {
      expect(digitSum(123)).toBe(6);
      expect(digitSum(999)).toBe(27);
    });

    it("should handle negative numbers", () => {
      expect(digitSum(-123)).toBe(6);
    });

    it("should return 0 for 0", () => {
      expect(digitSum(0)).toBe(0);
    });
  });

  describe("Additional: digitProduct", () => {
    it("should multiply digits", () => {
      expect(digitProduct(123)).toBe(6);
      expect(digitProduct(234)).toBe(24);
    });

    it("should return 0 for 0", () => {
      expect(digitProduct(0)).toBe(0);
    });

    it("should handle negative numbers", () => {
      expect(digitProduct(-23)).toBe(6);
    });
  });

  describe("Additional: reverseNumber", () => {
    it("should reverse digits", () => {
      expect(reverseNumber(123)).toBe(321);
      expect(reverseNumber(1000)).toBe(1);
    });

    it("should preserve sign", () => {
      expect(reverseNumber(-456)).toBe(-654);
    });
  });

  describe("Additional: generateUUIDv7WithTimestamp", () => {
    it("should return uuid and timestamp", () => {
      const result = generateUUIDv7WithTimestamp();
      expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it("should generate unique UUIDs", () => {
      const a = generateUUIDv7WithTimestamp();
      const b = generateUUIDv7WithTimestamp();
      expect(a.uuid).not.toBe(b.uuid);
    });
  });
});
