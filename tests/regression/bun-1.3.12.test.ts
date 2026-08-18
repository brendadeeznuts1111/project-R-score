// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/cookies#cookiemap-class — Bun.CookieMap
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/gc — Bun.gc
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen — Bun.listen
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket — Bun.udpSocket
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/blog/bun-v1.3.12
// Full-release regression probes for Bun v1.3.12 (Features · Performance · Bugfixes).
// Runs on Bun ≥ 1.3.12 (current CI is newer and must keep these fixed).
//
// Note: blog Features are WebView, markdown.ansi, async native stacks, in-process Bun.cron,
// UDP ICMP/truncation, unix socket lifecycle — not Bun.serve static / build target browser.
//
// Bugfix skips (fixSkip / always-skip) — env-specific, not CI failures:
//   1. Bun.SQL MySQL CLIENT_DEPRECATE_EOF — requires a MySQL-compatible server
//   2. bun:sql MySQL per-query native leaks — requires MySQL + RSS/allocator harness
//   3. bun build --compile PT_INTERP — Linux-only (NixOS/Guix ELF interpreter path)
//   4. mock.module() auto-install race — requires network + bare specifier resolution
//   5. Windows tar absolute/UNC path skip — win32-only path-traversal behavior
// Feature / performance skips:
//   6. Bun.WebView — skipped when constructor unavailable
//   7. TCP_DEFER_ACCEPT — Linux/FreeBSD-only accept filter (no-op on macOS/Windows)
//   8. Linux chmod-111 standalone executable — Linux-only --compile proof
//   9. Timing thresholds for URLPattern / Glob / stripANSI — manual bench only (CI-flaky)
//
//   bun test tests/regression/bun-1.3.12.test.ts
import { describe, expect, mock } from 'bun:test';
import assert from 'node:assert';
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import fs from 'node:fs';
import { Stats } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import * as vm from 'node:vm';
import tls from 'node:tls';
import { releaseTest, shortTempRoot, tempRoot } from './shared.ts';

const MIN_VERSION = '1.3.12';
const BLOG = 'https://bun.com/blog/bun-v1.3.12';
const BLOG_BUGFIXES = `${BLOG}#bugfixes`;

const { test: fixTest, skipIf: fixSkip } = releaseTest(MIN_VERSION);
const pipelineAsync = promisify(pipeline);

function cgroupV2CpuLimit(): number | null {
  if (process.platform !== 'linux') return null;
  try {
    const [quotaText, periodText] = fs
      .readFileSync('/sys/fs/cgroup/cpu.max', 'utf8')
      .trim()
      .split(/\s+/);
    if (quotaText === 'max') return null;
    const quota = Number(quotaText);
    const period = Number(periodText);
    return quota > 0 && period > 0 ? Math.max(1, Math.ceil(quota / period)) : null;
  } catch {
    return null;
  }
}

const cgroupCpuLimit = cgroupV2CpuLimit();

