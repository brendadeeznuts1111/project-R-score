/**
 * Tests for Hot Reload Manager
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { HotReloadManager, createHotReloadManager } from "./hot-reload-manager";

describe("HotReloadManager", () => {
  let manager: HotReloadManager;

  beforeEach(() => {
    manager = new HotReloadManager();
  });

  afterEach(() => {
    manager = null as any;
  });

  describe("constructor", () => {
    it("should create manager instance", () => {
      expect(manager).toBeInstanceOf(HotReloadManager);
    });

    it("should initialize with empty callbacks", () => {
      expect(manager["callbacks"].size).toBe(0);
      expect(manager["disposalCallbacks"].size).toBe(0);
    });
  });

  describe("callback management", () => {
    it("should register callbacks", () => {
      const callback = mock(() => {});
      
      manager.onCallback("test", callback);
      
      expect(manager["callbacks"].has("test")).toBe(true);
    });

    it("should remove callbacks", () => {
      const callback = mock(() => {});
      
      manager.onCallback("test", callback);
      manager.removeCallback("test");
      
      expect(manager["callbacks"].has("test")).toBe(false);
    });
  });

  describe("data management", () => {
    it("should get and set data", () => {
      const testData = { key: "value" };
      
      manager.setData(testData);
      const result = manager.getData();
      
      expect(result).toEqual(testData);
    });
  });

  describe("disposal callbacks", () => {
    it("should register disposal callbacks", () => {
      const callback = mock(() => {});
      
      manager.onDispose(callback);
      
      expect(manager["disposalCallbacks"].has(callback)).toBe(true);
    });
  });

  describe("hot reload availability", () => {
    it("should check hot reload availability", () => {
      const isAvailable = manager.isHotReloadAvailable();
      expect(typeof isAvailable).toBe("boolean");
    });
  });
});

describe("createHotReloadManager", () => {
  it("should create HotReloadManager instance", () => {
    const manager = createHotReloadManager();
    
    expect(manager).toBeInstanceOf(HotReloadManager);
  });

  it("should pass options to constructor", () => {
    const options = { acceptSelf: false };
    
    const manager = createHotReloadManager(options);
    
    expect(manager).toBeInstanceOf(HotReloadManager);
  });
});
