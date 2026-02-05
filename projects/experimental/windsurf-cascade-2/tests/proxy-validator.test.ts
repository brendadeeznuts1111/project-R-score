// tests/proxy-validator.test.ts
//! Comprehensive tests for proxy header validation

import { test, expect, describe } from "bun:test";
import { 
  validateProxyHeader, 
  validateProxyToken, 
  ProxyHeaderError,
  createConfigDump,
  calculateChecksum,
  validationMetrics 
} from "../src/net/proxy/validator.js";

// Performance timing
const nanoseconds = () => performance.now() * 1000000;

describe("Header Validation", () => {
  test("validates configVersion successfully", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", "1");
    expect(result.valid).toBe(true);
    if (result.valid) {
      if (result.valid) {
      expect(result.parsed).toBe(1);
    }
    }
  });

  test("rejects invalid configVersion format", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", "1.5");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      if (!result.valid) {
      expect(result.error).toBeInstanceOf(ProxyHeaderError);
    }
      if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
      if (!result.valid) {
      expect(result.error.header).toBe("X-Bun-Config-Version");
    }
    }
  });

  test("rejects out-of-range configVersion", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", "256");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      if (!result.valid) {
      expect(result.error.code).toBe("OUT_OF_RANGE");
    }
    }
  });

  test("accepts zero configVersion (legacy mode)", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", "0");
    expect(result.valid).toBe(true);
    if (result.valid) {
      if (result.valid) {
      expect(result.parsed).toBe(0);
    }
    }
  });

  test("validates registry hash successfully", () => {
    const result = validateProxyHeader("X-Bun-Registry-Hash", "0x12345678");
    expect(result.valid).toBe(true);
    if (result.valid) {
      if (result.valid) {
      expect(result.parsed).toBe(0x12345678);
    }
    }
  });

  test("rejects invalid registry hash format", () => {
    const result = validateProxyHeader("X-Bun-Registry-Hash", "12345678");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
    }
  });

  test("rejects registry hash with wrong length", () => {
    const result = validateProxyHeader("X-Bun-Registry-Hash", "0x1234");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
    }
  });

  test("validates feature flags successfully", () => {
    const result = validateProxyHeader("X-Bun-Feature-Flags", "0x00000007");
    expect(result.valid).toBe(true);
    if (result.valid) {
      if (result.valid) {
      expect(result.parsed).toBe(0x00000007);
    }
    }
  });

  test("rejects feature flags with reserved bits", () => {
    const result = validateProxyHeader("X-Bun-Feature-Flags", "0xFFFFF800");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FLAGS");
    }
    }
  });

  test("validates terminal mode successfully", () => {
    const modes = ["0", "1", "2", "3"];
    modes.forEach(mode => {
      const result = validateProxyHeader("X-Bun-Terminal-Mode", mode);
      expect(result.valid).toBe(true);
      expect(result.parsed).toBe(parseInt(mode, 10));
    });
  });

  test("rejects invalid terminal mode", () => {
    const result = validateProxyHeader("X-Bun-Terminal-Mode", "5");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });

  test("validates terminal rows successfully", () => {
    const result = validateProxyHeader("X-Bun-Terminal-Rows", "24");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed).toBe(24);
    }
  });

  test("rejects terminal rows out of range", () => {
    const result = validateProxyHeader("X-Bun-Terminal-Rows", "256");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("OUT_OF_RANGE");
    }
  });

  test("validates terminal cols successfully", () => {
    const result = validateProxyHeader("X-Bun-Terminal-Cols", "80");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed).toBe(80);
    }
  });

  test("rejects terminal cols out of range", () => {
    const result = validateProxyHeader("X-Bun-Terminal-Cols", "0");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("OUT_OF_RANGE");
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
    const result = validateProxyHeader("X-Bun-Domain", "@unknown");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("UNKNOWN_DOMAIN");
    }
  });

  test("validates domain hash successfully", () => {
    const result = validateProxyHeader("X-Bun-Domain-Hash", "0x12345678");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed).toBe(0x12345678);
    }
  });

  test("rejects unknown header", () => {
    const result = validateProxyHeader("X-Bun-Unknown", "value");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("UNKNOWN_HEADER");
    }
  });
});

describe("Config Dump Validation", () => {
  test("validates full config dump", () => {
    const config = {
      version: 1,
      registryHashHex: "0x12345678",
      featureFlags: 0x00000007,
      terminalMode: 2,
      terminal: { rows: 24, cols: 80 }
    };
    
    const dump = createConfigDump(config);
    const result = validateProxyHeader("X-Bun-Config-Dump", dump);
    
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeInstanceOf(Uint8Array);
    expect(result.parsed.length).toBe(13);
  });

  test("rejects invalid config dump format", () => {
    const result = validateProxyHeader("X-Bun-Config-Dump", "0x1234");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });

  test("rejects config dump with invalid checksum", () => {
    const dump = "0x01a1b2c3d40000000702185001"; // Last byte wrong
    const result = validateProxyHeader("X-Bun-Config-Dump", dump);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("CHECKSUM_MISMATCH");
    }
  });
});

