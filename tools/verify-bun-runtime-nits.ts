#!/usr/bin/env bun
// @see https://bun.com/reference/globals/DecompressionStream — DecompressionStream
// @see https://bun.com/reference/globals/TextDecoderStream — TextDecoderStream
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see docs/bun-runtime-nits.md — suite spec (Phase 1: 16 probes)
/**
 * verify-bun-runtime-nits.ts — runtime TRUTH probes for easily-misused Bun
 * APIs. Records actual behavior (not Node parity) for inspect options, Web
 * Streams, WHATWG URL, and file I/O, then writes a proof JSON.
 *
 *   bun tools/verify-bun-runtime-nits.ts [--save]
 *
 * Proof: public/registry/bun-runtime-nits-proof.json
 */

import { CANONICAL_RUNTIME_NITS_TOKENS } from './bun-doc-refs.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import {
  BUN_RUNTIME_NITS_PROOF_REPORT_PATH,
  runBunRuntimeNitsVerification,
} from '../lib/verification/bun-runtime-nits-probes.ts';
import { summarizeBySubsystem } from '../lib/verification/subsystem.ts';

export type NitProbe = {
  name: string;
  category: 'inspect' | 'streams' | 'url' | 'file-io';
  expected: string; // documented runtime truth (docs/bun-runtime-nits.md)
  actual: string; // measured on this runtime
  passed: boolean;
  canonical: string;
};

const canonical = (key: string, fallback: string): string =>
  CANONICAL_RUNTIME_NITS_TOKENS[key]?.url ?? fallback;

const BUN_INSPECT_DOC = 'https://bun.com/docs/runtime/utils#bun-inspect';
const BUN_FILE_DOC = 'https://bun.com/docs/runtime/file-io#reading-files-bun-file';
const BUN_WRITE_DOC = 'https://bun.com/docs/runtime/file-io#writing-files-bun-write';

function probe(
  category: NitProbe['category'],
  name: string,
  expected: string,
  actual: string,
  passed: boolean,
  canonicalUrl: string
): NitProbe {
  return { name, category, expected, actual, passed, canonical: canonicalUrl };
}

// ── inspect (7) ────────────────────────────────────────────────────
function inspectProbes(): NitProbe[] {
  const out: NitProbe[] = [];

  // sorted: key order sorted — WORKS
  const sorted = Bun.inspect({ b: 1, a: 2 }, { sorted: true });
  out.push(
    probe(
      'inspect',
      'sorted: true sorts keys',
      'a before b',
      sorted.replace(/\s+/g, ' '),
      sorted.indexOf('a:') < sorted.indexOf('b:'),
      canonical('Bun.inspect.sorted', BUN_INSPECT_DOC)
    )
  );

  // compact: false → multi-line — WORKS
  const multi = Bun.inspect({ a: 1, b: 2 }, { compact: false });
  out.push(
    probe(
      'inspect',
      'compact: false renders multi-line',
      'multi-line',
      multi.includes('\n') ? 'multi-line' : 'single-line',
      multi.includes('\n'),
      canonical('Bun.inspect.compact', BUN_INSPECT_DOC)
    )
  );

  // showProxy: target shown, no proxy metadata — runtime truth
  const proxied = Bun.inspect(new Proxy({ a: 1 }, {}), { showProxy: true });
  out.push(
    probe(
      'inspect',
      'showProxy: true shows target without Proxy metadata',
      'plain target',
      proxied.replace(/\s+/g, ' '),
      proxied.includes('a: 1') && !proxied.includes('Proxy'),
      canonical('inspect.showProxy', 'https://bun.com/reference/bun/BunInspectOptions')
    )
  );

  // getters: [Getter] marker shown regardless of option — runtime truth
  const withGetter = {
    get val() {
      return 42;
    },
  };
  const gTrue = Bun.inspect(withGetter, { getters: true });
  const gFalse = Bun.inspect(withGetter, { getters: false });
  out.push(
    probe(
      'inspect',
      'getters option: [Getter] shown either way (option ignored)',
      '[Getter] in both',
      `true:${gTrue.includes('[Getter]')} false:${gFalse.includes('[Getter]')}`,
      gTrue.includes('[Getter]') && gFalse.includes('[Getter]'),
      canonical('inspect.getters', 'https://bun.com/reference/bun/BunInspectOptions')
    )
  );

  // numericSeparator: Bun.inspect ignores it (node:util.inspect honors it)
  const bunNum = Bun.inspect(1_000_000, { numericSeparator: true });
  out.push(
    probe(
      'inspect',
      'numericSeparator ignored by Bun.inspect (Node honors it)',
      'ignored',
      bunNum === '1000000' ? 'ignored' : bunNum,
      bunNum === '1000000',
      canonical('inspect.numericSeparator', 'https://bun.com/reference/bun/BunInspectOptions')
    )
  );

  // maxStringLength: ignored — full string still shown
  const long = 'x'.repeat(50);
  const truncated = Bun.inspect(long, { maxStringLength: 5 });
  out.push(
    probe(
      'inspect',
      'maxStringLength ignored (full string shown)',
      'ignored',
      truncated.length > 10 ? 'ignored' : 'truncated',
      truncated.includes('x'.repeat(50)),
      canonical('util.inspect options', BUN_INSPECT_DOC)
    )
  );

  // customInspect: false does NOT suppress Bun.inspect.custom
  class Custom {
    [Bun.inspect.custom]() {
      return 'CUSTOM';
    }
  }
  const unsuppressed = Bun.inspect(new Custom(), { customInspect: false });
  out.push(
    probe(
      'inspect',
      'customInspect: false does not suppress Bun.inspect.custom',
      'CUSTOM still shown',
      unsuppressed,
      unsuppressed === 'CUSTOM',
      canonical('util.inspect options', BUN_INSPECT_DOC)
    )
  );

  return out;
}

