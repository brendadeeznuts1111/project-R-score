// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { SCREENSHOT_ALLOWED_LONG } from '../lib/docs/ref-id-tool-flags.ts';
import { ROOT as REPO_ROOT } from '../lib/operator-research/paths.ts';
import type { ScreenshotObservation } from '../lib/operator-research/types.ts';
import {
  assertHttpUrl,
  assertRepoPath,
  hasPngMagic,
  runScreenshotCli,
} from '../tools/screenshot-cli.ts';

/** 10×10 PNG fixture (same as image-metadata tests). */
const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64'
);

// captureExitCode is not exported — re-implement the gate table here via CLI mocks.
// Import helper by re-exporting through a thin test of runScreenshotCli capture deps.

describe('screenshot CLI helpers', () => {
  test('allowlist includes dual-mode, placeholder opt-in, and force', () => {
    expect([...SCREENSHOT_ALLOWED_LONG]).toEqual(
      expect.arrayContaining([
        'json',
        'subject',
        'out-dir',
        'timeout-ms',
        'allow-placeholder',
        'force',
        'help',
      ])
    );
    expect([...SCREENSHOT_ALLOWED_LONG]).not.toContain('no-placeholder');
  });

  test('assertHttpUrl accepts only http(s)', () => {
    expect(assertHttpUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(() => assertHttpUrl('file:///tmp/x')).toThrow(/http\(s\)/);
    expect(() => assertHttpUrl('not-a-url')).toThrow(/absolute http/);
  });

  test('assertRepoPath rejects escapes unless --force', () => {
    const inside = assertRepoPath('data/operator-research/screenshots', {
      label: '--out-dir',
    });
    expect(inside.startsWith(REPO_ROOT)).toBe(true);
    expect(() =>
      assertRepoPath('/tmp/outside-screenshot', { label: 'image path' })
    ).toThrow(/repository root/);
    const forced = assertRepoPath('/tmp/outside-screenshot', {
      force: true,
      label: 'image path',
    });
    expect(forced).toBe('/tmp/outside-screenshot');
  });

  test('hasPngMagic detects PNG signature', () => {
    expect(hasPngMagic(new Uint8Array(PNG_10))).toBe(true);
    expect(hasPngMagic(new Uint8Array([0, 1, 2, 3]))).toBe(false);
  });
});

describe('screenshot CLI', () => {
  test('rejects unknown long options', async () => {
    await expect(runScreenshotCli(['meta', 'x.png', '--typo'])).rejects.toThrow(/unknown flag/);
  });

  test('meta --json reports Bun.Image dimensions and digest', async () => {
    const dir = await mkdtemp(join(REPO_ROOT, 'data', 'tmp-screenshot-cli-meta-'));
    const pngPath = join(dir, 'fixture.png');
    try {
      await Bun.write(pngPath, PNG_10);
      const { payload, exitCode } = await runScreenshotCli(['meta', pngPath, '--json']);
      expect(exitCode).toBe(0);
      const body = payload as {
        command: string;
        meta: { width: number; height: number; format: string; digest: string };
      };
      expect(body.command).toBe('meta');
      expect(body.meta.width).toBe(10);
      expect(body.meta.height).toBe(10);
      expect(body.meta.format).toBe('png');
      expect(body.meta.digest).toHaveLength(64);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('meta rejects non-PNG bytes', async () => {
    const dir = await mkdtemp(join(REPO_ROOT, 'data', 'tmp-screenshot-cli-bad-'));
    const path = join(dir, 'not.png');
    try {
      await Bun.write(path, 'hello');
      await expect(runScreenshotCli(['meta', path, '--json'])).rejects.toThrow(/Not a PNG/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('verify and remediate run TEST-003 on a PNG fixture', async () => {
    const dir = await mkdtemp(join(REPO_ROOT, 'data', 'tmp-screenshot-cli-verify-'));
    const pngPath = join(dir, 'fixture.png');
    try {
      await Bun.write(pngPath, PNG_10);
      const verified = await runScreenshotCli([
        'verify',
        pngPath,
        '--subject',
        'fixture',
        '--json',
      ]);
      const verifiedBody = verified.payload as {
        ok: boolean;
        code: string;
        status: string;
      };
      expect(verifiedBody.code).toBe('TEST-003');
      expect(verifiedBody.status).toMatch(/pass|fail/);
      expect(verified.exitCode).toBe(verifiedBody.ok ? 0 : 1);

      const remediated = await runScreenshotCli(['remediate', pngPath, '--json']);
      const remediatedBody = remediated.payload as {
        command: string;
        action: string;
        source: { width: number };
        thumbnail: { width: number };
        ok: boolean;
      };
      expect(remediatedBody.command).toBe('remediate');
      expect(remediatedBody.action).toMatch(/accept|recapture|resize_fix|reject/);
      expect(remediatedBody.source.width).toBe(10);
      expect(remediatedBody.thumbnail.width).toBeLessThanOrEqual(400);
      expect(remediated.exitCode).toBe(remediatedBody.ok ? 0 : 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('capture runs TEST-003, writes evidence JSON, and fails placeholder by default', async () => {
    const outDir = await mkdtemp(join(REPO_ROOT, 'data', 'tmp-screenshot-cli-capture-'));
    try {
      const observation: ScreenshotObservation = {
        ok: true,
        source: 'placeholder',
        pngPath: join(outDir, 'ev.png'),
        thumbPath: join(outDir, 'ev.thumb.webp'),
        evidenceId: '019fddd8-4563-7000-89b2-622bc8f9919f',
        width: 10,
        height: 10,
        thumbBytes: PNG_10.byteLength,
        elapsedMs: 1,
        error: 'webview unavailable',
      };
      const failed = await runScreenshotCli(
        ['capture', 'https://example.com', '--out-dir', outDir, '--json'],
        {
          capture: async () => ({
            observation,
            pngBytes: new Uint8Array(PNG_10),
            thumbBytes: new Uint8Array(PNG_10),
          }),
        }
      );
      const failedBody = failed.payload as {
        test003: { ok: boolean; code: string } | null;
        evidencePath?: string;
        observation: { source: string };
        exitCode: number;
      };
      expect(failedBody.observation.source).toBe('placeholder');
      expect(failedBody.test003?.code).toBe('TEST-003');
      expect(failed.exitCode).toBe(1);
      expect(failedBody.evidencePath).toBeTruthy();
      expect(await Bun.file(failedBody.evidencePath!).exists()).toBe(true);

      const allowed = await runScreenshotCli(
        [
          'capture',
          'https://example.com',
          '--out-dir',
          outDir,
          '--allow-placeholder',
          '--json',
        ],
        {
          capture: async () => ({
            observation,
            pngBytes: new Uint8Array(PNG_10),
            thumbBytes: new Uint8Array(PNG_10),
          }),
        }
      );
      // Placeholder allowed + TEST-003 pass on fixture → exit 0
      expect(allowed.exitCode).toBe(0);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('capture rejects non-http URLs and out-dir escapes', async () => {
    await expect(
      runScreenshotCli(['capture', 'file:///tmp/x', '--json'])
    ).rejects.toThrow(/http\(s\)/);
    await expect(
      runScreenshotCli(['capture', 'https://example.com', '--out-dir', '/tmp/nope', '--json'])
    ).rejects.toThrow(/repository root/);
  });
});
