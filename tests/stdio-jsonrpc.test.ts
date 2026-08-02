import { describe, expect, test } from 'bun:test';
import { readJsonRpcStream } from '../lib/mcp/stdio-jsonrpc.ts';

function frame(obj: object): Uint8Array {
  const json = JSON.stringify(obj);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  return new TextEncoder().encode(header + json);
}

async function collect(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
  const out = [];
  for await (const msg of readJsonRpcStream(stream)) out.push(msg);
  return out;
}

describe('readJsonRpcStream', () => {
  test('Content-Length framing (byte-accurate, multi-message)', async () => {
    const a = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
    const b = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
    const msgs = await collect([frame(a), frame(b)]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.id).toBe(1);
    expect(msgs[1]?.method).toBe('tools/list');
  });

  test('Content-Length split across chunks', async () => {
    const full = frame({ jsonrpc: '2.0', id: 7, method: 'ping', params: {} });
    const mid = Math.floor(full.length / 2);
    const msgs = await collect([full.subarray(0, mid), full.subarray(mid)]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(7);
  });

  test('NDJSON framing', async () => {
    const line = `${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} })}\n`;
    const msgs = await collect([new TextEncoder().encode(line)]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(3);
  });

  test('wrong Content-Length does not crash the generator', async () => {
    // Declare 9999 bytes but only send a short body — wait for more, then close.
    const bad = new TextEncoder().encode(
      'Content-Length: 9999\r\n\r\n{"jsonrpc":"2.0","id":1}\n',
    );
    const msgs = await collect([bad]);
    // Undersized CL body never completes; leftover NDJSON-looking tail must not throw.
    expect(Array.isArray(msgs)).toBe(true);
  });

  test('unicode body uses byte Content-Length', async () => {
    const obj = { jsonrpc: '2.0', id: 9, method: 'x', params: { q: 'café 🎯' } };
    const msgs = await collect([frame(obj)]);
    expect(msgs).toHaveLength(1);
    expect((msgs[0]?.params as { q: string }).q).toBe('café 🎯');
  });

  test('lenient \\n\\n header separator', async () => {
    const json = JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'ping', params: {} });
    const framed = new TextEncoder().encode(
      `Content-Length: ${Buffer.byteLength(json)}\n\n${json}`,
    );
    const msgs = await collect([framed]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(11);
  });

  test('Content-Length header split after the first CRLF', async () => {
    const obj = { jsonrpc: '2.0', id: 21, method: 'ping', params: {} };
    const json = JSON.stringify(obj);
    const msgs = await collect([
      new TextEncoder().encode(`Content-Length: ${Buffer.byteLength(json)}\r\n`),
      new TextEncoder().encode(`\r\n${json}`),
    ]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(21);
  });

  test('lenient \\n\\n header split across chunks', async () => {
    const obj = { jsonrpc: '2.0', id: 22, method: 'ping', params: {} };
    const json = JSON.stringify(obj);
    const msgs = await collect([
      new TextEncoder().encode(`Content-Length: ${Buffer.byteLength(json)}\n`),
      new TextEncoder().encode(`\n${json}`),
    ]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(22);
  });

  test('multibyte UTF-8 sequence split across chunks (CL body)', async () => {
    const obj = { jsonrpc: '2.0', id: 23, method: 'x', params: { q: 'café 🎯' } };
    const full = frame(obj);
    // Split inside the 4-byte 🎯 (F0 9F 8E AF) lead byte.
    const f0 = full.indexOf(0xf0);
    expect(f0).toBeGreaterThan(0);
    const msgs = await collect([full.subarray(0, f0 + 1), full.subarray(f0 + 1)]);
    expect(msgs).toHaveLength(1);
    expect((msgs[0]?.params as { q: string }).q).toBe('café 🎯');
  });

  test('trims whitespace around JSON body', async () => {
    const json = '  {"jsonrpc":"2.0","id":12,"method":"ping","params":{}}  ';
    const framed = new TextEncoder().encode(
      `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`,
    );
    const msgs = await collect([framed]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.id).toBe(12);
  });
});
