import {
  fetchWithRedirectPolicy,
  readBoundedBody,
  validateRemoteHttpsUrl,
} from '../../lib/rss/remote-fetch.ts';
import { fail } from './errors.ts';
import type { AssetDraft, RangeProbe } from './types.ts';

const ALLOWED_ORIGINS = new Set(['https://bun.com']);
const RANGE_REQUEST = 'bytes=0-0' as const;

export type RemoteAssetBytes = {
  bytes: Uint8Array;
  contentType: string | null;
  rangeProbe: RangeProbe;
};

function verifyExactLength(response: Response, bytes: Uint8Array, label: string): void {
  const declared = response.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && Number(declared) !== bytes.byteLength) {
    fail(`${label} content-length ${declared} does not match fetched bytes ${bytes.byteLength}`);
  }
}

async function request(
  sourceUrl: URL,
  headers: Headers,
  maxBytes: number,
  timeoutMs: number,
  label: string,
  fetcher: typeof fetch
): Promise<Response> {
  const result = await fetchWithRedirectPolicy(sourceUrl, headers, {
    fetcher,
    maxBytes,
    maxRedirects: 5,
    timeoutMs,
    label,
    allowedOrigins: ALLOWED_ORIGINS,
  }).catch(error => fail(`fetch failed for ${label}: ${String(error)}`));
  return result.response;
}

async function cancelAndFail(response: Response, message: string): Promise<never> {
  await response.body?.cancel().catch(() => undefined);
  fail(message);
}

export async function fetchRemoteAssetBytes(
  asset: AssetDraft,
  maxBytes: number,
  timeoutMs: number,
  fetcher: typeof fetch = fetch
): Promise<RemoteAssetBytes> {
  const label = `Bun asset ${asset.id}`;
  const sourceUrl = validateRemoteHttpsUrl(asset.sourceUrl, ALLOWED_ORIGINS, label);
  const probe = await request(
    sourceUrl,
    new Headers({ 'Accept-Encoding': 'identity', Range: RANGE_REQUEST }),
    maxBytes,
    timeoutMs,
    label,
    fetcher
  );

  if (probe.status === 200) {
    if (probe.headers.has('content-range')) {
      await cancelAndFail(probe, `${label} returned Content-Range with HTTP 200`);
    }
    const bytes = await readBoundedBody(probe, maxBytes, label);
    verifyExactLength(probe, bytes, label);
    return {
      bytes,
      contentType: probe.headers.get('content-type'),
      rangeProbe: { request: RANGE_REQUEST, result: 'ignored', totalBytes: bytes.byteLength },
    };
  }

  if (probe.status !== 206) {
    await cancelAndFail(probe, `${label} range probe returned HTTP ${probe.status}`);
  }
  const contentRange = probe.headers.get('content-range');
  const match = /^bytes 0-0\/([1-9]\d*)$/.exec(contentRange ?? '');
  const totalBytes = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(totalBytes) || totalBytes > maxBytes) {
    await cancelAndFail(
      probe,
      `${label} returned invalid Content-Range ${JSON.stringify(contentRange)}`
    );
  }
  const probeBytes = await readBoundedBody(probe, 1, `${label} range probe`);
  verifyExactLength(probe, probeBytes, `${label} range probe`);

  const full = await request(
    sourceUrl,
    new Headers({ 'Accept-Encoding': 'identity' }),
    maxBytes,
    timeoutMs,
    label,
    fetcher
  );
  if (full.status !== 200) {
    await cancelAndFail(full, `${label} full fetch returned HTTP ${full.status}`);
  }
  const bytes = await readBoundedBody(full, maxBytes, label);
  verifyExactLength(full, bytes, label);
  if (bytes.byteLength !== totalBytes || bytes[0] !== probeBytes[0]) {
    fail(`${label} changed between range probe and full fetch`);
  }
  return {
    bytes,
    contentType: full.headers.get('content-type'),
    rangeProbe: { request: RANGE_REQUEST, result: 'supported', totalBytes },
  };
}
