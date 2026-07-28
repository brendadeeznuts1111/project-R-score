#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/RedisClient — Bun.RedisClient
// @see https://bun.com/reference/bun/SQL — Bun.SQL
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/reference/bun/JSONC — Bun.JSONC
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sql — Bun.SQL
// @see https://bun.com/docs/runtime/jsonc — Bun.JSONC
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash.crc32
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.verify
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/runtime/cookies#cookie-class — Bun.Cookie
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @see https://bun.com/docs/runtime/streams#bun-arraybuffersink — Bun.ArrayBufferSink
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket — Bun.udpSocket
// @see https://bun.com/docs/runtime/redis#getting-started — RedisClient
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bun API one-liner showcase — corrected, fixture-backed demos.
 *
 * The pasted “full Bun API showcase” one-liners are marketing-shaped; several
 * do not run as written (missing imports, wrong CSRF/color/FFI shapes, unbound
 * `server` in WS handlers, hard-coded `.so`, etc.). This tool is the grounded
 * suite: each demo exercises the claimed APIs with a real-world mini-scenario.
 *
 * Usage:
 *   bun tools/bun-api-showcase.ts              # list
 *   bun tools/bun-api-showcase.ts list
 *   bun tools/bun-api-showcase.ts run offline  # no network / no env deps
 *   bun tools/bun-api-showcase.ts run all      # skip gated failures as skip
 *   bun tools/bun-api-showcase.ts run 1,8,11
 *   bun tools/bun-api-showcase.ts run 11 --verbose
 *
 * Gates (env):
 *   SHOWCASE_NETWORK=1  — DNS / optional HTTP
 *   SHOWCASE_UI=1       — WebView screenshot path
 *   REDIS_URL           — Redis/Valkey demo
 *   DATABASE_URL        — Bun.SQL demo
 *
 * @see https://bun.com/docs/llms.txt
 * @see https://bun.com/docs/runtime/transpiler
 * @see https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi
 * @see https://bun.com/docs/runtime/csrf#bun-csrf-generate
 * @see https://bun.com/docs/runtime/color#flexible-input
 * @see https://bun.com/docs/runtime/archive#quickstart
 */
import { Database } from 'bun:sqlite';
import { cc, FFIType, suffix } from 'bun:ffi';
import { formatCliTable } from './cli-table.ts';
import { ansiMarkdown, colorize } from '../lib/console-depth.ts';

export type ShowcaseGate = 'offline' | 'network' | 'env' | 'ui';

export type ShowcaseResult = {
  ok: boolean;
  skipped?: boolean;
  detail: string;
  ms: number;
};

export type ShowcaseDemo = {
  id: number;
  name: string;
  category: string;
  apis: readonly string[];
  gate: ShowcaseGate;
  /** Env keys required when gate === 'env' */
  envKeys?: readonly string[];
  run: (ctx: ShowcaseCtx) => Promise<string>;
};

export type ShowcaseCtx = {
  dir: string;
  verbose: boolean;
  log: (...args: unknown[]) => void;
};

function join(dir: string, ...parts: string[]): string {
  return [dir, ...parts].join('/').replace(/\/+/g, '/');
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = `${tmpdir()}/bun-showcase-${Bun.randomUUIDv7()}`;
  await Bun.$`mkdir -p ${dir}`.quiet();
  try {
    return await fn(dir);
  } finally {
    await Bun.$`rm -rf ${dir}`.quiet();
  }
}

function tmpdir(): string {
  return Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
}

function requireEnv(keys: readonly string[]): string | null {
  for (const k of keys) {
    if (!Bun.env[k]) return k;
  }
  return null;
}

function networkEnabled(): boolean {
  return Bun.env.SHOWCASE_NETWORK === '1' || Bun.env.SHOWCASE_NETWORK === 'true';
}

function uiEnabled(): boolean {
  return Bun.env.SHOWCASE_UI === '1' || Bun.env.SHOWCASE_UI === 'true';
}

