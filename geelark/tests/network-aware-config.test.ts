/**
 * Network-Aware 13-Byte Configuration Stack Tests
 *
 * Tests for:
 * - HTTP header injection/extraction
 * - WebSocket binary protocol
 * - Proxy routing and validation
 * - Config state serialization
 * - Performance benchmarks
 *
 * Run: bun test tests/network-aware-config.test.ts
 */

import { describe, test, expect, bench } from "bun:test";
import {
  HEADERS,
  serializeConfig,
  deserializeConfig,
  configToHex,
  hexToConfig,
  injectConfigHeaders,
  extractConfigFromHeaders,
  validateConfig,
  issueProxyToken,
  verifyProxyToken,
  calculateChecksum,
  type ConfigState,
} from "../src/proxy/headers.js";
import {
  SUBPROTOCOL,
  WS_MSG,
  FIELD_OFFSET,
  encodeConfigUpdate,
  decodeConfigUpdate,
  encodeTerminalResize,
  decodeTerminalResize,
  encodeFeatureToggle,
  decodeFeatureToggle,
  encodeBulkUpdate,
  decodeBulkUpdate,
  encodeHeartbeat,
  decodeHeartbeat,
  encodeAck,
  decodeAck,
  encodeError,
  validateFrame,
  getMessageType,
} from "../src/websocket/subprotocol.js";

describe("Config State Serialization", () => {
  const testConfig: ConfigState = {
    version: 1,
    registryHash: 0xa1b2c3d4,
    featureFlags: 0x00000007,
    terminalMode: 2,
    rows: 24,
    cols: 80,
    reserved: 0,
  };

  test("serialize config to 13 bytes", () => {
    const bytes = serializeConfig(testConfig);
    expect(bytes.length).toBe(13);

    expect(bytes[0]).toBe(1); // version
    expect(bytes[1]).toBe(0xd4); // registryHash (little-endian)
    expect(bytes[2]).toBe(0xc3);
    expect(bytes[3]).toBe(0xb2);
    expect(bytes[4]).toBe(0xa1);
  });

  test("deserialize 13 bytes to config", () => {
    const bytes = serializeConfig(testConfig);
    const config = deserializeConfig(bytes);

    expect(config.version).toBe(1);
    expect(config.registryHash).toBe(0xa1b2c3d4);
    expect(config.featureFlags).toBe(0x00000007);
    expect(config.terminalMode).toBe(2);
    expect(config.rows).toBe(24);
    expect(config.cols).toBe(80);
  });

  test("round-trip serialization", () => {
    const bytes = serializeConfig(testConfig);
    const restored = deserializeConfig(bytes);

    expect(restored).toEqual(testConfig);
  });

  test("hex encoding/decoding", () => {
    const hex = configToHex(testConfig);
    expect(hex).toMatch(/^0x[0-9a-f]{26}$/);

    const restored = hexToConfig(hex);
    expect(restored).toEqual(testConfig);
  });

  test("reject invalid config length", () => {
    const invalidBytes = new Uint8Array(12);
    expect(() => deserializeConfig(invalidBytes)).toThrow("Invalid config length");
  });

  test("reject invalid hex length", () => {
    expect(() => hexToConfig("0x1234")).toThrow("Invalid hex length");
  });
});

