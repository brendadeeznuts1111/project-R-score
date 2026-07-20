// @see https://bun.com/docs/runtime/cookies — Bun.Cookie, Bun.CookieMap
// @see https://bun.com/docs/runtime/http/cookies — reading/setting/deleting
// lib/security/cookies-native.ts — Bun-native cookie helpers (secure defaults)

export type CookieOptions = {
  domain?: string;
  path?: string;
  expires?: Date | number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  partitioned?: boolean;
  maxAge?: number;
};

/** Bun.Cookie with project secure defaults for factory cookies. */
export class SecureCookie extends Bun.Cookie {
  constructor(name: string, value: string, options: CookieOptions = {}) {
    super(name, value, {
      path: '/',
      sameSite: 'lax',
      ...options,
    });
  }

  /** Parse Cookie or Set-Cookie header via Bun.Cookie.parse */
  static parse(header: string): Bun.Cookie {
    return Bun.Cookie.parse(header);
  }

  /**
   * Factory with security defaults (httpOnly + sameSite strict;
   * secure in production).
   */
  static from(name: string, value: string, options: CookieOptions = {}): Bun.Cookie {
    return Bun.Cookie.from(name, String(value), {
      path: '/',
      secure: Bun.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      ...options,
    });
  }
}

/** Alias matching prior Cookie API surface. */
export { SecureCookie as Cookie };
export type Cookie = Bun.Cookie;

/** Parse request Cookie header into a CookieMap. */
export function cookieMapFromRequest(req: Request): Bun.CookieMap {
  return new Bun.CookieMap(req.headers.get('cookie') ?? '');
}

/** Parse raw Cookie header string. */
export function cookieMapFromHeader(header: string | null | undefined): Bun.CookieMap {
  return new Bun.CookieMap(header ?? '');
}

/**
 * Apply CookieMap mutations to response headers (Set-Cookie).
 * Bun.serve auto-applies req.cookies when using the cookies API on the request;
 * this helper is for manual Response construction.
 */
export function applyCookieMap(headers: Headers, cookies: Bun.CookieMap): void {
  const setCookies =
    typeof cookies.toSetCookieHeaders === 'function' ? cookies.toSetCookieHeaders() : [];
  for (const line of setCookies) {
    headers.append('Set-Cookie', line);
  }
}

export const CookieMap = Bun.CookieMap;
export type CookieMap = Bun.CookieMap;
