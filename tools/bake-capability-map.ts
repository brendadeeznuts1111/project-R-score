#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Bake AGENTS.md grounded capability map → public/registry/capability-map-subset.json
 *
 *   bun run bake:capabilities
 *   bun run bake:capabilities:check   # fail if registry file stale
 *   bun tools/bake-capability-map.ts --write|--check
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  buildCapabilityMapSubset,
  capabilityMapSubsetFingerprint,
  CAPABILITY_MAP_SUBSET_REL,
  serializeCapabilityMapSubset,
  type CapabilityMapSubset,
} from '../lib/portal/capability-map-subset.ts';

const ROOT = joinPath(import.meta.dir, '..');
const AGENTS = joinPath(ROOT, 'AGENTS.md');
const OUT = joinPath(ROOT, CAPABILITY_MAP_SUBSET_REL);
const CHECK = Bun.argv.includes('--check');
const WRITE = Bun.argv.includes('--write') || (!CHECK && !Bun.argv.includes('--help'));

async function main(): Promise<void> {
  if (Bun.argv.includes('--help') || Bun.argv.includes('-h')) {
    console.log(`Usage: bun tools/bake-capability-map.ts [--write] [--check]

  --write   Parse AGENTS.md and write ${CAPABILITY_MAP_SUBSET_REL} (default)
  --check   Fail if registry file missing or out of sync with AGENTS.md
`);
    process.exit(0);
  }

  const md = await Bun.file(AGENTS).text();
  const next = buildCapabilityMapSubset(md);

  if (CHECK) {
    const f = Bun.file(OUT);
    if (!(await f.exists())) {
      console.error(`missing ${CAPABILITY_MAP_SUBSET_REL} — run: bun run bake:capabilities`);
      process.exit(1);
    }
    const prev = (await f.json()) as CapabilityMapSubset;
    if (capabilityMapSubsetFingerprint(prev) !== capabilityMapSubsetFingerprint(next)) {
      console.error(
        `stale ${CAPABILITY_MAP_SUBSET_REL} (rows=${prev.rowCount ?? prev.rows?.length} → ${next.rowCount})\n` +
          `Run: bun run bake:capabilities`
      );
      process.exit(1);
    }
    console.log(`capability-map-subset: OK · ${next.rowCount} rows · source ${next.source}`);
    return;
  }

  if (WRITE) {
    await Bun.write(OUT, serializeCapabilityMapSubset(next));
    console.log(
      `capability-map-subset: wrote ${CAPABILITY_MAP_SUBSET_REL} · ${next.rowCount} rows · ${next.generatedAt}`
    );
  }
}

if (import.meta.main) {
  await main();
}
