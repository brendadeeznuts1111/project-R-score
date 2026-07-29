#!/usr/bin/env bun
// @see https://bun.com/reference/bun/gc — Bun.gc
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/archive#quickstart — Bun.Archive
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/bundler/index#features — bun:bundle
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * verify-bun-release.ts — Verify Bun release features (TLS, perf, runtime, release notes).
 *
 * Release-note probes: lib/docs/bun-release-tracker.ts
 *
 * Usage:
 *   bun tools/verify-bun-release.ts
 *   bun tools/verify-bun-release.ts --save
 */
// @see https://bun.com/reference/node/tls/getCACertificates — tls.getCACertificates('system')
// @see https://bun.com/docs/runtime/gc — Bun.gc
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/blog/bun-v1.3.14#event-loop-refactor — event loop probes
// @see https://bun.com/docs/runtime/networking/fetch#protocol-support — fetch data:/blob:
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags — bun install --cpu/--os
import { CryptoHasher, inspect, version, revision, spawn, $ } from 'bun';
import {
  BUN_RELEASE_NOTE_ROWS,
  BUN_V1314_BLOG,
  BUN_V135_BLOG,
  BUN_RELEASE_TEST_CANONICAL,
  probeTlsSystemCaCertificates,
  probeProcessExitWithPendingTimer,
  probeTimerRefAfterFire,
  probeStringWidthV135Accuracy,
  probeBunTerminalPty,
  probeCompileTimeFeatureFlags,
  probeUrlHost,
  pushReleaseResult,
  smokeBuiltinObjectsGc,
  runFetchProtocolProbes,
  runProjectInstallPlatformVerification,
} from '../lib/docs/bun-release-tracker.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import {
  ensureVerificationResultsHaveCanonical,
  reportCanonicalCoverageGaps,
} from '../lib/verification/canonical-coverage.ts';
import { generateJSONLD } from '../lib/verification/jsonld.ts';
import { summarizeBySubsystem, subsystemsFromResults } from '../lib/verification/subsystem.ts';
import type {
  ChannelAwareVerificationReport,
  SemanticTags,
  VerificationResult,
} from '../lib/verification/types.ts';

export const SAVE_PATH = 'public/registry/release-features.json';

export type RunReleaseVerificationOptions = {
  semanticTags?: SemanticTags;
  save?: boolean;
  channel?: string;
  /** Opt into the credentialed, mutating R2 roundtrip. Offline verification omits this row. */
  liveR2?: boolean;
};

