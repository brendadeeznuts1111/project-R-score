// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  loadSurfacesStateBake,
  parseSurfacesStateBake,
  SURFACES_STATE_REL,
  terminalInventoryOk,
} from '../lib/surfaces/doctor-check.ts';
import { asSurfaceId } from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun';
import { runInfraChecks } from '../tools/lib/portal-cli-doctor-infra.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('surfaces doctor-check', () => {
  test('parseSurfacesStateBake accepts live schema v2 bake', async () => {
    const path = resolvePath(ROOT, SURFACES_STATE_REL);
    const result = await loadSurfacesStateBake(path);
    expect(result.ok).toBe(true);
    expect(result.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(result.total).toBeGreaterThan(5);
    expect(result.statusOf(asSurfaceId('ledger'))).toBe('live');
  });

  test('parseSurfacesStateBake rejects wrong kind / old schema', () => {
    expect(parseSurfacesStateBake({ kind: 'nope' }).ok).toBe(false);
    expect(
      parseSurfacesStateBake({
        kind: 'surfaces-state',
        schemaVersion: 1,
        surfaces: [{ id: 'x' }],
        crossCheck: { ok: true },
        summary: { total: 1, crossCheckOk: true },
      }).ok
    ).toBe(false);
  });

  test('terminalInventoryOk respects retired vs dangling', () => {
    expect(terminalInventoryOk('retired', { resolves: false, status: null }).ok).toBe(true);
    expect(terminalInventoryOk('retired', { resolves: true, status: 502 }).ok).toBe(false);
    expect(terminalInventoryOk('dangling', { resolves: true, status: 502 }).ok).toBe(false);
    expect(terminalInventoryOk('dangling', { resolves: false, status: null }).ok).toBe(true);
  });
});

describe('infra doctor surfaces wiring', () => {
  test('offline infra includes surfaces-state check', async () => {
    const checks = await runInfraChecks({ skipLive: true, cwd: ROOT });
    expect(checks.map(c => c.id)).toEqual([
      'infra-access-policy',
      'infra-surfaces-state',
      'infra-ledger-access',
      'infra-portal-access',
    ]);
    expect(checks.find(c => c.id === 'infra-surfaces-state')?.ok).toBe(true);
    expect(checks.find(c => c.id === 'infra-portal-access')?.message).toContain('policy has');
    expect(checks.find(c => c.id === 'infra-portal-access')?.message).not.toContain('staged');
  });

  test('live infra terminal uses inventory status when bake present', async () => {
    const checks = await runInfraChecks({
      skipLive: false,
      cwd: ROOT,
      fetch: async url => {
        const u = String(url);
        if (u.includes('ledger')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/x',
            },
          });
        }
        if (u.includes('terminal')) {
          return new Response('Bad Gateway', { status: 502 });
        }
        // portal Access enforced
        if (u.includes('/portal')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/x',
            },
          });
        }
        return new Response('ok', { status: 200 });
      },
    });
    expect(checks.map(c => c.id)).toContain('infra-surfaces-state');
    expect(checks.map(c => c.id)).toContain('infra-terminal-host');
    const terminal = checks.find(c => c.id === 'infra-terminal-host');
    // Inventory marks terminal retired → 502 residual DNS fails
    expect(terminal?.message).toMatch(/inventory=retired|retired/);
  });
});
