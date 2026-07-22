/** Shared wire-parse helpers for audit SSOT (boundary). */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field}: expected non-empty string`);
  }
  return value;
}

export function parseOptionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${field}: expected string[]`);
  }
  const out: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'string' || item.trim() === '') {
      throw new Error(`${field}[${i}]: expected non-empty string`);
    }
    out.push(item);
  }
  return out;
}
