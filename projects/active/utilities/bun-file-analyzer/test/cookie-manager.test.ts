import { describe, it, expect, beforeEach } from "bun:test";
import { CookieManager } from "../src/api/cookie-manager";

describe("Bun.CookieMap Full API", () => {
  let manager: CookieManager;
  
  beforeEach(() => {
    manager = new CookieManager();
  });
  
  it("implements Map-like interface", () => {
    manager.set("test", "value", { maxAge: 3600 });
    expect(manager.has("test")).toBe(true);
    expect(manager.get("test")).toBe("value");
    expect(manager.size).toBe(1);
    
    const entries = Array.from(manager.entries());
    expect(entries).toEqual([["test", "value"]]);
    
    const keys = Array.from(manager.keys());
    expect(keys).toEqual(["test"]);
    
    const values = Array.from(manager.values());
    expect(values).toEqual(["value"]);
    
    let iterated = false;
    manager.forEach((value, key) => {
      expect(key).toBe("test");
      expect(value).toBe("value");
      iterated = true;
    });
    expect(iterated).toBe(true);
    
    expect(manager.toJSON()).toEqual({ test: "value" });
    
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
    manager.delete("test", { path: "/api" });
    expect(manager.has("test")).toBe(false);
    
    manager.delete("nonexistent");
    expect(manager.has("nonexistent")).toBe(false);
  });
  
  it("debug logs with Bun.color", () => {
    manager.set("sessionId", "abc123def456", { httpOnly: true });
    manager.set("color", "hsl(210,90%,55%)", { maxAge: 3600 });
    expect(() => manager.debug("Test cookies")).not.toThrow();
  });
});
