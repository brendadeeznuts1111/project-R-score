export const DASHBOARD_COOKIE_NAME = 'bfw_state';

export type SecurityLevel = 'high' | 'medium' | 'low';
export type CookieCategory = 'session' | 'preference' | 'analytics';

export type SessionData = {
  userId: number;
  expires: number;
};

export type UserPreferences = {
  theme?: 'light' | 'dark';
  prefSource?: 'local' | 'r2';
};

export type DomainContextCookieData = {
  domain: string;
  zone: string;
  accountId: string;
  source: 'local' | 'r2';
  prefix?: string;
};

export type SubdomainStateCookieData = {
  checked: number;
  resolved: number;
  unresolved: string[];
};

export type DashboardState = {
  domain: string;
  accountId: string;
  lastSnapshot: string;
  prefMetric: 'latency' | 'memory';
  prefSource?: 'local' | 'r2';
};

export type SecureCookieOptions = {
  category: CookieCategory;
  securityLevel: SecurityLevel;
  compress?: boolean;
};

export type BatchParseMetrics = {
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
};

export type BatchParseResult = {
  success: Array<Map<string, string>>;
  failed: Array<{ index: number; error: string; header: string }>;
  metrics: BatchParseMetrics;
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
    const prefSource = parsed.prefSource === 'r2' ? 'r2' : 'local';
    return {
      domain,
      accountId: String(parsed.accountId || ''),
      lastSnapshot: String(parsed.lastSnapshot || ''),
      prefMetric,
      prefSource,
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

function toBase64Url(input: string | Uint8Array): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return buf.toString('base64url');
}

function fromBase64Url(input: string): Uint8Array {
  return new Uint8Array(Buffer.from(input, 'base64url'));
}

export const CookieParser = {
  createSecureCookie<T>(name: string, value: T, opts: SecureCookieOptions): Bun.Cookie {
    const raw = JSON.stringify(value);
    const encoded = opts.compress ? toBase64Url(Bun.gzipSync(raw)) : toBase64Url(raw);
    return new Bun.Cookie(name, encoded, {
      path: '/',
      httpOnly: opts.category !== 'analytics',
      secure: true,
      sameSite: opts.securityLevel === 'high' ? 'strict' : 'lax',
      maxAge: opts.category === 'session' ? 60 * 60 : 60 * 60 * 24 * 30,
    });
  },

  parseSecureCookie<T>(cookieValue: string, opts?: { compressed?: boolean }): T | null {
    try {
      const bytes = fromBase64Url(cookieValue);
      const raw = opts?.compressed ? new TextDecoder().decode(Bun.gunzipSync(bytes)) : Buffer.from(bytes).toString('utf8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  parseCookieHeader(header: string): Map<string, string> {
    const jar = new Bun.CookieMap(header || '');
    const out = new Map<string, string>();
    for (const [name, value] of jar.entries()) {
      out.set(String(name), String(value));
    }
    return out;
  },

  parseBatch(cookieHeaders: string[], opts?: { parallel?: boolean }): BatchParseResult {
    const headers = Array.isArray(cookieHeaders) ? cookieHeaders : [];
    const success: Array<Map<string, string>> = [];
    const failed: Array<{ index: number; error: string; header: string }> = [];

    const worker = (header: string, index: number) => {
      try {
        const parsed = CookieParser.parseCookieHeader(header || '');
        success.push(parsed);
      } catch (error) {
        failed.push({
          index,
          error: error instanceof Error ? error.message : String(error),
          header: header || '',
        });
      }
    };

    if (opts?.parallel) {
      // JS parsing itself is sync; we keep a separate branch for API compatibility.
      headers.forEach(worker);
    } else {
      headers.forEach(worker);
    }

    const total = headers.length;
    const successCount = success.length;
    const failedCount = failed.length;
    const successRate = total > 0 ? Number(((successCount / total) * 100).toFixed(2)) : 100;
    return {
      success,
      failed,
      metrics: {
        total,
        successCount,
        failedCount,
        successRate,
      },
    };
  },

  createTransformPipeline(): CookieTransformPipeline {
    return new CookieTransformPipeline();
  },
};

class CookieTransformPipeline {
  private forceSecure = false;
  private compressValue = false;
  private renameFn: ((oldName: string) => string) | null = null;
  private pathValue: string | null = null;

  secure(): CookieTransformPipeline {
    this.forceSecure = true;
    return this;
  }

  compress(): CookieTransformPipeline {
    this.compressValue = true;
    return this;
  }

  rename(fn: (oldName: string) => string): CookieTransformPipeline {
    this.renameFn = fn;
    return this;
  }

  setPath(path: string): CookieTransformPipeline {
    this.pathValue = path;
    return this;
  }

  process(cookie: Bun.Cookie): Bun.Cookie {
    const nextName = this.renameFn ? this.renameFn(cookie.name) : cookie.name;
    const nextValue = this.compressValue ? toBase64Url(Bun.gzipSync(cookie.value)) : cookie.value;
    return new Bun.Cookie(nextName, nextValue, {
      domain: cookie.domain,
      path: this.pathValue || cookie.path || '/',
      expires: cookie.expires,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      httpOnly: cookie.httpOnly,
      secure: this.forceSecure ? true : cookie.secure,
      partitioned: cookie.partitioned,
    });
  }
}

export const cookieFactory = {
  session: (data: SessionData): Bun.Cookie =>
    CookieParser.createSecureCookie('session', data, {
      category: 'session',
      securityLevel: 'high',
    }),

  preferences: (prefs: UserPreferences): Bun.Cookie =>
    CookieParser.createSecureCookie('prefs', prefs, {
      category: 'preference',
      securityLevel: 'medium',
    }),

  analytics: (userId: string): Bun.Cookie =>
    CookieParser.createSecureCookie('_ga', userId, {
      category: 'analytics',
      securityLevel: 'low',
      compress: true,
    }),

  domainContext: (data: DomainContextCookieData): Bun.Cookie =>
    CookieParser.createSecureCookie('domain_ctx', data, {
      category: 'preference',
      securityLevel: 'high',
      compress: true,
    }),

  subdomainState: (data: SubdomainStateCookieData): Bun.Cookie =>
    CookieParser.createSecureCookie('subdomain_state', data, {
      category: 'preference',
      securityLevel: 'medium',
      compress: true,
    }),
};

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
