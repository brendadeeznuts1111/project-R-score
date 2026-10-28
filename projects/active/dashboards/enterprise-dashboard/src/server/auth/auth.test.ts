/**
 * Tests for Authentication & RBAC module
 */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import {
  Permissions,
  ALL_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  ROUTE_PERMISSIONS,
  getRoutePermission,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isValidPermission,
  filterValidPermissions,
} from "./permissions";
import {
  createApiKey,
  validateApiKey,
  listApiKeys,
  revokeKey,
  deleteKey,
  hasAnyApiKeys,
  hasAdminKey,
} from "./api-keys";
import {
  extractApiKey,
  authenticate,
  unauthorizedResponse,
  forbiddenResponse,
  checkPermission,
} from "./middleware";
import type { AuthContext, Permission } from "../../types";

// =============================================================================
// Permission Tests
// =============================================================================

describe("Permissions", () => {
  test("Permissions object contains all expected permissions", () => {
    expect(Permissions.ADMIN).toBe("admin");
    expect(Permissions.URLPATTERN_READ).toBe("urlpattern:read");
    expect(Permissions.URLPATTERN_WRITE).toBe("urlpattern:write");
    expect(Permissions.DATABASE_READ).toBe("database:read");
    expect(Permissions.DATABASE_WRITE).toBe("database:write");
    expect(Permissions.SYSTEM_READ).toBe("system:read");
    expect(Permissions.SYSTEM_WRITE).toBe("system:write");
    expect(Permissions.PTY_ACCESS).toBe("pty:access");
    expect(Permissions.PROJECTS_READ).toBe("projects:read");
    expect(Permissions.PROJECTS_WRITE).toBe("projects:write");
  });

  test("ALL_PERMISSIONS contains all permission values", () => {
    expect(ALL_PERMISSIONS).toContain("admin");
    expect(ALL_PERMISSIONS).toContain("urlpattern:read");
    expect(ALL_PERMISSIONS).toContain("database:write");
    expect(ALL_PERMISSIONS.length).toBe(10);
  });

  test("READ_ONLY_PERMISSIONS contains only read permissions", () => {
    expect(READ_ONLY_PERMISSIONS).toContain("urlpattern:read");
    expect(READ_ONLY_PERMISSIONS).toContain("database:read");
    expect(READ_ONLY_PERMISSIONS).not.toContain("urlpattern:write");
    expect(READ_ONLY_PERMISSIONS).not.toContain("admin");
  });
});

describe("getRoutePermission", () => {
  test("returns correct permission for urlpattern routes", () => {
    expect(getRoutePermission("urlpattern", "GET")).toBe("urlpattern:read");
    expect(getRoutePermission("urlpattern", "POST")).toBe("urlpattern:write");
    expect(getRoutePermission("urlpattern", "DELETE")).toBe("urlpattern:write");
  });

  test("returns correct permission for database routes", () => {
    expect(getRoutePermission("db", "GET")).toBe("database:read");
    expect(getRoutePermission("db", "POST")).toBe("database:write");
    expect(getRoutePermission("database", "GET")).toBe("database:read");
  });

  test("returns correct permission for system routes", () => {
    expect(getRoutePermission("system", "GET")).toBe("system:read");
    expect(getRoutePermission("system", "PUT")).toBe("system:write");
  });

  test("returns correct permission for pty routes", () => {
    expect(getRoutePermission("pty", "GET")).toBe("pty:access");
    expect(getRoutePermission("pty", "POST")).toBe("pty:access");
  });

  test("returns correct permission for projects routes", () => {
    expect(getRoutePermission("projects", "GET")).toBe("projects:read");
    expect(getRoutePermission("projects", "PATCH")).toBe("projects:write");
  });

  test("returns admin permission for admin routes", () => {
    expect(getRoutePermission("admin", "GET")).toBe("admin");
    expect(getRoutePermission("admin", "POST")).toBe("admin");
  });

  test("returns null for public routes", () => {
    expect(getRoutePermission("dashboard", "GET")).toBeNull();
    expect(getRoutePermission("health", "GET")).toBeNull();
  });

  test("returns null for unknown groups", () => {
    expect(getRoutePermission("unknown", "GET")).toBeNull();
    expect(getRoutePermission(null, "GET")).toBeNull();
  });
});

