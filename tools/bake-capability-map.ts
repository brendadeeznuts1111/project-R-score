#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bake grounded capability map → registry JSON.
 *
 * SSOT: docs/harness/capability-map.md (JIT extract from root AGENTS.md).
 *
 *   bun run bake:capabilities
 *   bun run bake:capabilities:check   # fail if registry files stale
 *   bun tools/bake-capability-map.ts --write|--check
 *
 * Writes:
 *   public/registry/capability-map-subset.json  (tools hub / packages panel)
 *   public/registry/capability-map-full.json    (debug / portal docs)
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('bake:capabilities', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  buildCapabilityMapFull,
  buildCapabilityMapSubset,
  capabilityFullMapsDeepEqual,
  capabilityMapsDeepEqual,
  CAPABILITY_MAP_FULL_REL,
  CAPABILITY_MAP_MARKDOWN_REL,
  CAPABILITY_MAP_SUBSET_REL,
  serializeCapabilityMapFull,
  serializeCapabilityMapSubset,
  type CapabilityMapFull,
  type CapabilityMapSubset,
} from '../lib/portal/capability-map-subset.ts';

const ROOT = joinPath(import.meta.dir, '..');
const MAP_MD = joinPath(ROOT, CAPABILITY_MAP_MARKDOWN_REL);
const OUT_SUBSET = joinPath(ROOT, CAPABILITY_MAP_SUBSET_REL);
const OUT_FULL = joinPath(ROOT, CAPABILITY_MAP_FULL_REL);
const CHECK = argv.includes('--check');
const WRITE = argv.includes('--write') || (!CHECK && !argv.includes('--help'));

async function main(): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: bun tools/bake-capability-map.ts [--write] [--check]

  --write   Parse ${CAPABILITY_MAP_MARKDOWN_REL} and write subset + full registry JSON (default)
  --check   Fail if registry files missing or out of sync with the markdown SSOT
`);
    process.exit(0);
  }

  const md = await Bun.file(MAP_MD).text();
  const nextSubset = buildCapabilityMapSubset(md);
  const nextFull = buildCapabilityMapFull(md);

  if (CHECK) {
    const fSub = Bun.file(OUT_SUBSET);
    if (!(await fSub.exists())) {
      console.error(`missing ${CAPABILITY_MAP_SUBSET_REL} — run: bun run bake:capabilities`);
      process.exit(1);
    }
    const prevSub = (await fSub.json()) as CapabilityMapSubset;
    // Bun.deepEquals (strict) — not string fingerprint — is the bake drift SSOT.
    if (!capabilityMapsDeepEqual(prevSub, nextSubset)) {
      console.error(
        `stale ${CAPABILITY_MAP_SUBSET_REL} (rows=${prevSub.rowCount ?? prevSub.rows?.length} → ${nextSubset.rowCount})\n` +
          `Run: bun run bake:capabilities`
      );
      process.exit(1);
    }

    const fFull = Bun.file(OUT_FULL);
    if (!(await fFull.exists())) {
      console.error(`missing ${CAPABILITY_MAP_FULL_REL} — run: bun run bake:capabilities`);
      process.exit(1);
    }
    const prevFull = (await fFull.json()) as CapabilityMapFull;
    if (!capabilityFullMapsDeepEqual(prevFull, nextFull)) {
      console.error(
        `stale ${CAPABILITY_MAP_FULL_REL} (rows=${prevFull.rowCount ?? prevFull.rows?.length} → ${nextFull.rowCount})\n` +
          `Run: bun run bake:capabilities`
      );
      process.exit(1);
    }

    const { protocolCounts } = nextSubset.summary;
    const proto = Object.entries(protocolCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(' · ');
    console.log(
      `capability-map: OK · subset ${nextSubset.rowCount} rows · full ${nextFull.rowCount} rows · ${proto} · schema v${nextSubset.schemaVersion}`
    );
    return;
  }

  if (WRITE) {
    await Bun.write(OUT_SUBSET, serializeCapabilityMapSubset(nextSubset));
    await Bun.write(OUT_FULL, serializeCapabilityMapFull(nextFull));
    const { protocolCounts, typeCounts } = nextSubset.summary;
    console.log(
      `capability-map: wrote ${CAPABILITY_MAP_SUBSET_REL} + ${CAPABILITY_MAP_FULL_REL} · ${nextSubset.rowCount} rows · schema v${nextSubset.schemaVersion} · ${nextSubset.generatedAt}`
    );
    console.log(
      `  protocols: ${JSON.stringify(protocolCounts)} · types: ${Object.keys(typeCounts).length} distinct`
    );
  }
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}
