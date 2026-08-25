export function fail(message: string): never {
  throw new Error(`bun-blog-assets: ${message}`);
}

export function parseRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
