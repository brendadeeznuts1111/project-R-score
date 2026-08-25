// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port: 0
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — native Range responses
import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DEFAULT_STATIC_MAX_BYTES } from '../lib/http/static-response.ts';

const ROOT = resolve(import.meta.dir, '..');
const SERVE_PUBLIC = join(ROOT, 'scripts/serve-public.ts');
const START_TIMEOUT_MS = 15_000;
const STOP_TIMEOUT_MS = 5_000;

function deadline<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function localMp4Fixture(): Uint8Array {
  // respondAuto deliberately buffers files at or below this boundary. Keep the
  // fixture above it so the production route exercises Response(Bun.file),
  // which is the path that Bun.serve translates into a byte-range response.
  const bytes = new Uint8Array(DEFAULT_STATIC_MAX_BYTES + 4_096);
  for (let index = 0; index < bytes.length; index++) bytes[index] = (index * 31 + 17) & 0xff;

  const view = new DataView(bytes.buffer);
  view.setUint32(0, 24);
  bytes.set(new TextEncoder().encode('ftypisom'), 4);
  view.setUint32(12, 0);
  bytes.set(new TextEncoder().encode('isommp42'), 16);
  return bytes;
}

test(
  'serve-public returns an exact 206 byte range for local Bun 1.4 MP4 media',
  async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), 'bun-1.4-local-media-range-'));
    const mediaDir = join(fixtureRoot, 'public/portal/bun-1.4/media');
    const fixturePath = join(mediaDir, 'range-fixture.mp4');
    const fixtureUrl = '/portal/bun-1.4/media/range-fixture.mp4';
    const fixtureBytes = localMp4Fixture();

    let child: ReturnType<typeof Bun.spawn> | undefined;
    let stdoutDrain: Promise<void> | undefined;
    let stderrDrain: Promise<string> | undefined;
    let startupOutput = '';
    let stderrOutput = '';

    try {
      await mkdir(join(fixtureRoot, 'config'), { recursive: true });
      await mkdir(mediaDir, { recursive: true });
      await Bun.write(
        join(fixtureRoot, 'config/serve-public.toml'),
        '[server]\nport = 0\nhost = "127.0.0.1"\n'
      );
      await Bun.write(fixturePath, fixtureBytes);

      const blockedEnv = new Set([
        'BIND_HOST',
        'BUN_PORT',
        'FACTORY_WAGER_TOKEN',
        'HOST',
        'NODE_PORT',
        'PORT',
        'REGISTRY_SECRET',
      ]);
      const childEnv = Object.fromEntries(
        Object.entries(Bun.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined && !blockedEnv.has(entry[0])
        )
      );
      Object.assign(childEnv, {
        BASELINE_SCRAPE_CRON: '0',
        BUN_DEFAULTS_CRON: '0',
        NODE_ENV: 'test',
        OPS_DB_PATH: join(fixtureRoot, 'ops.sqlite'),
        OPS_SNAPSHOT_CRON: '0',
        REGISTRY_REQUIRE_AUTH: '0',
        SERVE_PUBLIC_DEV: '0',
        SERVE_PUBLIC_HMR: '0',
      });

      child = Bun.spawn([process.execPath, SERVE_PUBLIC], {
        cwd: fixtureRoot,
        env: childEnv,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      let resolveOrigin!: (origin: string) => void;
      let rejectOrigin!: (error: Error) => void;
      const originReady = new Promise<string>((resolvePromise, rejectPromise) => {
        resolveOrigin = resolvePromise;
        rejectOrigin = rejectPromise;
      });
      let originFound = false;
      stdoutDrain = (async () => {
        const reader = child!.stdout.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          startupOutput += decoder.decode(value, { stream: !done });
          if (!originFound) {
            const match = /Local portal:\s+(https?:\/\/[^\s/]+)\/portal\/ops\//.exec(
              startupOutput
            );
            if (match?.[1]) {
              originFound = true;
              resolveOrigin(match[1]);
            }
          }
          if (done) break;
        }
        if (!originFound) {
          rejectOrigin(
            new Error(`serve-public exited before reporting its origin:\n${startupOutput}`)
          );
        }
      })();
      stderrDrain = new Response(child.stderr).text();

      const origin = await deadline(
        originReady,
        START_TIMEOUT_MS,
        `serve-public did not become ready:\n${startupOutput}`
      );
      const rangeStart = 257;
      const rangeEnd = 768;
      const response = await fetch(`${origin}${fixtureUrl}`, {
        headers: { Range: `bytes=${rangeStart}-${rangeEnd}` },
      });
      const actual = new Uint8Array(await response.arrayBuffer());

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe(
        `bytes ${rangeStart}-${rangeEnd}/${fixtureBytes.byteLength}`
      );
      expect(response.headers.get('Content-Length')).toBe(String(rangeEnd - rangeStart + 1));
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
      expect(response.headers.get('X-Serve-Strategy')).toBe('file');
      expect(actual).toEqual(fixtureBytes.slice(rangeStart, rangeEnd + 1));
    } finally {
      if (child) {
        if (child.exitCode === null) child.kill('SIGTERM');
        try {
          await deadline(child.exited, STOP_TIMEOUT_MS, 'serve-public did not stop after SIGTERM');
        } catch {
          if (child.exitCode === null) child.kill('SIGKILL');
          await child.exited;
        }
        if (stderrDrain) stderrOutput = await stderrDrain;
        await stdoutDrain;
      }
      await rm(fixtureRoot, { recursive: true, force: true });
    }

    expect(stderrOutput).not.toContain('Failed to bind serve-public');
  },
  30_000
);
