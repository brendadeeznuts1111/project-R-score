export function safeStringify(value: unknown, space: number = 2): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v), space);
}

export function safeParse<T = unknown>(text: string): T {
  return JSON.parse(text, (_key, v) => {
    if (typeof v === 'string' && /^-?\d{16,}$/.test(v)) {
      try {
        return BigInt(v);
      } catch {
        return v;
      }
    }
    return v;
  }) as T;
}
