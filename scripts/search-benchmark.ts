#!/usr/bin/env bun

type Profile = {
  id: string;
  label: string;
  args: string[];
};

type QueryResultSummary = {
  query: string;
  total: number;
  slop: number;
  duplicate: number;
  generated: number;
  docsNoise: number;
  uniqueFamilies: number;
  avgMirrors: number;
  signalPct: number;
};

type ProfileSummary = {
  profile: string;
  label: string;
  avgSignalPct: number;
  avgSlopPct: number;
  avgDuplicatePct: number;
  avgUniqueFamilyPct: number;
  avgMirrorsPerHit: number;
  qualityScore: number;
  queries: QueryResultSummary[];
};

const DEFAULT_QUERIES = [
  'authorize middleware',
  'generated',
  'Bun.serve',
  'cache invalidation',
  'auth',
  'constants',
  'R2LifecycleManager',
];

function parseArgs(argv: string[]): { path: string; limit: number; queries: string[] } {
  let path = './lib';
  let limit = 40;
  let queries = [...DEFAULT_QUERIES];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      path = argv[i + 1] || path;
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) {
        limit = n;
      }
      i += 1;
      continue;
    }
    if (arg === '--queries') {
      const value = argv[i + 1] || '';
      const parsed = value.split(',').map((q) => q.trim()).filter(Boolean);
      if (parsed.length > 0) {
        queries = parsed;
      }
      i += 1;
      continue;
    }
  }

  return { path, limit, queries };
}

function parseJsonPayload(output: string): any {
  const idx = output.indexOf('{');
  if (idx < 0) return { hits: [] };
  return JSON.parse(output.slice(idx));
}

async function runSearch(query: string, path: string, limit: number, args: string[]): Promise<any> {
  const cmd = ['bun', 'run', 'search:smart', query, '--path', path, '--limit', String(limit), '--json', ...args].join(' ');
  const output = await Bun.$`${{ raw: cmd }}`.text();
  return parseJsonPayload(output);
}

function summarizeQuery(query: string, payload: any): QueryResultSummary {
  const hits = (payload?.hits || []) as Array<any>;
  const slopSet = new Set(['generated', 'compiled', 'docs-noise', 'ai-slop']);

  const total = hits.length;
  const slop = hits.filter((h) => slopSet.has(h.qualityTag)).length;
  const duplicate = hits.filter((h) => h.qualityTag === 'duplicate').length;
  const generated = hits.filter((h) => h.qualityTag === 'generated').length;
  const docsNoise = hits.filter((h) => h.qualityTag === 'docs-noise').length;

  const familyKeys = new Set(
    hits.map((h) => h.familyId || h.canonicalFile || h.file)
  );
  const uniqueFamilies = familyKeys.size;

  const avgMirrors = total > 0
    ? Number((hits.reduce((sum, h) => sum + (h.mirrorCount || 0), 0) / total).toFixed(2))
    : 0;

  const signalPct = total > 0 ? Number((((total - slop) / total) * 100).toFixed(2)) : 0;

  return {
    query,
    total,
    slop,
    duplicate,
    generated,
    docsNoise,
    uniqueFamilies,
    avgMirrors,
    signalPct,
  };
}

function aggregateProfile(profile: Profile, querySummaries: QueryResultSummary[]): ProfileSummary {
  const n = querySummaries.length || 1;

  const avgSignalPct = Number((querySummaries.reduce((a, q) => a + q.signalPct, 0) / n).toFixed(2));
  const avgSlopPct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.slop / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgDuplicatePct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.duplicate / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgUniqueFamilyPct = Number((querySummaries.reduce((a, q) => a + (q.total ? (q.uniqueFamilies / q.total) * 100 : 0), 0) / n).toFixed(2));
  const avgMirrorsPerHit = Number((querySummaries.reduce((a, q) => a + q.avgMirrors, 0) / n).toFixed(2));

  // Higher is better.
  const qualityScoreRaw =
    avgSignalPct * 0.45 +
    avgUniqueFamilyPct * 0.35 +
    (100 - avgSlopPct) * 0.15 +
    (100 - avgDuplicatePct) * 0.05;
  const qualityScore = Number(qualityScoreRaw.toFixed(2));

  return {
    profile: profile.id,
    label: profile.label,
    avgSignalPct,
    avgSlopPct,
    avgDuplicatePct,
    avgUniqueFamilyPct,
    avgMirrorsPerHit,
    qualityScore,
    queries: querySummaries,
  };
}

async function main(): Promise<void> {
  const { path, limit, queries } = parseArgs(process.argv.slice(2));

  const profiles: Profile[] = [
    { id: 'mixed', label: 'Mixed Delivery', args: ['--view', 'mixed', '--task', 'delivery'] },
    { id: 'strict', label: 'Strict', args: ['--strict'] },
    { id: 'lib-strict', label: 'Lib Strict', args: ['--strict', '--family-cap', '2'] },
    { id: 'cleanup', label: 'Cleanup Slop', args: ['--view', 'slop-only', '--task', 'cleanup', '--group-limit', '5'] },
  ];

  const summaries: ProfileSummary[] = [];

  for (const profile of profiles) {
    const querySummaries: QueryResultSummary[] = [];
    for (const query of queries) {
      const payload = await runSearch(query, path, limit, profile.args);
      querySummaries.push(summarizeQuery(query, payload));
    }
    summaries.push(aggregateProfile(profile, querySummaries));
  }

  summaries.sort((a, b) => b.qualityScore - a.qualityScore);

  console.log(JSON.stringify({
    path,
    limit,
    queries,
    rankedProfiles: summaries,
  }, null, 2));
}

await main();
