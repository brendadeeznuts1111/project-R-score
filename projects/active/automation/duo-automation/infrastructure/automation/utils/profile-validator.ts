// profile-validator.ts - Validate Matrix profiles
import type { MatrixProfile } from "../types.js";

export function validateProfile(profile: unknown): profile is MatrixProfile {
  if (typeof profile !== "object" || profile === null) {
    return false;
  }

  const p = profile as Record<string, any>;

  // Validate env (optional, but if present should be object)
  if (p.env !== undefined && typeof p.env !== "object") {
    return false;
  }

  // Validate mobile (optional, but if present should have correct structure)
  if (p.mobile !== undefined) {
    if (typeof p.mobile !== "object" || p.mobile === null) {
      return false;
    }

    // Validate apps array if present
    if (p.mobile.apps !== undefined) {
      if (!Array.isArray(p.mobile.apps)) {
        return false;
      }

      for (const app of p.mobile.apps) {
        if (typeof app !== "object" || app === null) {
          return false;
        }
        if (typeof app.name !== "string" || typeof app.package !== "string") {
          return false;
        }
      }
    }

    // Validate permissions array if present
    if (p.mobile.permissions !== undefined) {
      if (!Array.isArray(p.mobile.permissions)) {
        return false;
      }
      if (!p.mobile.permissions.every((p: any) => typeof p === "string")) {
        return false;
      }
    }
  }

  return true;
}

export function validateAndNormalizeProfile(profile: unknown): MatrixProfile {
  if (!validateProfile(profile)) {
    throw new Error("Invalid profile structure");
  }

  return profile as MatrixProfile;
}
