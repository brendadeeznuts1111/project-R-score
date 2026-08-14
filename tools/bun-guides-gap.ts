#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/glob#quickstart
/**
 * Scan monorepo markdown for Bun guide href coverage vs inventory.
 *
 *   bun tools/bun-guides-gap.ts
 *   bun tools/bun-guides-gap.ts --spine
 *   bun tools/bun-guides-gap.ts --json
 *   bun tools/bun-guides-gap.ts --cluster install
 *
 * @see lib/docs/bun-guides-inventory.ts
 * @see https://bun.com/docs/guides/index
 */
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  BUN_GUIDES,
  guideUrl,
  type GuideCluster,
  type GuidePriority,
} from '../lib/docs/bun-guides-inventory.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');

const argv = applyUnknownLongOptionGuardFor('bun-guides-gap', Bun.argv.slice(2));
const asJson = argv.includes('--json');
const spineOnly = argv.includes('--spine');
const clusterIdx = argv.indexOf('--cluster');
const clusterFilter =
  clusterIdx >= 0 && argv[clusterIdx + 1] ? (argv[clusterIdx + 1] as GuideCluster) : null;

/** Collect guide path suffixes mentioned in docs markdown and AGENTS.md. */
async function collectReferencedPaths(): Promise<Set<string>> {
  const found = new Set<string>();
  const files: string[] = [];
  for (const name of ['AGENTS.md', 'README.md', 'wiki-index.md']) {
    const p = joinPath(ROOT, name);
    if (await Bun.file(p).exists()) files.push(p);
  }
  const glob = new Bun.Glob('docs/**/*.{md,mdx}');
  for await (const rel of glob.scan({ cwd: ROOT })) {
    files.push(joinPath(ROOT, rel));
  }
  for (const file of files) {
    try {
      await scanText(await Bun.file(file).text(), found);
    } catch {
      /* skip unreadable */
    }
  }
  return found;
}

function scanText(text: string, found: Set<string>): void {
  // https://bun.com/docs/guides/install/add or markdown links
  const re = /bun\.com\/docs\/guides\/([a-z0-9_./-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[1]!.replace(/#.*$/, '').replace(/\/$/, '');
    found.add(raw);
  }
}

type Row = {
  path: string;
  cluster: GuideCluster;
  title: string;
  priority: GuidePriority;
  documented: boolean;
  url: string;
};

async function main(): Promise<void> {
  const refs = await collectReferencedPaths();
  let guides = [...BUN_GUIDES];
  if (spineOnly) guides = guides.filter(g => g.priority === 'spine');
  if (clusterFilter) guides = guides.filter(g => g.cluster === clusterFilter);

  const rows: Row[] = guides.map(g => {
    const documented =
      refs.has(g.path) ||
      [...refs].some(r => r === g.path || r.startsWith(`${g.path}/`) || r.startsWith(`${g.path}#`));
    return {
      path: g.path,
      cluster: g.cluster,
      title: g.title,
      priority: g.priority,
      documented,
      url: guideUrl(g.path),
    };
  });

  const missing = rows.filter(r => !r.documented && r.priority !== 'out-of-scope');
  const spineMissing = missing.filter(r => r.priority === 'spine');
  const usefulMissing = missing.filter(r => r.priority === 'useful');

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          inventory: BUN_GUIDES.length,
          scanned: rows.length,
          documented: rows.filter(r => r.documented).length,
          spineMissing: spineMissing.map(r => r.path),
          usefulMissing: usefulMissing.map(r => r.path),
          rows,
        },
        null,
        2
      )
    );
    process.exit(spineMissing.length > 0 ? 1 : 0);
  }

  console.log(`Bun guides gap · inventory=${BUN_GUIDES.length} · scanned=${rows.length}`);
  console.log(
    `  documented=${rows.filter(r => r.documented).length} · missing spine=${spineMissing.length} · missing useful=${usefulMissing.length}`
  );
  console.log('');

  if (spineMissing.length) {
    console.log('## Spine gaps (should link from docs)');
    for (const r of spineMissing) {
      console.log(`  ❌ ${r.path.padEnd(36)} ${r.title}`);
      console.log(`     ${r.url}`);
    }
    console.log('');
  }

  if (usefulMissing.length && !spineOnly) {
    console.log('## Useful gaps (nice to document)');
    for (const r of usefulMissing.slice(0, 40)) {
      console.log(`  · ${r.path.padEnd(36)} ${r.title}`);
    }
    if (usefulMissing.length > 40) console.log(`  … +${usefulMissing.length - 40} more`);
    console.log('');
  }

  // By cluster summary
  console.log('## Coverage by cluster');
  const clusters = [...new Set(rows.map(r => r.cluster))].sort();
  for (const c of clusters) {
    const subset = rows.filter(r => r.cluster === c);
    const doc = subset.filter(r => r.documented).length;
    console.log(`  ${c.padEnd(14)} ${String(doc).padStart(3)}/${subset.length}`);
  }

  process.exit(spineMissing.length > 0 ? 1 : 0);
}

if (import.meta.main) {
  await main();
}
