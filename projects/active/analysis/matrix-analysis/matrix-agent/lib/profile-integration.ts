/**
 * Matrix Agent - Profile System Integration
 * Integrates with nolarose-mcp-config profile management
 */

import { join } from "path";
import { homedir } from "os";

const PROFILES_DIR = join(homedir(), ".matrix/profiles");

export interface Profile {
  name: string;
  version: string;
  created?: string;
  author?: string;
  description?: string;
  environment?: string;
  env: Record<string, string>;
  team?: {
    name: string;
    role?: string;
  };
}

export interface ProfileListItem {
  name: string;
  version: string;
  environment: string;
  description: string;
}

/**
 * Get the profiles directory path
 */
export function getProfilesDir(): string {
  return PROFILES_DIR;
}

/**
 * List all available profiles
 */
export async function listProfiles(): Promise<ProfileListItem[]> {
  try {
    const glob = new Bun.Glob("*.json");
    const profiles: ProfileListItem[] = [];

    for await (const file of glob.scan({ cwd: PROFILES_DIR, absolute: false })) {
      const name = file.replace(/\.json$/, "");
      const profile = await loadProfile(name);
      if (profile) {
        profiles.push({
          name: profile.name,
          version: profile.version,
          environment: profile.environment || profile.env.NODE_ENV || "unknown",
          description: profile.description || "",
        });
      }
    }

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/**
 * Load a specific profile
 */
export async function loadProfile(name: string): Promise<Profile | null> {
  try {
    const profilePath = join(PROFILES_DIR, `${name}.json`);
    const file = Bun.file(profilePath);

    if (!(await file.exists())) {
      return null;
    }

    return await file.json() as Profile;
  } catch {
    return null;
  }
}

/**
 * Get currently active profile from environment
 */
export function getActiveProfile(): string | null {
  return process.env.MATRIX_PROFILE_NAME || null;
}

/**
 * Resolve environment variable references in profile
 */
export function resolveEnvRefs(env: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  const varPattern = /\$\{([^}]+)\}/g;

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") {
      resolved[key] = String(value);
      continue;
    }

    resolved[key] = value.replace(varPattern, (match, varName) => {
      const envValue = process.env[varName];
      return envValue !== undefined ? envValue : match;
    });
  }

  return resolved;
}

/**
 * Check if profile has unresolved variable references
 */
export function getUnresolvedRefs(env: Record<string, string>): string[] {
  const varPattern = /\$\{([^}]+)\}/g;
  const unresolved: string[] = [];

  for (const value of Object.values(env)) {
    if (typeof value !== "string") continue;

    for (const match of value.matchAll(varPattern)) {
      const varName = match[1];
      if (process.env[varName] === undefined) {
        unresolved.push(varName);
      }
    }
  }

  return [...new Set(unresolved)];
}

/**
 * Apply profile environment variables
 */
export function applyProfileEnv(profile: Profile): Record<string, string> {
  const envVars = {
    ...profile.env,
    NODE_ENV: profile.environment || profile.env.NODE_ENV || "development",
    MATRIX_PROFILE_NAME: profile.name,
    MATRIX_PROFILE_VERSION: profile.version,
    MATRIX_PROFILE_ENV: profile.environment || profile.env.NODE_ENV || "development",
  };

  return resolveEnvRefs(envVars);
}

/**
 * Get profile statistics
 */
export async function getProfileStats(): Promise<{
  total: number;
  environments: Record<string, number>;
}> {
  const profiles = await listProfiles();
  const environments: Record<string, number> = {};

  for (const profile of profiles) {
    const env = profile.environment || "unknown";
    environments[env] = (environments[env] || 0) + 1;
  }

  return {
    total: profiles.length,
    environments,
  };
}
