#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-workspace-taxonomy.ts — session/chrome/concept crosswalk →
 * public/registry/workspace-lane-map.json
 *
 *   bun run workspace-taxonomy:bake
 *   bun run workspace-taxonomy:check   # fail on drift vs committed bake
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { buildWorkspaceTaxonomyMap } from '../lib/docs/workspace-taxonomy.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const OUT_PATH = resolvePath(ROOT, 'public/registry/workspace-lane-map.json');
const CHECK = Bun.argv.includes('--check');

async function main(): Promise<number> {
  if (CHECK) {
    if (!(await Bun.file(OUT_PATH).exists())) {
      console.error(`missing ${OUT_PATH} — run: bun run workspace-taxonomy:bake`);
      return 1;
    }
    const existing = (await Bun.file(OUT_PATH).json()) as Record<string, unknown>;
    const next = buildWorkspaceTaxonomyMap(
      typeof existing.bakedAt === 'string' ? existing.bakedAt : new Date().toISOString()
    );
    const a = { ...existing, bakedAt: 'x' };
    const b = { ...next, bakedAt: 'x' };
    if (!Bun.deepEquals(a, b, true)) {
      console.error('workspace-lane-map.json drift — run: bun run workspace-taxonomy:bake');
      return 1;
    }
    console.info('workspace-lane-map.json ok (deep-equal ignoring bakedAt)');
    return 0;
  }

  const map = buildWorkspaceTaxonomyMap();
  await Bun.write(OUT_PATH, `${JSON.stringify(map, null, 2)}\n`);
  console.info(
    `workspace-lane-map.json baked: ${map.sessionLanes.length} session lanes · ${map.correlations.length} correlations`
  );
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
