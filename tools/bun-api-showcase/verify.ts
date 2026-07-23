#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/redis#getting-started — RedisClient
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-readablestreamto — Bun.readableStreamTo
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/llms.txt
/**
 * Three-source Bun API verification harness:
 *   1. Type definitions — local bun-types (bun.d.ts)
 *   2. Documentation   — repo SSOT tools/bun-docs-index.json (317 pages + anchors)
 *   3. Runtime probe   — typeof resolution against the live Bun binary
 *
 * Emits a proof manifest (sha256 per API over signature+doc+probe) to
 * tools/bun-api-showcase/proof-manifest.json. Re-run after Bun upgrades;
 * diff the manifest to catch API drift.
 *
 * Usage: bun run showcase:verify [--write]
 */

import { demos } from './oneliners.ts';
import { CANONICAL_REFS } from '../bun-doc-refs.ts';
import {
  proofHash,
  probeRuntimeApi,
  readBunTypesText,
  resolveBunTypesDir,
  typesContains,
} from '../../lib/bun-api-proof.ts';

const DOCS_INDEX = 'tools/bun-docs-index.json';
const MANIFEST = 'tools/bun-api-showcase/proof-manifest.json';
const BUN_TYPES_DIR = resolveBunTypesDir();

type DocsEntry = { title: string; url: string; desc?: string; domain?: string; anchors?: string[] };

/** Curated aliases where the tracked API name differs from the canonical key. */
const CANONICAL_ALIAS: Record<string, string> = {
  'Bun.RedisClient': 'RedisClient',
  'Bun.readableStreamToArray': 'Bun.readableStreamTo',
  'Bun.readableStreamToBytes': 'Bun.readableStreamTo',
  'Bun.readableStreamToJSON': 'Bun.readableStreamTo',
  'Bun.readableStreamToBlob': 'Bun.readableStreamTo',
  'Bun.readableStreamToFormData': 'Bun.readableStreamTo',
  'Bun.stdout': 'Bun.stdin', // same stdio docs page family
  'Bun.stderr': 'Bun.stdin',
};

function findDoc(api: string, entries: DocsEntry[]): string | null {
  const canonical = CANONICAL_REFS[api] ?? CANONICAL_REFS[CANONICAL_ALIAS[api] ?? ''];
  if (canonical) return canonical;
  const token = api.split(/[.:]/).pop()!.toLowerCase();
  for (const e of entries) {
    const hay = [e.title, e.url, e.desc ?? '', e.domain ?? '', ...(e.anchors ?? [])]
      .join('\n')
      .toLowerCase();
    if (hay.includes(token)) return e.url;
  }
  return null;
}

const dts = await readBunTypesText();
const docs = (await Bun.file(DOCS_INDEX).json()) as { entries: DocsEntry[]; bunVersion?: string };
const apis = [...new Set(demos.flatMap(d => d.apis))].sort();

type Proof = {
  inTypes: boolean;
  inDocs: boolean;
  docUrl: string | null;
  runtime: string;
  ok: boolean;
  sha256: string;
};

const manifest: Record<string, Proof> = {};
let verified = 0;
const mismatches: string[] = [];

for (const api of apis) {
  const inTypes = typesContains(dts, api);
  const docUrl = findDoc(api, docs.entries);
  const runtime = await probeRuntimeApi(api);
  const runtimeOk = runtime !== 'undefined';
  const sha256 = proofHash({
    signature: `${api}|types:${inTypes}|doc:${docUrl}|runtime:${runtime}`,
  });
  const ok = inTypes && runtimeOk;
  manifest[api] = { inTypes, inDocs: docUrl != null, docUrl, runtime, ok, sha256 };
  if (ok) verified++;
  else mismatches.push(`${api} (types:${inTypes} runtime:${runtime})`);
}

const pct = Math.round((verified / apis.length) * 100);
console.log(`Bun: ${Bun.version} · bun-types: ${BUN_TYPES_DIR.split('/').slice(-2, -1)[0]}`);
console.log(`APIs: ${apis.length} · verified (types+runtime): ${verified} (${pct}%)`);
const undocumented = Object.entries(manifest).filter(([, p]) => !p.inDocs);
console.log(`Doc coverage: ${apis.length - undocumented.length}/${apis.length} pages matched`);
if (undocumented.length > 0) {
  console.log('\nNo docs page matched:');
  for (const [a] of undocumented) console.log(`  - ${a}`);
}
if (mismatches.length > 0) {
  console.log('\nMISMATCHES:');
  for (const m of mismatches) console.log(`  ✗ ${m}`);
}

if (Bun.argv.includes('--write')) {
  const out = {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    docsIndexVersion: docs.bunVersion ?? null,
    verified,
    total: apis.length,
    apis: manifest,
  };
  await Bun.write(MANIFEST, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${MANIFEST}`);
} else {
  console.log('\n(dry run — pass --write to emit proof-manifest.json)');
}

if (mismatches.length > 0) process.exit(1);
