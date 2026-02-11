#!/usr/bin/env bun
/**
 * Framework Integration for Mock Dispose
 * 
 * Demonstrates integration with test frameworks, custom matchers,
 * test lifecycle hooks, and framework-specific patterns.
 */

import { spyOn, mock, expect, test, describe, beforeEach, afterEach } from "bun:test";

console.log("🔌 Framework Integration for Mock Dispose\n");
console.log("=".repeat(70));

// ============================================================================
// Pattern 1: Test Framework Integration
// ============================================================================

class TestFramework {
  private mocks: any[] = [];
  
  beforeEach(fn: () => void) {
    // Setup before each test
    fn();
  }
  
  afterEach(fn: () => void) {
    // Cleanup after each test
    fn();
  }
  
  test(name: string, fn: () => void | Promise<void>) {
    // Run test with automatic cleanup
    return test(name, async () => {
      try {
        await fn();
      } finally {
        // All mocks cleaned up automatically via Symbol.dispose
        this.mocks = [];
      }
    });
  }
  
  spy<T extends object>(obj: T, method: keyof T, impl?: (...args: any[]) => any) {
    const s = spyOn(obj, method as string);
    if (impl) {
      s.mockImplementation(impl);
    }
    this.mocks.push(s);
    return s;
  }
}

console.log("\n🧪 Pattern 1: Test Framework Integration");
console.log("-".repeat(70));

const framework = new TestFramework();

framework.test("framework integration", () => {
  const obj = { method: () => "original" };
  
  {
    using spy = framework.spy(obj, "method", () => "framework mocked");
    expect(obj.method()).toBe("framework mocked");
  }
  
  expect(obj.method()).toBe("original");
});

// ============================================================================
// Pattern 2: Custom Matchers
// ============================================================================

console.log("\n🎯 Pattern 2: Custom Matchers");
console.log("-".repeat(70));

interface CustomMatchers {
  toBeRestored(): { pass: boolean; message: () => string };
  toHaveBeenCalledWithMock(): { pass: boolean; message: () => string };
}

// Extend expect with custom matchers
declare module "bun:test" {
  interface Matchers {
    toBeRestored(): void;
    toHaveBeenCalledWithMock(): void;
  }
}

// Custom matcher implementation would go here
// For demo, we'll show the pattern

test("custom matcher pattern", () => {
  const obj = { method: () => "original" };
  const original = obj.method;
  
  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }
  
  // Custom matcher would verify restoration
  expect(obj.method).toBe(original);
});

// ============================================================================
// Pattern 3: Test Lifecycle Hooks
// ============================================================================

console.log("\n🔄 Pattern 3: Test Lifecycle Hooks");
console.log("-".repeat(70));

describe("Lifecycle Hooks", () => {
  const obj = { method: () => "original" };
  
  beforeEach(() => {
    // Setup before each test
    // Mocks will be created in each test
  });
  
  afterEach(() => {
    // Cleanup happens automatically via Symbol.dispose
    // No manual cleanup needed!
  });
  
  test("test 1", () => {
    {
      using spy = spyOn(obj, "method").mockReturnValue("mocked1");
      expect(obj.method()).toBe("mocked1");
    }
  });
  
  test("test 2", () => {
    {
      using spy = spyOn(obj, "method").mockReturnValue("mocked2");
      expect(obj.method()).toBe("mocked2");
    }
  });
});

// ============================================================================
// Pattern 4: Test Suites with Shared Mocks
// ============================================================================

console.log("\n📦 Pattern 4: Test Suites with Shared Mocks");
console.log("-".repeat(70));

describe("Shared Mock Suite", () => {
  class Service {
    async fetch() { return "original"; }
    async process() { return "processed"; }
  }
  
  const service = new Service();
  
  describe("with mocked fetch", () => {
    test("test 1", async () => {
      {
        using spy = spyOn(service, "fetch").mockResolvedValue("mocked");
        expect(await service.fetch()).toBe("mocked");
      }
    });
    
    test("test 2", async () => {
      {
        using spy = spyOn(service, "fetch").mockResolvedValue("mocked");
        expect(await service.fetch()).toBe("mocked");
      }
    });
  });
  
  describe("with mocked process", () => {
    test("test 1", async () => {
      {
        using spy = spyOn(service, "process").mockResolvedValue("mocked process");
        expect(await service.process()).toBe("mocked process");
      }
    });
  });
});

// ============================================================================
// Pattern 5: Parameterized Tests
// ============================================================================

console.log("\n📋 Pattern 5: Parameterized Tests");
console.log("-".repeat(70));

const testCases = [
  { input: "test1", expected: "mocked1" },
  { input: "test2", expected: "mocked2" },
  { input: "test3", expected: "mocked3" },
];

testCases.forEach(({ input, expected }) => {
  test(`parameterized test: ${input}`, () => {
    const obj = { method: (x: string) => `original: ${x}` };
    
    {
      using spy = spyOn(obj, "method").mockReturnValue(expected);
      expect(obj.method(input)).toBe(expected);
    }
    
    expect(obj.method(input)).toBe(`original: ${input}`);
  });
});

// ============================================================================
// Pattern 6: Test Utilities Integration
// ============================================================================

console.log("\n🔧 Pattern 6: Test Utilities Integration");
console.log("-".repeat(70));

class TestSuite {
  private spies: any[] = [];
  
  mock<T extends object>(obj: T, method: keyof T, impl?: (...args: any[]) => any) {
    const spy = spyOn(obj, method as string);
    if (impl) {
      spy.mockImplementation(impl);
    }
    this.spies.push(spy);
    return spy;
  }
  
  async runTest(fn: () => void | Promise<void>): Promise<void> {
    try {
      await fn();
    } finally {
      // Cleanup happens automatically, but we can verify
      this.spies = [];
    }
  }
}

const suite = new TestSuite();

await suite.runTest(async () => {
  const obj = { method: () => "original" };
  
  {
    using spy = suite.mock(obj, "method", () => "suite mocked");
    expect(obj.method()).toBe("suite mocked");
  }
  
  expect(obj.method()).toBe("original");
});

console.log("\n✅ Framework Integration Complete!");
console.log("\nIntegration Points:");
console.log("  • Test lifecycle hooks (beforeEach/afterEach)");
console.log("  • Custom matchers");
console.log("  • Test suites and nesting");
console.log("  • Parameterized tests");
console.log("  • Shared test utilities");
console.log("  • Framework-specific patterns");
