// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortController
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
/**
 * Live Cloudflare Access enforcement probes (HTTP HEAD/GET, no credentials).
 *
 * Access enforced signals (unauthenticated request):
 *   - Location → *.cloudflareaccess.com or /cdn-cgi/access/login
 *   - www-authenticate: Cloudflare-Access
 *
 * Does not apply policies — only observes edge behavior.
 */

export const LEDGER_ACCESS_URL = 'https://ledger.factory-wager.com/';
export const PORTAL_ACCESS_CUSTOM_URL = 'https://score.factory-wager.com/portal/';
/** Pages production hostname (Access must cover this too — custom-domain app alone does not). */
export const PORTAL_ACCESS_PAGES_URL = 'https://project-r-score.pages.dev/portal/';

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
    const loc = headers.get('location') ?? '';
    if (loc) {
      try {
        const host = new URL(loc).host;
        return `${status} → ${host} (Access)`;
      } catch {
        return `${status} → Access login`;
      }
    }
    return `${status} · www-authenticate Cloudflare-Access`;
  }
  return `${status} public (no Access challenge)`;
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
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      signal: ac.signal,
    });
    const enforced = isCloudflareAccessEnforced(res.status, res.headers);
    return {
      url,
      ok: enforced,
      status: res.status,
      accessEnforced: enforced,
      evidence: evidenceFromResponse(res.status, res.headers, enforced),
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
  const parts = [`score ${custom.evidence}`, `pages.dev ${pages.evidence}`];
  return {
    ok,
    custom,
    pages,
    message: ok
      ? `Access on score + pages.dev /portal · ${parts.join(' · ')}`
      : `Access gap: ${parts.join(' · ')} — promote staged score…/portal policy + Pages Access`,
  };
}
