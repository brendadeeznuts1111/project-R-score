#!/usr/bin/env bun
/**
 * Comprehensive glossary registry health check.
 * Validates schema version, surface count, hash patterns, and domId coverage.
 *
 *   bun run glossary:health
 *   bun run glossary:health --json
 */

type Check = { name: string; ok: boolean; detail?: string };

const REGISTRY_URL = 'https://score.factory-wager.com/registry/domain-glossary.json';

function coloredStatus(ok: boolean): string {
  const ansi = Bun.color(ok ? 'hsl(120,80%,45%)' : 'hsl(0,80%,50%)', 'ansi');
  return typeof ansi === 'string' ? `${ansi}${ok ? '✅' : '❌'}\x1b[0m` : ok ? '✅' : '❌';
}

async function main() {
  const checks: Check[] = [];

  // Fetch registry
  let reg: any;
  try {
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    reg = await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to fetch registry: ${msg}`);
    process.exit(1);
  }

  // 1. Schema version
  checks.push({ name: 'schemaVersion', ok: reg.schemaVersion === 3, detail: `v${reg.schemaVersion}` });

  // 2. Surface count > 0
  const surfaceCount = reg.surfaces?.length ?? 0;
  checks.push({ name: 'surfaces', ok: surfaceCount > 0, detail: `${surfaceCount}` });

  // 3. All hashes parseable
  const gPattern = new URLPattern({ hash: 'glossary:([a-zA-Z0-9_.]+)' });
  const sPattern = new URLPattern({ hash: 'section:([a-zA-Z0-9_.]+)' });
  let allHashOk = true;
  let totalHashes = 0;
  for (const s of reg.surfaces ?? []) {
    for (const sec of s.sections ?? []) {
      totalHashes++;
      if (!gPattern.test('#' + sec.hash) && !sPattern.test('#' + sec.hash)) {
        allHashOk = false;
      }
    }
  }
  checks.push({ name: 'hash patterns', ok: allHashOk, detail: `${totalHashes}` });

  // 4. All domId present
  let allDomOk = true;
  let totalSections = 0;
  for (const s of reg.surfaces ?? []) {
    for (const sec of s.sections ?? []) {
      totalSections++;
      if (!sec.domId || sec.domId.trim() === '') allDomOk = false;
    }
  }
  checks.push({ name: 'domId present', ok: allDomOk, detail: `${totalSections}` });

  // Render
  const allOk = checks.every(c => c.ok);

  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify({ allOk, checks }, null, 2));
  } else {
    let md = '| Check | Status | Detail |\n| :--- | :--- | :--- |\n';
    for (const c of checks) {
      md += `| ${c.name} | ${coloredStatus(c.ok)} | ${c.detail ?? ''} |\n`;
    }
    const output = Bun.markdown.ansi(
      `# Glossary Health Check\n\n${md}`,
      { colors: true, columns: process.stdout.columns || 80 },
    );
    console.log(output);
  }

  process.exit(allOk ? 0 : 1);
}

await main();
