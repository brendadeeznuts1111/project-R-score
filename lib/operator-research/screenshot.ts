// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation — await using WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
import { joinPath } from '../path-bun.ts';
import { buildScreenshotEvidenceRecord } from '../screenshot-remediation.ts';
import { FIXTURES_DIR, SCREENSHOTS_DIR } from './paths.ts';
import type { ScreenshotObservation } from './types.ts';

/** 64×64 PNG fixture — used when WebView cannot capture (network/sandbox). */
async function loadPlaceholderPng(): Promise<Uint8Array> {
  const file = Bun.file(joinPath(FIXTURES_DIR, 'placeholder.png'));
  if (await file.exists()) return new Uint8Array(await file.arrayBuffer());
  // Tiny fallback PNG (may fail TEST-003 min size — prefer fixture file).
  return Uint8Array.fromBase64(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  );
}

async function captureWebViewPng(url: string, timeoutMs: number): Promise<Uint8Array> {
  await using wv = new Bun.WebView({ width: 1280, height: 720, headless: true });
  const nav = wv.navigate(url);
  await Promise.race([
    nav,
    Bun.sleep(timeoutMs).then(() => {
      throw new Error(`WebView navigate timeout ${timeoutMs}ms`);
    }),
  ]);
  await Bun.sleep(1200);
  const ss = await wv.screenshot({ format: 'png' });
  return new Uint8Array(ss);
}

export async function captureScreenshot(
  url: string,
  opts: {
    subject?: string;
    allowPlaceholder?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<{ observation: ScreenshotObservation; pngBytes?: Uint8Array; thumbBytes?: Uint8Array }> {
  const started = Bun.nanoseconds();
  const timeoutMs = opts.timeoutMs ?? 18_000;
  try {
    const pngBytes = await captureWebViewPng(url, timeoutMs);
    const { record, thumbnailBytes, elapsedMs } = await buildScreenshotEvidenceRecord(pngBytes, {
      subject: opts.subject ?? url,
    });
    const id = String(record.evidenceId);
    const pngPath = joinPath(SCREENSHOTS_DIR, `${id}.png`);
    const thumbPath = joinPath(SCREENSHOTS_DIR, `${id}.thumb.webp`);
    const webp = await new Bun.Image(thumbnailBytes)
      .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 });
    await Bun.write(pngPath, pngBytes);
    await Bun.write(thumbPath, webp);
    return {
      pngBytes,
      thumbBytes: new Uint8Array(webp),
      observation: {
        ok: true,
        source: 'webview',
        pngPath,
        thumbPath,
        evidenceId: id,
        width: record.source.width,
        height: record.source.height,
        thumbBytes: webp.byteLength,
        elapsedMs,
      },
    };
  } catch (err) {
    const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
    if (opts.allowPlaceholder === false) {
      return {
        observation: {
          ok: false,
          source: 'none',
          elapsedMs,
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
    const pngBytes = await loadPlaceholderPng();
    const { record, thumbnailBytes } = await buildScreenshotEvidenceRecord(pngBytes, {
      subject: opts.subject ?? url,
    });
    const id = String(record.evidenceId);
    const pngPath = joinPath(SCREENSHOTS_DIR, `${id}.png`);
    const thumbPath = joinPath(SCREENSHOTS_DIR, `${id}.thumb.webp`);
    let webp: Uint8Array;
    try {
      webp = new Uint8Array(
        await new Bun.Image(thumbnailBytes)
          .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
      );
    } catch {
      webp = thumbnailBytes;
    }
    await Bun.write(pngPath, pngBytes);
    await Bun.write(thumbPath, webp);
    return {
      pngBytes,
      thumbBytes: webp,
      observation: {
        ok: true,
        source: 'placeholder',
        pngPath,
        thumbPath,
        evidenceId: id,
        width: record.source.width,
        height: record.source.height,
        thumbBytes: webp.byteLength,
        elapsedMs,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
