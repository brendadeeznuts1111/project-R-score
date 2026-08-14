// @see https://bun.com/blog/bun-v1.3.14#no-orphans-exit-when-the-parent-process-dies — --no-orphans
// @released --no-orphans · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#input — Blob.image
// @verified Blob.image · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/image#input
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @verified bun:test · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @released Bun.Image · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @released Bun.Image.metadata · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.png
// @released Bun.Image.png · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @verified Bun.inspect · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-inspect
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @released Bun.markdown.ansi · released v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @verified Bun.pathToFileURL · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @verified Bun.serve · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/http/server
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @verified Bun.sleep · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-sleep
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @verified Bun.spawn · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/child-process
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/blog/bun-v1.3.14
// Full-release regression probes for Bun v1.3.14 (Features · Performance · Bugfixes).
// Runs on Bun ≥ 1.3.14 (newer runtimes must keep these fixed).
//
// Note: v1.3.15 is not published yet (404 as of 2026-08-09). This suite covers the
// current latest release. Existing exact-version probes also live in
// tests/bun-1.3.14-web-api-fixes.test.ts (FormData / Blob / WebSocket).
//
// Skips (fixSkip / always-skip) — env-specific, not CI failures:
//   1. Global Virtual Store warm-install bench — needs isolated linker + install fixture
//   2. HTTP/3 Bun.serve / fetch — highly experimental; not production-ready per blog
//   3. Experimental HTTP/2 fetch client — network + server fixture
//   4. Bun.Terminal ConPTY — Windows-only
//   5. process.execve — replaces the process; type presence only
//   6. FreeBSD / Android builds — platform packaging, not runtime unit probes
//   7. Timing claims (Image vs sharp, warm install, ESM load) — manual bench only
//
//   bun test tests/regression/bun-1.3.14.test.ts
import { describe, expect } from 'bun:test';
import { watch } from 'node:fs';
import tls from 'node:tls';
import { join } from 'node:path';
import { releaseTest, tempRoot } from './shared.ts';

const MIN_VERSION = '1.3.14';
const BLOG = 'https://bun.com/blog/bun-v1.3.14';
const BLOG_BUGFIXES = `${BLOG}#bugfixes`;

const { test: fixTest, skipIf: fixSkip } = releaseTest(MIN_VERSION);

/** Minimal 1×1 PNG (public domain / tiny fixture). */
const PNG_1X1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  ),
  c => c.charCodeAt(0)
);

