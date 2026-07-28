// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  asHostId,
  asSurfaceId,
  type HostId,
  type SurfaceId,
} from '../lib/types/branded.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('bake-surfaces', () => {
  test('surfaces-state.json matches the verified inventory shape', async () => {
    const file = Bun.file(resolvePath(ROOT, 'public/registry/surfaces-state.json'));
    expect(await file.exists()).toBe(true);
    const state = (await file.json()) as {
      schemaVersion: number;
      kind: string;
      surfaces: Array<{
        id: SurfaceId;
        host: HostId;
        status: string;
        access: string;
        accessSubpaths?: Array<{ path: string; access: string }>;
      }>;
      publishLanes: Array<{ lane: string }>;
      crossCheck: { ok: boolean; issues: string[] };
      summary: { total: number; byStatus: Record<string, number> };
    };
    expect(state.schemaVersion).toBe(1);
    expect(state.kind).toBe('surfaces-state');
    expect(state.crossCheck.ok).toBe(true);
    expect(state.crossCheck.issues).toEqual([]);

    // Wire JSON → branded keys at the test boundary
    const byId = new Map(
      state.surfaces.map(s => [asSurfaceId(String(s.id)), { ...s, host: asHostId(String(s.host)) }])
    );
    // Verified live facts (dig + curl 2026-07-28; portal Access applied)
    expect(byId.get(asSurfaceId('ledger'))?.access).toBe('applied');
    expect(byId.get(asSurfaceId('terminal'))?.status).toBe('dangling');
    expect(byId.get(asSurfaceId('support'))?.status).toBe('broken');
    expect(byId.get(asSurfaceId('health_host'))?.status).toBe('vanity');
    expect(byId.get(asSurfaceId('reasonix'))?.status).toBe('staged');
    expect(byId.get(asSurfaceId('registry_write'))?.status).toBe('placeholder');
    expect(byId.get(asSurfaceId('score'))?.accessSubpaths?.[0]).toEqual({
      path: '/portal',
      access: 'applied',
    });
    // Publish lanes per ADR-0002
    expect(state.publishLanes.map(l => l.lane).sort()).toEqual([
      'local-gateway',
      'local-npm',
      'prod-write',
    ]);
    // No secrets in the bake
    expect(JSON.stringify(state)).not.toMatch(/cfat_[A-Za-z0-9]+/);
  });
});
