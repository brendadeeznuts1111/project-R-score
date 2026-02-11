#!/usr/bin/env bun
/**
 * Bun v1.3.9: Test Mock Auto-Cleanup Demo
 * 
 * Demonstrates automatic mock cleanup using Symbol.dispose with 'using' keyword
 */

import { describe, test, expect, spyOn, mock, beforeEach, afterEach } from "bun:test";

console.log("🧪 Bun v1.3.9: Test Mock Auto-Cleanup Demo\n");

// Example service for demonstration
class UserService {
  static async fetchUser(id: number): Promise<{ id: number; name: string }> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

class Logger {
  static log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  static error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

describe("Bun v1.3.9 Mock Auto-Cleanup Patterns", () => {
  
  // ============================================================================
  // Pattern 1: Basic Auto-Cleanup with 'using'
  // ============================================================================
  describe("Pattern 1: Basic Auto-Cleanup", () => {
    
    test("spy auto-restores after scope exit", () => {
      const obj = { method: () => "original" };
      
      {
        using spy = spyOn(obj, "method").mockReturnValue("mocked");
        expect(obj.method()).toBe("mocked");
        expect(spy).toHaveBeenCalledTimes(1);
      } // ← spy automatically restored here
      
      expect(obj.method()).toBe("original");
    });

    test("mock function auto-restores", () => {
      const fn = mock(() => "original");
      
      {
        using _mock = fn;
        fn.mockReturnValue("mocked");
        expect(fn()).toBe("mocked");
      } // ← mock automatically restored
      
      // After scope exit, mock is restored
      fn();
      expect(fn).toHaveBeenCalledTimes(1); // Only counted during mock scope
    });
  });

  // ============================================================================
  // Pattern 2: Multiple Mocks in Same Scope
  // ============================================================================
  describe("Pattern 2: Multiple Mocks in Scope", () => {
    
    test("multiple mocks auto-cleanup together", async () => {
      const originalFetch = globalThis.fetch;
      const originalDateNow = Date.now;
      
      {
        using mockFetch = mock(globalThis, "fetch");
        using mockDateNow = mock(Date, "now");
        
        mockFetch.mockResolvedValue(new Response('{"id": 1, "name": "Test"}'));
        mockDateNow.mockReturnValue(1234567890);
        
        const user = await UserService.fetchUser(1);
        const now = Date.now();
        
        expect(user).toEqual({ id: 1, name: "Test" });
        expect(now).toBe(1234567890);
        expect(mockFetch).toHaveBeenCalledWith("/api/users/1");
      } // ← Both mocks restored here
      
      // Verify restoration
      expect(globalThis.fetch).toBe(originalFetch);
      expect(Date.now).toBe(originalDateNow);
    });

    test("nested scopes with different mocks", () => {
      const obj1 = { fn: () => "obj1" };
      const obj2 = { fn: () => "obj2" };
      
      {
        using spy1 = spyOn(obj1, "fn").mockReturnValue("mocked1");
        expect(obj1.fn()).toBe("mocked1");
        
        {
          using spy2 = spyOn(obj2, "fn").mockReturnValue("mocked2");
          expect(obj1.fn()).toBe("mocked1"); // Still active
          expect(obj2.fn()).toBe("mocked2");
        } // ← spy2 restored
        
        expect(obj1.fn()).toBe("mocked1"); // Still active
        expect(obj2.fn()).toBe("obj2"); // Restored
      } // ← spy1 restored
      
      expect(obj1.fn()).toBe("obj1");
      expect(obj2.fn()).toBe("obj2");
    });
  });

  // ============================================================================
  // Pattern 3: Exception Safety
  // ============================================================================
  describe("Pattern 3: Exception Safety", () => {
    
    test("mock restores even when exception thrown", () => {
      const obj = { method: () => "original" };
      
      try {
        using spy = spyOn(obj, "method").mockReturnValue("mocked");
        expect(obj.method()).toBe("mocked");
        throw new Error("Test error");
      } catch (e) {
        // Exception caught
      }
      
      // Mock should be restored even after exception
      expect(obj.method()).toBe("original");
    });

    test("all mocks restore when one throws", async () => {
      const obj1 = { fn: () => "obj1" };
      const obj2 = { fn: () => "obj2" };
      
      try {
        using spy1 = spyOn(obj1, "fn").mockReturnValue("mock1");
        using spy2 = spyOn(obj2, "fn").mockImplementation(() => {
          throw new Error("Mock error");
        });
        
        obj1.fn();
        obj2.fn(); // Throws
      } catch (e) {
        // Both should be restored
      }
      
      expect(obj1.fn()).toBe("obj1");
      expect(obj2.fn()).toBe("obj2");
    });
  });

  // ============================================================================
  // Pattern 4: Real-World Service Testing
  // ============================================================================
  describe("Pattern 4: Real-World Service Testing", () => {
    
    test("UserService with mocked fetch", async () => {
      using mockFetch = mock(globalThis, "fetch");
      
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 42, name: "John Doe" }))
      );
      
      const user = await UserService.fetchUser(42);
      
      expect(user).toEqual({ id: 42, name: "John Doe" });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/users/42");
    });

