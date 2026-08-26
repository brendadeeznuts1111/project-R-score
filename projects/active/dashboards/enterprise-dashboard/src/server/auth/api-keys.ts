/**
 * API Key management for RBAC authentication
 *
 * Keys are stored with Argon2id hashing (via Bun.password)
 * Key format: eda_<32 random bytes base62 encoded>
 */

import type {
  Permission,
  ApiKey,
  CreateApiKeyOptions,
  CreateApiKeyResult,
  ApiKeyValidation,
} from "../../types";
import {
  insertApiKey,
  getApiKeyByHash,
  getApiKeyById,
  getAllApiKeys,
  getActiveApiKeys,
  updateApiKeyLastUsed,
  updateApiKeyPermissions,
  revokeApiKey as dbRevokeApiKey,
  deleteApiKey as dbDeleteApiKey,
  type ApiKeyRecord,
} from "../db";
import { ALL_PERMISSIONS, filterValidPermissions } from "./permissions";

// Key prefix for identification
const KEY_PREFIX = "eda_";

// Base62 alphabet for key encoding
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a cryptographically secure random key
 */
function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Convert to base62
  let result = "";
  for (const byte of bytes) {
    result += BASE62[byte % 62];
  }

  return KEY_PREFIX + result;
}

/**
 * Extract the prefix from a key for identification
 */
function extractKeyPrefix(key: string): string {
  // Return first 12 characters (eda_ + 8 chars)
  return key.slice(0, 12);
}

/**
 * Hash an API key using Argon2id
 */
async function hashKey(key: string): Promise<string> {
  return await Bun.password.hash(key, {
    algorithm: "argon2id",
    memoryCost: 19456, // 19 MB
    timeCost: 2,
  });
}

/**
 * Verify a key against a stored hash
 */
async function verifyKey(key: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(key, hash);
}

/**
 * Convert database record to ApiKey type
 */
function parseStoredPermissions(value: string): Permission[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return filterValidPermissions(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

type StoredApiKeyRecord = Omit<ApiKeyRecord, "key_hash" | "revoked_at"> & {
  revoked_at?: number | null;
};

function parseStoredMetadata(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function recordToApiKey(record: StoredApiKeyRecord): ApiKey {
  return {
    id: record.id,
    keyPrefix: record.key_prefix,
    name: record.name,
    permissions: parseStoredPermissions(record.permissions),
    createdAt: record.created_at,
    expiresAt: record.expires_at ?? undefined,
    lastUsedAt: record.last_used_at ?? undefined,
    revokedAt: "revoked_at" in record ? record.revoked_at ?? undefined : undefined,
    metadata: parseStoredMetadata(record.metadata),
  };
}

/**
 * Create a new API key
 */
export async function createApiKey(
  options: CreateApiKeyOptions
): Promise<CreateApiKeyResult> {
  const rawKey = generateRawKey();
  const keyHash = await hashKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const id = Bun.randomUUIDv7();

  // Validate and filter permissions
  const validPermissions = filterValidPermissions(options.permissions);

  insertApiKey({
    id,
    keyHash,
    keyPrefix,
    name: options.name,
    permissions: validPermissions,
    expiresAt: options.expiresAt,
    metadata: options.metadata,
  });

  return {
    key: rawKey,
    id,
    prefix: keyPrefix,
  };
}

/**
 * Create an API key from a raw key string (for bootstrap)
 * This allows setting ADMIN_API_KEY env var to a specific value
 */
export async function createApiKeyFromRaw(
  rawKey: string,
  options: Omit<CreateApiKeyOptions, "permissions"> & { permissions?: Permission[] }
): Promise<CreateApiKeyResult> {
  // Ensure key has proper prefix
  const key = rawKey.startsWith(KEY_PREFIX) ? rawKey : KEY_PREFIX + rawKey;
  const keyHash = await hashKey(key);
  const keyPrefix = extractKeyPrefix(key);
  const id = Bun.randomUUIDv7();

  const permissions = options.permissions
    ? filterValidPermissions(options.permissions)
    : [...ALL_PERMISSIONS];

  insertApiKey({
    id,
    keyHash,
    keyPrefix,
    name: options.name,
    permissions,
    expiresAt: options.expiresAt,
    metadata: options.metadata,
  });

  return {
    key,
    id,
    prefix: keyPrefix,
  };
}

/**
 * Validate an API key and return its details
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  if (!key || typeof key !== "string") {
    return { valid: false, error: "Invalid key format" };
  }

  // Get all active keys and check against each hash
  // This is necessary because we can't reverse the hash to look up by key
  const activeKeys = getActiveApiKeys();

  for (const record of activeKeys) {
    // Get full record with hash for verification
    const fullRecord = getApiKeyById(record.id);
    if (!fullRecord) continue;

    const isValid = await verifyKey(key, fullRecord.key_hash);
    if (isValid) {
      // Check expiration
      if (fullRecord.expires_at && fullRecord.expires_at < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: "API key has expired" };
      }

      // Update last used timestamp (async, don't wait)
      updateApiKeyLastUsed(fullRecord.id);

      return {
        valid: true,
        apiKey: recordToApiKey(fullRecord),
      };
    }
  }

  return { valid: false, error: "Invalid API key" };
}

/**
 * Find an API key by its raw value (for bootstrap check)
 */
export async function findApiKeyByRawKey(rawKey: string): Promise<ApiKey | null> {
  const key = rawKey.startsWith(KEY_PREFIX) ? rawKey : KEY_PREFIX + rawKey;
  const allKeys = getAllApiKeys();

  for (const record of allKeys) {
    const fullRecord = getApiKeyById(record.id);
    if (!fullRecord) continue;

    const isValid = await verifyKey(key, fullRecord.key_hash);
    if (isValid) {
      return recordToApiKey(fullRecord);
    }
  }

  return null;
}

/**
 * Get an API key by ID
 */
export function getApiKey(id: string): ApiKey | null {
  const record = getApiKeyById(id);
  if (!record) return null;
  return recordToApiKey(record);
}

/**
 * List all API keys (without sensitive data)
 */
export function listApiKeys(includeRevoked = false): ApiKey[] {
  const records = includeRevoked ? getAllApiKeys() : getActiveApiKeys();
  return records.map(recordToApiKey);
}

/**
 * Update API key permissions
 */
export function updatePermissions(id: string, permissions: Permission[]): boolean {
  const record = getApiKeyById(id);
  if (!record) return false;

  const validPermissions = filterValidPermissions(permissions);
  updateApiKeyPermissions(id, validPermissions);
  return true;
}

/**
 * Revoke an API key (soft delete)
 */
export function revokeKey(id: string): boolean {
  const record = getApiKeyById(id);
  if (!record) return false;

  dbRevokeApiKey(id);
  return true;
}

/**
 * Permanently delete an API key
 */
export function deleteKey(id: string): boolean {
  const record = getApiKeyById(id);
  if (!record) return false;

  dbDeleteApiKey(id);
  return true;
}

/**
 * Check if any API keys exist (for bootstrap check)
 */
export function hasAnyApiKeys(): boolean {
  return getAllApiKeys().length > 0;
}

/**
 * Check if an admin key exists
 */
export function hasAdminKey(): boolean {
  const keys = listApiKeys();
  return keys.some((k) => k.permissions.includes("admin"));
}
