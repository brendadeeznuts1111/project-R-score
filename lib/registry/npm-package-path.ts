/**
 * npm-compatible root package path accepted by serve-public.
 *
 * Supports unscoped names plus scoped names in plain and npm-encoded forms.
 */
export function isNpmPackageRequestPath(path: string): boolean {
  if (/^\/@[a-z0-9-]+(?:\/|%2[fF])[a-zA-Z0-9._-]+$/.test(path)) return true;
  return (
    path.length > 1 &&
    path.startsWith('/') &&
    path.split('/').length === 2 &&
    !path.startsWith('/@')
  );
}

/** Decode a validated request path without allowing malformed escapes to throw in the router. */
export function parseNpmPackageRequestPath(path: string): string | null {
  if (!isNpmPackageRequestPath(path)) return null;
  try {
    return decodeURIComponent(path.slice(1));
  } catch {
    return null;
  }
}
