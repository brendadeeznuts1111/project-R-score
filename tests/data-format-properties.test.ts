// @see https://bun.com/reference/bun/JSONL
import { describe, expect, test } from 'bun:test';
import { parseCompleteJsonlChunks } from '../lib/data-format-operation-proof.ts';
import { assertGeneratedProperty } from '../lib/quality/property.ts';

const JSONL_API = Bun.JSONL as typeof Bun.JSONL;

describe('JSONL generated streaming invariants', () => {
  test('every two-chunk boundary equals complete parsing', async () => {
    await assertGeneratedProperty({
      id: 'structured-data.jsonl-all-two-chunk-boundaries',
      seed: 0x750a11,
      cases: 48,
      generate: random => {
        const alphabet = ['a', 'Z', '0', '-', 'é', '🚀'] as const;
        return Array.from({ length: random.int(1, 8) }, (_, index) => ({
          id: index,
          active: random.boolean(),
          label: Array.from({ length: random.int(0, 12) }, () => random.pick(alphabet)).join(''),
          values: Array.from({ length: random.int(0, 6) }, () => random.int(-10_000, 10_000)),
        }));
      },
      check: rows => {
        const payload = `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
        const complete = JSONL_API.parse(payload);
        for (let boundary = 0; boundary <= payload.length; boundary++) {
          const streamed = parseCompleteJsonlChunks(JSONL_API, [
            payload.slice(0, boundary),
            payload.slice(boundary),
          ]);
          if (!Bun.deepEquals(streamed, complete, true)) {
            throw new Error(`JSONL mismatch at character boundary ${boundary}`);
          }
        }
      },
      shrink: rows => [rows.slice(0, Math.max(1, Math.floor(rows.length / 2))), [rows[0]!]],
    });
  });

  test('complete streaming fails closed on malformed or truncated final input', () => {
    expect(() => parseCompleteJsonlChunks(JSONL_API, ['{"ok":true}\n{bad}\n'])).toThrow(
      SyntaxError
    );
    expect(() => parseCompleteJsonlChunks(JSONL_API, ['{"ok":true}\n{"partial"'])).toThrow(
      'incomplete JSONL stream'
    );
  });

  test('done=true consumes a trailing delimiter even when read points at it', () => {
    const payload = '{"label":"🚀"}\n';
    const native = JSONL_API.parseChunk(payload);
    expect(native.done).toBe(true);
    expect(native.read).toBeLessThan(payload.length);
    expect(parseCompleteJsonlChunks(JSONL_API, ['', payload])).toEqual([{ label: '🚀' }]);
  });
});
