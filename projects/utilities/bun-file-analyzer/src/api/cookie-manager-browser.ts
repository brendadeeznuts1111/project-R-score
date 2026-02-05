// Browser-compatible Cookie Manager using document.cookie
// Simulates Bun.CookieMap API for browser environment

// Cookie options interfaces
export interface SessionCookie {
  name: "sessionId";
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  maxAge: number;
  domain?: string;
  path?: string;
}

export interface AnalyticsCookie {
  name: "analytics";
  value: string;
  httpOnly: false;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  domain?: string;
  path?: string;
}

export interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

// Browser Cookie Manager class
class BrowserCookieManager {
  private cookies: Map<string, CookieOptions & { value: string }> = new Map();

  constructor() {
    this.loadFromDocument();
  }

  private loadFromDocument() {
    if (typeof document === "undefined") return;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      
      if (name && value) {
        this.cookies.set(name.trim(), {
          value: decodeURIComponent(value),
          path: '/',
        });
      }
    }
  }

  private saveToDocument() {
    if (typeof document === "undefined") return;
    
    const cookieStrings: string[] = [];
    
    for (const [name, options] of this.cookies) {
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(options.value)}`;
      
      if (options.domain) cookieString += `; domain=${options.domain}`;
      if (options.path) cookieString += `; path=${options.path}`;
      if (options.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
      if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
      if (options.secure) cookieString += `; secure`;
      if (options.httpOnly) cookieString += `; httponly`;
      if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
      
      cookieStrings.push(cookieString);
    }
    
    // Update document cookie
    cookieStrings.forEach(cookieString => {
      document.cookie = cookieString;
    });
  }

  // Map-like interface methods
  get(name: string): (CookieOptions & { value: string }) | undefined {
    return this.cookies.get(name);
  }

  set(name: string, options: CookieOptions & { value: string }): void {
    this.cookies.set(name, options);
    this.saveToDocument();
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  delete(name: string): boolean {
    const result = this.cookies.delete(name);
    
    // Delete from document.cookie by setting expiration in the past
    if (typeof document !== "undefined") {
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    
    return result;
  }

  clear(): void {
    this.cookies.clear();
    
    // Clear all document cookies
    if (typeof document !== "undefined") {
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
    }
  }

  get size(): number {
    return this.cookies.size;
  }

  entries(): IterableIterator<[string, CookieOptions & { value: string }]> {
    return this.cookies.entries();
  }

  keys(): IterableIterator<string> {
    return this.cookies.keys();
  }

  values(): IterableIterator<CookieOptions & { value: string }> {
    return this.cookies.values();
  }

  forEach(callbackfn: (value: CookieOptions & { value: string }, key: string, map: Map<string, CookieOptions & { value: string }>) => void): void {
    this.cookies.forEach(callbackfn);
  }

  // Enhanced cookie methods
  createSessionCookie(sessionId: string): SessionCookie {
    const sessionCookie: SessionCookie = {
      name: "sessionId",
      value: sessionId,
      httpOnly: true,
      secure: window.location.protocol === "https:",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    };

    this.set("sessionId", sessionCookie);
    return sessionCookie;
  }

  createAnalyticsCookie(data: string): AnalyticsCookie {
    const analyticsCookie: AnalyticsCookie = {
      name: "analytics",
      value: data,
      httpOnly: false,
      secure: window.location.protocol === "https:",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    };

    this.set("analytics", analyticsCookie);
    return analyticsCookie;
  }

  getSessionId(): string | null {
    const session = this.get("sessionId");
    return session?.value || null;
  }

  getAnalyticsData(): string | null {
    const analytics = this.get("analytics");
    return analytics?.value || null;
  }

  // Debug methods with color logging (browser console)
  debugCookies(): void {
    console.log("%c🍪 Browser Cookie Manager Debug", "color: #e67e22; font-size: 14px; font-weight: bold");
    console.log(`%cTotal cookies: ${this.size}`, "color: #e67e22");
    
    if (this.size === 0) {
      console.log("%cNo cookies set", "color: #e67e22; font-style: italic");
      return;
    }

    this.forEach((cookie, name) => {
      const color = name === "sessionId" ? "#e67e22" : name === "analytics" ? "#3498db" : "#95a5a6";
      console.log(
        `%c${name}: ${cookie.value}`,
        `color: ${color}; background: ${color}20; padding: 2px 6px; border-radius: 3px;`
      );
    });
  }
}

// Create singleton instance
export const cookieManager = new BrowserCookieManager();

// Export for type usage
export type { CookieOptions };
