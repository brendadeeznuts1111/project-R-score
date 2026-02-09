/**
 * Bun v1.3.9 Test Mock Auto-Cleanup Examples
 * 
 * Demonstrates the new `using` keyword support for automatic mock cleanup
 * via Symbol.dispose. Mocks are automatically restored when they go out of scope.
 */

import { describe, test, expect, spyOn, mock, jest } from "bun:test";

// Example classes to mock
class SecureCookieManager {
  static validate(token: string): boolean {
    return token.startsWith("valid_");
  }
  
  static create(userId: string): string {
    return `token_${userId}_${Date.now()}`;
  }
}

class CSRFProtector {
  static validate(token: string, sessionId: string): boolean {
    return token.includes(sessionId);
  }
}

class APIClient {
  async fetchUser(id: string) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
  
  async createUser(data: { name: string; email: string }) {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

// Mock implementation of fetch for testing
let fetchCalls: string[] = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  fetchCalls.push(url);
  return new Response(JSON.stringify({ mock: true, url }));
};

describe("Bun v1.3.9 Mock Auto-Cleanup", () => {
  
  test("spyOn auto-cleanup with 'using' keyword", () => {
    // Get original implementation
    const originalValidate = SecureCookieManager.validate;
    
    {
      // Create spy with auto-cleanup
      using spy = spyOn(SecureCookieManager, "validate");
      spy.mockReturnValue(true);
      
      // Use the mocked method
      expect(SecureCookieManager.validate("invalid")).toBe(true);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);
      
    } // spy is automatically restored here via Symbol.dispose
    
    // Original implementation restored
    expect(SecureCookieManager.validate("invalid")).toBe(false);
    expect(SecureCookieManager.validate("valid_token")).toBe(true);
  });
  
  test("spyOn on instance method with auto-cleanup", () => {
    const client = new APIClient();
    
    {
      // Spy on instance method
      using spy = spyOn(client, "fetchUser");
      spy.mockResolvedValue({ id: "123", name: "Mocked User" });
      
      // Use mock
      const result = client.fetchUser("123");
      expect(result).resolves.toEqual({ id: "123", name: "Mocked User" });
      expect(spy).toHaveBeenCalledWith("123");
      
    } // spy automatically restored
    
    // After restore, calling the method would try to actually fetch
    // (but we won't call it to avoid network requests)
  });
  
  test("multiple mocks with auto-cleanup", () => {
    {
      using spyValidate = spyOn(SecureCookieManager, "validate");
      using spyCreate = spyOn(SecureCookieManager, "create");
      using spyCSRF = spyOn(CSRFProtector, "validate");
      
      spyValidate.mockReturnValue(true);
      spyCreate.mockReturnValue("mocked_token");
      spyCSRF.mockReturnValue(true);
      
      // All methods are mocked
      expect(SecureCookieManager.validate("anything")).toBe(true);
      expect(SecureCookieManager.create("user123")).toBe("mocked_token");
      expect(CSRFProtector.validate("x", "y")).toBe(true);
      
    } // All mocks automatically restored
    
    // Original behavior restored
    expect(SecureCookieManager.validate("invalid")).toBe(false);
    expect(SecureCookieManager.create("user123")).toMatch(/^token_user123_\d+$/);
  });
  
  test("mock with mockReturnValueOnce chaining", () => {
    {
      using spy = spyOn(SecureCookieManager, "validate");
      
      // Chain multiple return values
      spy
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);
      
      expect(SecureCookieManager.validate("test1")).toBe(false);
      expect(SecureCookieManager.validate("test2")).toBe(false);
      expect(SecureCookieManager.validate("test3")).toBe(true);
      expect(SecureCookieManager.validate("test4")).toBe(true);
      
    } // spy restored
  });
  
  test("mock implementation with mockImplementation", () => {
    {
      using spy = spyOn(SecureCookieManager, "create");
      
      let counter = 0;
      spy.mockImplementation((userId: string) => {
        counter++;
        return `custom_token_${userId}_${counter}`;
      });
      
      expect(SecureCookieManager.create("alice")).toBe("custom_token_alice_1");
      expect(SecureCookieManager.create("bob")).toBe("custom_token_bob_2");
      expect(counter).toBe(2);
      
    } // spy restored
  });
  
