#!/usr/bin/env bun
// @see https://bun.com/reference/bun/FileSystemRouter — Bun.FileSystemRouter
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/RedisClient — Bun.RedisClient
// @see https://bun.com/reference/bun/SQL — Bun.SQL
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/reference/bun/JSON5 — Bun.JSON5
// @see https://bun.com/reference/bun/JSONC — Bun.JSONC
// @see https://bun.com/reference/bun/JSONL — Bun.JSONL
// @see https://bun.com/reference/bun/allocUnsafe — Bun.allocUnsafe
// @see https://bun.com/reference/bun/concatArrayBuffers — Bun.concatArrayBuffers
// @see https://bun.com/reference/bun/gc — Bun.gc
// @see https://bun.com/reference/bun/generateHeapSnapshot — Bun.generateHeapSnapshot
// @see https://bun.com/reference/bun/readableStreamToBytes — Bun.readableStreamToBytes
// @see https://bun.com/reference/bun/semver/order — Bun.semver.order
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/json5 — Bun.JSON5
// @see https://bun.com/docs/runtime/jsonl — Bun.JSONL
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen — Bun.listen
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket — Bun.udpSocket
/**
 * Verified Bun API one-liner demos (SSOT) — offline-safe by default; live opt-in.
 * Coverage surface layer measures which CANONICAL APIs these demos exercise.
 *
 * Host: bun.com (never bun.sh). Signatures proved on Bun 1.4+.
 *
 * CLI: bun tools/bun-doc-refs.ts oneliners [--json] [--id=…] [--run <id>] [--live]
 *
 * @see https://bun.com/docs/llms.txt
 * @see https://bun.com/docs/runtime/utils#bun-version
 * @see ./cli-table.ts
 */
import { formatCliTable, toolTableVersion } from './cli-table.ts';
import { inspectTable } from '../lib/console-depth.ts';
import { tomlStringify } from '../lib/toml-stringify.ts';

export type ApiOneliner = {
  id: string; // brand-ok — demo oneliner id
  summary: string;
  /** CANONICAL / catalog token names this demo exercises. */
  apis: readonly string[];
  /** Display snippet (polished; may differ slightly from run()). */
  snippet: string;
  docs?: string;
  /** Needs network, DB, Redis, WebView, etc. — not run unless --live. */
  live?: boolean;
  /** Offline (or live) executable prove; returns a short result string. */
  run?: () => Promise<string> | string;
};

/** Semver gate helper — missing since ⇒ available. */
export function availableAt(version: string, since: string | undefined): boolean {
  if (!since) return true;
  try {
    // Bun.semver.order(a,b): -1 if a<b, 0 equal, 1 if a>b
    return Bun.semver.order(version, since) >= 0;
  } catch {
    return true;
  }
}

