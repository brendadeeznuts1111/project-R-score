/**
 * Bun default-behavior proof cases — measured on this runtime, docs-grounded.
 *
 * Corrections vs common assumptions (Bun 1.4 canary):
 * - Bun.password.hash default is **argon2id**, not bcrypt
 * - Bun.hash returns **bigint**, not number
 * - Bun.inspect default depth expands past 2 for shallow nests; use explicit {depth}
 * - serve port:0 = ephemeral; omitted port uses BUN_PORT|PORT|NODE_PORT|3000
 *
 * @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
 * @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
 * @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
 * @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
 * @see https://bun.com/docs/runtime/utils#bun-readablestreamto — readableStreamTo*
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 * @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
 * @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
 * @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — default port
 */

import { inspectCustom, shouldColor } from '../console-depth.ts';
import { systemTempDir } from '../tmp-probe.ts';
import { inspectTable, type TableRow } from './networking-report.ts';

export type BunDefaultCaseId =
  | 'crypto-hasher-requires-algorithm'
  | 'password-hash-default-argon2id'
  | 'inspect-depth-options'
  | 'write-creates-dirs'
  | 'file-stat'
  | 'serve-port-ephemeral'
  | 'serve-identity-protocol-sync'
  | 'which-missing-null'
  | 'escape-html'
  | 'readable-stream-to-bytes-empty'
  | 'nanoseconds-monotonic'
  | 'sleep-approx'
  | 'hash-returns-bigint';

export type BunDefaultCaseResult = {
  id: BunDefaultCaseId;
  name: string;
  pass: boolean;
  actual: string;
  expected: string;
  docs: string;
  error?: string;
};

export type BunDefaultsProof = {
  schemaVersion: 1;
  bunVersion: string;
  bunRevision: string;
  timestamp: string;
  summary: { total: number; passed: number; failed: number };
  cases: BunDefaultCaseResult[];
  proofHash: string;
};

