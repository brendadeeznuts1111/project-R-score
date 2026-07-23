// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — request body Content-Type
// @see https://bun.com/docs/runtime/networking/fetch — fetch
/**
 * Content-Type helpers aligned with Bun fetch auto-handling.
 *
 * Bun (request bodies, when Content-Type is **not** set explicitly):
 *   - `Blob` / `File` → uses `blob.type`
 *   - `FormData` → multipart boundary (do **not** set Content-Type yourself)
 *   - plain `string` / `Uint8Array` → **no** auto Content-Type
 *
 * Responses still need an explicit Content-Type (serve-public / static-response).
 */
export const CT_JSON = 'application/json; charset=utf-8';
export const CT_HTML = 'text/html; charset=utf-8';
export const CT_TEXT = 'text/plain; charset=utf-8';
export const CT_JS = 'text/javascript; charset=utf-8';
export const CT_CSS = 'text/css; charset=utf-8';
export const CT_SSE = 'text/event-stream; charset=utf-8';
export const CT_SVG = 'image/svg+xml';
export const CT_GZIP = 'application/gzip';
export const CT_OCTET = 'application/octet-stream';

/** True if CT is JSON (allows charset / vendor subtypes). */
export function isJsonContentType(ct: string | null | undefined): boolean {
  if (!ct) return false;
  const base = ct.split(';')[0]!.trim().toLowerCase();
  return base === 'application/json' || base.endsWith('+json');
}

/** True if CT is multipart form (Bun-set boundary). */
export function isMultipartContentType(ct: string | null | undefined): boolean {
  if (!ct) return false;
  return ct.toLowerCase().startsWith('multipart/form-data');
}

/**
 * JSON body as Blob so Bun sets `Content-Type: application/json` from blob.type
 * when you omit headers.Content-Type.
 *
 * Prefer this over `JSON.stringify` + manual header when using `fetch`.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- wire JSON payload (any serializable)
export function jsonBlob(data: unknown): Blob {
  return new Blob([`${JSON.stringify(data)}\n`], { type: 'application/json' });
}

/**
 * JSON File part for FormData publish (name + type for server File handlers).
 * Parent FormData still gets multipart boundary from Bun — do not set CT on fetch.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- wire JSON payload (any serializable)
export function jsonFile(data: unknown, filename = 'payload.json'): File {
  return new File([`${JSON.stringify(data, null, 2)}\n`], filename, {
    type: 'application/json',
  });
}

/**
 * Guess response Content-Type from a file path / URL path.
 * Used by static routes — not the same as Bun request-body auto CT.
 */
export function guessContentType(path: string): string {
  const p = path.toLowerCase().split('?')[0]!;
  if (p.endsWith('.json')) return CT_JSON;
  if (p.endsWith('.html') || p.endsWith('.htm')) return CT_HTML;
  if (p.endsWith('.js') || p.endsWith('.mjs') || p.endsWith('.cjs')) return CT_JS;
  if (p.endsWith('.css')) return CT_CSS;
  if (p.endsWith('.svg')) return CT_SVG;
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.gif')) return 'image/gif';
  if (p.endsWith('.ico')) return 'image/x-icon';
  if (p.endsWith('.woff2')) return 'font/woff2';
  if (p.endsWith('.woff')) return 'font/woff';
  if (p.endsWith('.md') || p.endsWith('.markdown')) return 'text/markdown; charset=utf-8';
  if (p.endsWith('.txt') || p.endsWith('.log')) return CT_TEXT;
  if (p.endsWith('.tgz') || p.endsWith('.tar.gz') || p.endsWith('.gz')) return CT_GZIP;
  if (p.endsWith('.wasm')) return 'application/wasm';
  if (p.endsWith('.map')) return CT_JSON;
  if (p.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return CT_OCTET;
}

/**
 * Headers for JSON fetch: only set Content-Type when body is a string.
 * If body is Blob/File/FormData, omit CT so Bun owns it (especially FormData boundary).
 */
export function fetchHeadersForBody(
  body: BodyInit | null | undefined,
  base?: HeadersInit
): Headers {
  const h = new Headers(base);
  if (body == null) return h;
  if (h.has('Content-Type') || h.has('content-type')) return h;

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    // Bun sets multipart boundary — never set Content-Type here
    return h;
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    // File extends Blob; type may be ""
    if (body.type) h.set('Content-Type', body.type);
    return h;
  }
  if (typeof body === 'string') {
    // Heuristic: JSON-looking strings
    const t = body.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) h.set('Content-Type', CT_JSON);
    else h.set('Content-Type', CT_TEXT);
  }
  return h;
}
