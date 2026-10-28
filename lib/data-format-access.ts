export const DATA_FORMAT_CANONICAL_HOST = 'score.factory-wager.com';
export const DATA_FORMAT_PROTECTED_HOSTS = [
  DATA_FORMAT_CANONICAL_HOST,
  'project-r-score.pages.dev',
] as const;

export type DataFormatAccessProof = {
  protectedHosts: string[];
  canonicalHost: string;
  path: '/portal';
  access: 'applied';
  unknownHostPolicy: 'redirect-to-canonical';
  live: {
    verified: boolean;
    generatedAt: string | null;
    maxAgeHours: 24;
    evidence: string | null;
  };
};

function parseProtectedSurface(input: unknown, key: string): void {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`surfaces.${key} is missing`);
  }
  const subpaths = (input as Record<string, unknown>).accessSubpaths;
  if (!Array.isArray(subpaths)) throw new TypeError(`surfaces.${key}.accessSubpaths is missing`);
  const protectedPortal = subpaths.some(entry => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const row = entry as Record<string, unknown>;
    return row.path === '/portal' && row.access === 'applied';
  });
  if (!protectedPortal) throw new TypeError(`surfaces.${key} must protect /portal with Access`);
}

function parseAccessPolicy(input: unknown): void {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Cloudflare Access policy must be an object');
  }
  const apps = (input as Record<string, unknown>).apps;
  if (!Array.isArray(apps)) throw new TypeError('Cloudflare Access apps are missing');
  const domains = new Set(
    apps.flatMap(app => {
      if (app === null || typeof app !== 'object' || Array.isArray(app)) return [];
      const domain = (app as Record<string, unknown>).domain;
      return typeof domain === 'string' ? [domain] : [];
    })
  );
  for (const host of DATA_FORMAT_PROTECTED_HOSTS) {
    if (!domains.has(`${host}/portal`))
      throw new TypeError(`Cloudflare Access must protect ${host}/portal`);
  }
}

function parseLiveAccessProof(input: unknown, nowMs: number): DataFormatAccessProof['live'] {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { verified: false, generatedAt: null, maxAgeHours: 24, evidence: null };
  }
  const state = input as Record<string, unknown>;
  const generatedAt = typeof state.generatedAt === 'string' ? state.generatedAt : null;
  const checks = Array.isArray(state.checks) ? state.checks : [];
  const portal = checks.find(check => {
    if (check === null || typeof check !== 'object' || Array.isArray(check)) return false;
    return (check as Record<string, unknown>).id === 'infra-portal-access';
  }) as Record<string, unknown> | undefined;
  const evidence = typeof portal?.message === 'string' ? portal.message : null;
  const generatedMs = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  const fresh =
    Number.isFinite(generatedMs) &&
    nowMs >= generatedMs &&
    nowMs - generatedMs <= 24 * 60 * 60 * 1000;
  const verified =
    portal?.ok === true &&
    fresh &&
    evidence !== null &&
    evidence.includes('portal · Access · score Access · pages.dev Access') &&
    !evidence.includes('offline');
  return { verified, generatedAt, maxAgeHours: 24, evidence };
}

export function parseDataFormatAccessProof(
  surfacesInput: unknown,
  accessPolicyInput: unknown,
  doctorStateInput: unknown = null,
  nowMs = Date.now()
): DataFormatAccessProof {
  if (surfacesInput === null || typeof surfacesInput !== 'object' || Array.isArray(surfacesInput)) {
    throw new TypeError('surfaces contract must be an object');
  }
  const surfaces = (surfacesInput as Record<string, unknown>).surfaces;
  if (surfaces === null || typeof surfaces !== 'object' || Array.isArray(surfaces)) {
    throw new TypeError('surfaces table is missing');
  }
  const table = surfaces as Record<string, unknown>;
  parseProtectedSurface(table.score, 'score');
  parseProtectedSurface(table.pages_dev, 'pages_dev');
  parseAccessPolicy(accessPolicyInput);
  return {
    protectedHosts: [...DATA_FORMAT_PROTECTED_HOSTS],
    canonicalHost: DATA_FORMAT_CANONICAL_HOST,
    path: '/portal',
    access: 'applied',
    unknownHostPolicy: 'redirect-to-canonical',
    live: parseLiveAccessProof(doctorStateInput, nowMs),
  };
}