  test("async mock with mockResolvedValue/mockRejectedValue", async () => {
    const client = new APIClient();
    
    {
      using spy = spyOn(client, "fetchUser");
      
      spy.mockResolvedValue({ id: "123", name: "Mocked User" });
      
      const user = await client.fetchUser("123");
      expect(user).toEqual({ id: "123", name: "Mocked User" });
      expect(spy).toHaveBeenCalledWith("123");
      
    } // spy restored
  });
  
  test("spy tracking without mock modification", () => {
    {
      // Just spy, don't mock
      using spy = spyOn(SecureCookieManager, "validate");
      
      // Call the original method but track it
      const result1 = SecureCookieManager.validate("valid_token");
      const result2 = SecureCookieManager.validate("invalid");
      
      expect(result1).toBe(true);  // original behavior
      expect(result2).toBe(false); // original behavior
      expect(spy).toHaveBeenCalledTimes(2);
      
    } // spy restored
  });
  
  test("conditional mock restoration", () => {
    let shouldMock = true;
    
    {
      using spy = spyOn(SecureCookieManager, "validate");
      
      if (shouldMock) {
        spy.mockReturnValue(true);
      }
      
      expect(SecureCookieManager.validate("anything")).toBe(true);
      
      // Manual restore mid-test if needed
      spy.mockRestore();
      expect(SecureCookieManager.validate("invalid")).toBe(false);
      
    } // auto-cleanup (already restored)
  });
  
  test("nested scope cleanup", () => {
    const calls: string[] = [];
    
    // Use manual restore tracking for nested scopes
    const outerSpy = spyOn(SecureCookieManager, "validate");
    outerSpy.mockImplementation((t) => {
      calls.push(`outer:${t}`);
      return true;
    });
    
    expect(SecureCookieManager.validate("test1")).toBe(true);
    expect(calls).toContain("outer:test1");
    
    {
      // Inner scope - create new spy that overrides
      const innerSpy = spyOn(SecureCookieManager, "validate");
      innerSpy.mockImplementation((t) => {
        calls.push(`inner:${t}`);
        return false;
      });
      
      expect(SecureCookieManager.validate("test2")).toBe(false);
      expect(calls).toContain("inner:test2");
      
      // Restore inner
      innerSpy.mockRestore();
    }
    
    // Outer spy should be restored when inner is restored
    // (since they spy on the same method)
    expect(SecureCookieManager.validate("valid_token")).toBe(true);
    
    // Clean up
    outerSpy.mockRestore();
  });
});

describe("Mock Best Practices", () => {
  test("clean up even on exceptions", () => {
    const original = SecureCookieManager.validate;
    
    try {
      {
        using spy = spyOn(SecureCookieManager, "validate");
        spy.mockReturnValue(true);
        
        // Simulate error
        throw new Error("Test error");
      }
    } catch (e) {
      // Error caught, but spy should still be cleaned up
    }
    
    // Original restored despite exception
    expect(SecureCookieManager.validate).toBe(original);
  });
  
  test("spyOn Date methods", () => {
    {
      // Mock Date.now using spyOn
      using spy = spyOn(Date, "now");
      spy.mockReturnValue(1234567890000);
      
      expect(Date.now()).toBe(1234567890000);
      expect(spy).toHaveBeenCalled();
      
    } // spy restored
    
    // Should be back to normal
    expect(Date.now()).toBeGreaterThan(1234567890000);
  });
  
  test("using with explicit Symbol.dispose", () => {
    // Demonstrate how 'using' works with any disposable object
    const resources: string[] = [];
    
    {
      // Create a disposable resource
      const resource = {
        name: "test-resource",
        doSomething() {
          resources.push("did something");
        },
        [Symbol.dispose]() {
          resources.push("disposed");
        }
      };
      
      using r = resource;
      r.doSomething();
      
    } // Automatically calls r[Symbol.dispose]()
    
    expect(resources).toContain("did something");
    expect(resources).toContain("disposed");
  });
});

// Restore original fetch after all tests
fetchCalls = [];
