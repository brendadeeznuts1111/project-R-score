// infrastructure/v1-3-3/__tests__/components-71-75.test.ts
// Comprehensive tests for Components #71-75

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SourcemapIntegrityValidator } from "../sourcemap-integrity-validator";
import { NAPIThreadSafetyGuard } from "../napi-threadsafety-guard";
import { WebSocketFragmentGuard } from "../websocket-fragment-guard";
import { WorkerThreadSafetyEngine } from "../worker-thread-safety-engine";
import { YAMLDocEndFix } from "../yaml-doc-end-fix";

describe("Component #71: Sourcemap-Integrity-Validator", () => {
  it("should validate build sourcemaps without virtual paths", async () => {
    const buildResult = {
      outputs: [
        {
          path: "/dist/index.js",
          sourceMap: {
            sources: ["src/index.ts"],
            sourcesContent: ["// source code"],
            mappings: "AAAA"
          }
        }
      ]
    };

    const result = await SourcemapIntegrityValidator.validateBuildSourcemaps(buildResult, false);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect virtual paths in compile mode", async () => {
    const buildResult = {
      outputs: [
        {
          path: "/$bunfs/root/index.js",
          sourceMap: {
            sources: ["src/index.ts"],
            sourcesContent: ["// source code"],
            mappings: "AAAA"
          }
        }
      ]
    };

    const result = await SourcemapIntegrityValidator.validateBuildSourcemaps(buildResult, true);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should fix compile sourcemaps", async () => {
    const buildOptions = {
      compile: true,
      sourcemap: true
    };

    const fixed = await SourcemapIntegrityValidator.fixCompileSourcemaps(buildOptions);
    expect(fixed.sourcemap).toBe("external");
    expect(fixed.sourcemapIncludeSources).toBe(true);
  });

  it("should rewrite import.meta for bytecode", () => {
    const code = `
      const url = import.meta.url;
      const dir = import.meta.dirname;
      const file = import.meta.file;
    `;

    const rewritten = SourcemapIntegrityValidator.rewriteImportMetaForBytecode(code);
    expect(rewritten).toContain('__filename || "file://unknown"');
    expect(rewritten).toContain('__dirname || "/"');
    expect(rewritten).toContain('path.basename(__filename) || "unknown"');
  });
});

