// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/image
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
/**
 * On-demand player avatar via Bun.Image — no sharp/jimp.
 * Safe slug allowlist only (no path traversal).
 *
 * @see scripts/images-generate.ts
 * @see docs/IMAGES.md
 */
import { joinPath } from '../path-bun.ts';

const ROOT = joinPath(import.meta.dir, '../..');
const SOURCE_DIR = joinPath(ROOT, 'warehouse/avatars');
const CACHE_DIR = joinPath(ROOT, 'public/avatars');
const FALLBACK = joinPath(ROOT, 'public/icons/tennis/mark.png');

const SAFE_SLUG = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const SOURCE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'] as const;

export type AvatarOptions = {
  size?: number;
  quality?: number;
  /** Write generated WebP under public/avatars/ (default true). */
  cache?: boolean;
  maxPixels?: number;
};

export function isSafeAvatarId(avatarKey: string): boolean {
  return SAFE_SLUG.test(avatarKey);
}

async function resolveSource(avatarKey: string): Promise<string | null> {
  for (const ext of SOURCE_EXTS) {
    const p = joinPath(SOURCE_DIR, `${avatarKey}${ext}`);
    if (await Bun.file(p).exists()) return p;
  }
  if (await Bun.file(FALLBACK).exists()) return FALLBACK;
  return null;
}

/**
 * Build a WebP avatar Response for a filesystem slug.
 * 400 invalid · 404 no source · 200 image/webp body.
 */
export async function avatarWebpResponse(
  avatarKey: string,
  options: AvatarOptions = {}
): Promise<Response> {
  if (!isSafeAvatarId(avatarKey)) {
    return new Response(JSON.stringify({ error: 'invalid avatar id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const size = Math.min(512, Math.max(16, options.size ?? 128));
  const quality = Math.min(100, Math.max(1, options.quality ?? 80));
  const maxPixels = options.maxPixels ?? 4096 * 4096;
  const useCache = options.cache !== false;

  const cachePath = joinPath(CACHE_DIR, `${avatarKey}.webp`);
  if (useCache && (await Bun.file(cachePath).exists())) {
    return new Response(Bun.file(cachePath), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=300',
        'X-Avatar-Cache': 'hit',
      },
    });
  }

  const src = await resolveSource(avatarKey);
  if (!src) {
    return new Response(null, { status: 404 });
  }

  try {
    const t0 = Bun.nanoseconds();
    const pipe = Bun.file(src)
      .image({ maxPixels })
      .resize(size, size, { fit: 'fill' })
      .webp({ quality });

    if (useCache) {
      await pipe.write(cachePath);
      const ms = (Bun.nanoseconds() - t0) / 1e6;
      return new Response(Bun.file(cachePath), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=300',
          'X-Avatar-Cache': 'miss',
          'X-Avatar-Ms': ms.toFixed(1),
          'X-Avatar-Source': src.includes('warehouse') ? 'warehouse' : 'fallback',
        },
      });
    }

    const blob = await pipe.blob();
    const ms = (Bun.nanoseconds() - t0) / 1e6;
    return new Response(blob, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=60',
        'X-Avatar-Cache': 'skip',
        'X-Avatar-Ms': ms.toFixed(1),
      },
    });
  } catch (e) {
    const err = e as Error & { code?: string };
    return new Response(
      JSON.stringify({
        error: err.message || 'image encode failed',
        code: err.code ?? 'ERR_IMAGE',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
