#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Overwrite R2 `registry.json` from the static snapshot SSOT.
 *
 * Use when R2 holds a corrupt stub (e.g. Pages forbidden placeholder) while
 * `public/registry/registry.json` is valid. Edge handler prefers static first;
 * this heals the bucket for direct R2 reads and npm index consistency.
 *
 *   bun tools/sync-registry-index-r2.ts
 *   bun tools/sync-registry-index-r2.ts --dry-run
 */
import { joinPath } from '../lib/path-bun.ts';
import { createS3RegistryStore } from '../lib/factory/object-store.ts';

const ROOT = import.meta.dirname.replace(/\/tools$/, '');
const SNAPSHOT = joinPath(ROOT, 'public/registry/registry.json');
const dryRun = Bun.argv.includes('--dry-run');

const raw = await Bun.file(SNAPSHOT).text();
const parsed = JSON.parse(raw) as { packages?: unknown };
if (!parsed.packages || typeof parsed.packages !== 'object') {
  console.error(`invalid snapshot (missing packages): ${SNAPSHOT}`);
  process.exit(1);
}

if (dryRun) {
  console.log(
    JSON.stringify({ ok: true, dryRun: true, bytes: raw.length, snapshot: SNAPSHOT }, null, 2)
  );
  process.exit(0);
}

const store = createS3RegistryStore();
await store.putJson('registry.json', parsed);
console.log(JSON.stringify({ ok: true, bytes: raw.length, key: 'registry.json' }, null, 2));