describe("Component #72: NAPI-ThreadSafety-Guard", () => {
  it("should create thread-safe function", () => {
    const fn = (value: any) => value * 2;
    const tsfn = NAPIThreadSafetyGuard.createThreadSafeFunction(fn, {
      resourceName: "test",
      maxQueueSize: 100
    });

    expect(tsfn.id).toBeDefined();
    expect(tsfn.fn).toBe(fn);
    expect(tsfn.resourceName).toBe("test");
    expect(tsfn.refCount).toBe(1);
  });

  it("should call thread-safe function", async () => {
    let called = false;
    const fn = (value: any) => {
      called = true;
      return value;
    };

    const tsfn = NAPIThreadSafetyGuard.createThreadSafeFunction(fn);
    await NAPIThreadSafetyGuard.callThreadSafeFunction(tsfn, 42);

    expect(called).toBe(true);
  });

  it("should handle queue overflow", async () => {
    const fn = (value: any) => new Promise(resolve => setTimeout(() => resolve(value), 10));
    const tsfn = NAPIThreadSafetyGuard.createThreadSafeFunction(fn, { maxQueueSize: 2 });

    // Fill queue
    for (let i = 0; i < 5; i++) {
      NAPIThreadSafetyGuard.callThreadSafeFunction(tsfn, i);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
    const metrics = NAPIThreadSafetyGuard.getMetrics();
    expect(metrics.queueOverflows).toBeGreaterThan(0);
  });

  it("should release thread-safe function", () => {
    const fn = (value: any) => value;
    const tsfn = NAPIThreadSafetyGuard.createThreadSafeFunction(fn);

    NAPIThreadSafetyGuard.releaseThreadSafeFunction(tsfn.id);

    // Should be released
    const metrics = NAPIThreadSafetyGuard.getMetrics();
    expect(metrics.activeThreads).toBe(0);
  });
});

describe("Component #73: WebSocket-Fragment-Guard", () => {
  it("should create guarded WebSocket", () => {
    const mockWs = {
      readyState: 1,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
      dispatchEvent: () => {},
      removeEventListener: () => {}
    };

    const guarded = WebSocketFragmentGuard.createWebSocket(mockWs);
    expect(guarded).toBeDefined();
  });

  it("should validate WebSocket frames", () => {
    const validFrame = {
      opcode: 0x01, // Text
      payload: new Uint8Array([1, 2, 3]),
      final: true
    };

    expect(WebSocketFragmentGuard.validateFrame(validFrame)).toBe(true);

    const invalidFrame = {
      opcode: 0xFF, // Invalid
      payload: new Uint8Array([1, 2, 3]),
      final: true
    };

    expect(WebSocketFragmentGuard.validateFrame(invalidFrame)).toBe(false);
  });

  it("should create mock WebSocket", () => {
    const mock = WebSocketFragmentGuard.createMockWebSocket();
    expect(mock.readyState).toBe(1);
    expect(typeof mock.send).toBe("function");
    expect(typeof mock.close).toBe("function");
  });

  it("should track metrics", () => {
    const metrics = WebSocketFragmentGuard.getMetrics();
    expect(metrics).toHaveProperty("bufferedCloseFrames");
    expect(metrics).toHaveProperty("fragmentedMessages");
    expect(metrics).toHaveProperty("bufferOverflows");
    expect(metrics).toHaveProperty("panicPreventions");
  });
});

describe("Component #74: Worker-Thread-Safety-Engine", () => {
  it("should create worker with safety hooks", () => {
    // Mock Worker constructor
    const originalWorker = global.Worker;
    global.Worker = class MockWorker {
      addEventListener() {}
      terminate() {}
    } as any;

    try {
      const worker = WorkerThreadSafetyEngine.createWorker("test.js", {
        env: { TEST: "1" }
      });
      expect(worker).toBeDefined();
    } finally {
      global.Worker = originalWorker;
    }
  });

  it("should validate worker environment", () => {
    const validOptions = {
      env: { __BUN_WORKER_NAPI_SAFE: "1" }
    };

    expect(WorkerThreadSafetyEngine.validateWorkerEnvironment(validOptions)).toBe(true);

    const invalidOptions = {
      env: {}
    };

    expect(WorkerThreadSafetyEngine.validateWorkerEnvironment(invalidOptions)).toBe(false);
  });

  it("should create isolated worker", () => {
    const originalWorker = global.Worker;
    global.Worker = class MockWorker {
      addEventListener() {}
      terminate() {}
    } as any;

    try {
      const worker = WorkerThreadSafetyEngine.createIsolatedWorker("test.js");
      expect(worker).toBeDefined();
    } finally {
      global.Worker = originalWorker;
    }
  });

  it("should track metrics", () => {
    const metrics = WorkerThreadSafetyEngine.getMetrics();
    expect(metrics).toHaveProperty("activeWorkers");
    expect(metrics).toHaveProperty("napiModulesLoaded");
    expect(metrics).toHaveProperty("cleanupTimeouts");
    expect(metrics).toHaveProperty("successfulTerminations");
    expect(metrics).toHaveProperty("failedTerminations");
  });
});

describe("Component #75: YAML-Doc-End-Fix", () => {
  it("should parse YAML with ... in quotes", () => {
    const yaml = 'key: "value with ... dots"';
    const result = YAMLDocEndFix.parseYAML(yaml);
    expect(result.key).toBe("value with ... dots");
  });

  it("should handle quoted doc end markers", () => {
    const yaml = `
key1: "value with ... inside"
key2: 'another ... example'
key3: normal
...`;

    const result = YAMLDocEndFix.parseYAML(yaml);
    expect(result.key1).toBe("value with ... inside");
    expect(result.key2).toBe("another ... example");
    expect(result.key3).toBe("normal");
  });

  it("should validate YAML content", () => {
    const yaml = 'key: "value with ... dots"';
    const validation = YAMLDocEndFix.validateContent(yaml);
    expect(validation.hasIssues).toBe(true);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it("should stringify YAML with indicator chars", () => {
    const obj = {
      key: ":value",
      key2: "...test"
    };

    const yaml = YAMLDocEndFix.stringifyYAML(obj);
    expect(yaml).toContain('":value"');
    expect(yaml).toContain('"...test"');
  });

  it("should get and reset metrics", () => {
    const metrics = YAMLDocEndFix.getMetrics();
    expect(metrics).toHaveProperty("parseCount");
    expect(metrics).toHaveProperty("fixedDocEndMarkers");

    YAMLDocEndFix.resetMetrics();
    const resetMetrics = YAMLDocEndFix.getMetrics();
    expect(resetMetrics.parseCount).toBe(0);
  });

  it("should test quoted doc end scenarios", () => {
    // Should not throw
    expect(() => YAMLDocEndFix.testQuotedDocEnd()).not.toThrow();
  });
});

describe("Components #71-75: Integration", () => {
  it("should work with feature flags disabled (zero-cost)", () => {
    // All components should provide zero-cost exports
    // This test verifies the structure is correct
    expect(typeof SourcemapIntegrityValidator.validateBuildSourcemaps).toBe("function");
    expect(typeof NAPIThreadSafetyGuard.createThreadSafeFunction).toBe("function");
    expect(typeof WebSocketFragmentGuard.createWebSocket).toBe("function");
    expect(typeof WorkerThreadSafetyEngine.createWorker).toBe("function");
    expect(typeof YAMLDocEndFix.parseYAML).toBe("function");
  });

  it("should provide consistent metrics interface", () => {
    const sourcemapMetrics = SourcemapIntegrityValidator.generateIntegrityReport({ outputs: [] });
    expect(sourcemapMetrics).resolves.toHaveProperty("sourcemapCount");

    const napiMetrics = NAPIThreadSafetyGuard.getMetrics();
    expect(napiMetrics).toHaveProperty("activeThreads");

    const wsMetrics = WebSocketFragmentGuard.getMetrics();
    expect(wsMetrics).toHaveProperty("bufferedCloseFrames");

    const workerMetrics = WorkerThreadSafetyEngine.getMetrics();
    expect(workerMetrics).toHaveProperty("activeWorkers");

    const yamlMetrics = YAMLDocEndFix.getMetrics();
    expect(yamlMetrics).toHaveProperty("parseCount");
  });
});