export const SHOWCASE_DEMOS: readonly ShowcaseDemo[] = [
  {
    id: 1,
    name: 'File I/O + TOML + Hash (Config Integrity)',
    category: 'Config',
    apis: ['Bun.file', 'Bun.TOML', 'Bun.CryptoHasher', 'Bun.write'],
    gate: 'offline',
    async run({ dir }) {
      const src = join(dir, 'config.toml');
      await Bun.write(src, 'name = "factory"\nport = 8080\n');
      const raw = await Bun.file(src).text();
      const cfg = Bun.TOML.parse(raw) as { name: string; port: number };
      const h = new Bun.CryptoHasher('sha256');
      h.update(JSON.stringify(cfg));
      const digest = h.digest('hex');
      await Bun.write(join(dir, 'config.sha256'), digest);
      if (cfg.name !== 'factory' || cfg.port !== 8080) throw new Error('TOML parse mismatch');
      return `sha256=${digest.slice(0, 12)}…`;
    },
  },
  {
    id: 2,
    name: 'SQLite + Password + Inspect Table (User Registry)',
    category: 'Auth',
    apis: ['bun:sqlite', 'Bun.password', 'Bun.inspect.table'],
    gate: 'offline',
    async run({ log }) {
      const db = new Database(':memory:');
      db.run('CREATE TABLE u(n TEXT, p TEXT)');
      const hash = await Bun.password.hash('secret');
      db.run('INSERT INTO u VALUES (?, ?)', ['alice', hash]);
      const rows = db.query('SELECT n, substr(p,1,20) || ? AS p FROM u').all('…') as Array<{
        n: string;
        p: string;
      }>;
      const ok = await Bun.password.verify('secret', hash);
      if (!ok) throw new Error('password verify failed');
      log(Bun.inspect.table(rows, ['n', 'p']));
      return `users=${rows.length} verify=ok`;
    },
  },
  {
    id: 3,
    name: 'Fingerprint + Fetch (Kalshi-style HTTP)',
    category: 'Networking',
    apis: ['fetch', 'Bun.hash.crc32', 'Bun.CryptoHasher', 'Bun.env'],
    gate: 'network',
    async run() {
      if (!networkEnabled()) throw new ShowcaseSkip('set SHOWCASE_NETWORK=1');
      const device = Bun.hash.crc32(Bun.env.HOSTNAME || 'dev').toString(16);
      const h = new Bun.CryptoHasher('sha256');
      h.update(`${device}:${Date.now()}`);
      const fingerprint = h.digest('hex');
      const res = await fetch('https://api.elections.kalshi.com/trade-api/v2/exchange/status', {
        headers: { 'X-Showcase-Fingerprint': fingerprint },
        signal: AbortSignal.timeout(8_000),
      });
      // Endpoint may 404/401 — we only require TCP/TLS + response.
      return `status=${res.status} fp=${fingerprint.slice(0, 12)}… device=${device}`;
    },
  },
  {
    id: 4,
    name: 'Image + Sleep (+ optional WebView)',
    category: 'Automation',
    apis: ['Bun.Image', 'Bun.sleep', 'Bun.WebView', 'Bun.write'],
    gate: 'ui',
    async run({ dir, log }) {
      // Offline core: Bun.Image pipeline (always).
      const png = await (async () => {
        if (uiEnabled()) {
          const opts = {
            url: 'https://example.com',
            headless: true,
            width: 640,
            height: 360,
          };
          await using w = new Bun.WebView(opts as ConstructorParameters<typeof Bun.WebView>[0]);
          await Bun.sleep(1500);
          const shot = await w.screenshot({ format: 'png' });
          const bytes = new Uint8Array(await shot.arrayBuffer());
          log('webview screenshot bytes', bytes.byteLength);
          return bytes;
        }
        // 1×1 PNG
        return Uint8Array.from(
          atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
          ),
          c => c.charCodeAt(0)
        );
      })();
      const img = new Bun.Image(png);
      const webp = await img.webp({ quality: 85 }).bytes();
      await Bun.write(join(dir, 'shot.webp'), webp);
      if (!uiEnabled())
        return `image=webp bytes=${webp.byteLength} (WebView skipped; SHOWCASE_UI=1)`;
      return `image=webp bytes=${webp.byteLength} via WebView`;
    },
  },
  {
    id: 5,
    name: 'Archive + Gzip + Hash (Artifact)',
    category: 'Build',
    apis: ['Bun.Archive', 'Bun.CryptoHasher', 'Bun.write'],
    gate: 'offline',
    async run({ dir }) {
      const archive = new Bun.Archive(
        { 'manifest.json': JSON.stringify({ version: '1.0.0' }) },
        { compress: 'gzip' }
      );
      const bytes = await archive.bytes();
      const h = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
      const out = join(dir, 'artifact.tar.gz');
      await Bun.write(out, bytes);
      return `size=${bytes.byteLength} sha256=${h.slice(0, 12)}…`;
    },
  },
  {
    id: 6,
    name: 'Glob + SQLite (Coverage-style Ratchet)',
    category: 'CI',
    apis: ['Bun.Glob', 'bun:sqlite', 'Bun.file'],
    gate: 'offline',
    async run({ dir }) {
      await Bun.$`mkdir -p ${join(dir, 'tests')}`.quiet();
      await Bun.write(
        join(dir, 'tests', 'a.test.ts'),
        'import {test,expect} from "bun:test"; test("a",()=>expect(1).toBe(1));\n'
      );
      await Bun.write(
        join(dir, 'tests', 'b.test.ts'),
        'import {test,expect} from "bun:test"; test("b",()=>expect(2).toBe(2));\n'
      );
      const db = new Database(join(dir, 'coverage.db'));
      db.run('CREATE TABLE cov(file TEXT, threshold REAL)');
      const g = new Bun.Glob('tests/**/*.test.ts');
      let n = 0;
      for await (const f of g.scan({ cwd: dir })) {
        db.run('INSERT INTO cov VALUES (?, ?)', [f, 80]);
        n++;
      }
      return `files=${n} db=${join(dir, 'coverage.db')}`;
    },
  },
  {
    id: 7,
    name: 'Redis + JSONC (Cached Config)',
    category: 'Caching',
    apis: ['Bun.RedisClient', 'Bun.JSONC', 'Bun.file'],
    gate: 'env',
    envKeys: ['REDIS_URL'],
    async run({ dir }) {
      const missing = requireEnv(['REDIS_URL']);
      if (missing) throw new ShowcaseSkip(`missing ${missing}`);
      await Bun.write(join(dir, 'config.jsonc'), '{\n  // comment\n  "ttl": 60,\n}\n');
      const cfg = Bun.JSONC.parse(await Bun.file(join(dir, 'config.jsonc')).text()) as {
        ttl: number;
      };
      const client = new Bun.RedisClient(Bun.env.REDIS_URL!);
      await client.connect();
      try {
        await client.set('showcase:config', JSON.stringify(cfg));
        const got = await client.get('showcase:config');
        return `ttl=${cfg.ttl} redis=${got}`;
      } finally {
        client.close();
      }
    },
  },
  {
    id: 8,
    name: 'Semver + Markdown + Color (Changelog)',
    category: 'Formatting',
    apis: ['Bun.file', 'Bun.semver', 'Bun.markdown.ansi', 'Bun.color'],
    gate: 'offline',
    async run({ dir, log }) {
      await Bun.write(join(dir, 'package.json'), JSON.stringify({ version: '1.2.3' }));
      const pkg = (await Bun.file(join(dir, 'package.json')).json()) as { version: string };
      const ok = Bun.semver.satisfies(pkg.version, '^1.0.0');
      const md = `# Release ${pkg.version}\n\n- Feature A\n- Fix B\n`;
      const ansi = ansiMarkdown(md);
      const mark = ok ? '#00ff00' : '#ff0000';
      log(`${colorize('Semver', '#00ffff')} ${colorize(ok ? 'OK' : 'FAIL', mark)}\n${ansi}`);
      if (!ok) throw new Error('semver should satisfy ^1.0.0');
      return `version=${pkg.version} ansiChars=${ansi.length}`;
    },
  },
  {
    id: 9,
    name: 'DNS + UDP + Nanoseconds (Latency Probe)',
    category: 'Networking',
    apis: ['Bun.dns.lookup', 'Bun.udpSocket', 'Bun.nanoseconds'],
    gate: 'network',
    async run() {
      if (!networkEnabled()) throw new ShowcaseSkip('set SHOWCASE_NETWORK=1');
      const t0 = Bun.nanoseconds();
      const addr = await Bun.dns.lookup('example.com');
      const t1 = Bun.nanoseconds();
      const socket = await Bun.udpSocket({});
      try {
        await socket.send(Buffer.from('ping'), 53, '8.8.8.8');
        const t2 = Bun.nanoseconds();
        return `dns=${((t1 - t0) / 1e6).toFixed(2)}ms udpSend=${((t2 - t1) / 1e6).toFixed(2)}ms addrs=${addr.length}`;
      } finally {
        socket.close();
      }
    },
  },
  {
    id: 10,
    name: 'Bun.build + Metafile (Bundle Audit)',
    category: 'Bundling',
    apis: ['Bun.build', 'Bun.file', 'Bun.inspect.table', 'Bun.nanoseconds'],
    gate: 'offline',
    async run({ dir, log }) {
      const entry = join(dir, 'index.ts');
      const outdir = join(dir, 'dist');
      await Bun.write(entry, 'export const answer = 42;\nconsole.log(answer);\n');
      const t0 = Bun.nanoseconds();
      const out = await Bun.build({
        entrypoints: [entry],
        outdir,
        minify: true,
        sourcemap: 'external',
        metafile: true,
        target: 'bun',
      });
      const ms = (Bun.nanoseconds() - t0) / 1e6;
      if (!out.success) throw new Error(out.logs.map(String).join('\n') || 'build failed');
      const rows = out.outputs.map(o => ({ path: o.path.split('/').pop(), size: o.size }));
      log(Bun.inspect.table(rows, ['path', 'size']));
      return `outputs=${out.outputs.length} ${ms.toFixed(1)}ms`;
    },
  },
  {
    id: 11,
    name: 'Transpiler + FFI + dlopen (Dynamic Plugin)',
    category: 'FFI',
    apis: ['Bun.Transpiler', 'Bun.file', 'bun:ffi'],
    gate: 'offline',
    async run({ dir }) {
      const cPath = join(dir, 'plugin.c');
      await Bun.write(cPath, `int add(int a, int b) { return a + b; }\nvoid init(void) {}\n`);
      // Prefer bun:ffi cc (TinyCC) — no system clang required.
      const native = cc({
        source: cPath,
        symbols: {
          init: { args: [], returns: FFIType.void },
          add: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
        },
      });
      native.symbols.init();
      const sum = native.symbols.add(2, 40);

      const glue = join(dir, 'glue.ts');
      await Bun.write(
        glue,
        `import { dlopen, FFIType, suffix } from "bun:ffi";
export function load(path: string) {
  const lib = dlopen(path, {
    init: { args: [], returns: FFIType.void },
    add: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  });
  return { init: () => lib.symbols.init(), add: (a: number, b: number) => lib.symbols.add(a, b), close: () => lib.close(), suffix };
}
`
      );
      // Also prove Transpiler → data-URL import (glue path uses dlopen on a real dylib when present).
      const t = new Bun.Transpiler({ loader: 'ts', target: 'bun' });
      const js = t.transformSync(await Bun.file(glue).text());
      const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
      if (typeof mod.load !== 'function') throw new Error('transpiled module missing load()');
      // Re-export path: compile shared lib via clang when available for true dlopen; else cc-only proof.
      let dlopenSum: number | undefined;
      const libPath = join(dir, `libplugin.${suffix}`);
      const clang = Bun.which('clang');
      if (clang) {
        const proc = Bun.spawn(
          [
            clang,
            process.platform === 'darwin' ? '-dynamiclib' : '-shared',
            ...(process.platform === 'linux' ? ['-fPIC'] : []),
            cPath,
            '-o',
            libPath,
          ],
          { stdout: 'pipe', stderr: 'pipe' }
        );
        if ((await proc.exited) === 0) {
          const api = mod.load(libPath) as {
            init: () => void;
            add: (a: number, b: number) => number;
            close: () => void;
          };
          api.init();
          dlopenSum = api.add(3, 39);
          api.close();
        }
      }
      return `cc.add=${sum} transpiled=ok suffix=${suffix}${dlopenSum !== undefined ? ` dlopen.add=${dlopenSum}` : ' dlopen=cc-only'}`;
    },
  },
  {
    id: 12,
    name: 'HTTP Server + WebSocket (Realtime)',
    category: 'HTTP/WS',
    apis: ['Bun.serve', 'server.upgrade', 'server.publish'],
    gate: 'offline',
    async run() {
      let published = 0;
      const server = Bun.serve({
        port: 0,
        fetch(req, srv) {
          if (srv.upgrade(req)) return undefined as unknown as Response;
          return new Response('Hello');
        },
        websocket: {
          open(ws) {
            ws.subscribe('chat');
          },
          message(ws, msg) {
            published = server.publish('chat', String(msg));
            ws.send(`echo:${msg}`);
          },
        },
      });
      try {
        const hello = await fetch(`http://127.0.0.1:${server.port}/`);
        if ((await hello.text()) !== 'Hello') throw new Error('HTTP body mismatch');
        const ws = new WebSocket(`ws://127.0.0.1:${server.port}/`);
        const echo = await new Promise<string>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('ws timeout')), 3000);
          ws.onopen = () => ws.send('ping');
          ws.onmessage = ev => {
            // publish() also delivers to subscribers — wait for the direct echo.
            const data = String(ev.data);
            if (!data.startsWith('echo:')) return;
            clearTimeout(t);
            resolve(data);
          };
          ws.onerror = () => {
            clearTimeout(t);
            reject(new Error('ws error'));
          };
        });
        ws.close();
        if (echo !== 'echo:ping') throw new Error(`unexpected echo ${echo}`);
        return `port=${server.port} publish=${published} echo=ok`;
      } finally {
        server.stop(true);
      }
    },
  },
  {
    id: 13,
    name: 'Spawn + Inspect Table (Parallel Jobs)',
    category: 'Processes',
    apis: ['Bun.spawn', 'Bun.inspect.table', 'Response'],
    gate: 'offline',
    async run({ log }) {
      const p1 = Bun.spawn(['bun', '--version'], { stdout: 'pipe', stderr: 'pipe' });
      const p2 = Bun.spawn(['bun', '--print', '1+1'], { stdout: 'pipe', stderr: 'pipe' });
      const [v1, v2] = await Promise.all([
        new Response(p1.stdout).text(),
        new Response(p2.stdout).text(),
      ]);
      await Promise.all([p1.exited, p2.exited]);
      const rows = [{ bun: v1.trim(), print: v2.trim() }];
      log(Bun.inspect.table(rows, ['bun', 'print']));
      return `bun=${v1.trim()} print=${v2.trim()}`;
    },
  },
  {
    id: 14,
    name: 'ArrayBufferSink + Stream (CSV Sample)',
    category: 'Streams',
    apis: ['Bun.ArrayBufferSink', 'Bun.file', 'Bun.inspect.table'],
    gate: 'offline',
    async run({ dir, log }) {
      await Bun.write(join(dir, 'data.csv'), 'a,b,c\n1,2,3\n4,5,6\n7,8,9\n');
      const sink = new Bun.ArrayBufferSink();
      const stream = Bun.file(join(dir, 'data.csv')).stream();
      for await (const chunk of stream) sink.write(chunk);
      const bytes = sink.end() as ArrayBuffer;
      const text = new TextDecoder().decode(bytes);
      const lines = text.trim().split('\n').slice(0, 3);
      const table = lines.map(l => {
        const [c1, c2, c3] = l.split(',');
        return { c1, c2, c3 };
      });
      log(Bun.inspect.table(table, ['c1', 'c2', 'c3']));
      return `bytes=${bytes.byteLength} rows=${table.length}`;
    },
  },
  {
    id: 15,
    name: 'Glob + Archive Extract (Backup Restore)',
    category: 'Archiving',
    apis: ['Bun.Glob', 'Bun.Archive', 'Bun.file'],
    gate: 'offline',
    async run({ dir }) {
      const backups = join(dir, 'backups');
      await Bun.$`mkdir -p ${backups}`.quiet();
      const arch = new Bun.Archive({ 'note.txt': 'restored-ok' }, { compress: 'gzip' });
      await Bun.write(join(backups, 'snap.tar.gz'), await arch.bytes());
      let restored = 0;
      for await (const f of new Bun.Glob('backups/*.tar.gz').scan({ cwd: dir })) {
        const a = new Bun.Archive(await Bun.file(join(dir, f)).bytes());
        const out = join(dir, 'restore');
        await a.extract(out);
        const note = await Bun.file(join(out, 'note.txt')).text();
        if (note !== 'restored-ok') throw new Error('restore mismatch');
        restored++;
      }
      return `restored=${restored}`;
    },
  },
  {
    id: 16,
    name: 'Cookie + CSRF (Secure Session)',
    category: 'Security',
    apis: ['Bun.CSRF', 'Bun.Cookie', 'Response'],
    gate: 'offline',
    async run() {
      const secret = 'showcase-secret';
      const sessionId = 'user-session-1';
      // Runtime accepts sessionId; bun-types options lag behind docs.
      const token = Bun.CSRF.generate(secret, { sessionId } as Parameters<
        typeof Bun.CSRF.generate
      >[1]);
      const verified = Bun.CSRF.verify(token, { secret, sessionId } as Parameters<
        typeof Bun.CSRF.verify
      >[1]);
      if (!verified) throw new Error('CSRF verify failed');
      const c = new Bun.Cookie('session', token, {
        httpOnly: true,
        secure: true,
        maxAge: 3600,
      });
      const resp = new Response('OK');
      resp.headers.set('Set-Cookie', String(c));
      const setCookie = resp.headers.get('Set-Cookie') || '';
      if (!setCookie.includes('HttpOnly')) throw new Error('missing HttpOnly');
      return `csrf=ok cookieLen=${setCookie.length}`;
    },
  },
  {
    id: 17,
    name: 'Bun.SQL (Read Replica Sample)',
    category: 'SQL Client',
    apis: ['Bun.SQL', 'Bun.inspect.table'],
    gate: 'env',
    envKeys: ['DATABASE_URL'],
    async run({ log }) {
      const missing = requireEnv(['DATABASE_URL']);
      if (missing) throw new ShowcaseSkip(`missing ${missing}`);
      const sql = new Bun.SQL(Bun.env.DATABASE_URL!);
      try {
        const rows = await sql`SELECT 1 AS id, 'showcase' AS name`;
        log(Bun.inspect.table(rows as object[], ['id', 'name']));
        return `rows=${(rows as unknown[]).length}`;
      } finally {
        await sql.close();
      }
    },
  },
  {
    id: 18,
    name: 'JSONL Stream Parse (Event Log)',
    category: 'Streaming',
    apis: ['Bun.file', 'Bun.readableStreamToArray', 'Bun.inspect'],
    gate: 'offline',
    async run({ dir, log }) {
      const body = ['{"id":1,"e":"a"}', '{"id":2,"e":"b"}', '{"id":3,"e":"c"}'].join('\n') + '\n';
      await Bun.write(join(dir, 'events.jsonl'), body);
      const chunks = await Bun.readableStreamToArray(Bun.file(join(dir, 'events.jsonl')).stream());
      const text = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
      const events = text
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as { id: number; e: string });
      for (const e of events.slice(0, 3)) log(Bun.inspect(e));
      return `events=${events.length} chunks=${chunks.length}`;
    },
  },
  {
    id: 19,
    name: 'resolveSync + import.meta (Module Discovery)',
    category: 'Module',
    apis: ['Bun.resolveSync', 'import.meta'],
    gate: 'offline',
    async run() {
      const self = Bun.resolveSync('./cli-table.ts', import.meta.dir);
      const bunTest = Bun.resolveSync('bun:test', import.meta.dir);
      if (!self.includes('cli-table')) throw new Error('resolve self failed');
      return `self=${self.split('/').pop()} bun:test=${bunTest} dir=${import.meta.dir.split('/').pop()}`;
    },
  },
  {
    id: 20,
    name: 'Full-Stack Health Check',
    category: 'Health',
    apis: ['Bun.env', 'Bun.file', 'bun:sqlite', 'Bun.RedisClient', 'Bun.inspect.table'],
    gate: 'offline',
    async run({ log }) {
      const checks: Record<string, string> = {
        env: Bun.env.PATH ? 'ok' : 'missing',
        file: (await Bun.file('package.json').exists()) ? 'ok' : 'missing',
        sql: (() => {
          const db = new Database(':memory:');
          db.exec('SELECT 1');
          return 'ok';
        })(),
        redis: 'skip',
      };
      if (Bun.env.REDIS_URL) {
        // Health probe must fail fast: client defaults (10s connectionTimeout,
        // autoReconnect with 20 retries) hang ~30s against an unreachable
        // host. One capped attempt, no reconnect — per Bun Redis docs.
        const client = new Bun.RedisClient(Bun.env.REDIS_URL, {
          connectionTimeout: 1500,
          autoReconnect: false,
          maxRetries: 1,
        });
        try {
          await client.connect();
          checks.redis = 'ok';
          client.close();
        } catch {
          checks.redis = 'fail';
        }
      }
      const table = Object.entries(checks).map(([component, status]) => ({ component, status }));
      log(Bun.inspect.table(table, ['component', 'status']));
      if (checks.file !== 'ok' || checks.sql !== 'ok') throw new Error('health failed');
      return table.map(r => `${r.component}=${r.status}`).join(' ');
    },
  },
];