// ── streams (2) ────────────────────────────────────────────────────
async function streamProbes(): Promise<NitProbe[]> {
  const out: NitProbe[] = [];

  // gzip CompressionStream → DecompressionStream roundtrip
  const original = new TextEncoder().encode('hello world'.repeat(100));
  const compressed = await new Response(
    new Blob([original]).stream().pipeThrough(new CompressionStream('gzip'))
  ).bytes();
  const roundtrip = await new Response(
    new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
  ).bytes();
  const ok = Buffer.from(roundtrip).equals(Buffer.from(original));
  out.push(
    probe(
      'streams',
      'gzip CompressionStream/DecompressionStream roundtrip',
      'match',
      ok ? 'match' : 'mismatch',
      ok,
      canonical('CompressionStream', 'https://bun.com/reference/globals/CompressionStream')
    )
  );

  // TextEncoderStream → TextDecoderStream roundtrip (string chunks, not Blob bytes)
  const text = 'héllo streams';
  const stringStream = new ReadableStream<string>({
    start(c) {
      c.enqueue(text);
      c.close();
    },
  });
  const encoded = await new Response(stringStream.pipeThrough(new TextEncoderStream())).bytes();
  const byteStream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(encoded);
      c.close();
    },
  });
  const decoded = await new Response(byteStream.pipeThrough(new TextDecoderStream())).text();
  out.push(
    probe(
      'streams',
      'TextEncoderStream/TextDecoderStream roundtrip',
      text,
      decoded,
      decoded === text,
      canonical('TextEncoderStream', 'https://bun.com/reference/globals/TextEncoderStream')
    )
  );

  return out;
}

// ── url (4) ────────────────────────────────────────────────────────
function urlProbes(): NitProbe[] {
  const out: NitProbe[] = [];
  const url = new URL('https://example.com:8080/path?q=1');

  out.push(
    probe(
      'url',
      'URL.host includes port',
      'example.com:8080',
      url.host,
      url.host === 'example.com:8080',
      canonical('URL.host', 'https://bun.com/reference/globals/URL/host')
    )
  );
  out.push(
    probe(
      'url',
      'URL.origin = protocol + host',
      'https://example.com:8080',
      url.origin,
      url.origin === 'https://example.com:8080',
      canonical('URL.origin', 'https://bun.com/reference/globals/URL/origin')
    )
  );
  out.push(
    probe(
      'url',
      'URL.searchParams.get reads query',
      '1',
      String(url.searchParams.get('q')),
      url.searchParams.get('q') === '1',
      canonical('URL.searchParams', 'https://bun.com/reference/globals/URL/searchParams')
    )
  );

  const mutable = new URL('https://a.example/');
  mutable.host = 'b.example:9000';
  out.push(
    probe(
      'url',
      'URL.host setter rewrites host+port',
      'b.example:9000',
      mutable.host,
      mutable.host === 'b.example:9000' && mutable.hostname === 'b.example',
      canonical('URL.host', 'https://bun.com/reference/globals/URL/host')
    )
  );

  return out;
}

