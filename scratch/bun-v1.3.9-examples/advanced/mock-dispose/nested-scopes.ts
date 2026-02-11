#!/usr/bin/env bun
/**
 * Advanced Mock Dispose Patterns: Nested Scopes
 * 
 * Demonstrates multiple nested scopes, scope inheritance,
 * cleanup ordering, error scenarios, and performance considerations.
 */

import { spyOn, mock, expect, test, describe } from "bun:test";

console.log("🎭 Advanced Mock Dispose: Nested Scopes\n");
console.log("=".repeat(70));

// ============================================================================
// Pattern 1: Multiple Nested Scopes
// ============================================================================

class Service {
  async fetchData(): Promise<string> {
    return "original data";
  }
  
  async processData(data: string): Promise<string> {
    return `processed: ${data}`;
  }
  
  async saveData(data: string): Promise<void> {
    // Save logic
  }
}

console.log("\n📦 Pattern 1: Multiple Nested Scopes");
console.log("-".repeat(70));

test("nested scopes with multiple mocks", () => {
  const service = new Service();
  
  // Outer scope
  {
    using outerSpy = spyOn(service, "fetchData").mockResolvedValue("outer data");
    
    expect(service.fetchData()).resolves.toBe("outer data");
    
    // Middle scope
    {
      using middleSpy = spyOn(service, "processData").mockResolvedValue("middle processed");
      
      expect(service.processData("test")).resolves.toBe("middle processed");
      
      // Inner scope
      {
        using innerSpy = spyOn(service, "saveData").mockResolvedValue(undefined);
        
        expect(service.saveData("test")).resolves.toBeUndefined();
        
        // All three mocks active
        expect(outerSpy).toHaveBeenCalled();
        expect(middleSpy).toHaveBeenCalled();
        expect(innerSpy).toHaveBeenCalled();
      }
      
      // Inner spy restored, middle still active
      // service.saveData would call original
    }
    
    // Middle spy restored, outer still active
    // service.processData would call original
  }
  
  // All spies restored
  // All methods call original implementations
});

// ============================================================================
// Pattern 2: Scope Inheritance
// ============================================================================

class BaseService {
  baseMethod(): string {
    return "base";
  }
}

class DerivedService extends BaseService {
  derivedMethod(): string {
    return "derived";
  }
}

console.log("\n🔗 Pattern 2: Scope Inheritance");
console.log("-".repeat(70));

test("scope inheritance with class hierarchy", () => {
  const service = new DerivedService();
  
  {
    using baseSpy = spyOn(BaseService.prototype, "baseMethod").mockReturnValue("mocked base");
    using derivedSpy = spyOn(service, "derivedMethod").mockReturnValue("mocked derived");
    
    expect(service.baseMethod()).toBe("mocked base");
    expect(service.derivedMethod()).toBe("mocked derived");
  }
  
  // Both restored
  expect(service.baseMethod()).toBe("base");
  expect(service.derivedMethod()).toBe("derived");
});

// ============================================================================
// Pattern 3: Cleanup Ordering
// ============================================================================

console.log("\n🔄 Pattern 3: Cleanup Ordering");
console.log("-".repeat(70));

test("cleanup happens in reverse order", () => {
  const cleanupOrder: string[] = [];
  
  class Mockable {
    method1() { return "1"; }
    method2() { return "2"; }
    method3() { return "3"; }
  }
  
  const obj = new Mockable();
  
  {
    using spy1 = spyOn(obj, "method1").mockReturnValue("mocked1");
    spy1[Symbol.dispose] = function() {
      cleanupOrder.push("spy1");
      spyOn.getMockRestore().call(this);
    };
    
    {
      using spy2 = spyOn(obj, "method2").mockReturnValue("mocked2");
      spy2[Symbol.dispose] = function() {
        cleanupOrder.push("spy2");
        spyOn.getMockRestore().call(this);
      };
      
      {
        using spy3 = spyOn(obj, "method3").mockReturnValue("mocked3");
        spy3[Symbol.dispose] = function() {
          cleanupOrder.push("spy3");
          spyOn.getMockRestore().call(this);
        };
      }
      // spy3 disposed first
    }
    // spy2 disposed second
  }
  // spy1 disposed last
  
  // Cleanup happens in reverse order: spy3, spy2, spy1
  expect(cleanupOrder).toEqual(["spy3", "spy2", "spy1"]);
});

// ============================================================================
// Pattern 4: Error Scenarios
// ============================================================================

console.log("\n⚠️  Pattern 4: Error Scenarios");
console.log("-".repeat(70));