describe("HTTP Header Injection", () => {
  test("inject config headers into RequestInit", () => {
    const init: RequestInit = {
      method: "POST",
      body: "{}",
    };

    const enhanced = injectConfigHeaders(init);
    const headers = new Headers(enhanced.headers);

    expect(headers.get(HEADERS.CONFIG_VERSION)).toBe("1");
    expect(headers.get(HEADERS.REGISTRY_HASH)).toBe("0xa1b2c3d4");
    expect(headers.get(HEADERS.FEATURE_FLAGS)).toBe("0x00000007");
    expect(headers.get(HEADERS.TERMINAL_MODE)).toBe("2");
    expect(headers.get(HEADERS.TERMINAL_ROWS)).toBe("24");
    expect(headers.get(HEADERS.TERMINAL_COLS)).toBe("80");
    expect(headers.get(HEADERS.CONFIG_DUMP)).toBeTruthy();
    expect(headers.get(HEADERS.REQUEST_ID)).toBeTruthy();
  });

  test("extract config from headers", () => {
    const headers = new Headers({
      "X-Bun-Config-Version": "1",
      "X-Bun-Registry-Hash": "0xa1b2c3d4",
      "X-Bun-Feature-Flags": "0x00000007",
      "X-Bun-Terminal-Mode": "2",
      "X-Bun-Terminal-Rows": "24",
      "X-Bun-Terminal-Cols": "80",
    });

    const config = extractConfigFromHeaders(headers);

    expect(config.version).toBe(1);
    expect(config.registryHash).toBe(0xa1b2c3d4);
    expect(config.featureFlags).toBe(0x00000007);
    expect(config.terminalMode).toBe(2);
    expect(config.rows).toBe(24);
    expect(config.cols).toBe(80);
  });

  test("extract from full dump header", () => {
    const config = {
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    const hex = configToHex(config);
    const headers = new Headers({
      "X-Bun-Config-Dump": hex,
    });

    const extracted = extractConfigFromHeaders(headers);
    expect(extracted).toEqual(config);
  });
});

describe("Proxy Token Validation", () => {
  test("issue and verify proxy token", () => {
    const domain = "@mycompany";
    const token = issueProxyToken(domain);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const isValid = verifyProxyToken(token, 0xa1b2c3d4);
    expect(isValid).toBe(true);
  });

  test("reject invalid token format", () => {
    const isValid = verifyProxyToken("invalid", 0xa1b2c3d4);
    expect(isValid).toBe(false);
  });

  test("reject token with wrong hash", () => {
    const token = issueProxyToken("@mycompany");
    const isValid = verifyProxyToken(token, 0x00000000);
    expect(isValid).toBe(false);
  });
});

describe("Config Validation", () => {
  test("validate matching config", () => {
    const config: ConfigState = {
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    const isValid = validateConfig(config, { version: 1 });
    expect(isValid).toBe(true);
  });

  test("reject mismatched config", () => {
    const config: ConfigState = {
      version: 0,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    const isValid = validateConfig(config, { version: 1 });
    expect(isValid).toBe(false);
  });
});

describe("Binary Protocol - Config Update", () => {
  test("encode config update frame", () => {
    const frame = encodeConfigUpdate("terminalMode", 2);

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.CONFIG_UPDATE);

    // Offset should be 9 (terminalMode)
    const view = new DataView(frame.buffer);
    expect(view.getUint32(1, true)).toBe(9);

    // Value should be 2
    expect(Number(view.getBigUint64(5, true))).toBe(2);
  });

  test("decode config update frame", () => {
    const frame = encodeConfigUpdate("terminalMode", 2);
    const decoded = decodeConfigUpdate(frame);

    expect(decoded.field).toBe("terminalMode");
    expect(decoded.value).toBe(2);
  });

  test("round-trip config update", () => {
    const tests = [
      { field: "version", value: 1 },
      { field: "registryHash", value: 0xa1b2c3d4 },
      { field: "featureFlags", value: 0x00000007 },
      { field: "terminalMode", value: 2 },
      { field: "rows", value: 24 },
      { field: "cols", value: 80 },
    ];

    for (const { field, value } of tests) {
      const frame = encodeConfigUpdate(field, value);
      const decoded = decodeConfigUpdate(frame);
      expect(decoded.field).toBe(field);
      expect(decoded.value).toBe(value);
    }
  });

  test("validate frame checksum", () => {
    const frame = encodeConfigUpdate("terminalMode", 2);
    expect(validateFrame(frame)).toBe(true);

    // Corrupt checksum
    frame[13] ^= 0xFF;
    expect(validateFrame(frame)).toBe(false);
  });

  test("reject invalid field name", () => {
    expect(() => encodeConfigUpdate("invalid", 0)).toThrow("Unknown field");
  });

  test("reject invalid frame length", () => {
    const invalidFrame = new Uint8Array(13);
    expect(() => decodeConfigUpdate(invalidFrame)).toThrow("Invalid frame length");
  });
});

describe("Binary Protocol - Terminal Resize", () => {
  test("encode terminal resize frame", () => {
    const frame = encodeTerminalResize(40, 120);

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.TERMINAL_RESIZE);

    const view = new DataView(frame.buffer);
    const value = Number(view.getBigUint64(5, true));

    // Rows in high byte, cols in low byte
    expect((value >> 16) & 0xFF).toBe(40);
    expect(value & 0xFF).toBe(120);
  });

  test("decode terminal resize frame", () => {
    const frame = encodeTerminalResize(40, 120);
    const decoded = decodeTerminalResize(frame);

    expect(decoded.rows).toBe(40);
    expect(decoded.cols).toBe(120);
  });
});

describe("Binary Protocol - Feature Toggle", () => {
  test("encode feature toggle frame", () => {
    const frame = encodeFeatureToggle(2, true);

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.FEATURE_TOGGLE);

    const view = new DataView(frame.buffer);
    expect(view.getUint32(1, true)).toBe(FIELD_OFFSET.FEATURE_FLAGS);
  });

  test("decode feature toggle frame", () => {
    const frame = encodeFeatureToggle(2, true);
    const decoded = decodeFeatureToggle(frame);

    expect(decoded.flagIndex).toBe(2);
    expect(decoded.enabled).toBe(true);
  });

  test("encode feature disable", () => {
    const frame = encodeFeatureToggle(2, false);
    const decoded = decodeFeatureToggle(frame);

    expect(decoded.enabled).toBe(false);
  });
});