export class ShowcaseSkip extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShowcaseSkip';
  }
}

export async function runDemo(
  demo: ShowcaseDemo,
  opts: { verbose?: boolean; dir?: string } = {}
): Promise<ShowcaseResult> {
  const verbose = opts.verbose ?? false;
  // eslint-disable-next-line harness/no-unknown-function-param -- showcase verbose sink
  const log = (...args: unknown[]) => {
    if (verbose) console.log(...args);
  };
  const t0 = Bun.nanoseconds();
  const exec = async (dir: string): Promise<ShowcaseResult> => {
    try {
      if (demo.gate === 'network' && !networkEnabled()) {
        return {
          ok: true,
          skipped: true,
          detail: 'skipped (SHOWCASE_NETWORK=1)',
          ms: (Bun.nanoseconds() - t0) / 1e6,
        };
      }
      if (demo.gate === 'env' && demo.envKeys) {
        const missing = requireEnv(demo.envKeys);
        if (missing) {
          return {
            ok: true,
            skipped: true,
            detail: `skipped (missing ${missing})`,
            ms: (Bun.nanoseconds() - t0) / 1e6,
          };
        }
      }
      // UI demos always run Image path; WebView only when SHOWCASE_UI=1
      const detail = await demo.run({ dir, verbose, log });
      return { ok: true, detail, ms: (Bun.nanoseconds() - t0) / 1e6 };
    } catch (e) {
      if (e instanceof ShowcaseSkip) {
        return {
          ok: true,
          skipped: true,
          detail: `skipped (${e.message})`,
          ms: (Bun.nanoseconds() - t0) / 1e6,
        };
      }
      return {
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
        ms: (Bun.nanoseconds() - t0) / 1e6,
      };
    }
  };
  if (opts.dir) return exec(opts.dir);
  return withTempDir(exec);
}

