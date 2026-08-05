#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Write /registry/bake-manifest.json — baked_at / source inventory for boards.
 *
 * Includes `runtime` provenance (Bun version that wrote the inventory) so
 * production boards can prove which toolchain generated static data.
 *
 *   bun tools/bake-registry-manifest.ts
 *   bun tools/bake-registry-manifest.ts --etag
 */
import { joinPath } from '../lib/path-bun.ts';
import { BAKE_MANIFEST_PATH, buildBakeManifest } from '../lib/registry/bake-manifest.ts';

const root = joinPath(import.meta.dir, '..');
const registryDir = joinPath(root, 'public', 'registry');
const outPath = joinPath(registryDir, 'bake-manifest.json');

const manifest = await buildBakeManifest({
  registryDir,
  includeEtag: Bun.argv.includes('--etag'),
});

const tmp = `${outPath}.${Bun.randomUUIDv7()}.tmp`;
await Bun.write(tmp, `${JSON.stringify(manifest, null, 2)}\n`);
await Bun.$`mv ${tmp} ${outPath}`.quiet();

const rt = manifest.runtime;
console.info(
  `✅ wrote ${BAKE_MANIFEST_PATH} (${manifest.summary.files} files · ${manifest.summary.withTimestamp} with timestamps · ${rt.runtime} ${rt.runtimeVersion})`
);
