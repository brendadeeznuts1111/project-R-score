import { describe, expect, test } from "bun:test";
import {
  ALL_PERMISSIONS,
  Permissions,
  ROUTE_GROUP_NAMES,
  ROUTE_PERMISSIONS,
  filterValidPermissions,
  getRoutePermission,
  hasPermission,
} from "./permissions";

describe("enterprise dashboard permission contract", () => {
  test("covers every route group with an explicit decision", () => {
    expect(Object.keys(ROUTE_PERMISSIONS).sort()).toEqual([...ROUTE_GROUP_NAMES].sort());
  });

  test("includes the KYC permissions consumed by server routes", () => {
    expect(ALL_PERMISSIONS).toContain(Permissions.KYC_EXECUTE);
    expect(ALL_PERMISSIONS).toContain(Permissions.KYC_REVIEW);
    expect(ALL_PERMISSIONS).toContain(Permissions.KYC_ADMIN);
    expect(filterValidPermissions(["kyc:review", "not:a-permission"])).toEqual([
      "kyc:review",
    ]);
  });

  test("maps protected read and write operations", () => {
    expect(getRoutePermission("database", "GET")).toBe(Permissions.DATABASE_READ);
    expect(getRoutePermission("database", "POST")).toBe(Permissions.DATABASE_WRITE);
    expect(getRoutePermission("kyc", "GET")).toBe(Permissions.KYC_REVIEW);
    expect(getRoutePermission("kyc", "DELETE")).toBe(Permissions.KYC_EXECUTE);
    expect(getRoutePermission("export", "POST")).toBe(Permissions.SYSTEM_WRITE);
    expect(getRoutePermission("logs", "GET")).toBe(Permissions.SYSTEM_READ);
  });

  test("fails closed for fallback, absent, unknown, and unsupported operations", () => {
    expect(getRoutePermission("api", "GET")).toBe(Permissions.ADMIN);
    expect(getRoutePermission(null, "GET")).toBe(Permissions.ADMIN);
    expect(getRoutePermission("unmapped", "GET")).toBe(Permissions.ADMIN);
    expect(getRoutePermission("dashboard", "TRACE")).toBe(Permissions.ADMIN);
  });

  test("admin grants all permissions while ordinary keys remain scoped", () => {
    expect(hasPermission([Permissions.ADMIN], Permissions.KYC_ADMIN)).toBe(true);
    expect(hasPermission([Permissions.KYC_REVIEW], Permissions.KYC_EXECUTE)).toBe(false);
  });
});
