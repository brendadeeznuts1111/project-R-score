// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { describe, expect, test } from 'bun:test';
import {
  asHostId,
  asPublishLaneId,
  asSurfaceId,
  type HostId,
  type PublishLaneId,
  type SurfaceId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('bake-surfaces', () => {
  test('check mode verifies without rewriting the artifact', async () => {
    const path = resolvePath(ROOT, 'public/registry/surfaces-state.json');
    const before = await Bun.file(path).text();
    const proc = Bun.spawn(['bun', 'scripts/bake-surfaces.ts', '--check'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [code, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stderr).text(),
      new Response(proc.stdout).text(),
    ]);
    expect(code, stderr).toBe(0);
    expect(await Bun.file(path).text()).toBe(before);
  });

  test('surfaces-state.json matches the verified inventory shape', async () => {
    const file = Bun.file(resolvePath(ROOT, 'public/registry/surfaces-state.json'));
    expect(await file.exists()).toBe(true);
    const state = (await file.json()) as {
      schemaVersion: number;
      kind: string;
      surfaces: Array<{
        id: SurfaceId;
        host: HostId;
        apex?: string;
        subdomain?: string;
        backendCode?: string;
        pagesProject?: string;
        status: string;
        access: string;
        accessSubpaths?: Array<{ path: string; access: string }>;
      }>;
      publishLanes: Array<{ id: PublishLaneId; lane?: string }>;
      crossCheck: { ok: boolean; issues: string[] };
      summary: { total: number; byStatus: Record<string, number> };
    };
    expect(state.schemaVersion).toBe(2);
    expect(state.kind).toBe('surfaces-state');
    expect(state.crossCheck.ok).toBe(true);
    expect(state.crossCheck.issues).toEqual([]);

    // Wire JSON → branded keys at the test boundary
    const byId = new Map(
      state.surfaces.map(s => [asSurfaceId(String(s.id)), { ...s, host: asHostId(String(s.host)) }])
    );
    // Verified live facts (dig + curl 2026-07-28; portal Access applied)
    expect(byId.get(asSurfaceId('ledger'))?.access).toBe('applied');
    expect(byId.get(asSurfaceId('terminal'))?.status).toBe('retired');
    expect(byId.get(asSurfaceId('support'))?.status).toBe('retired');
    expect(byId.get(asSurfaceId('health_host'))?.status).toBe('vanity');
    expect(byId.get(asSurfaceId('reasonix'))?.status).toBe('retired');
    expect(byId.get(asSurfaceId('registry_write'))?.status).toBe('retired');
    expect(byId.get(asSurfaceId('score'))?.apex).toBe('factory-wager.com');
    expect(byId.get(asSurfaceId('score'))?.subdomain).toBe('score');
    expect(byId.get(asSurfaceId('score'))?.backendCode).toBe('cloudflare-pages');
    expect(byId.get(asSurfaceId('score'))?.pagesProject).toBe('project-r-score');
    expect(byId.get(asSurfaceId('score'))?.accessSubpaths?.[0]).toEqual({
      path: '/portal',
      access: 'applied',
    });
    // Publish lanes per ADR-0002 (branded PublishLaneId as `id`)
    expect(
      state.publishLanes.map(l => String(asPublishLaneId(String(l.id)))).sort()
    ).toEqual(['local-gateway', 'local-npm', 'prod-write']);
    // No secrets in the bake
    expect(JSON.stringify(state)).not.toMatch(/cfat_[A-Za-z0-9]+/);
  });
});

describe('bake-surfaces --zone-check drift rules', () => {
  test('zoneDrift flags missing/mismatched CNAMEs and unexpected records', async () => {
    const { zoneDrift } = await import('../scripts/bake-surfaces.ts');
    const surfaces = [
      { id: 'score', host: 'score.factory-wager.com', dnsTarget: 'project-r-score.pages.dev' },
      { id: 'terminal', host: 'terminal.factory-wager.com', dnsTarget: '' },
    ];
    // clean: expected CNAME present, retired absent
    expect(
      zoneDrift(
        surfaces,
        {},
        [{ type: 'CNAME', name: 'score.factory-wager.com', content: 'project-r-score.pages.dev' }]
      )
    ).toEqual([]);
    // missing expected record
    expect(zoneDrift(surfaces, {}, [])).toEqual([
      'score: expected CNAME score.factory-wager.com → project-r-score.pages.dev — no live record',
    ]);
    // target drift
    expect(
      zoneDrift(
        surfaces,
        {},
        [{ type: 'CNAME', name: 'score.factory-wager.com', content: 'other.pages.dev' }]
      )
    ).toEqual(['score: CNAME target drift — toml=project-r-score.pages.dev live=other.pages.dev']);
    // unexpected record on retired host
    expect(
      zoneDrift(
        surfaces,
        {},
        [
          { type: 'CNAME', name: 'score.factory-wager.com', content: 'project-r-score.pages.dev' },
          { type: 'CNAME', name: 'terminal.factory-wager.com', content: 'dead.cfargotunnel.com' },
        ]
      )
    ).toEqual([
      'terminal: live CNAME terminal.factory-wager.com → dead.cfargotunnel.com but TOML expects none',
    ]);
    // MX expectations
    const mail = { mx: [{ host: 'factory-wager.com', target: 'mail.protonmail.ch', priority: 10 }] };
    expect(
      zoneDrift([], mail, [{ type: 'MX', name: 'factory-wager.com', content: 'mail.protonmail.ch' }])
    ).toEqual([]);
    expect(zoneDrift([], mail, [])).toEqual([
      'mail: expected MX factory-wager.com → mail.protonmail.ch (10)',
    ]);
  });
});
describe('bake-surfaces --probe drift rules', () => {
  test('probeDriftFor maps status × DNS × HTTP to drift verdicts', async () => {
    const { probeDriftFor } = await import('../scripts/bake-surfaces.ts');
    // retired / placeholder: must NOT resolve
    expect(probeDriftFor('retired', false, null)).toBeNull();
    expect(probeDriftFor('retired', true, 200)).toMatch(/resolves but marked retired/);
    expect(probeDriftFor('placeholder', true, null)).toMatch(/placeholder/);
    // staged: no expectation
    expect(probeDriftFor('staged', false, null)).toBeNull();
    expect(probeDriftFor('staged', true, 200)).toBeNull();
    // broken / dangling: must resolve AND 5xx
    expect(probeDriftFor('broken', true, 525)).toBeNull();
    expect(probeDriftFor('dangling', true, 502)).toBeNull();
    expect(probeDriftFor('broken', false, null)).toMatch(/NXDOMAIN/);
    expect(probeDriftFor('dangling', true, 200)).toMatch(/<500/);
    // live / vanity / external: must resolve
    expect(probeDriftFor('live', true, 200)).toBeNull();
    expect(probeDriftFor('live', true, 302)).toBeNull(); // Access redirect is fine
    expect(probeDriftFor('vanity', false, null)).toMatch(/NXDOMAIN/);
    expect(probeDriftFor('external', false, null)).toMatch(/NXDOMAIN/);
  });
});