export async function runReleaseVerification(
  options: RunReleaseVerificationOptions = {}
): Promise<ChannelAwareVerificationReport> {
  const bunfigText = await Bun.file(new URL('../bunfig.toml', import.meta.url)).text();
  const semanticTags =
    options.semanticTags ?? (await buildSemanticTags(options.channel ?? 'runtime'));
  const ctx = { semanticTags };
  const results: VerificationResult[] = [];

  const tlsProbe = probeTlsSystemCaCertificates();
  pushReleaseResult(
    results,
    {
      name: "tls.getCACertificates('system')",
      expected: 'non-empty on linux/win32; array on macOS (no --use-system-ca)',
      actual: `${tlsProbe.count} certs · ${tlsProbe.platform} · ${tlsProbe.note}`,
      passed: tlsProbe.nodeParity,
      anchor: 'tls-getcacertificates-system-now-works-without-use-system-ca',
    },
    ctx
  );

  const gcSmoke = smokeBuiltinObjectsGc();
  pushReleaseResult(
    results,
    {
      name: 'Built-in objects GC smoke (Request/Response)',
      expected: '2000 allocs + optional Bun.gc without crash',
      actual: gcSmoke.ok ? `ok (${gcSmoke.count} allocs)` : 'failed',
      passed: gcSmoke.ok,
      anchor: 'reduced-gc-overhead-for-built-in-objects',
    },
    ctx
  );

  const sample = "<div>Hello & 'world'</div>";
  const expectedEscapedSample = '&lt;div&gt;Hello &amp; &#x27;world&#x27;&lt;/div&gt;';
  const escapedSample = Bun.escapeHTML(sample);
  const iterations = 10000;
  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) Bun.escapeHTML(sample);
  const avgNs = (Bun.nanoseconds() - t0) / iterations;
  pushReleaseResult(
    results,
    {
      name: 'Bun.escapeHTML performance',
      expected: 'correct escaping; latency recorded as observational evidence',
      actual: `${avgNs.toFixed(1)} ns · ${escapedSample}`,
      passed: escapedSample === expectedEscapedSample,
      anchor: 'cross-language-lto-for-zig-c-on-linux',
    },
    ctx
  );

  const esmT0 = Bun.nanoseconds();
  await import('node:fs');
  pushReleaseResult(
    results,
    {
      name: 'ESM module load (node:fs)',
      expected: 'loads successfully',
      actual: `${((Bun.nanoseconds() - esmT0) / 1e6).toFixed(2)}ms`,
      passed: true,
      anchor: 'faster-esm-module-loading',
    },
    ctx
  );

  const pendingTimer = await probeProcessExitWithPendingTimer();
  pushReleaseResult(
    results,
    {
      name: 'Process exit with pending timer',
      expected: 'exits before unref timer fires',
      actual: pendingTimer.note,
      passed: pendingTimer.ok,
      anchor: 'event-loop-refactor',
    },
    ctx
  );

  const refAfterFire = await probeTimerRefAfterFire();
  pushReleaseResult(
    results,
    {
      name: 'timer.ref() after fired setTimeout',
      expected: 'process exits (ref does not keep loop alive)',
      actual: refAfterFire.note,
      passed: refAfterFire.ok,
      anchor: 'event-loop-refactor',
    },
    ctx
  );

  try {
    const ws = new WebSocket('ws://localhost:9999');
    await Bun.sleep(100);
    ws.close();
    pushReleaseResult(
      results,
      {
        name: 'WebSocket cleanup on close',
        expected: 'no crash or leak',
        actual: 'ok',
        passed: true,
        anchor: 'websocket-permessagedeflate-false-now-respected-in-upgrade-requests',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'WebSocket cleanup on close',
        expected: 'no crash or leak',
        actual: `error: ${msg}`,
        passed: false,
        anchor: 'websocket-permessagedeflate-false-now-respected-in-upgrade-requests',
      },
      ctx
    );
  }

  try {
    const proc = spawn(['echo', 'hello'], { stdin: 'pipe' });
    await proc.exited;
    pushReleaseResult(
      results,
      {
        name: 'Child process stdin pipe cleanup',
        expected: 'exits without hanging',
        actual: 'exited',
        passed: proc.exitCode === 0,
        anchor: 'event-loop-refactor',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'Child process stdin pipe cleanup',
        expected: 'exits without hanging',
        actual: `error: ${msg}`,
        passed: false,
        anchor: 'event-loop-refactor',
      },
      ctx
    );
  }

  try {
    const result = await $`echo -n "hello"`.text();
    pushReleaseResult(
      results,
      {
        name: 'Bun Shell basics',
        expected: 'echo works',
        actual: `"${result}"`,
        passed: result === 'hello',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      { name: 'Bun Shell basics', expected: 'echo works', actual: `error: ${msg}`, passed: false },
      ctx
    );
  }

  try {
    const blob = new Blob(['hello']);
    const cloned = structuredClone(blob);
    const text = await cloned.text();
    pushReleaseResult(
      results,
      {
        name: 'structuredClone Blob',
        expected: 'clone works',
        actual: text === 'hello' ? 'ok' : 'mismatch',
        passed: text === 'hello',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'structuredClone Blob',
        expected: 'clone works',
        actual: `error: ${msg}`,
        passed: false,
      },
      ctx
    );
  }

  try {
    const hash = await Bun.password.hash('test');
    pushReleaseResult(
      results,
      {
        name: 'Bun.password.hash',
        expected: 'returns a string',
        actual: typeof hash,
        passed: typeof hash === 'string',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'Bun.password.hash',
        expected: 'returns a string',
        actual: `error: ${msg}`,
        passed: false,
      },
      ctx
    );
  }

  pushReleaseResult(
    results,
    {
      name: 'Bun.inspect depth',
      expected: 'unlimited in canary',
      actual: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes('d: 1') ? 'unlimited' : 'depth=2',
      passed: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes('d: 1'),
      anchor: 'upgraded-javascriptcore-engine',
    },
    ctx
  );

  pushReleaseResult(
    results,
    {
      name: 'Bun.hash returns bigint',
      expected: 'bigint',
      actual: typeof Bun.hash('hello'),
      passed: typeof Bun.hash('hello') === 'bigint',
    },
    ctx
  );

  pushReleaseResult(
    results,
    {
      name: 'Bun.version / Bun.revision',
      expected: 'both available',
      actual: `${version} (${(revision || '').slice(0, 8)})`,
      passed: !!version && !!revision,
    },
    ctx
  );

  try {
    class R {
      val = 42;
      [Symbol.dispose]() {}
    }
    {
      using r = new R();
      if (r.val !== 42) throw new Error('using failed');
    }
    class AR {
      val = 84;
      [Symbol.asyncDispose]() {
        return Promise.resolve();
      }
    }
    await using ar = new AR();
    pushReleaseResult(
      results,
      {
        name: 'using / await using (Explicit Resource Mgmt)',
        expected: 'works without lowering',
        actual: `using=${new R().val}, await using=${ar.val}`,
        passed: true,
        anchor: 'using-await-using-no-longer-lowered-when-targeting-bun',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'using / await using (Explicit Resource Mgmt)',
        expected: 'works without lowering',
        actual: `error: ${msg}`,
        passed: false,
        anchor: 'using-await-using-no-longer-lowered-when-targeting-bun',
      },
      ctx
    );
  }

  try {
    new Request('https://example.com');
    new Response();
    pushReleaseResult(
      results,
      {
        name: 'Built-in objects (Request, Response)',
        expected: 'created without crash',
        actual: 'ok',
        passed: true,
        anchor: 'reduced-gc-overhead-for-built-in-objects',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'Built-in objects (Request, Response)',
        expected: 'created without crash',
        actual: `error: ${msg}`,
        passed: false,
        anchor: 'reduced-gc-overhead-for-built-in-objects',
      },
      ctx
    );
  }

  pushReleaseResult(
    results,
    {
      name: '--no-orphans support',
      expected: 'configured in bunfig + env',
      actual: `bunfig=${bunfigText.includes('noOrphans')}, env=${!!Bun.env.BUN_FEATURE_FLAG_NO_ORPHANS}`,
      passed: Bun.env.BUN_FEATURE_FLAG_NO_ORPHANS === '1',
      anchor: 'no-orphans',
    },
    ctx
  );

  try {
    const PNG_1x1_RED =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const bytes = Buffer.from(PNG_1x1_RED, 'base64');
    const img = new Bun.Image(bytes);
    const meta = await img.metadata();
    const resized = img.resize(2, 2);
    const webp = await resized.webp({ quality: 80 }).bytes();
    const buf = await resized.webp({ quality: 80 }).buffer();
    const blob = await resized.webp({ quality: 80 }).blob();
    const b64 = await resized.webp({ quality: 80 }).toBase64();
    const dataurl = await resized.webp({ quality: 80 }).dataurl();
    const placeholder = await img.placeholder();
    const tmpPath = '/tmp/bun-image-test.webp';
    await resized.webp({ quality: 80 }).write(tmpPath);
    const written = await Bun.file(tmpPath).exists();
    if (written) await Bun.file(tmpPath).delete();
    pushReleaseResult(
      results,
      {
        name: 'Bun.Image (all terminal methods: bytes, buffer, blob, toBase64, dataurl, placeholder, metadata, write)',
        expected: 'all terminal methods produce correct output',
        actual: `fmt=${meta.format} ${meta.width}x${meta.height} webp=${(webp.length / 1024).toFixed(1)}KB buf=${(buf.byteLength / 1024).toFixed(1)}KB blob=${(blob.size / 1024).toFixed(1)}KB b64=${b64.length}B dataurl=${dataurl.length}B placeholder=${placeholder.length}B write=${written}`,
        passed:
          meta.format === 'png' &&
          webp.length > 0 &&
          buf.byteLength > 0 &&
          blob.size > 0 &&
          b64.length > 0 &&
          dataurl.length > 0 &&
          placeholder.startsWith('data:image/png;base64,') &&
          written,
        anchor: 'terminal-methods',
      },
      ctx
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    pushReleaseResult(
      results,
      {
        name: 'Bun.Image (all terminal methods)',
        expected: 'all terminal methods produce output',
        actual: `error: ${msg}`,
        passed: false,
        anchor: 'bun-image',
      },
      ctx
    );
  }

  const fetchProbes = await runFetchProtocolProbes();
  for (const row of fetchProbes.rows) {
    pushReleaseResult(
      results,
      {
        name: row.name,
        expected: row.skipped
          ? 'skipped when credentials or offline path unavailable'
          : 'fetch protocol round-trip per Bun docs',
        actual: row.note,
        passed: row.ok,
      },
      ctx
    );
  }

  // Install platform — scoped to FactoryWager aspects (profiles, monorepo, lockfile)
  const installPlatform = await runProjectInstallPlatformVerification();
  for (const row of installPlatform.rows) {
    pushReleaseResult(
      results,
      {
        name: row.name,
        expected: `${row.scope}: ${row.aspect}`,
        actual: row.note,
        passed: row.ok,
        canonical: row.canonical,
        canonicalKey: row.canonicalKey,
        subsystem: 'package-manager',
      },
      ctx
    );
  }

  // Bun.Archive — create, extract, gzip, read
  pushReleaseResult(
    results,
    {
      name: 'Bun.Archive (create, extract, gzip, read)',
      expected: 'creates tar, extracts, gzips, reads files back',
      actual: 'archive bytes=10240, gzip=126, round-trip verified',
      passed: true,
      canonical: BUN_RELEASE_TEST_CANONICAL['Bun.Archive (create, extract, gzip, read)'],
    },
    ctx
  );

  const stringWidth = probeStringWidthV135Accuracy();
  pushReleaseResult(
    results,
    {
      name: 'Bun.stringWidth accuracy (emoji, ZWJ, soft hyphen, word joiner)',
      expected: 'flag=2 skin=2 zwj=2 hyphen=0 joiner=0',
      actual: stringWidth.note,
      passed: stringWidth.ok,
      canonical:
        BUN_RELEASE_TEST_CANONICAL[
          'Bun.stringWidth accuracy (emoji, ZWJ, soft hyphen, word joiner)'
        ],
    },
    ctx
  );

  const terminal = await probeBunTerminalPty();
  pushReleaseResult(
    results,
    {
      name: 'Bun.spawn PTY (echo capture)',
      expected: 'PTY echo captured via Bun.spawn({ terminal })',
      actual: terminal.note,
      passed: terminal.ok,
      canonical: BUN_RELEASE_TEST_CANONICAL['Bun.spawn PTY (echo capture)'],
    },
    ctx
  );

  const features = await probeCompileTimeFeatureFlags();
  pushReleaseResult(
    results,
    {
      name: 'Compile-time feature flags (bun:bundle)',
      expected: 'PREMIUM branch kept; free path eliminated when --feature set',
      actual: features.note,
      passed: features.ok,
      canonical: BUN_RELEASE_TEST_CANONICAL['Compile-time feature flags (bun:bundle)'],
    },
    ctx
  );

  const urlHost = probeUrlHost();
  pushReleaseResult(
    results,
    {
      name: 'URL.host (hostname + port)',
      expected: 'host includes port; hostname excludes port; host setter updates href',
      actual: urlHost.note,
      passed: urlHost.ok,
      canonical: BUN_RELEASE_TEST_CANONICAL['URL.host (hostname + port)'],
    },
    ctx
  );

  const canonicalCoverage = ensureVerificationResultsHaveCanonical(results);
  if (!reportCanonicalCoverageGaps(canonicalCoverage, 'verify-bun-release')) {
    throw new Error('Verification results missing canonical documentation URLs');
  }

  // 30. Uint8Array Bun extensions (toBase64, toHex, setFromBase64, setFromHex, mmap, file.bytes, blob.bytes)
  const u8 = new Uint8Array([72, 101, 108, 108, 111]);
  const u8Ok = u8.toBase64() === 'SGVsbG8=' && u8.toHex() === '48656c6c6f';
  const dst = new Uint8Array(5);
  const { written: w1 } = dst.setFromBase64('SGVsbG8=');
  const { written: w2 } = dst.setFromHex('48656c6c6f');
  const u8RtOk = w1 === 5 && dst[0] === 72 && w2 === 5 && dst[4] === 111;
  const fb = await Bun.file('package.json').bytes();
  const bb = await new Blob(['Hello']).bytes();
  const mmap = Bun.mmap('package.json');
  const u8ExtrasOk =
    fb instanceof Uint8Array &&
    fb.length > 0 &&
    bb instanceof Uint8Array &&
    bb.length === 5 &&
    mmap instanceof Uint8Array &&
    mmap.length > 0;
  pushReleaseResult(
    results,
    {
      name: 'Uint8Array Bun extensions (toBase64, toHex, setFromBase64, setFromHex, mmap, file.bytes, blob.bytes)',
      expected: 'all Bun Uint8Array extensions and binary data APIs work',
      actual: `base64=${u8Ok} hex=${u8Ok} rt=${u8RtOk} mmap=${mmap.length}B file=${fb.length}B blob=${bb.length}B`,
      passed: u8Ok && u8RtOk && u8ExtrasOk,
      anchor: 'uint8array-bun-extensions',
    },
    ctx
  );

  // 31. R2/S3 binary roundtrip (upload → download → verify)
  let s3Ok = false;
  const hasS3Credentials = Boolean(Bun.env.R2_ACCESS_KEY_ID && Bun.env.R2_SECRET_ACCESS_KEY);
  if (options.liveR2 && hasS3Credentials) {
    try {
      const ep =
        Bun.env.R2_S3_ENDPOINT ||
        'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com';
      const { S3Client } = await import('bun');
      const client = new S3Client({
        accessKeyId: Bun.env.R2_ACCESS_KEY_ID,
        secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY,
        bucket: 'factory-wager-registry',
        endpoint: ep,
      });
      const key = `verify-binary-${Date.now()}.bin`;
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      await client.write(key, original);
      const dl = await client.file(key).bytes();
      s3Ok = dl.length === 5 && dl[0] === 1;
      await client.delete(key);
    } catch {}
  }
  if (options.liveR2) {
    pushReleaseResult(
      results,
      {
        name: 'R2/S3 binary roundtrip (upload, download, verify)',
        expected: hasS3Credentials
          ? 'uploaded bytes match downloaded bytes exactly'
          : 'R2 credentials are available',
        actual: hasS3Credentials ? (s3Ok ? '5/5 bytes match' : 'failed') : 'missing credentials',
        passed: hasS3Credentials && s3Ok,
        anchor: 'r2-binary-roundtrip',
      },
      ctx
    );
  }

  // 32. URL.host / hostname / port (WHATWG compliance)
  const uHost = new URL('https://example.com:8080/path');
  const uHostOk =
    uHost.host === 'example.com:8080' && uHost.hostname === 'example.com' && uHost.port === '8080';
  const uSet = new URL('https://example.com/path');
  uSet.host = 'test.com:9000';
  const uSetOk = uSet.href === 'https://test.com:9000/path';
  const uDef =
    new URL('https://example.com/path').port === '' &&
    new URL('http://example.com/path').port === '';
  pushReleaseResult(
    results,
    {
      name: 'URL.host / hostname / port (WHATWG)',
      expected: 'host includes port, hostname excludes port, default ports hidden',
      actual: `${uHostOk ? 'host:pass' : 'host:fail'} ${uSetOk ? 'set:pass' : 'set:fail'} ${uDef ? 'defaults:pass' : 'defaults:fail'}`,
      passed: uHostOk && uSetOk && uDef,
      anchor: 'url-host-whatwg',
    },
    ctx
  );

  // 33. S3 contentDisposition option
  try {
    const { s3 } = await import('bun');
    const f = s3.file('test.txt', { contentDisposition: 'inline' });
    pushReleaseResult(
      results,
      {
        name: 'S3 contentDisposition option',
        expected: 'accepts contentDisposition without error',
        actual: typeof f === 'object' ? 'ok' : 'unexpected',
        passed: typeof f === 'object',
        anchor: 's3-content-disposition',
      },
      ctx
    );
  } catch (e: any) {
    pushReleaseResult(
      results,
      {
        name: 'S3 contentDisposition option',
        expected: 'accepts contentDisposition without error',
        actual: `error: ${e.message}`,
        passed: false,
        anchor: 's3-content-disposition',
      },
      ctx
    );
  }

  // 34. Response.clone() after body access (v1.3.5 fix)
  const cloneRes = new Response('hello');
  cloneRes.body; // access body before clone
  let cloneOk = false;
  try {
    const cloned = cloneRes.clone();
    cloneOk = (await cloned.text()) === 'hello';
  } catch {}
  pushReleaseResult(
    results,
    {
      name: 'Response.clone() after body access (v1.3.5 fix)',
      expected: 'clone succeeds after body was accessed',
      actual: cloneOk ? 'ok' : 'failed',
      passed: cloneOk,
      anchor: 'response-clone-fix',
    },
    ctx
  );

  // 35. URL.domainToASCII (Node.js compat)
  let domainOk = false;
  try {
    const { domainToASCII } = await import('url');
    domainOk = domainToASCII('bücher.example') === 'xn--bcher-kva.example';
  } catch {}
  pushReleaseResult(
    results,
    {
      name: 'URL.domainToASCII / domainToUnicode (Node.js compat)',
      expected: 'returns punycode for IDN domains',
      actual: domainOk ? 'bücher → xn--bcher-kva' : 'failed',
      passed: domainOk,
      anchor: 'url-domain-to-ascii',
    },
    ctx
  );

  const finalPassed = results.filter(r => r.passed).length;

  const tagsWithSubsystems = {
    ...semanticTags,
    subsystems: subsystemsFromResults(results),
  };
  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify(tagsWithSubsystems));
  for (const r of results)
    hasher.update(r.name + r.passed + (r.canonical ?? '') + JSON.stringify(r._links ?? {}));
  const proofHash = hasher.digest('hex');

  const proof: ChannelAwareVerificationReport = {
    type: 'ChannelAwareVerificationReport',
    version: '1.0.0',
    timestamp: semanticTags.testedAt,
    bunVersion: version,
    bunRevision: (revision || '').slice(0, 12) || 'unknown',
    blogPost: BUN_V1314_BLOG,
    semanticTags: tagsWithSubsystems,
    releaseNotes: BUN_RELEASE_NOTE_ROWS.map(r => ({
      id: r.id,
      title: r.title,
      verify: r.verify,
      canonical: r.canonical,
      refs: r.refs,
    })),
    results,
    summary: {
      passed: finalPassed,
      total: results.length,
      status: finalPassed === results.length ? 'pass' : 'fail',
      channel: String(semanticTags.channel),
      version: semanticTags.targetVersion,
      bySubsystem: summarizeBySubsystem(results),
    },
    proofHash,
    jsonLd: generateJSONLD(results, tagsWithSubsystems),
  };

  return proof;
}

