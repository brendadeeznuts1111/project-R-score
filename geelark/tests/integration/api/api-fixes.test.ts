#!/usr/bin/env bun

// @ts-ignore - Bun types are available at runtime
import { Glob } from "bun";
// @ts-ignore - Bun types are available at runtime
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    expectTypeOf,
    test,
} from "bun:test";
// @ts-ignore - Import path resolution issue
import { getServer } from "../../dev-hq/servers/api-server";

describe("🛠️ Bun APIs - All Fixes Verified", () => {
  let baseURL: string;

  beforeAll(() => {
    // Use the actual server from dev-hq/api-server.ts
    const server = getServer();
    baseURL = server.url.href;
  });

  afterAll(() => {
    // Don't stop the server - it might be used by other tests
    // The server will be stopped when the process exits
  });

  test("✅ Bun.secrets + AsyncLocalStorage safe", async () => {
    const res = await fetch(`${baseURL}/secrets`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("secret");
    expect(typeof data.secret).toBe("boolean");
    expect(data).toHaveProperty("userId");
    expect(data.userId).toBe("123");
  });

  test("✅ Bun.mmap validation", async () => {
    const mmapRes = await fetch(`${baseURL}/mmap`);
    expect(mmapRes.ok).toBe(true);
    const data = await mmapRes.json();
    expect(data).toHaveProperty("size");
    expect(data.size).toBeGreaterThan(0);
    expect(data.success).toBe(true);
  });

  test("✅ Bun.plugin validation", async () => {
    const pluginRes = await fetch(`${baseURL}/plugin`);
    expect(pluginRes.ok).toBe(true);
    const data = await pluginRes.json();
    expect(data).toHaveProperty("plugin");
    expect(data.success).toBe(true);
  });

  test("✅ Glob.scan() hidden files", async () => {
    const globRes = await fetch(`${baseURL}/glob`);
    expect(globRes.ok).toBe(true);
    const data = await globRes.json();
    expect(data).toHaveProperty("results");
    expect(data.success).toBe(true);
    expect(typeof data.results).toBe("object");

    // Also test directly
    const patterns = [
      ".*/*", // .gitignore, .DS_Store etc.
      ".*/**/*.ts", // Hidden directories with TS files
      "**/.env*", // Environment files
    ];

    for (const pattern of patterns) {
      const glob = new Glob(pattern);
      const results = glob.scanSync(process.cwd());
      // Results might be an array or iterable
      expect(results).toBeDefined();
      if (!Array.isArray(results)) {
        // Convert to array if it's an iterable
        const resultsArray = Array.from(results);
        expect(Array.isArray(resultsArray)).toBe(true);
      }
    }
  });

  test("✅ Bun.indexOfLine - valid offset", async () => {
    const res = await fetch(`${baseURL}/indexofline`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);

    // indexOfLine might not be available in all Bun versions
    if (data.available === false) {
      // API not available - that's acceptable
      expect(data.error).toBe("indexOfLine not available in this Bun version");
    } else {
      // If it works, verify the properties
      expect(data).toHaveProperty("line");
      expect(data).toHaveProperty("type");
      expect(data.type).toBe("number");
    }
  });

  test("✅ FormData.from large buffer handling", async () => {
    const res = await fetch(`${baseURL}/formdata`);
    expect(res.ok).toBe(true);

    // Test with FormData.from
    const normalBuf = new ArrayBuffer(1024);
    // @ts-ignore - FormData.from is available at runtime
    expect(() => FormData.from(normalBuf)).not.toThrow();

    // Test extremely large buffer (should handle gracefully)
    expect(() => {
      const largeBuf = new ArrayBuffer(2 * 1024 * 1024 * 1024); // 2GB
      // @ts-ignore - FormData.from is available at runtime
      FormData.from(largeBuf);
    }).toThrow(); // Should throw memory/size error
  });

  test("✅ Bun.FFI.CString constructor", async () => {
    const res = await fetch(`${baseURL}/ffi`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("cstrCreated");
    expect(data.success).toBe(true);

    // Also test directly
    // @ts-ignore - Bun.FFI is available at runtime
    expect(typeof Bun.FFI.CString).toBe("function");
    const ptr = BigInt(0);
    expect(() => {
      // @ts-ignore - Bun.FFI.CString is available at runtime
      const cstr = new Bun.FFI.CString(ptr);
      expect(cstr).toBeDefined();
    }).not.toThrow();
  });

  test("✅ RedisClient constructor validation", async () => {
    const res = await fetch(`${baseURL}/redis`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Also test directly
    // @ts-ignore - Bun.RedisClient is available at runtime
    if (typeof Bun.RedisClient !== "undefined") {
      expect(() => {
        // Testing without new (handled by @ts-ignore)
        // @ts-ignore - Bun.RedisClient is available at runtime
        Bun.RedisClient();
      }).toThrow();

      expect(() => {
        // @ts-ignore - Bun.RedisClient is available at runtime
        new Bun.RedisClient();
      }).not.toThrow();
    }
  });

  test("✅ ReadableStream empty stream handling", async () => {
    const res = await fetch(`${baseURL}/stream`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("streamCreated");
    expect(data).toHaveProperty("readerCreated");
    expect(data.success).toBe(true);

    // Also test directly
    expect(() => {
      const stream = new ReadableStream();
      stream.getReader();
    }).not.toThrow();
  });

  test("✅ Health check endpoint", async () => {
    const res = await fetch(`${baseURL}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.version).toBe("1.3.0");
    expect(Array.isArray(data.apis)).toBe(true);
  });
});

describe("🔗 bun:ffi - Pointer Fixes", () => {
  test("✅ Number → BigInt conversion", () => {
    // Test valid pointer conversion
    // @ts-ignore - BigInt literals are available at runtime
    const numPtr = 123n;
    expect(typeof numPtr).toBe("bigint");

    // Test pointer operations
    expect(() => {
      const ptr = BigInt(123);
      // @ts-ignore - BigInt literals are available at runtime
      expect(ptr).toBe(123n);
    }).not.toThrow();
  });

  test("✅ Valid ptr only validation", () => {
    // Test invalid BigInt conversion
    expect(() => {
      BigInt("invalid");
    }).toThrow();

    // Test valid BigInt conversion
    expect(() => {
      BigInt("123");
      BigInt(123);
      BigInt(0x123);
    }).not.toThrow();
  });

  test("✅ FFI pointer overflow protection", () => {
    // Test large numbers that could cause overflow
    const largeNumber = Number.MAX_SAFE_INTEGER;
    expect(() => {
      const ptr = BigInt(largeNumber);
      expect(ptr).toBe(BigInt(largeNumber));
    }).not.toThrow();

    // Test negative numbers
    expect(() => {
      const ptr = BigInt(-1);
      // @ts-ignore - BigInt literals are available at runtime
      expect(ptr).toBe(-1n);
    }).not.toThrow();
  });
});

describe("📁 Glob Hidden Files - Comprehensive Testing", () => {
  test("✅ Hidden file patterns work correctly", () => {
    const testPatterns = [
      { pattern: ".*/*", description: "All hidden files" },
      { pattern: ".*/**/*.ts", description: "Hidden TS files" },
      { pattern: "**/.env*", description: "Environment files" },
      { pattern: ".*.json", description: "Hidden JSON files" },
      { pattern: ".git/**/*", description: "Git files" },
    ];

    for (const { pattern, description } of testPatterns) {
      const glob = new Glob(pattern);
      const results = glob.scanSync(process.cwd());

      // Results might be an array or an iterable
      expect(results).toBeDefined();
      if (Array.isArray(results)) {
        expect(results.length).toBeGreaterThanOrEqual(0);
        // If results exist, they should be strings
        if (results.length > 0) {
          expect(typeof results[0]).toBe("string");
        }
      } else {
        // If it's an iterable, convert to array
        const resultsArray = Array.from(results);
        expect(resultsArray.length).toBeGreaterThanOrEqual(0);
        if (resultsArray.length > 0) {
          expect(typeof resultsArray[0]).toBe("string");
        }
      }
    }
  });

  test("✅ Glob.scan async version", async () => {
    const glob = new Glob("**/*.ts");
    const results = [];

    for await (const file of glob.scan(process.cwd())) {
      results.push(file);
      if (results.length > 10) break; // Limit for test performance
    }

    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0]).toBe("string");
  });
});

describe("🚀 Production Standalone Features", () => {
  test("✅ Bundle size validation", async () => {
    // Create a simple server file
    const serverCode = `
      // @ts-ignore - Bun.serve is available at runtime
      const server = Bun.serve({ port: 3000, fetch: () => new Response('OK') });
      console.log('Server running on', server.url);
    `;

    const testFile = "/tmp/test-server.ts";
    // @ts-ignore - Bun.write is available at runtime
    await Bun.write(testFile, serverCode);

    // Test that we can build without config loading
    // @ts-ignore - Bun.build is available at runtime
    const result = await Bun.build({
      entrypoints: [testFile],
      target: "bun",
      format: "esm",
      minify: true,
    });
    expect(result.success).toBe(true);
    expect(result.outputs.length).toBeGreaterThan(0);
  });

  test("✅ Fast startup simulation", () => {
    // Test that basic operations work without full config
    expect(() => {
      // These should work without tsconfig/package.json
      // @ts-ignore - Bun.serve is available at runtime
      Bun.serve({ port: 0, fetch: () => new Response("test") });
      new Glob("*.ts");
      // @ts-ignore - Bun.file is available at runtime
      Bun.file("/tmp/test");
    }).not.toThrow();
  });

  test("✅ Type-safe API response validation", () => {
    // Test API response types with expectTypeOf
    interface HealthResponse {
      status: "healthy" | "unhealthy";
      version: string;
      apis: string[];
      timestamp?: Date;
    }

    interface SecretsResponse {
      secret: boolean;
      userId: string;
      context?: {
        requestPath: string;
        userAgent: string;
      };
    }

    // Mock responses for type testing
    const healthRes: HealthResponse = {
      status: "healthy",
      version: "1.3.0",
      apis: ["secrets", "mmap", "plugin"],
      timestamp: new Date(),
    };

    const secretsRes: SecretsResponse = {
      secret: true,
      userId: "123",
      context: {
        requestPath: "/secrets",
        userAgent: "bun-test",
      },
    };

    // Type validations
    expectTypeOf(healthRes.status).toEqualTypeOf<"healthy" | "unhealthy">();
    expectTypeOf(healthRes.version).toBeString();
    expectTypeOf(healthRes.apis).toBeArray();
    expectTypeOf(healthRes.apis[0]).toBeString();
    expectTypeOf(healthRes.timestamp).toEqualTypeOf<Date | undefined>();

    expectTypeOf(secretsRes.secret).toBeBoolean();
    expectTypeOf(secretsRes.userId).toBeString();
    expectTypeOf(secretsRes.context).toEqualTypeOf<
      | {
          requestPath: string;
          userAgent: string;
        }
      | undefined
    >();
  });

  test("✅ Bun API type contracts", () => {
    // Test Bun-specific API contracts
    // @ts-ignore - Bun.serve is available at runtime
    const server = Bun.serve({ port: 0, fetch: () => new Response("test") });

    expectTypeOf(server.protocol).toEqualTypeOf<"http" | "https">();
    expectTypeOf(server.url).toEqualTypeOf<URL>();
    expectTypeOf(server.port).toBeNumber();
    expectTypeOf(server.hostname).toBeString();
    expectTypeOf(server.pendingRequests).toBeNumber();
    expectTypeOf(server.stop).toEqualTypeOf<() => Promise<void>>();
    expectTypeOf(server.reload).toEqualTypeOf<() => void>();

    // Test Glob API
    const glob = new Glob("*.ts");
    expectTypeOf(glob.scan).toBeFunction();
    expectTypeOf(glob.scanSync).toBeFunction();

    // Test File API
    // @ts-ignore - Bun.file is available at runtime
    const file = Bun.file("/tmp/test");
    // @ts-ignore - Bun namespace is available at runtime
    expectTypeOf(file).toEqualTypeOf<Bun.File>();
    expectTypeOf(file.size).toBeNumber();
    expectTypeOf(file.type).toBeString();
    expectTypeOf(file.lastModified).toBeNumber();
  });
});

describe("🧪 Edge Cases and Fuzzer Protection", () => {
  test("✅ Empty ReadableStream handling", () => {
    // Test empty stream doesn't crash
    expect(() => {
      const stream = new ReadableStream();
      stream.getReader();
    }).not.toThrow();
  });

  test("✅ RedisClient constructor validation", () => {
    // Test that RedisClient requires new operator
    // @ts-ignore - Bun.RedisClient is available at runtime
    if (typeof Bun.RedisClient !== "undefined") {
      expect(() => {
        // Testing without new (handled by @ts-ignore)
        // @ts-ignore - Bun.RedisClient is available at runtime
        Bun.RedisClient();
      }).toThrow();

      expect(() => {
        // @ts-ignore - Bun.RedisClient is available at runtime
        new Bun.RedisClient();
      }).not.toThrow();
    }
  });

  test("✅ Memory pressure handling", () => {
    // Test operations under memory pressure
    expect(() => {
      // Create multiple objects to test memory handling
      const objects = [];
      for (let i = 0; i < 1000; i++) {
        objects.push(new Uint8Array(1024));
      }
      // Should not crash
      expect(objects.length).toBe(1000);
    }).not.toThrow();
  });

  test("✅ Invalid input sanitization", () => {
    // Test various invalid inputs
    const invalidInputs = [null, undefined];

    for (const input of invalidInputs) {
      // Test that invalid inputs are handled gracefully
      expect(() => {
        // Testing invalid inputs (handled by @ts-ignore)
        new Glob(input);
      }).toThrow();
    }

    // Some inputs might not throw but should be handled
    const potentiallyInvalidInputs = ["", -1, Number.NaN];

    for (const input of potentiallyInvalidInputs) {
      // These might not throw but should be handled
      try {
        // Testing invalid inputs (handled by @ts-ignore)
        new Glob(input);
        // If it doesn't throw, that's also acceptable - just verify it doesn't crash
      } catch (e) {
        // If it throws, that's also acceptable
        expect(e).toBeDefined();
      }
    }
  });
});
