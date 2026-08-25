export type UnknownRecord = Record<string, unknown>;

export function parseRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

export function exactKeys(value: UnknownRecord, keys: readonly string[], label: string): void {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (actual.join('\0') !== expected.join('\0')) {
    throw new TypeError(`${label} keys must be exactly: ${expected.join(', ')}`);
  }
}

export function parseLiteral<T>(value: unknown, expected: T, label: string): T {
  if (!Object.is(value, expected)) {
    throw new TypeError(`${label} must be ${JSON.stringify(expected)}`);
  }
  return expected;
}

export function parseStringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

export function parseArrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

export function parseRssPath(value: unknown, label: string, kind: 'canonical' | 'project'): string {
  const path = parseStringValue(value, label);
  if (!path.startsWith('/feeds/v1/') || !path.endsWith('.xml')) {
    throw new TypeError(`${label} must be a feed-schema v1 XML path`);
  }
  if (path.includes('?') || path.includes('#') || path.includes('\\') || path.includes('//')) {
    throw new TypeError(`${label} must not contain a query, fragment, backslash, or empty segment`);
  }
  if (/%2f|%5c/i.test(path)) throw new TypeError(`${label} must not contain encoded separators`);
  const normalized = new URL(path, 'https://rss-registry.invalid').pathname;
  if (normalized !== path) throw new TypeError(`${label} must be a normalized URL path`);
  if (kind === 'canonical' && path.startsWith('/feeds/v1/projects/')) {
    throw new TypeError(`${label} must not be a project alias`);
  }
  if (kind === 'project' && !path.startsWith('/feeds/v1/projects/')) {
    throw new TypeError(`${label} must be a project-scoped alias`);
  }
  return path;
}
