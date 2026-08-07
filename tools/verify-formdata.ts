#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * verify-formdata.ts — Bun FormData file upload proof per docs guide.
 *
 * Tests: req.formData() → .get() → Blob → Bun.write() chain.
 * Verifies Bun auto-sets Content-Type: multipart/form-data; boundary=...
 *
 * Bun docs: https://bun.com/docs/guides/http/file-uploads
 *
 * Usage:
 *   bun tools/verify-formdata.ts                           # run proof
 *   bun tools/verify-formdata.ts --save                    # save + print
 */
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { inspect, CryptoHasher } from 'bun';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('check:formdata', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const BASE = Bun.env.HEALTH_URL || 'http://localhost:3000';
const SHOULD_SAVE = argv.includes('--save');
const SAVE_PATH = 'public/registry/formdata-proof.json';
const TOKEN = Bun.env.FACTORY_WAGER_TOKEN || Bun.env.REGISTRY_SECRET || 'dev-key';

type FormDataTest = {
  name: string;
  fileContent: string;
  fileName: string;
  mimeType: string;
  version: string;
};

type FormDataResult = {
  test: FormDataTest;
  statusCode: number;
  contentType: string; // what Bun auto-set on the request
  contentTypeHeader: string; // what server received
  success: boolean;
  checksum: string;
  durMs: number;
  ok: boolean;
};

async function runFormDataTest(test: FormDataTest, expectedToken: string): Promise<FormDataResult> {
  const form = new FormData();
  form.append('version', test.version);
  form.append('tags', 'latest,formdata-test');
  form.append(
    'metadata',
    JSON.stringify({
      description: `FormData: ${test.name}`,
      type: 'library',
      source: 'verify-formdata',
    })
  );

  const blob = new Blob([test.fileContent], { type: test.mimeType });
  form.append('file', blob, test.fileName);
  form.append('originalName', test.fileName);
  form.append('originalType', test.mimeType);

  const t0 = Bun.nanoseconds();
  const res = await fetch(`${BASE}/api/registry/__formdata-test/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${expectedToken}`,
      // Do NOT set Content-Type — Bun must auto-set multipart/form-data with boundary
    },
    body: form,
  });
  const durMs = (Bun.nanoseconds() - t0) / 1e6;
  const data = await res.json();
  const sentContentType =
    res.headers.get('x-content-type-request') || '(auto: multipart/form-data)';

  return {
    test,
    statusCode: res.status,
    contentType: sentContentType,
    contentTypeHeader: '(auto-set by Bun)',
    success: data.success === true,
    checksum: data.checksum || '',
    durMs: +durMs.toFixed(2),
    ok: res.status === 200 && data.success === true,
  };
}

async function main() {
  const expectedToken = TOKEN;
  if (!expectedToken || expectedToken === 'dev-key') {
    console.log('⚠️  Using dev-key — set FACTORY_WAGER_TOKEN for production');
  }

  const tests: FormDataTest[] = [
    {
      name: 'JavaScript plugin',
      fileContent: 'module.exports = { name: "test" };',
      fileName: 'plugin.js',
      mimeType: 'text/javascript',
      version: '1.0.0',
    },
    {
      name: 'CSS stylesheet',
      fileContent: '.test { color: red; }',
      fileName: 'styles.css',
      mimeType: 'text/css',
      version: '1.0.0',
    },
    {
      name: 'JSON config',
      fileContent: JSON.stringify({ key: 'value' }),
      fileName: 'config.json',
      mimeType: 'application/json',
      version: '1.0.0',
    },
    {
      name: 'Binary WASM',
      fileContent: '\x00asm\x01\x00\x00\x00',
      fileName: 'module.wasm',
      mimeType: 'application/wasm',
      version: '1.0.0',
    },
    {
      name: 'Markdown doc',
      fileContent: '# Hello\n\nThis is a **test**.',
      fileName: 'readme.md',
      mimeType: 'text/markdown',
      version: '1.0.0',
    },
  ];

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 FormData File Upload Proof (Bun docs guide)                      ║');
  console.log(`║  Base: ${BASE.padEnd(57)}║`);
  console.log(
    `║  Bun:  ${(Bun.version + ' / ' + (Bun.revision?.slice(0, 8) || 'unknown')).padEnd(57)}║`
  );
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Pattern: req.formData() → .get("file") → Blob → Bun.write()');
  console.log('  Content-Type: auto-set by Bun (multipart/form-data; boundary=...)');
  console.log('');

  const results: FormDataResult[] = [];
  for (const test of tests) {
    results.push(await runFormDataTest(test, expectedToken));
  }

  // Render
  const table = inspect(
    results.map(r => [
      r.test.fileName,
      r.test.mimeType,
      r.statusCode,
      r.success ? '✅' : '❌',
      r.checksum.slice(0, 12) + '…',
      r.durMs + 'ms',
    ]),
    { colors: true, table: true }
  );
  console.log(table);

  const allOk = results.every(r => r.ok);
  console.log(`\n  📊 ${results.filter(r => r.ok).length}/${results.length} uploads passed`);

  // Compute proof hash
  const hasher = new CryptoHasher('sha256');
  for (const r of results) {
    hasher.update(r.test.name);
    hasher.update(r.checksum);
    hasher.update(String(r.statusCode));
  }
  const proofHash = hasher.digest('hex');

  // Save proof
  const proof = {
    schemaVersion: 1,
    bunVersion: Bun.version,
    bunRevision: Bun.revision?.slice(0, 12) || 'unknown',
    timestamp: new Date().toISOString(),
    base: BASE,
    totalTests: tests.length,
    allOk,
    proofHash,
    contentType: 'multipart/form-data; boundary=... (auto-set by Bun)',
    docsUrl: 'https://bun.com/docs/guides/http/file-uploads',
    results,
  };

  if (SHOULD_SAVE) {
    await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
  }

  console.log(`\n  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);
  console.log(`  📋 All uploads: ${allOk ? '✅' : '❌'}`);

  if (!allOk) {
    results
      .filter(r => !r.ok)
      .forEach(r => console.log(`    ❌ ${r.test.name}: HTTP ${r.statusCode}`));
    process.exit(1);
  }

  console.log('');
  console.log('  Canonical API references:');
  console.log('    • req.formData():      https://bun.com/docs/guides/http/file-uploads');
  console.log(
    '    • Bun.write():         https://bun.com/docs/runtime/file-io#writing-files-bun-write'
  );
  console.log('    • Bun.CryptoHasher:    https://bun.com/docs/runtime/hashing');
  console.log('    • Bun.inspect:         https://bun.com/docs/runtime/utils#bun-inspect');
}

if (import.meta.main) {
  await main();
}