test("cleanup happens even on exceptions", () => {
  const obj = { method: () => "original" };
  const originalMethod = obj.method;
  
  try {
    {
      using spy = spyOn(obj, "method").mockReturnValue("mocked");
      
      expect(obj.method()).toBe("mocked");
      
      // Simulate error
      throw new Error("Test error");
    }
  } catch (error) {
    // Error caught, but spy should still be cleaned up
  }
  
  // Original method restored despite exception
  expect(obj.method).toBe(originalMethod);
  expect(obj.method()).toBe("original");
});

test("nested errors with cleanup", () => {
  const obj = { 
    method1: () => "1",
    method2: () => "2",
    method3: () => "3",
  };
  
  const originalMethods = {
    method1: obj.method1,
    method2: obj.method2,
    method3: obj.method3,
  };
  
  try {
    {
      using spy1 = spyOn(obj, "method1").mockReturnValue("mocked1");
      
      {
        using spy2 = spyOn(obj, "method2").mockReturnValue("mocked2");
        
        {
          using spy3 = spyOn(obj, "method3").mockReturnValue("mocked3");
          
          // Error in innermost scope
          throw new Error("Inner error");
        }
      }
    }
  } catch (error) {
    // All spies should be cleaned up
  }
  
  // All methods restored
  expect(obj.method1).toBe(originalMethods.method1);
  expect(obj.method2).toBe(originalMethods.method2);
  expect(obj.method3).toBe(originalMethods.method3);
});

// ============================================================================
// Pattern 5: Performance Considerations
// ============================================================================

console.log("\n⚡ Pattern 5: Performance Considerations");
console.log("-".repeat(70));

test("performance: many nested scopes", () => {
  const obj = { method: () => "original" };
  
  const start = performance.now();
  
  // Create many nested scopes
  for (let i = 0; i < 100; i++) {
    {
      using spy = spyOn(obj, "method").mockReturnValue(`mocked${i}`);
      // Spy automatically cleaned up
    }
  }
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`\n100 nested scopes: ${duration.toFixed(2)}ms`);
  console.log(`Average per scope: ${(duration / 100).toFixed(3)}ms`);
  
  // Original should still work
  expect(obj.method()).toBe("original");
});

test("performance: deep nesting", () => {
  const obj = { method: () => "original" };
  
  const start = performance.now();
  
  // Deep nesting
  let depth = 0;
  function createNested(d: number) {
    if (d >= 50) return;
    
    {
      using spy = spyOn(obj, "method").mockReturnValue(`depth${d}`);
      depth = d;
      createNested(d + 1);
    }
  }
  
  createNested(0);
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`\n50 levels deep: ${duration.toFixed(2)}ms`);
  
  // Original should still work
  expect(obj.method()).toBe("original");
});

// ============================================================================
// Pattern 6: Complex Scenarios
// ============================================================================

console.log("\n🔀 Pattern 6: Complex Scenarios");
console.log("-".repeat(70));

test("multiple objects with nested scopes", () => {
  const obj1 = { method: () => "obj1" };
  const obj2 = { method: () => "obj2" };
  const obj3 = { method: () => "obj3" };
  
  {
    using spy1 = spyOn(obj1, "method").mockReturnValue("mocked1");
    
    {
      using spy2 = spyOn(obj2, "method").mockReturnValue("mocked2");
      
      {
        using spy3 = spyOn(obj3, "method").mockReturnValue("mocked3");
        
        expect(obj1.method()).toBe("mocked1");
        expect(obj2.method()).toBe("mocked2");
        expect(obj3.method()).toBe("mocked3");
      }
      
      expect(obj1.method()).toBe("mocked1");
      expect(obj2.method()).toBe("mocked2");
      expect(obj3.method()).toBe("obj3"); // Restored
    }
    
    expect(obj1.method()).toBe("mocked1");
    expect(obj2.method()).toBe("obj2"); // Restored
    expect(obj3.method()).toBe("obj3");
  }
  
  // All restored
  expect(obj1.method()).toBe("obj1");
  expect(obj2.method()).toBe("obj2");
  expect(obj3.method()).toBe("obj3");
});

test("conditional cleanup", () => {
  const obj = { method: () => "original" };
  let shouldCleanup = true;
  
  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    
    expect(obj.method()).toBe("mocked");
    
    // Conditional cleanup
    if (shouldCleanup) {
      // Normal cleanup via scope exit
    } else {
      // Manual cleanup
      spy.mockRestore();
    }
  }
  
  // Should be restored
  expect(obj.method()).toBe("original");
});

console.log("\n✅ Nested Scopes Patterns Complete!");
console.log("\nKey Takeaways:");
console.log("  • Cleanup happens automatically in reverse order");
console.log("  • Works even with exceptions");
console.log("  • Supports deep nesting");
console.log("  • Minimal performance overhead");
console.log("  • Works with multiple objects");
