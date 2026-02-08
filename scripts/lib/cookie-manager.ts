export const DASHBOARD_COOKIE_NAME = 'bfw_state';

export type DashboardState = {
  domain: string;
  accountId: string;
  lastSnapshot: string;
  prefMetric: 'latency' | 'memory';
};

function normalizeDomain(domain: string): string {
  return String(domain || '').trim().toLowerCase();
}

function toCookieValue(state: DashboardState): string {
  return btoa(JSON.stringify(state)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromCookieValue(value: string): DashboardState | null {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  try {
    const parsed = JSON.parse(atob(padded)) as Partial<DashboardState>;
    const domain = normalizeDomain(parsed.domain || '');
    if (!domain) return null;
    const prefMetric = parsed.prefMetric === 'memory' ? 'memory' : 'latency';
    return {
      domain,
      accountId: String(parsed.accountId || ''),
      lastSnapshot: String(parsed.lastSnapshot || ''),
      prefMetric,
    };
  } catch {
    return null;
  }
}

function cookieDomainForHost(hostname: string): string | undefined {
  const host = normalizeDomain(hostname);
  if (!host || host === 'localhost' || /^[0-9.]+$/.test(host)) return undefined;
  if (host.endsWith('factory-wager.com')) return '.factory-wager.com';
  return undefined;
}

export const StateManager = {
  serialize(state: DashboardState, reqUrl: URL): string {
    const cookie = new Bun.Cookie(
      DASHBOARD_COOKIE_NAME,
      toCookieValue(state),
      {
        httpOnly: true,
        secure: reqUrl.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        domain: cookieDomainForHost(reqUrl.hostname),
        maxAge: 60 * 60 * 24,
      }
    );
    return cookie.toString();
  },

  parse(req: Request): DashboardState | null {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return null;
    const jar = new Bun.CookieMap(cookieHeader);
    const raw = jar.get(DASHBOARD_COOKIE_NAME);
    if (!raw) return null;
    return fromCookieValue(raw);
  },
};
