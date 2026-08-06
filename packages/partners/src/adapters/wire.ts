export type WireRecord = Record<string, unknown>;

export function wireRecord(value: unknown, path: string): WireRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value as WireRecord;
}

export function wireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value;
}

export function wireText(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.length || value.trim() !== value) {
    throw new TypeError(`${path} must be a non-empty exact string`);
  }
  return value;
}

export function wireTimestamp(value: unknown, path: string): string {
  const text = wireText(value, path);
  if (!Number.isFinite(Date.parse(text)) || new Date(text).toISOString() !== text) {
    throw new TypeError(`${path} must be a canonical UTC ISO timestamp`);
  }
  return text;
}

export function wireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${path} must be boolean`);
  return value;
}

export function wireNonnegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new TypeError(`${path} must be a non-negative safe integer`);
  }
  return Number(value);
}

export function usdMajorToMinor(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative finite USD amount`);
  }
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - value) > 1e-9) {
    throw new TypeError(`${path} must have at most two decimal places`);
  }
  return cents;
}