export function listDemos(): ShowcaseDemo[] {
  return [...SHOWCASE_DEMOS];
}

function parseIds(spec: string): number[] | 'all' | 'offline' {
  if (spec === 'all') return 'all';
  if (spec === 'offline') return 'offline';
  return spec
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0);
}

function printList(): void {
  const rows = SHOWCASE_DEMOS.map(d => ({
    id: String(d.id).padStart(2, '0'),
    gate: d.gate,
    category: d.category,
    name: d.name,
    apis: d.apis.join(', '),
  }));
  console.log(
    formatCliTable(rows, [
      { key: 'id', header: 'ID', width: 4 },
      { key: 'gate', header: 'GATE', width: 8 },
      { key: 'category', header: 'CATEGORY', width: 12 },
      { key: 'name', header: 'NAME', maxWidth: 42 },
      { key: 'apis', header: 'APIS', maxWidth: 48 },
    ])
  );
}

async function printRun(spec: string, verbose: boolean): Promise<number> {
  const parsed = parseIds(spec);
  const demos =
    parsed === 'all'
      ? [...SHOWCASE_DEMOS]
      : parsed === 'offline'
        ? SHOWCASE_DEMOS.filter(d => d.gate === 'offline' || d.id === 4)
        : SHOWCASE_DEMOS.filter(d => (parsed as number[]).includes(d.id));

  if (demos.length === 0) {
    console.error(`No demos matched: ${spec}`);
    return 1;
  }

  const results: { id: string; status: string; ms: string; detail: string }[] = []; // brand-ok — demo id
  let failed = 0;
  for (const demo of demos) {
    const r = await runDemo(demo, { verbose });
    const status = r.skipped ? 'skip' : r.ok ? 'ok' : 'FAIL';
    if (!r.ok) failed++;
    results.push({
      id: String(demo.id).padStart(2, '0'),
      status,
      ms: r.ms.toFixed(1),
      detail: r.detail,
    });
    if (verbose) {
      console.log(`\n#${demo.id} ${demo.name} → ${status} (${r.ms.toFixed(1)}ms)\n  ${r.detail}`);
    }
  }

  console.log(
    formatCliTable(results, [
      { key: 'id', header: 'ID', width: 4 },
      { key: 'status', header: 'STATUS', width: 6 },
      { key: 'ms', header: 'MS', width: 8, align: 'right' },
      { key: 'detail', header: 'DETAIL', maxWidth: 64 },
    ])
  );
  console.log(
    `\n${demos.length - failed}/${demos.length} ok · ${results.filter(r => r.status === 'skip').length} skipped · Bun ${Bun.version}`
  );
  return failed === 0 ? 0 : 1;
}