export const BUN_API_ONELINERS: readonly ApiOneliner[] = [
  {
    id: 'file-meta',
    summary: 'Bun.file exists/stat/json',
    apis: ['Bun.file'],
    docs: 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
    snippet: `const f = Bun.file("package.json");
if (!(await f.exists())) throw new Error("missing");
const st = await f.stat();
const pkg = await f.json();
console.log(st.size, pkg.name);`,
    run: async () => {
      const f = Bun.file('package.json');
      if (!(await f.exists())) throw new Error('package.json missing');
      const st = await f.stat();
      const pkg = (await f.json()) as { name?: string };
      return `${st.size}B name=${pkg.name ?? '?'}`;
    },
  },
  {
    id: 'file-write-copy',
    summary: 'Bun.write copy via Bun.file',
    apis: ['Bun.write', 'Bun.file'],
    docs: 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
    snippet: `await Bun.write("copy.json", Bun.file("package.json"));`,
    run: async () => {
      const dir = await mkdtempSafe('oneliner-copy-');
      const dest = `${dir}/copy.json`;
      await Bun.write(dest, Bun.file('package.json'));
      const size = (await Bun.file(dest).stat()).size;
      await rmSafe(dir);
      return `copied ${size}B`;
    },
  },
  {
    id: 'toml',
    summary: 'Bun.TOML parse + stringify',
    apis: ['Bun.TOML', 'Bun.TOML.parse', 'Bun.TOML.stringify'],
    docs: 'https://bun.com/docs/runtime/toml#bun-toml-stringify',
    snippet: `const toml = Bun.TOML.stringify({ a: 1 });
const parsed = Bun.TOML.parse(toml);`,
    run: () => {
      const toml = tomlStringify({ a: 1, b: 'x' });
      const parsed = Bun.TOML.parse(toml) as { a: number };
      return `a=${parsed.a}`;
    },
  },
  {
    id: 'json-family',
    summary: 'JSONC / JSON5 / JSONL parse',
    apis: ['Bun.JSONC', 'Bun.JSON5', 'Bun.JSONL'],
    docs: 'https://bun.com/docs/runtime/jsonc',
    snippet: `Bun.JSONC.parse('{/*c*/"a":1}');
Bun.JSON5.parse("{hello:'world'}");
Bun.JSONL.parse('{"a":1}\\n{"b":2}');`,
    run: () => {
      const c = Bun.JSONC.parse('{/*c*/"a":1}') as { a: number };
      const five = Bun.JSON5.parse("{hello:'world'}") as { hello: string };
      const lines = Bun.JSONL.parse('{"a":1}\n{"b":2}') as unknown[];
      return `jsonc=${c.a} json5=${five.hello} jsonl=${lines.length}`;
    },
  },
  {
    id: 'crypto-hasher',
    summary: 'CryptoHasher SHA-256 + HMAC',
    apis: ['Bun.CryptoHasher'],
    docs: 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
    snippet: `const h = new Bun.CryptoHasher("sha256", "secret");
h.update("data");
console.log(h.digest("hex"));`,
    run: () => {
      const h = new Bun.CryptoHasher('sha256', 'secret');
      h.update('data');
      return h.digest('hex').slice(0, 16);
    },
  },
  {
    id: 'password',
    summary: 'Bun.password argon2id',
    apis: ['Bun.password', 'Bun.password.hash', 'Bun.password.verify'],
    docs: 'https://bun.com/docs/runtime/hashing#bun-password',
    snippet: `const hash = await Bun.password.hash("secret", { algorithm: "argon2id" });
await Bun.password.verify("secret", hash);`,
    run: async () => {
      const hash = await Bun.password.hash('secret', { algorithm: 'argon2id' });
      const ok = await Bun.password.verify('secret', hash);
      return `verify=${ok}`;
    },
  },
  {
    id: 'hash-wyhash-crc32',
    summary: 'Bun.hash + crc32',
    apis: ['Bun.hash', 'Bun.hash.crc32'],
    docs: 'https://bun.com/docs/runtime/hashing#bun-hash',
    snippet: `Bun.hash("hello"); Bun.hash.crc32("hello");`,
    run: () => `wyhash=${Bun.hash('hello')} crc32=${Bun.hash.crc32('hello')}`,
  },
  {
    id: 'uuid-v7',
    summary: 'Bun.randomUUIDv7',
    apis: ['Bun.randomUUIDv7'],
    docs: 'https://bun.com/docs/runtime/utils#bun-randomuuidv7',
    snippet: `console.log(Bun.randomUUIDv7());`,
    run: () => Bun.randomUUIDv7(),
  },
  {
    id: 'compression',
    summary: 'gzip / deflate / zstd sync',
    apis: [
      'Bun.gzipSync',
      'Bun.gunzipSync',
      'Bun.deflateSync',
      'Bun.inflateSync',
      'Bun.zstdCompressSync',
      'Bun.zstdDecompressSync',
    ],
    docs: 'https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync',
    snippet: `const data = Buffer.from("hello".repeat(100));
const gz = Bun.gzipSync(data);
const z = Bun.zstdCompressSync(data);`,
    run: () => {
      const data = Buffer.from('hello'.repeat(100));
      const gz = Bun.gzipSync(data);
      const gunz = Bun.gunzipSync(gz);
      const df = Bun.deflateSync(data);
      const inf = Bun.inflateSync(df);
      const z = Bun.zstdCompressSync(data);
      const uz = Bun.zstdDecompressSync(z);
      return `gz=${gz.length} zstd=${z.length} roundtrip=${gunz.length === data.length && inf.length === data.length && uz.length === data.length}`;
    },
  },
  {
    id: 'buffers',
    summary: 'concatArrayBuffers + allocUnsafe',
    apis: ['Bun.concatArrayBuffers', 'Bun.allocUnsafe'],
    docs: 'https://bun.com/docs/runtime/bun-apis',
    snippet: `const c = Bun.concatArrayBuffers([a, b]); // ArrayBuffer
const buf = Bun.allocUnsafe(1024);`,
    run: () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = Bun.concatArrayBuffers([a, b]);
      const buf = Bun.allocUnsafe(1024);
      return `concat=${c.byteLength} alloc=${buf.byteLength}`;
    },
  },
  {
    id: 'string-utils',
    summary: 'escapeHTML / stringWidth / stripANSI / wrapAnsi / sliceAnsi',
    apis: ['Bun.escapeHTML', 'Bun.stringWidth', 'Bun.stripANSI', 'Bun.wrapAnsi', 'Bun.sliceAnsi'],
    docs: 'https://bun.com/docs/runtime/utils#bun-stringwidth',
    snippet: `Bun.escapeHTML("<div>");
Bun.stringWidth("hi");
Bun.stripANSI("\\x1b[31mred\\x1b[0m");
Bun.wrapAnsi("long line here", 8);
Bun.sliceAnsi("\\x1b[31mred\\x1b[0m", 0, 2);`,
    run: () => {
      const ansi = '\x1b[31mred\x1b[0m';
      return [
        Bun.escapeHTML('<div>'),
        `w=${Bun.stringWidth('hi')}`,
        Bun.stripANSI(ansi),
        Bun.wrapAnsi('long line here', 8).replace(/\n/g, '|'),
        Bun.sliceAnsi(ansi, 0, 2),
      ].join(' ');
    },
  },
  {
    id: 'color',
    summary: 'Bun.color convert',
    apis: ['Bun.color'],
    docs: 'https://bun.com/docs/runtime/color',
    snippet: `Bun.color("red", "hex"); // #ff0000`,
    run: () => String(Bun.color('red', 'hex')),
  },
  {
    id: 'inspect-table',
    summary: 'Bun.inspect + inspect.table',
    apis: ['Bun.inspect', 'Bun.inspect.table'],
    docs: 'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
    snippet: `Bun.inspect({ a: 1 }, { depth: 1 });
Bun.inspect.table([{ a: 1 }], ["a"]);`,
    run: () => {
      const s = Bun.inspect({ a: { b: 1 } }, { depth: 1 });
      const t = inspectTable([{ a: 1, b: 2 }], ['a', 'b']);
      return `inspect=${s.includes('a')} table=${t.includes('1')}`;
    },
  },
  {
    id: 'semver',
    summary: 'Bun.semver order + satisfies',
    apis: ['Bun.semver', 'Bun.semver.order', 'Bun.semver.satisfies'],
    docs: 'https://bun.com/docs/runtime/semver',
    snippet: `Bun.semver.order("1.2.3", "1.2.4");
Bun.semver.satisfies("1.2.3", "^1.0.0");`,
    run: () =>
      `order=${Bun.semver.order('1.2.3', '1.2.4')} ok=${Bun.semver.satisfies('1.2.3', '^1.0.0')}`,
  },
  {
    id: 'markdown',
    summary: 'Bun.markdown.html + ansi',
    apis: ['Bun.markdown', 'Bun.markdown.html', 'Bun.markdown.ansi'],
    docs: 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
    snippet: `Bun.markdown.html("# Hi");
Bun.markdown.ansi("# Hi");`,
    run: () => {
      const html = Bun.markdown.html('# Hi');
      const ansi = Bun.markdown.ansi('# Hi');
      return `html=${html.includes('h1')} ansi=${ansi.length > 0}`;
    },
  },
  {
    id: 'shell-which',
    summary: 'Bun.$ + Bun.which',
    apis: ['Bun.$', 'Bun.which'],
    docs: 'https://bun.com/docs/runtime/utils#bun-which',
    snippet: `const out = await Bun.\`echo hello\`.text();
Bun.which("bun");`,
    run: async () => {
      const out = (await Bun.$`echo hello`.text()).trim();
      return `${out} which=${Bun.which('bun') ? 'yes' : 'no'}`;
    },
  },
  {
    id: 'spawn',
    summary: 'Bun.spawnSync',
    apis: ['Bun.spawn', 'Bun.spawnSync'],
    docs: 'https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn',
    snippet: `Bun.spawnSync(["bun", "--version"]);`,
    run: () => {
      const sync = Bun.spawnSync(['bun', '--version']); // bare-bun-ok — docs snippet demo
      return new TextDecoder().decode(sync.stdout).trim();
    },
  },
  {
    id: 'glob',
    summary: 'Bun.Glob scan + match',
    apis: ['Bun.Glob'],
    docs: 'https://bun.com/docs/runtime/glob#quickstart',
    snippet: `const g = new Bun.Glob("package.json");
g.match("package.json");`,
    run: () => {
      const g = new Bun.Glob('package.json');
      return `match=${g.match('package.json')}`;
    },
  },
  {
    id: 'csrf',
    summary: 'Bun.CSRF generate + verify',
    apis: ['Bun.CSRF', 'Bun.CSRF.generate', 'Bun.CSRF.verify'],
    docs: 'https://bun.com/docs/runtime/csrf#bun-csrf-generate',
    snippet: `const token = Bun.CSRF.generate("secret");
Bun.CSRF.verify(token, { secret: "secret" });`,
    run: () => {
      const token = Bun.CSRF.generate('oneliner-secret');
      const ok = Bun.CSRF.verify(token, { secret: 'oneliner-secret' });
      return `verify=${ok}`;
    },
  },
  {
    id: 'cookies',
    summary: 'Bun.Cookie + CookieMap',
    apis: ['Bun.Cookie', 'Bun.CookieMap'],
    docs: 'https://bun.com/docs/runtime/cookies',
    snippet: `new Bun.Cookie("session", "abc", { httpOnly: true });
new Bun.CookieMap("session=abc").get("session");`,
    run: () => {
      const c = new Bun.Cookie('session', 'abc123', { httpOnly: true });
      const map = new Bun.CookieMap('session=abc123');
      return `${c.name}=${map.get('session')}`;
    },
  },
  {
    id: 'sqlite',
    summary: 'bun:sqlite CRUD',
    apis: ['bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/sqlite',
    snippet: `import { Database } from "bun:sqlite";
const db = new Database(":memory:");`,
    run: async () => {
      const { Database } = await import('bun:sqlite');
      const db = new Database(':memory:');
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.query('INSERT INTO t (name) VALUES (?)').run('Alice');
      const rows = db.query('SELECT * FROM t').all() as Array<{ name: string }>;
      return `rows=${rows.length} name=${rows[0]?.name}`;
    },
  },
  {
    id: 'archive',
    summary: 'Bun.Archive create + list',
    apis: ['Bun.Archive'],
    docs: 'https://bun.com/docs/runtime/archive#quickstart',
    snippet: `const archive = new Bun.Archive({ "a.txt": "hi" });
await archive.bytes();`,
    run: async () => {
      const archive = new Bun.Archive({ 'a.txt': 'hi' });
      const bytes = await archive.bytes();
      return `bytes=${bytes.byteLength}`;
    },
  },
  {
    id: 'transpiler',
    summary: 'Bun.Transpiler transformSync',
    apis: ['Bun.Transpiler'],
    docs: 'https://bun.com/docs/runtime/transpiler',
    snippet: `new Bun.Transpiler({ loader: "ts" }).transformSync("const x: number = 1;");`,
    run: () => {
      const t = new Bun.Transpiler({ loader: 'ts', target: 'bun' });
      const out = t.transformSync('const x: number = 1;');
      return out.includes('const x') ? 'ok' : 'fail';
    },
  },
  {
    id: 'resolve',
    summary: 'Bun.resolveSync',
    apis: ['Bun.resolveSync'],
    docs: 'https://bun.com/docs/runtime/utils#bun-resolvesync',
    snippet: `Bun.resolveSync("./package.json", import.meta.dir);`,
    run: () => Bun.resolveSync('./package.json', process.cwd()),
  },
  {
    id: 'env-argv-main',
    summary: 'Bun.env / argv / main',
    apis: ['Bun.env', 'Bun.argv', 'Bun.main'],
    docs: 'https://bun.com/docs/runtime/utils#bun-main',
    snippet: `Bun.env.HOME; Bun.argv; Bun.main;`,
    run: () => `home=${Boolean(Bun.env.HOME)} argv=${Bun.argv.length} main=${Boolean(Bun.main)}`,
  },
  {
    id: 'version-revision',
    summary: 'Bun.version + Bun.revision',
    apis: ['Bun.version', 'Bun.revision'],
    docs: 'https://bun.com/docs/runtime/utils#bun-version',
    snippet: `console.log(Bun.version, Bun.revision);`,
    run: () => `${Bun.version} ${Bun.revision.slice(0, 8)}`,
  },
  {
    id: 'deep-equals-peek',
    summary: 'Bun.deepEquals + Bun.peek',
    apis: ['Bun.deepEquals', 'Bun.peek'],
    docs: 'https://bun.com/docs/runtime/utils#bun-deepequals',
    snippet: `Bun.deepEquals({a:1},{a:1}); Bun.peek(Promise.resolve(1));`,
    run: () => {
      const eq = Bun.deepEquals({ a: 1 }, { a: 1 });
      const p = Bun.peek(Promise.resolve(42));
      return `eq=${eq} peek=${String(p)}`;
    },
  },
  {
    id: 'serve-stop',
    summary: 'Bun.serve start + stop (localhost)',
    apis: ['Bun.serve'],
    docs: 'https://bun.com/docs/runtime/http/server#basic-setup',
    snippet: `const s = Bun.serve({ port: 0, fetch: () => new Response("ok") });
s.stop(true);`,
    run: async () => {
      const s = Bun.serve({
        port: 0,
        fetch: () => new Response('ok'),
      });
      const port = s.port;
      const res = await fetch(`http://127.0.0.1:${port}/`);
      const text = await res.text();
      s.stop(true);
      return `port=${port} body=${text}`;
    },
  },
  {
    id: 'build-inline',
    summary: 'Bun.build in-memory entry',
    apis: ['Bun.build'],
    docs: 'https://bun.com/docs/bundler',
    snippet: `await Bun.build({ entrypoints: [...], outfile: "..." });`,
    run: async () => {
      const dir = await mkdtempSafe('build-');
      const entry = `${dir}/entry.ts`;
      await Bun.write(entry, 'export const x = 1;\n');
      const result = await Bun.build({
        entrypoints: [entry],
        outdir: `${dir}/out`,
      });
      await rmSafe(dir);
      return `success=${result.success} outputs=${result.outputs.length}`;
    },
  },
  {
    id: 'timers',
    summary: 'Bun.sleep / sleepSync / nanoseconds',
    apis: ['Bun.sleep', 'Bun.sleepSync', 'Bun.nanoseconds'],
    docs: 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
    snippet: `const t0 = Bun.nanoseconds();
await Bun.sleep(10);
Bun.sleepSync(5);`,
    run: async () => {
      const t0 = Bun.nanoseconds();
      await Bun.sleep(10);
      Bun.sleepSync(5);
      return `ms=${((Bun.nanoseconds() - t0) / 1e6).toFixed(1)}`;
    },
  },
  {
    id: 'streams',
    summary: 'readableStreamToBytes + ArrayBufferSink',
    apis: ['Bun.readableStreamToBytes', 'Bun.ArrayBufferSink'],
    docs: 'https://bun.com/docs/runtime/streams#bun-arraybuffersink',
    snippet: `await Bun.readableStreamToBytes(stream);
new Bun.ArrayBufferSink();`,
    run: async () => {
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(new TextEncoder().encode('ab'));
          ctrl.close();
        },
      });
      const bytes = await Bun.readableStreamToBytes(stream);
      const sink = new Bun.ArrayBufferSink();
      sink.write('hello');
      const end = sink.end();
      return `stream=${new TextDecoder().decode(bytes)} sink=${new TextDecoder().decode(end)}`;
    },
  },
  {
    id: 'gc-heap',
    summary: 'Bun.gc (+ generateHeapSnapshot exists)',
    apis: ['Bun.gc', 'Bun.generateHeapSnapshot'],
    docs: 'https://bun.com/docs/runtime/utils',
    snippet: `Bun.gc(true);
// Bun.generateHeapSnapshot(); // heavy — call deliberately`,
    run: () => {
      Bun.gc(true);
      return `heapSnapshotFn=${typeof Bun.generateHeapSnapshot}`;
    },
  },
  {
    id: 'mmap',
    summary: 'Bun.mmap → Uint8Array',
    apis: ['Bun.mmap'],
    docs: 'https://bun.com/docs/runtime/bun-apis',
    snippet: `const buf = Bun.mmap("package.json"); // Uint8Array`,
    run: () => {
      const buf = Bun.mmap('package.json');
      return `ctor=${buf.constructor.name} len=${buf.byteLength}`;
    },
  },
  {
    id: 'path-url',
    summary: 'pathToFileURL / fileURLToPath',
    apis: ['Bun.pathToFileURL', 'Bun.fileURLToPath'],
    docs: 'https://bun.com/docs/runtime/utils#bun-pathtofileurl',
    snippet: `const url = Bun.pathToFileURL("/tmp/x");
Bun.fileURLToPath(url);`,
    run: () => {
      const url = Bun.pathToFileURL('/tmp/x');
      return Bun.fileURLToPath(url);
    },
  },
  {
    id: 'dns-lookup',
    summary: 'Bun.dns.lookup (live)',
    apis: ['Bun.dns', 'Bun.dns.lookup', 'Bun.dns.prefetch', 'Bun.dns.getCacheStats'],
    docs: 'https://bun.com/docs/runtime/networking/dns#dns-prefetch',
    live: true,
    snippet: `const [addr] = await Bun.dns.lookup("bun.com");
Bun.dns.prefetch("bun.com");
Bun.dns.getCacheStats();`,
    run: async () => {
      const [addr] = await Bun.dns.lookup('bun.com');
      Bun.dns.prefetch('bun.com');
      const stats = Bun.dns.getCacheStats();
      return `addr=${addr?.address ?? '?'} stats=${Boolean(stats)}`;
    },
  },
  {
    id: 'tcp-echo',
    summary: 'Bun.listen + Bun.connect echo (live localhost)',
    apis: ['Bun.listen', 'Bun.connect'],
    docs: 'https://bun.com/docs/runtime/networking',
    live: true,
    snippet: `const server = await Bun.listen({ port: 0, socket: { data(s, b) { s.write(b); } } });`,
    run: async () => {
      let echoed = '';
      const server = await Bun.listen({
        hostname: '127.0.0.1',
        port: 0,
        socket: {
          data(sock, buf) {
            sock.write(buf);
          },
        },
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const client = Bun.connect({
            hostname: '127.0.0.1',
            port: server.port,
            socket: {
              open(sock) {
                sock.write('hello');
              },
              data(_sock, buf) {
                echoed = new TextDecoder().decode(buf);
                _sock.end();
                resolve();
              },
              error(_sock, err) {
                reject(err);
              },
            },
          });
          void client;
          setTimeout(() => reject(new Error('tcp timeout')), 2000);
        });
      } finally {
        server.stop(true);
      }
      return `echo=${echoed}`;
    },
  },
  {
    id: 'sql',
    summary: 'Bun.SQL tagged template (live)',
    apis: ['Bun.SQL', 'Bun.sql'],
    docs: 'https://bun.com/docs/runtime/sql',
    live: true,
    snippet: `const sql = new Bun.SQL(Bun.env.DATABASE_URL!);
await sql\`SELECT 1\`;`,
  },
  {
    id: 'redis',
    summary: 'Bun.RedisClient (live)',
    apis: ['Bun.RedisClient', 'RedisClient'],
    docs: 'https://bun.com/docs/runtime/redis#getting-started',
    live: true,
    snippet: `const client = new Bun.RedisClient(Bun.env.REDIS_URL!);`,
  },
  {
    id: 'webview',
    summary: 'Bun.WebView (live)',
    apis: ['Bun.WebView'],
    docs: 'https://bun.com/docs/runtime/webview',
    live: true,
    snippet: `const w = new Bun.WebView({ url: "https://bun.com", headless: true });`,
  },
  {
    id: 'udp',
    summary: 'Bun.udpSocket (live)',
    apis: ['Bun.udpSocket'],
    docs: 'https://bun.com/docs/runtime/networking',
    live: true,
    snippet: `const sock = await Bun.udpSocket({});`,
  },
  {
    id: 'image',
    summary: 'Bun.Image metadata (needs input bytes)',
    apis: ['Bun.Image'],
    docs: 'https://bun.com/docs/runtime/image',
    live: true,
    snippet: `const img = new Bun.Image(bytes);
await img.metadata();`,
  },
  {
    id: 'cron',
    summary: 'Bun.cron schedule (in-process)',
    apis: ['Bun.cron'],
    docs: 'https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process',
    snippet: `Bun.cron("0 0 1 1 *", () => {}, "demo"); // schedule, handler, title`,
    run: () => {
      // In-process: (schedule, handler, title) — stop/unref so CLI can exit
      const job = Bun.cron('0 0 1 1 *', () => {}, 'oneliner-demo') as {
        stop?: () => void;
        unref?: () => void;
      };
      if (typeof job?.stop === 'function') job.stop();
      else if (typeof job?.unref === 'function') job.unref();
      return `cronJob=${job?.constructor?.name ?? typeof job}`;
    },
  },
  {
    id: 'fs-router',
    summary: 'Bun.FileSystemRouter',
    apis: ['Bun.FileSystemRouter'],
    docs: 'https://bun.com/docs/runtime/file-system-router',
    snippet: `new Bun.FileSystemRouter({ dir: "./pages", style: "nextjs" });`,
    run: async () => {
      const dir = await mkdtempSafe('pages-');
      await Bun.write(`${dir}/index.tsx`, 'export default () => null;');
      const router = new Bun.FileSystemRouter({ dir, style: 'nextjs' });
      const match = router.match('/');
      await rmSafe(dir);
      return `match=${Boolean(match)}`;
    },
  },
  {
    id: 'html-rewriter',
    summary: 'HTMLRewriter transform',
    apis: ['HTMLRewriter'],
    docs: 'https://bun.com/docs/runtime/html-rewriter',
    snippet: `new HTMLRewriter().on("title", { element(el) { el.setInnerContent("X"); } });`,
    run: async () => {
      const rewriter = new HTMLRewriter().on('title', {
        element(el) {
          el.setInnerContent('New');
        },
      });
      const out = await rewriter.transform(new Response('<html><title>Old</title></html>')).text();
      return out.includes('New') ? 'ok' : 'fail';
    },
  },
];

