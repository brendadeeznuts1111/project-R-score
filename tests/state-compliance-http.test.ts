// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
/**
 * Mock MA/NJ compliance HTTP surface.
 *
 *   bun test tests/state-compliance-http.test.ts
 *   bun run test:state-compliance
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  createMockComplianceDb,
  createStateComplianceFetchHandler,
  startStateComplianceMock,
} from '../lib/operations/state-compliance-http.ts';
import type { Database } from 'bun:sqlite';

describe('state-compliance-http (handler)', () => {
  let db: Database;
  let fetchHandler: (req: Request) => Promise<Response>;

  beforeEach(() => {
    db = createMockComplianceDb();
    fetchHandler = createStateComplianceFetchHandler(db);
  });

  afterEach(() => {
    db.close();
  });

  test('GET /health lists MA/NJ', async () => {
    const res = await fetchHandler(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; states: string[] };
    expect(body.ok).toBe(true);
    expect(body.states).toContain('MA');
    expect(body.states).toContain('NJ');
  });

  test('POST /api/compliance/check blocks unlicensed NJ', async () => {
    const res = await fetchHandler(
      new Request('http://localhost/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'demo-unlicensed',
          stateCode: 'NJ',
          sportId: 'soccer',
          marketId: 'match_winner',
          wagerAmount: 100,
          betType: 'straight',
        }),
      })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { allowed: boolean; reason: string };
    expect(body.allowed).toBe(false);
    expect(body.reason).toContain('not licensed');

    const n = db
      .query(
        `SELECT COUNT(*) AS n FROM regulatory_violations
         WHERE node_id = 'demo-unlicensed' AND state_code = 'NJ'`
      )
      .get() as { n: number };
    expect(n.n).toBe(1);
  });

  test('POST /api/compliance/check allows MA licensed NBA/totals', async () => {
    const res = await fetchHandler(
      new Request('http://localhost/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'demo-ma-licensed',
          stateCode: 'MA',
          sportId: 'NBA',
          marketId: 'totals',
          wagerAmount: 500,
          betType: 'straight',
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { allowed: boolean; stateCode: string };
    expect(body.allowed).toBe(true);
    expect(body.stateCode).toBe('MA');
  });

  test('POST /api/compliance/check enforces max wager', async () => {
    const res = await fetchHandler(
      new Request('http://localhost/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'demo-ma-licensed',
          stateCode: 'MA',
          sportId: 'soccer',
          marketId: 'match_winner',
          wagerAmount: 99999,
          betType: 'straight',
        }),
      })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toContain('max wager');
  });

  test('GET /api/compliance/status returns license + limits', async () => {
    const res = await fetchHandler(
      new Request(
        'http://localhost/api/compliance/status?nodeId=demo-ma-licensed&state=MA'
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      regulatory: { license: { status: string } | null; limits: unknown[] };
    };
    expect(body.ok).toBe(true);
    expect(body.regulatory.license?.status).toBe('active');
    expect(body.regulatory.limits.length).toBeGreaterThan(0);
  });

  test('POST /api/compliance/license then check succeeds', async () => {
    const lic = await fetchHandler(
      new Request('http://localhost/api/compliance/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'new-partner-x',
          stateCode: 'MA',
          licenseNumber: 'MA-NEW-1',
        }),
      })
    );
    expect(lic.status).toBe(200);

    // soccer MA needs no identity; allow small wager
    const check = await fetchHandler(
      new Request('http://localhost/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'new-partner-x',
          stateCode: 'MA',
          sportId: 'soccer',
          marketId: 'match_winner',
          wagerAmount: 50,
          betType: 'straight',
          logViolation: false,
        }),
      })
    );
    expect(check.status).toBe(200);
  });

  test('400 on missing fields', async () => {
    const res = await fetchHandler(
      new Request('http://localhost/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'x' }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('state-compliance-http (Bun.serve TCP)', () => {
  test('routes hit over TCP for allow path', async () => {
    const { server, url } = startStateComplianceMock({ port: 0, log: false });
    try {
      const res = await fetch(new URL('/api/compliance/check', url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: 'demo-nj-licensed',
          stateCode: 'NJ',
          sportId: 'soccer',
          marketId: 'match_winner',
          wagerAmount: 100,
          betType: 'straight',
        }),
      });
      // NJ requires identity — demo-nj-licensed is seeded verified
      expect(res.status).toBe(200);
      const body = (await res.json()) as { allowed: boolean };
      expect(body.allowed).toBe(true);

      const health = await fetch(new URL('/health', url));
      expect(health.status).toBe(200);
    } finally {
      server.stop(true);
    }
  });
});