function usage(): void {
  console.log(`Bun API Showcase — corrected one-liner demos

Usage:
  bun tools/bun-api-showcase.ts [list]
  bun tools/bun-api-showcase.ts run offline|all|<id[,id…]> [--verbose]

Gates:
  SHOWCASE_NETWORK=1   enable #3 #9
  SHOWCASE_UI=1        enable WebView path in #4
  REDIS_URL            enable #7
  DATABASE_URL         enable #17
`);
}

async function main(argv = Bun.argv.slice(2)): Promise<number> {
  const verbose = argv.includes('--verbose') || argv.includes('-v');
  const args = argv.filter(a => a !== '--verbose' && a !== '-v');
  const cmd = args[0] ?? 'list';

  if (cmd === '-h' || cmd === '--help' || cmd === 'help') {
    usage();
    return 0;
  }
  if (cmd === 'list') {
    printList();
    return 0;
  }
  if (cmd === 'run') {
    const spec = args[1] ?? 'offline';
    return printRun(spec, verbose);
  }
  // bare ids: `bun tools/bun-api-showcase.ts 1,2`
  if (/^[\d,]+$/.test(cmd) || cmd === 'offline' || cmd === 'all') {
    return printRun(cmd, verbose);
  }
  printList();
  return 0;
}

if (import.meta.main) {
  process.exitCode = await main();
}