describe("Binary Protocol - Bulk Update", () => {
  test("encode bulk update frame", () => {
    const updates = [
      { field: "terminalMode", value: 2 },
      { field: "rows", value: 40 },
      { field: "cols", value: 120 },
    ];

    const frame = encodeBulkUpdate(updates);

    // 1 (type) + 3 * 13 (updates) + 1 (checksum) = 41 bytes
    expect(frame.length).toBe(41);
    expect(frame[0]).toBe(WS_MSG.BULK_UPDATE);
  });

  test("decode bulk update frame", () => {
    const updates = [
      { field: "terminalMode", value: 2 },
      { field: "rows", value: 40 },
      { field: "cols", value: 120 },
    ];

    const frame = encodeBulkUpdate(updates);
    const decoded = decodeBulkUpdate(frame);

    expect(decoded.length).toBe(3);
    expect(decoded).toContainEqual({ field: "terminalMode", value: 2 });
    expect(decoded).toContainEqual({ field: "rows", value: 40 });
    expect(decoded).toContainEqual({ field: "cols", value: 120 });
  });
});

describe("Binary Protocol - Heartbeat", () => {
  test("encode heartbeat frame", () => {
    const frame = encodeHeartbeat();

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.HEARTBEAT);
  });

  test("decode heartbeat timestamp", () => {
    const frame = encodeHeartbeat();
    const timestamp = decodeHeartbeat(frame);

    expect(timestamp).toBeGreaterThan(0);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
});

describe("Binary Protocol - ACK", () => {
  test("encode ACK frame", () => {
    const frame = encodeAck(WS_MSG.CONFIG_UPDATE);

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.ACK);

    const decodedType = decodeAck(frame);
    expect(decodedType).toBe(WS_MSG.CONFIG_UPDATE);
  });
});

describe("Binary Protocol - Error", () => {
  test("encode error frame", () => {
    const frame = encodeError(0x01, "Test error");

    expect(frame.length).toBe(14);
    expect(frame[0]).toBe(WS_MSG.ERROR);

    const view = new DataView(frame.buffer);
    expect(view.getUint32(1, true)).toBe(0x01);
  });
});

describe("Performance Benchmarks", () => {
  test("serialize config", () => {
    const config: ConfigState = {
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    bench("serializeConfig", () => {
      serializeConfig(config);
    });

    // Target: <50ns
  });

  test("deserialize config", () => {
    const bytes = serializeConfig({
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    });

    bench("deserializeConfig", () => {
      deserializeConfig(bytes);
    });

    // Target: <50ns
  });

  test("inject headers", () => {
    const init: RequestInit = { method: "GET" };

    bench("injectConfigHeaders", () => {
      injectConfigHeaders(init);
    });

    // Target: <15ns (memcpy)
  });

  test("binary protocol encode", () => {
    bench("encodeConfigUpdate", () => {
      encodeConfigUpdate("terminalMode", 2);
    });

    // Target: <50ns
  });

  test("binary protocol decode", () => {
    const frame = encodeConfigUpdate("terminalMode", 2);

    bench("decodeConfigUpdate", () => {
      decodeConfigUpdate(frame);
    });

    // Target: <50ns
  });

  test("checksum calculation", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);

    bench("calculateChecksum", () => {
      calculateChecksum(data);
    });

    // Target: <10ns (XOR loop)
  });

  test("proxy token validation", () => {
    const token = issueProxyToken("@mycompany");

    bench("verifyProxyToken", () => {
      verifyProxyToken(token, 0xa1b2c3d4);
    });

    // Target: <10ns
  });

  test("JSON vs Binary serialization", () => {
    const field = "terminalMode";
    const value = 2;

    bench("JSON.stringify", () => {
      JSON.stringify({ field, value });
    });

    // Binary should be ~42x faster
  });

  test("hex encoding", () => {
    const config: ConfigState = {
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    bench("configToHex", () => {
      configToHex(config);
    });

    // Target: <100ns
  });
});

describe("Integration Tests", () => {
  test("full header injection round-trip", () => {
    const init: RequestInit = { method: "POST" };
    const enhanced = injectConfigHeaders(init);
    const headers = new Headers(enhanced.headers);
    const extracted = extractConfigFromHeaders(headers);

    expect(extracted.version).toBe(1);
    expect(extracted.terminalMode).toBe(2);
  });

  test("binary protocol round-trip", () => {
    const original = { field: "terminalMode", value: 2 };
    const frame = encodeConfigUpdate(original.field, original.value);
    const decoded = decodeConfigUpdate(frame);

    expect(decoded).toEqual(original);
  });

  test("bulk update round-trip", () => {
    const updates = [
      { field: "terminalMode", value: 2 },
      { field: "rows", value: 40 },
      { field: "cols", value: 120 },
    ];

    const frame = encodeBulkUpdate(updates);
    const decoded = decodeBulkUpdate(frame);

    expect(decoded).toHaveLength(3);
    for (const update of updates) {
      expect(decoded).toContainEqual(update);
    }
  });

  test("config hex round-trip", () => {
    const config: ConfigState = {
      version: 1,
      registryHash: 0xa1b2c3d4,
      featureFlags: 0x00000007,
      terminalMode: 2,
      rows: 24,
      cols: 80,
      reserved: 0,
    };

    const hex = configToHex(config);
    const restored = hexToConfig(hex);

    expect(restored).toEqual(config);
  });
});