describe("hasPermission", () => {
  test("admin permission grants access to everything", () => {
    const permissions: Permission[] = ["admin"];
    expect(hasPermission(permissions, "urlpattern:read")).toBe(true);
    expect(hasPermission(permissions, "database:write")).toBe(true);
    expect(hasPermission(permissions, "system:read")).toBe(true);
  });

  test("specific permission grants access to that resource", () => {
    const permissions: Permission[] = ["urlpattern:read", "database:read"];
    expect(hasPermission(permissions, "urlpattern:read")).toBe(true);
    expect(hasPermission(permissions, "database:read")).toBe(true);
    expect(hasPermission(permissions, "urlpattern:write")).toBe(false);
    expect(hasPermission(permissions, "admin")).toBe(false);
  });

  test("empty permissions denies everything", () => {
    const permissions: Permission[] = [];
    expect(hasPermission(permissions, "urlpattern:read")).toBe(false);
    expect(hasPermission(permissions, "admin")).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  test("admin has all permissions", () => {
    const permissions: Permission[] = ["admin"];
    expect(hasAllPermissions(permissions, ["urlpattern:read", "database:write"])).toBe(true);
  });

  test("returns true only when all permissions are present", () => {
    const permissions: Permission[] = ["urlpattern:read", "urlpattern:write"];
    expect(hasAllPermissions(permissions, ["urlpattern:read", "urlpattern:write"])).toBe(true);
    expect(hasAllPermissions(permissions, ["urlpattern:read", "database:read"])).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  test("admin has any permission", () => {
    const permissions: Permission[] = ["admin"];
    expect(hasAnyPermission(permissions, ["urlpattern:read"])).toBe(true);
  });

  test("returns true when at least one permission matches", () => {
    const permissions: Permission[] = ["urlpattern:read"];
    expect(hasAnyPermission(permissions, ["urlpattern:read", "database:read"])).toBe(true);
    expect(hasAnyPermission(permissions, ["database:read", "system:read"])).toBe(false);
  });
});

describe("isValidPermission", () => {
  test("validates correct permissions", () => {
    expect(isValidPermission("admin")).toBe(true);
    expect(isValidPermission("urlpattern:read")).toBe(true);
    expect(isValidPermission("database:write")).toBe(true);
  });

  test("rejects invalid permissions", () => {
    expect(isValidPermission("invalid")).toBe(false);
    expect(isValidPermission("")).toBe(false);
    expect(isValidPermission("admin:read")).toBe(false);
  });
});

describe("filterValidPermissions", () => {
  test("filters out invalid permissions", () => {
    const input = ["admin", "invalid", "urlpattern:read", "foo:bar"];
    const result = filterValidPermissions(input);
    expect(result).toEqual(["admin", "urlpattern:read"]);
  });

  test("returns empty array when all invalid", () => {
    const input = ["invalid", "foo", "bar"];
    const result = filterValidPermissions(input);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// Middleware Tests
// =============================================================================

describe("extractApiKey", () => {
  test("extracts key from Authorization Bearer header", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer eda_testkey123" },
    });
    expect(extractApiKey(req)).toBe("eda_testkey123");
  });

  test("extracts key from X-API-Key header", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "X-API-Key": "eda_testkey456" },
    });
    expect(extractApiKey(req)).toBe("eda_testkey456");
  });

  test("prefers Authorization header over X-API-Key", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        Authorization: "Bearer eda_auth_key",
        "X-API-Key": "eda_xapi_key",
      },
    });
    expect(extractApiKey(req)).toBe("eda_auth_key");
  });

  test("returns null when no key present", () => {
    const req = new Request("http://localhost/api/test");
    expect(extractApiKey(req)).toBeNull();
  });

  test("returns null for non-Bearer authorization", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(extractApiKey(req)).toBeNull();
  });
});