async function runCase(
  id: BunDefaultCaseId,
  name: string,
  docs: string,
  expected: string,
  fn: () => boolean | Promise<boolean>,
  actualOnPass: () => string
): Promise<BunDefaultCaseResult> {
  try {
    const pass = await fn();
    return {
      id,
      name,
      pass,
      actual: pass ? actualOnPass() : 'assertion failed',
      expected,
      docs,
    };
  } catch (e) {
    return {
      id,
      name,
      pass: false,
      actual: 'threw',
      expected,
      docs,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Run all default-behavior cases against the current Bun. */
export async function runBunDefaultsCases(): Promise<BunDefaultCaseResult[]> {
  const nested = { a: { b: { c: { d: 1 } } } };
  const tmpRoot = `${systemTempDir()}/bun-defaults-${Date.now()}`;

  return [
    await runCase(
      'crypto-hasher-requires-algorithm',
      'CryptoHasher requires algorithm',
      'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
      'throws without algorithm name',
      () => {
        try {
          // @ts-expect-error intentional missing arg
          new Bun.CryptoHasher();
          return false;
        } catch {
          return true;
        }
      },
      () => 'throws Expected an algorithm name'
    ),

    await runCase(
      'password-hash-default-argon2id',
      'password.hash default argon2id',
      'https://bun.com/docs/runtime/hashing#bun-password',
      'hash starts with $argon2id$',
      async () => {
        const h = await Bun.password.hash('test');
        return h.startsWith('$argon2id$');
      },
      () => '$argon2id$…'
    ),

    await runCase(
      'inspect-depth-options',
      'inspect depth 0 vs 2 vs default',
      'https://bun.com/docs/runtime/utils#bun-inspect',
      'depth:0 truncates; depth:2 truncates leaf; default expands more',
      () => {
        const d0 = Bun.inspect(nested, { depth: 0 });
        const d2 = Bun.inspect(nested, { depth: 2 });
        const def = Bun.inspect(nested);
        const depth0Ok = /a:\s*\[Object/.test(d0.replace(/\s+/g, ' '));
        const depth2Ok = /c:\s*\[Object/.test(d2.replace(/\s+/g, ' '));
        // default on 1.4 expands d:1 for this nest
        const defOk = /d:\s*1/.test(def);
        return depth0Ok && depth2Ok && defOk;
      },
      () => 'depth0=[Object], depth2=c:[Object], default shows d:1'
    ),

    await runCase(
      'write-creates-dirs',
      'write creates parent dirs + overwrites',
      'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
      'file exists after nested write',
      async () => {
        const path = `${tmpRoot}/nested/file.txt`;
        await Bun.write(path, 'hello');
        await Bun.write(path, 'world'); // overwrite
        const t = await Bun.file(path).text();
        return t === 'world';
      },
      () => 'nested path written & overwritten'
    ),

    await runCase(
      'file-stat',
      'file.stat returns size',
      'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
      'package.json size > 0',
      async () => {
        const s = await Bun.file('package.json').stat();
        return s.size > 0;
      },
      () => 'stat.size > 0'
    ),

    await runCase(
      'serve-port-ephemeral',
      'serve port:0 binds ephemeral > 0',
      'https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname',
      'port > 0 when port:0 (omit port → BUN_PORT|PORT|NODE_PORT|3000)',
      async () => {
        const s = Bun.serve({
          port: 0,
          hostname: '127.0.0.1',
          fetch: () => new Response('ok'),
        });
        const ok = typeof s.port === 'number' && s.port > 0;
        await s.stop(true);
        return ok;
      },
      () => 'port:0 → ephemeral listener'
    ),

    await runCase(
      'serve-identity-protocol-sync',
      'server.protocol syncs with url.protocol and port',
      'https://bun.com/docs/runtime/http/server#reference',
      'protocol=http, url.protocol=http:, url.port=String(port)',
      async () => {
        const s = Bun.serve({
          port: 0,
          hostname: '127.0.0.1',
          fetch: () => new Response('ok'),
        });
        const ok =
          s.protocol === 'http' &&
          s.url.protocol === 'http:' &&
          s.url.port === String(s.port) &&
          s.url.origin === `http://127.0.0.1:${s.port}`;
        await s.stop(true);
        return ok;
      },
      () => 'protocol + url fields aligned'
    ),

    await runCase(
      'which-missing-null',
      'which returns null for missing',
      'https://bun.com/docs/runtime/utils#bun-which',
      'null',
      () => Bun.which('this-command-should-not-exist-xyz') === null,
      () => 'null'
    ),

    await runCase(
      'escape-html',
      'escapeHTML escapes < > & " \'',
      'https://bun.com/docs/runtime/utils#bun-escapehtml',
      'contains &lt; &gt; &amp; &quot; and escaped quote',
      () => {
        const out = Bun.escapeHTML(`<div class="t">'&</div>`);
        return (
          out.includes('&lt;') &&
          out.includes('&gt;') &&
          out.includes('&amp;') &&
          out.includes('&quot;') &&
          (out.includes('&#x27;') || out.includes('&apos;') || out.includes('&#39;'))
        );
      },
      () => Bun.escapeHTML(`<div class="t">'&</div>`)
    ),

    await runCase(
      'readable-stream-to-bytes-empty',
      'readableStreamToBytes empty stream',
      'https://bun.com/docs/runtime/utils#bun-readablestreamto',
      'length 0',
      async () => {
        const stream = new ReadableStream({
          start(c) {
            c.close();
          },
        });
        const bytes = await Bun.readableStreamToBytes(stream);
        return bytes.length === 0;
      },
      () => 'Uint8Array(0)'
    ),

    await runCase(
      'nanoseconds-monotonic',
      'nanoseconds monotonic',
      'https://bun.com/docs/runtime/utils#bun-nanoseconds',
      'b > a after sleep(1)',
      async () => {
        const a = Bun.nanoseconds();
        await Bun.sleep(1);
        return Bun.nanoseconds() > a;
      },
      () => 'increasing'
    ),

    await runCase(
      'sleep-approx',
      'sleep ~50ms',
      'https://bun.com/docs/runtime/utils#bun-sleep',
      'elapsed >= 45ms',
      async () => {
        const start = performance.now();
        await Bun.sleep(50);
        return performance.now() - start >= 45;
      },
      () => '≥45ms wall'
    ),

    await runCase(
      'hash-returns-bigint',
      'hash returns bigint (Wyhash)',
      'https://bun.com/docs/runtime/hashing#bun-hash',
      'typeof === "bigint"',
      () => typeof Bun.hash('hello') === 'bigint',
      () => `bigint ${Bun.hash('hello')}`
    ),
  ];
}

export async function buildBunDefaultsProof(
  opts: {
    now?: () => Date;
    bunVersion?: string;
    bunRevision?: string;
  } = {}
): Promise<BunDefaultsProof> {
  const cases = await runBunDefaultsCases();
  const passed = cases.filter(c => c.pass).length;
  const failed = cases.length - passed;
  const body = {
    schemaVersion: 1 as const,
    bunVersion: opts.bunVersion ?? Bun.version,
    bunRevision: opts.bunRevision ?? (Bun.revision || 'unknown'),
    timestamp: (opts.now?.() ?? new Date()).toISOString(),
    summary: { total: cases.length, passed, failed },
    cases,
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
  return { ...body, proofHash };
}

export class BunDefaultsReport {
  constructor(public readonly proof: BunDefaultsProof) {}

  toJSON() {
    return this.proof;
  }

  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    const rows: TableRow[] = this.proof.cases.map(c => ({
      id: c.id,
      pass: c.pass ? 'PASS' : 'FAIL',
      name: c.name,
      actual: c.actual.slice(0, 48),
      expected: c.expected.slice(0, 40),
    }));
    const table = inspectTable(rows, ['pass', 'name', 'actual', 'expected'], { colors });
    const s = this.proof.summary;
    return [
      `BunDefaultsReport · Bun ${this.proof.bunVersion}/${this.proof.bunRevision.slice(0, 8)} · ${s.passed}/${s.total}`,
      `proofHash: ${this.proof.proofHash.slice(0, 16)}…`,
      '',
      table,
    ].join('\n');
  }
}
