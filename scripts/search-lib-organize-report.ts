#!/usr/bin/env bun

type CleanupHit = {
  file: string;
  line: number;
  text: string;
  qualityTag?: string;
};

type CleanupPayload = {
  query: string;
  hits: CleanupHit[];
};

type PolicyShape = {
  deliveryDemotionContains?: string[];
  deliveryDemotionExceptions?: string[];
};

type FileSummary = {
  file: string;
  hits: number;
  duplicateHits: number;
  docsNoiseHits: number;
  generatedHits: number;
  policyMatched?: boolean;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function toPosixPattern(value: string): string {
  const normalized = normalizePath(value).toLowerCase();
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

async function runJson(cmd: string): Promise<any> {
  const out = await Bun.$`${{ raw: cmd }}`.text();
  const idx = out.indexOf('{');
  if (idx < 0) {
    throw new Error(`No JSON payload found for command: ${cmd}`);
  }
  return JSON.parse(out.slice(idx));
}

function topN<T>(items: T[], count: number, score: (item: T) => number): T[] {
  return items.slice().sort((a, b) => score(b) - score(a)).slice(0, count);
}

function summarizeHits(hits: CleanupHit[]): FileSummary[] {
  const map = new Map<string, FileSummary>();
  for (const hit of hits) {
    const key = normalizePath(hit.file);
    const item =
      map.get(key) ||
      {
        file: key,
        hits: 0,
        duplicateHits: 0,
        docsNoiseHits: 0,
        generatedHits: 0,
      };
    item.hits += 1;
    const tag = (hit.qualityTag || '').toLowerCase();
    if (tag.includes('duplicate')) item.duplicateHits += 1;
    if (tag.includes('docs_noise')) item.docsNoiseHits += 1;
    if (tag.includes('generated')) item.generatedHits += 1;
    map.set(key, item);
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

function directorySummary(files: FileSummary[]): Array<{ dir: string; hits: number; files: number }> {
  const byDir = new Map<string, { dir: string; hits: number; files: number }>();
  for (const file of files) {
    const parts = normalizePath(file.file).split('/');
    const dir = parts.slice(0, -1).join('/') || '.';
    const row = byDir.get(dir) || { dir, hits: 0, files: 0 };
    row.hits += file.hits;
    row.files += 1;
    byDir.set(dir, row);
  }
  return [...byDir.values()].sort((a, b) => b.hits - a.hits);
}

function isDocsToolCandidate(path: string): boolean {
  const lower = normalizePath(path).toLowerCase();
  return (
    lower.includes('/lib/docs/') &&
    (lower.includes('generator') ||
      lower.includes('template') ||
      lower.includes('validator') ||
      lower.includes('/builders/'))
  );
}

async function main(): Promise<void> {
  const cleanup = (await runJson(
    'bun run scripts/search-smart.ts "generated declaration duplicate docs noise template validator generator builder" --path ./lib --view slop-only --task cleanup --group-limit 10 --show-mirrors --json'
  )) as CleanupPayload;

  const policy = (await Bun.file('./.search/policies.json').json()) as PolicyShape;
  const demotionContains = (policy.deliveryDemotionContains || []).map(toPosixPattern);
  const demotionExceptions = new Set((policy.deliveryDemotionExceptions || []).map((v) => normalizePath(v).toLowerCase()));

  const hits = cleanup.hits || [];
  const fileSummaries = summarizeHits(hits);
  const dirSummaries = directorySummary(fileSummaries);

  const moveCandidates = fileSummaries
    .filter((f) => {
    const lower = normalizePath(f.file).toLowerCase();
    if (!isDocsToolCandidate(lower)) return false;
    if (demotionExceptions.has(lower)) return false;
    return true;
  })
    .map((f) => {
      const lower = normalizePath(f.file).toLowerCase();
      return {
        ...f,
        policyMatched: demotionContains.some((pattern) => lower.includes(pattern)),
      };
    });

  const highRiskCrowding = fileSummaries.filter(
    (f) => f.docsNoiseHits >= 2 || f.generatedHits >= 2 || f.duplicateHits >= 2
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    query: cleanup.query,
    hitCount: hits.length,
    totals: {
      filesTouched: fileSummaries.length,
      directoriesTouched: dirSummaries.length,
      moveCandidates: moveCandidates.length,
      highRiskCrowding: highRiskCrowding.length,
    },
    topDirectories: topN(dirSummaries, 15, (row) => row.hits),
    topFiles: topN(fileSummaries, 20, (row) => row.hits),
    moveCandidates: topN(moveCandidates, 25, (row) => row.hits),
    coreExceptions: [...demotionExceptions].sort(),
    highRiskCrowding: topN(highRiskCrowding, 20, (row) => row.hits),
  };

  const lines: string[] = [];
  lines.push('# Lib Organization Report');
  lines.push('');
  lines.push(`- Generated: ${payload.generatedAt}`);
  lines.push(`- Query: \`${payload.query}\``);
  lines.push(`- Hits analyzed: **${payload.hitCount}**`);
  lines.push(`- Files touched: **${payload.totals.filesTouched}**`);
  lines.push(`- Candidate move files: **${payload.totals.moveCandidates}**`);
  lines.push('');
  lines.push('## Core Loop Focus');
  lines.push('- Keep runtime/core search infra in `lib/` (exceptions list below).');
  lines.push('- Move docs generator/template/validator-heavy modules out of core search scope where safe.');
  lines.push('- Prioritize high-crowding files first to lower slop with minimal behavioral risk.');
  lines.push('');
  lines.push('## Top Directories By Crowding');
  for (const row of payload.topDirectories) {
    lines.push(`- ${row.dir}: ${row.hits} hits across ${row.files} files`);
  }
  lines.push('');
  lines.push('## Top Noisy Files');
  for (const row of payload.topFiles) {
    lines.push(
      `- ${row.file}: ${row.hits} hits (dup=${row.duplicateHits} docs=${row.docsNoiseHits} gen=${row.generatedHits})`
    );
  }
  lines.push('');
  lines.push('## Move Candidates (Docs Tools Outside Core)');
  if (payload.moveCandidates.length === 0) {
    lines.push('- None detected from current slice.');
  } else {
    for (const row of payload.moveCandidates) {
      lines.push(`- ${row.file}: ${row.hits} hits${row.policyMatched ? ' (policy-matched)' : ''}`);
    }
  }
  lines.push('');
  lines.push('## Core Exceptions (Stay In Core Scope)');
  if (payload.coreExceptions.length === 0) {
    lines.push('- None configured.');
  } else {
    for (const file of payload.coreExceptions) {
      lines.push(`- ${file}`);
    }
  }
  lines.push('');
  lines.push('## High-Crowding First Pass');
  if (payload.highRiskCrowding.length === 0) {
    lines.push('- No high-crowding files in current sample.');
  } else {
    for (const row of payload.highRiskCrowding) {
      lines.push(
        `- ${row.file}: dup=${row.duplicateHits} docs=${row.docsNoiseHits} gen=${row.generatedHits} (total ${row.hits})`
      );
    }
  }
  lines.push('');
  lines.push('## Suggested Low-Risk Sequence');
  lines.push('1. Relocate top docs-tool move candidates into a dedicated docs-tools path (outside runtime core search roots).');
  lines.push('2. Keep imports/exports shims in original locations for compatibility, then phase them out.');
  lines.push('3. Re-run `search:lib:strict` and `search:bench:snapshot:core:local` after each small batch.');
  lines.push('4. Track impact via strict quality, strict p95, and slop delta before moving the next batch.');
  lines.push('');

  await Bun.write('reports/lib-organization-latest.json', `${JSON.stringify(payload, null, 2)}\n`);
  await Bun.write('reports/lib-organization-latest.md', `${lines.join('\n')}\n`);
  console.log('[search:lib:organize:report] wrote reports/lib-organization-latest.json');
  console.log('[search:lib:organize:report] wrote reports/lib-organization-latest.md');
}

await main();
