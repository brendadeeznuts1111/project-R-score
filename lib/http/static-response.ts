// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
/**
 * Bun static-route vs file-route response helpers.
 *
 * **Static (memory)** — `new Response(bytes)` after `file.bytes()` at load time:
 *   - zero FS I/O per request
 *   - strong ETag + If-None-Match → 304
 *   - missing files fail at preload (startup), not as runtime 404
 *   - best for small hot assets (ops-summary, proofs, static.json)
 *
 * **File (disk)** — `new Response(Bun.file(path))` per request:
 *   - exists-check + stream with backpressure
 *   - Last-Modified + If-Modified-Since → 304
 *   - Range handled by Bun when using Bun.file body
 *   - runtime 404 if missing
 *   - best for large / changing files
 */
import { sha256Hex } from '../bun-utils-proof.ts';

export const DEFAULT_STATIC_MAX_BYTES = 512 * 1024; // 512 KiB

export type PreloadedStatic = {
  path: string;
  bytes: Uint8Array;
  etag: string;
  contentType: string;
  size: number;
};

export type StaticRespondOpts = {
  cacheControl?: string;
  /** Extra headers merged last. */
  headers?: Record<string, string>;
};

export type FileRespondOpts = StaticRespondOpts & {
  contentType?: string;
};

/** Guess Content-Type from path extension. */
export function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (path.endsWith('.tgz') || path.endsWith('.tar.gz')) return 'application/gzip';
  if (path.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
}

/** Strong ETag from content bytes or string (quoted hex). */
export function etagFromBytes(bytes: Uint8Array | string): string {
  if (typeof bytes === 'string') return `"${sha256Hex(bytes)}"`;
  const h = new Bun.CryptoHasher('sha256');
  h.update(bytes);
  return `"${h.digest('hex')}"`;
}

/** Load file into memory for static-route serving. Throws if missing. */
export async function preloadStatic(
  path: string,
  opts: { contentType?: string; maxBytes?: number } = {}
): Promise<PreloadedStatic> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`preloadStatic: missing file ${path}`);
  }
  const size = file.size;
  const max = opts.maxBytes ?? DEFAULT_STATIC_MAX_BYTES;
  if (size > max) {
    throw new Error(
      `preloadStatic: ${path} is ${size} bytes (> ${max}); use respondFile() instead`
    );
  }
  const bytes = new Uint8Array(await file.bytes());
  const h = new Bun.CryptoHasher('sha256');
  h.update(bytes);
  const etag = `"${h.digest('hex')}"`;
  return {
    path,
    bytes,
    etag,
    contentType: opts.contentType ?? guessContentType(path),
    size: bytes.byteLength,
  };
}

/** Preload many paths; skip missing when `optional`. */
export async function preloadStaticMap(
  paths: string[],
  opts: { optional?: boolean; maxBytes?: number } = {}
): Promise<Map<string, PreloadedStatic>> {
  const map = new Map<string, PreloadedStatic>();
  for (const path of paths) {
    try {
      map.set(path, await preloadStatic(path, { maxBytes: opts.maxBytes }));
    } catch (e) {
      if (!opts.optional) throw e;
    }
  }
  return map;
}

function mergeHeaders(
  base: Record<string, string>,
  extra?: Record<string, string>
): Headers {
  const h = new Headers(base);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) h.set(k, v);
  }
  return h;
}

/**
 * Static-route response from preloaded bytes.
 * Honors If-None-Match → 304. Body omitted for HEAD.
 */
export function respondStatic(
  asset: PreloadedStatic,
  request: Request,
  opts: StaticRespondOpts = {}
): Response {
  const inm = request.headers.get('If-None-Match');
  if (inm && etagMatches(inm, asset.etag)) {
    return new Response(null, {
      status: 304,
      headers: mergeHeaders(
        {
          ETag: asset.etag,
          'Cache-Control': opts.cacheControl ?? 'public, max-age=60',
        },
        opts.headers
      ),
    });
  }

  const headers = mergeHeaders(
    {
      'Content-Type': asset.contentType,
      'Content-Length': String(asset.size),
      ETag: asset.etag,
      'Cache-Control': opts.cacheControl ?? 'public, max-age=60',
    },
    opts.headers
  );

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  // Copy so Response ownership doesn't alias mutable buffer unexpectedly
  return new Response(asset.bytes, { status: 200, headers });
}

/** Weak/strong ETag list match (comma-separated If-None-Match). */
export function etagMatches(ifNoneMatch: string, etag: string): boolean {
  if (ifNoneMatch.trim() === '*') return true;
  const want = etag.replace(/^W\//, '');
  return ifNoneMatch.split(',').some(part => {
    const t = part.trim().replace(/^W\//, '');
    return t === etag || t === want || t === etag.replace(/"/g, '') || `"${t.replace(/"/g, '')}"` === etag;
  });
}

/**
 * File-route response via Bun.file (stream, 404, Last-Modified, Range).
 */
export async function respondFile(
  path: string,
  request: Request,
  opts: FileRespondOpts = {}
): Promise<Response> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const lastModified = new Date(file.lastModified);
  const lastModifiedHttp = lastModified.toUTCString();
  const ims = request.headers.get('If-Modified-Since');
  if (ims) {
    const since = Date.parse(ims);
    if (!Number.isNaN(since) && file.lastModified <= since + 999) {
      // +999: HTTP dates have 1s resolution
      return new Response(null, {
        status: 304,
        headers: mergeHeaders(
          {
            'Last-Modified': lastModifiedHttp,
            'Cache-Control': opts.cacheControl ?? 'public, max-age=60',
          },
          opts.headers
        ),
      });
    }
  }

  const headers = mergeHeaders(
    {
      'Content-Type': opts.contentType ?? guessContentType(path),
      'Last-Modified': lastModifiedHttp,
      'Cache-Control': opts.cacheControl ?? 'public, max-age=60',
      // Bun.file enables Accept-Ranges / Range when used as body
    },
    opts.headers
  );

  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(file.size));
    return new Response(null, { status: 200, headers });
  }

  return new Response(file, { status: 200, headers });
}

/**
 * Choose strategy by size: small → preload static; large → file route.
 * If preload fails (missing), file route returns 404 at request time.
 */
export async function respondAuto(
  path: string,
  request: Request,
  opts: FileRespondOpts & { maxStaticBytes?: number; cache?: Map<string, PreloadedStatic> } = {}
): Promise<Response> {
  const max = opts.maxStaticBytes ?? DEFAULT_STATIC_MAX_BYTES;
  const cached = opts.cache?.get(path);
  if (cached) return respondStatic(cached, request, opts);

  const file = Bun.file(path);
  if (!(await file.exists())) {
    return respondFile(path, request, opts); // 404 shape
  }
  if (file.size <= max) {
    try {
      const asset = await preloadStatic(path, {
        contentType: opts.contentType,
        maxBytes: max,
      });
      opts.cache?.set(path, asset);
      return respondStatic(asset, request, opts);
    } catch {
      return respondFile(path, request, opts);
    }
  }
  return respondFile(path, request, opts);
}
