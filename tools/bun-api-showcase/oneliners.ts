#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.webp
// @released Bun.Image.webp · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
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
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils — Bun.gc
// @see https://bun.com/docs/runtime/utils — Bun.generateHeapSnapshot
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/sql — Bun.SQL
// @see https://bun.com/docs/runtime/jsonc — Bun.JSONC
// @see https://bun.com/docs/runtime/json5 — Bun.JSON5
// @see https://bun.com/docs/runtime/jsonl — Bun.JSONL
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash.crc32
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.verify
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/archive#quickstart — Bun.Archive
// @see https://bun.com/docs/runtime/utils#bun-gzipsync — Bun.gzipSync
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/runtime/cookies#cookie-class — Bun.Cookie
// @see https://bun.com/docs/runtime/cookies#cookiemap-class — CookieMap
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns.prefetch
// @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats — Bun.dns.getCacheStats
// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @see https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen — Bun.listen
// @see https://bun.com/docs/runtime/streams#bun-arraybuffersink — Bun.ArrayBufferSink
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/bundler/plugins#usage — Bun.plugin
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket — Bun.udpSocket
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF.generate
// @see https://bun.com/docs/runtime/csrf#bun-csrf-verify — Bun.CSRF.verify
// @see https://bun.com/docs/runtime/redis#getting-started — RedisClient
// @see https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi — bun:ffi
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/cookies#cookiemap-class — Bun.CookieMap
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-sleepsync — Bun.sleepSync
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @see https://bun.com/docs/runtime/utils#bun-deflatesync — Bun.deflateSync
// @see https://bun.com/docs/runtime/utils#bun-gunzipsync — Bun.gunzipSync
// @see https://bun.com/docs/runtime/utils#bun-inflatesync — Bun.inflateSync
// @see https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync — Bun.zstdCompressSync
// @see https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync — Bun.zstdDecompressSync
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/bun-apis
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bun API showcase — verified against Bun 1.4.0 on this machine.
 * Each demo is a corrected, runnable version of the one-liner set.
 *
 * Usage:
 *   bun run showcase            # offline demos only (default)
 *   bun run showcase --live     # include network/credentialed demos
 *   bun tools/bun-api-showcase/oneliners.ts <id>  # run a single demo
 *
 * Corrections vs the original one-liner set are marked `// FIX:`.
 */
import { inspectTable } from '../../lib/console-depth.ts';

export type ShowcaseDemo = {
  id: string; // brand-ok — demo oneliner id
  title: string;
  apis: string[];
  /** Requires network / credentials / launches UI. Skipped unless --live. */
  live?: boolean;
  run: () => Promise<void> | void;
};

