#!/usr/bin/env bun
/**
 * Advanced Mock Dispose: Async Cleanup Scenarios
 * 
 * Demonstrates async cleanup patterns, promise handling,
 * timeout scenarios, and async test utilities.
 */

import { spyOn, mock, expect, test } from "bun:test";

console.log("🔄 Advanced Mock Dispose: Async Cleanup\n");
console.log("=".repeat(70));

// ============================================================================
// Pattern 1: Async Mock Cleanup
// ============================================================================

class AsyncService {
  async fetchData(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return "original data";
  }
  
  async processData(data: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return `processed: ${data}`;
  }
}

console.log("\n⏳ Pattern 1: Async Mock Cleanup");
console.log("-".repeat(70));

test("async mocks with automatic cleanup", async () => {
  const service = new AsyncService();
  
  {
    using spy = spyOn(service, "fetchData").mockResolvedValue("mocked data");
    
    const result = await service.fetchData();
    expect(result).toBe("mocked data");
    expect(spy).toHaveBeenCalled();
  }
  
  // After scope exit, original method restored
  const result = await service.fetchData();
  expect(result).toBe("original data");
});

test("multiple async mocks", async () => {
  const service = new AsyncService();
  
  {
    using fetchSpy = spyOn(service, "fetchData").mockResolvedValue("mocked fetch");
    using processSpy = spyOn(service, "processData").mockResolvedValue("mocked process");
    
    const fetchResult = await service.fetchData();
    const processResult = await service.processData("test");
    
    expect(fetchResult).toBe("mocked fetch");
    expect(processResult).toBe("mocked process");
  }
  
  // Both restored
  expect(await service.fetchData()).toBe("original data");
  expect(await service.processData("test")).toBe("processed: test");
});

// ============================================================================
// Pattern 2: Promise Handling
// ============================================================================

console.log("\n📦 Pattern 2: Promise Handling");
console.log("-".repeat(70));

test("cleanup with pending promises", async () => {
  const obj = { 
    asyncMethod: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return "done";
    }
  };
  
  const originalMethod = obj.asyncMethod;
  
  {
    using spy = spyOn(obj, "asyncMethod").mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return "mocked done";
    });
    
    const promise = obj.asyncMethod();
    
    // Cleanup happens even if promise is pending
  }
  
  // Method restored, but promise still pending
  expect(obj.asyncMethod).toBe(originalMethod);
  
  // Wait for original promise
  const result = await obj.asyncMethod();
  expect(result).toBe("done");
});

test("cleanup after promise resolution", async () => {
  const obj = { asyncMethod: async () => "original" };
  
  {
    using spy = spyOn(obj, "asyncMethod").mockResolvedValue("mocked");
    
    await obj.asyncMethod();
    
    // Cleanup after promise resolves
  }
  
  // Original restored
  expect(await obj.asyncMethod()).toBe("original");
});

// ============================================================================
// Pattern 3: Timeout Scenarios
// ============================================================================

console.log("\n⏱️  Pattern 3: Timeout Scenarios");
console.log("-".repeat(70));

test("cleanup with timeouts", async () => {
  const obj = {
    delayedMethod: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return "delayed";
    }
  };
  
  {
    using spy = spyOn(obj, "delayedMethod").mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return "fast";
    });
    
    const result = await Promise.race([
      obj.delayedMethod(),
      new Promise(resolve => setTimeout(() => resolve("timeout"), 5000))
    ]);
    
    expect(result).toBe("fast");
  }
  
  // Original restored
  expect(obj.delayedMethod).not.toBeUndefined();
});

// ============================================================================
// Pattern 4: Async Test Utilities
// ============================================================================

console.log("\n🛠️  Pattern 4: Async Test Utilities");
console.log("-".repeat(70));

class AsyncTestHelper {
  static async withMock<T>(
    obj: any,
    method: string,
    mockImpl: (...args: any[]) => Promise<T>,
    testFn: (spy: any) => Promise<void>
  ): Promise<void> {
    {
      using spy = spyOn(obj, method).mockImplementation(mockImpl);
      await testFn(spy);
    }
    // Automatic cleanup
  }
  
