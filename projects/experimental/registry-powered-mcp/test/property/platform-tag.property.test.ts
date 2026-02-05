/**
 * Property-based tests for PlatformTag using fast-check
 *
 * These tests verify invariants that should hold for ALL valid inputs,
 * not just specific examples. fast-check generates hundreds of random
 * test cases to find edge cases.
 */

import { describe, it, expect } from "bun:test";
import * as fc from "fast-check";
import {
  PlatformTag,
  VALID_OS,
  VALID_ARCH,
  VALID_ABI,
  type ValidOS,
  type ValidArch,
  type ValidABI,
} from "../../packages/core/src/platform/platform-tag";

describe("PlatformTag Property Tests", () => {
  describe("valid combinations", () => {
    it("accepts all valid OS + arch combinations", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          (os, arch) => {
            const tag = `${os}-${arch}`;
            expect(() => PlatformTag.parse(tag)).not.toThrow();

            const parsed = PlatformTag.parse(tag);
            expect(parsed.os).toBe(os);
            expect(parsed.arch).toBe(arch);
            expect(parsed.abi).toBeUndefined();
            expect(parsed.raw).toBe(tag);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("accepts all valid OS + arch + ABI combinations", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.constantFrom(...VALID_ABI),
          (os, arch, abi) => {
            const tag = `${os}-${arch}-${abi}`;
            expect(() => PlatformTag.parse(tag)).not.toThrow();

            const parsed = PlatformTag.parse(tag);
            expect(parsed.os).toBe(os);
            expect(parsed.arch).toBe(arch);
            expect(parsed.abi).toBe(abi);
            expect(parsed.raw).toBe(tag);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("accepts optional ABI", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.option(fc.constantFrom(...VALID_ABI), { nil: undefined }),
          (os, arch, abi) => {
            const tag = abi ? `${os}-${arch}-${abi}` : `${os}-${arch}`;
            expect(() => PlatformTag.parse(tag)).not.toThrow();
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe("invalid combinations", () => {
    it("rejects invalid OS", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !VALID_OS.includes(s as ValidOS) && s.length > 0 && !s.includes("-")),
          fc.constantFrom(...VALID_ARCH),
          (invalidOS, arch) => {
            const tag = `${invalidOS}-${arch}`;
            expect(() => PlatformTag.parse(tag)).toThrow();
            expect(PlatformTag.isValid(tag)).toBe(false);
            expect(PlatformTag.safeParse(tag)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("rejects invalid arch", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.string().filter((s) => !VALID_ARCH.includes(s as ValidArch) && s.length > 0 && !s.includes("-")),
          (os, invalidArch) => {
            const tag = `${os}-${invalidArch}`;
            expect(() => PlatformTag.parse(tag)).toThrow();
            expect(PlatformTag.isValid(tag)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("rejects invalid ABI when provided", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.string().filter((s) => !VALID_ABI.includes(s as ValidABI) && s.length > 0 && !s.includes("-")),
          (os, arch, invalidABI) => {
            const tag = `${os}-${arch}-${invalidABI}`;
            expect(() => PlatformTag.parse(tag)).toThrow();
            expect(PlatformTag.isValid(tag)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("rejects tags with wrong number of parts", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }).filter((s) => !s.includes("-")), { minLength: 1, maxLength: 1 }),
          (parts) => {
            const tag = parts.join("-");
            expect(() => PlatformTag.parse(tag)).toThrow();
          }
        ),
        { numRuns: 50 }
      );

      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }).filter((s) => !s.includes("-")), { minLength: 4, maxLength: 6 }),
          (parts) => {
            const tag = parts.join("-");
            expect(() => PlatformTag.parse(tag)).toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("roundtrip properties", () => {
    it("create + parse roundtrips correctly", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.option(fc.constantFrom(...VALID_ABI), { nil: undefined }),
          (os, arch, abi) => {
            const tag = PlatformTag.create(os, arch, abi);
            const parsed = PlatformTag.parse(tag);

            expect(parsed.os).toBe(os);
            expect(parsed.arch).toBe(arch);
            expect(parsed.abi).toBe(abi);
            expect(parsed.raw).toBe(tag);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("parsed.raw equals original input", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.option(fc.constantFrom(...VALID_ABI), { nil: undefined }),
          (os, arch, abi) => {
            const original = abi ? `${os}-${arch}-${abi}` : `${os}-${arch}`;
            const parsed = PlatformTag.parse(original);
            expect(parsed.raw).toBe(original);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("isValid and safeParse consistency", () => {
    it("isValid returns true iff safeParse returns non-null", () => {
      fc.assert(
        fc.property(fc.string(), (tag) => {
          const isValid = PlatformTag.isValid(tag);
          const safeParsed = PlatformTag.safeParse(tag);

          if (isValid) {
            expect(safeParsed).not.toBeNull();
          } else {
            expect(safeParsed).toBeNull();
          }
        }),
        { numRuns: 500 }
      );
    });

    it("parse throws iff isValid returns false", () => {
      fc.assert(
        fc.property(fc.string(), (tag) => {
          const isValid = PlatformTag.isValid(tag);

          if (isValid) {
            expect(() => PlatformTag.parse(tag)).not.toThrow();
          } else {
            expect(() => PlatformTag.parse(tag)).toThrow();
          }
        }),
        { numRuns: 500 }
      );
    });
  });

  describe("allCombinations coverage", () => {
    it("allCombinations contains all valid tags", () => {
      const all = new Set(PlatformTag.allCombinations());

      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OS),
          fc.constantFrom(...VALID_ARCH),
          fc.option(fc.constantFrom(...VALID_ABI), { nil: undefined }),
          (os, arch, abi) => {
            const tag = abi ? `${os}-${arch}-${abi}` : `${os}-${arch}`;
            expect(all.has(tag)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("all items in allCombinations are valid", () => {
      const all = PlatformTag.allCombinations();

      for (const tag of all) {
        expect(PlatformTag.isValid(tag)).toBe(true);
      }
    });

    it("allCombinations has expected count", () => {
      const all = PlatformTag.allCombinations();
      // 3 OS * 2 arch = 6 without ABI
      // 3 OS * 2 arch * 3 ABI = 18 with ABI
      // Total = 24
      expect(all.length).toBe(24);
    });
  });
});