describe("unauthorizedResponse", () => {
  test("returns 401 response with correct body", async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  test("accepts custom message", async () => {
    const response = unauthorizedResponse("Custom error message");
    const body = await response.json();
    expect(body.error).toBe("Custom error message");
  });
});

describe("forbiddenResponse", () => {
  test("returns 403 response with correct body", async () => {
    const response = forbiddenResponse("Permission denied");
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("Permission denied");
  });
});

describe("checkPermission", () => {
  test("returns null when authenticated with correct permission", () => {
    const auth: AuthContext = {
      isAuthenticated: true,
      apiKeyId: "test-id",
      permissions: ["urlpattern:read"],
      isAdmin: false,
    };
    expect(checkPermission(auth, "urlpattern:read")).toBeNull();
  });

  test("returns null for admin", () => {
    const auth: AuthContext = {
      isAuthenticated: true,
      apiKeyId: "admin-id",
      permissions: ["admin"],
      isAdmin: true,
    };
    expect(checkPermission(auth, "urlpattern:read")).toBeNull();
    expect(checkPermission(auth, "database:write")).toBeNull();
  });

  test("returns 401 when not authenticated", () => {
    const auth: AuthContext = {
      isAuthenticated: false,
      permissions: [],
      isAdmin: false,
    };
    const response = checkPermission(auth, "urlpattern:read");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  test("returns 403 when missing permission", () => {
    const auth: AuthContext = {
      isAuthenticated: true,
      apiKeyId: "test-id",
      permissions: ["urlpattern:read"],
      isAdmin: false,
    };
    const response = checkPermission(auth, "database:write");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });
});

// =============================================================================
// API Keys Tests (Integration)
// =============================================================================

describe("API Keys", () => {
  let testKeyId: string;
  let testKeyValue: string;

  test("createApiKey generates key with eda_ prefix", async () => {
    const result = await createApiKey({
      name: "Test Key",
      permissions: ["urlpattern:read", "database:read"],
    });

    expect(result.key).toMatch(/^eda_[A-Za-z0-9]+$/);
    expect(result.id).toBeDefined();
    expect(result.prefix).toMatch(/^eda_[A-Za-z0-9]{8}$/);

    testKeyId = result.id;
    testKeyValue = result.key;
  });

  test("validateApiKey returns valid result for correct key", async () => {
    const validation = await validateApiKey(testKeyValue);

    expect(validation.valid).toBe(true);
    expect(validation.apiKey).toBeDefined();
    expect(validation.apiKey?.id).toBe(testKeyId);
    expect(validation.apiKey?.permissions).toContain("urlpattern:read");
  });

  test("validateApiKey returns invalid for wrong key", async () => {
    const validation = await validateApiKey("eda_invalidkey123");
    expect(validation.valid).toBe(false);
    expect(validation.apiKey).toBeUndefined();
  });

  test("listApiKeys returns created key", () => {
    const keys = listApiKeys();
    const found = keys.find((k) => k.id === testKeyId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Test Key");
  });

  test("hasAnyApiKeys returns true when keys exist", () => {
    expect(hasAnyApiKeys()).toBe(true);
  });

  test("revokeKey marks key as revoked", () => {
    revokeKey(testKeyId);
    const keys = listApiKeys(false); // Active only
    const found = keys.find((k) => k.id === testKeyId);
    expect(found).toBeUndefined();
  });

  test("validateApiKey returns invalid for revoked key", async () => {
    const validation = await validateApiKey(testKeyValue);
    expect(validation.valid).toBe(false);
  });

  test("deleteKey removes key from database", () => {
    deleteKey(testKeyId);
    const keys = listApiKeys(true); // Include revoked
    const found = keys.find((k) => k.id === testKeyId);
    expect(found).toBeUndefined();
  });
});

// =============================================================================
// Authentication Flow Tests
// =============================================================================

describe("authenticate", () => {
  let adminKeyValue: string;

  beforeAll(async () => {
    // Create an admin key for testing
    const result = await createApiKey({
      name: "Auth Test Admin",
      permissions: ALL_PERMISSIONS,
    });
    adminKeyValue = result.key;
  });

  test("returns authenticated context for valid key", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: `Bearer ${adminKeyValue}` },
    });
    
    const auth = await authenticate(req);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.permissions.length).toBeGreaterThan(0);
  });

  test("returns unauthenticated context for missing key", async () => {
    const req = new Request("http://localhost/api/test");
    
    const auth = await authenticate(req);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.permissions).toEqual([]);
  });

  test("returns unauthenticated context for invalid key", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer eda_invalid_key_12345" },
    });
    
    const auth = await authenticate(req);
    expect(auth.isAuthenticated).toBe(false);
  });

  afterAll(() => {
    // Cleanup
    const keys = listApiKeys();
    const testKey = keys.find((k) => k.name === "Auth Test Admin");
    if (testKey) {
      deleteKey(testKey.id);
    }
  });
});
