// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCREENSHOT_ALLOWED_LONG } from '../lib/docs/ref-id-tool-flags.ts';
import { runScreenshotCli } from '../tools/screenshot-cli.ts';

/** 10×10 PNG fixture (same as image-metadata tests). */
const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64'
);

describe('screenshot CLI', () => {
  test('allowlist includes dual-mode and capture leaves', () => {
    expect([...SCREENSHOT_ALLOWED_LONG]).toEqual(
      expect.arrayContaining(['json', 'subject', 'out-dir', 'timeout-ms', 'no-placeholder', 'help'])
    );
  });

  test('rejects unknown long options', async () => {
    await expect(runScreenshotCli(['meta', 'x.png', '--typo'])).rejects.toThrow(/unknown flag/);
  });

  test('meta --json reports Bun.Image dimensions and digest', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'screenshot-cli-meta-'));
    const pngPath = join(dir, 'fixture.png');
    try {
      await Bun.write(pngPath, PNG_10);
      const prev = process.exitCode;
      process.exitCode = 0;
      const payload = (await runScreenshotCli(['meta', pngPath, '--json'])) as {
        command: string;
        meta: { width: number; height: number; format: string; digest: string };
      };
      expect(payload.command).toBe('meta');
      expect(payload.meta.width).toBe(10);
      expect(payload.meta.height).toBe(10);
      expect(payload.meta.format).toBe('png');
      expect(payload.meta.digest).toHaveLength(64);
      process.exitCode = prev;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('verify and remediate run TEST-003 on a PNG fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'screenshot-cli-verify-'));
    const pngPath = join(dir, 'fixture.png');
    try {
      await Bun.write(pngPath, PNG_10);
      const prev = process.exitCode;
      process.exitCode = 0;
      const verified = (await runScreenshotCli([
        'verify',
        pngPath,
        '--subject',
        'fixture',
        '--json',
      ])) as {
        ok: boolean;
        code: string;
        status: string;
      };
      expect(verified.code).toBe('TEST-003');
      expect(verified.status).toMatch(/pass|fail/);
      expect(typeof verified.ok).toBe('boolean');

      process.exitCode = 0;
      const remediated = (await runScreenshotCli(['remediate', pngPath, '--json'])) as {
        command: string;
        action: string;
        source: { width: number };
        thumbnail: { width: number };
      };
      expect(remediated.command).toBe('remediate');
      expect(remediated.action).toMatch(/accept|recapture|resize_fix|reject/);
      expect(remediated.source.width).toBe(10);
      expect(remediated.thumbnail.width).toBeLessThanOrEqual(400);
      process.exitCode = prev;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
