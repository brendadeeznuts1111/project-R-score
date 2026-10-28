// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
export type CanonicalJson =
  null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };

function normalizeCanonicalJson(value: unknown, seen: Set<object>): CanonicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical JSON rejects non-finite numbers');
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`canonical JSON rejects ${typeof value}`);
  }
  if (seen.has(value)) throw new TypeError('canonical JSON rejects cyclic values');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => normalizeCanonicalJson(item, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('canonical JSON accepts only arrays and plain objects');
    }
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map(key => [key, normalizeCanonicalJson((value as Record<string, unknown>)[key], seen)])
    );
  } finally {
    seen.delete(value);
  }
}

export function parseCanonicalJsonValue(value: unknown): CanonicalJson {
  return normalizeCanonicalJson(value, new Set());
}

export function canonicalJsonText(value: CanonicalJson): string {
  return JSON.stringify(normalizeCanonicalJson(value, new Set()));
}

export type CanonicalJsonDigests = {
  bytes: number;
  sha256: string;
  sha3_256: string;
};

/** Digest exact UTF-8 artifact bytes; unlike canonical JSON this includes whitespace/newlines. */
export function utf8TextDigests(text: string): CanonicalJsonDigests {
  return {
    bytes: new TextEncoder().encode(text).byteLength,
    sha256: new Bun.CryptoHasher('sha256').update(text).digest('hex'),
    sha3_256: new Bun.CryptoHasher('sha3-256').update(text).digest('hex'),
  };
}

export function canonicalJsonDigests(value: CanonicalJson): CanonicalJsonDigests {
  return utf8TextDigests(canonicalJsonText(value));
}
