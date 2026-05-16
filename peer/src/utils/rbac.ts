import type { AppRole } from "../types/app";
import type { Permission } from "../org-model";

export type Capability =
  | "session:write"
  | "deposit:create"
  | "deposit:manage"
  | "approval:act"
  | "approval:request"
  | "member:write"
  | "invite:write"
  | "funds:write"
  | "compliance:view"
  | "audit:export"
  | "settings:write"
  | "advanced:write";

const CAPABILITY_MATRIX: Record<AppRole, Capability[]> = {
  Admin: [
    "session:write",
    "deposit:create",
    "deposit:manage",
    "approval:act",
    "approval:request",
    "member:write",
    "invite:write",
    "funds:write",
    "compliance:view",
    "audit:export",
    "settings:write",
    "advanced:write",
  ],
  Operator: [
    "session:write",
    "deposit:create",
    "deposit:manage",
    "approval:request",
    "funds:write",
    "compliance:view",
    "advanced:write",
  ],
  Compliance: [
    "session:write",
    "approval:act",
    "approval:request",
    "compliance:view",
    "audit:export",
  ],
  Viewer: ["compliance:view"],
};

/** Returns true when the selected UI role can access the given capability. */
export function canAccess(role: AppRole, capability: Capability): boolean {
  return CAPABILITY_MATRIX[role].includes(capability);
}

const CAPABILITY_PERMISSIONS: Record<Capability, Permission[]> = {
  "session:write": ["team:read"],
  "deposit:create": ["peer:execute"],
  "deposit:manage": ["peer:execute"],
  "approval:act": ["approvals:manage"],
  "approval:request": ["team:read"],
  "member:write": ["team:write"],
  "invite:write": ["invites:manage"],
  "funds:write": ["funds:write"],
  "compliance:view": ["team:read"],
  "audit:export": ["approvals:manage"],
  "settings:write": ["auth:manage"],
  "advanced:write": ["peer:execute"],
};

/** Returns true when authoritative server session claims grant the given capability. */
export function canAccessWithSession(
  permissions: string[],
  capability: Capability,
): boolean {
  if (permissions.length === 0) {
    return false;
  }

  return CAPABILITY_PERMISSIONS[capability].some((permission) => permissions.includes(permission));
}

/** Maps server-issued permissions into a stable enterprise access profile for display copy. */
export function deriveAppRoleFromSession(
  permissions: string[],
  memberRole?: string | null,
): AppRole {
  if (permissions.includes("auth:manage") || permissions.includes("invites:manage") || permissions.includes("team:delete")) {
    return "Admin";
  }

  if (permissions.includes("approvals:manage") && !permissions.includes("peer:execute")) {
    return "Compliance";
  }

  if (permissions.includes("peer:execute")) {
    return "Operator";
  }

  if (memberRole === "finance") {
    return "Compliance";
  }

  return "Viewer";
}

/** Human-readable policy text for section gating. */
export function capabilityCopy(capability: Capability): string {
  switch (capability) {
    case "approval:act":
      return "Requires Admin or Compliance role.";
    case "settings:write":
      return "Requires Admin role.";
    case "member:write":
    case "invite:write":
      return "Requires Admin privileges.";
    case "deposit:create":
    case "deposit:manage":
      return "Requires Operator or Admin privileges.";
    default:
      return "This surface is limited by the selected role.";
  }
}
