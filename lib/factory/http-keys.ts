/**
 * Allowlisted R2 object keys for read-only registry HTTP surfaces.
 */

export const REGISTRY_ALLOWED_EXACT = new Set(['registry.json']);
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
