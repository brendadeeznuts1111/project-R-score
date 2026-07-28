// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortController
// @see https://bun.com/docs/runtime/networking/dns — Bun.dns.lookup
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep (probe retry)
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
/**
 * Live Cloudflare Access enforcement probes (HTTP HEAD/GET, no credentials).
 *
 * Host / Access domain values use separated brands from lib/types/branded/surfaces.ts:
 *   HostId · AccessDomainId (never bare hostname strings after construction).
 *
 * Access enforced signals (unauthenticated request):
 *   - Location → *.cloudflareaccess.com or /cdn-cgi/access/login
 *   - www-authenticate: Cloudflare-Access
 *
 * Does not apply policies — only observes edge behavior.
 */

import {
  accessDomainFromHost,
  asHostId,
  httpsUrlForAccessDomain,
  httpsUrlForHost,
  type AccessDomainId,
  type HostId,
} from '../types/branded.ts';

/** Whole-host Access / tunnel surfaces (HostId). */
export const LEDGER_HOST: HostId = asHostId('ledger.factory-wager.com');
export const SCORE_HOST: HostId = asHostId('score.factory-wager.com');
export const PAGES_DEV_HOST: HostId = asHostId('project-r-score.pages.dev');
export const TERMINAL_HOST: HostId = asHostId('terminal.factory-wager.com');
export const REASONIX_HOST: HostId = asHostId('reasonix.factory-wager.com');

/** Access app domain fields — composed from HostId + path (never forged as bare strings). */
export const LEDGER_ACCESS_DOMAIN: AccessDomainId = accessDomainFromHost(LEDGER_HOST);
export const PORTAL_ACCESS_DOMAIN: AccessDomainId = accessDomainFromHost(SCORE_HOST, '/portal');
export const PORTAL_PAGES_ACCESS_DOMAIN: AccessDomainId = accessDomainFromHost(
  PAGES_DEV_HOST,
  '/portal'
);

export const LEDGER_ACCESS_URL = httpsUrlForAccessDomain(LEDGER_ACCESS_DOMAIN);
export const PORTAL_ACCESS_CUSTOM_URL = httpsUrlForAccessDomain(PORTAL_ACCESS_DOMAIN);
/** Pages production hostname (Access must cover this too — custom-domain apps do not cover it alone). */
export const PORTAL_ACCESS_PAGES_URL = httpsUrlForAccessDomain(PORTAL_PAGES_ACCESS_DOMAIN);
/** Dangling tunnel host (502, no ingress) — inventory only. */
export const TERMINAL_HOST_URL = httpsUrlForHost(TERMINAL_HOST, '/');
/** @deprecated use REASONIX_HOST (HostId) */
export const REASONIX_HOSTNAME = String(REASONIX_HOST);

export type AccessProbeFetch = (
  url: string,
  init?: { method?: string; redirect?: RequestRedirect; signal?: AbortSignal }
) => Promise<Response>;

export type AccessProbeResult = {
  url: string;
  ok: boolean;
  status: number | null;
  accessEnforced: boolean;
  /** Short human evidence for doctor message. */
  evidence: string;
  error?: string;
};

/** True when unauthenticated response is clearly Cloudflare Access challenge/redirect. */
export function isCloudflareAccessEnforced(
  status: number,
  headers: { get(name: string): string | null }
): boolean {
  const loc = headers.get('location') ?? headers.get('Location') ?? '';
  const www = headers.get('www-authenticate') ?? headers.get('WWW-Authenticate') ?? '';
  if (/cloudflareaccess\.com/i.test(loc) || /\/cdn-cgi\/access\/login/i.test(loc)) {
    return true;
  }
  if (/cloudflare-access/i.test(www)) {
    return true;
  }
  // Some Access configs return 401/403 with Access metadata headers
  if (
    (status === 401 || status === 403) &&
    (headers.get('cf-access-domain') || headers.get('Cf-Access-Domain'))
  ) {
    return true;
  }
  return false;
}

function evidenceFromResponse(status: number, headers: Headers, enforced: boolean): string {
  if (enforced) {
    // Short: "302 Access" — host detail is redundant for the doctor one-liner
    return `${status} Access`;
  }
  return `${status} public`;
}

/**
 * Probe a URL for Cloudflare Access enforcement (no follow redirects).
 */
