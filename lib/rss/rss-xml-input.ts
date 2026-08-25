// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML byte inputs and encoding detection
// @see https://bun.com/docs/runtime/utils#bun-peek — synchronous inspection of settled Blob bytes

export type RSSXmlInput = Parameters<typeof Bun.XML.parse>[0];

const ASCII_DOCTYPE = Uint8Array.from('<!DOCTYPE', character => character.charCodeAt(0));

function containsPattern(bytes: Uint8Array, pattern: Uint8Array): boolean {
  outer: for (let offset = 0; offset <= bytes.length - pattern.length; offset++) {
    for (let index = 0; index < pattern.length; index++) {
      if (bytes[offset + index] !== pattern[index]) continue outer;
    }
    return true;
  }
  return false;
}

function encodedPattern(byteOrder: 'le' | 'be'): Uint8Array {
  const pattern = new Uint8Array(ASCII_DOCTYPE.length * 2);
  for (const [index, byte] of ASCII_DOCTYPE.entries()) {
    const offset = index * 2;
    pattern[offset + (byteOrder === 'le' ? 0 : 1)] = byte;
  }
  return pattern;
}

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
  const found =
    typeof input === 'string'
      ? input.includes('<!DOCTYPE')
      : [ASCII_DOCTYPE, encodedPattern('le'), encodedPattern('be')].some(pattern =>
          containsPattern(inputBytes(input), pattern)
        );
  if (found) throw new Error('RSS live feeds must not contain a DOCTYPE');
}
