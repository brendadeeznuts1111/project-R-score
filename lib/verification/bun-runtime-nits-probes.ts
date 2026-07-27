// @see https://bun.com/reference/globals/CompressionStream — CompressionStream
// @see https://bun.com/reference/globals/DecompressionStream — DecompressionStream
// @see https://bun.com/reference/globals/TextEncoderStream — TextEncoderStream
// @see https://bun.com/reference/globals/TextDecoderStream — TextDecoderStream
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Phase 1 Bun runtime nits — inspect truth table, streams, URL, Bun.file vs fs.
 *
 * @see docs/bun-runtime-nits.md
 */
// eslint-disable-next-line no-restricted-imports
import { mkdtemp, rm, readFile } from 'node:fs/promises';
// eslint-disable-next-line no-restricted-imports
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { inspect, inspectCustom } from '../console-depth.ts';
import { joinPath } from '../path-bun.ts';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import type { VerificationResult } from './types.ts';
import { withSubsystem } from './subsystem.ts';

export const BUN_RUNTIME_NITS_PROOF_REPORT_PATH = '/registry/bun-runtime-nits-proof.json';
export const BUN_RUNTIME_NITS_VERIFY_SOURCE = 'tools/verify-bun-runtime-nits.ts';

export type BunRuntimeNitsCategory = 'inspect' | 'streams' | 'url' | 'file-io';

export type BunRuntimeNitsProbeRow = VerificationResult & {
  probe: string;
  category: BunRuntimeNitsCategory;
  canonicalKey: string;
};

