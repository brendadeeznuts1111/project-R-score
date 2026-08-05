#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
// @see https://developer.mozilla.org/en-US/docs/Web/API/URLPattern — URLPattern named groups
/**
 * Comprehensive glossary registry health check.
 * Validates schema version, surface count, hash patterns, and domId coverage.
 *
 *   bun run glossary:health
 *   bun run glossary:health --json
 *   bun run glossary:health --local   # read public/registry/domain-glossary.json
 */

import { jsonOut } from '../lib/console-depth.ts';

type Check = { name: string; ok: boolean; detail?: string };

type GlossarySection = { hash?: string; domId?: string }; // brand-ok — opaque glossary registry section key
type GlossarySurface = { sections?: GlossarySection[] };
type GlossaryRegistry = {
  schemaVersion?: number;
  surfaces?: GlossarySurface[];
};

const LIVE_GLOSSARY_URL = 'https://score.factory-wager.com/registry/domain-glossary.json';
const LOCAL_REGISTRY = new URL('../public/registry/domain-glossary.json', import.meta.url);

function coloredStatus(ok: boolean): string {
  const ansi = Bun.color(ok ? 'hsl(120,80%,45%)' : 'hsl(0,80%,50%)', 'ansi');
  return typeof ansi === 'string' ? `${ansi}${ok ? '✅' : '❌'}\x1b[0m` : ok ? '✅' : '❌';
}

/** Registry section hashes are short slugs; portal wires them as section::slug / glossary::slug. */
function hashMatches(hash: string): boolean {
  const bare = (hash.startsWith('#') ? hash.slice(1) : hash).trim();
  if (!bare) return false;
  // Accept short slug (domain-glossary bake) or already-qualified portal form
  if (/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(bare)) return true;
  const gPattern = new URLPattern({ hash: 'glossary\\::concept' });
  const sPattern = new URLPattern({ hash: 'section\\::section' });
  return (
    gPattern.test({ hash: bare }) ||
    sPattern.test({ hash: bare }) ||
    gPattern.test(`https://score.factory-wager.com/#${bare}`) ||
    sPattern.test(`https://score.factory-wager.com/#${bare}`)
  );
}

async function loadRegistry(): Promise<GlossaryRegistry> {
  if (Bun.argv.includes('--local')) {
    return (await Bun.file(LOCAL_REGISTRY).json()) as GlossaryRegistry;
  }
  const res = await fetch(LIVE_GLOSSARY_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as GlossaryRegistry;
}

async function main() {
  const checks: Check[] = [];

  let reg: GlossaryRegistry;
  try {
    reg = await loadRegistry();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to load registry: ${msg}`);
    process.exit(1);
  }

  // 1. Schema version
  checks.push({
    name: 'schemaVersion',
    ok: reg.schemaVersion === 3,
    detail: `v${reg.schemaVersion ?? 'missing'}`,
  });

  // 2. Surface count > 0
  const surfaceCount = reg.surfaces?.length ?? 0;
  checks.push({ name: 'surfaces', ok: surfaceCount > 0, detail: `${surfaceCount}` });

  // 3. All hashes parseable via portal URLPattern contract
  let allHashOk = true;
  let totalHashes = 0;
  for (const s of reg.surfaces ?? []) {
    for (const sec of s.sections ?? []) {
      totalHashes++;
      const h = sec.hash ?? '';
      if (!h || !hashMatches(h)) allHashOk = false;
    }
  }
  checks.push({
    name: 'hash patterns',
    ok: allHashOk || totalHashes === 0,
    detail: `${totalHashes}`,
  });

  // 4. All domId present
  let allDomOk = true;
  let totalSections = 0;
  for (const s of reg.surfaces ?? []) {
    for (const sec of s.sections ?? []) {
      totalSections++;
      if (!sec.domId || sec.domId.trim() === '') allDomOk = false;
    }
  }
  checks.push({
    name: 'domId present',
    ok: allDomOk || totalSections === 0,
    detail: `${totalSections}`,
  });

  const allOk = checks.every(c => c.ok);

  if (Bun.argv.includes('--json')) {
    jsonOut({ allOk, checks });
  } else {
    let md = '| Check | Status | Detail |\n| :--- | :--- | :--- |\n';
    for (const c of checks) {
      md += `| ${c.name} | ${coloredStatus(c.ok)} | ${c.detail ?? ''} |\n`;
    }
    const output = Bun.markdown.ansi(`# Glossary Health Check\n\n${md}`, {
      colors: true,
      columns: process.stdout.columns || 80,
    });
    console.log(output);
  }

  process.exit(allOk ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