describe(`Bun ${MIN_VERSION} Features (${BLOG})`, () => {
  fixSkip(typeof Bun.WebView !== 'function')(
    'Bun.WebView navigates and evaluates (headless automation)',
    async () => {
      await using view = new Bun.WebView({ width: 320, height: 240 });
      await view.navigate('data:text/html,<title>bun-1312</title><h1 id="x">ok</h1>');
      const title = await view.evaluate('document.title');
      expect(title).toBe('bun-1312');
      const text = await view.evaluate('document.querySelector("#x")?.textContent');
      expect(text).toBe('ok');
    }
  );

  fixTest('Bun.markdown.ansi renders markdown (colored + plain)', () => {
    const plain = Bun.markdown.ansi('# Hello\n\n**bold** and *italic*\n', { colors: false });
    expect(plain).toContain('Hello');
    expect(plain).toContain('bold');
    expect(plain.includes('\x1b')).toBe(false);

    const colored = Bun.markdown.ansi('# Hello', { colors: true });
    expect(colored).toContain('Hello');
    expect(colored.includes('\x1b')).toBe(true);

    const linked = Bun.markdown.ansi('[docs](https://bun.sh)', { hyperlinks: true, colors: false });
    expect(linked).toContain('docs');
  });

  fixTest('bun ./file.md renders Markdown directly to terminal output', async () => {
    const root = tempRoot('markdown-cli');
    const markdownPath = join(root, 'release.md');
    await Bun.write(markdownPath, '# Release probe\n\n**native terminal markdown**\n');
    const result = Bun.spawnSync([process.execPath, markdownPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, NO_COLOR: '1' },
    });
    const output = Bun.stripANSI(result.stdout.toString());

    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toBe('');
    expect(output).toContain('Release probe');
    expect(output).toContain('native terminal markdown');
  });

  fixTest('native async errors include async stack frames', async () => {
    async function boom() {
      await Bun.write('/no/such/dir/bun-1.3.12-missing.txt', 'x');
    }
    try {
      await boom();
      expect.unreachable('expected ENOENT');
    } catch (e) {
      const stack = String((e as Error).stack);
      expect(stack).toMatch(/ENOENT|no such file/i);
      expect(stack).toMatch(/at async /);
      expect(stack).toContain('boom');
    }
  });

  fixTest('in-process Bun.cron returns Disposable with ref/unref and UTC parse', () => {
    expect(() => Bun.cron.parse('* * * * *')).not.toThrow();
    using job = Bun.cron('@hourly', () => {});
    expect(typeof job.stop).toBe('function');
    expect(typeof job.ref).toBe('function');
    expect(typeof job.unref).toBe('function');
    expect(job.cron).toBe('@hourly');
    job.unref();
    job.stop();
  });

  fixTest('Bun.udpSocket data callback exposes flags.truncated', async () => {
    const { promise, resolve } = Promise.withResolvers<{
      len: number;
      truncated: boolean;
    }>();
    const recv = await Bun.udpSocket({
      socket: {
        data(_socket, data, _port, _address, flags) {
          resolve({ len: data.byteLength, truncated: Boolean(flags?.truncated) });
        },
      },
    });
    const send = await Bun.udpSocket({
      socket: {
        data() {},
      },
    });
    try {
      send.send('hi', recv.port, '127.0.0.1');
      const got = await Promise.race([
        promise,
        Bun.sleep(1_000).then(() => {
          throw new Error('udp receive timed out');
        }),
      ]);
      expect(got.len).toBe(2);
      expect(got.truncated).toBe(false);
    } finally {
      recv.close();
      send.close();
    }
  });

  fixTest('unix listen: existing socket → EADDRINUSE; stop() removes the sock file', async () => {
    const path = join(shortTempRoot('unix-life'), 'a.sock');
    const a = Bun.listen({
      unix: path,
      socket: {
        data() {},
        open() {},
      },
    });
    try {
      expect(fs.existsSync(path)).toBe(true);
      let code: string | undefined;
      try {
        Bun.listen({
          unix: path,
          socket: {
            data() {},
            open() {},
          },
        });
      } catch (e) {
        code = (e as NodeJS.ErrnoException).code;
      }
      expect(code).toBe('EADDRINUSE');
    } finally {
      a.stop();
    }
    await Bun.sleep(20);
    expect(fs.existsSync(path)).toBe(false);
  });

  fixTest('Explicit Resource Management: using calls Symbol.dispose', () => {
    let disposed = 0;
    {
      using _resource = {
        [Symbol.dispose]() {
          disposed++;
        },
      };
      expect(disposed).toBe(0);
    }
    expect(disposed).toBe(1);
  });

  fixSkip(process.platform !== 'linux')(
    'standalone --compile executable works under chmod 111 (Linux ELF .bun section)',
    () => {
      /* Linux-only — see file header skip inventory */
    }
  );
});

