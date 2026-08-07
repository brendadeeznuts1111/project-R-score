#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Build agent-team partitions + registry plan for 100% CLI allowlist coverage.
 *
 *   bun scripts/cli-allowlist-team-plan.ts
 *   bun scripts/cli-allowlist-team-plan.ts --write
 *
 * Writes:
 *   artifacts/cli-allowlist-team/plan.json
 *   artifacts/cli-allowlist-team/batch-{1..4}.json
 *   artifacts/cli-allowlist-team/registry-fragment.ts  (append into ref-id-tool-flags)
 */
import {
  ALLOWED_LONG_REGISTRY,
  applyUnknownLongOptionGuardFor,
} from '../lib/docs/ref-id-tool-flags.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('cli:allowlist:plan', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const WRITE = argv.includes('--write');

const SKIP_LEAVES = new Set([
  'help',
  'hlp',
  'version',
  'cached',
  'name-only',
  'exclude-standard',
  'others',
  'porcelain',
  'abbrev-ref',
  'oneline',
  'show-current',
  'show-toplevel',
  'diff-filter',
  'pass-with-no-tests',
  'cpu-prof',
  'cpu-prof-dir',
  'cpu-prof-name',
  'cpu-prof-interval',
]);

function extractLeaves(text: string): string[] {
  const leaves = new Set<string>();
  for (const re of [
    /["']--([a-zA-Z][a-zA-Z0-9-]*)["']/g,
    /includes\(\s*["']--([a-zA-Z][a-zA-Z0-9-]*)["']\s*\)/g,
    /has\(\s*["']--([a-zA-Z][a-zA-Z0-9-]*)["']\s*\)/g,
  ]) {
    for (const m of text.matchAll(re)) {
      const leaf = m[1]!.toLowerCase();
      if (!SKIP_LEAVES.has(leaf)) leaves.add(leaf);
    }
  }
  return [...leaves].sort();
}

function constName(key: string): string {
  return (
    key
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase() + '_ALLOWED_LONG'
  );
}

function keyFrom(scripts: string[]): string {
  return (
    scripts.find(s => !s.includes(':check') && !s.includes(':watch') && !s.endsWith(':json')) ??
    scripts[0]!
  );
}

async function main(): Promise<void> {
  const pkg = (await Bun.file('package.json').json()) as {
    scripts?: Record<string, string>;
  };
  const entries = new Map<string, Set<string>>();
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    for (const x of String(cmd).matchAll(
      /\b(?:bun(?:\s+run)?)\s+(?:run\s+)?((?:tools|scripts)\/[\w./-]+\.ts)/g
    )) {
      const p = x[1]!;
      if (!entries.has(p)) entries.set(p, new Set());
      entries.get(p)!.add(name);
    }
  }

  const already = new Set(Object.keys(ALLOWED_LONG_REGISTRY));
  const plan: Array<{
    key: string;
    constName: string;
    path: string;
    scripts: string[];
    leaves: string[];
    alreadyGuarded: boolean;
    inRegistry: boolean;
  }> = [];
  const seenKeys = new Set<string>();

  for (const [p, names] of [...entries.entries()].sort()) {
    let text = '';
    try {
      text = await Bun.file(p).text();
    } catch {
      continue;
    }
    const leaves = extractLeaves(text);
    const alreadyGuarded = text.includes('applyUnknownLongOptionGuard');
    if (leaves.length === 0 && !alreadyGuarded) continue;
    if (alreadyGuarded && leaves.length === 0) continue;
    if (alreadyGuarded) continue; // already wired

    let key = keyFrom([...names].sort());
    if (seenKeys.has(key) || already.has(key)) {
      key = `${key}@${p.replace(/[^a-z0-9]+/gi, '-').slice(0, 32)}`;
    }
    seenKeys.add(key);
    if (leaves.length === 0) continue;
    plan.push({
      key,
      constName: constName(key),
      path: p,
      scripts: [...names].sort(),
      leaves,
      alreadyGuarded,
      inRegistry: already.has(key),
    });
  }

  const n = 4;
  const batches = Array.from({ length: n }, () => [] as typeof plan);
  plan.forEach((row, i) => batches[i % n]!.push(row));

  const fragmentLines: string[] = [
    '// --- auto-generated allowlist fragment (cli-allowlist-team-plan) ---',
  ];
  for (const e of plan) {
    fragmentLines.push(
      `/** § — ${e.key} (\`${e.path}\`) */`,
      `export const ${e.constName} = ${JSON.stringify(e.leaves)} as const;`
    );
  }
  fragmentLines.push('');
  fragmentLines.push('// registry merges (add to ALLOWED_LONG_REGISTRY):');
  for (const e of plan) {
    fragmentLines.push(`  // '${e.key}': ${e.constName},`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    remaining: plan.length,
    registryKeysNow: already.size,
    targetRegistryKeys: already.size + plan.length,
    batches: batches.map((b, i) => ({ batch: i + 1, count: b.length })),
    entries: plan,
  };

  console.log(
    `Plan: ${plan.length} remaining · registry ${already.size} → ~${already.size + plan.length}`
  );
  for (const b of batches) {
    console.log(`  batch size ${b.length}`);
  }

  if (WRITE) {
    await Bun.$`mkdir -p artifacts/cli-allowlist-team`.quiet();
    await Bun.write('artifacts/cli-allowlist-team/plan.json', `${JSON.stringify(out, null, 2)}\n`);
    for (let i = 0; i < n; i++) {
      await Bun.write(
        `artifacts/cli-allowlist-team/batch-${i + 1}.json`,
        `${JSON.stringify(
          {
            batch: i + 1,
            agent: `allowlist-agent-${i + 1}`,
            instructions: [
              'Wire applyUnknownLongOptionGuardFor ONLY in your batch paths.',
              'Do NOT edit lib/docs/ref-id-tool-flags.ts (orchestrator owns registry).',
              'Write results to artifacts/cli-allowlist-team/result-{batch}.json',
              'Each result row: { key, path, leaves, wired: true|false, notes }',
              'Use applyUnknownLongOptionGuard(argv, leaves, { cliName: key }) until registry lands,',
              'OR wait for orchestrator registry merge then use applyUnknownLongOptionGuardFor.',
            ],
            count: batches[i]!.length,
            rows: batches[i],
          },
          null,
          2
        )}\n`
      );
    }
    await Bun.write(
      'artifacts/cli-allowlist-team/registry-fragment.ts',
      fragmentLines.join('\n') + '\n'
    );
    console.log('wrote artifacts/cli-allowlist-team/{plan,batch-*,registry-fragment.ts}');
  }
}

await main();
