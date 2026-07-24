/**
 * Allowlisted R2 object keys for read-only registry HTTP surfaces.
 */

/** Exact keys served by /api/registry/<key> when present in R2 (or static mirror). */
export const REGISTRY_ALLOWED_EXACT = new Set([
  'registry.json',
  /** Aggregate ops+routing+monitoring snapshot from build-registry-snapshot. */
  'static.json',
  'ops-summary.json',
  'monitoring.json',
  /** Per-tenant registry snapshots (portal sidebar). */
  'factory/registry.json',
  'science/registry.json',
  'tennis/registry.json',
  'tenants/factory/registry.json',
  'tenants/science/registry.json',
  'tenants/tennis/registry.json',
]);
export const REGISTRY_ALLOWED_PREFIXES = ['@factorywager/', 'projects/', 'readme/'] as const;

/**
 * Decode + validate an object key from `/api/registry/<key>`.
 * Rejects traversal, absolute paths, NULs, and non-allowlisted prefixes.
 */
export function parseRegistryObjectKey(raw: string): string | null {
  if (!raw) return null;
  let key: string;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!key || key.includes('\0')) return null;
  if (key.startsWith('/') || key.includes('\\')) return null;
  const segments = key.split('/');
  if (segments.some(s => s === '' || s === '.' || s === '..')) return null;
  if (REGISTRY_ALLOWED_EXACT.has(key)) return key;
  if (REGISTRY_ALLOWED_PREFIXES.some(p => key.startsWith(p))) return key;
  return null;
}
