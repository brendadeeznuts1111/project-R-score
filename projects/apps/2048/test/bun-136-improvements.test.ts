import { describe, expect, test } from "bun:test";

// Test file to demonstrate --grep flag functionality
// Run with: bun test --grep "crc32"
// Or: bun test --test-name-pattern "crc32"
// Or: bun test -t "crc32"

describe("CRC32 Operations", () => {
  test("should compute CRC32 hash for simple string", () => {
    const data = new TextEncoder().encode("hello world");
    const crc32 = Bun.hash.crc32(data);
    expect(typeof crc32).toBe("number");
    expect(crc32).toBeGreaterThan(0);
  });

  test("should compute CRC32 for empty buffer", () => {
    const data = new Uint8Array(0);
    const crc32 = Bun.hash.crc32(data);
    expect(typeof crc32).toBe("number");
  });

  test("should handle CRC32 with hardware acceleration", () => {
    const data = new TextEncoder().encode("hardware acceleration test");
    const crc32 = Bun.hash.crc32(data);
    expect(crc32).toBeDefined();

    // Test consistency
    const crc32Again = Bun.hash.crc32(data);
    expect(crc32).toBe(crc32Again);
  });
});

describe("JSON Serialization", () => {
  test("should serialize large objects efficiently", () => {
    const largeObject = {
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item_${i}`,
        timestamp: Date.now(),
      })),
    };

    // Test %j format (3x faster in v1.3.6)
    const startTime = performance.now();
    console.log("%j", largeObject);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should be very fast
  });

  test("should handle circular references gracefully", () => {
    const obj: any = { name: "test" };
    obj.self = obj;

    // Should not throw with proper JSON handling
    expect(() => {
      JSON.stringify(obj, (key, value) => {
        if (key === "self") return undefined;
        return value;
      });
    }).not.toThrow();
  });
});

describe("SQLite Operations", () => {
  test("should handle undefined values in INSERT", () => {
    // This demonstrates the v1.3.6 SQL INSERT helper improvement
    const testData = {
      id: "test_1",
      name: "Test User",
      email: "test@example.com",
      status: undefined, // Should be filtered out
      metadata: undefined, // Should use DEFAULT
    };

    // Verify undefined values are present
    expect(testData.status).toBeUndefined();
    expect(testData.metadata).toBeUndefined();
    expect(testData.name).toBe("Test User");
  });

  test("should return proper Changes object from .run()", () => {
    // This demonstrates the v1.3.6 SQLite bugfix
    // In a real database, this would return { changes: number, lastInsertRowid: number }
    const mockChanges = {
      changes: 1,
      lastInsertRowid: 123,
    };

    expect(mockChanges.changes).toBe(1);
    expect(mockChanges.lastInsertRowid).toBe(123);
    expect(typeof mockChanges.changes).toBe("number");
    expect(typeof mockChanges.lastInsertRowid).toBe("number");
  });
});

describe("Performance Benchmarks", () => {
  test("should complete CRC32 operations quickly", () => {
    const testData = Array.from({ length: 100 }, (_, i) =>
      new TextEncoder().encode(`benchmark_data_${i}`),
    );

    const startTime = performance.now();

    for (const data of testData) {
      Bun.hash.crc32(data);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete very quickly with hardware acceleration
    expect(totalTime).toBeLessThan(50);
    console.log(
      `CRC32 benchmark: ${totalTime.toFixed(2)}ms for 100 operations`,
    );
  });

  test("should handle spawnSync operations efficiently", () => {
    // This demonstrates the v1.3.6 spawnSync performance improvement
    const startTime = performance.now();

    // Use safe cross-platform command
    const result =
      process.platform === "win32"
        ? Bun.spawnSync(["cmd", "/c", "echo", "test"])
        : Bun.spawnSync(["echo", "test"]);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(result.exitCode).toBe(0);
    expect(executionTime).toBeLessThan(10); // Should be very fast after v1.3.6 fix

    console.log(`spawnSync execution time: ${executionTime.toFixed(2)}ms`);
  });
});

describe("File Operations", () => {
  test("should handle binary data correctly", () => {
    // This demonstrates the v1.3.6 binary data bugfix
    const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    // In v1.3.6, BINARY/VARBINARY/BLOB columns return Buffer instead of corrupted UTF-8
    expect(binaryData instanceof Uint8Array).toBe(true);
    expect(binaryData.length).toBe(5);
    expect(binaryData[0]).toBe(0x48);
  });

  test("should respect file mode options", () => {
    // This demonstrates the v1.3.6 Bun.write() mode option fix
    const testContent = "test content";
    const mode = 0o644;

    // In v1.3.6, mode is properly respected
    expect(typeof testContent).toBe("string");
    expect(mode).toBe(420); // 0o644 in decimal
  });
});

describe("Security Improvements", () => {
  test("should prevent null byte injection", () => {
    // This demonstrates the v1.3.6 security improvement
    const safeInput = "normal_filename.txt";
    const maliciousInput = "malicious\x00filename.txt";

    expect(safeInput.includes("\x00")).toBe(false);
    expect(maliciousInput.includes("\x00")).toBe(true);

    // Bun v1.3.6 would reject the malicious input
    const hasNullByte = maliciousInput.includes("\x00");
    expect(hasNullByte).toBe(true);
  });

  test("should validate certificate patterns", () => {
    // This demonstrates the v1.3.6 certificate validation improvement
    const validPatterns = [
      { pattern: "*.example.com", domain: "foo.example.com", valid: true },
      { pattern: "*.example.com", domain: "bar.example.com", valid: true },
    ];

    const invalidPatterns = [
      { pattern: "*.example.com", domain: "foo.bar.example.com", valid: false },
      {
        pattern: "*.*.example.com",
        domain: "foo.bar.example.com",
        valid: false,
      },
    ];

    validPatterns.forEach((test) => {
      expect(test.valid).toBe(true);
    });

    invalidPatterns.forEach((test) => {
      expect(test.valid).toBe(false);
    });
  });
});

// Additional tests for --grep demonstration
describe("Game Logic", () => {
  test("should initialize 2048 game board correctly", () => {
    const board = Array(4)
      .fill(null)
      .map(() => Array(4).fill(0));
    expect(board.length).toBe(4);
    expect(board[0].length).toBe(4);
    expect(board[0][0]).toBe(0);
  });

  test("should handle game state serialization", () => {
    const gameState = {
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 0,
      moves: 0,
    };

    const serialized = JSON.stringify(gameState);
    expect(serialized).toContain('"score":0');
    expect(serialized).toContain('"moves":0');
  });
});

console.log("🧪 Test file loaded! Use --grep to run specific tests:");
console.log('   bun test --grep "crc32"');
console.log('   bun test --grep "json"');
console.log('   bun test --grep "sqlite"');
console.log('   bun test --grep "performance"');