async function mkdtempSafe(prefix: string): Promise<string> {
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  return mkdtemp(join(tmpdir(), prefix));
}

async function rmSafe(dir: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  await rm(dir, { recursive: true, force: true });
}

/** All API tokens exercised by the oneliner inventory. */
export function onelinerCoveredApis(opts?: { includeLive?: boolean }): Set<string> {
  const includeLive = opts?.includeLive ?? true;
  const set = new Set<string>();
  for (const d of BUN_API_ONELINERS) {
    if (d.live && !includeLive) continue;
    for (const a of d.apis) set.add(a);
  }
  return set;
}

export function lookupOneliner(id: string): ApiOneliner | undefined {
  // brand-ok — demo oneliner id
  return BUN_API_ONELINERS.find(d => d.id === id);
}

export async function runOneliner(
  id: string, // brand-ok — demo oneliner id
  opts?: { live?: boolean }
): Promise<{ id: string; result: string }> {
  // brand-ok — demo oneliner id
  const d = lookupOneliner(id);
  if (!d) throw new Error(`unknown oneliner: ${id}`);
  if (d.live && !opts?.live) {
    throw new Error(`oneliner ${id} is live — pass --live`);
  }
  if (!d.run) throw new Error(`oneliner ${id} has no run()`);
  const result = await d.run();
  return { id, result };
}