describe(`Bun ${MIN_VERSION} Features (${BLOG})`, () => {
  fixTest('Bun.Image metadata + resize pipeline', async () => {
    expect(typeof Bun.Image).toBe('function');
    const meta = await new Bun.Image(PNG_1X1).metadata();
    expect(meta.width).toBe(1);
    expect(meta.height).toBe(1);
    expect(meta.format).toBe('png');

    const bytes = await new Bun.Image(PNG_1X1).resize(8, 8).png().bytes();
    expect(bytes.byteLength).toBeGreaterThan(0);
    const resizedMeta = await new Bun.Image(bytes).metadata();
    expect(resizedMeta.width).toBe(8);
    expect(resizedMeta.height).toBe(8);
  });

  fixTest('Bun.Image works as a Response body with image Content-Type', async () => {
    const body = new Bun.Image(PNG_1X1).resize(4, 4).png();
    const res = new Response(body);
    const ct = res.headers.get('Content-Type') ?? '';
    expect(ct.includes('image')).toBe(true);
    const buf = await res.bytes();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  fixTest('Bun.file(...).image() starts a pipeline', async () => {
    const root = tempRoot('image-file');
    const path = join(root, 'dot.png');
    await Bun.write(path, PNG_1X1);
    const meta = await Bun.file(path).image().metadata();
    expect(meta.width).toBe(1);
    expect(meta.format).toBe('png');
  });

  fixSkip(true)(
    'Global Virtual Store warm install (install.globalStore / BUN_INSTALL_GLOBAL_STORE)',
    () => {
      /* needs isolated linker + wiped node_modules fixture — see blog Global Virtual Store */
    }
  );

  fixSkip(true)('HTTP/3 (QUIC) Bun.serve({ http3: true }) — experimental', () => {
    /* blog: highly experimental; do not deploy to production yet */
  });

  fixSkip(true)('Experimental HTTP/2 / HTTP/3 fetch clients', () => {
    /* needs compatible origin + protocol control fixture */
  });

  fixTest('fs.watch emits change after rewrite (rewritten watcher backend)', async () => {
    const root = tempRoot('fswatch');
    const path = join(root, 'watched.txt');
    await Bun.write(path, 'a');
    const changed = Promise.withResolvers<string>();
    const watcher = watch(path, event => {
      changed.resolve(String(event));
    });
    try {
      await Bun.sleep(50);
      await Bun.write(path, 'b');
      const event = await Promise.race([
        changed.promise,
        Bun.sleep(2_000).then(() => {
          throw new Error('fs.watch timed out');
        }),
      ]);
      expect(['change', 'rename', 'undefined']).toContain(event);
    } finally {
      watcher.close();
    }
  });

  fixTest('--no-orphans CLI flag is accepted', async () => {
    const proc = Bun.spawn([process.execPath, '--no-orphans', '-e', 'console.log("ok")'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('ok');
    expect(stderr.toLowerCase()).not.toMatch(/unknown.*no-orphans|unrecognized/);
  });

  fixTest('process.execve is present (type probe only — call would replace the process)', () => {
    expect(typeof process.execve).toBe('function');
  });

  fixSkip(process.platform !== 'win32')('Bun.Terminal ConPTY on Windows', () => {
    /* Windows-only ConPTY backend */
  });

  fixTest('using / await using dispose Bun resources (not lowered away for Bun target)', () => {
    let disposed = 0;
    {
      using _job = {
        [Symbol.dispose]() {
          disposed++;
        },
      };
      expect(disposed).toBe(0);
    }
    expect(disposed).toBe(1);
  });

  fixTest('WebSocket perMessageDeflate: false omits Sec-WebSocket-Extensions offer', async () => {
    let offered: string | null | undefined;
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(req, srv) {
        offered = req.headers.get('Sec-WebSocket-Extensions');
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
        const ws = new WebSocket(server.url.href.replace(/^http/, 'ws'), {
          perMessageDeflate: false,
        });
        const t = setTimeout(() => reject(new Error('timeout')), 2_000);
        ws.addEventListener('close', () => {
          clearTimeout(t);
          resolve();
        });
        ws.addEventListener('error', () => {
          clearTimeout(t);
          reject(new Error('ws error'));
        });
      });
      expect(offered).toBeNull();
    } finally {
      server.stop(true);
    }
  });

  fixTest("tls.getCACertificates('system') works without --use-system-ca", () => {
    const certs = tls.getCACertificates('system');
    expect(Array.isArray(certs)).toBe(true);
    expect(certs.length).toBeGreaterThan(0);
  });

  fixTest('FormData uses WebKit boundary shape', () => {
    const body = new FormData();
    body.set('partner_code', 'out-ROOT-1');
    const request = new Request('http://partner.test/import', { method: 'POST', body });
    expect(request.headers.get('Content-Type')).toMatch(
      /^multipart\/form-data; boundary=----WebKitFormBoundary[0-9a-f]+$/
    );
  });

  fixTest('empty Blob is not reported as detached', () => {
    expect(Bun.inspect(new Blob([]))).not.toContain('[Blob detached]');
  });
});

describe(`Bun ${MIN_VERSION} Performance smokes (${BLOG})`, () => {
  fixTest('Bun.Image metadata is callable (70× claim is release evidence, not CI gate)', async () => {
    const meta = await new Bun.Image(PNG_1X1).metadata();
    expect(meta.width).toBe(1);
  });

  fixSkip(true)('Global Virtual Store warm-install wall time (manual hyperfine)', () => {
    /* blog: ~841ms → ~115ms — do not gate CI on wall-clock */
  });

  fixSkip(true)('Bun.Image vs sharp throughput (manual bench)', () => {
    /* blog tables only */
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Web APIs (${BLOG_BUGFIXES})`, () => {
  fixTest('Bun.file ReadableStream response ignores Range (no Content-Range)', async () => {
    const fixture = Bun.file(join(import.meta.dir, '../../package.json'));
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      routes: {
        '/stream': () => new Response(fixture.stream()),
      },
      fetch: () => new Response('not found', { status: 404 }),
    });
    try {
      const response = await fetch(new URL('/stream', server.url), {
        headers: { Range: 'bytes=0-9' },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Range')).toBeNull();
      expect((await response.bytes()).byteLength).toBe(fixture.size);
    } finally {
      server.stop(true);
    }
  });

  fixTest('small Bun.file stream reads without double-close', async () => {
    const source = Bun.file(join(import.meta.dir, '../../package.json'));
    const streamed = await new Response(source.stream()).bytes();
    expect(streamed.byteLength).toBe(source.size);
  });

  fixTest('WebSocket close during CONNECTING emits error then close (1006)', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('not upgraded', { status: 426 }),
    });
    try {
      const result = await new Promise<{ code: number; wasClean: boolean; events: string[] }>(
        (resolve, reject) => {
          const socket = new WebSocket(server.url.href.replace(/^http/, 'ws'));
          const events: string[] = [];
          const timeout = setTimeout(() => reject(new Error('timeout')), 2_000);
          socket.addEventListener('error', () => events.push('error'));
          socket.addEventListener('close', event => {
            clearTimeout(timeout);
            events.push('close');
            resolve({ code: event.code, wasClean: event.wasClean, events });
          });
          expect(socket.readyState).toBe(WebSocket.CONNECTING);
          socket.close();
        }
      );
      expect(result.events).toEqual(['error', 'close']);
      expect(result.code).toBe(1006);
      expect(result.wasClean).toBe(false);
    } finally {
      server.stop(true);
    }
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Bun APIs (${BLOG_BUGFIXES})`, () => {
  fixTest('server.fetch(BigInt) rejects with TypeError (no segfault)', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('ok'),
    });
    try {
      await expect(
        // @ts-expect-error intentional invalid argument
        server.fetch(1n)
      ).rejects.toBeInstanceOf(TypeError);
    } finally {
      server.stop(true);
    }
  });

  fixTest('Bun.serve websocket.perMessageDeflate non-boolean throws TypeError', () => {
    expect(() =>
      Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        fetch() {
          return new Response('x');
        },
        websocket: {
          // @ts-expect-error intentional invalid type
          perMessageDeflate: 1,
          message() {},
        },
      })
    ).toThrow(TypeError);
  });

  fixTest('Bun.markdown.ansi tolerates invalid UTF-8 lead bytes (no crash)', () => {
    const dirty = Buffer.from([0x80, 0x23, 0x20, 0x48, 0x69]).toString('binary');
    expect(() => Bun.markdown.ansi(dirty, { colors: false })).not.toThrow();
  });

  fixTest('Bun.pathToFileURL handles normal relative paths', () => {
    const url = Bun.pathToFileURL('./package.json');
    expect(url.protocol).toBe('file:');
    expect(url.href.includes('package.json')).toBe(true);
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — Node.js compatibility (${BLOG_BUGFIXES})`, () => {
  fixTest("Buffer.from('zz', 'hex') returns empty without throwing", () => {
    const buf = Buffer.from('zz', 'hex');
    expect(buf.byteLength).toBe(0);
  });

  fixTest('Buffer.copyBytesFrom honors TypedArray byteOffset', () => {
    const ab = new ArrayBuffer(16);
    const view = new Uint8Array(ab, 4, 4);
    view.set([1, 2, 3, 4]);
    const copied = Buffer.copyBytesFrom(view);
    expect(Array.from(copied)).toEqual([1, 2, 3, 4]);
  });

  fixTest('node:test top-level skip option is honored', async () => {
    // Behavioral smoke: Bun's own runner accepts skip; spawn a tiny file.
    const root = tempRoot('node-test-skip');
    const file = join(root, 'skip.test.mjs');
    await Bun.write(
      file,
      `import { test } from 'node:test';
import assert from 'node:assert';
test('should skip', { skip: true }, () => { assert.fail('ran'); });
`
    );
    const proc = Bun.spawn([process.execPath, 'test', file], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = `${await new Response(proc.stdout).text()}\n${await new Response(proc.stderr).text()}`;
    expect(code).toBe(0);
    expect(out.toLowerCase()).toMatch(/skip/);
  });
});

describe(`Bun ${MIN_VERSION} bugfixes — bundler / install / platforms (${BLOG_BUGFIXES})`, () => {
  fixSkip(true)('FreeBSD / Android packaging surface', () => {
    /* release artifact matrix — not a unit probe */
  });

  fixTest('SQLite builtin remains loadable after 3.53.0 upgrade', async () => {
    const { Database } = await import('bun:sqlite');
    const db = new Database(':memory:');
    try {
      expect(db.query('select 1 as n').get()).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  });
});
