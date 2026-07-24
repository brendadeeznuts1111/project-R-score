#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * build-doc-index.ts — export CANONICAL_REFS + catalog metadata to registry proof JSON.
 *
 *   bun tools/build-doc-index.ts
 *   bun tools/build-doc-index.ts --save
 *   curl -sf http://127.0.0.1:3000/api/doc-refs/script | bun run - --save
 *
 * @see https://bun.com/docs/llms.txt
 * @see ./bun-doc-refs.ts — CANONICAL_REFS
 */
import { inspectTable } from '../lib/http/networking-report.ts';
import { buildDocIndex, DOC_INDEX_PATH } from '../lib/docs/doc-index.ts';

const SHOULD_SAVE = process.argv.includes('--save');

const index = await buildDocIndex();

if (SHOULD_SAVE) {
  await Bun.write(DOC_INDEX_PATH, JSON.stringify(index, null, 2) + '\n');
}

console.log(`📄 Doc index: ${index.totalEntries} entries (Bun ${index.bunVersion})`);
console.log(
  inspectTable(
    Object.entries(index.byStability).map(([k, v]) => ({ stability: k, count: v })),
    ['stability', 'count'],
    { colors: true }
  )
);
console.log(
  inspectTable(
    Object.entries(index.byKind).map(([k, v]) => ({ kind: k, count: v })),
    ['kind', 'count'],
    { colors: true }
  )
);

const dc = index.defaultsCoverage;
console.log(`\n📚 Defaults doc coverage: ${dc.documented}/${dc.total} ${dc.passed ? '✅' : '❌'}`);
console.log(`🔒 Proof hash: ${index.proofHash.slice(0, 16)}…`);

if (SHOULD_SAVE) {
  console.log(`💾 Wrote ${DOC_INDEX_PATH}`);
}

if (!dc.passed) {
  for (const row of dc.rows.filter(r => !r.documented)) {
    console.error(`  ❌ missing ref: ${row.name} → ${row.docKey}`);
  }
  process.exit(1);
}
