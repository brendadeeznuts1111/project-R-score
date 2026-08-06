// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns.prefetch
// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @see https://bun.com/docs/runtime/dns — Bun.dns
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep (via fetchWithRetry)
import { joinPath } from '../path-bun.ts';
import { detectStackFromHtml, politeHeaders } from './detect-stack.ts';
import { fetchWithRetry } from './fetch-url.ts';
import { FIXTURES_DIR } from './paths.ts';
import type { FetchObservation, SeedDomain } from './types.ts';

export type DnsObservation = {
  host: string;
  addresses: string[];
  ok: boolean;
  error?: string;
};

export async function observeDns(host: string): Promise<DnsObservation> {
  try {
    // Prefetch hint (best-effort; ignored if unsupported)
    try {
      // @ts-expect-error Bun.dns.prefetch is optional across Bun channels
      Bun.dns.prefetch?.(host);
    } catch {
      /* ignore */
    }
    const records = await Bun.dns.lookup(host, { family: 0 });
    const addresses = records.map(r => r.address);
    return { host, addresses, ok: addresses.length > 0 };
  } catch (err) {
    return {
      host,
      addresses: [],
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function loadFixtureHtml(
  operatorId: string // brand-ok — opaque research/wire id
): Promise<{ html: string; contentType: string; path: string } | null> {
  const path = joinPath(FIXTURES_DIR, `${operatorId}.html`);
  // Bun.file.type → text/html;charset=utf-8 from extension
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return { html: await file.text(), contentType: file.type || 'text/html;charset=utf-8', path };
}

export async function politeFetch(
  seed: SeedDomain,
  opts: { fixtureFallback?: boolean; timeoutMs?: number } = {}
): Promise<{ observation: FetchObservation; html: string }> {
  const timeoutMs =
    opts.fixtureFallback === false ? (opts.timeoutMs ?? 12_000) : (opts.timeoutMs ?? 8_000);
  const started = Bun.nanoseconds();
  try {
    try {
      // @ts-expect-error fetch.preconnect optional
      fetch.preconnect?.(seed.url);
    } catch {
      /* ignore */
    }

    const res = await fetchWithRetry(seed.url, {
      headers: politeHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      maxRetries: 3,
      baseDelayMs: 500,
    });
    const buf = new Uint8Array(await res.arrayBuffer());
    const html = new TextDecoder().decode(buf);
    const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
    const contentType = res.headers.get('content-type');
    return {
      html,
      observation: {
        ok: res.ok,
        status: res.status,
        contentType,
        protocol: res.url.startsWith('https') ? 'https' : 'http',
        bytes: buf.byteLength,
        elapsedMs,
        source: 'live',
      },
    };
  } catch (err) {
    const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
    if (opts.fixtureFallback !== false) {
      const fixture = await loadFixtureHtml(seed.id);
      if (fixture) {
        return {
          html: fixture.html,
          observation: {
            ok: true,
            status: 200,
            contentType: fixture.contentType,
            protocol: 'fixture',
            bytes: fixture.html.length,
            elapsedMs,
            error: err instanceof Error ? err.message : String(err),
            source: 'fixture',
            htmlPath: fixture.path,
          },
        };
      }
    }
    return {
      html: '',
      observation: {
        ok: false,
        status: null,
        contentType: null,
        protocol: null,
        bytes: 0,
        elapsedMs,
        error: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
    };
  }
}

export function classifyContent(html: string, url: string) {
  return detectStackFromHtml(url, html);
}