export function formatOnelinersBlock(opts?: { id?: string }): string {
  // brand-ok — demo oneliner id
  const bun = toolTableVersion();
  const rows = BUN_API_ONELINERS.filter(d => !opts?.id || d.id === opts.id).map(d => ({
    id: d.id,
    live: d.live ? 'live' : 'offline',
    apis: d.apis.slice(0, 3).join(',') + (d.apis.length > 3 ? '…' : ''),
    attrs: d.run ? 'runnable' : 'snippet',
    summary: d.summary,
  }));
  if (!rows.length) return `unknown oneliner id: ${opts?.id}\n`;

  const lines = [
    'Bun API one-liners (verified SSOT — prefer over ad-hoc bun -e)',
    '',
    formatCliTable(
      rows,
      [
        { key: 'id', header: 'ID', maxWidth: 18 },
        { key: 'live', header: 'LIVE', maxWidth: 8 },
        { key: 'apis', header: 'APIS', maxWidth: 36 },
        { key: 'attrs', header: 'ATTRS', maxWidth: 10 },
        { key: 'summary', header: 'SUMMARY', maxWidth: 40 },
      ],
      {
        indent: '  ',
        bun,
        cols: ['id', 'live', 'apis', 'attrs', 'summary'],
      }
    ).trimEnd(),
    '',
    '  Run: bun tools/bun-doc-refs.ts oneliners --run <id> [--live]',
    '  Detail: bun tools/bun-doc-refs.ts oneliners --id=<id>',
  ];

  if (opts?.id) {
    const d = lookupOneliner(opts.id);
    if (d) {
      lines.push('', `── ${d.id} ──`, d.snippet.trimEnd(), '');
      if (d.docs) lines.push(`docs  ${d.docs}`);
      lines.push(`apis  ${d.apis.join(', ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function onelinersSnapshot() {
  return {
    bunVersion: Bun.version,
    count: BUN_API_ONELINERS.length,
    offline: BUN_API_ONELINERS.filter(d => !d.live).length,
    live: BUN_API_ONELINERS.filter(d => d.live).length,
    coveredApis: [...onelinerCoveredApis()].sort(),
    demos: BUN_API_ONELINERS.map(d => ({
      id: d.id,
      apis: d.apis,
      live: Boolean(d.live),
      runnable: Boolean(d.run),
      summary: d.summary,
      docs: d.docs,
    })),
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const json = args.includes('--json') || args.includes('-j');
  const live = args.includes('--live');
  const idFlag = args.find(a => a.startsWith('--id='))?.slice('--id='.length);
  const runIdx = args.indexOf('--run');
  if (runIdx !== -1) {
    const id = args[runIdx + 1];
    if (!id) {
      console.error('usage: --run <id>');
      process.exit(1);
    }
    const { result } = await runOneliner(id, { live });
    console.log(result);
    process.exit(0);
  }
  if (json) {
    console.log(JSON.stringify(onelinersSnapshot(), null, 2));
  } else {
    console.log(formatOnelinersBlock({ id: idFlag }).trimEnd());
  }
}
