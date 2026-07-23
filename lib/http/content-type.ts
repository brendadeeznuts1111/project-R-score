// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — request body Content-Type
// @see https://bun.com/docs/runtime/networking/fetch — fetch
// @see https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata — FormData upload
/**
 * Content-Type — separated into Bun default vs our value vs expected, with status.
 *
 * Bun (request bodies when Content-Type is **not** set explicitly):
 *   - `Blob` / `File` → uses `blob.type`
 *   - `FormData` → multipart boundary (do **not** set Content-Type yourself)
 *   - plain `string` / `Uint8Array` → **no** auto Content-Type
 *
 * Responses always set an explicit Content-Type (serve-public / static-response).
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

/** Decision status for a Content-Type policy row. */
export type ContentTypeStatus =
  | 'ok' // ourValue matches expected (and Bun default is respected when required)
  | 'mismatch' // ourValue ≠ expected
  | 'missing' // expected set but ourValue empty
  | 'override' // we set CT when Bun default exists (often wrong for FormData)
  | 'defer' // we leave CT unset; Bun default applies
  | 'unknown';

/**
 * One Content-Type decision — four columns for tables / health / tests.
 *
 * | field | meaning |
 * |-------|---------|
 * | defaultValue | Bun auto CT when header omitted (or "—") |
 * | ourValue | What FactoryWager sets or intentionally leaves empty |
 * | expected | Contract for this surface |
 * | status | ok / mismatch / missing / override / defer |
 */
export type ContentTypeDecision = {
  /** Short case id (e.g. formdata-upload, json-string-body, response-json). */
  id: string; // brand-ok — opaque content-type matrix row key
  /** Human label for tables. */
  label: string;
  /** request | response */
  side: 'request' | 'response';
  /** Bun's automatic Content-Type when we do not set the header. */
  defaultValue: string;
  /** Our explicit header (or empty string if we defer to Bun). */
  ourValue: string;
  /** What the contract requires (may be a family like multipart/*). */
  expected: string;
  status: ContentTypeStatus;
  note?: string;
};

/** Normalize for comparison: media type only, lowercased; multipart collapses to family. */
export function normalizeContentType(ct: string | null | undefined): string {
  if (ct == null || ct.trim() === '') return '';
  const base = ct.split(';')[0]!.trim().toLowerCase();
  if (base.startsWith('multipart/form-data')) return 'multipart/form-data';
  if (base === 'application/json' || base.endsWith('+json')) return 'application/json';
  return base;
}

/** True if CT is JSON (allows charset / vendor subtypes). */
export function isJsonContentType(ct: string | null | undefined): boolean {
  return normalizeContentType(ct) === 'application/json';
}

/** True if CT is multipart form (Bun-set boundary). */
export function isMultipartContentType(ct: string | null | undefined): boolean {
  return normalizeContentType(ct) === 'multipart/form-data';
}

/**
 * Score a decision: ourValue vs expected, and whether we override Bun's default.
 *
 * - expected empty → status from whether we defer
 * - FormData: ourValue must be empty (defer); override = fail
 * - otherwise compare normalized media types
 */
export function evaluateContentType(input: {
  id: string; // brand-ok — opaque content-type matrix row key
  label: string;
  side: 'request' | 'response';
  defaultValue: string;
  ourValue: string;
  expected: string;
  note?: string;
}): ContentTypeDecision {
  const { id, label, side, defaultValue, ourValue, expected, note } = input;
  const our = normalizeContentType(ourValue);
  const exp = normalizeContentType(expected);
  const def = normalizeContentType(defaultValue);

  let status: ContentTypeStatus = 'unknown';

  if (exp === 'multipart/form-data' || (side === 'request' && def === 'multipart/form-data')) {
    // Contract: never set Content-Type ourselves on FormData
    if (our === '') status = 'defer';
    else status = 'override';
  } else if (exp === '') {
    status = our === '' ? 'defer' : 'ok';
  } else if (our === '') {
    // Deferring: pass if Bun default satisfies expected
    if (def && def === exp) status = 'defer';
    else if (def === '' && exp !== '') status = 'missing';
    else status = def === exp ? 'ok' : 'mismatch';
  } else if (our === exp) {
    status = 'ok';
  } else {
    status = 'mismatch';
  }

  // For defer rows that match expected via Bun default, treat as ok for pass/fail tables
  if (status === 'defer' && (exp === '' || def === exp || exp === 'multipart/form-data')) {
    status = exp === 'multipart/form-data' || def === exp || exp === '' ? 'ok' : status;
  }
  // multipart defer with empty our is ok
  if ((exp === 'multipart/form-data' || def === 'multipart/form-data') && our === '') {
    status = 'ok';
  }

  return {
    id,
    label,
    side,
    defaultValue: defaultValue || '—',
    ourValue: ourValue || '—',
    expected: expected || '—',
    status,
    note,
  };
}

/**
 * What Bun would set for this body when Content-Type is omitted.
 * Returns '' when Bun does not auto-set.
 */
export function bunDefaultContentType(body: BodyInit | null | undefined): string {
  if (body == null) return '';
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return 'multipart/form-data'; // + boundary at wire time
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.type || '';
  }
  return '';
}

/**
 * Our policy Content-Type for a body (empty = defer to Bun).
 * Does not mutate headers — pure decision.
 */