export async function probeCloudflareAccess(
  url: string,
  opts?: {
    fetch?: AccessProbeFetch;
    timeoutMs?: number;
  }
): Promise<AccessProbeResult> {
  const fetchImpl = opts?.fetch ?? globalThis.fetch;
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    // Cache-bust: CF edge can return a cached public 200 briefly after Access attach
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      signal: ac.signal,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    let status = res.status;
    let headers = res.headers;
    let enforced = isCloudflareAccessEnforced(status, headers);
    // One retry on public 200 (propagation / edge cache)
    if (!enforced && status === 200) {
      await Bun.sleep(400);
      const res2 = await fetchImpl(url, {
        method: 'GET',
        redirect: 'manual',
        signal: ac.signal,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'CF-Cache-Status': 'BYPASS',
        },
      });
      status = res2.status;
      headers = res2.headers;
      enforced = isCloudflareAccessEnforced(status, headers);
    }
    return {
      url,
      ok: enforced,
      status,
      accessEnforced: enforced,
      evidence: evidenceFromResponse(status, headers, enforced),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      url,
      ok: false,
      status: null,
      accessEnforced: false,
      evidence: `unreachable: ${msg}`,
      error: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}

export type PortalAccessProbeSummary = {
  ok: boolean;
  custom: AccessProbeResult;
  pages: AccessProbeResult;
  message: string;
};

/** Both custom domain and pages.dev /portal must be Access-enforced. */
export async function probePortalAccess(opts?: {
  fetch?: AccessProbeFetch;
  timeoutMs?: number;
}): Promise<PortalAccessProbeSummary> {
  const custom = await probeCloudflareAccess(PORTAL_ACCESS_CUSTOM_URL, opts);
  const pages = await probeCloudflareAccess(PORTAL_ACCESS_PAGES_URL, opts);
  const ok = custom.accessEnforced && pages.accessEnforced;
  return {
    ok,
    custom,
    pages,
    message: `score ${custom.evidence} · pages.dev ${pages.evidence}`,
  };
}

export type HostProbeResult = {
  host: HostId;
  /** DNS resolves (A/AAAA). */
  resolves: boolean;
  status: number | null;
  evidence: string;
  error?: string;
};

/**
 * DNS lookup via Bun.dns (no dig dependency).
 * @see https://bun.com/docs/runtime/networking/dns
 */
export async function probeDnsResolves(hostname: HostId | string): Promise<boolean> {
  try {
    const rows = await Bun.dns.lookup(String(hostname));
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * HTTP status for a host (no redirect follow). Used for dangling-tunnel inventory.
 */
export async function probeHostHttp(
  url: string,
  opts?: { fetch?: AccessProbeFetch; timeoutMs?: number }
): Promise<{ status: number | null; error?: string }> {
  const fetchImpl = opts?.fetch ?? globalThis.fetch;
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: ac.signal });
    return { status: res.status };
  } catch (e) {
    return { status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * terminal.factory-wager.com — expected dangling: DNS yes, HTTP 502 (no tunnel ingress).
 * "ok" means inventory is honest (not silently healthy). We treat 502 as known-bad (not ok).
 */
export async function probeTerminalHost(opts?: {
  fetch?: AccessProbeFetch;
  timeoutMs?: number;
}): Promise<HostProbeResult> {
  const host = TERMINAL_HOST;
  const resolves = await probeDnsResolves(host);
  if (!resolves) {
    return {
      host,
      resolves: false,
      status: null,
      evidence: 'NXDOMAIN · no DNS (good if decommissioned)',
    };
  }
  const http = await probeHostHttp(TERMINAL_HOST_URL, opts);
  const status = http.status;
  // 502 = dangling proxy; open 200 would be unexpected success
  if (status === 502) {
    return {
      host,
      resolves: true,
      status,
      evidence: '502 dangling tunnel (DNS yes · no ingress)',
    };
  }
  return {
    host,
    resolves: true,
    status,
    evidence:
      status == null
        ? `unreachable · ${http.error ?? '?'}`
        : `${status} (expected 502 or NXDOMAIN)`,
    error: http.error,
  };
}

/** reasonix.factory-wager.com — staged Access app; DNS should not resolve until provisioned. */
export async function probeReasonixDns(): Promise<HostProbeResult> {
  const host = REASONIX_HOST;
  const resolves = await probeDnsResolves(host);
  return {
    host,
    resolves,
    status: null,
    evidence: resolves
      ? 'DNS resolves · tunnel/Access should be live or DNS removed'
      : 'NXDOMAIN · staged only (expected until provisioned)',
  };
}
