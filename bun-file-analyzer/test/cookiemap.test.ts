import { describe, it, expect, beforeEach } from "bun:test";
import { CookieManager } from "../src/api/cookie-manager";

describe("Bun.CookieMap Full API", () => {
  let manager: CookieManager;
  
  beforeEach(() => {
    manager = new CookieManager();
  });
  
  it("implements Map-like interface", () => {
    // set
    manager.set("test", "value", { maxAge: 3600 });
    expect(manager.has("test")).toBe(true);
    
    // get
    expect(manager.get("test")).toBe("value");
    
    // size
    expect(manager.size).toBe(1);
    
    // entries
    const entries = Array.from(manager.entries());
    expect(entries).toEqual([["test", "value"]]);
    
    // keys
    const keys = Array.from(manager.keys());
    expect(keys).toEqual(["test"]);
    
    // values
    const values = Array.from(manager.values());
    expect(values).toEqual(["value"]);
    
    // forEach
    let iterated = false;
    manager.forEach((value, key) => {
      expect(key).toBe("test");
      expect(value).toBe("value");
      iterated = true;
    });
    expect(iterated).toBe(true);
    
    // toJSON
    expect(manager.toJSON()).toEqual({ test: "value" });
    
    // delete
    manager.delete("test");
    expect(manager.has("test")).toBe(false);
    expect(manager.size).toBe(0);
  });
  
  it("serializes and deserializes", () => {
    manager.setSession("abc123");
    manager.setAnalytics(5);
    
    const serialized = manager.serialize();
    const restored = CookieManager.deserialize(serialized);
    
    expect(restored.getSession()).toBe("abc123");
    expect(restored.getAnalytics()).toBe(5);
  });
  
  it("handles delete with options", () => {
    manager.set("test", "value", { path: "/api" });
    
    // Delete with matching path
    manager.delete("test", { path: "/api" });
    expect(manager.has("test")).toBe(false);
    
    // Delete non-existent
    manager.delete("nonexistent");
    expect(manager.has("nonexistent")).toBe(false);
  });
  
  it("debug logs with Bun.color", () => {
    manager.set("sessionId", "abc123def456", { httpOnly: true });
    manager.set("color", "hsl(210,90%,55%)", { maxAge: 3600 });
    
    // Should not throw
    expect(() => manager.debug("Test cookies")).not.toThrow();
  });

  it("supports Symbol.iterator for for...of loops", () => {
    manager.set("cookie1", "value1");
    manager.set("cookie2", "value2");
    
    const entries: [string, string][] = [];
    for (const [name, value] of manager) {
      entries.push([name, value]);
    }
    
    expect(entries).toEqual([
      ["cookie1", "value1"],
      ["cookie2", "value2"]
    ]);
  });

  it("handles session management correctly", () => {
    const sessionId = "session-abc-123";
    
    // Set session
    manager.setSession(sessionId);
    expect(manager.getSession()).toBe(sessionId);
    
    // Clear session
    manager.clearSession();
    expect(manager.getSession() || null).toBe(null);
  });

  it("handles analytics tracking correctly", () => {
    // Initial analytics should be 0
    expect(manager.getAnalytics()).toBe(0);
    
    // Set analytics
    manager.setAnalytics(10);
    expect(manager.getAnalytics()).toBe(10);
    
    // Increment analytics
    manager.setAnalytics(manager.getAnalytics() + 1);
    expect(manager.getAnalytics()).toBe(11);
  });

  it("generates header strings correctly", () => {
    manager.set("session", "abc123");
    manager.set("analytics", "5");
    
    const headerString = manager.toHeaderString();
    expect(headerString).toContain("session=abc123");
    expect(headerString).toContain("analytics=5");
    expect(headerString).toContain("; ");
  });

  it("generates Set-Cookie headers correctly", () => {
    manager.set("test", "value", { 
      httpOnly: true, 
      secure: true, 
      maxAge: 3600 
    });
    
    const headers = manager.getSetCookieHeaders();
    expect(headers.length).toBe(1);
    expect(headers[0]).toContain("test=value");
  });

  it("handles HMR restoration", () => {
    // Create a manager with some cookies
    const originalManager = new CookieManager();
    originalManager.setSession("test-session");
    originalManager.setAnalytics(42);
    
    // Simulate HMR data
    const hmrData = {
      cookieManager: {
        jar: originalManager.jar,
        timestamp: Date.now(),
      }
    };
    
    // Create new manager with HMR restoration
    const newManager = new CookieManager();
    
    // Manually trigger HMR restoration (simulated)
    if (hmrData.cookieManager) {
      const savedJar = hmrData.cookieManager.jar;
      for (const [name, value] of savedJar.entries()) {
        newManager.jar.set(name, value);
      }
    }
    
    expect(newManager.getSession()).toBe("test-session");
    expect(newManager.getAnalytics()).toBe(42);
  });

  it("handles initial cookies from array", () => {
    const initialCookies = ["sessionId=abc123", "fileViews=5"];
    const manager = new CookieManager(initialCookies);
    
    expect(manager.getSession()).toBe("abc123");
    expect(manager.getAnalytics()).toBe(5);
  });

  it("handles empty initial cookies", () => {
    const manager = new CookieManager([]);
    expect(manager.size).toBe(0);
  });

  it("handles undefined initial cookies", () => {
    const manager = new CookieManager(undefined);
    expect(manager.size).toBe(0);
  });
});