const SCRATCH = '.tmp/showcase';
await Bun.$`mkdir -p ${SCRATCH}`.quiet();

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const demos: ShowcaseDemo[] = [
  {
    id: 'file-io',
    title: 'File I/O & metadata',
    apis: ['Bun.file'],
    async run() {
      const f = Bun.file('package.json');
      if (!(await f.exists())) throw new Error('missing');
      const stat = await f.stat();
      const json = await f.json();
      console.log(`  size=${stat.size} name=${json.name}`);
    },
  },
  {
    id: 'write-copy',
    title: 'Write & copy',
    apis: ['Bun.write', 'Bun.file'],
    async run() {
      await Bun.write(`${SCRATCH}/copy.json`, Bun.file('package.json'));
      console.log(`  copied ${(await Bun.file(`${SCRATCH}/copy.json`).stat()).size} bytes`);
    },
  },
  {
    id: 'toml',
    title: 'TOML parse & stringify',
    apis: ['Bun.TOML.stringify', 'Bun.TOML.parse'],
    async run() {
      const toml = Bun.TOML.stringify({ version: '1.0.0', deps: { a: '^1.0' } });
      await Bun.write(`${SCRATCH}/config.toml`, toml);
      console.log(`  roundtrip deps.a=${Bun.TOML.parse(toml).deps.a}`);
    },
  },
  {
    id: 'json-formats',
    title: 'JSONC / JSON5 / JSONL',
    apis: ['Bun.JSONC.parse', 'Bun.JSON5.parse', 'Bun.JSONL.parse'],
    run() {
      const cfg = Bun.JSONC.parse('{// c\n"strict":true}');
      const five = Bun.JSON5.parse("{// c\nhello:'world'}");
      const lines = Bun.JSONL.parse('{"a":1}\n{"b":2}');
      console.log(
        `  jsonc.strict=${cfg.strict} json5.hello=${five.hello} jsonl=${lines.length} rows`
      );
    },
  },
  {
    id: 'crypto-hasher',
    title: 'CryptoHasher HMAC + clone',
    apis: ['Bun.CryptoHasher'],
    run() {
      const h = new Bun.CryptoHasher('sha512', 'secret');
      h.update('data');
      // FIX: the method is copy(), not clone().
      const twin = h.copy();
      twin.update('more');
      console.log(
        `  hmac=${h.digest('hex').slice(0, 16)}… copied=${twin.digest('hex').slice(0, 16)}…`
      );
    },
  },
  {
    id: 'password',
    title: 'Password hashing (argon2id)',
    apis: ['Bun.password.hash', 'Bun.password.verify'],
    async run() {
      const hash = await Bun.password.hash('secret', { algorithm: 'argon2id', memoryCost: 1024 });
      console.log(`  verify=${await Bun.password.verify('secret', hash)}`);
    },
  },
  {
    id: 'hash',
    title: 'wyhash & crc32',
    apis: ['Bun.hash', 'Bun.hash.crc32'],
    run() {
      console.log(`  wyhash=${Bun.hash('hello')} crc32=${Bun.hash.crc32('hello')}`);
    },
  },
  {
    id: 'uuid',
    title: 'UUID v7',
    apis: ['Bun.randomUUIDv7'],
    run() {
      console.log(`  ${Bun.randomUUIDv7()}`);
    },
  },
  {
    id: 'compression',
    title: 'gzip / deflate / zstd roundtrip',
    apis: [
      'Bun.gzipSync',
      'Bun.gunzipSync',
      'Bun.deflateSync',
      'Bun.inflateSync',
      'Bun.zstdCompressSync',
      'Bun.zstdDecompressSync',
    ],
    run() {
      const data = Buffer.from('hello'.repeat(1000));
      const gz = Bun.gzipSync(data);
      const def = Bun.deflateSync(data);
      const zstd = Bun.zstdCompressSync(data);
      const ok =
        Bun.gunzipSync(gz).toString() === data.toString() &&
        Bun.inflateSync(def).toString() === data.toString() &&
        Bun.zstdDecompressSync(zstd).toString() === data.toString();
      console.log(
        `  gzip=${gz.length}B deflate=${def.length}B zstd=${zstd.length}B roundtrip=${ok}`
      );
    },
  },
  {
    id: 'arraybuffers',
    title: 'concatArrayBuffers & allocUnsafe',
    apis: ['Bun.concatArrayBuffers', 'Bun.allocUnsafe'],
    run() {
      const c = Bun.concatArrayBuffers([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
      console.log(`  concat=[${new Uint8Array(c)}] alloc=${Bun.allocUnsafe(1024).length}B`);
    },
  },
  {
    id: 'string-utils',
    title: 'escapeHTML / stringWidth / ANSI utils',
    apis: ['Bun.escapeHTML', 'Bun.stringWidth', 'Bun.stripANSI', 'Bun.wrapAnsi', 'Bun.sliceAnsi'],
    run() {
      const ansi = '\x1b[31mred\x1b[0m';
      console.log(
        `  escape=${Bun.escapeHTML('<div>')} width=${Bun.stringWidth('👨\u200d👩\u200d👧\u200d👦')} strip=${Bun.stripANSI(ansi)} slice="${Bun.sliceAnsi(ansi, 0, 2)}" wrap=${JSON.stringify(Bun.wrapAnsi('long line', 6))}`
      );
    },
  },
  {
    id: 'color',
    title: 'Color conversion',
    apis: ['Bun.color'],
    run() {
      // FIX: "ansi" is not a valid output format — use ansi-16 / ansi-256 / ansi-16m.
      console.log(
        `  red→css=${Bun.color('red', 'css')} cyan→ansi-16=${JSON.stringify(Bun.color('cyan', 'ansi-16'))}`
      );
    },
  },
  {
    id: 'inspect',
    title: 'Inspect & table',
    apis: ['Bun.inspect', 'Bun.inspect.table'],
    run() {
      // NOTE: inspect.table's columns arg is a key allowlist, not positional labels —
      // array rows render empty cells; pass objects (keys become headers).
      const t = inspectTable([
        { A: 1, B: 2 },
        { A: 3, B: 4 },
      ]);
      console.log(`  inspect=${Bun.inspect({ a: 1 })} tableHasData=${t.includes('3')}`);
      if (!t.includes('3')) throw new Error('table lost data');
    },
  },
  {
    id: 'semver',
    title: 'Semver',
    apis: ['Bun.semver.order', 'Bun.semver.satisfies'],
    run() {
      console.log(
        `  order=${Bun.semver.order('1.2.3', '1.2.4')} satisfies=${Bun.semver.satisfies('1.2.3', '^1.0.0')}`
      );
    },
  },
  {
    id: 'markdown',
    title: 'Markdown → HTML & ANSI',
    apis: ['Bun.markdown'],
    run() {
      // FIX: Bun.markdown is an object, not a function — use .html / .ansi.
      console.log(
        `  html=${Bun.markdown.html('# Hello').trim()} ansi=${JSON.stringify(Bun.markdown.ansi('**w**').trim())}`
      );
    },
  },
  {
    id: 'dns',
    title: 'DNS lookup / prefetch / cache stats',
    apis: ['Bun.dns.lookup', 'Bun.dns.prefetch', 'Bun.dns.getCacheStats'],
    live: true,
    async run() {
      const [addr] = await Bun.dns.lookup('bun.sh');
      Bun.dns.prefetch('bun.sh');
      console.log(`  addr=${addr.address} cache=${JSON.stringify(Bun.dns.getCacheStats())}`);
    },
  },
  {
    id: 'udp',
    title: 'UDP socket',
    apis: ['Bun.udpSocket'],
    live: true,
    async run() {
      const sock = await Bun.udpSocket({
        socket: {
          data(_s, buf) {
            console.log(`  reply=${buf.length}B`);
          },
        },
      });
      sock.send('ping', 53, '8.8.8.8');
      await Bun.sleep(300);
      sock.close();
      console.log('  sent + closed');
    },
  },
  {
    id: 'tcp',
    title: 'TCP echo (connect/listen)',
    apis: ['Bun.connect', 'Bun.listen'],
    async run() {
      const server = await Bun.listen({
        hostname: '127.0.0.1',
        port: 0,
        socket: {
          data(sock, buf) {
            sock.write(buf);
          },
        },
      });
      let echoed = '';
      const client = await Bun.connect({
        hostname: '127.0.0.1',
        port: server.port,
        socket: {
          data(sock, buf) {
            echoed = buf.toString();
            sock.end();
          },
        },
      });
      client.write('hello');
      await Bun.sleep(150);
      server.stop(true);
      console.log(`  echo="${echoed}"`);
      if (echoed !== 'hello') throw new Error('echo mismatch');
    },
  },
  {
    id: 'serve-ws',
    title: 'HTTP server + WebSocket upgrade',
    apis: ['Bun.serve'],
    async run() {
      const server = Bun.serve({
        port: 0,
        fetch(req, srv) {
          if (srv.upgrade(req)) return;
          return new Response('hello');
        },
        websocket: {
          message(ws, msg) {
            ws.send(`echo:${msg}`);
          },
        },
      });
      const http = await (await fetch(`http://127.0.0.1:${server.port}`)).text();
      const wsMsg = await new Promise<string>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${server.port}`);
        ws.onmessage = e => {
          resolve(String(e.data));
          ws.close();
        };
        ws.onerror = () => reject(new Error('ws failed'));
        ws.onopen = () => ws.send('ping');
      });
      server.stop(true);
      console.log(`  http="${http}" ws="${wsMsg}"`);
    },
  },
  {
    id: 'serve-lifecycle',
    title: 'Server reload / stop',
    apis: ['Bun.serve'],
    async run() {
      const server = Bun.serve({ port: 0, fetch: () => new Response('v1') });
      server.reload({ fetch: () => new Response('v2') });
      const body = await (await fetch(`http://127.0.0.1:${server.port}`)).text();
      server.stop(true);
      console.log(`  after reload="${body}"`);
      if (body !== 'v2') throw new Error('reload mismatch');
    },
  },
  {
    id: 'shell',
    title: 'Bun.$ shell + which',
    apis: ['Bun.$', 'Bun.which'],
    async run() {
      const out = (await Bun.$`echo hello`.text()).trim();
      console.log(`  $=${out} which(bun)=${Bun.which('bun')}`);
    },
  },
  {
    id: 'spawn',
    title: 'spawn & spawnSync',
    apis: ['Bun.spawn', 'Bun.spawnSync'],
    async run() {
      const p = Bun.spawn(['bun', '--version']); // bare-bun-ok — spawn demo
      const asyncVer = (await new Response(p.stdout).text()).trim();
      const syncVer = Bun.spawnSync(['bun', '--version']).stdout.toString().trim(); // bare-bun-ok
      console.log(`  async=${asyncVer} sync=${syncVer}`);
    },
  },
  {
    id: 'glob',
    title: 'Glob scan & match',
    apis: ['Bun.Glob'],
    async run() {
      const g = new Bun.Glob('package.json');
      const found: string[] = [];
      for await (const f of g.scan('.')) found.push(f);
      console.log(`  scan=${found.length} match=${g.match('package.json')}`);
    },
  },
  {
    id: 'fs-router',
    title: 'FileSystemRouter',
    apis: ['Bun.FileSystemRouter'],
    async run() {
      await Bun.write(`${SCRATCH}/pages/about.tsx`, 'export default () => null;');
      const router = new Bun.FileSystemRouter({ dir: SCRATCH + '/pages', style: 'nextjs' });
      console.log(`  /about → ${router.match('/about')?.filePath}`);
    },
  },
  {
    id: 'htmlrewriter',
    title: 'HTMLRewriter',
    apis: ['HTMLRewriter'],
    async run() {
      const rewriter = new HTMLRewriter().on('title', {
        element: el => el.setInnerContent('New Title'),
      });
      const out = await rewriter.transform(new Response('<html><title>Old</title></html>')).text();
      console.log(`  ${out.includes('New Title') ? 'title rewritten' : 'FAILED'}`);
      if (!out.includes('New Title')) throw new Error('rewrite failed');
    },
  },
  {
    id: 'csrf',
    title: 'CSRF generate & verify',
    apis: ['Bun.CSRF.generate', 'Bun.CSRF.verify'],
    run() {
      // FIX: generate() returns a string token; verify(token) — not {token, secret}.
      const token = Bun.CSRF.generate();
      console.log(`  verify=${Bun.CSRF.verify(token)}`);
    },
  },
  {
    id: 'cookies',
    title: 'Cookie & CookieMap',
    apis: ['Bun.Cookie', 'Bun.CookieMap'],
    run() {
      const c = new Bun.Cookie('session', 'abc123', { httpOnly: true, maxAge: 3600 });
      // FIX: CookieMap takes a cookie header string, not a Request.
      const map = new Bun.CookieMap('session=abc123');
      console.log(`  cookie="${c.toString().slice(0, 32)}…" map=${map.get('session')}`);
    },
  },
  {
    id: 'sqlite',
    title: 'bun:sqlite CRUD',
    apis: ['bun:sqlite.Database'],
    async run() {
      // FIX: Database is not a global — import from bun:sqlite.
      const { Database } = await import('bun:sqlite');
      const db = new Database(':memory:');
      db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      db.query('INSERT INTO users (name) VALUES (?)').run('Alice');
      console.log(`  rows=${JSON.stringify(db.query('SELECT * FROM users').all())}`);
      db.close();
    },
  },
  {
    id: 'sql',
    title: 'Bun.SQL tagged templates',
    apis: ['Bun.SQL'],
    live: true,
    async run() {
      const url = Bun.env.DATABASE_URL;
      if (!url) {
        console.log('  SKIP (no DATABASE_URL)');
        return;
      }
      const sql = new Bun.SQL(url);
      console.log(`  ${JSON.stringify(await sql`SELECT 1 as ok`)}`);
      await sql.close();
    },
  },
  {
    id: 'redis',
    title: 'RedisClient get/set',
    apis: ['Bun.RedisClient'],
    live: true,
    async run() {
      const url = Bun.env.REDIS_URL;
      if (!url) {
        console.log('  SKIP (no REDIS_URL)');
        return;
      }
      const client = new Bun.RedisClient(url);
      await client.connect();
      await client.set('showcase', 'value');
      console.log(`  get=${await client.get('showcase')}`);
      client.close();
    },
  },
  {
    id: 'webview',
    title: 'WebView evaluate & screenshot',
    apis: ['Bun.WebView'],
    live: true,
    async run() {
      const w = new Bun.WebView({ url: 'https://bun.sh', headless: true });
      await Bun.sleep(2000);
      const title = await w.evaluate('document.title');
      const png = await w.screenshot({ format: 'png' });
      await Bun.write(`${SCRATCH}/screenshot.png`, png);
      w.close();
      console.log(`  title="${title}" shot=${png.length ?? 'ok'}`);
    },
  },
  {
    id: 'image',
    title: 'Bun.Image resize/encode/metadata',
    apis: ['Bun.Image'],
    async run() {
      const img = new Bun.Image(Buffer.from(PNG_1PX, 'base64'));
      const meta = await img.metadata();
      const webp = await img.resize(2, 2).webp({ quality: 80 }).bytes();
      await Bun.write(`${SCRATCH}/output.webp`, webp);
      console.log(`  meta=${meta.width}x${meta.height} webp=${webp.length}B`);
    },
  },
  {
    id: 'archive',
    title: 'Bun.Archive create/read/extract',
    apis: ['Bun.Archive'],
    async run() {
      const archive = new Bun.Archive({ 'README.md': 'Hello' }, { compress: 'gzip' });
      const bytes = await archive.bytes();
      await Bun.write(`${SCRATCH}/out.tar.gz`, bytes);
      const read = new Bun.Archive(bytes);
      console.log(`  files=${JSON.stringify(await read.files())}`);
      await read.extract(`${SCRATCH}/extract`);
    },
  },
  {
    id: 'cron',
    title: 'Bun.cron scheduled task',
    apis: ['Bun.cron'],
    run() {
      // FIX: signature is Bun.cron(expr, fn, title?) — title is the third argument.
      const handle = Bun.cron('0 0 1 1 *', () => {}, 'showcase-demo');
      handle.stop();
      console.log('  scheduled + stopped (expr, fn, title)');
    },
  },
  {
    id: 'build',
    title: 'Bun.build with metafile',
    apis: ['Bun.build'],
    async run() {
      await Bun.write(`${SCRATCH}/entry.ts`, 'export const x: number = 1; console.log(x);');
      const result = await Bun.build({
        entrypoints: [`${SCRATCH}/entry.ts`],
        outdir: `${SCRATCH}/dist`,
        minify: true,
        metafile: true,
      });
      if (!result.success) throw new Error('build failed');
      // FIX: result.metafile is an object, not a path — read metafile.outputs directly.
      console.log(`  outputs=${Object.keys(result.metafile?.outputs ?? {}).length}`);
    },
  },
  {
    id: 'transpiler',
    title: 'Bun.Transpiler transform',
    apis: ['Bun.Transpiler'],
    run() {
      const t = new Bun.Transpiler({ loader: 'ts', target: 'bun' });
      console.log(`  ${t.transformSync('const x: number = 1;').trim()}`);
    },
  },
  {
    id: 'plugin',
    title: 'Bun.plugin resolver (via Bun.build)',
    apis: ['Bun.plugin'],
    async run() {
      // FIX: runtime Bun.plugin does not intercept dynamic import() in the same process
      // (Bun 1.4.0). Plugins apply through the bundler — Bun.build({ plugins }).
      await Bun.write(
        `${SCRATCH}/plugin-entry.ts`,
        'import foo from "showcase-foo"; console.log(foo);'
      );
      const result = await Bun.build({
        entrypoints: [`${SCRATCH}/plugin-entry.ts`],
        outdir: `${SCRATCH}/plugin-out`,
        plugins: [
          {
            name: 'showcase-foo',
            setup(b) {
              b.onResolve({ filter: /^showcase-foo$/ }, () => ({
                path: 'showcase-foo.js',
                namespace: 'showcase',
              }));
              b.onLoad({ filter: /.*/, namespace: 'showcase' }, () => ({
                contents: 'export default 42',
                loader: 'js',
              }));
            },
          },
        ],
      });
      if (!result.success) throw new Error('plugin build failed');
      const text = await result.outputs[0].text();
      console.log(
        `  bundled ${result.outputs.length} output(s), contains 42: ${text.includes('42')}`
      );
      if (!text.includes('42')) throw new Error('plugin output missing');
    },
  },
  {
    id: 'ffi',
    title: 'bun:ffi dlopen',
    apis: ['bun:ffi.dlopen'],
    async run() {
      // FIX: dlopen/FFIType come from bun:ffi; symbols use {args, returns}; calls live on lib.symbols.
      const { dlopen, FFIType } = await import('bun:ffi');
      const lib = dlopen('/usr/lib/libSystem.B.dylib', {
        getpid: { args: [], returns: FFIType.i32 },
      });
      console.log(`  getpid()=${lib.symbols.getpid()} (actual ${process.pid})`);
    },
  },
  {
    id: 'worker',
    title: 'Worker thread',
    apis: ['Worker'],
    async run() {
      await Bun.write(
        `${SCRATCH}/worker.js`,
        "self.onmessage = (e) => self.postMessage('pong:' + e.data);"
      );
      const reply = await new Promise<string>(resolve => {
        const w = new Worker(`${SCRATCH}/worker.js`);
        w.onmessage = e => {
          w.terminate();
          resolve(String(e.data));
        };
        w.postMessage('ping');
      });
      console.log(`  worker="${reply}"`);
    },
  },
  {
    id: 'resolve',
    title: 'Bun.resolveSync',
    apis: ['Bun.resolveSync'],
    run() {
      console.log(`  typescript → ${Bun.resolveSync('typescript', process.cwd())}`);
    },
  },
  {
    id: 'import-meta',
    title: 'import.meta utilities',
    apis: ['import.meta'],
    run() {
      console.log(`  dir=${import.meta.dir} file=${import.meta.file}`);
    },
  },
  {
    id: 'env-argv',
    title: 'Environment & args',
    apis: ['Bun.env', 'Bun.argv'],
    run() {
      console.log(`  HOME=${Bun.env.HOME ? 'set' : 'unset'} argv=${Bun.argv.length}`);
    },
  },
  {
    id: 'timers',
    title: 'sleep / sleepSync / nanoseconds',
    apis: ['Bun.sleep', 'Bun.sleepSync', 'Bun.nanoseconds'],
    async run() {
      const t0 = Bun.nanoseconds();
      await Bun.sleep(20);
      Bun.sleepSync(5);
      console.log(`  elapsed=${((Bun.nanoseconds() - t0) / 1e6).toFixed(1)}ms`);
    },
  },
  {
    id: 'streams',
    title: 'readableStreamTo* helpers',
    apis: [
      'Bun.readableStreamToBytes',
      'Bun.readableStreamToJSON',
      'Bun.readableStreamToArray',
      'Bun.readableStreamToBlob',
      'Bun.readableStreamToFormData',
    ],
    async run() {
      const mk = (chunks: unknown[]) =>
        new ReadableStream({
          start(c) {
            for (const x of chunks) c.enqueue(x);
            c.close();
          },
        });
      const bytes = await Bun.readableStreamToBytes(mk(['a', 'b']));
      const json = await Bun.readableStreamToJSON(mk(['{"k":1}']));
      const arr = await Bun.readableStreamToArray(mk([1, 2, 3]));
      const blob = await Bun.readableStreamToBlob(mk(['xy']));
      const boundary = '----showcase';
      const form = await Bun.readableStreamToFormData(
        mk([
          `--${boundary}\r\nContent-Disposition: form-data; name="k"\r\n\r\nv\r\n--${boundary}--\r\n`,
        ]),
        boundary
      );
      console.log(
        `  bytes=${new TextDecoder().decode(bytes)} json.k=${json.k} array=${arr.length} blob=${blob.size}B form.k=${form.get('k')}`
      );
    },
  },
  {
    id: 'arraybuffersink',
    title: 'ArrayBufferSink',
    apis: ['Bun.ArrayBufferSink'],
    run() {
      const sink = new Bun.ArrayBufferSink();
      sink.write('hello ');
      sink.write('world');
      console.log(`  "${new TextDecoder().decode(sink.end())}"`);
    },
  },
  {
    id: 'gc',
    title: 'gc & heap snapshot',
    apis: ['Bun.gc', 'Bun.generateHeapSnapshot'],
    run() {
      Bun.gc(true);
      console.log(`  gc forced; generateHeapSnapshot=${typeof Bun.generateHeapSnapshot} (not run)`);
    },
  },
  {
    id: 'mmap',
    title: 'Bun.mmap memory-map',
    apis: ['Bun.mmap'],
    run() {
      // FIX: Bun.mmap returns a TypedArray view directly — not {buffer, close}.
      const view = Bun.mmap('package.json');
      console.log(
        `  mapped ${view.length}B, first byte=${view[0]} (${String.fromCharCode(view[0])})`
      );
    },
  },
  {
    id: 'path-url',
    title: 'pathToFileURL / fileURLToPath',
    apis: ['Bun.pathToFileURL', 'Bun.fileURLToPath'],
    run() {
      const url = Bun.pathToFileURL('/etc/hosts');
      console.log(`  ${url.href} → ${Bun.fileURLToPath(url)}`);
    },
  },
  {
    id: 'inspect-depth',
    title: 'Inspect with depth & colors',
    apis: ['Bun.inspect'],
    run() {
      console.log(`  ${Bun.inspect({ a: { b: { c: 1 } } }, { depth: 1, colors: false })}`);
    },
  },
  {
    id: 'main',
    title: 'Bun.main entry point',
    apis: ['Bun.main'],
    run() {
      console.log(`  main=${Bun.main}`);
    },
  },
  {
    id: 'version-info',
    title: 'Version & revision',
    apis: ['Bun.version', 'Bun.revision'],
    run() {
      console.log(`  version=${Bun.version} revision=${Bun.revision.slice(0, 8)}`);
    },
  },
  {
    id: 'stdio',
    title: 'stdin / stdout / stderr',
    apis: ['Bun.stdin', 'Bun.stdout', 'Bun.stderr'],
    async run() {
      // Write through the Bun stdout sink rather than console.log.
      await Bun.write(
        Bun.stdout,
        `  stdin=${Bun.stdin.type} stdout=${Bun.stdout.type} stderr=${Bun.stderr.type}\n`
      );
    },
  },
];

async function main(): Promise<void> {
  const live = Bun.argv.includes('--live');
  const only = applyUnknownLongOptionGuardFor('showcase', Bun.argv.slice(2)).find(
    a => !a.startsWith('--')
  );
  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const demo of demos) {
    if (only && demo.id !== only) continue;
    if (demo.live && !live) {
      skip++;
      console.log(`SKIP ${demo.id.padEnd(18)} (live — rerun with --live)`);
      continue;
    }
    try {
      console.log(`RUN  ${demo.id.padEnd(18)} ${demo.title}`);
      await demo.run();
      pass++;
    } catch (err) {
      fail++;
      console.log(`FAIL ${demo.id.padEnd(18)} ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`\n${pass} pass · ${fail} fail · ${skip} skip (of ${demos.length})`);
  if (fail > 0) process.exit(1);
}

if (import.meta.main) await main();