export function ourContentTypeForBody(body: BodyInit | null | undefined): string {
  if (body == null) return '';
  if (typeof FormData !== 'undefined' && body instanceof FormData) return ''; // always defer
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    // Prefer blob.type as source of truth; we do not re-set if already on blob
    return '';
  }
  if (typeof body === 'string') {
    const t = body.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) return CT_JSON;
    return CT_TEXT;
  }
  return '';
}

/** Expected contract Content-Type for a request body kind. */
export function expectedContentTypeForBody(body: BodyInit | null | undefined): string {
  if (body == null) return '';
  if (typeof FormData !== 'undefined' && body instanceof FormData) return 'multipart/form-data';
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    if (body.type) return body.type.split(';')[0]!.trim() || 'application/json';
    return '';
  }
  if (typeof body === 'string') {
    const t = body.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) return 'application/json';
    return 'text/plain';
  }
  return '';
}

/** Full four-column decision for a request body. */
export function decideRequestContentType(
  body: BodyInit | null | undefined,
  opts?: { id?: string; label?: string; explicitOurHeader?: string | null } // brand-ok — opaque decision-row key
): ContentTypeDecision {
  const defaultValue = bunDefaultContentType(body);
  // undefined = policy default; '' = we force no header (e.g. missing CT demo)
  const ourValue =
    opts?.explicitOurHeader !== undefined ? opts.explicitOurHeader : ourContentTypeForBody(body);
  const expected = expectedContentTypeForBody(body);
  return evaluateContentType({
    id: opts?.id ?? 'request-body',
    label: opts?.label ?? 'request body',
    side: 'request',
    defaultValue,
    ourValue,
    expected,
  });
}

/** Response path decision: Bun has no default for Response CT — we always set. */
export function decideResponseContentType(path: string, ourValue?: string): ContentTypeDecision {
  const expected = guessContentType(path);
  const our = ourValue ?? expected;
  return evaluateContentType({
    id: `response:${path}`,
    label: path,
    side: 'response',
    defaultValue: '', // Response has no Bun auto CT
    ourValue: our,
    expected,
    note: 'Response CT is always explicit',
  });
}

/**
 * Catalog of policy rows — used by tests + `Bun.inspect.table` diagnostics.
 * Each row separates: defaultValue | ourValue | expected | status
 */
export function contentTypePolicyCatalog(): ContentTypeDecision[] {
  const form = new FormData();
  form.set('file', jsonFile({ ok: true }, 'x.json'));
  const jsonB = jsonBlob({ a: 1 });
  const plainJson = JSON.stringify({ a: 1 });

  return [
    decideRequestContentType(form, {
      id: 'formdata-upload',
      label: 'FormData publish/upload',
    }),
    decideRequestContentType(form, {
      id: 'formdata-override-bad',
      label: 'FormData + manual CT (bad)',
      explicitOurHeader: 'multipart/form-data',
    }),
    decideRequestContentType(jsonB, {
      id: 'json-blob',
      label: 'JSON Blob body',
    }),
    decideRequestContentType(plainJson, {
      id: 'json-string',
      label: 'JSON string body',
    }),
    decideRequestContentType(plainJson, {
      id: 'json-string-no-header',
      label: 'JSON string + no CT (bad)',
      explicitOurHeader: '', // force empty — Bun default is also empty → missing
    }),
    decideResponseContentType('public/registry/ops-summary.json'),
    decideResponseContentType('public/registry/prediction/report.html'),
    decideResponseContentType('public/registry/prediction/coverage-chart.svg'),
    decideResponseContentType('public/registry/storage/pkg/1.0.0/artifact.tgz'),
    evaluateContentType({
      id: 'sse-hmr',
      label: 'SSE /__hmr',
      side: 'response',
      defaultValue: '',
      ourValue: CT_SSE,
      expected: CT_SSE,
      note: 'live-reload stream',
    }),
  ];
}

/** Rows for Bun.inspect.table / health dashboards. */
export function contentTypePolicyTableRows(
  rows: ContentTypeDecision[] = contentTypePolicyCatalog()
): Array<Record<string, string>> {
  return rows.map(r => ({
    id: r.id,
    side: r.side,
    defaultValue: r.defaultValue,
    ourValue: r.ourValue,
    expected: r.expected,
    status: r.status,
    note: r.note ?? '',
  }));
}

/**
 * JSON body as Blob so Bun sets `Content-Type: application/json` from blob.type
 * when you omit headers.Content-Type.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- wire JSON payload
export function jsonBlob(data: unknown): Blob {
  return new Blob([`${JSON.stringify(data)}\n`], { type: 'application/json' });
}

/**
 * JSON File part for FormData publish.
 * Parent FormData still gets multipart boundary from Bun — do not set CT on fetch.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- wire JSON payload
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
 * Headers for fetch: only set Content-Type when policy says so.
 * FormData → never set (Bun boundary). Blob → defer to blob.type.
 */
export function fetchHeadersForBody(
  body: BodyInit | null | undefined,
  base?: HeadersInit
): Headers {
  const h = new Headers(base);
  if (body == null) return h;
  if (h.has('Content-Type') || h.has('content-type')) return h;

  const decision = decideRequestContentType(body);
  if (decision.status === 'ok' && decision.ourValue !== '—' && decision.ourValue !== '') {
    h.set('Content-Type', decision.ourValue);
  } else if (typeof body === 'string') {
    const our = ourContentTypeForBody(body);
    if (our) h.set('Content-Type', our);
  }
  return h;
}