    test("multiple service calls with different responses", async () => {
      using mockFetch = mock(globalThis, "fetch");
      
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 2 })))
        .mockRejectedValueOnce(new Error("Network error"));
      
      const user1 = await UserService.fetchUser(1);
      expect(user1.id).toBe(1);
      
      const user2 = await UserService.fetchUser(2);
      expect(user2.id).toBe(2);
      
      await expect(UserService.fetchUser(3)).rejects.toThrow("Network error");
    });

    test("Logger methods spied and restored", () => {
      const originalLog = console.log;
      
      using logSpy = spyOn(console, "log");
      using errorSpy = spyOn(console, "error");
      
      Logger.log("test message");
      Logger.error("test error");
      
      expect(logSpy).toHaveBeenCalledWith("[LOG] test message");
      expect(errorSpy).toHaveBeenCalledWith("[ERROR] test error");
    });
  });

  // ============================================================================
  // Pattern 5: Migration from Manual Cleanup
  // ============================================================================
  describe("Pattern 5: Before/After Comparison", () => {
    
    // BEFORE: Manual cleanup with beforeEach/afterEach
    describe("OLD: Manual Cleanup Pattern", () => {
      let fetchSpy: ReturnType<typeof spyOn>;
      let dateSpy: ReturnType<typeof spyOn>;
      
      beforeEach(() => {
        fetchSpy = spyOn(globalThis, "fetch");
        dateSpy = spyOn(Date, "now");
      });
      
      afterEach(() => {
        fetchSpy.mockRestore();
        dateSpy.mockRestore();
      });
      
      test("example with manual cleanup", () => {
        fetchSpy.mockReturnValue(Promise.resolve(new Response("{}")));
        dateSpy.mockReturnValue(12345);
        // Test code...
      });
    });

    // AFTER: Automatic cleanup with 'using'
    describe("NEW: Auto-Cleanup Pattern", () => {
      test("example with auto-cleanup", async () => {
        using fetchSpy = spyOn(globalThis, "fetch");
        using dateSpy = spyOn(Date, "now");
        
        fetchSpy.mockReturnValue(Promise.resolve(new Response("{}")));
        dateSpy.mockReturnValue(12345);
        
        // Test code...
        await globalThis.fetch("/test");
        expect(fetchSpy).toHaveBeenCalled();
        
      } // ← Automatic cleanup here
      );
    });
  });
});

// ============================================================================
// Summary Output
// ============================================================================
console.log(`
${"=".repeat(70)}
📝 MIGRATION GUIDE: Manual → Auto-Cleanup
${"=".repeat(70)}

BEFORE (v1.3.8 and earlier):
───────────────────────────
import { describe, test, beforeEach, afterEach, spyOn } from "bun:test";

describe("MyService", () => {
  let spy: ReturnType<typeof spyOn>;
  
  beforeEach(() => {
    spy = spyOn(MyService, "method");
  });
  
  afterEach(() => {
    spy.mockRestore();  // Manual cleanup required
  });
  
  test("example", () => {
    spy.mockReturnValue("mocked");
    // Test code...
  });
});

AFTER (v1.3.9+):
────────────────
import { describe, test, spyOn } from "bun:test";

describe("MyService", () => {
  test("example", () => {
    using spy = spyOn(MyService, "method");
    spy.mockReturnValue("mocked");
    // Test code...
  } // ← Automatic cleanup! No afterEach needed
  );
});

KEY BENEFITS:
✓ Less boilerplate code
✓ No manual cleanup needed
✓ Exception-safe (cleans up even on errors)
✓ Scope-based (cleans up when leaving block)
✓ Works with spyOn() and mock()

SUPPORTED METHODS:
• spyOn(object, "method") - Spy on existing methods
• mock(() => {}) - Create mock functions
• mock(object, "method") - Mock existing methods

MANUAL CLEANUP STILL AVAILABLE:
• spy.mockRestore() - Explicit restore
• spy[Symbol.dispose]() - Same as mockRestore()
`);
