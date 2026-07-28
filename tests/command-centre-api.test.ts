// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildPortalDashboardPayload,
  isLoopbackRequest,
  runPortalAction,
} from '../lib/portal/command-centre-api.ts';

describe('command-centre-api', () => {
  test('buildPortalDashboardPayload returns schema v1 aggregate', async () => {
    const payload = await buildPortalDashboardPayload();
    expect(payload.health).toBeDefined();
    expect(payload.registry).toBeDefined();
    expect(payload.vault).toBeDefined();
    expect(payload.doctor).toBeDefined();
    expect(payload.bakeFreshness).toBeDefined();
    expect(payload.snapshots).toBeDefined();
    expect(payload.capabilities).toBeDefined();
    expect(payload.bakeFreshness.rows.length).toBeGreaterThan(0);
    expect(payload.bakeFreshness.rows.some(r => r.id === 'doctor-state')).toBe(true);
    expect(payload.quickActions.some(a => a.id === 'doctor-run')).toBe(true);
  });

  test('isLoopbackRequest accepts localhost', () => {
    const req = new Request('http://127.0.0.1:8787/api/portal/action');
    expect(isLoopbackRequest(req)).toBe(true);
  });

  test('runPortalAction rejects non-loopback', async () => {
    const req = new Request('https://score.factory-wager.com/api/portal/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'failures-bake' }),
    });
    const res = await runPortalAction('failures-bake', req);
    expect(res.status).toBe(403);
  });

  test('runPortalAction rejects unknown action on loopback', async () => {
    const req = new Request('http://127.0.0.1:8787/api/portal/action', { method: 'POST' });
    const res = await runPortalAction('not-a-real-action', req);
    expect(res.status).toBe(400);
  });
});
