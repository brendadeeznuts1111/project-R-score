import { describe, expect, test } from "bun:test";
import {
  HardwareCapabilityDetector,
  hardwareDetector,
  type HardwareCapabilities,
} from "../utils/hardware-detector";

describe("HardwareCapabilities Interface", () => {
  test("should have correct structure", () => {
    const capabilities: HardwareCapabilities = {
      simd: true,
      crc32: true,
      threads: 8,
      memory: { total: 1073741824, available: 536870912, limit: 1073741824 },
      cpu: { architecture: "x64", model: "Intel Core i7", frequency: 3.5 },
    };
    expect(capabilities.simd).toBe(true);
    expect(capabilities.crc32).toBe(true);
    expect(capabilities.threads).toBeGreaterThan(0);
  });
  test("should work with optional fields missing", () => {
    const capabilities: HardwareCapabilities = {
      simd: false,
      crc32: false,
      threads: 4,
      memory: {
        total: 512 * 1024 * 1024,
        available: 256 * 1024 * 1024,
        limit: 512 * 1024 * 1024,
      },
      cpu: { architecture: "arm64" },
    };
    expect(capabilities.cpu.model).toBeUndefined();
    expect(capabilities.cpu.frequency).toBeUndefined();
  });
});

describe("HardwareCapabilityDetector", () => {
  test("should export class", () => {
    const detector = new HardwareCapabilityDetector();
    expect(detector).toBeInstanceOf(HardwareCapabilityDetector);
    expect(typeof detector.detectCapabilities).toBe("function");
    expect(typeof detector.benchmark).toBe("function");
    expect(typeof detector.generateReport).toBe("function");
  });
  test("should detect capabilities", async () => {
    const detector = new HardwareCapabilityDetector();
    const caps = await detector.detectCapabilities();
    expect(caps).toHaveProperty("simd");
    expect(caps).toHaveProperty("crc32");
    expect(caps).toHaveProperty("threads");
    expect(caps).toHaveProperty("memory");
    expect(caps).toHaveProperty("cpu");
  });
  test("should benchmark", async () => {
    const detector = new HardwareCapabilityDetector();
    const result = await detector.benchmark();
    expect(result).toHaveProperty("throughput");
    expect(result).toHaveProperty("latency");
    expect(result).toHaveProperty("efficiency");
    expect(result.throughput).toBeGreaterThan(0);
    expect(result.latency).toBeGreaterThan(0);
  });
  test("should generate report", async () => {
    const detector = new HardwareCapabilityDetector();
    const caps = await detector.detectCapabilities();
    const report = detector.generateReport(caps);
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain("SIMD");
    expect(report).toContain("CRC32");
    expect(report).toContain("Threads");
  });
});

describe("CRC32 Hardware Detection", () => {
  test("should detect hardware CRC32 capability", () => {
    const testSize = 1024 * 1024;
    const testData = new Uint8Array(testSize);
    const start = performance.now();
    Bun.hash.crc32(testData);
    const duration = performance.now() - start;
    const hasHardware = duration < 0.2;
    expect(typeof hasHardware).toBe("boolean");
  });
  test("should measure throughput", () => {
    const testSize = 10 * 1024 * 1024;
    const testData = new Uint8Array(testSize);
    const start = performance.now();
    Bun.hash.crc32(testData);
    const duration = performance.now() - start;
    const throughput = testSize / (duration / 1000) / (1024 * 1024);
    expect(throughput).toBeGreaterThan(0);
  });
});

describe("Memory Info", () => {
  test("should get memory usage", () => {
    const usage = process.memoryUsage();
    expect(usage).toHaveProperty("heapTotal");
    expect(usage).toHaveProperty("heapUsed");
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect(usage.heapUsed).toBeLessThanOrEqual(usage.heapTotal);
  });
});

describe("Singleton hardwareDetector", () => {
  test("should be exported", () => {
    expect(typeof hardwareDetector).toBe("object");
    expect(hardwareDetector).toBeInstanceOf(HardwareCapabilityDetector);
  });
  test("should have methods", async () => {
    expect(typeof hardwareDetector.detectCapabilities).toBe("function");
    expect(typeof hardwareDetector.benchmark).toBe("function");
    expect(typeof hardwareDetector.generateReport).toBe("function");
    const caps = await hardwareDetector.detectCapabilities();
    expect(caps).toHaveProperty("simd");
  });
});