function resultRow(
  probe: string,
  category: BunRuntimeNitsCategory,
  expected: string,
  actual: string,
  passed: boolean,
  opts?: { canonicalKey?: string; canonical?: string }
): BunRuntimeNitsProbeRow {
  const canonicalKey = opts?.canonicalKey ?? probe;
  const docs = resolveCanonicalForProbe(canonicalKey, {
    reportPath: BUN_RUNTIME_NITS_PROOF_REPORT_PATH,
    sourcePath: BUN_RUNTIME_NITS_VERIFY_SOURCE,
    fallback:
      opts?.canonical ??
      'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/bun-runtime-nits.md',
  });
  return withSubsystem({
    probe,
    category,
    ...docs,
    name: probe,
    expected,
    actual,
    passed,
    canonical: opts?.canonical ?? docs.canonical,
    subsystem: 'runtime',
  });
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Bun.inspect sorted — keys appear in deterministic order. */
export function probeInspectSorted(): BunRuntimeNitsProbeRow {
  const out = inspect({ zebra: 1, alpha: { bravo: 3, delta: 2 } }, { sorted: true, colors: false });
  const alphaBeforeZebra = out.indexOf('alpha') < out.indexOf('zebra');
  const bravoBeforeDelta = out.indexOf('bravo') < out.indexOf('delta');
  const ok = alphaBeforeZebra && bravoBeforeDelta;
  return resultRow(
    'inspect.sorted',
    'inspect',
    'sorted:true orders keys alphabetically (recursive)',
    ok ? 'alpha before zebra; bravo before delta' : out.slice(0, 80),
    ok,
    { canonicalKey: 'Bun.inspect.sorted' }
  );
}

/** Bun.inspect compact — nested object on one line. */
export function probeInspectCompact(): BunRuntimeNitsProbeRow {
  const out = inspect({ a: { b: { c: 1 } } }, { compact: true, colors: false });
  const ok = !out.includes('\n');
  return resultRow(
    'inspect.compact',
    'inspect',
    'compact:true produces single-line output',
    ok ? 'no newlines' : `lines=${out.split('\n').length}`,
    ok,
    { canonicalKey: 'Bun.inspect.compact' }
  );
}

/** showProxy — record whether Proxy target/handler appear. */
export function probeInspectShowProxy(): BunRuntimeNitsProbeRow {
  const target = { x: 1 };
  const proxy = new Proxy(target, { get: (t, k) => Reflect.get(t, k) });
  const withProxy = Bun.inspect(proxy, { showProxy: true, colors: false } as never);
  const showsProxyMeta = withProxy.includes('target') || withProxy.includes('Proxy');
  const showsTarget = withProxy.includes('x: 1');
  const ok = showsProxyMeta || showsTarget;
  const actual = showsProxyMeta
    ? 'proxy structure visible'
    : showsTarget
      ? 'showProxy ignored; target inspected directly'
      : withProxy.slice(0, 60);
  return resultRow(
    'inspect.showProxy',
    'inspect',
    'showProxy:true surfaces Proxy or target (runtime truth)',
    actual,
    ok,
    { canonicalKey: 'inspect.showProxy' }
  );
}

/** getters — Bun shows [Getter] when getters:true on this runtime. */
export function probeInspectGetters(): BunRuntimeNitsProbeRow {
  const withGetter = {
    get x() {
      return 42;
    },
  };
  const on = Bun.inspect(withGetter, { getters: true, colors: false } as never);
  const off = Bun.inspect(withGetter, { getters: false, colors: false } as never);
  const ok = on.includes('[Getter]') || on.includes('Getter');
  return resultRow(
    'inspect.getters',
    'inspect',
    'getters:true shows [Getter] (Bun 1.4 runtime truth)',
    ok ? 'getters:true shows [Getter]' : `on=${on.slice(0, 40)} off=${off.slice(0, 40)}`,
    ok,
    { canonicalKey: 'inspect.getters' }
  );
}

/** numericSeparator — record underscore presence for large numbers. */
export function probeInspectNumericSeparator(): BunRuntimeNitsProbeRow {
  const n = 1_000_000;
  const out = Bun.inspect({ n }, { numericSeparator: true, colors: false } as never);
  const hasSeparator = out.includes('1_000_000') || out.includes('1000000');
  const ok = hasSeparator;
  return resultRow(
    'inspect.numericSeparator',
    'inspect',
    'numericSeparator:true or ignored (record runtime)',
    out.includes('1_000_000')
      ? 'underscore separator present'
      : out.includes('1000000')
        ? 'no separator (ignored on runtime)'
        : out.slice(0, 60),
    ok,
    { canonicalKey: 'inspect.numericSeparator' }
  );
}

/** maxStringLength — Bun 1.4 ignores truncation (full string still shown). */
export function probeInspectMaxStringLength(): BunRuntimeNitsProbeRow {
  const long = 'x'.repeat(200);
  const out = Bun.inspect(long, { maxStringLength: 10, colors: false } as never);
  const truncated = !out.includes('x'.repeat(200));
  const ok = true;
  return resultRow(
    'inspect.maxStringLength',
    'inspect',
    'maxStringLength honored or ignored (record runtime)',
    truncated ? 'truncated at 10' : 'full string shown (ignored on Bun 1.4)',
    ok,
    { canonicalKey: 'util.inspect options' }
  );
}

/** customInspect:false disables [inspectCustom] output when supported. */
export function probeInspectCustomInspect(): BunRuntimeNitsProbeRow {
  class Probe {
    [inspectCustom]() {
      return 'CUSTOM_PROBE_OUTPUT';
    }
  }
  const on = Bun.inspect(new Probe(), { colors: false });
  const off = Bun.inspect(new Probe(), { customInspect: false, colors: false } as never);
  const customWorks = on.includes('CUSTOM_PROBE_OUTPUT');
  const suppressed = customWorks && !off.includes('CUSTOM_PROBE_OUTPUT');
  const ok = customWorks;
  const actual = suppressed
    ? 'custom suppressed when false'
    : customWorks
      ? 'customInspect:false ignored; custom still shown'
      : `on=${on.slice(0, 30)} off=${off.slice(0, 30)}`;
  return resultRow(
    'inspect.customInspect',
    'inspect',
    'custom symbol honored; false suppresses when supported',
    actual,
    ok,
    { canonicalKey: 'BunInspectOptions' }
  );
}

export function runInspectProbes(): BunRuntimeNitsProbeRow[] {
  return [
    probeInspectSorted(),
    probeInspectCompact(),
    probeInspectShowProxy(),
    probeInspectGetters(),
    probeInspectNumericSeparator(),
    probeInspectMaxStringLength(),
    probeInspectCustomInspect(),
  ];
}

/** gzip CompressionStream → DecompressionStream roundtrip. */
export async function probeCompressionStreamsRoundtrip(): Promise<BunRuntimeNitsProbeRow> {
  try {
    const input = new TextEncoder().encode('factorywager-registry-artifact-probe');
    const compressed = await streamToBytes(
      new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'))
    );
    const restored = await streamToBytes(
      new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip'))
    );
    const ok =
      restored.byteLength === input.byteLength && restored.every((byte, i) => byte === input[i]);
    return resultRow(
      'streams.gzip-roundtrip',
      'streams',
      'gzip compress then decompress restores bytes',
      ok
        ? `${input.byteLength} bytes round-trip ok`
        : `in=${input.byteLength} out=${restored.byteLength}`,
      ok,
      { canonicalKey: 'CompressionStream' }
    );
  } catch (e) {
    return resultRow(
      'streams.gzip-roundtrip',
      'streams',
      'gzip compress then decompress restores bytes',
      e instanceof Error ? e.message : String(e),
      false,
      { canonicalKey: 'CompressionStream' }
    );
  }
}

/** TextEncoderStream → TextDecoderStream on ASCII. */
export async function probeTextEncoderDecoderStreams(): Promise<BunRuntimeNitsProbeRow> {
  try {
    const text = 'registry-client-probe';
    // TextEncoderStream requires STRING chunks — feeding Blob byte chunks
    // stringifies the bytes ("114,101,…") instead of encoding them.
    const stream = new ReadableStream<string>({
      start(c) {
        c.enqueue(text);
        c.close();
      },
    })
      .pipeThrough(new TextEncoderStream())
      .pipeThrough(new TextDecoderStream());
    const out = await new Response(stream).text();
    const ok = out === text;
    return resultRow(
      'streams.text-encoder-decoder',
      'streams',
      'TextEncoderStream → TextDecoderStream restores string',
      ok ? `"${text}" round-trip ok` : `got=${JSON.stringify(out)}`,
      ok,
      { canonicalKey: 'TextEncoderStream' }
    );
  } catch (e) {
    return resultRow(
      'streams.text-encoder-decoder',
      'streams',
      'TextEncoderStream → TextDecoderStream restores string',
      e instanceof Error ? e.message : String(e),
      false,
      { canonicalKey: 'TextEncoderStream' }
    );
  }
}

/** WHATWG URL.host — hostname + port. */
export function probeUrlHost(): BunRuntimeNitsProbeRow {
  const url = new URL('https://example.com:8080/path');
  const readOk =
    url.host === 'example.com:8080' && url.hostname === 'example.com' && url.port === '8080';
  url.host = 'test.com:9000';
  const writeOk = url.href === 'https://test.com:9000/path';
  const ok = readOk && writeOk;
  return resultRow(
    'url.host',
    'url',
    'host includes port; hostname excludes; host setter updates href',
    ok ? 'host=example.com:8080; set host=test.com:9000' : `read=${readOk} write=${writeOk}`,
    ok,
    { canonicalKey: 'URL.host' }
  );
}

/** URL.origin — protocol + host + port. */
export function probeUrlOrigin(): BunRuntimeNitsProbeRow {
  const url = new URL('https://example.com:8080/path?q=1');
  const ok = url.origin === 'https://example.com:8080';
  return resultRow(
    'url.origin',
    'url',
    'origin is protocol + host + port',
    ok ? url.origin : `got=${url.origin}`,
    ok,
    { canonicalKey: 'URL.origin' }
  );
}

/** URL.searchParams — set/get/delete roundtrip. */
export function probeUrlSearchParams(): BunRuntimeNitsProbeRow {
  const url = new URL('https://example.com/path');
  url.searchParams.set('a', '1');
  url.searchParams.set('b', '2');
  url.searchParams.delete('a');
  const ok = url.searchParams.get('b') === '2' && !url.searchParams.has('a');
  return resultRow(
    'url.searchParams',
    'url',
    'searchParams set/get/delete roundtrip',
    ok ? url.search : `params=${url.searchParams.toString()}`,
    ok,
    { canonicalKey: 'URL.searchParams' }
  );
}

/** url.host setter preserves pathname. */
export function probeUrlHostSetter(): BunRuntimeNitsProbeRow {
  const url = new URL('https://old.example.com:8080/api/v1');
  url.host = 'new.example.com:9090';
  const ok = url.href === 'https://new.example.com:9090/api/v1';
  return resultRow(
    'url.host-setter',
    'url',
    'host setter updates origin and preserves path',
    ok ? url.href : `href=${url.href}`,
    ok,
    { canonicalKey: 'URL.host' }
  );
}

export function runUrlProbes(): BunRuntimeNitsProbeRow[] {
  return [probeUrlHost(), probeUrlOrigin(), probeUrlSearchParams(), probeUrlHostSetter()];
}

/** Legacy release-tracker adapter. */
export function probeUrlHostLegacy(): { ok: boolean; note: string } {
  const row = probeUrlHost();
  return { ok: row.passed, note: row.actual };
}

/** Bun.file lazy stat + size matches fs. */
export async function probeBunFileLazyStat(): Promise<BunRuntimeNitsProbeRow> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-nits-file-'));
  const path = joinPath(dir, 'probe.txt');
  try {
    const data = new Uint8Array([1, 2, 3, 4]);
    await Bun.write(path, data);
    const lazy = Bun.file(path);
    const exists = await lazy.exists();
    const size = lazy.size;
    const fsSize = statSync(path).size;
    const ok = exists && size === fsSize && size === data.byteLength;
    return resultRow(
      'bun.file.lazy-stat',
      'file-io',
      'Bun.file size matches fs.stat after write',
      ok ? `size=${size} exists=${exists}` : `bun=${size} fs=${fsSize}`,
      ok,
      { canonicalKey: 'bun.file.lazy-stat' }
    );
  } catch (e) {
    return resultRow(
      'bun.file.lazy-stat',
      'file-io',
      'Bun.file size matches fs.stat after write',
      e instanceof Error ? e.message : String(e),
      false,
      { canonicalKey: 'bun.file.lazy-stat' }
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Bun.write creates nested directories. */
export async function probeBunWriteAutoDir(): Promise<BunRuntimeNitsProbeRow> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-nits-write-'));
  const path = joinPath(dir, 'nested', 'deep', 'file.txt');
  try {
    await Bun.write(path, 'auto-dir-probe');
    const ok = await Bun.file(path).exists();
    return resultRow(
      'bun.write.auto-dir',
      'file-io',
      'Bun.write creates parent directories',
      ok ? 'nested path written without mkdir' : 'file missing',
      ok,
      { canonicalKey: 'bun.write.auto-dir' }
    );
  } catch (e) {
    return resultRow(
      'bun.write.auto-dir',
      'file-io',
      'Bun.write creates parent directories',
      e instanceof Error ? e.message : String(e),
      false,
      { canonicalKey: 'bun.write.auto-dir' }
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Bun.file().bytes() matches fs readFile. */
export async function probeBunFileBytesVsBuffer(): Promise<BunRuntimeNitsProbeRow> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-nits-bytes-'));
  const path = joinPath(dir, 'bytes.bin');
  try {
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    await Bun.write(path, data);
    const fromBun = await Bun.file(path).bytes();
    const fromFs = new Uint8Array(await readFile(path));
    const ok = fromBun.byteLength === fromFs.byteLength && fromBun.every((b, i) => b === fromFs[i]);
    return resultRow(
      'bun.file.bytes-vs-buffer',
      'file-io',
      'Bun.file().bytes() equals fs read bytes',
      ok
        ? `${fromBun.byteLength} bytes match`
        : `bun=${fromBun.byteLength} fs=${fromFs.byteLength}`,
      ok,
      { canonicalKey: 'bun.file.bytes-vs-buffer' }
    );
  } catch (e) {
    return resultRow(
      'bun.file.bytes-vs-buffer',
      'file-io',
      'Bun.file().bytes() equals fs read bytes',
      e instanceof Error ? e.message : String(e),
      false,
      { canonicalKey: 'bun.file.bytes-vs-buffer' }
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runFileIoProbes(): Promise<BunRuntimeNitsProbeRow[]> {
  return [
    await probeBunFileLazyStat(),
    await probeBunWriteAutoDir(),
    await probeBunFileBytesVsBuffer(),
  ];
}

export async function runBunRuntimeNitsVerification(): Promise<{
  ok: boolean;
  results: BunRuntimeNitsProbeRow[];
}> {
  const results = [
    ...runInspectProbes(),
    await probeCompressionStreamsRoundtrip(),
    await probeTextEncoderDecoderStreams(),
    ...runUrlProbes(),
    ...(await runFileIoProbes()),
  ];
  return { ok: results.every(r => r.passed), results };
}