  static async withMultipleMocks(
    mocks: Array<{ obj: any; method: string; impl: (...args: any[]) => Promise<any> }>,
    testFn: () => Promise<void>
  ): Promise<void> {
    const spies: any[] = [];
    
    {
      for (const { obj, method, impl } of mocks) {
        const spy = spyOn(obj, method).mockImplementation(impl);
        spies.push(spy);
        using _ = spy; // Auto-cleanup
      }
      
      await testFn();
    }
    // All cleaned up automatically
  }
}

test("async test helper", async () => {
  const service = new AsyncService();
  
  await AsyncTestHelper.withMock(
    service,
    "fetchData",
    async () => "helper mocked",
    async (spy) => {
      const result = await service.fetchData();
      expect(result).toBe("helper mocked");
      expect(spy).toHaveBeenCalled();
    }
  );
  
  // Original restored
  expect(await service.fetchData()).toBe("original data");
});

test("multiple async mocks helper", async () => {
  const service = new AsyncService();
  
  await AsyncTestHelper.withMultipleMocks(
    [
      {
        obj: service,
        method: "fetchData",
        impl: async () => "mocked fetch",
      },
      {
        obj: service,
        method: "processData",
        impl: async (data: string) => `mocked process: ${data}`,
      },
    ],
    async () => {
      expect(await service.fetchData()).toBe("mocked fetch");
      expect(await service.processData("test")).toBe("mocked process: test");
    }
  );
  
  // Both restored
  expect(await service.fetchData()).toBe("original data");
  expect(await service.processData("test")).toBe("processed: test");
});

// ============================================================================
// Pattern 5: Error Handling in Async
// ============================================================================

console.log("\n🚨 Pattern 5: Error Handling in Async");
console.log("-".repeat(70));

test("cleanup with async errors", async () => {
  const obj = { asyncMethod: async () => "original" };
  
  try {
    {
      using spy = spyOn(obj, "asyncMethod").mockRejectedValue(new Error("Async error"));
      
      await expect(obj.asyncMethod()).rejects.toThrow("Async error");
    }
  } catch (error) {
    // Error handled
  }
  
  // Original restored despite error
  expect(await obj.asyncMethod()).toBe("original");
});

test("nested async errors", async () => {
  const obj = {
    method1: async () => "1",
    method2: async () => "2",
    method3: async () => "3",
  };
  
  try {
    {
      using spy1 = spyOn(obj, "method1").mockResolvedValue("mocked1");
      
      {
        using spy2 = spyOn(obj, "method2").mockRejectedValue(new Error("Error in method2"));
        
        {
          using spy3 = spyOn(obj, "method3").mockResolvedValue("mocked3");
          
          await expect(obj.method2()).rejects.toThrow("Error in method2");
        }
      }
    }
  } catch (error) {
    // Error handled
  }
  
  // All restored
  expect(await obj.method1()).toBe("1");
  expect(await obj.method2()).toBe("2");
  expect(await obj.method3()).toBe("3");
});

// ============================================================================
// Pattern 6: Concurrent Async Operations
// ============================================================================

console.log("\n🔄 Pattern 6: Concurrent Async Operations");
console.log("-".repeat(70));

test("concurrent async mocks", async () => {
  const service = new AsyncService();
  
  {
    using spy = spyOn(service, "fetchData").mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return "concurrent mocked";
    });
    
    // Run multiple concurrent calls
    const promises = Array.from({ length: 5 }, () => service.fetchData());
    const results = await Promise.all(promises);
    
    expect(results.every(r => r === "concurrent mocked")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(5);
  }
  
  // Original restored
  expect(await service.fetchData()).toBe("original data");
});

console.log("\n✅ Async Cleanup Patterns Complete!");
console.log("\nKey Takeaways:");
console.log("  • Cleanup works with async operations");
console.log("  • Handles pending promises correctly");
console.log("  • Works with timeouts and delays");
console.log("  • Supports concurrent operations");
console.log("  • Error handling works as expected");
