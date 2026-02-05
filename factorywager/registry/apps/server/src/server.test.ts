#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";

// Mock server routes for testing
function matchRoute(method: string, path: string): string | null {
  // Special routes first
  if (method === "GET" && path === "/-/whoami") return "whoami";
  if (method === "GET" && path === "/-/v1/search") return "searchPackages";
  
  // DELETE with filename
  if (method === "DELETE" && /\/[^/]+\/\-\/[^/]+$/.test(path)) {
    return "unpublishPackage";
  }
  
  // PUT for publish (single path segment)
  if (method === "PUT") {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 1 || (parts.length === 2 && parts[0].startsWith("@"))) {
      return "publishPackage";
    }
  }
  
  // GET - need to distinguish between package and version
  if (method === "GET") {
    const parts = path.split("/").filter(Boolean);
    
    // Unscoped: /pkg -> getPackage, /pkg/1.0.0 -> getVersion
    // Scoped: /@scope/pkg -> getPackage, /@scope/pkg/1.0.0 -> getVersion
    
    if (parts.length === 1) {
      return "getPackage"; // /lodash
    }
    
    if (parts.length === 2) {
      if (parts[0].startsWith("@")) {
        return "getPackage"; // /@scope/pkg
      }
      // Check if second part looks like a version
      if (/^\d+\.\d+\.\d+/.test(parts[1])) {
        return "getVersion"; // /lodash/1.0.0
      }
      return null;
    }
    
    if (parts.length === 3 && parts[0].startsWith("@")) {
      // /@scope/pkg/1.0.0
      if (/^\d+\.\d+\.\d+/.test(parts[2])) {
        return "getVersion";
      }
      return null;
    }
  }
  
  return null;
}

function validatePackageName(name: string): boolean {
  // Unscoped: package-name
  // Scoped: @scope/package-name
  return /^(@[a-z0-9-]+\/)?[a-z0-9-]+$/i.test(name);
}

function validateVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/i.test(version);
}

describe("Registry Server", () => {
  describe("routing", () => {
    it("should match GET package route", () => {
      expect(matchRoute("GET", "/lodash")).toBe("getPackage");
      expect(matchRoute("GET", "/@factorywager/core")).toBe("getPackage");
    });

    it("should match GET version route", () => {
      expect(matchRoute("GET", "/lodash/4.17.21")).toBe("getVersion");
      expect(matchRoute("GET", "/@scope/pkg/1.0.0")).toBe("getVersion");
    });

    it("should match PUT publish route", () => {
      expect(matchRoute("PUT", "/my-package")).toBe("publishPackage");
      expect(matchRoute("PUT", "/@scope/pkg")).toBe("publishPackage");
    });

    it("should match DELETE unpublish route", () => {
      expect(matchRoute("DELETE", "/pkg/-/pkg-1.0.0.tgz")).toBe("unpublishPackage");
    });

    it("should match search route", () => {
      expect(matchRoute("GET", "/-/v1/search")).toBe("searchPackages");
    });

    it("should match whoami route", () => {
      expect(matchRoute("GET", "/-/whoami")).toBe("whoami");
    });

    it("should return null for unknown routes", () => {
      expect(matchRoute("GET", "/unknown/path/here")).toBeNull();
      expect(matchRoute("POST", "/lodash")).toBeNull();
    });
  });

  describe("validation", () => {
    it("should validate package names", () => {
      expect(validatePackageName("lodash")).toBe(true);
      expect(validatePackageName("@factorywager/core")).toBe(true);
      expect(validatePackageName("@scope/package-name")).toBe(true);
      expect(validatePackageName("")).toBe(false);
      expect(validatePackageName("@/invalid")).toBe(false);
    });

    it("should validate semantic versions", () => {
      expect(validateVersion("1.0.0")).toBe(true);
      expect(validateVersion("2.3.4")).toBe(true);
      expect(validateVersion("1.0.0-beta.1")).toBe(true);
      expect(validateVersion("1.0")).toBe(false);
      expect(validateVersion("invalid")).toBe(false);
    });
  });
});
