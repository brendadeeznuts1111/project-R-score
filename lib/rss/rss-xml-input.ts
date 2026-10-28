// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML byte inputs and encoding detection
// @see https://bun.com/docs/runtime/utils#bun-peek — synchronous inspection of settled Blob bytes

export type RSSXmlInput = Parameters<typeof Bun.XML.parse>[0];

export type RSSXmlQuotas = {
  readonly maxInputBytes: number;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxAttributesPerElement: number;
  readonly maxTextBytes: number;
};

export const DEFAULT_RSS_XML_QUOTAS: RSSXmlQuotas = Object.freeze({
  maxInputBytes: 8 * 1024 * 1024,
  maxDepth: 64,
  maxNodes: 100_000,
  maxAttributesPerElement: 64,
  maxTextBytes: 8 * 1024 * 1024,
});

function blobBytes(blob: Blob): Uint8Array {
  const result = Bun.peek(blob.arrayBuffer());
  if (result instanceof Promise) {
    throw new Error('RSS Blob bytes must be materialized before synchronous parsing');
  }
  return new Uint8Array(result);
}

function inputBytes(input: Exclude<RSSXmlInput, string>): Uint8Array {
  if (input instanceof Blob) return blobBytes(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

export function assertNoRssDoctype(input: RSSXmlInput): void {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : inputBytes(input);
  const asciiProjection = new TextDecoder('windows-1252').decode(
    bytes.filter(byte => byte !== 0).map(byte => (byte >= 65 && byte <= 90 ? byte + 32 : byte))
  );
  if (/<!\s*(?:doctype|entity)\b/.test(asciiProjection)) {
    throw new Error('RSS live feeds must not contain a DOCTYPE or entity declaration');
  }
}

export function assertRssXmlInputWithinQuota(input: RSSXmlInput, maxInputBytes: number): void {
  if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes < 1) {
    throw new RangeError('RSS XML maxInputBytes must be a positive safe integer');
  }
  const byteLength =
    typeof input === 'string'
      ? new TextEncoder().encode(input).byteLength
      : inputBytes(input).byteLength;
  if (byteLength > maxInputBytes) {
    throw new RangeError(`RSS XML input exceeds ${maxInputBytes} byte quota`);
  }
}

export function assertRssXmlShapeWithinQuotas(value: unknown, quotas: RSSXmlQuotas): void {
  const quotaRules = [
    ['maxDepth', quotas.maxDepth, 0],
    ['maxNodes', quotas.maxNodes, 1],
    ['maxAttributesPerElement', quotas.maxAttributesPerElement, 0],
    ['maxTextBytes', quotas.maxTextBytes, 0],
  ] as const;
  for (const [name, quota, minimum] of quotaRules) {
    if (!Number.isSafeInteger(quota) || quota < minimum) {
      throw new RangeError(`RSS XML ${name} must be a safe integer >= ${minimum}`);
    }
  }
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;
  let textBytes = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    nodes++;
    if (nodes > quotas.maxNodes)
      throw new RangeError(`RSS XML exceeds ${quotas.maxNodes} node quota`);
    if (entry.depth > quotas.maxDepth) {
      throw new RangeError(`RSS XML exceeds ${quotas.maxDepth} depth quota`);
    }
    if (typeof entry.value === 'string') {
      textBytes += new TextEncoder().encode(entry.value).byteLength;
      if (textBytes > quotas.maxTextBytes) {
        throw new RangeError(`RSS XML exceeds ${quotas.maxTextBytes} text byte quota`);
      }
      continue;
    }
    if (Array.isArray(entry.value)) {
      for (const child of entry.value) stack.push({ value: child, depth: entry.depth + 1 });
      continue;
    }
    if (entry.value === null || typeof entry.value !== 'object') continue;
    const record = entry.value as Record<string, unknown>;
    const attributeCount = Object.keys(record).filter(key => key.startsWith('@')).length;
    if (attributeCount > quotas.maxAttributesPerElement) {
      throw new RangeError(
        `RSS XML element exceeds ${quotas.maxAttributesPerElement} attribute quota`
      );
    }
    for (const child of Object.values(record)) {
      stack.push({ value: child, depth: entry.depth + 1 });
    }
  }
}
