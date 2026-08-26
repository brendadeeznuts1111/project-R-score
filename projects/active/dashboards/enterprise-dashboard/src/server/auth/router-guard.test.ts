import { describe, expect, test } from "bun:test";
import type { AuthContext } from "../../types";
import { checkRouteGuard } from "./route-guard";
import { Permissions } from "./permissions";

const anonymous: AuthContext = {
  isAuthenticated: false,
  permissions: [],
  isAdmin: false,
};

const admin: AuthContext = {
  isAuthenticated: true,
  permissions: [Permissions.ADMIN],
  isAdmin: true,
};

describe("enterprise dashboard route guard", () => {
  test("treats an unknown API path as the protected fallback group", () => {
    const url = new URL("http://localhost/api/new-unmapped-surface");
    const group = "api";
    expect(checkRouteGuard({ url, method: "GET", group, isDevelopment: false, auth: anonymous })).toEqual({
      allowed: false,
      status: 401,
      message: "Authentication required",
    });
    expect(checkRouteGuard({ url, method: "GET", group, isDevelopment: false, auth: admin })).toEqual({
      allowed: true,
    });
  });

  test("denies an API URL when its group is missing", () => {
    const url = new URL("http://localhost/api/missing-group");
    expect(checkRouteGuard({ url, method: "GET", group: null, isDevelopment: false, auth: admin })).toEqual({
      allowed: false,
      status: 404,
      message: "API route is not mapped",
    });
  });

  test("keeps explicitly public routes public for supported methods", () => {
    const url = new URL("http://localhost/api/dashboard");
    expect(checkRouteGuard({ url, method: "GET", group: "dashboard", isDevelopment: false, auth: anonymous })).toEqual({
      allowed: true,
    });
  });

  test("does not treat an unsupported method as a public read", () => {
    const url = new URL("http://localhost/api/dashboard");
    expect(checkRouteGuard({ url, method: "TRACE", group: "dashboard", isDevelopment: false, auth: anonymous })).toEqual({
      allowed: false,
      status: 401,
      message: "Authentication required",
    });
  });

  test("enforces KYC review and execute permissions", () => {
    const url = new URL("http://localhost/api/kyc/review-queue");
    const reviewer: AuthContext = {
      isAuthenticated: true,
      permissions: [Permissions.KYC_REVIEW],
      isAdmin: false,
    };
    expect(checkRouteGuard({ url, method: "GET", group: "kyc", isDevelopment: false, auth: reviewer })).toEqual({
      allowed: true,
    });
    expect(checkRouteGuard({ url, method: "POST", group: "kyc", isDevelopment: false, auth: reviewer })).toEqual({
      allowed: false,
      status: 403,
      message: "Permission 'kyc:execute' required",
    });
  });
});