// ── file-io (3) ────────────────────────────────────────────────────
async function fileIoProbes(): Promise<NitProbe[]> {
  const out: NitProbe[] = [];

  // lazy Bun.file: no throw on construction; size works after write
  const dir = '.tmp/nits-file-io';
  const path = `${dir}/nested/probe.txt`;
  await Bun.write(path, 'hello');
  const lazy = Bun.file(path);
  const size = lazy.size;
  out.push(
    probe(
      'file-io',
      'Bun.file is lazy; .size works without explicit open',
      '5',
      String(await size),
      (await size) === 5,
      canonical('Bun.file', BUN_FILE_DOC)
    )
  );

  // Bun.write auto-creates directories
  const exists = await Bun.file(path).exists();
  out.push(
    probe(
      'file-io',
      'Bun.write auto-creates parent directories',
      'exists',
      exists ? 'exists' : 'missing',
      exists,
      canonical('Bun.write', BUN_WRITE_DOC)
    )
  );

  // bytes vs fs.readFile — same content
  const { readFile } = await import('node:fs/promises');
  const viaBun = await Bun.file(path).bytes();
  const viaFs = new Uint8Array(await readFile(path));
  const same = Buffer.from(viaBun).equals(Buffer.from(viaFs));
  out.push(
    probe(
      'file-io',
      'Bun.file().bytes() matches fs.readFile content',
      'match',
      same ? 'match' : 'mismatch',
      same,
      canonical('Bun.file', BUN_FILE_DOC)
    )
  );

  await Bun.$`rm -rf ${dir}`.quiet();
  return out;
}

export type NitsProof = {
  timestamp: string;
  bunVersion: string;
  results: NitProbe[];
  summary: { passed: number; total: number; status: 'pass' | 'fail' };
  proofHash: string;
};

export async function runNitProbes(): Promise<NitProbe[]> {
  return [...inspectProbes(), ...(await streamProbes()), ...urlProbes(), ...(await fileIoProbes())];
}

export async function buildNitsProof(): Promise<NitsProof> {
  const results = await runNitProbes();
  const passed = results.filter(r => r.passed).length;
  const body = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    results,
    summary: {
      passed,
      total: results.length,
      status: (passed === results.length ? 'pass' : 'fail') as 'pass' | 'fail',
    },
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
  return { ...body, proofHash };
}

if (import.meta.main) {
  const report = await runBunRuntimeNitsVerification();
  const semanticTags = await buildSemanticTags('runtime');
  const passed = report.results.filter(r => r.passed).length;
  const body = {
    type: 'BunRuntimeNitsVerificationReport' as const,
    version: '1.0.0' as const,
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: (Bun.revision || '').slice(0, 12) || 'unknown',
    semanticTags,
    reportPath: BUN_RUNTIME_NITS_PROOF_REPORT_PATH,
    results: report.results,
    summary: {
      passed,
      total: report.results.length,
      status: (passed === report.results.length ? 'pass' : 'fail') as 'pass' | 'fail',
      bySubsystem: summarizeBySubsystem(report.results),
    },
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
  const proof = { ...body, proofHash };

  const rows = report.results.map(r => ({
    Test: r.name,
    Expected: r.expected,
    Actual: r.actual,
    Pass: r.passed ? '✅' : '❌',
  }));
  console.log(Bun.inspect.table(rows));
  console.log(`\n${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`Proof hash: ${proof.proofHash}`);

  if (Bun.argv.includes('--save')) {
    await Bun.write('public/registry/bun-runtime-nits-proof.json', JSON.stringify(proof, null, 2));
    console.log('💾 Saved to public/registry/bun-runtime-nits-proof.json');
  }
  if (proof.summary.status !== 'pass') process.exit(1);
}
