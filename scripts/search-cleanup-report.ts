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

type BenchProfile = {
  profile: string;
  qualityScore: number;
};

type BenchPayload = {
  rankedProfiles: BenchProfile[];
};

async function runJson(cmd: string): Promise<any> {
  const out = await Bun.$`${{ raw: cmd }}`.text();
  const idx = out.indexOf('{');
  if (idx < 0) {
    throw new Error(`No JSON payload for command: ${cmd}`);
  }
  return JSON.parse(out.slice(idx));
}

function topEntries<K>(items: Iterable<[K, number]>, n = 12): Array<[K, number]> {
  return [...items].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function isMoveCandidate(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.includes('/lib/docs/') &&
    (
      lower.includes('generator') ||
      lower.includes('template') ||
      lower.includes('validator') ||
      lower.includes('/builders/')
    )
  );
}

async function main(): Promise<void> {
  const cleanup = (await runJson(
    'bun run scripts/search-smart.ts "generated declaration duplicate docs noise" --path ./lib --view slop-only --task cleanup --group-limit 8 --show-mirrors --json'
  )) as CleanupPayload;

  const bench = (await runJson(
    'bun run scripts/search-benchmark.ts --path ./lib --limit 40'
  )) as BenchPayload;

  const hits = cleanup.hits || [];
  const byFile = new Map<string, number>();
  const byTag = new Map<string, number>();
  for (const h of hits) {
    byFile.set(h.file, (byFile.get(h.file) || 0) + 1);
    const tag = h.qualityTag || 'unknown';
    byTag.set(tag, (byTag.get(tag) || 0) + 1);
  }

  const strict = bench.rankedProfiles?.find((p) => p.profile === 'lib-strict');
  const mixed = bench.rankedProfiles?.find((p) => p.profile === 'mixed');
  const lines: string[] = [];
  lines.push('# Lib Slop Cleanup Report');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Query: \`${cleanup.query}\``);
  lines.push(`- Hits analyzed: **${hits.length}**`);
  if (strict && mixed) {
    lines.push(
      `- Quality baseline: lib-strict **${strict.qualityScore.toFixed(2)}** vs mixed **${mixed.qualityScore.toFixed(2)}**`
    );
  }
  lines.push('');
  lines.push('## Tag Distribution');
  for (const [tag, count] of topEntries(byTag.entries(), 10)) {
    lines.push(`- ${tag}: ${count}`);
  }
  lines.push('');
  lines.push('## Top Noisy Files');
  for (const [file, count] of topEntries(byFile.entries(), 20)) {
    lines.push(`- ${file}: ${count} hits`);
  }
  lines.push('');
  lines.push('## Move Candidates (Outside `lib/` Core Scope)');
  const moveCandidates = topEntries(
    [...byFile.entries()].filter(([file]) => isMoveCandidate(file)),
    20
  );
  if (moveCandidates.length === 0) {
    lines.push('- None detected in current slice.');
  } else {
    for (const [file, count] of moveCandidates) {
      lines.push(`- ${file}: ${count} hits (candidate for docs-tools/docs-builders package)`);
    }
  }
  lines.push('');
  lines.push('## First Pass (Low Risk)');
  lines.push('- Move docs-demo/helper code under a dedicated non-lib path where possible.');
  lines.push('- Mark generated/template outputs with explicit generated markers and exclude path rules.');
  lines.push('- Split runtime code from docs generation examples in `lib/docs/` modules.');
  lines.push('- Keep `--scope code --view clean` default for delivery workflows.');
  lines.push('');
  lines.push('## Immediate Targets');
  for (const h of hits.slice(0, 20)) {
    lines.push(`- ${h.file}:${h.line} [${h.qualityTag || 'unknown'}] ${h.text.slice(0, 140)}`);
  }
  lines.push('');

  const reportPath = 'reports/slop-cleanup-lib-latest.md';
  await Bun.write(reportPath, `${lines.join('\n')}\n`);
  console.log(`[search:cleanup:report] wrote ${reportPath}`);
}

await main();
