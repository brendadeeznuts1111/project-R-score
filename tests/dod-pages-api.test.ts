import { describe, expect, test } from 'bun:test';
import { onRequest } from '../functions/api/dod/[[path]].ts';

describe('Pages DOD API', () => {
  test('GET returns filtered snapshot envelope', async () => {
    const payload = {
      readOnly: true,
      generatedAt: '2026-07-24T00:00:00.000Z',
      byStatus: { flagged: 1, verified: 1 },
      entries: [
        { id: 'a', status: 'flagged' },
        { id: 'b', status: 'verified' },
      ],
    };
    const res = await onRequest({
      request: new Request('https://example.com/api/dod?status=flagged'),
      env: {
        ASSETS: {
          fetch: async () =>
            new Response(JSON.stringify(payload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      readOnly: boolean;
      entries: Array<{ id: string }>; // brand-ok — opaque DOD snapshot fixture id
      byStatus: Record<string, number>;
      generatedAt: string;
    };
    expect(body.mode).toBe('snapshot');
    expect(body.readOnly).toBe(true);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]?.id).toBe('a');
    expect(body.byStatus.flagged).toBe(1);
    expect(body.generatedAt).toBe('2026-07-24T00:00:00.000Z');
    expect(res.headers.get('X-DOD-Read-Only')).toBe('1');
  });

  test('POST returns 503 on Pages', async () => {
    const res = await onRequest({
      request: new Request('https://example.com/api/dod/approve', { method: 'POST' }),
      env: {},
    });
    expect(res.status).toBe(503);
  });
});
