/**
 * HTTP Proxy Header Validator Tests
 *
 * Comprehensive tests for proxy header validation:
 * - Format validation (regex patterns)
 * - Range validation (numeric bounds)
 * - Checksum validation (XOR verification)
 * - DNS cache integration
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  validateProxyHeader,
  validateProxyHeaders,
  validateRequiredHeaders,
  calculateChecksum,
  ProxyHeaderError,
  validationMetrics,
  type ValidationResult,
} from "../src/proxy/validator.js";
import { HEADERS } from "../src/proxy/headers.js";

// Reset metrics before each test
beforeEach(() => {
  validationMetrics.resetStats();
});

describe("validateProxyHeader", () => {
  describe("X-Bun-Config-Version", () => {
    test("accepts valid config version 1", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "1");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(1);
      }
    });

    test("accepts valid config version 0 (legacy)", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "0");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0);
      }
    });

    test("accepts max config version 255", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "255");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(255);
      }
    });

    test("rejects non-numeric format", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "1.5");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
        expect(result.error.header).toBe(HEADERS.CONFIG_VERSION);
      }
    });

    test("rejects hex format", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "0x01");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects out of range (>255)", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "256");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("OUT_OF_RANGE");
      }
    });

    test("rejects negative", () => {
      const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "-1");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Registry-Hash", () => {
    test("accepts valid registry hash", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0xa1b2c3d4");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0xa1b2c3d4);
      }
    });

    test("accepts zero hash", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0x00000000");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0x00000000);
      }
    });

    test("accepts max hash", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0xFFFFFFFF");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0xFFFFFFFF);
      }
    });

    test("rejects missing 0x prefix", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "a1b2c3d4");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects insufficient hex digits", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0xa1b2c3");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects too many hex digits", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0xa1b2c3d4e5");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects invalid hex characters", () => {
      const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0xg1b2c3d4");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Feature-Flags", () => {
    test("accepts valid feature flags", () => {
      const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0x00000007");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0x00000007);
      }
    });

    test("accepts feature flags with bits set", () => {
      const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0x000007FF");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0x000007FF);
      }
    });

    test("rejects reserved bits set (bit 11)", () => {
      const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0x00000800");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("RESERVED_BITS_SET");
      }
    });

    test("rejects reserved bits set (bits 11-31)", () => {
      const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0xFFFFF800");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("RESERVED_BITS_SET");
      }
    });

    test("rejects missing 0x prefix", () => {
      const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "00000007");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Terminal-Mode", () => {
    test("accepts mode 0 (disabled)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "0");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0);
      }
    });

    test("accepts mode 1 (cooked)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "1");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(1);
      }
    });

    test("accepts mode 2 (raw)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "2");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(2);
      }
    });

    test("accepts mode 3 (pipe)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "3");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(3);
      }
    });

    test("rejects mode 4", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "4");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects negative", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "-1");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Terminal-Rows", () => {
    test("accepts valid rows (24)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "24");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(24);
      }
    });

    test("accepts min rows (1)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "1");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(1);
      }
    });

    test("accepts max rows (255)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "255");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(255);
      }
    });

    test("rejects zero rows", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "0");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("OUT_OF_RANGE");
      }
    });

    test("rejects too many rows (>255)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "256");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("OUT_OF_RANGE");
      }
    });
  });

  describe("X-Bun-Terminal-Cols", () => {
    test("accepts valid cols (80)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "80");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(80);
      }
    });

    test("accepts min cols (1)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "1");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(1);
      }
    });

    test("accepts max cols (255)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "255");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(255);
      }
    });

    test("rejects zero cols", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "0");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("OUT_OF_RANGE");
      }
    });

    test("rejects too many cols (>255)", () => {
      const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "256");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("OUT_OF_RANGE");
      }
    });
  });

  describe("X-Bun-Config-Dump", () => {
    test("accepts valid config dump with correct checksum", () => {
      // Valid 13-byte dump: 01 a1b2c3d4 00000207 02 18 50 4a
      // Checksum (byte 12): 0x4a = XOR of bytes 0-11
      const dump = "0x01a1b2c3d4000002070218504a";
      const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBeInstanceOf(Uint8Array);
        expect(result.parsed.length).toBe(13);
      }
    });

    test("rejects invalid checksum", () => {
      // Same dump but with wrong checksum (last byte 0x00 instead of 0x4a)
      const dump = "0x01a1b2c3d40000020702185000";
      const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("CHECKSUM_MISMATCH");
      }
    });

    test("rejects incorrect length (too short)", () => {
      const dump = "0x01a1b2c3d4";
      const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects incorrect length (too long)", () => {
      const dump = "0x01a1b2c3d4000000070218500000";
      const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects missing 0x prefix", () => {
      const dump = "01a1b2c3d40000000702185000";
      const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Proxy-Token", () => {
    test("accepts valid JWT format", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const result = validateProxyHeader(HEADERS.PROXY_TOKEN, token);
      expect(result.valid).toBe(true);
    });

    test("rejects token with too few parts", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";
      const result = validateProxyHeader(HEADERS.PROXY_TOKEN, token);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects token with too many parts", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c.extra";
      const result = validateProxyHeader(HEADERS.PROXY_TOKEN, token);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects token with invalid base64url characters", () => {
      const token = "eyJhbGci+iJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const result = validateProxyHeader(HEADERS.PROXY_TOKEN, token);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("X-Bun-Domain", () => {
    test("accepts @domain1", () => {
      const result = validateProxyHeader("X-Bun-Domain", "@domain1");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe("@domain1");
      }
    });

    test("accepts @domain2", () => {
      const result = validateProxyHeader("X-Bun-Domain", "@domain2");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe("@domain2");
      }
    });

    test("rejects unknown domain", () => {
      const result = validateProxyHeader("X-Bun-Domain", "@domain3");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("UNKNOWN_DOMAIN");
      }
    });
  });

  describe("X-Bun-Domain-Hash", () => {
    test("accepts valid domain hash", () => {
      const result = validateProxyHeader("X-Bun-Domain-Hash", "0xb1c3d4c5");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsed).toBe(0xb1c3d4c5);
      }
    });

    test("rejects missing 0x prefix", () => {
      const result = validateProxyHeader("X-Bun-Domain-Hash", "b1c3d4c5");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });

    test("rejects insufficient hex digits", () => {
      const result = validateProxyHeader("X-Bun-Domain-Hash", "0xb1c3d4");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("Unknown Headers", () => {
    test("ignores non-X-Bun headers", () => {
      const result = validateProxyHeader("Content-Type", "application/json");
      expect(result.valid).toBe(true);
    });

    test("rejects unknown X-Bun headers", () => {
      const result = validateProxyHeader("X-Bun-Unknown-Header", "value");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("UNKNOWN_HEADER");
      }
    });
  });
});

describe("validateProxyHeaders (bulk validation)", () => {
  test("validates all headers in request", () => {
    const headers = new Headers({
      "X-Bun-Config-Version": "1",
      "X-Bun-Registry-Hash": "0xa1b2c3d4",
      "X-Bun-Feature-Flags": "0x00000007",
      "X-Bun-Terminal-Mode": "2",
      "X-Bun-Terminal-Rows": "24",
      "X-Bun-Terminal-Cols": "80",
      "X-Bun-Proxy-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    });

    const result = validateProxyHeaders(headers);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("detects missing required headers", () => {
    const headers = new Headers({
      "X-Bun-Config-Version": "1",
      // Missing: X-Bun-Registry-Hash, X-Bun-Feature-Flags, X-Bun-Proxy-Token
    });

    const result = validateProxyHeaders(headers);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const missingErrors = result.errors.filter((e) => e.code === "MISSING_HEADER");
    expect(missingErrors.length).toBeGreaterThanOrEqual(3);
  });

  test("detects invalid header format", () => {
    const headers = new Headers({
      "X-Bun-Config-Version": "1.5", // Invalid: must be integer
      "X-Bun-Registry-Hash": "0xa1b2c3d4",
      "X-Bun-Feature-Flags": "0x00000007",
      "X-Bun-Proxy-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    });

    const result = validateProxyHeaders(headers);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const formatError = result.errors.find((e) => e.code === "INVALID_FORMAT");
    expect(formatError).toBeDefined();
  });

  test("detects out of range values", () => {
    const headers = new Headers({
      "X-Bun-Config-Version": "256", // Invalid: > 255
      "X-Bun-Registry-Hash": "0xa1b2c3d4",
      "X-Bun-Feature-Flags": "0x00000007",
      "X-Bun-Proxy-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    });

    const result = validateProxyHeaders(headers);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const rangeError = result.errors.find((e) => e.code === "OUT_OF_RANGE");
    expect(rangeError).toBeDefined();
  });
});

describe("calculateChecksum", () => {
  test("calculates XOR checksum for 12 bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const checksum = calculateChecksum(bytes);

    // XOR of 1-12 = 1 ^ 2 ^ 3 ^ ... ^ 12
    // Let's verify: 1 ^ 2 = 3, 3 ^ 3 = 0, 0 ^ 4 = 4, 4 ^ 5 = 1, 1 ^ 6 = 7, 7 ^ 7 = 0, 0 ^ 8 = 8, 8 ^ 9 = 1, 1 ^ 10 = 11, 11 ^ 11 = 0, 0 ^ 12 = 12
    expect(checksum).toBe(12);
  });

  test("calculates checksum for config dump", () => {
    // Config dump: 01 a1b2c3d4 00000007 02 18 50
    // Bytes: [0x01, 0xa1, 0xb2, 0xc3, 0xd4, 0x00, 0x00, 0x00, 0x07, 0x02, 0x18, 0x50]
    // Let's manually verify: 1 ^ a1 = a0, a0 ^ b2 = 12, 12 ^ c3 = d1, d1 ^ d4 = 05, ...
    const bytes = new Uint8Array([0x01, 0xa1, 0xb2, 0xc3, 0xd4, 0x00, 0x00, 0x00, 0x07, 0x02, 0x18, 0x50]);
    const checksum = calculateChecksum(bytes);

    // Verify the XOR calculation
    // 0x01 ^ 0xa1 = 0xa0
    // 0xa0 ^ 0xb2 = 0x12
    // 0x12 ^ 0xc3 = 0xd1
    // 0xd1 ^ 0xd4 = 0x05
    // 0x05 ^ 0x00 = 0x05
    // 0x05 ^ 0x00 = 0x05
    // 0x05 ^ 0x00 = 0x05
    // 0x05 ^ 0x07 = 0x02
    // 0x02 ^ 0x02 = 0x00
    // 0x00 ^ 0x18 = 0x18
    // 0x18 ^ 0x50 = 0x48 (72 decimal)
    expect(checksum).toBe(0x48); // Should be 0x48, not 0x00
  });

  test("returns 0 for all zeros", () => {
    const bytes = new Uint8Array(12).fill(0);
    const checksum = calculateChecksum(bytes);
    expect(checksum).toBe(0);
  });
});

describe("ValidationMetrics", () => {
  test("tracks validation statistics", () => {
    // Record some validations
    validationMetrics.record({ valid: true, parsed: 1 }, 50);
    validationMetrics.record({ valid: false, error: new ProxyHeaderError("INVALID_FORMAT", "test", "val", "msg") }, 100);
    validationMetrics.record({ valid: true, parsed: 2 }, 75);

    const stats = validationMetrics.getStats();
    expect(stats.totalValidations).toBe(3);
    expect(stats.totalErrors).toBe(1);
    expect(stats.avgTimeNs).toBeCloseTo((50 + 100 + 75) / 3);
  });

  test("calculates error rate", () => {
    validationMetrics.resetStats();

    // 10 validations, 3 errors
    for (let i = 0; i < 7; i++) {
      validationMetrics.record({ valid: true, parsed: i }, 50);
    }
    for (let i = 0; i < 3; i++) {
      validationMetrics.record(
        { valid: false, error: new ProxyHeaderError("INVALID_FORMAT", "test", "val", "msg") },
        50
      );
    }

    const stats = validationMetrics.getStats();
    expect(stats.totalValidations).toBe(10);
    expect(stats.totalErrors).toBe(3);
    expect(stats.errorRate).toBeCloseTo(0.3);
  });
});
