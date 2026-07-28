// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Doctor slice for public/registry/surfaces-state.json (schema v2).
 *
 * Offline SSOT: bake must exist, schemaVersion ≥ 2, crossCheck.ok, summary present.
 * Does not live-probe DNS/HTTP — that stays in portal-cli-doctor-infra live checks.
 */
import { type SurfaceId } from '../types/branded.ts';

export const SURFACES_STATE_REL = 'public/registry/surfaces-state.json';
export const SURFACES_BAKE_CLI = 'bun run surfaces:bake';
export const SURFACES_CHECK_CLI = 'bun run surfaces:check';
export const SURFACES_PORTAL_HREF = '/portal/surfaces/';
export const SURFACES_REGISTRY_HREF = '/registry/surfaces-state.json';

export type SurfacesStateBake = {
  schemaVersion?: number;
  kind?: string;
  generatedAt?: string;
  surfaces?: Array<{
    id?: string; // brand-ok — opaque surfaces-state.json row key (bake wire)
    host?: string;
    status?: string;
    access?: string;
    apex?: string;
    subdomain?: string;
    backendCode?: string;
  }>;
  publishLanes?: Array<{ id?: string }>; // brand-ok — opaque publish-lane bake key
  crossCheck?: { ok?: boolean; issues?: string[] };
  summary?: {
    total?: number;
    lanes?: number;
    byStatus?: Record<string, number>;
    byAccess?: Record<string, number>;
    byBackendCode?: Record<string, number>;
    accessDomains?: string[];
    pagesProjects?: string[];
    apexes?: string[];
    crossCheckOk?: boolean;
  };
};

export type SurfacesDoctorResult = {
  ok: boolean;
  message: string;
  schemaVersion: number | null;
  total: number | null;
  crossCheckOk: boolean;
  issues: string[];
  statusOf: (id: SurfaceId) => string | undefined;
};

const EMPTY: SurfacesDoctorResult = {
  ok: false,
  message: `missing ${SURFACES_REGISTRY_HREF} · ${SURFACES_BAKE_CLI}`,
  schemaVersion: null,
  total: null,
  crossCheckOk: false,
  issues: ['missing-bake'],
  statusOf: () => undefined,
};

/** Wire boundary: JSON → doctor result (parse once). */
export function parseSurfacesStateBake(raw: unknown): SurfacesDoctorResult {
  if (raw == null || typeof raw !== 'object') {
    return { ...EMPTY, issues: ['invalid-json'] };
  }
  const state = raw as SurfacesStateBake;
  if (state.kind !== 'surfaces-state') {
    return {
      ...EMPTY,
      message: `kind=${String(state.kind)} (want surfaces-state) · ${SURFACES_BAKE_CLI}`,
      issues: ['wrong-kind'],
    };
  }
  const schemaVersion = typeof state.schemaVersion === 'number' ? state.schemaVersion : null;
  const byId = new Map(
    (state.surfaces ?? [])
      .filter(s => typeof s.id === 'string')
      .map(s => [String(s.id), s] as const)
  );
  const statusOf = (id: SurfaceId): string | undefined => byId.get(String(id))?.status;

  const issues: string[] = [];
  if (schemaVersion == null || schemaVersion < 2) {
    issues.push(`schemaVersion=${schemaVersion ?? 'missing'} (need ≥2)`);
  }
  const crossCheckOk = Boolean(state.crossCheck?.ok && state.summary?.crossCheckOk !== false);
  if (!crossCheckOk) {
    const cc = state.crossCheck?.issues ?? [];
    issues.push(...(cc.length ? cc.map(i => `crossCheck: ${i}`) : ['crossCheck not ok']));
  }
  const total = state.summary?.total ?? state.surfaces?.length ?? null;
  if (total == null || total < 1) issues.push('no surfaces in bake');
  if (!state.summary?.byBackendCode) issues.push('summary.byBackendCode missing (schema v2)');
  if (!Array.isArray(state.summary?.accessDomains)) {
    issues.push('summary.accessDomains missing (schema v2)');
  }
  if (!Array.isArray(state.summary?.apexes) || (state.summary?.apexes.length ?? 0) < 1) {
    issues.push('summary.apexes missing');
  }

  const ok = issues.length === 0;
  const apexN = state.summary?.apexes?.length ?? 0;
  const accessN = state.summary?.accessDomains?.length ?? 0;
  const message = ok
    ? `surfaces-state v${schemaVersion} · total=${total} · apexes=${apexN} · accessDomains=${accessN} · crossCheck ok`
    : `surfaces-state gap · ${issues.slice(0, 3).join(' · ')}${issues.length > 3 ? ` (+${issues.length - 3})` : ''}`;

  return {
    ok,
    message,
    schemaVersion,
    total,
    crossCheckOk,
    issues,
    statusOf,
  };
}

export async function loadSurfacesStateBake(absPath: string): Promise<SurfacesDoctorResult> {
  const file = Bun.file(absPath);
  if (!(await file.exists())) {
    return { ...EMPTY };
  }
  try {
    const raw: unknown = await file.json();
    return parseSurfacesStateBake(raw);
  } catch (e) {
    return {
      ...EMPTY,
      message: `surfaces-state unreadable · ${e instanceof Error ? e.message : String(e)}`,
      issues: ['read-error'],
    };
  }
}

/** Terminal host doctor posture from inventory status (retired → expect no DNS). */
export function terminalInventoryOk(
  status: string | undefined,
  live: { resolves: boolean; status: number | null }
): { ok: boolean; evidence: string } {
  if (status === 'retired') {
    // Retired: DNS should be gone. Residual 502 is still a warn fail.
    if (!live.resolves) {
      return { ok: true, evidence: 'retired · NXDOMAIN (expected)' };
    }
    if (live.status === 502) {
      return { ok: false, evidence: 'retired but DNS still 502 dangling — remove CNAME' };
    }
    return {
      ok: false,
      evidence: `retired but DNS resolves (status=${live.status ?? '?'}) — remove record`,
    };
  }
  if (status === 'dangling') {
    // Known-bad inventory: 502 dangling fails warn until cleaned up
    if (!live.resolves) return { ok: true, evidence: 'dangling · NXDOMAIN (cleaned)' };
    if (live.status === 502) {
      return { ok: false, evidence: '502 dangling tunnel (DNS yes · no ingress)' };
    }
    return {
      ok: false,
      evidence: `${live.status ?? '?'} (expected 502 or NXDOMAIN for dangling)`,
    };
  }
  // Unknown inventory: legacy heuristic
  if (!live.resolves) return { ok: true, evidence: 'NXDOMAIN · no DNS' };
  if (live.status === 502) {
    return { ok: false, evidence: '502 dangling tunnel (DNS yes · no ingress)' };
  }
  return {
    ok: live.status != null && live.status < 500,
    evidence: `status=${live.status ?? '?'}`,
  };
}
