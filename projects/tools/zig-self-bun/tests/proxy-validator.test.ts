// tests/proxy-validator.test.ts
//! Tests for proxy header validation

import { test, expect } from "bun:test";
import { validateProxyHeader, ProxyHeaderError, calculateChecksum } from "../src/proxy/validator";
import { HEADERS } from "../src/proxy/headers";

test("validates configVersion successfully", () => {
  const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "1");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(1);
  }
});

test("rejects invalid configVersion format", () => {
  const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "1.5");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_FORMAT");
  }
});

test("rejects out-of-range configVersion", () => {
  const result = validateProxyHeader(HEADERS.CONFIG_VERSION, "256");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("OUT_OF_RANGE");
  }
});

test("validates registryHash successfully", () => {
  const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "0x3b8b5a5a");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(0x3b8b5a5a);
  }
});

test("rejects invalid registryHash format", () => {
  const result = validateProxyHeader(HEADERS.REGISTRY_HASH, "3b8b5a5a");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_FORMAT");
  }
});

test("validates featureFlags successfully", () => {
  const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0x00000007");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(0x00000007);
  }
});

test("rejects featureFlags with reserved bits", () => {
  // Bit 11 set (0x00000800)
  const result = validateProxyHeader(HEADERS.FEATURE_FLAGS, "0x00000800");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_FLAGS");
  }
});

test("validates terminalMode successfully", () => {
  const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "2");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(2);
  }
});

test("rejects invalid terminalMode", () => {
  const result = validateProxyHeader(HEADERS.TERMINAL_MODE, "4");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_FORMAT");
  }
});

test("validates terminalRows successfully", () => {
  const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "24");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(24);
  }
});

test("rejects out-of-range terminalRows", () => {
  const result = validateProxyHeader(HEADERS.TERMINAL_ROWS, "256");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("OUT_OF_RANGE");
  }
});

test("validates terminalCols successfully", () => {
  const result = validateProxyHeader(HEADERS.TERMINAL_COLS, "80");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(80);
  }
});

test("validates configDump successfully", () => {
  // Create valid dump: version=1, hash=0x3b8b5a5a, flags=0x00000007, mode=2, rows=24, cols=80, checksum
  const bytes = new Uint8Array(13);
  bytes[0] = 1; // version
  bytes[1] = 0x3b; bytes[2] = 0x8b; bytes[3] = 0x5a; bytes[4] = 0x5a; // hash
  bytes[5] = 0x00; bytes[6] = 0x00; bytes[7] = 0x00; bytes[8] = 0x07; // flags
  bytes[9] = 2; // terminal mode
  bytes[10] = 24; // rows
  bytes[11] = 80; // cols
  bytes[12] = calculateChecksum(bytes.slice(0, 12)); // checksum
  
  const dump = "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBeInstanceOf(Uint8Array);
  }
});

test("rejects configDump with invalid checksum", () => {
  const dump = "0x01a1b2c3d40000000702185001"; // Last byte wrong
  const result = validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("CHECKSUM_MISMATCH");
  }
});

test("validates domain successfully", () => {
  const result = validateProxyHeader("X-Bun-Domain", "@domain1");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe("@domain1");
  }
});

test("rejects unknown domain", () => {
  const result = validateProxyHeader("X-Bun-Domain", "@domain3");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("UNKNOWN_DOMAIN");
  }
});

test("validates domainHash successfully", () => {
  const result = validateProxyHeader("X-Bun-Domain-Hash", "0xa1b2c3d4");
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.parsed).toBe(0xa1b2c3d4);
  }
});

test("rejects invalid domainHash format", () => {
  const result = validateProxyHeader("X-Bun-Domain-Hash", "a1b2c3d4");
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.error.code).toBe("INVALID_FORMAT");
  }
});

test("calculateChecksum works correctly", () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const checksum = calculateChecksum(bytes);
  expect(checksum).toBe(1 ^ 2 ^ 3 ^ 4 ^ 5 ^ 6 ^ 7 ^ 8 ^ 9 ^ 10 ^ 11 ^ 12);
});