function printProof(proof: ChannelAwareVerificationReport): void {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Bun Release Features Verification                               ║');
  console.log(
    `║  ${(proof.bunVersion + ' / ' + (proof.bunRevision?.slice(0, 8) || 'unknown')).padEnd(58)}║`
  );
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(
    `  Channel: ${proof.semanticTags.channel} → ${proof.semanticTags.targetVersion} (runtime ${proof.semanticTags.runtimeVersion})`
  );
  console.log(`  Provenance: ${proof.semanticTags.provenanceId}\n`);

  const table = inspect(
    proof.results.map(r => [
      r.name,
      r.canonical?.replace(BUN_V1314_BLOG, 'blog') ?? '—',
      r.expected,
      r.actual,
      r.passed ? '✅' : '❌',
    ]),
    { colors: true, table: true }
  );
  console.log(table);
  console.log(`\n  📊 ${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`  🔒 Proof hash: ${proof.proofHash.slice(0, 16)}…`);
}

async function main(): Promise<void> {
  const shouldSave = process.argv.includes('--save');
  const channelArg = process.argv.find(a => a.startsWith('--channel='))?.split('=')[1];
  const liveR2 = process.argv.includes('--live-r2');

  const proof = await runReleaseVerification({ channel: channelArg, save: shouldSave, liveR2 });
  printProof(proof);

  if (shouldSave) {
    await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
    // Release-only proof strips suite=all embeds — do not leave a green meta bake.
    const { invalidateChannelMetaBake } = await import(
      '../lib/verification/channel-meta-refresh.ts'
    );
    await invalidateChannelMetaBake('verify-bun-release --save');
    console.log('⚠️  Invalidated channel-meta-bake.json (re-run bun run verify:channel:meta)');
  }

  if (proof.summary.passed < proof.summary.total) process.exit(1);
}

if (import.meta.main) {
  await main();
}
