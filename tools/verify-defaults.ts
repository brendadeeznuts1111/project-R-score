#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
/**
 * verify-defaults.ts — Verify Bun API default behaviors.
 *
 * 12 one-liners testing defaults for: CryptoHasher, password.hash, inspect,
 * write, file, serve, which, escapeHTML, readableStreamToBytes, nanoseconds,
 * sleep, hash.
 *
 * Usage:
 *   bun tools/verify-defaults.ts
 *   bun tools/verify-defaults.ts --save
 */
import { CryptoHasher, inspect, version, revision } from 'bun';

const SHOULD_SAVE = process.argv.includes('--save');
const FORMAT = process.argv.find(a => a.startsWith('--format='))?.split('=')[1] || 'table';
const OUTPUT = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];
const SAVE_PATH = 'public/registry/defaults-proof.json';

type TestResult = { name: string; pass: boolean; actual: string; expected: string };

const tests: { name: string; fn: () => boolean | Promise<boolean>; expected: string }[] = [
  {
    name: 'CryptoHasher requires algorithm',
    fn: () => {
      try {
        new CryptoHasher();
        return false;
      } catch {
        return true;
      }
    },
    expected: 'throws without algorithm',
  },
  {
    name: 'password.hash default argon2id',
    fn: async () => (await Bun.password.hash('test')).startsWith('$argon2id$'),
    expected: 'starts with $argon2id$',
  },
  {
    name: 'inspect default depth shows all',
    fn: () => Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes('d: 1'),
    expected: 'default depth shows nested objects (unlimited in canary)',
  },
  {
    name: 'write creates dirs',
    fn: async () => {
      await Bun.write('/tmp/test-defaults/a/b/c.txt', 'x');
      return await Bun.file('/tmp/test-defaults/a/b/c.txt').exists();
    },
    expected: 'auto-creates parent directories',
  },
  {
    name: 'file.stat works',
    fn: async () => (await Bun.file('package.json').stat()).size > 0,
    expected: 'returns stats for existing file',
  },
  {
    name: 'serve port fallback',
    fn: () => {
      const s = Bun.serve({ fetch: () => new Response('ok'), port: 0 });
      const ok = s.port > 0;
      s.stop();
      return ok;
    },
    expected: 'port 0 assigns random available port',
  },
  {
    name: 'which returns null for missing',
    fn: () => Bun.which('no-such-command-xyz') === null,
    expected: 'null for missing command',
  },
  {
    name: 'escapeHTML escapes & < > " \'',
    fn: () => Bun.escapeHTML("<div>'&</div>") === '&lt;div&gt;&#x27;&amp;&lt;/div&gt;',
    expected: '&lt; &gt; &#x27; &amp;',
  },
  {
    name: 'readableStreamToBytes empty',
    fn: async () => {
      const s = new ReadableStream({
        start(c) {
          c.close();
        },
      });
      return (await Bun.readableStreamToBytes(s)).length === 0;
    },
    expected: 'empty stream returns 0 bytes',
  },
  {
    name: 'nanoseconds monotonic',
    fn: async () => {
      const a = Bun.nanoseconds();
      await Bun.sleep(1);
      return Bun.nanoseconds() > a;
    },
    expected: 'increasing values',
  },
  {
    name: 'sleep ~50ms',
    fn: async () => {
      const s = performance.now();
      await Bun.sleep(50);
      return performance.now() - s >= 45;
    },
    expected: 'resolves within ~50ms',
  },
  {
    name: 'hash returns bigint',
    fn: () => typeof Bun.hash('hello') === 'bigint',
    expected: 'returns bigint (Wyhash)',
  },
];

let pass = 0,
  fail = 0;
const results: TestResult[] = [];

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 Bun Defaults Verification                                        ║');
console.log(`║  Bun: ${(version + ' / ' + (revision?.slice(0, 8) || 'unknown')).padEnd(58)}║`);
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

for (const t of tests) {
  try {
    const result = await t.fn();
    const actual = result ? 'pass' : 'FAIL';
    if (result) {
      pass++;
      console.log(`  ✅ ${t.name}`);
    } else {
      fail++;
      console.log(`  ❌ ${t.name} — expected: ${t.expected}`);
    }
    results.push({ name: t.name, pass: result, actual, expected: t.expected });
  } catch (e) {
    fail++;
    console.log(`  ❌ ${t.name} (error: ${(e as Error).message})`);
    results.push({ name: t.name, pass: false, actual: (e as Error).message, expected: t.expected });
  }
}

// Compute proof hash
const hasher = new CryptoHasher('sha256');
for (const r of results) hasher.update(r.name + r.pass);
const proofHash = hasher.digest('hex');

console.log(`\n  📊 ${pass}/${pass + fail} passed`);
console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);

const proof = {
  timestamp: new Date().toISOString(),
  bunVersion: version,
  bunRevision: revision?.slice(0, 12) || 'unknown',
  summary: { passed: pass, total: pass + fail, status: pass === pass + fail ? 'pass' : 'fail' },
  tests: results.map(r => ({
    name: r.name,
    expected: r.expected,
    actual: r.pass ? 'pass' : 'fail',
    passed: r.pass,
  })),
  proofHash,
};

let docCoverage:
  | Awaited<ReturnType<typeof import('../lib/docs/doc-index.ts').buildDefaultsDocCoverage>>
  | undefined;
if (SHOULD_SAVE) {
  const { buildDefaultsDocCoverage, buildDocIndex } = await import('../lib/docs/doc-index.ts');
  const docIndex = await buildDocIndex({ now: () => new Date(proof.timestamp) });
  docCoverage = buildDefaultsDocCoverage(docIndex.entries);
}

// Generate report in requested format
if (FORMAT === 'md' || FORMAT === 'markdown') {
  const md: string[] = [
    '# 🔍 Bun Defaults Verification',
    '',
    `Generated: ${proof.timestamp}`,
    `Bun: ${proof.bunVersion} (${(revision || '').slice(0, 8)})`,
    '',
    '| Test | Expected | Result |',
    '|------|----------|--------|',
  ];
  for (const r of results) {
    md.push(`| ${r.name} | ${r.expected} | ${r.pass ? '✅' : '❌'} |`);
  }
  md.push(`\n**${pass}/${pass + fail} passed**`);
  md.push(`\n🔒 Proof hash: \`${proofHash}\``);
  const report = md.join('\n');
  if (OUTPUT) await Bun.write(OUTPUT, report);
  else console.log('\n' + report);
}

if (SHOULD_SAVE) {
  await Bun.write(
    SAVE_PATH,
    JSON.stringify(docCoverage ? { ...proof, docCoverage } : proof, null, 2)
  );
  console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
}

if (fail > 0) process.exit(1);