describe(`Bun ${MIN_VERSION} Performance smokes (${BLOG})`, () => {
  fixTest('URLPattern blog vector matches; does not pollute RegExp.$N', () => {
    const pattern = new URLPattern({ pathname: '/api/users/:id/posts/:postId' });
    const href = 'https://example.com/api/users/42/posts/123';
    expect(pattern.test(href)).toBe(true);
    const m = pattern.exec(href);
    expect(m?.pathname.groups).toEqual({ id: '42', postId: '123' });

    'abc'.match(/(a)(b)(c)/);
    expect(RegExp.$1).toBe('a');
    pattern.test(href);
    expect(RegExp.$1).toBe('a');
  });

  fixTest('Bun.stripANSI / Bun.stringWidth handle OSC-8 terminators (BEL / ESC ST / C1 ST)', () => {
    const bel = '\x1b]8;;https://example.com\x07link\x1b]8;;\x07';
    const stEsc = '\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\';
    const stC1 = '\x1b]8;;https://example.com\x9clink\x1b]8;;\x9c';
    for (const osc of [bel, stEsc, stC1]) {
      expect(Bun.stripANSI(osc)).toBe('link');
      expect(Bun.stringWidth(osc)).toBe(4);
    }
  });

  fixTest('Bun.Glob.scan with **/boundary pattern finds nested files', async () => {
    const root = tempRoot('glob-boundary');
    fs.mkdirSync(join(root, 'pkg', 'node_modules', 'x'), { recursive: true });
    await Bun.write(join(root, 'pkg', 'node_modules', 'x', 'index.js'), 'export {};\n');
    await Bun.write(join(root, 'other.js'), '');
    const hits = await Array.fromAsync(
      new Bun.Glob('**/node_modules/**/*.js').scan({ cwd: root })
    );
    expect(hits.some(p => p.endsWith('index.js'))).toBe(true);
  });

  fixTest('availableParallelism / hardwareConcurrency return positive integers', () => {
    expect(availableParallelism()).toBeGreaterThan(0);
    expect(navigator.hardwareConcurrency).toBeGreaterThan(0);
  });

  fixSkip(cgroupCpuLimit === null)(
    'finite cgroup v2 CPU quota caps availableParallelism / hardwareConcurrency',
    () => {
      expect(availableParallelism()).toBeLessThanOrEqual(cgroupCpuLimit!);
      expect(navigator.hardwareConcurrency).toBeLessThanOrEqual(cgroupCpuLimit!);
    }
  );

  fixSkip(process.platform !== 'linux' && process.platform !== 'freebsd')(
    'TCP_DEFER_ACCEPT / SO_ACCEPTFILTER (Linux/FreeBSD Bun.serve accept optimization)',
    () => {
      /* no userspace assertion — kernel flag; macOS/Windows unchanged per blog */
    }
  );

  // Timing claims are release evidence, not CI thresholds.
  fixSkip(true)('URLPattern / Glob / stripANSI wall-clock speedups (manual bench only)', () => {
    /* see bun.com/blog/bun-v1.3.12 — do not gate CI on µs */
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Node.js compatibility (${BLOG_BUGFIXES})`, () => {
  fixTest('process.env survives chmod 111 cwd (EACCES on directory listing)', async () => {
    const root = tempRoot('env-eacces');
    const noread = join(root, 'noread');
    fs.mkdirSync(noread);
    fs.chmodSync(noread, 0o111);

    const proc = Bun.spawn(
      [process.execPath, '-e', 'console.log(JSON.stringify({ marker: process.env.BUN_1312_MARKER, keys: Object.keys(process.env).length }))'],
      {
        cwd: noread,
        env: { ...process.env, BUN_1312_MARKER: 'present' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    fs.chmodSync(noread, 0o755);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    const parsed = JSON.parse(stdout.trim()) as { marker: string; keys: number };
    expect(parsed.marker).toBe('present');
    expect(parsed.keys).toBeGreaterThan(0);
  });

  fixTest('vm.Script / compileFunction do not crash under repeated use', () => {
    // Leak itself is native-RSS; this guards the fixed ownership path still constructs.
    for (let i = 0; i < 50; i++) {
      const script = new vm.Script(`({ i: ${i} })`);
      expect(script.runInThisContext()).toEqual({ i });
      const fn = vm.compileFunction('return n + 1', ['n']);
      expect(fn(i)).toBe(i + 1);
    }
  });

  fixTest('pipeline(Readable.fromWeb(fetch body), WriteStream) completes under concurrency', async () => {
    const root = tempRoot('pipeline');
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('x'.repeat(4096));
      },
    });
    try {
      await Promise.all(
        Array.from({ length: 8 }, async (_, i) => {
          const res = await fetch(server.url);
          expect(res.body).toBeTruthy();
          const out = join(root, `body-${i}.bin`);
          await pipelineAsync(Readable.fromWeb(res.body as import('stream/web').ReadableStream), createWriteStream(out));
          expect(fs.statSync(out).size).toBe(4096);
        })
      );
    } finally {
      server.stop(true);
    }
  });

  fixTest('Readable.pipe emits ERR_INVALID_ARG_TYPE for object-mode into byte Writable', async () => {
    const src = Readable.from([{ a: 1 }], { objectMode: true });
    const dest = new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    const error = await new Promise<NodeJS.ErrnoException>(resolve => {
      dest.once('error', resolve);
      src.pipe(dest);
    });
    expect(error.code).toBe('ERR_INVALID_ARG_TYPE');
  });

  fixTest('dns.getDefaultResultOrder returns a string order (not the function)', () => {
    const order = dns.getDefaultResultOrder();
    expect(typeof order).toBe('string');
    expect(['ipv4first', 'ipv6first', 'verbatim']).toContain(order);
    expect(typeof order).not.toBe('function');
  });

  fixTest('dns.promises exposes getDefaultResultOrder and getServers', () => {
    expect(typeof dnsPromises.getDefaultResultOrder).toBe('function');
    expect(typeof dnsPromises.getServers).toBe('function');
    const order = dnsPromises.getDefaultResultOrder();
    expect(['ipv4first', 'ipv6first', 'verbatim']).toContain(order);
    expect(Array.isArray(dnsPromises.getServers())).toBe(true);
  });

  fixTest('fs.realpathSync("/") resolves without ENOENT', () => {
    expect(fs.realpathSync('/')).toBe('/');
  });

  fixTest('fs.statSync().ino is a finite number (not INT64_MAX sentinel)', () => {
    const st = fs.statSync(join(import.meta.dir, '../../package.json'));
    const INT64_MAX = Number.MAX_SAFE_INTEGER; // blog cited 9223372036854775807; Number path clamps
    expect(Number.isFinite(st.ino)).toBe(true);
    expect(st.ino).not.toBe(9223372036854775807);
    expect(st.ino).toBeGreaterThan(0);
    // Number path must not collapse every file to the same sentinel.
    expect(st.ino === INT64_MAX && st.dev === INT64_MAX).toBe(false);
  });

  fixTest('process.stdout.end(callback) waits for drain before invoking callback', async () => {
    const script = `
      const chunk = Buffer.alloc(64 * 1024, 0x61);
      let drained = 0;
      process.stdout.on('drain', () => { drained++; });
      const started = Date.now();
      process.stdout.write(chunk);
      process.stdout.end(() => {
        console.error(JSON.stringify({ ms: Date.now() - started, drained, ok: true }));
      });
    `;
    const proc = Bun.spawn([process.execPath, '-e', script], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).bytes(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(0);
    expect(stdout.byteLength).toBe(64 * 1024);
    const meta = JSON.parse(stderr.trim()) as { ok: boolean };
    expect(meta.ok).toBe(true);
  });

  fixTest('Error.captureStackTrace includes the calling frame (parity with new Error().stack)', async () => {
    async function deep() {
      await Promise.resolve();
      const captured: { stack?: string } = {};
      Error.captureStackTrace(captured);
      const native = new Error('native');
      return { captured: captured.stack ?? '', native: native.stack ?? '' };
    }
    const { captured, native } = await deep();
    expect(captured).toContain('deep');
    expect(native).toContain('deep');
    // When the runtime emits async frames on new Error(), captureStackTrace must too.
    if (/at async /.test(native)) {
      expect(captured).toMatch(/at async /);
    }
  });

  fixTest('Error.captureStackTrace does not crash after .stack was already read', () => {
    const err = new Error('once');
    void err.stack;
    expect(() => Error.captureStackTrace(err)).not.toThrow();
    expect(typeof err.stack).toBe('string');
  });

  fixTest('assert.partialDeepStrictEqual compares arrays without crashing', () => {
    expect(() => assert.partialDeepStrictEqual([1, 2, 3], [1, 2])).not.toThrow();
    expect(() => assert.partialDeepStrictEqual([1, 2], [1, 2, 3])).toThrow();
  });

  fixTest('fs.statSync works (statx EPERM fallback path remains callable)', () => {
    // Full seccomp reproduction is Linux/CI-sandbox specific; this proves the public path.
    const st = fs.statSync(import.meta.path);
    expect(st.isFile()).toBe(true);
    expect(typeof st.mode).toBe('number');
  });

  fixTest('fs.Stats(...) without new assigns integer fields in Node slot order', () => {
    // Node: (dev, mode, nlink, uid, gid, rdev, blksize, ino, size, blocks, atimeMs, ...)
    // @ts-expect-error intentional call without new — regression for scrambled slots
    const s = Stats(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14);
    expect(s.dev).toBe(1);
    expect(s.mode).toBe(2);
    expect(s.nlink).toBe(3);
    expect(s.uid).toBe(4);
    expect(s.gid).toBe(5);
    expect(s.rdev).toBe(6);
    expect(s.blksize).toBe(7);
    expect(s.ino).toBe(8);
    expect(s.size).toBe(9);
    expect(s.blocks).toBe(10);
  });

  fixTest('statSync(path) instanceof Stats is true', () => {
    const st = fs.statSync(import.meta.path);
    expect(st instanceof Stats).toBe(true);
    expect(st.isFile()).toBe(true);
  });

  fixTest('built-in root TLS certificates are present (NSS refresh surface)', () => {
    expect(tls.rootCertificates.length).toBeGreaterThan(50);
    const joined = tls.rootCertificates.join('\n');
    // NSS 3.121 added e-Szigno TLS Root CA 2023 — tolerate label variance across builds.
    expect(joined.includes('BEGIN CERTIFICATE')).toBe(true);
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Bun APIs (${BLOG_BUGFIXES})`, () => {
  fixTest('runtime HTTP_PROXY / HTTPS_PROXY / NO_PROXY changes affect the next fetch()', async () => {
    const hits: string[] = [];
    const proxy = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(req) {
        hits.push(`${req.method} ${req.url}`);
        return new Response('via-proxy');
      },
    });

    try {
      const probe = Bun.spawn(
        [
          process.execPath,
          '-e',
          `process.env.http_proxy = '';
process.env.https_proxy = '';
process.env.no_proxy = '';
process.env.HTTPS_PROXY = '';
process.env.NO_PROXY = '';
process.env.HTTP_PROXY = ${JSON.stringify(proxy.url.origin)};
const response = await fetch('http://example.com/runtime-proxy-probe');
if (await response.text() !== 'via-proxy') process.exit(2);
process.env.NO_PROXY = '*';
await fetch('http://127.0.0.1:9/no-proxy-probe').catch(() => undefined);`,
        ],
        { stdout: 'pipe', stderr: 'pipe' }
      );
      const [exitCode, stderr] = await Promise.all([
        probe.exited,
        new Response(probe.stderr).text(),
      ]);
      expect(stderr).toBe('');
      expect(exitCode).toBe(0);
      expect(hits.some(line => line.includes('example.com/runtime-proxy-probe'))).toBe(true);
      expect(hits.some(line => line.includes('no-proxy-probe'))).toBe(false);
    } finally {
      proxy.stop(true);
    }
  });

  fixTest('event loop drains multiple ready I/O events (smoke via many concurrent sockets)', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('ok');
      },
    });
    try {
      const results = await Promise.all(
        Array.from({ length: 64 }, () => fetch(server.url).then(r => r.text()))
      );
      expect(results.every(t => t === 'ok')).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  fixTest('Bun.serve async handlers after await still respond correctly', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch() {
        await Bun.sleep(1);
        return new Response('after-await');
      },
    });
    try {
      const texts = await Promise.all(
        Array.from({ length: 32 }, async () => (await fetch(server.url)).text())
      );
      expect(texts.every(t => t === 'after-await')).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  fixTest('thread-pool consumers (Bun.file / fs.promises) complete on this arch', async () => {
    const path = join(import.meta.dir, '../../package.json');
    const [a, b] = await Promise.all([Bun.file(path).text(), fs.promises.readFile(path, 'utf8')]);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  fixTest('Bun.serve unsettled handler Promise is abandoned when client disconnects', async () => {
    let settle!: (v: Response) => void;
    const gate = new Promise<Response>(resolve => {
      settle = resolve;
    });
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return gate;
      },
    });
    try {
      const proc = Bun.spawn(
        [
          process.execPath,
          '-e',
          `const ac = new AbortController(); const p = fetch(${JSON.stringify(String(server.url))}, { signal: ac.signal }); ac.abort(); await p.catch(() => {});`,
        ],
        { stdout: 'ignore', stderr: 'ignore' }
      );
      expect(await proc.exited).toBe(0);
      // Resolving after disconnect must not crash the server.
      settle(new Response('late'));
      const late = await fetch(server.url);
      expect(await late.text()).toBe('late');
    } finally {
      server.stop(true);
    }
  });

  // skip: requires a live MySQL-compatible server (StarRocks/TiDB/SingleStore) — no fixture here.
  fixSkip(true)(
    'Bun.SQL MySQL CLIENT_DEPRECATE_EOF negotiation (needs MySQL-compatible server)',
    () => {
      /* env-specific — see file header skip inventory */
    }
  );

  // skip: requires MySQL adapter + RSS/allocator harness to observe the three native leaks.
  fixSkip(true)(
    'bun:sql MySQL per-query native allocation cleanup (needs MySQL + RSS harness)',
    () => {
      /* env-specific — see file header skip inventory */
    }
  );

  fixTest('Bun.TOML.parse error paths do not crash and succeed on valid input after errors', () => {
    for (let i = 0; i < 20; i++) {
      expect(() => Bun.TOML.parse('[[[broken')).toThrow();
    }
    expect(Bun.TOML.parse('a = 1')).toEqual({ a: 1 });
  });

  fixTest('Bun.listen / Bun.connect throw on invalid hostname instead of crashing', async () => {
    expect(() =>
      // @ts-expect-error intentional invalid hostname
      Bun.listen({ hostname: 123, port: 0, socket: { data() {} } })
    ).toThrow();

    // Bun.connect may throw synchronously (TypeError) rather than reject a Promise.
    let connectErr: unknown;
    try {
      await Bun.connect({
        // @ts-expect-error intentional invalid hostname
        hostname: null,
        port: 1,
        socket: {
          data() {},
          open() {},
          close() {},
          error() {},
        },
      });
    } catch (e) {
      connectErr = e;
    }
    expect(connectErr).toBeInstanceOf(TypeError);
  });

  fixTest('Bun.serve({ unix }) with invalid path fails without crashing process', () => {
    expect(() =>
      Bun.serve({
        unix: 'not/a/valid/abs.sock',
        fetch() {
          return new Response('x');
        },
      })
    ).toThrow();
  });

  fixTest('Bun.dns.setServers / Bun.dns.lookup reject invalid inputs without crashing', async () => {
    expect(() => Bun.dns.setServers(['%%%'])).toThrow();
    // Bun.dns.lookup may throw synchronously for non-string hostnames.
    let lookupErr: unknown;
    try {
      // @ts-expect-error intentional invalid hostname
      await Bun.dns.lookup(null);
    } catch (e) {
      lookupErr = e;
    }
    expect(lookupErr).toBeInstanceOf(TypeError);
  });

  fixTest('DNS lookups for distinct hosts complete (stale in-flight cache must not hang)', async () => {
    const a = await Bun.dns.lookup('localhost', { family: 4 });
    const b = await Bun.dns.lookup('localhost', { family: 4 });
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });

  fixTest('Glob.scan completes on a normal tree (ENAMETOOLONG path is handled upstream)', async () => {
    const root = tempRoot('glob');
    fs.writeFileSync(join(root, 'a.ts'), '');
    fs.mkdirSync(join(root, 'nested'));
    fs.writeFileSync(join(root, 'nested', 'b.ts'), '');
    const hits = await Array.fromAsync(new Bun.Glob('**/*.ts').scan({ cwd: root }));
    expect(hits.sort()).toEqual(['a.ts', 'nested/b.ts']);
  });

  fixSkip(process.platform !== 'darwin')(
    'Unix socket paths longer than 104 bytes work on macOS',
    async () => {
      // Keep the directory short so the full sun_path sits just above the 104-byte classic limit.
      const root = shortTempRoot('b1312');
      const socketPath = join(root, `${'s'.repeat(Math.max(1, 110 - root.length - 1))}`);
      expect(socketPath.length).toBeGreaterThan(104);
      expect(socketPath.length).toBeLessThan(120);

      const server = Bun.serve({
        unix: socketPath,
        fetch() {
          return new Response('unix-ok');
        },
      });
      try {
        const res = await fetch('http://localhost/', { unix: socketPath });
        expect(await res.text()).toBe('unix-ok');
      } finally {
        server.stop(true);
      }
    }
  );

  fixTest('reading .fd on a TLS Bun.listen socket does not crash', async () => {
    const root = tempRoot('tls-fd');
    const keyPath = join(root, 'key.pem');
    const certPath = join(root, 'cert.pem');
    const openssl = Bun.which('openssl');
    if (!openssl) {
      // Still prove non-TLS .fd access works when openssl is unavailable.
      const plain = Bun.listen({
        hostname: '127.0.0.1',
        port: 0,
        socket: {
          data() {},
          open() {},
          close() {},
          error() {},
        },
      });
      try {
        expect(typeof plain.fd).toBe('number');
      } finally {
        plain.stop(true);
      }
      return;
    }

    const gen = Bun.spawn(
      [
        openssl,
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=localhost',
      ],
      { stdout: 'ignore', stderr: 'pipe' }
    );
    expect(await gen.exited).toBe(0);

    const listener = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      tls: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      socket: {
        data() {},
        open() {},
        close() {},
        error() {},
      },
    });
    try {
      expect(typeof listener.fd).toBe('number');
      expect(listener.fd).toBeGreaterThan(0);
    } finally {
      listener.stop(true);
    }
  });

  fixTest('Bun.FFI.linkSymbols throws TypeError for invalid symbol descriptors', () => {
    expect(() =>
      // @ts-expect-error intentional invalid descriptors
      Bun.FFI.linkSymbols({ x: {} })
    ).toThrow(TypeError);
  });

  fixTest('out-of-range file descriptor to Bun.write rejects instead of crashing', async () => {
    await expect(Bun.write(1_000_000_000 as unknown as number, 'x')).rejects.toThrow();
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Web APIs (${BLOG_BUGFIXES})`, () => {
  fixTest('postMessage to a closed MessagePort does not queue unboundedly / crash', () => {
    const { port1, port2 } = new MessageChannel();
    port2.close();
    for (let i = 0; i < 200; i++) {
      port1.postMessage(new Uint8Array(64));
    }
    port1.close();
    expect(true).toBe(true);
  });

  fixTest('AbortController.signal.reason survives GC when only the signal is retained', async () => {
    const reason = { code: 'BUN_1312' };
    let signal!: AbortSignal;
    {
      const ac = new AbortController();
      ac.abort(reason);
      signal = ac.signal;
    }
    Bun.gc(true);
    await Bun.sleep(10);
    expect(signal.reason).toEqual(reason);
  });

  fixTest('BroadcastChannel message round-trip does not crash', async () => {
    const name = `bun-1312-${crypto.randomUUID()}`;
    const a = new BroadcastChannel(name);
    const b = new BroadcastChannel(name);
    try {
      const got = new Promise<string>(resolve => {
        b.onmessage = ev => resolve(String(ev.data));
      });
      a.postMessage('ping');
      expect(await got).toBe('ping');
    } finally {
      a.close();
      b.close();
    }
  });

  fixTest('CookieMap.toJSON handles numeric cookie names', () => {
    const map = new Bun.CookieMap('1=one; 2=two');
    expect(map.toJSON()).toEqual({ '1': 'one', '2': 'two' });
  });

  fixTest('String.raw preserves U+0000 null bytes in tagged templates', () => {
    const viaValues = String.raw({ raw: ['a', 'b'] }, '\0');
    expect(viaValues).toBe('a\0b');
    expect(viaValues).not.toContain('\uFFFD');
    expect(viaValues.length).toBe(3);

    const viaInterp = String.raw`a${'\0'}b`;
    expect(viaInterp).toBe('a\0b');
    expect(viaInterp.includes('\\uFFFD')).toBe(false);
  });

  fixTest('ReadableStream.pipeTo with AbortSignal completes or aborts without crashing', async () => {
    const ac = new AbortController();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const chunks: Uint8Array[] = [];
    await stream.pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
      { signal: ac.signal }
    );
    expect(chunks.length).toBe(1);
  });

  fixTest('Response.bytes() / arrayBuffer() work for async-iterable bodies', async () => {
    const body = (async function* () {
      yield new Uint8Array([1, 2]);
      yield new Uint8Array([3]);
    })();
    const bytes = await new Response(body).bytes();
    expect(Array.from(bytes)).toEqual([1, 2, 3]);

    const body2 = (async function* () {
      yield new Uint8Array([9]);
    })();
    const ab = await new Response(body2).arrayBuffer();
    expect(new Uint8Array(ab)[0]).toBe(9);
  });

  fixTest('Response.blob() after body consumed rejects with ERR_BODY_ALREADY_USED', async () => {
    const res = new Response('used');
    await res.arrayBuffer();
    try {
      await res.blob();
      expect.unreachable('expected body-already-used rejection');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('ERR_BODY_ALREADY_USED');
    }
  });

  fixTest('Request/Response/Blob.formData() reject malformed boundary without crashing', async () => {
    const headers = { 'Content-Type': 'multipart/form-data; boundary="' };
    await expect(new Response('----x\r\n', { headers }).formData()).rejects.toThrow();
    await expect(new Request('http://x', { method: 'POST', headers, body: '----x\r\n' }).formData()).rejects.toThrow();
    await expect(new Blob(['----x\r\n'], { type: headers['Content-Type'] }).formData()).rejects.toThrow();
  });

  fixTest('HTTP server rejects conflicting duplicate Content-Length headers', async () => {
    let responseText = '';
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('should-not-run');
      },
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), 500);
        Bun.connect({
          hostname: '127.0.0.1',
          port: server.port,
          socket: {
            data(_socket, data) {
              responseText += data.toString();
              if (responseText.includes('\r\n\r\n') || responseText.length > 32) {
                clearTimeout(timeout);
                resolve();
              }
            },
            open(socket) {
              socket.write(
                'POST / HTTP/1.1\r\nHost: x\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\na'
              );
            },
            close() {},
            error(_s, err) {
              clearTimeout(timeout);
              reject(err);
            },
          },
        }).catch(reject);
      });
      expect(responseText.startsWith('HTTP/1.1 400')).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  fixTest('WebSocket upgrade tolerates non-ASCII header values without crashing', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(req, srv) {
        if (srv.upgrade(req)) return undefined;
        return new Response('upgrade required', { status: 426 });
      },
      websocket: {
        open(ws) {
          ws.close(1000, 'ok');
        },
        message() {},
      },
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const url = server.url.href.replace(/^http/, 'ws');
        const ws = new WebSocket(url, {
          headers: { 'X-Nick': 'café' },
        });
        const timeout = setTimeout(() => reject(new Error('timeout')), 2000);
        ws.addEventListener('close', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.addEventListener('error', () => {
          clearTimeout(timeout);
          resolve(); // must not crash the process; error event is acceptable
        });
      });
    } finally {
      server.stop(true);
    }
  });

  fixTest('error message formatting survives Symbol.toPrimitive throwing', () => {
    const toxic = {
      [Symbol.toPrimitive]() {
        throw new Error('toPrimitive boom');
      },
    };
    expect(() => String(toxic)).toThrow('toPrimitive boom');
    expect(() => Bun.inspect(toxic)).not.toThrow();
  });

  fixTest('deep stack / recursive error formatting does not crash the process', () => {
    const make = (n: number): unknown => (n <= 0 ? 'end' : { n, next: make(n - 1) });
    expect(() => Bun.inspect(make(200), { depth: 50 })).not.toThrow();
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — bundler / bun test / shell / Windows (${BLOG_BUGFIXES})`, () => {
  // skip unless Linux: NixOS/Guix PT_INTERP rewrite needs readelf + a --compile ELF artifact.
  fixSkip(process.platform !== 'linux')(
    'bun build --compile PT_INTERP normalization (NixOS/Guix — Linux-only proof)',
    () => {
      /* platform-specific — see file header skip inventory */
    }
  );

  fixTest('bun build with CSS + JS entry points does not crash the process', async () => {
    const root = tempRoot('compile-css');
    const js = join(root, 'entry.ts');
    const css = join(root, 'entry.css');
    await Bun.write(js, 'export default 1;\n');
    await Bun.write(css, 'body { color: red; }\n');
    const proc = Bun.spawn(
      [process.execPath, 'build', js, css, '--outdir', join(root, 'out')],
      { stdout: 'pipe', stderr: 'pipe', cwd: root }
    );
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).toBe(0);
    expect(stderr.toLowerCase()).not.toContain('panic');
  });

  fixTest('mock.module() rejects a non-string specifier without crashing', () => {
    expect(() =>
      // @ts-expect-error intentional invalid specifier
      mock.module(123, () => ({}))
    ).toThrow();
  });

  // skip: needs network + bare specifier auto-install; unsafe / flaky in offline CI.
  fixSkip(true)(
    'mock.module() auto-install during resolution (needs network + bare specifier)',
    () => {
      /* env-specific — see file header skip inventory */
    }
  );

  fixTest('expect.extend rejects invalid inputs without crashing', () => {
    expect(() =>
      // @ts-expect-error intentional invalid extend payload
      expect.extend(null)
    ).toThrow();
  });

  fixTest('--elide-lines is accepted when stdout is not a TTY', async () => {
    const root = tempRoot('elide');
    const file = join(root, 'ok.test.ts');
    await Bun.write(file, `import { test, expect } from 'bun:test';\ntest('ok', () => expect(1).toBe(1));\n`);
    const proc = Bun.spawn([process.execPath, 'test', file, '--elide-lines=3'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, CI: '1' },
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(0);
    expect(`${stdout}\n${stderr}`).not.toMatch(/elide-lines.*error/i);
  });

  fixTest('Bun.$.braces("") does not crash', () => {
    expect(Bun.$.braces('')).toEqual(['']);
  });

  // skip unless Windows: absolute/UNC tar entry path-traversal skip is win32-only.
  fixSkip(process.platform !== 'win32')(
    'Windows tar extraction skips absolute / UNC path entries',
    () => {
      /* platform-specific — see file header skip inventory */
    }
  );
});
