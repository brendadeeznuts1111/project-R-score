/** Explicit, default-deny RBAC policy for enterprise dashboard routes. */

import type { Permission } from "../../types";

export const ROUTE_GROUP_NAMES = [
  "api", "dashboard", "healthCheck", "projects", "snapshots", "network",
  "database", "system", "debug", "admin", "metrics", "serverMetrics",
  "analytics", "anomalies", "session", "uiState", "configs", "export",
  "logs", "topology", "pty", "urlpattern", "peek-cache", "kyc", "cli",
  "benchmarks", "tests",
] as const;

export type RouteGroup = (typeof ROUTE_GROUP_NAMES)[number];

export const Permissions = {
  ADMIN: "admin",
  URLPATTERN_READ: "urlpattern:read",
  URLPATTERN_WRITE: "urlpattern:write",
  DATABASE_READ: "database:read",
  DATABASE_WRITE: "database:write",
  SYSTEM_READ: "system:read",
  SYSTEM_WRITE: "system:write",
  PTY_ACCESS: "pty:access",
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  KYC_EXECUTE: "kyc:execute",
  KYC_REVIEW: "kyc:review",
  KYC_ADMIN: "kyc:admin",
} as const satisfies Record<string, Permission>;

export const ALL_PERMISSIONS: Permission[] = Object.values(Permissions);

export const READ_ONLY_PERMISSIONS: Permission[] = [
  Permissions.URLPATTERN_READ,
  Permissions.DATABASE_READ,
  Permissions.SYSTEM_READ,
  Permissions.PROJECTS_READ,
  Permissions.KYC_REVIEW,
];

type RoutePermissionPair = Readonly<{
  read: Permission | null;
  write: Permission | null;
}>;

const PUBLIC: RoutePermissionPair = { read: null, write: null };
const ADMIN_ONLY: RoutePermissionPair = {
  read: Permissions.ADMIN,
  write: Permissions.ADMIN,
};

/**
 * Every typed route group must make an explicit public/protected decision.
 * `api` is the fallback for otherwise-unmapped `/api/*` routes and is therefore
 * admin-only. Adding a RouteGroup without adding policy here is a type error.
 */
export const ROUTE_PERMISSIONS = {
  api: ADMIN_ONLY,
  dashboard: PUBLIC,
  healthCheck: PUBLIC,
  projects: { read: Permissions.PROJECTS_READ, write: Permissions.PROJECTS_WRITE },
  snapshots: PUBLIC,
  network: PUBLIC,
  database: { read: Permissions.DATABASE_READ, write: Permissions.DATABASE_WRITE },
  system: { read: Permissions.SYSTEM_READ, write: Permissions.SYSTEM_WRITE },
  debug: ADMIN_ONLY,
  admin: ADMIN_ONLY,
  metrics: PUBLIC,
  serverMetrics: PUBLIC,
  analytics: PUBLIC,
  anomalies: PUBLIC,
  session: PUBLIC,
  uiState: PUBLIC,
  configs: PUBLIC,
  export: { read: Permissions.SYSTEM_READ, write: Permissions.SYSTEM_WRITE },
  logs: { read: Permissions.SYSTEM_READ, write: Permissions.SYSTEM_WRITE },
  topology: PUBLIC,
  pty: { read: Permissions.PTY_ACCESS, write: Permissions.PTY_ACCESS },
  urlpattern: { read: Permissions.URLPATTERN_READ, write: Permissions.URLPATTERN_WRITE },
  "peek-cache": { read: Permissions.URLPATTERN_READ, write: Permissions.URLPATTERN_WRITE },
  kyc: { read: Permissions.KYC_REVIEW, write: Permissions.KYC_EXECUTE },
  cli: PUBLIC,
  benchmarks: { read: Permissions.SYSTEM_READ, write: Permissions.SYSTEM_WRITE },
  tests: { read: Permissions.SYSTEM_READ, write: Permissions.SYSTEM_WRITE },
} as const satisfies Record<RouteGroup, RoutePermissionPair>;

const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Unknown groups and methods require admin instead of falling open. */
export function getRoutePermission(group: string | null, method: string): Permission | null {
  if (!group || !Object.hasOwn(ROUTE_PERMISSIONS, group)) return Permissions.ADMIN;

  const mapping = ROUTE_PERMISSIONS[group as RouteGroup];
  const normalizedMethod = method.toUpperCase();
  if (READ_METHODS.has(normalizedMethod)) return mapping.read;
  if (WRITE_METHODS.has(normalizedMethod)) return mapping.write;
  return Permissions.ADMIN;
}

export function hasPermission(permissions: readonly Permission[], required: Permission): boolean {
  return permissions.includes(Permissions.ADMIN) || permissions.includes(required);
}

export function hasAllPermissions(
  permissions: readonly Permission[],
  required: readonly Permission[],
): boolean {
  return permissions.includes(Permissions.ADMIN) || required.every((value) => permissions.includes(value));
}

export function hasAnyPermission(
  permissions: readonly Permission[],
  required: readonly Permission[],
): boolean {
  return permissions.includes(Permissions.ADMIN) || required.some((value) => permissions.includes(value));
}

export function isValidPermission(permission: string): permission is Permission {
  return ALL_PERMISSIONS.includes(permission as Permission);
}

export function filterValidPermissions(permissions: readonly string[]): Permission[] {
  return permissions.filter(isValidPermission);
}