describe("Token Validation", () => {
  test("validates correct token", async () => {
    // Create a valid token (simplified)
    const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      domain: "@domain1", 
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }));
    const signature = btoa(Bun.hash("@domain1" + payload).toString(16));
    const token = `${header}.${payload}.${signature}`;
    
    const result = await validateProxyToken(token);
    expect(result.valid).toBe(true);
    expect(result.parsed.domain).toBe("@domain1");
  });

  test("rejects expired token", async () => {
    const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      domain: "@domain1", 
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    }));
    const signature = btoa(Bun.hash("@domain1" + payload).toString(16));
    const token = `${header}.${payload}.${signature}`;
    
    const result = await validateProxyToken(token);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_TOKEN");
    }
  });

  test("rejects invalid token format", async () => {
    const result = await validateProxyToken("invalid-token");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_TOKEN");
    }
  });

  test("rejects token with invalid domain", async () => {
    const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      domain: "@invalid", 
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const signature = btoa(Bun.hash("@invalid" + payload).toString(16));
    const token = `${header}.${payload}.${signature}`;
    
    const result = await validateProxyToken(token);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_TOKEN");
    }
  });
});

describe("Checksum Calculation", () => {
  test("calculates checksum correctly", () => {
    const bytes = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67]);
    const checksum = calculateChecksum(bytes);
    
    // XOR of all bytes
    const expected = bytes.reduce((a, b) => a ^ b, 0);
    expect(checksum).toBe(expected);
  });

  test("creates config dump with correct checksum", () => {
    const config = {
      version: 1,
      registryHashHex: "0x12345678",
      featureFlags: 0x00000007,
      terminalMode: 2,
      terminal: { rows: 24, cols: 80 }
    };
    
    const dump = createConfigDump(config);
    expect(dump).toMatch(/^0x[a-fA-F0-9]{26}$/);
    
    // Validate that the dump validates correctly
    const result = validateProxyHeader("X-Bun-Config-Dump", dump);
    expect(result.valid).toBe(true);
  });
});

describe("Performance Tests", () => {
  test("validation performance meets SLA", () => {
    const iterations = 1000;
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      validateProxyHeader("X-Bun-Config-Version", "1");
      validateProxyHeader("X-Bun-Registry-Hash", "0x12345678");
      validateProxyHeader("X-Bun-Feature-Flags", "0x00000007");
    }
    
    const duration = nanoseconds() - start;
    const avgPerValidation = duration / (iterations * 3);
    
    // Should be under 100ns per validation
    expect(avgPerValidation).toBeLessThan(100);
    
    console.log(`Average validation time: ${avgPerValidation.toFixed(2)}ns`);
  });

  test("token validation performance meets SLA", async () => {
    const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      domain: "@domain1", 
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const signature = btoa(Bun.hash("@domain1" + payload).toString(16));
    const token = `${header}.${payload}.${signature}`;
    
    const iterations = 100;
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await validateProxyToken(token);
    }
    
    const duration = nanoseconds() - start;
    const avgPerValidation = duration / iterations;
    
    // Should be under 200ns per token validation
    expect(avgPerValidation).toBeLessThan(200);
    
    console.log(`Average token validation time: ${avgPerValidation.toFixed(2)}ns`);
  });
});

describe("Metrics Collection", () => {
  test("records validation metrics correctly", () => {
    validationMetrics.reset();
    
    // Record some validations
    validationMetrics.recordValidation(50, true);
    validationMetrics.recordValidation(75, false, "INVALID_FORMAT");
    validationMetrics.recordValidation(60, true);
    validationMetrics.recordValidation(80, false, "OUT_OF_RANGE");
    
    const metrics = validationMetrics.getMetrics();
    
    expect(metrics.validations).toBe(4);
    expect(metrics.failures).toBe(2);
    expect(metrics.failureRate).toBe(50);
    expect(metrics.avgLatency).toBe(66.25);
    expect(metrics.errorsByCode["INVALID_FORMAT"]).toBe(1);
    expect(metrics.errorsByCode["OUT_OF_RANGE"]).toBe(1);
  });

  test("resets metrics correctly", () => {
    validationMetrics.recordValidation(50, false, "INVALID_FORMAT");
    
    let metrics = validationMetrics.getMetrics();
    expect(metrics.validations).toBe(1);
    
    validationMetrics.reset();
    
    metrics = validationMetrics.getMetrics();
    expect(metrics.validations).toBe(0);
    expect(metrics.failures).toBe(0);
    expect(metrics.avgLatency).toBe(0);
  });
});

describe("Edge Cases", () => {
  test("handles empty values", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", "");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });

  test("handles null values", () => {
    const result = validateProxyHeader("X-Bun-Config-Version", null as any);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });

  test("handles extremely large values", () => {
    const largeValue = "9".repeat(100);
    const result = validateProxyHeader("X-Bun-Config-Version", largeValue);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("OUT_OF_RANGE");
    }
  });

  test("handles special characters in hex values", () => {
    const result = validateProxyHeader("X-Bun-Registry-Hash", "0xGHIJKLMN");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe("INVALID_FORMAT");
    }
  });
});
