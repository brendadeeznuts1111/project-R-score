// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { SCREENSHOT_ALLOWED_LONG } from '../lib/docs/ref-id-tool-flags.ts';
import { ROOT as REPO_ROOT } from '../lib/operator-research/paths.ts';
import { captureScreenshot } from '../lib/operator-research/screenshot.ts';
import type { ScreenshotObservation } from '../lib/operator-research/types.ts';
import { buildScreenshotEvidenceRecord } from '../lib/screenshot-remediation.ts';
import { unbrand } from '../lib/types/branded.ts';
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

/** Temp dir under repo `data/` (creates parent — staged scratch may lack `data/`). */
async function mkRepoDataTemp(prefix: string): Promise<string> {
  const base = join(REPO_ROOT, 'data');
  await mkdir(base, { recursive: true });
  return mkdtemp(join(base, prefix));
}

/** Mock capture deps that mint one EvidenceId via buildScreenshotEvidenceRecord. */
async function mockCaptureWithRecord(
  outDir: string,
  source: 'webview' | 'placeholder' = 'placeholder'
) {
  const { record } = await buildScreenshotEvidenceRecord(new Uint8Array(PNG_10), {
    subject: 'mock',
  });
  const id = unbrand(record.evidenceId);
  const observation: ScreenshotObservation = {
    ok: true,
    source,
    pngPath: join(outDir, `${id}.png`),
    thumbPath: join(outDir, `${id}.thumb.webp`),
    evidenceId: id,
    width: record.source.width,
    height: record.source.height,
    thumbBytes: PNG_10.byteLength,
    elapsedMs: 1,
    error: source === 'placeholder' ? 'webview unavailable' : undefined,
  };
  return {
    observation,
    pngBytes: new Uint8Array(PNG_10),
    thumbBytes: new Uint8Array(PNG_10),
    record,
  };
}

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

  test('assertRepoPath rejects escapes unless --force', async () => {
    const inside = await assertRepoPath('data/operator-research/screenshots', {
      label: '--out-dir',
    });
    expect(inside.startsWith(REPO_ROOT)).toBe(true);
    await expect(
      assertRepoPath('/tmp/outside-screenshot', { label: 'image path' })
    ).rejects.toThrow(/repository root/);
    const forced = await assertRepoPath('/tmp/outside-screenshot', {
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
    const dir = await mkRepoDataTemp('tmp-screenshot-cli-meta-');
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
    const dir = await mkRepoDataTemp('tmp-screenshot-cli-bad-');
    const path = join(dir, 'not.png');
    try {
      await Bun.write(path, 'hello');
      await expect(runScreenshotCli(['meta', path, '--json'])).rejects.toThrow(/Not a PNG/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('verify and remediate run TEST-003 on a PNG fixture', async () => {
    const dir = await mkRepoDataTemp('tmp-screenshot-cli-verify-');
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
    const outDir = await mkRepoDataTemp('tmp-screenshot-cli-capture-');
    try {
      const mock = await mockCaptureWithRecord(outDir, 'placeholder');
      const failed = await runScreenshotCli(
        ['capture', 'https://example.com', '--out-dir', outDir, '--json'],
        { capture: async () => mock }
      );
      const failedBody = failed.payload as {
        test003: {
          ok: boolean;
          code: string;
          evidence: { evidenceId: string }; // brand-ok — CLI JSON payload shape
        } | null;
        evidencePath?: string;
        observation: { source: string; evidenceId?: string }; // brand-ok — CLI JSON payload shape
        exitCode: number;
      };
      expect(failedBody.observation.source).toBe('placeholder');
      expect(failedBody.test003?.code).toBe('TEST-003');
      expect(failed.exitCode).toBe(1);
      expect(failedBody.evidencePath).toBeTruthy();
      expect(await Bun.file(failedBody.evidencePath!).exists()).toBe(true);

      // Single EvidenceId: observation, nested evidence, sidecar basename, PNG stem.
      const obsId = failedBody.observation.evidenceId!;
      const evidenceId = failedBody.test003!.evidence.evidenceId;
      expect(evidenceId).toBe(obsId);
      expect(basename(failedBody.evidencePath!)).toBe(`${obsId}.test003.json`);
      expect(basename(mock.observation.pngPath!, '.png')).toBe(obsId);

      const sidecar = (await Bun.file(failedBody.evidencePath!).json()) as {
        thumbPlane?: string;
        evidence: { evidenceId: string }; // brand-ok — wire JSON
        observation: { evidenceId: string }; // brand-ok — wire JSON
      };
      expect(sidecar.thumbPlane).toBe('png-evidence');
      expect(sidecar.evidence.evidenceId).toBe(sidecar.observation.evidenceId);
      expect(sidecar.evidence.evidenceId).toBe(obsId);

      const allowed = await runScreenshotCli(
        [
          'capture',
          'https://example.com',
          '--out-dir',
          outDir,
          '--allow-placeholder',
          '--json',
        ],
        { capture: async () => mock }
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

  test('verify re-parses a .test003.json sidecar via parseScreenshotEvidenceRecord', async () => {
    const dir = await mkRepoDataTemp('tmp-screenshot-cli-sidecar-');
    try {
      const mock = await mockCaptureWithRecord(dir, 'webview');
      const captured = await runScreenshotCli(
        [
          'capture',
          'https://example.com',
          '--out-dir',
          dir,
          '--allow-placeholder',
          '--json',
        ],
        { capture: async () => mock }
      );
      const capturedBody = captured.payload as {
        evidencePath?: string;
        exitCode: number;
        observation: { evidenceId?: string }; // brand-ok — CLI JSON payload shape
        test003: { evidence: { evidenceId: string } } | null; // brand-ok — CLI JSON
      };
      expect(capturedBody.evidencePath).toBeTruthy();
      expect(capturedBody.test003!.evidence.evidenceId).toBe(capturedBody.observation.evidenceId);

      const verified = await runScreenshotCli([
        'verify',
        capturedBody.evidencePath!,
        '--json',
      ]);
      const verifiedBody = verified.payload as {
        source: string;
        code: string;
        ok: boolean;
        evidence: { kind: string; evidenceId: string }; // brand-ok — CLI JSON payload shape
      };
      expect(verifiedBody.source).toBe('sidecar');
      expect(verifiedBody.code).toBe('TEST-003');
      expect(verifiedBody.evidence.kind).toBe('ScreenshotEvidence');
      expect(verifiedBody.evidence.evidenceId).toBe(capturedBody.observation.evidenceId);
      expect(verified.exitCode).toBe(verifiedBody.ok ? 0 : 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('captureScreenshot omits placeholder when allowPlaceholder is not true', async () => {
    const outDir = await mkRepoDataTemp('tmp-screenshot-no-placeholder-');
    try {
      // Unreachable target + short timeout forces WebView failure in CI/sandbox.
      const result = await captureScreenshot('https://127.0.0.1:1/', {
        outDir,
        timeoutMs: 200,
        // allowPlaceholder omitted → fail closed
      });
      expect(result.observation.ok).toBe(false);
      expect(result.observation.source).toBe('none');
      expect(result.pngBytes).toBeUndefined();
      expect(result.record).toBeUndefined();
      const entries = await readdir(outDir);
      expect(entries.filter(e => e.endsWith('.png') || e.endsWith('.webp'))).toEqual([]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('verify on bare .json does not take sidecar parse path', async () => {
    const dir = await mkRepoDataTemp('tmp-screenshot-cli-bare-json-');
    const jsonPath = join(dir, 'random.json');
    try {
      // Valid-looking ScreenshotEvidence wire — must NOT be accepted via bare .json.
      const { record } = await buildScreenshotEvidenceRecord(new Uint8Array(PNG_10), {
        subject: 'bare-json',
      });
      await Bun.write(
        jsonPath,
        JSON.stringify({
          code: 'TEST-003',
          evidence: { ...record, evidenceId: unbrand(record.evidenceId) },
        })
      );
      // Treated as PNG path → missing PNG magic (or empty/not PNG).
      await expect(runScreenshotCli(['verify', jsonPath, '--json'])).rejects.toThrow(
        /Not a PNG|Empty image|File not found/
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('capture deps without record reuse observation.evidenceId (no remint)', async () => {
    const outDir = await mkRepoDataTemp('tmp-screenshot-cli-no-record-');
    try {
      const withRecord = await mockCaptureWithRecord(outDir, 'webview');
      const { record: _omit, ...withoutRecord } = withRecord;
      const { payload, exitCode } = await runScreenshotCli(
        [
          'capture',
          'https://example.com',
          '--out-dir',
          outDir,
          '--allow-placeholder',
          '--json',
        ],
        { capture: async () => withoutRecord }
      );
      const body = payload as {
        observation: { evidenceId?: string }; // brand-ok — CLI JSON payload shape
        test003: { evidence: { evidenceId: string } } | null; // brand-ok — CLI JSON
        evidencePath?: string;
      };
      expect(exitCode).toBe(0);
      expect(body.test003).toBeTruthy();
      const obsId = body.observation.evidenceId!;
      expect(body.test003!.evidence.evidenceId).toBe(obsId);
      expect(basename(body.evidencePath!)).toBe(`${obsId}.test003.json`);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
